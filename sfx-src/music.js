"use strict";
/* ======================================================================
   Compositor procedural + registro de instrumentos
   ====================================================================== */
const MUS_SR = 48000;
// ---- instrumentos (sintetizados pelo motor do SFX) ----
const INSTR_DEFS = {
  'Bumbo': {preset:'Bumbo', drum:true}, 'Caixa': {preset:'Caixa', drum:true}, 'Chimbal': {preset:'Chimbal', drum:true},
  'Chimbal aberto': {layers:[Ly('noise',{color:'branco'},{env:ONE(0.32,0.4),filter:{type:'hp',freq:7000}}), Ly('fm',{freq:800,r2:1.4471,i2:6,r3:2.3,i3:3},{vol:-6,env:ONE(0.3,0.4),filter:{type:'hp',freq:6000}})], drum:true},
  'Palmas': {layers:[0,0.012,0.024].map((s, i) => Ly('noise',{color:'branco'},{start:s,vol:i===2?0:-3,env:ONE(i===2?0.16:0.02,0.25),filter:{type:'bp',freq:1300,q:1.2}})), drum:true},
  'Tambor épico': {layers:[Ly('modal',{material:'pele',freq:70,decay:1.2,hardness:0.5,noise:0.4},{env:PHY(1.6)}), Ly('analog',{wave:'sine',freq:45,drift:0},{env:ONE(1.2,1.5),pitchEnv:{amt:10,time:0.05},drive:0.3})], drum:true},
  'Prato': {layers:[Ly('noise',{color:'branco',stereo:1},{env:ONE(1.8,2),filter:{type:'hp',freq:5000}}), Ly('fm',{freq:420,r2:1.4471,i2:8,r3:2.73,i3:4,idxDecay:1.5,stereo:15},{vol:-8,env:ONE(1.6,2),filter:{type:'hp',freq:3000}})], drum:true},
  'Baixo sintetizado': {preset:'Baixo sintetizado', root:36},
  'Baixo 808': {layers:[Ly('analog',{wave:'sine',freq:NOTE(36),drift:0},{env:env(0.002,1.4,0,1.6,0.1),pitchEnv:{amt:12,time:0.03},drive:0.35})], root:36},
  'Piano elétrico': {layers:[Ly('fm',{freq:NOTE(60),r2:1,i2:1.6,idxDecay:0.8,idxSus:0.1,stereo:6},{env:env(0.002,2.2,0,2.4,0.3)}), Ly('analog',{wave:'tri',freq:NOTE(60),drift:0.1},{vol:-10,env:env(0.002,1.6,0,2,0.3)})], root:60},
  'Cordas': {layers:[Ly('analog',{wave:'saw',freq:NOTE(60),voices:7,detune:16,spread:1,drift:0.3},{filter:{type:'lp',freq:2400},env:env(0.25,1,1,3,0.9,0.4),mod:{vibDepth:0.08,vibRate:5}})], root:60, sustain:true},
  'Pad atmosférico': {preset:'Pad atmosférico', root:60, sustain:true, dry:true},
  'Lead serra': {layers:[Ly('analog',{wave:'saw',freq:NOTE(60),voices:3,detune:9,spread:0.5},{filter:{type:'lp',freq:3200,q:1.5,env:1,envTime:0.2},env:env(0.008,0.5,0.6,1.5,0.2),mod:{vibDepth:0.12,vibRate:5.5}})], root:60, sustain:true},
  'Arpejo pluck': {layers:[Ly('analog',{wave:'saw',freq:NOTE(60),voices:2,detune:7},{filter:{type:'lp',freq:900,env:3,envTime:0.12},env:ONE(0.35,0.5)})], root:60},
  'Corda dedilhada': {preset:'Corda dedilhada', root:60, dry:true}, 'Pizzicato': {layers:[Ly('string',{freq:NOTE(60),decay:0.6,bright:0.45,pick:0.2,stereo:3},{env:PHY(0.8)})], root:60},
  'Sino': {preset:'Sino tubular', root:60, dry:true}, 'Xilofone': {preset:'Xilofone de madeira', root:60, dry:true},
};
const INSTR_REG = new Map(); // nome -> {render(midi, vel, dur, sr) -> {L,R}}
const instrCache = new Map();
async function instrSample(name){
  if (instrCache.has(name)) return instrCache.get(name);
  const d = INSTR_DEFS[name]; let snd;
  if (d.preset){ snd = buildPreset(presetByName(d.preset)); } else snd = {name, layers: JSON.parse(JSON.stringify(d.layers)).map((l, i) => (l.seed = hashStr(name + i), l)), master: defaultMaster()};
  Object.assign(snd.master, {revMix: 0, dlyMix: 0, norm: 'peak', ceiling: -1});
  const r = await renderSound(snd, MUS_SR); instrCache.set(name, r); return r;
}
Object.keys(INSTR_DEFS).forEach(name => INSTR_REG.set(name, {
  drum: !!INSTR_DEFS[name].drum,
  async render(midi, vel, dur, sr){
    const d = INSTR_DEFS[name], s = await instrSample(name), f = d.drum ? 1 : Math.pow(2, (midi - (d.root || 60))/12);
    let L = f === 1 ? s.L : stretchResample(s.L, f), R = f === 1 ? s.R : stretchResample(s.R, f);
    if (d.sustain && dur){ const n = Math.min(L.length, Math.round((dur + 0.25)*sr)), fo = Math.round(0.25*sr); L = L.slice(0, n); R = R.slice(0, n); for (let i=0; i<fo && i<n; i++){ const g = i/fo; L[n-1-i] *= g; R[n-1-i] *= g; } }
    return {L, R, gain: vel};
  }}));

// ---- gêneros ----
const SCALES = {major:[0,2,4,5,7,9,11], minor:[0,2,3,5,7,8,10], dorian:[0,2,3,5,7,9,10], harmMinor:[0,2,3,5,7,8,11]};
const GENRES = {
  'Épico cinematográfico': {bpm:[80,100], scale:'minor', prog:[[0,5,2,6],[0,3,5,4],[0,5,3,4]], drums:{'Tambor épico':'x.......x.x.....', 'Caixa':'....x.......x...', 'Prato':'x...............'}, bass:'Baixo sintetizado', bassPat:'x.......x.......', chords:'Cordas', lead:'Sino', arp:null, swing:0, leadDensity:0.35, oct:5},
  'Lo-fi': {bpm:[72,88], scale:'dorian', prog:[[1,4,0,5],[0,5,3,4],[3,4,2,5]], drums:{'Bumbo':'x.....x...x.....', 'Caixa':'....x.......x...', 'Chimbal':'x.x.x.x.x.x.x.x.'}, bass:'Baixo sintetizado', bassPat:'x.....x...x.....', chords:'Piano elétrico', lead:'Xilofone', arp:null, swing:0.22, leadDensity:0.4, oct:5, seventh:true, lofi:true},
  'Synthwave': {bpm:[96,112], scale:'minor', prog:[[0,5,2,6],[5,6,0,0],[0,3,5,6]], drums:{'Bumbo':'x...x...x...x...', 'Caixa':'....x.......x...', 'Chimbal':'..x...x...x...x.'}, bass:'Baixo sintetizado', bassPat:'x.x.x.x.x.x.x.x.', chords:'Pad atmosférico', lead:'Lead serra', arp:'Arpejo pluck', swing:0, leadDensity:0.45, oct:5},
  'Ambiente': {bpm:[60,76], scale:'major', prog:[[0,3,5,4],[0,4,5,3]], drums:{}, bass:null, chords:'Pad atmosférico', lead:'Sino', arp:'Corda dedilhada', swing:0, leadDensity:0.15, oct:5, slowArp:true},
  'Trap': {bpm:[130,150], scale:'harmMinor', prog:[[0,5,6,4],[0,0,5,6]], drums:{'Baixo 808':'x.......x..x....', 'Palmas':'........x.......', 'Chimbal':'xxxxxxxxxxxxxxxx'}, bass:null, chords:'Pad atmosférico', lead:'Sino', arp:null, swing:0, leadDensity:0.3, oct:5, halfTime:true},
  'Pop': {bpm:[100,120], scale:'major', prog:[[0,4,5,3],[5,3,0,4],[0,5,3,4]], drums:{'Bumbo':'x...x...x...x...', 'Palmas':'....x.......x...', 'Chimbal':'x.x.x.x.x.x.x.x.'}, bass:'Baixo sintetizado', bassPat:'x..x..x.x..x..x.', chords:'Piano elétrico', lead:'Lead serra', arp:'Arpejo pluck', swing:0, leadDensity:0.5, oct:5},
  'Suspense': {bpm:[60,72], scale:'harmMinor', prog:[[0,0,5,4],[0,1,0,4]], drums:{'Tambor épico':'x.........x.....'}, bass:'Baixo sintetizado', bassPat:'x...............', chords:'Cordas', lead:'Piano elétrico', arp:null, swing:0, leadDensity:0.18, oct:4},
  'Orquestral leve': {bpm:[84,100], scale:'major', prog:[[0,3,4,0],[0,5,3,4]], drums:{'Tambor épico':'x.......x.......'}, bass:'Pizzicato', bassPat:'x...x...x...x...', chords:'Cordas', lead:'Sino', arp:'Pizzicato', swing:0, leadDensity:0.35, oct:5},
};

function composeMusic(o){
  const g = GENRES[o.genre] || GENRES['Pop'], rnd = mulberry32(o.seed ?? ((Math.random()*1e9)|0));
  const bpm = o.bpm || Math.round(g.bpm[0] + rnd()*(g.bpm[1]-g.bpm[0])), beat = 60/bpm, bar = beat*4, step = bar/16;
  const root = o.key ?? Math.floor(rnd()*12), scale = SCALES[g.scale];
  const bars = Math.max(4, Math.round((o.duration || 30)/bar)), prog = g.prog[Math.floor(rnd()*g.prog.length)];
  const intensity = o.intensity ?? 0.6, notes = []; // {instr, midi, t, dur, vel, stem}
  const deg = (d, oct) => { const n = scale.length, o2 = Math.floor(d/n); return 12*(oct + 1 + o2) + root + scale[((d % n) + n) % n]; };
  const chordOf = d => [deg(d, 4), deg(d+2, 4), deg(d+4, 4)].concat(g.seventh ? [deg(d+6, 4)] : []);
  const intro = Math.min(2, Math.floor(bars/4)), outro = Math.min(2, Math.floor(bars/5)), bSec = Math.floor(bars/2);
  // motivo melódico de 2 compassos
  const motif = []; let cur = 4 + Math.floor(rnd()*3);
  for (let s=0; s<32; s++){ if (rnd() < g.leadDensity*(s % 4 === 0 ? 1.6 : 0.7)){ cur += [-2,-1,-1,0,1,1,2,3,-3][Math.floor(rnd()*9)]; cur = clamp(cur, 0, 11); const len = [2,2,4,4,6,8][Math.floor(rnd()*6)]; motif.push({s, d: cur, len}); } }
  for (let b=0; b<bars; b++){
    const t0 = b*bar, ch = prog[b % prog.length], isIntro = b < intro, isOutro = b >= bars - outro, isB = b >= bSec && !isOutro;
    const energy = isIntro ? 0.35 : isOutro ? 0.4 : isB ? Math.min(1, intensity + 0.2) : intensity;
    if (g.chords) chordOf(ch).forEach(m => notes.push({instr: o.inst?.chords || g.chords, midi: m, t: t0, dur: bar*0.98, vel: 0.5*(0.7 + energy*0.3), stem: 'Harmonia'}));
    if (g.bass && !isIntro){ const pat = g.bassPat; for (let s=0; s<16; s++) if (pat[s] === 'x') notes.push({instr: o.inst?.bass || g.bass, midi: deg(ch, 2), t: t0 + s*step, dur: step*2, vel: 0.75 + 0.15*rnd(), stem: 'Baixo'}); }
    if (energy > 0.3 && !isIntro || g.drums['Tambor épico']) Object.entries(g.drums).forEach(([inst, pat]) => {
      if (isIntro && !/Tambor|Chimbal/.test(inst)) return; if (isOutro && inst !== 'Prato' && b === bars-1) return;
      for (let s=0; s<16; s++){ if (pat[s] !== 'x') continue; if (inst === 'Chimbal' && energy < 0.5 && s % 2) continue; if (inst === 'Prato' && b % 4) continue;
        const sw = (s % 2 && g.swing) ? g.swing*step : 0; notes.push({instr: inst, midi: 60, t: t0 + s*step + sw + (rnd()-0.5)*0.006, dur: step, vel: (s % 4 === 0 ? 0.95 : 0.7) * (0.85 + 0.15*rnd()), stem: 'Bateria'}); }
      if (g.halfTime && inst === 'Chimbal' && energy > 0.6 && b % 2) for (let k=0; k<3; k++) notes.push({instr: inst, midi: 60, t: t0 + 14*step + k*step*2/3, dur: step, vel: 0.5, stem: 'Bateria'});
    });
    const arpI = o.inst?.arp || g.arp;
    if (arpI && !isOutro && (energy > 0.45 || g.slowArp)){ const tones = chordOf(ch), every = g.slowArp ? 4 : 2; for (let s=0; s<16; s+=every) notes.push({instr: arpI, midi: tones[(s/every) % tones.length] + 12, t: t0 + s*step, dur: step*every, vel: 0.45, stem: 'Arpejo'}); }
    if (g.lead && !isIntro && !isOutro){ const half = b % 2, varied = isB && rnd() < 0.5;
      motif.filter(m => Math.floor(m.s/16) === half).forEach(m => { const d = m.d + (varied ? [0,2,-2][Math.floor(rnd()*3)] : 0) + (isB ? 2 : 0);
        notes.push({instr: o.inst?.lead || g.lead, midi: deg(ch + d, g.oct) - 12*(d > 7 ? 1 : 0), t: t0 + (m.s % 16)*step, dur: m.len*step, vel: 0.6 + 0.2*energy, stem: 'Melodia'}); }); }
  }
  return {genre: o.genre, bpm, root, scaleName: g.scale, bars, duration: bars*bar, notes, lofi: !!g.lofi};
}
async function renderComposition(m, opts = {}){
  const sr = MUS_SR, N = Math.ceil((m.duration + 4)*sr), stems = {};
  for (const n of m.notes){
    const inst = INSTR_REG.get(n.instr); if (!inst) continue;
    const st = stems[n.stem] || (stems[n.stem] = {L: new Float32Array(N), R: new Float32Array(N)});
    const r = await inst.render(n.midi, n.vel, n.dur, sr), off = Math.round(n.t*sr), g = r.gain ?? n.vel;
    for (let i=0; i<r.L.length && off+i<N; i++){ st.L[off+i] += r.L[i]*g; st.R[off+i] += r.R[i]*g; }
  }
  const proc = {'Bateria': {ratio:3, thr:-18, revType:'Sala', revMix:0.08}, 'Baixo': {hp:30, lp:5000, ratio:3, thr:-20}, 'Harmonia': {hp:150, revType:'Hall', revMix:0.3, width:1.2},
    'Arpejo': {hp:200, dlyMix:0.25, dlyTime: 60/m.bpm*0.75, dlyFb:0.35, revType:'Hall', revMix:0.2}, 'Melodia': {hp:150, revType:'Hall', revMix:0.22, dlyMix:0.12, dlyTime: 60/m.bpm/2}};
  const vol = {'Bateria': -3, 'Baixo': -4, 'Harmonia': -9, 'Arpejo': -12, 'Melodia': -7};
  if (m.vocal && m.vocal.lyrics.trim()){
    const mel = m.notes.filter(n => n.stem === 'Melodia').sort((a, b) => a.t - b.t);
    if (mel.length){ const mids = mel.map(n => n.midi).sort((a, b) => a - b), target = hzToMidi(m.vocal.voice.f0*1.7), shift = Math.round((target - mids[mids.length >> 1])/12)*12;
      const sung = singLyrics(m.vocal.lyrics, mel.map(n => ({midi: n.midi + shift, t: n.t, dur: n.dur, vel: 0.85})), {...m.vocal.voice, speed: 1}, TTS_SR);
      if (sung){ const L = resampleTo(sung.L, sung.sr, sr), st = {L: new Float32Array(N), R: new Float32Array(N)}; st.L.set(L.subarray(0, N)); st.R.set(L.subarray(0, N)); stems['Vocal'] = st; } }
  }
  proc['Vocal'] = {hp: 120, ratio: 3, thr: -22, revType: 'Hall', revMix: 0.25, dlyMix: 0.1, dlyTime: 60/m.bpm/2}; vol['Vocal'] = -4; if (stems['Vocal']) vol['Melodia'] = -15;
  const out = {};
  for (const [k, s] of Object.entries(stems)){ const r = await fxChain(s.L, s.R, sr, {...(proc[k] || {}), ...(proc[k]?.revType ? REV_TYPES[proc[k].revType] : {}), revMix: proc[k]?.revMix || 0}); const g = dbToGain(vol[k] ?? -6); for (let i=0; i<r.L.length; i++){ r.L[i] *= g; r.R[i] *= g; } out[k] = r; }
  if (opts.stems) return out;
  let len = 0; Object.values(out).forEach(r => len = Math.max(len, r.L.length));
  const L = new Float32Array(len), R = new Float32Array(len); Object.values(out).forEach(r => { for (let i=0; i<r.L.length; i++){ L[i] += r.L[i]; R[i] += r.R[i]; } });
  let mix = {L, R, sr};
  if (m.lofi){ mix = await fxChain(L, R, sr, {lp: 6500, drive: 0.25, satType: 'Fita', bits: 0}); const rn = mulberry32(9); for (let i=0; i<mix.L.length; i++){ const c = rn() < 0.0004 ? (rn()-0.5)*0.15 : 0, n = (rn()-0.5)*0.004; mix.L[i] += c + n; mix.R[i] += c + n; } }
  // fade final
  const fo = Math.min(mix.L.length, Math.round(3*sr)), end = Math.min(mix.L.length, Math.round((m.duration + 2.5)*sr));
  for (let i=0; i<fo; i++){ const j = end - fo + i; if (j < 0) continue; const gg = 1 - i/fo; mix.L[j] *= gg; mix.R[j] *= gg; }
  mix.L = mix.L.subarray(0, end); mix.R = mix.R.subarray(0, end);
  return normalizeLUFS(mix, -16, -1);
}

/* ---------------- UI ---------------- */
const MUS = {genre: 'Synthwave', bpm: 0, duration: 30, intensity: 0.6, seed: 1, key: -1, inst: {}, last: null, lastMix: null};
function buildMusicUI(){
  const instOpts = sel => `<option value="">padrão do gênero</option>` + [...INSTR_REG.keys()].filter(k => !INSTR_REG.get(k).drum).map(k => `<option ${sel === k ? 'selected' : ''}>${esc(k)}</option>`).join('');
  $('musicRoot').innerHTML = `
  <div class="vgrid">
   <div class="card"><h2>Compositor</h2>
     <div class="ctl"><label>Gênero</label><select id="muGenre">${Object.keys(GENRES).map(k => `<option ${k === MUS.genre ? 'selected' : ''}>${esc(k)}</option>`).join('')}</select></div>
     <div class="ctl"><label>Tonalidade</label><select id="muKey"><option value="-1">automática</option>${NOTE_NAMES.map((n, i) => `<option value="${i}">${n}</option>`).join('')}</select></div>
     <div id="muCtl"></div>
     ${['chords:Harmonia','bass:Baixo','lead:Melodia','arp:Arpejo'].map(x => { const [k, l] = x.split(':'); return `<div class="ctl"><label>${l}</label><select data-inst="${k}">${instOpts(MUS.inst[k])}</select></div>`; }).join('')}
     <div class="row" style="margin-top:8px"><button class="btn pri grow" id="muGo">🎼 Compor</button><button class="btn grow" id="muNew">🎲 Nova ideia</button></div>
     <div class="row" style="margin-top:6px"><button class="btn sm grow" id="muPlay">▶ Ouvir</button><button class="btn sm grow" id="muStop">■</button><button class="btn sm grow" id="muMix">→ Mixer (stems)</button><button class="btn sm grow" id="muWav">⬇ WAV</button></div>
     <div class="hint" id="muInfo">Instrumental gerado por regras de composição (harmonia, motivos, groove) e tocado pelos sintetizadores do NEXI e pelos seus instrumentos.</div>
   </div>
   <div>
     <div class="card"><h2>Partitura (piano roll)</h2><canvas id="muRoll" style="height:260px"></canvas></div>
     <div class="card"><h2>Vocal sintetizado</h2>
       <label class="chk"><input type="checkbox" id="muVocalOn"> Cantar a melodia com letra</label>
       <textarea id="muLyrics" rows="4" style="margin-top:6px">Eu sou o NEXI, um bichinho que aprende com você. Brinca comigo, canta comigo, todo dia é dia de crescer.</textarea>
       <div class="row" style="margin-top:6px"><select id="muVoice" class="grow"></select><button class="btn sm" id="muLyricAI" data-need="anthropic">🤖 Escrever letra</button></div>
       <div class="hint">A voz cantada é gerada pelo motor de fala do NEXI: cada sílaba vira uma nota da melodia, com vibrato. Personas da aba Voz aparecem na lista.</div>
     </div>
   </div>
  </div>`;
  const box = $('muCtl');
  [P('bpm','Andamento (0 = auto)',0,180,0,'int','bpm'), P('duration','Duração',8,300,30,'sq','s'), P('intensity','Energia',0,1,0.6,'lin','%')].forEach(d => box.appendChild(control(d, MUS, () => {}, () => {})));
  $('muGenre').onchange = () => MUS.genre = $('muGenre').value; $('muKey').value = MUS.key; $('muKey').onchange = () => MUS.key = +$('muKey').value;
  document.querySelectorAll('[data-inst]').forEach(s => s.onchange = () => { MUS.inst[s.dataset.inst] = s.value || undefined; });
  $('muGo').onclick = () => busy('Compondo…', () => composeAndRender(false));
  $('muNew').onclick = () => busy('Compondo…', () => composeAndRender(true));
  $('muPlay').onclick = () => { if (MUS.lastMix) previewPCM(MUS.lastMix.L, MUS.lastMix.R, MUS.lastMix.sr); };
  $('muStop').onclick = stopPreview;
  $('muWav').onclick = () => { if (MUS.lastMix) download(new Blob([encodeWav(MUS.lastMix, 24, false)], {type:'audio/wav'}), slug(MUS.genre) + '.wav'); };
  $('muMix').onclick = () => busy('Renderizando stems…', async () => { if (!MUS.last) throw new Error('componha primeiro'); const st = await renderComposition(MUS.last, {stems: true});
    Object.entries(st).forEach(([k, r]) => { const id = addClip(`${MUS.genre} — ${k}`, r, 'música'); addClipToMix(id, 0, 'Música · ' + k); MIX.tracks.find(t => t.name === 'Música · ' + k).role = 'música'; });
    toast('Stems enviados ao mixer'); showModule('mix'); });
  const vs = $('muVoice'); Object.keys(TTS_VOICES).filter(k => k !== 'Sussurro').forEach(k => vs.appendChild(Object.assign(el('option', null, esc(k)), {value: 'v:' + k})));
  VS.personas.forEach(p => vs.appendChild(Object.assign(el('option', null, '⭐ ' + esc(p.name)), {value: 'p:' + p.name}))); vs.value = 'v:Feminina';
  $('muLyricAI').onclick = () => busy('Escrevendo letra…', async () => { $('muLyrics').value = (await claudeText(`Escreva uma letra curta em português do Brasil para uma música ${MUS.genre}, com versos simples e cantáveis (cerca de ${Math.round(MUS.duration*1.6)} sílabas). Responda só com a letra.`)).trim(); });
  drawRoll(); refreshApiBadges();
}
async function composeAndRender(newSeed){
  if (newSeed || !MUS.last) MUS.seed = (Math.random()*1e9)|0;
  MUS.last = composeMusic({genre: MUS.genre, bpm: MUS.bpm || 0, duration: MUS.duration, intensity: MUS.intensity, seed: MUS.seed, key: MUS.key >= 0 ? MUS.key : undefined, inst: MUS.inst});
  const vv = $('muVoice').value, per = vv.startsWith('p:') ? VS.personas.find(p => p.name === vv.slice(2)) : null;
  MUS.last.vocal = $('muVocalOn').checked ? {lyrics: $('muLyrics').value, voice: per ? per.voice : TTS_VOICES[vv.slice(2)] || TTS_VOICES['Feminina']} : null;
  MUS.lastMix = await renderComposition(MUS.last);
  $('muInfo').textContent = `${MUS.genre} · ${NOTE_NAMES[MUS.last.root]} ${({major:'maior',minor:'menor',dorian:'dórico',harmMinor:'menor harmônico'})[MUS.last.scaleName]} · ${MUS.last.bpm} BPM · ${MUS.last.bars} compassos · ${MUS.last.notes.length} notas`;
  drawRoll(); previewPCM(MUS.lastMix.L, MUS.lastMix.R, MUS.lastMix.sr);
}
function drawRoll(){
  const cv = $('muRoll'); if (!cv) return; const {ctx, w, h} = fit(cv); ctx.clearRect(0, 0, w, h); const m = MUS.last; if (!m) return;
  const cols = {'Bateria':'#ef7d5a','Baixo':'#8fb8d9','Harmonia':'#7a6aa8','Arpejo':'#c9dc86','Melodia':'#f2cf62'};
  const pitched = m.notes.filter(n => n.stem !== 'Bateria'), lo = Math.min(...pitched.map(n => n.midi), 36) - 1, hi = Math.max(...pitched.map(n => n.midi), 84) + 1;
  const X = t => t/m.duration*w, Y = p => h*0.82 - (p - lo)/(hi - lo)*h*0.8;
  ctx.strokeStyle = cssv('--grid'); for (let b=0; b<m.bars; b++){ const x = X(b*240/m.bpm); ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  m.notes.forEach(n => { ctx.fillStyle = cols[n.stem] || '#fff';
    if (n.stem === 'Bateria'){ const row = {'Bumbo':0,'Baixo 808':0,'Tambor épico':0,'Caixa':1,'Palmas':1,'Chimbal':2,'Chimbal aberto':2,'Prato':3}[n.instr] ?? 2; ctx.fillRect(X(n.t), h*0.86 + row*h*0.035, 2, h*0.03); }
    else ctx.fillRect(X(n.t), Y(n.midi) - 2, Math.max(2, X(n.dur) - 1), 4); });
}
MODULE_SHOW.music = () => { if (!$('muGenre')) buildMusicUI(); refreshApiBadges(); };
