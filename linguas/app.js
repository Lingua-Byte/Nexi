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
    { v: '2.5', t: 'caminho claro e ciclo do dia: escrever → entender → praticar → escrever sozinho. O resto foi para “Mais”' },
    { v: '2.4', t: 'treinos a partir de você: reescrever, variações, ler, falar, meus erros, mapa e medidor de confiança' },
    { v: '2.3', t: 'o diário libera palavras e conceitos: coleção, palavras vizinhas, missões, nível e Pares' },
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
  function speak(text, L, rate = .85) {
    if (!('speechSynthesis' in window)) { toast('Seu navegador não tem voz.'); return; }
    const clean = String(text).replace(/〜|~/g, '').replace(/\s*\/\s*/g, ', ');
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = L.tts; u.rate = rate;
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
    if (step === 4) return Object.values(LS(L.id).vocab || {}).map(v => ({ id: 'w:' + v.pt, pt: v.pt, t: v.t, r: v.r || '' }));
    if (step === 5) return (LS(L.id).vars || []).map(v => ({ id: 'x:' + v.id, pt: v.pt, t: v.t, r: '' }));
    if (step === 6) {
      const st = LS(L.id), dia = cicloHoje(L), fr = new Set(dia.frases || []), hoje = new Date().toDateString();
      const all = [
        ...(st.mySentences || []).filter(s => fr.has(s.pt)).map(s => ({ id: 's:' + s.id, pt: s.pt, t: s.t, r: s.r || '' })),
        ...(st.vars || []).filter(v => fr.has(v.base)).map(v => ({ id: 'x:' + v.id, pt: v.pt, t: v.t, r: '' })),
        ...Object.values(st.vocab || {}).filter(v => v.src === 'diário' && v.d && new Date(v.d).toDateString() === hoje).map(v => ({ id: 'w:' + v.pt, pt: v.pt, t: v.t, r: v.r || '' })),
        ...[3, 4, 5].flatMap(s => items(L, s)).filter(it => { const p = st.prog[it.id]; return p && p.due <= Date.now(); }).slice(0, 6)
      ];
      return all.filter((x, i) => all.findIndex(y => y.id === x.id) === i);
    }
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
    4: { t: 'Meu vocabulário', k: 'Do seu diário', d: 'As palavras que vieram da sua vida.' },
    5: { t: 'Variações', k: 'Da sua frase', d: 'As suas frases em outras pessoas e tempos.' },
    6: { t: 'Prática de hoje', k: 'Do seu dia', d: 'As frases que você escreveu hoje.' },
    3: { t: 'Meus verbos', k: 'Do que eu falo', d: 'Escreva qualquer frase do seu dia: o app acha os verbos e transforma em lição.' }
  };

  /* ——— rotas ——— */
  function route() {
    const h = location.hash.replace(/^#\/?/, '').split('/');
    stopPad(); emLicao = false; setTimeout(mostrarFesta, 400);
    if (h[0] === 'l' && byId[h[1]]) {
      const L = byId[h[1]]; setLangColors(L);
      if (h[2] === 's') return renderStudy(L, +h[3] || 1);
      if (h[2] === 'p') return renderPractice(L, +h[3] || 1);
      if (h[2] === 'l') return renderLesson(L, +h[3] || 1);
      if (h[2] === 'd') return renderDiary(L);
      if (h[2] === 't') return renderDiary(L);   // o tradutor agora vive no diário
      if (h[2] === 'c') return renderColecao(L);
      if (h[2] === 'v') return renderVocab(L);
      if (h[2] === 'g') return renderPares(L);
      if (h[2] === 'w') return renderReescrever(L);
      if (h[2] === 'h') return renderHoje(L);
      if (h[2] === 'x') return renderVariacoes(L);
      if (h[2] === 'r') return renderLer(L);
      if (h[2] === 'f') return renderFalar(L);
      if (h[2] === 'e') return renderErros(L);
      if (h[2] === 'm') return renderMapa(L);
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
  /* ——— O CAMINHO E O CICLO DO DIA ———
     Um app de ensino precisa de um caminho (para onde vou) e de um ciclo (o que faço hoje).
     Caminho: Pronomes → Ser & estar → Dia 1, Dia 2, Dia 3…
     Ciclo de cada dia: 1 Escrever → 2 Entender → 3 Praticar → 4 Sozinho. */
  function cicloHoje(L) {
    const st = LS(L.id);
    st.dias = st.dias || [];
    if (!st.dia || st.dia.date !== hojeK()) { st.dia = { date: hojeK(), step: 0, pt: '', frases: [] }; save(); }
    return st.dia;
  }
  function estacaoRaiz(L) { if (mastery(L, 1) < .6) return 1; if (mastery(L, 2) < .6) return 2; return 0; }
  function perguntaDoDia(L) {
    const g = G(L), dom = g.dom || {};
    const ordem = CAMPOS.slice().sort((x, y) => (dom[x.id] || 0) - (dom[y.id] || 0));
    const c = ordem[new Date().getDate() % 5] || CAMPOS[0];
    return { campo: c, q: PERGUNTAS[c.id] };
  }
  const PASSOS = [['✍', 'Escrever', 'Uma a três frases sobre o seu dia, em português, do seu jeito.'],
    ['👁', 'Entender', 'Ver como se diz, palavra por palavra.'],
    ['▶', 'Praticar', 'Dois minutos com as suas frases de hoje e o que está para revisar.'],
    ['✎', 'Sozinho', 'Escrever de novo na língua, sem olhar. O diário corrige.']];

  function renderLang(L) {
    const st = LS(L.id), dia = cicloHoje(L), raiz = estacaoRaiz(L), g = G(L), seq = sequencia(g);
    const lname = L.name.toLowerCase();
    let hoje;
    if (raiz) {
      const s = STEPS[raiz], m = Math.round(mastery(L, raiz) * 100);
      hoje = `<section class="hoje enter">
        <div class="kicker">Hoje · a raiz, parte ${raiz} de 2</div>
        <h2>${esc(s.t)}</h2><p>${esc(s.d)} Antes de escrever a sua vida, a base: ${raiz === 1 ? 'quem fala' : 'os verbos que ligam tudo'}.</p>
        <div class="meter"><i style="width:${m}%"></i></div>
        <p class="h-sub">${m}% firme — com 60% o caminho continua.</p>
        <a class="cta" href="#/l/${L.id}/s/${raiz}">${I.flip}${m ? 'Continuar' : 'Começar'}</a></section>`;
    } else if (dia.step >= 4) {
      hoje = `<section class="hoje done enter">
        <div class="kicker">Hoje · dia ${st.dias.length}</div>
        <div class="h-seal">✓</div><h2>Dia completo</h2>
        <p>Você escreveu, entendeu, praticou e escreveu sozinho. Amanhã tem mais um dia no caminho.</p>
        <a class="btn" style="width:100%" href="#/l/${L.id}/d">${I.pen}Escrever mais no diário (livre)</a></section>`;
    } else {
      const q = perguntaDoDia(L);
      hoje = `<section class="hoje enter">
        <div class="kicker">Hoje · dia ${st.dias.length + 1}</div>
        <ol class="ciclo">${PASSOS.map((x, i) => `<li class="${i < dia.step ? 'ok' : i === dia.step ? 'on' : ''}"><b>${i < dia.step ? '✓' : x[0]}</b><span>${x[1]}</span></li>`).join('')}</ol>
        <h2>${dia.step + 1}. ${PASSOS[dia.step][1]}</h2>
        <p>${dia.step === 0 ? `<i>${esc(q.q)}</i><br>${esc(PASSOS[0][2])}` : esc(PASSOS[dia.step][2])}</p>
        <a class="cta" href="#/l/${L.id}/h">${dia.step === 0 || dia.step === 3 ? I.pen : I.flip}${['Escrever', 'Ver o que é o quê', 'Praticar agora', 'Escrever sozinho'][dia.step]}</a></section>`;
    }
    // o caminho: as estações da raiz e os dias
    const dias = st.dias.map((d, i) => ({ t: `Dia ${i + 1}`, sub: d.pt, ok: true }));
    const est = [
      { t: 'Pronomes', sub: 'eu, você, ele, ela…', ok: mastery(L, 1) >= .6, cur: raiz === 1, href: `#/l/${L.id}/s/1` },
      { t: 'Ser & estar', sub: 'os verbos que ligam tudo', ok: mastery(L, 2) >= .6, cur: raiz === 2, href: `#/l/${L.id}/s/2` },
      ...(dias.length > 4 ? [{ t: `+ ${dias.length - 4} dias`, sub: '', ok: true, mini: true }, ...dias.slice(-4)] : dias),
      { t: `Dia ${st.dias.length + 1}`, sub: raiz ? 'depois da raiz' : dia.step >= 4 ? 'amanhã' : 'hoje', ok: false, cur: !raiz && dia.step < 4, href: raiz || dia.step >= 4 ? '' : `#/l/${L.id}/h` },
      { t: '…', sub: 'a sua vida continua o caminho', ok: false, futuro: true }
    ];
    $app.innerHTML = `
      ${topbar('#/', 'Cadernos', `<span class="score mono">${seq ? '🔥 ' + seq + (seq === 1 ? ' dia' : ' dias') : 'nível ' + nivel(g.xp)}</span>`)}
      <section class="hero small enter">
        <span class="big ${isLatin(L) ? 'latin' : ''} ${isLatin(L) && L.glyph.length > 2 ? 'long' : ''}" ${L.dir === 'rtl' ? 'dir="rtl"' : ''} aria-hidden="true">${esc(L.glyph)}</span>
        <div class="nat">${esc(L.native)}</div>
        <h1>${esc(L.name)}</h1>
      </section>
      ${hoje}
      <div class="section-h" style="margin:26px 0 10px"><h2>O caminho</h2><span class="kicker muted">${st.dias.length} ${st.dias.length === 1 ? 'dia completo' : 'dias completos'}</span></div>
      <ol class="trilha">${est.map(x => `<li class="${x.ok ? 'ok' : ''} ${x.cur ? 'cur' : ''} ${x.futuro ? 'fut' : ''} ${x.mini ? 'mini' : ''}">
        <span class="t-dot">${x.ok ? '✓' : x.cur ? '●' : ''}</span>
        ${x.href ? `<a href="${x.href}">` : '<div>'}<b>${esc(x.t)}</b>${x.sub ? `<small>${esc(String(x.sub).slice(0, 60))}${String(x.sub).length > 60 ? '…' : ''}</small>` : ''}${x.href ? '</a>' : '</div>'}
      </li>`).join('')}</ol>
      <details class="mais"><summary>Mais para explorar</summary>
        <div class="mais-grid">
          <a href="#/l/${L.id}/d">✍ Diário livre</a><a href="#/l/${L.id}/r">📖 Ler um texto</a>
          <a href="#/l/${L.id}/f">🎙 Falar</a><a href="#/l/${L.id}/g">◧ Pares</a>
          <a href="#/l/${L.id}/v">🌱 Meu vocabulário</a><a href="#/l/${L.id}/c">✦ Coleção</a>
          <a href="#/l/${L.id}/x">⇄ Variações</a><a href="#/l/${L.id}/w">✎ Reescrever</a>
          <a href="#/l/${L.id}/e">⚠ Meus erros</a><a href="#/l/${L.id}/m">🗺 Mapa</a>
          <a href="#/l/${L.id}/s/3">🔤 Meus verbos</a><a href="#/l/${L.id}/s/1">🌱 A raiz</a>
        </div>
      </details>
      <div style="margin-top:18px">${motorCard(L)}</div>`;
    bindMotor(L);
  }

  /* Leva para o passo atual do dia */
  function renderHoje(L) {
    const dia = cicloHoje(L), raiz = estacaoRaiz(L), lname = L.name.toLowerCase();
    if (raiz) { go(`#/l/${L.id}/s/${raiz}`); return; }
    if (dia.step <= 1) {
      const q = perguntaDoDia(L);
      return renderDiary(L, null, { ciclo: 'escrever', text: dia.pt || '', auto: dia.step === 1 && !!dia.pt, placeholder: 'Escreva aqui, em português…',
        banner: `<div class="rew-banner"><div class="kicker">Passo 1 de 4 · Escrever</div><p>${esc(q.q)}</p><span>Uma a três frases, em português, do seu jeito — gíria e expressão valem. Depois o app mostra como se diz em ${esc(lname)}.</span></div>` });
    }
    if (dia.step === 2) return renderLesson(L, 6);
    if (dia.step === 3) return renderDiary(L, null, { ciclo: 'sozinho', text: '', meant: dia.pt, placeholder: `Escreva em ${lname}, sem olhar…`,
      banner: `<div class="rew-banner"><div class="kicker">Passo 4 de 4 · Sozinho</div><p>“${esc(dia.pt)}”</p><span>Agora escreva isso em ${esc(lname)}, sem olhar a tradução. Do jeito que conseguir — o diário corrige.</span></div>` });
    go(`#/l/${L.id}`);
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
      // confiança: traduz de volta e compara com o que foi dito (protege de aprender erro do tradutor)
      const back = clean(await mt(L.id, 'pt', t));
      const conf = diffWords(rewritten.replace(/[.!?…]+$/, ''), back).score;
      out.sentences.push({ pt: s, via: rewritten !== s ? rewritten : '', t, r: roman(L, t), src: al.src, toks: al.toks, conceitos: found.map(c => c.id), back, conf });
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
          ${s.conf !== undefined ? (s.conf < 45 ? `<div class="conf low">⚠ Tradução incerta — traduzindo de volta, o app entendeu: <i>${esc(s.back)}</i>. Confira antes de decorar; tente dizer de outro jeito.</div>` : `<div class="conf ok">✓ confiável · de volta: <i>${esc(s.back)}</i></div>`) : ''}
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
        <h1 class="title-xl">${opts.ciclo ? 'Hoje' : opts.rewriteOf ? 'Reescrever' : 'Minha vida'} <em>em ${esc(lname)}</em></h1>
        ${opts.banner || `<p class="lead">Escreva o seu dia, o que pensa, o que sente — <b>em português</b> ou <b>em ${esc(lname)}</b>. O diário descobre a língua e mostra o que é o quê.</p>`}
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

        ${st.journal.length && !opts.ciclo ? `<div class="subh">Páginas anteriores <span class="kicker">${st.journal.length}</span></div>
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
      if (opts.ciclo === 'escrever') return showCiclo(c, out);
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

    /* ciclo do dia, passo 2: entender — e já prepara a prática com as frases e as variações delas */
    const showCiclo = async (c, out) => {
      const dia = cicloHoje(L);
      saveAnalysis(L, out);
      dia.pt = c.text; dia.frases = out.sentences.filter(s => s.t).map(s => s.pt); dia.step = Math.max(dia.step, 1); save();
      res.innerHTML = `<div class="passo-tag enter">Passo 2 de 4 · Entender</div>
        ${analysisHTML(L, out)}
        <div class="loop">
          <div class="kicker">Próximo passo</div>
          <p>Praticar essas frases (e as mesmas em outras pessoas e tempos), com certo e errado na hora.</p>
          <button class="cta" id="cgo" disabled>${I.flip}Preparando a prática…</button>
        </div>`;
      bindSay(L, res); bindInter(res, L, 'pt');
      // variações das frases de hoje (outra pessoa / outro tempo), traduzidas no aparelho
      try {
        st.vars = st.vars || []; let n = 0;
        for (const f of dia.frases.slice(0, 3)) {
          for (const v of variacoes(falado(f)).slice(0, 2)) {
            if (st.vars.some(x => x.pt === v.pt)) { const x = st.vars.find(x => x.pt === v.pt); x.base = f; continue; }
            const t = clean(await mt('pt', L.id, conceitos(falado(v.pt)).rewritten));
            if (t) st.vars.push({ id: Date.now().toString(36) + 'x' + (n++), pt: v.pt, t, base: f });
          }
        }
        st.vars = st.vars.slice(-150); save();
      } catch (e) { /* sem variações, a prática segue com as frases */ }
      const b = document.getElementById('cgo'); if (!b) return;
      b.disabled = false; b.innerHTML = `${I.flip}Praticar o que escrevi`;
      b.onclick = () => { dia.step = 2; save(); renderHoje(L); window.scrollTo(0, 0); };
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
          c.tr = out.sentences.map(s => s.t).join(' ');
          note(c.text); save(); showPt(c, out); marcarDominios(L, c.text);
          colher(L, c.text, out).catch(() => {});
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
          registrarErros(L, issues, d && d.score < 70 ? `“${c.text}” → “${ref}”` : '');
          marcarDominios(L, c.meant || c.text);
          if (opts.rewriteOf) {
            const orig = st.journal.find(j => j.id === opts.rewriteOf);
            if (orig) { orig.rew = Date.now(); orig.tries = orig.tries || []; const score = ref ? diffWords(c.text, ref).score : sim; orig.tries.unshift({ d: Date.now(), text: c.text, score }); save();
              contar(L, 'reescrever'); ganharXP(L, 20);
              celebrar({ icone: '✍', kicker: 'Página reescrita', titulo: `${score}% parecida com o natural`, corpo: orig.tries[1] ? `Da última vez: ${orig.tries[1].score}%. ${score > orig.tries[1].score ? 'Você melhorou!' : 'Continue — a próxima volta em uma semana.'}` : 'Ela volta em uma semana para você ver o quanto melhorou.' }); }
          }
          if (opts.ciclo === 'sozinho') {
            const dia = cicloHoje(L), score = ref ? diffWords(c.text, ref).score : sim;
            if (dia.step < 4) { dia.step = 4; st.dias.push({ date: dia.date, pt: dia.pt, t: c.text, score }); ganharXP(L, 30);
              celebrar({ icone: '✓', kicker: `Dia ${st.dias.length} completo`, titulo: `${score}% parecido com o natural`, corpo: 'Escreveu, entendeu, praticou e escreveu sozinho. Amanhã o caminho continua.' }); }
            save();
            res.insertAdjacentHTML('beforeend', `<a class="cta" href="#/l/${L.id}" style="margin-top:16px">${I.flip}Voltar ao caminho</a>`);
          }
          const nFr = frases(c.text).length; contar(L, 'alvo', nFr); contar(L, 'frases', nFr); ganharXP(L, 15 * nFr);
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
    if (opts.auto && ta.value.trim()) run();
  }

  /* ——— JOGO: o diário libera palavras e conceitos ——— */
  const hojeK = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
  const diaK = d => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  function G(L) {
    const st = LS(L.id);
    st.game = st.game || { xp: 0, days: {}, unlocked: {}, fields: {}, today: {} };
    st.vocab = st.vocab || {};
    const g = st.game;
    if (g.today.date !== hojeK()) g.today = { date: hojeK(), frases: 0, acertos: 0, palavras: 0, conceitos: 0, pares: 0, alvo: 0, ok: {} };
    return g;
  }
  const nivel = xp => Math.floor(Math.sqrt(xp / 40)) + 1;
  const xpDoNivel = n => 40 * (n - 1) * (n - 1);
  function sequencia(g) {
    const d = new Date(); let n = 0;
    if (!g.days[diaK(d)]) d.setDate(d.getDate() - 1);
    while (g.days[diaK(d)]) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }
  const MISSOES = L => [
    { id: 'frases', t: 'Escreva 3 frases no diário', meta: 3 },
    { id: 'acertos', t: 'Acerte 10 numa lição', meta: 10 },
    { id: 'palavras', t: 'Ganhe 5 palavras novas', meta: 5 },
    { id: 'conceitos', t: 'Descubra 1 conceito', meta: 1 },
    { id: 'pares', t: 'Vença uma partida de Pares', meta: 1 },
    { id: 'alvo', t: `Escreva 1 frase em ${L.name.toLowerCase()}`, meta: 1 },
    { id: 'reescrever', t: 'Reescreva uma página antiga', meta: 1 },
    { id: 'ler', t: `Leia um texto em ${L.name.toLowerCase()}`, meta: 1 },
    { id: 'falar', t: 'Grave 3 frases em voz alta', meta: 3 },
    { id: 'variar', t: 'Acerte 5 variações', meta: 5 }
  ];
  function missoesDoDia(L) {
    const k = hojeK() + L.id; let h = 0; for (const c of k) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    const pool = MISSOES(L), out = [];
    while (out.length < 3) { const m = pool[h % pool.length]; if (!out.includes(m)) out.push(m); h = (h * 1103515245 + 12345) >>> 0; }
    return out;
  }
  /* fila de comemorações (carimbos) */
  const festa = [];
  function celebrar(item) {
    festa.push(item);
    if (festa.length === 1) mostrarFesta();
  }
  let emLicao = false;   // comemorações esperam a lição acabar (não interrompem a prática)
  function mostrarFesta() {
    const it = festa[0]; if (!it || emLicao || document.querySelector('.festa')) return;
    const ov = document.createElement('div');
    ov.className = 'festa ' + (it.raro || '');
    ov.innerHTML = `<div class="festa-card"><div class="festa-ico">${it.icone || '★'}</div><div class="kicker">${esc(it.kicker)}</div>
      <h2>${esc(it.titulo)}</h2>${it.corpo ? `<p>${it.corpo}</p>` : ''}<button class="cta">Continuar</button></div>`;
    document.body.appendChild(ov);
    beep(true);
    ov.querySelector('button').onclick = () => { ov.remove(); festa.shift(); mostrarFesta(); };
  }
  function ganharXP(L, n) {
    const g = G(L), antes = nivel(g.xp);
    g.xp += n; g.days[hojeK()] = true; save();
    const depois = nivel(g.xp);
    if (depois > antes) toast(`⬆ Nível ${depois} em ${L.name.toLowerCase()}`);
  }
  function contar(L, chave, n = 1) {
    const g = G(L); g.today[chave] = (g.today[chave] || 0) + n; save();
    for (const m of missoesDoDia(L)) {
      if (m.id === chave && !g.today.ok[m.id] && g.today[m.id] >= m.meta) {
        g.today.ok[m.id] = true; save();
        toast(`✓ Missão cumprida: ${m.t} (+30 XP)`);
        ganharXP(L, 30);
      }
    }
  }
  function raridade(c) { return LENDARIOS.has(c.id) ? 'lendario' : c.tipo === 'verbo' || /expressão|Machado/.test(c.diz) ? 'raro' : 'comum'; }
  function categoriaConceito(c) {
    if (LENDARIOS.has(c.id)) return 'intraduzível';
    if (/Nordeste|Sul|Minas|Rio Grande|regionais|Pernambuco/.test(c.diz)) return 'regional';
    if (/formal|cartas|e-mails/i.test(c.diz)) return 'formal';
    if (c.tipo === 'verbo') return 'expressão';
    return 'fala do dia a dia';
  }
  const PALAVRA_VAZIA = w => w.length < 3 || /\d/.test(w) || SETS.pt.has(w) || /^(está|estão|estou|isso|essa|esse|este|esta|aquele|aquela|muito|muita|pelo|pela|para|como|quando|onde|depois|antes|então|também|ainda|sempre|nunca|agora|hoje|ontem|amanhã|todo|toda|todos|todas|meus|minhas|seus|suas|nossa|nosso|dele|dela|nele|nela|num|numa|até|sobre)$/.test(w);
  /* Depois do diário (português → língua): colhe palavras, conceitos e pacotes de palavras vizinhas. */
  const SO_PRONOME = /^(i|you|he|she|we|they|it|me|yo|tú|él|ella|nosotros|je|tu|il|elle|nous|vous|ich|du|er|sie|wir|io|lui|lei|noi)$/i;
  /* palavra solta traduzida vem com maiúscula (“Cup”); no alemão substantivo tem maiúscula de verdade */
  const minus = (L, t) => (L.id === 'de' || !/^\p{Lu}\p{Ll}/u.test(t) ? t : t.charAt(0).toLowerCase() + t.slice(1));
  async function colher(L, text, out) {
    const st = LS(L.id), g = G(L);
    let novas = 0;
    const escritas = new Set(falado(text).toLowerCase().match(/[\p{L}-]+/gu) || []);   // só o que a pessoa escreveu
    for (const s of out.sentences) {
      if (!s.toks) continue;
      s.src.forEach((w, i) => {
        const key = w.toLowerCase().replace(/[^\p{L}-]/gu, '');
        if (!key || PALAVRA_VAZIA(key) || st.vocab[key] || !escritas.has(key)) return;
        let t = s.toks.filter(tk => tk.k.includes(i)).map(tk => tk.t).join(' ').replace(/[.,!?;:¿¡]+/g, '').trim();
        if (!t || SO_PRONOME.test(t)) return;
        t = minus(L, t);
        st.vocab[key] = { pt: key, t, r: roman(L, t), src: 'diário', d: Date.now() }; novas++;
      });
    }
    contar(L, 'frases', out.sentences.length);
    ganharXP(L, 5 * out.sentences.length + 2 * novas);
    if (novas) contar(L, 'palavras', novas);
    // conceitos descobertos
    for (const c of out.concepts) {
      if (g.unlocked[c.id]) continue;
      g.unlocked[c.id] = Date.now();
      const def = CONCEITOS.find(x => x.id === c.id) || c, rar = raridade(def);
      celebrar({ icone: rar === 'lendario' ? '✦' : rar === 'raro' ? '◆' : '●', raro: rar, kicker: `Conceito ${rar === 'lendario' ? 'lendário' : rar} descoberto`, titulo: c.pt, corpo: `${esc(c.diz)}${c.t ? `<br><b>${esc(c.t)}</b>` : ''}` });
      contar(L, 'conceitos'); ganharXP(L, rar === 'lendario' ? 50 : rar === 'raro' ? 30 : 20);
    }
    save();
    // palavras vizinhas: o assunto que a pessoa trouxe abre o pacote daquele mundo
    const words = new Set(falado(text).toLowerCase().match(/[\p{L}]+/gu) || []);
    for (const campo of CAMPOS) {
      if (g.fields[campo.id] || !campo.gatilho.split(' ').some(w => words.has(w))) continue;
      const lista = [];
      for (const p of campo.palavras) { const t = minus(L, clean(await mt('pt', L.id, p))); lista.push({ pt: p, t }); if (!st.vocab[p]) { st.vocab[p] = { pt: p, t, r: roman(L, t), src: 'vizinha', campo: campo.id, d: Date.now() }; } }
      g.fields[campo.id] = { d: Date.now(), words: lista }; save();
      celebrar({ icone: campo.icone, raro: 'pacote', kicker: 'Palavras vizinhas liberadas', titulo: campo.nome, corpo: `Você escreveu sobre isso — o diário abriu o mundo em volta:<br><span class="festa-words">${lista.map(x => `<span><small>${esc(x.pt)}</small>${esc(x.t)}</span>`).join('')}</span>` });
      contar(L, 'palavras', lista.length); ganharXP(L, 15);
      break;   // um pacote por vez: a próxima frase abre o próximo
    }
  }
  const nivelPalavra = b => !b ? ['🌱', 'semente'] : b <= 2 ? ['🌿', 'broto'] : b <= 4 ? ['🪴', 'raiz'] : ['🌳', 'árvore'];

  /* Painel do jogo (página da língua) */
  function painelHTML(L) {
    const g = G(L), st = LS(L.id), n = nivel(g.xp), a0 = xpDoNivel(n), a1 = xpDoNivel(n + 1);
    const seq = sequencia(g), ms = missoesDoDia(L);
    const nConc = Object.keys(g.unlocked).length, nVoc = Object.keys(st.vocab).length;
    return `<section class="painel enter">
      <div class="p-top"><div class="p-lvl"><b>${n}</b><span>nível</span></div>
        <div class="p-xp"><div class="kicker">${g.xp} XP · faltam ${a1 - g.xp} para o nível ${n + 1}</div><div class="meter"><i style="width:${Math.round((g.xp - a0) / (a1 - a0) * 100)}%"></i></div></div>
        <div class="p-fogo ${seq ? 'on' : ''}"><b>${seq ? '🔥' : '○'} ${seq}</b><span>dia${seq === 1 ? '' : 's'}</span></div></div>
      <div class="p-miss"><div class="kicker">Missões de hoje</div>${ms.map(m => { const v = Math.min(g.today[m.id] || 0, m.meta), ok = g.today.ok[m.id]; return `<div class="miss ${ok ? 'ok' : ''}"><span>${ok ? '✓' : '○'}</span>${esc(m.t)}<em>${v}/${m.meta}</em></div>`; }).join('')}</div>
      <div class="p-links">
        <a class="btn" href="#/l/${L.id}/v">🌱 Vocabulário · ${nVoc}</a>
        <a class="btn" href="#/l/${L.id}/c">✦ Coleção · ${nConc}/${CONCEITOS.length}</a>
        <a class="btn on" href="#/l/${L.id}/g">◧ Pares</a>
      </div>
    </section>`;
  }

  /* Coleção: conceitos (álbum) e pacotes de palavras vizinhas */
  function renderColecao(L) {
    const g = G(L), rtl = L.dir === 'rtl' ? 'dir="rtl"' : '';
    const seen = new Set(), lista = CONCEITOS.filter(c => { const k = c.pt; if (seen.has(k)) return false; seen.add(k); return true; });
    const tem = lista.filter(c => g.unlocked[c.id]).length;
    $app.innerHTML = `
      ${topbar(`#/l/${L.id}`, L.name)}
      <div class="enter">
        <div class="kicker muted">Coleção · ${esc(L.name)}</div>
        <h1 class="title-xl">O que a sua vida <em>já abriu</em></h1>
        <p class="lead">Cada conceito aparece quando você o usa no diário. Os que faltam estão escondidos — a dica diz que tipo de fala os destrava.</p>
        <div class="subh">Palavras vizinhas <span class="kicker">${Object.keys(g.fields).length}/${CAMPOS.length} mundos</span></div>
        <div class="packs">${CAMPOS.map(c => { const f = g.fields[c.id]; return f
          ? `<details class="pack on"><summary><span class="pk-ico">${c.icone}</span><b>${esc(c.nome)}</b><small>${f.words.length} palavras</small></summary><div class="pk-words">${f.words.map(w => `<button class="pk-w" data-say="${esc(w.t)}"><small>${esc(w.pt)}</small><span ${rtl}>${esc(w.t)}</span></button>`).join('')}</div></details>`
          : `<div class="pack"><span class="pk-ico">${c.icone}</span><b>${esc(c.nome)}</b><small>escreva sobre: ${esc(c.gatilho.split(' ').slice(0, 3).join(', '))}…</small></div>`; }).join('')}</div>
        <div class="subh">Conceitos <span class="kicker">${tem}/${lista.length}</span></div>
        ${(() => {
          const rot = r => (r === 'lendario' ? '✦ lendário' : r === 'raro' ? '◆ raro' : '● comum');
          const on = lista.filter(c => g.unlocked[c.id]), off = lista.filter(c => !g.unlocked[c.id]);
          const porTipo = {}; off.forEach(c => { const k = categoriaConceito(c); porTipo[k] = (porTipo[k] || 0) + 1; });
          // iscas: alguns escondidos de cada raridade
          const iscas = [...off.filter(c => raridade(c) === 'lendario').slice(0, 2), ...off.filter(c => raridade(c) === 'raro').slice(0, 2), ...off.filter(c => raridade(c) === 'comum').slice(0, 2)];
          return `${on.length ? `<div class="album">${on.map(c => `<div class="carta ${raridade(c)} on"><span class="c-rar">${rot(raridade(c))}</span><b>${esc(c.pt)}</b><p>${esc(c.diz)}</p></div>`).join('')}</div>` : '<p class="muted">Nenhum ainda — escreva no diário do seu jeito, com gíria, expressão, “intraduzível”.</p>'}
            ${off.length ? `<div class="kicker muted" style="margin:16px 0 8px">Ainda escondidos · ${off.length}</div>
              <div class="faltam">${Object.entries(porTipo).sort((x, y) => y[1] - x[1]).map(([k, n]) => `<span><b>${n}</b> ${esc(k)}</span>`).join('')}</div>
              <div class="album">${iscas.map(c => `<div class="carta ${raridade(c)}"><span class="c-rar">${rot(raridade(c))}</span><b>? ? ?</b><p>${esc(categoriaConceito(c))}</p></div>`).join('')}</div>` : ''}`;
        })()}
      </div>`;
    bindSay(L);
  }

  /* Vocabulário: o dicionário que o diário montou */
  function renderVocab(L) {
    const st = LS(L.id), rtl = L.dir === 'rtl' ? 'dir="rtl"' : '';
    const vs = Object.values(st.vocab).sort((a, b) => b.d - a.d);
    const grupos = { 'diário': vs.filter(v => v.src === 'diário'), 'vizinha': vs.filter(v => v.src === 'vizinha') };
    const linha = v => { const [ic, nm] = nivelPalavra(st.prog['w:' + v.pt]?.b); return `<button class="voc" data-say="${esc(v.t)}"><span class="v-ic" title="${nm}">${ic}</span><span class="v-pt">${esc(v.pt)}</span><span class="v-tg" ${rtl}>${esc(v.t)}</span></button>`; };
    $app.innerHTML = `
      ${topbar(`#/l/${L.id}`, L.name)}
      <div class="enter">
        <div class="kicker muted">Vocabulário · ${esc(L.name)}</div>
        <h1 class="title-xl">Meu vocabulário <em>${vs.length}</em></h1>
        <p class="lead">Palavras que vieram da sua vida: as que você escreveu e as vizinhas que o diário abriu. 🌱 semente → 🌿 broto → 🪴 raiz → 🌳 árvore, conforme você acerta.</p>
        ${vs.length ? `<button class="cta" id="vtrain">${I.flip}Treinar meu vocabulário</button><a class="btn" style="width:100%;margin-top:10px" href="#/l/${L.id}/g">◧ Jogar Pares</a>` : `<div class="note"><span class="kicker">Ainda vazio</span>Escreva no diário em português: cada palavra que você usa entra aqui, já traduzida.</div><a class="cta" href="#/l/${L.id}/d">${I.pen}Ir para o diário</a>`}
        ${grupos['diário'].length ? `<div class="subh">Do meu diário <span class="kicker">${grupos['diário'].length}</span></div><div class="vocs">${grupos['diário'].map(linha).join('')}</div>` : ''}
        ${grupos['vizinha'].length ? `<div class="subh">Palavras vizinhas <span class="kicker">${grupos['vizinha'].length}</span></div><div class="vocs">${grupos['vizinha'].map(linha).join('')}</div>` : ''}
      </div>`;
    bindSay(L);
    const b = document.getElementById('vtrain'); if (b) b.onclick = () => go(`#/l/${L.id}/l/4`);
  }

  /* Pares: memória com o próprio vocabulário */
  function renderPares(L) {
    const st = LS(L.id);
    let pool = Object.values(st.vocab).map(v => ({ id: 'w:' + v.pt, pt: v.pt, t: v.t }));
    if (pool.length < 6) pool = pool.concat(items(L, 1), items(L, 3)).filter((x, i, arr) => arr.findIndex(y => y.t === x.t) === i);
    pool.sort((x, y) => (st.prog[x.id]?.b || 0) - (st.prog[y.id]?.b || 0) || Math.random() - .5);
    const par = shuffle(pool.slice(0, 12)).slice(0, 6);
    const cartas = shuffle(par.flatMap((p, i) => [{ i, txt: p.pt, lado: 'pt' }, { i, txt: p.t, lado: 'tg' }]));
    let abertas = [], feitos = 0, jogadas = 0, t0 = Date.now(), trava = false;
    const rtl = L.dir === 'rtl' ? 'dir="rtl"' : '';
    $app.innerHTML = `
      ${topbar(`#/l/${L.id}`, L.name, `<span class="score mono" id="pscore">0/6 · 0 jogadas</span>`)}
      <div class="enter">
        <div class="kicker muted">Pares · ${esc(L.name)}</div>
        <h1 class="title-xl">Ache os <em>pares</em></h1>
        <p class="lead">Português com ${esc(L.name.toLowerCase())}. As palavras vêm do seu vocabulário.</p>
        <div class="pares">${cartas.map((c, k) => `<button class="pc ${c.lado}" data-k="${k}"><span class="pc-back">R</span><span class="pc-face" ${c.lado === 'tg' ? rtl : ''}>${esc(c.txt)}</span></button>`).join('')}</div>
      </div>`;
    const score = () => { document.getElementById('pscore').textContent = `${feitos}/6 · ${jogadas} jogadas`; };
    $app.querySelectorAll('.pc').forEach(b => b.onclick = () => {
      if (trava || b.classList.contains('open') || b.classList.contains('done')) return;
      const c = cartas[+b.dataset.k]; b.classList.add('open'); abertas.push([b, c]);
      if (c.lado === 'tg') speak(c.txt, L);
      if (abertas.length < 2) return;
      jogadas++; const [[b1, c1], [b2, c2]] = abertas; abertas = [];
      if (c1.i === c2.i && c1.lado !== c2.lado) {
        b1.classList.add('done'); b2.classList.add('done'); feitos++; beep(true);
        const it = par[c1.i]; if (it.id.startsWith('w:')) applyGrade(st, it, 3);
        score();
        if (feitos === 6) {
          const s = Math.round((Date.now() - t0) / 1000);
          setTimeout(() => {
            contar(L, 'pares'); ganharXP(L, 20);
            celebrar({ icone: '◧', kicker: 'Pares completos', titulo: `${jogadas} jogadas · ${s} s`, corpo: jogadas <= 8 ? 'Memória de elefante!' : 'Cada par acertado conta para o nível da palavra.' });
            $app.querySelector('.enter').insertAdjacentHTML('beforeend', `<button class="cta" id="pnovo" style="margin-top:16px">${I.flip}Jogar de novo</button>`);
            document.getElementById('pnovo').onclick = () => renderPares(L);
          }, 400);
        }
      } else {
        trava = true; beep(false);
        setTimeout(() => { b1.classList.remove('open'); b2.classList.remove('open'); trava = false; }, 800);
        score();
      }
    });
  }

  /* ——— TREINOS A PARTIR DE VOCÊ (respostas aos pontos fracos do método — ver docs/METODO.md) ——— */
  const PERGUNTAS = {
    cozinha: 'O que você comeu hoje? Quem cozinha na sua casa?', casa: 'Como é a sua casa? Qual o seu canto preferido?',
    familia: 'Fale de alguém da sua família.', trabalho: 'O que você faz no trabalho? Como foi a semana?',
    estudo: 'O que você está estudando ou quer aprender?', transporte: 'Como você chega aos lugares? Conte o caminho.',
    clima: 'Como está o tempo aí? Qual estação você prefere?', saude: 'Como você está se sentindo? Ficou doente esse ano?',
    emocoes: 'Como você está se sentindo hoje, de verdade?', lazer: 'O que você faz para se divertir?',
    compras: 'O que você comprou essa semana?', natureza: 'Qual lugar na natureza você ama?',
    corpo: 'Você pratica algum exercício? Algo dói?', roupas: 'O que você está vestindo hoje?',
    horas: 'Como é a sua rotina, da manhã à noite?', cidade: 'Como é a sua cidade ou o seu bairro?',
    conversa: 'Com quem você conversou hoje? Sobre o quê?', esporte: 'Você pratica ou assiste algum esporte?',
    bichos: 'Você tem ou já teve um bicho?', viagem: 'Qual viagem você nunca esqueceu?'
  };
  const DIA = 864e5;
  /* páginas antigas prontas para reescrever: escritas em português há 2+ dias, não reescritas na última semana */
  function paraReescrever(L) {
    const st = LS(L.id), now = Date.now();
    return (st.journal || []).filter(j => j.lang === 'pt' && now - j.d > 2 * DIA && (!j.rew || now - j.rew > 7 * DIA)).sort((a, b) => a.d - b.d);
  }
  /* erros: guarda o tipo de cada correção para mostrar o que a pessoa erra sempre */
  function tipoErro(e) {
    if (/terminação/.test(e.why)) return 'Terminação do verbo na pessoa certa';
    if (/j’/.test(e.why)) return 'Elisão do francês (je → j’)';
    if (/maiúsculo/.test(e.why)) return '“I” sempre maiúsculo';
    if (/o verbo .* fica/.test(e.why)) return 'Verbo combinando com o pronome';
    return 'Outros';
  }
  function registrarErros(L, issues, frase) {
    const st = LS(L.id); st.errs = st.errs || {};
    issues.forEach(e => { const k = tipoErro(e); const r = st.errs[k] = st.errs[k] || { n: 0, ex: [] }; r.n++; r.ex.unshift({ orig: e.orig, fix: e.fix, why: e.why }); r.ex = r.ex.slice(0, 4); });
    if (frase) { const r = st.errs['Frase diferente do jeito natural'] = st.errs['Frase diferente do jeito natural'] || { n: 0, ex: [] }; r.n++; r.ex.unshift(frase); r.ex = r.ex.slice(0, 4); }
    save();
  }
  /* domínio da vida de cada frase do diário (para o mapa do que a pessoa consegue dizer) */
  function marcarDominios(L, text) {
    const g = G(L); g.dom = g.dom || {};
    const words = new Set(falado(text).toLowerCase().match(/[\p{L}]+/gu) || []);
    CAMPOS.forEach(c => { if (c.gatilho.split(' ').concat(c.palavras).some(w => words.has(w))) g.dom[c.id] = (g.dom[c.id] || 0) + 1; });
    save();
  }

  function treinosHTML(L) {
    const n = paraReescrever(L).length;
    return `<div class="treinos">
      <div class="kicker muted">Treinos a partir de você</div>
      <div class="t-grid">
        <a class="t-btn ${n ? 'hot' : ''}" href="#/l/${L.id}/w"><b>✍</b><span>Reescrever</span><small>${n ? `${n} página${n > 1 ? 's' : ''} pronta${n > 1 ? 's' : ''}` : 'páginas antigas voltam'}</small></a>
        <a class="t-btn" href="#/l/${L.id}/x"><b>⇄</b><span>Variações</span><small>sua frase em outras pessoas e tempos</small></a>
        <a class="t-btn" href="#/l/${L.id}/r"><b>📖</b><span>Ler</span><small>um texto que você ama</small></a>
        <a class="t-btn" href="#/l/${L.id}/f"><b>🎙</b><span>Falar</span><small>ouvir, repetir, gravar</small></a>
        <a class="t-btn" href="#/l/${L.id}/e"><b>⚠</b><span>Meus erros</span><small>o que você erra sempre</small></a>
        <a class="t-btn" href="#/l/${L.id}/m"><b>🗺</b><span>Mapa</span><small>o que você já consegue dizer</small></a>
      </div></div>`;
  }

  /* ✍ Reescrever: a página antiga volta; a pessoa escreve de novo sem olhar e compara */
  function renderReescrever(L) {
    const lista = paraReescrever(L);
    if (!lista.length) {
      $app.innerHTML = `${topbar(`#/l/${L.id}`, L.name)}<div class="enter"><div class="kicker muted">Reescrever · ${esc(L.name)}</div><h1 class="title-xl">Nada para <em>reescrever</em></h1>
        <p class="lead">Páginas que você escreve em português no diário voltam aqui depois de dois dias. Aí você as reescreve em ${esc(L.name.toLowerCase())}, sem olhar, e vê o quanto já consegue.</p>
        <a class="cta" href="#/l/${L.id}/d">${I.pen}Escrever no diário</a></div>`;
      return;
    }
    const e = lista[0], dias = Math.round((Date.now() - e.d) / DIA);
    renderDiary(L, null, { text: '', meant: e.text, rewriteOf: e.id, placeholder: `Reescreva em ${L.name.toLowerCase()}, sem olhar a tradução…`,
      banner: `<div class="rew-banner"><div class="kicker">Reescrever · há ${dias} dia${dias === 1 ? '' : 's'}</div><p>“${esc(e.text)}”</p><span>Escreva isso em ${esc(L.name.toLowerCase())}, sem olhar. O diário compara com o que você quis dizer${e.tries && e.tries.length ? ` e com a sua tentativa anterior (${e.tries[0].score}% parecida)` : ''}.</span></div>` });
  }

  /* ⇄ Variações: as frases da própria pessoa em outras pessoas e tempos */
  async function renderVariacoes(L) {
    const st = LS(L.id), rtl = L.dir === 'rtl' ? 'dir="rtl"' : '';
    st.vars = st.vars || [];
    const fontes = [...(st.journal || []).filter(j => j.lang === 'pt').flatMap(j => frases(j.text)), ...(st.mySentences || []).map(s => s.pt)];
    const vistas = new Set(); const bases = [];
    for (const f of fontes) { const k = f.trim(); if (vistas.has(k)) continue; vistas.add(k); const vs = variacoes(falado(k)); if (vs.length) bases.push({ pt: k, vs }); if (bases.length >= 4) break; }
    $app.innerHTML = `${topbar(`#/l/${L.id}`, L.name)}<div class="enter">
      <div class="kicker muted">Variações · ${esc(L.name)}</div>
      <h1 class="title-xl">A sua frase, <em>de outro jeito</em></h1>
      <p class="lead">Decorar a frase não é saber a língua. Saber é conseguir variar: outra pessoa, outro tempo. As variações saem das <b>suas</b> frases.</p>
      <div id="vres">${bases.length ? '<div class="thinking"><span></span><span></span><span></span> montando as variações no seu celular</div>' : `<div class="note"><span class="kicker">Ainda sem frases</span>Escreva no diário em português; as suas frases viram variações aqui.</div><a class="cta" href="#/l/${L.id}/d">${I.pen}Ir para o diário</a>`}</div>
      ${motorCard(L)}</div>`;
    bindMotor(L);
    if (!bases.length) return;
    if (!(await motorReady(L))) { document.getElementById('vres').innerHTML = `<div class="note"><span class="kicker">Falta o tradutor interno</span>Baixe o tradutor de ${esc(L.name.toLowerCase())} (logo abaixo).</div>`; return; }
    const tr = async pt => clean(await mt('pt', L.id, conceitos(falado(pt)).rewritten));
    let html = '', n = 0;
    for (const b of bases) {
      const bt = await tr(b.pt);
      const vs = [];
      for (const v of b.vs) { const t = await tr(v.pt); vs.push({ ...v, t }); if (!st.vars.some(x => x.pt === v.pt)) { st.vars.push({ id: Date.now().toString(36) + 'x' + (n++), pt: v.pt, t, base: b.pt }); } }
      html += `<div class="varcard"><div class="vbase"><span class="kicker">a sua frase</span><b>${esc(b.pt)}</b><button class="vt" data-say="${esc(bt)}" ${rtl}>${esc(bt)}</button></div>
        ${vs.map(v => `<div class="vrow"><span class="kicker">${esc(v.label)}</span><span class="vpt2">${esc(v.pt)}</span><button class="vt" data-say="${esc(v.t)}" ${rtl}>${esc(v.t)}</button></div>`).join('')}</div>`;
    }
    st.vars = st.vars.slice(-150); save();
    document.getElementById('vres').innerHTML = html + `<button class="cta" id="vgo">${I.flip}Treinar as variações</button>`;
    bindSay(L);
    document.getElementById('vgo').onclick = () => go(`#/l/${L.id}/l/5`);
  }

  /* 📖 Ler: a entrada vem do interesse da pessoa — qualquer texto na língua vira leitura interativa */
  function renderLer(L) {
    const st = LS(L.id), rtl = L.dir === 'rtl' ? 'dir="rtl"' : '', lname = L.name.toLowerCase();
    st.leituras = st.leituras || [];
    $app.innerHTML = `${topbar(`#/l/${L.id}`, L.name)}<div class="enter">
      <div class="kicker muted">Ler · ${esc(L.name)}</div>
      <h1 class="title-xl">Ler o que <em>você ama</em></h1>
      <p class="lead">Cole qualquer texto em ${esc(lname)} que te interessa — letra de música, notícia, receita, um post. Toque nas palavras para ver o sentido e guardar no seu vocabulário.</p>
      <div class="diary"><textarea id="ltext" lang="${L.tts}" ${rtl} placeholder="Cole aqui um texto em ${esc(lname)}…" aria-label="Texto para ler"></textarea>
        <div class="dbar"><span class="kicker muted">até ~2000 letras</span><button class="btn on" id="lgo">${I.flip}Ler</button></div></div>
      <div class="savebar hide" id="savebar"></div>
      <div id="lres"></div>
      ${st.leituras.length ? `<div class="subh">Leituras anteriores</div><div class="pages">${st.leituras.map((x, i) => `<button class="page" data-li="${i}"><span class="mono muted">${new Date(x.d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span><span class="ptxt" ${rtl}>${esc(x.text.slice(0, 60))}…</span><span></span></button>`).join('')}</div>` : ''}
      ${motorCard(L)}</div>`;
    bindMotor(L);
    const ta = document.getElementById('ltext'), res = document.getElementById('lres'), bar = document.getElementById('savebar');
    $app.querySelectorAll('[data-li]').forEach(b => b.onclick = () => { ta.value = st.leituras[+b.dataset.li].text; document.getElementById('lgo').click(); });
    document.getElementById('lgo').onclick = async () => {
      const txt = ta.value.trim().slice(0, 2200); if (!txt) { ta.focus(); return; }
      if (!(await motorReady(L))) { res.innerHTML = `<div class="note"><span class="kicker">Falta o tradutor interno</span>Baixe o tradutor de ${esc(lname)} (logo abaixo).</div>`; return; }
      const sents = txt.split(/(?<=[.!?…。！？])\s*|\n+/).map(s => s.trim()).filter(Boolean).slice(0, 25);
      res.innerHTML = '<div class="thinking"><span></span><span></span><span></span> preparando a leitura</div>';
      let html = '<p class="il-hint">Toque numa palavra: ela acende, fala e você pode guardar.</p>';
      for (const s of sents) { const al = await mtAligned(L.id, 'pt', s); html += `<div class="tr-row">${interHTML(al.src, al.toks, rtl, '', lname, 'sentido')}</div>`; }
      res.innerHTML = html;
      bindInter(res, L, L.id);
      res.querySelectorAll('.il-src .w').forEach(w => w.addEventListener('click', () => {
        const box = w.closest('.inter');
        const alvo = [...box.querySelectorAll('.il-src .w.on')].map(x => x.textContent).join(' ').replace(/[.,!?;:¿¡«»"“”()]+/g, '').trim();
        const sentido = [...box.querySelectorAll('.il-tg .w.on')].map(x => x.textContent).join(' ').replace(/[.,!?;:¿¡«»"“”()]+/g, '').trim();
        if (!alvo) return;
        bar.classList.remove('hide');
        bar.innerHTML = `<span ${rtl}><b>${esc(alvo)}</b> = ${esc(sentido || '?')}</span><button class="btn on" id="lsave">${I.plus}Guardar</button>`;
        document.getElementById('lsave').onclick = () => {
          const key = (sentido || alvo).toLowerCase();
          if (!st.vocab[key]) { st.vocab[key] = { pt: key, t: alvo, r: roman(L, alvo), src: 'leitura', d: Date.now() }; save(); contar(L, 'palavras'); ganharXP(L, 3); toast(`“${alvo}” no seu vocabulário`); }
          else toast('Já está no vocabulário.');
          bar.classList.add('hide');
        };
      }));
      if (!st.leituras.some(x => x.text === txt)) { st.leituras.unshift({ d: Date.now(), text: txt }); st.leituras = st.leituras.slice(0, 20); save(); }
      contar(L, 'ler'); ganharXP(L, 3 * sents.length);
    };
  }

  /* 🎙 Falar: ouvir a própria frase na voz da língua, repetir, gravar e comparar — tudo no aparelho */
  function renderFalar(L) {
    const st = LS(L.id), rtl = L.dir === 'rtl' ? 'dir="rtl"' : '';
    const pool = [...(st.mySentences || []), ...(st.vars || [])].filter(x => x.t).slice(-40);
    const lista = shuffle(pool).slice(0, 5);
    let k = 0, rec = null, chunks = [], url = null;
    const show = () => {
      if (url) { URL.revokeObjectURL(url); url = null; }
      if (k >= lista.length) {
        $app.innerHTML = `${topbar(`#/l/${L.id}`, L.name)}<div class="finish enter"><div class="kicker muted">Falar</div><div class="seal"><div><b>${lista.length}</b><span>frases faladas</span></div></div>
          <h1 class="title-xl">A boca também aprende.</h1><p class="lead">Repita em voz alta todo dia: o ouvido e a pronúncia crescem junto com o vocabulário.</p>
          <button class="cta" id="fmore">${I.flip}Mais frases</button></div>`;
        document.getElementById('fmore').onclick = () => renderFalar(L); return;
      }
      const it = lista[k];
      $app.innerHTML = `${topbar(`#/l/${L.id}`, L.name, `<span class="score mono">${k + 1}/${lista.length}</span>`)}<div class="enter">
        <div class="kicker muted">Falar · ${esc(L.name)}</div>
        <div class="fala"><div class="f-pt">${esc(it.pt)}</div><div class="f-tg" ${rtl}>${esc(it.t)}</div></div>
        <div class="f-steps">
          <button class="btn" id="f1">${I.sound}1 · Ouvir devagar</button>
          <button class="btn" id="f2">${I.sound}Ouvir normal</button>
          <button class="btn on" id="f3">🎙 2 · Gravar a minha voz</button>
          <button class="btn hide" id="f4">▶ 3 · Ouvir a minha</button>
        </div>
        <p class="muted" style="font-size:14px">Ouça, repita junto em voz alta, depois grave e compare com a voz da língua. A gravação fica só no seu celular.</p>
        <button class="cta" id="fnext">Próxima frase</button></div>`;
      document.getElementById('f1').onclick = () => speak(it.t, L, .6);
      document.getElementById('f2').onclick = () => speak(it.t, L, .9);
      const b3 = document.getElementById('f3'), b4 = document.getElementById('f4');
      b3.onclick = async () => {
        if (rec && rec.state === 'recording') { rec.stop(); return; }
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          rec = new MediaRecorder(stream); chunks = [];
          rec.ondataavailable = e => chunks.push(e.data);
          rec.onstop = () => { stream.getTracks().forEach(t => t.stop()); url = URL.createObjectURL(new Blob(chunks, { type: rec.mimeType })); b3.innerHTML = '🎙 Gravar de novo'; b4.classList.remove('hide'); contar(L, 'falar'); ganharXP(L, 4); };
          rec.start(); b3.innerHTML = '■ Parar a gravação'; setTimeout(() => { if (rec.state === 'recording') rec.stop(); }, 8000);
        } catch (e) { toast('Sem acesso ao microfone. Repita em voz alta junto com a voz.'); contar(L, 'falar'); }
      };
      b4.onclick = () => { if (url) new Audio(url).play(); };
      document.getElementById('fnext').onclick = () => { k++; show(); };
      speak(it.t, L, .8);
    };
    if (!lista.length) {
      $app.innerHTML = `${topbar(`#/l/${L.id}`, L.name)}<div class="enter"><div class="kicker muted">Falar</div><h1 class="title-xl">Primeiro, <em>escreva</em></h1>
        <p class="lead">As frases para falar vêm do seu diário. Escreva em português e guarde na lição; elas aparecem aqui.</p><a class="cta" href="#/l/${L.id}/d">${I.pen}Ir para o diário</a></div>`;
      return;
    }
    show();
  }

  /* ⚠ Meus erros: os tipos de erro que se repetem e os itens que mais escapam */
  function renderErros(L) {
    const st = LS(L.id), errs = Object.entries(st.errs || {}).sort((a, b) => b[1].n - a[1].n);
    const todos = {}; [1, 2, 3, 4, 5].forEach(s => items(L, s).forEach(it => { todos[it.id] = it; }));
    const piores = Object.entries(st.prog || {}).filter(([id, p]) => p.miss && todos[id]).sort((a, b) => b[1].miss - a[1].miss).slice(0, 10);
    const rtl = L.dir === 'rtl' ? 'dir="rtl"' : '';
    $app.innerHTML = `${topbar(`#/l/${L.id}`, L.name)}<div class="enter">
      <div class="kicker muted">Meus erros · ${esc(L.name)}</div>
      <h1 class="title-xl">O que eu <em>erro sempre</em></h1>
      <p class="lead">Errar é o caminho. Mas erro que se repete vira vício — então o app mostra os seus padrões, para você atacar um de cada vez.</p>
      ${errs.length ? `<div class="subh">No diário</div>${errs.map(([k, r]) => `<div class="errtype"><div class="et-h"><b>${esc(k)}</b><span class="mono">${r.n}×</span></div>
        ${r.ex.map(e => typeof e === 'string' ? `<p class="muted">${esc(e)}</p>` : `<div class="err"><div ${rtl}><s>${esc(e.orig)}</s> <span class="arrow">→</span> <b>${esc(e.fix)}</b></div><p>${esc(e.why)}</p></div>`).join('')}</div>`).join('')}` : '<p class="muted">Nenhum erro do diário registrado ainda. Escreva na língua e toque em “Ver o que é o quê”.</p>'}
      ${piores.length ? `<div class="subh">Nas lições: os que mais escapam</div><div class="vocs">${piores.map(([id, p]) => `<button class="voc" data-say="${esc(todos[id].t)}"><span class="v-ic">${p.miss}×</span><span class="v-pt">${esc(todos[id].pt)}</span><span class="v-tg" ${rtl}>${esc(todos[id].t)}</span></button>`).join('')}</div>
        <p class="muted" style="font-size:14px">Esses itens voltam mais vezes nas lições até ficarem firmes.</p>` : ''}
    </div>`;
    bindSay(L);
  }

  /* 🗺 Mapa: o que a pessoa já consegue dizer, por área da vida — e desafios para as áreas vazias */
  function renderMapa(L) {
    const g = G(L), st = LS(L.id), dom = g.dom || {};
    const vocabPorCampo = {}; Object.values(st.vocab || {}).forEach(v => { const c = v.campo || (CAMPOS.find(c => c.gatilho.split(' ').includes(v.pt) || c.palavras.includes(v.pt)) || {}).id; if (c) vocabPorCampo[c] = (vocabPorCampo[c] || 0) + 1; });
    const linhas = CAMPOS.map(c => ({ c, frases: dom[c.id] || 0, palavras: vocabPorCampo[c.id] || 0 })).map(x => ({ ...x, pts: x.frases * 3 + x.palavras }));
    const max = Math.max(10, ...linhas.map(x => x.pts));
    const vazias = linhas.filter(x => x.pts < 3).slice(0, 3);
    $app.innerHTML = `${topbar(`#/l/${L.id}`, L.name)}<div class="enter">
      <div class="kicker muted">Mapa · ${esc(L.name)}</div>
      <h1 class="title-xl">O que eu já <em>consigo dizer</em></h1>
      <p class="lead">Cada área da vida cresce quando você escreve sobre ela e aprende as palavras vizinhas. As áreas vazias são o seu próximo desafio.</p>
      ${vazias.length ? `<div class="subh">Desafios para hoje</div>${vazias.map(x => `<button class="desafio" data-c="${x.c.id}"><span>${x.c.icone}</span><div><b>${esc(x.c.nome)}</b><small>${esc(PERGUNTAS[x.c.id])}</small></div></button>`).join('')}` : ''}
      <div class="subh">Todas as áreas</div>
      <div class="mapa">${linhas.sort((a, b) => b.pts - a.pts).map(x => `<div class="m-row2"><span class="m-ic">${x.c.icone}</span><span class="m-nm">${esc(x.c.nome)}</span><span class="meter"><i style="width:${Math.round(x.pts / max * 100)}%"></i></span><small class="mono">${x.frases}f · ${x.palavras}p</small></div>`).join('')}</div>
    </div>`;
    $app.querySelectorAll('[data-c]').forEach(b => b.onclick = () => renderDiary(L, null, { text: '', placeholder: PERGUNTAS[b.dataset.c] + ' (em português ou em ' + L.name.toLowerCase() + ')', banner: `<div class="rew-banner"><div class="kicker">Desafio · ${esc(CAMPOS.find(c => c.id === b.dataset.c).nome)}</div><p>${esc(PERGUNTAS[b.dataset.c])}</p></div>` }));
  }

  /* ——— LIÇÃO INTERATIVA: certo ou errado, conferido na hora ——— */
  function applyGrade(st, it, g) {
    const p = st.prog[it.id] || { b: 0, due: 0 };
    if (g === 3) p.b = Math.min(p.b + 1, 6); else if (g === 1) { p.b = 1; p.miss = (p.miss || 0) + 1; } else p.b = Math.max(p.b, 1);
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
    const pool = step === 6 ? [...items(L, 6), ...items(L, 3), ...items(L, 4)] : items(L, step);
    const { pick, extra } = pickSession(L, step);
    if (!pick.length && step === 6) { cicloHoje(L).step = 3; save(); renderHoje(L); return; }
    if (!pick.length) { go(`#/l/${L.id}/s/${step}`); return; }
    if (extra) toast('Tudo revisado! Rodada extra.');
    const queue = pick.map(it => ({ it, kind: pickKind(L, it, st.prog[it.id]?.b || 0) }));
    emLicao = true;
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
      if (ok) { right++; streak++; best = Math.max(best, streak); contar(L, 'acertos'); ganharXP(L, 3); if (step === 5) contar(L, 'variar'); } else { streak = 0; if (!close) { wrong++; if (queue.filter(x => x.it.id === it.id).length < 3 && queue.length < pickLen * 2) queue.push({ it, kind: 'choice' }); } else right++; }
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
      emLicao = false; setTimeout(mostrarFesta, 700);
      const m = Math.round(mastery(L, step) * 100), firsts = pick.length;
      const firstRight = Math.max(0, firsts - queue.slice(firsts).length);
      if (step === 6) {
        const dia = cicloHoje(L); if (dia.step < 3) { dia.step = 3; save(); }
        $app.innerHTML = `${topbar(`#/l/${L.id}`, L.name)}
          <div class="finish enter">
            <div class="kicker muted">Passo 3 de 4 · Praticar</div>
            <div class="seal"><div><b>${firstRight}/${firsts}</b><span>de primeira</span></div></div>
            <h1 class="title-xl">${firstRight === firsts ? 'Sem erros!' : 'Praticado.'}</h1>
            <p class="lead">Falta só um passo: escrever a sua frase de hoje em ${esc(L.name.toLowerCase())}, sozinho, sem olhar.</p>
            <button class="cta" id="solo">${I.pen}Último passo: escrever sozinho</button>
            <button class="btn" id="more" style="width:100%;margin-top:10px">Praticar mais uma vez</button>
          </div>`;
        document.getElementById('more').onclick = () => renderLesson(L, step);
        document.getElementById('solo').onclick = () => { renderHoje(L); window.scrollTo(0, 0); };
        return;
      }
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
    if (step === 6) {   // prática de hoje: as frases do dia primeiro, na ordem de prioridade
      const pick = all.slice(0, SESSION);
      for (let i = pick.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pick[i], pick[j]] = [pick[j], pick[i]]; }
      return { pick, extra: false };
    }
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
