"use strict";
/* ======================================================================
   App: render, reprodução, visualização, teclado/MIDI, exportação
   ====================================================================== */
const PREVIEW_SR = 48000;
let ac = null, monGain = null, current = null, curBuf = null, stats = null;
function ensureAC(){
  if (!ac){ ac = new (window.AudioContext || window.webkitAudioContext)(); monGain = ac.createGain(); monGain.gain.value = +$('monVol').value; monGain.connect(ac.destination); }
  if (ac.state === 'suspended') ac.resume();
  return ac;
}
function setStatus(t){ $('status').textContent = t; }

/* ---------------- Render ---------------- */
let renderTok = 0, renderTimer = 0, wantPlay = false;
function scheduleRender(play){ wantPlay = wantPlay || play; clearTimeout(renderTimer); renderTimer = setTimeout(doRender, play ? 20 : 90); }
async function doRender(){
  const tok = ++renderTok, play = wantPlay; wantPlay = false;
  setStatus('Renderizando…');
  const t0 = performance.now();
  try {
    const r = await renderSound(S, PREVIEW_SR);
    if (tok !== renderTok) return;
    current = r; stats = analyze(r); curBuf = null;
    setStatus(`Render: ${Math.round(performance.now() - t0)} ms`);
    drawAll(); renderMeters();
    if (play && $('cAuto').checked) playMain();
  } catch(e){ console.error(e); setStatus('Erro no render'); }
}
function toBuffer(r){
  const c = ensureAC(), b = c.createBuffer(2, r.L.length, r.sr);
  b.copyToChannel(r.L, 0); b.copyToChannel(r.R, 1); return b;
}

/* ---------------- Reprodução ---------------- */
let mainSrc = null, playT0 = 0, playDur = 0, raf = 0;
function playMain(){
  if (!current) return;
  const c = ensureAC(); stopMain();
  if (!curBuf) curBuf = toBuffer(current);
  const s = c.createBufferSource(); s.buffer = curBuf; s.loop = $('cLoop').checked; s.connect(monGain);
  s.onended = () => { if (mainSrc === s){ mainSrc = null; drawWave(); } };
  s.start(); mainSrc = s; playT0 = c.currentTime; playDur = curBuf.duration;
  cancelAnimationFrame(raf); tick();
}
function stopMain(){ if (mainSrc){ const s = mainSrc; mainSrc = null; try { s.stop(); } catch(e){} } drawWave(); }
function tick(){
  if (!mainSrc) return;
  let pos = (ac.currentTime - playT0)/playDur; if (mainSrc.loop) pos %= 1;
  drawWave(pos); if (pos <= 1) raf = requestAnimationFrame(tick);
}
async function auditionLayer(i){
  const r = await renderSound(S, PREVIEW_SR, {only: i}); const c = ensureAC(); stopMain();
  const s = c.createBufferSource(); s.buffer = toBuffer(r); s.connect(monGain); s.start(); mainSrc = s; s.onended = () => { if (mainSrc === s) mainSrc = null; };
}

/* ---------------- Visualização ---------------- */
function fit(cv){
  const dpr = window.devicePixelRatio || 1, r = cv.getBoundingClientRect();
  const w = Math.max(1, Math.round(r.width*dpr)), h = Math.max(1, Math.round(r.height*dpr));
  if (cv.width !== w || cv.height !== h){ cv.width = w; cv.height = h; }
  return {ctx: cv.getContext('2d'), w, h, dpr};
}
const cssv = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
let viewMode = 'wave';
function drawAll(){ drawWave(); if (viewMode === 'spec') drawSpec(); }
function drawGrid(ctx, w, h, dpr, dur){
  ctx.strokeStyle = cssv('--grid'); ctx.fillStyle = cssv('--muted'); ctx.lineWidth = 1; ctx.font = `${10*dpr}px system-ui`;
  const steps = [0.01,0.025,0.05,0.1,0.25,0.5,1,2,5,10]; const step = steps.find(s => dur/s <= 10) || 10;
  for (let t = step; t < dur; t += step){ const x = t/dur*w; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); ctx.fillText(fmtS(t), x+3, h-4*dpr); }
}
function drawWave(pos = -1){
  if (viewMode !== 'wave') return drawSpecHead(pos);
  const {ctx, w, h, dpr} = fit($('cvWave')); ctx.clearRect(0, 0, w, h);
  if (!current) return;
  const N = current.L.length, dur = N/current.sr, lane = h/2;
  drawGrid(ctx, w, h, dpr, dur);
  [[current.L, cssv('--wave'), lane/2], [current.R, cssv('--wave2'), lane*1.5]].forEach(([d, col, mid]) => {
    ctx.strokeStyle = cssv('--grid'); ctx.beginPath(); ctx.moveTo(0, mid); ctx.lineTo(w, mid); ctx.stroke();
    ctx.fillStyle = col; const spp = N/w;
    for (let x=0; x<w; x++){
      let lo = 1, hi = -1; const a = Math.floor(x*spp), b = Math.min(N, Math.floor((x+1)*spp) + 1);
      for (let i=a; i<b; i++){ const v = d[i]; if (v < lo) lo = v; if (v > hi) hi = v; }
      if (hi < lo) continue;
      ctx.fillRect(x, mid - hi*lane*0.46, 1, Math.max(1, (hi-lo)*lane*0.46));
    }
  });
  ctx.fillStyle = cssv('--muted'); ctx.fillText('E', 4*dpr, 12*dpr); ctx.fillText('D', 4*dpr, lane + 12*dpr);
  if (pos >= 0 && pos <= 1){ ctx.fillStyle = cssv('--accent2'); ctx.fillRect(pos*w - dpr, 0, 2*dpr, h); }
}
function fft(re, im){
  const n = re.length;
  for (let i=1, j=0; i<n; i++){ let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j){ [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
  for (let len=2; len<=n; len<<=1){
    const ang = -TAU/len, wr = Math.cos(ang), wi = Math.sin(ang), hl = len >> 1;
    for (let i=0; i<n; i+=len){ let cr = 1, ci = 0;
      for (let j=0; j<hl; j++){ const a = i+j, b = a+hl, tr = re[b]*cr - im[b]*ci, ti = re[b]*ci + im[b]*cr;
        re[b] = re[a]-tr; im[b] = im[a]-ti; re[a] += tr; im[a] += ti; const nc = cr*wr - ci*wi; ci = cr*wi + ci*wr; cr = nc; } }
  }
}
const SPEC_LUT = (() => { const st = [[0,[10,12,9]],[0.25,[43,31,74]],[0.5,[138,43,107]],[0.75,[232,116,59]],[1,[251,233,160]]], lut = [];
  for (let i=0; i<256; i++){ const t = i/255; let k = 0; while (k < st.length-2 && t > st[k+1][0]) k++; const [t0, c0] = st[k], [t1, c1] = st[k+1], f = (t-t0)/(t1-t0); lut.push(c0.map((v, j) => Math.round(v + (c1[j]-v)*f))); }
  return lut; })();
let specImg = null;
function drawSpec(){
  const {ctx, w, h} = fit($('cvSpec')); if (!current) return;
  const sr = current.sr, N = current.L.length, n = 2048, win = new Float32Array(n);
  for (let i=0; i<n; i++) win[i] = 0.5 - 0.5*Math.cos(TAU*i/n);
  const cols = Math.min(w, 900), img = ctx.createImageData(cols, h), re = new Float32Array(n), im = new Float32Array(n);
  const rowBin = []; for (let y=0; y<h; y++){ const f = 20*Math.pow((sr/2)/20, 1 - y/h); rowBin.push(f/(sr/2)*(n/2)); }
  for (let x=0; x<cols; x++){
    const c = Math.floor(x/cols*N) - n/2;
    for (let i=0; i<n; i++){ const j = c + i; re[i] = j >= 0 && j < N ? (current.L[j] + current.R[j])*0.5*win[i] : 0; im[i] = 0; }
    fft(re, im);
    for (let y=0; y<h; y++){
      const b = rowBin[y], b0 = Math.floor(b), f = b - b0;
      const m0 = Math.hypot(re[b0], im[b0]), m1 = Math.hypot(re[b0+1] || 0, im[b0+1] || 0);
      const db = 20*Math.log10((m0*(1-f) + m1*f)/(n/4) + 1e-9);
      const col = SPEC_LUT[clamp(Math.round((db + 100)/100*255), 0, 255)], o = (y*cols + x)*4;
      img.data[o] = col[0]; img.data[o+1] = col[1]; img.data[o+2] = col[2]; img.data[o+3] = 255;
    }
  }
  const off = document.createElement('canvas'); off.width = cols; off.height = h; off.getContext('2d').putImageData(img, 0, 0);
  specImg = off; drawSpecHead(-1);
}
function drawSpecHead(pos){
  if (viewMode !== 'spec' || !specImg) return;
  const {ctx, w, h, dpr} = fit($('cvSpec'));
  ctx.imageSmoothingEnabled = true; ctx.drawImage(specImg, 0, 0, w, h);
  ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.font = `${10*dpr}px system-ui`;
  [100, 1000, 10000].forEach(f => { const y = h*(1 - Math.log(f/20)/Math.log((current.sr/2)/20)); ctx.fillText(fmtHz(f), 4*dpr, y - 2*dpr); ctx.fillRect(0, y, 6*dpr, dpr); });
  if (pos >= 0 && pos <= 1){ ctx.fillStyle = cssv('--accent2'); ctx.fillRect(pos*w - dpr, 0, 2*dpr, h); }
}
function renderMeters(){
  if (!stats) return;
  const s = stats, m = S.master, f = v => isFinite(v) ? v.toFixed(1) : '−∞';
  const items = [['Duração', fmtS(s.dur)], ['Pico', f(s.peak)+' dB'], ['True peak', f(s.tp)+' dBTP', s.tp > m.ceiling + 0.05],
    ['Loudness', f(s.lufs)+' LUFS'], ['Correlação', s.corr.toFixed(2), s.corr < 0], ['Camadas', S.layers.filter(l => l.on).length + '/' + S.layers.length]];
  $('meters').innerHTML = items.map(([k, v, w]) => `<div class="meter${w ? ' warn' : ''}"><b>${v}</b><span>${k}</span></div>`).join('');
  updateExInfo();
}
function updateExInfo(){
  if (!current) return;
  const sr = +$('exRate').value, bits = +$('exBits').value, ch = +$('exCh').value, bytes = 44 + current.L.length/current.sr*sr*ch*bits/8;
  $('exInfo').textContent = `Arquivo estimado: ${bytes > 1048576 ? (bytes/1048576).toFixed(2)+' MB' : (bytes/1024).toFixed(0)+' KB'} · ${sr} Hz · ${bits === 32 ? '32 float' : bits+' bits'} · ${ch === 2 ? 'estéreo' : 'mono'}`;
}

/* ---------------- Teclado e MIDI ---------------- */
const KEYMAP = {a:0, w:1, s:2, e:3, d:4, f:5, t:6, g:7, y:8, h:9, u:10, j:11, k:12, o:13, l:14, p:15};
let octave = 0; const voices = new Map();
function noteOn(semi, vel = 0.85){
  if (!current) return;
  const c = ensureAC(); if (!curBuf) curBuf = toBuffer(current);
  noteOff(semi, true);
  const s = c.createBufferSource(), g = c.createGain();
  s.buffer = curBuf; s.playbackRate.value = Math.pow(2, semi/12); g.gain.value = vel;
  s.connect(g); g.connect(monGain); s.start(); voices.set(semi, {s, g});
  s.onended = () => { if (voices.get(semi)?.s === s) voices.delete(semi); };
  keyVisual(semi, true);
}
function noteOff(semi, hard){
  const v = voices.get(semi); keyVisual(semi, false); if (!v) return;
  const sustained = S.layers.some(l => l.on && l.env.s > 0.05);
  if (sustained || hard){ const t = ac.currentTime; v.g.gain.setTargetAtTime(0, t, hard ? 0.005 : 0.08); try { v.s.stop(t + (hard ? 0.03 : 0.6)); } catch(e){} }
  voices.delete(semi);
}
function buildKeyboard(){
  const kb = $('kbd'); kb.innerHTML = '';
  const whites = [], first = -12 + octave*12;
  for (let s = first; s <= first + 24; s++){
    const pc = ((s % 12) + 12) % 12, black = [1,3,6,8,10].includes(pc);
    if (!black){ const k = el('div', 'wk', pc === 0 ? 'C' + (4 + Math.floor(s/12)) : ''); k.dataset.s = s; kb.appendChild(k); whites.push(k); }
  }
  const ww = 100/whites.length; let wi = 0;
  for (let s = first; s <= first + 24; s++){
    const pc = ((s % 12) + 12) % 12;
    if ([1,3,6,8,10].includes(pc)){ const k = el('div', 'bk'); k.dataset.s = s; k.style.left = `calc(${wi*ww - ww*0.3}%)`; k.style.width = `${ww*0.6}%`; kb.appendChild(k); }
    else wi++;
  }
  $('octLbl').textContent = 'Dó central: C' + (4 + octave) + (octave ? ` (${octave > 0 ? '+' : ''}${octave} oit)` : '');
}
function keyVisual(semi, on){ const k = $('kbd').querySelector(`[data-s="${semi}"]`); if (k) k.classList.toggle('dn', on); }
let ptrNote = new Map();
$('kbd').addEventListener('pointerdown', e => { const k = e.target.closest('[data-s]'); if (!k) return; e.preventDefault(); $('kbd').setPointerCapture(e.pointerId); const s = +k.dataset.s; ptrNote.set(e.pointerId, s); noteOn(s, 0.6 + 0.4*clamp(e.offsetY/(k.clientHeight || 1), 0, 1)); });
$('kbd').addEventListener('pointermove', e => {
  if (!ptrNote.has(e.pointerId)) return; const k = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-s]'); if (!k) return;
  const s = +k.dataset.s, old = ptrNote.get(e.pointerId); if (s !== old){ noteOff(old); ptrNote.set(e.pointerId, s); noteOn(s); }
});
const ptrUp = e => { if (ptrNote.has(e.pointerId)){ noteOff(ptrNote.get(e.pointerId)); ptrNote.delete(e.pointerId); } };
$('kbd').addEventListener('pointerup', ptrUp); $('kbd').addEventListener('pointercancel', ptrUp);
$('octDn').onclick = () => { octave = Math.max(-3, octave-1); buildKeyboard(); };
$('octUp').onclick = () => { octave = Math.min(3, octave+1); buildKeyboard(); };
$('bMidi').onclick = async () => {
  if (!navigator.requestMIDIAccess){ toast('Este navegador não suporta Web MIDI'); return; }
  try {
    const midi = await navigator.requestMIDIAccess(); let n = 0;
    const bind = inp => { inp.onmidimessage = ev => { const [st, note, vel] = ev.data, cmd = st & 0xf0;
      if (cmd === 0x90 && vel > 0) noteOn(note - 60, vel/127); else if (cmd === 0x80 || (cmd === 0x90 && vel === 0)) noteOff(note - 60); }; n++; };
    midi.inputs.forEach(bind); midi.onstatechange = e => { if (e.port.type === 'input' && e.port.state === 'connected') bind(e.port); };
    $('bMidi').classList.add('on'); toast(n ? `MIDI conectado (${n} entrada${n > 1 ? 's' : ''})` : 'MIDI ativo — conecte um teclado');
  } catch(e){ toast('Acesso MIDI negado'); }
};

/* ---------------- Exportação ---------------- */
const slug = s => (s || 'sfx').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'sfx';
// Dentro de um artefato do claude.ai, downloads passam pela capacidade "downloads" (formatos permitidos; WAV vai em ZIP)
let dlCap = null;
try { if (window.claude && window.claude.use) window.claude.use('downloads').then(d => { dlCap = d; }).catch(() => {}); } catch(e){}
async function download(blob, name){
  if (dlCap){
    let data = blob, fn = name; const ext = name.split('.').pop().toLowerCase();
    if (!['zip','json','webm','txt','csv'].includes(ext)){ data = makeZip([{name, data: new Uint8Array(await blob.arrayBuffer())}]); fn = name.replace(/\.[^.]+$/, '') + '.zip'; }
    try { await dlCap.save({filename: fn, data}); toast('Arquivo salvo'); } catch(e){ if (!e || e.code !== 'declined') toast('Não foi possível salvar aqui: ' + (e && e.code || 'erro')); }
    return;
  }
  const url = URL.createObjectURL(blob), a = el('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
const exOpts = () => ({sr: +$('exRate').value, bits: +$('exBits').value, mono: $('exCh').value === '1'});
async function busy(label, fn){
  document.body.style.cursor = 'progress'; setStatus(label);
  try { await fn(); } catch(e){ console.error(e); toast('Erro: ' + e.message); } finally { document.body.style.cursor = ''; setStatus('Pronto'); }
}
$('bWav').onclick = () => busy('Exportando…', async () => {
  const o = exOpts(), r = await renderSound(S, o.sr);
  download(new Blob([encodeWav(r, o.bits, o.mono)], {type:'audio/wav'}), slug($('exName').value) + '.wav'); toast('WAV exportado');
});
$('bVarZip').onclick = () => busy('Gerando variações…', async () => {
  const o = exOpts(), n = clamp(+$('varN').value | 0, 2, 64), amt = +$('varAmt').value, base = slug($('exName').value), files = [];
  for (let i=0; i<n; i++){ setStatus(`Variação ${i+1}/${n}…`); const r = await renderSound(i === 0 ? S : varySound(S, amt), o.sr); files.push({name: `${base}_${String(i+1).padStart(2,'0')}.wav`, data: encodeWav(r, o.bits, o.mono)}); }
  download(makeZip(files), base + '_variacoes.zip'); toast(`${n} variações exportadas`);
});
$('bStems').onclick = () => busy('Exportando stems…', async () => {
  const o = exOpts(), base = slug($('exName').value), files = [];
  for (let i=0; i<S.layers.length; i++){ if (!S.layers[i].on) continue; setStatus(`Stem ${i+1}…`); const r = await renderSound(S, o.sr, {only: i, raw: true}); files.push({name: `${base}_${String(i+1).padStart(2,'0')}_${slug(S.layers[i].name)}.wav`, data: encodeWav(r, o.bits, o.mono)}); }
  if (!files.length) throw new Error('nenhuma camada ativa');
  download(makeZip(files), base + '_stems.zip'); toast('Stems exportados (sem normalização)');
});
$('bToMix').onclick = () => busy('Renderizando…', async () => { const r = await renderSound(S, 48000); const id = addClip(S.name, r, 'sfx'); addClipToMix(id, undefined, 'SFX'); toast('Enviado ao mixer'); });
$('bProjExp').onclick = () => { download(new Blob([JSON.stringify({app:'nexi-sfx-studio', version:2, sound:S}, null, 1)], {type:'application/json'}), slug(S.name) + '.nexisfx.json'); };
let jsonTarget = 'project';
$('bProjImp').onclick = () => { jsonTarget = 'project'; $('fileJson').click(); };
$('bBankImp').onclick = () => { jsonTarget = 'bank'; $('fileJson').click(); };
$('fileJson').onchange = async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  try {
    const j = JSON.parse(await f.text());
    if (jsonTarget === 'bank'){
      const arr = Array.isArray(j) ? j : j.sounds; if (!Array.isArray(arr)) throw 0;
      let n = 0; arr.forEach(s => { if (s && s.snd){ bank.push({name: String(s.name || 'Som').slice(0,80), snd: normalizeSound(s.snd)}); n++; } });
      saveBank(); toast(`${n} sons importados`);
    } else { loadSound(normalizeSound(j.sound || j)); toast('Projeto aberto'); }
  } catch(err){ toast('Arquivo inválido'); }
};
$('bBankExp').onclick = () => download(new Blob([JSON.stringify({app:'nexi-sfx-studio', version:2, sounds: bank}, null, 1)], {type:'application/json'}), 'nexi-sfx-banco.json');
$('bSave').onclick = () => { const n = $('saveName').value.trim() || S.name; bank.unshift({name: n, snd: JSON.parse(JSON.stringify({...S, name: n}))}); $('saveName').value = ''; saveBank(); toast('Salvo em Meus sons'); };

/* ---------------- Carregar / eventos ---------------- */
function loadSound(s){ S = s; sel = 0; commit(); afterLoad(false); }
function afterLoad(fromUndo){
  sel = Math.min(sel, Math.max(0, S.layers.length - 1));
  $('sndTitle').textContent = S.name; if (!fromUndo) $('exName').value = slug(S.name);
  renderStrip(); renderEditor(); renderMaster(); scheduleRender(true);
}
$('bPlay').onclick = playMain;
$('bStop').onclick = () => { stopMain(); voices.forEach((v, k) => noteOff(k, true)); };
$('cLoop').onchange = () => { if (mainSrc) playMain(); };
$('bVary').onclick = () => { S = varySound(S, +$('varAmt').value); commit(); afterLoad(true); };
$('bUndo').onclick = undo; $('bRedo').onclick = redo;
$('bNew').onclick = () => { curPreset = null; renderLibrary(); loadSound({name:'Novo som', cat:'', master: defaultMaster(), layers:[newLayer('analog')]}); };
$('monVol').oninput = () => { if (monGain) monGain.gain.value = +$('monVol').value; };
$('search').oninput = renderLibrary;
$('tLib').onclick = () => { $('tLib').classList.add('on'); $('tMine').classList.remove('on'); $('paneLib').style.display = ''; $('paneMine').style.display = 'none'; };
$('tMine').onclick = () => { $('tMine').classList.add('on'); $('tLib').classList.remove('on'); $('paneMine').style.display = ''; $('paneLib').style.display = 'none'; renderBank(); };
$('vWave').onclick = () => { viewMode = 'wave'; $('vWave').classList.add('on'); $('vSpec').classList.remove('on'); $('cvWave').style.display = ''; $('cvSpec').style.display = 'none'; drawWave(); };
$('vSpec').onclick = () => { viewMode = 'spec'; $('vSpec').classList.add('on'); $('vWave').classList.remove('on'); $('cvSpec').style.display = 'block'; $('cvWave').style.display = 'none'; drawSpec(); };
['cvWave', 'cvSpec'].forEach(id => $(id).onclick = playMain);
['exRate', 'exBits', 'exCh'].forEach(id => $(id).onchange = updateExInfo);
const addSel = $('addLayer');
Object.entries(ENGINES).forEach(([k, e]) => { const o = el('option', null, esc(e.name)); o.value = k; addSel.appendChild(o); });
addSel.onchange = () => { if (addSel.value) addLayer(addSel.value); addSel.value = ''; };
const held = new Set();
document.addEventListener('keydown', e => {
  if (e.target.matches('input[type=text], input[type=search], input[type=number], input[type=password], textarea, select')) return;
  if (curModule !== 'sfx' && curModule !== 'inst') return;
  const k = e.key.toLowerCase();
  if ((e.ctrlKey || e.metaKey) && k === 'z'){ e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
  if ((e.ctrlKey || e.metaKey) && k === 'y'){ e.preventDefault(); redo(); return; }
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.code === 'Space'){ if (curModule !== 'sfx') return; e.preventDefault(); mainSrc ? stopMain() : playMain(); return; }
  if (k in KEYMAP){ if (!held.has(k)){ held.add(k); noteOn(KEYMAP[k] + octave*12); } e.preventDefault(); return; }
  if (k === 'z'){ octave = Math.max(-3, octave-1); buildKeyboard(); }
  else if (k === 'x'){ octave = Math.min(3, octave+1); buildKeyboard(); }
  else if (k === 'v' && curModule === 'sfx') $('bVary').click();
});
document.addEventListener('keyup', e => { const k = e.key.toLowerCase(); if (held.has(k)){ held.delete(k); noteOff(KEYMAP[k] + octave*12); } });
let rsT = 0; window.addEventListener('resize', () => { clearTimeout(rsT); rsT = setTimeout(drawAll, 100); });

function initSfx(){
  renderLibrary(); buildKeyboard(); renderBank();
  curPreset = PRESET_DEFS[0][1]; renderLibrary();
  S = buildPreset(PRESET_DEFS[0]); commit(); afterLoad(false);
  wantPlay = false;
}
