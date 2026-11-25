/* RAIZ — motor de tradução interno.
   Tradução neural que roda DENTRO do aparelho (Bergamot em WebAssembly, modelos da Mozilla).
   Sem API, sem chave, sem enviar nada para fora. Cada língua é baixada uma vez e fica no celular.
   O português passa pelo inglês como ponte: pt → en → língua (e de volta, para conferir). */
import { BatchTranslator, TranslatorBacking } from './vendor/bergamot/translator.js';

const BASE = new URL('models/', import.meta.url);
const CACHE = 'raiz-modelos-v1';
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
    return { model: b.model, shortlist: b.lex, vocabs: b.vocab ? [b.vocab] : [b.srcvocab, b.trgvocab], config: {} };
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
