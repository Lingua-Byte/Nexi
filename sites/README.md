# Protótipos de SaaS: Agendaê e Radar Licita

Dois produtos completos, em HTML, CSS e JavaScript puro (sem etapa de build), com backend no Supabase.

- **Sem configuração** (`sites/config.js` vazio): os apps rodam em **modo demonstração**, com dados de exemplo salvos no navegador.
- **Com o Supabase configurado**: contas reais, dados na nuvem sincronizados entre aparelhos, página pública de agendamento, licitações reais do PNCP e análise de editais por IA.

Abra `sites/index.html` para ver os dois.

## O que já funciona

### Agendaê (`agendae/`)
- Cadastro, login, recuperação de senha e saída da conta (Supabase Auth).
- Cada negócio tem os próprios dados, protegidos por RLS. Salvamento automático com controle de versão: se outro aparelho salvar antes, o app recarrega e avisa.
- **Página pública de agendamento** (`#/agendar?n=seu-slug`): a cliente vê só serviços, profissionais e horários livres, nunca dados de outras clientes. A reserva é validada no servidor (conflito de horário, expediente, dias fechados, telefone, limite de 3 reservas por telefone em 24h) e aparece na agenda do dono em até 20 segundos.
- Agenda por profissional, clientes, serviços, equipe, financeiro com exportação CSV, dias fechados configuráveis.
- Lembretes e campanhas pelo WhatsApp em 1 clique por cliente (link `wa.me` com a mensagem pronta).

### Radar Licita (`radar-licita/`)
- Cadastro em 2 passos com **consulta real de CNPJ** (BrasilAPI / Receita Federal), login e recuperação de senha.
- **Licitações reais do PNCP** com prazo de proposta aberto nos estados do usuário (Edge Function `radar-editais`, cache de 15 min).
- Itens e arquivos de cada edital direto do PNCP (`radar-edital`) e link para o edital oficial.
- **Análise por IA com Claude** (`radar-ia`): lê o PDF do edital, resume, extrai exigências de habilitação, sinaliza amostra, garantia e visita técnica, e responde perguntas citando o item. Limite mensal por usuário (padrão: 100) controlado no banco.
- Pipeline kanban, favoritos, buscas salvas, gerador de proposta comercial e cofre de documentos com arquivos no Supabase Storage (bucket privado por usuário).

## Colocar no ar (passo a passo)

### 1. Criar o projeto no Supabase
1. Em [supabase.com](https://supabase.com), crie um projeto (região **South America (São Paulo)**). O plano gratuito serve para começar.
2. Abra **SQL Editor**, cole e rode, nesta ordem:
   - `supabase/migrations/20261114120000_agendae_radar.sql`
   - `supabase/migrations/20261114120100_radar_storage.sql`

   Ou pela linha de comando: `supabase link --project-ref SEU_REF` e depois `supabase db push`.

### 2. Configurar o login
Em **Authentication → URL Configuration**:
- **Site URL**: `https://lingua-byte.github.io/Nexi/sites/`
- **Redirect URLs**: adicione `https://lingua-byte.github.io/Nexi/sites/**` (e `http://localhost:8000/**` se for testar localmente).

Para produção, configure um SMTP próprio em **Authentication → SMTP** (Resend, Brevo, SES…). O envio padrão do Supabase tem limite baixo de e-mails por hora.

### 3. Publicar as Edge Functions (só o Radar Licita usa)
Instale o [Supabase CLI](https://supabase.com/docs/guides/cli) e, na raiz do repositório:

```bash
supabase login
supabase link --project-ref SEU_REF
supabase functions deploy radar-editais
supabase functions deploy radar-edital
supabase functions deploy radar-ia
supabase secrets set ANTHROPIC_API_KEY=sua-chave ALLOWED_ORIGIN=https://lingua-byte.github.io
```

- A chave da Anthropic é criada em [console.anthropic.com](https://console.anthropic.com). Sem ela, o Radar funciona, mas a análise por IA mostra "IA ainda não foi ativada".
- Custo estimado com o modelo `claude-opus-5-5`: cerca de US$ 0,20 a 0,50 por análise de edital (depende do tamanho do PDF). As perguntas seguintes no mesmo edital ficam mais baratas porque o edital é reaproveitado do cache. Ajuste o limite com `supabase secrets set RADAR_LIMITE_MENSAL=100`.

### 4. Ligar o site ao Supabase
Em **Project Settings → API**, copie a **Project URL** e a chave **anon public** e cole em `sites/config.js`:

```js
window.APP_CONFIG = {
  supabaseUrl: 'https://SEU_REF.supabase.co',
  supabaseAnonKey: 'eyJ...',
};
```

Essas duas informações são públicas por design; quem protege os dados são as políticas RLS do passo 1. **Nunca** coloque a `service_role` key nem a chave da Anthropic neste arquivo.

### 5. Publicar o site
Faça o merge da branch na `main`. O workflow `.github/workflows/deploy.yml` publica o repositório no GitHub Pages (em **Settings → Pages**, a fonte deve ser **GitHub Actions**). Os apps ficam em:
- `https://lingua-byte.github.io/Nexi/sites/agendae/`
- `https://lingua-byte.github.io/Nexi/sites/radar-licita/`

### 6. Conferir
1. Crie uma conta no Agendaê, cadastre um serviço e um profissional e abra o link de agendamento numa janela anônima. Faça uma reserva e veja-a chegar na agenda.
2. Crie uma conta no Radar Licita, escolha palavras-chave e estados e confira se as licitações do PNCP aparecem. Abra uma e clique em **Analisar edital com IA**.
3. No Supabase, rode **Advisors → Security** para confirmar que não há alertas.

## O que ainda não está pronto
| Item | Situação |
|---|---|
| Cobrança das assinaturas | Os botões avisam que o pagamento ainda não foi ativado. Requer conta num gateway (Stripe, Mercado Pago, Asaas…) e um webhook. |
| WhatsApp 100% automático | Hoje o envio é com 1 clique por mensagem. O envio sem clique exige a API oficial do WhatsApp Business (Meta) e um agendador. |
| Alertas automáticos do Radar por e-mail/WhatsApp | As preferências são salvas, mas o envio periódico ainda não existe (precisa de uma função agendada e de um provedor de e-mail). |
| Termos de uso e política de privacidade | Necessários antes de abrir ao público (LGPD). Não foram redigidos. |
| Textos de marketing | Depoimentos e números das landings são ilustrativos. Troque por dados reais. |

## Estrutura
```
sites/
  config.js              # URL e chave pública do Supabase (vazio = demonstração)
  shared/cloud.js        # login, salvamento versionado, chamadas às funções
  vendor/                # supabase-js 2.45.4 (MIT), sem depender de CDN
  agendae/               # app 1
  radar-licita/          # app 2
supabase/
  migrations/            # tabelas, RLS, funções SQL e bucket de documentos
  functions/             # radar-editais, radar-edital, radar-ia (Deno)
```
