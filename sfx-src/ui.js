"use strict";
/* ======================================================================
   UI: estado, controles, editor de camadas, master, biblioteca
   ====================================================================== */
const $ = id => document.getElementById(id);
const el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; };
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtHz = h => h >= 1000 ? (h/1000).toFixed(h >= 10000 ? 1 : 2)+' kHz' : h.toFixed(h < 100 ? 1 : 0)+' Hz';
const fmtS = s => s < 1 ? (s*1000).toFixed(s < 0.01 ? 1 : 0)+' ms' : s.toFixed(2)+' s';
const LS = {
  get(k, d){ try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch(e){ return d; } },
  set(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch(e){ return false; } },
};
let toastT = 0;
function toast(m){ const t = $('toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 1800); }

/* ---------------- Estado ---------------- */
let S = null;            // som atual
let sel = 0;             // camada selecionada
let undoStack = [], redoStack = [];
function commit(){
  const j = JSON.stringify(S);
  if (undoStack[undoStack.length-1] !== j){ undoStack.push(j); if (undoStack.length > 200) undoStack.shift(); redoStack = []; }
}
function undo(){ if (undoStack.length < 2) return; redoStack.push(undoStack.pop()); S = JSON.parse(undoStack[undoStack.length-1]); afterLoad(true); }
function redo(){ if (!redoStack.length) return; const j = redoStack.pop(); undoStack.push(j); S = JSON.parse(j); afterLoad(true); }
function normalizeSound(s){
  const out = {name: String(s.name || 'Sem nome').slice(0,80), cat: s.cat || '', master: Object.assign(defaultMaster(), s.master || {}), layers: []};
  (s.layers || []).forEach(l => {
    if (!ENGINES[l.type]) return;
    const n = newLayer(l.type, l.seed);
    for (const k of ['name','on','solo','vol','pan','start','pitch','fine','drive']) if (l[k] !== undefined) n[k] = l[k];
    for (const k of ['env','pitchEnv','filter','mod','p']) if (l[k]) Object.assign(n[k], l[k]);
    out.layers.push(n);
  });
  return out;
}

/* ---------------- Controles genéricos ---------------- */
function toX(d, v){
  if (d.s === 'log') return Math.log(v/d.min)/Math.log(d.max/d.min);
  if (d.s === 'sq') return Math.sqrt(Math.max(0, (v-d.min)/(d.max-d.min)));
  return (v-d.min)/(d.max-d.min);
}
function fromX(d, x){
  if (d.s === 'log') return d.min*Math.pow(d.max/d.min, x);
  if (d.s === 'sq') return d.min + x*x*(d.max-d.min);
  const v = d.min + x*(d.max-d.min);
  return d.s === 'int' ? Math.round(v) : v;
}
function fmtVal(d, v){
  if (d.off && d.off(v)) return 'off';
  switch (d.u){
    case 'Hz': return fmtHz(v);
    case 's': return fmtS(v);
    case 'ms': return v.toFixed(0)+' ms';
    case 'dB': return (v > 0 ? '+' : '')+v.toFixed(1)+' dB';
    case 'LUFS': return v.toFixed(1);
    case 'st': return (v > 0 ? '+' : '')+v.toFixed(Math.abs(v) < 10 ? 2 : 1)+' st';
    case 'ct': return (v > 0 ? '+' : '')+v.toFixed(0)+' ct';
    case '%': return (v*100).toFixed(0)+'%';
    case 'x': return '×'+v.toFixed(v < 10 ? 3 : 1);
    case 'Q': return 'Q '+v.toFixed(2);
    case 'oct': return (v > 0 ? '+' : '')+v.toFixed(2)+' oit';
    case 'pan': return Math.abs(v) < 0.01 ? 'C' : (v < 0 ? 'E ' : 'D ')+Math.round(Math.abs(v)*100);
    case 'vow': return vowelFmt(v);
    case '/s': return v < 10 ? v.toFixed(1)+'/s' : Math.round(v)+'/s';
    case 'ratio': return v.toFixed(1)+':1';
    case 'bits': return v+' bits';
    case 'div': return '÷'+v;
    default: return d.s === 'int' ? String(v) : (+v).toFixed(2);
  }
}
function control(d, obj, onLive, onCommit){
  const row = el('div', 'ctl');
  const lab = el('label', null, esc(d.l)); lab.title = d.l; row.appendChild(lab);
  if (d.s === 'choice'){
    const s = el('select');
    d.c.forEach(c => { const o = el('option', null, esc(LABELS[c] || c[0].toUpperCase()+c.slice(1))); o.value = c; s.appendChild(o); });
    s.value = obj[d.k];
    s.onchange = () => { obj[d.k] = s.value; onCommit(d); };
    row.appendChild(s);
  } else if (d.s === 'bool'){
    row.classList.add('boolc');
    const c = el('input'); c.type = 'checkbox'; c.checked = !!obj[d.k];
    c.onchange = () => { obj[d.k] = c.checked; onCommit(d); };
    row.appendChild(c);
  } else {
    const r = el('input'); r.type = 'range'; r.min = 0; r.max = 1000; r.step = 1;
    const v = el('span', 'v');
    const sync = () => { r.value = Math.round(clamp(toX(d, obj[d.k]), 0, 1)*1000); v.textContent = fmtVal(d, obj[d.k]); v.classList.toggle('off', !!(d.off && d.off(obj[d.k]))); };
    r.oninput = () => { obj[d.k] = fromX(d, r.value/1000); v.textContent = fmtVal(d, obj[d.k]); v.classList.toggle('off', !!(d.off && d.off(obj[d.k]))); onLive(d); };
    r.onchange = () => onCommit(d);
    r.ondblclick = () => { obj[d.k] = d.def; sync(); onCommit(d); };
    v.title = 'Clique para digitar um valor';
    v.onclick = () => {
      const t = prompt(`${d.l} (${d.min} a ${d.max}${d.u ? ' '+d.u : ''})`, +(+obj[d.k]).toFixed(4));
      if (t === null) return; const n = parseFloat(String(t).replace(',', '.'));
      if (isFinite(n)){ obj[d.k] = clamp(d.s === 'int' ? Math.round(n) : n, d.min, d.max); sync(); onCommit(d); }
    };
    sync(); row.append(r, v);
  }
  return row;
}
function section(title, defs, obj, opts = {}){
  const s = el('div', 'sec');
  const h = el('h3', null, `<span>${esc(title)}</span>`);
  const rb = el('button', null, 'padrão'); rb.title = 'Restaurar padrões da seção';
  rb.onclick = () => { defs.forEach(d => { if (d.s !== 'sample') obj[d.k] = d.def; }); commit(); renderEditor(); scheduleRender(true); };
  h.appendChild(rb); s.appendChild(h);
  if (opts.top) s.appendChild(opts.top);
  defs.forEach(d => { if (d.s !== 'sample') s.appendChild(control(d, obj, () => scheduleRender(false), dd => { commit(); if (opts.onCommit) opts.onCommit(dd); scheduleRender(true); })); });
  return s;
}

/* ---------------- Camadas ---------------- */
function renderStrip(){
  const st = $('strip'); st.innerHTML = '';
  S.layers.forEach((l, i) => {
    const b = el('div', 'lyr' + (i === sel ? ' cur' : '') + (l.on ? '' : ' off'));
    b.innerHTML = `<input type="checkbox" ${l.on ? 'checked' : ''} title="Ligar/desligar"><span class="tag">${ENGINES[l.type].tag}</span><span class="nm">${esc(l.name)}</span><button class="solo ${l.solo ? 'on' : ''}" title="Solo">S</button>`;
    const cb = b.querySelector('input');
    cb.onclick = e => { e.stopPropagation(); l.on = cb.checked; commit(); renderStrip(); scheduleRender(true); };
    b.querySelector('.solo').onclick = e => { e.stopPropagation(); l.solo = !l.solo; commit(); renderStrip(); scheduleRender(true); };
    b.onclick = () => { sel = i; renderStrip(); renderEditor(); };
    st.appendChild(b);
  });
  if (!S.layers.length) st.innerHTML = '<div class="empty">Nenhuma camada. Adicione uma acima ou escolha um preset.</div>';
}
function renderEditor(){
  const ed = $('editor'); ed.innerHTML = '';
  const l = S.layers[sel]; if (!l) return;
  const head = el('div', 'lhead');
  const nm = el('input'); nm.type = 'text'; nm.value = l.name; nm.onchange = () => { l.name = nm.value.slice(0,40) || ENGINES[l.type].name; commit(); renderStrip(); };
  const eng = el('select'); Object.entries(ENGINES).forEach(([k, e]) => { const o = el('option', null, esc(e.name)); o.value = k; eng.appendChild(o); }); eng.value = l.type;
  eng.onchange = () => {
    const n = newLayer(eng.value, l.seed);
    l.type = eng.value; l.p = n.p; if (ENGINES[eng.value].env) l.env = n.env;
    l.name = ENGINES[eng.value].name;
    commit(); renderStrip(); renderEditor(); scheduleRender(true);
  };
  const solo = el('button', 'btn sm' + (l.solo ? ' on' : ''), 'Solo'); solo.onclick = () => { l.solo = !l.solo; commit(); renderStrip(); renderEditor(); scheduleRender(true); };
  const playL = el('button', 'btn sm', '▶ Só esta'); playL.onclick = () => auditionLayer(sel);
  const reseed = el('button', 'btn sm', '🎲 Semente'); reseed.title = 'Nova semente aleatória (muda o ruído e detalhes)';
  reseed.onclick = () => { l.seed = (Math.random()*4294967295) >>> 0; commit(); scheduleRender(true); };
  const up = el('button', 'btn sm', '↑'); up.title = 'Mover para a esquerda'; up.onclick = () => moveLayer(-1);
  const dup = el('button', 'btn sm', 'Duplicar'); dup.onclick = () => { const c = JSON.parse(JSON.stringify(l)); c.name += ' (cópia)'; c.solo = false; S.layers.splice(sel+1, 0, c); sel++; commit(); renderStrip(); renderEditor(); scheduleRender(true); };
  const del = el('button', 'btn sm', 'Excluir'); del.onclick = () => { S.layers.splice(sel, 1); sel = Math.max(0, sel-1); commit(); renderStrip(); renderEditor(); scheduleRender(true); };
  head.append(nm, eng, playL, solo, reseed, up, dup, del);
  ed.appendChild(head);

  const secs = el('div', 'sections');
  let top = null;
  if (l.type === 'sampler') top = samplerBar(l);
  secs.appendChild(section('Fonte · ' + ENGINES[l.type].name, ENGINES[l.type].params, l.p, {top}));
  secs.appendChild(section('Mixagem', MIX_DEFS, l));
  secs.appendChild(section('Envelope de amplitude', ENV_DEFS, l.env));
  secs.appendChild(section('Envelope de altura', PENV_DEFS, l.pitchEnv));
  secs.appendChild(section('Filtro', FILT_DEFS, l.filter));
  secs.appendChild(section('Movimento', MOD_DEFS, l.mod));
  ed.appendChild(secs);
}
function moveLayer(dir){
  const j = sel + dir; if (j < 0 || j >= S.layers.length) return;
  [S.layers[sel], S.layers[j]] = [S.layers[j], S.layers[sel]]; sel = j; commit(); renderStrip(); renderEditor();
}
function addLayer(type){
  const l = newLayer(type);
  if (type === 'sampler' && SAMPLES.size) l.p.sample = [...SAMPLES.keys()].pop();
  S.layers.push(l); sel = S.layers.length - 1; commit(); renderStrip(); renderEditor(); scheduleRender(true);
}

/* ---------------- Sampler: arquivos e microfone ---------------- */
function samplerBar(l){
  const bar = el('div');
  const row = el('div', 'smpbar');
  const s = el('select'); s.style.flex = '1';
  const none = el('option', null, SAMPLES.size ? '— escolha uma amostra —' : '— nenhuma amostra carregada —'); none.value = ''; s.appendChild(none);
  SAMPLES.forEach((v, k) => { const o = el('option', null, esc(v.name) + ` (${(v.ch[0].length/v.sr).toFixed(1)} s)`); o.value = k; s.appendChild(o); });
  s.value = SAMPLES.has(l.p.sample) ? l.p.sample : '';
  s.onchange = () => { l.p.sample = s.value; commit(); scheduleRender(true); };
  const load = el('button', 'btn sm', '📂 Arquivo'); load.onclick = () => { pendingSamplerLayer = l; $('fileAudio').click(); };
  const rec = el('button', 'btn sm' + (recState ? ' rec' : ''), recState ? '■ Parar gravação' : '🎙 Gravar');
  rec.onclick = () => toggleRecord(l);
  row.append(s, load, rec); bar.appendChild(row);
  if (l.p.sample && !SAMPLES.has(l.p.sample)) bar.appendChild(el('div', 'hint', '⚠ A amostra deste projeto não está neste navegador. Carregue o arquivo novamente.'));
  return bar;
}
let pendingSamplerLayer = null, recState = null;
async function addSampleFromArrayBuffer(name, ab){
  const ctx = ensureAC();
  const buf = await ctx.decodeAudioData(ab);
  const maxN = Math.min(buf.length, buf.sampleRate*120);
  const ch = []; for (let c=0; c<Math.min(2, buf.numberOfChannels); c++) ch.push(buf.getChannelData(c).slice(0, maxN));
  const id = 's' + Date.now().toString(36) + Math.random().toString(36).slice(2,6);
  const smp = {name: name.slice(0,60), sr: buf.sampleRate, ch};
  SAMPLES.set(id, smp); idbPut(id, smp);
  return id;
}
$('fileAudio').onchange = async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  try {
    const id = await addSampleFromArrayBuffer(f.name.replace(/\.[^.]+$/, ''), await f.arrayBuffer());
    const l = pendingSamplerLayer && S.layers.includes(pendingSamplerLayer) ? pendingSamplerLayer : null;
    if (l) l.p.sample = id; else { addLayer('sampler'); S.layers[sel].p.sample = id; }
    commit(); renderEditor(); scheduleRender(true); toast('Amostra carregada');
  } catch(err){ toast('Não foi possível ler este áudio'); }
};
async function toggleRecord(l){
  if (recState){ recState.rec.stop(); return; }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false, noiseSuppression:false, autoGainControl:false}});
    const rec = new MediaRecorder(stream), chunks = [];
    rec.ondataavailable = e => chunks.push(e.data);
    rec.onstop = async () => {
      stream.getTracks().forEach(t => t.stop()); recState = null;
      try {
        const ab = await new Blob(chunks, {type: rec.mimeType}).arrayBuffer();
        const id = await addSampleFromArrayBuffer('Gravação ' + new Date().toLocaleTimeString('pt-BR'), ab);
        if (S.layers.includes(l)) l.p.sample = id;
        commit(); toast('Gravação adicionada');
      } catch(e){ toast('Falha ao processar a gravação'); }
      renderEditor(); scheduleRender(true);
    };
    rec.start(); recState = {rec}; renderEditor(); toast('Gravando… clique em Parar');
  } catch(e){ toast('Microfone indisponível ou negado'); }
}
/* IndexedDB para amostras */
let idbP = null;
function idb(){ if (!idbP) idbP = new Promise((res, rej) => { const r = indexedDB.open('nexi-sfx', 1); r.onupgradeneeded = () => r.result.createObjectStore('samples'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); return idbP; }
async function idbPut(k, v){ try { const db = await idb(); db.transaction('samples', 'readwrite').objectStore('samples').put(v, k); } catch(e){} }
async function idbLoadAll(){
  try {
    const db = await idb();
    await new Promise(res => {
      const req = db.transaction('samples').objectStore('samples').openCursor();
      req.onsuccess = () => { const c = req.result; if (c){ SAMPLES.set(c.key, c.value); c.continue(); } else res(); };
      req.onerror = () => res();
    });
  } catch(e){}
}

/* ---------------- Master ---------------- */
function renderMaster(){
  const box = $('master'); const open = new Set([...box.querySelectorAll('details[open]')].map(d => d.dataset.g));
  if (!box.children.length) ['Saída', 'Reverb'].forEach(g => open.add(g));
  box.innerHTML = '';
  MASTER_GROUPS.forEach(g => {
    const d = el('details', 'mg'); d.dataset.g = g.name; if (open.has(g.name)) d.open = true;
    const st = masterSummary(g.name);
    d.appendChild(el('summary', null, esc(g.name) + (st ? `<span class="st">${esc(st)}</span>` : '')));
    g.defs.forEach(def => d.appendChild(control(def, S.master, () => scheduleRender(false), dd => {
      if (dd.k === 'revType') Object.assign(S.master, REV_TYPES[S.master.revType]);
      commit(); renderMaster(); scheduleRender(true);
    })));
    box.appendChild(d);
  });
}
function masterSummary(g){
  const m = S.master;
  switch (g){
    case 'Saturação': return m.drive > 0 ? `${m.satType} ${(m.drive*100)|0}%` : '';
    case 'Compressor': return m.ratio > 1.01 ? `${m.ratio.toFixed(1)}:1` : '';
    case 'Eco (delay ping-pong)': return m.dlyMix > 0 ? fmtS(m.dlyTime) : '';
    case 'Reverb': return m.revMix > 0 ? `${m.revType} ${(m.revMix*100)|0}%` : '';
    case 'Saída': return m.norm === 'lufs' ? `${m.lufs.toFixed(0)} LUFS` : m.norm === 'peak' ? `pico ${m.ceiling.toFixed(1)} dB` : '';
    default: return '';
  }
}

/* ---------------- Biblioteca e banco ---------------- */
let curCat = 'Todos', curPreset = null;
function renderLibrary(){
  const cats = $('cats'); cats.innerHTML = '';
  ['Todos', ...CATEGORIES].forEach(c => {
    const b = el('button', c === curCat ? 'on' : '', esc(c)); b.onclick = () => { curCat = c; renderLibrary(); }; cats.appendChild(b);
  });
  const q = $('search').value.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const list = $('presetList'); list.innerHTML = '';
  PRESET_DEFS.filter(d => (curCat === 'Todos' || d[0] === curCat) && (!q || (d[0]+' '+d[1]).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(q)))
    .forEach(d => {
      const it = el('div', 'item' + (curPreset === d[1] ? ' cur' : ''), `<span class="nm">${esc(d[1])}</span><span class="cat">${esc(d[0])} · ${d[2].length}</span>`);
      it.onclick = () => { curPreset = d[1]; loadSound(buildPreset(d)); renderLibrary(); };
      list.appendChild(it);
    });
  if (!list.children.length) list.innerHTML = '<div class="empty">Nada encontrado.</div>';
}
const BANK_KEY = 'nexi-sfx-studio-bank';
let bank = LS.get(BANK_KEY, []); if (!Array.isArray(bank)) bank = [];
function renderBank(){
  const list = $('bankList'); list.innerHTML = '';
  if (!bank.length){ list.innerHTML = '<div class="empty">Salve seus sons aqui. Ficam guardados neste navegador.</div>'; return; }
  bank.forEach((b, i) => {
    const it = el('div', 'item', `<span class="nm">${esc(b.name)}</span><button title="Renomear">✎</button><button title="Excluir">✕</button>`);
    const [br, bd] = it.querySelectorAll('button');
    it.onclick = () => loadSound(normalizeSound(b.snd));
    br.onclick = e => { e.stopPropagation(); const n = prompt('Novo nome:', b.name); if (n){ b.name = n.slice(0,80); saveBank(); } };
    bd.onclick = e => { e.stopPropagation(); if (confirm(`Excluir "${b.name}"?`)){ bank.splice(i, 1); saveBank(); } };
    list.appendChild(it);
  });
}
function saveBank(){ if (!LS.set(BANK_KEY, bank)) toast('Sem espaço no navegador'); renderBank(); }
