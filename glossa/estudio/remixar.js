// Troca o áudio de vídeos já renderizados pela mixagem narração + trilha clássica (sem re-renderizar a imagem)
// Uso: node remixar.js 1 2 3   (dias)  ou  node remixar.js A1 B3
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { lista } = require('./plano'); const { mixar } = require('./trilhas');
const args = process.argv.slice(2);
for (const v of lista.filter(v => args.includes(String(v.dia)) || args.includes(v.id))) {
  const mp4 = path.join(__dirname, 'saida', v.id + '.mp4');
  if (!fs.existsSync(mp4)) continue;
  const dur = +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mp4]).toString();
  const audio = mixar(v, dur);
  const tmp = mp4.replace('.mp4', '.tmp.mp4');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', mp4, '-i', audio, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'copy', '-movflags', '+faststart', tmp]);
  fs.renameSync(tmp, mp4);
  fs.appendFileSync(path.join(__dirname, 'videos', v.id, 'post.txt'), '');
  console.log('✓', v.id);
}
