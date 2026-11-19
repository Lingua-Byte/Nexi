"use strict";
/* ======================================================================
   Master: mixagem, cadeia de efeitos (OfflineAudioContext), limitador,
   loudness (ITU-R BS.1770), true peak, WAV e ZIP
   ====================================================================== */
function satCurve(type, drive){
  const n = 4096, c = new Float32Array(n), g = 1 + drive*drive*24, tg = Math.tanh(g);
  for (let i=0; i<n; i++){
    const x = i/(n-1)*2 - 1; let y;
    if (type === 'Válvula') y = x >= 0 ? Math.tanh(g*x)/tg : Math.tanh(g*x*1.4)/(1.4*tg);
    else if (type === 'Fuzz') y = Math.sign(x)*(1 - Math.exp(-Math.abs(x)*g*2))/(1 - Math.exp(-g*2));
    else y = Math.tanh(g*x)/tg;
    c[i] = y;
  }
  return c;
}
const irCache = new Map();
function irData(sr, m){
  const key = [sr, m.revSize, m.revDecay, m.revDamp, m.revWidth].map(v => (+v).toFixed(3)).join('|');
  if (irCache.has(key)) return irCache.get(key);
  const len = Math.ceil((m.revDecay*1.15 + 0.05)*sr), ch = [new Float32Array(len), new Float32Array(len)];
  const rnd = mulberry32(7741), fadeIn = Math.max(1, Math.floor((0.002 + m.revSize*0.04)*sr));
  for (let c=0; c<2; c++){
    const d = ch[c], nE = 10 + Math.floor(m.revSize*14), span = 0.01 + m.revSize*0.09;
    for (let e=0; e<nE; e++){
      const t = 0.002 + Math.pow(rnd(), 1.4)*span, idx = Math.floor(t*sr);
      if (idx < len) d[idx] += (rnd() < 0.5 ? -1 : 1)*(1 - 0.7*t/span)*0.8;
    }
    let lp = 0;
    for (let i=0; i<len; i++){
      const t = i/sr, env = Math.exp(-6.9078*t/m.revDecay);
      const fc = Math.max(400, 18000*Math.pow(2, -m.revDamp*7*t/m.revDecay)), a = Math.exp(-TAU*fc/sr);
      lp = (1-a)*(rnd()*2-1) + a*lp;
      d[i] += lp*env*(i < fadeIn ? i/fadeIn : 1)*0.6;
    }
  }
  const w = m.revWidth;
  if (w < 1) for (let i=0; i<len; i++){ const l = ch[0][i], r = ch[1][i]; ch[0][i] = l*(1+w)/2 + r*(1-w)/2; ch[1][i] = r*(1+w)/2 + l*(1-w)/2; }
  if (irCache.size > 12) irCache.clear();
  irCache.set(key, ch);
  return ch;
}

async function masterChain(L, R, sr, m){
  const N = L.length, ctx = new OfflineAudioContext(2, N, sr);
  const buf = ctx.createBuffer(2, N, sr); buf.copyToChannel(L, 0); buf.copyToChannel(R, 1);
  const src = ctx.createBufferSource(); src.buffer = buf;
  const bq = (type, f, q, g) => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = Math.min(f, sr*0.49); if (q != null) b.Q.value = q; if (g != null) b.gain.value = g; return b; };
  let node = src;
  const chain = [bq('highpass', Math.max(10, m.hp), 0.707)];
  if (m.lp < 19990) chain.push(bq('lowpass', m.lp, 0.707));
  if (m.low) chain.push(bq('lowshelf', 120, null, m.low));
  if (m.mid) chain.push(bq('peaking', m.midF, m.midQ, m.mid));
  if (m.high) chain.push(bq('highshelf', 8000, null, m.high));
  if (m.drive > 0){ const ws = ctx.createWaveShaper(); ws.curve = satCurve(m.satType, m.drive); ws.oversample = '4x'; chain.push(ws); }
  chain.forEach(n => { node.connect(n); node = n; });
  if (m.ratio > 1.01){
    const c = ctx.createDynamicsCompressor(); c.threshold.value = m.thr; c.ratio.value = Math.min(20, m.ratio);
    c.attack.value = m.att; c.release.value = Math.min(1, m.rel); c.knee.value = 6;
    const mk = ctx.createGain(); mk.gain.value = dbToGain(m.makeup); node.connect(c); c.connect(mk); node = mk;
  }
  const out = ctx.createGain(); node.connect(out);
  if (m.dlyMix > 0){
    const dIn = ctx.createGain(); dIn.gain.value = m.dlyMix; dIn.channelCount = 1; dIn.channelCountMode = 'explicit';
    const dl = ctx.createDelay(4), dr = ctx.createDelay(4); dl.delayTime.value = dr.delayTime.value = m.dlyTime;
    const fl = ctx.createGain(), fr = ctx.createGain(); fl.gain.value = fr.gain.value = m.dlyFb;
    const tl = bq('lowpass', m.dlyTone, 0.5), tr = bq('lowpass', m.dlyTone, 0.5), mg = ctx.createChannelMerger(2);
    node.connect(dIn); dIn.connect(dl); dl.connect(tl); tl.connect(fl); fl.connect(dr); dr.connect(tr); tr.connect(fr); fr.connect(dl);
    tl.connect(mg, 0, 0); tr.connect(mg, 0, 1); mg.connect(out);
  }
  if (m.revMix > 0){
    const ir = irData(sr, m), ib = ctx.createBuffer(2, ir[0].length, sr); ib.copyToChannel(ir[0], 0); ib.copyToChannel(ir[1], 1);
    const pre = ctx.createDelay(1); pre.delayTime.value = m.revPre;
    const cv = ctx.createConvolver(); cv.buffer = ib;
    const wg = ctx.createGain(); wg.gain.value = m.revMix*1.4;
    node.connect(pre); pre.connect(cv); cv.connect(wg); wg.connect(out);
  }
  out.connect(ctx.destination); src.start(0);
  const res = await ctx.startRendering();
  return [res.getChannelData(0), res.getChannelData(1)];
}

function limiter(L, R, sr, ceil){
  const N = L.length, W = Math.max(1, Math.round(0.0015*sr)), need = new Float32Array(N);
  for (let i=0; i<N; i++){ const a = Math.max(Math.abs(L[i]), Math.abs(R[i])); need[i] = a > ceil ? ceil/a : 1; }
  const gmin = new Float32Array(N), dq = new Int32Array(N + W); let h = 0, t = 0;
  for (let i=N-1; i>=0; i--){ // mínimo deslizante para frente [i, i+W)
    while (t > h && need[dq[t-1]] >= need[i]) t--;
    dq[t++] = i;
    while (dq[h] >= i + W) h++;
    gmin[i] = need[dq[h]];
  }
  const rc = 1 - Math.exp(-1/(0.06*sr)); let acc = 0, g = 1;
  for (let i=0; i<N; i++){
    acc += gmin[i]; if (i >= W) acc -= gmin[i-W];
    const avg = acc/Math.min(i+1, W);
    g = avg < g ? avg : g + (avg - g)*rc;
    L[i] = clamp(L[i]*g, -ceil, ceil); R[i] = clamp(R[i]*g, -ceil, ceil);
  }
}

/* ---- Loudness ITU-R BS.1770 ---- */
function kFilters(sr){
  let f0 = 1681.974450955533, G = 3.999843853973347, Q = 0.7071752369554196, K = Math.tan(Math.PI*f0/sr);
  const Vh = Math.pow(10, G/20), Vb = Math.pow(Vh, 0.4996667741545416); let a0 = 1 + K/Q + K*K;
  const sh = {b0:(Vh + Vb*K/Q + K*K)/a0, b1:2*(K*K - Vh)/a0, b2:(Vh - Vb*K/Q + K*K)/a0, a1:2*(K*K-1)/a0, a2:(1 - K/Q + K*K)/a0};
  f0 = 38.13547087602444; Q = 0.5003270373238773; K = Math.tan(Math.PI*f0/sr); a0 = 1 + K/Q + K*K;
  const hp = {b0:1, b1:-2, b2:1, a1:2*(K*K-1)/a0, a2:(1 - K/Q + K*K)/a0};
  return [sh, hp];
}
function biquadRun(x, c){
  const y = new Float32Array(x.length); let x1=0, x2=0, y1=0, y2=0;
  for (let i=0; i<x.length; i++){ const v = c.b0*x[i] + c.b1*x1 + c.b2*x2 - c.a1*y1 - c.a2*y2; x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v; }
  return y;
}
function measureLUFS(L, R, sr){
  const [sh, hp] = kFilters(sr), kl = biquadRun(biquadRun(L, sh), hp), kr = biquadRun(biquadRun(R, sh), hp), N = L.length;
  const cs = new Float64Array(N+1); for (let i=0; i<N; i++) cs[i+1] = cs[i] + kl[i]*kl[i] + kr[i]*kr[i];
  const lk = z => -0.691 + 10*Math.log10(z + 1e-20), blk = Math.round(0.4*sr), hop = Math.round(0.1*sr);
  if (N < blk) return lk(cs[N]/Math.max(1, N));
  const pw = []; for (let s=0; s+blk<=N; s+=hop) pw.push((cs[s+blk] - cs[s])/blk);
  const g1 = pw.filter(z => lk(z) > -70); if (!g1.length) return -Infinity;
  const rel = lk(g1.reduce((a,b) => a+b, 0)/g1.length) - 10, g2 = g1.filter(z => lk(z) > rel);
  return lk(g2.reduce((a,b) => a+b, 0)/g2.length);
}
const TP_TAPS = (() => { const t = []; for (const fr of [0.25, 0.5, 0.75]){ const h = []; for (let k=-7; k<=8; k++){ const x = k - fr; const s = Math.sin(Math.PI*x)/(Math.PI*x); const w = 0.5 + 0.5*Math.cos(Math.PI*x/8.5); h.push(s*w); } t.push(h); } return t; })();
function truePeak(L, R){
  let pk = 0;
  for (const x of [L, R]){
    const N = x.length;
    for (let i=0; i<N; i++){
      const a = Math.abs(x[i]); if (a > pk) pk = a;
      if (a < pk*0.5) continue;
      for (const h of TP_TAPS){ let s = 0; for (let k=0; k<16; k++){ const j = i - 7 + k; if (j >= 0 && j < N) s += x[j]*h[k]; } if (Math.abs(s) > pk) pk = Math.abs(s); }
    }
  }
  return pk;
}
function analyze(r){
  const {L, R, sr} = r; let pk = 0, lr = 0, ll = 0, rr = 0;
  for (let i=0; i<L.length; i++){ pk = Math.max(pk, Math.abs(L[i]), Math.abs(R[i])); lr += L[i]*R[i]; ll += L[i]*L[i]; rr += R[i]*R[i]; }
  return {peak: gainToDb(pk), tp: gainToDb(truePeak(L, R)), lufs: measureLUFS(L, R, sr), corr: ll && rr ? lr/Math.sqrt(ll*rr) : 1, dur: L.length/sr};
}

/* ---- Render completo ---- */
async function renderSound(snd, sr, opt = {}){
  const m = snd.master, anySolo = snd.layers.some(l => l.on && l.solo);
  const act = snd.layers.filter((l, i) => opt.only != null ? i === opt.only : (l.on && (!anySolo || l.solo)));
  const rs = act.map(l => ({l, r: renderLayer(l, sr), off: Math.round(l.start*sr)}));
  let mixN = 1; rs.forEach(x => mixN = Math.max(mixN, x.off + x.r.N));
  let tail = 0;
  if (m.revMix > 0) tail += m.revPre + m.revDecay*1.15;
  if (m.dlyMix > 0) tail += Math.min(8, m.dlyTime*2*Math.log(0.001)/Math.log(Math.max(m.dlyFb, 0.02)));
  const total = Math.min(Math.ceil(45*sr), mixN + Math.ceil((tail + 0.05)*sr));
  let L = new Float32Array(total), R = new Float32Array(total);
  rs.forEach(({r, off}) => { for (let i=0; i<r.N && off+i<total; i++){ L[off+i] += r.L[i]; R[off+i] += r.R[i]; } });
  if (m.rate > 1 || m.bits > 0){
    const hold = m.rate|0, q = m.bits > 0 ? Math.pow(2, m.bits-1) : 0; let hl = 0, hr = 0;
    for (let i=0; i<total; i++){
      if (i % hold === 0){ hl = L[i]; hr = R[i]; }
      L[i] = q ? Math.round(hl*q)/q : hl; R[i] = q ? Math.round(hr*q)/q : hr;
    }
  }
  [L, R] = await masterChain(L, R, sr, m);
  L = L.slice(); R = R.slice();
  if (m.width !== 1) for (let i=0; i<total; i++){ const mid = (L[i]+R[i])/2, sd = (L[i]-R[i])/2*m.width; L[i] = mid+sd; R[i] = mid-sd; }
  // bloqueio de DC
  const dcA = Math.exp(-TAU*8/sr); let xl=0, yl=0, xr=0, yr=0;
  for (let i=0; i<total; i++){ const a = L[i], b = R[i]; yl = a - xl + dcA*yl; xl = a; yr = b - xr + dcA*yr; xr = b; L[i] = yl; R[i] = yr; }
  // cortar silêncio final
  let last = total - 1; while (last > 0 && Math.abs(L[last]) < 1e-4 && Math.abs(R[last]) < 1e-4) last--;
  const keep = Math.min(total, Math.max(mixN > 1 ? 1 : 0, last + Math.ceil(0.02*sr)));
  L = L.subarray(0, Math.max(1, keep)); R = R.subarray(0, Math.max(1, keep));
  const ceil = dbToGain(m.ceiling);
  if (!opt.raw){
    if (m.norm === 'lufs'){
      const lu = measureLUFS(L, R, sr);
      if (isFinite(lu)){ const g = dbToGain(m.lufs - lu); for (let i=0; i<L.length; i++){ L[i] *= g; R[i] *= g; } }
      limiter(L, R, sr, ceil);
    } else if (m.norm === 'peak'){
      limiter(L, R, sr, ceil);
      let pk = 0; for (let i=0; i<L.length; i++) pk = Math.max(pk, Math.abs(L[i]), Math.abs(R[i]));
      if (pk > 1e-6){ const g = ceil*0.97/pk; for (let i=0; i<L.length; i++){ L[i] *= g; R[i] *= g; } }
      const tp = truePeak(L, R);
      if (tp > ceil){ const g = ceil/tp; for (let i=0; i<L.length; i++){ L[i] *= g; R[i] *= g; } }
    } else limiter(L, R, sr, ceil);
  } else limiter(L, R, sr, 1);
  const fN = Math.min(L.length, Math.ceil(0.005*sr));
  for (let i=0; i<fN; i++){ const g = i/fN, j = L.length-1-i; L[j] *= g; R[j] *= g; }
  return {L, R, sr};
}

/* ---- WAV / ZIP ---- */
function encodeWav(r, bits, mono){
  const {L, R, sr} = r, n = L.length, ch = mono ? 1 : 2, bps = bits/8, fl = bits === 32;
  const fact = fl ? 12 : 0, dataLen = n*ch*bps, buf = new ArrayBuffer(44 + fact + dataLen), dv = new DataView(buf);
  const ws = (o, s) => { for (let i=0; i<s.length; i++) dv.setUint8(o+i, s.charCodeAt(i)); };
  ws(0,'RIFF'); dv.setUint32(4, 36 + fact + dataLen, true); ws(8,'WAVE');
  ws(12,'fmt '); dv.setUint32(16,16,true); dv.setUint16(20, fl ? 3 : 1, true); dv.setUint16(22, ch, true);
  dv.setUint32(24, sr, true); dv.setUint32(28, sr*ch*bps, true); dv.setUint16(32, ch*bps, true); dv.setUint16(34, bits, true);
  let o = 36;
  if (fl){ ws(o,'fact'); dv.setUint32(o+4, 4, true); dv.setUint32(o+8, n, true); o += 12; }
  ws(o,'data'); dv.setUint32(o+4, dataLen, true); o += 8;
  const rnd = mulberry32(99);
  for (let i=0; i<n; i++){
    for (let c=0; c<ch; c++){
      let v = mono ? (L[i]+R[i])*0.5 : (c ? R[i] : L[i]);
      if (bits === 32){ dv.setFloat32(o, v, true); }
      else if (bits === 24){ const s = clamp(Math.round(v*8388607), -8388608, 8388607); dv.setUint8(o, s & 255); dv.setUint8(o+1, (s>>8) & 255); dv.setUint8(o+2, (s>>16) & 255); }
      else { const s = clamp(Math.round(v*32767 + (rnd() - rnd())), -32768, 32767); dv.setInt16(o, s, true); }
      o += bps;
    }
  }
  return new Uint8Array(buf);
}
const CRC_T = (() => { const t = new Uint32Array(256); for (let n=0; n<256; n++){ let c = n; for (let k=0; k<8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(b){ let c = 0xFFFFFFFF; for (let i=0; i<b.length; i++) c = CRC_T[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function makeZip(files){
  const enc = new TextEncoder(), parts = [], cen = []; let off = 0;
  for (const f of files){
    const nm = enc.encode(f.name), crc = crc32(f.data), h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true);
    h.setUint32(14, crc, true); h.setUint32(18, f.data.length, true); h.setUint32(22, f.data.length, true); h.setUint16(26, nm.length, true);
    parts.push(new Uint8Array(h.buffer), nm, f.data);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true);
    c.setUint32(16, crc, true); c.setUint32(20, f.data.length, true); c.setUint32(24, f.data.length, true); c.setUint16(28, nm.length, true); c.setUint32(42, off, true);
    cen.push(new Uint8Array(c.buffer), nm);
    off += 30 + nm.length + f.data.length;
  }
  const cl = cen.reduce((a, b) => a + b.length, 0), e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, cl, true); e.setUint32(16, off, true);
  return new Blob([...parts, ...cen, new Uint8Array(e.buffer)], {type:'application/zip'});
}

/* ---- Variações (round-robin) ---- */
function varySound(snd, amt){
  const s = JSON.parse(JSON.stringify(snd)), j = r => (Math.random()*2-1)*r*amt;
  s.layers.forEach(l => {
    l.seed = (Math.random()*4294967295) >>> 0;
    l.pitch += j(0.8); l.vol += j(1.5);
    if (l.start > 0) l.start = Math.max(0, l.start*(1 + j(0.1)));
    l.env.d *= 1 + j(0.15);
    if (l.filter.type !== 'off') l.filter.freq = clamp(l.filter.freq*Math.pow(2, j(0.3)), 20, 20000);
    ENGINES[l.type].params.forEach(d => {
      if (d.s === 'choice' || d.s === 'bool' || d.s === 'int' || d.s === 'sample' || d.k === 'freq') return;
      l.p[d.k] = clamp(l.p[d.k] + j(0.05)*(d.max - d.min), d.min, d.max);
    });
  });
  return s;
}
