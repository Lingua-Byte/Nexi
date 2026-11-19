"use strict";
/* ======================================================================
   Instrumentos: ressíntese aditiva + sampler multi-amostra (zonas,
   camadas de velocidade, round-robin)
   ====================================================================== */
const MODELS = new Map(); // id -> modelo de ressíntese
const INS = {list: LS.get('nexi-sfx-instruments', []), cur: null, notes: new Map()};

/* ---------------- Análise para ressíntese ---------------- */
function analyzeResynth(x, sr, name){
  // trecho estável para detectar a altura
  let pk = 0, pkI = 0; for (let i=0; i<x.length; i++){ const a = Math.abs(x[i]); if (a > pk){ pk = a; pkI = i; } }
  const f0 = yinPitch(x, sr, Math.min(x.length - 8192, pkI + Math.round(0.05*sr)), 8192) || yinPitch(x, sr, 0, 8192);
  if (!f0) throw new Error('não consegui detectar a nota (use uma gravação de uma nota só)');
  const n = 4096, hop = 256, win = new Float32Array(n); for (let i=0; i<n; i++) win[i] = 0.5 - 0.5*Math.cos(TAU*i/n);
  const frames = Math.max(1, Math.floor((x.length - n)/hop) + 1), K = Math.min(80, Math.floor(sr*0.45/f0));
  const partials = []; for (let k=0; k<K; k++) partials.push({ratio: k+1, amps: new Float32Array(frames), fr: []});
  const NB = 24, bandHz = []; for (let b=0; b<NB; b++) bandHz.push(80*Math.pow(16000/80, b/(NB-1)));
  const noiseBands = new Float32Array(NB), noiseEnv = new Float32Array(frames);
  const re = new Float32Array(n), im = new Float32Array(n), mag = new Float32Array(n/2), norm = 2/(n*0.5);
  for (let f=0; f<frames; f++){
    const s = f*hop; for (let i=0; i<n; i++){ re[i] = (x[s+i] || 0)*win[i]; im[i] = 0; } fft(re, im);
    for (let k=0; k<n/2; k++) mag[k] = Math.hypot(re[k], im[k]);
    const used = new Uint8Array(n/2);
    partials.forEach((p, k) => {
      const c = (k+1)*f0/sr*n, lo = Math.max(1, Math.floor(c*0.97) - 1), hi = Math.min(n/2-2, Math.ceil(c*1.03) + 1); let bi = lo;
      for (let b=lo; b<=hi; b++) if (mag[b] > mag[bi]) bi = b;
      const a = mag[bi-1], b2 = mag[bi], cc = mag[bi+1], d = 0.5*(a - cc)/((a - 2*b2 + cc) || 1);
      p.amps[f] = b2*norm; if (b2*norm > 1e-4) p.fr.push((bi + d)/n*sr/f0);
      for (let b=bi-3; b<=bi+3; b++) if (b > 0 && b < n/2) used[b] = 1;
    });
    let ne = 0; const bs = new Float32Array(NB), bc = new Float32Array(NB);
    for (let k=1; k<n/2; k++){ if (used[k]) continue; const hz = k/n*sr; const bi = clamp(Math.round(Math.log(hz/80)/Math.log(16000/80)*(NB-1)), 0, NB-1); bs[bi] += mag[k]*mag[k]; bc[bi]++; ne += mag[k]*mag[k]; }
    noiseEnv[f] = Math.sqrt(ne)*norm; for (let b=0; b<NB; b++) if (bc[b]) noiseBands[b] += Math.sqrt(bs[b]/bc[b]);
  }
  partials.forEach(p => { if (p.fr.length > 3){ p.fr.sort((a, b) => a - b); p.ratio = p.fr[p.fr.length >> 1]; } delete p.fr; });
  const nbMax = Math.max(...noiseBands) || 1; for (let b=0; b<NB; b++) noiseBands[b] /= nbMax;
  // escala do ruído relativa aos parciais
  return {name, f0, sr, hop, frames, partials: partials.filter(p => Math.max(...p.amps) > 1e-4), noise: {bands: noiseBands, hz: bandHz, env: noiseEnv}, dur: x.length/sr};
}
function renderResynth(m, freq, sr, o = {}){
  const tScale = o.decay || 1, bright = o.bright || 0, stretch = o.inharm || 0, noiseAmt = o.noise ?? 1, preserve = !!o.preserve;
  const dur = Math.min(30, (o.dur || m.dur*tScale)), N = Math.ceil(dur*sr), out = new Float32Array(N), hopT = m.hop/m.sr, ratioF = freq/m.f0;
  const loopA = Math.floor(m.frames*0.35), loopB = Math.max(loopA + 2, Math.floor(m.frames*0.7));
  const frameAt = t => { let f = t/tScale/hopT; if (o.sustain && f > loopB){ const L = loopB - loopA; f = loopA + ((f - loopA) % L); } return f; };
  // envelope espectral (para preservar o timbre ao transpor)
  const envAt = hz => { let best = 0, bd = Infinity; m.partials.forEach((p, i) => { const d = Math.abs(p.ratio*m.f0 - hz); if (d < bd){ bd = d; best = i; } }); return best; };
  m.partials.forEach((p, k) => {
    const pf = freq*p.ratio*(1 + stretch*0.0015*(p.ratio*p.ratio)); if (pf >= sr*0.45) return;
    const src = preserve && Math.abs(ratioF - 1) > 0.03 ? m.partials[envAt(pf)] : p;
    const tilt = Math.pow(p.ratio, bright*0.8);
    const w = TAU*pf/sr, cw = Math.cos(w), sw = Math.sin(w); let cr = Math.cos(k*1.7), ci = Math.sin(k*1.7);
    for (let i=0; i<N; i++){
      const fr = frameAt(i/sr), f0i = Math.floor(fr); if (f0i >= m.frames - 1 && !o.sustain) break;
      const a0 = src.amps[Math.min(m.frames-1, f0i)], a1 = src.amps[Math.min(m.frames-1, f0i+1)], a = (a0 + (a1 - a0)*(fr - f0i))*tilt;
      out[i] += ci*a; const nc = cr*cw - ci*sw; ci = cr*sw + ci*cw; cr = nc;
    }
  });
  if (noiseAmt > 0){
    const rnd = mulberry32(11), fs = m.noise.hz.map(() => newSVF()), gs = m.noise.hz.map(h => Math.tan(Math.PI*Math.min(h*ratioF*(preserve ? 1/ratioF : 1), sr*0.45)/sr));
    for (let i=0; i<N; i++){
      const fr = frameAt(i/sr), f0i = Math.min(m.frames-1, Math.floor(fr)); if (fr >= m.frames - 1 && !o.sustain) break;
      const e = m.noise.env[f0i]*noiseAmt; if (e < 1e-6) continue; const wn = rnd()*2-1; let v = 0;
      for (let b=0; b<fs.length; b++){ svfTick(fs[b], wn, gs[b], 1.6); v += fs[b].bp*m.noise.bands[b]; }
      out[i] += v*e*0.35;
    }
  }
  const fo = Math.min(N, Math.round(0.02*sr)); for (let i=0; i<fo; i++) out[N-1-i] *= i/fo;
  return out;
}
// motor de ressíntese dentro do SFX Studio
ENGINES.resynth = {name:'Ressíntese (instrumento analisado)', tag:'RSN', env: PHYS_ENV, params:[
  P('model','Modelo',0,0,'','sample'), P('freq','Frequência',20,8000,261.63,'log','Hz'), P('bright','Brilho',-1,1,0,'lin','%'),
  P('inharm','Inarmonicidade extra',0,1,0,'lin','%'), P('decay','Escala de tempo',0.25,4,1,'log','x'), P('noise','Ruído (sopro/ataque)',0,2,1,'lin','%'),
  B('preserve','Preservar timbre ao transpor',true), B('sustain','Sustentar (loop)',false)]};
RENDERERS.resynth = (p, c) => {
  const m = MODELS.get(p.model); const L = new Float32Array(c.N); if (!m) return {L, R: L.slice()};
  const y = renderResynth(m, p.freq*c.pm[0], c.sr, {...p, dur: c.N/c.sr}); L.set(y.subarray(0, c.N)); return {L, R: L.slice()};
};

/* ---------------- Sampler multi-amostra ---------------- */
function noteFromName(n){
  const m = n.match(/(?:^|[^A-Za-z])([A-Ga-g])(#|b|s)?(-?\d)(?![\d])/); if (m){ const base = {c:0,d:2,e:4,f:5,g:7,a:9,b:11}[m[1].toLowerCase()] + (m[2] === '#' || m[2] === 's' ? 1 : m[2] === 'b' ? -1 : 0); return 12*(+m[3] + 1) + base; }
  const d = n.match(/(?:^|\D)(\d{2,3})(?:\D|$)/); if (d && +d[1] >= 21 && +d[1] <= 108) return +d[1];
  return null;
}
function velFromName(n){ const m = n.toLowerCase().match(/(?:^|[_\-\s.])(ppp|pp|p|mp|mf|f|ff|fff|v\d)(?:[_\-\s.]|$)/); if (!m) return null; const map = {ppp:0.1,pp:0.2,p:0.35,mp:0.5,mf:0.62,f:0.78,ff:0.9,fff:1}; return map[m[1]] ?? clamp(+m[1].slice(1)/4, 0, 1); }
function buildZones(items){
  const byRoot = {}; items.forEach(it => (byRoot[it.root] = byRoot[it.root] || []).push(it));
  const roots = Object.keys(byRoot).map(Number).sort((a, b) => a - b), zones = [];
  roots.forEach((r, i) => {
    const lo = i === 0 ? 0 : Math.floor((roots[i-1] + r)/2) + 1, hi = i === roots.length-1 ? 127 : Math.floor((r + roots[i+1])/2);
    const grp = byRoot[r], vels = [...new Set(grp.map(g => g.vel).filter(v => v != null))].sort((a, b) => a - b);
    grp.forEach(g => {
      let vLo = 0, vHi = 1;
      if (g.vel != null && vels.length > 1){ const k = vels.indexOf(g.vel); vLo = k === 0 ? 0 : (vels[k-1] + g.vel)/2; vHi = k === vels.length-1 ? 1 : (g.vel + vels[k+1])/2; }
      zones.push({sampleId: g.sampleId, name: g.name, root: r, lo, hi, vLo, vHi});
    });
  });
  return zones;
}
const rrCounter = new Map();
function samplerRender(inst, midi, vel, dur, sr){
  const cands = inst.zones.filter(z => midi >= z.lo && midi <= z.hi && vel >= z.vLo - 1e-6 && vel <= z.vHi + 1e-6 && SAMPLES.has(z.sampleId));
  if (!cands.length) return null;
  const key = inst.name + midi, k = (rrCounter.get(key) || 0); rrCounter.set(key, k + 1);
  const z = cands[k % cands.length], s = SAMPLES.get(z.sampleId), f = Math.pow(2, (midi - z.root + inst.tune/100)/12)*s.sr/sr;
  const a = inst.adsr, n = Math.min(Math.floor((s.ch[0].length - 2)/f), Math.ceil(((dur || 2) + a.r)*sr)), L = new Float32Array(n), R = new Float32Array(n);
  const c0 = s.ch[0], c1 = s.ch[1] || s.ch[0], gate = (dur || 2)*sr;
  for (let i=0; i<n; i++){
    const t = i/sr; let e = t < a.a ? t/a.a : a.s + (1 - a.s)*Math.exp(-(t - a.a)/Math.max(0.01, a.d));
    if (i > gate) e *= Math.exp(-(i - gate)/sr/Math.max(0.01, a.r/4));
    const pos = i*f; L[i] = hermite(c0, pos)*e; R[i] = hermite(c1, pos)*e;
  }
  return {L, R, gain: Math.pow(vel, 1.6)*1.2};
}
function registerInstrument(inst){
  INSTR_REG.set('Meu: ' + inst.name, {drum: false, async render(midi, vel, dur, sr){
    if (inst.type === 'resynth'){ const m = MODELS.get(inst.model); if (!m) return {L: new Float32Array(1), R: new Float32Array(1)};
      const y = renderResynth(m, 440*Math.pow(2, (midi - 69)/12), sr, {...inst.opts, dur: (dur || 2) + 0.4, sustain: inst.opts.sustain}); return {L: y, R: y, gain: vel}; }
    return samplerRender(inst, midi, vel, dur, sr) || {L: new Float32Array(1), R: new Float32Array(1)};
  }});
}
function saveInstruments(){ LS.set('nexi-sfx-instruments', INS.list.map(i => { const o = {...i}; delete o.modelData; return o; })); }
function loadModelsIDB(){
  [...SAMPLES.keys()].filter(k => k.startsWith('model:')).forEach(k => { MODELS.set(k.slice(6), SAMPLES.get(k)); SAMPLES.delete(k); });
  INS.list.forEach(registerInstrument);
}
function modelBar(l){
  const bar = el('div', 'smpbar'), s = el('select'); s.style.flex = '1';
  s.appendChild(Object.assign(el('option', null, MODELS.size ? '— escolha um modelo —' : '— crie um modelo na aba Instrumentos —'), {value: ''}));
  INS.list.filter(i => i.type === 'resynth' && MODELS.has(i.model)).forEach(i => s.appendChild(Object.assign(el('option', null, esc(i.name)), {value: i.model})));
  s.value = MODELS.has(l.p.model) ? l.p.model : '';
  s.onchange = () => { l.p.model = s.value; const m = MODELS.get(s.value); if (m){ l.p.freq = m.f0; l.env.len = m.dur; } commit(); renderEditor(); scheduleRender(true); };
  const go = el('button', 'btn sm', 'Instrumentos →'); go.onclick = () => showModule('inst');
  bar.append(s, go); return bar;
}

/* ---------------- UI ---------------- */
function buildInstUI(){
  $('instRoot').innerHTML = `
  <div class="vgrid">
   <div>
    <div class="card"><h2>Sampler multi-amostra</h2>
      <div class="dropzone" id="inDrop">Solte várias gravações de notas (ex.: piano_C4.wav, piano_E4_f.wav…) ou <button class="btn sm" id="inPick">escolha arquivos</button></div>
      <div class="hint">A nota de cada arquivo é lida do nome (C4, A#3, 60) ou detectada automaticamente. Arquivos na mesma nota viram round-robin; nomes com pp/mf/ff ou v1…v4 viram camadas de velocidade.</div>
    </div>
    <div class="card"><h2>Ressíntese de instrumento</h2>
      <div class="row"><button class="btn grow" id="inResFile">📂 Analisar gravação de uma nota</button><button class="btn grow" id="inResRec">🎙 Gravar nota</button><button class="btn grow" id="inResClip">Do banco de clipes…</button></div>
      <div class="hint">Mede cada harmônico (frequência e envelope ao longo do tempo) e o ruído residual (sopro, arco, ataque). O modelo toca em qualquer nota, com controle de brilho, inarmonicidade, sustentação e preservação de timbre. Também vira motor “Ressíntese” nas camadas do SFX.</div>
    </div>
    <div class="card"><h2>Meus instrumentos</h2><div class="list" id="inList" style="max-height:260px"></div></div>
   </div>
   <div>
    <div class="card"><h2 id="inTitle">Instrumento</h2><div id="inEdit"><div class="empty">Crie ou escolha um instrumento.</div></div></div>
    <div class="card"><h2>Tocar</h2><div class="kbwrap" id="inKbd"></div><div class="hint">Use o teclado do computador (A–K) ou um teclado MIDI conectado na aba SFX. As notas tocam o instrumento selecionado aqui.</div></div>
   </div>
  </div><input type="file" id="inFiles" accept="audio/*" multiple hidden><input type="file" id="inResInput" accept="audio/*" hidden>`;
  const drop = $('inDrop');
  drop.ondragover = e => { e.preventDefault(); drop.classList.add('on'); }; drop.ondragleave = () => drop.classList.remove('on');
  drop.ondrop = e => { e.preventDefault(); drop.classList.remove('on'); importMulti([...e.dataTransfer.files]); };
  $('inPick').onclick = () => $('inFiles').click(); $('inFiles').onchange = e => { const fs = [...e.target.files]; e.target.value = ''; importMulti(fs); };
  $('inResFile').onclick = () => $('inResInput').click();
  $('inResInput').onchange = async e => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; await busy('Analisando…', async () => { const id = await decodeToClip(f.name.replace(/\.[^.]+$/, ''), await f.arrayBuffer(), 'nota'); createResynth(CLIPS.get(id)); }); };
  $('inResRec').onclick = async () => { const before = VS.src; toast('Gravando 3 s… toque uma nota'); try {
    const stream = await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false, noiseSuppression:false, autoGainControl:false}}); const rec = new MediaRecorder(stream), ch = [];
    rec.ondataavailable = e => ch.push(e.data); rec.onstop = async () => { stream.getTracks().forEach(t => t.stop()); await busy('Analisando…', async () => { const id = await decodeToClip('Nota gravada', await new Blob(ch).arrayBuffer(), 'nota'); createResynth(CLIPS.get(id)); }); };
    rec.start(); setTimeout(() => rec.stop(), 3000); } catch(e){ toast('Microfone indisponível'); } void before; };
  $('inResClip').onclick = async () => { const cs = [...CLIPS.values()]; if (!cs.length){ toast('O banco de clipes está vazio'); return; } const names = cs.map((c, i) => `${i+1}. ${c.name}`).join('\n'); const k = +await askText('Número do clipe:\n' + names, '1'); const c = cs[k-1]; if (c) busy('Analisando…', async () => createResynth(c)); };
  buildInstKbd(); renderInstList(); renderInstEdit();
}
async function importMulti(files){
  if (!files.length) return;
  await busy('Importando amostras…', async () => {
    const items = [];
    for (const f of files){
      setStatus(`Lendo ${f.name}…`); const buf = await ensureAC().decodeAudioData(await f.arrayBuffer());
      const ch = []; for (let c=0; c<Math.min(2, buf.numberOfChannels); c++) ch.push(buf.getChannelData(c).slice());
      const name = f.name.replace(/\.[^.]+$/, ''); let root = noteFromName(name);
      if (root == null){ const hz = yinPitch(ch[0], buf.sampleRate, Math.min(ch[0].length - 8192, Math.round(0.08*buf.sampleRate)), 8192); root = hz ? Math.round(hzToMidi(hz)) : 60; }
      const sid = 'i' + Date.now().toString(36) + Math.random().toString(36).slice(2,6); const smp = {name, sr: buf.sampleRate, ch}; SAMPLES.set(sid, smp); idbPut(sid, smp);
      items.push({sampleId: sid, name, root, vel: velFromName(name)});
    }
    const nm = await askText('Nome do instrumento:', items[0].name.replace(/[_\-\s]*([A-G][#b]?-?\d|\d{2,3}).*$/i, '') || 'Instrumento') || 'Instrumento';
    const inst = {type: 'sampler', name: nm, zones: buildZones(items), adsr: {a: 0.003, d: 3, s: 1, r: 0.3}, tune: 0};
    INS.list.unshift(inst); registerInstrument(inst); saveInstruments(); INS.cur = inst; renderInstList(); renderInstEdit();
    toast(`${items.length} amostras · ${inst.zones.length} zonas`);
  });
}
function createResynth(c){
  const x = new Float32Array(c.L.length); for (let i=0; i<x.length; i++) x[i] = (c.L[i] + c.R[i])/2;
  const m = analyzeResynth(x, c.sr, c.name), id = 'm' + Date.now().toString(36); MODELS.set(id, m); idbPut('model:' + id, m);
  const inst = {type: 'resynth', name: c.name.slice(0, 40), model: id, opts: {bright: 0, inharm: 0, decay: 1, noise: 1, preserve: true, sustain: false}};
  INS.list.unshift(inst); registerInstrument(inst); saveInstruments(); INS.cur = inst; renderInstList(); renderInstEdit();
  toast(`Modelo criado: ${m.partials.length} harmônicos, nota ${midiName(hzToMidi(m.f0))} (${m.f0.toFixed(1)} Hz)`);
}
function renderInstList(){
  const box = $('inList'); if (!box) return; box.innerHTML = '';
  if (!INS.list.length){ box.innerHTML = '<div class="empty">Nenhum instrumento ainda.</div>'; return; }
  INS.list.forEach((inst, i) => {
    const it = el('div', 'item' + (inst === INS.cur ? ' cur' : ''), `<span class="nm">${esc(inst.name)}</span><span class="cat">${inst.type === 'resynth' ? 'ressíntese' : inst.zones.length + ' zonas'}</span><button title="Excluir">✕</button>`);
    it.onclick = () => { INS.cur = inst; INS.notes.clear(); renderInstList(); renderInstEdit(); };
    it.querySelector('button').onclick = async e => { e.stopPropagation(); if (!await askConfirm(`Excluir "${inst.name}"?`)) return; INSTR_REG.delete('Meu: ' + inst.name); INS.list.splice(i, 1); if (INS.cur === inst) INS.cur = null; saveInstruments(); renderInstList(); renderInstEdit(); };
    box.appendChild(it);
  });
}
function renderInstEdit(){
  const box = $('inEdit'); if (!box) return; box.innerHTML = ''; const inst = INS.cur;
  if (!inst){ box.innerHTML = '<div class="empty">Crie ou escolha um instrumento.</div>'; $('inTitle').textContent = 'Instrumento'; return; }
  $('inTitle').textContent = inst.name;
  const changed = () => { INS.notes.clear(); saveInstruments(); };
  if (inst.type === 'resynth'){
    const m = MODELS.get(inst.model); box.appendChild(el('div', 'hint', m ? `Nota original ${midiName(hzToMidi(m.f0))} · ${m.partials.length} harmônicos · ${fmtS(m.dur)}` : 'Modelo indisponível'));
    [P('bright','Brilho',-1,1,0,'lin','%'), P('inharm','Inarmonicidade extra',0,1,0,'lin','%'), P('decay','Escala de tempo',0.25,4,1,'log','x'), P('noise','Ruído (sopro/ataque)',0,2,1,'lin','%'),
     B('preserve','Preservar timbre ao transpor',true), B('sustain','Sustentar (loop)',false)].forEach(d => box.appendChild(control(d, inst.opts, () => {}, changed)));
    const cv = el('canvas'); cv.style.height = '120px'; box.appendChild(cv); requestAnimationFrame(() => drawPartials(cv, m));
    const toSfx = el('button', 'btn sm', '→ Usar como camada no SFX'); toSfx.onclick = () => { addLayer('resynth'); const l = S.layers[sel]; l.p.model = inst.model; l.p.freq = m.f0; l.env.len = m.dur; Object.assign(l.p, inst.opts); commit(); renderEditor(); scheduleRender(true); toast('Camada de ressíntese criada no SFX'); };
    box.appendChild(toSfx);
  } else {
    [P('a','Ataque',0.001,2,0.003,'log','s'), P('d','Decaimento',0.05,10,3,'log','s'), P('s','Sustentação',0,1,1,'lin','%'), P('r','Release',0.01,5,0.3,'log','s')].forEach(d => box.appendChild(control(d, inst.adsr, () => {}, changed)));
    box.appendChild(control(P('tune','Afinação',-100,100,0,'lin','ct'), inst, () => {}, changed));
    const tbl = el('div', 'list'); tbl.style.maxHeight = '200px';
    inst.zones.forEach(z => tbl.appendChild(el('div', 'item', `<span class="nm">${esc(z.name)}</span><span class="cat">raiz ${midiName(z.root)} · ${midiName(z.lo)}–${midiName(z.hi)}${z.vLo > 0 || z.vHi < 1 ? ` · vel ${Math.round(z.vLo*127)}–${Math.round(z.vHi*127)}` : ''}</span>`)));
    box.appendChild(tbl);
  }
  box.appendChild(el('div', 'hint', 'Disponível no Compositor como “Meu: ' + esc(inst.name) + '”.'));
}
function drawPartials(cv, m){
  if (!m) return; const {ctx, w, h} = fit(cv); ctx.clearRect(0, 0, w, h); const K = Math.min(40, m.partials.length), mx = Math.max(...m.partials.map(p => Math.max(...p.amps))) || 1;
  m.partials.slice(0, K).forEach((p, k) => { const a = Math.max(...p.amps)/mx, x = k/K*w; ctx.fillStyle = cssv('--accent'); const hh = Math.max(1, (1 + Math.log10(a + 1e-3)/3)*h*0.9); ctx.fillRect(x + 1, h - hh, w/K - 2, hh); });
}
function buildInstKbd(){
  const kb = $('inKbd'); if (!kb) return; kb.innerHTML = '';
  const first = 48, whites = [];
  for (let m=first; m<=first+24; m++){ const pc = m % 12; if (![1,3,6,8,10].includes(pc)){ const k = el('div', 'wk', pc === 0 ? midiName(m) : ''); k.dataset.m = m; kb.appendChild(k); whites.push(k); } }
  const ww = 100/whites.length; let wi = 0;
  for (let m=first; m<=first+24; m++){ if ([1,3,6,8,10].includes(m % 12)){ const k = el('div', 'bk'); k.dataset.m = m; k.style.left = `${wi*ww - ww*0.3}%`; k.style.width = `${ww*0.6}%`; kb.appendChild(k); } else wi++; }
  kb.onpointerdown = e => { const k = e.target.closest('[data-m]'); if (!k) return; e.preventDefault(); instNoteOn(+k.dataset.m, 0.6 + 0.4*clamp(e.offsetY/(k.clientHeight || 1), 0, 1)); k.classList.add('dn'); setTimeout(() => k.classList.remove('dn'), 180); };
}
async function instNoteOn(midi, vel = 0.8){
  const inst = INS.cur; if (!inst) return;
  const key = midi + ':' + Math.round(vel*4), c = ensureAC(); let r = INS.notes.get(key);
  if (!r){ r = await INSTR_REG.get('Meu: ' + inst.name).render(midi, vel, 1.5, c.sampleRate); if (inst.type !== 'sampler') INS.notes.set(key, r); }
  const b = c.createBuffer(2, r.L.length, c.sampleRate); b.copyToChannel(r.L, 0); b.copyToChannel(r.R, 1);
  const s = c.createBufferSource(), g = c.createGain(); s.buffer = b; g.gain.value = (r.gain ?? vel)*0.8; s.connect(g); g.connect(monGain); s.start();
}
// roteia teclado do computador e MIDI para o instrumento quando a aba está aberta
const _sfxNoteOn = noteOn, _sfxNoteOff = noteOff;
noteOn = function(semi, vel){ if (curModule === 'inst'){ instNoteOn(60 + semi, vel ?? 0.8); return; } return _sfxNoteOn(semi, vel); };
noteOff = function(semi, hard){ if (curModule === 'inst') return; return _sfxNoteOff(semi, hard); };
MODULE_SHOW.inst = () => { if (!$('inDrop')) buildInstUI(); renderInstList(); };
