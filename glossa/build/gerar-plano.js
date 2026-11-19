// Gera o plano editorial do Glossa (mês 1) em PDF.
// Fontes: conteudo/*.txt (fatos, visual, legenda, fonte por quadro)
//         conteudo/semanas/*.txt (ordem dos dias, formatos, termos, roteiros conectados)
// Uso: node build/gerar-plano.js   (a partir da pasta glossa/)
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const C = path.join(ROOT, 'conteudo');
const ART = 'https://claude.ai/artifact/MBmJMDW9pEP1Xfmc7CnN7q';
const DIAS_SEMANA = ['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo'];

const QUADROS = {
  A: { file: '1-de-onde-vem.txt', nome: 'De Onde Vem?', hora: '07h', cor: '#C47F14', tags: '#etimologia #origemdaspalavras #curiosidades #glossa', obj: 'A origem escondida de palavras do dia a dia. Introduz os termos de etimologia e semântica histórica.' },
  B: { file: '2-aula-de-letras.txt', nome: 'Aula de Letras', hora: '10h', cor: '#5E5A52', tags: '#letras #linguistica #portugues #enem', obj: 'O "Curso de Letras em 30 aulas": uma aula por dia, em módulos, com revisão aos domingos.' },
  C: { file: '3-mito-ou-verdade.txt', nome: 'Mito ou Verdade', hora: '12h', cor: '#C13B37', tags: '#mitoouverdade #curiosidades #linguistica #glossa', obj: 'Desmonta lendas. Formatos de julgamento e detetive. Gera debate nos comentários.' },
  D: { file: '4-linguas-extremas.txt', nome: 'Línguas Extremas', hora: '15h', cor: '#A9820F', tags: '#idiomas #linguas #curiosidades #glossa', obj: 'As línguas mais surpreendentes do planeta, sempre ligadas ao conceito do dia.' },
  E: { file: '5-brasil-falado.txt', nome: 'Brasil Falado', hora: '18h', cor: '#2E8A57', tags: '#portuguesbrasileiro #sotaque #brasil #glossa', obj: 'O conceito do dia aplicado ao português do Brasil: sotaques, tupi, África, Libras.' },
  F: { file: '6-linguas-primas.txt', nome: 'Línguas Primas', hora: '20h', cor: '#2F6FB5', tags: '#idiomas #linguistica #aprenderidiomas #glossa', obj: 'Parentesco, empréstimos e leis de mudança: o método comparativo em ação.' },
  G: { file: '7-genios.txt', nome: 'Gênios da Linguística', hora: '22h', cor: '#7A4FB5', tags: '#historia #linguistica #letras #glossa', obj: 'Quem descobriu o que foi visto no dia. Fecha o dia e anuncia o próximo.' },
};
const ORDEM = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

const FORMATOS = {
  'REVELAÇÃO': 'Gancho surpreendente → explicação → virada ("e tem mais"). O formato-base.',
  'QUIZ': 'Pergunta com alternativas na tela, 3 s para o espectador responder, depois a resposta. Gera comentários.',
  'DESAFIO': 'Convida o espectador a tentar algo (achar a regra, pronunciar, adivinhar) antes da resposta.',
  'CONTAGEM': 'Lista regressiva (5 → 1). Prende até o número 1.',
  'LINHA DO TEMPO': 'Datas em sequência, com o ano no canto da tela. Ideal para origens e descobertas.',
  'CENA': 'Abre em segunda pessoa, num lugar e numa época ("Roma, 63 a.C. Você…"). Imersão.',
  'COMPARATIVO': 'X contra Y em tela dividida. Ideal para pares de conceitos.',
  'DESMONTE': 'Desmonta uma palavra ou frase em peças coloridas, como Lego.',
  'JULGAMENTO': 'Acusação, defesa e veredito com martelo. Exclusivo do Mito ou Verdade.',
  'DETETIVE': 'Pistas numeradas num quadro de cortiça e conclusão. Para etimologias e mistérios.',
  'PARTE 1/2': 'Episódio duplo no mesmo dia: a parte 1 termina com um gancho para a parte 2.',
  'PARTE 2/2': 'Começa resumindo a parte 1 em uma frase e entrega a resposta.',
  'REVISÃO': 'Domingo: o conteúdo do vídeo + um teste com termos da semana.',
};

// ---------- leitura ----------
function parseBlocos(txt) {
  return txt.split(/^## /m).slice(1).map(b => {
    const lines = b.split('\n');
    const e = { key: lines[0].trim() };
    for (const l of lines.slice(1)) {
      const m = l.match(/^(FMT|V\+|[GRVLFTP]): (.*)$/);
      if (m) e[m[1]] = m[2].trim();
    }
    return e;
  });
}
const base = {};
for (const q of ORDEM) {
  parseBlocos(fs.readFileSync(path.join(C, QUADROS[q].file), 'utf8')).forEach((e, i) => { base[q + (i + 1)] = e; });
}
const dias = [];
for (const f of ['semana-1.txt', 'semana-2.txt', 'semana-3.txt', 'semana-4.txt', 'final.txt']) {
  const txt = fs.readFileSync(path.join(C, 'semanas', f), 'utf8');
  for (const parte of txt.split(/^# DIA /m).slice(1)) {
    const [head] = parte.split('\n');
    const [n, tema, fio] = head.split('|').map(s => s.trim());
    const vids = parseBlocos(parte).map(v => {
      const b = base[v.key];
      if (!b) throw new Error('ID desconhecido: ' + v.key);
      return { id: v.key, q: v.key[0], titulo: b.key, G: v.G || b.G, R: v.R, V: b.V + (v['V+'] ? ' ▸ ' + v['V+'] : ''), L: v.L || b.L, F: b.F, FMT: v.FMT, T: v.T, P: v.P || '' };
    });
    if (vids.map(v => v.q).join('') !== ORDEM.join('')) throw new Error(`Dia ${n}: ordem de quadros errada`);
    vids.forEach(v => { for (const k of ['R', 'FMT', 'T']) if (!v[k]) throw new Error(`${v.id} sem ${k}`); if (!FORMATOS[v.FMT]) throw new Error(`${v.id}: formato ${v.FMT}`); });
    dias.push({ n: +n, tema, fio, vids });
  }
}
if (dias.length !== 30) throw new Error('dias: ' + dias.length);
const usados = new Set(dias.flatMap(d => d.vids.map(v => v.id)));
if (usados.size !== 210) throw new Error('vídeos únicos: ' + usados.size);

// glossário: número na 1ª aparição, revisão nas seguintes
const glos = new Map();
const todos = dias.flatMap(d => d.vids.map(v => ({ ...v, dia: d.n })));
todos.forEach((v, i) => {
  const k = v.T.toLowerCase();
  if (!glos.has(k)) { glos.set(k, { n: glos.size + 1, termo: v.T, dia: v.dia, q: v.q, titulo: v.titulo, vezes: 1 }); v.glos = { n: glos.get(k).n, novo: true }; }
  else { const g = glos.get(k); g.vezes++; v.glos = { n: g.n, novo: false }; }
  v.prox = todos[i + 1] ? { t: todos[i + 1].titulo, h: QUADROS[todos[i + 1].q].hora, amanha: todos[i + 1].dia !== v.dia } : null;
});
const porDia = n => todos.filter(v => v.dia === n);

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const words = s => s.split(/\s+/).filter(Boolean).length;
const semanaNome = n => n <= 7 ? 'Semana 1 · Toda palavra tem uma história' : n <= 14 ? 'Semana 2 · O som e a escrita' : n <= 21 ? 'Semana 3 · Famílias, viagens e encontros' : n <= 28 ? 'Semana 4 · Língua, pensamento e sociedade' : 'Grande final · A língua viva';
const contFmt = {}; todos.forEach(v => { contFmt[v.FMT] = (contFmt[v.FMT] || 0) + 1; });

// ---------- páginas ----------
const capa = `
<section class="capa">
  <div class="capa-top mono">PLANO EDITORIAL · MÊS 1 · 210 ROTEIROS CONECTADOS</div>
  <div class="capa-mid">
    <div class="ipa mono">/ˈɡlɔs.sa/ · γλῶσσα · substantivo feminino</div>
    <h1 class="wordmark">Glossa</h1>
    <p class="tagline">A língua por dentro.</p>
  </div>
  <div class="capa-quadros">${ORDEM.map(q => `<span class="chip" style="--c:${QUADROS[q].cor}">${QUADROS[q].nome}</span>`).join('')}</div>
  <div class="capa-bot mono">Canal dark de linguística e Letras · YouTube Shorts · Instagram Reels · TikTok · 7 vídeos por dia</div>
</section>`;

const canal = `
<section class="pagina">
  <div class="eyebrow mono">01 · O canal</div>
  <h2>Por que <em>Glossa</em></h2>
  <div class="verbete"><p><b>glossa</b> <span class="mono">/ˈɡlɔs.sa/</span> s.f. Do grego <i>glôssa</i>, que significa ao mesmo tempo <b>o órgão da boca</b> e <b>o idioma</b>, a mesma ambiguidade da palavra portuguesa "língua". É raiz de <i>glossário</i>, <i>glote</i>, <i>poliglota</i> e <i>isoglossa</i>, a linha que, nos atlas linguísticos, separa duas formas de falar.</p></div>
  <div class="grid2">
    <div>
      <h3>Por que funciona</h3>
      <ul>
        <li><b>É curto e soa como marca:</b> 6 letras, sem acento e sem hífen.</li>
        <li><b>Funciona em dois níveis:</b> é misterioso para o público geral e uma piscadela para quem fez Letras.</li>
        <li><b>Cobre o canal inteiro,</b> da etimologia à sociolinguística.</li>
        <li><b>Combina com o "Glossário Glossa":</b> o sistema de termos numerados que atravessa o mês (página 04).</li>
      </ul>
    </div>
    <div>
      <h3>Kit de perfil</h3>
      <table class="kv">
        <tr><th>Assinatura</th><td>A língua por dentro.</td></tr>
        <tr><th>@ sugeridos</th><td><span class="mono">@glossa · @glossa.br · @canalglossa</span><br><small>Verifique a disponibilidade e registre o mesmo @ nas três redes.</small></td></tr>
        <tr><th>Bio</th><td>Etimologia, linguística e o curso de Letras em 40 segundos. Vídeos todo dia, das 7h às 22h.</td></tr>
        <tr><th>Identidade</th><td><span class="mono small">${ART}</span></td></tr>
      </table>
    </div>
  </div>
  <h3>Posicionamento</h3>
  <p class="lead">O "professor de Letras que todo mundo queria ter": sem rosto, rápido, preciso. A promessa é: <b>em 40 segundos você aprende uma coisa que vai contar para alguém hoje, e em 30 dias sai sabendo o básico de um curso de Letras.</b> Cada vídeo funciona sozinho, mas quem acompanha percebe uma história maior.</p>
</section>`;

const arquitetura = `
<section class="pagina">
  <div class="eyebrow mono">02 · Arquitetura do mês</div>
  <h2>Um mês que conta uma história</h2>
  <p class="lead">Os 210 vídeos não são aleatórios. Estão organizados em três camadas que se encaixam: <b>arco da semana → fio do dia → vídeo</b>.</p>
  <table class="tabela-quadros">
    <thead><tr><th>Bloco</th><th>Dias</th><th>Arco</th><th>Módulo do Curso de Letras (10h)</th></tr></thead>
    <tbody>
      <tr><td><b>Semana 1</b></td><td class="mono">1–7</td><td>Toda palavra tem uma história: signo, mudança de sentido, empréstimo, etimologia popular.</td><td>Semiótica e semântica lexical (aulas 1–7)</td></tr>
      <tr><td><b>Semana 2</b></td><td class="mono">8–14</td><td>O som e a escrita: fonema, sotaque, leis fonéticas, invenção e decifração de escritas.</td><td>Fonética, fonologia e morfologia (aulas 8–14)</td></tr>
      <tr><td><b>Semana 3</b></td><td class="mono">15–21</td><td>Famílias, viagens e encontros: tupi, África, crioulos, latim vulgar, português pelo mundo.</td><td>Linguística textual: cotexto, dêixis, coesão (aulas 15–21)</td></tr>
      <tr><td><b>Semana 4</b></td><td class="mono">22–28</td><td>Língua, pensamento e sociedade: Whorf, pragmática, variação, norma, identidade.</td><td>Pragmática, sociolinguística e estilística (aulas 22–28)</td></tr>
      <tr><td><b>Final</b></td><td class="mono">29–30</td><td>Línguas que morrem e línguas que nascem. O último vídeo fecha a pergunta de Chomsky.</td><td>Revisão geral (aulas 29–30)</td></tr>
    </tbody>
  </table>
  <div class="grid2">
    <div>
      <h3>Como os vídeos se conectam</h3>
      <ul>
        <li><b>Fio do dia:</b> os 7 vídeos giram em torno de uma ideia. O das 22h fecha o dia e anuncia o das 7h seguinte.</li>
        <li><b>Callback:</b> no máximo uma frase que lembra um vídeo anterior ("lembra do 'você' que era Vossa Mercê?"). O vídeo continua compreensível para quem não viu o anterior.</li>
        <li><b>Teaser:</b> alguns vídeos anunciam o próximo ("às 15h, uma palavra que vai te deixar sem ar"). O cartão final de todo vídeo mostra o próximo título.</li>
        <li><b>Episódios duplos:</b> 4 pares (dias 7, 14, 20 e 25), com a parte 1 ao meio-dia e a parte 2 às 15h ou às 22h do mesmo dia.</li>
        <li><b>Arcos longos:</b> gramaticalização ("você", dia 1 → "a gente", dia 22), etimologia popular (forró, dia 1 → "cuspido e escarrado", dia 29), minissérie dos dicionários (dias 2 a 7), morte e renascimento de línguas (dias 15 → 30).</li>
      </ul>
    </div>
    <div>
      <h3>Por que isso dá mais visualização</h3>
      <ul>
        <li><b>Maratona:</b> quem gosta de um vídeo encontra o próximo no cartão final e no comentário fixado, o que aumenta o tempo no canal.</li>
        <li><b>Hábito:</b> horário fixo por quadro + "Curso de Letras em 30 aulas" cria um compromisso diário.</li>
        <li><b>Comentários:</b> quizzes, desafios e testes de domingo pedem resposta.</li>
        <li><b>Recompensa para quem acompanha:</b> os callbacks fazem o fã se sentir "de dentro".</li>
        <li><b>Playlists prontas:</b> cada quadro, cada semana e o Curso de Letras viram playlists.</li>
      </ul>
    </div>
  </div>
</section>`;

const formatos = `
<section class="pagina">
  <div class="eyebrow mono">03 · Variação</div>
  <h2>13 formatos para nenhum dia ficar igual</h2>
  <p class="lead">Cada dia mistura pelo menos 4 formatos diferentes, e o mesmo quadro alterna de formato de um dia para o outro. Assim o algoritmo, e o espectador, nunca veem o mesmo vídeo duas vezes.</p>
  <table class="tabela-quadros">
    <thead><tr><th>Formato</th><th>Como funciona</th><th>Vídeos</th></tr></thead>
    <tbody>${Object.entries(FORMATOS).map(([k, d]) => `<tr><td><span class="fmt">${k}</span></td><td>${d}</td><td class="mono">${contFmt[k] || 0}</td></tr>`).join('')}</tbody>
  </table>
  <h3>A estrutura que não muda</h3>
  <div class="timeline">
    <div><span class="mono">0–1,5 s</span><b>Gancho</b><p>A frase mais forte vem primeiro, na voz e na tela.</p></div>
    <div><span class="mono">1,5–8 s</span><b>Promessa</b><p>Situe: onde, quando, quem, ou a pergunta do quiz.</p></div>
    <div><span class="mono">8–35 s</span><b>Corpo + virada</b><p>Uma ideia por frase. O termo técnico vem traduzido na mesma frase.</p></div>
    <div><span class="mono">35–45 s</span><b>Ponte</b><p>Callback, teaser do próximo ou pergunta para comentar.</p></div>
  </div>
</section>`;

const glossario = `
<section class="pagina">
  <div class="eyebrow mono">04 · Glossário Glossa</div>
  <h2>O espectador sai do mês com ${glos.size} termos</h2>
  <p class="lead">Cada vídeo ensina um termo técnico. Na primeira aparição, o termo ganha um número fixo, que aparece num selo no canto do vídeo ("termo nº 12"). Quando o termo volta, o selo muda para "revisão · nº 12". É repetição espaçada, a técnica de memorização mais eficiente que existe, disfarçada de entretenimento.</p>
  <ul class="nota-lista">
    <li><b>Destaques do Instagram e playlist do YouTube:</b> "Glossário Glossa", atualizado toda semana.</li>
    <li><b>Domingo:</b> os vídeos de revisão testam os termos da semana.</li>
    <li><b>Produto futuro:</b> o glossário completo vira e-book ou material para quem estuda para o ENEM e para Letras.</li>
  </ul>
  <p class="nota">A lista completa, com o dia em que cada termo aparece, está no apêndice no fim deste documento.</p>
</section>`;

const producao = `
<section class="pagina">
  <div class="eyebrow mono">05 · Operação</div>
  <h2>Como produzir 49 vídeos por semana</h2>
  <table class="tabela-quadros">
    <thead><tr><th>Etapa</th><th>Quando</th><th>O que fazer</th></tr></thead>
    <tbody>
      <tr><td><b>1. Checagem</b></td><td>Segunda</td><td>Confirme os 49 fatos da semana na fonte indicada em cada briefing. Use a IA para escrever, nunca para confirmar fatos.</td></tr>
      <tr><td><b>2. Narração</b></td><td>Segunda</td><td>Grave ou gere os 49 áudios com a mesma voz. Revise nomes estrangeiros e símbolos fonéticos.</td></tr>
      <tr><td><b>3. Templates por formato</b></td><td>Uma vez</td><td>Crie um template de edição para cada formato (quiz, julgamento, detetive…). Com 13 templates prontos, a edição vira encaixe.</td></tr>
      <tr><td><b>4. Edição</b></td><td>Terça a quinta</td><td>Monte cada vídeo no template do formato + selo do quadro + selo do glossário + cartão final "a seguir".</td></tr>
      <tr><td><b>5. Agendamento</b></td><td>Sexta</td><td>Agende nas ferramentas nativas de cada rede. No comentário fixado: fonte + link do vídeo citado no callback.</td></tr>
      <tr><td><b>6. Comunidade</b></td><td>Diário</td><td>Responda os quizzes e desafios nos comentários (a resposta certa fixada vira um novo engajamento).</td></tr>
    </tbody>
  </table>
  <div class="grid2">
    <div>
      <h3>Riscos</h3>
      <ul>
        <li><b>Conteúdo repetitivo (YouTube):</b> os formatos variados e o roteiro original protegem o canal da regra contra conteúdo "inautêntico".</li>
        <li><b>Callbacks:</b> o vídeo precisa ser compreensível sem o anterior. Por isso o callback ocupa no máximo uma frase.</li>
        <li><b>IA:</b> sinalize imagens realistas geradas por IA.</li>
        <li><b>Erros:</b> corrija no comentário fixado e agradeça a quem apontou.</li>
      </ul>
    </div>
    <div>
      <h3>Monetização</h3>
      <ul>
        <li><b>YouTube:</b> receita dos Shorts com 1.000 inscritos + 10 milhões de visualizações em 90 dias.</li>
        <li><b>TikTok:</b> só paga vídeos com mais de 1 minuto. Os episódios duplos e a semana do curso viram compilações.</li>
        <li><b>Produto próprio:</b> e-book do Glossário, "Curso de Letras em 30 aulas" em versão estendida, comunidade para vestibulandos.</li>
      </ul>
      <p class="nota">Confira as regras atuais de cada programa antes de planejar.</p>
    </div>
  </div>
</section>`;

const calendario = `
<section class="pagina">
  <div class="eyebrow mono">06 · Calendário</div>
  <h2>O mês inteiro numa olhada</h2>
  <table class="cal">
    <thead><tr><th>Dia</th><th>Fio do dia</th>${ORDEM.map(q => `<th><span class="dot" style="--c:${QUADROS[q].cor}"></span>${QUADROS[q].hora}</th>`).join('')}</tr></thead>
    <tbody>${dias.map(d => `<tr${d.n % 7 === 0 ? ' class="dom"' : ''}><td class="mono"><a href="#dia-${d.n}">${String(d.n).padStart(2, '0')}</a></td><td><b>${esc(d.tema)}</b></td>${porDia(d.n).map(v => `<td>${esc(v.titulo)}<br><span class="mono fmtmini">${v.FMT}</span></td>`).join('')}</tr>`).join('')}</tbody>
  </table>
</section>`;

const card = v => {
  const q = QUADROS[v.q]; const n = words(v.R); const seg = Math.round(n / 165 * 60);
  const prox = v.prox ? `${v.prox.amanha ? 'Amanhã, ' : ''}${v.prox.h}: ${esc(v.prox.t)}` : 'Fim do mês 1';
  return `
  <article class="card" style="--c:${q.cor}">
    <header>
      <span><span class="chip" style="--c:${q.cor}">${q.nome}</span> <span class="fmt">${v.FMT}</span></span>
      <span class="mono meta">${q.hora} · ${n} palavras · ≈ ${seg} s</span>
    </header>
    <h4>${esc(v.titulo)}</h4>
    <div class="glos mono">${v.glos.novo ? `TERMO Nº ${v.glos.n}` : `REVISÃO · Nº ${v.glos.n}`} · ${esc(v.T)}</div>
    <div class="gancho"><span class="mono lbl">GANCHO NA TELA</span>${esc(v.G)}</div>
    <div class="campo"><span class="mono lbl">ROTEIRO</span><p class="roteiro">${esc(v.R)}</p></div>
    <div class="campo"><span class="mono lbl">VISUAL</span><p>${esc(v.V)}</p></div>
    <div class="row2">
      <div class="campo"><span class="mono lbl">CONEXÕES</span><p class="small">${v.P ? esc(v.P) + '<br>' : ''}<b>Cartão final:</b> a seguir, ${prox}</p></div>
      <div class="campo"><span class="mono lbl">LEGENDA</span><p class="small">${esc(v.L)}<br><span class="mono">${q.tags}</span></p></div>
    </div>
    <div class="campo"><span class="mono lbl">FONTE (CONFERIR ANTES DE GRAVAR)</span><p class="small">${esc(v.F)}</p></div>
  </article>`;
};

const briefings = dias.map(d => `
<section class="dia" id="dia-${d.n}">
  <div class="dia-head">
    <div><span class="mono">${esc(semanaNome(d.n)).toUpperCase()} · ${DIAS_SEMANA[(d.n - 1) % 7].toUpperCase()}</span><h2>Dia ${d.n} · ${esc(d.tema)}</h2></div>
  </div>
  <p class="fio">${esc(d.fio)}</p>
  ${porDia(d.n).map(card).join('')}
</section>`).join('');

const apendice = `
<section class="dia">
  <div class="eyebrow mono">Apêndice</div>
  <h2>Glossário Glossa completo</h2>
  <table class="glos-tab">
    <thead><tr><th>Nº</th><th>Termo</th><th>Estreia</th><th>Vídeo</th><th>Aparições</th></tr></thead>
    <tbody>${[...glos.values()].map(g => `<tr><td class="mono">${g.n}</td><td><b>${esc(g.termo)}</b></td><td class="mono">Dia ${g.dia}</td><td>${esc(g.titulo)}</td><td class="mono">${g.vezes}</td></tr>`).join('')}</tbody>
  </table>
  <p class="nota">Identidade visual (logotipo, paleta, fontes, selos e componentes): <span class="mono">${ART}</span></p>
  <p class="lead fim">Glossa · A língua por dentro.</p>
</section>`;

const css = `
@page { size: A4; margin: 16mm 15mm 16mm 15mm; }
@page :first { margin: 0; }
:root { --ink:#16161A; --muted:#6B6A66; --rule:#E4E1DA; --graphite:#111114; --cream:#F2EAD8; --amber:#E8A33D; }
* { box-sizing: border-box; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin:0; font-family: 'Archivo', 'Inter', sans-serif; color: var(--ink); background:#fff; font-size: 9.6pt; line-height: 1.5; }
.mono { font-family: 'IBM Plex Mono', monospace; letter-spacing: .02em; }
.small { font-size: 8pt; }
h1,h2,h3,h4 { font-family: 'DM Serif Display', Georgia, serif; font-weight: 400; margin: 0; text-wrap: balance; }
h2 { font-size: 24pt; line-height: 1.1; margin-bottom: 10pt; }
h2 em { color: #B07012; font-style: italic; }
h3 { font-size: 13pt; margin: 14pt 0 6pt; }
ul { margin: 0; padding-left: 14pt; } li { margin-bottom: 4pt; }
.eyebrow { font-size: 8pt; color: var(--muted); text-transform: uppercase; letter-spacing: .14em; margin-bottom: 6pt; }
.lead { font-size: 10.5pt; max-width: 70ch; }
.nota { font-size: 8.5pt; color: var(--muted); border-left: 2px solid var(--rule); padding-left: 8pt; margin-top: 10pt; }
.nota-lista { margin-top: 8pt; }
.pagina { break-after: page; }
.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 18pt; }
.chip { display:inline-block; font-weight:800; font-size:7.5pt; letter-spacing:.06em; text-transform:uppercase; color:#fff; background: var(--c); padding: 2pt 6pt; border-radius: 2pt; white-space: nowrap; }
.fmt { display:inline-block; font-family:'IBM Plex Mono',monospace; font-size:7pt; letter-spacing:.08em; border:1px solid var(--ink); padding: 1pt 5pt; border-radius: 2pt; white-space: nowrap; }
.dot { display:inline-block; width:6pt; height:6pt; border-radius:50%; background:var(--c); margin-right:3pt; vertical-align: middle; }
.capa { height: 297mm; width: 210mm; background: var(--graphite); color: var(--cream); padding: 22mm 20mm; display:flex; flex-direction:column; justify-content:space-between; break-after: page; position: relative; overflow: hidden; }
.capa::after { content:"γλῶσσα"; position:absolute; right:-12mm; bottom:38mm; font-family:'DM Serif Display',serif; font-size:120pt; color: rgba(242,234,216,.05); }
.capa-top, .capa-bot { font-size: 8pt; letter-spacing: .16em; color: rgba(242,234,216,.6); }
.wordmark { font-size: 96pt; line-height: .9; color: var(--cream); }
.wordmark::after { content:"."; color: var(--amber); }
.ipa { font-size: 10pt; color: rgba(242,234,216,.65); margin-bottom: 8pt; }
.tagline { font-family:'DM Serif Display',serif; font-style: italic; font-size: 20pt; margin: 8pt 0 0; color: rgba(242,234,216,.85); }
.capa-quadros { display:flex; flex-wrap:wrap; gap:6pt; }
.verbete { border-top: 1px solid var(--ink); border-bottom: 1px solid var(--rule); padding: 8pt 0; margin: 6pt 0 4pt; font-size: 10.5pt; max-width: 72ch; }
table { border-collapse: collapse; width: 100%; }
.kv th { text-align:left; vertical-align: top; font-weight: 700; padding: 4pt 8pt 4pt 0; width: 26%; font-size: 8.5pt; color: var(--muted); }
.kv td { padding: 4pt 0; border-bottom: 1px solid var(--rule); }
.tabela-quadros { margin-top: 8pt; }
.tabela-quadros th { text-align:left; font-size: 7.5pt; text-transform: uppercase; letter-spacing:.1em; color: var(--muted); border-bottom: 1px solid var(--ink); padding: 4pt 6pt; }
.tabela-quadros td { vertical-align: top; padding: 6pt 6pt; border-bottom: 1px solid var(--rule); }
.timeline { display:grid; grid-template-columns: repeat(4,1fr); gap: 10pt; margin: 8pt 0 6pt; }
.timeline > div { border-top: 3px solid var(--ink); padding-top: 6pt; }
.timeline span { font-size: 8pt; color: var(--muted); display:block; }
.timeline b { font-family:'DM Serif Display',serif; font-weight:400; font-size: 13pt; display:block; margin: 2pt 0; }
.timeline p { margin: 0; font-size: 8.8pt; }
.cal { font-size: 6pt; line-height: 1.2; table-layout: fixed; }
.cal th { font-size: 6.5pt; text-align:left; border-bottom: 1px solid var(--ink); padding: 3pt 2pt; }
.cal th:first-child { width: 4%; } .cal th:nth-child(2) { width: 11%; }
.cal td { border-bottom: 1px solid var(--rule); padding: 2.4pt 2pt; vertical-align: top; }
.cal tr.dom td { background: #F5F3EE; }
.cal a { color: inherit; text-decoration: none; font-weight: 600; }
.fmtmini { font-size: 5pt; color: var(--muted); }
.dia { break-before: page; }
.dia-head { border-bottom: 2px solid var(--ink); padding-bottom: 4pt; margin-bottom: 4pt; }
.dia-head h2 { font-size: 24pt; margin: 2pt 0 0; }
.dia-head span { font-size: 7.5pt; letter-spacing: .14em; color: var(--muted); }
.fio { font-family:'DM Serif Display',serif; font-style: italic; font-size: 12pt; color: #3a3935; margin: 4pt 0 12pt; }
.card { break-inside: avoid; border-left: 3px solid var(--c); padding: 2pt 0 2pt 10pt; margin-bottom: 14pt; }
.card header { display:flex; justify-content: space-between; align-items:center; gap: 8pt; }
.card .meta { font-size: 7.5pt; color: var(--muted); }
.card h4 { font-size: 15pt; margin: 4pt 0 2pt; line-height: 1.15; }
.glos { font-size: 7pt; letter-spacing: .1em; color: var(--c); margin-bottom: 5pt; font-weight: 600; }
.gancho { font-weight: 800; font-size: 11pt; background: var(--graphite); color: var(--cream); padding: 5pt 8pt; margin-bottom: 6pt; }
.gancho .lbl { color: rgba(242,234,216,.55); margin-right: 8pt; }
.lbl { font-size: 6.8pt; letter-spacing: .14em; color: var(--muted); display: inline-block; }
.campo p { margin: 1pt 0 5pt; }
.roteiro { font-size: 10pt; line-height: 1.55; }
.row2 { display:grid; grid-template-columns: 1fr 1fr; gap: 12pt; }
.glos-tab { font-size: 8pt; }
.glos-tab th { text-align:left; font-size: 7pt; text-transform: uppercase; letter-spacing:.1em; color: var(--muted); border-bottom: 1px solid var(--ink); padding: 3pt 4pt; }
.glos-tab td { border-bottom: 1px solid var(--rule); padding: 2.5pt 4pt; }
.fim { font-family:'DM Serif Display',serif; font-style: italic; font-size: 16pt; margin-top: 30pt; }
`;

const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Glossa · Plano editorial · Mês 1</title>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;600;700;800&family=DM+Serif+Display:ital@0;1&family=IBM+Plex+Mono:wght@400;600&display=swap" rel="stylesheet">
<style>${css}</style></head><body>${capa}${canal}${arquitetura}${formatos}${glossario}${producao}${calendario}${briefings}${apendice}</body></html>`;

(async () => {
  const outHtml = path.join(ROOT, 'build', 'plano-mensal.html');
  fs.writeFileSync(outHtml, html);
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('file://' + outHtml, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const out = path.join(ROOT, 'Glossa-Plano-Editorial-Mes-1.pdf');
  await page.pdf({ path: out, format: 'A4', printBackground: true, preferCSSPageSize: true, displayHeaderFooter: true, headerTemplate: '<span></span>',
    footerTemplate: '<div style="width:100%;font-family:monospace;font-size:7px;color:#8a877f;padding:0 15mm;display:flex;justify-content:space-between"><span>GLOSSA · PLANO EDITORIAL · MÊS 1</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>' });
  await browser.close();
  const pal = todos.map(v => words(v.R));
  console.log(`PDF: ${out}\nvídeos ${todos.length} · termos ${glos.size} · palavras/roteiro min ${Math.min(...pal)} máx ${Math.max(...pal)} média ${Math.round(pal.reduce((a, b) => a + b) / pal.length)}`);
  console.log('formatos', JSON.stringify(contFmt));
})();
