"use strict";
/* ======================================================================
   NEXI Voz — síntese de fala do zero, em português do Brasil
   texto → normalização → fonemas (regras PT-BR) → prosódia → síntese de
   formantes (pulso glotal + trato vocal em cascata + ruído de fricção)
   ====================================================================== */
const TTS_SR = 24000;

/* ---------------- Normalização ---------------- */
const NUM_UN = ['zero','um','dois','três','quatro','cinco','seis','sete','oito','nove','dez','onze','doze','treze','quatorze','quinze','dezesseis','dezessete','dezoito','dezenove'];
const NUM_DEZ = ['','','vinte','trinta','quarenta','cinquenta','sessenta','setenta','oitenta','noventa'];
const NUM_CEN = ['','cento','duzentos','trezentos','quatrocentos','quinhentos','seiscentos','setecentos','oitocentos','novecentos'];
function numPt(n){
  n = Math.floor(n);
  if (n < 20) return NUM_UN[n];
  if (n < 100) return NUM_DEZ[Math.floor(n/10)] + (n % 10 ? ' e ' + NUM_UN[n % 10] : '');
  if (n === 100) return 'cem';
  if (n < 1000) return NUM_CEN[Math.floor(n/100)] + (n % 100 ? ' e ' + numPt(n % 100) : '');
  if (n < 1e6){ const k = Math.floor(n/1000), r = n % 1000; return (k === 1 ? 'mil' : numPt(k) + ' mil') + (r ? (r < 100 || r % 100 === 0 ? ' e ' : ' ') + numPt(r) : ''); }
  if (n < 1e9){ const m = Math.floor(n/1e6), r = n % 1e6; return (m === 1 ? 'um milhão' : numPt(m) + ' milhões') + (r ? ' ' + numPt(r) : ''); }
  return String(n).split('').map(d => NUM_UN[+d]).join(' ');
}
const ABBR = {sr:'senhor', sra:'senhora', srta:'senhorita', dr:'doutor', dra:'doutora', prof:'professor', profa:'professora', etc:'etcétera',
  vc:'você', vcs:'vocês', pq:'porque', tb:'também', tbm:'também', q:'que', hj:'hoje', obs:'observação', ex:'exemplo', av:'avenida', km:'quilômetros', kg:'quilos'};
function normalizeText(t){
  t = ' ' + t.replace(/\s+/g, ' ') + ' ';
  t = t.replace(/R\$\s?(\d+)(?:,(\d{2}))?/g, (_, r, c) => `${numPt(+r)} ${+r === 1 ? 'real' : 'reais'}${c && +c ? ' e ' + numPt(+c) + ' centavos' : ''}`);
  t = t.replace(/(\d+)%/g, (_, n) => numPt(+n) + ' por cento');
  t = t.replace(/(\d+),(\d+)/g, (_, a, b) => numPt(+a) + ' vírgula ' + b.split('').map(d => NUM_UN[+d]).join(' '));
  t = t.replace(/(\d{1,2}):(\d{2})/g, (_, h, m) => numPt(+h) + (+h === 1 ? ' hora' : ' horas') + (+m ? ' e ' + numPt(+m) : ''));
  t = t.replace(/\d+/g, n => numPt(+n));
  t = t.replace(/\b([A-Za-zÀ-ú]+)\./g, (m, w) => ABBR[w.toLowerCase()] ? ABBR[w.toLowerCase()] + ' ' : m);
  t = t.replace(/\b([A-Za-zÀ-ú]+)\b/g, w => ABBR[w.toLowerCase()] && w.length <= 3 && w === w.toLowerCase() ? ABBR[w] : w);
  t = t.replace(/&/g, ' e ').replace(/@/g, ' arroba ').replace(/\+/g, ' mais ');
  return t.trim();
}
// frases com tipo de entonação
function splitPhrases(t){
  const out = [], re = /([^.!?;:,…\n]+)([.!?;:,…\n]+|$)/g; let m;
  while ((m = re.exec(t))){
    const words = m[1].trim(); if (!words) continue;
    const p = m[2] || '.'; const type = p.includes('?') ? 'q' : p.includes('!') ? 'x' : /[,;:]/.test(p) ? 'c' : p.includes('…') || p.includes('..') ? 's' : 'd';
    out.push({text: words, type, pause: {q: 0.42, x: 0.42, c: 0.2, s: 0.55, d: 0.45}[type]});
  }
  return out;
}

/* ---------------- Fonemas (regras PT-BR) ---------------- */
const CLITICS = {de:'dZi', do:'du', da:'d@', dos:'dus', das:'d@s', que:'ki', se:'si', me:'mi', te:'tSi', lhe:'Li', o:'u', os:'us', a:'@', as:'@s', e:'i',
  em:'e~j~', no:'nu', na:'n@', nos:'nus', nas:'n@s', um:'u~', com:'ko~', por:'puR', para:'p@r@', pra:'pr@', ao:'aw', aos:'aws', meu:'mew', seu:'sew', sem:'se~j~'};
const VOW = 'aáàâãeéêiíoóôõuúü';
const isVow = c => c && VOW.includes(c);
function tokensFromClitic(code){ // "dZi" -> [{p:'dZ'},{p:'i'}]
  const out = []; for (let i=0; i<code.length; i++){
    const two = code.slice(i, i+2);
    if (two === 'tS' || two === 'dZ'){ out.push({p: two}); i++; continue; }
    if (code[i+1] === '~'){ out.push({p: code[i], nas: true, v: 'aeiou@EO'.includes(code[i])}); i++; continue; }
    out.push({p: code[i], v: 'aeiou@EO'.includes(code[i])});
  }
  return out;
}
function g2p(word){
  const w = word.toLowerCase().replace(/[^a-zà-úç-]/g, '');
  if (!w) return [];
  if (CLITICS[w]) return tokensFromClitic(CLITICS[w]).map(t => ({...t, clitic: true}));
  const T = []; // tokens {p, v (vogal), acc (acento gráfico), nas}
  for (let i=0; i<w.length; i++){
    const c = w[i], n = w[i+1], n2 = w[i+2], p = w[i-1];
    if (isVow(c)){
      const map = {á:['a',1],à:['a',0],â:['a',1],ã:['a',2],é:['E',1],ê:['e',1],í:['i',1],ó:['O',1],ô:['o',1],õ:['o',2],ú:['u',1],ü:['u',0]};
      const [b, a] = map[c] || [c, 0];
      T.push({p: b, v: true, acc: a === 1, nas: a === 2, tilde: a === 2, ch: c}); continue;
    }
    switch (c){
      case 'h': break;
      case 'c': if (n === 'h'){ T.push({p:'S'}); i++; } else if ('eéêiíy'.includes(n || '#')) T.push({p:'s'}); else T.push({p:'k'}); break;
      case 'ç': T.push({p:'s'}); break;
      case 'g': if ('eéêií'.includes(n || '#')) T.push({p:'Z'}); else if (n === 'u' && 'eéêií'.includes(n2 || '#')){ T.push({p:'g'}); i++; } else T.push({p:'g'}); break;
      case 'q': T.push({p:'k'}); if (n === 'u'){ if ('eéêií'.includes(n2 || '#')) i++; else { T.push({p:'w'}); i++; } } break;
      case 'l': if (n === 'h'){ T.push({p:'L'}); i++; } else T.push({p:'l'}); break;
      case 'n': if (n === 'h'){ T.push({p:'J'}); i++; } else T.push({p:'n', nasC: true}); break;
      case 'm': T.push({p:'m', nasC: true}); break;
      case 'r': if (n === 'r'){ T.push({p:'R'}); i++; } else if (i === 0 || 'nls'.includes(p)) T.push({p:'R'}); else if (isVow(p) && isVow(n)) T.push({p:'r'}); else if (!isVow(n)) T.push({p:'R', coda: true}); else T.push({p:'r'}); break;
      case 's': if (n === 's'){ T.push({p:'s'}); i++; } else if (n === 'c' && 'eéêií'.includes(n2 || '#')){ T.push({p:'s'}); i++; } else if (isVow(p) && isVow(n)) T.push({p:'z'}); else T.push({p:'s'}); break;
      case 'x': if (i === 1 && p === 'e' && isVow(n)) T.push({p:'z'}); else T.push({p:'S'}); break;
      case 'z': T.push({p: i === w.length-1 ? 's' : 'z'}); break;
      case 'j': T.push({p:'Z'}); break;
      case 'y': T.push({p:'i', v: true}); break;
      case 'w': T.push({p:'u', v: true}); break;
      case 'k': T.push({p:'k'}); break;
      case '-': break;
      default: if ('pbtdfvk'.includes(c)) T.push({p: c});
    }
  }
  // nasalização por m/n em coda
  for (let i=0; i<T.length; i++){
    const t = T[i];
    if (t.nasC && i > 0 && T[i-1].v && !(T[i+1] && T[i+1].v)){
      T[i-1].nas = true; T[i-1].fromMN = t.p; T.splice(i, 1); i--;
    }
  }
  // ditongos: i/u átonos ao lado de outra vogal viram semivogais
  for (let i=0; i<T.length; i++){
    const t = T[i]; if (!t.v || t.acc || !(t.p === 'i' || t.p === 'u')) continue;
    const prev = T[i-1], next = T[i+1];
    if (prev && prev.v && !(prev.p === 'i' || prev.p === 'u') ){ t.p = t.p === 'i' ? 'j' : 'w'; t.v = false; t.glide = true; t.nas = prev.nas; }
    else if (prev && prev.v && (prev.p === 'i' || prev.p === 'u') && prev.p !== t.p){ t.p = t.p === 'i' ? 'j' : 'w'; t.v = false; t.glide = true; }
  }
  // ão / õe / ãe
  for (let i=0; i<T.length-1; i++){
    if (T[i].v && T[i].tilde && T[i+1].v && (T[i+1].p === 'o' || T[i+1].p === 'e')){ T[i+1] = {p: T[i+1].p === 'o' ? 'w' : 'j', glide: true, nas: true}; }
  }
  const nuclei = T.map((t, i) => t.v ? i : -1).filter(i => i >= 0);
  if (!nuclei.length) return T;
  let stress = nuclei.findIndex(i => T[i].acc);
  if (stress < 0) stress = nuclei.findIndex(i => T[i].tilde);
  if (stress < 0){
    const paroxytone = /([aeo]s?|em|ens|am)$/.test(w) && !/(ão|ãos)$/.test(w);
    stress = paroxytone && nuclei.length > 1 ? nuclei.length - 2 : nuclei.length - 1;
  }
  const sIdx = nuclei[stress]; T[sIdx].stress = true;
  // reduções de vogais átonas finais
  const last = nuclei[nuclei.length-1];
  if (!T[last].stress && !T[last].nas){
    const tail = T.slice(last+1).every(t => t.p === 's');
    if (tail){ if (T[last].p === 'e' || T[last].p === 'E') T[last].p = 'i'; else if (T[last].p === 'o' || T[last].p === 'O') T[last].p = 'u'; else if (T[last].p === 'a') T[last].p = '@'; }
  }
  // final "em"/"am" nasal → ditongo nasal
  if (T[last].nas && T[last].fromMN === 'm' && last === T.length-1){ if (T[last].p === 'e' || T[last].p === 'E') T.push({p:'j', glide:true, nas:true}); else if (T[last].p === 'a') T.push({p:'w', glide:true, nas:true}); }
  // contexto: t/d antes de i → tS/dZ; l em coda → w
  for (let i=0; i<T.length; i++){
    const t = T[i], n = T[i+1];
    if ((t.p === 't' || t.p === 'd') && n && (n.p === 'i' || n.p === 'j') && !n.glide) t.p = t.p === 't' ? 'tS' : 'dZ';
    if (t.p === 'l' && !(n && (n.v || n.glide))) { t.p = 'w'; t.glide = true; }
  }
  return T;
}

/* ---------------- Inventário acústico ---------------- */
// formantes de referência (voz masculina adulta), Hz
const PHON = {
  a:{f:[720,1300,2500]}, '@':{f:[560,1420,2450]}, e:{f:[420,2000,2600]}, E:{f:[560,1850,2550]}, i:{f:[290,2250,2950]},
  o:{f:[440,880,2400]}, O:{f:[590,960,2450]}, u:{f:[320,800,2300]},
  j:{f:[300,2200,2850], gl:1}, w:{f:[340,760,2300], gl:1},
  m:{f:[280,1050,2300], nas:1}, n:{f:[280,1650,2600], nas:1}, J:{f:[280,2050,2750], nas:1},
  l:{f:[380,1250,2600], liq:1}, L:{f:[300,2050,2700], liq:1}, r:{f:[420,1450,2500], tap:1},
  R:{hf:1, fr:[1500,1800], f:[500,1400,2500]},
  p:{stop:1, vl:1, burst:[1000,1500], f:[350,900,2300]}, b:{stop:1, burst:[1000,1500], f:[300,900,2300]},
  t:{stop:1, vl:1, burst:[4200,2500], f:[350,1700,2600]}, d:{stop:1, burst:[4000,2500], f:[300,1700,2600]},
  k:{stop:1, vl:1, burst:[2300,1500], f:[350,2000,2500]}, g:{stop:1, burst:[2300,1500], f:[300,2000,2500]},
  f:{fr:[5500,6000], amp:0.22, vl:1, f:[350,1300,2500]}, v:{fr:[5500,6000], amp:0.16, f:[300,1300,2500]},
  s:{fr:[6600,2600], amp:0.55, vl:1, f:[350,1700,2600]}, z:{fr:[6600,2600], amp:0.42, f:[300,1700,2600]},
  S:{fr:[3400,1800], amp:0.6, vl:1, f:[350,1900,2600]}, Z:{fr:[3400,1800], amp:0.45, f:[300,1900,2600]},
};
const SCHWA = [520,1500,2500];
const TTS_VOICES = {
  'Narrador grave': {f0:98, scale:0.94, speed:0.95, breath:0.12, rough:0.15, expr:0.9, tilt:0.6},
  'Masculina': {f0:118, scale:1, speed:1, breath:0.1, rough:0.1, expr:1, tilt:0.5},
  'Feminina': {f0:210, scale:1.16, speed:1.02, breath:0.18, rough:0.05, expr:1.15, tilt:0.4},
  'Feminina suave': {f0:195, scale:1.14, speed:0.94, breath:0.35, rough:0.03, expr:0.9, tilt:0.6},
  'Criança': {f0:285, scale:1.32, speed:1.08, breath:0.15, rough:0.04, expr:1.35, tilt:0.35},
  'Idoso': {f0:128, scale:0.98, speed:0.85, breath:0.3, rough:0.55, expr:0.8, tilt:0.7},
  'Locutor animado': {f0:130, scale:1.02, speed:1.1, breath:0.08, rough:0.08, expr:1.6, tilt:0.35},
  'Sussurro': {f0:150, scale:1.08, speed:0.9, breath:1, rough:0, expr:0.6, tilt:0.5, whisper:true},
};
function defaultTTSVoice(){ return {...TTS_VOICES['Masculina']}; }

/* ---------------- Prosódia: fonemas → segmentos ---------------- */
function phraseSegments(phrase, voice, rnd){
  const words = phrase.text.split(/\s+/).filter(Boolean), segs = [];
  const sp = 1/clamp(voice.speed, 0.4, 2.5);
  const toks = []; words.forEach((wd, wi) => { const ph = g2p(wd); ph.forEach((t, k) => toks.push({...t, wi, wEnd: k === ph.length-1})); });
  const vowelIdx = toks.map((t, i) => t.v ? i : -1).filter(i => i >= 0), lastV = vowelIdx[vowelIdx.length-1];
  const stressIdx = toks.map((t, i) => t.v && t.stress ? i : -1).filter(i => i >= 0);
  const nextVowelF = i => { for (let k=i+1; k<toks.length; k++){ if (toks[k].v || toks[k].glide) return PHON[toks[k].p]?.f || SCHWA; } return SCHWA; };
  toks.forEach((t, i) => {
    const P = PHON[t.p], jit = 0.9 + 0.2*rnd();
    if (t.p === 'tS' || t.p === 'dZ'){
      const vl = t.p === 'tS';
      segs.push({k:'clo', dur:0.045*sp, f: PHON.t.f, av: vl ? 0 : 0.2, ah:0, af:0});
      segs.push({k:'fric', dur:0.07*sp*jit, f: PHON.S.f, av: vl ? 0 : 0.3, ah:0, af: 0.6, fr: PHON.S.fr});
      return;
    }
    if (!P) return;
    if (t.v){
      let f = P.f.slice(), dur = 0.085;
      if (t.stress){ dur *= 1.45; } else if (!t.clitic){ dur *= 0.75; f = f.map((x, j) => x*0.85 + SCHWA[j]*0.15); } else dur *= 0.7;
      if (i === lastV) dur *= 1.45;
      if (t.nas) dur *= 1.12;
      segs.push({k:'v', dur: dur*sp*jit, f, av: t.stress ? 1 : 0.85, ah: 0, af: 0, nas: t.nas ? 1 : 0, stress: !!t.stress, last: i === lastV, ti: i});
    } else if (P.gl){ segs.push({k:'gl', dur:0.05*sp, f: P.f, av:0.8, ah:0, af:0, nas: t.nas ? 0.8 : 0}); }
    else if (P.nas){ segs.push({k:'nas', dur:0.065*sp*jit, f: P.f, av:0.55, ah:0, af:0, nas:1}); }
    else if (P.liq){ segs.push({k:'liq', dur:0.055*sp*jit, f: P.f, av:0.7, ah:0, af:0}); }
    else if (P.tap){ segs.push({k:'tap', dur:0.028*sp, f: P.f, av:0.4, ah:0, af:0}); }
    else if (P.hf){ const nf = nextVowelF(i); segs.push({k:'h', dur:(t.coda ? 0.05 : 0.07)*sp*jit, f: nf, av: 0, ah: t.coda ? 0.35 : 0.6, af: 0.12, fr: P.fr}); }
    else if (P.stop){
      const nf = nextVowelF(i);
      segs.push({k:'clo', dur:0.055*sp*jit, f: P.f, av: P.vl ? 0 : 0.22, ah:0, af:0});
      segs.push({k:'burst', dur:0.012*sp, f: P.f, av: P.vl ? 0 : 0.3, ah:0, af: 0.75, fr: P.burst});
      if (P.vl) segs.push({k:'asp', dur:0.022*sp, f: nf, av:0, ah:0.35, af:0});
    }
    else if (P.fr){ segs.push({k:'fric', dur:(P.vl ? 0.09 : 0.075)*sp*jit, f: P.f, av: P.vl ? 0 : 0.35, ah:0, af: P.amp, fr: P.fr}); }
    if (t.wEnd && i < toks.length-1 && rnd() < 0.08) segs.push({k:'sil', dur:0.03*sp, f:SCHWA, av:0, ah:0, af:0});
  });
  // contorno de F0
  let tot = 0; segs.forEach(s => { s.t0 = tot; tot += s.dur; });
  const ex = voice.expr, stressSegs = segs.filter(s => s.stress);
  segs.forEach(s => {
    const x = tot ? (s.t0 + s.dur/2)/tot : 0; let f = 1.1 - 0.18*x; // declinação
    if (s.stress){ const first = s === stressSegs[0], lastS = s === stressSegs[stressSegs.length-1]; f += (first ? 0.16 : lastS ? 0.06 : 0.1)*ex; }
    s.f0 = f;
  });
  const lastStress = stressSegs[stressSegs.length-1];
  const after = s => lastStress && s.t0 >= lastStress.t0;
  if (phrase.type === 'q') segs.forEach(s => { if (after(s)) s.f0 = 1.0 + 0.45*ex*((s.t0 - lastStress.t0)/Math.max(0.05, tot - lastStress.t0) + 0.3); });
  else if (phrase.type === 'x') segs.forEach(s => { s.f0 *= 1 + 0.12*ex; if (after(s)) s.f0 *= 1 + 0.15*ex*(1 - (s.t0 - lastStress.t0)/Math.max(0.05, tot - lastStress.t0)); });
  else if (phrase.type === 'c') segs.forEach(s => { if (after(s)) s.f0 = 0.98 + 0.1*ex; });
  else segs.forEach(s => { if (after(s)) s.f0 = Math.min(s.f0, 0.95 - 0.17*ex*(s.t0 - lastStress.t0)/Math.max(0.05, tot - lastStress.t0)); });
  segs.push({k:'sil', dur: phrase.pause*sp, f: SCHWA, av:0, ah:0, af:0, f0: segs.length ? segs[segs.length-1].f0 : 1});
  return segs;
}

/* ---------------- Síntese de formantes ---------------- */
function resCoef(f, bw, sr){ const T = 1/sr, C = -Math.exp(-2*Math.PI*bw*T), B = 2*Math.exp(-Math.PI*bw*T)*Math.cos(2*Math.PI*f*T); return [1 - B - C, B, C]; }
function synthSegments(segs, voice, sr, opts = {}){
  // trilhas de parâmetros por quadro (2,5 ms) com transições coarticuladas
  const fr = 0.0025, total = segs.reduce((a, s) => a + s.dur, 0), NF = Math.ceil(total/fr) + 2;
  const tr = {F1: new Float32Array(NF), F2: new Float32Array(NF), F3: new Float32Array(NF), AV: new Float32Array(NF), AH: new Float32Array(NF), AF: new Float32Array(NF),
    FR: new Float32Array(NF), FB: new Float32Array(NF), NA: new Float32Array(NF), F0: new Float32Array(NF)};
  const kpF = [], kpA = []; let t = 0;
  segs.forEach(s => {
    const tf = Math.min(0.035, s.dur*0.4), ta = Math.min(0.008, s.dur*0.3);
    const fv = {F1: s.f[0], F2: s.f[1], F3: s.f[2], NA: s.nas || 0, F0: s.f0 ?? 1, FR: s.fr ? s.fr[0] : 4000, FB: s.fr ? s.fr[1] : 3000};
    const av = {AV: s.av, AH: s.ah, AF: s.af};
    kpF.push([t + tf, fv], [t + s.dur - tf, fv]); kpA.push([t + ta, av], [t + s.dur - ta, av]);
    t += s.dur;
  });
  const fill = (kp, keys) => { let j = 0;
    for (let i=0; i<NF; i++){ const tt = i*fr; while (j < kp.length-2 && kp[j+1][0] < tt) j++;
      const [t0, a] = kp[j], [t1, b] = kp[Math.min(kp.length-1, j+1)], x = t1 > t0 ? clamp((tt - t0)/(t1 - t0), 0, 1) : 0;
      keys.forEach(k => tr[k][i] = a[k] + (b[k] - a[k])*x); } };
  fill(kpF, ['F1','F2','F3','NA','F0','FR','FB']); fill(kpA, ['AV','AH','AF']);
  // suaviza F0
  for (let pass=0; pass<3; pass++) for (let i=1; i<NF-1; i++) tr.F0[i] = (tr.F0[i-1] + 2*tr.F0[i] + tr.F0[i+1])/4;
  const N = Math.ceil(total*sr), out = new Float32Array(N), rnd = mulberry32(opts.seed || 7);
  const sc = voice.scale, F4 = Math.min(3500*sc, sr*0.42), F5 = Math.min(4500*sc, sr*0.45);
  const rs = [0,1,2,3,4].map(() => [0, 0]), nz = [0, 0], np = [0, 0], frs = [0, 0];
  const c4 = resCoef(F4, 250, sr), c5 = resCoef(F5, 300, sr), cNP = resCoef(270, 100, sr);
  let ph = 0, prevU = 0, tiltS = 0, jit = 0, shim = 1;
  const tiltA = 0.2 + 0.6*voice.tilt, br = clamp(voice.breath, 0, 1), whisper = !!voice.whisper || br >= 1;
  for (let i=0; i<N; i++){
    const fi = i/sr/fr, k0 = Math.min(NF-2, Math.floor(fi)), x = fi - k0, L = key => tr[key][k0] + (tr[key][k0+1] - tr[key][k0])*x;
    const f0rel = L('F0');
    const f0 = (opts.f0At ? opts.f0At(i/sr) : voice.f0*f0rel)*(1 + jit);
    // fonte glotal
    ph += f0/sr; let newCycle = false; if (ph >= 1){ ph -= 1; newCycle = true; }
    if (newCycle){ jit = (rnd()*2-1)*0.012*voice.rough; shim = 1 + (rnd()*2-1)*0.1*voice.rough; }
    const oq = 0.55 + 0.25*br, u = ph < oq ? (ph/oq)*(ph/oq)*(3 - 2*ph/oq) : Math.max(0, 1 - (ph - oq)/(1 - oq)*6);
    let g = (u - prevU)*sr/f0*0.15; prevU = u; tiltS += (g - tiltS)*(1 - tiltA); g = tiltS*shim;
    const noise = rnd()*2-1;
    const av = whisper ? 0 : L('AV'), ah = L('AH') + (whisper ? L('AV')*0.9 : br*0.25*L('AV')*(0.4 + 0.6*u));
    let src = g*av + noise*ah*0.35;
    // nasal: zero móvel + polo fixo
    const na = L('NA'), fz = 270 + na*230, cz = resCoef(fz, 120, sr);
    const zi = src; src = (zi - cz[1]*nz[0] - cz[2]*nz[1])/cz[0]; nz[1] = nz[0]; nz[0] = zi;
    { const y = cNP[0]*src + cNP[1]*np[0] + cNP[2]*np[1]; np[1] = np[0]; np[0] = y; src = y; }
    // cascata de formantes
    const F1 = L('F1')*sc*(na > 0.5 ? 1.08 : 1), F2 = L('F2')*sc, F3 = Math.min(L('F3')*sc, sr*0.4);
    const cs = [resCoef(F1, 70 + 40*na + 30*br, sr), resCoef(F2, 95, sr), resCoef(F3, 160, sr), c4, c5];
    let y = src;
    for (let r=0; r<5; r++){ const c = cs[r], st = rs[r], o = c[0]*y + c[1]*st[0] + c[2]*st[1]; st[1] = st[0]; st[0] = o; y = o; }
    // fricção (paralela)
    const af = L('AF'); let fz2 = 0;
    if (af > 0.001){ const fc = resCoef(Math.min(L('FR')*Math.sqrt(sc), sr*0.45), L('FB'), sr); const xin = noise*af; const o = fc[0]*xin + fc[1]*frs[0] + fc[2]*frs[1]; frs[1] = frs[0]; frs[0] = o; fz2 = o*1.6; }
    out[i] = y + fz2;
  }
  // radiação (diferença) suave + normalização
  let prev = 0; for (let i=0; i<N; i++){ const v = out[i]; out[i] = v - 0.6*prev; prev = v; }
  let pk = 0; for (let i=0; i<N; i++) pk = Math.max(pk, Math.abs(out[i])); if (pk > 0){ const gg = 0.8/pk; for (let i=0; i<N; i++) out[i] *= gg; }
  return out;
}
/* API principal: texto → áudio */
function speak(text, voice = defaultTTSVoice(), sr = TTS_SR, seed = 1){
  const rnd = mulberry32(seed), phrases = splitPhrases(normalizeText(text));
  const parts = phrases.map(p => synthSegments(phraseSegments(p, voice, rnd), voice, sr, {seed: seed + p.text.length}));
  const N = parts.reduce((a, p) => a + p.length, 0) + Math.round(0.15*sr), out = new Float32Array(N); let o = Math.round(0.05*sr);
  parts.forEach(p => { out.set(p, o); o += p.length; });
  return {L: out, R: out.slice(), sr};
}
function phonemeString(text){ return splitPhrases(normalizeText(text)).map(p => p.text.split(/\s+/).map(w => g2p(w).map(t => t.p + (t.nas ? '~' : '') + (t.stress ? 'ˈ' : '')).join('')).join(' ')).join(' | '); }

/* ---------------- Canto: letra + notas ---------------- */
function syllabify(text){ // sílabas com fonemas, a partir da letra
  const syls = [];
  normalizeText(text).split(/\s+/).filter(Boolean).forEach(w => {
    const T = g2p(w); let cur = [];
    T.forEach((t, i) => { cur.push(t); const n = T[i+1], n2 = T[i+2];
      if (t.v){ // fecha a sílaba: semivogal/nasal coda fica junto, consoante única vai para a próxima
        while (n && (n.glide || (n.p === 's' && (!n2 || !n2.v)) || (n.p === 'R' && n.coda))){ cur.push(T[++i]); break; }
      }
      if (t.v && !(T[i+1] && (T[i+1].glide))){ syls.push(cur); cur = []; }
    });
    if (cur.length){ if (syls.length) syls[syls.length-1].push(...cur); else syls.push(cur); }
  });
  return syls.filter(s => s.some(t => t.v));
}
function singLyrics(lyrics, notes, voice, sr = TTS_SR){
  const syls = syllabify(lyrics); if (!syls.length || !notes.length) return null;
  const end = Math.max(...notes.map(n => n.t + n.dur)), N = Math.ceil((end + 1)*sr), out = new Float32Array(N);
  notes.forEach((nt, k) => {
    const syl = syls[k % syls.length], hz = 440*Math.pow(2, (nt.midi - 69)/12);
    const vSegs = phraseSegmentsFromTokens(syl);
    const cons = vSegs.filter(s => s.k !== 'v').reduce((a, s) => a + s.dur, 0), v = vSegs.find(s => s.k === 'v');
    if (v) v.dur = Math.max(0.08, nt.dur*0.95 - cons);
    vSegs.forEach(s => s.f0 = 1);
    const vibStart = 0.25;
    const y = synthSegments(vSegs, {...voice, f0: hz}, sr, {seed: k + 1, f0At: tt => hz*(1 + (tt > vibStart ? 0.012*Math.sin(TAU*5.5*tt) : 0))});
    const off = Math.round(Math.max(0, nt.t - (v ? vSegs.slice(0, vSegs.indexOf(v)).reduce((a, s) => a + s.dur, 0) : 0))*sr);
    const fo = Math.min(y.length, Math.round(0.03*sr)); for (let i=0; i<fo; i++) y[y.length-1-i] *= i/fo;
    for (let i=0; i<y.length && off+i<N; i++) out[off+i] += y[i]*(nt.vel ?? 0.8);
  });
  return {L: out, R: out.slice(), sr};
}
function phraseSegmentsFromTokens(toks){
  const s = [];
  toks.forEach(t => {
    const P = PHON[t.p];
    if (t.p === 'tS' || t.p === 'dZ'){ const vl = t.p === 'tS'; s.push({k:'clo', dur:0.04, f: PHON.t.f, av: vl ? 0 : 0.2, ah:0, af:0}, {k:'fric', dur:0.06, f: PHON.S.f, av: vl ? 0 : 0.3, ah:0, af:0.55, fr: PHON.S.fr}); return; }
    if (!P) return;
    if (t.v) s.push({k:'v', dur:0.2, f: P.f, av:1, ah:0, af:0, nas: t.nas ? 1 : 0});
    else if (P.gl) s.push({k:'gl', dur:0.06, f: P.f, av:0.8, ah:0, af:0, nas: t.nas ? 0.8 : 0});
    else if (P.nas) s.push({k:'nas', dur:0.07, f: P.f, av:0.55, ah:0, af:0, nas:1});
    else if (P.liq) s.push({k:'liq', dur:0.06, f: P.f, av:0.7, ah:0, af:0});
    else if (P.tap) s.push({k:'tap', dur:0.03, f: P.f, av:0.4, ah:0, af:0});
    else if (P.hf) s.push({k:'h', dur:0.06, f: SCHWA, av:0, ah:0.5, af:0.1, fr: P.fr});
    else if (P.stop){ s.push({k:'clo', dur:0.045, f: P.f, av: P.vl ? 0 : 0.22, ah:0, af:0}, {k:'burst', dur:0.012, f: P.f, av: P.vl ? 0 : 0.3, ah:0, af:0.7, fr: P.burst}); if (P.vl) s.push({k:'asp', dur:0.02, f: SCHWA, av:0, ah:0.3, af:0}); }
    else if (P.fr) s.push({k:'fric', dur:0.07, f: P.f, av: P.vl ? 0 : 0.35, ah:0, af: P.amp, fr: P.fr});
  });
  return s;
}

/* ---------------- Perfil de voz a partir de uma gravação ---------------- */
function lpcCoefs(x, order){
  const r = new Float64Array(order + 1); for (let k=0; k<=order; k++){ let s = 0; for (let i=k; i<x.length; i++) s += x[i]*x[i-k]; r[k] = s; }
  if (r[0] <= 0) return null; const a = new Float64Array(order + 1); a[0] = 1; let e = r[0];
  for (let i=1; i<=order; i++){ let acc = r[i]; for (let j=1; j<i; j++) acc += a[j]*r[i-j]; const k = -acc/e; const tmp = a.slice(); for (let j=1; j<i; j++) a[j] = tmp[j] + k*tmp[i-j]; a[i] = k; e *= 1 - k*k; if (e <= 0) return null; }
  return a;
}
function polyRoots(a){ // Durand–Kerner
  const n = a.length - 1, re = new Float64Array(n), im = new Float64Array(n);
  for (let i=0; i<n; i++){ re[i] = 0.9*Math.cos(TAU*i/n + 0.4); im[i] = 0.9*Math.sin(TAU*i/n + 0.4); }
  for (let it=0; it<120; it++){
    for (let i=0; i<n; i++){
      let hr = 1, hi = 0; for (let k=1; k<=n; k++){ const nr = hr*re[i] - hi*im[i] + a[k], ni = hr*im[i] + hi*re[i]; hr = nr; hi = ni; }
      let dr = 1, di = 0; for (let j=0; j<n; j++){ if (j === i) continue; const xr = re[i] - re[j], xi = im[i] - im[j]; const nr = dr*xr - di*xi, ni = dr*xi + di*xr; dr = nr; di = ni; }
      const den = dr*dr + di*di || 1e-12; re[i] -= (hr*dr + hi*di)/den; im[i] -= (hi*dr - hr*di)/den;
    }
  }
  return [...re].map((r, i) => [r, im[i]]);
}
function analyzeVoiceProfile(x, sr){
  const xs = resampleTo(x, sr, 11025), fsr = 11025, W = 512, hop = 256, f0s = [], F = [[], [], []]; let hnr = [];
  for (let s=0; s+W*2<xs.length; s+=hop*2){
    const seg = xs.subarray(s, s + W*2); let e = 0; for (const v of seg) e += v*v; if (e/seg.length < 1e-5) continue;
    const f0 = yinPitch(xs, fsr, s, W*2); if (!f0 || f0 < 60 || f0 > 500) continue; f0s.push(f0);
    const fr = new Float64Array(W); for (let i=0; i<W; i++) fr[i] = (seg[i+1] - 0.95*seg[i])*(0.54 - 0.46*Math.cos(TAU*i/W));
    const a = lpcCoefs(fr, 12); if (!a) continue;
    const roots = polyRoots(a).filter(([r, i]) => i > 0).map(([r, i]) => ({f: Math.atan2(i, r)/TAU*fsr, bw: -Math.log(Math.hypot(r, i))*fsr/Math.PI})).filter(z => z.f > 200 && z.f < 4000 && z.bw < 400).sort((p, q) => p.f - q.f);
    for (let k=0; k<3 && k<roots.length; k++) F[k].push(roots[k].f);
    // HNR aproximado pela autocorrelação no período
    const T = Math.round(fsr/f0); let c0 = 0, c1 = 0; for (let i=0; i+T<seg.length; i++){ c0 += seg[i]*seg[i]; c1 += seg[i]*seg[i+T]; } hnr.push(clamp(c1/(c0 || 1), 0, 1));
  }
  const med = a => { if (!a.length) return 0; const b = a.slice().sort((p, q) => p - q); return b[b.length >> 1]; };
  const f0 = med(f0s); if (!f0) throw new Error('não encontrei voz nessa gravação (fale por alguns segundos)');
  const ref = [500, 1500, 2500], ratios = F.map((arr, k) => arr.length ? med(arr)/ref[k] : 0).filter(Boolean);
  const scale = clamp(ratios.length ? med(ratios) : 1, 0.8, 1.45), periodic = med(hnr);
  return {f0: Math.round(f0), scale: +scale.toFixed(3), breath: +clamp((0.9 - periodic)*1.5, 0, 0.8).toFixed(2), rough: +clamp((0.85 - periodic), 0, 0.6).toFixed(2), formants: F.map(med).map(Math.round)};
}
