// Lê o plano editorial (conteudo/) e devolve, para cada vídeo: dia, quadro, cor, termo do glossário e próximo vídeo.
const fs = require('fs');
const path = require('path');
const C = path.join(__dirname, '..', 'conteudo');

const QUADROS = {
  A: { file: '1-de-onde-vem.txt', nome: 'De Onde Vem?', hora: '07h', cor: '#E8A33D' },
  B: { file: '2-aula-de-letras.txt', nome: 'Aula de Letras', hora: '10h', cor: '#D9D0BC' },
  C: { file: '3-mito-ou-verdade.txt', nome: 'Mito ou Verdade', hora: '12h', cor: '#E05A4F' },
  D: { file: '4-linguas-extremas.txt', nome: 'Línguas Extremas', hora: '15h', cor: '#F2C94C' },
  E: { file: '5-brasil-falado.txt', nome: 'Brasil Falado', hora: '18h', cor: '#4CAF7A' },
  F: { file: '6-linguas-primas.txt', nome: 'Línguas Primas', hora: '20h', cor: '#5B9BE0' },
  G: { file: '7-genios.txt', nome: 'Gênios da Linguística', hora: '22h', cor: '#A57FDB' },
};
const blocos = txt => txt.split(/^## /m).slice(1).map(b => {
  const ls = b.split('\n'); const e = { key: ls[0].trim() };
  for (const l of ls.slice(1)) { const m = l.match(/^(FMT|V\+|[GRVLFTP]): (.*)$/); if (m) e[m[1]] = m[2].trim(); }
  return e;
});
const base = {};
for (const [q, d] of Object.entries(QUADROS)) blocos(fs.readFileSync(path.join(C, d.file), 'utf8')).forEach((e, i) => { base[q + (i + 1)] = e; });

const lista = [];
for (const f of ['semana-1.txt', 'semana-2.txt', 'semana-3.txt', 'semana-4.txt', 'final.txt']) {
  const txt = fs.readFileSync(path.join(C, 'semanas', f), 'utf8');
  for (const parte of txt.split(/^# DIA /m).slice(1)) {
    const [n, tema] = parte.split('\n')[0].split('|').map(s => s.trim());
    for (const v of blocos(parte)) lista.push({ id: v.key, dia: +n, tema, q: v.key[0], titulo: base[v.key].key, gancho: v.G || base[v.key].G, roteiro: v.R, formato: v.FMT, termo: v.T, legenda: v.L || base[v.key].L, fonte: base[v.key].F });
  }
}
const glos = new Map();
lista.forEach((v, i) => {
  const k = v.termo.toLowerCase();
  if (!glos.has(k)) glos.set(k, glos.size + 1);
  v.termoN = glos.get(k);
  v.termoNovo = lista.findIndex(x => x.termo.toLowerCase() === k) === i;
  Object.assign(v, QUADROS[v.q], { quadro: QUADROS[v.q].nome });
  const p = lista[i + 1];
  v.prox = p ? { titulo: p.titulo, hora: QUADROS[p.q].hora, quadro: QUADROS[p.q].nome, cor: QUADROS[p.q].cor, amanha: p.dia !== v.dia } : null;
});
const porId = Object.fromEntries(lista.map(v => [v.id, v]));
module.exports = { lista, porId, QUADROS };
