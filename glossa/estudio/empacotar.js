// Junta os vídeos de um dia num ZIP com nomes na ordem de publicação + textos dos posts
// Uso: node empacotar.js 1   → saida/Glossa-Dia-1.zip
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { lista } = require('./plano');
const dia = +process.argv[2];
const tmp = path.join(__dirname, 'saida', `Glossa-Dia-${dia}`);
fs.rmSync(tmp, { recursive: true, force: true }); fs.mkdirSync(tmp, { recursive: true });
const slug = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '');
let posts = `GLOSSA · DIA ${dia}\n\n`;
for (const v of lista.filter(v => v.dia === dia)) {
  const src = path.join(__dirname, 'saida', `${v.id}.mp4`);
  if (!fs.existsSync(src)) { console.log('falta', v.id); continue; }
  const nome = `${v.hora}-${v.id}-${slug(v.titulo)}.mp4`;
  fs.copyFileSync(src, path.join(tmp, nome));
  posts += `── ${v.hora} · ${v.quadro} · ${nome}\nTÍTULO: ${v.titulo}\nLEGENDA: ${v.legenda}\nFONTE (comentário fixado): ${v.fonte}\n\n`;
}
fs.writeFileSync(path.join(tmp, 'posts.txt'), posts);
const zip = path.join(__dirname, 'saida', `Glossa-Dia-${dia}.zip`);
fs.rmSync(zip, { force: true });
execFileSync('zip', ['-qr0', zip, path.basename(tmp)], { cwd: path.join(__dirname, 'saida') });
fs.rmSync(tmp, { recursive: true, force: true });
console.log(zip);
