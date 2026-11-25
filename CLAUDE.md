# RAIZ — caderno de línguas

App de aprendizado de línguas autodidata, em português do Brasil, feito para o celular.
O repositório também contém o **NEXI** (outro app, na raiz: `index.html`), que não deve ser alterado ao trabalhar no RAIZ.

## A ideia (do autor)

Aprender uma língua começa pela **raiz**:

1. **Pronomes pessoais do caso reto** (eu, você, ele, ela, nós, vocês, eles, elas).
2. **Ser e estar**.
3. **Os verbos que a própria pessoa mais usa** — e, para saber quais são, ela precisa pensar no que fala no dia a dia.

Princípios que guiam todas as decisões:

- **Sem trilha engessada de curso.** O caminho sai do interesse pessoal e do conhecimento de mundo da pessoa: ela escreve o que fala e aquilo vira lição.
- **Tradução é de conceito, não de palavra.** “Tomar um café” é *have a coffee* em inglês, não *take*. “Tomar banho”, “tomar remédio” e “pegar o ônibus” viram todos *take*. O app ensina o sentido.
- **Português do Brasil falado.** “Pegar o ônibus”, não “tomar o ônibus”; o app entende “tô”, “pra”, “cê”. Não corrige o jeito regional da pessoa.
- **O autor prefere aprender no papel**, então o celular imita o papel: escrever com o dedo numa folha pautada.
- **Não pode depender de uma API de inteligência artificial** (nem chave paga). Tudo roda dentro do aparelho.
- **Lições interativas, mas com certo e errado** conferidos na hora.
- **Visual forte, diferenciado, único e bonito.**

## Onde está

- App publicado: https://lingua-byte.github.io/Nexi/linguas/
- APK Android: https://lingua-byte.github.io/Nexi/linguas/RAIZ.apk
- Código: pasta `linguas/` (app web), `raiz-android/` (APK), `tools/fetch_models.py` (modelos do tradutor).
- Publicação: todo push no `main` dispara `.github/workflows/deploy.yml`, que publica o site, gera um APK novo e baixa os modelos do tradutor. O app instalado (PWA ou APK) se atualiza sozinho. O autor autorizou publicar direto no `main` a cada mudança pedida.

## Línguas

Inglês, francês, espanhol, alemão, italiano, japonês, coreano e hebraico (da direita para a esquerda). Japonês, coreano e hebraico mostram romanização nos dados prontos.

## O que o app faz hoje (versão 2.5)

**Caminho e ciclo do dia (2.5)** — o autor achou a 2.4 “complexa e desinteressante”: um app de ensino precisa de um caminho e um ciclo claros. A página de cada língua agora mostra só:
- *Hoje*: o passo atual do ciclo — 1 ✍ Escrever (1–3 frases em português, com uma pergunta do dia) → 2 👁 Entender (diário alinhado, tocar nas palavras) → 3 ▶ Praticar (lição “Prática de hoje”, degrau 6: as frases do dia + variações delas em outras pessoas/tempos + palavras escritas hoje + revisões vencidas) → 4 ✎ Sozinho (escrever na língua sem olhar; o diário corrige e o dia fica completo).
- *O caminho*: Pronomes → Ser & estar (liberados com 60% firme) → Dia 1, Dia 2… (`st.dia`, `st.dias`; rota `#/l/<id>/h`).
- *Mais para explorar* (fechado): diário livre, ler, falar, pares, vocabulário, coleção, variações, reescrever, erros, mapa, verbos, a raiz.
- Comemorações não interrompem mais a lição (esperam o fim); nível e missões viram aviso discreto.
- Variações com concordância do adjetivo (“Ela está cansada”, “Nós estamos cansados”).

Tudo abaixo continua existindo, mas fora da tela principal:

**O diário é o centro** (é a primeira coisa na página de cada língua). A pessoa escreve a própria vida em português **ou** na língua estudada; o diário identifica a língua sozinho.
- *Português* → mostra como dizer na outra língua, frase por frase, com as duas línguas alinhadas: **tocar numa palavra acende a correspondente na outra** (e fala). Explica os conceitos e os verbos no sentido da frase. “Agora é a sua vez”: a pessoa tenta escrever ela mesma e o diário compara com o que ela quis dizer.
- *Língua estudada* → correção: regras de gramática, o que o app entendeu (alinhado palavra por palavra), comparação com o que a pessoa quis dizer, como o tradutor diria e as diferenças.
- O vocabulário vem da vida da pessoa, não de falas externas — é o método do autor (aprendeu duas línguas assim e está na terceira).

**O diário libera o vocabulário (gamificado)** — aprender não pode depender só da vontade de escrever:
- *Vocabulário vivo*: cada palavra que a pessoa escreve entra no vocabulário já traduzida (pelo alinhamento), com nível 🌱 semente → 🌿 broto → 🪴 raiz → 🌳 árvore conforme acerta.
- *Palavras vizinhas* (`campos.js`): escrever sobre um assunto da vida (café, chuva, trabalho…) libera o pacote de palavras daquele mundo (20 mundos × 8 palavras), traduzidas no aparelho.
- *Coleção de conceitos*: os conceitos da base viram um álbum com raridade (comum, raro, lendário); os que faltam ficam escondidos com dica do tipo de fala.
- *Missões do dia* (3 por dia), XP, nível, sequência de dias e carimbos de comemoração.
- *Pares*: jogo de memória com o próprio vocabulário. A lição interativa também treina o vocabulário (“degrau 4”).

**Treinos a partir de você** — respostas aos pontos fracos do método (análise completa em `docs/METODO.md`):
- *Reescrever*: páginas escritas em português voltam depois de 2 dias; a pessoa reescreve na língua, sem olhar, e vê se melhorou.
- *Variações*: as frases da própria pessoa mudam de pessoa e de tempo (eu → ela → nós → eles; presente ↔ passado), traduzidas e treinadas — gramática a partir do próprio texto (`variacoes` em `linguistica.js`).
- *Ler*: qualquer texto que interessa à pessoa (letra, notícia, receita) vira leitura alinhada palavra por palavra; tocar guarda no vocabulário. A entrada vem do interesse dela.
- *Falar*: ouvir a frase devagar e normal, repetir, gravar a própria voz e comparar (no aparelho; o APK tem permissão de microfone).
- *Meus erros*: tipos de erro que se repetem no diário e os itens que mais escapam nas lições.
- *Mapa*: o que a pessoa já consegue dizer por área da vida, com desafios para as áreas vazias.
- *Medidor de confiança*: cada tradução é traduzida de volta; se não bate, o app avisa “tradução incerta” para a pessoa não decorar erro.

**A raiz: escada de 3 degraus por língua**
1. *Pronomes* — tabela com áudio e notas do que muda em cada língua.
2. *Ser & Estar* — explica as diferenças (inglês/francês/alemão: um verbo só; italiano usa “essere” para estados; hebraico não tem verbo no presente, então treina o passado; japonês です/います; coreano 이에요/있어요).
3. *Meus verbos* — a pessoa escreve qualquer frase em português; o app acha os verbos (16 com conjugação revisada + ~140 reconhecidos offline, inclusive irregulares) e “Transformar em lição” traduz as frases, monta conceitos verbais (verbo + o sentido na frase, conjugado nas 8 pessoas) e avisa quando a tradução palavra por palavra estaria errada. Verbos de muitos sentidos (tomar, pegar, fazer, dar, ficar…) mostram “o sentido decide”.

**Formas de praticar**
- *Lição interativa* (certo/errado na hora): escolher a resposta, ouvir e escolher, montar a frase com as palavras, digitar (com teclas de acento). Erros voltam no fim da lição. A dificuldade sobe conforme o item fica firme.
- *Escrever no papel*: escreve com o dedo na tela (ou no caderno de verdade), depois “Ver a resposta” e diz como foi. Botão “Modelo” para traçar por cima.
- Folhas para imprimir (em branco ou com gabarito).
- Revisão espaçada (caixas de Leitner) decide quando cada item volta.

As correções do diário e as frases traduzidas viram cartões para treinar (lição e escrita à mão).

**App instalável** (PWA) e **APK Android** (Capacitor), ambos se atualizam sozinhos; funciona offline; progresso fica no aparelho (localStorage).

## Como funciona por dentro

- **Web puro**, sem build: `index.html`, `style.css`, `data.js` (línguas, pronomes, ser/estar, banco de 16 verbos, léxico de verbos do português, sentidos de verbos), `linguistica.js` (conhecimento linguístico próprio), `motor.js` (tradutor), `app.js` (telas e lógica), `sw.js` (offline e atualização automática).
- **Tradutor interno** (`motor.js`): tradução neural que roda no celular — motor Bergamot em WebAssembly (`linguas/vendor/bergamot/`, MPL-2.0) com os modelos da Mozilla/Firefox Translations (MPL-2.0). Os modelos só existem de/para o inglês, então o português passa pelo inglês como ponte (pt → en → língua, e de volta para corrigir). Cada língua é baixada uma vez (≈25–65 MB + 45 MB do par português↔inglês) e guardada no aparelho. No site ficam todos (≈440 MB), baixados no deploy, não no repositório.
- **Conhecimento linguístico próprio** (`linguistica.js`), em português, vale para as 8 línguas ao mesmo tempo:
  - português falado → forma que o tradutor entende;
  - ~50 conceitos brasileiros (saudade, cafuné, gambiarra, dar um jeito, bater papo, cair a ficha, pegar no sono…) reescritos pelo sentido antes de traduzir, mantendo pessoa e tempo do verbo;
  - **contexto entre frases**: o tradutor neural vê uma frase de cada vez, então o app acompanha o sujeito e deixa explícito o sujeito oculto (“Tito era feliz. Pensava…” → “Ele pensava…”, senão viraria “I thought”);
  - nomes próprios não são traduzidos (“Maria” não vira “Mary”);
  - conjugação do português; diferença palavra a palavra; romanização do coreano.
- **Alinhamento palavra a palavra** (`motor.js`, `translateAligned`): o motor não expõe o alinhamento, então cada palavra de origem vai marcada em HTML e o motor leva as marcas para as palavras correspondentes (inclusive pela ponte do inglês). O texto mostrado vem da tradução normal (melhor qualidade) e é casado com a tradução marcada.
- **Sem a lista curta de palavras (shortlist)** do Bergamot: com frases curtas ela cortava palavras e o modelo inventava (“T. To to be…”, “Me tome un café”). Desligada, a qualidade subiu muito (sobretudo no espanhol) e a velocidade quase não mudou.
- **Gramática por terminação** (`linguistica.js`, `TERM`): espanhol, italiano, francês e alemão conferem qualquer verbo regular depois do pronome (“yo toma” → “yo tomo”), com explicação em português.
- **Ponte com conserto de conceito** (`motor.js`): antes de sair do inglês, troca construções que as outras línguas erram (“have breakfast”, “walked in the park”), com regras medidas por língua; e uma camada de consertos de tropeços repetidos do modelo de espanhol.
- **Visual**: estética de papel e risografia — fundo creme com textura, tinta preta, uma cor forte por língua, tipografia Fraunces + JetBrains Mono, caderno pautado com margem vermelha, carimbos. Tema “papel noturno”.

## Limitações conhecidas (honestas)

- O tradutor acerta a maior parte das frases do dia a dia, mas erra em frases longas, muito informais ou ambíguas. Por isso o app sempre mostra “como entendeu”.
- A ponte pelo inglês às vezes perde nuances que o português e as línguas próximas compartilham (tu/você, gênero, tempos verbais como “fazia” → “hizo”). Modelos diretos pt↔es/it/fr ajudariam; a Mozilla não tem.
- O alinhamento palavra a palavra é aproximado: às vezes uma palavra fica sem par ou liga à palavra vizinha.
- A correção do diário não é um “professor”: é regras + comparação + tradução de volta. A tradução de volta pode esconder erros (“Yo tiene” volta como “Tenho”), por isso as regras e a comparação existem.
- Romanização gerada só para o coreano; japonês e hebraico têm romanização apenas nos dados prontos.
- Ainda **não foi testado num celular de verdade**: tradutor no aparelho, APK e atualização automática foram testados em navegador simulado. O download do tradutor é grande para dados móveis.

## Testes do tradutor

`tools/testes/`: 230 frases em 9 categorias (formal, cotidiano, gíria, idiomáticas, intraduzíveis, contexto, regional, poético, ironia), executor que passa cada uma pelo caminho completo do app e relatório (`RELATORIO.md`). Inglês: 62% → ~91% de frases boas depois de ampliar a base de conceitos. Rodar a cada mudança no tradutor ou na base.

## Ideias em aberto

- Modelos diretos português ↔ espanhol/italiano/francês (ex.: Opus-MT) para melhorar a qualidade.
- Crescer a base de conceitos brasileiros e as regras de correção (mais gramática por língua, ortografia).
- Passado e futuro dos verbos; frases montadas com pronome + verbo + palavras da pessoa.
- Diário falado (falar em vez de escrever).
- Romanização para japonês e hebraico.

## Para quem for trabalhar no código

- Responder ao autor em português do Brasil, linguagem simples.
- Não mexer no NEXI (`index.html` na raiz, `manifest.webmanifest` da raiz).
- Testar com Playwright simulando celular; os modelos de teste podem ser baixados com `python3 tools/fetch_models.py <pasta> pt-en en-pt en-es es-en`.
- Ao mudar o app, acrescentar uma linha em `NEWS` (topo de `linguas/app.js`): ela aparece no aviso “Atualizado ✓”.
- Publicar no `main` e acompanhar o workflow de deploy.
