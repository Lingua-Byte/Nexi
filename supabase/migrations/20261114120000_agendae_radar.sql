-- Backend dos protótipos Agendaê e Radar Licita.
-- Rode uma vez no SQL Editor do Supabase (ou `supabase db push`).
--
-- Modelo: cada conta guarda o estado do app num documento JSON versionado
-- (controle otimista de concorrência). O que vem de fora, como reservas da
-- página pública do Agendaê, entra por funções SECURITY DEFINER que validam
-- tudo no servidor e nunca expõem dados de clientes.


-- ---------------------------------------------------------------------------
-- Utilitários
-- ---------------------------------------------------------------------------
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- Data e hora "de agora" no fuso de Brasília.
create or replace function public.br_now()
returns timestamp language sql stable set search_path = '' as $$
  select (now() at time zone 'America/Sao_Paulo')
$$;

create or replace function public.hhmm_to_min(p text)
returns integer language sql immutable set search_path = '' as $$
  select split_part(p, ':', 1)::int * 60 + split_part(p, ':', 2)::int
$$;

-- ===========================================================================
-- AGENDAÊ
-- ===========================================================================
create table public.agendae_negocios (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null unique references auth.users(id) on delete cascade,
  slug        text not null unique check (slug ~ '^[a-z0-9]([a-z0-9-]{1,58})[a-z0-9]$'),
  data        jsonb not null default '{}'::jsonb,
  version     integer not null default 1,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger agendae_negocios_updated before update on public.agendae_negocios
  for each row execute function public.tg_set_updated_at();

alter table public.agendae_negocios enable row level security;
create policy "dono lê seu negócio" on public.agendae_negocios
  for select to authenticated using (owner_id = (select auth.uid()));
create policy "dono cria seu negócio" on public.agendae_negocios
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "dono altera seu negócio" on public.agendae_negocios
  for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "dono exclui seu negócio" on public.agendae_negocios
  for delete to authenticated using (owner_id = (select auth.uid()));

-- Reservas feitas na página pública. Ficam aqui até o app do dono importá-las.
create table public.agendae_reservas (
  id          uuid primary key default gen_random_uuid(),
  negocio_id  uuid not null references public.agendae_negocios(id) on delete cascade,
  servico_id  text not null,
  prof_id     text not null,
  data        date not null,
  hora        text not null check (hora ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  duracao     integer not null check (duracao between 5 and 720),
  preco       numeric(10,2) not null default 0,
  nome        text not null check (char_length(btrim(nome)) between 2 and 120),
  tel         text not null check (char_length(regexp_replace(tel, '\D', '', 'g')) between 10 and 13),
  status      text not null check (status in ('pendente', 'confirmado')),
  created_at  timestamptz not null default now()
);
create index agendae_reservas_negocio_idx on public.agendae_reservas (negocio_id, data);

alter table public.agendae_reservas enable row level security;
create policy "dono lê reservas" on public.agendae_reservas
  for select to authenticated using (exists (
    select 1 from public.agendae_negocios n where n.id = negocio_id and n.owner_id = (select auth.uid())));
create policy "dono remove reservas importadas" on public.agendae_reservas
  for delete to authenticated using (exists (
    select 1 from public.agendae_negocios n where n.id = negocio_id and n.owner_id = (select auth.uid())));
-- Sem política de INSERT: reservas só entram por public.agendae_book().

-- Salva o documento se ninguém salvou antes (versão confere). Retorna a nova
-- versão, ou -1 em caso de conflito (outro aparelho salvou primeiro).
create or replace function public.agendae_save(p_data jsonb, p_version integer)
returns integer language plpgsql security invoker set search_path = '' as $$
declare v integer;
begin
  if jsonb_typeof(p_data) <> 'object' then raise exception 'dados inválidos'; end if;
  update public.agendae_negocios
     set data = p_data, version = version + 1
   where owner_id = auth.uid() and version = p_version
  returning version into v;
  return coalesce(v, -1);
end $$;

-- Horários ocupados (agendamentos + reservas pendentes) de um negócio.
create or replace function public.agendae_busy(p_negocio uuid, p_from date, p_to date)
returns table (prof_id text, data date, ini integer, fim integer)
language sql stable security definer set search_path = '' as $$
  with n as (select data from public.agendae_negocios where id = p_negocio),
  svc as (
    select s->>'id' as id, coalesce((s->>'duracao')::int, 30) as dur
    from n, jsonb_array_elements(coalesce(n.data->'servicos', '[]'::jsonb)) s
  ),
  ags as (
    select a->>'profId' as prof_id, (a->>'data')::date as data, public.hhmm_to_min(a->>'hora') as ini,
           coalesce((select dur from svc where svc.id = a->>'servicoId'), 30) as dur
    from n, jsonb_array_elements(coalesce(n.data->'ags', '[]'::jsonb)) a
    where coalesce(a->>'status', '') not in ('cancelado', 'faltou')
      and a->>'data' ~ '^\d{4}-\d{2}-\d{2}$' and a->>'hora' ~ '^\d{2}:\d{2}$'
  )
  select prof_id, data, ini, ini + dur from ags where data between p_from and p_to
  union all
  select r.prof_id, r.data, public.hhmm_to_min(r.hora), public.hhmm_to_min(r.hora) + r.duracao
  from public.agendae_reservas r where r.negocio_id = p_negocio and r.data between p_from and p_to
$$;
revoke all on function public.agendae_busy(uuid, date, date) from public, anon, authenticated;

-- Dados públicos para a página de agendamento: nada de clientes, só o que a
-- pessoa precisa para escolher serviço, profissional e horário.
create or replace function public.agendae_public_info(p_slug text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare n public.agendae_negocios; hoje date := public.br_now()::date;
begin
  select * into n from public.agendae_negocios where slug = lower(p_slug);
  if not found then return null; end if;
  return jsonb_build_object(
    'config', jsonb_build_object(
      'nome', n.data->'config'->'nome', 'endereco', n.data->'config'->'endereco', 'tel', n.data->'config'->'tel',
      'abre', coalesce(n.data->'config'->>'abre', '08:00'), 'fecha', coalesce(n.data->'config'->>'fecha', '18:00'),
      'diasFechados', coalesce(n.data->'config'->'diasFechados', '[0]'::jsonb),
      'confirmAuto', coalesce((n.data->'config'->>'confirmAuto')::boolean, true)),
    'servicos', (select coalesce(jsonb_agg(jsonb_build_object('id', s->>'id', 'nome', s->>'nome', 'duracao', (s->>'duracao')::int,
                   'preco', (s->>'preco')::numeric, 'categoria', s->>'categoria')), '[]'::jsonb)
                 from jsonb_array_elements(coalesce(n.data->'servicos', '[]'::jsonb)) s),
    'profs', (select coalesce(jsonb_agg(jsonb_build_object('id', p->>'id', 'nome', p->>'nome', 'cor', p->>'cor',
                'cargo', p->>'cargo', 'cats', p->'cats')), '[]'::jsonb)
              from jsonb_array_elements(coalesce(n.data->'profs', '[]'::jsonb)) p),
    'busy', (select coalesce(jsonb_agg(jsonb_build_object('profId', b.prof_id, 'data', b.data, 'ini', b.ini, 'fim', b.fim)), '[]'::jsonb)
             from public.agendae_busy(n.id, hoje, hoje + 60) b),
    'hoje', hoje, 'agoraMin', extract(hour from public.br_now())::int * 60 + extract(minute from public.br_now())::int
  );
end $$;

-- Cria uma reserva pela página pública, validando tudo no servidor.
create or replace function public.agendae_book(
  p_slug text, p_servico_id text, p_prof_id text, p_data date, p_hora text, p_nome text, p_tel text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  n public.agendae_negocios;
  svc jsonb; prof jsonb; chosen text;
  v_dur integer; v_ini integer; v_abre integer; v_fecha integer;
  hoje date := public.br_now()::date;
  agora integer := extract(hour from public.br_now())::int * 60 + extract(minute from public.br_now())::int;
  tel_digits text := regexp_replace(coalesce(p_tel, ''), '\D', '', 'g');
  st text; rid uuid;
begin
  -- Trava o negócio: duas reservas simultâneas não pegam o mesmo horário.
  select * into n from public.agendae_negocios where slug = lower(p_slug) for update;
  if not found then raise exception 'negocio_nao_encontrado'; end if;

  if p_hora !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then raise exception 'horario_invalido'; end if;
  if char_length(btrim(coalesce(p_nome, ''))) < 2 then raise exception 'nome_invalido'; end if;
  if char_length(tel_digits) not between 10 and 13 then raise exception 'telefone_invalido'; end if;

  select s into svc from jsonb_array_elements(coalesce(n.data->'servicos', '[]'::jsonb)) s where s->>'id' = p_servico_id;
  if svc is null then raise exception 'servico_invalido'; end if;
  v_dur := coalesce((svc->>'duracao')::int, 30);
  v_ini := public.hhmm_to_min(p_hora);
  v_abre := public.hhmm_to_min(coalesce(n.data->'config'->>'abre', '08:00'));
  v_fecha := public.hhmm_to_min(coalesce(n.data->'config'->>'fecha', '18:00'));

  if p_data < hoje or p_data > hoje + 60 then raise exception 'data_invalida'; end if;
  if p_data = hoje and v_ini <= agora + 30 then raise exception 'horario_passado'; end if;
  if coalesce(n.data->'config'->'diasFechados', '[0]'::jsonb) @> to_jsonb(extract(dow from p_data)::int) then raise exception 'dia_fechado'; end if;
  if v_ini < v_abre or v_ini + v_dur > v_fecha then raise exception 'fora_do_expediente'; end if;

  -- Antiabuso: no máximo 3 reservas pendentes por telefone em 24h.
  if (select count(*) from public.agendae_reservas r where r.negocio_id = n.id
        and regexp_replace(r.tel, '\D', '', 'g') = tel_digits and r.created_at > now() - interval '24 hours') >= 3 then
    raise exception 'limite_de_reservas';
  end if;

  for prof in select p from jsonb_array_elements(coalesce(n.data->'profs', '[]'::jsonb)) p
    where (p_prof_id is null or p_prof_id = '' or p->>'id' = p_prof_id)
      and coalesce(p->'cats', '[]'::jsonb) @> to_jsonb(svc->>'categoria')
  loop
    if not exists (select 1 from public.agendae_busy(n.id, p_data, p_data) b
                   where b.prof_id = prof->>'id' and b.ini < v_ini + v_dur and b.fim > v_ini) then
      chosen := prof->>'id';
      exit;
    end if;
  end loop;
  if chosen is null then raise exception 'horario_indisponivel'; end if;

  st := case when coalesce((n.data->'config'->>'confirmAuto')::boolean, true) then 'confirmado' else 'pendente' end;
  insert into public.agendae_reservas (negocio_id, servico_id, prof_id, data, hora, duracao, preco, nome, tel, status)
  values (n.id, p_servico_id, chosen, p_data, p_hora, v_dur, coalesce((svc->>'preco')::numeric, 0), btrim(p_nome), p_tel, st)
  returning id into rid;

  return jsonb_build_object('id', rid, 'profId', chosen, 'status', st, 'data', p_data, 'hora', p_hora,
    'servico', svc->>'nome', 'preco', (svc->>'preco')::numeric,
    'profNome', (select p->>'nome' from jsonb_array_elements(n.data->'profs') p where p->>'id' = chosen));
end $$;

revoke all on function public.agendae_public_info(text) from public;
revoke all on function public.agendae_book(text, text, text, date, text, text, text) from public;
revoke all on function public.agendae_save(jsonb, integer) from public, anon;
grant execute on function public.agendae_public_info(text) to anon, authenticated;
grant execute on function public.agendae_book(text, text, text, date, text, text, text) to anon, authenticated;
grant execute on function public.agendae_save(jsonb, integer) to authenticated;

-- ===========================================================================
-- RADAR LICITA
-- ===========================================================================
create table public.radar_contas (
  owner_id    uuid primary key references auth.users(id) on delete cascade,
  data        jsonb not null default '{}'::jsonb,
  version     integer not null default 1,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger radar_contas_updated before update on public.radar_contas
  for each row execute function public.tg_set_updated_at();

alter table public.radar_contas enable row level security;
create policy "dono lê sua conta" on public.radar_contas
  for select to authenticated using (owner_id = (select auth.uid()));
create policy "dono cria sua conta" on public.radar_contas
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "dono altera sua conta" on public.radar_contas
  for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "dono exclui sua conta" on public.radar_contas
  for delete to authenticated using (owner_id = (select auth.uid()));

create or replace function public.radar_save(p_data jsonb, p_version integer)
returns integer language plpgsql security invoker set search_path = '' as $$
declare v integer;
begin
  if jsonb_typeof(p_data) <> 'object' then raise exception 'dados inválidos'; end if;
  update public.radar_contas set data = p_data, version = version + 1
   where owner_id = auth.uid() and version = p_version
  returning version into v;
  return coalesce(v, -1);
end $$;
revoke all on function public.radar_save(jsonb, integer) from public, anon;
grant execute on function public.radar_save(jsonb, integer) to authenticated;

-- Uso mensal de análises por IA (gravado só pela Edge Function, com a service role).
create table public.radar_uso (
  owner_id  uuid not null references auth.users(id) on delete cascade,
  mes       text not null check (mes ~ '^\d{4}-\d{2}$'),
  analises  integer not null default 0,
  primary key (owner_id, mes)
);
alter table public.radar_uso enable row level security;
create policy "dono vê seu uso" on public.radar_uso
  for select to authenticated using (owner_id = (select auth.uid()));

-- Incremento atômico com limite; retorna o novo total ou -1 se estourou.
create or replace function public.radar_consumir_analise(p_owner uuid, p_limite integer)
returns integer language plpgsql security definer set search_path = '' as $$
declare m text := to_char(public.br_now(), 'YYYY-MM'); v integer;
begin
  insert into public.radar_uso (owner_id, mes, analises) values (p_owner, m, 0)
  on conflict (owner_id, mes) do nothing;
  update public.radar_uso set analises = analises + 1
   where owner_id = p_owner and mes = m and analises < p_limite
  returning analises into v;
  return coalesce(v, -1);
end $$;
revoke all on function public.radar_consumir_analise(uuid, integer) from public, anon, authenticated;

-- Devolve uma análise quando a chamada à IA falhou depois de consumida.
create or replace function public.radar_devolver_analise(p_owner uuid)
returns void language sql security definer set search_path = '' as $$
  update public.radar_uso set analises = greatest(0, analises - 1)
   where owner_id = p_owner and mes = to_char(public.br_now(), 'YYYY-MM')
$$;
revoke all on function public.radar_devolver_analise(uuid) from public, anon, authenticated;
