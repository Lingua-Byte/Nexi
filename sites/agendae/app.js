/* Agendaê: front-end de demonstração (SPA sem build).
   Todos os dados ficam no localStorage do navegador. A camada `db` concentra
   leitura e escrita, então trocar por uma API (ex.: Supabase) mexe só nela. */
(() => {
  'use strict';

  // ---------- Utilidades ----------
  const STORE_KEY = 'agendae_v1';
  const $root = document.getElementById('root');
  const $modal = document.getElementById('modal-root');
  const $toast = document.getElementById('toast-root');

  const pad = n => String(n).padStart(2, '0');
  const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
  const today = () => iso(new Date());
  const toMin = h => { const [a, b] = h.split(':').map(Number); return a * 60 + b; };
  const fromMin = m => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
  const nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
  const daysBetween = (a, b) => Math.round((parse(b) - parse(a)) / 86400000);
  const brl = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const brl0 = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  const pct = v => `${(v * 100).toFixed(1).replace('.', ',')}%`;
  const WD = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const fmtShort = s => { const d = parse(s); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`; };
  const fmtLong = s => parse(s).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const initials = n => n.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase();
  const uid = () => Math.random().toString(36).slice(2, 10);
  const digits = s => String(s).replace(/\D/g, '');
  const monthKey = s => s.slice(0, 7);

  function rng(seed) { // mulberry32: dados de demo iguais em todo carregamento
    return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }

  // ---------- Dados de demonstração ----------
  function seed() {
    const r = rng(42);
    const pick = a => a[Math.floor(r() * a.length)];
    const profs = [
      { id: 'p1', nome: 'Ana Souza', cor: '#a8437f', cats: ['Estética'], cargo: 'Esteticista' },
      { id: 'p2', nome: 'Bruna Lima', cor: '#2f6db5', cats: ['Cabelo'], cargo: 'Cabeleireira' },
      { id: 'p3', nome: 'Carla Mendes', cor: '#1f8a5b', cats: ['Unhas'], cargo: 'Manicure' },
      { id: 'p4', nome: 'Diego Rocha', cor: '#b7791f', cats: ['Barba', 'Cabelo'], cargo: 'Barbeiro' },
    ];
    const servicos = [
      ['Limpeza de pele', 60, 180, 'Estética'], ['Drenagem linfática', 60, 150, 'Estética'], ['Peeling de diamante', 45, 220, 'Estética'],
      ['Corte feminino', 60, 120, 'Cabelo'], ['Escova', 45, 80, 'Cabelo'], ['Coloração', 120, 280, 'Cabelo'],
      ['Manicure', 45, 45, 'Unhas'], ['Pedicure', 45, 55, 'Unhas'], ['Alongamento em gel', 90, 180, 'Unhas'],
      ['Corte masculino', 30, 60, 'Barba'], ['Barba completa', 30, 45, 'Barba'],
    ].map(([nome, duracao, preco, categoria], i) => ({ id: 's' + (i + 1), nome, duracao, preco, categoria }));

    const first = ['Mariana', 'Juliana', 'Fernanda', 'Camila', 'Patrícia', 'Larissa', 'Beatriz', 'Renata', 'Aline', 'Vanessa', 'Gabriela', 'Letícia', 'Tatiane', 'Priscila', 'Débora', 'Isabela', 'Natália', 'Rafaela', 'Lucas', 'Pedro', 'Rafael', 'Thiago', 'Bruno', 'Felipe', 'Carolina', 'Amanda', 'Sabrina', 'Helena', 'Viviane', 'Paula', 'Marcos', 'André', 'Simone', 'Cristina', 'Elaine', 'Luana', 'Bianca', 'Daniela', 'Rodrigo', 'Gustavo'];
    const last = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Pereira', 'Costa', 'Rodrigues', 'Almeida', 'Nascimento', 'Lima', 'Araújo', 'Ferreira', 'Carvalho', 'Gomes', 'Martins', 'Ribeiro'];
    const t = today();
    const clientes = first.map((f, i) => {
      const male = ['Lucas', 'Pedro', 'Rafael', 'Thiago', 'Bruno', 'Felipe', 'Marcos', 'André', 'Rodrigo', 'Gustavo'].includes(f);
      const birth = new Date(1975 + Math.floor(r() * 30), Math.floor(r() * 12), 1 + Math.floor(r() * 28));
      return {
        id: 'c' + (i + 1), nome: `${f} ${pick(last)}`, tel: `(11) 9${Math.floor(1000 + r() * 8999)}-${Math.floor(1000 + r() * 8999)}`,
        email: `${f.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')}${i}@email.com`,
        nascimento: iso(birth), obs: i % 7 === 0 ? 'Pele sensível, evitar ácidos fortes.' : '',
        criadoEm: addDays(t, -120 + Math.floor(r() * 100)), male,
      };
    });
    // Clientes 33-40 só aparecem no passado distante: viram "clientes sumidos".
    const lapsed = new Set(clientes.slice(32).map(c => c.id));
    const active = clientes.filter(c => !lapsed.has(c.id));

    const ags = [];
    const nm = nowMin();
    for (let off = -95; off <= 10; off++) {
      const date = addDays(t, off);
      if (parse(date).getDay() === 0) continue; // fechado aos domingos
      for (const p of profs) {
        const svcs = servicos.filter(s => p.cats.includes(s.categoria));
        let cursor = 8 * 60 + Math.floor(r() * 3) * 30;
        const target = off > 0 ? 2 + Math.floor(r() * 4) : 3 + Math.floor(r() * 4);
        for (let k = 0; k < target && cursor < 18 * 60; k++) {
          const s = pick(svcs);
          if (cursor + s.duracao > 19 * 60) break;
          const pool = off < -60 ? clientes : active;
          let cli = pick(pool);
          if (p.id === 'p4') cli = pick(pool.filter(c => c.male)) || cli;
          else if (cli.male && r() < .8) cli = pick(pool.filter(c => !c.male));
          let status;
          const past = off < 0 || (off === 0 && cursor + s.duracao <= nm);
          if (past) { const x = r(); status = x < .86 ? 'concluido' : x < .94 ? 'faltou' : 'cancelado'; }
          else status = r() < .72 ? 'confirmado' : 'pendente';
          const pago = status === 'concluido' && (off < -2 || r() < .7);
          ags.push({ id: uid(), clienteId: cli.id, servicoId: s.id, profId: p.id, data: date, hora: fromMin(cursor), status, pago, forma: pago ? pick(['Pix', 'Pix', 'Pix', 'Cartão de crédito', 'Cartão de débito', 'Dinheiro']) : '', preco: s.preco });
          cursor += s.duracao + Math.floor(r() * 3) * 30;
        }
      }
    }

    const despesas = [];
    for (let m = 0; m < 4; m++) {
      const d = new Date(); d.setDate(5); d.setMonth(d.getMonth() - m);
      const base = iso(d);
      [['Aluguel', 3500, 'Fixo'], ['Produtos e insumos', 1800 + Math.floor(r() * 900), 'Insumos'], ['Energia e água', 420 + Math.floor(r() * 120), 'Fixo'], ['Anúncios Instagram', 600, 'Marketing'], ['Assinatura Agendaê', 149, 'Software']]
        .forEach(([desc, valor, categoria], i) => despesas.push({ id: uid(), desc, valor, categoria, data: addDays(base, i * 3) }));
    }

    return {
      profs, servicos, clientes, ags, despesas,
      config: {
        nome: 'Studio Bella Pele', slug: 'studio-bella-pele', tel: '(11) 98888-1234', endereco: 'Rua das Flores, 120, Vila Mariana, São Paulo/SP',
        abre: '08:00', fecha: '19:00',
        msg: 'Olá, {nome}! 💜 Passando para lembrar do seu horário de {servico} em {data} às {hora} com {profissional}.\n\nResponda 1 para confirmar ou 2 para remarcar.',
        lembrete24h: true, lembrete2h: false, confirmAuto: true, aniversario: true, reativacao: true, plano: 'Pro',
      },
    };
  }

  // ---------- Camada de dados ----------
  let db;
  function load() {
    try { db = JSON.parse(localStorage.getItem(STORE_KEY)); } catch (e) { db = null; }
    if (!db || !db.ags) { db = seed(); save(); }
  }
  function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(db)); } catch (e) { /* modo privado */ } }
  const byId = (list, id) => db[list].find(x => x.id === id);
  const cli = id => byId('clientes', id) || { nome: 'Cliente removido', tel: '' };
  const svc = id => byId('servicos', id) || { nome: 'Serviço removido', duracao: 30, preco: 0, categoria: '' };
  const prof = id => byId('profs', id) || { nome: '—', cor: '#999' };
  const valor = a => a.preco ?? svc(a.servicoId).preco;
  const ATIVOS = ['confirmado', 'pendente', 'concluido'];

  function isFree(profId, data, hora, dur, ignoreId) {
    const s = toMin(hora), e = s + dur;
    return !db.ags.some(a => a.id !== ignoreId && a.profId === profId && a.data === data && a.status !== 'cancelado' &&
      toMin(a.hora) < e && toMin(a.hora) + svc(a.servicoId).duracao > s);
  }

  function clientStats(id) {
    const list = db.ags.filter(a => a.clienteId === id).sort((a, b) => (b.data + b.hora).localeCompare(a.data + a.hora));
    const done = list.filter(a => a.status === 'concluido');
    const t = today();
    const last = done.find(a => a.data <= t);
    const next = [...list].reverse().find(a => a.data >= t && ['confirmado', 'pendente'].includes(a.status));
    return { list, visitas: done.length, gasto: done.reduce((s, a) => s + valor(a), 0), ultima: last?.data, proxima: next, faltas: list.filter(a => a.status === 'faltou').length };
  }

  function waLink(tel, text) { return `https://wa.me/55${digits(tel)}?text=${encodeURIComponent(text)}`; }
  function fillMsg(tpl, a) {
    return tpl.replace(/{nome}/g, cli(a.clienteId).nome.split(' ')[0]).replace(/{servico}/g, svc(a.servicoId).nome)
      .replace(/{data}/g, fmtShort(a.data)).replace(/{hora}/g, a.hora).replace(/{profissional}/g, prof(a.profId).nome.split(' ')[0]);
  }

  // ---------- Estado de interface ----------
  const ui = {
    billing: 'mensal', agendaDate: today(), cliFilter: 'todos', cliSearch: '', finMonth: monthKey(today()),
    book: { step: 1, servicoId: null, profId: null, data: null, hora: null, done: null },
  };

  // ---------- Toast e modal ----------
  function toast(msg) {
    const el = document.createElement('div'); el.className = 'toast'; el.textContent = msg; $toast.appendChild(el);
    setTimeout(() => el.remove(), 2600);
  }
  function openModal(html, { drawer = false } = {}) {
    $modal.innerHTML = `<div class="overlay ${drawer ? 'right' : ''}" data-action="overlay"><div class="${drawer ? 'drawer' : 'modal'}" role="dialog" aria-modal="true">${html}</div></div>`;
    const f = $modal.querySelector('input:not([type=hidden]),select,textarea'); if (f && !drawer) setTimeout(() => f.focus(), 30);
  }
  function closeModal() { $modal.innerHTML = ''; }
  const modalHead = (title, sub = '') => `<div class="modal-head"><div><h3>${title}</h3>${sub ? `<p class="muted small">${sub}</p>` : ''}</div><button class="x" data-action="close" aria-label="Fechar">×</button></div>`;
  const badge = s => `<span class="badge b-${s}">${{ confirmado: 'Confirmado', pendente: 'Pendente', concluido: 'Concluído', faltou: 'Faltou', cancelado: 'Cancelado' }[s]}</span>`;

  // ---------- Landing ----------
  const PLANS = [
    { id: 'Essencial', price: 79, desc: 'Para quem atende sozinha(o).', items: ['1 profissional', 'Agenda online ilimitada', 'Página de agendamento', 'Cadastro de clientes', 'Lembrete manual por WhatsApp'] },
    { id: 'Pro', price: 149, desc: 'Para clínicas e salões em crescimento.', featured: true, items: ['Até 5 profissionais', 'Tudo do Essencial', 'Lembretes automáticos no WhatsApp', 'Financeiro e comissões', 'Campanhas de reativação', 'Relatórios completos'] },
    { id: 'Rede', price: 299, desc: 'Para redes e múltiplas unidades.', items: ['Profissionais ilimitados', 'Tudo do Pro', 'Múltiplas unidades', 'Permissões por usuário', 'Gerente de sucesso dedicado'] },
  ];

  function vLanding() {
    const annual = ui.billing === 'anual';
    return `
    <header class="lp-nav"><div class="container">
      <a class="logo" href="#/"><span class="logo-mark">✦</span>Agendaê</a>
      <nav class="lp-links"><a href="#recursos" data-action="scroll">Recursos</a><a href="#como" data-action="scroll">Como funciona</a><a href="#precos" data-action="scroll">Preços</a><a href="#faq" data-action="scroll">Dúvidas</a></nav>
      <div class="lp-cta"><a class="btn btn-ghost" href="#/entrar">Entrar</a><a class="btn btn-primary" href="#/entrar?cadastro">Testar grátis</a></div>
    </div></header>

    <section class="hero"><div class="container">
      <div>
        <span class="eyebrow">✨ 14 dias grátis, sem cartão</span>
        <h1>Sua agenda cheia, <em>sem faltas</em> e sem planilha.</h1>
        <p class="lead">Agendamento online 24h, lembretes automáticos no WhatsApp, cadastro de clientes e financeiro num só lugar, feito para clínicas de estética, salões e barbearias.</p>
        <div class="hero-actions"><a class="btn btn-primary btn-lg" href="#/entrar?cadastro">Começar teste grátis</a><a class="btn btn-ghost btn-lg" href="#/app">Ver demonstração →</a></div>
        <div class="hero-proof"><div><b>−70%</b><span>de faltas com lembretes*</span></div><div><b>24h</b><span>agendamento pelo link</span></div><div><b>5 min</b><span>para configurar</span></div></div>
      </div>
      <div class="mock" aria-hidden="true">
        <div class="mock-bar"><i></i><i></i><i></i></div>
        <div class="mock-kpis"><div><small>Hoje</small><b>14 atend.</b></div><div><small>Faturamento</small><b>R$ 2.340</b></div><div><small>Faltas</small><b>2,1%</b></div></div>
        ${[['09:00', 'Mariana S.', 'Limpeza de pele', '#a8437f'], ['10:30', 'Juliana C.', 'Coloração', '#2f6db5'], ['11:00', 'Lucas P.', 'Corte + barba', '#b7791f'], ['14:00', 'Camila R.', 'Alongamento em gel', '#1f8a5b']]
          .map(([h, n, s, c]) => `<div class="mock-slot" style="border-color:${c}"><time>${h}</time><div><b>${n}</b> · <span class="muted">${s}</span></div></div>`).join('')}
        <div class="mock-float"><span class="wa">✓</span><div><b>Mariana confirmou</b><br><span class="muted">pelo WhatsApp, agora há pouco</span></div></div>
      </div>
    </div></section>

    <section class="section" id="recursos"><div class="container">
      <div class="section-head"><h2>Tudo o que o seu negócio precisa para lucrar mais</h2><p>Menos tempo no celular respondendo "tem horário?" e mais tempo atendendo.</p></div>
      <div class="features">
        ${[['📅', 'Agenda por profissional', 'Visualize o dia de toda a equipe, arraste horários, bloqueie folgas e evite encaixes duplicados.'],
          ['🔗', 'Link de agendamento', 'Coloque na bio do Instagram. A cliente escolhe serviço, profissional e horário livre, a qualquer hora.'],
          ['💬', 'Lembretes no WhatsApp', 'Mensagem automática 24h antes com confirmação em 1 toque. Faltas caem drasticamente.'],
          ['👥', 'Ficha de clientes', 'Histórico de atendimentos, quanto cada cliente já gastou, observações e aniversários.'],
          ['💰', 'Financeiro simples', 'Receitas, despesas, contas a receber e lucro do mês, sem precisar de contador para entender.'],
          ['🔁', 'Reativação de clientes', 'Descubra quem sumiu há mais de 60 dias e envie uma oferta personalizada com 1 clique.']]
          .map(([i, h, p]) => `<div class="feature"><div class="ic">${i}</div><h3>${h}</h3><p>${p}</p></div>`).join('')}
      </div>
    </div></section>

    <section class="container"><div class="band">
      <div><b>R$ 1.890</b><span>é o que uma clínica média perde por mês com faltas sem aviso**</span></div>
      <div><b>38%</b><span>dos agendamentos online acontecem fora do horário comercial**</span></div>
      <div><b>3x</b><span>mais chance de voltar quando a cliente recebe uma mensagem pós-atendimento**</span></div>
    </div></section>

    <section class="section" id="como"><div class="container">
      <div class="section-head"><h2>Comece hoje, em três passos</h2></div>
      <div class="steps">
        <div class="step"><h3>Cadastre serviços e equipe</h3><p>Preços, duração e quem faz cada serviço. Importamos sua lista de clientes de planilha.</p></div>
        <div class="step"><h3>Divulgue seu link</h3><p>Bio do Instagram, WhatsApp Business e Google Meu Negócio. Pronto para receber agendamentos.</p></div>
        <div class="step"><h3>Deixe o sistema trabalhar</h3><p>Lembretes, confirmações e campanhas saem sozinhos. Você acompanha tudo pelo painel.</p></div>
      </div>
    </div></section>

    <section class="section" id="precos" style="text-align:center"><div class="container">
      <div class="section-head"><h2>Planos que cabem no seu caixa</h2><p>Um único atendimento recuperado já paga a mensalidade.</p></div>
      <div class="billing-toggle"><button class="${!annual ? 'on' : ''}" data-action="billing" data-v="mensal">Mensal</button><button class="${annual ? 'on' : ''}" data-action="billing" data-v="anual">Anual (−20%)</button></div>
      <div class="pricing" style="text-align:left">
        ${PLANS.map(p => `<div class="plan ${p.featured ? 'featured' : ''}">${p.featured ? '<span class="tag">Mais escolhido</span>' : ''}
          <h3>${p.id}</h3><p class="muted small">${p.desc}</p>
          <div class="price">${brl0(annual ? Math.round(p.price * .8) : p.price)}<small>/mês</small></div>
          <p class="muted small">${annual ? `cobrado ${brl0(Math.round(p.price * .8) * 12)} por ano` : 'cancele quando quiser'}</p>
          <ul>${p.items.map(i => `<li>${i}</li>`).join('')}</ul>
          <a class="btn ${p.featured ? 'btn-primary' : 'btn-ghost'}" href="#/entrar?cadastro">Testar 14 dias grátis</a></div>`).join('')}
      </div>
    </div></section>

    <section class="section" style="padding-top:0"><div class="container">
      <div class="quotes">
        ${[['“Antes eu perdia umas 6 clientes por semana que simplesmente não apareciam. Com o lembrete no WhatsApp isso praticamente acabou.”', 'Dona de clínica de estética'],
          ['“Metade dos meus agendamentos agora chega de madrugada pelo link da bio. Eu acordo com a agenda preenchida.”', 'Cabeleireira autônoma'],
          ['“Finalmente sei quanto lucro no fim do mês e quanto cada profissional fatura.”', 'Gestor de barbearia']]
          .map(([q, a]) => `<figure class="quote" style="margin:0"><p>${q}</p><footer><span class="avatar">${initials(a)}</span><span class="muted">${a}</span></footer></figure>`).join('')}
      </div>
      <p class="sample-note">Depoimentos ilustrativos. Substitua por depoimentos reais dos seus primeiros clientes.</p>
    </div></section>

    <section class="section" id="faq" style="padding-top:0"><div class="container">
      <div class="section-head"><h2>Dúvidas frequentes</h2></div>
      <div class="faq">
        ${[['Preciso instalar alguma coisa?', 'Não. O Agendaê funciona no navegador do computador e do celular. Sua cliente também não precisa baixar nada para agendar.'],
          ['Como funcionam os lembretes de WhatsApp?', 'No plano Pro, conectamos o número do seu negócio e as mensagens saem automaticamente no horário configurado, com botão de confirmação.'],
          ['Posso importar meus clientes?', 'Sim, a partir de uma planilha Excel/CSV ou exportação de outro sistema. Nossa equipe faz a importação para você sem custo.'],
          ['E se eu quiser cancelar?', 'Sem multa e sem fidelidade. Você pode exportar todos os seus dados a qualquer momento.'],
          ['Meus dados ficam seguros?', 'Os dados são criptografados, com backups diários e em conformidade com a LGPD.']]
          .map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join('')}
      </div>
    </div></section>

    <section class="container"><div class="cta-final">
      <h2>Pronta(o) para lotar sua agenda?</h2><p>Teste todos os recursos do plano Pro por 14 dias. Sem cartão de crédito.</p>
      <a class="btn btn-primary btn-lg" href="#/entrar?cadastro">Criar minha conta grátis</a>
    </div></section>

    <footer class="lp-footer"><div class="container">
      <span>© ${new Date().getFullYear()} Agendaê. Todos os direitos reservados.</span>
      <span>* resultado típico relatado por usuários de lembretes automáticos · ** estimativas de mercado, valide com dados próprios</span>
    </div></footer>`;
  }

  // ---------- Auth ----------
  function vAuth(signup) {
    return `<div class="auth">
      <aside class="auth-side">
        <a class="logo" href="#/" style="color:#fff"><span class="logo-mark">✦</span>Agendaê</a>
        <div><h2>Mais clientes atendidos, menos tempo no celular.</h2><ul style="margin-top:20px"><li>Agenda online 24h</li><li>Lembretes automáticos no WhatsApp</li><li>Financeiro e relatórios</li></ul></div>
        <p style="color:#f2dce9" class="small">14 dias grátis · sem cartão · cancele quando quiser</p>
      </aside>
      <div class="auth-form"><form data-form="auth" data-signup="${signup ? 1 : ''}">
        <a class="logo" href="#/"><span class="logo-mark">✦</span>Agendaê</a>
        <h1>${signup ? 'Crie sua conta grátis' : 'Bem-vinda(o) de volta'}</h1>
        <p class="muted">${signup ? 'Leva menos de um minuto.' : 'Entre para acessar seu painel.'}</p>
        ${signup ? `<div class="field"><label>Nome do negócio</label><input class="input" name="negocio" required placeholder="Ex.: Studio Bella Pele"></div>
          <div class="field"><label>Seu nome</label><input class="input" name="nome" required></div>` : ''}
        <div class="field"><label>E-mail</label><input class="input" type="email" name="email" required placeholder="voce@email.com"></div>
        <div class="field"><label>Senha</label><input class="input" type="password" name="senha" required minlength="6" placeholder="mínimo 6 caracteres"></div>
        <button class="btn btn-primary btn-lg" type="submit">${signup ? 'Criar conta e começar' : 'Entrar'}</button>
        <a class="btn btn-ghost" href="#/app">Entrar na conta de demonstração</a>
        <p class="muted small" style="text-align:center">${signup ? 'Já tem conta? <a href="#/entrar">Entrar</a>' : 'Novo por aqui? <a href="#/entrar?cadastro">Criar conta grátis</a>'}</p>
      </form></div></div>`;
  }

  // ---------- App shell ----------
  const NAV = [
    ['', '📊', 'Painel'], ['agenda', '📅', 'Agenda'], ['clientes', '👥', 'Clientes'], ['servicos', '✂️', 'Serviços'], ['financeiro', '💰', 'Financeiro'], ['config', '⚙️', 'Configurações'],
  ];
  function shell(section, title, actions, body) {
    const link = (k, i, l, cls) => `<a class="${cls} ${section === k ? 'active' : ''}" href="#/app${k ? '/' + k : ''}"><span class="ni">${i}</span>${l}</a>`;
    return `<div class="app">
      <aside class="sidebar">
        <a class="logo" href="#/"><span class="logo-mark">✦</span>Agendaê</a>
        ${NAV.map(([k, i, l]) => link(k, i, l, 'nav-item')).join('')}
        <a class="nav-item" href="#/agendar" target="_blank" rel="noopener"><span class="ni">🔗</span>Página de agendamento</a>
        <div class="sidebar-foot"><b>Plano ${esc(db.config.plano)}</b><span class="muted">Teste grátis: 11 dias restantes</span></div>
      </aside>
      <div class="main">
        <header class="topbar"><h1>${title}</h1><div class="topbar-right">${actions}<span class="avatar" title="${esc(db.config.nome)}">${initials(db.config.nome)}</span></div></header>
        <main class="page">${body}</main>
      </div>
      <nav class="bottom-nav">${NAV.filter(n => n[0] !== 'servicos').map(([k, i, l]) => link(k, i, l === 'Configurações' ? 'Ajustes' : l, '')).join('')}</nav>
    </div>`;
  }
  const newBtn = (label = 'Novo agendamento') => `<button class="btn btn-primary" data-action="new-ag">+ <span class="hide-sm">${label}</span></button>`;

  // ---------- Painel ----------
  function periodStats(from, to) {
    const list = db.ags.filter(a => a.data >= from && a.data <= to);
    const done = list.filter(a => a.status === 'concluido');
    const fat = done.reduce((s, a) => s + valor(a), 0);
    const faltas = list.filter(a => a.status === 'faltou').length;
    return { fat, n: done.length, ticket: done.length ? fat / done.length : 0, faltaRate: (done.length + faltas) ? faltas / (done.length + faltas) : 0 };
  }
  const delta = (cur, prev, invert = false) => {
    if (!prev) return '<span class="delta muted">—</span>';
    const d = (cur - prev) / prev; const good = invert ? d <= 0 : d >= 0;
    return `<span class="delta ${good ? 'up' : 'down'}">${d >= 0 ? '▲' : '▼'} ${Math.abs(d * 100).toFixed(0)}% vs mês anterior</span>`;
  };

  function barChart(data, { money = true } = {}) {
    const W = 640, H = 220, P = { t: 12, r: 8, b: 26, l: 44 };
    const max = Math.max(1, ...data.map(d => d.v)) * 1.1;
    const bw = (W - P.l - P.r) / data.length;
    const y = v => P.t + (H - P.t - P.b) * (1 - v / max);
    const ticks = [0, .5, 1].map(f => max * f);
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Gráfico de barras">
      ${ticks.map(t => `<line class="grid" x1="${P.l}" x2="${W - P.r}" y1="${y(t)}" y2="${y(t)}"/><text x="${P.l - 6}" y="${y(t) + 4}" text-anchor="end">${money ? (t >= 1000 ? (t / 1000).toFixed(1).replace('.', ',') + 'k' : Math.round(t)) : Math.round(t)}</text>`).join('')}
      ${data.map((d, i) => `<rect class="bar ${d.hl ? 'today' : ''}" x="${P.l + i * bw + bw * .18}" y="${y(d.v)}" width="${bw * .64}" height="${Math.max(0, H - P.b - y(d.v))}" rx="4"><title>${d.label}: ${money ? brl(d.v) : d.v}</title></rect>
        ${data.length <= 16 || i % 2 === 0 ? `<text x="${P.l + i * bw + bw / 2}" y="${H - 8}" text-anchor="middle">${d.label}</text>` : ''}`).join('')}
    </svg>`;
  }

  function vDashboard() {
    const t = today(), d = parse(t);
    const mStart = iso(new Date(d.getFullYear(), d.getMonth(), 1));
    const pStart = iso(new Date(d.getFullYear(), d.getMonth() - 1, 1));
    const pEnd = iso(new Date(d.getFullYear(), d.getMonth() - 1, Math.min(d.getDate(), new Date(d.getFullYear(), d.getMonth(), 0).getDate())));
    const cur = periodStats(mStart, t), prev = periodStats(pStart, pEnd);

    const days = Array.from({ length: 14 }, (_, i) => addDays(t, i - 13)).map(day => ({
      label: fmtShort(day), hl: day === t,
      v: db.ags.filter(a => a.data === day && a.status === 'concluido').reduce((s, a) => s + valor(a), 0),
    }));

    const hoje = db.ags.filter(a => a.data === t && a.status !== 'cancelado').sort((a, b) => a.hora.localeCompare(b.hora));
    const previsto = hoje.filter(a => ATIVOS.includes(a.status)).reduce((s, a) => s + valor(a), 0);

    const counts = {};
    db.ags.filter(a => a.data >= mStart && a.data <= t && a.status === 'concluido').forEach(a => { counts[a.servicoId] = (counts[a.servicoId] || 0) + valor(a); });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const topMax = top[0]?.[1] || 1;

    const sumidos = db.clientes.filter(c => { const s = clientStats(c.id); return s.ultima && daysBetween(s.ultima, t) >= 60 && !s.proxima; });
    const aReceber = db.ags.filter(a => a.status === 'concluido' && !a.pago);
    let amanha = addDays(t, 1);
    if (parse(amanha).getDay() === 0) amanha = addDays(amanha, 1); // domingo fechado
    const pendAmanha = db.ags.filter(a => a.data === amanha && a.status === 'pendente');

    const body = `
      <div class="kpis">
        <div class="kpi"><small>Faturamento do mês</small><b>${brl0(cur.fat)}</b>${delta(cur.fat, prev.fat)}</div>
        <div class="kpi"><small>Atendimentos</small><b>${cur.n}</b>${delta(cur.n, prev.n)}</div>
        <div class="kpi"><small>Ticket médio</small><b>${brl0(cur.ticket)}</b>${delta(cur.ticket, prev.ticket)}</div>
        <div class="kpi"><small>Taxa de faltas</small><b>${pct(cur.faltaRate)}</b>${delta(cur.faltaRate, prev.faltaRate, true)}</div>
      </div>
      <div class="grid-2">
        <div class="card"><div class="card-head"><h3>Faturamento: últimos 14 dias</h3><span class="muted small">Total ${brl0(days.reduce((s, x) => s + x.v, 0))}</span></div>${barChart(days)}</div>
        <div class="card"><div class="card-head"><h3>Hoje</h3><span class="muted small">${hoje.length} horários · ${brl0(previsto)}</span></div>
          <div class="list" style="max-height:236px;overflow:auto">${hoje.length ? hoje.map(a => `
            <div class="list-item" data-action="open-ag" data-id="${a.id}"><time>${a.hora}</time><span class="dot" style="background:${prof(a.profId).cor}"></span>
            <div class="grow"><b>${esc(cli(a.clienteId).nome)}</b><span>${esc(svc(a.servicoId).nome)} · ${esc(prof(a.profId).nome.split(' ')[0])}</span></div>${badge(a.status)}</div>`).join('')
            : '<div class="empty"><div class="big">🌤️</div>Nenhum horário hoje.</div>'}</div></div>
      </div>
      <div class="grid-2-even">
        <div class="card"><div class="card-head"><h3>Oportunidades de receita</h3></div><div class="list">
          <div class="list-item" data-action="goto" data-to="#/app/clientes?f=sumidos"><span style="font-size:22px">🔁</span><div class="grow"><b>${sumidos.length} clientes sumidos há 60+ dias</b><span>Envie uma campanha de reativação no WhatsApp</span></div><span class="btn btn-soft btn-sm">Ver</span></div>
          <div class="list-item" data-action="goto" data-to="#/app/financeiro"><span style="font-size:22px">💳</span><div class="grow"><b>${brl0(aReceber.reduce((s, a) => s + valor(a), 0))} a receber</b><span>${aReceber.length} atendimentos concluídos sem pagamento registrado</span></div><span class="btn btn-soft btn-sm">Ver</span></div>
          <div class="list-item" data-action="goto" data-to="#/app/agenda?d=${amanha}"><span style="font-size:22px">⏳</span><div class="grow"><b>${pendAmanha.length} confirmações pendentes ${amanha === addDays(t, 1) ? 'amanhã' : 'em ' + fmtShort(amanha)}</b><span>Lembretes automáticos serão enviados às 09:00</span></div><span class="btn btn-soft btn-sm">Ver</span></div>
        </div></div>
        <div class="card"><div class="card-head"><h3>Serviços que mais faturam no mês</h3></div><div class="rank">
          ${top.length ? top.map(([id, v]) => `<div class="rank-row"><div><span>${esc(svc(id).nome)}</span><b>${brl0(v)}</b></div><div class="meter"><i style="width:${(v / topMax) * 100}%"></i></div></div>`).join('') : '<p class="muted">Sem atendimentos ainda.</p>'}
        </div></div>
      </div>`;
    return shell('', `Olá, ${esc(db.config.nome.split(' ')[0])} 👋`, newBtn(), body);
  }

  // ---------- Agenda ----------
  function vAgenda() {
    const date = ui.agendaDate;
    const start = toMin(db.config.abre), end = toMin(db.config.fecha);
    const slots = (end - start) / 30;
    const list = db.ags.filter(a => a.data === date);
    const ativos = list.filter(a => ATIVOS.includes(a.status));
    const capacity = db.profs.length * (end - start);
    const used = ativos.reduce((s, a) => s + svc(a.servicoId).duracao, 0);
    const SLOT_H = 24;
    const cols = db.profs.map(p => {
      const blocks = list.filter(a => a.profId === p.id).map(a => {
        const s = svc(a.servicoId); const top = (toMin(a.hora) - start) / 30 * SLOT_H; const h = s.duracao / 30 * SLOT_H - 3;
        return `<div class="ag-block st-${a.status}" data-action="open-ag" data-id="${a.id}" style="top:${top}px;height:${h}px;border-color:${p.cor};background:${p.cor}1a">
          <b>${a.hora} · ${esc(cli(a.clienteId).nome)}</b>${h > 30 ? `<span>${esc(s.nome)}</span>` : ''}</div>`;
      }).join('');
      const slotEls = Array.from({ length: slots }, (_, i) => `<div class="ag-slot" data-action="slot" data-prof="${p.id}" data-hora="${fromMin(start + i * 30)}"></div>`).join('');
      return `<div class="ag-col">${slotEls}${blocks}</div>`;
    }).join('');
    const nm = nowMin();
    const nowLine = date === today() && nm >= start && nm <= end ? `<div class="now-line" style="top:${(nm - start) / 30 * SLOT_H}px"></div>` : '';
    const isClosed = parse(date).getDay() === 0;

    const body = `
      <div class="agenda-head">
        <div class="toolbar"><button class="btn btn-ghost btn-icon" data-action="ag-day" data-n="-1" aria-label="Dia anterior">‹</button>
          <button class="btn btn-ghost" data-action="ag-today">Hoje</button>
          <button class="btn btn-ghost btn-icon" data-action="ag-day" data-n="1" aria-label="Próximo dia">›</button>
          <input type="date" class="input" value="${date}" data-input="ag-date" aria-label="Escolher data"></div>
        <h2>${fmtLong(date)}</h2>
      </div>
      <div class="kpis">
        <div class="kpi"><small>Atendimentos</small><b>${ativos.length}</b><span class="muted small">${list.filter(a => a.status === 'pendente').length} aguardando confirmação</span></div>
        <div class="kpi"><small>Faturamento previsto</small><b>${brl0(ativos.reduce((s, a) => s + valor(a), 0))}</b></div>
        <div class="kpi"><small>Ocupação</small><b>${pct(capacity ? used / capacity : 0)}</b><div class="meter"><i style="width:${Math.min(100, used / capacity * 100)}%"></i></div></div>
        <div class="kpi"><small>Faltas / cancelamentos</small><b>${list.filter(a => ['faltou', 'cancelado'].includes(a.status)).length}</b></div>
      </div>
      ${isClosed ? '<div class="card empty"><div class="big">🔒</div>Fechado aos domingos. Você ainda pode encaixar um horário manualmente.</div>' : ''}
      <div class="agenda-scroll"><div class="agenda" style="grid-template-columns:56px repeat(${db.profs.length}, minmax(150px,1fr))">
        <div class="ag-col-head" style="border-left:0"></div>
        ${db.profs.map(p => `<div class="ag-col-head"><span class="avatar" style="background:${p.cor};width:30px;height:30px;font-size:11px">${initials(p.nome)}</span><div><b>${esc(p.nome)}</b><span>${esc(p.cargo)}</span></div></div>`).join('')}
        <div class="ag-times">${Array.from({ length: slots / 2 }, (_, i) => `<div class="ag-time">${fromMin(start + i * 60)}</div>`).join('')}</div>
        ${cols}
        <div style="position:absolute;left:56px;right:0;top:55px;pointer-events:none">${nowLine}</div>
      </div></div>
      <p class="muted small">Dica: clique num espaço vazio para encaixar um horário. Clique num atendimento para confirmar, concluir, registrar pagamento ou avisar pelo WhatsApp.</p>`;
    return shell('agenda', 'Agenda', newBtn(), body);
  }

  function agForm(a = {}) {
    const editing = !!a.id;
    return `${modalHead(editing ? 'Editar agendamento' : 'Novo agendamento')}
      <form data-form="ag" data-id="${a.id || ''}">
      <div class="modal-body">
        <div class="field"><label>Cliente</label><input class="input" name="cliente" list="cli-list" required placeholder="Digite o nome (nova cliente é criada automaticamente)" value="${a.clienteId ? esc(cli(a.clienteId).nome) : ''}">
          <datalist id="cli-list">${db.clientes.map(c => `<option value="${esc(c.nome)}">`).join('')}</datalist></div>
        <div class="field"><label>Telefone (para clientes novas)</label><input class="input" name="tel" placeholder="(11) 99999-0000"></div>
        <div class="row">
          <div class="field"><label>Serviço</label><select class="input" name="servicoId" required>${db.servicos.map(x => `<option value="${x.id}" ${x.id === a.servicoId ? 'selected' : ''}>${esc(x.nome)} · ${brl0(x.preco)}</option>`).join('')}</select></div>
          <div class="field"><label>Profissional</label><select class="input" name="profId" required>${db.profs.map(p => `<option value="${p.id}" ${p.id === a.profId ? 'selected' : ''}>${esc(p.nome)}</option>`).join('')}</select></div>
        </div>
        <div class="row">
          <div class="field"><label>Data</label><input class="input" type="date" name="data" required value="${a.data || ui.agendaDate}"></div>
          <div class="field"><label>Horário</label><input class="input" type="time" name="hora" required step="900" value="${a.hora || '09:00'}"></div>
        </div>
        ${editing ? `<div class="field"><label>Status</label><select class="input" name="status">${['pendente', 'confirmado', 'concluido', 'faltou', 'cancelado'].map(x => `<option value="${x}" ${x === a.status ? 'selected' : ''}>${x[0].toUpperCase() + x.slice(1)}</option>`).join('')}</select></div>` : ''}
      </div>
      <div class="modal-foot"><button type="button" class="btn btn-ghost" data-action="close">Cancelar</button><button class="btn btn-primary" type="submit">${editing ? 'Salvar alterações' : 'Agendar'}</button></div>
      </form>`;
  }

  function agDetails(id) {
    const a = byId('ags', id); if (!a) return;
    const c = cli(a.clienteId), s = svc(a.servicoId), p = prof(a.profId);
    const st = a.status;
    openModal(`${modalHead(esc(s.nome), `${fmtLong(a.data)} · ${a.hora}–${fromMin(toMin(a.hora) + s.duracao)}`)}
      <div class="modal-body">
        <div style="display:flex;gap:8px;flex-wrap:wrap">${badge(st)}${st === 'concluido' ? (a.pago ? `<span class="badge b-pago">Pago · ${esc(a.forma)}</span>` : '<span class="badge b-apagar">A receber</span>') : ''}</div>
        <dl class="kv">
          <dt>Cliente</dt><dd><a href="#" data-action="open-cli" data-id="${c.id}">${esc(c.nome)}</a></dd>
          <dt>Telefone</dt><dd>${esc(c.tel)}</dd>
          <dt>Profissional</dt><dd>${esc(p.nome)}</dd>
          <dt>Valor</dt><dd>${brl(valor(a))}</dd>
          ${c.obs ? `<dt>Observação</dt><dd style="font-weight:500">${esc(c.obs)}</dd>` : ''}
        </dl>
        ${st === 'concluido' && !a.pago ? `<div class="row"><select class="input" id="forma">${['Pix', 'Cartão de crédito', 'Cartão de débito', 'Dinheiro'].map(f => `<option>${f}</option>`).join('')}</select><button class="btn btn-ok" data-action="pay" data-id="${a.id}">Registrar pagamento</button></div>` : ''}
        <div class="toolbar">
          ${st === 'pendente' ? `<button class="btn btn-soft btn-sm" data-action="status" data-id="${a.id}" data-s="confirmado">✓ Confirmar</button>` : ''}
          ${['pendente', 'confirmado'].includes(st) ? `<button class="btn btn-ok btn-sm" data-action="status" data-id="${a.id}" data-s="concluido">Concluir atendimento</button>
            <button class="btn btn-danger btn-sm" data-action="status" data-id="${a.id}" data-s="faltou">Faltou</button>
            <button class="btn btn-ghost btn-sm" data-action="status" data-id="${a.id}" data-s="cancelado">Cancelar</button>` : ''}
          ${['faltou', 'cancelado'].includes(st) ? `<button class="btn btn-soft btn-sm" data-action="status" data-id="${a.id}" data-s="confirmado">Reativar</button>` : ''}
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-danger" data-action="del-ag" data-id="${a.id}">Excluir</button>
        <a class="btn btn-ghost" target="_blank" rel="noopener" href="${waLink(c.tel, fillMsg(db.config.msg, a))}">💬 WhatsApp</a>
        <button class="btn btn-primary" data-action="edit-ag" data-id="${a.id}">Editar</button>
      </div>`);
  }

  // ---------- Clientes ----------
  function vClientes() {
    const t = today(), m = parse(t).getMonth();
    const q = ui.cliSearch.toLowerCase();
    const rows = db.clientes.map(c => ({ c, s: clientStats(c.id) })).filter(({ c, s }) => {
      if (q && !(c.nome.toLowerCase().includes(q) || digits(c.tel).includes(digits(q) || '§'))) return false;
      if (ui.cliFilter === 'sumidos') return s.ultima && daysBetween(s.ultima, t) >= 60 && !s.proxima;
      if (ui.cliFilter === 'aniversario') return parse(c.nascimento).getMonth() === m;
      if (ui.cliFilter === 'vip') return s.gasto >= 1500;
      if (ui.cliFilter === 'novos') return daysBetween(c.criadoEm, t) <= 30;
      return true;
    }).sort((a, b) => b.s.gasto - a.s.gasto);

    const filters = [['todos', 'Todos'], ['vip', '⭐ VIP (R$ 1.500+)'], ['sumidos', '🔁 Sumidos 60+ dias'], ['aniversario', '🎂 Aniversariantes do mês'], ['novos', '🆕 Novos (30 dias)']];
    const body = `
      <div class="card">
        <div class="toolbar" style="margin-bottom:14px"><input class="input search" placeholder="Buscar por nome ou telefone…" value="${esc(ui.cliSearch)}" data-input="cli-search" aria-label="Buscar clientes"></div>
        <div class="chips" style="margin-bottom:16px">${filters.map(([k, l]) => `<button class="chip ${ui.cliFilter === k ? 'on' : ''}" data-action="cli-filter" data-f="${k}">${l}</button>`).join('')}</div>
        ${ui.cliFilter === 'sumidos' && rows.length ? `<div class="list-item" style="margin-bottom:14px;cursor:default;background:var(--warn-soft)"><span style="font-size:22px">💡</span><div class="grow"><b>${rows.length} clientes não voltam há mais de 60 dias</b><span>Uma oferta de retorno costuma recuperar 15–25% delas.</span></div><button class="btn btn-primary btn-sm" data-action="campaign">Criar campanha</button></div>` : ''}
        <div class="table-wrap"><table class="table">
          <thead><tr><th>Cliente</th><th>Telefone</th><th>Visitas</th><th>Última visita</th><th>Total gasto</th></tr></thead>
          <tbody>${rows.map(({ c, s }) => `<tr data-action="open-cli" data-id="${c.id}">
            <td><div class="person"><span class="avatar">${initials(c.nome)}</span><b>${esc(c.nome)}</b></div></td>
            <td>${esc(c.tel)}</td><td>${s.visitas}${s.faltas ? ` <span class="muted small">(${s.faltas} faltas)</span>` : ''}</td>
            <td>${s.ultima ? `${fmtShort(s.ultima)} <span class="muted small">há ${daysBetween(s.ultima, t)}d</span>` : '<span class="muted">—</span>'}</td><td><b>${brl0(s.gasto)}</b></td></tr>`).join('')}</tbody>
        </table>${rows.length ? '' : '<div class="empty"><div class="big">🔎</div>Nenhum cliente encontrado.</div>'}</div>
        <p class="muted small" style="margin-top:12px">${rows.length} de ${db.clientes.length} clientes</p>
      </div>`;
    return shell('clientes', 'Clientes', `<button class="btn btn-primary" data-action="new-cli">+ <span class="hide-sm">Nova cliente</span></button>`, body);
  }

  function cliDrawer(id) {
    const c = byId('clientes', id); if (!c) return;
    const s = clientStats(id);
    const lastMsg = `Olá, ${c.nome.split(' ')[0]}! Sentimos sua falta no ${db.config.nome} 💜 Que tal agendar seu próximo horário? Use nosso link: ${location.href.split('#')[0]}#/agendar`;
    openModal(`<div class="modal-head"><div class="person"><span class="avatar" style="width:52px;height:52px;font-size:18px">${initials(c.nome)}</span><div><h3>${esc(c.nome)}</h3><p class="muted small">Cliente desde ${fmtShort(c.criadoEm)}</p></div></div><button class="x" data-action="close" aria-label="Fechar">×</button></div>
      <div class="modal-body">
        <div class="stat-row"><div><small>Visitas</small><b>${s.visitas}</b></div><div><small>Total gasto</small><b>${brl0(s.gasto)}</b></div><div><small>Ticket médio</small><b>${brl0(s.visitas ? s.gasto / s.visitas : 0)}</b></div></div>
        ${s.proxima ? `<div class="list-item" data-action="open-ag" data-id="${s.proxima.id}"><span style="font-size:20px">📅</span><div class="grow"><b>Próximo: ${fmtShort(s.proxima.data)} às ${s.proxima.hora}</b><span>${esc(svc(s.proxima.servicoId).nome)}</span></div>${badge(s.proxima.status)}</div>` : ''}
        <dl class="kv"><dt>Telefone</dt><dd>${esc(c.tel)}</dd><dt>E-mail</dt><dd>${esc(c.email || '—')}</dd><dt>Aniversário</dt><dd>${fmtShort(c.nascimento)}</dd><dt>Faltas</dt><dd>${s.faltas}</dd></dl>
        ${c.obs ? `<div class="summary small"><b>Observações:</b> ${esc(c.obs)}</div>` : ''}
        <div class="toolbar"><button class="btn btn-primary" data-action="new-ag" data-cli="${c.id}">+ Agendar</button><a class="btn btn-ghost" target="_blank" rel="noopener" href="${waLink(c.tel, lastMsg)}">💬 WhatsApp</a><button class="btn btn-ghost" data-action="edit-cli" data-id="${c.id}">Editar</button></div>
        <h4 style="margin-top:8px">Histórico</h4>
        <div class="timeline">${s.list.slice(0, 15).map(a => `<div class="tl"><div><b>${esc(svc(a.servicoId).nome)}</b><br><span class="muted small">${fmtShort(a.data)} · ${a.hora} · ${esc(prof(a.profId).nome.split(' ')[0])}</span></div><div style="text-align:right">${brl0(valor(a))}<br>${badge(a.status)}</div></div>`).join('') || '<p class="muted">Sem atendimentos.</p>'}</div>
        <button class="btn btn-danger" data-action="del-cli" data-id="${c.id}">Excluir cliente</button>
      </div>`, { drawer: true });
  }

  function cliForm(c = {}) {
    openModal(`${modalHead(c.id ? 'Editar cliente' : 'Nova cliente')}
      <form data-form="cli" data-id="${c.id || ''}"><div class="modal-body">
        <div class="field"><label>Nome completo</label><input class="input" name="nome" required value="${esc(c.nome)}"></div>
        <div class="row"><div class="field"><label>WhatsApp</label><input class="input" name="tel" required value="${esc(c.tel)}" placeholder="(11) 99999-0000"></div>
        <div class="field"><label>Nascimento</label><input class="input" type="date" name="nascimento" value="${c.nascimento || ''}"></div></div>
        <div class="field"><label>E-mail</label><input class="input" type="email" name="email" value="${esc(c.email)}"></div>
        <div class="field"><label>Observações</label><textarea class="input" name="obs" placeholder="Alergias, preferências…">${esc(c.obs)}</textarea></div>
      </div><div class="modal-foot"><button type="button" class="btn btn-ghost" data-action="close">Cancelar</button><button class="btn btn-primary">Salvar</button></div></form>`);
  }

  function campaign() {
    const t = today();
    const list = db.clientes.filter(c => { const s = clientStats(c.id); return s.ultima && daysBetween(s.ultima, t) >= 60 && !s.proxima; });
    openModal(`${modalHead('Campanha de reativação', `${list.length} clientes selecionadas`)}
      <div class="modal-body">
        <div class="field"><label>Mensagem</label><textarea class="input" id="camp-msg">Oi, {nome}! Faz um tempinho que você não vem ao ${esc(db.config.nome)} 💜 Preparamos 15% de desconto no seu próximo horário até o fim do mês. Agende pelo link: ${location.href.split('#')[0]}#/agendar</textarea></div>
        <div class="field"><label>Enviar via</label><select class="input"><option>WhatsApp (automático · plano Pro)</option><option>SMS</option><option>E-mail</option></select></div>
        <div class="summary small">Estimativa: <b>${Math.round(list.length * .2)} retornos</b> ≈ <b>${brl0(list.length * .2 * 160)}</b> em receita recuperada.</div>
      </div>
      <div class="modal-foot"><button class="btn btn-ghost" data-action="close">Cancelar</button><button class="btn btn-primary" data-action="send-campaign">Enviar campanha</button></div>`);
  }

  // ---------- Serviços ----------
  function vServicos() {
    const mk = monthKey(today());
    const cats = [...new Set(db.servicos.map(s => s.categoria))];
    const body = cats.map(cat => `<div><h3 style="margin-bottom:12px">${esc(cat)}</h3><div class="svc-grid">
      ${db.servicos.filter(s => s.categoria === cat).map(s => {
        const n = db.ags.filter(a => a.servicoId === s.id && a.status === 'concluido' && monthKey(a.data) === mk).length;
        return `<div class="svc" data-action="edit-svc" data-id="${s.id}"><b>${esc(s.nome)}</b><span class="price">${brl(s.preco)}</span><div class="meta"><span>⏱ ${s.duracao} min</span><span>📈 ${n} no mês</span></div></div>`;
      }).join('')}</div></div>`).join('');
    return shell('servicos', 'Serviços', `<button class="btn btn-primary" data-action="new-svc">+ <span class="hide-sm">Novo serviço</span></button>`, body);
  }
  function svcForm(s = {}) {
    openModal(`${modalHead(s.id ? 'Editar serviço' : 'Novo serviço')}
      <form data-form="svc" data-id="${s.id || ''}"><div class="modal-body">
        <div class="field"><label>Nome</label><input class="input" name="nome" required value="${esc(s.nome)}"></div>
        <div class="row-3"><div class="field"><label>Preço (R$)</label><input class="input" type="number" min="0" step="0.01" name="preco" required value="${s.preco ?? ''}"></div>
        <div class="field"><label>Duração (min)</label><select class="input" name="duracao">${[15, 30, 45, 60, 75, 90, 120, 150, 180].map(d => `<option ${d === (s.duracao || 60) ? 'selected' : ''}>${d}</option>`).join('')}</select></div>
        <div class="field"><label>Categoria</label><input class="input" name="categoria" list="cat-list" required value="${esc(s.categoria)}"><datalist id="cat-list">${[...new Set(db.servicos.map(x => x.categoria))].map(c => `<option value="${esc(c)}">`).join('')}</datalist></div></div>
      </div><div class="modal-foot">${s.id ? `<button type="button" class="btn btn-danger" data-action="del-svc" data-id="${s.id}">Excluir</button>` : ''}<button type="button" class="btn btn-ghost" data-action="close">Cancelar</button><button class="btn btn-primary">Salvar</button></div></form>`);
  }

  // ---------- Financeiro ----------
  function vFinanceiro() {
    const mk = ui.finMonth;
    const months = Array.from({ length: 6 }, (_, i) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i); return iso(d).slice(0, 7); });
    const done = db.ags.filter(a => monthKey(a.data) === mk && a.status === 'concluido');
    const pagos = done.filter(a => a.pago);
    const receita = pagos.reduce((s, a) => s + valor(a), 0);
    const aReceber = db.ags.filter(a => a.status === 'concluido' && !a.pago).sort((a, b) => b.data.localeCompare(a.data));
    const desp = db.despesas.filter(d => monthKey(d.data) === mk).sort((a, b) => b.data.localeCompare(a.data));
    const totDesp = desp.reduce((s, d) => s + d.valor, 0);
    const formas = {}; pagos.forEach(a => { formas[a.forma] = (formas[a.forma] || 0) + valor(a); });
    const formasArr = Object.entries(formas).sort((a, b) => b[1] - a[1]);
    const porProf = db.profs.map(p => ({ p, v: done.filter(a => a.profId === p.id).reduce((s, a) => s + valor(a), 0) })).sort((a, b) => b.v - a.v);
    const maxProf = porProf[0]?.v || 1;
    const [y, m] = mk.split('-').map(Number);

    const body = `
      <div class="toolbar"><select class="input" data-input="fin-month" aria-label="Mês">${months.map(k => { const [yy, mm] = k.split('-').map(Number); return `<option value="${k}" ${k === mk ? 'selected' : ''}>${MONTHS[mm - 1]} de ${yy}</option>`; }).join('')}</select></div>
      <div class="kpis">
        <div class="kpi"><small>Receita recebida</small><b>${brl0(receita)}</b><span class="muted small">${pagos.length} pagamentos</span></div>
        <div class="kpi"><small>Despesas</small><b>${brl0(totDesp)}</b><span class="muted small">${desp.length} lançamentos</span></div>
        <div class="kpi"><small>Lucro</small><b style="color:${receita - totDesp >= 0 ? 'var(--ok)' : 'var(--bad)'}">${brl0(receita - totDesp)}</b><span class="muted small">margem ${receita ? pct((receita - totDesp) / receita) : '—'}</span></div>
        <div class="kpi"><small>A receber (total)</small><b>${brl0(aReceber.reduce((s, a) => s + valor(a), 0))}</b><span class="muted small">${aReceber.length} atendimentos</span></div>
      </div>
      <div class="grid-2-even">
        <div class="card"><div class="card-head"><h3>Formas de pagamento</h3></div><div class="rank">${formasArr.length ? formasArr.map(([f, v]) => `<div class="rank-row"><div><span>${esc(f)}</span><b>${brl0(v)} <span class="muted small">${pct(v / receita)}</span></b></div><div class="meter"><i style="width:${v / receita * 100}%"></i></div></div>`).join('') : '<p class="muted">Sem pagamentos neste mês.</p>'}</div></div>
        <div class="card"><div class="card-head"><h3>Produção por profissional</h3><span class="muted small">comissão 40%</span></div><div class="rank">${porProf.map(({ p, v }) => `<div class="rank-row"><div><span>${esc(p.nome)}</span><b>${brl0(v)} <span class="muted small">com. ${brl0(v * .4)}</span></b></div><div class="meter"><i style="width:${v / maxProf * 100}%;background:${p.cor}"></i></div></div>`).join('')}</div></div>
      </div>
      <div class="grid-2-even">
        <div class="card"><div class="card-head"><h3>Contas a receber</h3></div>
          <div class="list" style="max-height:340px;overflow:auto">${aReceber.length ? aReceber.slice(0, 30).map(a => `<div class="list-item" data-action="open-ag" data-id="${a.id}"><div class="grow"><b>${esc(cli(a.clienteId).nome)}</b><span>${fmtShort(a.data)} · ${esc(svc(a.servicoId).nome)}</span></div><b>${brl0(valor(a))}</b><span class="btn btn-soft btn-sm">Receber</span></div>`).join('') : '<div class="empty"><div class="big">🎉</div>Tudo recebido!</div>'}</div></div>
        <div class="card"><div class="card-head"><h3>Despesas de ${MONTHS[m - 1]}/${y}</h3><button class="btn btn-soft btn-sm" data-action="new-desp">+ Despesa</button></div>
          <div class="table-wrap"><table class="table"><thead><tr><th>Data</th><th>Descrição</th><th>Valor</th><th></th></tr></thead><tbody>
          ${desp.map(d => `<tr style="cursor:default"><td>${fmtShort(d.data)}</td><td>${esc(d.desc)} <span class="muted small">${esc(d.categoria)}</span></td><td><b>${brl(d.valor)}</b></td><td><button class="btn btn-ghost btn-sm" data-action="del-desp" data-id="${d.id}" aria-label="Remover">✕</button></td></tr>`).join('')}
          </tbody></table>${desp.length ? '' : '<div class="empty">Nenhuma despesa.</div>'}</div></div>
      </div>`;
    return shell('financeiro', 'Financeiro', `<button class="btn btn-ghost" data-action="export">⬇ <span class="hide-sm">Exportar CSV</span></button>`, body);
  }

  // ---------- Configurações ----------
  function vConfig() {
    const c = db.config;
    const sample = db.ags.find(a => a.data >= today() && a.status !== 'cancelado') || db.ags[0];
    const url = `${location.href.split('#')[0]}#/agendar`;
    const sw = (k, t, d) => `<label class="switch"><div><b>${t}</b><br><span class="muted small">${d}</span></div><input type="checkbox" data-input="cfg-toggle" data-k="${k}" ${c[k] ? 'checked' : ''}></label>`;
    const body = `
      <div class="grid-2-even">
        <form class="card" data-form="cfg" style="display:grid;gap:14px"><div class="card-head" style="margin:0"><h3>Dados do negócio</h3></div>
          <div class="field"><label>Nome</label><input class="input" name="nome" value="${esc(c.nome)}" required></div>
          <div class="row"><div class="field"><label>WhatsApp</label><input class="input" name="tel" value="${esc(c.tel)}"></div>
          <div class="row"><div class="field"><label>Abre</label><input class="input" type="time" name="abre" step="1800" value="${c.abre}"></div><div class="field"><label>Fecha</label><input class="input" type="time" name="fecha" step="1800" value="${c.fecha}"></div></div></div>
          <div class="field"><label>Endereço</label><input class="input" name="endereco" value="${esc(c.endereco)}"></div>
          <div><button class="btn btn-primary">Salvar dados</button></div>
        </form>
        <div class="card" style="display:grid;gap:14px;align-content:start"><div class="card-head" style="margin:0"><h3>Seu link de agendamento</h3></div>
          <p class="muted small">Coloque na bio do Instagram, no WhatsApp Business e no Google Meu Negócio.</p>
          <div class="copy-box"><input class="input" readonly value="${esc(url)}" id="book-url" aria-label="Link de agendamento"><button class="btn btn-ghost" data-action="copy">Copiar</button></div>
          <a class="btn btn-soft" href="#/agendar" target="_blank" rel="noopener">Abrir página de agendamento ↗</a>
          <div class="summary small"><b>Plano ${esc(c.plano)}</b> · teste grátis termina em 11 dias.<br><span class="muted">Depois, ${brl0(149)}/mês. Cancele quando quiser.</span></div>
        </div>
      </div>
      <div class="grid-2-even">
        <div class="card" style="display:grid;gap:14px;align-content:start"><div class="card-head" style="margin:0"><h3>Mensagem de lembrete (WhatsApp)</h3></div>
          <p class="muted small">Variáveis: {nome} {servico} {data} {hora} {profissional}</p>
          <textarea class="input" data-input="cfg-msg" rows="6" aria-label="Modelo de mensagem">${esc(c.msg)}</textarea>
          <div class="wa-preview"><div class="wa-bubble" id="wa-preview">${esc(fillMsg(c.msg, sample))}</div></div>
        </div>
        <div class="card"><div class="card-head"><h3>Automações</h3></div>
          ${sw('lembrete24h', 'Lembrete 24h antes', 'Mensagem com confirmação em 1 toque')}
          ${sw('lembrete2h', 'Lembrete 2h antes', 'Reforço no dia do atendimento')}
          ${sw('confirmAuto', 'Confirmar agendamentos online automaticamente', 'Se desligado, você aprova cada pedido')}
          ${sw('aniversario', 'Mensagem de aniversário', 'Com cupom de desconto opcional')}
          ${sw('reativacao', 'Reativação automática', 'Mensagem para clientes sem visita há 60 dias')}
        </div>
      </div>
      <div class="card"><div class="card-head"><h3>Dados de demonstração</h3></div><p class="muted small" style="margin-bottom:12px">Todos os dados deste protótipo ficam salvos apenas neste navegador.</p><button class="btn btn-danger" data-action="reset">Restaurar dados de exemplo</button></div>`;
    return shell('config', 'Configurações', '', body);
  }

  // ---------- Agendamento público ----------
  function bookTimes(data, servicoId, profId) {
    const s = svc(servicoId);
    const start = toMin(db.config.abre), end = toMin(db.config.fecha);
    const isToday = data === today(), nm = nowMin();
    const profs = profId ? [profId] : db.profs.filter(p => p.cats.includes(s.categoria)).map(p => p.id);
    const out = [];
    for (let m = start; m + s.duracao <= end; m += 30) {
      const h = fromMin(m);
      const free = !(isToday && m <= nm + 30) && profs.some(p => isFree(p, data, h, s.duracao));
      out.push({ h, free });
    }
    return out;
  }

  function vBook() {
    const b = ui.book, c = db.config;
    const steps = `<div class="stepper">${[1, 2, 3, 4].map(i => `<i class="${b.step >= i ? 'on' : ''}"></i>`).join('')}</div>`;
    const back = b.step > 1 && !b.done ? `<button class="btn btn-ghost btn-sm" data-action="book-back">← Voltar</button>` : '';
    let content = '';
    if (b.done) {
      const a = byId('ags', b.done);
      content = a ? `<div class="success"><div class="check">✓</div><h2>Horário reservado!</h2><p class="muted" style="margin:8px 0 20px">Você receberá a confirmação no WhatsApp.</p>
        <div class="summary" style="text-align:left"><dl class="kv"><dt>Serviço</dt><dd>${esc(svc(a.servicoId).nome)}</dd><dt>Profissional</dt><dd>${esc(prof(a.profId).nome)}</dd><dt>Data</dt><dd>${fmtLong(a.data)}</dd><dt>Horário</dt><dd>${a.hora}</dd><dt>Valor</dt><dd>${brl(valor(a))}</dd></dl></div>
        <button class="btn btn-primary" style="margin-top:20px" data-action="book-reset">Fazer outro agendamento</button></div>` : '';
    } else if (b.step === 1) {
      const cats = [...new Set(db.servicos.map(s => s.categoria))];
      content = `<h2>Escolha o serviço</h2>${cats.map(cat => `<p class="muted small" style="font-weight:700;margin-top:6px">${esc(cat)}</p>${db.servicos.filter(s => s.categoria === cat).map(s => `<button class="opt" data-action="book-svc" data-id="${s.id}"><div><b>${esc(s.nome)}</b><br><span class="muted small">${s.duracao} min</span></div><b>${brl0(s.preco)}</b></button>`).join('')}`).join('')}`;
    } else if (b.step === 2) {
      const s = svc(b.servicoId);
      const ps = db.profs.filter(p => p.cats.includes(s.categoria));
      content = `<h2>Com quem?</h2>
        <button class="opt" data-action="book-prof" data-id=""><div><b>Sem preferência</b><br><span class="muted small">Primeiro horário disponível</span></div><span>→</span></button>
        ${ps.map(p => `<button class="opt" data-action="book-prof" data-id="${p.id}"><div class="person"><span class="avatar" style="background:${p.cor}">${initials(p.nome)}</span><div><b>${esc(p.nome)}</b><br><span class="muted small">${esc(p.cargo)}</span></div></div><span>→</span></button>`).join('')}`;
    } else if (b.step === 3) {
      const days = []; let d = today();
      while (days.length < 14) { if (parse(d).getDay() !== 0) days.push(d); d = addDays(d, 1); }
      if (!b.data) b.data = days.find(x => bookTimes(x, b.servicoId, b.profId).some(t => t.free)) || days[0];
      const times = bookTimes(b.data, b.servicoId, b.profId);
      content = `<h2>Escolha data e horário</h2>
        <div class="days">${days.map(x => { const dt = parse(x); return `<button class="day ${x === b.data ? 'on' : ''}" data-action="book-day" data-d="${x}"><small>${WD[dt.getDay()]}</small><b>${dt.getDate()}</b></button>`; }).join('')}</div>
        ${times.some(t => t.free) ? `<div class="times">${times.map(t => `<button class="time" ${t.free ? '' : 'disabled'} data-action="book-time" data-h="${t.h}">${t.h}</button>`).join('')}</div>` : '<div class="empty">Sem horários livres neste dia. Tente outra data.</div>'}`;
    } else if (b.step === 4) {
      const s = svc(b.servicoId);
      content = `<h2>Seus dados</h2>
        <div class="summary"><dl class="kv"><dt>Serviço</dt><dd>${esc(s.nome)}</dd><dt>Profissional</dt><dd>${b.profId ? esc(prof(b.profId).nome) : 'Sem preferência'}</dd><dt>Quando</dt><dd>${fmtShort(b.data)} às ${b.hora}</dd><dt>Valor</dt><dd>${brl(s.preco)}</dd></dl></div>
        <form data-form="book" style="display:grid;gap:12px">
          <div class="field"><label>Nome completo</label><input class="input" name="nome" required autocomplete="name"></div>
          <div class="field"><label>WhatsApp</label><input class="input" name="tel" required inputmode="tel" autocomplete="tel" placeholder="(11) 99999-0000"></div>
          <button class="btn btn-primary btn-lg">Confirmar agendamento</button>
          <p class="muted small" style="text-align:center">Pagamento no local · cancelamento gratuito até 24h antes</p>
        </form>`;
    }
    return `<div class="book"><div class="book-card">
      <div class="book-top"><div class="logo-mark">✦</div><h1>${esc(c.nome)}</h1><p class="muted small">${esc(c.endereco)}</p></div>
      ${b.done ? '' : steps}
      <div class="book-body">${back}${content}</div>
    </div><p class="muted small" style="text-align:center;margin-top:20px">Agendamento online por <a href="#/">Agendaê</a></p></div>`;
  }

  // ---------- Roteador ----------
  function route() {
    const [path, qs] = (location.hash.slice(1) || '/').split('?');
    const params = new URLSearchParams(qs || '');
    closeModal();
    let html;
    if (path === '/' || path === '') html = vLanding();
    else if (path === '/entrar') html = vAuth(params.has('cadastro'));
    else if (path === '/agendar') html = vBook();
    else if (path.startsWith('/app')) {
      const sec = path.split('/')[2] || '';
      // Parâmetros de link profundo valem uma vez; depois limpamos a URL.
      if (sec === 'agenda' && params.get('d')) ui.agendaDate = params.get('d');
      if (sec === 'clientes' && params.get('f')) ui.cliFilter = params.get('f');
      if (qs) history.replaceState(null, '', '#' + path);
      html = ({ '': vDashboard, agenda: vAgenda, clientes: vClientes, servicos: vServicos, financeiro: vFinanceiro, config: vConfig }[sec] || vDashboard)();
    } else html = vLanding();
    $root.innerHTML = html;
    document.title = path.startsWith('/app') ? `${db.config.nome} · Agendaê` : path === '/agendar' ? `Agendar · ${db.config.nome}` : 'Agendaê | Gestão para clínicas e salões';
    if (!params.has('keep')) window.scrollTo(0, 0);
    afterRender(path);
  }
  function rerender() { const y = window.scrollY; const sc = document.querySelector('.agenda-scroll')?.scrollLeft; route(); window.scrollTo(0, y); if (sc) { const el = document.querySelector('.agenda-scroll'); if (el) el.scrollLeft = sc; } }
  function afterRender(path) {
    if (path === '/app/agenda' && ui.agendaDate === today()) {
      const line = document.querySelector('.now-line');
      if (line) line.scrollIntoView({ block: 'center' });
    }
  }

  // ---------- Ações ----------
  function setStatus(id, s) {
    const a = byId('ags', id); if (!a) return;
    a.status = s; if (s !== 'concluido') { a.pago = false; a.forma = ''; }
    save(); closeModal(); rerender();
    toast({ confirmado: 'Agendamento confirmado', concluido: 'Atendimento concluído', faltou: 'Falta registrada', cancelado: 'Agendamento cancelado' }[s]);
    if (s === 'concluido') agDetails(id);
  }

  document.addEventListener('click', e => {
    const el = e.target.closest('[data-action]'); if (!el) return;
    const act = el.dataset.action, id = el.dataset.id;
    if (act === 'overlay' && e.target !== el) return;
    switch (act) {
      case 'overlay': case 'close': closeModal(); break;
      case 'scroll': e.preventDefault(); document.querySelector(el.getAttribute('href'))?.scrollIntoView({ behavior: 'smooth' }); break;
      case 'billing': ui.billing = el.dataset.v; rerender(); break;
      case 'goto': location.hash = el.dataset.to; break;
      case 'new-ag': { const pre = {}; if (el.dataset.cli) pre.clienteId = el.dataset.cli; openModal(agForm(pre)); break; }
      case 'slot': openModal(agForm({ profId: el.dataset.prof, hora: el.dataset.hora, data: ui.agendaDate, servicoId: db.servicos.find(s => prof(el.dataset.prof).cats?.includes(s.categoria))?.id })); break;
      case 'open-ag': agDetails(id); break;
      case 'edit-ag': openModal(agForm(byId('ags', id))); break;
      case 'del-ag': if (confirm('Excluir este agendamento?')) { db.ags = db.ags.filter(a => a.id !== id); save(); closeModal(); rerender(); toast('Agendamento excluído'); } break;
      case 'status': setStatus(id, el.dataset.s); break;
      case 'pay': { const a = byId('ags', id); a.pago = true; a.forma = document.getElementById('forma').value; save(); closeModal(); rerender(); toast(`Pagamento de ${brl(valor(a))} registrado`); break; }
      case 'ag-day': ui.agendaDate = addDays(ui.agendaDate, +el.dataset.n); rerender(); break;
      case 'ag-today': ui.agendaDate = today(); route(); break;
      case 'open-cli': e.preventDefault(); cliDrawer(id); break;
      case 'new-cli': cliForm(); break;
      case 'edit-cli': cliForm(byId('clientes', id)); break;
      case 'del-cli': if (confirm('Excluir cliente e todo o histórico?')) { db.clientes = db.clientes.filter(c => c.id !== id); db.ags = db.ags.filter(a => a.clienteId !== id); save(); closeModal(); rerender(); toast('Cliente excluída'); } break;
      case 'cli-filter': ui.cliFilter = el.dataset.f; rerender(); break;
      case 'campaign': campaign(); break;
      case 'send-campaign': closeModal(); toast('Campanha agendada para envio'); break;
      case 'new-svc': svcForm(); break;
      case 'edit-svc': svcForm(byId('servicos', id)); break;
      case 'del-svc': if (db.ags.some(a => a.servicoId === id && a.data >= today() && ['pendente', 'confirmado'].includes(a.status))) { toast('Há agendamentos futuros com este serviço'); break; }
        if (confirm('Excluir serviço?')) { db.servicos = db.servicos.filter(s => s.id !== id); save(); closeModal(); rerender(); } break;
      case 'new-desp': openModal(`${modalHead('Nova despesa')}<form data-form="desp"><div class="modal-body">
          <div class="field"><label>Descrição</label><input class="input" name="desc" required></div>
          <div class="row-3"><div class="field"><label>Valor (R$)</label><input class="input" type="number" step="0.01" min="0" name="valor" required></div>
          <div class="field"><label>Data</label><input class="input" type="date" name="data" required value="${ui.finMonth === monthKey(today()) ? today() : ui.finMonth + '-01'}"></div>
          <div class="field"><label>Categoria</label><select class="input" name="categoria"><option>Fixo</option><option>Insumos</option><option>Marketing</option><option>Software</option><option>Outros</option></select></div></div>
          </div><div class="modal-foot"><button type="button" class="btn btn-ghost" data-action="close">Cancelar</button><button class="btn btn-primary">Adicionar</button></div></form>`); break;
      case 'del-desp': db.despesas = db.despesas.filter(d => d.id !== id); save(); rerender(); toast('Despesa removida'); break;
      case 'export': exportCSV(); break;
      case 'copy': { const inp = document.getElementById('book-url'); (navigator.clipboard?.writeText(inp.value) || Promise.reject()).then(() => toast('Link copiado'), () => { inp.select(); document.execCommand('copy'); toast('Link copiado'); }); break; }
      case 'reset': if (confirm('Apagar suas alterações e restaurar os dados de exemplo?')) { db = seed(); save(); rerender(); toast('Dados restaurados'); } break;
      case 'book-svc': ui.book.servicoId = id; ui.book.step = 2; rerender(); break;
      case 'book-prof': ui.book.profId = id || null; ui.book.step = 3; ui.book.data = null; rerender(); break;
      case 'book-day': ui.book.data = el.dataset.d; rerender(); break;
      case 'book-time': ui.book.hora = el.dataset.h; ui.book.step = 4; rerender(); break;
      case 'book-back': ui.book.step--; rerender(); break;
      case 'book-reset': ui.book = { step: 1 }; rerender(); break;
    }
  });

  document.addEventListener('input', e => {
    const el = e.target, k = el.dataset.input; if (!k) return;
    if (k === 'cli-search') {
      ui.cliSearch = el.value; const pos = el.selectionStart; rerender();
      const n = document.querySelector('[data-input="cli-search"]'); n.focus(); n.setSelectionRange(pos, pos);
    }
    if (k === 'cfg-msg') {
      db.config.msg = el.value; save();
      const sample = db.ags.find(a => a.data >= today() && a.status !== 'cancelado') || db.ags[0];
      document.getElementById('wa-preview').textContent = fillMsg(el.value, sample);
    }
  });
  document.addEventListener('change', e => {
    const el = e.target, k = el.dataset.input; if (!k) return;
    if (k === 'ag-date' && el.value) { ui.agendaDate = el.value; rerender(); }
    if (k === 'fin-month') { ui.finMonth = el.value; rerender(); }
    if (k === 'cfg-toggle') { db.config[el.dataset.k] = el.checked; save(); toast(el.checked ? 'Automação ativada' : 'Automação desativada'); }
  });

  document.addEventListener('submit', e => {
    const f = e.target, kind = f.dataset.form; if (!kind) return;
    e.preventDefault();
    const v = Object.fromEntries(new FormData(f));
    if (kind === 'auth') {
      if (f.dataset.signup && v.negocio) { db.config.nome = v.negocio.trim(); save(); }
      location.hash = '#/app'; toast(f.dataset.signup ? 'Conta criada! Bem-vinda(o) 🎉' : 'Login realizado');
    }
    if (kind === 'ag') {
      const name = v.cliente.trim();
      let c = db.clientes.find(x => x.nome.toLowerCase() === name.toLowerCase());
      if (!c) { c = { id: uid(), nome: name, tel: v.tel || '', email: '', nascimento: '2000-01-01', obs: '', criadoEm: today() }; db.clientes.push(c); }
      const s = svc(v.servicoId);
      if (!isFree(v.profId, v.data, v.hora, s.duracao, f.dataset.id) && !confirm(`${prof(v.profId).nome} já tem atendimento nesse horário. Agendar mesmo assim (encaixe)?`)) return;
      if (f.dataset.id) {
        const a = byId('ags', f.dataset.id);
        Object.assign(a, { clienteId: c.id, servicoId: v.servicoId, profId: v.profId, data: v.data, hora: v.hora, status: v.status || a.status, preco: a.servicoId === v.servicoId ? a.preco : s.preco });
        toast('Agendamento atualizado');
      } else {
        db.ags.push({ id: uid(), clienteId: c.id, servicoId: v.servicoId, profId: v.profId, data: v.data, hora: v.hora, status: 'confirmado', pago: false, forma: '', preco: s.preco });
        toast(`Agendado: ${c.nome.split(' ')[0]}, ${fmtShort(v.data)} às ${v.hora}`);
      }
      save(); closeModal(); ui.agendaDate = v.data; rerender();
    }
    if (kind === 'cli') {
      if (f.dataset.id) { Object.assign(byId('clientes', f.dataset.id), v); toast('Cliente atualizada'); }
      else { db.clientes.push({ id: uid(), ...v, nascimento: v.nascimento || '2000-01-01', criadoEm: today() }); toast('Cliente cadastrada'); }
      save(); closeModal(); rerender();
    }
    if (kind === 'svc') {
      const data = { nome: v.nome, preco: +v.preco, duracao: +v.duracao, categoria: v.categoria };
      if (f.dataset.id) Object.assign(byId('servicos', f.dataset.id), data); else db.servicos.push({ id: uid(), ...data });
      // Garante que alguém atenda categorias novas.
      if (!db.profs.some(p => p.cats.includes(data.categoria))) db.profs[0].cats.push(data.categoria);
      save(); closeModal(); rerender(); toast('Serviço salvo');
    }
    if (kind === 'desp') { db.despesas.push({ id: uid(), desc: v.desc, valor: +v.valor, data: v.data, categoria: v.categoria }); save(); closeModal(); rerender(); toast('Despesa adicionada'); }
    if (kind === 'cfg') {
      if (toMin(v.fecha) <= toMin(v.abre)) { toast('O horário de fechamento deve ser depois da abertura'); return; }
      Object.assign(db.config, v); save(); rerender(); toast('Dados salvos');
    }
    if (kind === 'book') {
      const b = ui.book, s = svc(b.servicoId);
      let profId = b.profId;
      if (!profId) profId = db.profs.find(p => p.cats.includes(s.categoria) && isFree(p.id, b.data, b.hora, s.duracao))?.id;
      if (!profId || !isFree(profId, b.data, b.hora, s.duracao)) { toast('Esse horário acabou de ser ocupado. Escolha outro.'); b.step = 3; rerender(); return; }
      let c = db.clientes.find(x => digits(x.tel) && digits(x.tel) === digits(v.tel));
      if (!c) { c = { id: uid(), nome: v.nome.trim(), tel: v.tel, email: '', nascimento: '2000-01-01', obs: '', criadoEm: today() }; db.clientes.push(c); }
      const a = { id: uid(), clienteId: c.id, servicoId: s.id, profId, data: b.data, hora: b.hora, status: db.config.confirmAuto ? 'confirmado' : 'pendente', pago: false, forma: '', preco: s.preco };
      db.ags.push(a); save(); b.done = a.id; rerender();
    }
  });

  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  function exportCSV() {
    const mk = ui.finMonth;
    const rows = [['Data', 'Hora', 'Cliente', 'Serviço', 'Profissional', 'Status', 'Valor', 'Pago', 'Forma']];
    db.ags.filter(a => monthKey(a.data) === mk).sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora))
      .forEach(a => rows.push([a.data, a.hora, cli(a.clienteId).nome, svc(a.servicoId).nome, prof(a.profId).nome, a.status, valor(a).toFixed(2).replace('.', ','), a.pago ? 'sim' : 'não', a.forma]));
    const csv = rows.map(r => r.map(x => `"${String(x).replace(/"/g, '""')}"`).join(';')).join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    link.download = `agendae-${mk}.csv`; link.click(); URL.revokeObjectURL(link.href);
    toast('CSV exportado');
  }

  // ---------- Início ----------
  load();
  window.addEventListener('hashchange', route);
  route();
})();
