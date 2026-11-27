# Site da corretora Quézia Santos

Site multipágina (HTML/CSS/JS puro, sem build) + painel administrativo em `/admin/`.
Pasta independente: não mexe no NEXI nem no RAIZ. Publicado junto no deploy: `…/Nexi/quezia/`.

## Páginas
`index` (início) · `imoveis` (lista com filtros e “ver mais”) · `imovel?id=` (detalhe, galeria, vídeo, simulador, agendar visita) ·
`reservados` (**Quézia Private**, imóveis off-market) · `vender` (anuncie seu imóvel) · `portfolio` (vídeos, negócios fechados, Instagram) ·
`sobre` · `contato` (mensagem, agendamento, todos os canais) · `admin/` (painel).

## Dois modos
| | Demonstração (padrão) | Real (Supabase) |
|---|---|---|
| Dados | só no navegador de quem abre | na nuvem, compartilhados |
| Painel | senha local, **não é seguro** | login de verdade, protegido no servidor |
| Contatos dos visitantes | ficam no navegador do visitante | chegam ao painel da Quézia |

**Para publicar de verdade é obrigatório ligar o modo real:**
1. Criar projeto grátis em supabase.com.
2. SQL Editor → colar `supabase/schema.sql` (trocando `EMAIL_DA_QUEZIA@exemplo.com` pelo e-mail dela) → Run.
3. Authentication → Users → *Add user* (e-mail + senha dela). Em Authentication → Providers/Sign In, **desligar “Allow new users to sign up”**.
4. Project Settings → API → copiar *Project URL* e a chave *anon/publishable* para `assets/js/config.js`.
5. Entrar em `/admin/`, enviar a foto dela, preencher contatos e remover os imóveis de exemplo (Conta → Remover exemplos).

Segurança no modo real: regras do banco (RLS) só deixam a administradora ler contatos, editar imóveis e ver os dados confidenciais dos reservados; visitantes só conseguem *enviar* contatos. A chave `anon` pode ficar pública.

## Quézia Private (off-market)
Termo de mercado: *off-market* / *pocket listing*. O público vê só uma vitrine (referência, bairro, faixa de valor, imagem desfocada **no envio**, a original não é publicada). Endereço, valor real, proprietário e fotos ficam na tabela `property_secrets`, só no painel.

## Pendências que dependem da Quézia
Foto dela, WhatsApp/telefone, e-mail, CRECI, demais redes (TikTok, YouTube…), vídeos (links de Reels/YouTube/mp4) e imóveis reais. Textos e imóveis atuais são exemplos. Nada é inventado: números e depoimentos só aparecem se ela preencher.
