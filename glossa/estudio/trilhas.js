// Trilha de cada vídeo (música clássica em domínio público, interpretada pelo estúdio) + mixagem com a narração
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const CRED = JSON.parse(fs.readFileSync(path.join(__dirname, 'trilhas-creditos.json'), 'utf8'));
// cada quadro tem 2 peças que alternam por dia: vira a "música-tema" do quadro
const TEMAS = { A: ['T01', 'T02'], B: ['T08', 'T09'], C: ['T10', 'T03'], D: ['T11', 'T12'], E: ['T13', 'T14'], F: ['T16', 'T04'], G: ['T17', 'T15'] };
const trilhaDe = info => { const id = TEMAS[info.q][info.dia % 2]; return { id, credito: CRED[id] }; };
const creditoTexto = info => { const c = trilhaDe(info).credito; return /gravação:/.test(c) ? `Trilha: ${c}` : `Trilha: ${c} · obra em domínio público, interpretação gerada pelo Glossa (sem direitos autorais)`; };

// narracao.m4a + trilha → audio-final.m4a (música baixa, que abaixa ainda mais quando a voz fala)
function mixar(info, dur) {
  const dir = path.join(__dirname, 'videos', info.id);
  const wav = path.join(__dirname, 'trilhas', trilhaDe(info).id + '.wav');
  const out = path.join(dir, 'audio-final.m4a');
  const d = dur.toFixed(2), fo = Math.max(0, dur - 2.5).toFixed(2);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', path.join(dir, 'narracao.m4a'), '-stream_loop', '-1', '-i', wav, '-filter_complex',
    `[1:a]atrim=0:${d},asetpts=N/SR/TB,afade=t=in:d=1.5,afade=t=out:st=${fo}:d=2.5,volume=-17dB,aformat=sample_rates=48000:channel_layouts=stereo[m];` +
    `[0:a]aformat=sample_rates=48000:channel_layouts=stereo,apad,atrim=0:${d},asplit=2[v][sc];` +
    `[m][sc]sidechaincompress=threshold=0.02:ratio=4:attack=30:release=500[md];` +
    `[v][md]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[a]`,
    '-map', '[a]', '-c:a', 'aac', '-b:a', '192k', '-t', d, out]);
  return out;
}
module.exports = { trilhaDe, creditoTexto, mixar, TEMAS };
