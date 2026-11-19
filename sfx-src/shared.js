"use strict";
/* ======================================================================
   Infraestrutura comum: abas, banco de clipes, DSP utilitário, APIs
   ====================================================================== */
let curModule = 'sfx';
function showModule(m){
  curModule = m;
  document.querySelectorAll('[data-mod]').forEach(s => s.hidden = s.dataset.mod !== m);
  document.querySelectorAll('#nav button').forEach(b => b.classList.toggle('on', b.dataset.go === m));
  const fn = MODULE_SHOW[m]; if (fn) fn();
  try { localStorage.setItem('nexi-sfx-tab', m); } catch(e){}
}
const MODULE_SHOW = {};
document.querySelectorAll('#nav button').forEach(b => b.onclick = () => showModule(b.dataset.go));

/* ---------------- Banco de clipes (qualquer áudio do app) ---------------- */
// clip: {id, name, sr, L, R, kind}
const CLIPS = new Map();
const clipListeners = [];
function addClip(name, r, kind = 'áudio'){
  const id = 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2,6);
  CLIPS.set(id, {id, name: String(name).slice(0,80), sr: r.sr, L: r.L, R: r.R || r.L, kind});
  clipListeners.forEach(f => f());
  return id;
}
function clipDur(c){ return c.L.length/c.sr; }
async function decodeToClip(name, arrayBuffer, kind){
  const buf = await ensureAC().decodeAudioData(arrayBuffer);
  const L = buf.getChannelData(0).slice(), R = (buf.numberOfChannels > 1 ? buf.getChannelData(1) : buf.getChannelData(0)).slice();
  return addClip(name, {sr: buf.sampleRate, L, R}, kind);
}
let previewSrc = null;
function previewPCM(L, R, sr){
  const c = ensureAC(); if (previewSrc){ try { previewSrc.stop(); } catch(e){} }
  const b = c.createBuffer(2, L.length, sr); b.copyToChannel(L, 0); b.copyToChannel(R || L, 1);
  const s = c.createBufferSource(); s.buffer = b; s.connect(monGain); s.start(); previewSrc = s; return s;
}
function stopPreview(){ if (previewSrc){ try { previewSrc.stop(); } catch(e){} previewSrc = null; } }

/* ---------------- DSP utilitário ---------------- */
function resampleTo(x, fromSr, toSr){
  if (fromSr === toSr) return x;
  const ratio = fromSr/toSr, n = Math.floor(x.length/ratio), y = new Float32Array(n);
  for (let i=0; i<n; i++) y[i] = hermite(x, i*ratio);
  return y;
}
function stretchResample(x, factor){ // muda duração e altura juntas (fator >1 = mais agudo e curto)
  const n = Math.floor(x.length/factor), y = new Float32Array(n);
  for (let i=0; i<n; i++) y[i] = hermite(x, i*factor);
  return y;
}
// WSOLA: muda a duração sem mudar a altura
function wsola(x, rate, sr){
  if (Math.abs(rate - 1) < 1e-3) return x.slice();
  const W = Math.round(0.04*sr), H = W >> 1, tol = Math.round(0.012*sr);
  const outN = Math.floor(x.length/rate) + W, y = new Float32Array(outN), norm = new Float32Array(outN);
  const win = new Float32Array(W); for (let i=0; i<W; i++) win[i] = 0.5 - 0.5*Math.cos(TAU*i/W);
  let prev = 0;
  for (let o=0; o + W < outN; o += H){
    const ideal = Math.round(o*rate);
    let best = ideal;
    if (o > 0){
      let bc = -Infinity; const nat = prev + H;
      for (let d=-tol; d<=tol; d+=2){
        const p = ideal + d; if (p < 0 || p + W >= x.length) continue;
        let c = 0; for (let i=0; i<W; i+=4) c += x[p+i]*x[nat+i] || 0;
        if (c > bc){ bc = c; best = p; }
      }
    }
    if (best + W >= x.length) break;
    for (let i=0; i<W; i++){ y[o+i] += x[best+i]*win[i]; norm[o+i] += win[i]; }
    prev = best;
  }
  for (let i=0; i<outN; i++) if (norm[i] > 1e-3) y[i] /= norm[i];
  let end = outN; while (end > 0 && norm[end-1] <= 1e-3) end--;
  return y.subarray(0, end).slice();
}
function pitchShift(x, semis, sr){
  if (!semis) return x.slice();
  const f = Math.pow(2, semis/12), st = wsola(x, 1/f, sr);
  const y = stretchResample(st, f), out = new Float32Array(x.length);
  out.set(y.subarray(0, Math.min(y.length, x.length))); return out;
}
// Processamento espectral: STFT -> fn(mag, phase, frameIndex) -> ISTFT
function stftProcess(x, n, hop, fn){
  const N = x.length, win = new Float32Array(n); for (let i=0; i<n; i++) win[i] = Math.sqrt(0.5 - 0.5*Math.cos(TAU*i/n));
  const y = new Float32Array(N + n), wsum = new Float32Array(N + n), re = new Float32Array(n), im = new Float32Array(n);
  const mag = new Float32Array(n/2+1), ph = new Float32Array(n/2+1); let f = 0;
  for (let s=-n; s<N; s+=hop, f++){
    for (let i=0; i<n; i++){ const j = s+i; re[i] = j >= 0 && j < N ? x[j]*win[i] : 0; im[i] = 0; }
    fft(re, im);
    for (let k=0; k<=n/2; k++){ mag[k] = Math.hypot(re[k], im[k]); ph[k] = Math.atan2(im[k], re[k]); }
    fn(mag, ph, f);
    for (let k=0; k<=n/2; k++){ re[k] = mag[k]*Math.cos(ph[k]); im[k] = mag[k]*Math.sin(ph[k]); if (k > 0 && k < n/2){ re[n-k] = re[k]; im[n-k] = -im[k]; } }
    for (let i=0; i<n; i++) im[i] = -im[i];
    fft(re, im);
    for (let i=0; i<n; i++){ const j = s+i; if (j >= 0 && j < N + n){ y[j] += re[i]/n*win[i]; wsum[j] += win[i]*win[i]; } }
  }
  const out = new Float32Array(N); for (let i=0; i<N; i++) out[i] = wsum[i] > 1e-6 ? y[i]/wsum[i] : 0;
  return out;
}
function spectralEnvelope(mag, width){
  const n = mag.length, lg = new Float32Array(n), env = new Float32Array(n);
  for (let k=0; k<n; k++) lg[k] = Math.log(mag[k] + 1e-9);
  // suavização em domínio log (média móvel dupla)
  const tmp = new Float32Array(n);
  for (let pass=0; pass<2; pass++){
    const src = pass ? tmp : lg, dst = pass ? env : tmp; let acc = 0, cnt = 0;
    for (let k=0; k<n + width; k++){
      if (k < n){ acc += src[k]; cnt++; }
      if (k - 2*width - 1 >= 0){ acc -= src[k-2*width-1]; cnt--; }
      const c = k - width; if (c >= 0 && c < n) dst[c] = acc/cnt;
    }
  }
  for (let k=0; k<n; k++) env[k] = Math.exp(env[k]);
  return env;
}
function formantShift(x, factor, sr){
  if (Math.abs(factor - 1) < 1e-3) return x.slice();
  const n = 2048, w = Math.max(3, Math.round(n/2*300/sr*2/8));
  return stftProcess(x, n, n/4, mag => {
    const env = spectralEnvelope(mag, w), m = mag.length;
    for (let k=1; k<m; k++){
      const src = k/factor, k0 = Math.floor(src), fr = src - k0;
      const e2 = k0 + 1 < m ? env[k0]*(1-fr) + env[k0+1]*fr : env[m-1]*0.1;
      mag[k] = mag[k]/env[k]*e2;
    }
  });
}
function robotize(x, sr, hz){
  const hop = Math.max(64, Math.round(sr/hz)), n = 1024;
  return stftProcess(x, n, Math.min(hop, n/2), (mag, ph) => { for (let k=0; k<ph.length; k++) ph[k] = 0; });
}
function whisperize(x){
  const r = mulberry32(5);
  return stftProcess(x, 512, 128, (mag, ph) => { for (let k=0; k<ph.length; k++) ph[k] = r()*TAU; });
}
function denoise(x, sr, amount){
  const n = 1024, hop = 256, frames = [];
  // perfil de ruído: 10% dos quadros mais silenciosos
  stftProcess(x, n, hop, mag => { let e = 0; for (let k=0; k<mag.length; k++) e += mag[k]; frames.push({e, m: mag.slice()}); });
  frames.sort((a, b) => a.e - b.e);
  const q = frames.slice(0, Math.max(1, Math.floor(frames.length*0.1))), prof = new Float32Array(n/2+1);
  q.forEach(f => { for (let k=0; k<prof.length; k++) prof[k] += f.m[k]/q.length; });
  const over = 1 + amount*2.5, floor = 0.06;
  return stftProcess(x, n, hop, mag => { for (let k=0; k<mag.length; k++){ const g = Math.max(floor, 1 - over*prof[k]/(mag[k] + 1e-9)); mag[k] *= g; } });
}
function yinPitch(x, sr, start = 0, len = 4096){
  const W = Math.min(len, x.length - start) >> 1; if (W < 256) return 0;
  const tauMax = Math.min(W, Math.floor(sr/40)), d = new Float32Array(tauMax);
  for (let tau=1; tau<tauMax; tau++){ let s = 0; for (let i=0; i<W; i++){ const v = x[start+i] - x[start+i+tau]; s += v*v; } d[tau] = s; }
  let run = 0;
  for (let tau=1; tau<tauMax; tau++){ run += d[tau]; d[tau] = d[tau]*tau/(run || 1); }
  const minTau = Math.floor(sr/2000);
  for (let tau=minTau; tau<tauMax-1; tau++){
    if (d[tau] < 0.15){ while (tau+1 < tauMax && d[tau+1] < d[tau]) tau++;
      const a = d[tau-1], b = d[tau], c = d[tau+1], p = tau + (a - c)/(2*(a - 2*b + c) || 1); return sr/p; }
  }
  return 0;
}
const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const hzToMidi = f => 69 + 12*Math.log2(f/440);
const midiName = m => NOTE_NAMES[((Math.round(m) % 12) + 12) % 12] + (Math.floor(Math.round(m)/12) - 1);

/* Cadeia de efeitos genérica (reaproveita o master do SFX) */
async function fxChain(L, R, sr, settings, opts = {}){
  const m = Object.assign(defaultMaster(), settings);
  let total = L.length; const tail = (m.revMix > 0 ? m.revPre + m.revDecay*1.1 : 0) + (m.dlyMix > 0 ? m.dlyTime*6 : 0);
  if (tail && opts.tail !== false){ total += Math.ceil(tail*sr); const l2 = new Float32Array(total), r2 = new Float32Array(total); l2.set(L); r2.set(R); L = l2; R = r2; }
  let [l, r] = await masterChain(L, R, sr, m); l = l.slice(); r = r.slice();
  if (m.width !== 1) for (let i=0; i<l.length; i++){ const md = (l[i]+r[i])/2, sd = (l[i]-r[i])/2*m.width; l[i] = md+sd; r[i] = md-sd; }
  return {L: l, R: r, sr};
}
async function reverbWet(L, R, sr, m){
  const N = L.length, ctx = new OfflineAudioContext(2, N, sr), b = ctx.createBuffer(2, N, sr); b.copyToChannel(L, 0); b.copyToChannel(R, 1);
  const s = ctx.createBufferSource(); s.buffer = b; const ir = irData(sr, m), ib = ctx.createBuffer(2, ir[0].length, sr); ib.copyToChannel(ir[0], 0); ib.copyToChannel(ir[1], 1);
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 150; const pre = ctx.createDelay(1); pre.delayTime.value = m.revPre;
  const cv = ctx.createConvolver(); cv.buffer = ib; s.connect(hp); hp.connect(pre); pre.connect(cv); cv.connect(ctx.destination); s.start();
  const r = await ctx.startRendering(); return [r.getChannelData(0), r.getChannelData(1)];
}
function normalizeLUFS(r, target, ceilDb = -1){
  const lu = measureLUFS(r.L, r.R, r.sr);
  if (isFinite(lu)){ const g = dbToGain(target - lu); for (let i=0; i<r.L.length; i++){ r.L[i] *= g; r.R[i] *= g; } }
  limiter(r.L, r.R, r.sr, dbToGain(ceilDb)); return r;
}

/* ---------------- Configurações / APIs ---------------- */
const KEYS_LS = 'nexi-sfx-keys';
const apiKeys = Object.assign({anthropic:'', eleven:''}, LS.get(KEYS_LS, {}));
function saveKeys(){ LS.set(KEYS_LS, apiKeys); refreshApiBadges(); }
function refreshApiBadges(){
  document.querySelectorAll('[data-need]').forEach(e => {
    const ok = !!apiKeys[e.dataset.need]; e.classList.toggle('locked', !ok);
    e.title = ok ? '' : 'Configure a chave em Configurações';
  });
}
let anthropicClient = null, anthropicKeyUsed = '';
async function getClaude(){
  if (!apiKeys.anthropic) throw new Error('Configure a chave da Anthropic em Configurações');
  if (!anthropicClient || anthropicKeyUsed !== apiKeys.anthropic){
    const mod = await import('https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@1.6.0/+esm');
    const Anthropic = mod.default || mod.Anthropic;
    // A chave é do próprio usuário e fica só neste navegador.
    anthropicClient = new Anthropic({apiKey: apiKeys.anthropic, dangerouslyAllowBrowser: true});
    anthropicKeyUsed = apiKeys.anthropic;
  }
  return anthropicClient;
}
// Pedido com saída JSON validada por esquema
async function claudeJSON(content, schema, system){
  const client = await getClaude();
  const stream = client.beta.messages.stream({
    model: 'claude-opus-5-5', max_tokens: 32000,
    betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default',
    thinking: {type: 'adaptive'}, output_config: {effort: 'medium', format: {type: 'json_schema', schema}},
    system, messages: [{role: 'user', content}],
  });
  const msg = await stream.finalMessage();
  if (msg.stop_reason === 'refusal') throw new Error('O modelo recusou este pedido');
  if (msg.stop_reason === 'max_tokens') throw new Error('Resposta incompleta (limite de tokens)');
  const txt = msg.content.filter(b => b.type === 'text').map(b => b.text).join('');
  return JSON.parse(txt);
}
async function claudeText(prompt, system){
  const client = await getClaude();
  const stream = client.beta.messages.stream({
    model: 'claude-opus-5-5', max_tokens: 32000,
    betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default',
    thinking: {type: 'adaptive'}, output_config: {effort: 'medium'},
    system, messages: [{role: 'user', content: prompt}],
  });
  const msg = await stream.finalMessage();
  if (msg.stop_reason === 'refusal') throw new Error('O modelo recusou este pedido');
  return msg.content.filter(b => b.type === 'text').map(b => b.text).join('');
}
/* ElevenLabs (REST) */
const XI = 'https://api.elevenlabs.io';
async function xi(path, opts = {}){
  if (!apiKeys.eleven) throw new Error('Configure a chave da ElevenLabs em Configurações');
  const headers = Object.assign({'xi-api-key': apiKeys.eleven}, opts.json ? {'Content-Type':'application/json'} : {}, opts.headers || {});
  const res = await fetch(XI + path, {method: opts.method || (opts.json || opts.form ? 'POST' : 'GET'), headers, body: opts.json ? JSON.stringify(opts.json) : opts.form});
  if (!res.ok){ let t = ''; try { t = (await res.text()).slice(0, 300); } catch(e){} throw new Error(`ElevenLabs ${res.status}: ${t}`); }
  return res;
}
async function xiAudio(path, opts, name, kind){ const res = await xi(path, opts); return decodeToClip(name, await res.arrayBuffer(), kind); }
function clipToWavBlob(c){ return new Blob([encodeWav({L: c.L, R: c.R, sr: c.sr}, 16, false)], {type:'audio/wav'}); }

/* ---------------- Configurações (UI) ---------------- */
function initSettings(){
  $('keyAnthropic').value = apiKeys.anthropic; $('keyEleven').value = apiKeys.eleven;
  $('bSaveKeys').onclick = () => { apiKeys.anthropic = $('keyAnthropic').value.trim(); apiKeys.eleven = $('keyEleven').value.trim(); anthropicClient = null; saveKeys(); toast('Chaves salvas neste navegador'); };
  $('bClearKeys').onclick = () => { apiKeys.anthropic = apiKeys.eleven = ''; $('keyAnthropic').value = $('keyEleven').value = ''; anthropicClient = null; saveKeys(); toast('Chaves apagadas'); };
  $('bTestKeys').onclick = async () => {
    const out = [];
    if (apiKeys.eleven){ try { const r = await (await xi('/v1/voices')).json(); out.push(`ElevenLabs OK (${r.voices?.length ?? 0} vozes)`); } catch(e){ out.push('ElevenLabs: ' + e.message); } }
    if (apiKeys.anthropic){ try { const t = await claudeText('Responda só: ok'); out.push('Anthropic OK: ' + t.trim().slice(0, 20)); } catch(e){ out.push('Anthropic: ' + e.message); } }
    $('keyStatus').textContent = out.join(' · ') || 'Nenhuma chave configurada.';
  };
  refreshApiBadges();
}
