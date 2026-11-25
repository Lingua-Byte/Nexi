/* RAIZ — conhecimento linguístico próprio (sem IA externa).
   1) Português falado do Brasil → forma que o tradutor entende (tô → estou).
   2) Conceitos brasileiros quase intraduzíveis: o que significam e como dizer de forma
      traduzível. O motor neural traduz o SENTIDO, não a palavra.
   3) Conjugação do português (para montar as 8 pessoas de qualquer verbo).
   Tudo em português: vale para as 8 línguas ao mesmo tempo. */

/* \b do JavaScript não entende letras acentuadas (ô, é, ã): troca por uma fronteira Unicode. */
const UB = '(?:(?<=[\\p{L}\\p{N}])(?![\\p{L}\\p{N}])|(?<![\\p{L}\\p{N}])(?=[\\p{L}\\p{N}]))';
function U(re) { return new RegExp(re.source.replace(/\\b/g, UB), re.flags.includes('u') ? re.flags : re.flags + 'u'); }

/* ——— 1. Português falado ——— */
const PT_FALADO = [
  [/\btô\b/gi, 'estou'], [/\btá\b/gi, 'está'], [/\btava\b/gi, 'estava'], [/\btavam\b/gi, 'estavam'],
  [/\btamo\b/gi, 'estamos'], [/\bcê\b/gi, 'você'], [/\bvc\b/gi, 'você'], [/\bvcs\b/gi, 'vocês'],
  [/\bpra\b/gi, 'para'], [/\bpras\b/gi, 'para as'], [/\bpro\b/gi, 'para o'], [/\bpros\b/gi, 'para os'],
  [/\btb\b|\btbm\b/gi, 'também'], [/\bq\b/gi, 'que'], [/\bblz\b/gi, 'beleza'], [/\bobg\b/gi, 'obrigado'],
  [/,?\s*\bné\b\??/gi, ''], [/\bnum\b(?= (sei|quero|posso|vou|tenho|gosto))/gi, 'não'], [/\bmó\b/gi, 'muito'],
  [/\bdaí\b/gi, 'então']
];
function falado(text) {
  let t = String(text);
  for (const [re, to] of PT_FALADO) t = t.replace(U(re), m => {
    const out = to; return m[0] && m[0] === m[0].toUpperCase() && m[0] !== m[0].toLowerCase() ? out.charAt(0).toUpperCase() + out.slice(1) : out;
  });
  return t.replace(/\s{2,}/g, ' ').replace(/\s+([.,!?])/g, '$1').trim();
}

/* ——— 2. Conceitos ———
   tipo 'nome': troca a palavra por uma descrição (cafuné → carinho no cabelo).
   tipo 'verbo': verbo + complemento → outro verbo conjugado na mesma pessoa e tempo.
   tipo 'fixa': expressão fixa → equivalente.
   'diz': o que significa, para mostrar ao aluno. */
const CONCEITOS = [
  // nomes e palavras "intraduzíveis"
  { id: 'cafune', tipo: 'nome', pt: 'cafuné', re: /\bcafun[eé]s?\b/gi, por: 'carinho no cabelo', diz: 'Passar os dedos devagar no cabelo de alguém, com carinho. Quase nenhuma língua tem uma palavra só: descreve-se o gesto.' },
  { id: 'saudade', tipo: 'fixa', pt: 'saudade', re: /\b(estou|estava|fiquei|fico|tenho|tinha|sinto|senti|morro de|morrendo de) (com )?saudades? (d[aeo]s?)\b/gi,
    por: (m, v, com, art) => `${({ estou: 'sinto', estava: 'sentia', fiquei: 'senti', fico: 'sinto', tenho: 'sinto', tinha: 'sentia', sinto: 'sinto', senti: 'senti', 'morro de': 'sinto muita', 'morrendo de': 'sentindo muita' })[v.toLowerCase()] || 'sinto'} falta ${art}`,
    diz: 'Sentir falta de alguém ou de algo, com carinho e um pouco de tristeza. Em várias línguas vira “sentir falta” (miss, extrañar, manquer…).' },
  { id: 'saudade-n', tipo: 'nome', pt: 'saudade', re: /\bsaudades?\b/gi, por: 'falta que sinto', diz: 'Sentir falta de alguém ou de algo, com carinho e um pouco de tristeza.' },
  { id: 'gambiarra', tipo: 'nome', pt: 'gambiarra', re: /\bgambiarras?\b/gi, por: 'conserto improvisado', diz: 'Solução improvisada, criativa e provisória para consertar algo.' },
  { id: 'xodo', tipo: 'nome', pt: 'xodó', re: /\bxod[oó]s?\b/gi, por: 'preferido', diz: 'Pessoa, bicho ou coisa de que se gosta muito, o queridinho.' },
  { id: 'jeitinho', tipo: 'nome', pt: 'jeitinho', re: /\bjeitinho\b/gi, por: 'modo criativo de resolver', diz: 'O “jeitinho brasileiro”: um modo criativo (às vezes duvidoso) de contornar regras ou problemas.' },
  { id: 'paodur', tipo: 'nome', pt: 'pão-duro / mão de vaca', re: /\b(p[aã]o[- ]dur[oa]|m[aã]o[- ]de[- ]vaca)\b/gi, por: 'avarento', diz: 'Pessoa que não gosta de gastar dinheiro.' },
  { id: 'fofoca', tipo: 'nome', pt: 'fofoca', re: /\bfofocas?\b/gi, por: 'boato', diz: 'Conversa sobre a vida dos outros, boato.' },
  { id: 'dorcot', tipo: 'nome', pt: 'dor de cotovelo', re: /\bdor de cotovelo\b/gi, por: 'ciúme', diz: 'Ciúme ou tristeza por amor não correspondido.' },
  { id: 'malandro', tipo: 'nome', pt: 'malandragem', re: /\bmalandragem\b/gi, por: 'esperteza', diz: 'Esperteza para se dar bem, às vezes passando por cima das regras.' },
  { id: 'chato', tipo: 'nome', pt: 'um saco', re: /\bum saco\b/gi, por: 'muito chato', diz: '“Que saco!”: algo muito chato ou irritante.' },
  // verbos com complemento (o verbo troca, a pessoa e o tempo ficam)
  { id: 'jeito', tipo: 'verbo', pt: 'dar um jeito', verbo: 'dar', resto: 'um jeito( em| no| na| nisso| nisto| naquilo)?', por: 'resolver', diz: 'Encontrar uma solução, mesmo que improvisada.' },
  { id: 'volta', tipo: 'verbo', pt: 'dar uma volta', verbo: 'dar', resto: 'uma volta', por: 'passear', diz: 'Sair para passear um pouco, sem destino certo.' },
  { id: 'certo', tipo: 'verbo', pt: 'dar certo', verbo: 'dar', resto: 'certo', por: 'funcionar', diz: 'Funcionar, ter sucesso.' },
  { id: 'errado', tipo: 'verbo', pt: 'dar errado', verbo: 'dar', resto: 'errado', por: 'fracassar', diz: 'Não funcionar, falhar.' },
  { id: 'bolo', tipo: 'verbo', pt: 'dar um bolo', verbo: 'dar', resto: 'um bolo( em| no| na)?', por: 'faltar ao encontro com', diz: 'Não aparecer num encontro combinado.' },
  { id: 'mao', tipo: 'verbo', pt: 'dar uma mão', verbo: 'dar', resto: 'uma m[aã]o', por: 'ajudar', diz: 'Ajudar.' },
  { id: 'papo', tipo: 'verbo', pt: 'bater papo', verbo: 'bater', resto: '(um )?papo', por: 'conversar', diz: 'Conversar de forma descontraída.' },
  { id: 'assunto', tipo: 'verbo', pt: 'puxar assunto', verbo: 'puxar', resto: 'assunto', por: 'começar uma conversa', diz: 'Começar uma conversa com alguém.' },
  { id: 'ficha', tipo: 'verbo', pt: 'cair a ficha', verbo: 'cair', resto: 'a ficha', por: 'perceber', diz: 'Entender algo de repente.' },
  { id: 'saco', tipo: 'verbo', pt: 'encher o saco', verbo: 'encher', resto: 'o saco', por: 'irritar', diz: 'Irritar, incomodar.' },
  { id: 'bola', tipo: 'verbo', pt: 'pisar na bola', verbo: 'pisar', resto: 'na bola', por: 'errar', diz: 'Cometer um erro, decepcionar alguém.' },
  { id: 'mico', tipo: 'verbo', pt: 'pagar mico', verbo: 'pagar', resto: '(um )?mico', por: 'passar vergonha', diz: 'Passar vergonha em público.' },
  { id: 'balde', tipo: 'verbo', pt: 'chutar o balde', verbo: 'chutar', resto: 'o balde', por: 'desistir de tudo', diz: 'Desistir de tudo, perder a paciência.' },
  { id: 'galho', tipo: 'verbo', pt: 'quebrar o galho', verbo: 'quebrar', resto: '(um |o )galho', por: 'ajudar provisoriamente', diz: 'Ajudar a resolver, mesmo que de forma provisória.' },
  { id: 'jogo', tipo: 'verbo', pt: 'abrir o jogo', verbo: 'abrir', resto: 'o jogo', por: 'falar a verdade', diz: 'Contar a verdade, ser sincero.' },
  { id: 'questao', tipo: 'verbo', pt: 'fazer questão', verbo: 'fazer', resto: 'quest[aã]o( de)?', por: 'insistir em', diz: 'Considerar muito importante; insistir.' },
  { id: 'hora', tipo: 'verbo', pt: 'fazer hora', verbo: 'fazer', resto: 'hora', por: 'esperar passando o tempo', diz: 'Passar o tempo enquanto espera algo.' },
  { id: 'falta', tipo: 'verbo', pt: 'fazer falta', verbo: 'fazer', resto: 'falta', por: 'ser necessário', diz: '“Você me faz falta”: sentir falta de alguém ou algo.' },
  { id: 'sono', tipo: 'verbo', pt: 'pegar no sono', verbo: 'pegar', resto: 'no sono', por: 'adormecer', diz: 'Adormecer, cair no sono.' },
  { id: 'rir', tipo: 'verbo', pt: 'morrer de rir', verbo: 'morrer', resto: 'de rir', por: 'rir muito', diz: 'Rir muito.' },
  { id: 'fome', tipo: 'verbo', pt: 'morrer de fome', verbo: 'morrer', resto: 'de fome', por: 'ter muita fome', diz: 'Estar com muita fome (exagero).' },
  { id: 'graca', tipo: 'verbo', pt: 'ficar sem graça', verbo: 'ficar', resto: 'sem gra[cç]a', por: 'ficar envergonhado', diz: 'Ficar envergonhado, constrangido.' },
  { id: 'ficarcom', tipo: 'verbo', pt: 'ficar com alguém', verbo: 'ficar', resto: 'com (ele|ela|alguém|um cara|uma menina|uma garota|um garoto)', por: 'beijar', diz: '“Ficar com alguém”: beijar ou namorar sem compromisso.' },
  { id: 'cotovelos', tipo: 'verbo', pt: 'falar pelos cotovelos', verbo: 'falar', resto: 'pelos cotovelos', por: 'falar demais', diz: 'Falar demais.' },
  { id: 'pauzinhos', tipo: 'verbo', pt: 'mexer os pauzinhos', verbo: 'mexer', resto: 'os pauzinhos', por: 'usar a influência', diz: 'Usar contatos e influência para conseguir algo.' },
  { id: 'pena', tipo: 'verbo', pt: 'valer a pena', verbo: 'valer', resto: 'a pena', por: 'compensar', diz: 'Compensar o esforço.' },
  { id: 'preguica', tipo: 'verbo', pt: 'estar com preguiça', verbo: 'estar', resto: 'com pregui[cç]a( de)?', por: 'não ter vontade de', diz: 'Não ter vontade de fazer nada.' },
  // expressões fixas
  { id: 'tantofaz', tipo: 'fixa', pt: 'tanto faz', re: /\btanto faz\b/gi, por: 'não faz diferença', diz: 'Não faz diferença, qualquer opção serve.' },
  { id: 'deixa', tipo: 'fixa', pt: 'deixa pra lá', re: /\bdeixa (para|pra) l[aá]\b/gi, por: 'esquece isso', diz: 'Esqueça, não tem importância.' },
  { id: 'deboa', tipo: 'fixa', pt: 'de boa', re: /\bde boa\b/gi, por: 'tranquilo', diz: 'Tranquilo, sem problemas.' },
  { id: 'atoa', tipo: 'fixa', pt: 'à toa / de bobeira', re: /\b(à toa|a toa|de bobeira)\b/gi, por: 'sem fazer nada', diz: 'Sem fazer nada, relaxando.' },
  { id: 'nuvens', tipo: 'fixa', pt: 'estar nas nuvens', re: /\bnas nuvens\b/gi, por: 'distraído', diz: 'Distraído, sonhando acordado.' },
  { id: 'corda', tipo: 'fixa', pt: 'com a corda toda', re: /\bcom a corda toda\b/gi, por: 'com muita energia', diz: 'Com muita energia.' },
  { id: 'valeu', tipo: 'fixa', pt: 'valeu', re: /\bvaleu\b(?! a pena)/gi, por: 'obrigado', diz: 'Obrigado (informal).' },
  { id: 'eai', tipo: 'fixa', pt: 'e aí', re: /^e a[ií]\b[,!?]?/gi, por: 'oi, tudo bem?', diz: 'Cumprimento informal: “oi, como vai?”.' },
  { id: 'beleza', tipo: 'fixa', pt: 'beleza?', re: /\bbeleza\?/gi, por: 'tudo bem?', diz: '“Beleza?” = “tudo bem?”.' },
  { id: 'nossa', tipo: 'fixa', pt: 'nossa!', re: /^nossa[,!]/gi, por: 'uau!', diz: 'Expressão de surpresa.' },
  { id: 'sabe', tipo: 'fixa', pt: 'sabe? / entende?', re: /,?\s*(sabe|entende)\?$/gi, por: '', diz: 'Muleta de fala, quase não muda o sentido.' }
];

/* ——— 3. Conjugação do português ———
   Lugares (slot): 0 eu (pres.), 1 ele/você (pres.), 2 nós (pres.), 3 eles/vocês (pres.),
   4 eu (pret.), 5 ele (pret.), 6 eles (pret.), 7 ele (imperf.), 8 eles (imperf.), 9 gerúndio, 10 particípio, 11 infinitivo */
const SUF = {
  ar: ['o', 'a', 'amos', 'am', 'ei', 'ou', 'aram', 'ava', 'avam', 'ando', 'ado', 'ar'],
  er: ['o', 'e', 'emos', 'em', 'i', 'eu', 'eram', 'ia', 'iam', 'endo', 'ido', 'er'],
  ir: ['o', 'e', 'imos', 'em', 'i', 'iu', 'iram', 'ia', 'iam', 'indo', 'ido', 'ir']
};
/* irregulares mais comuns, na ordem dos lugares acima */
const PT_IRREG = {
  ser: 'sou é somos são fui foi foram era eram sendo sido ser', estar: 'estou está estamos estão estive esteve estiveram estava estavam estando estado estar',
  ter: 'tenho tem temos têm tive teve tiveram tinha tinham tendo tido ter', ir: 'vou vai vamos vão fui foi foram ia iam indo ido ir',
  fazer: 'faço faz fazemos fazem fiz fez fizeram fazia faziam fazendo feito fazer', poder: 'posso pode podemos podem pude pôde puderam podia podiam podendo podido poder',
  querer: 'quero quer queremos querem quis quis quiseram queria queriam querendo querido querer', saber: 'sei sabe sabemos sabem soube soube souberam sabia sabiam sabendo sabido saber',
  ver: 'vejo vê vemos veem vi viu viram via viam vendo visto ver', vir: 'venho vem vimos vêm vim veio vieram vinha vinham vindo vindo vir',
  dizer: 'digo diz dizemos dizem disse disse disseram dizia diziam dizendo dito dizer', dar: 'dou dá damos dão dei deu deram dava davam dando dado dar',
  sair: 'saio sai saímos saem saí saiu saíram saía saíam saindo saído sair', trazer: 'trago traz trazemos trazem trouxe trouxe trouxeram trazia traziam trazendo trazido trazer',
  ouvir: 'ouço ouve ouvimos ouvem ouvi ouviu ouviram ouvia ouviam ouvindo ouvido ouvir', ler: 'leio lê lemos leem li leu leram lia liam lendo lido ler',
  pedir: 'peço pede pedimos pedem pedi pediu pediram pedia pediam pedindo pedido pedir', sentir: 'sinto sente sentimos sentem senti sentiu sentiram sentia sentiam sentindo sentido sentir',
  conseguir: 'consigo consegue conseguimos conseguem consegui conseguiu conseguiram conseguia conseguiam conseguindo conseguido conseguir',
  preferir: 'prefiro prefere preferimos preferem preferi preferiu preferiram preferia preferiam preferindo preferido preferir',
  perder: 'perco perde perdemos perdem perdi perdeu perderam perdia perdiam perdendo perdido perder', dormir: 'durmo dorme dormimos dormem dormi dormiu dormiram dormia dormiam dormindo dormido dormir',
  pôr: 'ponho põe pomos põem pus pôs puseram punha punham pondo posto pôr', cair: 'caio cai caímos caem caí caiu caíram caía caíam caindo caído cair',
  rir: 'rio ri rimos riem ri riu riram ria riam rindo rido rir', vestir: 'visto veste vestimos vestem vesti vestiu vestiram vestia vestiam vestindo vestido vestir',
  seguir: 'sigo segue seguimos seguem segui seguiu seguiram seguia seguiam seguindo seguido seguir', valer: 'valho vale valemos valem vali valeu valeram valia valiam valendo valido valer',
  morrer: 'morro morre morremos morrem morri morreu morreram morria morriam morrendo morrido morrer', fugir: 'fujo foge fugimos fogem fugi fugiu fugiram fugia fugiam fugindo fugido fugir'
};
function ptConj(inf, slot) {
  if (PT_IRREG[inf]) return PT_IRREG[inf].split(' ')[slot];
  const end = inf.slice(-2), root = inf.slice(0, -2), suf = SUF[end];
  if (!suf) return inf;
  let f = root + suf[slot];
  // ortografia: ficar → fiquei, pagar → paguei, começar → comecei, conhecer → conheço
  if (slot === 4 && end === 'ar') {
    if (root.endsWith('c')) f = root.slice(0, -1) + 'quei';
    else if (root.endsWith('g')) f = root + 'uei';
    else if (root.endsWith('ç')) f = root.slice(0, -1) + 'cei';
  }
  if (slot === 0 && end === 'er' && root.endsWith('c')) f = root.slice(0, -1) + 'ço';
  return f;
}
/* forma → { lemma, slot } (para trocar um verbo por outro na mesma pessoa e tempo) */
let FORMS = null;
function ptForms() {
  if (FORMS) return FORMS;
  FORMS = new Map();
  const add = inf => { for (let s = 0; s < 12; s++) { const f = ptConj(inf, s); if (f && !FORMS.has(f)) FORMS.set(f, { lemma: inf, slot: s }); } };
  Object.keys(PT_IRREG).forEach(add);
  (typeof PT_LEX_REG !== 'undefined' ? PT_LEX_REG : []).forEach(add);
  ['puxar', 'encher', 'pisar', 'chutar', 'quebrar', 'mexer', 'valer'].forEach(add);
  return FORMS;
}
/* pessoa → lugar do presente: eu, você, ele, ela, nós, vocês, eles, elas */
const PRES_SLOT = [0, 1, 1, 1, 2, 3, 3, 3];
function conjPhrase(inf, person) { return ptConj(inf, PRES_SLOT[person]); }
/* conjuga a primeira palavra de uma locução ("começar uma conversa" → "começo uma conversa") */
function conjLocucao(loc, slot) {
  const [v, ...rest] = loc.split(' ');
  return [ptConj(v, slot), ...rest].join(' ');
}

/* ——— Encontrar conceitos numa frase e reescrever para o tradutor ——— */
function verboRegex(c) {
  const forms = ptForms();
  const fs = [...forms.entries()].filter(([, v]) => v.lemma === c.verbo).map(([f]) => f);
  if (!fs.length) fs.push(c.verbo);
  return U(new RegExp(`\\b(${fs.sort((a, b) => b.length - a.length).join('|')}) (${c.resto})\\b`, 'gi'));
}
function conceitos(text) {
  const found = [];
  let rewritten = text;
  for (const c of CONCEITOS) {
    const re = c.tipo === 'verbo' ? verboRegex(c) : U(c.re);
    let hit = false;
    rewritten = rewritten.replace(re, (...args) => {
      const m = args[0];
      hit = true;
      if (c.tipo === 'verbo') {
        const info = ptForms().get(String(args[1]).toLowerCase());
        return info ? conjLocucao(c.por, info.slot) : m;
      }
      return typeof c.por === 'function' ? c.por(...args) : c.por;
    });
    if (hit && !found.some(f => f.id === c.id)) found.push(c);
  }
  rewritten = rewritten.replace(U(/\b(com|para|de) n(ele|ela|eles|elas)\b/gi), '$1 $2');
  if (/^\p{Lu}/u.test(text)) rewritten = rewritten.replace(/^\s*(\p{Ll})/u, (m, c) => c.toUpperCase());
  return { found, rewritten: rewritten.replace(/\s{2,}/g, ' ').trim() };
}

/* Divide um texto em frases. */
function frases(text) {
  return String(text).split(/(?<=[.!?…])\s+|\n+/).map(s => s.trim()).filter(Boolean);
}

/* Complemento que define o sentido de um verbo na frase (até 3 palavras, para antes de vírgula/conjunção). */
function complemento(sentence, verbForm) {
  const words = sentence.replace(/[.!?…]+$/, '').split(/\s+/);
  const i = words.findIndex(w => w.toLowerCase().replace(/[,;:]$/, '') === verbForm.toLowerCase());
  if (i < 0) return '';
  const out = [];
  for (const w of words.slice(i + 1)) {
    const clean = w.toLowerCase();
    if (/^(e|mas|que|porque|quando|se|ou|depois|antes|então)$/.test(clean)) break;
    if (out.length >= 2 && /^(de|da|do|em|no|na|às|as|ao|à|pela|pelo|com|para|todo|toda)$/.test(clean)) break;
    out.push(w.replace(/[,;:]$/, ''));
    if (/[,;:]$/.test(w) || out.length >= 3) break;
  }
  return out.join(' ');
}

/* Diferença palavra a palavra entre o que o aluno escreveu e uma referência (para marcar). */
function diffWords(a, b) {
  const tok = s => String(s).split(/(\s+)/).filter(x => x.trim());
  const A = tok(a), B = tok(b);
  const norm = w => w.toLowerCase().replace(/[.,!?¡¿;:"“”]/g, '');
  const dp = Array.from({ length: A.length + 1 }, () => Array(B.length + 1).fill(0));
  for (let i = A.length - 1; i >= 0; i--) for (let j = B.length - 1; j >= 0; j--)
    dp[i][j] = norm(A[i]) === norm(B[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out = []; let i = 0, j = 0;
  while (i < A.length && j < B.length) {
    if (norm(A[i]) === norm(B[j])) { out.push({ t: B[j], k: 'eq' }); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { out.push({ t: A[i], k: 'del' }); i++; }
    else { out.push({ t: B[j], k: 'add' }); j++; }
  }
  while (i < A.length) out.push({ t: A[i++], k: 'del' });
  while (j < B.length) out.push({ t: B[j++], k: 'add' });
  const same = dp[0][0], score = Math.round(2 * same / Math.max(1, A.length + B.length) * 100);
  return { parts: out, score };
}

/* Romanização do coreano (Romanização Revisada, simplificada). */
function romanKo(text) {
  const I = ['g', 'kk', 'n', 'd', 'tt', 'r', 'm', 'b', 'pp', 's', 'ss', '', 'j', 'jj', 'ch', 'k', 't', 'p', 'h'];
  const V = ['a', 'ae', 'ya', 'yae', 'eo', 'e', 'yeo', 'ye', 'o', 'wa', 'wae', 'oe', 'yo', 'u', 'wo', 'we', 'wi', 'yu', 'eu', 'ui', 'i'];
  const F = ['', 'k', 'k', 'k', 'n', 'n', 'n', 't', 'l', 'k', 'm', 'l', 'l', 'l', 'p', 'l', 'm', 'p', 'p', 't', 't', 'ng', 't', 't', 'k', 't', 'p', 't'];
  return [...String(text)].map(ch => {
    const c = ch.charCodeAt(0) - 0xAC00;
    if (c < 0 || c > 11171) return ch;
    return I[Math.floor(c / 588)] + V[Math.floor((c % 588) / 28)] + F[c % 28];
  }).join('');
}
