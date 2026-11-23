// Renderiza um Short: node render.js <ID>  → saida/<ID>.mp4 (1080x1920, 30 fps)
// Usa videos/<ID>/video.json (cenas montadas pelo semana.js) + narracao.m4a + narracao.json
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { chromium } = require('playwright');

async function renderizar(ID, opts = {}) {
  const FPS = +(process.env.FPS || 30);
  const dir = path.join(__dirname, 'videos', ID);
  const spec = JSON.parse(fs.readFileSync(path.join(dir, 'video.json'), 'utf8'));
  const palavras = JSON.parse(fs.readFileSync(path.join(dir, 'narracao.json'), 'utf8'));
  const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9-]/g, '');
  function tempo(cue, depois = 0) {
    if (typeof cue === 'number') return cue;
    const alvo = cue.split(/\s+/).map(norm);
    const i = palavras.findIndex((w, i) => w.s >= depois - 0.01 && alvo.every((a, k) => palavras[i + k] && norm(palavras[i + k].w).startsWith(a)));
    if (i < 0) throw new Error(`${ID}: palavra-gatilho não encontrada: "${cue}" depois de ${depois.toFixed(2)}s`);
    return palavras[i].s;
  }
  const dur = palavras[palavras.length - 1].e + 1.2;
  let ant = 0;
  const cenas = spec.cenas.map(c => { const ini = tempo(c.em, ant); ant = ini; return { ...c, ini }; });
  cenas.forEach((c, i) => {
    c.fim = cenas[i + 1] ? cenas[i + 1].ini + 0.15 : dur;
    const at = x => tempo(x, c.ini);
    for (const [k, val] of Object.entries(c)) {
      if (k !== 'em' && k.endsWith('Em') && (typeof val === 'string' || typeof val === 'number')) c['t' + k[0].toUpperCase() + k.slice(1, -2)] = typeof val === 'number' ? val : at(val);
      if (Array.isArray(val) && val.length && typeof val[0] === 'object') val.forEach((it, j) => { it.t0 = it.em !== undefined ? at(it.em) : c.ini + 0.3 + j * 0.6; });
      if (val && typeof val === 'object' && !Array.isArray(val) && val.em !== undefined) val.t0 = at(val.em);
    }
  });
  const gl = cenas.find(c => c.tipo === 'glossario');
  const glosDesde = gl ? gl.ini : Infinity;
  const glosTxt = gl ? `${gl.novo ? 'TERMO' : 'REVISÃO'} Nº ${gl.numero} · ${gl.termo.toUpperCase()}` : null;

  fs.mkdirSync(path.join(__dirname, 'saida'), { recursive: true });
  const out = path.join(__dirname, 'saida', `${ID}.mp4`);
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await page.goto('file://' + path.join(__dirname, 'motor.html'));
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(d => iniciar(d), { cor: spec.cor, selo: spec.selo, cenas, palavras, dur });
  const desenhar = t => page.evaluate(([t, g]) => quadro(t, g), [t, t >= glosDesde ? glosTxt : null]);

  if (opts.preview) {
    for (const t of opts.preview) { await desenhar(t); await page.screenshot({ path: path.join(__dirname, 'saida', `${ID}-${t}s.png`) }); }
    await browser.close(); return;
  }
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
    '-i', path.join(dir, 'narracao.m4a'), '-filter_complex', '[1:a]apad[a]', '-map', '0:v', '-map', '[a]',
    '-c:v', 'libx264', '-preset', 'slow', '-tune', 'stillimage', '-crf', '21', '-pix_fmt', 'yuv420p', '-r', String(FPS),
    '-c:a', 'aac', '-b:a', '160k', '-t', dur.toFixed(2), '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const total = Math.ceil(dur * FPS);
  for (let f = 0; f < total; f++) {
    await desenhar(f / FPS);
    const buf = await page.screenshot({ type: 'jpeg', quality: 92 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  }
  ff.stdin.end();
  await new Promise((res, rej) => ff.on('close', c => (c ? rej(new Error('ffmpeg ' + c)) : res())));
  await browser.close();
  return { out, dur };
}
module.exports = { renderizar };

if (require.main === module) {
  const ID = process.argv[2];
  const preview = process.env.PREVIEW ? process.env.PREVIEW.split(',').map(Number) : null;
  renderizar(ID, { preview }).then(r => console.log(r ? `${ID} → ${r.out} (${r.dur.toFixed(1)} s)` : 'prévias salvas em saida/'));
}
