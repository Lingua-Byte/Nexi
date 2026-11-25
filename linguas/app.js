/* RAIZ — caderno de línguas autodidata.
   Método: 1) pronomes pessoais do caso reto  2) ser e estar  3) os verbos que VOCÊ mais fala. */
(() => {
  'use strict';

  const KEY = 'raiz-v1';
  const DAY = 864e5;
  const BOX_DAYS = [0, 0, 1, 3, 7, 16, 35];   // intervalo de revisão por caixa (Leitner)
  const SESSION = 10;
  const DEFAULT_VERBS = ['ter', 'querer', 'ir', 'fazer', 'poder', 'gostar'];
  /* Novidades — a mais nova primeiro. Aparecem num aviso quando o app se atualiza. */
  const NEWS = [
    { v: '2.2', t: 'o diário é o centro: escreva em português ou na língua, toque numa palavra e ela acende na outra' },
    { v: '2.1', t: 'o contexto passa de uma frase para a outra (sujeito oculto) · “o próximo”' },
    { v: '2.0', t: 'tradutor interno: traduz e corrige dentro do celular, sem chave' },
    { v: '1.7', t: 'tradução por conceito: o sentido decide a palavra (pegar o ônibus)' },
    { v: '1.6', t: 'qualquer frase vira lição · escrita à mão mais clara' },
    { v: '1.5', t: 'lições interativas com certo e errado' },
    { v: '1.4', t: 'APK para Android' },
    { v: '1.3', t: 'app instalável que se atualiza sozinho' },
    { v: '1.2', t: 'diário livre com correção' },
    { v: '1.1', t: 'meus verbos e escrita à mão' }
  ];

  const $app = document.getElementById('app');
  const byId = Object.fromEntries(LANGS.map(l => [l.id, l]));
  const verbById = Object.fromEntries(VERBS.map(v => [v.id, v]));

  /* ——— ícones ——— */
  const I = {
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
    pen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20l4-1 11-11-3-3L5 16l-1 4z"/><path d="M14 6l3 3"/></svg>',
    sound: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16.5 8.5a5 5 0 010 7"/><path d="M19 6a8.5 8.5 0 010 12"/></svg>',
    undo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 010 12h-3"/></svg>',
    clear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>',
    ghost: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
    paper: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/></svg>',
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M11 18h2"/></svg>',
    print: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 9V3h10v6M7 17H4v-7h16v7h-3"/><path d="M7 14h10v7H7z"/></svg>',
    flip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12a8 8 0 0114-5.3L20 9"/><path d="M20 4v5h-5"/><path d="M20 12a8 8 0 01-14 5.3L4 15"/><path d="M4 20v-5h5"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z"/></svg>',
    down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>'
  };

  /* ——— estado ——— */
  let S = load();
  function load() {
    try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.langs) return s; } catch (e) { /* sem armazenamento */ }
    return { langs: {}, theme: null };
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ok */ } }
  function LS(id) {
    if (!S.langs[id]) S.langs[id] = { verbs: DEFAULT_VERBS.slice(), custom: [], diary: [], counts: {}, prog: {}, mode: 'pad', ghost: false };
    return S.langs[id];
  }
  if (S.apiKey) { delete S.apiKey; save(); }   // o app não usa mais chave de IA
  if (S.theme) document.documentElement.dataset.theme = S.theme;

  /* ——— utilidades ——— */
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const isLatin = L => !L.roman;
  function toast(msg) {
    const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2200);
  }
  function setLangColors(L) {
    const r = document.documentElement.style;
    r.setProperty('--c', L ? L.color : '#17140F');
    r.setProperty('--c-ink', L ? L.ink : '#17140F');
  }

  /* ——— voz (síntese do próprio celular) ——— */
  let voices = [];
  function loadVoices() { try { voices = speechSynthesis.getVoices(); } catch (e) { voices = []; } }
  if ('speechSynthesis' in window) { loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; }
  function speak(text, L) {
    if (!('speechSynthesis' in window)) { toast('Seu navegador não tem voz.'); return; }
    const clean = String(text).replace(/〜|~/g, '').replace(/\s*\/\s*/g, ', ');
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = L.tts; u.rate = .85;
    const pre = L.tts.slice(0, 2);
    const v = voices.find(v => v.lang === L.tts) || voices.find(v => v.lang && v.lang.toLowerCase().startsWith(pre));
    if (v) u.voice = v; else if (voices.length) toast('Sem voz de ' + L.name + ' neste aparelho — instale nas configurações.');
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  }

  /* ——— montar frases: pronome + verbo ——— */
  function he2(L, i, f, r) {
    // índices de gênero: 0 m.sg · 1 f.sg · 2 m.pl · 3 f.pl
    const G = [[0, 1], [0, 1], [0, 0], [1, 1], [2, 3], [2, 3], [2, 2], [3, 3]][i];
    const join = (pm, pf, vm, vf) => pm === pf && vm === vf ? `${pm} ${vm}` : pm === pf ? `${pm} ${vm} / ${vf}` : vm === vf ? `${pm} / ${pf} ${vm}` : `${pm} ${vm} / ${pf} ${vf}`;
    return {
      t: join(L.pronM[i], L.pronF[i], f[G[0]], f[G[1]]),
      r: r ? join(L.pronMR[i], L.pronFR[i], r[G[0]], r[G[1]]) : ''
    };
  }
  function phrase(L, i, e) {
    if (!e) return null;
    if (e.full) return Array.isArray(e.full) ? { t: e.full[i] } : { t: e.full.t[i], r: e.full.r[i] };
    if (L.id === 'he') return he2(L, i, e.f, e.r);
    if (L.id === 'ja' || L.id === 'ko') return { t: `${L.topic[i]} ${e[0]}`, r: `${L.topicR[i]} ${e[1]}` };
    if (L.id === 'en') {
      if (e.length === 8) return { t: `${L.pron[i]} ${e[i]}` };
      return { t: `${L.pron[i]} ${i === 2 || i === 3 ? e[1] : e[0]}` };
    }
    const form = e[MAP6[i]];
    let p = L.pron[i];
    if (L.id === 'fr' && p === 'je' && /^[aeiouhéèêâ]/i.test(form)) return { t: `j’${form}` };
    return { t: `${p} ${form}` };
  }

  /* ——— itens de prática por degrau ——— */
  function items(L, step) {
    const out = [];
    if (step === 1) {
      L.pron.forEach((t, i) => out.push({ id: 'p' + i, pt: PT_PRON[i], t, r: L.pronR ? L.pronR[i] : '' }));
    } else if (step === 2) {
      for (const tbl of serTables(L)) tbl.rows.forEach((x, i) => out.push({ id: tbl.key + i, pt: tbl.pt[i], t: x.t, r: x.r || '' }));
    } else {
      const st = LS(L.id);
      st.verbs.forEach(vid => {
        const v = verbById[vid]; if (!v) return;
        for (let i = 0; i < 8; i++) {
          const x = phrase(L, i, v[L.id]); if (!x) continue;
          out.push({ id: `v:${vid}:${i}`, pt: `${PT_PRON[i]} ${v.ptf[[0, 1, 1, 1, 2, 3, 3, 3][i]]}`, t: x.t, r: x.r || '' });
        }
      });
      (st.myVerbs || []).forEach(m => m.t.forEach((t, i) => out.push({ id: `m:${m.id}:${i}`, pt: m.ptf[i], t, r: m.r[i] || '' })));
      (st.mySentences || []).forEach(s => out.push({ id: 's:' + s.id, pt: s.pt, t: s.t, r: s.r || '' }));
      (st.myConcepts || []).forEach(c => out.push({ id: 'k:' + c.id, pt: `${c.pt} (o conceito)`, t: c.t, r: c.r || '' }));
      st.custom.forEach(c => out.push({ id: 'c:' + c.id, pt: c.pt, t: c.t, r: c.r || '' }));
      (st.fixes || []).forEach(f => out.push({ id: 'f:' + f.id, pt: `corrija: “${f.orig}”`, t: f.fix, r: f.r || '' }));
    }
    return out;
  }
  function serTables(L) {
    const s = L.ser, rows = f => [...Array(8)].map((_, i) => f(i));
    if (L.id === 'en') return [{ key: 's', title: 'to be', pt: PT_SERESTAR, rows: rows(i => phrase(L, i, s.forms8)) }];
    if (s.forms6) return [{ key: 's', title: s.label, pt: PT_SERESTAR, rows: rows(i => phrase(L, i, s.forms6)) }];
    if (s.ser6) return [
      { key: 's', title: 'ser · ' + s.label.split(' · ')[0], pt: PT_SER, rows: rows(i => phrase(L, i, s.ser6)) },
      { key: 'e', title: 'estar · ' + s.label.split(' · ')[1], pt: PT_ESTAR, rows: rows(i => phrase(L, i, s.estar6)) }];
    if (s.jaSer) return [
      { key: 's', title: 'ser · です', pt: PT_SER, rows: rows(i => phrase(L, i, s.jaSer)) },
      { key: 'e', title: 'estar (em um lugar) · います', pt: PT_ESTAR, rows: rows(i => phrase(L, i, s.jaEstar)) }];
    if (s.koSer) return [
      { key: 's', title: 'ser · 이에요', pt: PT_SER, rows: rows(i => phrase(L, i, s.koSer)) },
      { key: 'e', title: 'estar (em um lugar) · 있어요', pt: PT_ESTAR, rows: rows(i => phrase(L, i, s.koEstar)) }];
    if (s.heFull) return [{ key: 's', title: 'passado · היה', pt: PT_ERA, rows: rows(i => ({ t: s.heFull.t[i], r: s.heFull.r[i] })) }];
    return [];
  }

  /* ——— progresso ——— */
  function mastery(L, step) {
    const its = items(L, step); if (!its.length) return 0;
    const p = LS(L.id).prog;
    return its.reduce((a, it) => a + Math.min((p[it.id]?.b || 0), 4) / 4, 0) / its.length;
  }
  function dueCount(L, step) {
    const p = LS(L.id).prog, now = Date.now();
    return items(L, step).filter(it => !p[it.id] || p[it.id].due <= now).length;
  }
  function nextStep(L) { for (const s of [1, 2, 3]) if (mastery(L, s) < .6) return s; return 3; }
  function langPct(L) { return Math.round((mastery(L, 1) + mastery(L, 2) + mastery(L, 3)) / 3 * 100); }

  const STEPS = {
    1: { t: 'Pronomes', k: 'Eu · você · ele · ela…', d: 'Quem fala, com quem, sobre quem. Toda frase começa aqui.' },
    2: { t: 'Ser & Estar', k: 'O verbo que liga tudo', d: 'Eu sou, eu estou. Os dois verbos que sustentam a língua.' },
    3: { t: 'Meus verbos', k: 'Do que eu falo', d: 'Escreva qualquer frase do seu dia: o app acha os verbos e transforma em lição.' }
  };

  /* ——— rotas ——— */
  function route() {
    const h = location.hash.replace(/^#\/?/, '').split('/');
    stopPad();
    if (h[0] === 'l' && byId[h[1]]) {
      const L = byId[h[1]]; setLangColors(L);
      if (h[2] === 's') return renderStudy(L, +h[3] || 1);
      if (h[2] === 'p') return renderPractice(L, +h[3] || 1);
      if (h[2] === 'l') return renderLesson(L, +h[3] || 1);
      if (h[2] === 'd') return renderDiary(L);
      if (h[2] === 't') return renderDiary(L);   // o tradutor agora vive no diário
      return renderLang(L);
    }
    setLangColors(null); renderHome();
  }
  window.addEventListener('hashchange', () => { route(); window.scrollTo(0, 0); });
  function go(h) { location.hash = h; }

  function topbar(backHref, backLabel, extra = '') {
    return `<div class="bar"><a class="back" href="${backHref}">${I.back}${esc(backLabel)}</a>${extra}</div>`;
  }

  /* ——— CAPA ——— */
  function renderHome() {
    const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
    $app.innerHTML = `
      <header class="mast enter">
        <div class="mast-top kicker"><span>Caderno de línguas</span><span>${esc(today)}</span></div>
        <div class="logo" aria-label="RAIZ"><span class="r2" aria-hidden="true">RAIZ</span><span class="r1">RAIZ</span></div>
        <div class="stamp" aria-hidden="true"><div><b>8</b>línguas<br>1 método</div></div>
        <p class="tag">Aprender uma língua começa pela raiz: quem fala, o verbo ser, e as palavras que <em>você</em> diz todo dia.</p>
      </header>
      <section class="method enter" aria-label="O método">
        <div><b>01</b><span>Pronomes pessoais</span></div>
        <div><b>02</b><span>Ser &amp; estar</span></div>
        <div><b>03</b><span>Os verbos que você fala</span></div>
      </section>
      <div class="section-h"><h2>Escolha a língua</h2><span class="kicker muted">${LANGS.length} cadernos</span></div>
      <nav class="langs">
        ${LANGS.map((L, n) => {
          const pct = langPct(L), on = Math.round(pct / 100 * 8);
          return `<a class="lang enter" href="#/l/${L.id}" style="--lc:${L.color};--lk:${L.ink};animation-delay:${n * 35}ms" aria-label="${esc(L.name)} — ${pct}%">
            <span class="no">Nº ${String(n + 1).padStart(2, '0')}</span>
            <span class="glyph ${isLatin(L) ? 'latin' : ''} ${isLatin(L) && L.glyph.length > 2 ? 'long' : ''}" ${L.dir === 'rtl' ? 'dir="rtl"' : ''} aria-hidden="true">${esc(L.glyph)}</span>
            <span><span class="nm" style="display:block">${esc(L.name)}</span><span class="nat" style="display:block">${esc(L.native)}</span></span>
            <span class="ticks" aria-hidden="true">${[...Array(8)].map((_, i) => `<i class="${i < on ? 'on' : ''}"></i>`).join('')}</span>
          </a>`;
        }).join('')}
      </nav>
      ${installCard()}
      <footer class="foot">
        <span>Funciona offline. Seu progresso fica neste aparelho.</span>
        <button class="linkbtn" id="theme">${document.documentElement.dataset.theme === 'dark' ? 'Papel claro' : 'Papel noturno'}</button>
        <span class="mono" style="width:100%;font-size:11px">Versão ${esc(NEWS[0].v)} · ${esc(NEWS[0].t)}</span>
      </footer>`;
    bindInstall();
    document.getElementById('theme').onclick = () => {
      const dark = document.documentElement.dataset.theme === 'dark' || (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);
      S.theme = dark ? 'light' : 'dark'; document.documentElement.dataset.theme = S.theme; save(); renderHome();
    };
  }

  /* ——— LÍNGUA: a escada ——— */
  function renderLang(L) {
    const nx = nextStep(L);
    $app.innerHTML = `
      ${topbar('#/', 'Cadernos')}
      <section class="hero enter">
        <span class="big ${isLatin(L) ? 'latin' : ''} ${isLatin(L) && L.glyph.length > 2 ? 'long' : ''}" ${L.dir === 'rtl' ? 'dir="rtl"' : ''} aria-hidden="true">${esc(L.glyph)}</span>
        <div class="nat">${esc(L.native)}</div>
        <h1>${esc(L.name)}</h1>
        <div class="pct"><b>${langPct(L)}%</b> da raiz</div>
      </section>
      <a class="journal-card main-diary enter" href="#/l/${L.id}/d">
        <span class="kicker">Comece aqui · todo dia</span>
        <b>Diário</b>
        <span>Escreva a sua vida em português ou em ${esc(L.name.toLowerCase())}. O diário mostra o que é o quê — toque numa palavra e ela acende na outra língua.</span>
        <span class="jc-count mono">${(LS(L.id).journal || []).length} páginas</span>
      </a>
      <div class="section-h" style="margin:26px 0 10px"><h2>A raiz</h2><span class="kicker muted">a base que sustenta tudo</span></div>
      <div class="stairs">
        ${[1, 2, 3].map(s => {
          const m = Math.round(mastery(L, s) * 100), d = dueCount(L, s), n = items(L, s).length;
          return `<a class="step enter ${s === nx ? 'next' : ''}" href="#/l/${L.id}/s/${s}" style="animation-delay:${s * 60}ms">
            <span class="n">0${s}</span>
            <span class="body">
              <span class="kicker muted">${esc(STEPS[s].k)}</span>
              <h3>${esc(STEPS[s].t)}${s === nx ? '<span class="flag">agora</span>' : ''}</h3>
              <p>${esc(STEPS[s].d)}</p>
              <span class="meter"><i style="width:${m}%"></i></span>
              <span class="meta"><span>${m}% firme</span><span>${n ? d + ' p/ revisar' : 'escolha verbos'}</span></span>
            </span>
          </a>`;
        }).join('')}
      </div>
      <div style="margin-top:22px">${motorCard(L)}</div>`;
    bindMotor(L);
  }

  /* ——— folha de estudo ——— */
  function sheet(L, rows, head = ['português', L.name]) {
    const sc = !isLatin(L) ? 'script' : '';
    return `<div class="sheet">
      <div class="sheet-h"><span>${esc(head[0])}</span><span>${esc(head[1])}</span></div>
      ${rows.map(r => `<button class="row" data-say="${esc(r.t)}">
        <span class="pt">${esc(r.pt)}</span>
        <span class="tg ${sc} ${String(r.t).length > 15 ? 'long' : ''}" ${L.dir === 'rtl' ? 'dir="rtl"' : ''}>${esc(r.t)}${r.r ? `<small dir="ltr">${esc(r.r)}</small>` : ''}</span>
        <span class="spk" aria-label="ouvir">${I.sound}</span>
      </button>`).join('')}
    </div>`;
  }
  function bindSay(L, root = $app) {
    root.querySelectorAll('[data-say]').forEach(b => b.onclick = () => speak(b.dataset.say, L));
  }
  function practiceButtons(L, step, n) {
    return `<button class="cta noprint" id="lesson" ${n ? '' : 'disabled'}>${I.flip}Começar lição</button>
      <div class="lesson-hint noprint">Exercícios com certo e errado: escolher, ouvir, montar a frase e digitar.</div>
      <button class="cta alt noprint" id="practice" ${n ? '' : 'disabled'}>${I.pen}Escrever no papel</button>
      <div class="actions-2 noprint">
        <button class="btn" id="printBlank">${I.print}Folha em branco</button>
        <button class="btn" id="printKey">${I.paper}Folha com gabarito</button>
      </div>`;
  }
  function bindPractice(L, step) {
    const p = document.getElementById('practice'); if (p) p.onclick = () => go(`#/l/${L.id}/p/${step}`);
    const ls = document.getElementById('lesson'); if (ls) ls.onclick = () => go(`#/l/${L.id}/l/${step}`);
    const pb = document.getElementById('printBlank'), pk = document.getElementById('printKey');
    if (pb) pb.onclick = () => { document.body.classList.remove('print-key'); window.print(); };
    if (pk) pk.onclick = () => { document.body.classList.add('print-key'); window.print(); setTimeout(() => document.body.classList.remove('print-key'), 500); };
  }

  function renderStudy(L, step) {
    if (step === 3) return renderVerbs(L);
    let body = '';
    if (step === 1) {
      body = `<div class="note"><span class="kicker">Repare</span>${esc(L.pronNote)}</div>
        ${sheet(L, items(L, 1))}`;
    } else {
      const s = L.ser;
      body = `<div class="note"><span class="kicker">${esc(s.label)}</span>${esc(s.note)}</div>
        <div class="examples">${s.ex.map(e => `<div class="ex"><div class="pt">${esc(e[0])}</div><div class="tg" ${L.dir === 'rtl' ? 'dir="rtl"' : ''}>${esc(e[1])}</div>${e[2] ? `<small>${esc(e[2])}</small>` : ''}</div>`).join('')}</div>
        ${serTables(L).map(t => `<div class="subh">${esc(t.title)}</div>${sheet(L, t.rows.map((x, i) => ({ pt: t.pt[i], t: x.t, r: x.r })))}`).join('')}`;
    }
    $app.innerHTML = `
      ${topbar(`#/l/${L.id}`, L.name)}
      <div class="enter">
        <div class="kicker muted">Degrau 0${step} · ${esc(L.name)}</div>
        <h1 class="title-xl">${esc(STEPS[step].t)} <em>${step === 1 ? '·' : '='}</em></h1>
        <p class="lead">Toque em cada linha para ouvir. Leia em voz alta, depois escreva sem olhar.</p>
        ${body}
        ${practiceButtons(L, step, 1)}
      </div>`;
    bindSay(L); bindPractice(L, step);
  }

  /* ——— DEGRAU 3: meus verbos ——— */
  /* Reconhece verbos em qualquer frase: banco (com conjugação pronta) + léxico livre. */
  let lexMap = null;
  function ptLex() {
    if (lexMap) return lexMap;
    lexMap = new Map();
    const put = (w, lemma) => { if (w.length > 1 && !PT_LEX_SKIP.has(w) && !lexMap.has(w)) lexMap.set(w, lemma); };
    for (const [lemma, forms] of Object.entries(PT_LEX_IRR)) { put(lemma, lemma); forms.split(' ').forEach(f => put(f, lemma)); }
    for (const inf of PT_LEX_REG) {
      if (PT_LEX_IRR[inf]) continue;
      const r = inf.slice(0, -2), e = inf.slice(-2);
      const F = e === 'ar' ? ['o', 'a', 'amos', 'am', 'ei', 'ou', 'aram', 'ava', 'avam', 'ando', 'ado']
        : e === 'er' ? ['o', 'e', 'emos', 'em', 'i', 'eu', 'eram', 'ia', 'iam', 'endo', 'ido']
        : ['o', 'e', 'imos', 'em', 'i', 'iu', 'iram', 'ia', 'iam', 'indo', 'ido'];
      put(inf, inf); F.forEach(s => put(r + s, inf));
    }
    return lexMap;
  }
  function detectVerbs(text) {
    const words = text.toLowerCase().normalize('NFC').match(/[\p{L}]+/gu) || [];
    const set = new Set(words);
    const found = VERBS.filter(v => v.detect.split(' ').some(w => set.has(w))).map(v => v.id);
    const base = BASE_DETECT.split(' ').some(w => set.has(w));
    const lex = ptLex(), extra = [];
    words.forEach(w => {
      const lemma = lex.get(w); if (!lemma || lemma === 'ser' || lemma === 'estar') return;
      if (verbById[lemma]) { if (!found.includes(lemma)) found.push(lemma); return; }
      if (!extra.includes(lemma)) extra.push(lemma);
    });
    return { found, base, extra };
  }

  /* ——— TRADUTOR INTERNO (no aparelho, sem API) ——— */
  let motorP = null;
  const motorLib = () => (motorP = motorP || import('./motor.js'));
  const mt = async (from, to, text) => (await motorLib()).translate(from, to, text);
  const clean = t => String(t).trim().replace(/[.。]$/, '');
  /* tradução com alinhamento palavra a palavra (nomes próprios mantidos) */
  async function mtAligned(from, to, text) {
    const al = await (await motorLib()).translateAligned(from, to, text);
    if (from === 'pt') {
      const fixed = manterNomes(text, al.text);
      if (fixed !== al.text) {
        const A = al.text.split(/\s+/), B = fixed.split(/\s+/);
        if (A.length === B.length) A.forEach((w, i) => { if (w !== B[i]) al.toks.forEach(tk => { if (tk.t.includes(w)) tk.t = tk.t.replace(w, B[i]); }); });
        al.text = fixed;
      }
    }
    al.text = clean(al.text);
    return al;
  }
  /* As duas línguas, uma sobre a outra: tocar numa palavra acende a correspondente na outra. */
  function interHTML(srcWords, toks, srcDir, tgDir, srcLabel, tgLabel) {
    return `<div class="inter">
      <div class="il-lab">${esc(srcLabel)}</div>
      <div class="il-src" ${srcDir}>${srcWords.map((w, i) => `<span class="w" data-g="${i}">${esc(w)}</span>`).join(' ')}</div>
      <div class="il-lab">${esc(tgLabel)}</div>
      <div class="il-tg" ${tgDir}>${toks.map(t => `${esc(t.pre)}<span class="w ${t.k.length ? '' : 'solo'}" data-g="${t.k.join(' ')}">${esc(t.t)}</span>`).join('')}</div>
    </div>`;
  }
  function bindInter(root, L, srcLang) {
    root.querySelectorAll('.inter').forEach(box => {
      box.querySelectorAll('.w').forEach(w => w.onclick = () => {
        const keys = (w.dataset.g || '').split(' ').filter(Boolean);
        box.querySelectorAll('.w.on').forEach(x => x.classList.remove('on'));
        if (!keys.length) { w.classList.add('on'); }
        box.querySelectorAll('.il-src .w').forEach(x => { if (keys.includes(x.dataset.g)) x.classList.add('on'); });
        box.querySelectorAll('.il-tg .w').forEach(x => { if ((x.dataset.g || '').split(' ').some(k => keys.includes(k))) x.classList.add('on'); });
        // fala o pedaço na língua estudada
        const target = srcLang === 'pt' ? [...box.querySelectorAll('.il-tg .w.on')].map(x => x.textContent).join(' ') : [...box.querySelectorAll('.il-src .w.on')].map(x => x.textContent).join(' ');
        if (target) speak(target.replace(/[.,!?;:]+$/, ''), L);
      });
    });
  }
  const roman = (L, t) => (L.id === 'ko' ? romanKo(t) : '');
  const MB = n => Math.max(1, Math.round(n / 1e6));

  /* Cartão de download do tradutor. Mostra o estado e baixa a língua uma vez. */
  function motorCard(L) { return `<div class="motor" id="motor"><div class="thinking"><span></span><span></span><span></span> conferindo o tradutor interno</div></div>`; }
  async function bindMotor(L, onReady) {
    const box = document.getElementById('motor'); if (!box) return;
    let st;
    try { st = await (await motorLib()).status(L.id); } catch (e) { st = { available: false, error: String(e) }; }
    if (!box.isConnected) return;
    if (!st.available) {
      box.innerHTML = `<div class="m-row"><b>Tradutor interno</b><span class="muted">Ainda não disponível neste endereço. Ele vem no app publicado.</span></div>`;
      return;
    }
    if (st.ready) {
      box.innerHTML = `<div class="m-row ok"><b>✓ Tradutor interno pronto</b><span class="muted">${esc(L.name)} funciona sem internet, dentro do celular.</span></div>`;
      onReady && onReady(); return;
    }
    const falta = st.total - st.have;
    box.innerHTML = `<div class="m-row"><b>Tradutor interno de ${esc(L.name.toLowerCase())}</b>
        <span class="muted">Traduz e corrige dentro do celular, sem internet e sem chave. Baixa uma vez só: ${MB(falta)} MB${st.have ? ` (faltam ${MB(falta)} de ${MB(st.total)})` : ''}.</span></div>
      <button class="cta" id="mdl">${I.down}Baixar tradutor · ${MB(falta)} MB</button>
      <div class="mbar hide" id="mbar"><i></i></div>`;
    document.getElementById('mdl').onclick = async () => {
      const b = document.getElementById('mdl'), bar = document.getElementById('mbar');
      b.disabled = true; bar.classList.remove('hide');
      try {
        await (await motorLib()).prepare(L.id, (d, t) => { bar.firstElementChild.style.width = Math.round(d / t * 100) + '%'; b.textContent = `Baixando… ${MB(d)} de ${MB(t)} MB`; });
        toast('Tradutor pronto. Agora funciona sem internet.');
        bindMotor(L, onReady);
      } catch (e) {
        b.disabled = false; b.innerHTML = `${I.down}Tentar de novo`;
        toast(/download|fetch|network|Failed/i.test(String(e)) ? 'Sem internet para baixar agora.' : 'Não deu: ' + String(e.message || e));
      }
    };
  }
  async function motorReady(L) { try { return (await (await motorLib()).status(L.id)).ready; } catch (e) { return false; } }

  /* Traduz o SENTIDO: português falado → conceitos reescritos → tradução neural no aparelho.
     Depois monta os conceitos verbais (verbo + o sentido na frase) com as 8 pessoas. */
  async function analisar(L, text) {
    const out = { sentences: [], concepts: [], verbs: [], bank: [] };
    const sents = frases(text);
    // o contexto passa de uma frase para a outra (sujeito oculto: “Tito era… Pensava…” → “Ele pensava”)
    const comSujeito = sujeitoOculto(sents.map(falado));
    for (let si = 0; si < sents.length; si++) {
      const s = sents[si];
      const { found, rewritten } = conceitos(comSujeito[si]);
      const al = await mtAligned('pt', L.id, rewritten);
      const t = al.text;
      out.sentences.push({ pt: s, via: rewritten !== s ? rewritten : '', t, r: roman(L, t), src: al.src, toks: al.toks, conceitos: found.map(c => c.id) });
      for (const c of found) {
        if (out.concepts.some(x => x.id === c.id)) continue;
        const ex = exemplo(c);
        const ct = ex ? clean(await mt('pt', L.id, ex)) : '';
        out.concepts.push({ id: c.id, pt: c.pt, diz: c.diz, por: ex, t: ct, r: roman(L, ct) });
      }
    }
    // conceitos verbais
    const plain = falado(text);
    const { found, extra } = detectVerbs(plain);
    const lex = ptLex();
    const conceptVerbs = new Set(CONCEITOS.filter(c => c.tipo === 'verbo' && out.concepts.some(x => x.id === c.id)).map(c => c.verbo));
    const lemmas = [...extra, ...found];
    for (const lemma of lemmas) {
      if (lemma === 'ser' || lemma === 'estar' || conceptVerbs.has(lemma)) continue;
      let form = '', where = '';
      for (const s of frases(plain).map(x => conceitos(x).rewritten)) {
        const w = (s.toLowerCase().match(/[\p{L}]+/gu) || []).find(x => lex.get(x) === lemma || (verbById[lemma] && verbById[lemma].detect.split(' ').includes(x)));
        if (w) { form = w; where = s; break; }
      }
      if (!form) continue;   // o verbo sumiu na reescrita de um conceito (ex.: "dei uma volta")
      const comp = PT_SENSES[lemma] ? complemento(where, form) : '';
      if (verbById[lemma] && !comp) { out.bank.push(lemma); continue; }   // sentido básico: conjugação revisada do banco
      const ptf = PT_PRON.map((p, i) => `${p} ${conjPhrase(lemma, i)}${comp ? ' ' + comp : ''}`);
      const t = [];
      for (const x of ptf) t.push(clean(await mt('pt', L.id, x)));
      let trap = '';
      if (comp) {
        // o verbo "de dicionário" na língua (tomar → take / tomar / prendre…)
        const dict = clean(await mt('pt', L.id, lemma)).toLowerCase().replace(/^to /, '').split(/\s+/)[0] || '';
        const stem = L.roman ? dict.slice(0, 2) : dict.slice(0, Math.max(3, dict.length - 2));
        if (stem && /^[\p{L}]+$/u.test(dict) && !t[0].toLowerCase().includes(stem))
          trap = `Aqui “${lemma}” não vira “${dict}”: com “${comp}”, o sentido muda a palavra — “${t[0]}”.`;
      }
      out.verbs.push({ pt: lemma, sense: comp, ptf, t, r: t.map(x => roman(L, x)), trap, tInf: t[0] });
    }
    return out;
  }

  /* O tradutor neural erra palavras soltas; numa frase curta ele acerta o conceito. */
  function exemplo(c) {
    if (c.id === 'saudade' || c.id === 'saudade-n') return 'Eu sinto falta de você.';
    const por = typeof c.por === 'string' ? c.por : '';
    if (!por) return '';
    if (c.tipo === 'verbo') return `Eu quero ${por}.`;
    if (c.tipo === 'nome') return `Eu gosto de ${por}.`;
    return por.charAt(0).toUpperCase() + por.slice(1) + (/[?!.]$/.test(por) ? '' : '.');
  }

  /* Mostra o resultado: frases traduzidas, conceitos explicados e conceitos verbais. */
  function analysisHTML(L, out) {
    const rtl = L.dir === 'rtl' ? 'dir="rtl"' : '';
    return `
      <div class="analysis enter">
        <p class="il-hint">Toque numa palavra: a correspondente acende na outra língua.</p>
        ${out.sentences.map(s => `<div class="tr-row">
          ${s.via ? `<div class="tr-pt">${esc(s.pt)}</div><div class="tr-via">o app entendeu como: <i>${esc(s.via)}</i></div>` : ''}
          ${s.toks ? interHTML(s.src, s.toks, '', rtl, 'português', L.name.toLowerCase()) : `<div class="tr-pt">${esc(s.pt)}</div>`}
          <button class="tr-tg" data-say="${esc(s.t)}" ${rtl}>${s.r ? `<small dir="ltr">${esc(s.r)}</small>` : '<small>ouvir a frase</small>'}<span class="spk">${I.sound}</span></button>
        </div>`).join('')}
        ${out.concepts.length ? `<div class="subh">Conceitos <span class="kicker">sentido, não palavra</span></div>
          ${out.concepts.map(c => `<div class="concept"><div class="c-pt">${esc(c.pt)}</div><p>${esc(c.diz)}</p>
            ${c.t ? `<div class="c-tg"><span class="kicker">exemplo em ${esc(L.name.toLowerCase())}</span><span>${esc(c.por)}</span><b ${rtl}>${esc(c.t)}</b>${c.r ? `<small>${esc(c.r)}</small>` : ''}</div>` : ''}</div>`).join('')}` : ''}
        ${out.verbs.length ? `<div class="subh">Verbos no seu sentido</div>
          <div class="senses">${out.verbs.map(v => `<div class="sense-row"><b>${esc(v.pt)}</b><div><span class="sense"><small>${esc(v.sense || 'sentido básico')}</small><span ${rtl}>${esc(v.t[0])}</span></span>${v.trap ? `<p class="trap-line">⚠ ${esc(v.trap)}</p>` : ''}</div></div>`).join('')}</div>` : ''}
        <p class="muted mt-note">Traduzido dentro do celular pelo tradutor interno. Ele acerta a maior parte, mas pode errar em frases longas, muito informais ou ambíguas — por isso o app mostra como entendeu.</p>
      </div>`;
  }

  /* Guarda o resultado no caderno: verbos (banco e conceitos), frases e conceitos viram lição. */
  function saveAnalysis(L, out) {
    const st = LS(L.id);
    st.myVerbs = st.myVerbs || []; st.mySentences = st.mySentences || []; st.myConcepts = st.myConcepts || [];
    let nv = 0, ns = 0, nc = 0;
    out.bank.forEach(id => { if (!st.verbs.includes(id)) { st.verbs.push(id); nv++; } });
    out.verbs.forEach((v, i) => {
      if (st.myVerbs.some(m => m.pt === v.pt && (m.sense || '') === v.sense)) return;
      st.myVerbs.push({ id: Date.now().toString(36) + 'v' + i, pt: v.pt, sense: v.sense, tInf: v.tInf, trap: v.trap, ptf: v.ptf, t: v.t, r: v.r, note: '' }); nv++;
    });
    out.sentences.forEach((s, i) => {
      if (!s.t || st.mySentences.some(x => x.pt === s.pt)) return;
      st.mySentences.unshift({ id: Date.now().toString(36) + 's' + i, pt: s.pt, t: s.t, r: s.r }); ns++;
    });
    out.concepts.forEach((c, i) => {
      if (!c.t || st.myConcepts.some(x => x.cid === c.id)) return;
      st.myConcepts.push({ id: Date.now().toString(36) + 'c' + i, cid: c.id, pt: c.pt, diz: c.diz, t: c.t, r: c.r }); nc++;
    });
    st.mySentences = st.mySentences.slice(0, 150); save();
    return { nv, ns, nc };
  }

  function senseMap(L, st) {
    const by = {};
    st.myVerbs.forEach(m => { if (m.sense) (by[m.pt] = by[m.pt] || []).push(m); });
    const rows = Object.entries(by).filter(([, ms]) => ms.length > 1 || ms.some(m => m.trap));
    if (!rows.length) return '';
    const rtl = L.dir === 'rtl' ? 'dir="rtl"' : '';
    return `<div class="subh">Um verbo, vários sentidos <span class="kicker">conceito, não palavra</span></div>
      <div class="senses">${rows.map(([v, ms]) => `<div class="sense-row"><b>${esc(v)}</b><div>${ms.map(m => `<span class="sense"><small>${esc(m.sense)}</small><span ${rtl}>${esc(m.tInf || m.t[0])}</span></span>`).join('')}</div></div>`).join('')}</div>`;
  }

  function polyNote(found, extra) {
    const poly = [...found, ...extra].filter(v => PT_SENSES[v]);
    if (!poly.length) return '';
    return `<div class="note poly-note"><span class="kicker">O sentido decide</span>${poly.map(v => `<b>${esc(v)}</b> muda de palavra em outras línguas conforme o sentido: ${PT_SENSES[v].map(esc).join(' · ')}.`).join('<br>')}
      Toque em <b>Transformar em lição</b> para aprender o sentido da <i>sua</i> frase — tradução é de conceito, não de palavra.</div>`;
  }

  function renderVerbs(L, keepText = '', lastOut = null) {
    const st = LS(L.id);
    st.myVerbs = st.myVerbs || []; st.mySentences = st.mySentences || [];
    const ranked = Object.entries(st.counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const its = items(L, 3);
    const rtl = L.dir === 'rtl' ? 'dir="rtl"' : '';
    const nVerbs = st.verbs.length + st.custom.length + st.myVerbs.length;
    $app.innerHTML = `
      ${topbar(`#/l/${L.id}`, L.name)}
      <div class="enter">
        <div class="kicker muted">Degrau 03 · ${esc(L.name)}</div>
        <h1 class="title-xl">Meus verbos <em>✎</em></h1>
        <p class="lead">Sem lista fixa de curso: o caminho sai do que <b>você</b> fala. Escreva qualquer frase do seu dia, em português, do seu jeito.</p>
        <ol class="flow"><li><b>Escreva</b> o que você fala</li><li><b>O app acha</b> os verbos</li><li><b>Vira lição</b> com seus verbos e frases</li></ol>

        <div class="diary">
          <textarea id="diary" placeholder="Ex.: Eu acordo às sete. Quero um café. Vou trabalhar de ônibus e preciso ligar pro meu irmão…" aria-label="O que eu falo hoje">${esc(keepText)}</textarea>
          <div class="dbar">
            <button class="btn" id="note">${I.pen}Anotar</button>
            <button class="btn on" id="path">${I.flip}Transformar em lição</button>
          </div>
        </div>
        <div id="found">${lastOut ? analysisHTML(L, lastOut) : ''}</div>
        ${motorCard(L)}

        ${st.mySentences.length ? `<div class="subh">Minhas frases <span class="kicker">viram exercício</span></div>
          <div class="pages">${st.mySentences.map(s => `<div class="page mysent"><button class="ms-say" data-say="${esc(s.t)}"><span class="mono muted">${esc(s.pt)}</span><span class="ptxt" ${rtl}>${esc(s.t)}</span>${s.r ? `<small class="mono muted">${esc(s.r)}</small>` : ''}</button><button class="linkbtn" data-delsent="${esc(s.id)}">apagar</button></div>`).join('')}</div>` : ''}

        ${ranked.length ? `<div class="subh">Os que eu mais falo <span class="kicker">${st.diary.length} anotações</span></div>
          <div class="rank">${ranked.map(([id, n]) => `<div><b>${esc(verbById[id]?.pt || id)}</b><span>${n}×</span></div>`).join('')}</div>` : ''}

        ${senseMap(L, st)}
        <div class="subh">Minhas conjugações <span class="kicker">${nVerbs} verbos e conceitos</span></div>
        <div id="cards">
          ${st.verbs.map(vid => {
            const v = verbById[vid]; if (!v) return '';
            const rows = [...Array(8)].map((_, i) => { const x = phrase(L, i, v[L.id]); return { pt: `${PT_PRON[i]} ${v.ptf[[0, 1, 1, 1, 2, 3, 3, 3][i]]}`, t: x.t, r: x.r }; });
            return `<div class="vcard"><button data-open="${vid}"><span><span class="vpt">${esc(v.pt)}</span><br><span class="vtg" ${rtl}>${esc(rows[0].t)}</span></span>${I.down}</button>
              <div class="hide" id="open-${vid}">${sheet(L, rows)}</div></div>`;
          }).join('')}
          ${st.myVerbs.map(m => {
            const rows = m.t.map((t, i) => ({ pt: m.ptf[i], t, r: m.r[i] }));
            return `<div class="vcard ${m.trap ? 'has-trap' : ''}"><button data-open="m-${m.id}"><span><span class="vpt">${esc(m.pt)}${m.sense ? ` · ${esc(m.sense)}` : ''}</span><br><span class="vtg" ${rtl}>${esc(m.t[0])}</span>${m.trap ? '<br><span class="trap-tag">⚠ não é palavra por palavra</span>' : ''}</span>${I.down}</button>
              <div class="hide" id="open-m-${m.id}">${m.trap ? `<p class="vnote trap">⚠ ${esc(m.trap)}</p>` : ''}${m.note ? `<p class="vnote">${esc(m.note)}</p>` : ''}${sheet(L, rows)}<button class="linkbtn vdel" data-delmy="${esc(m.id)}">apagar este conceito</button></div></div>`;
          }).join('')}
          ${st.custom.map(c => `<div class="vcard"><button data-say="${esc(c.t)}"><span><span class="vpt">${esc(c.pt)} · meu</span><br><span class="vtg" ${rtl}>${esc(c.t)}</span>${c.r ? `<br><small class="mono muted">${esc(c.r)}</small>` : ''}</span><span class="linkbtn" data-del="${esc(c.id)}">apagar</span></button></div>`).join('')}
        </div>

        <details class="keybox" style="margin-top:14px"><summary><span class="kicker">Banco de verbos</span> <span class="muted">· 16 com conjugação pronta</span></summary>
          <div class="chips" id="bank" style="margin-top:12px">
            ${VERBS.map(v => `<button class="chip ${st.verbs.includes(v.id) ? 'on' : ''}" data-v="${v.id}"><span class="dot"></span>${esc(v.pt)}${st.counts[v.id] ? `<small>${st.counts[v.id]}×</small>` : ''}</button>`).join('')}
          </div></details>

        <div class="subh">Um verbo meu <span class="kicker">do seu dicionário</span></div>
        <form class="form" id="custom" autocomplete="off">
          <label for="cpt">Em português</label><input id="cpt" placeholder="ex.: eu acordo" required>
          <label for="ctg">Em ${esc(L.name.toLowerCase())}</label><input id="ctg" ${rtl} placeholder="${esc(L.id === 'en' ? 'ex.: I wake up' : 'como você aprendeu')}" required>
          ${L.roman ? '<label for="cr">Pronúncia (opcional)</label><input id="cr" placeholder="romanização">' : ''}
          <button class="btn" type="submit">${I.plus}Guardar no caderno</button>
        </form>
        <div style="height:18px"></div>
        ${practiceButtons(L, 3, its.length)}
      </div>`;

    bindSay(L); bindPractice(L, 3); bindMotor(L); bindInter($app, L, 'pt');
    const ta = document.getElementById('diary'), fd = document.getElementById('found');
    const showFound = txt => {
      const { found, base, extra } = detectVerbs(txt);
      if (!txt.trim()) { fd.innerHTML = ''; return; }
      fd.innerHTML = `<div class="found">
          ${found.map(id => `<button class="chip ${st.verbs.includes(id) ? 'on' : ''}" data-v="${id}"><span class="dot"></span>${esc(verbById[id].pt)}</button>`).join('')}
          ${extra.map(l => { const have = st.myVerbs.some(m => m.pt === l); const poly = !!PT_SENSES[l]; return `<button class="chip new ${poly ? 'poly' : ''} ${have ? 'on' : ''}" data-x="${esc(l)}"><span class="dot"></span>${esc(l)}${poly ? '<small>sentido?</small>' : have ? '' : '<small>novo</small>'}</button>`; }).join('')}
        </div>
        ${polyNote(found, extra)}
        <p class="muted found-hint">${!found.length && !extra.length ? 'Nenhum verbo reconhecido ainda — continue escrevendo, ou toque em “Transformar em lição”.' :
          `${extra.length ? 'Os marcados <b>novo</b> ganham conjugação ao tocar em “Transformar em lição”. ' : ''}${base ? 'Ser/estar já é o degrau 02.' : ''}`}</p>`;
      bindChips(fd);
      fd.querySelectorAll('[data-x]').forEach(b => b.onclick = () => {
        if (b.classList.contains('on')) return;
        const f = document.getElementById('cpt'); f.value = b.dataset.x; document.getElementById('ctg').focus();
        document.getElementById('custom').scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    };
    ta.addEventListener('input', () => showFound(ta.value));
    if (keepText) showFound(keepText);
    const note = (txt, quiet) => {
      const { found, extra } = detectVerbs(txt);
      st.diary.unshift({ d: Date.now(), text: txt }); st.diary = st.diary.slice(0, 200);
      [...found, ...extra].forEach(id => st.counts[id] = (st.counts[id] || 0) + 1);
      let added = 0;
      found.forEach(id => { if (!st.verbs.includes(id)) { st.verbs.push(id); added++; } });
      save();
      if (!quiet) toast(found.length + extra.length ? `${found.length + extra.length} verbo(s) anotado(s)${added ? ` · ${added} no caderno` : ''}${extra.length ? ` · ${extra.length} novo(s) sem conjugação` : ''}` : 'Anotado.');
      return { found, extra };
    };
    document.getElementById('note').onclick = () => {
      const txt = ta.value.trim(); if (!txt) { ta.focus(); return; }
      const { extra } = note(txt);
      renderVerbs(L, extra.length ? txt : '');
    };
    document.getElementById('path').onclick = async () => {
      const txt = ta.value.trim(); if (!txt) { ta.focus(); return; }
      if (!(await motorReady(L))) {
        fd.innerHTML = `<div class="note enter"><span class="kicker">Falta o tradutor interno</span>Para transformar qualquer frase em lição, baixe o tradutor de ${esc(L.name.toLowerCase())} uma vez (logo abaixo). Depois funciona sem internet e sem chave.</div>`;
        document.getElementById('motor').scrollIntoView({ behavior: 'smooth', block: 'center' }); return;
      }
      const b = document.getElementById('path'); b.disabled = true; b.textContent = 'Traduzindo…';
      fd.innerHTML = '<div class="thinking enter"><span></span><span></span><span></span> traduzindo o sentido, no seu celular</div>';
      try {
        const out = await analisar(L, txt);
        note(txt, true);
        const { nv, ns, nc } = saveAnalysis(L, out);
        toast(`Na sua lição: ${nv} verbo(s), ${ns} frase(s)${nc ? `, ${nc} conceito(s)` : ''}`);
        renderVerbs(L, '', out);
      } catch (e) {
        b.disabled = false; b.innerHTML = `${I.flip}Transformar em lição`;
        fd.innerHTML = `<div class="note enter"><span class="kicker">Não deu</span>${esc(String(e.message || e))}</div>`;
      }
    };
    function bindChips(root) {
      root.querySelectorAll('[data-v]').forEach(b => b.onclick = () => {
        const id = b.dataset.v, k = st.verbs.indexOf(id);
        if (k >= 0) st.verbs.splice(k, 1); else st.verbs.push(id);
        save(); renderVerbs(L, ta.value);
      });
    }
    bindChips(document.getElementById('bank'));
    $app.querySelectorAll('[data-open]').forEach(b => b.onclick = () => document.getElementById('open-' + b.dataset.open).classList.toggle('hide'));
    $app.querySelectorAll('[data-del]').forEach(b => b.onclick = e => { e.stopPropagation(); st.custom = st.custom.filter(c => c.id !== b.dataset.del); save(); renderVerbs(L); });
    $app.querySelectorAll('[data-delmy]').forEach(b => b.onclick = () => { st.myVerbs = st.myVerbs.filter(m => m.id !== b.dataset.delmy); save(); renderVerbs(L); });
    $app.querySelectorAll('[data-delsent]').forEach(b => b.onclick = () => { st.mySentences = st.mySentences.filter(m => m.id !== b.dataset.delsent); save(); renderVerbs(L); });
    document.getElementById('custom').onsubmit = e => {
      e.preventDefault();
      const pt = document.getElementById('cpt').value.trim(), t = document.getElementById('ctg').value.trim();
      const r = document.getElementById('cr')?.value.trim() || '';
      if (!pt || !t) return;
      st.custom.push({ id: Date.now().toString(36), pt, t, r }); save(); toast('Guardado no caderno.'); renderVerbs(L);
    };
  }

  /* ——— DIÁRIO: escrever livre e receber correção ——— */

  /* Verificação local (offline): pronome + verbo conjugado na pessoa errada. */
  const lexCache = {};
  function lexicon(L) {
    if (lexCache[L.id]) return lexCache[L.id];
    const verbs = [];
    const add = (e, name) => {
      if (!e || e.full || !Array.isArray(e)) return;
      const per = [...Array(8)].map((_, i) => {
        const f = L.id === 'en' ? (e.length === 8 ? e[i] : (i === 2 || i === 3 ? e[1] : e[0])) : e[MAP6[i]];
        return String(f).toLowerCase().split(' ')[0];
      });
      verbs.push({ name, per, all: new Set(per) });
    };
    const s = L.ser;
    add(s.forms8, 'to be'); add(s.forms6, s.label); add(s.ser6, 'ser'); add(s.estar6, 'estar');
    VERBS.forEach(v => add(v[L.id], v.pt));
    const pron = {};
    L.pron.forEach((p, i) => { const k = p.toLowerCase(); (pron[k] = pron[k] || []).push(i); });
    return (lexCache[L.id] = { verbs, pron });
  }
  function localCheck(L, text) {
    if (L.roman) return null;   // japonês, coreano e hebraico: só a correção completa
    const { verbs, pron } = lexicon(L);
    const toks = [...text.matchAll(/[\p{L}]+(?:[’'][\p{L}]+)?|[’']/gu)].map(m => ({ w: m[0], i: m.index }));
    const out = [];
    for (let k = 0; k < toks.length; k++) {
      const t = toks[k], lw = t.w.toLowerCase();
      const before = out.length;
      const idx = pron[lw];
      if (idx && toks[k + 1]) checkPair();
      if (L.id === 'en' && t.w === 'i') {
        if (out.length > before) { const x = out[out.length - 1]; x.fix = x.fix.replace(/^i\b/, 'I'); x.why += ' E “I” é sempre maiúsculo.'; }
        else out.push({ i: t.i, len: 1, orig: 'i', fix: 'I', why: '“I” (eu) é sempre maiúsculo em inglês.' });
      }
      continue;
      function checkPair() {
      const nx = toks[k + 1], nw = nx.w.toLowerCase();
      if (nx.i - (t.i + t.w.length) > 2) return;   // precisam estar lado a lado
      for (const v of verbs) {
        if (!v.all.has(nw)) continue;
        const ok = idx.map(i => v.per[i]);
        if (L.id === 'fr' && lw === 'je' && /^[aeiouhéèêâ]/i.test(nw) && ok.includes(nw)) {
          out.push({ i: t.i, len: nx.i + nx.w.length - t.i, orig: `${t.w} ${nx.w}`, fix: `j’${nx.w}`, why: 'Antes de vogal ou h, “je” vira “j’”.' });
        } else if (!ok.includes(nw)) {
          const pt = PT_PRON[idx[0]];
          out.push({ i: t.i, len: nx.i + nx.w.length - t.i, orig: `${t.w} ${nx.w}`, fix: `${t.w} ${ok[0]}`, why: `Com “${t.w}” (${pt}), o verbo ${v.name} fica “${ok[0]}”.` });
        }
        break;
      }
      // nenhum verbo conhecido: confere pela gramática (terminação regular da pessoa)
      if (out.length === before && !verbs.some(v => v.all.has(nw))) {
        let j = k + 1; const T = TERM[L.id];
        while (T && toks[j] && T.pula.includes(toks[j].w.toLowerCase().replace(/[’']$/, '')) && j < k + 4) j++;
        const vw = toks[j]; if (!vw) return;
        const r = confereTerminacao(L.id, t.w, vw.w);
        if (r) out.push({ i: t.i, len: vw.i + vw.w.length - t.i, orig: text.slice(t.i, vw.i + vw.w.length), fix: text.slice(t.i, vw.i) + r.fix, why: r.why });
      }
      }
    }
    return out;
  }

  function markLocal(text, issues) {
    let h = '', p = 0;
    issues.slice().sort((a, b) => a.i - b.i).forEach(x => {
      if (x.i < p) return;
      h += esc(text.slice(p, x.i)) + `<mark>${esc(text.slice(x.i, x.i + x.len))}</mark>`; p = x.i + x.len;
    });
    return h + esc(text.slice(p));
  }

  /* ——— O DIÁRIO: a vida da pessoa é o vocabulário ———
     Escreve em português ou na língua estudada; o diário descobre qual.
     Português → como dizer na outra língua (frase por frase, conceitos, palavra por palavra).
     Língua estudada → o que você disse + correção. Depois: “tente você” fecha o ciclo. */
  function renderDiary(L, openId, opts = {}) {
    const st = LS(L.id);
    st.journal = st.journal || []; st.fixes = st.fixes || [];
    let cur = openId ? st.journal.find(j => j.id === openId) : null;
    const rtl = L.dir === 'rtl' ? 'dir="rtl"' : '';
    const lname = L.name.toLowerCase();
    const date = new Date(cur ? cur.d : Date.now()).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
    const meantVal = opts.meant ?? (cur ? cur.meant || '' : '');
    $app.innerHTML = `
      ${topbar(`#/l/${L.id}`, L.name)}
      <div class="enter">
        <div class="kicker muted">Diário · ${esc(L.name)}</div>
        <h1 class="title-xl">Minha vida <em>em ${esc(lname)}</em></h1>
        <p class="lead">Escreva o seu dia, o que pensa, o que sente — <b>em português</b> ou <b>em ${esc(lname)}</b>. O diário descobre a língua e mostra o que é o quê.</p>
        <div class="diary journal">
          <div class="jdate mono">${esc(date)}</div>
          <textarea id="jtext" lang="${L.tts}" placeholder="${esc(opts.placeholder || `Ex.: Hoje acordei cansado, mas tomei um café e fui trabalhar…`)}" aria-label="Diário">${esc(opts.text ?? (cur ? cur.text : ''))}</textarea>
          <div class="meant ${meantVal ? '' : 'hide'}" id="meantbox"><label class="kicker muted" for="jmeant">O que eu quis dizer (em português)</label>
            <input id="jmeant" placeholder="ajuda a comparar o sentido" value="${esc(meantVal)}"></div>
          <div class="dbar">
            <button class="linkbtn" id="showmeant" ${meantVal ? 'hidden' : ''}>+ o que eu quis dizer</button>
            <button class="btn on" id="jgo">${I.flip}Ver o que é o quê</button>
          </div>
        </div>
        <div id="jres"></div>
        ${motorCard(L)}

        ${st.journal.length ? `<div class="subh">Páginas anteriores <span class="kicker">${st.journal.length}</span></div>
          <div class="pages">${st.journal.map(j => `<button class="page" data-j="${j.id}">
            <span class="mono muted">${new Date(j.d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>
            <span class="ptxt">${esc(j.text.slice(0, 70))}${j.text.length > 70 ? '…' : ''}</span>
            <span class="pbadge ${j.lang && j.lang !== 'pt' ? (j.fix && j.fix.ok ? 'good' : 'fixed') : ''}">${j.lang === 'pt' ? 'pt → ' + L.id : j.lang ? (j.fix && j.fix.ok ? '✓' : L.id) : '—'}</span>
          </button>`).join('')}</div>
          <button class="btn" id="jnew" style="margin-top:12px;width:100%">${I.plus}Nova página</button>` : ''}
      </div>`;

    const ta = document.getElementById('jtext'), me = document.getElementById('jmeant'), res = document.getElementById('jres');
    document.getElementById('showmeant').onclick = e => { e.target.hidden = true; document.getElementById('meantbox').classList.remove('hide'); me.focus(); };
    const persist = () => {
      const text = ta.value.trim(); if (!text) return null;
      if (!cur) { cur = { id: Date.now().toString(36), d: Date.now(), text, meant: '' }; st.journal.unshift(cur); st.journal = st.journal.slice(0, 365); }
      if (cur.text !== text) cur.fix = null;
      cur.text = text; cur.meant = me.value.trim(); save(); return cur;
    };
    let tmr; ta.addEventListener('input', () => { clearTimeout(tmr); tmr = setTimeout(persist, 800); });

    const saveFixes = list => {
      let n = 0;
      list.forEach(e => {
        if (!e.orig || !e.fix || e.orig === e.fix || st.fixes.some(f => f.orig === e.orig && f.fix === e.fix)) return;
        st.fixes.push({ id: Date.now().toString(36) + n, orig: e.orig, fix: e.fix }); n++;
      });
      st.fixes = st.fixes.slice(-80); save();
      toast(n ? `${n} correç${n > 1 ? 'ões' : 'ão'} no degrau 03 para treinar no papel` : 'Já estavam no caderno.');
    };

    /* português → língua estudada */
    const showPt = (c, out) => {
      res.innerHTML = `<div class="lang-badge enter">Escrito em <b>português</b> → ${esc(lname)}</div>
        ${analysisHTML(L, out)}
        <div class="loop">
          <div class="kicker">Agora é a sua vez</div>
          <p>Feche a tradução e tente escrever você mesmo em ${esc(lname)}. O diário compara com o que você quis dizer.</p>
          <button class="cta" id="try">${I.pen}Tentar escrever em ${esc(lname)}</button>
          <button class="btn" id="psave" style="width:100%;margin-top:10px">${I.plus}Guardar na minha lição</button>
        </div>`;
      bindSay(L, res); bindInter(res, L, 'pt');
      document.getElementById('psave').onclick = e => { const r = saveAnalysis(L, out); toast(`Na sua lição: ${r.nv} verbo(s), ${r.ns} frase(s)${r.nc ? `, ${r.nc} conceito(s)` : ''}`); e.currentTarget.disabled = true; };
      document.getElementById('try').onclick = () => { saveAnalysis(L, out); renderDiary(L, null, { text: '', meant: c.text, placeholder: `Escreva aqui em ${lname}, do seu jeito…` }); window.scrollTo(0, 0); setTimeout(() => document.getElementById('jtext').focus(), 100); };
    };

    /* língua estudada → o que você disse + correção */
    const showTg = fx => {
      const diff = fx.ref ? diffWords(fx.text, fx.ref) : null;
      res.innerHTML = `<div class="lang-badge enter">Escrito em <b>${esc(lname)}</b></div>
        <div class="fixcard enter">
          <div class="kicker">${fx.ok ? 'Parece certo!' : `Correção · ${fx.n} ${fx.n === 1 ? 'ponto' : 'pontos'}`}</div>
          <div class="fixtext ${fx.issues.length ? 'marked' : ''}" ${rtl}>${fx.issues.length ? markLocal(fx.text, fx.issues) : esc(fx.text)}</div>
        </div>
        <p class="il-hint">O que você disse — toque numa palavra para ver o sentido:</p>
        ${fx.toks ? interHTML(fx.src, fx.toks, rtl, '', lname, 'o que o app entendeu') : ''}
        <div class="understood">${fx.meant ? (fx.sim >= 55 ? '<b class="okc">✓ Seu sentido chegou.</b>' : '<b class="badc">⚠ O sentido pode ter mudado — compare com o que você quis dizer.</b>') : '<span class="muted">Escreva “o que eu quis dizer” para comparar o sentido.</span>'}</div>
        ${fx.issues.length ? `<div class="errs">${fx.issues.map(e => `<div class="err"><div ${rtl}><s>${esc(e.orig)}</s> <span class="arrow">→</span> <b>${esc(e.fix)}</b></div><p>${esc(e.why)}</p></div>`).join('')}</div>` : ''}
        ${fx.ref ? `<div class="refbox"><div class="kicker">Como o tradutor interno diria</div>
            <div class="reftext" ${rtl}>${esc(fx.ref)}</div>
            <button class="iconbtn" id="jsay" aria-label="Ouvir">${I.sound}</button>
            ${diff && diff.score < 100 ? `<div class="kicker" style="margin-top:10px">Diferenças</div><div class="diff" ${rtl}>${diff.parts.map(p => p.k === 'eq' ? esc(p.t) : p.k === 'del' ? `<s>${esc(p.t)}</s>` : `<ins>${esc(p.t)}</ins>`).join(' ')}</div>
            <p class="muted" style="font-size:13.5px;margin:6px 0 0">Riscado: só no seu texto. Verde: o tradutor usaria. Nem toda diferença é erro — às vezes são dois jeitos certos.</p>` : ''}</div>` : ''}
        ${fx.concepts && fx.concepts.length ? fx.concepts.map(c => `<div class="concept"><div class="c-pt">${esc(c.pt)}</div><p>${esc(c.diz)}</p>${c.t ? `<div class="c-tg"><span>${esc(c.por)}</span><b ${rtl}>${esc(c.t)}</b></div>` : ''}</div>`).join('') : ''}
        ${fx.issues.length || (fx.ref && diff && diff.score < 100) ? `<button class="cta" id="jtrain">${I.pen}Treinar as correções no papel</button>` : ''}`;
      bindInter(res, L, L.id);
      const sy = document.getElementById('jsay'); if (sy) sy.onclick = () => speak(fx.ref, L);
      const tr = document.getElementById('jtrain');
      if (tr) tr.onclick = () => saveFixes([...fx.issues, ...(fx.ref && diff && diff.score < 100 ? [{ orig: fx.text, fix: fx.ref }] : [])]);
    };

    const run = async () => {
      const c = persist(); if (!c) { ta.focus(); return; }
      if (!(await motorReady(L))) {
        res.innerHTML = `<div class="note enter"><span class="kicker">Falta o tradutor interno</span>O diário traduz e corrige dentro do celular. Baixe o tradutor de ${esc(lname)} uma vez (logo abaixo) — depois funciona sem internet.</div>`;
        document.getElementById('motor').scrollIntoView({ behavior: 'smooth', block: 'center' }); return;
      }
      const lang = detectaLingua(c.text, L.id);
      c.lang = lang;
      const b = document.getElementById('jgo'); b.disabled = true; b.textContent = lang === 'pt' ? 'Traduzindo…' : 'Corrigindo…';
      res.innerHTML = `<div class="thinking enter"><span></span><span></span><span></span> ${lang === 'pt' ? 'traduzindo o sentido' : 'lendo o seu ' + esc(lname)}, no seu celular</div>`;
      try {
        if (lang === 'pt') {
          const out = await analisar(L, c.text);
          note(c.text); save(); showPt(c, out);
        } else {
          const issues = localCheck(L, c.text) || [];
          const al = await mtAligned(L.id, 'pt', c.text);
          const back = al.text;
          let ref = '', sim = 0, concepts = [];
          if (c.meant) {
            const meantCtx = sujeitoOculto(frases(c.meant).map(falado)).map(x => conceitos(x).rewritten).join(' ');
            const { found } = conceitos(falado(c.meant));
            ref = clean(await mt('pt', L.id, meantCtx));
            sim = diffWords(falado(c.meant), back).score;
            for (const k of found) { const ex = exemplo(k); concepts.push({ pt: k.pt, diz: k.diz, por: ex, t: ex ? clean(await mt('pt', L.id, ex)) : '' }); }
          }
          const d = ref ? diffWords(c.text, ref) : null;
          const n = issues.length + (d && d.score < 70 ? 1 : 0);
          const fx = { text: c.text, meant: c.meant, back, src: al.src, toks: al.toks, ref, sim, issues, concepts, n, ok: !issues.length && (!ref || (d && d.score >= 70)) && (!c.meant || sim >= 55) };
          c.fix = fx; save(); showTg(fx);
        }
      } catch (e) {
        res.innerHTML = `<div class="note enter"><span class="kicker">Não deu</span>${esc(String(e.message || e))}</div>`;
      } finally { b.disabled = false; b.innerHTML = `${I.flip}Ver o que é o quê`; }
    };
    /* anota os verbos do que a pessoa fala (o ranking “os que eu mais falo”) */
    const note = txt => {
      const { found, extra } = detectVerbs(falado(txt));
      st.diary = st.diary || []; st.counts = st.counts || {};
      st.diary.unshift({ d: Date.now(), text: txt }); st.diary = st.diary.slice(0, 200);
      [...found, ...extra].forEach(id => st.counts[id] = (st.counts[id] || 0) + 1);
    };
    document.getElementById('jgo').onclick = run;
    bindMotor(L);
    $app.querySelectorAll('[data-j]').forEach(b => b.onclick = () => { renderDiary(L, b.dataset.j); window.scrollTo(0, 0); });
    const nb = document.getElementById('jnew'); if (nb) nb.onclick = () => { renderDiary(L); window.scrollTo(0, 0); };
    if (cur && cur.lang && cur.lang !== 'pt' && cur.fix && cur.fix.toks) showTg(cur.fix);
  }

  /* ——— LIÇÃO INTERATIVA: certo ou errado, conferido na hora ——— */
  function applyGrade(st, it, g) {
    const p = st.prog[it.id] || { b: 0, due: 0 };
    if (g === 3) p.b = Math.min(p.b + 1, 6); else if (g === 1) p.b = 1; else p.b = Math.max(p.b, 1);
    p.due = Date.now() + BOX_DAYS[p.b] * DAY - (BOX_DAYS[p.b] ? 36e5 : 0);
    st.prog[it.id] = p; save();
  }
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const norm = s => String(s).toLowerCase().normalize('NFC').replace(/[’`´]/g, "'").replace(/[.!?¡¿,;:。、]/g, '').replace(/\s+/g, ' ').trim();
  const bare = s => norm(s).normalize('NFD').replace(/[̀-ͯ]/g, '');
  const hasVoice = L => 'speechSynthesis' in window && voices.some(v => v.lang && v.lang.toLowerCase().startsWith(L.tts.slice(0, 2)));

  function distractors(it, pool, n = 3) {
    const same = it.id.match(/^[vm]:([^:]+):(\d)$/);
    const diff = pool.filter(x => x.t !== it.t);
    // verbos: primeiro a mesma conjugação em outra pessoa (o erro mais comum), depois outros verbos
    const near = same ? diff.filter(x => x.id.startsWith(`${it.id[0]}:${same[1]}:`)) : [];
    const out = [];
    for (const x of [...shuffle(near), ...shuffle(diff)]) { if (!out.some(o => o.t === x.t)) out.push(x); if (out.length >= n) break; }
    return out;
  }
  function pickKind(L, it, box) {
    const multi = it.t.includes(' ') && !it.t.includes('/');
    const kinds = ['choice'];
    if (hasVoice(L)) kinds.push('listen');
    if (box >= 1 && multi) kinds.push('build', 'build');
    if (box >= 2 && !L.roman && !it.t.includes('/')) kinds.push('type', 'type');
    if (box >= 3 && multi && !L.roman) kinds.push('type');
    return kinds[Math.floor(Math.random() * kinds.length)];
  }
  let audioCtx = null;
  function beep(ok) {
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const t = audioCtx.currentTime;
      (ok ? [660, 990] : [220, 180]).forEach((f, i) => {
        const o = audioCtx.createOscillator(), g = audioCtx.createGain();
        o.type = ok ? 'triangle' : 'sawtooth'; o.frequency.value = f;
        g.gain.setValueAtTime(.0001, t + i * .09); g.gain.exponentialRampToValueAtTime(ok ? .12 : .06, t + i * .09 + .01);
        g.gain.exponentialRampToValueAtTime(.0001, t + i * .09 + .16);
        o.connect(g).connect(audioCtx.destination); o.start(t + i * .09); o.stop(t + i * .09 + .18);
      });
    } catch (e) { /* sem som */ }
    try { navigator.vibrate && navigator.vibrate(ok ? 18 : [40, 50, 40]); } catch (e) { /* ok */ }
  }

  function renderLesson(L, step) {
    const st = LS(L.id);
    const pool = items(L, step);
    const { pick, extra } = pickSession(L, step);
    if (!pick.length) { go(`#/l/${L.id}/s/${step}`); return; }
    if (extra) toast('Tudo revisado! Rodada extra.');
    const queue = pick.map(it => ({ it, kind: pickKind(L, it, st.prog[it.id]?.b || 0) }));
    let k = 0, right = 0, wrong = 0, streak = 0, best = 0;
    const pickLen = queue.length;
    const rtl = L.dir === 'rtl' ? 'dir="rtl"' : '';
    const sc = !isLatin(L) ? 'script' : '';

    const show = () => {
      if (k >= queue.length) return finish();
      const { it, kind } = queue[k];
      const total = queue.length;
      let body = '', head = '';
      if (kind === 'choice' || kind === 'listen') {
        const opts = shuffle([it, ...distractors(it, pool)]);
        head = kind === 'listen'
          ? `<div class="kicker">Ouça e escolha</div><button class="listen" id="play" aria-label="Ouvir">${I.sound}</button>`
          : `<div class="kicker">Como se diz em ${esc(L.name.toLowerCase())}?</div><div class="pt">${esc(it.pt)}</div>`;
        body = `<div class="opts">${opts.map((o, i) => `<button class="opt ${sc}" data-o="${i}" ${rtl}><span class="key mono">${i + 1}</span>${esc(o.t)}${kind === 'listen' ? '' : ''}</button>`).join('')}</div>`;
        queue[k].opts = opts;
      } else if (kind === 'build') {
        const toks = it.t.split(' ');
        const extraTok = distractors(it, pool, 2).flatMap(d => d.t.split(' ')).filter(t => !toks.includes(t) && !t.includes('/')).slice(0, 2);
        queue[k].tiles = shuffle([...toks, ...extraTok]);
        head = `<div class="kicker">Monte a frase</div><div class="pt">${esc(it.pt)}</div>`;
        body = `<div class="answer-line ${sc}" id="line" ${rtl}><span class="ph">toque nas palavras</span></div>
          <div class="tiles" ${rtl}>${queue[k].tiles.map((t, i) => `<button class="tile ${sc}" data-t="${i}">${esc(t)}</button>`).join('')}</div>`;
      } else {
        head = `<div class="kicker">Escreva em ${esc(L.name.toLowerCase())}</div><div class="pt">${esc(it.pt)}</div>`;
        body = `<input class="typein" id="typein" lang="${L.tts}" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="digite aqui" ${rtl}>
          ${L.id === 'fr' || L.id === 'es' || L.id === 'de' || L.id === 'it' ? `<div class="accents">${({ fr: 'é è ê à ç ’ ô û', es: 'á é í ó ú ñ ü', de: 'ä ö ü ß', it: 'à è é ì ò ù' })[L.id].split(' ').map(c => `<button class="acc" data-c="${c}">${c}</button>`).join('')}</div>` : ''}`;
      }
      $app.innerHTML = `
        ${topbar(`#/l/${L.id}/s/${step}`, 'Sair', `<span class="score mono"><b class="okc">${right}</b> ✓ · <b class="badc">${wrong}</b> ✗${streak > 1 ? ` · 🔥${streak}` : ''}</span>`)}
        <div class="prog">${queue.map((_, i) => `<i class="${i < k ? 'done' : i === k ? 'cur' : ''}"></i>`).join('')}</div>
        <div class="lesson enter">
          <div class="prompt">${head}</div>
          ${body}
        </div>
        <div class="checkbar" id="bar">
          <button class="cta" id="check" ${kind === 'choice' || kind === 'listen' ? 'hidden' : 'disabled'}>Conferir</button>
        </div>`;
      bind(it, kind);
    };

    const bind = (it, kind) => {
      const q = queue[k];
      if (kind === 'listen') { const pl = document.getElementById('play'); pl.onclick = () => speak(it.t, L); setTimeout(() => speak(it.t, L), 250); }
      if (kind === 'choice' || kind === 'listen') {
        const choose = i => {
          const o = q.opts[i]; if (!o || q.done) return;
          $app.querySelectorAll('.opt').forEach((b, j) => { b.disabled = true; if (q.opts[j].t === it.t) b.classList.add('right'); });
          const ok = o.t === it.t;
          if (!ok) $app.querySelector(`[data-o="${i}"]`).classList.add('wrong');
          verdict(it, ok ? 3 : 1);
        };
        $app.querySelectorAll('.opt').forEach(b => b.onclick = () => choose(+b.dataset.o));
        q.key = e => { const n = +e.key; if (n >= 1 && n <= q.opts.length) choose(n - 1); };
      }
      if (kind === 'build') {
        const line = document.getElementById('line'), chk = document.getElementById('check');
        q.sel = [];
        const draw = () => {
          line.innerHTML = q.sel.length ? q.sel.map((ti, j) => `<button class="tile in ${sc}" data-j="${j}">${esc(q.tiles[ti])}</button>`).join('') : '<span class="ph">toque nas palavras</span>';
          $app.querySelectorAll('.tiles .tile').forEach(b => b.classList.toggle('used', q.sel.includes(+b.dataset.t)));
          line.querySelectorAll('[data-j]').forEach(b => b.onclick = () => { if (q.done) return; q.sel.splice(+b.dataset.j, 1); draw(); });
          chk.disabled = !q.sel.length;
        };
        $app.querySelectorAll('.tiles .tile').forEach(b => b.onclick = () => { if (q.done || q.sel.includes(+b.dataset.t)) return; q.sel.push(+b.dataset.t); draw(); });
        chk.onclick = () => {
          const ans = q.sel.map(i => q.tiles[i]).join(' ');
          verdict(it, norm(ans) === norm(it.t) ? 3 : 1, ans);
        };
      }
      if (kind === 'type') {
        const inp = document.getElementById('typein'), chk = document.getElementById('check');
        setTimeout(() => inp.focus(), 50);
        inp.oninput = () => { chk.disabled = !inp.value.trim(); };
        inp.onkeydown = e => { if (e.key === 'Enter' && inp.value.trim() && !q.done) chk.click(); };
        $app.querySelectorAll('.acc').forEach(b => b.onclick = () => {
          const s = inp.selectionStart ?? inp.value.length; inp.value = inp.value.slice(0, s) + b.dataset.c + inp.value.slice(inp.selectionEnd ?? s);
          inp.focus(); inp.setSelectionRange(s + 1, s + 1); chk.disabled = false;
        });
        chk.onclick = () => {
          const a = inp.value; inp.disabled = true;
          // aceita sem o pronome no espanhol e no italiano (“tengo” = “yo tengo”)
          const noPron = (L.id === 'es' || L.id === 'it') && it.t.includes(' ') ? it.t.split(' ').slice(1).join(' ') : null;
          const exact = norm(a) === norm(it.t) || (noPron && norm(a) === norm(noPron));
          const close = !exact && (bare(a) === bare(it.t) || (noPron && bare(a) === bare(noPron)));
          verdict(it, exact ? 3 : close ? 2 : 1, a);
        };
      }
    };

    const verdict = (it, g, given) => {
      const q = queue[k]; q.done = true;
      applyGrade(st, it, g);
      const ok = g === 3, close = g === 2;
      if (ok) { right++; streak++; best = Math.max(best, streak); } else { streak = 0; if (!close) { wrong++; if (queue.filter(x => x.it.id === it.id).length < 3 && queue.length < pickLen * 2) queue.push({ it, kind: 'choice' }); } else right++; }
      beep(ok || close);
      const lesson = $app.querySelector('.lesson'); lesson.classList.add(ok ? 'is-right' : close ? 'is-close' : 'is-wrong');
      const praise = ['Certo!', 'Isso!', 'Perfeito!', 'Muito bem!', 'Exato!'][Math.floor(Math.random() * 5)];
      document.getElementById('bar').innerHTML = `
        <div class="verdict ${ok ? 'ok' : close ? 'close' : 'bad'}">
          <div class="vrow"><b>${ok ? praise : close ? 'Quase! Cuidado com os acentos.' : 'Errado'}</b>
            <button class="iconbtn" id="vsay" aria-label="Ouvir">${I.sound}</button></div>
          ${ok ? '' : `<div class="vans"><span class="kicker">${close ? 'O certo é' : 'Resposta certa'}</span><div class="tg ${sc}" ${rtl}>${esc(it.t)}</div>${it.r ? `<small>${esc(it.r)}</small>` : ''}
            ${given && !close ? `<div class="given">Você: <s ${rtl}>${esc(given)}</s></div>` : ''}${!close && queue.length > k + 1 && queue[queue.length - 1].it.id === it.id ? '<div class="given">Volta no fim da lição.</div>' : ''}</div>`}
          <button class="cta" id="next">Continuar</button>
        </div>`;
      document.getElementById('vsay').onclick = () => speak(it.t, L);
      if (q.kind !== 'listen') speak(it.t, L);
      const nx = document.getElementById('next'); nx.focus();
      nx.onclick = () => { k++; show(); window.scrollTo(0, 0); };
      q.key = e => { if (e.key === 'Enter' && document.activeElement !== nx) nx.click(); };
    };

    const finish = () => {
      const m = Math.round(mastery(L, step) * 100), firsts = pick.length;
      const firstRight = Math.max(0, firsts - queue.slice(firsts).length);
      $app.innerHTML = `
        ${topbar(`#/l/${L.id}`, L.name)}
        <div class="finish enter">
          <div class="kicker muted">Lição concluída</div>
          <div class="seal"><div><b>${firstRight}/${firsts}</b><span>de primeira</span></div></div>
          <h1 class="title-xl">${firstRight === firsts ? 'Sem erros!' : m >= 60 ? 'Raiz firme.' : 'Mais uma lição.'}</h1>
          <p class="lead">${best > 2 ? `Melhor sequência: ${best} seguidas. ` : ''}${esc(STEPS[step].t)} está ${m}% firme. ${m >= 60 && step < 3 ? `Pode subir para o degrau 0${step + 1}: ${STEPS[step + 1].t}.` : 'Os erros voltam na próxima lição.'}</p>
          <button class="cta" id="more">${I.flip}Outra lição</button>
          <div class="actions-2">
            <a class="btn" href="#/l/${L.id}/p/${step}">${I.pen}Escrever no papel</a>
            <a class="btn on" href="#/l/${L.id}${m >= 60 && step < 3 ? '/s/' + (step + 1) : ''}">${m >= 60 && step < 3 ? 'Próximo' : 'Escada'}</a>
          </div>
        </div>`;
      document.getElementById('more').onclick = () => renderLesson(L, step);
    };

    lessonKeys = e => { const q = queue[k]; if (q && q.key && !(e.target && e.target.id === 'typein')) q.key(e); };
    show();
  }
  let lessonKeys = null;
  document.addEventListener('keydown', e => { if (lessonKeys && /\/l\/[a-z]+\/l\//.test(location.hash)) lessonKeys(e); });

  /* ——— PRÁTICA: escrever com o dedo ——— */
  let pad = null;
  function stopPad() { if (pad) { pad.destroy(); pad = null; } }

  function pickSession(L, step) {
    const p = LS(L.id).prog, now = Date.now();
    const all = items(L, step);
    const score = it => p[it.id] ? p[it.id].due : -1;
    let due = all.filter(it => !p[it.id] || p[it.id].due <= now);
    let extra = false;
    if (!due.length) { due = all.slice(); extra = true; due.sort((a, b) => (p[a.id]?.b || 0) - (p[b.id]?.b || 0)); }
    else due.sort((a, b) => score(a) - score(b) || Math.random() - .5);
    const pick = due.slice(0, SESSION);
    for (let i = pick.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pick[i], pick[j]] = [pick[j], pick[i]]; }
    return { pick, extra };
  }

  function renderPractice(L, step) {
    const st = LS(L.id);
    const { pick, extra } = pickSession(L, step);
    if (!pick.length) { go(`#/l/${L.id}/s/${step}`); return; }
    let k = 0, results = { 3: 0, 2: 0, 1: 0 };
    if (extra) toast('Tudo revisado! Rodada extra.');

    const show = () => {
      stopPad();
      if (k >= pick.length) return finish();
      const it = pick[k], usePad = st.mode === 'pad';
      $app.innerHTML = `
        ${topbar(`#/l/${L.id}/s/${step}`, 'Sair', `<button class="iconbtn" id="mode" aria-label="${usePad ? 'Usar papel de verdade' : 'Escrever na tela'}" title="${usePad ? 'Papel de verdade' : 'Escrever na tela'}">${usePad ? I.paper : I.phone}</button>`)}
        <div class="prog">${pick.map((_, i) => `<i class="${i < k ? 'done' : i === k ? 'cur' : ''}"></i>`).join('')}</div>
        <div class="prompt enter">
          <div class="kicker">Escreva em ${esc(L.name.toLowerCase())}</div>
          <div class="pt">${esc(it.pt)}</div>
        </div>
        <ol class="steps3" id="steps3"><li class="on">Escreva${usePad ? ' com o dedo' : ' no caderno'}</li><li>Veja a resposta</li><li>Diga como foi</li></ol>
        ${usePad ? `
          <div class="pad" id="pad">
            <div class="ghost ${st.ghost ? '' : 'hide'}" id="ghost" ${L.dir === 'rtl' ? 'dir="rtl"' : ''}>${esc(it.t)}</div>
            <canvas id="cv" aria-label="Folha para escrever com o dedo"></canvas>
            <span class="hint">${L.dir === 'rtl' ? '← escreva da direita p/ esquerda' : 'escreva com o dedo'}</span>
          </div>
          <div class="tools">
            <button class="btn" id="undo">${I.undo}Voltar</button>
            <button class="btn" id="clr">${I.clear}Limpar</button>
            <button class="btn ${st.ghost ? 'on' : ''}" id="gh">${I.ghost}Modelo</button>
            <button class="btn" id="say">${I.sound}Ouvir</button>
          </div>` : `
          <div class="realpaper enter"><div><b>Escreva no seu caderno.</b><span class="muted">Sem olhar. Depois toque em “Ver a resposta” e compare.</span></div></div>
          <div style="height:12px"></div>`}
        <div id="rev"><button class="cta" id="flip">${I.ghost}Ver a resposta</button></div>`;

      document.getElementById('mode').onclick = () => { st.mode = usePad ? 'paper' : 'pad'; save(); show(); };
      if (usePad) {
        pad = makePad(document.getElementById('cv'), document.getElementById('ghost'), it.t);
        document.getElementById('undo').onclick = () => pad.undo();
        document.getElementById('clr').onclick = () => pad.clear();
        document.getElementById('gh').onclick = e => { st.ghost = !st.ghost; save(); e.currentTarget.classList.toggle('on', st.ghost); document.getElementById('ghost').classList.toggle('hide', !st.ghost); };
        document.getElementById('say').onclick = () => speak(it.t, L);
      }
      document.getElementById('flip').onclick = () => reveal(it);
    };

    const reveal = it => {
      speak(it.t, L);
      document.querySelectorAll('#steps3 li').forEach((li, i) => li.className = i < 2 ? 'ok' : 'on');
      document.getElementById('rev').innerHTML = `
        <div class="answer">
          <div class="row2"><div><div class="kicker">Resposta certa</div><div class="tg" ${L.dir === 'rtl' ? 'dir="rtl"' : ''}>${esc(it.t)}</div>${it.r ? `<small>${esc(it.r)}</small>` : ''}</div>
          <button class="iconbtn" id="again" aria-label="Ouvir de novo">${I.sound}</button></div>
        </div>
        <p class="gradeq">Compare com o que você escreveu. Como foi?</p>
        <div class="grade">
          <button class="btn" data-g="1"><b>✗</b>Errei</button>
          <button class="btn" data-g="2"><b>≈</b>Quase</button>
          <button class="btn g3" data-g="3"><b>✓</b>Acertei</button>
        </div>`;
      document.getElementById('again').onclick = () => speak(it.t, L);
      document.querySelectorAll('[data-g]').forEach(b => b.onclick = () => grade(it, +b.dataset.g));
      document.getElementById('rev').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    };

    const grade = (it, g) => {
      const p = st.prog[it.id] || { b: 0, due: 0 };
      if (g === 3) p.b = Math.min(p.b + 1, 6); else if (g === 1) p.b = 1; else p.b = Math.max(p.b, 1);
      p.due = Date.now() + BOX_DAYS[p.b] * DAY - (BOX_DAYS[p.b] ? 36e5 : 0);
      st.prog[it.id] = p; results[g]++; save();
      if (g === 1) pick.push(it);   // volta no fim da rodada
      k++; show();
    };

    const finish = () => {
      const m = Math.round(mastery(L, step) * 100);
      const total = results[1] + results[2] + results[3];
      $app.innerHTML = `
        ${topbar(`#/l/${L.id}`, L.name)}
        <div class="finish enter">
          <div class="kicker muted">Página concluída</div>
          <div class="seal"><div><b>${results[3]}/${total}</b><span>de primeira</span></div></div>
          <h1 class="title-xl">${m >= 60 ? 'Raiz firme.' : 'Mais uma página.'}</h1>
          <p class="lead">${esc(STEPS[step].t)} está ${m}% firme. ${m >= 60 && step < 3 ? `Pode subir para o degrau 0${step + 1}: ${STEPS[step + 1].t}.` : 'O caderno chama de volta cada item na hora certa.'}</p>
          <button class="cta" id="more">${I.pen}Outra página</button>
          <div class="actions-2">
            <a class="btn" href="#/l/${L.id}/s/${step}">${I.paper}Folha</a>
            <a class="btn on" href="#/l/${L.id}${m >= 60 && step < 3 ? '/s/' + (step + 1) : ''}">${m >= 60 && step < 3 ? 'Próximo' : 'Escada'}</a>
          </div>
        </div>`;
      document.getElementById('more').onclick = () => renderPractice(L, step);
    };
    show();
  }

  /* ——— a folha de desenho ——— */
  function makePad(cv, ghost, text) {
    const ctx = cv.getContext('2d');
    let strokes = [], cur = null, dpr = 1;
    const inkColor = () => getComputedStyle(document.documentElement).getPropertyValue('--ink').trim() || '#17140F';
    function fitGhost() {
      if (!ghost) return;
      const w = cv.clientWidth - 60, h = cv.clientHeight - 40, len = [...text].length;
      const cjk = /[぀-ヿ一-鿿가-힯]/.test(text);
      let fs = Math.min(h * .55, (w / Math.max(len, 1)) * (cjk ? 1 : 1.75));
      fs = Math.max(26, Math.min(fs, 96));
      ghost.style.fontSize = fs + 'px';
    }
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 3);
      cv.width = cv.clientWidth * dpr; cv.height = cv.clientHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); redraw(); fitGhost();
    }
    function seg(s) {
      const pts = s.pts; if (!pts.length) return;
      ctx.strokeStyle = s.color; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      if (pts.length === 1) { ctx.beginPath(); ctx.fillStyle = s.color; ctx.arc(pts[0].x, pts[0].y, pts[0].w / 2, 0, 7); ctx.fill(); return; }
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i], m0 = i > 1 ? mid(pts[i - 2], a) : a, m1 = mid(a, b);
        ctx.beginPath(); ctx.lineWidth = (a.w + b.w) / 2; ctx.moveTo(m0.x, m0.y); ctx.quadraticCurveTo(a.x, a.y, m1.x, m1.y); ctx.stroke();
      }
    }
    const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
    function redraw() { ctx.clearRect(0, 0, cv.width, cv.height); strokes.forEach(seg); }
    function pt(e) {
      const r = cv.getBoundingClientRect();
      const pr = e.pointerType === 'pen' && e.pressure ? e.pressure : .5;
      return { x: e.clientX - r.left, y: e.clientY - r.top, w: 2.2 + pr * 4.2 };
    }
    function down(e) { e.preventDefault(); cv.setPointerCapture(e.pointerId); cur = { color: inkColor(), pts: [pt(e)] }; strokes.push(cur); redraw(); }
    function move(e) {
      if (!cur) return; e.preventDefault();
      const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      for (const ev of evs) {
        const p = pt(ev), last = cur.pts[cur.pts.length - 1];
        const d = Math.hypot(p.x - last.x, p.y - last.y); if (d < 1.2) continue;
        if (ev.pointerType !== 'pen') p.w = Math.max(2.4, Math.min(6.2, last.w * .7 + (6.4 - Math.min(d, 18) * .22) * .3));  // tinta: devagar = traço grosso
        cur.pts.push(p);
      }
      redraw();
    }
    function up() { cur = null; }
    cv.addEventListener('pointerdown', down);
    cv.addEventListener('pointermove', move);
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', up);
    window.addEventListener('resize', resize);
    requestAnimationFrame(resize);
    return {
      undo() { strokes.pop(); redraw(); },
      clear() { strokes = []; redraw(); },
      destroy() { window.removeEventListener('resize', resize); }
    };
  }

  /* ——— instalar no Android (e iPhone) ——— */
  let installEvt = null;
  const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; if (!location.hash || location.hash === '#/') renderHome(); });
  window.addEventListener('appinstalled', () => { installEvt = null; toast('RAIZ instalado! Abra pelo ícone.'); if (!location.hash || location.hash === '#/') renderHome(); });
  const apkMatch = navigator.userAgent.match(/RAIZAPK\/(\d+)\/(\d+)/);   // dentro do APK
  const inApk = !!apkMatch || !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  let apkInfo = null;
  function loadApkInfo() {
    fetch('apk.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).then(j => {
      if (!j) return; apkInfo = j;
      if (!location.hash || location.hash === '#/') renderHome();
    }).catch(() => {});
  }
  function installCard() {
    if (inApk) {
      // O conteúdo já se atualiza sozinho; só avisa quando a parte nativa do APK mudou.
      const native = apkMatch ? +apkMatch[1] : 0;
      if (!apkInfo || !native || apkInfo.native <= native) return '';
      return `<section class="install enter"><div class="inst-ico" aria-hidden="true">R</div>
        <div><b>Novo APK do RAIZ</b><span>Versão ${esc(apkInfo.versionName)} com melhorias no app Android. Baixe e instale por cima — seu progresso continua.</span></div>
        <a class="cta" href="RAIZ.apk" download>Baixar APK</a></section>`;
    }
    if (standalone()) return '';
    const how = installEvt ? '' : isIOS
      ? '<p>No iPhone: toque em <b>Compartilhar</b> e depois em <b>Adicionar à Tela de Início</b>.</p>'
      : '<p>No Android: abra no <b>Chrome</b>, toque no menu <b>⋮</b> e em <b>Instalar app</b> (ou “Adicionar à tela inicial”).</p>';
    return `<section class="install enter">
      <div class="inst-ico" aria-hidden="true">R</div>
      <div><b>Instale o RAIZ</b><span>Vira um app no seu celular: ícone próprio, tela cheia, funciona sem internet e se atualiza sozinho.</span>${how}</div>
      ${installEvt ? '<button class="cta" id="install">Instalar app</button>' : ''}
      ${apkInfo && !isIOS ? `<a class="btn apk" href="RAIZ.apk" download>⬇ Baixar APK para Android · v${esc(apkInfo.versionName)}</a>` : ''}
    </section>`;
  }
  function bindInstall() {
    const b = document.getElementById('install'); if (!b) return;
    b.onclick = async () => { if (!installEvt) return; installEvt.prompt(); const r = await installEvt.userChoice; installEvt = null; if (r.outcome !== 'accepted') renderHome(); };
  }

  /* ——— atualização automática ——— */
  // A cada publicação o service worker muda; o app baixa a versão nova sozinho e recarrega.
  function announceNews() {
    let seen = null; try { seen = localStorage.getItem('raiz-seen'); } catch (e) { /* ok */ }
    const v = NEWS[0].v;
    if (seen && seen !== v) {
      const fresh = NEWS.slice(0, Math.max(1, NEWS.findIndex(n => n.v === seen))).map(n => n.t).join(' · ');
      setTimeout(() => toast('Atualizado ✓ ' + fresh), 600);
    }
    try { localStorage.setItem('raiz-seen', v); } catch (e) { /* ok */ }
  }
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    let hadController = !!navigator.serviceWorker.controller;
    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController) { hadController = true; return; }   // primeira instalação: nada a recarregar
      if (reloading) return;
      // não interrompe quem está escrevendo: recarrega quando sair da página de prática/diário
      const busy = () => /\/(p|d)(\/|$)/.test(location.hash);
      const go = () => { if (reloading) return; reloading = true; location.reload(); };
      if (!busy()) go(); else { toast('Nova versão pronta — aplica ao sair desta página.'); window.addEventListener('hashchange', () => { if (!busy()) go(); }); }
    });
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(reg => {
        const check = () => reg.update().catch(() => {});
        document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
        setInterval(check, 30 * 60e3);
      }).catch(() => {});
    });
  }
  announceNews();
  if (location.protocol !== 'file:') loadApkInfo();

  route();
})();
