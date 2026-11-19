"use strict";
/* ======================================================================
   NEXI SFX Studio — motor de síntese (render offline, determinístico)
   ====================================================================== */
const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const dbToGain = db => Math.pow(10, db / 20);
const gainToDb = g => 20 * Math.log10(Math.max(g, 1e-12));
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function hashStr(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function polyblep(t, dt){
  if (t < dt){ t /= dt; return t+t-t*t-1; }
  if (t > 1-dt){ t = (t-1)/dt; return t*t+t+t+1; }
  return 0;
}
// Filtro de variáveis de estado ZDF (estável em qualquer frequência)
const newSVF = () => ({ic1:0, ic2:0, lp:0, bp:0, hp:0});
function svfTick(s, x, g, k){
  const a1 = 1/(1+g*(g+k)), a2 = g*a1, a3 = g*a2;
  const v3 = x - s.ic2, v1 = a1*s.ic1 + a2*v3, v2 = s.ic2 + a2*s.ic1 + a3*v3;
  s.ic1 = 2*v1 - s.ic1; s.ic2 = 2*v2 - s.ic2;
  s.lp = v2; s.bp = v1; s.hp = x - k*v1 - v2;
}
const panGains = p => { const a = (clamp(p,-1,1)+1)*Math.PI/4; return [Math.min(1, Math.SQRT2*Math.cos(a)), Math.min(1, Math.SQRT2*Math.sin(a))]; };

/* ---------------- Esquemas de parâmetros ---------------- */
const P = (k,l,min,max,def,s='lin',u='',x={}) => ({k,l,min,max,def,s,u,...x});
const C = (k,l,c,def) => ({k,l,c,def,s:'choice'});
const B = (k,l,def) => ({k,l,def,s:'bool'});
const LABELS = {saw:'Serra',square:'Quadrada',pulse:'Pulso',tri:'Triângulo',sine:'Seno',
  stack:'Pilha 3→2→1',par:'Paralelo',exp:'Exponencial',lin:'Linear',off:'Desligado',lp:'Passa-baixa',hp:'Passa-alta',bp:'Passa-banda',notch:'Rejeita-banda',
  '12':'12 dB/oit','24':'24 dB/oit',normal:'Normal',granular:'Granular',peak:'Pico',lufs:'LUFS',none:'Nenhuma'};

const MATERIALS = {
  madeira:{r:[1,2.756,5.404,8.933,13.344,18.638],t60:0.25,hf:3.0},
  metal:{r:[1,1.594,2.136,2.296,2.653,2.918,3.156,3.501,3.6,3.652,4.06,4.154,4.601,4.654,4.9,5.13],t60:2.2,hf:0.25},
  vidro:{r:[1,2.32,4.25,6.63,9.38,12.6,16.2],t60:1.6,hf:0.35},
  pedra:{r:null,t60:0.08,hf:2.0},
  plastico:{r:[1,2.76,5.4,8.9,13.3],t60:0.1,hf:3.5},
  ceramica:{r:[1,2.1,3.9,5.7,7.8,10.1],t60:0.5,hf:1.0},
  pele:{r:[1,1.594,2.136,2.296,2.653,2.918,3.156,3.501,3.6,3.652],t60:0.4,hf:1.2},
  sino:{r:[0.5,1,1.183,1.506,2,2.514,2.662,3.011,4.166,5.433,6.796],t60:4,hf:0.15},
};
const VOWELS = [
  {F:[600,1040,2250,2450,2750],A:[0,-7,-9,-9,-20],B:[60,70,110,120,130]},
  {F:[400,1620,2400,2800,3100],A:[0,-12,-9,-12,-18],B:[40,80,100,120,120]},
  {F:[250,1750,2600,3050,3340],A:[0,-30,-16,-22,-28],B:[60,90,100,120,120]},
  {F:[400,750,2400,2600,2900],A:[0,-11,-21,-20,-40],B:[40,80,100,120,120]},
  {F:[350,600,2400,2675,2950],A:[0,-20,-32,-28,-36],B:[40,80,100,120,120]},
];
const vowelFmt = v => ['A','E','I','O','U'][Math.round(v)] + (Math.abs(v-Math.round(v))>0.05 ? '~' : '');
const PHYS_ENV = {a:0.0005,d:30,s:1,len:2,r:0.05,curve:0};

const ENGINES = {
  analog:{name:'Analógico',tag:'ANL',params:[
    C('wave','Onda',['saw','square','pulse','tri','sine'],'saw'), P('freq','Frequência',20,12000,220,'log','Hz'),
    P('voices','Vozes (unison)',1,7,1,'int'), P('detune','Desafinação',0,100,12,'lin','ct'), P('spread','Abertura estéreo',0,1,0.6,'lin','%'),
    P('pw','Largura do pulso',0.05,0.95,0.3,'lin','%'), P('sub','Sub-oscilador',0,1,0,'lin','%'), P('noise','Ruído',0,1,0,'lin','%'), P('drift','Deriva analógica',0,1,0.2,'lin','%')]},
  fm:{name:'FM',tag:'FM',params:[
    P('freq','Frequência',20,12000,440,'log','Hz'), C('algo','Algoritmo',['stack','par'],'stack'),
    P('r1','Razão portadora',0.25,16,1,'log','x'), P('r2','Razão op 2',0.25,16,2,'log','x'), P('i2','Índice op 2',0,30,2,'sq'),
    P('r3','Razão op 3',0.25,16,3,'log','x'), P('i3','Índice op 3',0,30,0,'sq'), P('fb','Realimentação',0,1,0,'lin','%'),
    P('idxDecay','Decaimento do índice',0.005,20,0.5,'log','s'), P('idxSus','Índice sustentado',0,1,0.2,'lin','%'), P('stereo','Desafinação estéreo',0,30,0,'lin','ct')]},
  noise:{name:'Ruído',tag:'RUÍ',params:[
    C('color','Cor',['branco','rosa','marrom','azul','veludo'],'rosa'), P('stereo','Descorrelação estéreo',0,1,0.7,'lin','%'),
    P('modRate','Rajadas: velocidade',0.05,40,1,'log','Hz'), P('modDepth','Rajadas: intensidade',0,1,0,'lin','%')]},
  modal:{name:'Modal (impacto físico)',tag:'MOD',env:PHYS_ENV,params:[
    C('material','Material',Object.keys(MATERIALS),'metal'), P('freq','Frequência',30,8000,300,'log','Hz'),
    P('decay','Decaimento',0.05,6,1,'log','x'), P('damping','Amortecimento agudo',0,1,0.5,'lin','%'), P('hardness','Dureza do golpe',0,1,0.7,'lin','%'),
    P('modes','Modos',4,64,32,'int'), P('inharm','Inarmonicidade',0,1,0.2,'lin','%'), P('position','Ponto do golpe',0,1,0.3,'lin','%'),
    P('noise','Ruído de contato',0,1,0.2,'lin','%'), P('stereo','Abertura estéreo',0,1,0.6,'lin','%')]},
  string:{name:'Corda (física)',tag:'CRD',env:PHYS_ENV,params:[
    P('freq','Frequência',20,4000,220,'log','Hz'), P('decay','Sustentação',0.05,20,2,'log','s'), P('bright','Brilho',0,1,0.6,'lin','%'),
    P('pick','Ponto da palheta',0.02,0.5,0.15,'lin','%'), P('stereo','Desafinação estéreo',0,25,4,'lin','ct')]},
  particles:{name:'Partículas',tag:'PRT',params:[
    P('density','Densidade',0.5,4000,200,'log','/s'), P('fmin','Freq. mínima',30,16000,800,'log','Hz'), P('fmax','Freq. máxima',30,18000,5000,'log','Hz'),
    P('pdecay','Duração da partícula',0.0005,0.5,0.01,'log','s'), P('tone','Tom ↔ ruído',0,1,0.3,'lin','%'),
    P('ampVar','Variação de volume',0,1,0.7,'lin','%'), P('stereo','Espalhamento estéreo',0,1,0.7,'lin','%')]},
  formant:{name:'Voz / criatura',tag:'VOZ',params:[
    P('freq','Altura da voz',30,1500,140,'log','Hz'), P('vowelA','Vogal inicial',0,4,0,'lin','vow'), P('vowelB','Vogal final',0,4,3,'lin','vow'),
    P('morph','Tempo de transição',0,5,0.4,'sq','s'), P('size','Tamanho da criatura',0.4,2.5,1,'log','x'), P('growl','Rosnado',0,1,0,'lin','%'),
    P('jitter','Instabilidade',0,1,0.2,'lin','%'), P('breath','Sopro',0,1,0.1,'lin','%')]},
  sampler:{name:'Sampler (áudio)',tag:'SMP',env:{a:0.001,d:30,s:1,len:4,r:0.05,curve:0},params:[
    P('sample','Amostra',0,0,'', 'sample'), C('mode','Modo',['normal','granular'],'normal'),
    P('start','Início',0,1,0,'lin','%'), P('end','Fim',0,1,1,'lin','%'), B('reverse','Reverso',false), B('loop','Loop',false),
    P('grain','Grão',5,400,80,'log','ms'), P('gdensity','Densidade de grãos',2,300,40,'log','/s'), P('stretch','Esticar tempo',0.1,16,1,'log','x'),
    P('jitter','Dispersão de posição',0,1,0.1,'lin','%'), P('pjitter','Dispersão de altura',0,12,0,'sq','st'), P('stereo','Espalhamento estéreo',0,1,0.5,'lin','%')]},
};

const MIX_DEFS = [P('vol','Volume',-48,12,0,'lin','dB'), P('pan','Pan',-1,1,0,'lin','pan'), P('start','Início',0,10,0,'sq','s'),
  P('pitch','Transposição',-48,48,0,'lin','st'), P('fine','Ajuste fino',-100,100,0,'lin','ct'), P('drive','Saturação',0,1,0,'lin','%')];
const ENV_DEFS = [P('a','Ataque',0,10,0.002,'sq','s'), P('d','Decaimento',0.005,30,0.6,'log','s'), P('s','Sustentação',0,1,0,'lin','%'),
  P('len','Duração (gate)',0.01,30,1.5,'sq','s'), P('r','Release',0.005,10,0.1,'log','s'), P('curve','Curva do ataque',0,1,0,'lin','%')];
const PENV_DEFS = [P('amt','Quantidade',-48,48,0,'lin','st'), P('time','Tempo',0.005,10,0.1,'log','s'), C('mode','Forma',['exp','lin'],'exp')];
const FILT_DEFS = [C('type','Tipo',['off','lp','hp','bp','notch'],'off'), C('slope','Inclinação',['12','24'],'12'),
  P('freq','Corte',20,20000,2000,'log','Hz'), P('q','Ressonância',0.5,20,0.707,'log','Q'), P('env','Envelope',-8,8,0,'lin','oct'),
  P('envAtk','Ataque do env.',0,5,0,'sq','s'), P('envTime','Decaimento do env.',0.005,10,0.3,'log','s'), P('key','Seguir altura',0,1,0,'lin','%')];
const MOD_DEFS = [P('vibDepth','Vibrato: prof.',0,12,0,'sq','st'), P('vibRate','Vibrato: veloc.',0.1,40,5,'log','Hz'),
  P('tremDepth','Tremolo: prof.',0,1,0,'lin','%'), P('tremRate','Tremolo: veloc.',0.1,40,4,'log','Hz'), P('panSweep','Varredura de pan',-1,1,0,'lin','pan')];

const REV_TYPES = {
  'Sala':{revSize:0.35,revDecay:0.7,revDamp:0.55,revPre:0.008}, 'Estúdio':{revSize:0.2,revDecay:0.35,revDamp:0.6,revPre:0.004},
  'Hall':{revSize:0.8,revDecay:2.4,revDamp:0.45,revPre:0.025}, 'Catedral':{revSize:1,revDecay:5.5,revDamp:0.4,revPre:0.04},
  'Placa':{revSize:0.5,revDecay:1.8,revDamp:0.25,revPre:0}, 'Exterior':{revSize:1,revDecay:0.9,revDamp:0.8,revPre:0.03},
  'Caverna':{revSize:0.9,revDecay:3.5,revDamp:0.65,revPre:0.05},
};
const MASTER_GROUPS = [
  {name:'Equalizador', defs:[P('hp','Passa-alta',10,2000,20,'log','Hz'), P('lp','Passa-baixa',1000,20000,20000,'log','Hz',{off:v=>v>=19990}),
    P('low','Graves (120 Hz)',-18,18,0,'lin','dB'), P('mid','Médios',-18,18,0,'lin','dB'), P('midF','Freq. médios',100,10000,1000,'log','Hz'),
    P('midQ','Largura médios',0.3,8,1,'log','Q'), P('high','Agudos (8 kHz)',-18,18,0,'lin','dB')]},
  {name:'Saturação', defs:[C('satType','Tipo',['Fita','Válvula','Fuzz'],'Fita'), P('drive','Intensidade',0,1,0,'lin','%',{off:v=>v<=0})]},
  {name:'Compressor', defs:[P('ratio','Razão',1,20,1,'log','ratio',{off:v=>v<=1.01}), P('thr','Limiar',-60,0,-18,'lin','dB'),
    P('att','Ataque',0.0005,0.2,0.005,'log','s'), P('rel','Release',0.01,2,0.15,'log','s'), P('makeup','Ganho',0,24,0,'lin','dB')]},
  {name:'Eco (delay ping-pong)', defs:[P('dlyMix','Mistura',0,1,0,'lin','%',{off:v=>v<=0}), P('dlyTime','Tempo',0.01,2,0.25,'log','s'),
    P('dlyFb','Realimentação',0,0.95,0.3,'lin','%'), P('dlyTone','Tom',500,16000,5000,'log','Hz')]},
  {name:'Reverb', defs:[C('revType','Ambiente',Object.keys(REV_TYPES),'Sala'), P('revMix','Mistura',0,1,0,'lin','%',{off:v=>v<=0}),
    P('revSize','Tamanho',0,1,0.35,'lin','%'), P('revDecay','Decaimento',0.1,15,0.7,'log','s'), P('revDamp','Abafamento',0,1,0.55,'lin','%'),
    P('revPre','Pré-delay',0,0.25,0.008,'sq','s'), P('revWidth','Largura',0,1,1,'lin','%')]},
  {name:'Estéreo', defs:[P('width','Largura estéreo',0,2,1,'lin','%')]},
  {name:'Saída', defs:[C('norm','Normalização',['peak','lufs','none'],'peak'), P('ceiling','Teto (limitador)',-12,0,-1,'lin','dB'),
    P('lufs','Alvo LUFS',-36,-6,-16,'lin','LUFS')]},
];

function defaultsOf(defs){ const o = {}; defs.forEach(d => o[d.k] = d.def); return o; }
function defaultMaster(){ const m = {}; MASTER_GROUPS.forEach(g => Object.assign(m, defaultsOf(g.defs))); return m; }
function newLayer(type, seed){
  const e = ENGINES[type];
  const l = {type, name:e.name, on:true, solo:false, seed: seed ?? ((Math.random()*4294967295)>>>0),
    ...defaultsOf(MIX_DEFS), env:{...defaultsOf(ENV_DEFS), ...(e.env||{})}, pitchEnv:defaultsOf(PENV_DEFS),
    filter:defaultsOf(FILT_DEFS), mod:defaultsOf(MOD_DEFS), p:defaultsOf(e.params)};
  return l;
}

/* ---------------- Motores ---------------- */
const SAMPLES = new Map(); // id -> {name, sr, ch:[Float32Array]}

function renderAnalog(p, c){
  const {N, sr, pm, rnd} = c, L = new Float32Array(N), R = new Float32Array(N);
  const n = clamp(p.voices|0, 1, 7), vs = [];
  for (let v=0; v<n; v++){
    const x = n>1 ? v/(n-1)*2-1 : 0, [gl, gr] = panGains(x*p.spread);
    vs.push({det:x*p.detune, gl:gl*0.7071, gr:gr*0.7071, ph:n>1?rnd():0, dc:0, tg:0, nt:0});
  }
  const drAmt = p.drift*12, drA = 1 - Math.exp(-1/(0.15*sr)), norm = 1/Math.sqrt(n);
  let subPh = 0;
  for (let i=0; i<N; i++){
    const base = p.freq*pm[i]; let l = 0, r = 0;
    for (let v=0; v<n; v++){
      const o = vs[v];
      if (drAmt > 0){ if (i >= o.nt){ o.tg = (rnd()*2-1)*drAmt; o.nt = i + sr*(0.1+0.3*rnd()); } o.dc += (o.tg-o.dc)*drA; }
      let dt = base*Math.pow(2, (o.det+o.dc)/1200)/sr; if (dt > 0.49) dt = 0.49;
      o.ph += dt; if (o.ph >= 1) o.ph -= 1;
      const ph = o.ph; let s;
      switch (p.wave){
        case 'saw': s = 2*ph-1-polyblep(ph, dt); break;
        case 'square': case 'pulse': { const w = p.wave==='square' ? 0.5 : p.pw; s = ph < w ? 1 : -1; s += polyblep(ph, dt); let t2 = ph-w; if (t2 < 0) t2 += 1; s -= polyblep(t2, dt); break; }
        case 'tri': s = 4*Math.abs(ph-0.5)-1; break;
        default: s = Math.sin(TAU*ph);
      }
      l += s*o.gl; r += s*o.gr;
    }
    l *= norm; r *= norm;
    if (p.sub > 0){ subPh += base*0.5/sr; if (subPh >= 1) subPh -= 1; const s = Math.sin(TAU*subPh)*p.sub*0.8; l += s; r += s; }
    if (p.noise > 0){ l += (rnd()*2-1)*p.noise*0.5; r += (rnd()*2-1)*p.noise*0.5; }
    L[i] = l; R[i] = r;
  }
  return {L, R};
}

function renderFM(p, c){
  const {N, sr, pm} = c;
  const one = det => {
    const out = new Float32Array(N); let p1=0, p2=0, p3=0, prev=0;
    const dm = Math.pow(2, det/1200);
    for (let i=0; i<N; i++){
      const t = i/sr, base = p.freq*pm[i]*dm;
      const ie = p.idxSus + (1-p.idxSus)*Math.exp(-4.6*t/p.idxDecay);
      p1 += base*p.r1/sr; p2 += base*p.r2/sr; p3 += base*p.r3/sr;
      p1 -= Math.floor(p1); p2 -= Math.floor(p2); p3 -= Math.floor(p3);
      const o3 = Math.sin(TAU*p3 + p.fb*Math.PI*prev); prev = 0.5*(prev + o3);
      let o1;
      if (p.algo === 'par'){ const o2 = Math.sin(TAU*p2); o1 = Math.sin(TAU*p1 + p.i2*ie*o2 + p.i3*ie*o3); }
      else { const o2 = Math.sin(TAU*p2 + p.i3*ie*o3); o1 = Math.sin(TAU*p1 + p.i2*ie*o2); }
      out[i] = o1*0.5;
    }
    return out;
  };
  if (p.stereo > 0) return {L: one(-p.stereo/2), R: one(p.stereo/2)};
  const m = one(0); return {L: m, R: m.slice()};
}

function noiseGen(color, rnd, sr){
  let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0, br=0, prev=0; const vp = 2000/sr;
  return () => {
    const w = rnd()*2-1;
    switch (color){
      case 'rosa': { b0=0.99886*b0+w*0.0555179; b1=0.99332*b1+w*0.0750759; b2=0.969*b2+w*0.153852; b3=0.8665*b3+w*0.3104856;
        b4=0.55*b4+w*0.5329522; b5=-0.7616*b5-w*0.016898; const o=(b0+b1+b2+b3+b4+b5+b6+w*0.5362)*0.2; b6=w*0.115926; return o; }
      case 'marrom': br = (br + 0.02*w)/1.02; return br*3.5;
      case 'azul': { const o = (w-prev)*0.5; prev = w; return o; }
      case 'veludo': return rnd() < vp ? (rnd()<0.5?-1:1) : 0;
      default: return w;
    }
  };
}
function renderNoise(p, c){
  const {N, sr, rnd} = c, L = new Float32Array(N), R = new Float32Array(N);
  const gC = noiseGen(p.color, rnd, sr), gL = noiseGen(p.color, rnd, sr), gR = noiseGen(p.color, rnd, sr);
  const s = p.stereo, cs = Math.sqrt(1-s), is = Math.sqrt(s);
  const per = sr/p.modRate; let mA = rnd(), mB = rnd(), mT = 0;
  for (let i=0; i<N; i++){
    let g = 1;
    if (p.modDepth > 0){ if (++mT >= per){ mT -= per; mA = mB; mB = rnd(); } const x = mT/per; const sm = mA+(mB-mA)*(0.5-0.5*Math.cos(Math.PI*x)); g = 1 - p.modDepth*(1-sm); }
    const cm = gC();
    if (s > 0){ L[i] = (cm*cs + gL()*is)*g; R[i] = (cm*cs + gR()*is)*g; } else { L[i] = R[i] = cm*g; }
  }
  return {L, R};
}

function renderModal(p, c){
  const {N, sr, pm, rnd} = c, L = new Float32Array(N), R = new Float32Array(N);
  const mat = MATERIALS[p.material] || MATERIALS.metal, f0 = p.freq*pm[0], nM = p.modes|0, ratios = [];
  if (!mat.r){ ratios.push(1); for (let k=1; k<nM; k++) ratios.push(ratios[k-1] + 0.35 + rnd()*0.9); }
  else for (let k=0; k<nM; k++){
    if (k < mat.r.length) ratios.push(mat.r[k]);
    else { const a = ratios[k-1], b = ratios[k-2]; ratios.push(a + Math.max(0.15, a-b)*(0.6+rnd()*0.8)); }
  }
  const exLen = Math.max(2, Math.round((0.0002 + Math.pow(1-p.hardness,2)*0.008)*sr));
  const ea = Math.exp(-TAU*Math.min(250*Math.pow(2, p.hardness*6.2), sr*0.45)/sr), ex = new Float32Array(exLen);
  let lp = 0;
  for (let i=0; i<exLen; i++){ const w = Math.sin(Math.PI*(i+0.5)/exLen); lp = (1-ea)*w*(0.6+0.4*(rnd()*2-1)) + ea*lp; ex[i] = lp; }
  const hfEff = mat.hf*(0.3+p.damping*1.7), base60 = mat.t60*p.decay;
  for (let k=0; k<nM; k++){
    let ratio = ratios[k]; if (k > 0) ratio *= 1 + p.inharm*(rnd()*2-1)*0.03*Math.sqrt(k);
    const f = f0*ratio; if (f >= sr*0.45) continue;
    const t60 = Math.max(0.003, base60/(1 + hfEff*(ratio-1)*0.25));
    const posAmp = 0.25 + 0.75*Math.abs(Math.sin(Math.PI*(k+1)*(0.07+p.position*0.86)));
    const amp = posAmp*(0.7+0.6*rnd())/Math.pow(k+1, 0.6*(1-p.hardness)+0.15);
    const w = TAU*f/sr, r = Math.exp(-6.9078/(t60*sr)), c1 = 2*r*Math.cos(w), c2 = -r*r, gin = amp*Math.sin(w);
    const [gl, gr] = panGains((rnd()*2-1)*p.stereo);
    const end = Math.min(N, Math.ceil(t60*1.1*sr) + exLen);
    let y1 = 0, y2 = 0;
    for (let i=0; i<end; i++){ const y = (i < exLen ? ex[i]*gin : 0) + c1*y1 + c2*y2; y2 = y1; y1 = y; L[i] += y*gl; R[i] += y*gr; }
  }
  let pk = 0; for (let i=0; i<N; i++){ const a = Math.max(Math.abs(L[i]), Math.abs(R[i])); if (a > pk) pk = a; }
  if (pk > 0){ const g = 1/pk; for (let i=0; i<N; i++){ L[i] *= g; R[i] *= g; } }
  if (p.noise > 0){
    const tau = (0.002 + (1-p.hardness)*0.015)*sr, nEnd = Math.min(N, Math.ceil(tau*7)), tmp = new Float32Array(nEnd);
    const s = newSVF(), g = Math.tan(Math.PI*Math.min(sr*0.45, f0*3 + 1500 + 4000*p.hardness)/sr); let npk = 0;
    for (let i=0; i<nEnd; i++){ svfTick(s, (rnd()*2-1)*Math.exp(-i/tau), g, 1.1); tmp[i] = s.bp; npk = Math.max(npk, Math.abs(s.bp)); }
    const gn = npk > 0 ? p.noise*0.8/npk : 0;
    for (let i=0; i<nEnd; i++){ L[i] += tmp[i]*gn; R[i] += tmp[i]*gn*(1 - p.stereo*0.3); }
  }
  return {L, R};
}

function renderString(p, c){
  const {N, sr, pm} = c;
  let minPm = Infinity; for (let i=0; i<N; i+=64) minPm = Math.min(minPm, pm[i]);
  const one = (det, rnd) => {
    const out = new Float32Array(N), fB = p.freq*Math.pow(2, det/1200);
    let bl = 16; while (bl < sr/(fB*minPm) + 8 && bl < sr) bl <<= 1;
    const buf = new Float32Array(bl), mask = bl-1, a = 0.25 + 0.75*p.bright;
    const exN = Math.max(2, Math.round(sr/(fB*pm[0]))), exc = new Float32Array(exN), ea = 0.15 + 0.85*p.bright;
    let lp = 0, mean = 0;
    for (let i=0; i<exN; i++){ lp = ea*(rnd()*2-1) + (1-ea)*lp; exc[i] = lp; }
    const pk = Math.max(1, Math.round(p.pick*exN));
    for (let i=exN-1; i>=pk; i--) exc[i] -= exc[i-pk];
    for (let i=0; i<exN; i++) mean += exc[i]; mean /= exN; for (let i=0; i<exN; i++) exc[i] -= mean;
    let w = 0, lpS = 0;
    for (let i=0; i<N; i++){
      const f = fB*pm[i], D = clamp(sr/f - (1-a)/a, 2, bl-2), g = Math.pow(10, -3/(f*p.decay));
      const rp = w - D, i0 = Math.floor(rp), fr = rp - i0;
      const d = buf[i0 & mask]*(1-fr) + buf[(i0+1) & mask]*fr;
      lpS = a*d + (1-a)*lpS;
      const y = (i < exN ? exc[i] : 0) + g*lpS;
      buf[w & mask] = y; w++; out[i] = y;
    }
    return out;
  };
  if (p.stereo > 0) return {L: one(-p.stereo/2, c.rnd), R: one(p.stereo/2, mulberry32(c.seed ^ 0x5bd1e995))};
  const m = one(0, c.rnd); return {L: m, R: m.slice()};
}

function renderParticles(p, c){
  const {N, sr, pm, rnd} = c, L = new Float32Array(N), R = new Float32Array(N);
  const lnA = Math.log(p.fmin), lnB = Math.log(Math.max(p.fmax, p.fmin*1.001)), maxLen = Math.ceil(p.pdecay*6.9*sr);
  const r = Math.exp(-6.9078/(p.pdecay*sr)), s = newSVF();
  let t = 0, guard = 0;
  while (guard++ < 400000){
    t += -Math.log(1 - rnd() + 1e-12)/p.density;
    const n0 = Math.floor(t*sr); if (n0 >= N) break;
    const f = Math.min(sr*0.45, Math.exp(lnA + (lnB-lnA)*rnd())*pm[n0]);
    const amp = Math.pow(rnd(), p.ampVar*2.5), [gl, gr] = panGains((rnd()*2-1)*p.stereo);
    const len = Math.min(N-n0, maxLen), w = TAU*f/sr, cw = Math.cos(w), sw = Math.sin(w), g = Math.tan(Math.PI*f/sr);
    let cr = 1, ci = 0, e = amp; s.ic1 = s.ic2 = 0;
    for (let j=0; j<len; j++){
      let v = p.tone*ci;
      if (p.tone < 1){ svfTick(s, rnd()*2-1, g, 0.5); v += (1-p.tone)*s.bp*1.25; }
      v *= e; L[n0+j] += v*gl; R[n0+j] += v*gr;
      const ncr = cr*cw - ci*sw; ci = cr*sw + ci*cw; cr = ncr; e *= r;
    }
  }
  return {L, R};
}

function renderFormant(p, c){
  const {N, sr, pm, rnd} = c, out = new Float32Array(N);
  const fs = [0,1,2,3,4].map(newSVF), gF = [], gK = [], gA = [], sc = 1/p.size;
  let ph = 0, cyc = 0, jit = 0, glp = 0;
  for (let i=0; i<N; i++){
    if ((i & 31) === 0){
      const t = i/sr, m = p.morph > 0 ? Math.min(1, t/p.morph) : 1, sm = m*m*(3-2*m);
      const vi = clamp(p.vowelA + (p.vowelB-p.vowelA)*sm, 0, 4), i0 = Math.floor(vi), i1 = Math.min(4, i0+1), fr = vi - i0;
      for (let j=0; j<5; j++){
        const F = Math.min(sr*0.45, (VOWELS[i0].F[j]*(1-fr) + VOWELS[i1].F[j]*fr)*sc);
        const Bw = (VOWELS[i0].B[j]*(1-fr) + VOWELS[i1].B[j]*fr)*Math.sqrt(sc);
        gF[j] = Math.tan(Math.PI*F/sr); gK[j] = Bw/F; gA[j] = dbToGain(VOWELS[i0].A[j]*(1-fr) + VOWELS[i1].A[j]*fr);
      }
    }
    let dt = p.freq*pm[i]*(1+jit)/sr; if (dt > 0.45) dt = 0.45;
    ph += dt; if (ph >= 1){ ph -= 1; cyc++; jit = jit*0.6 + p.jitter*0.025*(rnd()*2-1); }
    glp += (2*ph-1-polyblep(ph, dt) - glp)*0.35;
    let src = glp;
    if (p.growl > 0 && (cyc & 1)) src *= 1 - p.growl*0.7;
    src += (rnd()*2-1)*p.breath*0.6;
    let y = 0;
    for (let j=0; j<5; j++){ svfTick(fs[j], src, gF[j], gK[j]); y += fs[j].bp*gK[j]*gA[j]; }
    out[i] = y;
  }
  return {L: out, R: out.slice()};
}

function hermite(a, pos){
  const n = a.length, i = Math.floor(pos), f = pos - i;
  const x0 = a[clamp(i-1,0,n-1)], x1 = a[clamp(i,0,n-1)], x2 = a[clamp(i+1,0,n-1)], x3 = a[clamp(i+2,0,n-1)];
  const c1 = 0.5*(x2-x0), c2 = x0 - 2.5*x1 + 2*x2 - 0.5*x3, c3 = 0.5*(x3-x0) + 1.5*(x1-x2);
  return ((c3*f + c2)*f + c1)*f + x1;
}
function renderSampler(p, c){
  const {N, sr, pm, rnd} = c, L = new Float32Array(N), R = new Float32Array(N);
  const smp = SAMPLES.get(p.sample); if (!smp) return {L, R};
  const c0 = smp.ch[0], c1 = smp.ch[1] || smp.ch[0], len = c0.length, ratio = smp.sr/sr;
  let a = Math.floor(clamp(Math.min(p.start, p.end),0,1)*len), b = Math.floor(clamp(Math.max(p.start, p.end),0,1)*len);
  if (b - a < 32){ b = Math.min(len, a+32); a = Math.max(0, b-32); }
  const reg = b - a;
  if (p.mode !== 'granular'){
    const dir = p.reverse ? -1 : 1; let pos = p.reverse ? b-1 : a;
    for (let i=0; i<N; i++){
      if (p.loop){ while (pos >= b) pos -= reg; while (pos < a) pos += reg; } else if (pos < a || pos >= b) break;
      L[i] = hermite(c0, pos); R[i] = hermite(c1, pos); pos += dir*pm[i]*ratio;
    }
  } else {
    const gLen = Math.max(16, Math.round(p.grain/1000*sr)), hop = sr/p.gdensity, norm = 1/Math.sqrt(Math.max(1, gLen/hop));
    const regDur = reg/smp.sr*p.stretch; let next = 0;
    while (next < N){
      const n0 = Math.floor(next); let prog = (n0/sr)/regDur;
      if (prog >= 1){ if (p.loop) prog -= Math.floor(prog); else break; }
      let pos = (p.reverse ? b - prog*reg : a + prog*reg) + (rnd()*2-1)*p.jitter*reg*0.1;
      const rate = pm[n0]*Math.pow(2, p.pjitter*(rnd()*2-1)/12)*ratio*(p.reverse ? -1 : 1);
      const [gl, gr] = panGains((rnd()*2-1)*p.stereo);
      for (let j=0; j<gLen && n0+j<N; j++){
        const w = (0.5 - 0.5*Math.cos(TAU*j/gLen))*norm;
        L[n0+j] += hermite(c0, pos)*w*gl; R[n0+j] += hermite(c1, pos)*w*gr; pos += rate;
      }
      next += hop*(0.85 + 0.3*rnd());
    }
  }
  return {L, R};
}
const RENDERERS = {analog:renderAnalog, fm:renderFM, noise:renderNoise, modal:renderModal, string:renderString,
  particles:renderParticles, formant:renderFormant, sampler:renderSampler};

/* ---------------- Camada: envelope, filtro, modulação ---------------- */
function envLength(e){
  const end = e.len + e.r;
  return e.s <= 0.0001 ? Math.min(end, e.a + e.d) : end;
}
function envAt(e, t){
  const rel = t > e.len, tt = rel ? e.len : t; let v;
  if (tt < e.a){ const x = tt/e.a; v = e.curve > 0 ? Math.pow(x, 1 + e.curve*3) : x; }
  else v = e.s + (1-e.s)*Math.exp(-6.9078*(tt-e.a)/Math.max(e.d, 1e-4));
  if (rel) v *= Math.exp(-6.9078*(t-e.len)/Math.max(e.r, 1e-4));
  return v;
}
function applyFilter(L, R, f, pm, sr){
  if (f.type === 'off') return;
  const N = L.length, k = 1/f.q, two = f.slope === '24', nyq = sr*0.49;
  const s = [newSVF(), newSVF(), newSVF(), newSVF()];
  const k2 = (f.type === 'bp' || f.type === 'notch') ? k : 1.4142;
  const out = (st, x, kk) => f.type === 'lp' ? st.lp : f.type === 'hp' ? st.hp : f.type === 'bp' ? st.bp*kk : x - kk*st.bp;
  let g = 0;
  for (let i=0; i<N; i++){
    if ((i & 15) === 0){
      const t = i/sr, fe = (f.envAtk > 0 && t < f.envAtk) ? t/f.envAtk : Math.exp(-4.6*(t-f.envAtk)/f.envTime);
      const hz = clamp(f.freq*Math.pow(2, f.env*fe)*(f.key ? Math.pow(pm[i], f.key) : 1), 15, nyq);
      g = Math.tan(Math.PI*hz/sr);
    }
    let l = L[i], r = R[i];
    svfTick(s[0], l, g, k); l = out(s[0], l, k); svfTick(s[1], r, g, k); r = out(s[1], r, k);
    if (two){ svfTick(s[2], l, g, k2); l = out(s[2], l, k2); svfTick(s[3], r, g, k2); r = out(s[3], r, k2); }
    L[i] = l; R[i] = r;
  }
}
function renderLayer(layer, sr){
  const e = layer.env, dur = Math.min(30, Math.max(0.005, envLength(e))), N = Math.max(1, Math.ceil(dur*sr));
  const rnd = mulberry32((layer.seed ^ 0x9e3779b9) >>> 0), pm = new Float32Array(N);
  const pe = layer.pitchEnv, md = layer.mod, base = layer.pitch + layer.fine/100;
  for (let i=0; i<N; i++){
    const t = i/sr; let s = base;
    if (pe.amt) s += pe.mode === 'lin' ? pe.amt*Math.max(0, 1 - t/pe.time) : pe.amt*Math.exp(-4.6*t/pe.time);
    if (md.vibDepth) s += md.vibDepth*Math.sin(TAU*md.vibRate*t);
    pm[i] = Math.pow(2, s/12);
  }
  const {L, R} = RENDERERS[layer.type](layer.p, {N, sr, pm, rnd, seed: layer.seed});
  if (layer.type !== 'sampler'){
    let pk = 0; for (let i=0; i<N; i++){ const a = Math.max(Math.abs(L[i]), Math.abs(R[i])); if (a > pk) pk = a; }
    if (pk > 1e-9){ const g = 0.7/pk; for (let i=0; i<N; i++){ L[i] *= g; R[i] *= g; } }
  }
  if (layer.drive > 0){ const g = 1 + layer.drive*layer.drive*20, n = Math.tanh(g); for (let i=0; i<N; i++){ L[i] = Math.tanh(L[i]*g)/n; R[i] = Math.tanh(R[i]*g)/n; } }
  applyFilter(L, R, layer.filter, pm, sr);
  const vol = dbToGain(layer.vol), fadeN = Math.min(N, Math.ceil(0.003*sr));
  let gl = 1, gr = 1;
  for (let i=0; i<N; i++){
    const t = i/sr; let a = envAt(e, t)*vol;
    if (md.tremDepth) a *= 1 - md.tremDepth*(0.5 - 0.5*Math.cos(TAU*md.tremRate*t));
    if ((i & 63) === 0) [gl, gr] = panGains(layer.pan + md.panSweep*(2*i/N - 1));
    if (i >= N - fadeN) a *= (N - i)/fadeN;
    L[i] *= a*gl; R[i] *= a*gr;
  }
  return {L, R, N};
}
