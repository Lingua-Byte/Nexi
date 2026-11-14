/* Radar Licita: front-end de demonstração (SPA sem build).
   Os editais, a pontuação de compatibilidade e as respostas da "IA" são simulados
   no navegador. Em produção, `answer()` e `summary` viriam de um backend com LLM
   e os editais de uma coleta diária (PNCP, Compras.gov.br e portais estaduais). */
(() => {
  'use strict';

  const STORE_KEY = 'radar_licita_v1';
  const $root = document.getElementById('root');
  const $modal = document.getElementById('modal-root');
  const $toast = document.getElementById('toast-root');

  // ---------- Utilidades ----------
  const pad = n => String(n).padStart(2, '0');
  const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
  const today = () => iso(new Date());
  const daysUntil = s => Math.round((parse(s) - parse(today())) / 86400000);
  const daysBetween = (a, b) => Math.round((parse(b) - parse(a)) / 86400000);
  const fmtDate = s => { const d = parse(s); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`; };
  const fmtShort = s => { const d = parse(s); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`; };
  const brl = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const brlK = v => v >= 1e6 ? `R$ ${(v / 1e6).toFixed(1).replace('.', ',')} mi` : v >= 1e3 ? `R$ ${Math.round(v / 1e3)} mil` : brl(v);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const uid = () => Math.random().toString(36).slice(2, 10);
  const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const UFS = ['AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO'];
  function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  // ---------- Catálogo para gerar editais de exemplo ----------
  const CATS = {
    'Tecnologia': {
      objs: [['Aquisição de notebooks e desktops para a rede municipal de ensino', [0, 1, 10]], ['Contratação de empresa para suporte técnico e manutenção de computadores', [4]], ['Registro de preços para aquisição de impressoras multifuncionais e suprimentos', [2, 3]], ['Implantação de rede lógica e Wi-Fi em unidades básicas de saúde', [5, 6, 11]], ['Aquisição de tablets para agentes comunitários de saúde', [7]], ['Licenciamento de software de gestão escolar com suporte técnico', [8, 4]], ['Outsourcing de impressão com franquia de páginas', [2, 3, 4]], ['Aquisição de servidores, storage e switches para o data center', [9, 6, 10]]],
      items: [['Notebook 14" Core i5, 16GB RAM, SSD 512GB', 'un', 4200], ['Desktop Core i5, 8GB RAM, SSD 256GB, monitor 23,8"', 'un', 3900], ['Impressora multifuncional laser monocromática', 'un', 2300], ['Toner compatível alto rendimento', 'un', 180], ['Serviço de suporte técnico mensal (por posto)', 'mês', 5200], ['Access point Wi-Fi 6 corporativo', 'un', 1450], ['Switch gerenciável 24 portas PoE', 'un', 4800], ['Tablet 10" 4G, 128GB', 'un', 1900], ['Licença de software de gestão (por unidade)', 'un', 2600], ['Servidor rack 2U, 2x Xeon, 128GB RAM', 'un', 48000], ['Nobreak 3kVA online', 'un', 5600], ['Cabo de rede Cat6 (caixa 305m)', 'cx', 890]],
    },
    'Limpeza': { objs: [['Serviços continuados de limpeza e conservação predial', [0]], ['Aquisição de material de limpeza e higiene para as secretarias', [1, 2, 3]]], items: [['Posto de servente 44h semanais', 'mês', 4900], ['Desinfetante 5L', 'un', 18], ['Papel toalha interfolhado (fardo)', 'fd', 42], ['Saco de lixo 100L (pacote)', 'pct', 26]] },
    'Alimentação': { objs: [['Fornecimento de gêneros alimentícios para a merenda escolar', [0, 1]], ['Aquisição de café, açúcar e água mineral', [2, 3]]], items: [['Arroz tipo 1 (fardo 30kg)', 'fd', 160], ['Feijão carioca (fardo 30kg)', 'fd', 210], ['Café torrado e moído 500g', 'un', 19], ['Água mineral galão 20L', 'un', 12]] },
    'Obras': { objs: [['Reforma e ampliação da UBS Jardim das Palmeiras', [0]], ['Pavimentação asfáltica de vias urbanas, lote 2', [1]], ['Construção de quadra poliesportiva coberta', [0]]], items: [['Serviços de engenharia conforme planilha orçamentária', 'vb', 650000], ['Pavimentação CBUQ (m²)', 'm²', 95]] },
    'Saúde': { objs: [['Aquisição de medicamentos da atenção básica', [0]], ['Aquisição de equipamentos e mobiliário hospitalar', [1, 2]]], items: [['Dipirona 500mg (cx 100 comp.)', 'cx', 24], ['Cama hospitalar elétrica', 'un', 9800], ['Monitor multiparamétrico', 'un', 14500]] },
    'Escritório': { objs: [['Aquisição de material de expediente', [0]], ['Aquisição de mobiliário de escritório para a nova sede', [1, 2]]], items: [['Papel A4 75g (caixa 10 resmas)', 'cx', 245], ['Cadeira giratória ergonômica NR-17', 'un', 890], ['Mesa de escritório 1,40m', 'un', 760]] },
  };
  const ORGAOS = [['Prefeitura Municipal de Campinas', 'SP'], ['Prefeitura de Belo Horizonte', 'MG'], ['Prefeitura Municipal de Curitiba', 'PR'], ['Prefeitura de Niterói', 'RJ'], ['Prefeitura de Ribeirão Preto', 'SP'], ['Prefeitura de Uberlândia', 'MG'], ['Prefeitura de Londrina', 'PR'], ['Prefeitura de Sorocaba', 'SP'], ['Prefeitura Municipal de Salvador', 'BA'], ['Prefeitura do Recife', 'PE'], ['Prefeitura de Goiânia', 'GO'], ['Prefeitura de Florianópolis', 'SC'], ['Secretaria de Estado da Educação', 'SP'], ['Tribunal Regional do Trabalho da 3ª Região', 'MG'], ['Universidade Federal do Paraná', 'PR'], ['Instituto Federal de Goiás', 'GO'], ['Secretaria de Estado da Saúde', 'RJ'], ['Câmara Municipal de Juiz de Fora', 'MG'], ['Consórcio Intermunicipal de Saúde do Vale', 'SP'], ['Prefeitura de Contagem', 'MG']];
  const MODS = [['Pregão Eletrônico', 'PE'], ['Pregão Eletrônico', 'PE'], ['Pregão Eletrônico', 'PE'], ['Concorrência', 'CC'], ['Dispensa Eletrônica', 'DE']];
  const PORTAIS = ['Compras.gov.br', 'BLL Compras', 'Licitações-e (BB)', 'Portal de Compras Públicas', 'BNC'];
  const DOC_TYPES = {
    contrato: 'Contrato social e alterações', cnd_federal: 'CND Federal (Receita/PGFN)', fgts: 'Certificado de Regularidade do FGTS', cndt: 'Certidão Negativa de Débitos Trabalhistas',
    estadual: 'Certidão de regularidade estadual', municipal: 'Certidão de regularidade municipal', balanco: 'Balanço patrimonial do último exercício', falencia: 'Certidão negativa de falência',
    atestado: 'Atestado de capacidade técnica', crea: 'Registro no CREA/CAU',
  };

  // ---------- Dados de demonstração ----------
  function seed() {
    const r = rng(7);
    const pick = a => a[Math.floor(r() * a.length)];
    const t = today();
    const editais = [];
    for (let i = 0; i < 38; i++) {
      const cat = r() < .55 ? 'Tecnologia' : pick(Object.keys(CATS).filter(k => k !== 'Tecnologia'));
      const C = CATS[cat];
      const [orgao, uf] = pick(ORGAOS);
      let [mod, ab] = pick(MODS);
      if (cat === 'Obras') [mod, ab] = ['Concorrência', 'CC'];
      const [objeto, idx] = pick(C.objs); // cada objeto traz só os itens que fazem sentido para ele
      const pool = idx.map(k => C.items[k]);
      const itens = pool.map(([desc, unid, ref], k) => {
        const qtd = unid === 'vb' ? 1 : unid === 'mês' ? 12 : unid === 'm²' ? 4000 + Math.floor(r() * 6000) : Math.ceil((5 + r() * (ref > 3000 ? 60 : 400)));
        return { n: k + 1, desc, unid, qtd, ref: Math.round(ref * (.9 + r() * .25)) };
      });
      let valor = itens.reduce((s, x) => s + x.qtd * x.ref, 0);
      if (ab === 'DE') { const f = Math.min(1, 55000 / valor); itens.forEach(x => { x.qtd = Math.max(1, Math.floor(x.qtd * f)); }); valor = itens.reduce((s, x) => s + x.qtd * x.ref, 0); }
      const abertura = addDays(t, ab === 'DE' ? 1 + Math.floor(r() * 5) : 3 + Math.floor(r() * 32));
      const publicado = addDays(t, -Math.floor(r() * 9));
      const exclusivaME = valor <= 80000;
      editais.push({
        id: 'e' + (i + 1), numero: `${ab} ${pad(10 + Math.floor(r() * 180)).padStart(3, '0')}/${new Date().getFullYear()}`, orgao, uf, modalidade: mod, categoria: cat, objeto, itens, valor,
        abertura, horaAbertura: pick(['09:00', '09:30', '10:00', '14:00']), publicado, portal: pick(PORTAIS),
        criterio: pick(['Menor preço por item', 'Menor preço por lote', 'Menor preço global']),
        exclusivaME, garantia: mod === 'Concorrência' ? '5% do valor do contrato' : null, amostra: cat === 'Tecnologia' && r() < .35, visita: cat === 'Obras' || (cat === 'Tecnologia' && r() < .15),
        entrega: cat === 'Obras' ? '180 dias corridos' : pick(['30 dias corridos', '15 dias úteis', '45 dias corridos']), pagamento: pick(['30 dias após atesto da nota fiscal', '15 dias após o recebimento definitivo']),
        docs: ['contrato', 'cnd_federal', 'fgts', 'cndt', 'estadual', 'municipal', 'falencia', ...(mod !== 'Dispensa Eletrônica' ? ['balanco'] : []), ...(cat === 'Tecnologia' || cat === 'Limpeza' ? ['atestado'] : []), ...(cat === 'Obras' ? ['atestado', 'crea'] : [])],
        fav: false, stage: null, viewed: r() < .4,
      });
    }
    // Algumas no pipeline para o quadro não começar vazio
    const ti = editais.filter(e => e.categoria === 'Tecnologia');
    [['analisando', 0], ['analisando', 1], ['proposta', 2], ['proposta', 3], ['enviada', 4], ['enviada', 5]].forEach(([s, i]) => { if (ti[i]) ti[i].stage = s; });
    if (ti[1]) ti[1].fav = true; if (ti[6]) ti[6].fav = true;
    // Encerradas (histórico)
    const encerradas = [
      ['Aquisição de 120 notebooks para a Secretaria de Educação', 'Prefeitura de Betim', 'MG', 498000, 'ganha', -12],
      ['Suporte técnico em informática para a Câmara Municipal', 'Câmara Municipal de Santos', 'SP', 186000, 'ganha', -26],
      ['Aquisição de impressoras e suprimentos', 'Prefeitura de Maringá', 'PR', 92000, 'perdida', -33],
      ['Rede Wi-Fi para escolas estaduais, lote 4', 'Secretaria de Estado da Educação', 'RJ', 720000, 'perdida', -48],
    ];
    encerradas.forEach(([objeto, orgao, uf, valor, stage, off], k) => editais.push({
      id: 'h' + k, numero: `PE ${pad(200 + k)}/${new Date().getFullYear()}`, orgao, uf, modalidade: 'Pregão Eletrônico', categoria: 'Tecnologia', objeto, valor,
      itens: [{ n: 1, desc: objeto, unid: 'lote', qtd: 1, ref: valor }], abertura: addDays(t, off), horaAbertura: '09:00', publicado: addDays(t, off - 15), portal: 'Compras.gov.br',
      criterio: 'Menor preço por lote', exclusivaME: false, garantia: null, amostra: false, visita: false, entrega: '30 dias corridos', pagamento: '30 dias após atesto da nota fiscal',
      docs: ['contrato', 'cnd_federal', 'fgts', 'cndt', 'estadual', 'municipal', 'falencia', 'balanco', 'atestado'], fav: false, stage, viewed: true,
    }));

    const year = new Date().getFullYear();
    const docs = [
      ['contrato', null], ['cnd_federal', addDays(t, 128)], ['fgts', addDays(t, 9)], ['cndt', addDays(t, 152)], ['estadual', addDays(t, 61)],
      ['municipal', addDays(t, -6)], ['falencia', addDays(t, 24)], ['balanco', `${year + 1}-04-30`], ['atestado', null],
    ].map(([key, validade]) => ({ id: uid(), key, nome: DOC_TYPES[key], validade, arquivo: `${key}.pdf`, enviadoEm: addDays(t, -Math.floor(r() * 60)) }));

    // Histórico mensal de disputas (para o gráfico)
    const history = Array.from({ length: 6 }, (_, k) => {
      const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - (5 - k));
      const disputado = 400000 + Math.round(r() * 900000);
      return { mes: `${MONTHS[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`, disputado, ganho: Math.round(disputado * (.15 + r() * .35)), part: 4 + Math.floor(r() * 6), wins: 1 + Math.floor(r() * 3) };
    });

    return {
      profile: {
        razao: 'Alfa Soluções em Tecnologia Ltda', cnpj: '12.345.678/0001-90', porte: 'EPP', contato: 'Carlos Andrade', email: 'licitacoes@alfasolucoes.com.br',
        palavras: ['notebook', 'computador', 'desktop', 'impressora', 'suporte técnico', 'rede', 'wi-fi', 'tablet', 'software'],
        ufs: ['SP', 'MG', 'PR', 'RJ', 'GO'], cats: ['Tecnologia'], valorMin: 20000, valorMax: 1500000, canais: { email: true, whatsapp: true, telegram: false }, freq: 'diario',
      },
      editais, docs, history, chats: {}, plan: { nome: 'Pro', analises: 38, limite: 100 },
    };
  }

  // ---------- Camada de dados (demonstração local ou conta real no Supabase) ----------
  const Cloud = window.Cloud || { enabled: false };
  let db = null, mode = 'demo', meta = null, user = null, saver = null, entering = null;
  const store = Cloud.enabled ? Cloud.docStore({ table: 'radar_contas', saveFn: 'radar_save' }) : null;
  const live = { status: 'idle', at: 0, key: '', erros: [], msg: '' }; // busca no PNCP

  function emptyProfile(m = {}) {
    return { razao: m.razao || '', cnpj: m.cnpj || '', porte: m.porte || 'EPP', contato: m.contato || '', email: m.email || '',
      palavras: [], ufs: m.uf ? [m.uf] : [], cats: [], valorMin: 0, valorMax: 1e12, canais: { email: true, whatsapp: false, telegram: false }, freq: 'diario' };
  }
  function normalizeDoc(d, m) {
    d = d || {};
    return { profile: Object.assign(emptyProfile(m), d.profile || {}), docs: d.docs || [], editais: d.editais || [], chats: d.chats || {},
      vistos: d.vistos || [], buscas: d.buscas || [], history: [], plan: { nome: 'Pro', analises: 0, limite: 100 } };
  }
  function loadDemo() {
    try { db = JSON.parse(localStorage.getItem(STORE_KEY)); } catch (e) { db = null; }
    if (!db || !db.editais) db = seed();
    db.vistos = db.vistos || []; db.buscas = db.buscas || []; mode = 'demo';
    try { localStorage.setItem(STORE_KEY, JSON.stringify(db)); } catch (e) { /* sem armazenamento */ }
  }
  const kept = e => !!(e.stage || e.fav || e.ai || db.chats[e.id]?.length);
  function persistable() {
    const editais = db.editais.filter(kept).map(e => ({ ...e, itens: (e.itens || []).slice(0, 300) }));
    const ids = new Set(editais.map(e => e.id));
    return { profile: db.profile, docs: db.docs, editais, chats: Object.fromEntries(Object.entries(db.chats).filter(([id]) => ids.has(id))),
      vistos: db.vistos.slice(-800), buscas: db.buscas.slice(-10) };
  }
  function save() {
    if (mode === 'cloud') { saver.schedule(); return; }
    try { localStorage.setItem(STORE_KEY, JSON.stringify(db)); } catch (e) { /* sem armazenamento */ }
  }
  const onboarded = () => db.profile.palavras.length > 0 && db.profile.ufs.length > 0;
  const trialLeft = () => mode === 'cloud' ? Math.max(0, 7 - daysBetween(String(meta.createdAt).slice(0, 10), today())) : 5;

  async function enterCloud(session) {
    if (mode === 'cloud' && user?.id === session.user.id) return;
    if (entering) return entering;
    entering = (async () => {
      user = session.user;
      const m = user.user_metadata || {};
      let row = await store.load(user.id);
      if (!row) row = await store.create({ owner_id: user.id, data: normalizeDoc({}, { ...m, email: user.email }) });
      meta = { version: row.version, createdAt: row.created_at };
      db = normalizeDoc(row.data, { ...m, email: user.email }); mode = 'cloud';
      if (!saver) saver = Cloud.autosaver({
        getData: () => persistable(), getVersion: () => meta.version, setVersion: v => { meta.version = v; },
        save: (d, v) => store.save(d, v),
        onConflict: async () => {
          const r = await store.load(user.id); const fresh = normalizeDoc(r.data);
          meta.version = r.version;
          const liveOnly = db.editais.filter(e => !fresh.editais.some(x => x.id === e.id) && !kept(e));
          Object.assign(db, fresh, { editais: [...fresh.editais, ...liveOnly], plan: db.plan });
          maybeRerender(); toast('Sua conta foi atualizada em outro aparelho.');
        },
        onError: () => toast('Sem conexão. Vamos tentar salvar de novo em instantes…'),
      });
      refreshUsage();
      fetchLive();
    })();
    try { await entering; } finally { entering = null; }
  }
  function leaveCloud() { mode = 'demo'; user = null; meta = null; db = null; live.status = 'idle'; live.key = ''; }

  async function refreshUsage() {
    try {
      const mes = today().slice(0, 7);
      const { data } = await Cloud.from('radar_uso').select('analises').eq('owner_id', user.id).eq('mes', mes).maybeSingle();
      db.plan.analises = data?.analises || 0;
    } catch (e) { /* uso é informativo */ }
  }

  function defaultDocs(e) {
    return ['contrato', 'cnd_federal', 'fgts', 'cndt', 'estadual', 'municipal', 'falencia',
      ...(e.modalidade !== 'Dispensa Eletrônica' ? ['balanco'] : []), 'atestado', ...(e.categoria === 'Obras' ? ['crea'] : [])];
  }
  function prepLive(x) {
    return { ...x, itens: [], arquivos: [], docs: defaultDocs(x), fav: false, stage: null, exclusivaME: false, criterio: '',
      entrega: '', pagamento: '', garantia: null, amostra: false, visita: false, itensLoaded: false };
  }
  async function fetchLive(force = false) {
    if (mode !== 'cloud' || !db.profile.ufs.length) return;
    const key = db.profile.ufs.slice().sort().join(',');
    if (live.status === 'loading' || (!force && live.key === key && live.status === 'ok' && Date.now() - live.at < 10 * 60e3)) return;
    live.status = 'loading'; live.key = key; maybeRerender();
    try {
      const r = await Cloud.invoke('radar-editais', { ufs: db.profile.ufs, modalidades: [6, 8, 4, 5], paginas: 2 });
      const saved = new Map(db.editais.filter(kept).map(e => [e.id, e]));
      const merged = (r.editais || []).filter(x => x.abertura).map(x => {
        const old = saved.get(x.id);
        if (!old) return prepLive(x);
        saved.delete(x.id);
        return Object.assign(old, { abertura: x.abertura, horaAbertura: x.horaAbertura, valor: x.valor || old.valor, situacao: x.situacao });
      });
      db.editais = [...merged, ...saved.values()];
      Object.assign(live, { status: 'ok', at: Date.now(), erros: r.erros || [], msg: '' });
    } catch (e) {
      Object.assign(live, { status: 'error', msg: e.code || e.message });
    }
    maybeRerender();
  }
  // Re-renderiza quando dados chegam em segundo plano, sem atrapalhar quem está digitando.
  function maybeRerender() {
    const a = document.activeElement;
    if ($modal.innerHTML || (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName))) return;
    if (location.hash.startsWith('#/app')) rerender();
  }
  const isViewed = e => e.viewed || db.vistos.includes(e.id);
  function markViewed(e) { if (isViewed(e)) return; if (mode === 'cloud') db.vistos.push(e.id); else e.viewed = true; save(); }

  const ed = id => db.editais.find(e => e.id === id);
  const abertas = () => db.editais.filter(e => e.abertura && daysUntil(e.abertura) >= 0 && !['ganha', 'perdida'].includes(e.stage));

  // ---------- Documentos e compatibilidade ----------
  function docStatus(doc, ref = today()) {
    if (!doc) return { s: 'bad', label: 'Não enviado' };
    if (!doc.validade) return { s: 'ok', label: 'Sem validade' };
    const d = Math.round((parse(doc.validade) - parse(ref)) / 86400000);
    if (d < 0) return { s: 'bad', label: ref === today() ? `Vencido há ${-d}d` : 'Vence antes da sessão' };
    if (d <= 15) return { s: 'warn', label: `Vence em ${d}d` };
    return { s: 'ok', label: `Válido até ${fmtShort(doc.validade)}` };
  }
  const companyDoc = key => db.docs.find(d => d.key === key);

  function requisitos(e) {
    if (e.ai?.exigencias?.length) {
      const list = e.ai.exigencias.map(x => {
        const key = x.docKey && x.docKey !== 'outro' && DOC_TYPES[x.docKey] ? x.docKey : null;
        const st = key ? docStatus(companyDoc(key), e.abertura) : { s: 'warn', label: 'Verificar' };
        return { txt: x.texto, tipo: x.categoria, s: st.s, label: st.label, key };
      });
      if (e.exclusivaME) list.push({ txt: 'Participação exclusiva para ME/EPP (LC 123/2006)', tipo: 'Enquadramento', s: ['ME', 'EPP'].includes(db.profile.porte) ? 'ok' : 'bad', label: ['ME', 'EPP'].includes(db.profile.porte) ? `Você é ${db.profile.porte}` : 'Não elegível' });
      return list;
    }
    const list = (e.docs || defaultDocs(e)).map(key => {
      const st = docStatus(companyDoc(key), e.abertura);
      return { txt: DOC_TYPES[key], tipo: key === 'balanco' ? 'Econômico-financeira' : ['atestado', 'crea'].includes(key) ? 'Técnica' : key === 'contrato' ? 'Jurídica' : 'Fiscal e trabalhista', s: st.s, label: st.label, key };
    });
    if (e.amostra) list.push({ txt: 'Apresentação de amostra em até 5 dias úteis após convocação', tipo: 'Proposta', s: 'warn', label: 'Ação necessária' });
    if (e.visita) list.push({ txt: 'Visita técnica obrigatória ou declaração de conhecimento do local', tipo: 'Técnica', s: 'warn', label: 'Agendar' });
    if (e.garantia) list.push({ txt: `Garantia de execução de ${e.garantia}`, tipo: 'Contratual', s: 'warn', label: 'Providenciar' });
    if (e.exclusivaME) list.push({ txt: 'Participação exclusiva para ME/EPP (LC 123/2006)', tipo: 'Enquadramento', s: ['ME', 'EPP'].includes(db.profile.porte) ? 'ok' : 'bad', label: ['ME', 'EPP'].includes(db.profile.porte) ? `Você é ${db.profile.porte}` : 'Não elegível' });
    return list;
  }

  function score(e) {
    const p = db.profile;
    const text = norm(e.objeto + ' ' + e.itens.map(i => i.desc).join(' '));
    const hits = p.palavras.filter(w => text.includes(norm(w)));
    const kw = Math.min(40, hits.length * 16 + (p.cats.includes(e.categoria) ? 8 : 0));
    const uf = p.ufs.includes(e.uf) ? 20 : 0;
    const val = e.valor >= p.valorMin && e.valor <= p.valorMax ? 15 : 4;
    const reqs = requisitos(e);
    const docsOk = reqs.filter(x => x.s === 'ok').length / Math.max(1, reqs.length);
    const blocked = reqs.some(x => x.s === 'bad' && ['crea'].includes(x.key)) || (e.exclusivaME && !['ME', 'EPP'].includes(p.porte));
    const docs = Math.round(docsOk * 15);
    const du = daysUntil(e.abertura);
    const prazo = du >= 7 ? 10 : du >= 3 ? 6 : 2;
    let total = kw + uf + val + docs + prazo;
    if (blocked) total = Math.min(total, 35);
    return { total: Math.round(total), parts: [['Aderência ao seu ramo', kw, 40], ['Região de atuação', uf, 20], ['Faixa de valor', val, 15], ['Documentação pronta', docs, 15], ['Tempo para preparar', prazo, 10]], hits, blocked };
  }
  const scoreColor = v => v >= 75 ? 'var(--brand)' : v >= 50 ? '#d97706' : '#94a3b8';
  const scoreRing = (v, lg) => `<div class="score ${lg ? 'lg' : ''}" style="--v:${v};--c:${scoreColor(v)}" title="Compatibilidade ${v}/100"><b>${v}</b></div>`;
  const prazoBadge = e => { const d = daysUntil(e.abertura); return d < 0 ? '<span class="badge b-muted">Encerrada</span>' : d <= 3 ? `<span class="badge b-bad">⏰ ${d === 0 ? 'Hoje' : d === 1 ? 'Amanhã' : `em ${d} dias`}</span>` : d <= 7 ? `<span class="badge b-warn">em ${d} dias</span>` : `<span class="badge b-muted">em ${d} dias</span>`; };
  const STAGES = [['analisando', 'Em análise', '🔍'], ['proposta', 'Preparando proposta', '📝'], ['enviada', 'Proposta enviada', '📨'], ['ganha', 'Ganha', '🏆'], ['perdida', 'Perdida', '✖️']];
  const stageName = s => STAGES.find(x => x[0] === s)?.[1];

  // ---------- Resumo "IA" ----------
  function summary(e) {
    if (e.ai) return { rec: e.ai.recomendacao, tldr: e.ai.tldr, pontos: e.ai.pontos || [], riscos: e.ai.riscos || [] };
    const sc = score(e), reqs = requisitos(e);
    const pend = reqs.filter(x => x.s !== 'ok');
    const big = [...(e.itens || [])].sort((a, b) => b.qtd * b.ref - a.qtd * a.ref)[0];
    const rec = sc.blocked ? 'Não recomendado: há um impedimento de habilitação.' : sc.total >= 75 ? 'Recomendado participar.' : sc.total >= 50 ? 'Vale avaliar: há pontos de atenção.' : 'Baixa aderência ao seu perfil.';
    return {
      rec, tldr: `${e.orgao} (${e.uf}) busca ${e.objeto.charAt(0).toLowerCase() + e.objeto.slice(1)}, com valor estimado de ${brl(e.valor)}${e.criterio ? ` e disputa por ${e.criterio.toLowerCase()}` : ''}.${big && e.valor ? ` O item de maior peso é "${big.desc}" (${Math.round(big.qtd * big.ref / e.valor * 100)}% do total).` : ''}`,
      pontos: [
        `Sessão pública em ${fmtDate(e.abertura)} às ${e.horaAbertura}, no portal ${e.portal}.`,
        e.exclusivaME ? 'Exclusiva para ME/EPP: menos concorrentes de grande porte.' : 'Ampla participação, com cota de preferência para ME/EPP.',
        `Prazo de entrega/execução: ${e.entrega}. Pagamento: ${e.pagamento}.`,
        e.amostra ? 'Exige amostra: tenha o equipamento disponível para envio rápido.' : 'Não exige amostra.',
        e.garantia ? `Exige garantia contratual de ${e.garantia}.` : 'Sem exigência de garantia contratual.',
      ],
      riscos: [
        ...pend.map(p => `${p.txt}: ${p.label.toLowerCase()}.`),
        ...(e.criterio === 'Menor preço global' ? ['Julgamento global: um item ruim compromete toda a proposta.'] : []),
        ...(daysUntil(e.abertura) <= 3 ? ['Pouco tempo para preparar a documentação.'] : []),
      ],
    };
  }

  function answer(e, q) {
    const n = norm(q), s = summary(e), reqs = requisitos(e);
    const esclarec = addDays(e.abertura, -3), impug = addDays(e.abertura, -3);
    const R = (txt, src) => ({ txt, src });
    if (/vale a pena|devo|particip|chance|recomend/.test(n)) return R(`${s.rec} Compatibilidade ${score(e).total}/100. ${s.riscos.length ? 'Pontos de atenção: ' + s.riscos.slice(0, 3).join(' ') : 'Não identifiquei riscos relevantes.'}`, 'Análise Radar Licita');
    if (/prazo|data|abertura|quando|sessao|esclarec|impugn/.test(n) && !/entrega|pagamento/.test(n)) return R(`Sessão pública: ${fmtDate(e.abertura)} às ${e.horaAbertura} (horário de Brasília) no ${e.portal}.\nPedidos de esclarecimento: até ${fmtDate(esclarec)}.\nImpugnação: até ${fmtDate(impug)}.`, 'Edital, itens 1.1, 10.1 e 11.1');
    if (/garantia/.test(n)) return R(e.garantia ? `Sim. O edital exige garantia de execução de ${e.garantia}, nas modalidades caução, seguro-garantia ou fiança bancária.` : 'Não há exigência de garantia contratual neste edital.', 'Edital, item 18; Minuta do contrato, cláusula 9ª');
    if (/amostra/.test(n)) return R(e.amostra ? 'Sim. O arrematante deverá apresentar amostra em até 5 dias úteis após a convocação, sob pena de desclassificação.' : 'O edital não exige amostra.', 'Termo de Referência, item 6');
    if (/visita/.test(n)) return R(e.visita ? 'A visita técnica é facultativa, mas é obrigatório apresentar declaração de conhecimento das condições do local caso não seja realizada.' : 'Não há previsão de visita técnica.', 'Termo de Referência, item 8');
    if (/\bme\b|epp|micro|pequena|exclusiv/.test(n)) return R(e.exclusivaME ? 'Sim, a licitação é exclusiva para microempresas e empresas de pequeno porte (art. 48, I, da LC 123/2006).' : 'Não é exclusiva. ME/EPP têm direito de preferência em caso de empate ficto (até 5% acima do melhor lance).', 'Edital, item 4');
    if (/pagamento|pagar|receber|nota/.test(n)) return R(`Pagamento em ${e.pagamento}, mediante nota fiscal atestada pelo fiscal do contrato.`, 'Minuta do contrato, cláusula 6ª');
    if (/entrega|instala|execu/.test(n)) return R(`Prazo de entrega/execução: ${e.entrega}, contados do recebimento da ordem de fornecimento, no endereço indicado pelo órgão.`, 'Termo de Referência, item 5');
    if (/document|habilita|certid|exig/.test(n)) {
      const pend = reqs.filter(x => x.s !== 'ok');
      return R(`São exigidos ${reqs.length} itens de habilitação/proposta.\n${pend.length ? `Pendências na sua empresa:\n• ${pend.map(p => `${p.txt} (${p.label})`).join('\n• ')}` : 'Sua documentação cadastrada atende a todos os itens. ✅'}`, 'Edital, item 9 (Habilitação)');
    }
    if (/valor|preco|estimad|orcament|quanto/.test(n)) return R(`Valor total estimado: ${brl(e.valor)} (${e.criterio.toLowerCase()}).\nMaiores itens:\n${[...e.itens].sort((a, b) => b.qtd * b.ref - a.qtd * a.ref).slice(0, 3).map(i => `• ${i.desc}: ${i.qtd} ${i.unid} × ${brl(i.ref)}`).join('\n')}`, 'Anexo I, planilha de preços estimados');
    if (/consorcio|subcontrat/.test(n)) return R('A participação em consórcio é vedada e a subcontratação não é permitida para o objeto principal.', 'Edital, item 4.4');
    return R(`Não encontrei menção direta a isso no edital. Sugiro enviar um pedido de esclarecimento ao pregoeiro até ${fmtDate(esclarec)}. Posso redigir o pedido se quiser: pergunte "redigir esclarecimento".`, 'Busca em 48 páginas');
  }

  // ---------- Estado de interface ----------
  const ui = {
    billing: 'mensal', onb: 1,
    f: { q: '', uf: '', mod: '', cat: '', view: 'todas', min: 0, sort: 'score' },
    tab: 'resumo', typing: false, analyzing: null, busy: false, authMsg: '', authErr: false, demo: false,
  };

  // ---------- Modal / toast ----------
  function toast(m) { const el = document.createElement('div'); el.className = 'toast'; el.textContent = m; $toast.appendChild(el); setTimeout(() => el.remove(), 2600); }
  function openModal(html) { $modal.innerHTML = `<div class="overlay" data-action="overlay"><div class="modal" role="dialog" aria-modal="true">${html}</div></div>`; }
  function closeModal() { $modal.innerHTML = ''; }
  const mHead = (t, s = '') => `<div class="modal-head"><div><h3>${t}</h3>${s ? `<p class="muted small">${s}</p>` : ''}</div><button class="x" data-action="close" aria-label="Fechar">×</button></div>`;

  // ---------- Landing ----------
  const PLANS = [
    { id: 'Essencial', price: 197, desc: 'Para começar a vender ao governo.', items: ['Alertas diários por e-mail', '3 perfis de busca', '30 análises de edital por IA/mês', 'Gestão de certidões', '1 usuário'] },
    { id: 'Pro', price: 397, desc: 'Para quem participa toda semana.', featured: true, items: ['Alertas em tempo real (WhatsApp)', '10 perfis de busca', '100 análises por IA/mês', '"Pergunte ao edital" ilimitado', 'Pipeline e gerador de proposta', '3 usuários'] },
    { id: 'Empresa', price: 897, desc: 'Para equipes de licitação.', items: ['Perfis e análises ilimitados', 'Tudo do Pro', 'Histórico de preços vencedores', 'API e integrações', 'Usuários ilimitados', 'Consultor dedicado'] },
  ];

  function vLanding() {
    const annual = ui.billing === 'anual';
    const demo = abertas().map(e => ({ e, s: score(e).total })).sort((a, b) => b.s - a.s).slice(0, 3);
    return `<div class="lp">
    <header class="lp-nav"><div class="container">
      <a class="logo" href="#/"><span class="logo-mark"></span>Radar Licita</a>
      <nav class="lp-links"><a href="#como" data-action="scroll">Como funciona</a><a href="#recursos" data-action="scroll">Recursos</a><a href="#precos" data-action="scroll">Preços</a><a href="#faq" data-action="scroll">Dúvidas</a></nav>
      <div style="display:flex;gap:8px"><a class="btn btn-ghost" href="#/entrar?login">Entrar</a><a class="btn btn-primary" href="#/entrar">Testar grátis</a></div>
    </div></header>
    <section class="hero"><div class="container">
      <div>
        <span class="pill"><i></i>Dados oficiais do PNCP, atualizados todos os dias</span>
        <h1>Venda para o governo <span>sem ler 80 páginas</span> de edital.</h1>
        <p class="lead">O Radar Licita encontra as licitações que combinam com a sua empresa, avisa no WhatsApp e usa IA para resumir o edital, checar sua documentação e responder suas dúvidas em segundos.</p>
        <div class="hero-actions"><a class="btn btn-primary btn-lg" href="#/entrar">Começar 7 dias grátis</a><a class="btn btn-ghost btn-lg" href="#/app?demo">Ver demonstração →</a></div>
        <p class="hero-note">Sem cartão de crédito · Configure em 3 minutos com seu CNPJ</p>
      </div>
      <div class="radar-card" aria-hidden="true">
        <div class="rc-head"><span>🎯 Novas oportunidades para você</span><span>hoje</span></div>
        ${demo.map(({ e, s }) => `<div class="rc-item">${scoreRing(s)}<div><b>${esc(e.objeto.length > 52 ? e.objeto.slice(0, 50) + '…' : e.objeto)}</b><span>${esc(e.orgao)} · ${e.uf}</span></div><div class="val">${brlK(e.valor)}</div></div>`).join('')}
        ${demo.length ? `<div class="rc-ai"><b>IA:</b> ${esc(summary(demo[0].e).rec)} Confira os documentos exigidos antes de ${fmtShort(demo[0].e.abertura)}.</div>` : ''}
      </div>
    </div>
    <div class="container logos"><span>PNCP</span><span>Compras.gov.br</span><span>BLL</span><span>Licitações-e</span><span>BNC</span><span>Portais estaduais</span><span>Diários oficiais</span></div>
    </section>

    <div class="lp-light">
      <section class="section" id="como"><div class="container">
        <div class="section-head"><h2>Do edital publicado à proposta enviada</h2><p>O trabalho de um analista de licitações, feito em minutos.</p></div>
        <div class="flow">
          ${[['Encontrar', 'Varremos diariamente o PNCP, portais e diários oficiais e filtramos pelo seu ramo, região e faixa de valor.'], ['Avaliar', 'Cada edital recebe uma nota de compatibilidade de 0 a 100, explicada critério por critério.'], ['Entender', 'A IA resume o edital, lista exigências, prazos e riscos, e responde qualquer pergunta citando o item.'], ['Disputar', 'Organize tudo no pipeline, gere a proposta comercial e acompanhe certidões e prazos.']]
            .map(([h, p], i) => `<div class="flow-step"><span class="n">0${i + 1}</span><h3>${h}</h3><p>${p}</p></div>`).join('')}
        </div>
      </div></section>
      <section class="section" id="recursos" style="padding-top:0"><div class="container">
        <div class="section-head"><h2>Tudo para ganhar mais licitações</h2></div>
        <div class="feat-grid">
          ${[['🎯', 'Nota de compatibilidade', 'Pare de perder tempo com editais que você não pode ganhar. Veja primeiro o que tem mais chance.'], ['🤖', 'Resumo do edital por IA', 'Objeto, valor, prazos, exigências e riscos em uma tela, em vez de 80 páginas de PDF.'], ['💬', 'Pergunte ao edital', '"Exige amostra?" "Qual o prazo de entrega?" Respostas com a citação do item do edital.'], ['📲', 'Alertas no WhatsApp', 'Receba as oportunidades no momento em que forem publicadas, antes da concorrência.'], ['📁', 'Cofre de certidões', 'Avisamos antes de cada certidão vencer e cruzamos com as exigências de cada edital.'], ['📊', 'Pipeline de disputas', 'Kanban com valores, prazos e responsáveis. Saiba quanto você tem em disputa.']]
            .map(([i, h, p]) => `<div class="feat"><div class="ic">${i}</div><h3>${h}</h3><p>${p}</p></div>`).join('')}
        </div>
      </div></section>
    </div>

    <section class="section"><div class="container numbers">
      <div><b>R$ 1 tri</b><span>em compras públicas por ano no Brasil*</span></div>
      <div><b>~40 mil</b><span>novos processos de compra por mês*</span></div>
      <div><b>6h → 5min</b><span>tempo médio para analisar um edital</span></div>
      <div><b>24/7</b><span>monitoramento automático</span></div>
    </div></section>

    <div class="lp-light">
      <section class="section" id="precos" style="text-align:center"><div class="container">
        <div class="section-head"><h2>Um contrato ganho paga anos de assinatura</h2><p>Escolha o plano para o seu volume de participação.</p></div>
        <div class="toggle"><button class="${!annual ? 'on' : ''}" data-action="billing" data-v="mensal">Mensal</button><button class="${annual ? 'on' : ''}" data-action="billing" data-v="anual">Anual (2 meses grátis)</button></div>
        <div class="pricing">${PLANS.map(p => {
          const price = annual ? Math.round(p.price * 10 / 12) : p.price;
          return `<div class="plan ${p.featured ? 'featured' : ''}">${p.featured ? '<span class="tag">Mais popular</span>' : ''}<h3>${p.id}</h3><p class="muted small">${p.desc}</p>
          <div class="price">R$ ${price}<small>/mês</small></div><p class="muted small">${annual ? `R$ ${p.price * 10} cobrados por ano` : 'sem fidelidade'}</p>
          <ul>${p.items.map(i => `<li>${i}</li>`).join('')}</ul><a class="btn ${p.featured ? 'btn-primary' : 'btn-dark'}" href="#/entrar">Testar 7 dias grátis</a></div>`;
        }).join('')}</div>
      </div></section>
      <section class="section" id="faq" style="padding-top:0"><div class="container">
        <div class="section-head"><h2>Dúvidas frequentes</h2></div>
        <div class="faq">${[
          ['De onde vêm as licitações?', 'Do Portal Nacional de Contratações Públicas (PNCP), Compras.gov.br, BLL, Licitações-e, BNC, portais próprios de estados e municípios e diários oficiais.'],
          ['A IA pode errar?', 'Toda resposta cita o item do edital de onde a informação foi tirada, para você conferir. A decisão final é sempre sua.'],
          ['Preciso ter experiência com licitações?', 'Não. O Radar explica cada exigência em linguagem simples e mostra o que falta na sua documentação.'],
          ['Vocês enviam a proposta por mim?', 'Não. Geramos a proposta comercial e organizamos os documentos; o envio e os lances são feitos por você no portal do órgão.'],
          ['Posso cancelar quando quiser?', 'Sim. Sem multa e sem fidelidade nos planos mensais.']]
          .map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join('')}</div>
      </div></section>
    </div>

    <section class="cta-final"><div class="container"><h2>Sua próxima venda pode estar publicada agora.</h2><p>Informe seu CNPJ e veja as oportunidades compatíveis em menos de 3 minutos.</p><a class="btn btn-primary btn-lg" href="#/entrar">Criar conta grátis</a></div></section>
    <footer class="lp-footer"><div class="container"><span>© ${new Date().getFullYear()} Radar Licita</span><span>* ordem de grandeza com base em dados públicos; valide antes de usar em material comercial.</span></div></footer>
    </div>`;
  }

  // ---------- Login e onboarding ----------
  const notice = () => ui.authMsg ? `<div class="ai-box small" role="alert" style="${ui.authErr ? 'background:var(--bad-soft);color:var(--bad)' : ''}">${esc(ui.authMsg)}</div>` : '';
  function vAuth(view) {
    const head = `<a class="logo" href="#/"><span class="logo-mark"></span>Radar Licita</a>`;
    if (view === 'login') {
      return `<div class="auth"><div class="auth-card">${head}
        <form data-form="login" style="display:grid;gap:14px"><h1>Entrar</h1>${notice()}
          ${Cloud.enabled ? '' : '<p class="small muted">Modo demonstração: o backend ainda não foi configurado, então você entra nos dados de exemplo.</p>'}
          <div class="field"><label>E-mail</label><input class="input" type="email" name="email" required autocomplete="email"></div>
          <div class="field"><label>Senha</label><input class="input" type="password" name="senha" minlength="6" required autocomplete="current-password"></div>
          ${Cloud.enabled ? '<a href="#" class="small" data-action="forgot" style="justify-self:end">Esqueci minha senha</a>' : ''}
          <button class="btn btn-primary btn-lg" ${ui.busy ? 'disabled' : ''}>${ui.busy ? 'Aguarde…' : 'Entrar'}</button>
          <a class="btn btn-ghost" href="#/app?demo">Ver a conta de demonstração</a>
          <p class="small muted" style="text-align:center">Ainda não tem conta? <a href="#/entrar">Criar conta grátis</a></p>
        </form></div></div>`;
    }
    if (view === 'newpass') {
      return `<div class="auth"><div class="auth-card">${head}<form data-form="newpass" style="display:grid;gap:14px"><h1>Nova senha</h1>${notice()}
        <div class="field"><label>Nova senha</label><input class="input" type="password" name="senha" minlength="6" required autocomplete="new-password"></div>
        <button class="btn btn-primary btn-lg" ${ui.busy ? 'disabled' : ''}>Salvar</button></form></div></div>`;
    }
    const step = mode === 'cloud' ? 2 : ui.onb;
    const step1 = `<form data-form="onb1" style="display:grid;gap:14px">
        <h1>Crie sua conta</h1><p class="muted">7 dias grátis do plano Pro. Sem cartão.</p>${notice()}
        ${Cloud.enabled ? '' : '<p class="small muted">Modo demonstração: nenhuma conta é criada; os dados ficam neste navegador.</p>'}
        <div class="field"><label>CNPJ da empresa</label><div style="display:flex;gap:8px"><input class="input" name="cnpj" required placeholder="00.000.000/0000-00" data-input="cnpj" inputmode="numeric"><button type="button" class="btn btn-ghost" data-action="cnpj-lookup">Buscar</button></div></div>
        <div class="field"><label>Razão social</label><input class="input" name="razao" required id="razao"></div>
        <div class="row"><div class="field"><label>Porte</label><select class="input" name="porte" id="porte"><option>ME</option><option selected>EPP</option><option>Demais</option></select></div>
        <div class="field"><label>Seu nome</label><input class="input" name="contato" required autocomplete="name"></div></div>
        <div class="field"><label>E-mail</label><input class="input" type="email" name="email" required autocomplete="email"></div>
        <div class="field"><label>Senha</label><input class="input" type="password" name="senha" minlength="6" required autocomplete="new-password"></div>
        <input type="hidden" name="uf" id="uf-cnpj">
        <button class="btn btn-primary btn-lg" ${ui.busy ? 'disabled' : ''}>${ui.busy ? 'Criando conta…' : 'Continuar'}</button>
        <p class="small muted" style="text-align:center">Já tem conta? <a href="#/entrar?login">Entrar</a> · <a href="#/app?demo">Ver demonstração</a></p>
      </form>`;
    const p = db?.profile || emptyProfile();
    const step2 = `<form data-form="onb2" style="display:grid;gap:14px">
        <h1>O que você vende?</h1><p class="muted">Usamos isso para encontrar e pontuar as licitações certas.</p>${notice()}
        <div class="field"><label>Palavras-chave (Enter para adicionar)</label>${tagsInput(p.palavras)}</div>
        <div class="field"><label>Estados onde você atende</label><div class="check-grid">${UFS.map(u => `<label><input type="checkbox" name="uf" value="${u}" ${p.ufs.includes(u) ? 'checked' : ''}>${u}</label>`).join('')}</div></div>
        <button class="btn btn-primary btn-lg">Ver minhas oportunidades →</button>
      </form>`;
    return `<div class="auth"><div class="auth-card">${head}
      <div class="steps-bar"><i class="on"></i><i class="${step >= 2 ? 'on' : ''}"></i></div>
      ${step === 1 ? step1 : step2}
    </div></div>`;
  }
  function tagsInput(list) {
    return `<div class="tags" data-action="focus-tags">${list.map((w, i) => `<span class="tag-chip">${esc(w)}<button type="button" data-action="rm-tag" data-i="${i}" aria-label="Remover ${esc(w)}">×</button></span>`).join('')}<input data-input="tag" placeholder="ex.: notebook, toner…" aria-label="Nova palavra-chave"></div>`;
  }

  // ---------- Shell ----------
  const NAV = [['', '📊', 'Painel'], ['oportunidades', '🎯', 'Oportunidades'], ['pipeline', '🗂️', 'Pipeline'], ['alertas', '🔔', 'Alertas'], ['documentos', '📁', 'Documentos'], ['plano', '💳', 'Plano']];
  function shell(sec, title, actions, body, crumbs = '') {
    const novas = abertas().filter(e => !isViewed(e) && score(e).total >= 60).length;
    const docAlert = db.docs.filter(d => docStatus(d).s !== 'ok').length;
    const counts = { oportunidades: novas, documentos: docAlert };
    const link = (k, i, l, cls) => `<a class="${cls} ${sec === k ? 'active' : ''}" href="#/app${k ? '/' + k : ''}"><span class="ni">${i}</span>${l}${cls && counts[k] ? `<span class="count">${counts[k]}</span>` : ''}</a>`;
    const pl = db.plan;
    return `<div class="app">
      <aside class="sidebar"><a class="logo" href="#/"><span class="logo-mark"></span>Radar Licita</a>
        ${NAV.map(([k, i, l]) => link(k, i, l, 'nav-item')).join('')}
        <div class="side-usage">${mode === 'cloud'
          ? `<b>Plano ${pl.nome}</b> · teste grátis (${trialLeft()} dias)<div class="meter"><i style="width:${Math.min(100, pl.analises / pl.limite * 100)}%"></i></div>${pl.analises} de ${pl.limite} análises por IA este mês<br><a href="#" data-action="logout" style="color:#c3cfde">Sair da conta</a>`
          : `<b>Modo demonstração</b><br>Dados de exemplo neste navegador.${Cloud.enabled ? '<br><a href="#/entrar" style="color:var(--brand-2)">Criar minha conta</a>' : ''}`}</div>
      </aside>
      <div style="min-width:0">
        <header class="topbar"><div style="min-width:0">${crumbs ? `<div class="crumbs">${crumbs}</div>` : ''}<h1>${title}</h1></div><div class="topbar-right">${actions}<span class="avatar" title="${esc(db.profile.razao)}">${(db.profile.razao || user?.email || '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()}</span></div></header>
        <main class="page">${body}</main>
      </div>
      <nav class="bottom-nav">${NAV.filter(n => n[0] !== 'plano').map(([k, i, l]) => link(k, i, l === 'Oportunidades' ? 'Editais' : l, '')).join('')}</nav>
    </div>`;
  }

  // ---------- Painel ----------
  function chart(data) {
    const W = 640, H = 230, P = { t: 12, r: 8, b: 26, l: 48 };
    const max = Math.max(1000, ...data.map(d => d.disputado)) * 1.1;
    const g = (W - P.l - P.r) / data.length;
    const y = v => P.t + (H - P.t - P.b) * (1 - v / max);
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Valor disputado e ganho por mês">
      ${[0, .5, 1].map(f => `<line class="grid" x1="${P.l}" x2="${W - P.r}" y1="${y(max * f)}" y2="${y(max * f)}"/><text x="${P.l - 6}" y="${y(max * f) + 4}" text-anchor="end">${brlK(max * f).replace('R$ ', '')}</text>`).join('')}
      ${data.map((d, i) => { const x = P.l + i * g; const bw = g * .3; return `
        <rect class="bar alt" x="${x + g * .17}" y="${y(d.disputado)}" width="${bw}" height="${H - P.b - y(d.disputado)}" rx="3"><title>Disputado em ${d.mes}: ${brl(d.disputado)}</title></rect>
        <rect class="bar" x="${x + g * .17 + bw + 4}" y="${y(d.ganho)}" width="${bw}" height="${H - P.b - y(d.ganho)}" rx="3"><title>Ganho em ${d.mes}: ${brl(d.ganho)}</title></rect>
        <text x="${x + g / 2}" y="${H - 8}" text-anchor="middle">${d.mes}</text>`; }).join('')}
    </svg>`;
  }

  // Histórico de disputas: no modo demo vem pronto; numa conta real é calculado do pipeline.
  function historyData() {
    if (db.history?.length) return db.history;
    return Array.from({ length: 6 }, (_, k) => {
      const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - (5 - k));
      const mk = iso(d).slice(0, 7);
      const doMes = db.editais.filter(e => e.abertura?.startsWith(mk) && ['enviada', 'ganha', 'perdida'].includes(e.stage));
      const ganhas = doMes.filter(e => e.stage === 'ganha');
      return { mes: `${MONTHS[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`, disputado: doMes.reduce((s, e) => s + e.valor, 0),
        ganho: ganhas.reduce((s, e) => s + e.valor, 0), part: doMes.filter(e => e.stage !== 'enviada').length, wins: ganhas.length };
    });
  }
  function liveBar() {
    if (mode !== 'cloud') return '';
    const hora = live.at ? new Date(live.at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
    const msg = live.status === 'loading' ? '⏳ Buscando licitações abertas no PNCP…'
      : live.status === 'error' ? `⚠️ Não foi possível consultar o PNCP agora (${esc(live.msg)}). Mostrando o que está salvo.`
      : live.status === 'ok' ? `✅ Dados do PNCP atualizados às ${hora} · ${abertas().length} licitações abertas nos seus estados${live.erros.length ? ` · ${live.erros.length} consultas falharam` : ''}`
      : 'Configure seus estados em Alertas para buscar licitações.';
    return `<div class="card" style="padding:12px 16px;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap"><span class="small">${msg}</span>
      <button class="btn btn-ghost btn-sm" data-action="refresh-live" ${live.status === 'loading' ? 'disabled' : ''}>↻ Atualizar</button></div>`;
  }

  function vDashboard() {
    const open = abertas().map(e => ({ e, sc: score(e) }));
    const novas = open.filter(({ e, sc }) => daysUntil(e.publicado) >= -2 && sc.total >= 60);
    const disputa = db.editais.filter(e => ['analisando', 'proposta', 'enviada'].includes(e.stage));
    const ganhas = db.editais.filter(e => e.stage === 'ganha'), perdidas = db.editais.filter(e => e.stage === 'perdida');
    const hist = historyData();
    const hWins = hist.reduce((s, h) => s + h.wins, 0), hPart = hist.reduce((s, h) => s + h.part, 0);
    const winRate = (hWins + ganhas.length) / Math.max(1, hPart + ganhas.length + perdidas.length);
    const docIssues = db.docs.filter(d => docStatus(d).s !== 'ok');
    const top = open.filter(x => !x.e.stage).sort((a, b) => b.sc.total - a.sc.total).slice(0, 5);
    const prazos = [
      ...disputa.filter(e => daysUntil(e.abertura) >= 0).map(e => ({ d: e.abertura, html: `<b>${esc(e.numero)}</b> · sessão às ${e.horaAbertura}`, sub: esc(e.orgao), href: `#/app/edital/${encodeURIComponent(e.id)}`, tag: stageName(e.stage) })),
      ...db.docs.filter(d => d.validade && daysUntil(d.validade) <= 30).map(d => ({ d: d.validade, html: `<b>${esc(d.nome)}</b>`, sub: daysUntil(d.validade) < 0 ? 'vencida' : 'vencimento', href: '#/app/documentos', tag: 'Certidão' })),
    ].sort((a, b) => a.d.localeCompare(b.d)).slice(0, 6);
    const bestUF = Object.entries(open.filter(x => x.sc.total >= 70).reduce((m, x) => (m[x.e.uf] = (m[x.e.uf] || 0) + 1, m), {})).sort((a, b) => b[1] - a[1])[0];
    const docsBlocking = open.filter(x => x.sc.total >= 60 && requisitos(x.e).some(r => r.key && r.s !== 'ok')).length;

    const body = `
      ${liveBar()}
      <div class="kpis">
        <div class="kpi"><small>Novas compatíveis (48h)</small><b>${novas.length}</b><span class="muted small">de ${open.length} licitações abertas</span></div>
        <div class="kpi"><small>Valor em disputa</small><b>${brlK(disputa.reduce((s, e) => s + e.valor, 0))}</b><span class="muted small">${disputa.length} processos no pipeline</span></div>
        <div class="kpi"><small>Taxa de vitória</small><b>${Math.round(winRate * 100)}%</b><span class="muted small">últimos 6 meses</span></div>
        <div class="kpi"><small>Documentos com atenção</small><b style="color:${docIssues.length ? 'var(--bad)' : 'var(--ok)'}">${docIssues.length}</b><span class="muted small">${docIssues.length ? 'renove para não ser inabilitado' : 'tudo em dia'}</span></div>
      </div>
      <div class="ai-box"><div class="ai-label">✦ Insight da semana</div>
        ${bestUF ? `<b>${bestUF[0]}</b> concentra ${bestUF[1]} oportunidades com nota acima de 70 abertas agora.` : ''} ${docsBlocking ? `Documentos pendentes ou vencidos afetam <b>${docsBlocking} editais</b> com boa nota. <a href="#/app/documentos">Resolver agora →</a>` : open.length ? 'Sua documentação está em dia para as principais oportunidades.' : 'Assim que houver licitações compatíveis, elas aparecem aqui.'}
      </div>
      <div class="grid-2">
        <div class="card"><div class="card-head"><h3>Melhores oportunidades para você</h3><a class="btn btn-ghost btn-sm" href="#/app/oportunidades">Ver todas</a></div>
          <div class="opp-list">${top.map(({ e, sc }) => oppRow(e, sc, true)).join('') || `<div class="empty"><div class="big">🔭</div>${mode === 'cloud' && live.status === 'loading' ? 'Buscando…' : 'Nenhuma licitação aberta encontrada ainda.'}</div>`}</div></div>
        <div class="card"><div class="card-head"><h3>Próximos prazos</h3></div>
          <div class="timeline">${prazos.length ? prazos.map(p => `<a class="tl ${daysUntil(p.d) < 0 ? 'past' : ''}" href="${p.href}" style="text-decoration:none"><span class="dot"></span><div style="min-width:0"><div class="small" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.html}</div><span class="muted small">${p.sub} · ${p.tag}</span></div><span class="small" style="font-weight:700;color:${daysUntil(p.d) <= 3 ? 'var(--bad)' : 'inherit'}">${fmtShort(p.d)}</span></a>`).join('') : '<p class="muted">Nada nos próximos dias.</p>'}</div></div>
      </div>
      <div class="card"><div class="card-head"><h3>Desempenho em licitações</h3><div class="legend"><span><i style="background:#b8c4d4"></i>Disputado</span><span><i style="background:var(--brand)"></i>Ganho</span></div></div>${chart(historyData())}</div>`;
    return shell('', 'Painel', `<a class="btn btn-primary" href="#/app/oportunidades">🎯 <span class="hide-sm">Ver oportunidades</span></a>`, body);
  }

  function oppRow(e, sc, compact) {
    const isNew = !isViewed(e) && e.publicado && daysUntil(e.publicado) >= -2;
    return `<div class="opp" data-action="open-ed" data-id="${e.id}">
      ${scoreRing(sc.total)}
      <div style="min-width:0">
        <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center"><span class="mono muted">${esc(e.numero)}</span><span class="badge b-info">${esc(e.modalidade)}</span>${isNew ? '<span class="badge b-violet">Nova</span>' : ''}${e.exclusivaME ? '<span class="badge b-ok">ME/EPP</span>' : ''}${e.stage ? `<span class="badge b-muted">${stageName(e.stage)}</span>` : ''}</div>
        <div class="opp-title" ${compact ? 'style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis"' : ''}>${esc(e.objeto)}</div>
        <div class="opp-meta"><span>🏛 ${esc(e.orgao)} · ${e.uf}</span>${compact ? '' : `<span>🌐 ${esc(e.portal)}</span><span>📅 Sessão ${fmtShort(e.abertura)} ${e.horaAbertura}</span>`}</div>
      </div>
      <div class="opp-side"><span class="val">${brlK(e.valor)}</span>${prazoBadge(e)}
        ${compact ? '' : `<div class="opp-actions"><button class="star ${e.fav ? 'on' : ''}" data-action="fav" data-id="${e.id}" aria-label="Favoritar">${e.fav ? '★' : '☆'}</button>${e.stage ? '' : `<button class="btn btn-soft btn-sm" data-action="to-pipe" data-id="${e.id}">+ Pipeline</button>`}</div>`}</div>
    </div>`;
  }

  // ---------- Oportunidades ----------
  function vOportunidades() {
    const f = ui.f;
    const q = norm(f.q);
    let list = abertas().map(e => ({ e, sc: score(e) })).filter(({ e, sc }) => {
      if (q && !norm(`${e.objeto} ${e.orgao} ${e.numero} ${e.itens.map(i => i.desc).join(' ')}`).includes(q)) return false;
      if (f.uf === 'meus' ? !db.profile.ufs.includes(e.uf) : f.uf && e.uf !== f.uf) return false;
      if (f.mod && e.modalidade !== f.mod) return false;
      if (f.cat && e.categoria !== f.cat) return false;
      if (sc.total < f.min) return false;
      if (f.view === 'favoritas' && !e.fav) return false;
      if (f.view === 'novas' && !(e.publicado && daysUntil(e.publicado) >= -2)) return false;
      if (f.view === 'me' && !e.exclusivaME) return false;
      return true;
    });
    const sorters = { score: (a, b) => b.sc.total - a.sc.total, prazo: (a, b) => a.e.abertura.localeCompare(b.e.abertura), valor: (a, b) => b.e.valor - a.e.valor, recentes: (a, b) => b.e.publicado.localeCompare(a.e.publicado) };
    list.sort(sorters[f.sort]);
    const ufs = [...new Set(db.editais.map(e => e.uf))].sort();
    const sel = (k, opts, label) => `<select class="input" data-input="f" data-k="${k}" aria-label="${label}">${opts.map(([v, l]) => `<option value="${v}" ${f[k] === v ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
    const body = `
      <div class="card">
        <div class="filters">
          <input class="input" placeholder="Buscar por objeto, item, órgão ou número…" value="${esc(f.q)}" data-input="fq" aria-label="Buscar">
          ${sel('uf', [['', 'Todos os estados'], ['meus', 'Meus estados'], ...ufs.map(u => [u, u])], 'Estado')}
          ${sel('mod', [['', 'Todas as modalidades'], ...['Pregão Eletrônico', 'Concorrência', 'Dispensa Eletrônica'].map(m => [m, m])], 'Modalidade')}
          ${sel('cat', [['', 'Todos os segmentos'], ...Object.keys(CATS).map(c => [c, c])], 'Segmento')}
          ${sel('sort', [['score', 'Maior compatibilidade'], ['prazo', 'Sessão mais próxima'], ['valor', 'Maior valor'], ['recentes', 'Publicadas recentemente']], 'Ordenar')}
        </div>
        <div class="filters-2">
          <div class="chips" style="display:flex;gap:6px;flex-wrap:wrap">${[['todas', 'Todas'], ['novas', 'Novas (48h)'], ['favoritas', '★ Favoritas'], ['me', 'Exclusivas ME/EPP']].map(([k, l]) => `<button class="btn btn-sm ${f.view === k ? 'btn-dark' : 'btn-ghost'}" data-action="view" data-v="${k}">${l}</button>`).join('')}</div>
          <label class="range"><span class="small muted" style="white-space:nowrap">Nota mínima <b id="min-v">${f.min}</b></span><input type="range" min="0" max="90" step="5" value="${f.min}" data-input="fmin" aria-label="Nota mínima"></label>
        </div>
      </div>
      ${liveBar()}
      ${db.buscas.length ? `<div class="chips" style="display:flex;gap:6px;flex-wrap:wrap;align-items:center"><span class="small muted">Buscas salvas:</span>${db.buscas.map((b, i) => `<button class="btn btn-ghost btn-sm" data-action="apply-search" data-i="${i}">${esc(b.nome)}</button>`).join('')}</div>` : ''}
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap"><span class="muted"><b style="color:var(--ink)">${list.length}</b> licitações abertas · ${brlK(list.reduce((s, x) => s + x.e.valor, 0))} em valor estimado</span>
        <button class="btn btn-ghost btn-sm" data-action="save-alert">🔔 Salvar busca como alerta</button></div>
      <div class="opp-list">${list.length ? list.map(({ e, sc }) => oppRow(e, sc)).join('') : '<div class="card empty"><div class="big">🔭</div>Nenhuma licitação com esses filtros. Tente reduzir a nota mínima.</div>'}</div>`;
    return shell('oportunidades', 'Oportunidades', '', body);
  }

  // ---------- Edital ----------
  function vEdital(id) {
    const e = ed(id);
    if (!e) return shell('oportunidades', 'Edital não encontrado', '', '<div class="card empty">Este edital não existe mais. <a href="#/app/oportunidades">Voltar</a></div>');
    markViewed(e);
    const real = e.fonte === 'pncp';
    if (real && !e.itensLoaded && !e.itensLoading) loadDetails(e);
    const sc = score(e), s = summary(e), reqs = requisitos(e);
    const okN = reqs.filter(r => r.s === 'ok').length;
    const tabs = [['resumo', 'Resumo IA'], ['requisitos', `Exigências (${okN}/${reqs.length})`], ['itens', `Itens (${e.itensLoading ? '…' : (e.itens || []).length})`], ['prazos', 'Prazos'], ['chat', '💬 Pergunte ao edital']];
    const analyzing = ui.analyzing === e.id;
    const aiBtn = `<button class="btn btn-primary" data-action="analyze" data-id="${e.id}" ${analyzing ? 'disabled' : ''}>${analyzing ? '⏳ Lendo o edital… (pode levar 1 minuto)' : e.ai ? '↻ Refazer análise' : '✦ Analisar edital com IA'}</button>`;
    let content = '';
    if (ui.tab === 'resumo' && real && !e.ai) content = `
      <div class="ai-box"><div class="ai-label">✦ Análise por IA</div><p>A IA lê o PDF do edital publicado no PNCP e os itens, resume o que importa, lista as exigências de habilitação e aponta riscos para a sua empresa.</p><div style="margin-top:12px">${aiBtn}</div></div>
      <h4 style="margin-top:18px">Dados oficiais do PNCP</h4>
      <dl class="kv" style="margin-top:10px"><dt>Órgão</dt><dd>${esc(e.orgao)}</dd>${e.unidade ? `<dt>Unidade</dt><dd>${esc(e.unidade)}</dd>` : ''}<dt>Local</dt><dd>${esc(e.cidade)}/${e.uf}</dd><dt>Situação</dt><dd>${esc(e.situacao || '—')}</dd><dt>Registro de preços</dt><dd>${e.srp ? 'Sim' : 'Não'}</dd><dt>Fim do envio de propostas</dt><dd>${fmtDate(e.abertura)} ${e.horaAbertura}</dd></dl>`;
    else if (ui.tab === 'resumo') content = `
      <div class="ai-box"><div class="ai-label">✦ ${e.ai ? 'Análise da IA' : 'Resumo gerado por IA'}${e.ai?.nivel ? ` · aderência ${esc(e.ai.nivel)}` : ''}</div><p>${esc(s.tldr)}</p><p style="margin-top:8px"><b>${esc(s.rec)}</b></p></div>
      <div class="grid-2-even" style="margin-top:16px">
        <div><h4>Pontos principais</h4><ul class="bullets">${s.pontos.map(p => `<li>${esc(p)}</li>`).join('')}</ul></div>
        <div><h4>Riscos e pendências</h4>${s.riscos.length ? `<ul class="bullets">${s.riscos.map(p => `<li>${esc(p)}</li>`).join('')}</ul>` : '<p class="muted" style="margin-top:10px">Nenhum risco relevante identificado. ✅</p>'}</div>
      </div>
      <p class="muted small" style="margin-top:16px">${real ? `Análise feita pela IA a partir do edital publicado no PNCP${e.aiLeuPdf === false ? ' (o PDF não pôde ser lido; baseada só nos dados e itens)' : ''}. Confira sempre o documento original antes de decidir.` : 'Resumo baseado no edital e anexos (48 páginas). Confira sempre o documento original antes de decidir.'}</p>
      ${real ? `<div style="margin-top:12px">${aiBtn}</div>` : ''}`;
    if (ui.tab === 'requisitos') content = `${real && !e.ai ? `<div class="ai-box small" style="margin-bottom:10px">Esta é a lista padrão de habilitação da Lei 14.133. Para ver as exigências específicas deste edital, use a análise por IA.<div style="margin-top:8px">${aiBtn}</div></div>` : ''}<p class="muted small" style="margin-bottom:8px">Cruzamos as exigências com os documentos cadastrados, considerando a validade na data da sessão (${fmtDate(e.abertura)}).</p>
      ${reqs.map(r => `<div class="req"><span class="ico ${r.s}">${r.s === 'ok' ? '✓' : r.s === 'warn' ? '!' : '✕'}</span><div><b>${esc(r.txt)}</b><br><span class="muted small">${esc(r.tipo)}</span></div><div style="text-align:right"><span class="badge b-${r.s === 'ok' ? 'ok' : r.s === 'warn' ? 'warn' : 'bad'}">${esc(r.label)}</span>${r.key && r.s !== 'ok' ? `<br><a class="small" href="#/app/documentos">resolver →</a>` : ''}</div></div>`).join('')}`;
    if (ui.tab === 'itens' && e.itensLoading) content = '<div class="empty"><div class="big">⏳</div>Carregando itens do PNCP…</div>';
    else if (ui.tab === 'itens' && !(e.itens || []).length) content = `<div class="empty"><div class="big">📭</div>${e.itensErro ? `Não foi possível carregar os itens (${esc(e.itensErro)}). <button class="btn btn-ghost btn-sm" data-action="retry-itens" data-id="${e.id}">Tentar de novo</button>` : 'O órgão não publicou itens para esta contratação no PNCP.'}</div>`;
    else if (ui.tab === 'itens') content = `<div class="table-wrap"><table class="table"><thead><tr><th>#</th><th>Descrição</th><th class="num">Qtd</th><th class="num">Valor ref. unit.</th><th class="num">Total</th></tr></thead>
      <tbody>${e.itens.map(i => `<tr><td>${i.n}</td><td>${esc(i.desc)}</td><td class="num">${i.qtd.toLocaleString('pt-BR')} ${esc(i.unid)}</td><td class="num">${brl(i.ref)}</td><td class="num"><b>${brl(i.qtd * i.ref)}</b></td></tr>`).join('')}</tbody>
      <tfoot><tr><td colspan="4">Valor total estimado</td><td class="num">${brl(e.valor)}</td></tr></tfoot></table></div>`;
    if (ui.tab === 'prazos') {
      const ev = [[e.publicado, 'Publicação do edital'], [addDays(e.abertura, -3), 'Limite para esclarecimentos e impugnação'], [addDays(e.abertura, -1), 'Envio de proposta e documentos no portal'], [e.abertura, `Sessão pública às ${e.horaAbertura}`], [addDays(e.abertura, 2), 'Prazo estimado para recurso (intenção imediata)']];
      content = `<div class="timeline">${ev.map(([d, l]) => `<div class="tl ${daysUntil(d) < 0 ? 'past' : ''}"><span class="dot"></span><div><b>${l}</b><br><span class="muted small">${daysUntil(d) < 0 ? 'concluído' : daysUntil(d) === 0 ? 'hoje' : `em ${daysUntil(d)} dias`}</span></div><span class="small" style="font-weight:700">${fmtDate(d)}</span></div>`).join('')}</div>
        <button class="btn btn-ghost" data-action="ics" data-id="${e.id}">📅 Adicionar sessão ao calendário</button>`;
    }
    if (ui.tab === 'chat') {
      const log = db.chats[e.id] || [];
      content = `<div class="suggest">${['Vale a pena participar?', 'Quais documentos são exigidos?', 'Exige amostra?', 'Qual o prazo de entrega?', 'Quando é a sessão?', 'É exclusiva para ME/EPP?'].map(q => `<button data-action="ask" data-q="${esc(q)}">${q}</button>`).join('')}</div>
        <div class="chat"><div class="chat-log" id="chat-log">
          <div class="msg ai">${real ? `Pergunte o que quiser sobre o edital ${esc(e.numero)}. Eu leio o PDF publicado no PNCP e os itens para responder, citando o trecho.` : `Olá! Li o edital ${esc(e.numero)} e os anexos. Pergunte o que quiser: prazos, exigências, itens, garantias…`}</div>
          ${log.map(m => `<div class="msg ${m.who}">${esc(m.txt)}${m.src ? `<span class="src">📄 ${esc(m.src)}</span>` : ''}</div>`).join('')}
          ${ui.typing ? '<div class="msg ai"><span class="typing"><i></i><i></i><i></i></span></div>' : ''}
        </div><form class="chat-form" data-form="chat" data-id="${e.id}"><input class="input" name="q" placeholder="Pergunte algo sobre este edital…" autocomplete="off" aria-label="Pergunta"><button class="btn btn-primary" ${ui.typing ? 'disabled' : ''}>Enviar</button></form></div>`;
    }

    const body = `
      <div class="ed-head card">
        <div style="min-width:0"><div style="display:flex;gap:6px;flex-wrap:wrap"><span class="mono muted">${esc(e.numero)}</span><span class="badge b-info">${esc(e.modalidade)}</span><span class="badge b-muted">${esc(e.categoria)}</span>${e.exclusivaME ? '<span class="badge b-ok">Exclusiva ME/EPP</span>' : ''}${prazoBadge(e)}</div>
          <h2>${esc(e.objeto)}</h2><p class="muted">🏛 ${esc(e.orgao)} · ${e.uf} &nbsp; 🌐 ${esc(e.portal)}</p></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="star ${e.fav ? 'on' : ''}" data-action="fav" data-id="${e.id}" aria-label="Favoritar" style="width:40px;height:40px">${e.fav ? '★' : '☆'}</button>
          ${real ? `<a class="btn btn-ghost" href="${esc(e.link)}" target="_blank" rel="noopener">Ver no PNCP ↗</a>` : `<button class="btn btn-ghost" data-action="download" data-id="${e.id}">⬇ Edital</button>`}
          ${e.stage ? `<select class="input" data-input="stage" data-id="${e.id}" style="width:auto" aria-label="Etapa">${STAGES.map(([k, l]) => `<option value="${k}" ${e.stage === k ? 'selected' : ''}>${l}</option>`).join('')}</select>` : `<button class="btn btn-primary" data-action="to-pipe" data-id="${e.id}">+ Adicionar ao pipeline</button>`}</div>
      </div>
      <div class="ed-layout">
        <div class="card"><div class="tabs" role="tablist">${tabs.map(([k, l]) => `<button class="tab ${ui.tab === k ? 'on' : ''}" data-action="tab" data-t="${k}" role="tab">${l}</button>`).join('')}</div>${content}</div>
        <div class="side-card">
          <div class="card" style="display:grid;gap:14px">
            <div style="display:flex;gap:14px;align-items:center">${scoreRing(sc.total, true)}<div><b>Compatibilidade</b><p class="muted small">${sc.blocked ? 'Há um impedimento de habilitação.' : sc.total >= 75 ? 'Alta chance de ser uma boa oportunidade.' : sc.total >= 50 ? 'Oportunidade razoável.' : 'Pouco aderente ao seu perfil.'}</p></div></div>
            <div class="breakdown">${sc.parts.map(([l, v, m]) => `<div><span><span>${l}</span><b>${v}/${m}</b></span><div class="meter"><i style="width:${v / m * 100}%;background:${scoreColor(v / m * 100)}"></i></div></div>`).join('')}</div>
            ${sc.hits.length ? `<p class="small muted">Palavras encontradas: ${sc.hits.map(h => `<span class="tag-chip" style="margin:2px">${esc(h)}</span>`).join('')}</p>` : ''}
          </div>
          <div class="card"><dl class="kv"><dt>Valor estimado</dt><dd>${brl(e.valor)}</dd><dt>Critério</dt><dd>${esc(e.criterio || '—')}</dd><dt>Sessão</dt><dd>${fmtDate(e.abertura)} ${e.horaAbertura}</dd><dt>Publicado</dt><dd>${e.publicado ? fmtDate(e.publicado) : '—'}</dd><dt>Entrega</dt><dd>${esc(e.entrega || '—')}</dd><dt>Garantia</dt><dd>${e.garantia ? esc(e.garantia) : real && !e.ai ? '—' : 'Não'}</dd></dl></div>
          <button class="btn btn-dark btn-lg" data-action="proposal" data-id="${e.id}">📝 Gerar proposta comercial</button>
        </div>
      </div>`;
    return shell('oportunidades', 'Detalhes do edital', '', body, '<a href="#/app/oportunidades">Oportunidades</a> / ' + esc(e.numero));
  }

  function proposalText(e, desc) {
    const p = db.profile;
    const itens = e.itens.map(i => { const unit = Math.round(i.ref * (1 - desc / 100) * 100) / 100; return { ...i, unit, tot: unit * i.qtd }; });
    const total = itens.reduce((s, i) => s + i.tot, 0);
    return { total, text: `PROPOSTA COMERCIAL

À ${e.orgao}
Ref.: ${e.modalidade} nº ${e.numero.split(' ')[1]} (${e.portal})
Objeto: ${e.objeto}

${p.razao}
CNPJ: ${p.cnpj} · Porte: ${p.porte}
Contato: ${p.contato || '—'} · ${p.email || '—'}

ITENS
${itens.map(i => `${String(i.n).padStart(2, '0')}. ${i.desc}
    ${i.qtd} ${i.unid} × ${brl(i.unit)} = ${brl(i.tot)}`).join('\n')}

VALOR GLOBAL DA PROPOSTA: ${brl(total)}

CONDIÇÕES
• Validade da proposta: 60 (sessenta) dias.
• Prazo de entrega: ${e.entrega || 'conforme o edital'}.
• Pagamento: ${e.pagamento || 'conforme o edital'}.
• Garantia dos produtos: 12 meses on-site, salvo disposição diversa no Termo de Referência.

DECLARAÇÕES
Declaramos que nos preços propostos estão incluídos todos os custos diretos e indiretos, tributos, encargos, fretes e demais despesas, e que atendemos integralmente às especificações do edital e seus anexos.

${new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}

_______________________________
${p.contato}
Representante legal` };
  }
  function proposalModal(id, desc = 8) {
    const e = ed(id);
    if (!(e.itens || []).length) { toast(e.itensLoading ? 'Aguarde: carregando os itens do edital…' : 'Este edital não tem itens publicados no PNCP para montar a proposta.'); return; }
    const pr = proposalText(e, desc);
    openModal(`${mHead('Proposta comercial', `${esc(e.numero)} · gerada a partir dos itens do edital`)}
      <div class="modal-body">
        <label class="field"><span class="small muted">Desconto sobre o valor de referência: <b>${desc}%</b> → total ${brl(pr.total)} (estimado ${brl(e.valor)})</span><input type="range" min="0" max="30" value="${desc}" data-input="desc" data-id="${id}" aria-label="Desconto"></label>
        <div class="doc-preview" id="prop-text">${esc(pr.text)}</div>
        <p class="muted small">Revise antes de enviar. Preços de referência vêm do próprio edital; confira seus custos e margens.</p>
      </div>
      <div class="modal-foot"><button class="btn btn-ghost" data-action="copy-prop">Copiar</button><button class="btn btn-primary" data-action="dl-prop" data-id="${id}" data-desc="${desc}">⬇ Baixar .txt</button></div>`);
  }

  // ---------- Pipeline ----------
  function vPipeline() {
    const cols = STAGES.map(([k, l, i]) => {
      const list = db.editais.filter(e => e.stage === k).sort((a, b) => a.abertura.localeCompare(b.abertura));
      return `<div class="col" data-drop="${k}"><div class="col-head"><b>${i} ${l}</b><span class="cnt">${list.length}</span></div><div class="col-sum">${brlK(list.reduce((s, e) => s + e.valor, 0))}</div>
        ${list.map(e => `<div class="kcard" draggable="true" data-drag="${e.id}">
          <div class="row-sm"><span class="mono">${esc(e.numero)}</span>${['ganha', 'perdida'].includes(k) ? '' : prazoBadge(e)}</div>
          <b data-action="open-ed" data-id="${e.id}" style="cursor:pointer">${esc(e.objeto)}</b>
          <div class="row-sm"><span>${esc(e.orgao.replace('Prefeitura Municipal de ', 'PM ').replace('Prefeitura de ', 'PM ').replace('Prefeitura do ', 'PM '))} · ${e.uf}</span><b style="color:var(--ink)">${brlK(e.valor)}</b></div>
          <select data-input="stage" data-id="${e.id}" aria-label="Mover para">${STAGES.map(([kk, ll]) => `<option value="${kk}" ${kk === k ? 'selected' : ''}>${ll}</option>`).join('')}<option value="">Remover do pipeline</option></select>
        </div>`).join('') || '<p class="muted small" style="padding:6px">Arraste cards para cá</p>'}
      </div>`;
    }).join('');
    const ativos = db.editais.filter(e => ['analisando', 'proposta', 'enviada'].includes(e.stage));
    const ganhas = db.editais.filter(e => e.stage === 'ganha');
    const body = `
      <div class="kpis">
        <div class="kpi"><small>Em andamento</small><b>${ativos.length}</b><span class="muted small">${brlK(ativos.reduce((s, e) => s + e.valor, 0))}</span></div>
        <div class="kpi"><small>Propostas enviadas</small><b>${db.editais.filter(e => e.stage === 'enviada').length}</b></div>
        <div class="kpi"><small>Ganhas</small><b style="color:var(--ok)">${ganhas.length}</b><span class="muted small">${brlK(ganhas.reduce((s, e) => s + e.valor, 0))} contratados</span></div>
        <div class="kpi"><small>Próxima sessão</small><b>${(() => { const n = ativos.filter(e => daysUntil(e.abertura) >= 0).sort((a, b) => a.abertura.localeCompare(b.abertura))[0]; return n ? fmtShort(n.abertura) : '—'; })()}</b></div>
      </div>
      <div class="board">${cols}</div>
      <p class="muted small">Arraste os cards entre as colunas (no celular, use o seletor de cada card).</p>`;
    return shell('pipeline', 'Pipeline de disputas', `<a class="btn btn-primary" href="#/app/oportunidades">+ <span class="hide-sm">Adicionar edital</span></a>`, body);
  }

  // ---------- Alertas ----------
  function vAlertas() {
    const p = db.profile;
    const matches = abertas().filter(e => score(e).total >= 60).length;
    const body = `
      <div class="ai-box"><div class="ai-label">✦ Prévia</div>Com o perfil atual, <b>${matches} licitações abertas</b> têm nota de compatibilidade 60 ou mais. As notas são recalculadas assim que você salva.</div>
      <form class="grid-2-even" data-form="alerts">
        <div class="card" style="display:grid;gap:16px;align-content:start"><div class="card-head" style="margin:0"><h3>O que você vende</h3></div>
          <div class="field"><label>Palavras-chave</label>${tagsInput(p.palavras)}<span class="muted small">Buscamos no objeto e na descrição de cada item.</span></div>
          <div class="field"><label>Segmentos</label><div style="display:flex;gap:6px;flex-wrap:wrap">${Object.keys(CATS).map(c => `<label class="check-pill" style="padding:7px 12px"><input type="checkbox" name="cat" value="${c}" ${p.cats.includes(c) ? 'checked' : ''}>${c}</label>`).join('')}</div></div>
          <div class="row"><div class="field"><label>Valor mínimo (R$)</label><input class="input" type="number" name="valorMin" min="0" step="1000" value="${p.valorMin}"></div>
          <div class="field"><label>Valor máximo (R$)</label><input class="input" type="number" name="valorMax" min="0" step="1000" value="${p.valorMax}"></div></div>
          <div class="field"><label>Porte da empresa</label><select class="input" name="porte">${['ME', 'EPP', 'Demais'].map(x => `<option ${p.porte === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
        </div>
        <div class="card" style="display:grid;gap:16px;align-content:start"><div class="card-head" style="margin:0"><h3>Onde e como avisar</h3></div>
          <div class="field"><label>Estados de atuação</label><div class="check-grid">${UFS.map(u => `<label><input type="checkbox" name="uf" value="${u}" ${p.ufs.includes(u) ? 'checked' : ''}>${u}</label>`).join('')}</div></div>
          <div class="field"><label>Canais</label><div style="display:flex;gap:6px;flex-wrap:wrap">${[['email', '✉️ E-mail'], ['whatsapp', '📲 WhatsApp'], ['telegram', '✈️ Telegram']].map(([k, l]) => `<label class="check-pill" style="padding:7px 12px"><input type="checkbox" name="canal" value="${k}" ${p.canais[k] ? 'checked' : ''}>${l}</label>`).join('')}</div></div>
          <div class="field"><label>Frequência</label><select class="input" name="freq">${[['real', 'Tempo real (assim que publicar)'], ['diario', 'Resumo diário às 7h'], ['semanal', 'Resumo semanal (segunda)']].map(([v, l]) => `<option value="${v}" ${p.freq === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
          ${mode === 'cloud' ? '<p class="small muted">As preferências de canal ficam salvas. O envio automático de alertas por e-mail/WhatsApp ainda está sendo ativado; por enquanto, as novidades aparecem no painel sempre que você entra.</p>' : ''}
          <button class="btn btn-primary btn-lg">Salvar e recalcular notas</button>
        </div>
      </form>`;
    return shell('alertas', 'Alertas e perfil de busca', '', body);
  }

  // ---------- Documentos ----------
  function vDocumentos() {
    const rows = Object.keys(DOC_TYPES).map(key => ({ key, doc: companyDoc(key) }));
    const issues = rows.filter(r => docStatus(r.doc).s !== 'ok');
    const affected = abertas().filter(e => requisitos(e).some(r => r.key && r.s !== 'ok' && issues.some(i => i.key === r.key)));
    const body = `
      <div class="kpis">
        <div class="kpi"><small>Documentos válidos</small><b style="color:var(--ok)">${rows.length - issues.length}</b><span class="muted small">de ${rows.length}</span></div>
        <div class="kpi"><small>Vencendo em 15 dias</small><b style="color:var(--warn)">${rows.filter(r => docStatus(r.doc).s === 'warn').length}</b></div>
        <div class="kpi"><small>Vencidos ou faltando</small><b style="color:var(--bad)">${rows.filter(r => docStatus(r.doc).s === 'bad').length}</b></div>
        <div class="kpi"><small>Editais afetados</small><b>${affected.length}</b><span class="muted small">exigem documento pendente</span></div>
      </div>
      <div class="card"><div class="card-head"><h3>Cofre de documentos de habilitação</h3><span class="muted small">Avisamos 15 dias antes do vencimento</span></div>
        <div class="table-wrap"><table class="table"><thead><tr><th>Documento</th><th>Validade</th><th>Status</th><th></th></tr></thead><tbody>
        ${rows.map(({ key, doc }) => { const st = docStatus(doc); return `<tr class="doc-row"><td><span class="doc-ic">📄</span><div><b>${esc(DOC_TYPES[key])}</b><br><span class="muted small">${doc ? `${esc(doc.arquivo)} · enviado em ${fmtShort(doc.enviadoEm)}` : 'nenhum arquivo'}</span></div></td>
          <td>${doc?.validade ? fmtDate(doc.validade) : '—'}</td><td><span class="badge b-${st.s === 'ok' ? 'ok' : st.s === 'warn' ? 'warn' : 'bad'}">${esc(st.label)}</span></td>
          <td style="text-align:right;white-space:nowrap">${doc?.path ? `<button class="btn btn-ghost btn-sm" data-action="view-doc" data-k="${key}">Ver</button> ` : ''}<button class="btn btn-${st.s === 'ok' ? 'ghost' : 'primary'} btn-sm" data-action="upload" data-k="${key}">${doc ? (st.s === 'ok' ? 'Atualizar' : 'Renovar') : 'Enviar'}</button></td></tr>`; }).join('')}
        </tbody></table></div></div>`;
    return shell('documentos', 'Documentos', '', body);
  }
  function uploadModal(key) {
    const doc = companyDoc(key);
    const needsValidity = !['contrato', 'atestado', 'crea'].includes(key);
    openModal(`${mHead(doc ? 'Atualizar documento' : 'Enviar documento', esc(DOC_TYPES[key]))}
      <form data-form="upload" data-k="${key}"><div class="modal-body">
        <div class="field"><label>Arquivo (PDF)</label><input class="input" type="file" name="file" accept="application/pdf,image/*" ${doc ? '' : 'required'}></div>
        ${needsValidity ? `<div class="field"><label>Válido até</label><input class="input" type="date" name="validade" required value="${addDays(today(), key === 'fgts' ? 30 : 180)}"></div>` : ''}
        ${mode === 'cloud' ? '<p class="muted small">PDF ou imagem de até 10 MB. O arquivo fica num cofre privado que só a sua conta acessa.</p>' : ''}
      </div><div class="modal-foot"><button type="button" class="btn btn-ghost" data-action="close">Cancelar</button><button class="btn btn-primary">Salvar</button></div></form>`);
  }

  // ---------- Plano ----------
  function vPlano() {
    const pl = db.plan;
    const body = `
      <div class="grid-2-even">
        <div class="card" style="display:grid;gap:14px"><div class="card-head" style="margin:0"><h3>Plano atual: ${pl.nome}</h3><span class="badge b-violet">Teste grátis · ${trialLeft()} dias restantes</span></div>
          <div><div style="display:flex;justify-content:space-between" class="small"><span>Análises por IA este mês</span><b>${pl.analises}/${pl.limite}</b></div><div class="meter"><i style="width:${Math.min(100, pl.analises / pl.limite * 100)}%"></i></div></div>
          <div><div style="display:flex;justify-content:space-between" class="small"><span>Buscas salvas</span><b>${db.buscas.length}/10</b></div><div class="meter"><i style="width:${db.buscas.length * 10}%"></i></div></div>
          <p class="muted small">Após o teste: R$ 397/mês. Cobrança via Pix, boleto ou cartão.</p>
          <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-primary" data-action="subscribe">Assinar agora</button>${mode === 'cloud' ? `<button class="btn btn-ghost" data-action="export-json">⬇ Baixar meus dados</button><button class="btn btn-danger" data-action="logout">Sair</button>` : '<button class="btn btn-ghost" data-action="reset">Restaurar dados de exemplo</button>'}</div>
          ${mode === 'cloud' ? `<p class="muted small">Conectado como ${esc(user?.email || '')}.</p>` : ''}
        </div>
        <div class="card"><div class="card-head"><h3>Faturas</h3></div><div class="empty"><div class="big">🧾</div>Nenhuma fatura ainda. Sua primeira cobrança acontece ao fim do teste.</div></div>
      </div>
      <div class="pricing">${PLANS.map(p => `<div class="plan ${p.featured ? 'featured' : ''}">${p.id === pl.nome ? '<span class="tag">Seu plano</span>' : ''}<h3>${p.id}</h3><p class="muted small">${p.desc}</p><div class="price">R$ ${p.price}<small>/mês</small></div><ul>${p.items.map(i => `<li>${i}</li>`).join('')}</ul>
        <button class="btn ${p.featured ? 'btn-primary' : 'btn-dark'}" data-action="subscribe" ${p.id === pl.nome ? 'disabled' : ''}>${p.id === pl.nome ? 'Plano atual' : 'Mudar para ' + p.id}</button></div>`).join('')}</div>`;
    return shell('plano', 'Plano e faturamento', '', body);
  }

  // ---------- Roteador ----------
  let lastPath = '';
  function route() {
    const raw = location.hash;
    if (/^#(access_token|error|type=)/.test(raw)) {
      const hp = new URLSearchParams(raw.slice(1));
      if (hp.get('error_description')) { ui.authMsg = hp.get('error_description').replace(/\+/g, ' '); ui.authErr = true; history.replaceState(null, '', '#/entrar?login'); }
      else { $root.innerHTML = '<div class="auth"><div class="auth-card"><div class="empty"><div class="big">⏳</div>Validando seu acesso…</div></div></div>'; return; }
    }
    const [path, qs] = (location.hash.slice(1) || '/').split('?');
    const params = new URLSearchParams(qs || '');
    closeModal();
    if (path !== lastPath && path.startsWith('/app/edital/')) { ui.tab = 'resumo'; ui.typing = false; }
    const changed = path !== lastPath; lastPath = path;
    let html;
    if (path === '/' || path === '') { if (!db) loadDemo(); html = vLanding(); }
    else if (path === '/nova-senha') html = vAuth('newpass');
    else if (path === '/entrar') {
      if (mode === 'cloud' && onboarded() && !params.has('login')) { location.replace('#/app'); return; }
      if (mode !== 'cloud' && !Cloud.enabled && !db) loadDemo();
      html = vAuth(params.has('login') && mode !== 'cloud' ? 'login' : 'onboarding');
    } else if (path.startsWith('/app')) {
      if (params.has('demo')) { ui.demo = true; history.replaceState(null, '', '#' + path); }
      if (mode !== 'cloud') {
        if (Cloud.enabled && !ui.demo) { location.replace('#/entrar?login'); return; }
        if (!db) loadDemo();
      } else if (!onboarded()) { location.replace('#/entrar'); return; }
      const [, , sec, id] = path.split('/');
      html = sec === 'edital' ? vEdital(decodeURIComponent(id || '')) : ({ '': vDashboard, oportunidades: vOportunidades, pipeline: vPipeline, alertas: vAlertas, documentos: vDocumentos, plano: vPlano }[sec || ''] || vDashboard)();
    } else html = vLanding();
    $root.innerHTML = html;
    document.title = path.startsWith('/app') ? 'Radar Licita · Painel' : 'Radar Licita | Licitações com inteligência artificial';
    if (changed) window.scrollTo(0, 0);
    const log = document.getElementById('chat-log'); if (log) log.scrollTop = log.scrollHeight;
  }
  function rerender() { const y = window.scrollY; const bx = document.querySelector('.board')?.scrollLeft; route(); window.scrollTo(0, y); const b = document.querySelector('.board'); if (b && bx) b.scrollLeft = bx; }

  function setStage(id, s) {
    const e = ed(id); if (!e) return;
    e.stage = s || null; save(); rerender();
    toast(s ? `Movido para "${stageName(s)}"` : 'Removido do pipeline');
    if (s === 'ganha') toast('🏆 Parabéns pelo contrato!');
  }

  const AI_ERR = {
    ia_nao_configurada: 'A IA ainda não foi ativada no servidor (falta configurar a chave da Anthropic).',
    limite_mensal_atingido: 'Você atingiu o limite de análises por IA deste mês.',
    ia_ocupada_tente_novamente: 'A IA está ocupada. Tente de novo em alguns segundos.',
    chave_da_ia_invalida: 'A chave da IA configurada no servidor é inválida.',
    nao_autenticado: 'Sua sessão expirou. Entre de novo.',
    ia_recusou: 'A IA não conseguiu responder a este pedido.',
  };
  const aiErrMsg = e => AI_ERR[e.code] || `A IA não respondeu agora (${e.code || e.message}). Tente de novo em instantes.`;
  const slimEdital = e => ({ id: e.id, numero: e.numero, orgao: e.orgao, uf: e.uf, cidade: e.cidade, modalidade: e.modalidade, objeto: e.objeto,
    valor: e.valor, abertura: e.abertura, horaAbertura: e.horaAbertura, portal: e.portal, criterio: e.criterio, cnpj: e.cnpj, ano: e.ano, seq: e.seq,
    itens: (e.itens || []).slice(0, 200).map(({ n, desc, qtd, unid, ref }) => ({ n, desc, qtd, unid, ref })) });
  const aiContext = () => ({ perfil: { razao: db.profile.razao, porte: db.profile.porte, palavras: db.profile.palavras, ufs: db.profile.ufs },
    docs: Object.keys(DOC_TYPES).map(k => ({ nome: DOC_TYPES[k], status: docStatus(companyDoc(k)).label })) });

  async function ask(id, q) {
    if (!q.trim() || ui.typing) return;
    const e = ed(id);
    db.chats[id] = db.chats[id] || [];
    const historico = db.chats[id].slice(-10);
    db.chats[id].push({ who: 'user', txt: q.trim() });
    ui.typing = true; save(); rerender();
    let a;
    if (mode === 'cloud' && e.fonte === 'pncp') {
      try {
        const r = await Cloud.invoke('radar-ia', { action: 'chat', edital: slimEdital(e), pergunta: q.trim(), historico, ...aiContext() });
        a = { txt: r.resposta, src: 'Claude · edital no PNCP' };
        db.plan.analises = r.usado ?? db.plan.analises;
      } catch (err) { a = { txt: `⚠️ ${aiErrMsg(err)}`, src: '' }; }
    } else {
      await new Promise(res => setTimeout(res, 700 + Math.random() * 700));
      if (/esclarecimento/.test(norm(q))) {
        a = { txt: `Sugestão de pedido de esclarecimento:\n\n"Prezado(a) Pregoeiro(a), em relação ao ${e.modalidade} nº ${e.numero.split(' ')[1]}, solicitamos esclarecer [descreva a dúvida], considerando o disposto no Termo de Referência. Atenciosamente, ${db.profile.razao}."\n\nEnvie pelo ${e.portal} até ${fmtDate(addDays(e.abertura, -3))}.`, src: 'Modelo Radar Licita' };
      } else a = answer(e, q);
      db.plan.analises = Math.min(db.plan.limite, db.plan.analises + 1);
    }
    db.chats[id].push({ who: 'ai', txt: a.txt, src: a.src });
    ui.typing = false; save();
    if (location.hash.endsWith(encodeURIComponent(id)) || location.hash.endsWith(id)) rerender();
  }

  async function analyze(id) {
    const e = ed(id);
    if (mode !== 'cloud' || e.fonte !== 'pncp') { toast('Na demonstração, o resumo por IA já vem simulado.'); return; }
    ui.analyzing = id; rerender();
    try {
      const r = await Cloud.invoke('radar-ia', { action: 'summary', edital: slimEdital(e), ...aiContext() });
      const a = r.resumo;
      e.ai = a; e.aiLeuPdf = r.leuPdf; e.aiEm = new Date().toISOString();
      e.amostra = !!a.flags?.amostra; e.visita = !!a.flags?.visitaTecnica; e.garantia = a.flags?.garantia || null;
      if (a.flags?.exclusivaME) e.exclusivaME = true;
      if (a.prazos?.entrega) e.entrega = a.prazos.entrega;
      if (a.prazos?.pagamento) e.pagamento = a.prazos.pagamento;
      db.plan.analises = r.usado ?? db.plan.analises;
      save(); toast('Análise concluída');
    } catch (err) { toast(aiErrMsg(err)); }
    ui.analyzing = null;
    if (location.hash.includes('/edital/')) rerender();
  }

  async function loadDetails(e) {
    e.itensLoading = true; e.itensErro = '';
    try {
      const r = await Cloud.invoke('radar-edital', { cnpj: e.cnpj, ano: e.ano, seq: e.seq });
      e.itens = (r.itens || []).slice(0, 300); e.arquivos = r.arquivos || [];
      if (r.exclusivaME) e.exclusivaME = true;
      if (r.criterio) e.criterio = r.criterio;
      e.itensLoaded = true;
      if (kept(e)) save();
    } catch (err) { e.itensErro = err.code || err.message; }
    e.itensLoading = false;
    if (location.hash.includes('/edital/')) maybeRerender();
  }

  async function logout() {
    if (saver && !(await saver.flush()) && !confirm('Há alterações que ainda não foram salvas. Sair mesmo assim?')) return;
    try { await Cloud.signOut(); } catch (e) { /* já saiu */ }
    leaveCloud(); ui.demo = false; location.hash = '#/'; toast('Você saiu da conta');
  }

  function download(name, text, type = 'text/plain') {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: type + ';charset=utf-8' }));
    a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 500);
  }

  // ---------- Eventos ----------
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-action]'); if (!el) return;
    const act = el.dataset.action, id = el.dataset.id;
    if (act === 'overlay' && e.target !== el) return;
    if (['fav', 'to-pipe'].includes(act)) e.stopPropagation();
    switch (act) {
      case 'overlay': case 'close': closeModal(); break;
      case 'scroll': e.preventDefault(); document.querySelector(el.getAttribute('href'))?.scrollIntoView({ behavior: 'smooth' }); break;
      case 'billing': ui.billing = el.dataset.v; rerender(); break;
      case 'open-ed': if (e.target.closest('button,select')) return; location.hash = `#/app/edital/${encodeURIComponent(id)}`; break;
      case 'fav': { const x = ed(id); x.fav = !x.fav; save(); rerender(); toast(x.fav ? 'Adicionado aos favoritos' : 'Removido dos favoritos'); break; }
      case 'to-pipe': setStage(id, 'analisando'); break;
      case 'view': ui.f.view = el.dataset.v; rerender(); break;
      case 'save-alert': {
        const f = ui.f, nome = [f.q, f.uf === 'meus' ? 'meus estados' : f.uf, f.mod, f.cat, f.min ? `nota ${f.min}+` : ''].filter(Boolean).join(' · ') || 'Todas';
        db.buscas = [...db.buscas.filter(b => b.nome !== nome), { nome, f: { ...f } }].slice(-10); save(); rerender(); toast('Busca salva');
        break;
      }
      case 'apply-search': { const b = db.buscas[+el.dataset.i]; if (b) { ui.f = { ...ui.f, ...b.f }; rerender(); } break; }
      case 'refresh-live': fetchLive(true); break;
      case 'analyze': analyze(id); break;
      case 'retry-itens': { const x = ed(id); if (x) { x.itensErro = ''; loadDetails(x); rerender(); } break; }
      case 'logout': e.preventDefault(); logout(); break;
      case 'forgot': {
        e.preventDefault();
        const email = el.closest('form')?.elements.email?.value.trim();
        if (!email) { ui.authMsg = 'Digite seu e-mail e clique de novo em "Esqueci minha senha".'; ui.authErr = true; rerender(); break; }
        Cloud.resetPassword(email).then(() => { ui.authMsg = `Se existir uma conta com ${email}, enviamos um link para criar uma nova senha.`; ui.authErr = false; },
          err => { ui.authMsg = Cloud.authError(err); ui.authErr = true; }).finally(() => { rerender(); const i = document.querySelector('[name=email]'); if (i) i.value = email; });
        break;
      }
      case 'view-doc': {
        const d = companyDoc(el.dataset.k);
        if (!d?.path) break;
        Cloud.storage('radar-docs').createSignedUrl(d.path, 120).then(({ data, error }) => { if (error) throw error; window.open(data.signedUrl, '_blank', 'noopener'); })
          .catch(() => toast('Não foi possível abrir o arquivo.'));
        break;
      }
      case 'export-json': download(`radar-licita-${today()}.json`, JSON.stringify(persistable(), null, 2), 'application/json'); break;
      case 'tab': ui.tab = el.dataset.t; rerender(); if (ui.tab === 'chat') document.querySelector('.chat-form input')?.focus(); break;
      case 'ask': ask(decodeURIComponent(location.hash.split('/').pop()), el.dataset.q); break;
      case 'proposal': proposalModal(id); break;
      case 'copy-prop': navigator.clipboard?.writeText(document.getElementById('prop-text').textContent).then(() => toast('Proposta copiada'), () => toast('Não foi possível copiar')); break;
      case 'dl-prop': download(`proposta-${ed(id).numero.replace(/\W+/g, '-')}.txt`, proposalText(ed(id), +el.dataset.desc).text); toast('Proposta baixada'); break;
      case 'download': toast('Na versão real, baixamos o PDF original do portal'); break;
      case 'ics': { const x = ed(id); const dt = x.abertura.replace(/-/g, '') + 'T' + x.horaAbertura.replace(':', '') + '00';
        download(`sessao-${x.id}.ics`, `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Radar Licita//PT\nBEGIN:VEVENT\nUID:${x.id}@radarlicita\nDTSTAMP:${dt}\nDTSTART:${dt}\nSUMMARY:Sessão ${x.numero} - ${x.orgao}\nDESCRIPTION:${x.objeto}\nEND:VEVENT\nEND:VCALENDAR`, 'text/calendar'); break; }
      case 'upload': uploadModal(el.dataset.k); break;
      case 'subscribe': toast('O pagamento online ainda não foi ativado. Seu teste continua liberado.'); break;
      case 'reset': if (confirm('Restaurar os dados de exemplo? Suas alterações serão perdidas.')) { db = seed(); save(); rerender(); toast('Dados restaurados'); } break;
      case 'cnpj-lookup': lookupCnpj(); break;
      case 'rm-tag': e.stopPropagation(); db.profile.palavras.splice(+el.dataset.i, 1); save(); rerenderKeepForm(); break;
      case 'focus-tags': el.querySelector('input')?.focus(); break;
    }
  });

  // Consulta pública de CNPJ (BrasilAPI, dados da Receita Federal).
  async function lookupCnpj() {
    const c = document.querySelector('[name=cnpj]'), digitos = c.value.replace(/\D/g, '');
    if (digitos.length !== 14) { toast('Digite um CNPJ com 14 dígitos'); return; }
    const btn = document.querySelector('[data-action="cnpj-lookup"]'); btn.disabled = true; btn.textContent = '…';
    try {
      const r = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digitos}`, { signal: AbortSignal.timeout(12000) });
      if (r.status === 404) throw new Error('CNPJ não encontrado na Receita');
      if (!r.ok) throw new Error('consulta indisponível');
      const j = await r.json();
      document.getElementById('razao').value = j.razao_social || '';
      const porte = String(j.porte || j.descricao_porte || '').toUpperCase();
      document.getElementById('porte').value = /MICRO/.test(porte) ? 'ME' : /PEQUENO/.test(porte) ? 'EPP' : 'Demais';
      document.getElementById('uf-cnpj').value = j.uf || '';
      if (j.descricao_situacao_cadastral && !/ATIVA/i.test(j.descricao_situacao_cadastral)) toast(`Atenção: situação cadastral ${j.descricao_situacao_cadastral}`);
      else toast('Dados preenchidos com a Receita Federal');
    } catch (e) { toast(`Não foi possível buscar o CNPJ (${e.message}). Preencha manualmente.`); }
    btn.disabled = false; btn.textContent = 'Buscar';
  }

  // Re-renderiza preservando o que o usuário já marcou num formulário aberto.
  function rerenderKeepForm() {
    const f = document.querySelector('form[data-form="alerts"], form[data-form="onb2"]');
    const snap = f ? [...f.elements].filter(x => x.name).map(x => [x.name, x.value, x.type === 'checkbox' ? x.checked : null]) : [];
    rerender();
    const nf = document.querySelector('form[data-form="alerts"], form[data-form="onb2"]');
    if (nf) snap.forEach(([n, v, c]) => { const el = [...nf.elements].find(x => x.name === n && (c === null || x.value === v)); if (el) { if (c === null) el.value = v; else el.checked = c; } });
    document.querySelector('[data-input="tag"]')?.focus();
  }

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
    const el = e.target;
    if (el.dataset?.input === 'tag' && (e.key === 'Enter' || e.key === ',')) {
      e.preventDefault();
      const v = el.value.trim().replace(/,$/, '');
      if (v && !db.profile.palavras.map(norm).includes(norm(v))) { db.profile.palavras.push(v); save(); }
      rerenderKeepForm();
    }
    if (el.dataset?.input === 'tag' && e.key === 'Backspace' && !el.value && db.profile.palavras.length) { db.profile.palavras.pop(); save(); rerenderKeepForm(); }
  });

  let qTimer;
  document.addEventListener('input', e => {
    const el = e.target, k = el.dataset.input; if (!k) return;
    if (k === 'fq') { ui.f.q = el.value; clearTimeout(qTimer); qTimer = setTimeout(() => { const pos = el.selectionStart; rerender(); const n = document.querySelector('[data-input="fq"]'); n.focus(); n.setSelectionRange(pos, pos); }, 180); }
    if (k === 'fmin') { document.getElementById('min-v').textContent = el.value; }
    if (k === 'desc') { const pr = proposalText(ed(el.dataset.id), +el.value); document.getElementById('prop-text').textContent = pr.text;
      el.previousElementSibling.innerHTML = `Desconto sobre o valor de referência: <b>${el.value}%</b> → total ${brl(pr.total)} (estimado ${brl(ed(el.dataset.id).valor)})`;
      document.querySelector('[data-action="dl-prop"]').dataset.desc = el.value; }
    if (k === 'cnpj') { let d = el.value.replace(/\D/g, '').slice(0, 14); el.value = d.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2'); }
  });
  document.addEventListener('change', e => {
    const el = e.target, k = el.dataset.input; if (!k) return;
    if (k === 'f') { ui.f[el.dataset.k] = el.value; rerender(); }
    if (k === 'fmin') { ui.f.min = +el.value; rerender(); }
    if (k === 'stage') setStage(el.dataset.id, el.value);
  });

  function keepValues(form, fn) {
    const vals = [...form.elements].filter(x => x.name && x.type !== 'password' && x.type !== 'hidden').map(x => [x.name, x.value]);
    fn();
    const nf = document.querySelector(`form[data-form="${form.dataset.form}"]`);
    if (nf) vals.forEach(([n, v]) => { const el = nf.elements[n]; if (el && !(el instanceof RadioNodeList)) el.value = v; });
  }

  document.addEventListener('submit', async e => {
    const f = e.target, kind = f.dataset.form; if (!kind) return;
    e.preventDefault();
    const fd = new FormData(f);
    if (kind === 'login') {
      if (!Cloud.enabled) { ui.demo = true; location.hash = '#/app'; return; }
      ui.busy = true; ui.authMsg = ''; keepValues(f, rerender);
      try { await enterCloud(await Cloud.signIn(fd.get('email').trim(), fd.get('senha'))); ui.busy = false; location.hash = onboarded() ? '#/app' : '#/entrar'; return; }
      catch (err) { ui.authMsg = Cloud.authError(err); ui.authErr = true; }
      ui.busy = false; keepValues(f, rerender); return;
    }
    if (kind === 'newpass') {
      try { await Cloud.updatePassword(fd.get('senha')); ui.authMsg = ''; toast('Senha atualizada'); location.hash = '#/app'; }
      catch (err) { ui.authMsg = Cloud.authError(err); ui.authErr = true; rerender(); }
      return;
    }
    if (kind === 'onb1') {
      const perfil = { cnpj: fd.get('cnpj'), razao: fd.get('razao').trim(), porte: fd.get('porte'), contato: fd.get('contato').trim(), email: fd.get('email').trim(), uf: fd.get('uf') || '' };
      if (!Cloud.enabled) { if (!db) loadDemo(); Object.assign(db.profile, perfil); save(); ui.onb = 2; rerender(); return; }
      ui.busy = true; ui.authMsg = ''; keepValues(f, rerender);
      try {
        const r = await Cloud.signUp(perfil.email, fd.get('senha'), perfil, '#/entrar');
        if (r.user && Array.isArray(r.user.identities) && r.user.identities.length === 0) throw new Error('User already registered');
        if (r.session) { await enterCloud(r.session); ui.busy = false; ui.authMsg = ''; rerender(); return; }
        ui.authMsg = `Enviamos um link de confirmação para ${perfil.email}. Abra o e-mail para ativar sua conta e continuar.`; ui.authErr = false;
      } catch (err) { ui.authMsg = Cloud.authError(err); ui.authErr = true; }
      ui.busy = false; keepValues(f, rerender); return;
    }
    if (kind === 'onb2') {
      const ufs = fd.getAll('uf'); if (!ufs.length) { toast('Escolha ao menos um estado'); return; }
      if (!db.profile.palavras.length) { toast('Adicione ao menos uma palavra-chave'); return; }
      db.profile.ufs = ufs; save(); ui.onb = 1; ui.authMsg = '';
      if (mode === 'cloud') fetchLive(true);
      location.hash = '#/app/oportunidades'; toast('Pronto! Estas são suas oportunidades 🎯');
    }
    if (kind === 'alerts') {
      const ufs = fd.getAll('uf'); if (!ufs.length) { toast('Escolha ao menos um estado'); return; }
      const min = +fd.get('valorMin'), max = +fd.get('valorMax'); if (max && max < min) { toast('O valor máximo deve ser maior que o mínimo'); return; }
      const canais = { email: false, whatsapp: false, telegram: false }; fd.getAll('canal').forEach(c => { canais[c] = true; });
      const ufsMudaram = ufs.slice().sort().join() !== db.profile.ufs.slice().sort().join();
      Object.assign(db.profile, { ufs, cats: fd.getAll('cat'), valorMin: min, valorMax: max || Infinity, porte: fd.get('porte'), canais, freq: fd.get('freq') });
      if (!isFinite(db.profile.valorMax)) db.profile.valorMax = 1e12;
      save(); rerender(); toast('Perfil salvo e notas recalculadas');
      if (ufsMudaram && mode === 'cloud') fetchLive(true);
    }
    if (kind === 'chat') { const q = fd.get('q'); ask(f.dataset.id, q); }
    if (kind === 'upload') {
      const key = f.dataset.k, file = fd.get('file');
      const hasFile = file && file.name && file.size > 0;
      let path = null;
      if (hasFile && mode === 'cloud') {
        if (file.size > 10 * 1024 * 1024) { toast('Arquivo maior que 10 MB'); return; }
        const btn = f.querySelector('.btn-primary'); btn.disabled = true; btn.textContent = 'Enviando…';
        const ext = (file.name.split('.').pop() || 'pdf').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5);
        path = `${user.id}/${key}-${Date.now()}.${ext}`;
        const { error } = await Cloud.storage('radar-docs').upload(path, file, { contentType: file.type || 'application/pdf', upsert: false });
        if (error) { toast(`Não foi possível enviar o arquivo (${error.message}).`); btn.disabled = false; btn.textContent = 'Salvar'; return; }
      }
      let doc = companyDoc(key);
      if (!doc) { doc = { id: uid(), key, nome: DOC_TYPES[key] }; db.docs.push(doc); }
      const oldPath = doc.path;
      Object.assign(doc, { validade: fd.get('validade') || null, arquivo: hasFile ? file.name : doc.arquivo || `${key}.pdf`, enviadoEm: today() });
      if (path) { doc.path = path; if (oldPath) Cloud.storage('radar-docs').remove([oldPath]).catch(() => {}); }
      save(); closeModal(); rerender(); toast('Documento salvo');
    }
  });

  // Arrastar e soltar no pipeline
  document.addEventListener('dragstart', e => { const c = e.target.closest?.('[data-drag]'); if (!c) return; e.dataTransfer.setData('text/plain', c.dataset.drag); e.dataTransfer.effectAllowed = 'move'; c.classList.add('dragging'); });
  document.addEventListener('dragend', e => { e.target.closest?.('[data-drag]')?.classList.remove('dragging'); document.querySelectorAll('.col.over').forEach(c => c.classList.remove('over')); });
  document.addEventListener('dragover', e => { const col = e.target.closest?.('[data-drop]'); if (!col) return; e.preventDefault(); document.querySelectorAll('.col.over').forEach(c => c !== col && c.classList.remove('over')); col.classList.add('over'); });
  document.addEventListener('drop', e => { const col = e.target.closest?.('[data-drop]'); if (!col) return; e.preventDefault(); const id = e.dataTransfer.getData('text/plain'); if (id && ed(id)?.stage !== col.dataset.drop) setStage(id, col.dataset.drop); });

  window.addEventListener('hashchange', route);
  async function boot() {
    if (!Cloud.enabled) { route(); return; }
    const rawHash = location.hash;
    const fromEmail = /^#(access_token|type=)/.test(rawHash), isRecovery = /type=recovery/.test(rawHash);
    $root.innerHTML = '<div class="auth"><div class="auth-card"><div class="empty"><div class="big">⏳</div>Carregando…</div></div></div>';
    Cloud.onAuth(event => {
      if (event === 'PASSWORD_RECOVERY') { history.replaceState(null, '', '#/nova-senha'); route(); }
      else if (event === 'SIGNED_OUT' && mode === 'cloud') { leaveCloud(); location.hash = '#/'; }
    });
    try {
      const session = await Cloud.session();
      if (session) await enterCloud(session);
      if (isRecovery && session) history.replaceState(null, '', '#/nova-senha');
      else if (fromEmail) history.replaceState(null, '', session ? (onboarded() ? '#/app' : '#/entrar') : '#/entrar?login');
    } catch (e) {
      console.error(e);
      ui.authMsg = 'Não foi possível conectar ao servidor. Verifique sua internet e tente de novo.'; ui.authErr = true;
    }
    route();
  }
  boot();
})();
