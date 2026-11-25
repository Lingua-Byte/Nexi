/* RAIZ — motor de tradução interno.
   Tradução neural que roda DENTRO do aparelho (Bergamot em WebAssembly, modelos da Mozilla).
   Sem API, sem chave, sem enviar nada para fora. Cada língua é baixada uma vez e fica no celular.
   O português passa pelo inglês como ponte: pt → en → língua (e de volta, para conferir). */
import { BatchTranslator, TranslatorBacking } from './vendor/bergamot/translator.js';

const BASE = new URL('models/', import.meta.url);
const CACHE = 'raiz-modelos-v1';
const SEM_LISTA = true;
let registryP = null;

function registry() {
  if (!registryP) registryP = fetch(new URL('registry.json', BASE), { cache: 'no-cache' })
    .then(r => { if (!r.ok) throw new Error('sem-modelos'); return r.json(); })
    .catch(async e => {
      // offline: usa a cópia guardada
      const c = await caches.open(CACHE); const m = await c.match(new URL('registry.json', BASE));
      if (m) return m.json();
      registryP = null; throw e;
    });
  return registryP;
}

/* pares necessários para uma língua: ida (pt→X) e volta (X→pt) */
export function pairsFor(lang) {
  if (lang === 'en') return ['pten', 'enpt'];
  return ['pten', `en${lang}`, `${lang}en`, 'enpt'];
}
const FILES = ['model', 'lex', 'vocab', 'srcvocab', 'trgvocab'];

async function filesFor(lang) {
  const reg = await registry();
  const out = [];
  for (const p of pairsFor(lang)) {
    const e = reg[p]; if (!e) throw new Error('sem-modelo:' + p);
    FILES.forEach(k => e[k] && out.push(e[k]));
  }
  return out;
}

/* Quanto falta baixar (bytes) para a língua funcionar offline. */
export async function status(lang) {
  try {
    const files = await filesFor(lang);
    const c = await caches.open(CACHE);
    let have = 0, total = 0;
    for (const f of files) { total += f.size; if (await c.match(new URL(f.name, BASE))) have += f.size; }
    return { available: true, ready: have >= total, have, total };
  } catch (e) {
    return { available: false, ready: false, have: 0, total: 0, error: String(e.message || e) };
  }
}

/* Baixa e guarda os modelos da língua, com progresso. */
export async function prepare(lang, onProgress = () => {}) {
  const files = await filesFor(lang);
  const c = await caches.open(CACHE);
  try { await navigator.storage?.persist?.(); } catch (e) { /* ok */ }
  const regRes = await fetch(new URL('registry.json', BASE), { cache: 'no-cache' });
  if (regRes.ok) await c.put(new URL('registry.json', BASE), regRes);
  const total = files.reduce((a, f) => a + f.size, 0);
  let done = 0;
  for (const f of files) {
    const url = new URL(f.name, BASE);
    if (await c.match(url)) { done += f.size; onProgress(done, total); continue; }
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) throw new Error('download:' + res.status);
    const reader = res.body.getReader(); const chunks = []; let got = 0;
    for (;;) {
      const { done: end, value } = await reader.read(); if (end) break;
      chunks.push(value); got += value.length; onProgress(done + got, total);
    }
    await c.put(url, new Response(new Blob(chunks), { headers: { 'content-type': 'application/gzip' } }));
    done += f.size;
  }
  onProgress(total, total);
}

/* Apaga os modelos só desta língua (mantém o par português ↔ inglês se outra língua usa). */
export async function remove(lang, keepLangs = []) {
  const reg = await registry();
  const keep = new Set(keepLangs.flatMap(pairsFor));
  const c = await caches.open(CACHE);
  for (const p of pairsFor(lang)) {
    if (keep.has(p) || !reg[p]) continue;
    for (const k of FILES) if (reg[p][k]) await c.delete(new URL(reg[p][k].name, BASE));
  }
}

async function readGz(name) {
  const c = await caches.open(CACHE);
  const url = new URL(name, BASE);
  let res = await c.match(url);
  if (!res) { res = await fetch(url); if (!res.ok) throw new Error('download:' + res.status); await c.put(url, res.clone()); }
  const stream = res.body.pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).arrayBuffer();
}

class RaizBacking extends TranslatorBacking {
  async loadModelRegistry() {
    const reg = await registry();
    return Object.entries(reg).map(([k, files]) => ({ from: k.slice(0, 2), to: k.slice(2, 4), files }));
  }
  async loadTranslationModel({ from, to }) {
    const entry = (await this.registry).find(m => m.from === from && m.to === to);
    if (!entry) throw new Error(`sem-modelo:${from}${to}`);
    const f = entry.files, b = {};
    for (const k of FILES) if (f[k]) b[k] = await readGz(f[k].name);
    this.state.set(JSON.stringify({ from, to }), 'available');
    // Sem a lista curta de palavras (shortlist): com frases curtas ela cortava palavras como
    // “Tito” e “was” e o modelo inventava (“T. To to be…”). Fica um pouco mais lento, bem mais certo.
    return { model: b.model, shortlist: SEM_LISTA ? new ArrayBuffer(0) : b.lex, vocabs: b.vocab ? [b.vocab] : [b.srcvocab, b.trgvocab], config: {} };
  }
}

let translator = null;
function engine() {
  if (!translator) {
    const opts = { workers: 1, batchSize: 4, pivotLanguage: 'en', workerUrl: new URL('vendor/bergamot/worker/translator-worker.js', import.meta.url).href, downloadTimeout: 0 };
    translator = new BatchTranslator(opts, new RaizBacking(opts));
  }
  return translator;
}

/* Ponte pelo inglês, com conserto de conceito.
   O inglês usa verbos "leves" que as outras línguas traduzem palavra por palavra e erram
   ("have breakfast" → "tengo el desayuno"). Antes de sair do inglês, troca pelo conceito. */
const V = (base, s, past, ing) => ({ have: base, has: s, had: past, having: ing });
/* [regra, troca, línguas onde ajuda (vazio = todas)] — medido com os modelos reais */
const PONTE = [
  [/\b(have|has|had|having) (breakfast|dinner|a snack)\b/gi, (m, v, x) => `${V('eat', 'eats', 'ate', 'eating')[v.toLowerCase()]} ${x}`, ['fr', 'it', 'de']],
  [/\b(have|has|had|having) (a |an |some )?(coffee|tea|beer|wine|juice|drink|glass of \w+|cup of \w+)\b/gi, (m, v, a, x) => `${V('drink', 'drinks', 'drank', 'drinking')[v.toLowerCase()]} ${a || ''}${x}`, ['fr', 'it', 'de', 'ja', 'ko', 'he']],
  [/\b(have|has|had|having) a (shower|bath)\b/gi, (m, v, x) => `${V('take', 'takes', 'took', 'taking')[v.toLowerCase()]} a ${x}`],
  [/\b(walk|walks|walked|walking) (in|around|through|on) the (park|city|beach|street|streets|mall|neighborhood|square|garden)\b/gi,
    (m, v, p, x) => `${({ walk: 'go', walks: 'goes', walked: 'went', walking: 'going' })[v.toLowerCase()]} for a walk ${p} the ${x}`],
  [/\b(I|we|he|she|they|you) (walked|walk)\b(?! (to|into|home|back|out))(?! (in|around|through|on) the)/gi,
    (m, s, v) => `${s} ${v.toLowerCase() === 'walked' ? 'went' : 'go'} for a walk`, ['es', 'it', 'fr', 'de']],
  [/\b(have|has|had) fun\b/gi, (m, v) => `${V('enjoy myself', 'enjoys herself', 'enjoyed myself', 'enjoying')[v.toLowerCase()]}`]
];
/* Saída: tropeços conhecidos e repetidos dos modelos, medidos nos testes. */
const CONSERTO = {
  es: [
    [/\b([Mm])e tome\b/g, (m, c) => c === 'M' ? 'Tomo' : 'tomo'],
    [/\b(Yo )?tome (el|la|un|una) (autobús|tren|metro|taxi|avión)(?![\p{L}])/gu, (m, y, a, x) => `${y || ''}tomo ${a} ${x}`],
    [/\b([Tt])engo (un|el) (café|té)(?![\p{L}])/gu, (m, t, a, x) => `${t === 'T' ? 'T' : 't'}omo ${a} ${x}`],
    [/\btodo el (autobús|tren|metro)(?![\p{L}])/gu, 'tomo el $1'],
    [/\bcambé(?![\p{L}])/gu, 'di un paseo']
  ]
};
function conserta(text, to) { let t = text; for (const [re, f] of CONSERTO[to] || []) t = t.replace(re, f); return t; }

function ponte(en, to) { let t = en; for (const [re, f, only] of PONTE) if (!only || only.includes(to)) t = t.replace(re, f); return t; }

/* Traduz texto. from/to: 'pt', 'en', 'es', 'fr', 'de', 'it', 'ja', 'ko', 'he'. */
export async function translate(from, to, text) {
  if (!text.trim() || from === to) return text;
  const one = async (f, t, x) => (await engine().translate({ from: f, to: t, text: x, html: false })).target.text;
  if (from !== 'en' && to !== 'en') {
    const en = await one(from, 'en', text);
    return conserta(await one('en', to, ponte(en, to)), to);
  }
  return conserta(await one(from, to, text), to);
}
/* A frase no inglês da ponte (útil para conferir conceitos). */
export async function bridge(from, text, to = 'es') { return from === 'en' ? text : ponte(await translate(from, 'en', text), to); }

/* ——— Tradução alinhada: que palavra corresponde a qual ———
   Cada palavra de origem vai marcada (<b data-k="i">). O motor leva as marcas para as palavras
   correspondentes da tradução (alinhamento interno), inclusive pela ponte do inglês.
   Resultado: tokens { pre, t, k: [índices das palavras de origem] }. */
const escH = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const decH = s => String(s).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
function parseTagged(html) {
  const out = []; let pre = '';
  const re = /<b data-k="([^"]*)">([\s\S]*?)<\/b>|([^<]+)|<[^>]*>/g; let m;
  while ((m = re.exec(html))) {
    if (m[1] !== undefined) {
      const t = decH(m[2]);
      if (!t.trim()) { pre += t; continue; }
      const lead = t.match(/^\s*/)[0];
      out.push({ pre: pre + lead, t: t.trim(), k: m[1].split(' ').filter(Boolean).map(Number) });
      pre = t.match(/\s*$/)[0];
    } else if (m[3] !== undefined) {
      const t = decH(m[3]);
      if (/[\p{L}\p{N}]/u.test(t)) { const lead = t.match(/^\s*/)[0]; out.push({ pre: pre + lead, t: t.trim(), k: [] }); pre = t.match(/\s*$/)[0]; }
      else if (out.length && !/^\s/.test(t)) { out[out.length - 1].t += t.trimEnd(); pre = t.match(/\s*$/)[0]; }
      else pre += t;
    }
  }
  return out;
}
const buildTagged = toks => toks.map(x => `${x.pre}<b data-k="${x.k.join(' ')}">${escH(x.t)}</b>`).join('');
const joinToks = toks => toks.map(x => x.pre + x.t).join('').trim();
/* aplica regras de conserto sobre os tokens, juntando as marcas dos trechos trocados */
function fixTokens(toks, rules) {
  let T = toks.slice();
  for (const [re0, f] of rules) {
    const plain = T.map(x => x.pre + x.t).join('');
    const spans = []; let pos = 0;
    T.forEach(x => { const s = pos + x.pre.length; spans.push([s, s + x.t.length]); pos = s + x.t.length; });
    const re = new RegExp(re0.source, re0.flags.includes('g') ? re0.flags : re0.flags + 'g');
    const matches = [...plain.matchAll(re)];
    for (const m of matches.reverse()) {
      const rep = typeof f === 'function' ? f(...m) : m[0].replace(new RegExp(re0.source, re0.flags.replace('g', '')), f);
      if (rep === m[0]) continue;
      const a0 = m.index, a1 = m.index + m[0].length;
      const idx = spans.map((sp, i) => (sp[1] > a0 && sp[0] < a1 ? i : -1)).filter(i => i >= 0);
      if (!idx.length) continue;
      const i0 = idx[0], i1 = idx[idx.length - 1];
      const segStart = spans[i0][0], segEnd = spans[i1][1];
      const text = (plain.slice(segStart, a0) + rep + plain.slice(a1, segEnd)).trim();
      const keys = [...new Set(idx.flatMap(i => T[i].k))].sort((x, y) => x - y);
      T.splice(i0, i1 - i0 + 1, { pre: T[i0].pre, t: text, k: keys });
      spans.splice(i0, i1 - i0 + 1, [segStart, segEnd]);   // posições antes de i0 continuam válidas
    }
  }
  return T;
}
async function taggedAlign(from, to, words) {
  const html = words.map((w, i) => `<b data-k="${i}">${escH(w)}</b>`).join(' ');
  const one = async (f, t, x) => (await engine().translate({ from: f, to: t, text: x, html: true })).target.text;
  let toks;
  if (from !== 'en' && to !== 'en') {
    let en = parseTagged(await one(from, 'en', html));
    en = fixTokens(en, PONTE.filter(([, , only]) => !only || only.includes(to)));
    toks = parseTagged(await one('en', to, buildTagged(en)));
  } else toks = parseTagged(await one(from, to, html));
  return fixTokens(toks, CONSERTO[to] || []);
}
const normW = w => w.toLowerCase().replace(/[.,!?¡¿;:"“”«»()…。、！？]/g, '');
/* O texto vem da tradução normal (melhor qualidade); o alinhamento vem da tradução marcada.
   As duas são casadas palavra por palavra; palavras iguais à origem (nomes, números) ligam direto. */
export async function translateAligned(from, to, text) {
  const words = String(text).trim().split(/\s+/).filter(Boolean);
  if (from === to) return { src: words, toks: words.map((w, i) => ({ pre: i ? ' ' : '', t: w, k: [i] })), text };
  const plain = await translate(from, to, text);
  const tagged = await taggedAlign(from, to, words);
  if (to === 'ja' || !/\s/.test(plain.trim())) return { src: words, toks: tagged, text: plain };   // japonês: sem espaços, usa o marcado
  const hw = tagged.flatMap(t => t.t.split(/\s+/).map(w => ({ w: normW(w), k: t.k })));
  const pw = plain.trim().split(/\s+/);
  const P = pw.map(normW), H = hw.map(x => x.w);
  const dp = Array.from({ length: P.length + 1 }, () => new Array(H.length + 1).fill(0));
  for (let i = P.length - 1; i >= 0; i--) for (let j = H.length - 1; j >= 0; j--)
    dp[i][j] = P[i] && P[i] === H[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const keys = new Array(P.length).fill(null);
  for (let i = 0, j = 0; i < P.length && j < H.length;) {
    if (P[i] && P[i] === H[j]) { keys[i] = hw[j].k; i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) i++; else j++;
  }
  const srcN = words.map(normW);
  const toks = pw.map((w, i) => {
    let k = keys[i];
    if (!k || !k.length) { const s = srcN.indexOf(normW(w)); k = s >= 0 && normW(w).length > 1 ? [s] : []; }
    return { pre: i ? ' ' : '', t: w, k };
  });
  return { src: words, toks, text: plain };
}
