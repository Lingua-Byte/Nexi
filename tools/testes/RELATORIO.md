# Bateria de 230 testes do tradutor do RAIZ

230 frases em português (`frases.json`), em 9 categorias de formalidade e dificuldade, passadas pelo
caminho completo do app — português falado → sujeito oculto → conceitos → tradutor interno no aparelho —
para **inglês** e **espanhol**. Rodar de novo: `node tools/testes/rodar.js <modelos> <saida.json> en,es`.

Julgamento feito frase a frase (sentido e naturalidade), em inglês; o espanhol foi lido nas categorias mais difíceis.

## Resultado (inglês)

| Categoria | Antes | Depois |
|---|---|---|
| Formal / burocrático (20) | 15 | 19 |
| Cotidiano (30) | 27 | 28 |
| Gíria / informal (30) | 8 | 26 |
| Expressões idiomáticas (40) | 25 | 37 |
| “Intraduzíveis” / culturais (25) | 10 | 22 |
| Ambíguas / contexto (25) | 21 | 23 |
| Regional (20) | 5 | 18 |
| Poético / literário (20) | 16 | 19 |
| Ironia / humor (20) | 16 | 18 |
| **Total (230)** | **143 (62%)** | **≈210 (91%)** |

Tempo médio por frase no aparelho simulado: ≈46 ms (inglês), ≈83 ms (espanhol, que passa pela ponte do inglês).

## O que mudou

- **~80 conceitos novos** na base do app (`linguistica.js`): gíria (tô duro, partiu, deu ruim, mandou bem, foi mal…),
  regionalismos (oxente, uai, bah, trem, guri, cacetinho, arretado…), expressões (pulga atrás da orelha, a cara do pai,
  custou os olhos da cara, mundo da lua, pé esquerdo, braço a torcer, pé na jaca, faca e o queijo…), culturais
  (vaquinha, puxa-saco, sextou, vergonha alheia, cafona, jogo de cintura…) e fórmulas formais (desde já, revê-lo,
  segue em anexo, munido de).
- **Sentido invertido corrigido**: “Você me faz falta” → *I miss you* (antes: *You miss me*).
- **Regras minhas que pioravam**, desfeitas: “saudade” como substantivo, “vale a pena” (o tradutor já sabia: *worth it*),
  “fofoca”.
- Português falado: “tu vai” → você vai; “num vem não?” → não vem?

## Exemplos

| Português | Antes | Depois |
|---|---|---|
| Você me faz muita falta. | You miss me so much. | I miss you so much. / Te extraño mucho. |
| Ela me fez um cafuné até eu dormir. | She made me a fondness in my hair… | She stroked my hair until I slept. |
| Partiu praia! | Broke beach! | Let's go to the beach! |
| Esse trem tá muito caro. | This train is very expensive. | That thing is very expensive. |
| Ele está com a pulga atrás da orelha. | He's got the flea behind his ear. | He's suspicious. |
| Ela tem um jogo de cintura incrível. | She has an amazing waist game. | She has an incredible ability to deal with difficult situations. |
| Que saudade de você! | What a lack I feel about you! | How I miss you! / ¡Cómo te extraño! |

## O que ainda erra

- Gênero quando o sujeito é desconhecido (“Tô morto de cansado” → *cansada*).
- Tempo verbal pela ponte do inglês (“fazia” → *hizo*, em vez de *hacía*).
- Nuances: “Que mico eu paguei” → *What a shame I spent*; “passeei no quarteirão” → *strolled the block*.
- Cada expressão nova da fala real precisa entrar na base — o caminho é ir crescendo com o que as pessoas escrevem.
