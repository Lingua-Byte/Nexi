// Monta e renderiza vídeos a partir de roteiros/dia-N.js
// Uso: node semana.js 1 2 3        (dias)     ou   node semana.js A1 B3   (vídeos)
// Variáveis: PARALELO=2 (vídeos ao mesmo tempo), SO_TTS=1 (só narração), PREVIEW="2,10" (só quadros)
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { porId } = require('./plano');
const { renderizar } = require('./render');
const { mixar, creditoTexto } = require('./trilhas');

const PY = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
const args = process.argv.slice(2);
const specs = [];
for (const f of fs.readdirSync(path.join(__dirname, 'roteiros')).filter(f => /^dia-\d+\.js$/.test(f))) {
  const dia = +f.match(/\d+/)[0];
  for (const s of require(path.join(__dirname, 'roteiros', f))) specs.push({ ...s, dia });
}
const escolhidos = specs.filter(s => args.length === 0 || args.includes(String(s.dia)) || args.includes(s.id));

function montar(s) {
  const info = porId[s.id];
  if (!info) throw new Error('ID fora do plano: ' + s.id);
  const dir = path.join(__dirname, 'videos', s.id);
  fs.mkdirSync(dir, { recursive: true });
  const narr = [...s.narr, s.cta.pausa ?? 0.5, s.cta.fala];
  const hash = crypto.createHash('md5').update(JSON.stringify(narr)).digest('hex');
  const hf = path.join(dir, 'narracao.hash');
  if (!fs.existsSync(path.join(dir, 'narracao.m4a')) || !fs.existsSync(hf) || fs.readFileSync(hf, 'utf8') !== hash) {
    fs.writeFileSync(path.join(dir, 'narracao-trechos.json'), JSON.stringify(narr, null, 1));
    execFileSync(PY, [path.join(__dirname, 'tts.py'), path.join(dir, 'narracao-trechos.json'), path.join(dir, 'narracao'), s.voz || 'pt-BR-AntonioNeural', s.vel || '+2%'], { stdio: 'inherit' });
    fs.writeFileSync(hf, hash);
  }
  const cenas = s.cenas.map(c => {
    if (c.tipo === 'glossario') return { ...c, numero: info.termoN, termo: c.termo || info.termo.toLowerCase(), novo: info.termoNovo };
    if (c.tipo === 'fim') {
      const p = info.prox;
      return { ...c, cta: s.cta.tela, icone: s.cta.icone, ctaEm: s.cta.em || s.cta.fala.split(/\s+/).slice(0, 2).join(' '),
        prox: c.semProx || !p ? null : { quando: (p.amanha ? 'amanhã · ' : 'hoje · ') + p.hora, quadro: p.quadro, cor: p.cor, titulo: p.titulo } };
    }
    return c;
  });
  fs.writeFileSync(path.join(dir, 'video.json'), JSON.stringify({ id: s.id, titulo: info.titulo, cor: info.cor, selo: info.quadro, cenas }, null, 1));
  // texto do post (legenda + hashtags) para copiar na hora de publicar
  fs.writeFileSync(path.join(dir, 'post.txt'), `${info.titulo}\n\n${info.legenda}\n\nFonte: ${info.fonte}\n${creditoTexto(info)}\n`);
  // trilha clássica (domínio público) mixada sob a narração
  const pal = JSON.parse(fs.readFileSync(path.join(dir, 'narracao.json'), 'utf8'));
  mixar(info, pal[pal.length - 1].e + 1.2);
}

(async () => {
  console.log(`${escolhidos.length} vídeo(s)`);
  for (const s of escolhidos) { montar(s); }
  if (process.env.SO_TTS) return;
  const preview = process.env.PREVIEW ? process.env.PREVIEW.split(',').map(Number) : null;
  const fila = [...escolhidos];
  const N = +(process.env.PARALELO || 2);
  await Promise.all(Array.from({ length: N }, async () => {
    while (fila.length) {
      const s = fila.shift(); const t0 = Date.now();
      try { const r = await renderizar(s.id, { preview }); console.log(`✓ ${s.id}${r ? ` ${r.dur.toFixed(1)}s` : ''} em ${Math.round((Date.now() - t0) / 1000)}s`); }
      catch (e) { console.error(`✗ ${s.id}: ${e.message}`); }
    }
  }));
})();
