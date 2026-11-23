// Gera o Guia de Publicação do Glossa (PDF). Uso: node guia/gerar-guia.js (a partir de glossa/)
const fs = require('fs');
const path = require('path');
const E = path.join(__dirname, '..', 'estudio');
const { chromium } = require(path.join(E, 'node_modules', 'playwright'));
const { lista } = require(path.join(E, 'plano.js'));
const { creditoTexto } = require(path.join(E, 'trilhas.js'));
const F = 'file://' + path.join(E, 'node_modules', '@fontsource');

const TAGS = {
  A: ['#etimologia', '#curiosidades', '#portugues', '#origemdaspalavras', '#glossa'],
  B: ['#letras', '#linguistica', '#portugues', '#enem', '#glossa'],
  C: ['#mitoouverdade', '#curiosidades', '#linguistica', '#portugues', '#glossa'],
  D: ['#idiomas', '#linguas', '#curiosidades', '#mundo', '#glossa'],
  E: ['#portuguesbrasileiro', '#sotaque', '#brasil', '#linguistica', '#glossa'],
  F: ['#idiomas', '#aprenderidiomas', '#linguistica', '#etimologia', '#glossa'],
  G: ['#historia', '#linguistica', '#letras', '#ciencia', '#glossa'],
};
// CTAs da semana 1 (dos roteiros do estúdio)
const ctas = {};
for (const f of fs.readdirSync(path.join(E, 'roteiros')).filter(f => /^dia-\d+\.js$/.test(f)))
  for (const v of require(path.join(E, 'roteiros', f))) ctas[v.id] = v.cta;
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const semana1 = lista.filter(v => v.dia <= 7);

const posts = semana1.map(v => {
  const tags = TAGS[v.q];
  const prox = v.prox ? `${v.prox.amanha ? 'Amanhã' : 'Hoje'}, ${v.prox.hora}: ${v.prox.titulo}` : '';
  const cta = ctas[v.id] ? ctas[v.id].fala : '';
  return `<div class="post"><div class="post-h"><span class="mono">DIA ${v.dia} · ${v.hora} · ${v.id}</span><b>${esc(v.titulo)}</b></div>
  <table class="kv">
   <tr><th>YouTube · título</th><td>${esc(v.titulo)} ${tags.slice(0, 2).join(' ')} #shorts</td></tr>
   <tr><th>YouTube · descrição</th><td>${esc(v.legenda)}<br>Fonte: ${esc(v.fonte)}<br>${esc(creditoTexto(v))}<br>${tags.slice(0, 3).join(' ')}</td></tr>
   <tr><th>Instagram · legenda</th><td>${esc(v.gancho.replace(/<[^>]+>/g, ''))}<br>${esc(v.legenda)}<br>${esc(cta)}<br>${tags.slice(0, 4).join(' ')}</td></tr>
   <tr><th>TikTok · legenda</th><td>${esc(v.titulo)}: ${esc(v.legenda)} ${tags.join(' ')}</td></tr>
   <tr><th>Comentário fixado</th><td>📚 Fonte: ${esc(v.fonte)}${prox ? `<br>▶ ${esc(prox)}` : ''}</td></tr>
  </table></div>`;
}).join('');

const H = `
<section class="capa"><div class="mono top">GUIA DE PUBLICAÇÃO · YOUTUBE SHORTS · INSTAGRAM · TIKTOK</div>
<div><h1 class="wm">Glossa</h1><p class="tag">Como publicar, em cada rede, em cada formato.</p></div>
<div class="mono top">Versão 1 · regras das plataformas mudam com frequência: confira os números marcados com ⚠ antes de planejar</div></section>

<section class="pg">
<div class="eb mono">01 · O sistema</div><h2>Um vídeo, três redes, um calendário</h2>
<p class="lead">O estúdio gera <b>um arquivo-mestre</b> por vídeo (MP4 vertical 1080×1920, ~40–55 s, legenda já embutida). O mesmo arquivo vai para as três redes, <b>sempre enviado direto</b> (nunca baixado de uma rede e reenviado em outra, com marca d'água). O que muda por rede é a <b>embalagem</b>: título, legenda, capa, hashtags e recursos nativos.</p>
<table class="t"><thead><tr><th>Rede</th><th>O que publicar</th><th>Frequência recomendada</th><th>Papel no canal</th></tr></thead><tbody>
<tr><td><b>YouTube Shorts</b></td><td>Os 7 vídeos do dia</td><td>7/dia, horários fixos</td><td>Volume, descoberta, monetização (YPP), base para vídeos longos</td></tr>
<tr><td><b>TikTok</b></td><td>Os 7 vídeos + compilações de mais de 1 min (a partir do mês 2)</td><td>Comece com 4/dia; suba para 7 se a retenção se mantiver</td><td>Descoberta rápida e viral; teste de ganchos</td></tr>
<tr><td><b>Instagram</b></td><td>3–4 Reels/dia (os melhores do dia) + Stories diários + 3 carrosséis/semana</td><td>Ver capítulo 04</td><td>Comunidade, salvamentos, parcerias e vendas</td></tr>
</tbody></table>
<p class="nota">Por que não 7 Reels por dia no Instagram? O Instagram distribui primeiro para quem já segue você. Muitos Reels por dia diluem esse primeiro público, e cada vídeo sai mais fraco. YouTube e TikTok, ao contrário, lidam bem com volume alto. A decisão é sua: se quiser 7 no Instagram também, acompanhe o alcance médio por Reel nas 2 primeiras semanas.</p>
<h3>Horários (horário de Brasília)</h3>
<table class="t"><thead><tr><th>Hora</th><th>Quadro</th><th>YouTube</th><th>TikTok</th><th>Instagram</th></tr></thead><tbody>
<tr><td class="mono">07h</td><td>De Onde Vem?</td><td>✔</td><td>✔</td><td>Reel</td></tr>
<tr><td class="mono">10h</td><td>Aula de Letras</td><td>✔</td><td>✔ (semana 1: opcional)</td><td>Story com o termo do dia</td></tr>
<tr><td class="mono">12h</td><td>Mito ou Verdade</td><td>✔</td><td>✔</td><td>Reel + Story com quiz</td></tr>
<tr><td class="mono">15h</td><td>Línguas Extremas</td><td>✔</td><td>✔ (semana 1: opcional)</td><td>Story ("você sabia?")</td></tr>
<tr><td class="mono">18h</td><td>Brasil Falado</td><td>✔</td><td>✔</td><td>Reel (é o quadro de maior identificação)</td></tr>
<tr><td class="mono">20h</td><td>Línguas Primas</td><td>✔</td><td>✔</td><td>Reel (ou carrossel nos dias de carrossel)</td></tr>
<tr><td class="mono">22h</td><td>Gênios da Linguística</td><td>✔</td><td>✔ (semana 1: opcional)</td><td>Story com teaser de amanhã</td></tr>
</tbody></table>
<p class="nota">Depois de 2 semanas, troque os horários pelos picos reais do seu público, que aparecem nas estatísticas de cada rede. Mantenha a ordem dos quadros.</p>
</section>

<section class="pg">
<div class="eb mono">02 · Antes de publicar (vale para tudo)</div><h2>Checklist do arquivo e do conteúdo</h2>
<div class="g2"><div>
<h3>Arquivo</h3><ul>
<li>MP4 (H.264 + AAC), 1080×1920, 30 fps. O estúdio já exporta assim.</li>
<li>Duração ideal de 35 a 55 s. Shorts e Reels aceitam até 3 min ⚠, mas vídeo curto retém mais.</li>
<li>Nome do arquivo com hora e código (o ZIP do dia já vem assim).</li>
<li>Legenda embutida na imagem: <b>não ative a legenda automática da rede</b>, senão fica duplicada.</li>
</ul>
<h3>Conteúdo</h3><ul>
<li><b>Ouça o vídeo inteiro</b> antes de agendar, principalmente nomes estrangeiros.</li>
<li><b>Confira o fato</b> na fonte do <span class="mono">posts.txt</span>.</li>
<li>A fonte vai no <b>comentário fixado</b>, em todas as redes.</li>
</ul></div><div>
<h3>Música: só clássica em domínio público</h3><ul>
<li>Todo vídeo já sai do estúdio com <b>trilha clássica embutida</b> (Bach, Mozart, Haydn, Schubert, Corelli, Beethoven…), mixada baixa sob a voz. <b>Não adicione música na rede.</b></li>
<li>Domínio público vale para a <b>composição e para a gravação</b>. As trilhas são interpretações geradas pelo próprio estúdio a partir de partituras abertas, ou gravações do Wikimedia Commons marcadas como domínio público ou CC0 (script <span class="mono">baixar_trilhas.py</span>).</li>
<li>Cada quadro tem sua música-tema, e o crédito vai na descrição e no <span class="mono">posts.txt</span>.</li>
<li>Se o Content ID reivindicar um vídeo por engano, conteste: "obra em domínio público, interpretação própria".</li>
</ul>
<h3>IA e transparência</h3><ul>
<li>Narração com voz de IA e animações gráficas não costumam exigir rótulo ⚠.</li>
<li>Imagem ou vídeo <b>realista</b> gerado por IA exige rótulo: no YouTube, "conteúdo alterado ou sintético"; no Instagram e no TikTok, "Rótulo de IA".</li>
<li>Nunca use voz clonada de uma pessoa real.</li>
</ul></div></div>
</section>

<section class="pg">
<div class="eb mono">03 · YouTube Shorts</div><h2>YouTube: o motor de volume</h2>
<div class="g2"><div>
<h3>Configurar o canal (uma vez)</h3><ol>
<li>Crie o canal com o Gmail do Glossa. Nome: <b>Glossa</b>. Identificador (@): o escolhido.</li>
<li><b>Studio → Personalização:</b> avatar, banner, descrição e link do Instagram (estão no kit de perfil).</li>
<li><b>Configurações → Padrões de upload:</b> idioma Português (Brasil), categoria <b>Educação</b>, comentários "permitir todos".</li>
<li><b>Configurações → Canal:</b> país Brasil, palavras-chave, e público "não é conteúdo para crianças".</li>
<li><b>Playlists:</b> crie uma para cada quadro, mais "Curso de Letras em 30 aulas" e "Glossário Glossa".</li>
<li>Ative a <b>verificação em duas etapas</b> e confirme o telefone para liberar recursos como links e vídeos longos.</li>
</ol>
<h3>Publicar cada Short</h3><ol>
<li><b>Studio → Criar → Enviar vídeos.</b> Como o vídeo é vertical e curto, vira Short automaticamente.</li>
<li><b>Título</b> (até 100 caracteres): o título do vídeo + 2 hashtags do quadro + <span class="mono">#shorts</span>. O título é o que aparece na busca, então use palavras que as pessoas pesquisam.</li>
<li><b>Descrição:</b> a legenda, a fonte e até 3 hashtags.</li>
<li><b>Capa:</b> no app do celular, escolha o quadro do gancho (os primeiros segundos) ⚠.</li>
<li><b>Vídeo relacionado:</b> aponte para o próximo vídeo da sequência (ou para a parte 2 nos episódios duplos). É o que mais gera maratona ⚠.</li>
<li><b>Playlist:</b> a do quadro do vídeo.</li>
<li><b>Visibilidade → Programar:</b> no horário do quadro. Dá para agendar a semana inteira de uma vez.</li>
<li>Depois de publicado, fixe o comentário com a fonte e o próximo vídeo.</li>
</ol></div><div>
<h3>O que o algoritmo dos Shorts mede</h3><ul>
<li><b>"Assistiram" × "deslizaram":</b> é o gancho. Abaixo de 60% assistindo, revise os primeiros 2 segundos.</li>
<li><b>Visualização média em % da duração:</b> acima de 80% é ótimo. Se o vídeo é revisto, passa de 100%.</li>
<li><b>Inscrições por vídeo:</b> mostra quais quadros trazem público fiel.</li>
</ul>
<h3>Recursos para usar</h3><ul>
<li><b>Aba Comunidade / posts:</b> enquete diária ("Qual destas palavras vem do tupi?"), o termo do Glossário da semana e os bastidores.</li>
<li><b>Vídeo longo semanal</b> (a partir do mês 2): junte os 7 vídeos de um quadro em 5–6 min com uma introdução. Vídeo longo dá receita de anúncio maior e conta horas de exibição.</li>
<li><b>Remix e cortes:</b> permita que outros façam remix. É divulgação gratuita.</li>
</ul>
<h3>Monetização ⚠</h3><ul>
<li><b>Nível inicial do YPP:</b> 500 inscritos + 3 envios em 90 dias + 3 milhões de visualizações de Shorts em 90 dias. Libera recursos de apoio dos fãs.</li>
<li><b>Receita de anúncios dos Shorts:</b> 1.000 inscritos + 10 milhões de visualizações válidas de Shorts em 90 dias (ou 4.000 h de exibição em vídeos longos em 12 meses).</li>
</ul>
<h3>Evite</h3><ul>
<li>Vídeos repetitivos ou em massa sem valor próprio: a regra de "conteúdo inautêntico" corta a monetização. Os formatos variados e o roteiro autoral protegem você.</li>
<li>Mudar título e capa de vídeos antigos o tempo todo.</li>
<li>Pedir inscrição com "sub4sub" ou comprar visualizações.</li>
</ul></div></div>
</section>

<section class="pg">
<div class="eb mono">04 · Instagram</div><h2>Instagram: comunidade, salvamentos e vendas</h2>
<div class="g2"><div>
<h3>Configurar o perfil (uma vez)</h3><ol>
<li>Conta com o Gmail do canal, o mesmo @. <b>Nome:</b> "Glossa · etimologia e Letras". As palavras no nome entram na busca.</li>
<li><b>Mudar para conta profissional → Criador de conteúdo</b>, categoria Educação.</li>
<li>Foto, bio e link do YouTube (estão no kit de perfil).</li>
<li><b>Destaques</b> com as 8 capas: um por quadro + Glossário.</li>
<li><b>3 publicações fixadas no topo:</b> (1) um Reel de apresentação ("o que é o Glossa"), (2) o Reel que mais performar, (3) o carrossel "Glossário da semana".</li>
</ol>
<h3>Reels (formato principal)</h3><ol>
<li><b>+ → Reel</b> → envie o MP4. Não use a legenda automática.</li>
<li><b>Capa:</b> escolha o quadro do gancho. ⚠ O grid do perfil corta o Reel em 3:4 (corta o topo e a base), então confira se o texto do gancho continua visível no recorte.</li>
<li><b>Legenda:</b> primeira linha = o gancho (é o que aparece antes do "mais"), depois a explicação curta, o CTA e 3–5 hashtags.</li>
<li><b>Áudio:</b> não adicione som: a trilha clássica já está no vídeo.</li>
<li><b>Opções avançadas → Agendar.</b></li>
<li><b>Reels de teste ("Trial Reels")</b> ⚠: mostra o Reel primeiro só para quem não segue você. Use para testar dois ganchos diferentes do mesmo vídeo.</li>
<li><b>Colaboração:</b> convide perfis de professores, escolas de idiomas ou vestibular como "colaborador". O Reel aparece nos dois perfis.</li>
</ol>
<h3>Carrossel (3 por semana)</h3><ul>
<li>Formato: 1080×1350 (4:5) ou 1080×1440 (3:4) ⚠, de 6 a 10 cartões. Aceita até 20 ⚠.</li>
<li><b>Glossário da semana</b> (domingo): os termos da semana, um por cartão. É o post que mais gera salvamentos.</li>
<li><b>Mito ou Verdade em sequência</b> (quarta): 4 afirmações, com a resposta no cartão seguinte.</li>
<li><b>Um quadro aprofundado</b> (sexta): pegue o vídeo mais visto e expanda em 8 cartões, com fonte no último.</li>
<li>O primeiro cartão é a capa: frase-gancho grande. O último cartão: "Salve para revisar" + @.</li>
</ul></div><div>
<h3>Stories (todo dia, 4 a 6)</h3><ul>
<li><b>Manhã:</b> repost do Reel das 07h com a figurinha "Novo Reel".</li>
<li><b>12h:</b> figurinha de <b>Quiz</b> com a pergunta do Mito ou Verdade (as respostas viram dados de engajamento).</li>
<li><b>15h:</b> "Você sabia?" com uma imagem e o fato do Línguas Extremas.</li>
<li><b>18h:</b> <b>Enquete</b> regional ("biscoito ou bolacha?"). É o que mais gera respostas.</li>
<li><b>22h:</b> <b>Contagem regressiva</b> para o vídeo de amanhã, ou uma caixa de <b>Perguntas</b> ("que palavra você quer que a gente investigue?").</li>
<li>Salve os melhores nos destaques de cada quadro.</li>
</ul>
<h3>Canal de transmissão</h3><ul>
<li>Crie um canal chamado <b>"Glossário Glossa"</b>. Todo dia, uma mensagem curta com o termo do dia e o link do vídeo.</li>
<li>Mais tarde, é por ali que você avisa sobre e-book, curso e lives.</li>
</ul>
<h3>O que medir no Instagram</h3><ul>
<li><b>Salvamentos e compartilhamentos por alcance:</b> pesam mais que curtidas.</li>
<li><b>Alcance de não seguidores:</b> mostra se o conteúdo está sendo descoberto.</li>
<li><b>Retenção dos Reels:</b> o gráfico mostra o segundo em que as pessoas saem.</li>
</ul>
<h3>Monetização no Instagram</h3><ul>
<li>A receita vem de <b>parcerias</b>: escolas de idiomas, cursinhos, editoras, apps de idiomas, dicionários. Monte um mídia kit com alcance, público e exemplos depois de 30 dias.</li>
<li><b>Assinaturas</b> e "presentes" nos Reels ⚠, quando disponíveis para a sua conta.</li>
<li>Produto próprio: e-book do Glossário, curso de redação ou de Letras.</li>
</ul></div></div>
</section>

<section class="pg">
<div class="eb mono">05 · TikTok</div><h2>TikTok: o laboratório de ganchos</h2>
<div class="g2"><div>
<h3>Configurar (uma vez)</h3><ol>
<li>Conta com o Gmail do canal e o mesmo @. Foto, bio e link (o link na bio só é liberado depois de um número mínimo de seguidores ⚠).</li>
<li><b>Mudar para conta de criador</b> (não comercial). Isso libera mais músicas e o programa de recompensas.</li>
<li>Ative a verificação em duas etapas.</li>
<li><b>Playlists</b> ("séries" do perfil): uma por quadro, quando o recurso for liberado para você ⚠.</li>
</ol>
<h3>Publicar cada vídeo</h3><ol>
<li>Use o <b>TikTok Studio no computador</b> (tiktok.com/tiktokstudio): envie o MP4 e agende (dá para agendar com alguns dias de antecedência ⚠).</li>
<li><b>Legenda:</b> o TikTok funciona como buscador. Escreva a frase com as palavras que alguém pesquisaria: "origem da palavra algoritmo", "de onde vem a palavra forró". Depois, 3–5 hashtags.</li>
<li><b>Capa:</b> o quadro do gancho, com o título.</li>
<li>Não adicione som do TikTok: a trilha clássica já está no vídeo.</li>
<li>Permita <b>Dueto</b> e <b>Costura</b>. Professores e curiosos vão reagir, e isso é divulgação gratuita.</li>
<li>Não ative legendas automáticas (a legenda já está no vídeo).</li>
<li>Fixe o comentário com a fonte. Responda comentários com vídeo-resposta: o recurso "responder com vídeo" gera um vídeo novo sem esforço.</li>
</ol>
<h3>Outros formatos no TikTok</h3><ul>
<li><b>Carrossel de fotos (modo foto):</b> os mesmos carrosséis do Instagram, adaptados para 9:16. Funciona muito bem para o Glossário.</li>
<li><b>Stories do TikTok:</b> o mesmo teaser das 22h.</li>
<li><b>LIVE</b> (liberada a partir de um número mínimo de seguidores ⚠): "plantão do português", uma vez por semana, tirando dúvidas de gramática ao vivo. Gera presentes e fideliza.</li>
</ul></div><div>
<h3>Monetização ⚠</h3><ul>
<li><b>Creator Rewards:</b> conta de criador, maior de 18 anos, 10 mil seguidores e 100 mil visualizações nos últimos 30 dias. <b>Só paga vídeos com mais de 1 minuto.</b></li>
<li>Por isso, a partir do mês 2, publique também <b>compilações de 60–90 s</b>: os dois episódios duplos juntos, ou 3 vídeos do mesmo quadro emendados ("3 palavras que você não sabia que vinham do árabe"). O estúdio pode gerar essas versões.</li>
<li><b>Assinaturas, presentes em LIVE e TikTok Shop</b> (afiliado de livros e dicionários) ⚠.</li>
</ul>
<h3>O que medir no TikTok</h3><ul>
<li><b>Tempo médio assistido e % de quem assistiu inteiro:</b> é o principal sinal.</li>
<li><b>Origem do tráfego:</b> "Para você" alto = o vídeo está sendo distribuído. "Busca" alto = a legenda está funcionando como SEO.</li>
<li><b>Primeiros 2 s:</b> o TikTok é o lugar para testar o gancho. Se um gancho funciona aqui, use a mesma ideia nos próximos roteiros.</li>
</ul>
<h3>Evite</h3><ul>
<li>Apagar vídeos que foram mal. Deixe: às vezes eles "acordam" dias depois.</li>
<li>Publicar o mesmo vídeo duas vezes.</li>
<li>Usar marca d'água de outra rede ou link externo na legenda.</li>
<li>Usar hashtags genéricas sem relação (#fyp, #viral) no lugar de palavras do tema.</li>
</ul></div></div>
</section>

<section class="pg">
<div class="eb mono">06 · Rotina</div><h2>A semana de trabalho</h2>
<table class="t"><thead><tr><th>Quando</th><th>Tarefa</th><th>Tempo</th></tr></thead><tbody>
<tr><td><b>Segunda</b></td><td>Revisar os roteiros e fatos da semana; gerar narrações e vídeos no estúdio (<span class="mono">node semana.js</span>)</td><td>2–3 h (quase tudo é automático)</td></tr>
<tr><td><b>Terça</b></td><td>Assistir os 49 vídeos (na velocidade 1,5×), refazer o que precisar; montar os 3 carrosséis</td><td>2 h</td></tr>
<tr><td><b>Quarta</b></td><td>Agendar a semana: YouTube (49), TikTok (28–49) e Instagram (21–28 Reels + 3 carrosséis)</td><td>2–3 h</td></tr>
<tr><td><b>Todo dia</b></td><td>Stories (5 min por vez); fixar comentários; responder os primeiros comentários de cada vídeo na primeira hora; anotar perguntas que viram pauta</td><td>40–60 min</td></tr>
<tr><td><b>Domingo</b></td><td>Olhar as métricas da semana (capítulo 07) e decidir os ajustes</td><td>30 min</td></tr>
</tbody></table>
<h3>Responder comentários: modelos</h3>
<table class="kv">
<tr><th>Elogio</th><td>"Valeu! Amanhã às 7h tem outra dessas 👀"</td></tr>
<tr><td colspan="2" style="height:4px"></td></tr>
<tr><th>Correção certa</th><td>"Você tem razão, obrigado! Corrigido no comentário fixado. É assim que a gente aprende."</td></tr>
<tr><th>Correção errada</th><td>"Boa pergunta! A fonte está no comentário fixado: [fonte]. Mas existe a outra hipótese de que…"</td></tr>
<tr><th>Pergunta</th><td>"Vou fazer um vídeo sobre isso 👀" (e faça, respondendo com vídeo no TikTok)</td></tr>
<tr><th>Hater</th><td>Não discuta. Responda com dado e fonte, uma vez só, ou ignore.</td></tr>
</table>
</section>

<section class="pg">
<div class="eb mono">07 · Métricas</div><h2>O que olhar e o que decidir</h2>
<div class="g2"><div>
<h3>Toda semana</h3><ul>
<li>Os <b>5 vídeos com maior retenção</b> nas três redes: que formato e que gancho eles têm? Use mais disso.</li>
<li>Os <b>5 piores</b>: o problema foi o gancho (pouca gente assistiu) ou o meio (gente saiu no meio)?</li>
<li>O <b>quadro campeão</b> de cada rede: ele vai para o horário de maior audiência.</li>
<li>As <b>perguntas dos comentários</b> viram roteiros do mês seguinte.</li>
</ul></div><div>
<h3>Metas de referência para o mês 1</h3><ul>
<li>Shorts: mais de 60% "assistiram" e visualização média acima de 80%.</li>
<li>TikTok: mais de 40% assistem até o fim.</li>
<li>Instagram: salvamentos acima de 2% do alcance nos carrosséis.</li>
<li>Seguidores: o número importa menos que a tendência. Cresceu semana a semana? Então o caminho está certo.</li>
</ul>
<p class="nota">São pontos de referência gerais, não promessas. Cada nicho tem números próprios: compare o Glossa com o próprio Glossa da semana anterior.</p>
</div></div>
<h3>Linha do tempo sugerida</h3>
<table class="t"><thead><tr><th>Quando</th><th>Marco</th></tr></thead><tbody>
<tr><td>Semanas 1–2</td><td>Publicação diária, responder tudo, descobrir horários e quadros fortes</td></tr>
<tr><td>Semanas 3–4</td><td>Ajustar horários e formatos; primeiras colaborações no Instagram</td></tr>
<tr><td>Mês 2</td><td>Compilações de mais de 1 min (TikTok), vídeo longo semanal (YouTube), carrosséis fixos</td></tr>
<tr><td>Mês 3</td><td>Mídia kit, primeiras parcerias, rascunho do e-book do Glossário</td></tr>
</tbody></table>
</section>

<section class="pg">
<div class="eb mono">08 · Regras e riscos</div><h2>O que pode derrubar o canal (e como evitar)</h2>
<table class="t"><tbody>
<tr><td><b>Direitos autorais</b></td><td>Imagens só de domínio público ou geradas por você. Música só clássica em domínio público (composição e gravação), já embutida pelo estúdio. Nada de trechos de filmes, séries ou capas de livros com marca de editora.</td></tr>
<tr><td><b>Conteúdo repetitivo</b></td><td>No YouTube, a política de "conteúdo inautêntico" desmonetiza canais com vídeos em massa e iguais. O Glossa varia formatos, roteiros e temas. Mantenha isso e não reaproveite o mesmo roteiro trocando só a palavra.</td></tr>
<tr><td><b>Desinformação</b></td><td>Um erro factual viral destrói a credibilidade, que é a marca do canal. Fonte em todo vídeo; correção pública quando errar.</td></tr>
<tr><td><b>Spam e crescimento falso</b></td><td>Nada de comprar seguidores ou visualizações, "segue que eu sigo" ou grupos de engajamento. As redes detectam e cortam o alcance.</td></tr>
<tr><td><b>Segurança</b></td><td>Verificação em duas etapas, e-mail exclusivo, nunca entrar em links de "parceria" que pedem login (golpe comum contra criadores).</td></tr>
<tr><td><b>Temas sensíveis</b></td><td>Política, religião e grupos sociais: trate com rigor e respeito (ex.: línguas indígenas e africanas). O Glossa explica, não ridiculariza.</td></tr>
</tbody></table>
</section>

<section class="pg2">
<div class="eb mono">Anexo</div><h2>Textos prontos da semana 1 (49 vídeos)</h2>
<p class="lead">Para cada vídeo: título e descrição do YouTube, legendas do Instagram e do TikTok e o comentário fixado. É só copiar. Os textos completos também estão no <span class="mono">posts.txt</span> de cada ZIP.</p>
${posts}
</section>`;

const css = `
@font-face{font-family:DM;src:url('${F}/dm-serif-display/files/dm-serif-display-latin-400-normal.woff2')}
@font-face{font-family:DM;font-style:italic;src:url('${F}/dm-serif-display/files/dm-serif-display-latin-400-italic.woff2')}
@font-face{font-family:Ar;font-weight:400;src:url('${F}/archivo/files/archivo-latin-400-normal.woff2')}
@font-face{font-family:Ar;font-weight:800;src:url('${F}/archivo/files/archivo-latin-800-normal.woff2')}
@font-face{font-family:Mono;src:url('${F}/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff2')}
@page{size:A4;margin:15mm}@page:first{margin:0}
*{box-sizing:border-box}html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{margin:0;font-family:Ar,Inter,sans-serif;font-size:9.3pt;line-height:1.48;color:#16161A}
.mono{font-family:Mono,monospace;letter-spacing:.02em}
h1,h2,h3{font-family:DM,Georgia,serif;font-weight:400;margin:0}
h2{font-size:22pt;margin:0 0 8pt}h3{font-size:12.5pt;margin:12pt 0 5pt}
.eb{font-size:7.5pt;color:#6b6a66;letter-spacing:.14em;text-transform:uppercase;margin-bottom:4pt}
.lead{font-size:10pt}.nota{font-size:8.3pt;color:#6b6a66;border-left:2px solid #e4e1da;padding-left:8pt}
ul,ol{margin:0;padding-left:14pt}li{margin-bottom:3pt}
.pg{break-after:page}.g2{display:grid;grid-template-columns:1fr 1fr;gap:16pt}
table{border-collapse:collapse;width:100%}
.t th{text-align:left;font-size:7pt;text-transform:uppercase;letter-spacing:.1em;color:#6b6a66;border-bottom:1px solid #16161A;padding:3pt 5pt}
.t td{vertical-align:top;padding:5pt;border-bottom:1px solid #e4e1da}
.kv th{text-align:left;vertical-align:top;width:24%;font-size:7.6pt;color:#6b6a66;padding:3pt 6pt 3pt 0;font-weight:700}
.kv td{padding:3pt 0;border-bottom:1px solid #eee;font-size:8.3pt}
.capa{height:297mm;width:210mm;background:#111114;color:#F2EAD8;padding:22mm 20mm;display:flex;flex-direction:column;justify-content:space-between;break-after:page}
.capa .top{font-size:8pt;letter-spacing:.14em;color:rgba(242,234,216,.6)}
.wm{font-size:96pt;line-height:.9}.wm::after{content:".";color:#E8A33D}
.tag{font-family:DM;font-style:italic;font-size:20pt;color:rgba(242,234,216,.85);margin:10pt 0 0}
.post{break-inside:avoid;border-left:3px solid #E8A33D;padding:4pt 0 4pt 9pt;margin:0 0 10pt}
.post-h{display:flex;gap:10pt;align-items:baseline;margin-bottom:3pt}.post-h .mono{font-size:7pt;color:#6b6a66}.post-h b{font-family:DM;font-weight:400;font-size:12pt}
`;

(async () => {
  const tmp = path.join(__dirname, '_guia.html');
  fs.writeFileSync(tmp, `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Glossa · Guia de publicação</title><style>${css}</style><body>${H}</body></html>`);
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const p = await b.newPage();
  await p.goto('file://' + tmp); await p.evaluate(() => document.fonts.ready);
  const out = path.join(__dirname, '..', 'Glossa-Guia-de-Publicacao.pdf');
  await p.pdf({ path: out, format: 'A4', printBackground: true, preferCSSPageSize: true, displayHeaderFooter: true, headerTemplate: '<span></span>',
    footerTemplate: '<div style="width:100%;font-family:monospace;font-size:7px;color:#8a877f;padding:0 15mm;display:flex;justify-content:space-between"><span>GLOSSA · GUIA DE PUBLICAÇÃO</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>' });
  await b.close(); fs.rmSync(tmp);
  console.log(out);
})();
