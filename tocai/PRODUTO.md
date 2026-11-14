# Tocaí: marketplace de música ao vivo para eventos

O "iFood de músicos": quem organiza um evento encontra, contrata e paga músicos num só lugar. A plataforma intermedeia o pagamento e garante os dois lados.

Protótipo navegável: `tocai/index.html` (HTML único, sem backend, dados de exemplo).

## Atores

| Ator | O que faz |
|---|---|
| Contratante | Pessoa física (casamento, aniversário) ou empresa/estabelecimento (corporativo, bar). Busca, contrata, paga, avalia. |
| Artista | Solo, duo, banda, DJ, coral. Mantém perfil, pacotes, agenda; aceita pedidos; faz check-in; recebe. |
| Operação Tocaí | Verifica cadastros, media contestações, aciona substituto quando um artista cancela. |

## Fluxo principal

1. **Busca**: data + tipo de evento + formação + estilo. Só aparece quem está livre na data.
2. **Perfil**: amostra de áudio/vídeo, repertório, rider técnico, pacotes com preço fechado, avaliações.
3. **Pedido**: endereço, horário, convidados, adicionais. Preço final calculado na hora (cachê + adicionais + deslocamento + taxa).
4. **Pré-autorização** do pagamento. Artista tem 2 h para aceitar; sem resposta, o valor é liberado e o cliente recebe sugestões parecidas.
5. **Aceite**: data bloqueada na agenda, pagamento capturado e retido (escrow). Chat liberado; telefone só após aceite.
6. **Dia do evento**: "a caminho" → check-in por geolocalização no local → "no palco".
7. **Conclusão**: janela de 24 h para contestação. Sem contestação, repasse ao artista (Pix, semanal).
8. **Avaliação** dos dois lados.

## Modelo de receita

- Taxa de serviço do contratante: **8%** sobre o cachê.
- Comissão do artista: **12%** sobre o cachê.
- Deslocamento: grátis até 15 km; acima, R$ 3/km ida e volta, 100% para o artista.
- Futuro: plano "Destaque" para artistas, assinatura para bares com agenda fixa, seguro do evento.

Exemplo, cachê de R$ 1.500: cliente paga R$ 1.620, artista recebe R$ 1.320, Tocaí fica com R$ 300.

## Regras de negócio

**Cancelamento pelo contratante**: ≥ 30 dias, 100% de reembolso; 7 a 29 dias, 50%; < 7 dias, sem reembolso (artista recebe o cachê).
**Cancelamento pelo artista**: reembolso total ou substituto equivalente; penalidade no ranking; suspensão na reincidência.
**Anti-desintermediação**: contatos ocultos até o aceite; mensagens com telefone/e-mail antes disso são mascaradas.
**Ranking**: nota × volume de avaliações, taxa de aceite, tempo de resposta, cancelamentos.
**Verificação**: documento (CPF/CNPJ), vídeo ao vivo e conta bancária no mesmo nome.

## Modelo de dados (MVP)

```
users(id, tipo[cliente|artista|admin], nome, email, telefone, documento, criado_em)
artists(id, user_id, nome_artistico, formacao, generos[], tipos_evento[], bio, cidade, raio_km,
        nota_media, total_avaliacoes, tempo_resposta_min, verificado)
packages(id, artist_id, nome, descricao, horas, preco_centavos, ativo)
media(id, artist_id, tipo[audio|video|foto], url)
repertoire(id, artist_id, titulo, autor)
rider_items(id, artist_id, descricao)
availability_blocks(id, artist_id, data, motivo[show|bloqueio_manual|agenda_externa])
bookings(id, cliente_id, artist_id, package_id, data, hora_inicio, endereco, lat, lng,
         tipo_evento, convidados, observacao, status, subtotal, deslocamento, taxa_cliente,
         comissao_artista, total, criado_em)
booking_extras(booking_id, extra_id, preco_centavos)
booking_events(id, booking_id, status, ocorrido_em, lat, lng)        -- timeline / tracking
payments(id, booking_id, gateway_id, metodo, status[pre_autorizado|capturado|estornado], valor)
payouts(id, artist_id, booking_id, valor, status, pago_em)
messages(id, booking_id, autor_id, texto, criado_em)
reviews(id, booking_id, autor_id, alvo_id, nota, texto)
disputes(id, booking_id, aberto_por, motivo, status, resolucao)
```

Status do pedido: `solicitado → aceito → a_caminho → no_palco → concluido`, com saídas `recusado`, `expirado`, `cancelado_cliente`, `cancelado_artista`, `contestado`.

## Stack sugerida

- **App**: React Native (Expo) para cliente e artista no mesmo app com dois modos; web em Next.js para busca e SEO dos perfis.
- **Backend**: Supabase (Postgres + Auth + Storage + Realtime para chat e tracking) ou Node/NestJS + Postgres.
- **Pagamentos com split e custódia**: Pagar.me, Asaas, Mercado Pago (marketplace) ou Stripe Connect. Precisa suportar pré-autorização, captura posterior e repasse para subconta.
- **Busca/geo**: PostGIS para raio de atendimento; índice por data livre.
- **Notificações**: push (Expo), WhatsApp Business API para aceite rápido do artista.

## Roadmap

**MVP (8 a 10 semanas)**: cadastro e verificação manual de artistas; perfil com pacotes; busca por data/estilo; pedido com pagamento retido; aceite/recusa; chat; avaliação; repasse manual semanal. Uma cidade.
**V2**: tracking com check-in por GPS; sincronização com Google Agenda; contestação no app; substituto automático; cupons.
**V3**: pedido aberto ("preciso de banda de forró dia 12, até R$ 2.000") em que artistas enviam proposta; contratos para eventos corporativos com nota fiscal; agenda recorrente para bares.

## Métricas

- Tempo médio até o primeiro aceite.
- Taxa de conversão busca → pedido → aceite.
- Taxa de cancelamento por lado.
- GMV mensal e take rate efetivo.
- Recompra de contratantes (bares e empresas) e nota média por categoria.

## Riscos

- **Negociação por fora** depois do primeiro show: mitigar com garantias que só existem dentro da plataforma (pagamento protegido, substituto, nota fiscal) e taxa menor para recontratação.
- **Oferta fraca no lançamento**: começar com uma cidade e poucos estilos de alta demanda (voz e violão, DJ, cordas para casamento, samba).
- **Responsabilidade civil e trabalhista**: termos de uso deixando claro que a Tocaí intermedeia; artistas como MEI/PJ; validar com advogado.
