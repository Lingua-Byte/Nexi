// Gera o plano editorial mensal do Glossa (HTML -> PDF via Playwright).
// Uso: node build/gerar-pdf.js   (a partir da pasta glossa/)
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const CONTEUDO = path.join(ROOT, 'conteudo');

const QUADROS = [
  { file: '1-de-onde-vem.txt', nome: 'De Onde Vem?', hora: '07h', cor: '#C47F14', tema: 'Etimologia', tags: '#etimologia #origemdaspalavras #curiosidades #glossa', obj: 'A origem escondida de palavras do dia a dia. É o quadro que mais vira compartilhamento.' },
  { file: '2-aula-de-letras.txt', nome: 'Aula de Letras', hora: '10h', cor: '#5E5A52', tema: 'Conceitos do curso', tags: '#letras #linguistica #portugues #enem', obj: 'Conceitos do curso de Letras (cotexto, dêixis, polifonia, norma culta) explicados em 40 segundos. Atrai estudantes e vestibulandos.' },
  { file: '3-mito-ou-verdade.txt', nome: 'Mito ou Verdade', hora: '12h', cor: '#C13B37', tema: 'Desmentidos', tags: '#mitoouverdade #curiosidades #linguistica #glossa', obj: 'Desmonta lendas que todo mundo repete. Gera debate e comentários, o combustível do algoritmo.' },
  { file: '4-linguas-extremas.txt', nome: 'Línguas Extremas', hora: '15h', cor: '#A9820F', tema: 'O mundo das línguas', tags: '#idiomas #linguas #curiosidades #glossa', obj: 'As línguas mais estranhas e surpreendentes do planeta. Conteúdo de "uau", que retém bem.' },
  { file: '5-brasil-falado.txt', nome: 'Brasil Falado', hora: '18h', cor: '#2E8A57', tema: 'Variação e português brasileiro', tags: '#portuguesbrasileiro #sotaque #brasil #glossa', obj: 'Sotaques, variação, tupi, línguas africanas e Libras. Identificação regional: "é assim que eu falo!".' },
  { file: '6-linguas-primas.txt', nome: 'Línguas Primas', hora: '20h', cor: '#2F6FB5', tema: 'Parentesco e contato', tags: '#idiomas #linguistica #aprenderidiomas #glossa', obj: 'Por que as línguas se parecem: famílias, empréstimos e regras de mudança. Atrai quem estuda idiomas.' },
  { file: '7-genios.txt', nome: 'Gênios da Linguística', hora: '22h', cor: '#7A4FB5', tema: 'História da ciência', tags: '#historia #linguistica #letras #glossa', obj: 'As pessoas e descobertas por trás da ciência da linguagem, contadas como histórias.' },
];

function parse(file) {
  const txt = fs.readFileSync(path.join(CONTEUDO, file), 'utf8');
  return txt.split(/^## /m).slice(1).map(block => {
    const lines = block.split('\n');
    const e = { t: lines[0].trim() };
    for (const l of lines.slice(1)) {
      const m = l.match(/^([GRVLF]): (.*)$/);
      if (m) e[m[1]] = m[2].trim();
    }
    for (const k of ['G', 'R', 'V', 'L', 'F']) if (!e[k]) throw new Error(`${file}: "${e.t}" sem campo ${k}`);
    return e;
  });
}

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const words = s => s.split(/\s+/).filter(Boolean).length;

const data = QUADROS.map(q => ({ ...q, itens: parse(q.file) }));
data.forEach(q => { if (q.itens.length !== 30) throw new Error(`${q.file} tem ${q.itens.length} itens`); });

// ---------- páginas ----------
const capa = `
<section class="capa">
  <div class="capa-top mono">PLANO EDITORIAL · MÊS 1 · 210 ROTEIROS</div>
  <div class="capa-mid">
    <div class="ipa mono">/ˈɡlɔs.sa/ · γλῶσσα · substantivo feminino</div>
    <h1 class="wordmark">Glossa</h1>
    <p class="tagline">A língua por dentro.</p>
  </div>
  <div class="capa-quadros">
    ${data.map(q => `<span class="chip" style="--c:${q.cor}">${q.nome}</span>`).join('')}
  </div>
  <div class="capa-bot mono">Canal dark de linguística e Letras · YouTube Shorts · Instagram Reels · TikTok · 7 vídeos por dia</div>
</section>`;

const canal = `
<section class="pagina">
  <div class="eyebrow mono">01 · O canal</div>
  <h2>Por que <em>Glossa</em></h2>
  <div class="verbete">
    <p><b>glossa</b> <span class="mono">/ˈɡlɔs.sa/</span> s.f. Do grego <i>glôssa</i>, que significa ao mesmo tempo <b>o órgão da boca</b> e <b>o idioma</b>, a mesma ambiguidade da palavra portuguesa "língua". É raiz de <i>glossário</i>, <i>glote</i>, <i>poliglota</i> e <i>isoglossa</i>, a linha que, nos atlas linguísticos, separa duas formas de falar.</p>
  </div>
  <div class="grid2">
    <div>
      <h3>Por que funciona</h3>
      <ul>
        <li><b>É curto e soa como marca:</b> 6 letras, fácil de dizer, sem acento e sem hífen.</li>
        <li><b>Funciona em dois níveis.</b> Para o público geral é um nome bonito e misterioso. Para quem fez Letras é uma piscadela: <i>isoglossa</i>, <i>glossema</i> (Hjelmslev), <i>glosa</i> medieval.</li>
        <li><b>Cobre o canal inteiro:</b> etimologia, fonética, literatura, sociolinguística. Um nome como "Etimologia em 30s" prenderia o canal a um quadro só.</li>
        <li><b>É neutro em idioma:</b> serve se um dia o canal tiver versão em espanhol ou inglês.</li>
      </ul>
    </div>
    <div>
      <h3>Kit de perfil</h3>
      <table class="kv">
        <tr><th>Nome</th><td>Glossa</td></tr>
        <tr><th>Assinatura</th><td>A língua por dentro.</td></tr>
        <tr><th>@ sugeridos</th><td><span class="mono">@glossa · @glossa.br · @canalglossa · @glossa.lingua</span><br><small>Verifique a disponibilidade nas três redes e registre o mesmo @ em todas no mesmo dia.</small></td></tr>
        <tr><th>Bio</th><td>Etimologia, linguística e tudo o que se aprende em Letras, em 40 segundos. Vídeos novos todo dia, das 7h às 22h.</td></tr>
        <tr><th>Avatar</th><td>"G" serifado creme sobre grafite, com o ponto âmbar (ver identidade visual).</td></tr>
        <tr><th>Reservas</th><td>Isoglossa · Étimo · Cotexto (para canais-satélite ou série longa)</td></tr>
      </table>
    </div>
  </div>
  <h3>Posicionamento</h3>
  <p class="lead">O Glossa é o "professor de Letras que todo mundo queria ter": sem rosto, rápido, preciso e um pouco provocador. A promessa ao espectador é: <b>em 40 segundos, você sai sabendo uma coisa que vai contar pra alguém hoje.</b> O diferencial é o rigor: todo vídeo tem fonte, e o canal desmonta mitos em vez de espalhá-los. Num nicho cheio de curiosidade falsa, a credibilidade vira marca.</p>
</section>`;

const quadros = `
<section class="pagina">
  <div class="eyebrow mono">02 · Grade</div>
  <h2>Os 7 quadros, um por horário</h2>
  <p class="lead">Cada dia tem um vídeo de cada quadro, sempre no mesmo horário. A cor do quadro aparece no selo do vídeo, e com o tempo o público aprende a reconhecer o quadro pela cor.</p>
  <table class="tabela-quadros">
    <thead><tr><th>Horário</th><th>Quadro</th><th>O que é</th><th>Hashtags-base</th></tr></thead>
    <tbody>
      ${data.map(q => `<tr><td class="mono">${q.hora}</td><td><span class="chip" style="--c:${q.cor}">${q.nome}</span></td><td>${q.obj}</td><td class="mono small">${q.tags}</td></tr>`).join('')}
    </tbody>
  </table>
  <p class="nota">Revise os horários depois de 2 semanas no painel de cada rede (YouTube Studio → Público → "Quando seus espectadores estão no YouTube"; Instagram e TikTok → Insights). Mantenha a ordem dos quadros e desloque só os horários.</p>
</section>`;

const formula = `
<section class="pagina">
  <div class="eyebrow mono">03 · Método</div>
  <h2>A fórmula de cada roteiro</h2>
  <div class="timeline">
    <div><span class="mono">0–1,5 s</span><b>Gancho</b><p>A frase mais surpreendente vem primeiro, na voz e na tela ao mesmo tempo. Nada de "olá" nem "você sabia". Exemplo: "Toda vez que você fala algoritmo, está falando o nome de um homem."</p></div>
    <div><span class="mono">1,5–8 s</span><b>Promessa</b><p>Situe o espectador: onde, quando, quem.</p></div>
    <div><span class="mono">8–35 s</span><b>Explicação + virada</b><p>Uma ideia por frase. No meio, um "e tem mais" com um segundo fato que recompensa quem ficou.</p></div>
    <div><span class="mono">35–45 s</span><b>Fecho</b><p>Uma pergunta para comentar, um "salva", ou uma frase que emenda no gancho e faz o vídeo recomeçar em loop.</p></div>
  </div>
  <div class="grid2">
    <div>
      <h3>Regras de texto</h3>
      <ul>
        <li>De 95 a 125 palavras, o que dá entre 35 e 45 s com a narração a ~165 palavras por minuto. Cada briefing mostra a estimativa.</li>
        <li>Todo termo técnico vem traduzido na mesma frase: "dêixis, do grego 'mostrar'".</li>
        <li>Prefira números e nomes concretos: "1786, Calcutá" funciona melhor do que "há muito tempo".</li>
        <li>Alterne a chamada final: comentar → salvar → seguir → compartilhar. Não repita a mesma duas vezes seguidas no mesmo dia.</li>
        <li>Quando um vídeo citar outro ("tem vídeo sobre isso"), fixe o link do outro nos comentários.</li>
      </ul>
    </div>
    <div>
      <h3>Como ler cada briefing</h3>
      <table class="kv">
        <tr><th>Gancho</th><td>Texto fixo na tela no primeiro segundo e título do Short.</td></tr>
        <tr><th>Roteiro</th><td>Narração completa, pronta para gravar.</td></tr>
        <tr><th>Visual</th><td>Sequência de cenas, usando os componentes da identidade visual.</td></tr>
        <tr><th>Legenda</th><td>Texto do post. Acrescente as hashtags-base do quadro.</td></tr>
        <tr><th>Fonte</th><td>Onde confirmar o fato antes de gravar. Vai também no comentário fixado.</td></tr>
      </table>
    </div>
  </div>
</section>`;

const producao = `
<section class="pagina">
  <div class="eyebrow mono">04 · Operação</div>
  <h2>Como produzir 49 vídeos por semana</h2>
  <p class="lead">Ninguém produz 7 vídeos do zero todo dia. O segredo é trabalhar em lotes semanais com templates fixos.</p>
  <table class="tabela-quadros">
    <thead><tr><th>Etapa</th><th>Quando</th><th>O que fazer</th></tr></thead>
    <tbody>
      <tr><td><b>1. Checagem</b></td><td>Segunda</td><td>Confirme os 49 fatos da semana na fonte indicada e ajuste o roteiro se precisar. Use a IA para escrever, nunca para confirmar fatos.</td></tr>
      <tr><td><b>2. Narração</b></td><td>Segunda</td><td>Gere ou grave os 49 áudios com a mesma voz e as mesmas configurações. Ouça cada um e corrija nomes estrangeiros e símbolos fonéticos (a IA erra pronúncia de nomes).</td></tr>
      <tr><td><b>3. Imagens</b></td><td>Terça</td><td>Separe imagens de domínio público (Wikimedia Commons, Biblioteca do Congresso dos EUA, Biblioteca Nacional Digital) numa pasta por vídeo.</td></tr>
      <tr><td><b>4. Edição</b></td><td>Terça a quinta</td><td>Monte no template do quadro (CapCut, Premiere ou After Effects) com legenda palavra a palavra. Meta: 15 a 20 minutos por vídeo quando o template estiver maduro.</td></tr>
      <tr><td><b>5. Agendamento</b></td><td>Sexta</td><td>Agende nas ferramentas nativas: YouTube Studio, Meta Business Suite e TikTok Studio. Envie cada arquivo limpo, sem marca d'água de outra rede.</td></tr>
      <tr><td><b>6. Comunidade</b></td><td>Diário, 20 min</td><td>Fixe o comentário com a fonte, responda os 10 primeiros comentários e anote as perguntas que viram pauta.</td></tr>
    </tbody>
  </table>
  <div class="grid2">
    <div>
      <h3>Riscos e como evitar</h3>
      <ul>
        <li><b>Conteúdo "inautêntico" (YouTube):</b> vídeos em massa, repetitivos e sem valor perdem a monetização. A defesa é variar os quadros, ter roteiro original, fonte e ponto de vista. Não reaproveite o mesmo roteiro com outra palavra.</li>
        <li><b>IA sem aviso:</b> marque o conteúdo sintético realista quando as redes pedirem (narração por IA em geral não exige; imagem realista gerada por IA, sim).</li>
        <li><b>Música:</b> use só a biblioteca de áudio de cada rede ou trilha licenciada.</li>
        <li><b>Erros factuais:</b> errar uma vez acontece. Corrija no comentário fixado e agradeça a quem apontou. Isso gera mais confiança do que apagar o vídeo.</li>
      </ul>
    </div>
    <div>
      <h3>Monetização: os marcos</h3>
      <ul>
        <li><b>YouTube (YPP):</b> a receita de anúncios dos Shorts exige 1.000 inscritos + 10 milhões de visualizações de Shorts em 90 dias. Há um nível inicial (500 inscritos + 3 milhões de visualizações) com recursos de apoio dos fãs.</li>
        <li><b>TikTok (Creator Rewards):</b> só paga vídeos com <b>mais de 1 minuto</b>. A partir do mês 2, faça compilações semanais de 3 vídeos do mesmo quadro (60 a 90 s).</li>
        <li><b>Instagram:</b> o dinheiro vem de publicidade e parcerias (escolas de idiomas, cursinhos, editoras, apps de idiomas).</li>
        <li><b>Produto próprio (onde está o dinheiro de verdade):</b> e-book "100 palavras com história", curso de redação, comunidade paga para estudantes de Letras e vestibulandos.</li>
      </ul>
      <p class="nota">Confira as regras atuais de cada programa antes de planejar: elas mudam com frequência.</p>
    </div>
  </div>
</section>`;

// calendário
const dias = Array.from({ length: 30 }, (_, i) => data.map(q => ({ q, e: q.itens[i] })));
const calendario = `
<section class="pagina">
  <div class="eyebrow mono">05 · Calendário</div>
  <h2>O mês inteiro numa olhada</h2>
  <table class="cal">
    <thead><tr><th>Dia</th>${data.map(q => `<th><span class="dot" style="--c:${q.cor}"></span>${q.hora}</th>`).join('')}</tr></thead>
    <tbody>
      ${dias.map((d, i) => `<tr><td class="mono"><a href="#dia-${i + 1}">${String(i + 1).padStart(2, '0')}</a></td>${d.map(x => `<td>${esc(x.e.t)}</td>`).join('')}</tr>`).join('')}
    </tbody>
  </table>
</section>`;

const card = (q, e, dia) => {
  const n = words(e.R);
  const seg = Math.round(n / 165 * 60);
  return `
  <article class="card" style="--c:${q.cor}">
    <header>
      <span class="chip" style="--c:${q.cor}">${q.nome}</span>
      <span class="mono meta">${q.hora} · Dia ${dia} · ${n} palavras · ≈ ${seg} s</span>
    </header>
    <h4>${esc(e.t)}</h4>
    <div class="gancho"><span class="mono lbl">GANCHO NA TELA</span>${esc(e.G)}</div>
    <div class="campo"><span class="mono lbl">ROTEIRO</span><p class="roteiro">${esc(e.R)}</p></div>
    <div class="campo"><span class="mono lbl">VISUAL</span><p>${esc(e.V)}</p></div>
    <div class="row2">
      <div class="campo"><span class="mono lbl">LEGENDA</span><p>${esc(e.L)}<br><span class="mono small">${q.tags}</span></p></div>
      <div class="campo"><span class="mono lbl">FONTE</span><p class="small">${esc(e.F)}</p></div>
    </div>
  </article>`;
};

const briefings = dias.map((d, i) => `
<section class="dia" id="dia-${i + 1}">
  <div class="dia-head">
    <span class="mono">SEMANA ${Math.floor(i / 7) + 1}</span>
    <h2>Dia ${i + 1}</h2>
  </div>
  ${d.map(x => card(x.q, x.e, i + 1)).join('')}
</section>`).join('');

const fecho = `
<section class="pagina">
  <div class="eyebrow mono">06 · Depois do mês 1</div>
  <h2>O que medir para o mês 2</h2>
  <div class="grid2">
    <div>
      <h3>Números que importam</h3>
      <ul>
        <li><b>Taxa de "assistiu em vez de deslizar"</b> (YouTube Shorts): mostra se o gancho funciona.</li>
        <li><b>Duração média da visualização:</b> mostra se o roteiro segura. Abaixo de 70% da duração, encurte.</li>
        <li><b>Compartilhamentos e salvamentos por mil visualizações:</b> é o melhor indicador de valor percebido.</li>
        <li><b>Comentários por vídeo:</b> se o "Mito ou Verdade" não for o campeão, revise as perguntas finais.</li>
      </ul>
    </div>
    <div>
      <h3>Decisões a tomar</h3>
      <ul>
        <li>Coloque os 2 quadros com melhor retenção nos horários de maior audiência.</li>
        <li>Transforme os 10 vídeos mais vistos em séries ("parte 2").</li>
        <li>Junte as perguntas dos comentários: elas viram o banco de pautas do mês 2.</li>
        <li>Lance as compilações de mais de 1 minuto para o TikTok e um vídeo longo semanal no YouTube.</li>
      </ul>
    </div>
  </div>
  <p class="nota">Identidade visual (logotipo, paleta, fontes, selos e componentes): <span class="mono">https://claude.ai/artifact/MBmJMDW9pEP1Xfmc7CnN7q</span></p>
  <p class="lead fim">Glossa · A língua por dentro.</p>
</section>`;

const css = `
@page { size: A4; margin: 16mm 15mm 16mm 15mm; }
@page :first { margin: 0; }
:root { --ink:#16161A; --paper:#FFFFFF; --muted:#6B6A66; --rule:#E4E1DA; --graphite:#111114; --cream:#F2EAD8; --amber:#E8A33D; }
* { box-sizing: border-box; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin:0; font-family: 'Archivo', 'Inter', sans-serif; color: var(--ink); background: var(--paper); font-size: 9.6pt; line-height: 1.5; }
.mono { font-family: 'IBM Plex Mono', monospace; letter-spacing: .02em; }
.small { font-size: 8pt; }
h1,h2,h3,h4 { font-family: 'DM Serif Display', Georgia, serif; font-weight: 400; margin: 0; text-wrap: balance; }
h2 { font-size: 26pt; line-height: 1.1; margin-bottom: 10pt; }
h2 em { color: #B07012; font-style: italic; }
h3 { font-size: 13pt; margin: 14pt 0 6pt; }
ul { margin: 0; padding-left: 14pt; } li { margin-bottom: 4pt; }
.eyebrow { font-size: 8pt; color: var(--muted); text-transform: uppercase; letter-spacing: .14em; margin-bottom: 6pt; }
.lead { font-size: 10.5pt; max-width: 68ch; }
.nota { font-size: 8.5pt; color: var(--muted); border-left: 2px solid var(--rule); padding-left: 8pt; margin-top: 10pt; }
.pagina { break-after: page; }
.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 18pt; }
.chip { display:inline-block; font-family:'Archivo',sans-serif; font-weight:800; font-size:7.5pt; letter-spacing:.06em; text-transform:uppercase; color:#fff; background: var(--c); padding: 2pt 6pt; border-radius: 2pt; white-space: nowrap; }
.dot { display:inline-block; width:6pt; height:6pt; border-radius:50%; background:var(--c); margin-right:3pt; vertical-align: middle; }

/* capa */
.capa { height: 297mm; width: 210mm; background: var(--graphite); color: var(--cream); padding: 22mm 20mm; display:flex; flex-direction:column; justify-content:space-between; break-after: page; position: relative; overflow: hidden; }
.capa::after { content:"γλῶσσα"; position:absolute; right:-12mm; bottom:38mm; font-family:'DM Serif Display',serif; font-size:120pt; color: rgba(242,234,216,.05); }
.capa-top, .capa-bot { font-size: 8pt; letter-spacing: .16em; color: rgba(242,234,216,.6); }
.wordmark { font-size: 96pt; line-height: .9; color: var(--cream); }
.wordmark::after { content:"."; color: var(--amber); }
.ipa { font-size: 10pt; color: rgba(242,234,216,.65); margin-bottom: 8pt; }
.tagline { font-family:'DM Serif Display',serif; font-style: italic; font-size: 20pt; margin: 8pt 0 0; color: rgba(242,234,216,.85); }
.capa-quadros { display:flex; flex-wrap:wrap; gap:6pt; }
.capa-quadros .chip { font-size: 7pt; }

.verbete { border-top: 1px solid var(--ink); border-bottom: 1px solid var(--rule); padding: 8pt 0; margin: 6pt 0 4pt; font-size: 10.5pt; max-width: 72ch; }
table { border-collapse: collapse; width: 100%; }
.kv th { text-align:left; vertical-align: top; font-weight: 700; padding: 4pt 8pt 4pt 0; width: 26%; font-size: 8.5pt; color: var(--muted); }
.kv td { padding: 4pt 0; border-bottom: 1px solid var(--rule); }
.tabela-quadros { margin-top: 8pt; }
.tabela-quadros th { text-align:left; font-size: 7.5pt; text-transform: uppercase; letter-spacing:.1em; color: var(--muted); border-bottom: 1px solid var(--ink); padding: 4pt 6pt; }
.tabela-quadros td { vertical-align: top; padding: 7pt 6pt; border-bottom: 1px solid var(--rule); }
.timeline { display:grid; grid-template-columns: repeat(4,1fr); gap: 10pt; margin: 8pt 0 6pt; }
.timeline > div { border-top: 3px solid var(--ink); padding-top: 6pt; }
.timeline span { font-size: 8pt; color: var(--muted); display:block; }
.timeline b { font-family:'DM Serif Display',serif; font-weight:400; font-size: 13pt; display:block; margin: 2pt 0; }
.timeline p { margin: 0; font-size: 8.8pt; }

.cal { font-size: 6.6pt; line-height: 1.25; table-layout: fixed; }
.cal th { font-size: 7pt; text-align:left; border-bottom: 1px solid var(--ink); padding: 3pt 3pt; }
.cal th:first-child, .cal td:first-child { width: 6%; }
.cal td { border-bottom: 1px solid var(--rule); padding: 2.6pt 3pt; vertical-align: top; }
.cal a { color: inherit; text-decoration: none; font-weight: 600; }

/* dias */
.dia { break-before: page; }
.dia-head { display:flex; align-items: baseline; justify-content: space-between; border-bottom: 2px solid var(--ink); padding-bottom: 4pt; margin-bottom: 10pt; }
.dia-head h2 { font-size: 30pt; margin: 0; }
.dia-head span { font-size: 8pt; letter-spacing: .16em; color: var(--muted); }
.card { break-inside: avoid; border-left: 3px solid var(--c); padding: 2pt 0 2pt 10pt; margin-bottom: 14pt; }
.card header { display:flex; justify-content: space-between; align-items:center; gap: 8pt; }
.card .meta { font-size: 7.5pt; color: var(--muted); }
.card h4 { font-size: 15pt; margin: 4pt 0 5pt; line-height: 1.15; }
.gancho { font-family:'Archivo',sans-serif; font-weight: 800; font-size: 11pt; letter-spacing: .01em; background: var(--graphite); color: var(--cream); padding: 5pt 8pt; margin-bottom: 6pt; }
.gancho .lbl { color: rgba(242,234,216,.55); margin-right: 8pt; }
.lbl { font-size: 6.8pt; letter-spacing: .14em; color: var(--muted); display: inline-block; }
.campo p { margin: 1pt 0 5pt; }
.roteiro { font-size: 10pt; line-height: 1.55; }
.row2 { display:grid; grid-template-columns: 1fr 1fr; gap: 12pt; }
.fim { font-family:'DM Serif Display',serif; font-style: italic; font-size: 16pt; margin-top: 30pt; }
`;

const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<title>Glossa · Plano editorial · Mês 1</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;600;700;800&family=DM+Serif+Display:ital@0;1&family=IBM+Plex+Mono:wght@400;600&display=swap" rel="stylesheet">
<style>${css}</style></head><body>
${capa}${canal}${quadros}${formula}${producao}${calendario}${briefings}${fecho}
</body></html>`;

(async () => {
  const outHtml = path.join(ROOT, 'build', 'plano-mensal.html');
  fs.writeFileSync(outHtml, html);
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('file://' + outHtml, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const fontsOk = await page.evaluate(() => ['DM Serif Display', 'Archivo', 'IBM Plex Mono'].map(f => f + ':' + document.fonts.check(`12px "${f}"`)));
  console.log('fontes', fontsOk.join(' '));
  const out = path.join(ROOT, 'Glossa-Plano-Editorial-Mes-1.pdf');
  await page.pdf({
    path: out, format: 'A4', printBackground: true, preferCSSPageSize: true,
    displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate: '<div style="width:100%;font-family:monospace;font-size:7px;color:#8a877f;padding:0 15mm;display:flex;justify-content:space-between"><span>GLOSSA · PLANO EDITORIAL · MÊS 1</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>',
  });
  await browser.close();
  console.log('PDF:', out);
})();
