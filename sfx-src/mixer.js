"use strict";
/* ======================================================================
   Mixer multipista + Assistente de mixagem + Masterização automática
   ====================================================================== */
const MIX_SR = 48000;
const MIX = {tracks: [], selTrack: 0, selClip: null, pps: 60, playhead: 0, revType: 'Hall',
  master: null, masterOn: true};
const DESTINATIONS = {
  'Spotify / streaming (−14 LUFS)': {lufs:-14, tp:-1}, 'YouTube (−14 LUFS)': {lufs:-14, tp:-1}, 'Apple Music (−16 LUFS)': {lufs:-16, tp:-1},
  'Podcast (−16 LUFS)': {lufs:-16, tp:-1}, 'TV / EBU R128 (−23 LUFS)': {lufs:-23, tp:-1}, 'Cinema / trailer (−24 LUFS)': {lufs:-24, tp:-2},
  'Jogos (−18 LUFS)': {lufs:-18, tp:-1}, 'Clube / máximo (−9 LUFS)': {lufs:-9, tp:-0.3},
};
const BANDS = [31.5, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
const PROFILES = {
  'Equilibrado':        [ 1, 2, 2, 1, 0, 0, -1, -2, -4, -8],
  'Cinema / trailer':   [ 4, 4, 3, 1, 0, 0, -1, -2, -3, -6],
  'Voz / podcast':      [-8,-4, 0, 1, 1, 1,  1,  0, -3, -8],
  'Pop / EDM':          [ 3, 4, 3, 0,-1, 0,  0,  0, -2, -5],
  'Lo-fi quente':       [ 1, 3, 3, 2, 1, 0, -2, -4, -7,-12],
  'Trilha de jogo':     [ 1, 2, 2, 1, 0, 0,  0, -1, -3, -6],
  'Acústico / orquestra':[0, 1, 1, 1, 0, 0, -1, -2, -4, -8],
};
function defaultMastering(){
  return {dest: 'Spotify / streaming (−14 LUFS)', profile: 'Equilibrado', strength: 0.6,
    eqOn: true, eq: BANDS.map(() => 0),
    mbOn: true, mb: [{thr:-20, ratio:2}, {thr:-18, ratio:1.8}, {thr:-16, ratio:2}], xo: [200, 3000],
    excite: 0.15, widthLow: 0, widthHigh: 1.15, lufs: -14, ceiling: -1};
}
MIX.master = defaultMastering();
function newTrack(name, role = 'sfx'){
  return {id: 't' + Math.random().toString(36).slice(2,8), name, role, vol: 0, pan: 0, mute: false, solo: false, duck: role === 'música' || role === 'ambiente',
    hp: role === 'voz' ? 80 : 30, low: 0, mid: 0, midF: 1500, high: 0, comp: role === 'voz', thr: -20, ratio: 3, send: role === 'voz' ? 0.08 : 0.12, clips: []};
}
const ROLES = ['voz', 'música', 'sfx', 'ambiente'];

/* ---------------- Render ---------------- */
function clipData(c, sr){
  if (c.sr === sr) return c;
  if (!c._rs || c._rs.sr !== sr) c._rs = {sr, L: resampleTo(c.L, c.sr, sr), R: resampleTo(c.R, c.sr, sr)};
  return c._rs;
}
function mixLength(){
  let end = 1;
  MIX.tracks.forEach(t => t.clips.forEach(k => { const c = CLIPS.get(k.clipId); if (c) end = Math.max(end, k.start + clipDur(c)); }));
  return end;
}
function trackDry(t, sr, N){
  const L = new Float32Array(N), R = new Float32Array(N);
  t.clips.forEach(k => {
    const c0 = CLIPS.get(k.clipId); if (!c0) return; const c = clipData(c0, sr);
    const off = Math.round(k.start*sr), g = dbToGain(k.gain || 0), n = c.L.length;
    const fi = Math.round((k.fadeIn || 0)*sr), fo = Math.round((k.fadeOut || 0)*sr);
    for (let i=0; i<n && off+i<N; i++){
      if (off + i < 0) continue;
      let a = g; if (fi && i < fi) a *= i/fi; if (fo && i > n - fo) a *= (n - i)/fo;
      L[off+i] += c.L[i]*a; R[off+i] += c.R[i]*a;
    }
  });
  return {L, R};
}
async function trackFX(d, sr, t){
  const N = d.L.length, ctx = new OfflineAudioContext(2, N, sr), b = ctx.createBuffer(2, N, sr);
  b.copyToChannel(d.L, 0); b.copyToChannel(d.R, 1);
  const s = ctx.createBufferSource(); s.buffer = b; let node = s;
  const bq = (type, f, q, g) => { const x = ctx.createBiquadFilter(); x.type = type; x.frequency.value = f; if (q != null) x.Q.value = q; if (g != null) x.gain.value = g; node.connect(x); node = x; };
  bq('highpass', t.hp, 0.707);
  if (t.low) bq('lowshelf', 120, null, t.low);
  if (t.mid) bq('peaking', t.midF, 1, t.mid);
  if (t.high) bq('highshelf', 8000, null, t.high);
  if (t.comp){ const c = ctx.createDynamicsCompressor(); c.threshold.value = t.thr; c.ratio.value = t.ratio; c.attack.value = 0.008; c.release.value = 0.15; c.knee.value = 6; node.connect(c); node = c; }
  const g = ctx.createGain(); g.gain.value = dbToGain(t.vol); node.connect(g);
  const p = ctx.createStereoPanner(); p.pan.value = t.pan; g.connect(p); p.connect(ctx.destination);
  s.start(); const r = await ctx.startRendering();
  return {L: r.getChannelData(0).slice(), R: r.getChannelData(1).slice()};
}
function envelopeFollow(L, R, sr, att = 0.01, rel = 0.3){
  const N = L.length, e = new Float32Array(N), aA = Math.exp(-1/(att*sr)), aR = Math.exp(-1/(rel*sr)); let v = 0;
  for (let i=0; i<N; i++){ const x = Math.max(Math.abs(L[i]), Math.abs(R[i])); v = x > v ? aA*v + (1-aA)*x : aR*v + (1-aR)*x; e[i] = v; }
  return e;
}
async function renderMix(opts = {}){
  const sr = MIX_SR, N = Math.ceil((mixLength() + 2.5)*sr), anySolo = MIX.tracks.some(t => t.solo);
  const outs = [];
  for (const t of MIX.tracks){
    if (t.mute || (anySolo && !t.solo) || !t.clips.length){ outs.push(null); continue; }
    if (opts.only != null && opts.only !== t) { outs.push(null); continue; }
    outs.push(await trackFX(trackDry(t, sr, N), sr, t));
  }
  // ducking: faixas marcadas abaixam sob a voz
  const voices = outs.map((o, i) => o && MIX.tracks[i].role === 'voz' ? o : null).filter(Boolean);
  if (voices.length && !opts.noDuck){
    const vL = new Float32Array(N), vR = new Float32Array(N); voices.forEach(o => { for (let i=0; i<N; i++){ vL[i] += o.L[i]; vR[i] += o.R[i]; } });
    const env = envelopeFollow(vL, vR, sr, 0.02, 0.45);
    outs.forEach((o, i) => { if (!o || !MIX.tracks[i].duck) return; for (let j=0; j<N; j++){ const red = Math.min(1, env[j]*8); const g = 1 - red*0.6; o.L[j] *= g; o.R[j] *= g; } });
  }
  const L = new Float32Array(N), R = new Float32Array(N), sL = new Float32Array(N), sR = new Float32Array(N); let anySend = false;
  outs.forEach((o, i) => { if (!o) return; const sd = MIX.tracks[i].send;
    for (let j=0; j<N; j++){ L[j] += o.L[j]; R[j] += o.R[j]; if (sd){ sL[j] += o.L[j]*sd; sR[j] += o.R[j]*sd; } } if (sd) anySend = true; });
  if (anySend){
    const rv = await reverbWet(sL, sR, sr, {...defaultMaster(), ...REV_TYPES[MIX.revType]});
    for (let j=0; j<N; j++){ L[j] += rv[0][j]; R[j] += rv[1][j]; }
  }
  return {L, R, sr};
}

/* ---------------- Análise espectral e masterização ---------------- */
function bandLevels(r){
  const n = 4096, win = new Float32Array(n); for (let i=0; i<n; i++) win[i] = 0.5 - 0.5*Math.cos(TAU*i/n);
  const pow = new Float64Array(n/2), re = new Float32Array(n), im = new Float32Array(n), N = r.L.length;
  const hop = Math.max(n, Math.floor(N/200)); let frames = 0;
  for (let s=0; s+n<=N; s+=hop){
    for (let i=0; i<n; i++){ re[i] = (r.L[s+i] + r.R[s+i])*0.5*win[i]; im[i] = 0; }
    fft(re, im); for (let k=0; k<n/2; k++) pow[k] += re[k]*re[k] + im[k]*im[k]; frames++;
  }
  return BANDS.map(fc => {
    const lo = fc/Math.SQRT2, hi = fc*Math.SQRT2; let e = 0;
    for (let k=Math.max(1, Math.floor(lo/r.sr*n)); k<=Math.min(n/2-1, Math.ceil(hi/r.sr*n)); k++) e += pow[k];
    return 10*Math.log10(e/Math.max(1, frames) + 1e-20);
  });
}
function relLevels(lv){ const ref = (lv[4] + lv[5] + lv[6])/3; return lv.map(v => v - ref); }
function masterAssistant(r){
  const m = MIX.master, lv = relLevels(bandLevels(r)), tgt = PROFILES[m.profile], d = DESTINATIONS[m.dest];
  m.eq = lv.map((v, i) => clamp(Math.round((tgt[i] - v)*m.strength*2)/2, -6, 6));
  m.eq[0] = Math.min(m.eq[0], 3); // nunca empurrar demais o sub-grave
  const st = analyze(r), crest = st.peak - st.lufs;
  const dens = clamp((crest - 8)/10, 0, 1);
  m.mb = [{thr: st.lufs - 4 - 6*(1-dens), ratio: 1.5 + dens*1.5}, {thr: st.lufs - 2 - 6*(1-dens), ratio: 1.4 + dens*1.2}, {thr: st.lufs - 4 - 6*(1-dens), ratio: 1.5 + dens*1.3}];
  m.lufs = d.lufs; m.ceiling = d.tp;
  m.widthHigh = st.corr > 0.9 ? 1.25 : st.corr < 0.3 ? 0.9 : 1.1; m.widthLow = 0;
  m.excite = m.profile === 'Lo-fi quente' ? 0.05 : 0.15;
  return {before: st, levels: lv};
}
async function applyMastering(r){
  const m = MIX.master, sr = r.sr, N = r.L.length;
  const ctx = new OfflineAudioContext(2, N, sr), b = ctx.createBuffer(2, N, sr); b.copyToChannel(r.L, 0); b.copyToChannel(r.R, 1);
  const s = ctx.createBufferSource(); s.buffer = b; let node = s;
  const bq = (type, f, q, g) => { const x = ctx.createBiquadFilter(); x.type = type; x.frequency.value = Math.min(f, sr*0.45); if (q != null) x.Q.value = q; if (g != null) x.gain.value = g; return x; };
  const hp = bq('highpass', 22, 0.707); node.connect(hp); node = hp;
  if (m.eqOn) BANDS.forEach((f, i) => { if (!m.eq[i]) return; const x = i === 0 ? bq('lowshelf', 45, null, m.eq[i]) : i === BANDS.length-1 ? bq('highshelf', 12000, null, m.eq[i]) : bq('peaking', f, 1.2, m.eq[i]); node.connect(x); node = x; });
  if (m.mbOn){
    const sum = ctx.createGain();
    const lr4 = (type, f) => { const a = bq(type, f, 0.707), c = bq(type, f, 0.707); a.connect(c); return [a, c]; };
    const [l1a, l1b] = lr4('lowpass', m.xo[0]), [h1a, h1b] = lr4('highpass', m.xo[0]);
    const [l2a, l2b] = lr4('lowpass', m.xo[1]), [h2a, h2b] = lr4('highpass', m.xo[1]);
    node.connect(l1a); node.connect(h1a); h1b.connect(l2a); h1b.connect(h2a);
    [l1b, l2b, h2b].forEach((band, i) => {
      const c = ctx.createDynamicsCompressor(); c.threshold.value = m.mb[i].thr; c.ratio.value = m.mb[i].ratio; c.knee.value = 8;
      c.attack.value = [0.02, 0.01, 0.004][i]; c.release.value = [0.25, 0.15, 0.1][i];
      band.connect(c);
      if (i === 2 && m.excite > 0){ const ws = ctx.createWaveShaper(); ws.curve = satCurve('Fita', m.excite); ws.oversample = '4x'; c.connect(ws); ws.connect(sum); }
      else c.connect(sum);
    });
    node = sum;
  }
  node.connect(ctx.destination); s.start();
  const out = await ctx.startRendering(); let L = out.getChannelData(0).slice(), R = out.getChannelData(1).slice();
  // imagem estéreo por banda (graves mono, agudos mais largos)
  const a = Math.exp(-TAU*150/sr); let lp = 0;
  for (let i=0; i<N; i++){ const md = (L[i]+R[i])*0.5, sd = (L[i]-R[i])*0.5; lp = (1-a)*sd + a*lp; const s2 = lp*m.widthLow + (sd - lp)*m.widthHigh; L[i] = md + s2; R[i] = md - s2; }
  const res = {L, R, sr};
  normalizeLUFS(res, m.lufs, m.ceiling);
  const tp = truePeak(res.L, res.R), c = dbToGain(m.ceiling); if (tp > c){ const g = c/tp; for (let i=0; i<N; i++){ res.L[i] *= g; res.R[i] *= g; } }
  // corta silêncio final
  let last = N-1; while (last > 0 && Math.abs(res.L[last]) < 1e-4 && Math.abs(res.R[last]) < 1e-4) last--;
  res.L = res.L.subarray(0, last + Math.ceil(0.05*sr)); res.R = res.R.subarray(0, res.L.length);
  return res;
}

/* ---------------- Assistente de mixagem ---------------- */
async function mixAssistant(){
  const targets = {'voz': -18, 'sfx': -21, 'música': -25, 'ambiente': -30};
  const panSlots = [-0.35, 0.35, -0.6, 0.6, -0.2, 0.2]; let ps = 0; const report = [];
  for (const t of MIX.tracks){
    if (!t.clips.length) continue;
    const N = Math.ceil((mixLength() + 0.5)*MIX_SR), d = trackDry(t, MIX_SR, N), lu = measureLUFS(d.L, d.R, MIX_SR);
    if (!isFinite(lu)) continue;
    t.vol = clamp(Math.round((targets[t.role] - lu)*2)/2, -36, 12);
    t.hp = {'voz': 85, 'música': 30, 'sfx': 40, 'ambiente': 60}[t.role];
    if (t.role === 'voz'){ t.pan = 0; t.comp = true; t.thr = -22; t.ratio = 3; t.mid = 1.5; t.midF = 3000; t.send = 0.06; }
    else if (t.role === 'música'){ t.pan = 0; t.duck = true; t.mid = MIX.tracks.some(x => x.role === 'voz') ? -2 : 0; t.midF = 2500; t.send = 0.05; }
    else if (t.role === 'ambiente'){ t.pan = 0; t.duck = true; t.send = 0.15; }
    else { t.pan = panSlots[ps++ % panSlots.length]*0.6; t.send = 0.12; }
    report.push(`${t.name}: ${lu.toFixed(1)} → ${targets[t.role]} LUFS`);
  }
  return report;
}

/* ---------------- UI ---------------- */
let mixRendered = null, mixMastered = null, mixAB = 'master', mixSrc = null, mixT0 = 0, mixRaf = 0, mixPlayFrom = 0, lastReport = null;
function mixDirty(){ mixRendered = mixMastered = null; }
function renderMixerUI(){ renderBin(); renderStrips(); drawTimeline(); renderMasterPanel(); }
function renderBin(){
  const box = $('mxBin'); box.innerHTML = '';
  if (!CLIPS.size){ box.innerHTML = '<div class="empty">Sem clipes ainda. Importe áudio ou envie sons do SFX, Voz, Música ou Vídeo.</div>'; return; }
  [...CLIPS.values()].reverse().forEach(c => {
    const it = el('div', 'item', `<span class="nm" title="${esc(c.name)}">${esc(c.name)}</span><span class="cat">${esc(c.kind)} · ${clipDur(c).toFixed(1)}s</span><button title="Ouvir">▶</button><button title="Adicionar à faixa selecionada no cursor">＋</button><button title="Baixar WAV">⬇</button><button title="Remover">✕</button>`);
    const [bp, ba, bd, bx] = it.querySelectorAll('button');
    bp.onclick = e => { e.stopPropagation(); previewPCM(c.L, c.R, c.sr); };
    ba.onclick = e => { e.stopPropagation(); addClipToMix(c.id); };
    bd.onclick = e => { e.stopPropagation(); download(clipToWavBlob(c), slug(c.name) + '.wav'); };
    bx.onclick = e => { e.stopPropagation(); CLIPS.delete(c.id); MIX.tracks.forEach(t => t.clips = t.clips.filter(k => k.clipId !== c.id)); mixDirty(); renderMixerUI(); };
    it.onclick = () => addClipToMix(c.id);
    box.appendChild(it);
  });
}
function roleFromKind(kind){ return /voz|fala|narra/i.test(kind) ? 'voz' : /m[uú]sica|stem/i.test(kind) ? 'música' : /ambi/i.test(kind) ? 'ambiente' : 'sfx'; }
function addClipToMix(id, start, trackName){
  const c = CLIPS.get(id); if (!c) return;
  let t;
  if (trackName){ t = MIX.tracks.find(x => x.name === trackName); if (!t){ t = newTrack(trackName, roleFromKind(c.kind)); MIX.tracks.push(t); } }
  else { t = MIX.tracks[MIX.selTrack]; if (!t){ t = newTrack(c.name.slice(0, 24), roleFromKind(c.kind)); MIX.tracks.push(t); MIX.selTrack = MIX.tracks.length-1; } }
  t.clips.push({clipId: id, start: start ?? MIX.playhead, gain: 0, fadeIn: 0, fadeOut: 0.01});
  mixDirty(); if (curModule === 'mix') renderMixerUI();
}
function renderStrips(){
  const box = $('mxStrips'); box.innerHTML = '';
  MIX.tracks.forEach((t, i) => {
    const s = el('div', 'strip-ch' + (i === MIX.selTrack ? ' cur' : ''));
    const head = el('div', 'row');
    const nm = el('input'); nm.type = 'text'; nm.value = t.name; nm.className = 'grow'; nm.onchange = () => { t.name = nm.value.slice(0,30); drawTimeline(); };
    const role = el('select'); ROLES.forEach(r => { const o = el('option', null, r); o.value = r; role.appendChild(o); }); role.value = t.role; role.onchange = () => { t.role = role.value; mixDirty(); };
    const mb = el('button', 'btn sm' + (t.mute ? ' on' : ''), 'M'), sb = el('button', 'btn sm' + (t.solo ? ' on' : ''), 'S'), xb = el('button', 'btn sm', '✕');
    mb.onclick = e => { e.stopPropagation(); t.mute = !t.mute; mixDirty(); renderStrips(); };
    sb.onclick = e => { e.stopPropagation(); t.solo = !t.solo; mixDirty(); renderStrips(); };
    xb.onclick = e => { e.stopPropagation(); if (confirm(`Excluir a faixa "${t.name}"?`)){ MIX.tracks.splice(i, 1); MIX.selTrack = 0; mixDirty(); renderMixerUI(); } };
    head.append(nm, role, mb, sb, xb); s.appendChild(head);
    const defs = [P('vol','Volume',-48,12,0,'lin','dB'), P('pan','Pan',-1,1,0,'lin','pan'), P('hp','Passa-alta',20,500,30,'log','Hz'),
      P('low','Graves',-12,12,0,'lin','dB'), P('mid','Médios',-12,12,0,'lin','dB'), P('midF','Freq. médios',200,8000,1500,'log','Hz'),
      P('high','Agudos',-12,12,0,'lin','dB'), P('thr','Comp. limiar',-50,0,-20,'lin','dB'), P('ratio','Comp. razão',1,10,3,'lin','ratio'), P('send','Envio reverb',0,1,0.1,'lin','%')];
    defs.forEach(d => s.appendChild(control(d, t, () => mixDirty(), () => { mixDirty(); })));
    const opts = el('div', 'row');
    const cc = el('label', 'chk', `<input type="checkbox" ${t.comp ? 'checked' : ''}> Compressor`); cc.querySelector('input').onchange = e => { t.comp = e.target.checked; mixDirty(); };
    const dk = el('label', 'chk', `<input type="checkbox" ${t.duck ? 'checked' : ''}> Abaixar sob a voz`); dk.querySelector('input').onchange = e => { t.duck = e.target.checked; mixDirty(); };
    opts.append(cc, dk); s.appendChild(opts);
    s.onclick = () => { if (MIX.selTrack !== i){ MIX.selTrack = i; renderStrips(); drawTimeline(); } };
    box.appendChild(s);
  });
  if (!MIX.tracks.length) box.innerHTML = '<div class="empty">Nenhuma faixa. Clique num clipe do banco para criar uma.</div>';
}
const ROW_H = 54, HEAD_W = 0;
function drawTimeline(){
  const cv = $('mxTl'), wrap = $('mxTlWrap'), dur = Math.max(10, mixLength() + 4);
  const w = Math.max(wrap.clientWidth, Math.ceil(dur*MIX.pps)), h = Math.max(ROW_H*2, MIX.tracks.length*ROW_H + 20);
  cv.style.width = w + 'px'; cv.style.height = h + 'px';
  const {ctx, dpr} = fit(cv); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
  ctx.font = '10px system-ui'; ctx.fillStyle = cssv('--muted'); ctx.strokeStyle = cssv('--grid');
  const step = MIX.pps > 120 ? 0.5 : MIX.pps > 40 ? 1 : MIX.pps > 15 ? 5 : 10;
  for (let t=0; t<dur; t+=step){ const x = t*MIX.pps; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); ctx.fillText(t.toFixed(step < 1 ? 1 : 0) + 's', x+2, 10); }
  MIX.tracks.forEach((t, i) => {
    const y = 16 + i*ROW_H;
    ctx.fillStyle = i === MIX.selTrack ? 'rgba(196,213,133,.08)' : 'rgba(255,255,255,.02)'; ctx.fillRect(0, y, w, ROW_H-4);
    t.clips.forEach(k => {
      const c = CLIPS.get(k.clipId); if (!c) return;
      const x = k.start*MIX.pps, cw = Math.max(3, clipDur(c)*MIX.pps), sel = MIX.selClip === k;
      ctx.fillStyle = {'voz':'#3d5a6e','música':'#5b4a72','sfx':'#4b5e2f','ambiente':'#365a50'}[t.role] || '#4b5e2f';
      ctx.fillRect(x, y+2, cw, ROW_H-8);
      if (sel){ ctx.strokeStyle = cssv('--accent2'); ctx.lineWidth = 2; ctx.strokeRect(x+1, y+3, cw-2, ROW_H-10); ctx.lineWidth = 1; ctx.strokeStyle = cssv('--grid'); }
      ctx.fillStyle = 'rgba(232,239,217,.8)'; const mid = y + ROW_H/2 - 2, n = c.L.length, spp = n/cw;
      for (let px=0; px<cw; px+=1){ let pk = 0; const a = Math.floor(px*spp), b2 = Math.min(n, a + Math.ceil(spp)); for (let j=a; j<b2; j+=Math.max(1, (spp/32)|0)) pk = Math.max(pk, Math.abs(c.L[j])); ctx.fillRect(x+px, mid - pk*18, 1, pk*36 + 0.5); }
      ctx.fillStyle = '#fff'; ctx.fillText(c.name.slice(0, Math.max(0, Math.floor(cw/6))), x+4, y+13);
    });
    ctx.fillStyle = cssv('--muted'); ctx.fillText(t.name, 4, y + ROW_H - 8);
  });
  const px = MIX.playhead*MIX.pps; ctx.fillStyle = cssv('--accent2'); ctx.fillRect(px-1, 0, 2, h);
}
let drag = null;
function tlHit(e){
  const r = $('mxTl').getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, ti = Math.floor((y - 16)/ROW_H), t = MIX.tracks[ti];
  let clip = null;
  if (t) for (const k of t.clips){ const c = CLIPS.get(k.clipId); if (c && x >= k.start*MIX.pps && x <= (k.start + clipDur(c))*MIX.pps) clip = k; }
  return {x, ti, t, clip};
}
$('mxTl').addEventListener('pointerdown', e => {
  const h = tlHit(e); if (h.t) MIX.selTrack = h.ti;
  if (h.clip){ MIX.selClip = h.clip; drag = {k: h.clip, dx: h.x - h.clip.start*MIX.pps, ti: h.ti}; $('mxTl').setPointerCapture(e.pointerId); }
  else { MIX.selClip = null; MIX.playhead = Math.max(0, h.x/MIX.pps); }
  renderStrips(); drawTimeline(); renderClipPanel();
});
$('mxTl').addEventListener('pointermove', e => {
  if (!drag) return; const h = tlHit(e);
  drag.k.start = Math.max(0, Math.round((h.x - drag.dx)/MIX.pps*100)/100);
  if (h.t && h.ti !== drag.ti){ MIX.tracks[drag.ti].clips = MIX.tracks[drag.ti].clips.filter(k => k !== drag.k); h.t.clips.push(drag.k); drag.ti = h.ti; MIX.selTrack = h.ti; }
  mixDirty(); drawTimeline();
});
$('mxTl').addEventListener('pointerup', () => { if (drag){ drag = null; renderStrips(); renderClipPanel(); } });
function renderClipPanel(){
  const box = $('mxClip'); box.innerHTML = ''; const k = MIX.selClip; if (!k) return;
  const c = CLIPS.get(k.clipId); if (!c) return;
  box.appendChild(el('div', 'hint', `Clipe selecionado: <b>${esc(c.name)}</b>`));
  [P('start','Início',0,600,0,'sq','s'), P('gain','Ganho',-36,12,0,'lin','dB'), P('fadeIn','Fade in',0,10,0,'sq','s'), P('fadeOut','Fade out',0,10,0,'sq','s')]
    .forEach(d => box.appendChild(control(d, k, () => { mixDirty(); drawTimeline(); }, () => { mixDirty(); drawTimeline(); })));
  const del = el('button', 'btn sm', 'Remover clipe da faixa'); del.onclick = () => { MIX.tracks.forEach(t => t.clips = t.clips.filter(x => x !== k)); MIX.selClip = null; mixDirty(); renderMixerUI(); renderClipPanel(); };
  box.appendChild(del);
}
function renderMasterPanel(){
  const m = MIX.master, box = $('mxMaster'); box.innerHTML = '';
  const sel = (label, obj, key, opts, onc) => { const row = el('div', 'ctl'); row.appendChild(el('label', null, label)); const s = el('select'); opts.forEach(o => { const op = el('option', null, esc(o)); op.value = o; s.appendChild(op); }); s.value = obj[key]; s.onchange = () => { obj[key] = s.value; if (onc) onc(); mixDirty(); }; row.appendChild(s); return row; };
  box.appendChild(sel('Destino', m, 'dest', Object.keys(DESTINATIONS), () => { const d = DESTINATIONS[m.dest]; m.lufs = d.lufs; m.ceiling = d.tp; renderMasterPanel(); }));
  box.appendChild(sel('Perfil tonal', m, 'profile', Object.keys(PROFILES)));
  box.appendChild(sel('Reverb das faixas', MIX, 'revType', Object.keys(REV_TYPES)));
  const live = () => { mixMastered = null; }, cm = () => { mixMastered = null; };
  [P('strength','Intensidade da correção',0,1,0.6,'lin','%'), P('lufs','Loudness alvo',-30,-6,-14,'lin','LUFS'), P('ceiling','Teto true peak',-3,0,-1,'lin','dB'),
   P('excite','Excitador de agudos',0,1,0.15,'lin','%'), P('widthLow','Largura graves',0,1.5,0,'lin','%'), P('widthHigh','Largura agudos',0,2,1.15,'lin','%')]
    .forEach(d => box.appendChild(control(d, m, live, cm)));
  const eqBox = el('details', 'mg'); eqBox.innerHTML = `<summary>EQ de equilíbrio tonal <span class="st">${m.eqOn ? 'ligado' : 'desligado'}</span></summary>`;
  const eqOn = el('label', 'chk', `<input type="checkbox" ${m.eqOn ? 'checked' : ''}> Ligado`); eqOn.querySelector('input').onchange = e => { m.eqOn = e.target.checked; cm(); }; eqBox.appendChild(eqOn);
  BANDS.forEach((f, i) => { const o = {v: m.eq[i]}; eqBox.appendChild(control(P('v', fmtHz(f), -12, 12, 0, 'lin', 'dB'), o, () => { m.eq[i] = o.v; live(); }, cm)); });
  box.appendChild(eqBox);
  const mbBox = el('details', 'mg'); mbBox.innerHTML = `<summary>Compressor multibanda <span class="st">${m.mbOn ? 'ligado' : 'desligado'}</span></summary>`;
  const mbOn = el('label', 'chk', `<input type="checkbox" ${m.mbOn ? 'checked' : ''}> Ligado`); mbOn.querySelector('input').onchange = e => { m.mbOn = e.target.checked; cm(); }; mbBox.appendChild(mbOn);
  ['Graves', 'Médios', 'Agudos'].forEach((n, i) => {
    mbBox.appendChild(control(P('thr', n + ': limiar', -50, 0, -20, 'lin', 'dB'), m.mb[i], live, cm));
    mbBox.appendChild(control(P('ratio', n + ': razão', 1, 8, 2, 'lin', 'ratio'), m.mb[i], live, cm));
  });
  box.appendChild(mbBox);
}
function drawSpectrumCompare(before, after){
  const {ctx, w, h, dpr} = fit($('mxSpec')); ctx.clearRect(0, 0, w, h);
  const tgt = PROFILES[MIX.master.profile], all = [...(before || []), ...(after || []), ...tgt], lo = Math.min(...all) - 3, hi = Math.max(...all) + 3;
  const X = i => (i + 0.5)/BANDS.length*w, Y = v => h - (v - lo)/(hi - lo)*(h - 14*dpr) - 4*dpr;
  ctx.font = `${9*dpr}px system-ui`; ctx.fillStyle = cssv('--muted');
  BANDS.forEach((f, i) => ctx.fillText(f >= 1000 ? (f/1000) + 'k' : String(f), X(i) - 8*dpr, h - 2*dpr));
  const line = (arr, col, dash) => { if (!arr) return; ctx.strokeStyle = col; ctx.lineWidth = 2*dpr; ctx.setLineDash(dash ? [4*dpr, 4*dpr] : []); ctx.beginPath(); arr.forEach((v, i) => i ? ctx.lineTo(X(i), Y(v)) : ctx.moveTo(X(i), Y(v))); ctx.stroke(); ctx.setLineDash([]); };
  line(tgt, cssv('--muted'), true); line(before, cssv('--hot')); line(after, cssv('--accent'));
}
async function ensureMixRendered(){
  if (!mixRendered){ setStatus('Mixando…'); mixRendered = await renderMix(); }
  if (MIX.masterOn && !mixMastered){ setStatus('Masterizando…'); mixMastered = await applyMastering(mixRendered); }
  setStatus('Pronto');
}
function loudMatched(r, target){ const c = {L: r.L.slice(), R: r.R.slice(), sr: r.sr}; const lu = measureLUFS(c.L, c.R, c.sr); if (isFinite(lu)){ const g = dbToGain(target - lu); for (let i=0; i<c.L.length; i++){ c.L[i] *= g; c.R[i] *= g; } } return c; }
async function mixPlay(){
  if (!MIX.tracks.some(t => t.clips.length)){ toast('Adicione clipes às faixas'); return; }
  await ensureMixRendered(); mixStop();
  let r = MIX.masterOn && mixAB === 'master' ? mixMastered : mixRendered;
  if (MIX.masterOn && mixAB === 'mix' && $('mxMatch').checked) r = loudMatched(mixRendered, MIX.master.lufs);
  const c = ensureAC(), b = c.createBuffer(2, r.L.length, r.sr); b.copyToChannel(r.L, 0); b.copyToChannel(r.R, 1);
  const s = c.createBufferSource(); s.buffer = b; s.connect(monGain);
  const off = Math.min(MIX.playhead, b.duration - 0.01); s.start(0, Math.max(0, off)); mixSrc = s; mixT0 = c.currentTime; mixPlayFrom = off;
  s.onended = () => { if (mixSrc === s) mixSrc = null; };
  const tick = () => { if (!mixSrc) return; MIX.playhead = mixPlayFrom + (ac.currentTime - mixT0); drawTimeline(); mixRaf = requestAnimationFrame(tick); }; tick();
  if (typeof onMixPlay === 'function') onMixPlay(off);
}
function mixStop(){ if (mixSrc){ const s = mixSrc; mixSrc = null; try { s.stop(); } catch(e){} } cancelAnimationFrame(mixRaf); if (typeof onMixStop === 'function') onMixStop(); }

$('mxPlay').onclick = mixPlay;
$('mxStop').onclick = () => { mixStop(); drawTimeline(); };
$('mxHome').onclick = () => { MIX.playhead = 0; drawTimeline(); };
$('mxZoom').oninput = () => { MIX.pps = +$('mxZoom').value; drawTimeline(); };
$('mxAddTrack').onclick = () => { MIX.tracks.push(newTrack('Faixa ' + (MIX.tracks.length+1))); MIX.selTrack = MIX.tracks.length-1; renderMixerUI(); };
$('mxImport').onclick = () => $('mxFiles').click();
$('mxFiles').onchange = async e => {
  const fs = [...e.target.files]; e.target.value = '';
  for (const f of fs){ try { const id = await decodeToClip(f.name.replace(/\.[^.]+$/, ''), await f.arrayBuffer(), 'importado'); addClipToMix(id, MIX.playhead, f.name.replace(/\.[^.]+$/, '').slice(0, 24)); } catch(err){ toast('Não consegui ler ' + f.name); } }
  renderMixerUI();
};
$('mxAB').onclick = () => { mixAB = mixAB === 'master' ? 'mix' : 'master'; $('mxAB').textContent = mixAB === 'master' ? 'Ouvindo: MASTER' : 'Ouvindo: MIX ORIGINAL'; $('mxAB').classList.toggle('on', mixAB === 'master'); if (mixSrc) mixPlay(); };
$('mxMasterOn').onchange = () => { MIX.masterOn = $('mxMasterOn').checked; };
$('mxAutoMix').onclick = () => busy('Assistente de mixagem…', async () => { const rep = await mixAssistant(); mixDirty(); renderStrips(); $('mxReport').innerHTML = rep.length ? '<b>Mixagem ajustada:</b><br>' + rep.map(esc).join('<br>') : 'Nada para ajustar.'; toast('Mixagem balanceada'); });
$('mxAutoMaster').onclick = () => busy('Assistente de master…', async () => {
  mixRendered = await renderMix(); const {before, levels} = masterAssistant(mixRendered);
  mixMastered = await applyMastering(mixRendered); const after = analyze(mixMastered), lvA = relLevels(bandLevels(mixMastered));
  renderMasterPanel(); drawSpectrumCompare(levels, lvA);
  lastReport = {before, after};
  const f = v => isFinite(v) ? v.toFixed(1) : '−∞';
  $('mxReport').innerHTML = `<b>Master pronto</b> (${esc(MIX.master.dest)})<br>Loudness: ${f(before.lufs)} → <b>${f(after.lufs)} LUFS</b><br>True peak: ${f(before.tp)} → <b>${f(after.tp)} dBTP</b><br>Correlação: ${before.corr.toFixed(2)} → ${after.corr.toFixed(2)}<br>EQ aplicada: ${MIX.master.eq.map((g, i) => g ? `${BANDS[i] >= 1000 ? BANDS[i]/1000 + 'k' : BANDS[i]} ${g > 0 ? '+' : ''}${g}` : '').filter(Boolean).join(', ') || 'nenhuma'}`;
  toast('Masterização aplicada');
});
$('mxExport').onclick = () => busy('Exportando mix…', async () => { await ensureMixRendered(); const r = MIX.masterOn ? mixMastered : mixRendered; download(new Blob([encodeWav(r, +$('exBits').value, false)], {type:'audio/wav'}), 'nexi-mix.wav'); });
$('mxStems').onclick = () => busy('Exportando stems…', async () => {
  const files = []; for (const t of MIX.tracks){ if (!t.clips.length) continue; const r = await renderMix({only: t, noDuck: true}); files.push({name: slug(t.name) + '.wav', data: encodeWav(r, 24, false)}); }
  download(makeZip(files), 'nexi-mix-stems.zip');
});
$('mxToClip').onclick = () => busy('Renderizando…', async () => { await ensureMixRendered(); const r = MIX.masterOn ? mixMastered : mixRendered; addClip('Mixdown ' + new Date().toLocaleTimeString('pt-BR'), r, 'mixdown'); renderBin(); toast('Mixdown adicionado ao banco'); });
document.addEventListener('keydown', e => {
  if (curModule !== 'mix' || e.target.matches('input, textarea, select')) return;
  if (e.code === 'Space'){ e.preventDefault(); mixSrc ? mixStop() : mixPlay(); }
  if ((e.key === 'Delete' || e.key === 'Backspace') && MIX.selClip){ MIX.tracks.forEach(t => t.clips = t.clips.filter(x => x !== MIX.selClip)); MIX.selClip = null; mixDirty(); renderMixerUI(); renderClipPanel(); }
});
clipListeners.push(() => { if (curModule === 'mix') renderBin(); });
MODULE_SHOW.mix = () => { renderMixerUI(); renderClipPanel(); };
window.addEventListener('resize', () => { if (curModule === 'mix') drawTimeline(); });
