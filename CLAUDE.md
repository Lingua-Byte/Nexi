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

## O que o app faz hoje (versão 2.1)

**Escada de 3 degraus por língua**
1. *Pronomes* — tabela com áudio e notas do que muda em cada língua.
2. *Ser & Estar* — explica as diferenças (inglês/francês/alemão: um verbo só; italiano usa “essere” para estados; hebraico não tem verbo no presente, então treina o passado; japonês です/います; coreano 이에요/있어요).
3. *Meus verbos* — a pessoa escreve qualquer frase em português; o app acha os verbos (16 com conjugação revisada + ~140 reconhecidos offline, inclusive irregulares) e “Transformar em lição” traduz as frases, monta conceitos verbais (verbo + o sentido na frase, conjugado nas 8 pessoas) e avisa quando a tradução palavra por palavra estaria errada. Verbos de muitos sentidos (tomar, pegar, fazer, dar, ficar…) mostram “o sentido decide”.

**Formas de praticar**
- *Lição interativa* (certo/errado na hora): escolher a resposta, ouvir e escolher, montar a frase com as palavras, digitar (com teclas de acento). Erros voltam no fim da lição. A dificuldade sobe conforme o item fica firme.
- *Escrever no papel*: escreve com o dedo na tela (ou no caderno de verdade), depois “Ver a resposta” e diz como foi. Botão “Modelo” para traçar por cima.
- Folhas para imprimir (em branco ou com gabarito).
- Revisão espaçada (caixas de Leitner) decide quando cada item volta.

**Tradutor de conceitos** — escreve do seu jeito em português (gíria, expressão, algo “intraduzível”), o app mostra como entendeu, traduz o sentido, explica os conceitos e guarda tudo na lição.

**Diário livre** — escreve o que quiser na língua estudada. “Conferir”: regras de pronome + verbo (instantâneo). “Corrigir”: correção completa no aparelho — regras, o que o app entendeu do texto (tradução de volta), comparação com o que a pessoa quis dizer, como o tradutor diria e as diferenças marcadas. As correções viram cartões para treinar à mão.

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
- **Ponte com conserto de conceito** (`motor.js`): antes de sair do inglês, troca construções que as outras línguas erram (“have breakfast”, “walked in the park”), com regras medidas por língua; e uma camada de consertos de tropeços repetidos do modelo de espanhol.
- **Visual**: estética de papel e risografia — fundo creme com textura, tinta preta, uma cor forte por língua, tipografia Fraunces + JetBrains Mono, caderno pautado com margem vermelha, carimbos. Tema “papel noturno”.

## Limitações conhecidas (honestas)

- O tradutor acerta a maior parte das frases do dia a dia, mas erra em frases longas, muito informais ou ambíguas. Por isso o app sempre mostra “como entendeu”.
- **Espanhol é o modelo mais fraco**; a ponte pelo inglês às vezes quebra conceitos que português e espanhol compartilham. Línguas próximas do português se beneficiariam de modelos diretos (pt↔es/it/fr), que a Mozilla não tem.
- A correção do diário não é um “professor”: é regras + comparação + tradução de volta. A tradução de volta pode esconder erros (“Yo tiene” volta como “Tenho”), por isso as regras e a comparação existem.
- Romanização gerada só para o coreano; japonês e hebraico têm romanização apenas nos dados prontos.
- Ainda **não foi testado num celular de verdade**: tradutor no aparelho, APK e atualização automática foram testados em navegador simulado. O download do tradutor é grande para dados móveis.

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
