# Lingua-Byte — repositório geral

Repositório central para todos os meus programas. Cada projeto vive na sua própria pasta, isolado dos outros.

## Estrutura

| Pasta | Para quê |
|---|---|
| `apps/` | Aplicativos prontos para usar (web apps, PWAs, jogos). Tudo aqui é publicado no GitHub Pages. |
| `tools/` | Scripts e utilitários (Python, shell, automações, bots). |
| `experiments/` | Protótipos e testes rápidos — pode ser bagunçado. |
| `templates/` | Modelos para começar um projeto novo copiando uma pasta. |

## Projetos

| Projeto | Pasta | Descrição |
|---|---|---|
| NEXI | [`apps/nexi`](apps/nexi) | Bichinho virtual com minijogos (PWA). |

## Como criar um projeto novo

1. Copie um modelo: `cp -r templates/web-app apps/meu-projeto`
2. Edite os arquivos e o `README.md` da pasta.
3. Adicione o projeto na tabela acima e no `index.html` da raiz (a página inicial).
4. Faça commit e push. Ao chegar na `main`, os web apps ficam disponíveis em
   `https://<usuario>.github.io/<repositorio>/apps/meu-projeto/`.

## Regras simples

- Um projeto = uma pasta. Nada de arquivos soltos na raiz.
- Cada projeto tem seu próprio `README.md` dizendo o que é e como rodar.
- Nomes de pasta em minúsculas, com hífen: `meu-projeto`.
- Nunca faça commit de chaves de API ou senhas.
