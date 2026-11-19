"use strict";
/* ======================================================================
   Laboratório de voz: fala sintetizada do zero, gravação, transformação,
   personas, leitor de roteiro, conversão e limpeza de voz, ditado
   ====================================================================== */
const VOICE_EFFECTS = {
  'Nenhum': {}, 'Robô': {dsp:'robot', fx:{hp:120, ratio:3}}, 'Sussurro': {dsp:'whisper', fx:{hp:200, high:3}},
  'Telefone': {fx:{hp:320, lp:3400, mid:4, midF:1600, drive:0.35}}, 'Rádio AM': {dsp:'noise', fx:{hp:500, lp:4200, drive:0.55, mid:5, midF:1800}},
  'Megafone': {fx:{hp:650, lp:3600, drive:0.8, mid:6, midF:2000, revType:'Exterior', revMix:0.15}},
  'Alienígena': {dsp:'ring', fx:{revType:'Placa', revMix:0.15}}, 'Coral / dobra': {dsp:'double', fx:{revType:'Sala', revMix:0.12}},
  'Fantasma': {dsp:'ghost', fx:{revType:'Catedral', revMix:0.25}}, 'Caverna': {fx:{revType:'Caverna', revMix:0.45}},
  'Estádio': {fx:{revType:'Hall', revMix:0.35, dlyMix:0.15, dlyTime:0.32, dlyFb:0.25}}, 'Rádio comunicador': {dsp:'noise', fx:{hp:700, lp:2800, drive:0.9, ratio:6, thr:-30}},
};
const VOICE_EQ = {
  'Natural': {}, 'Podcast': {hp:80, low:1.5, mid:2, midF:3000, high:2, ratio:3, thr:-20},
  'Rádio FM': {hp:90, low:3, mid:2, midF:2500, high:3, ratio:4, thr:-24, drive:0.15}, 'Audiolivro': {hp:75, mid:1, midF:2500, high:1, ratio:2.5, thr:-22},
  'Trailer de cinema': {hp:60, low:4, high:3, ratio:4, thr:-24, drive:0.25}, 'Locução comercial': {hp:85, low:2, mid:3, midF:3500, high:2.5, ratio:5, thr:-26},
};
const VOICE_REV = ['Nenhum', ...Object.keys(REV_TYPES)];
const VOICE_PRESETS = {
  'Natural': {pitch:0, formant:1}, 'Criança': {pitch:4, formant:1.18}, 'Gigante': {pitch:-7, formant:0.78}, 'Monstro': {pitch:-10, formant:0.72, effect:'Nenhum', drive:0.4},
  'Esquilo': {pitch:9, formant:1.3}, 'Voz grave de trailer': {pitch:-3, formant:0.92, eq:'Trailer de cinema'}, 'Feminina ↔ masculina': {pitch:-4, formant:0.88}, 'Masculina ↔ feminina': {pitch:4, formant:1.12},
};
function defaultVoiceProc(){ return {pitch:0, formant:1, speed:1, effect:'Nenhum', eq:'Natural', reverb:'Nenhum', reverbMix:0.15, denoise:0, drive:0, lufs:-16, pauseMs:350}; }
const VS = {src: null, out: null, proc: defaultVoiceProc(), voice: defaultTTSVoice(), personas: LS.get('nexi-sfx-personas', []).filter(p => p.voice), lexicon: LS.get('nexi-sfx-lexicon', 'NEXI = néksi\nSFX = ésse éfe xis')};

async function processVoice(clip, s){
  const sr = clip.sr; let x = new Float32Array(clip.L.length); for (let i=0; i<x.length; i++) x[i] = (clip.L[i] + clip.R[i])*0.5;
  if (s.denoise > 0) x = denoise(x, sr, s.denoise);
  if (Math.abs(s.speed - 1) > 0.005) x = wsola(x, s.speed, sr);
  if (s.pitch) x = pitchShift(x, s.pitch, sr);
  const fComp = s.formant/Math.pow(2, s.pitch/12);
  if (Math.abs(fComp - 1) > 0.01) x = formantShift(x, fComp, sr);
  const ef = VOICE_EFFECTS[s.effect] || {};
  let L = x, R = x.slice();
  switch (ef.dsp){
    case 'robot': L = robotize(x, sr, 95); R = L.slice(); break;
    case 'whisper': L = whisperize(x); R = L.slice(); break;
    case 'ring': { L = new Float32Array(x.length); for (let i=0; i<x.length; i++) L[i] = x[i]*(0.4 + 0.6*Math.sin(TAU*70*i/sr)); L = pitchShift(L, 2, sr); R = L.slice(); break; }
    case 'noise': { const r = mulberry32(3); for (let i=0; i<x.length; i++){ const n = (r()*2-1)*0.015; L[i] += n; R[i] += n; } break; }
    case 'double': { const d1 = Math.round(0.017*sr), d2 = Math.round(0.029*sr), a = pitchShift(x, 0.12, sr), b = pitchShift(x, -0.12, sr);
      L = new Float32Array(x.length); R = new Float32Array(x.length);
      for (let i=0; i<x.length; i++){ L[i] = x[i]*0.7 + (i >= d1 ? a[i-d1]*0.55 : 0); R[i] = x[i]*0.7 + (i >= d2 ? b[i-d2]*0.55 : 0); } break; }
    case 'ghost': { const rev = x.slice().reverse(), w = await fxChain(rev, rev.slice(), sr, {revType:'Catedral', ...REV_TYPES['Catedral'], revMix:1}); const wl = w.L.slice().reverse(); const pad = wl.length - x.length;
      L = new Float32Array(wl.length); R = new Float32Array(wl.length); for (let i=0; i<wl.length; i++){ const dry = i >= pad ? x[i-pad] : 0; L[i] = dry + wl[i]*0.5; R[i] = dry + w.R[w.R.length-1-i]*0.5; } break; }
  }
  const fx = Object.assign({}, VOICE_EQ[s.eq] || {}, ef.fx || {});
  if (s.drive) fx.drive = Math.max(fx.drive || 0, s.drive);
  if (s.reverb !== 'Nenhum'){ Object.assign(fx, REV_TYPES[s.reverb], {revType: s.reverb, revMix: s.reverbMix}); }
  const out = await fxChain(L, R, sr, fx);
  return normalizeLUFS(out, s.lufs, -1);
}


/* ---------------- Fala local ---------------- */
function applyLexicon(text){
  VS.lexicon.split('\n').forEach(line => { const m = line.match(/^\s*(.+?)\s*=\s*(.+?)\s*$/); if (!m) return;
    const re = new RegExp('(^|[^\\p{L}])' + m[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?=$|[^\\p{L}])', 'giu'); text = text.replace(re, (_, pre) => pre + m[2]); });
  return text;
}
function speakToClip(text, voice, name, seed){ const r = speak(applyLexicon(text), voice, TTS_SR, seed || hashStr(text)); return addClip(name || text.slice(0, 30), r, 'voz'); }
function voiceFromDescription(desc){
  const d = desc.toLowerCase(), v = {...TTS_VOICES['Masculina']}, proc = {};
  const has = re => re.test(d);
  if (has(/crian|infantil|menin|bebê|fofo|fofa/)) Object.assign(v, TTS_VOICES['Criança']);
  else if (has(/femin|mulher|moça|garota|senhora|narradora|locutora/)) Object.assign(v, TTS_VOICES['Feminina']);
  if (has(/idos|velh|anci|avô|avó/)) Object.assign(v, {...TTS_VOICES['Idoso'], f0: v.f0 > 170 ? 175 : 125, scale: v.scale});
  if (has(/grave|profund|grossa|encorpad/)) { v.f0 *= 0.82; v.scale *= 0.95; }
  if (has(/agud|fina/)) v.f0 *= 1.2;
  if (has(/rouc|áspera|aspera|rasgad/)) v.rough = 0.6;
  if (has(/soprosa|suave|doce|aveludad|calorosa|quente/)) { v.breath = Math.max(v.breath, 0.32); v.tilt = 0.65; }
  if (has(/sussurr|cochich/)) { v.whisper = true; v.breath = 1; }
  if (has(/rápid|rapid|animad|energ|empolgad|alegre/)) { v.speed *= 1.12; v.expr = 1.5; }
  if (has(/lent|calm|seren|tranquil|pausad/)) { v.speed *= 0.88; v.expr = 0.8; }
  if (has(/monóton|monoton|sem emoção|robô|robo|máquina|androide/)) { v.expr = 0.15; proc.effect = has(/robô|robo|máquina|androide/) ? 'Robô' : undefined; }
  if (has(/monstro|demôn|demon|ogro|gigante/)) Object.assign(proc, {pitch: -7, formant: 0.76, drive: 0.3});
  if (has(/alien|extraterr/)) proc.effect = 'Alienígena';
  if (has(/fantasma|assombr/)) proc.effect = 'Fantasma';
  if (has(/rádio|radio|locutor/)) proc.eq = 'Rádio FM';
  if (has(/telefone|ligação|celular/)) proc.effect = 'Telefone';
  if (has(/trailer|épic|epic|cinema/)) proc.eq = 'Trailer de cinema';
  if (has(/document|audiolivro|narra/)) { proc.eq = proc.eq || 'Audiolivro'; v.speed *= 0.95; }
  if (has(/caverna/)) proc.reverb = 'Caverna'; else if (has(/igreja|catedral/)) proc.reverb = 'Catedral'; else if (has(/sala|quarto/)) proc.reverb = 'Sala';
  Object.keys(proc).forEach(k => proc[k] === undefined && delete proc[k]);
  return {voice: v, proc};
}
function cleanVoice(x, sr){
  let y = denoise(x, sr, 0.95); const N = y.length;
  const env = new Float32Array(N), aA = Math.exp(-1/(0.005*sr)), aR = Math.exp(-1/(0.12*sr)); let e = 0;
  for (let i=0; i<N; i++){ const a = Math.abs(y[i]); e = a > e ? aA*e + (1-aA)*a : aR*e + (1-aR)*a; env[i] = e; }
  const sorted = Array.from(env).sort((p, q) => p - q), floor = sorted[Math.floor(N*0.2)], thr = floor*3 + 1e-5; let g = 0;
  for (let i=0; i<N; i++){ const tgt = env[i] > thr ? 1 : 0.08; g += (tgt - g)*(tgt > g ? 0.01 : 0.0008); y[i] *= g; }
  return y;
}

/* ---------------- UI ---------------- */
function vCard(title, inner, need){ return `<div class="card"${need ? ` data-need="${need}"` : ''}><h2>${title}${need ? '<span class="badge">opcional: Claude</span>' : ''}</h2>${inner}</div>`; }
function buildVoiceUI(){
  $('voiceRoot').innerHTML = `
  <div class="vgrid">
   <div>
    ${vCard('1 · Fonte da voz', `
      <div class="tabs"><button class="on" data-vt="tts">Texto → fala</button><button data-vt="rec">Gravar / importar</button></div>
      <div id="vtTTS">
        <textarea id="vText" rows="4">Olá! Eu sou a voz do NEXI. Posso narrar, interpretar personagens e cantar, tudo gerado aqui mesmo, sem internet.</textarea>
        <div class="row" style="margin-top:6px"><select id="vVoicePreset" class="grow">${Object.keys(TTS_VOICES).map(k => `<option>${esc(k)}</option>`).join('')}</select><button class="btn pri" id="vSpeak">🗣 Falar</button></div>
        <details class="mg" style="margin-top:6px"><summary>Ajustes da voz</summary><div id="vTtsCtl"></div></details>
        <details class="mg"><summary>Pronúncia</summary><div class="hint" id="vPhon"></div>
          <label class="lbl" for="vLex">Dicionário (palavra = como se lê)</label><textarea id="vLex" rows="3"></textarea></details>
      </div>
      <div id="vtREC" hidden>
        <div class="row"><button class="btn pri grow" id="vRec">🎙 Gravar</button><button class="btn grow" id="vImport">📂 Importar áudio</button></div>
        <div class="hint">Grave em ambiente silencioso. Use “Limpar voz” ou “Redução de ruído” se precisar.</div>
      </div>
      <div class="viz" style="margin-top:8px"><canvas id="voWave" style="height:90px"></canvas></div>
      <div class="row" style="margin-top:6px"><button class="btn sm" id="vPlaySrc">▶ Original</button><button class="btn sm" id="vPlayOut">▶ Processada</button><button class="btn sm" id="vToMix">→ Mixer</button><button class="btn sm" id="vToSfx">→ Camada SFX</button><button class="btn sm" id="vDl">⬇ WAV</button></div>
      <div class="hint" id="vInfo">Nenhuma voz ainda.</div>`)}
    ${vCard('2 · Transformar a voz', `
      <div class="row"><select id="vPreset" class="grow"><option value="">Predefinição de transformação…</option>${Object.keys(VOICE_PRESETS).map(k => `<option>${esc(k)}</option>`).join('')}</select></div>
      <div id="vProcCtl"></div>
      <div class="row" style="margin-top:6px"><button class="btn pri grow" id="vApply">✨ Aplicar processamento</button></div>`)}
   </div>
   <div>
    ${vCard('3 · Personas leitoras', `
      <div class="row"><input type="text" id="pName" placeholder="Nome da persona" class="grow"><button class="btn sm" id="pSave">⭐ Salvar atual</button></div>
      <textarea id="pDesc" rows="2" placeholder="Descreva a persona (ex.: narradora calma de documentário, voz quente e um pouco grave)"></textarea>
      <div class="row" style="margin-top:4px"><button class="btn sm grow" id="pLocal">🎛 Criar pela descrição</button><button class="btn sm grow" id="pClone">🧬 Capturar timbre da gravação</button><button class="btn sm grow" id="pAI" data-need="anthropic">🤖 Refinar com IA</button></div>
      <div class="list" id="pList" style="margin-top:8px;max-height:220px"></div>`)}
    ${vCard('4 · Leitor de roteiro (vários personagens)', `
      <textarea id="sText" rows="6">Narrador: Era uma noite fria no laboratório.
Ana: Você ouviu isso?
NEXI: Fui eu! Estou acordado.</textarea>
      <div class="row" style="margin-top:4px"><input type="text" id="sPrompt" class="grow" placeholder="Ou peça um roteiro: ‘diálogo de 30 s entre um robô e uma criança’"><button class="btn sm" id="sGen" data-need="anthropic">🤖 Escrever</button></div>
      <div id="sMap" style="margin-top:6px"></div>
      <div class="row" style="margin-top:6px"><button class="btn sm" id="sPreview">▶ Ouvir</button><button class="btn pri grow" id="sRead">🎬 Ler roteiro e enviar ao mixer</button></div>`)}
    ${vCard('5 · Ferramentas', `
      <div class="toolgrid">
        <button class="btn" id="tConvert">🔁 Converter gravação para a voz atual</button>
        <button class="btn" id="tClean">🎧 Limpar voz (ruído de fundo)</button>
        <button class="btn" id="tDict">📝 Ditado → texto e legendas</button>
        <button class="btn" id="tSfx">💥 Criar efeito por descrição</button>
      </div>
      <div class="hint">Tudo roda neste aparelho. O ditado usa o reconhecimento de fala do próprio navegador (Chrome ou Edge).</div>
      <textarea id="tOut" rows="4" placeholder="Transcrições aparecem aqui" style="margin-top:6px"></textarea>`)}
   </div>
  </div>
  <input type="file" id="vFile" accept="audio/*,video/*" hidden>`;
  document.querySelectorAll('[data-vt]').forEach(b => b.onclick = () => { document.querySelectorAll('[data-vt]').forEach(x => x.classList.toggle('on', x === b)); $('vtTTS').hidden = b.dataset.vt !== 'tts'; $('vtREC').hidden = b.dataset.vt !== 'rec'; });
  $('vVoicePreset').onchange = () => { VS.voice = {...TTS_VOICES[$('vVoicePreset').value]}; renderTtsCtl(); };
  $('vLex').value = VS.lexicon; $('vLex').onchange = () => { VS.lexicon = $('vLex').value; LS.set('nexi-sfx-lexicon', VS.lexicon); updatePhon(); };
  $('vText').oninput = updatePhon;
  renderTtsCtl(); renderProcCtl(); renderPersonas(); updatePhon();
  $('vSpeak').onclick = () => busy('Sintetizando voz…', async () => { const t = $('vText').value.trim(); if (!t) throw new Error('digite um texto'); setVoiceSrc(speakToClip(t, VS.voice)); });
  $('vImport').onclick = () => $('vFile').click();
  $('vFile').onchange = async e => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; try { setVoiceSrc(await decodeToClip(f.name.replace(/\.[^.]+$/, ''), await f.arrayBuffer(), 'voz')); } catch(err){ toast('Não consegui ler o arquivo'); } };
  $('vRec').onclick = toggleVoiceRec;
  $('vPlaySrc').onclick = () => { const c = CLIPS.get(VS.src); if (c) previewPCM(c.L, c.R, c.sr); };
  $('vPlayOut').onclick = () => { const c = CLIPS.get(VS.out); if (c) previewPCM(c.L, c.R, c.sr); else toast('Aplique o processamento primeiro'); };
  $('vApply').onclick = () => busy('Processando voz…', async () => { const c = CLIPS.get(VS.src); if (!c) throw new Error('nenhuma voz carregada'); const r = await processVoice(c, VS.proc); VS.out = addClip(c.name + ' (processada)', r, 'voz'); drawVoice(); previewPCM(r.L, r.R, r.sr); });
  $('vPreset').onchange = () => { const p = VOICE_PRESETS[$('vPreset').value]; if (p){ Object.assign(VS.proc, defaultVoiceProc(), p); renderProcCtl(); } $('vPreset').value = ''; };
  $('vToMix').onclick = () => { const id = VS.out || VS.src; if (!id) return; addClipToMix(id, undefined, 'Voz'); toast('Enviado ao mixer'); };
  $('vToSfx').onclick = () => { const c = CLIPS.get(VS.out || VS.src); if (!c) return; const sid = 'v' + Date.now().toString(36); SAMPLES.set(sid, {name: c.name, sr: c.sr, ch: [c.L, c.R]}); idbPut(sid, SAMPLES.get(sid)); addLayer('sampler'); S.layers[sel].p.sample = sid; S.layers[sel].env.len = clipDur(c) + 0.1; commit(); renderEditor(); toast('Virou camada no SFX'); };
  $('vDl').onclick = () => { const c = CLIPS.get(VS.out || VS.src); if (c) download(clipToWavBlob(c), slug(c.name) + '.wav'); };
  // personas
  $('pSave').onclick = () => { const n = $('pName').value.trim() || 'Persona ' + (VS.personas.length + 1); VS.personas.unshift({name: n, desc: $('pDesc').value.trim(), voice: {...VS.voice}, proc: {...VS.proc}}); savePersonas(); toast('Persona salva'); };
  $('pLocal').onclick = () => { const d = $('pDesc').value.trim(); if (!d){ toast('Descreva a persona'); return; } const r = voiceFromDescription(d); VS.voice = r.voice; VS.proc = {...defaultVoiceProc(), ...r.proc}; renderTtsCtl(); renderProcCtl(); busy('Sintetizando…', async () => setVoiceSrc(speakToClip('Olá! É assim que eu falo.', VS.voice))); };
  $('pClone').onclick = () => busy('Analisando timbre…', async () => { const c = CLIPS.get(VS.src); if (!c) throw new Error('grave ou importe uma fala primeiro (aba Gravar)');
    const x = new Float32Array(c.L.length); for (let i=0; i<x.length; i++) x[i] = (c.L[i] + c.R[i])/2; const prof = analyzeVoiceProfile(x, c.sr);
    VS.srcProfile = prof; Object.assign(VS.voice, {f0: prof.f0, scale: prof.scale, breath: prof.breath, rough: prof.rough, whisper: false}); renderTtsCtl();
    toast(`Timbre capturado: ${prof.f0} Hz, trato ×${prof.scale}`); $('vInfo').textContent = `Perfil: altura ${prof.f0} Hz · formantes ${prof.formants.join('/')} Hz · tamanho do trato ×${prof.scale} · sopro ${prof.breath}`; });
  $('pAI').onclick = () => busy('Criando persona…', createPersonaAI);
  // roteiro
  $('sText').oninput = renderScriptMap; renderScriptMap();
  $('sGen').onclick = () => busy('Escrevendo roteiro…', async () => {
    const names = VS.personas.map(p => p.name).join(', ') || 'livre';
    const t = await claudeText(`Escreva um roteiro em português do Brasil para: ${$('sPrompt').value || 'uma cena curta'}.\nFormato obrigatório: uma fala por linha, "Personagem: fala". Use, se fizer sentido, estes personagens: ${names}. Inclua só o roteiro, sem títulos ou comentários.`);
    $('sText').value = t.trim(); renderScriptMap();
  });
  $('sRead').onclick = () => busy('Lendo roteiro…', () => readScript(true));
  $('sPreview').onclick = () => busy('Lendo roteiro…', () => readScript(false));
  // ferramentas
  $('tConvert').onclick = () => busy('Convertendo voz…', async () => { const c = CLIPS.get(VS.src); if (!c) throw new Error('grave ou importe uma fala primeiro');
    const x = new Float32Array(c.L.length); for (let i=0; i<x.length; i++) x[i] = (c.L[i] + c.R[i])/2; const src = analyzeVoiceProfile(x, c.sr);
    const pitch = clamp(12*Math.log2(VS.voice.f0/src.f0), -24, 24), formant = clamp(VS.voice.scale/src.scale, 0.5, 2);
    const r = await processVoice(c, {...VS.proc, pitch, formant: formant*Math.pow(2, pitch/12)});
    VS.out = addClip(c.name + ' (convertida)', r, 'voz'); drawVoice(); previewPCM(r.L, r.R, r.sr); toast(`Altura ${pitch > 0 ? '+' : ''}${pitch.toFixed(1)} st · timbre ×${formant.toFixed(2)}`); });
  $('tClean').onclick = () => busy('Limpando voz…', async () => { const c = CLIPS.get(VS.src); if (!c) throw new Error('carregue um áudio primeiro');
    const x = new Float32Array(c.L.length); for (let i=0; i<x.length; i++) x[i] = (c.L[i] + c.R[i])/2;
    const y = cleanVoice(x, c.sr), r = normalizeLUFS(await fxChain(y, y.slice(), c.sr, {hp: 80, lp: 12000, ratio: 2.5, thr: -22}, {tail: false}), -16);
    VS.out = addClip(c.name + ' (limpa)', r, 'voz'); drawVoice(); previewPCM(r.L, r.R, r.sr); });
  $('tDict').onclick = toggleDictation;
  $('tSfx').onclick = () => { showModule('sfx'); const d = $('descText'); if (d){ d.focus(); d.scrollIntoView({block: 'center'}); } };
  refreshApiBadges();
}
function renderTtsCtl(){
  const box = $('vTtsCtl'); if (!box) return; box.innerHTML = '';
  [P('f0','Altura média',60,400,118,'log','Hz'), P('scale','Tamanho do trato vocal',0.75,1.5,1,'lin','x'), P('speed','Velocidade',0.5,1.8,1,'lin','x'),
   P('expr','Expressividade',0,2,1,'lin','%'), P('breath','Sopro',0,1,0.1,'lin','%'), P('rough','Rouquidão',0,1,0.1,'lin','%'), P('tilt','Suavidade do timbre',0,1,0.5,'lin','%'), B('whisper','Sussurrado',false)]
    .forEach(d => box.appendChild(control(d, VS.voice, () => {}, () => {})));
}
function updatePhon(){ const el2 = $('vPhon'); if (!el2) return; const t = $('vText').value.slice(0, 300); el2.textContent = t ? 'Como será lido: ' + phonemeString(applyLexicon(t)) : ''; }
function renderProcCtl(){
  const box = $('vProcCtl'); if (!box) return; box.innerHTML = '';
  const choice = (k, l, opts) => C(k, l, opts, VS.proc[k]);
  [P('pitch','Altura',-24,24,0,'lin','st'), P('formant','Formantes (timbre)',0.5,2,1,'log','x'), P('speed','Velocidade da fala',0.5,2,1,'log','x'),
   choice('effect','Efeito', Object.keys(VOICE_EFFECTS)), choice('eq','Tratamento', Object.keys(VOICE_EQ)), choice('reverb','Ambiente', VOICE_REV),
   P('reverbMix','Quantidade de ambiente',0,1,0.15,'lin','%'), P('denoise','Redução de ruído',0,1,0,'lin','%',{off:v=>v<=0}), P('drive','Saturação',0,1,0,'lin','%',{off:v=>v<=0}),
   P('lufs','Loudness final',-30,-10,-16,'lin','LUFS'), P('pauseMs','Pausa entre falas (roteiro)',0,2000,350,'lin','ms')]
    .forEach(d => box.appendChild(control(d, VS.proc, () => {}, () => {})));
}
function setVoiceSrc(id){ VS.src = id; VS.out = null; drawVoice(); const c = CLIPS.get(id); if (c) previewPCM(c.L, c.R, c.sr); }
function drawVoice(){
  const c = CLIPS.get(VS.out || VS.src), {ctx, w, h} = fit($('voWave')); ctx.clearRect(0, 0, w, h); if (!c) return;
  ctx.fillStyle = VS.out ? cssv('--accent') : cssv('--wave2'); const n = c.L.length, spp = n/w;
  for (let x=0; x<w; x++){ let pk = 0; for (let i=Math.floor(x*spp); i<Math.min(n, (x+1)*spp); i+=4) pk = Math.max(pk, Math.abs(c.L[i])); ctx.fillRect(x, h/2 - pk*h*0.45, 1, pk*h*0.9 + 1); }
  const a = analyze({L: c.L, R: c.R, sr: c.sr}), f0 = yinPitch(c.L, c.sr, Math.floor(c.L.length/3), 8192);
  $('vInfo').textContent = `${VS.out ? 'Processada' : 'Original'}: ${c.name} · ${fmtS(a.dur)} · ${isFinite(a.lufs) ? a.lufs.toFixed(1) : '−∞'} LUFS${f0 ? ` · altura ≈ ${Math.round(f0)} Hz (${midiName(hzToMidi(f0))})` : ''}`;
}
let vRecState = null;
async function toggleVoiceRec(){
  if (vRecState){ vRecState.stop(); return; }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false, noiseSuppression:false, autoGainControl:false}});
    const rec = new MediaRecorder(stream), chunks = []; rec.ondataavailable = e => chunks.push(e.data);
    rec.onstop = async () => { stream.getTracks().forEach(t => t.stop()); vRecState = null; $('vRec').textContent = '🎙 Gravar'; $('vRec').classList.remove('rec');
      try { setVoiceSrc(await decodeToClip('Gravação ' + new Date().toLocaleTimeString('pt-BR'), await new Blob(chunks).arrayBuffer(), 'voz')); } catch(e){ toast('Falha na gravação'); } };
    rec.start(); vRecState = rec; $('vRec').textContent = '■ Parar'; $('vRec').classList.add('rec');
  } catch(e){ toast('Microfone indisponível'); }
}
let dict = null;
async function toggleDictation(){
  if (dict){ dict.stop(); return; }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition; if (!SR){ toast('Este navegador não tem reconhecimento de fala (use Chrome ou Edge)'); return; }
  const r = new SR(), finals = [], t0 = performance.now(); r.lang = 'pt-BR'; r.continuous = true; r.interimResults = true;
  let stream = null, rec = null, chunks = [];
  try { stream = await navigator.mediaDevices.getUserMedia({audio: true}); rec = new MediaRecorder(stream); rec.ondataavailable = e => chunks.push(e.data); rec.start(); } catch(e){}
  r.onresult = e => { let interim = ''; for (let i=e.resultIndex; i<e.results.length; i++){ const res = e.results[i]; if (res.isFinal) finals.push({text: res[0].transcript.trim(), end: (performance.now() - t0)/1000}); else interim += res[0].transcript; }
    $('tOut').value = finals.map(f => f.text).join(' ') + (interim ? ' ' + interim : ''); };
  r.onend = async () => { dict = null; $('tDict').textContent = '📝 Ditado → texto e legendas'; $('tDict').classList.remove('rec');
    if (rec){ rec.onstop = async () => { stream.getTracks().forEach(t => t.stop()); try { setVoiceSrc(await decodeToClip('Ditado', await new Blob(chunks).arrayBuffer(), 'voz')); } catch(e){} }; rec.stop(); }
    if (finals.length && await askConfirm('Baixar as legendas (.srt)?')){
      const ts = t => { const ms = Math.round(t*1000); return `${String(Math.floor(ms/3600000)).padStart(2,'0')}:${String(Math.floor(ms/60000)%60).padStart(2,'0')}:${String(Math.floor(ms/1000)%60).padStart(2,'0')},${String(ms%1000).padStart(3,'0')}`; };
      let prev = 0; const srt = finals.map((f, i) => { const s = `${i+1}\n${ts(prev)} --> ${ts(f.end)}\n${f.text}\n`; prev = f.end; return s; }).join('\n');
      download(new Blob([srt], {type:'text/plain'}), 'legendas.srt');
    } };
  r.onerror = e => toast('Ditado: ' + e.error);
  r.start(); dict = r; $('tDict').textContent = '■ Parar ditado'; $('tDict').classList.add('rec');
}
function savePersonas(){ LS.set('nexi-sfx-personas', VS.personas); renderPersonas(); renderScriptMap(); }
function renderPersonas(){
  const box = $('pList'); if (!box) return; box.innerHTML = '';
  if (!VS.personas.length){ box.innerHTML = '<div class="empty">Nenhuma persona. Ajuste a voz e salve, crie pela descrição ou capture o timbre de uma gravação.</div>'; return; }
  VS.personas.forEach((p, i) => {
    const it = el('div', 'item', `<span class="nm" title="${esc(p.desc || '')}">${esc(p.name)}</span><span class="cat">${Math.round(p.voice.f0)} Hz${p.proc.effect && p.proc.effect !== 'Nenhum' ? ' · ' + esc(p.proc.effect) : ''}</span><button title="Ouvir">▶</button><button title="Excluir">✕</button>`);
    const [bp, bx] = it.querySelectorAll('button');
    it.onclick = () => { VS.voice = {...p.voice}; VS.proc = {...defaultVoiceProc(), ...p.proc}; $('pName').value = p.name; $('pDesc').value = p.desc || ''; renderProcCtl(); renderTtsCtl(); toast('Persona carregada: ' + p.name); };
    bp.onclick = e => { e.stopPropagation(); busy('Sintetizando…', async () => { const id = speakToClip(`Olá, eu sou ${p.name}.`, p.voice); const r = await processVoice(CLIPS.get(id), {...defaultVoiceProc(), ...p.proc}); CLIPS.delete(id); previewPCM(r.L, r.R, r.sr); }); };
    bx.onclick = async e => { e.stopPropagation(); if (await askConfirm(`Excluir a persona "${p.name}"?`)){ VS.personas.splice(i, 1); savePersonas(); } };
    box.appendChild(it);
  });
}
async function createPersonaAI(){
  const desc = $('pDesc').value.trim(); if (!desc) throw new Error('descreva a persona');
  const schema = {type:'object', additionalProperties:false, required:['name','summary','f0','scale','speed','expr','breath','rough','tilt','pitch','formant','effect','eq','reverb','reverbMix','pauseMs'], properties:{
    name:{type:'string'}, summary:{type:'string'}, f0:{type:'number', description:'altura média da fala em Hz (homem 90-140, mulher 170-240, criança 250-320)'},
    scale:{type:'number', description:'tamanho do trato vocal: 0.85 (grande) a 1.35 (criança)'}, speed:{type:'number', description:'0.7 a 1.4'}, expr:{type:'number', description:'expressividade da entonação 0 a 2'},
    breath:{type:'number', description:'sopro 0 a 1'}, rough:{type:'number', description:'rouquidão 0 a 1'}, tilt:{type:'number', description:'suavidade 0 a 1'},
    pitch:{type:'number', description:'transposição extra em semitons, normalmente 0'}, formant:{type:'number', description:'formantes extra, normalmente 1'},
    effect:{type:'string', enum: Object.keys(VOICE_EFFECTS)}, eq:{type:'string', enum: Object.keys(VOICE_EQ)}, reverb:{type:'string', enum: VOICE_REV}, reverbMix:{type:'number'}, pauseMs:{type:'number'}}};
  const j = await claudeJSON(`Configure uma persona para um sintetizador de voz por formantes. Descrição: "${desc}". Use valores naturais, a menos que a descrição peça algo estilizado.`, schema, 'Você é diretor de dublagem e engenheiro de áudio. Retorne só o JSON pedido.');
  VS.voice = {f0: clamp(j.f0, 60, 400), scale: clamp(j.scale, 0.75, 1.5), speed: clamp(j.speed, 0.5, 1.8), expr: clamp(j.expr, 0, 2), breath: clamp(j.breath, 0, 1), rough: clamp(j.rough, 0, 1), tilt: clamp(j.tilt, 0, 1)};
  VS.proc = {...defaultVoiceProc(), pitch: clamp(j.pitch, -12, 12), formant: clamp(j.formant, 0.6, 1.6), effect: j.effect, eq: j.eq, reverb: j.reverb, reverbMix: clamp(j.reverbMix, 0, 1), pauseMs: clamp(j.pauseMs, 0, 2000)};
  $('pName').value = j.name; $('pDesc').value = desc + (j.summary ? `\n— ${j.summary}` : '');
  renderTtsCtl(); renderProcCtl(); setVoiceSrc(speakToClip('Olá! É assim que eu falo.', VS.voice));
}
function parseScript(t){ return t.split('\n').map(l => l.trim()).filter(Boolean).map(l => { const m = l.match(/^([^:]{1,40}):\s*(.+)$/); return m ? {who: m[1].trim(), text: m[2].trim()} : {who: 'Narrador', text: l}; }); }
const scriptCast = {};
function renderScriptMap(){
  const box = $('sMap'); if (!box) return; const who = [...new Set(parseScript($('sText').value).map(x => x.who))]; box.innerHTML = '';
  const builtIn = Object.keys(TTS_VOICES);
  who.forEach((w, wi) => {
    const row = el('div', 'ctl'); row.appendChild(el('label', null, esc(w))); const s = el('select');
    VS.personas.forEach(p => s.appendChild(Object.assign(el('option', null, '⭐ ' + esc(p.name)), {value: 'p:' + p.name})));
    builtIn.forEach(v => s.appendChild(Object.assign(el('option', null, esc(v)), {value: 'v:' + v})));
    const auto = VS.personas.find(p => p.name.toLowerCase() === w.toLowerCase()) ? 'p:' + VS.personas.find(p => p.name.toLowerCase() === w.toLowerCase()).name : 'v:' + builtIn[[1, 2, 0, 4, 6, 5][wi % 6]];
    s.value = scriptCast[w] || auto; scriptCast[w] = s.value; s.onchange = () => scriptCast[w] = s.value; row.appendChild(s); box.appendChild(row);
  });
}
async function readScript(toMixer){
  const lines = parseScript($('sText').value); if (!lines.length) throw new Error('roteiro vazio');
  const sr = 48000, rendered = [];
  for (let i=0; i<lines.length; i++){
    const ln = lines[i], cast = scriptCast[ln.who] || 'v:Masculina';
    const p = cast.startsWith('p:') ? VS.personas.find(x => x.name === cast.slice(2)) : null;
    const voice = p ? p.voice : TTS_VOICES[cast.slice(2)] || VS.voice, proc = p ? {...defaultVoiceProc(), ...p.proc} : {...defaultVoiceProc(), pauseMs: VS.proc.pauseMs};
    setStatus(`Fala ${i+1}/${lines.length} (${ln.who})…`);
    const raw = speak(applyLexicon(ln.text), voice, TTS_SR, hashStr(ln.who + ln.text));
    const r = await processVoice(raw, proc); rendered.push({who: ln.who, r: {L: resampleTo(r.L, r.sr, sr), R: resampleTo(r.R, r.sr, sr), sr}, pause: proc.pauseMs/1000});
  }
  if (!toMixer){ let n = 0; rendered.forEach(x => n += x.r.L.length + Math.round(x.pause*sr)); const L = new Float32Array(n), R = new Float32Array(n); let o = 0;
    rendered.forEach(x => { L.set(x.r.L, o); R.set(x.r.R, o); o += x.r.L.length + Math.round(x.pause*sr); }); previewPCM(L, R, sr); return; }
  let t = 0.3;
  rendered.forEach((x, i) => { const id = addClip(`${x.who} ${i+1}`, x.r, 'voz'); addClipToMix(id, t, 'Voz · ' + x.who); t += x.r.L.length/sr + x.pause; });
  toast(`${rendered.length} falas enviadas ao mixer`); showModule('mix');
}
MODULE_SHOW.voice = () => { if (!$('vText')) buildVoiceUI(); refreshApiBadges(); };
