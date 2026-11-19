"use strict";
/* ======================================================================
   Laboratório de voz: TTS, gravação, troca de voz, efeitos, personas,
   leitor de roteiro, ferramentas ElevenLabs (clonar, criar, STS, isolar,
   transcrever, dublar)
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
const VS = {src: null, out: null, proc: defaultVoiceProc(), tts: {voiceId:'', model:'eleven_multilingual_v2', stability:0.5, similarity:0.75, style:0.15, speed:1}, voices: [], personas: LS.get('nexi-sfx-personas', [])};

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

/* ---------------- ElevenLabs ---------------- */
async function loadVoices(){
  try { const r = await (await xi('/v1/voices')).json(); VS.voices = (r.voices || []).map(v => ({id: v.voice_id, name: v.name, labels: v.labels || {}}));
    if (!VS.tts.voiceId && VS.voices[0]) VS.tts.voiceId = VS.voices[0].id; renderVoiceSelects(); toast(`${VS.voices.length} vozes carregadas`);
  } catch(e){ toast(e.message); }
}
async function ttsEleven(text, tts, name){
  const body = {text, model_id: tts.model, voice_settings: {stability: tts.stability, similarity_boost: tts.similarity, style: tts.style, use_speaker_boost: true, speed: tts.speed}};
  return xiAudio(`/v1/text-to-speech/${encodeURIComponent(tts.voiceId)}?output_format=mp3_44100_128`, {json: body}, name, 'voz');
}
async function xiTry(paths, opts){ let last; for (const p of paths){ try { return await xi(p, opts); } catch(e){ last = e; if (!/40[45]/.test(e.message)) throw e; } } throw last; }
async function designVoice(description, sampleText){
  const res = await xiTry(['/v1/text-to-voice/design', '/v1/text-to-voice/create-previews'], {json: {voice_description: description, text: sampleText, model_id: 'eleven_multilingual_ttv_v2'}});
  const j = await res.json(); return j.previews || [];
}
async function saveDesignedVoice(name, description, genId){
  const res = await xiTry(['/v1/text-to-voice', '/v1/text-to-voice/create-voice-from-preview'], {json: {voice_name: name, voice_description: description, generated_voice_id: genId}});
  return (await res.json()).voice_id;
}
function b64ToArrayBuffer(b64){ const s = atob(b64), u = new Uint8Array(s.length); for (let i=0; i<s.length; i++) u[i] = s.charCodeAt(i); return u.buffer; }
function wordsToSRT(words){
  const ws = (words || []).filter(w => w.type !== 'spacing' && w.text?.trim()); const cues = []; let cur = null;
  ws.forEach(w => { if (!cur || w.end - cur.start > 4 || cur.text.length > 70){ cur = {start: w.start, end: w.end, text: w.text}; cues.push(cur); } else { cur.end = w.end; cur.text += ' ' + w.text; } });
  const ts = t => { const ms = Math.round(t*1000), h = Math.floor(ms/3600000), m = Math.floor(ms/60000)%60, s = Math.floor(ms/1000)%60; return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')},${String(ms%1000).padStart(3,'0')}`; };
  return cues.map((c, i) => `${i+1}\n${ts(c.start)} --> ${ts(c.end)}\n${c.text.trim()}\n`).join('\n');
}

/* ---------------- UI ---------------- */
function vCard(title, inner, need){ return `<div class="card"${need ? ` data-need="${need}"` : ''}><h2>${title}${need ? `<span class="badge">${need === 'eleven' ? 'ElevenLabs' : 'Claude'}</span>` : ''}</h2>${inner}</div>`; }
function buildVoiceUI(){
  $('voiceRoot').innerHTML = `
  <div class="vgrid">
   <div>
    ${vCard('1 · Fonte da voz', `
      <div class="tabs"><button class="on" data-vt="tts">Texto → fala</button><button data-vt="rec">Gravar / importar</button></div>
      <div id="vtTTS">
        <textarea id="vText" rows="4" placeholder="Digite o texto que a voz vai ler…">Olá! Eu sou a voz do NEXI. Posso narrar, dublar e interpretar qualquer personagem.</textarea>
        <div class="row" style="margin-top:6px"><select id="vVoice" class="grow"></select><button class="btn sm" id="vLoadVoices">↻ Vozes</button></div>
        <div class="row" style="margin-top:6px"><select id="vModel" class="grow">
          <option value="eleven_multilingual_v2">Multilingual v2 (qualidade)</option><option value="eleven_v3">Eleven v3 (expressiva)</option>
          <option value="eleven_turbo_v2_5">Turbo v2.5 (rápida)</option><option value="eleven_flash_v2_5">Flash v2.5 (mais rápida)</option></select></div>
        <div id="vTtsCtl"></div>
        <div class="row" style="margin-top:6px"><button class="btn pri grow" id="vSpeak">🗣 Gerar fala (ElevenLabs)</button><button class="btn sm" id="vSys" title="Prévia com voz do sistema (não exporta)">Prévia do sistema</button></div>
      </div>
      <div id="vtREC" hidden>
        <div class="row"><button class="btn pri grow" id="vRec">🎙 Gravar</button><button class="btn grow" id="vImport">📂 Importar áudio</button></div>
        <div class="hint">Grave em ambiente silencioso. Use “Redução de ruído” no processamento se precisar.</div>
      </div>
      <div class="viz" style="margin-top:8px"><canvas id="voWave" style="height:90px"></canvas></div>
      <div class="row" style="margin-top:6px"><button class="btn sm" id="vPlaySrc">▶ Original</button><button class="btn sm" id="vPlayOut">▶ Processada</button><button class="btn sm" id="vToMix">→ Mixer</button><button class="btn sm" id="vToSfx">→ Camada SFX</button><button class="btn sm" id="vDl">⬇ WAV</button></div>
      <div class="hint" id="vInfo">Nenhuma voz ainda.</div>`)}
    ${vCard('2 · Transformar a voz (local)', `
      <div class="row"><select id="vPreset" class="grow"><option value="">Predefinição de voz…</option>${Object.keys(VOICE_PRESETS).map(k => `<option>${esc(k)}</option>`).join('')}</select></div>
      <div id="vProcCtl"></div>
      <div class="row" style="margin-top:6px"><button class="btn pri grow" id="vApply">✨ Aplicar processamento</button></div>`)}
   </div>
   <div>
    ${vCard('3 · Personas leitoras', `
      <div class="row"><input type="text" id="pName" placeholder="Nome da persona" class="grow"><button class="btn sm" id="pSave">⭐ Salvar atual</button></div>
      <textarea id="pDesc" rows="2" placeholder="Descreva a persona (ex.: narradora calma de documentário, 40 anos, voz quente e grave)"></textarea>
      <div class="row" style="margin-top:4px"><button class="btn sm grow" id="pAI" data-need="anthropic">🤖 Criar persona com IA</button><button class="btn sm grow" id="pDesign" data-need="eleven">🎨 Criar voz nova a partir da descrição</button></div>
      <div class="list" id="pList" style="margin-top:8px;max-height:220px"></div>`)}
    ${vCard('4 · Leitor de roteiro (vários personagens)', `
      <textarea id="sText" rows="6" placeholder="Narrador: Era uma noite fria.&#10;Ana: Você ouviu isso?&#10;Narrador: Ninguém respondeu."></textarea>
      <div class="row" style="margin-top:4px"><input type="text" id="sPrompt" class="grow" placeholder="Ou peça um roteiro: ‘diálogo de 30 s entre um robô e uma criança’"><button class="btn sm" id="sGen" data-need="anthropic">🤖 Escrever</button></div>
      <div id="sMap" style="margin-top:6px"></div>
      <div class="row" style="margin-top:6px"><button class="btn pri grow" id="sRead" data-need="eleven">🎬 Ler roteiro e enviar ao mixer</button></div>`)}
    ${vCard('5 · Ferramentas de IA de voz', `
      <div class="toolgrid">
        <button class="btn" id="tClone">🧬 Clonar voz (amostras)</button>
        <button class="btn" id="tSTS">🔁 Trocar voz (fala → fala)</button>
        <button class="btn" id="tIsolate">🎧 Isolar voz (remover fundo)</button>
        <button class="btn" id="tSTT">📝 Transcrever + legendas SRT</button>
        <button class="btn" id="tDub">🌐 Dublar para outro idioma</button>
        <button class="btn" id="tSfx">💥 Efeito sonoro por texto</button>
      </div>
      <div class="hint">Estas ferramentas usam a API da ElevenLabs (e a Claude para traduzir na dublagem). As transformações da seção 2 rodam no seu navegador, sem internet.</div>
      <textarea id="tOut" rows="4" placeholder="Transcrições e resultados aparecem aqui" style="margin-top:6px"></textarea>`, 'eleven')}
   </div>
  </div>
  <input type="file" id="vFile" accept="audio/*,video/*" hidden><input type="file" id="vCloneFiles" accept="audio/*" multiple hidden>`;
  // abas fonte
  document.querySelectorAll('[data-vt]').forEach(b => b.onclick = () => { document.querySelectorAll('[data-vt]').forEach(x => x.classList.toggle('on', x === b)); $('vtTTS').hidden = b.dataset.vt !== 'tts'; $('vtREC').hidden = b.dataset.vt !== 'rec'; });
  const tc = $('vTtsCtl');
  [P('stability','Estabilidade',0,1,0.5,'lin','%'), P('similarity','Similaridade',0,1,0.75,'lin','%'), P('style','Exagero de estilo',0,1,0.15,'lin','%'), P('speed','Velocidade',0.7,1.2,1,'lin','x')]
    .forEach(d => tc.appendChild(control(d, VS.tts, () => {}, () => {})));
  $('vModel').onchange = () => VS.tts.model = $('vModel').value;
  $('vVoice').onchange = () => VS.tts.voiceId = $('vVoice').value;
  renderProcCtl(); renderVoiceSelects(); renderPersonas();
  $('vLoadVoices').onclick = loadVoices;
  $('vSpeak').onclick = () => busy('Gerando fala…', async () => { const t = $('vText').value.trim(); if (!t) throw new Error('digite um texto'); if (!VS.tts.voiceId) await loadVoices(); setVoiceSrc(await ttsEleven(t, VS.tts, t.slice(0, 30))); });
  $('vSys').onclick = () => { const u = new SpeechSynthesisUtterance($('vText').value); u.lang = 'pt-BR'; u.rate = VS.tts.speed; const v = speechSynthesis.getVoices().find(v => /pt/i.test(v.lang)); if (v) u.voice = v; speechSynthesis.cancel(); speechSynthesis.speak(u); };
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
  $('pSave').onclick = () => { const n = $('pName').value.trim() || 'Persona ' + (VS.personas.length + 1); VS.personas.unshift({name: n, desc: $('pDesc').value.trim(), tts: {...VS.tts}, proc: {...VS.proc}}); savePersonas(); toast('Persona salva'); };
  $('pAI').onclick = () => busy('Criando persona…', createPersonaAI);
  $('pDesign').onclick = () => busy('Criando voz…', designFromDesc);
  // roteiro
  $('sText').oninput = renderScriptMap; renderScriptMap();
  $('sGen').onclick = () => busy('Escrevendo roteiro…', async () => {
    const names = VS.personas.map(p => p.name).join(', ') || 'livre';
    const t = await claudeText(`Escreva um roteiro em português do Brasil para: ${$('sPrompt').value || 'uma cena curta'}.\nFormato obrigatório: uma fala por linha, "Personagem: fala". Use, se fizer sentido, estes personagens: ${names}. Inclua só o roteiro, sem títulos ou comentários.`);
    $('sText').value = t.trim(); renderScriptMap();
  });
  $('sRead').onclick = () => busy('Lendo roteiro…', readScript);
  // ferramentas
  $('tClone').onclick = () => $('vCloneFiles').click();
  $('vCloneFiles').onchange = async e => { const fs = [...e.target.files]; e.target.value = ''; if (!fs.length) return; await busy('Clonando voz…', async () => {
    const name = prompt('Nome da voz clonada:', 'Minha voz') || 'Minha voz', fd = new FormData(); fd.append('name', name); fs.forEach(f => fd.append('files', f, f.name));
    const j = await (await xi('/v1/voices/add', {form: fd})).json(); VS.tts.voiceId = j.voice_id; await loadVoices(); toast('Voz clonada: ' + name);
  }); };
  $('tSTS').onclick = () => busy('Trocando voz…', async () => { const c = CLIPS.get(VS.src); if (!c) throw new Error('carregue ou grave uma voz primeiro'); if (!VS.tts.voiceId) throw new Error('escolha a voz de destino');
    const fd = new FormData(); fd.append('audio', clipToWavBlob(c), 'voz.wav'); fd.append('model_id', 'eleven_multilingual_sts_v2');
    VS.out = await xiAudio(`/v1/speech-to-speech/${encodeURIComponent(VS.tts.voiceId)}?output_format=mp3_44100_128`, {form: fd}, c.name + ' (trocada)', 'voz'); drawVoice(); const o = CLIPS.get(VS.out); previewPCM(o.L, o.R, o.sr); });
  $('tIsolate').onclick = () => busy('Isolando voz…', async () => { const c = CLIPS.get(VS.src); if (!c) throw new Error('carregue um áudio primeiro'); const fd = new FormData(); fd.append('audio', clipToWavBlob(c), 'audio.wav');
    VS.out = await xiAudio('/v1/audio-isolation', {form: fd}, c.name + ' (isolada)', 'voz'); drawVoice(); });
  $('tSTT').onclick = () => busy('Transcrevendo…', async () => { const c = CLIPS.get(VS.src); if (!c) throw new Error('carregue um áudio primeiro'); const j = await transcribe(c);
    $('tOut').value = j.text || ''; if (j.words?.length && confirm('Baixar legendas .srt?')) download(new Blob([wordsToSRT(j.words)], {type:'text/plain'}), slug(c.name) + '.srt'); });
  $('tDub').onclick = () => busy('Dublando…', async () => { const c = CLIPS.get(VS.src); if (!c) throw new Error('carregue um áudio primeiro'); const lang = prompt('Idioma de destino:', 'inglês'); if (!lang) return;
    const j = await transcribe(c); const tr = await claudeText(`Traduza para ${lang}, mantendo tom, intenção e duração aproximada (mesmo número de frases). Responda só com a tradução.\n\n${j.text}`);
    $('tOut').value = tr.trim(); VS.out = await ttsEleven(tr.trim(), {...VS.tts, model: 'eleven_multilingual_v2'}, c.name + ' (' + lang + ')'); drawVoice(); });
  $('tSfx').onclick = () => busy('Gerando efeito…', async () => { const t = prompt('Descreva o efeito sonoro (em inglês funciona melhor):', 'heavy wooden door creaking open slowly'); if (!t) return;
    const id = await xiAudio('/v1/sound-generation', {json: {text: t, prompt_influence: 0.4}}, t.slice(0, 40), 'sfx'); const c = CLIPS.get(id); previewPCM(c.L, c.R, c.sr); toast('Efeito adicionado ao banco do mixer'); });
  refreshApiBadges();
}
async function transcribe(c){ const fd = new FormData(); fd.append('file', clipToWavBlob(c), 'audio.wav'); fd.append('model_id', 'scribe_v1'); return (await xi('/v1/speech-to-text', {form: fd})).json(); }
function renderProcCtl(){
  const box = $('vProcCtl'); if (!box) return; box.innerHTML = '';
  const choice = (k, l, opts) => C(k, l, opts, VS.proc[k]);
  [P('pitch','Altura',-24,24,0,'lin','st'), P('formant','Formantes (timbre)',0.5,2,1,'log','x'), P('speed','Velocidade da fala',0.5,2,1,'log','x'),
   choice('effect','Efeito', Object.keys(VOICE_EFFECTS)), choice('eq','Tratamento', Object.keys(VOICE_EQ)), choice('reverb','Ambiente', VOICE_REV),
   P('reverbMix','Quantidade de ambiente',0,1,0.15,'lin','%'), P('denoise','Redução de ruído',0,1,0,'lin','%',{off:v=>v<=0}), P('drive','Saturação',0,1,0,'lin','%',{off:v=>v<=0}),
   P('lufs','Loudness final',-30,-10,-16,'lin','LUFS'), P('pauseMs','Pausa entre falas (roteiro)',0,2000,350,'lin','ms')]
    .forEach(d => box.appendChild(control(d, VS.proc, () => {}, () => {})));
}
function renderVoiceSelects(){
  const s = $('vVoice'); if (!s) return; s.innerHTML = '';
  if (!VS.voices.length){ s.innerHTML = '<option value="">— clique em ↻ para carregar vozes —</option>'; return; }
  VS.voices.forEach(v => { const o = el('option', null, esc(v.name + (v.labels.accent ? ' · ' + v.labels.accent : '') + (v.labels.gender ? ' · ' + v.labels.gender : ''))); o.value = v.id; s.appendChild(o); });
  s.value = VS.tts.voiceId;
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
function savePersonas(){ LS.set('nexi-sfx-personas', VS.personas); renderPersonas(); renderScriptMap(); }
function renderPersonas(){
  const box = $('pList'); if (!box) return; box.innerHTML = '';
  if (!VS.personas.length){ box.innerHTML = '<div class="empty">Nenhuma persona. Ajuste voz e processamento e salve, ou crie com IA.</div>'; return; }
  VS.personas.forEach((p, i) => {
    const it = el('div', 'item', `<span class="nm" title="${esc(p.desc || '')}">${esc(p.name)}</span><span class="cat">${p.proc.pitch ? (p.proc.pitch > 0 ? '+' : '') + p.proc.pitch.toFixed(0) + 'st' : ''} ${esc(p.proc.effect !== 'Nenhum' ? p.proc.effect : '')}</span><button title="Ouvir">▶</button><button title="Excluir">✕</button>`);
    const [bp, bx] = it.querySelectorAll('button');
    it.onclick = () => { VS.tts = {...VS.tts, ...p.tts}; VS.proc = {...defaultVoiceProc(), ...p.proc}; $('pName').value = p.name; $('pDesc').value = p.desc || ''; renderProcCtl(); renderVoiceSelects(); $('vModel').value = VS.tts.model; toast('Persona carregada: ' + p.name); };
    bp.onclick = e => { e.stopPropagation(); busy('Gerando amostra…', async () => { const id = await ttsEleven(`Olá, eu sou ${p.name}.`, {...VS.tts, ...p.tts}, p.name); const r = await processVoice(CLIPS.get(id), {...defaultVoiceProc(), ...p.proc}); previewPCM(r.L, r.R, r.sr); }); };
    bx.onclick = e => { e.stopPropagation(); if (confirm(`Excluir a persona "${p.name}"?`)){ VS.personas.splice(i, 1); savePersonas(); } };
    box.appendChild(it);
  });
}
async function createPersonaAI(){
  const desc = $('pDesc').value.trim(); if (!desc) throw new Error('descreva a persona');
  const schema = {type:'object', additionalProperties:false, required:['name','summary','voice_description','pitch','formant','speed','effect','eq','reverb','reverbMix','stability','style','pauseMs'], properties:{
    name:{type:'string'}, summary:{type:'string'}, voice_description:{type:'string', description:'Descrição em inglês para gerar a voz (idade, gênero, sotaque, timbre, ritmo)'},
    pitch:{type:'number', description:'semitons, -12 a 12'}, formant:{type:'number', description:'0.6 a 1.6'}, speed:{type:'number', description:'0.7 a 1.3'},
    effect:{type:'string', enum: Object.keys(VOICE_EFFECTS)}, eq:{type:'string', enum: Object.keys(VOICE_EQ)}, reverb:{type:'string', enum: VOICE_REV},
    reverbMix:{type:'number'}, stability:{type:'number'}, style:{type:'number'}, pauseMs:{type:'number'}}};
  const j = await claudeJSON(`Crie as configurações de uma persona leitora para um gerador de voz. Descrição do usuário: "${desc}". Escolha valores sutis e naturais a menos que a descrição peça algo estilizado (robô, monstro, rádio etc.).`, schema,
    'Você é um diretor de dublagem e engenheiro de áudio. Retorne só o JSON pedido.');
  VS.proc = {...defaultVoiceProc(), pitch: clamp(j.pitch, -24, 24), formant: clamp(j.formant, 0.5, 2), speed: clamp(j.speed, 0.5, 2), effect: j.effect, eq: j.eq, reverb: j.reverb, reverbMix: clamp(j.reverbMix, 0, 1), pauseMs: clamp(j.pauseMs, 0, 2000)};
  VS.tts.stability = clamp(j.stability, 0, 1); VS.tts.style = clamp(j.style, 0, 1);
  $('pName').value = j.name; $('pDesc').value = desc + (j.summary ? `\n— ${j.summary}` : ''); $('pDesc').dataset.voiceDesc = j.voice_description;
  renderProcCtl(); toast('Persona criada. Clique em “Criar voz nova” para gerar o timbre, ou em Salvar.');
}
async function designFromDesc(){
  const desc = $('pDesc').dataset.voiceDesc || $('pDesc').value.trim(); if (!desc) throw new Error('descreva a voz');
  const previews = await designVoice(desc, 'Olá! Esta é uma prévia da nova voz criada para o NEXI. Que tal ela soa para você?');
  if (!previews.length) throw new Error('a ElevenLabs não retornou prévias');
  let chosen = 0;
  for (let i=0; i<previews.length; i++){ const id = await decodeToClip(`Prévia ${i+1}`, b64ToArrayBuffer(previews[i].audio_base_64), 'voz'); const c = CLIPS.get(id); previewPCM(c.L, c.R, c.sr);
    if (confirm(`Prévia ${i+1} de ${previews.length} tocando. Usar esta voz? (Cancelar = próxima)`)){ chosen = i; break; } chosen = -1; }
  if (chosen < 0) { toast('Nenhuma prévia escolhida'); return; }
  const name = $('pName').value.trim() || 'Voz NEXI';
  VS.tts.voiceId = await saveDesignedVoice(name, desc, previews[chosen].generated_voice_id);
  await loadVoices(); toast('Voz criada e selecionada: ' + name);
}
function parseScript(t){ return t.split('\n').map(l => l.trim()).filter(Boolean).map(l => { const m = l.match(/^([^:]{1,40}):\s*(.+)$/); return m ? {who: m[1].trim(), text: m[2].trim()} : {who: 'Narrador', text: l}; }); }
const scriptCast = {};
function renderScriptMap(){
  const box = $('sMap'); if (!box) return; const who = [...new Set(parseScript($('sText').value).map(x => x.who))]; box.innerHTML = '';
  who.forEach(w => {
    const row = el('div', 'ctl'); row.appendChild(el('label', null, esc(w))); const s = el('select');
    s.appendChild(Object.assign(el('option', null, '— voz atual —'), {value: ''}));
    VS.personas.forEach(p => s.appendChild(Object.assign(el('option', null, esc(p.name)), {value: p.name})));
    s.value = scriptCast[w] ?? (VS.personas.find(p => p.name.toLowerCase() === w.toLowerCase())?.name || '');
    scriptCast[w] = s.value; s.onchange = () => scriptCast[w] = s.value; row.appendChild(s); box.appendChild(row);
  });
}
async function readScript(){
  const lines = parseScript($('sText').value); if (!lines.length) throw new Error('roteiro vazio');
  const sr = 48000, rendered = [];
  for (let i=0; i<lines.length; i++){
    const ln = lines[i], p = VS.personas.find(x => x.name === scriptCast[ln.who]);
    const tts = p ? {...VS.tts, ...p.tts} : VS.tts, proc = p ? {...defaultVoiceProc(), ...p.proc} : VS.proc;
    setStatus(`Fala ${i+1}/${lines.length} (${ln.who})…`);
    const id = await ttsEleven(ln.text, tts, `${ln.who}: ${ln.text.slice(0, 24)}`); const raw = CLIPS.get(id); CLIPS.delete(id);
    const r = await processVoice(raw, proc); rendered.push({who: ln.who, r: {L: resampleTo(r.L, r.sr, sr), R: resampleTo(r.R, r.sr, sr), sr}, pause: proc.pauseMs/1000});
  }
  let t = 0.3;
  rendered.forEach((x, i) => { const id = addClip(`${x.who} ${i+1}`, x.r, 'voz'); addClipToMix(id, t, 'Voz · ' + x.who); t += x.r.L.length/sr + x.pause; });
  toast(`${rendered.length} falas enviadas ao mixer`); showModule('mix');
}
MODULE_SHOW.voice = () => { if (!$('vText')) buildVoiceUI(); refreshApiBadges(); };
