/* Bateria de testes do tradutor do RAIZ.
   Roda cada frase de frases.json pelo caminho completo do app (português falado → sujeito oculto →
   conceitos → tradutor interno) para as línguas pedidas, e marca sinais automáticos de problema.

   Uso: node tools/testes/rodar.js <pasta-dos-modelos> <saida.json> [línguas, ex.: en,es]
   Os modelos: python3 tools/fetch_models.py <pasta> pt-en en-pt en-es es-en  */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const [MODELS, OUT, LANGS = 'en,es'] = process.argv.slice(2);
const langs = LANGS.split(',');
const frases = JSON.parse(fs.readFileSync(path.join(__dirname, 'frases.json'), 'utf8'));

/* palavras que denunciam português que sobrou na tradução */
const PT_RESTO = new Set('não você vocês muito também então porque mas pra está estou tô tá uai oxente bah tchê sô égua visse mano véi pô nossa né isso aquilo mermão guri guria trem cê ficou fiquei saudade cafuné gambiarra xodó jeitinho'.split(' '));

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ serviceWorkers: 'block' });
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.wasm': 'application/wasm', '.gz': 'application/gzip' };
  await ctx.route('https://raiz.test/**', r => {
    let u = decodeURIComponent(new URL(r.request().url()).pathname); if (u.endsWith('/')) u += 'index.html';
    const f = u.startsWith('/linguas/models/') ? path.join(MODELS, u.slice(16)) : path.join(ROOT, u);
    if (!fs.existsSync(f)) return r.fulfill({ status: 404 });
    r.fulfill({ body: fs.readFileSync(f), contentType: types[path.extname(f)] || 'application/octet-stream' });
  });
  await ctx.route(/fonts\./, r => r.abort());
  const p = await ctx.newPage();
  await p.goto('https://raiz.test/linguas/');
  const results = await p.evaluate(async ({ corpus, langs }) => {
    const m = await import('/linguas/motor.js');
    for (const l of langs) await m.prepare(l, () => {});
    const out = [];
    for (const [cat, list] of Object.entries(corpus)) for (const pt of list) {
      const sents = frases(pt);   // função do app (linguistica.js)
      const ctxd = sujeitoOculto(sents.map(falado));
      const rw = ctxd.map(s => conceitos(s));
      const via = rw.map(x => x.rewritten).join(' ');
      const found = [...new Set(rw.flatMap(x => x.found.map(c => c.id)))];
      const row = { cat, pt, via: via !== pt ? via : '', conceitos: found };
      for (const l of langs) {
        const t0 = performance.now();
        row[l] = (await Promise.all(rw.map(x => m.translate('pt', l, x.rewritten)))).join(' ');
        row[l + '_ms'] = Math.round(performance.now() - t0);
      }
      out.push(row);
    }
    return out;
  }, { corpus: frases, langs });
  for (const r of results) {
    r.flags = [];
    for (const l of langs) {
      const t = r[l] || '';
      const words = t.toLowerCase().match(/[\p{L}]+/gu) || [];
      const left = words.filter(w => PT_RESTO.has(w));
      if (left.length) r.flags.push(`${l}: sobrou português (${[...new Set(left)].join(', ')})`);
      if (t.trim().toLowerCase() === r.pt.trim().toLowerCase()) r.flags.push(`${l}: não traduziu`);
      if (/(\b\p{L}+\b)(?:\s+\1){2,}/iu.test(t)) r.flags.push(`${l}: repetição`);
      const ratio = t.length / Math.max(1, r.pt.length);
      if (ratio < 0.35 || ratio > 2.6) r.flags.push(`${l}: tamanho estranho`);
    }
  }
  fs.writeFileSync(OUT, JSON.stringify(results, null, 1));
  const flagged = results.filter(r => r.flags.length).length;
  const ms = langs.map(l => Math.round(results.reduce((a, r) => a + r[l + '_ms'], 0) / results.length));
  console.log(`${results.length} frases · ${flagged} com sinal automático de problema · tempo médio por frase: ${langs.map((l, i) => `${l} ${ms[i]}ms`).join(', ')}`);
  await b.close();
})();
