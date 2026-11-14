# Protótipos de SaaS

Dois front-ends completos e navegáveis, feitos em HTML, CSS e JavaScript puro (sem build). Abra `sites/index.html` no navegador, ou acesse `/sites/` no GitHub Pages depois do merge na `main`.

Os dados de exemplo são gerados no primeiro acesso e salvos no `localStorage`. Cada app tem um botão para restaurar os dados de exemplo.

## Agendaê (`agendae/`)
SaaS vertical para clínicas de estética, salões e barbearias.

| Rota | Tela |
|---|---|
| `#/` | Landing page: recursos, preços mensal/anual, FAQ |
| `#/entrar` | Login e cadastro (`?cadastro`) |
| `#/app` | Painel: faturamento, ticket médio, faltas, oportunidades de receita |
| `#/app/agenda` | Agenda diária por profissional, encaixe por clique, status e pagamento |
| `#/app/clientes` | Clientes com filtros (VIP, sumidos, aniversariantes) e campanha de reativação |
| `#/app/servicos` | Catálogo de serviços |
| `#/app/financeiro` | Receitas, despesas, lucro, a receber, comissões e exportação CSV |
| `#/app/config` | Dados do negócio, link de agendamento, modelo de WhatsApp e automações |
| `#/agendar` | Página pública em que a cliente agenda sozinha |

## Radar Licita (`radar-licita/`)
Ferramenta de IA que encontra licitações e analisa editais.

| Rota | Tela |
|---|---|
| `#/` | Landing page: como funciona, recursos, preços, FAQ |
| `#/entrar` | Onboarding em 2 passos (CNPJ, depois palavras-chave e estados) |
| `#/app` | Painel: novas oportunidades, valor em disputa, taxa de vitória, prazos |
| `#/app/oportunidades` | Busca com filtros e nota de compatibilidade de 0 a 100 |
| `#/app/edital/:id` | Resumo por IA, exigências × documentos, itens, prazos e chat "pergunte ao edital" |
| `#/app/pipeline` | Kanban com arrastar e soltar |
| `#/app/alertas` | Perfil de busca (recalcula as notas) e canais de alerta |
| `#/app/documentos` | Cofre de certidões com validade |
| `#/app/plano` | Uso e planos |

A nota de compatibilidade, o resumo e as respostas do chat são calculados no navegador a partir de dados simulados. Para colocar em produção, o próximo passo é um backend (por exemplo, Supabase) com coleta diária do PNCP e um LLM lendo os PDFs dos editais.
