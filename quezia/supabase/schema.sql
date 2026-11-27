-- Quézia Santos Imóveis — esquema do banco (Supabase). Rode no "SQL Editor" do projeto.
-- ANTES: troque 'EMAIL_DA_QUEZIA@exemplo.com' pelo e-mail com que ela fará login.

create table if not exists admins(email text primary key);
insert into admins values ('EMAIL_DA_QUEZIA@exemplo.com') on conflict do nothing;

create or replace function is_admin() returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from admins where lower(email)=lower(coalesce(auth.jwt()->>'email','')))
$$;

create table if not exists properties(
  id text primary key, status text not null default 'ativo', offmarket boolean default false,
  destaque boolean default false, ord bigint default (extract(epoch from now())*1000)::bigint,
  data jsonb not null, created_at timestamptz default now(), updated_at timestamptz default now());
create table if not exists property_secrets(id text primary key references properties(id) on delete cascade, data jsonb not null default '{}');
create table if not exists videos(id text primary key, ord int default 0, data jsonb not null);
create table if not exists settings(key text primary key, data jsonb not null);
create table if not exists leads(id text primary key, data jsonb not null, created_at timestamptz default now());

alter table admins enable row level security;
alter table properties enable row level security;
alter table property_secrets enable row level security;
alter table videos enable row level security;
alter table settings enable row level security;
alter table leads enable row level security;

-- admins: só a própria administradora enxerga a lista
create policy admins_read on admins for select using (is_admin());
-- público lê imóveis publicados; rascunhos só a administradora
create policy prop_read on properties for select using (status <> 'rascunho' or is_admin());
create policy prop_w on properties for all using (is_admin()) with check (is_admin());
-- segredos dos imóveis reservados (endereço real, preço, proprietário): SÓ administradora
create policy sec_all on property_secrets for all using (is_admin()) with check (is_admin());
create policy vid_read on videos for select using (true);
create policy vid_w on videos for all using (is_admin()) with check (is_admin());
create policy set_read on settings for select using (true);
create policy set_w on settings for all using (is_admin()) with check (is_admin());
-- visitantes só podem ENVIAR contatos (pequenos); só a administradora lê/edita/apaga
create policy lead_ins on leads for insert to anon, authenticated with check (octet_length(data::text) < 6000);
create policy lead_adm on leads for select using (is_admin());
create policy lead_upd on leads for update using (is_admin());
create policy lead_del on leads for delete using (is_admin());

-- fotos: pasta pública para leitura, envio só pela administradora
insert into storage.buckets(id,name,public) values ('media','media',true) on conflict do nothing;
create policy media_read on storage.objects for select using (bucket_id='media');
create policy media_ins on storage.objects for insert with check (bucket_id='media' and is_admin());
create policy media_upd on storage.objects for update using (bucket_id='media' and is_admin());
create policy media_del on storage.objects for delete using (bucket_id='media' and is_admin());
