// Renderiza um Short do Glossa: node render.js <ID>   (ex.: node render.js A1)
// Lê videos/<ID>/cenas.json + narracao.mp3 + narracao.json e grava saida/<ID>.mp4 (1080x1920, 30 fps)
// Requer: Node 18+, ffmpeg no PATH, npm install (playwright + fontes) e um Chromium para o Playwright.
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { chromium } = require('playwright');

const ID = process.argv[2] || 'A1';
const FPS = +(process.env.FPS || 30);
const dir = path.join(__dirname, 'videos', ID);
const spec = JSON.parse(fs.readFileSync(path.join(dir, 'cenas.json'), 'utf8'));
const palavras = JSON.parse(fs.readFileSync(path.join(dir, 'narracao.json'), 'utf8'));
const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9-]/g, '');

// "em": palavra-gatilho (primeira ocorrência depois de "depois"), número (segundos) ou 0
function tempo(cue, depois = 0) {
  if (typeof cue === 'number') return cue;
  const alvo = cue.split(/\s+/).map(norm); // aceita várias palavras seguidas: "O nome"
  const p = palavras.find((w, i) => w.s >= depois - 0.01 && alvo.every((a, k) => palavras[i + k] && norm(palavras[i + k].w).startsWith(a)));
  if (!p) throw new Error(`Palavra-gatilho não encontrada: "${cue}" depois de ${depois}s`);
  return p.s;
}

const dur = palavras[palavras.length - 1].e + 1.6;
let ant = 0;
const cenas = spec.cenas.map(c => { const ini = tempo(c.em, ant); ant = ini; return { ...c, ini }; });
cenas.forEach((c, i) => {
  c.fim = cenas[i + 1] ? cenas[i + 1].ini + 0.15 : dur;
  const at = x => tempo(x, c.ini);
  if (c.pontos) c.pontos.forEach(p => { p.t0 = p.em ? at(p.em) : c.ini + 0.3; });
  if (c.rota) c.rota[0].t0 = c.rota[0].em ? at(c.rota[0].em) : c.ini + 0.6;
  if (c.nos) c.nos.forEach((n, k) => { n.t0 = n.em ? at(n.em) : c.ini + 0.2 + k * 0.7; });
  if (c.traducaoEm) c.tTraducao = at(c.traducaoEm);
  if (c.viraEm) c.tVira = at(c.viraEm);
  if (c.exemplosEm) c.tExemplos = at(c.exemplosEm);
});
const glosDesde = spec.glossarioDesde ? tempo(spec.glossarioDesde) : 0;

(async () => {
  fs.mkdirSync(path.join(__dirname, 'saida'), { recursive: true });
  const out = path.join(__dirname, 'saida', `${ID}.mp4`);
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await page.goto('file://' + path.join(__dirname, 'motor.html'));
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(d => iniciar(d), { cor: spec.cor, selo: spec.selo, glossario: null, cenas, palavras, dur });

  if (process.env.PREVIEW) { // PREVIEW="1.5,8,20" salva quadros PNG em saida/ e sai
    for (const t of process.env.PREVIEW.split(',').map(Number)) {
      await page.evaluate(([t, g]) => { D.glossario = g; quadro(t); }, [t, t >= glosDesde ? spec.glossario : null]);
      await page.screenshot({ path: path.join(__dirname, 'saida', `${ID}-${t}s.png`) });
    }
    await browser.close(); return console.log('prévias salvas em saida/');
  }
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
    '-i', path.join(dir, 'narracao.mp3'), '-filter_complex', '[1:a]adelay=0|0,apad[a]', '-map', '0:v', '-map', '[a]',
    '-c:v', 'libx264', '-preset', 'slow', '-tune', 'stillimage', '-crf', '21', '-pix_fmt', 'yuv420p', '-r', String(FPS),
    '-c:a', 'aac', '-b:a', '192k', '-t', dur.toFixed(2), '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });

  const total = Math.ceil(dur * FPS);
  const t0 = Date.now();
  for (let f = 0; f < total; f++) {
    const t = f / FPS;
    await page.evaluate(([t, g]) => { D.glossario = g; quadro(t); }, [t, t >= glosDesde ? spec.glossario : null]);
    const buf = await page.screenshot({ type: 'jpeg', quality: 92 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (f % (FPS * 5) === 0) process.stdout.write(`\r${ID}: ${Math.round(f / total * 100)}%`);
  }
  ff.stdin.end();
  await new Promise((res, rej) => ff.on('close', c => (c ? rej(new Error('ffmpeg ' + c)) : res())));
  await browser.close();
  console.log(`\r${ID}: pronto em ${Math.round((Date.now() - t0) / 1000)} s → ${out}`);
})();
