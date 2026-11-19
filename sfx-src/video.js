"use strict";
/* ======================================================================
   Vídeo → trilha sonora contextualizada
   ====================================================================== */
const VID = {file: null, url: null, dur: 0, frames: [], cuts: [], plan: null};
const VSTYLES = {
  'Cinematográfico': {cut:'Whoosh', hit:'Impacto de trailer', flash:'Impacto metálico', move:'Whoosh', music:'Épico cinematográfico'},
  'Realista / Foley': {cut:'Deslizar', hit:'Soco', flash:'Clique', move:'Tecido / roupa', music:'Ambiente'},
  'Desenho animado': {cut:'Deslizar', hit:'Item / pop', flash:'Magia', move:'Pulo', music:'Pop'},
  'Jogo': {cut:'Whoosh', hit:'Dano', flash:'Power-up', move:'Laser / blaster', music:'Synthwave'},
  'Documentário': {cut:'Deslizar', hit:'Batida de suspense', flash:'Notificação', move:'Vento', music:'Ambiente'},
  'Terror / suspense': {cut:'Whoosh', hit:'Boom grave', flash:'Impacto metálico', move:'Porta rangendo', music:'Suspense'},
};
const PRESET_NAMES = PRESET_DEFS.map(d => d[1]);
function presetByName(n){ return PRESET_DEFS.find(d => d[1] === n) || PRESET_DEFS.find(d => d[1].toLowerCase().includes(String(n).toLowerCase())); }

function buildVideoUI(){
  $('videoRoot').innerHTML = `
  <div class="vgrid">
   <div>
    <div class="card"><h2>Vídeo</h2>
      <div class="dropzone" id="vdDrop">Solte um vídeo aqui ou <button class="btn sm" id="vdPick">escolha um arquivo</button></div>
      <video id="vdVideo" controls playsinline style="width:100%;border-radius:10px;margin-top:8px;display:none;background:#000"></video>
      <canvas id="vdTl" style="height:70px;margin-top:6px"></canvas>
      <div class="row" style="margin-top:6px"><button class="btn pri" id="vdWatch">▶ Assistir com a trilha</button><button class="btn sm" id="vdStop">■</button><button class="btn sm" id="vdExport">⬇ Exportar vídeo com áudio (.webm)</button><button class="btn sm" id="vdWav">⬇ Só o áudio (.wav)</button></div>
      <div class="hint" id="vdInfo">Nenhum vídeo carregado.</div>
    </div>
   </div>
   <div>
    <div class="card"><h2>Gerar trilha</h2>
      <div class="ctl"><label>Estilo</label><select id="vdStyle">${Object.keys(VSTYLES).map(k => `<option>${esc(k)}</option>`).join('')}</select></div>
      <div class="ctl"><label>Densidade de efeitos</label><input type="range" id="vdDensity" min="0" max="1" step="0.01" value="0.5"><span class="v"></span></div>
      <label class="chk"><input type="checkbox" id="vdAmb" checked> Ambiente contínuo</label>
      <label class="chk"><input type="checkbox" id="vdMusic" checked> Trilha musical</label>
      <label class="chk"><input type="checkbox" id="vdOrig" checked> Manter áudio original (faixa silenciada)</label>
      <label class="chk"><input type="checkbox" id="vdNarr"> Narração (voz do NEXI)</label>
      <label class="chk"><input type="checkbox" id="vdDescSfx" checked> Efeitos sob medida a partir da descrição de cada cena</label>
      <label class="chk"><input type="checkbox" id="vdMaster" checked> Mixar e masterizar automaticamente</label>
      <div class="row" style="margin-top:8px"><button class="btn grow" id="vdLocal">🔍 Analisar (local)</button><button class="btn grow" id="vdAI" data-need="anthropic">🤖 Entender a cena (Claude)</button></div>
      <div class="row" style="margin-top:6px"><button class="btn pri grow" id="vdGen">🎼 Gerar trilha no mixer</button></div>
      <div class="hint">A análise local detecta cortes, movimento, flashes, brilho e cor. A análise com a Claude olha os quadros e entende o que acontece (passos, portas, carros, clima) para escolher sons e escrever narração.</div>
    </div>
    <div class="card"><h2>Plano de som <span class="cat" id="vdPlanInfo"></span></h2><div class="list" id="vdEvents" style="max-height:340px"></div></div>
   </div>
  </div><input type="file" id="vdFile" accept="video/*" hidden>`;
  const drop = $('vdDrop');
  drop.ondragover = e => { e.preventDefault(); drop.classList.add('on'); }; drop.ondragleave = () => drop.classList.remove('on');
  drop.ondrop = e => { e.preventDefault(); drop.classList.remove('on'); const f = e.dataTransfer.files[0]; if (f) loadVideo(f); };
  $('vdPick').onclick = () => $('vdFile').click();
  $('vdFile').onchange = e => { const f = e.target.files[0]; e.target.value = ''; if (f) loadVideo(f); };
  const dn = $('vdDensity'); const dv = dn.nextElementSibling; const upd = () => dv.textContent = Math.round(dn.value*100) + '%'; dn.oninput = upd; upd();
  $('vdLocal').onclick = () => busy('Analisando vídeo…', async () => { await analyzeVideo(); VID.plan = localPlan(); renderPlan(); });
  $('vdAI').onclick = () => busy('A IA está assistindo ao vídeo…', async () => { if (!VID.frames.length) await analyzeVideo(); VID.plan = await aiPlan(); renderPlan(); });
  $('vdGen').onclick = () => busy('Gerando trilha…', generateSoundtrack);
  $('vdWatch').onclick = () => busy('Preparando…', async () => { if (!VID.url) throw new Error('carregue um vídeo'); MIX.playhead = 0; await mixPlay(); });
  $('vdStop').onclick = () => { mixStop(); };
  $('vdWav').onclick = () => $('mxExport').click();
  $('vdExport').onclick = () => busy('Gravando vídeo com áudio (tempo real)…', exportVideo);
  refreshApiBadges();
}
async function loadVideo(f){
  if (VID.url) URL.revokeObjectURL(VID.url);
  VID.file = f; VID.url = URL.createObjectURL(f); VID.frames = []; VID.cuts = []; VID.plan = null;
  const v = $('vdVideo'); v.src = VID.url; v.style.display = ''; v.muted = true;
  await new Promise((res, rej) => { v.onloadedmetadata = res; v.onerror = () => rej(new Error('formato de vídeo não suportado')); });
  VID.dur = v.duration; $('vdInfo').textContent = `${f.name} · ${fmtS(VID.dur)} · ${v.videoWidth}×${v.videoHeight}`;
  renderPlan(); drawVideoTl();
}
async function seekTo(v, t){ return new Promise(res => { const done = () => { v.removeEventListener('seeked', done); res(); }; v.addEventListener('seeked', done); v.currentTime = Math.min(t, v.duration - 0.05); }); }
async function analyzeVideo(){
  const v = $('vdVideo'); if (!VID.url) throw new Error('carregue um vídeo');
  const fps = Math.min(4, 360/VID.dur), n = Math.max(2, Math.floor(VID.dur*fps)), cw = 96, ch = 54;
  const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch; const ctx = cv.getContext('2d', {willReadFrequently: true});
  const big = document.createElement('canvas'), bctx = big.getContext('2d'); const ar = v.videoWidth/v.videoHeight; big.width = 512; big.height = Math.round(512/ar);
  let prev = null, prevH = null; VID.frames = [];
  for (let i=0; i<n; i++){
    const t = (i + 0.5)/fps; setStatus(`Analisando quadro ${i+1}/${n}…`); await seekTo(v, t);
    ctx.drawImage(v, 0, 0, cw, ch); const d = ctx.getImageData(0, 0, cw, ch).data;
    let lum = 0, rs = 0, gs = 0, bs = 0, diff = 0; const hist = new Float32Array(16), cur = new Float32Array(cw*ch);
    for (let p=0, q=0; p<d.length; p+=4, q++){ const l = 0.2126*d[p] + 0.7152*d[p+1] + 0.0722*d[p+2]; cur[q] = l; lum += l; rs += d[p]; gs += d[p+1]; bs += d[p+2]; hist[Math.min(15, l >> 4)]++; if (prev) diff += Math.abs(l - prev[q]); }
    const np = cw*ch; let hd = 0; if (prevH) for (let k=0; k<16; k++){ const a = hist[k]/np, b = prevH[k]/np; hd += (a - b)*(a - b)/((a + b) || 1); }
    const fr = {t, lum: lum/np/255, r: rs/np/255, g: gs/np/255, b: bs/np/255, motion: prev ? diff/np/255 : 0, hd};
    // quadros para a IA (máx. 20, espaçados)
    if (n <= 20 || i % Math.ceil(n/20) === 0){ bctx.drawImage(v, 0, 0, big.width, big.height); fr.jpeg = big.toDataURL('image/jpeg', 0.7).split(',')[1]; }
    VID.frames.push(fr); prev = cur; prevH = hist;
  }
  const hds = VID.frames.map(f => f.hd), mu = hds.reduce((a, b) => a + b, 0)/hds.length, sd = Math.sqrt(hds.reduce((a, b) => a + (b - mu)**2, 0)/hds.length);
  VID.cuts = VID.frames.filter((f, i) => i > 0 && f.hd > Math.max(0.25, mu + 3*sd)).map(f => f.t);
  try { // áudio original
    const id = await decodeToClip('Áudio original — ' + VID.file.name, await VID.file.arrayBuffer(), 'original'); VID.origClip = id;
  } catch(e){ VID.origClip = null; }
  drawVideoTl(); setStatus('Pronto');
}
function localPlan(){
  const st = VSTYLES[$('vdStyle').value], dens = +$('vdDensity').value, F = VID.frames, ev = [];
  const mot = F.map(f => f.motion), mMu = mot.reduce((a, b) => a + b, 0)/mot.length, mSd = Math.sqrt(mot.reduce((a, b) => a + (b - mMu)**2, 0)/mot.length) || 0.01;
  VID.cuts.forEach(t => ev.push({time: Math.max(0, t - 0.25), preset: st.cut, description: 'transição de cena', intensity: 0.6}));
  let last = -9;
  F.forEach((f, i) => {
    if (i < 2) return; const z = (f.motion - mMu)/mSd, prevQuiet = F[i-1].motion < mMu, gap = f.t - last;
    if (VID.cuts.some(c => Math.abs(c - f.t) < 0.4)) return;
    if (z > 3.2 - dens*1.4 && prevQuiet && gap > 1.2 - dens*0.7){ ev.push({time: f.t - 0.05, preset: st.hit, description: 'pico de movimento', intensity: clamp(z/5, 0.4, 1)}); last = f.t; }
    else if (f.lum - F[i-1].lum > 0.18){ ev.push({time: f.t, preset: st.flash, description: 'flash de luz', intensity: 0.7}); last = f.t; }
    else if (z > 1.8 - dens && gap > 2.5 - dens*1.5){ ev.push({time: f.t, preset: st.move, description: 'movimento', intensity: 0.45}); last = f.t; }
  });
  const avg = k => F.reduce((a, f) => a + f[k], 0)/F.length, lum = avg('lum'), r = avg('r'), g = avg('g'), b = avg('b');
  const amb = lum < 0.25 ? 'Drone de tensão' : b > r && b > g && lum > 0.45 ? 'Ondas do mar' : g > r && g > b ? 'Vento' : r > b + 0.08 && lum < 0.5 ? 'Fogo crepitando' : 'Vento';
  const energy = clamp(mMu*12, 0, 1);
  return {summary: `Análise local: ${VID.cuts.length} cortes, movimento médio ${(mMu*100).toFixed(1)}%, brilho ${(lum*100).toFixed(0)}%.`,
    ambience: {preset: amb, description: 'escolhido pela cor e brilho'}, music: {genre: st.music, tempo: Math.round(80 + energy*60), intensity: 0.3 + energy*0.6},
    narration: {enabled: false, text: ''}, events: ev.sort((a, b) => a.time - b.time)};
}
async function aiPlan(){
  const frames = VID.frames.filter(f => f.jpeg);
  const content = [];
  frames.forEach(f => { content.push({type:'text', text:`Quadro em t=${f.t.toFixed(2)}s`}); content.push({type:'image', source:{type:'base64', media_type:'image/jpeg', data: f.jpeg}}); });
  content.push({type:'text', text:
`Você está assistindo a um vídeo de ${VID.dur.toFixed(1)} s (quadros acima, com tempos). Cortes detectados automaticamente: ${VID.cuts.map(t => t.toFixed(2)).join(', ') || 'nenhum'}.
Estilo pedido: ${$('vdStyle').value}. Densidade de efeitos: ${Math.round($('vdDensity').value*100)}%.
Crie o plano de sound design: efeitos pontuais sincronizados com as ações visíveis (impactos, passos, portas, objetos, transições), um ambiente contínuo coerente com o lugar, a trilha musical e, se fizer sentido, uma narração curta em português do Brasil que caiba no tempo do vídeo.
Para cada efeito, escolha o preset mais próximo da lista e escreva uma descrição curta em português do som (objeto, material, intensidade, distância), como “porta de madeira pesada batendo” ou “passos no cascalho”.`});
  const schema = {type:'object', additionalProperties:false, required:['summary','ambience','music','narration','events'], properties:{
    summary:{type:'string'},
    ambience:{type:'object', additionalProperties:false, required:['preset','description'], properties:{preset:{type:'string', enum: PRESET_NAMES}, description:{type:'string'}}},
    music:{type:'object', additionalProperties:false, required:['genre','tempo','intensity'], properties:{genre:{type:'string', enum: Object.keys(GENRES)}, tempo:{type:'number'}, intensity:{type:'number'}}},
    narration:{type:'object', additionalProperties:false, required:['enabled','text'], properties:{enabled:{type:'boolean'}, text:{type:'string'}}},
    events:{type:'array', items:{type:'object', additionalProperties:false, required:['time','preset','description','intensity'], properties:{
      time:{type:'number'}, preset:{type:'string', enum: PRESET_NAMES}, description:{type:'string'}, intensity:{type:'number'}}}}}};
  return claudeJSON(content, schema, 'Você é um sound designer de cinema e jogos. Seja preciso nos tempos (em segundos, a partir do início). Retorne só o JSON pedido.');
}
function renderPlan(){
  const box = $('vdEvents'); if (!box) return; box.innerHTML = ''; const p = VID.plan;
  if (!p){ box.innerHTML = '<div class="empty">Analise o vídeo para criar o plano de som.</div>'; $('vdPlanInfo').textContent = ''; return; }
  $('vdPlanInfo').textContent = `${p.events.length} efeitos`;
  box.appendChild(el('div', 'hint', `${esc(p.summary)}<br>Ambiente: <b>${esc(p.ambience.preset)}</b> · Música: <b>${esc(p.music.genre)}</b> ${Math.round(p.music.tempo)} BPM${p.narration.enabled ? ' · Narração: “' + esc(p.narration.text.slice(0, 80)) + '…”' : ''}`));
  p.events.forEach((e, i) => {
    const it = el('div', 'item', `<span class="cat">${e.time.toFixed(2)}s</span><span class="nm" title="${esc(e.description)}">${esc(e.preset)} — ${esc(e.description)}</span><button title="Ouvir">▶</button><button title="Remover">✕</button>`);
    const [bp, bx] = it.querySelectorAll('button');
    bp.onclick = () => busy('Renderizando…', async () => { const d = presetByName(e.preset); if (!d) return; const r = await renderSound(buildPreset(d), 48000); previewPCM(r.L, r.R, r.sr); });
    bx.onclick = () => { p.events.splice(i, 1); renderPlan(); drawVideoTl(); };
    it.onclick = ev => { if (ev.target.tagName !== 'BUTTON'){ const v = $('vdVideo'); v.currentTime = e.time; } };
    box.appendChild(it);
  });
  drawVideoTl();
}
function drawVideoTl(){
  const cv = $('vdTl'); if (!cv) return; const {ctx, w, h, dpr} = fit(cv); ctx.clearRect(0, 0, w, h); if (!VID.dur) return;
  const X = t => t/VID.dur*w;
  VID.frames.forEach((f, i) => { const x = X(f.t), nx = i+1 < VID.frames.length ? X(VID.frames[i+1].t) : w; ctx.fillStyle = `rgb(${f.r*255|0},${f.g*255|0},${f.b*255|0})`; ctx.fillRect(x, 0, nx - x + 1, h*0.4);
    ctx.fillStyle = cssv('--wave'); const mh = Math.min(1, f.motion*8)*h*0.35; ctx.fillRect(x, h*0.95 - mh, Math.max(1, nx - x - 1), mh); });
  ctx.fillStyle = cssv('--hot'); VID.cuts.forEach(t => ctx.fillRect(X(t) - dpr, 0, 2*dpr, h));
  if (VID.plan){ ctx.fillStyle = cssv('--accent2'); VID.plan.events.forEach(e => { ctx.beginPath(); ctx.arc(X(e.time), h*0.5, 3*dpr, 0, TAU); ctx.fill(); }); }
}
function tileAmbience(r, dur){
  const sr = r.sr, N = Math.ceil(dur*sr), L = new Float32Array(N), R = new Float32Array(N), len = r.L.length, xf = Math.min(Math.floor(len/4), Math.round(1.5*sr));
  if (len < sr) return {L: r.L, R: r.R, sr};
  const step = len - xf;
  for (let s=0; s<N; s+=step) for (let i=0; i<len && s+i<N; i++){ let g = 1; if (i < xf && s > 0) g = Math.sin(i/xf*Math.PI/2); if (i > len - xf) g = Math.cos((i - (len - xf))/xf*Math.PI/2); L[s+i] += r.L[i]*g; R[s+i] += r.R[i]*g; }
  const fo = Math.min(N, Math.round(2*sr)); for (let i=0; i<fo; i++){ const g = i/fo; L[N-1-i] *= g; R[N-1-i] *= g; }
  return {L, R, sr};
}
async function generateSoundtrack(){
  if (!VID.url) throw new Error('carregue um vídeo'); if (!VID.plan){ await analyzeVideo(); VID.plan = localPlan(); renderPlan(); }
  const p = VID.plan, sr = 48000, useDesc = $('vdDescSfx').checked;
  MIX.tracks = []; mixDirty();
  if ($('vdOrig').checked && VID.origClip){ addClipToMix(VID.origClip, 0, 'Áudio original'); const t = MIX.tracks.find(x => x.name === 'Áudio original'); t.mute = true; t.role = 'ambiente'; }
  for (let i=0; i<p.events.length; i++){
    const e = p.events[i]; setStatus(`Efeito ${i+1}/${p.events.length}…`); let id = null;
    if (useDesc && e.description){ const dd = describeToSound(e.description); if (dd && dd.matched.length){ const r = await renderSound(varySound(dd.snd, 0.3), sr); id = addClip(`${dd.matched.join(' + ')} @${e.time.toFixed(1)}s`, r, 'sfx'); } }
    if (!id){ const d = presetByName(e.preset); if (!d) continue; const r = await renderSound(varySound(buildPreset(d), 0.35), sr); id = addClip(`${e.preset} @${e.time.toFixed(1)}s`, r, 'sfx'); }
    const d = presetByName(e.preset), cat = d ? d[0] : 'SFX';
    addClipToMix(id, Math.max(0, e.time), cat === 'Foley' ? 'Foley' : cat === 'Interface' ? 'Interface' : 'Efeitos');
    const t = MIX.tracks[MIX.tracks.length-1]; const k = t.clips[t.clips.length-1]; k.gain = -14*(1 - clamp(e.intensity, 0, 1));
  }
  if ($('vdAmb').checked && p.ambience?.preset){ setStatus('Ambiente…'); const d = presetByName(p.ambience.preset); if (d){ const r = await renderSound(buildPreset(d), sr); const id = addClip('Ambiente — ' + d[1], tileAmbience(r, VID.dur), 'ambiente'); addClipToMix(id, 0, 'Ambiente'); MIX.tracks.find(t => t.name === 'Ambiente').role = 'ambiente'; } }
  if ($('vdMusic').checked && p.music){ setStatus('Compondo música…'); const m = composeMusic({genre: p.music.genre, bpm: clamp(p.music.tempo, 60, 180), duration: VID.dur, intensity: p.music.intensity, seed: hashStr(VID.file.name)});
    const r = await renderComposition(m); const id = addClip(`Música — ${p.music.genre}`, r, 'música'); addClipToMix(id, 0, 'Música'); MIX.tracks.find(t => t.name === 'Música').role = 'música'; }
  if ($('vdNarr').checked){
    let text = p.narration?.enabled ? p.narration.text : '';
    if (!text && apiKeys.anthropic) text = (await claudeText(`Escreva uma narração curta em português do Brasil (no máximo ${Math.round(VID.dur*2.3)} palavras) para um vídeo assim: ${p.summary}. Responda só com o texto.`)).trim();
    if (!text) toast('Sem texto de narração: use a análise com a Claude ou escreva na aba Voz');
    if (text){ setStatus('Narração…'); const raw = speak(applyLexicon(text), VS.voice, TTS_SR, 5); const r = await processVoice(raw, {...VS.proc, pauseMs: 0}); const nid = addClip('Narração', r, 'voz'); addClipToMix(nid, 0.5, 'Voz · Narração'); }
  }
  if ($('vdMaster').checked){ setStatus('Mixando e masterizando…'); await mixAssistant(); MIX.master.dest = 'YouTube (−14 LUFS)'; mixRendered = await renderMix(); masterAssistant(mixRendered); mixMastered = await applyMastering(mixRendered); }
  MIX.playhead = 0; toast('Trilha gerada! Clique em “Assistir com a trilha”.');
}
// sincroniza o vídeo com a reprodução do mixer
function onMixPlay(off){ const v = $('vdVideo'); if (!v || !VID.url) return; v.muted = true; v.currentTime = Math.min(off, v.duration || 0); v.play().catch(() => {}); }
function onMixStop(){ const v = $('vdVideo'); if (v && !v.paused) v.pause(); }
async function exportVideo(){
  if (!VID.url) throw new Error('carregue um vídeo'); await ensureMixRendered();
  const v = $('vdVideo'), r = MIX.masterOn ? mixMastered : mixRendered, c = ensureAC();
  const vs = v.captureStream ? v.captureStream() : v.mozCaptureStream(); const dest = c.createMediaStreamDestination();
  const b = c.createBuffer(2, r.L.length, r.sr); b.copyToChannel(r.L, 0); b.copyToChannel(r.R, 1); const s = c.createBufferSource(); s.buffer = b; s.connect(dest);
  const stream = new MediaStream([...vs.getVideoTracks(), ...dest.stream.getAudioTracks()]);
  const mime = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find(m => MediaRecorder.isTypeSupported(m));
  const rec = new MediaRecorder(stream, {mimeType: mime, videoBitsPerSecond: 8e6}), chunks = []; rec.ondataavailable = e => chunks.push(e.data);
  await seekTo(v, 0); v.muted = true;
  const done = new Promise(res => rec.onstop = res);
  rec.start(); s.start(); await v.play();
  await new Promise(res => v.onended = res); rec.stop(); try { s.stop(); } catch(e){} await done;
  download(new Blob(chunks, {type: 'video/webm'}), slug(VID.file.name.replace(/\.[^.]+$/, '')) + '-nexi.webm'); toast('Vídeo exportado');
}
MODULE_SHOW.video = () => { if (!$('vdDrop')) buildVideoUI(); renderPlan(); refreshApiBadges(); };
