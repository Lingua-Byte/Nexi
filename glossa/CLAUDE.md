# Glossa: contexto do projeto (leia antes de qualquer tarefa)

Este arquivo é a passagem de bastão de uma conversa feita na nuvem (Claude Code na web) para conversas
locais no PC do dono do projeto. Tudo o que foi decidido está aqui ou nos arquivos citados.
O dono escreve em português do Brasil: responda sempre em PT-BR.

## O que é
**Glossa** é um canal "dark" (sem rosto, narração + tela) de linguística e Letras para YouTube Shorts,
Instagram Reels e TikTok. Meta do dono: grande audiência e monetização. São **7 vídeos por dia**.
- Nome: Glossa, do grego *glôssa* (órgão e idioma). Assinatura: "A língua por dentro."
- Handles sugeridos (ainda não verificados): @glossa, @glossa.br, @canalglossa.
- Posicionamento: rigor + entretenimento. Todo vídeo tem fonte, e o canal desmonta mitos em vez de espalhá-los.

## Arquivos
| Caminho | O que é |
|---|---|
| `Glossa-Plano-Editorial-Mes-1.pdf` | Plano do mês 1 (133 págs.): estratégia, arquitetura, formatos, glossário, calendário e os 210 briefings. |
| `identidade-visual.html` | Guia de identidade visual (publicado também como artefato: https://claude.ai/artifact/MBmJMDW9pEP1Xfmc7CnN7q). |
| `conteudo/semanas/semana-1..4.txt`, `final.txt` | **Fonte principal.** 30 dias × 7 vídeos, com fio do dia, formato, termo, roteiro conectado e conexões. |
| `conteudo/1..7-*.txt` | Banco de fatos por quadro: título, visual base, legenda e fonte. O campo R destes arquivos é a versão antiga (sem conexões) e não é usado no PDF. |
| `conteudo/LEIA-ME.txt` | Explica os códigos dos vídeos. |
| `build/gerar-plano.js` | Gera o PDF: `node build/gerar-plano.js` (precisa de Node + Playwright com Chromium). |

### Formato dos arquivos de semana
```
# DIA 1 | Tema do dia | Fio do dia (uma frase)
## A1            <- código do vídeo: letra do quadro + número no arquivo do quadro
FMT: QUIZ        <- um dos 13 formatos
T: Epônimo       <- termo do Glossário Glossa (numerado automaticamente na 1ª aparição)
G: GANCHO        <- opcional; se faltar, usa o do arquivo do quadro
R: roteiro completo da narração
V+: notas extras de visual (somadas ao visual base)
P: conexões/notas (callbacks, teasers, episódios duplos)
```
Letras dos quadros e horários: A De Onde Vem? (07h) · B Aula de Letras (10h) · C Mito ou Verdade (12h) ·
D Línguas Extremas (15h) · E Brasil Falado (18h) · F Línguas Primas (20h) · G Gênios da Linguística (22h).
Cada dia tem os 7 quadros nessa ordem.

## Decisões editoriais (não mudar sem o dono pedir)
- **Arcos:** semana 1, "Toda palavra tem uma história"; semana 2, "O som e a escrita"; semana 3, "Famílias,
  viagens e encontros"; semana 4, "Língua, pensamento e sociedade"; dias 29–30, "Línguas que morrem, línguas que nascem".
- **Aula de Letras (10h)** = "Curso de Letras em 30 aulas" em módulos: semiótica/semântica (1–7), fonologia/morfologia (8–14),
  linguística textual (15–21, abre com contexto × cotexto, exemplo dado pelo dono), pragmática/sociolinguística (22–28), revisão (29–30).
- **13 formatos:** Revelação, Quiz, Desafio, Contagem, Linha do tempo, Cena, Comparativo, Desmonte, Julgamento (só Mito ou Verdade),
  Detetive, Parte 1/2, Parte 2/2, Revisão (domingos). Pelo menos 4 formatos diferentes por dia.
- **Conexões:** callback de no máximo uma frase (todo vídeo precisa funcionar sozinho), teasers, cartão final "a seguir",
  4 episódios duplos (dias 7, 14, 20, 25), arcos longos (gramaticalização: dia 1 → 22; etimologia popular: dia 1 → 29;
  dicionários: dias 2–7; morte/nascimento de línguas: dias 15 → 30).
- **Glossário Glossa:** cada vídeo ensina 1 termo, com selo "termo nº X" e depois "revisão · nº X" (184 termos no mês).
- **Dias da semana:** os roteiros assumem que o **dia 1 é uma segunda-feira** (falas como "na quarta"). Se a estreia mudar, ajustar.
- **Roteiro:** 75–125 palavras (~35–45 s a ~165 ppm). Gancho no primeiro 1,5 s. Termo técnico sempre traduzido na mesma frase.
- **Fatos:** cada briefing tem fonte. Conferir antes de gravar. Exemplos de *Vidas Secas* são adaptados (não citar como literais).

## Identidade visual (resumo; detalhes em `identidade-visual.html`)
- 9:16, 1080×1920. Fundo grafite `#111114` com textura de papel; texto creme `#F2EAD8`; ponto âmbar `#E8A33D` no logo "Glossa.".
- Cores por quadro (no vídeo, fundo escuro): De Onde Vem `#E8A33D`, Aula de Letras `#D9D0BC`, Mito `#E05A4F`,
  Extremas `#F2C94C`, Brasil Falado `#4CAF7A`, Primas `#5B9BE0`, Gênios `#A57FDB`. Uma cor de quadro por vídeo.
- Fontes (Google Fonts): DM Serif Display (palavra protagonista), Archivo 900 (gancho e legendas em CAIXA ALTA),
  IBM Plex Mono (metadados de dicionário), Noto Sans (IPA).
- Componentes: palavra protagonista, cartão etimológico, mapa escuro, árvore de línguas, carimbo MITO/VERDADE,
  legenda palavra a palavra. Zonas seguras: nada nos 20% de baixo nem nos 15% da direita. Selo do quadro no canto
  superior esquerdo, "G." no direito.

## Próximo passo (onde a conversa parou)
O dono quer **produzir os vídeos no PC**. Ainda falta definir com ele:
1. Se quer uma **ferramenta que gera os vídeos automaticamente** (ex.: um "Glossa Studio" local que lê
   `conteudo/semanas/*.txt`, renderiza as cenas com a identidade visual em HTML/Playwright ou Remotion e exporta MP4 9:16
   com legendas sincronizadas, selos e cartão final), um **guia de edição manual** (CapCut/DaVinci + templates por formato), ou os dois.
2. O **sistema do PC** (Windows, Mac ou Linux).
3. A **narração**: voz por IA paga (ex.: ElevenLabs, precisa de chave de API), voz por IA grátis (ex.: Edge TTS pt-BR)
   ou a própria voz do dono.
Pergunte isso antes de começar a construir.
