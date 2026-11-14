-- =========================================================
-- Rede Letras — portal de projetos entre universidades
-- Esquema para Supabase (PostgreSQL)
-- Espelha a camada de demonstração em js/store.js.
-- Rode no SQL Editor de um projeto Supabase NOVO.
-- Ainda não foi aplicado em nenhum projeto.
-- =========================================================

-- ---------- Universidades participantes ----------
create table public.institutions (
  id     text primary key,                 -- 'uerj', 'ufrj'…
  short  text not null,                    -- 'UERJ'
  name   text not null,
  unit   text not null default 'Letras'    -- instituto/faculdade
);
create table public.institution_domains (
  domain         text primary key check (domain = lower(domain)),   -- 'uerj.br'
  institution_id text not null references public.institutions(id) on delete cascade
);
insert into public.institutions (id, short, name, unit) values
  ('uerj','UERJ','Universidade do Estado do Rio de Janeiro','Instituto de Letras'),
  ('ufrj','UFRJ','Universidade Federal do Rio de Janeiro','Faculdade de Letras'),
  ('uff','UFF','Universidade Federal Fluminense','Instituto de Letras'),
  ('usp','USP','Universidade de São Paulo','FFLCH — Letras');
insert into public.institution_domains (domain, institution_id) values
  ('uerj.br','uerj'), ('ufrj.br','ufrj'), ('uff.br','uff'), ('usp.br','usp');
-- Para incluir uma universidade nova: um insert em cada tabela acima.

-- Descobre a universidade pelo e-mail (aceita subdomínios: graduacao.uerj.br).
create or replace function public.institution_for_email(_email text) returns text
language sql stable security definer set search_path = '' as $$
  select d.institution_id from public.institution_domains d
  where lower(split_part(_email, '@', 2)) = d.domain or lower(split_part(_email, '@', 2)) like '%.' || d.domain
  order by length(d.domain) desc limit 1
$$;

-- ---------- Cadastro restrito a e-mail institucional ----------
-- Bloqueia no servidor qualquer cadastro fora dos domínios participantes.
-- A validação no app é só conveniência.
create or replace function public.enforce_institution_email()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if public.institution_for_email(new.email) is null then
    raise exception 'Cadastro permitido apenas com e-mail institucional de uma universidade participante.';
  end if;
  return new;
end $$;

drop trigger if exists enforce_institution_email on auth.users;
create trigger enforce_institution_email before insert or update of email on auth.users
  for each row execute function public.enforce_institution_email();
-- Em Authentication > Providers > Email, mantenha "Confirm email" ATIVADO.

-- ---------- Tabelas ----------
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null check (char_length(name) between 3 and 80),
  role        text not null default 'aluno' check (role in ('aluno','professor')),
  course      text not null default 'Outro',
  bio         text not null default '' check (char_length(bio) <= 300),
  institution_id text not null references public.institutions(id),
  is_mod      boolean not null default false,       -- modera a própria universidade
  is_admin    boolean not null default false,       -- equipe geral do portal
  created_at  timestamptz not null default now()
);

-- A universidade do perfil vem sempre do e-mail, nunca do que o cliente envia.
create or replace function public.set_profile_institution() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.institution_id := public.institution_for_email((select email from auth.users where id = new.id));
  if new.institution_id is null then raise exception 'E-mail sem universidade participante.'; end if;
  return new;
end $$;
create trigger set_profile_institution before insert or update of institution_id on public.profiles
  for each row execute function public.set_profile_institution();

create table public.projects (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 3 and 100),
  kind        text not null default 'Outro',
  area        text not null default 'Outro',
  institution_id text references public.institutions(id),   -- preenchido pelo gatilho (universidade de quem cria)
  description text not null check (char_length(description) between 10 and 1500),
  owner_id    uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now()
);

create table public.project_members (
  project_id  uuid references public.projects(id) on delete cascade,
  user_id     uuid references public.profiles(id) on delete cascade,
  role        text not null default 'membro' check (char_length(role) <= 30),
  primary key (project_id, user_id)
);

create table public.posts (
  id          uuid primary key default gen_random_uuid(),
  author_id   uuid not null references public.profiles(id) on delete cascade,
  project_id  uuid references public.projects(id) on delete set null,
  text        text not null default '' check (char_length(text) <= 2000),
  image_path  text,                       -- caminho no bucket "post-images"
  link        text check (link is null or link ~* '^https?://'),
  hidden      boolean not null default false,
  created_at  timestamptz not null default now(),
  check (char_length(text) > 0 or image_path is not null)
);
create index posts_created_idx on public.posts (created_at desc);
create index posts_project_idx on public.posts (project_id);

create table public.comments (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references public.posts(id) on delete cascade,
  author_id   uuid not null references public.profiles(id) on delete cascade,
  text        text not null check (char_length(text) between 1 and 1000),
  created_at  timestamptz not null default now()
);
create index comments_post_idx on public.comments (post_id, created_at);

create table public.likes (
  post_id     uuid references public.posts(id) on delete cascade,
  user_id     uuid references public.profiles(id) on delete cascade,
  primary key (post_id, user_id)
);

create table public.follows (
  follower_id uuid references public.profiles(id) on delete cascade,
  target_type text check (target_type in ('user','project')),
  target_id   uuid not null,
  created_at  timestamptz not null default now(),
  primary key (follower_id, target_type, target_id)
);

create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  type        text not null,
  actor_id    uuid references public.profiles(id) on delete cascade,
  post_id     uuid references public.posts(id) on delete cascade,
  project_id  uuid references public.projects(id) on delete cascade,
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

create table public.collab_requests (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  message     text not null check (char_length(message) between 10 and 600),
  status      text not null default 'pendente' check (status in ('pendente','aceito','recusado')),
  created_at  timestamptz not null default now()
);
create unique index collab_one_pending on public.collab_requests (project_id, user_id) where status = 'pendente';

create table public.reports (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references public.posts(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason      text not null,
  status      text not null default 'aberta' check (status in ('aberta','oculto','descartada')),
  created_at  timestamptz not null default now()
);

-- ---------- Funções auxiliares ----------
create or replace function public.is_mod() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select is_mod or is_admin from public.profiles where id = auth.uid()), false)
$$;

-- Pode moderar conteúdo desta pessoa? Equipe geral: sempre. Moderação local: mesma universidade.
create or replace function public.can_moderate(_author uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles m, public.profiles a
    where m.id = auth.uid() and a.id = _author
      and (m.is_admin or (m.is_mod and m.institution_id = a.institution_id))
  )
$$;

create or replace function public.is_project_owner(p uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.projects where id = p and owner_id = auth.uid())
$$;

create or replace function public.is_project_member(p uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.project_members where project_id = p and user_id = auth.uid())
$$;

-- Usuário comum não pode se promover a moderador.
create or replace function public.protect_is_mod() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  -- auth.uid() nulo = SQL Editor ou service role (administração), que pode alterar.
  if auth.uid() is not null and not coalesce((select is_admin from public.profiles where id = auth.uid()), false) then
    new.is_mod := old.is_mod;
    new.is_admin := old.is_admin;
  end if;
  return new;
end $$;
create trigger protect_is_mod before update on public.profiles
  for each row execute function public.protect_is_mod();

-- Quem cria o projeto entra como coordenação e passa a acompanhá-lo.
create or replace function public.on_project_created() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.projects set institution_id = (select institution_id from public.profiles where id = new.owner_id) where id = new.id;
  insert into public.project_members(project_id, user_id, role) values (new.id, new.owner_id, 'coordenação');
  insert into public.follows(follower_id, target_type, target_id) values (new.owner_id, 'project', new.id);
  return new;
end $$;
create trigger on_project_created after insert on public.projects
  for each row execute function public.on_project_created();

-- Notificações geradas no servidor (o cliente não insere notificações).
create or replace function public.notify(_user uuid, _type text, _actor uuid, _post uuid, _project uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if _user is not null and _user <> _actor then
    insert into public.notifications(user_id, type, actor_id, post_id, project_id) values (_user, _type, _actor, _post, _project);
  end if;
end $$;

create or replace function public.on_like() returns trigger language plpgsql security definer set search_path = '' as $$
begin perform public.notify((select author_id from public.posts where id = new.post_id), 'like', new.user_id, new.post_id, null); return new; end $$;
create trigger on_like after insert on public.likes for each row execute function public.on_like();

create or replace function public.on_comment() returns trigger language plpgsql security definer set search_path = '' as $$
begin perform public.notify((select author_id from public.posts where id = new.post_id), 'comment', new.author_id, new.post_id, null); return new; end $$;
create trigger on_comment after insert on public.comments for each row execute function public.on_comment();

create or replace function public.on_follow() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.target_type = 'user' then
    perform public.notify(new.target_id, 'follow', new.follower_id, null, null);
  else
    perform public.notify((select owner_id from public.projects where id = new.target_id), 'project_follow', new.follower_id, null, new.target_id);
  end if;
  return new;
end $$;
create trigger on_follow after insert on public.follows for each row execute function public.on_follow();

create or replace function public.on_project_post() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.project_id is not null then
    insert into public.notifications(user_id, type, actor_id, post_id, project_id)
      select f.follower_id, 'project_post', new.author_id, new.id, new.project_id
      from public.follows f where f.target_type = 'project' and f.target_id = new.project_id and f.follower_id <> new.author_id;
  end if;
  return new;
end $$;
create trigger on_project_post after insert on public.posts for each row execute function public.on_project_post();

create or replace function public.on_member_added() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.user_id <> auth.uid() then
    perform public.notify(new.user_id, 'member_added', auth.uid(), null, new.project_id);
  end if;
  return new;
end $$;
create trigger on_member_added after insert on public.project_members for each row execute function public.on_member_added();

-- Pedidos de colaboração: avisa a coordenação; ao responder, adiciona o membro e avisa quem pediu.
create or replace function public.on_collab_request() returns trigger language plpgsql security definer set search_path = '' as $$
begin perform public.notify((select owner_id from public.projects where id = new.project_id), 'collab_request', new.user_id, null, new.project_id); return new; end $$;
create trigger on_collab_request after insert on public.collab_requests for each row execute function public.on_collab_request();

create or replace function public.respond_collab(_request uuid, _accept boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare r public.collab_requests;
begin
  select * into r from public.collab_requests where id = _request and status = 'pendente';
  if r.id is null then raise exception 'Pedido não encontrado ou já respondido.'; end if;
  if not public.is_project_owner(r.project_id) then raise exception 'Só a coordenação pode responder.'; end if;
  update public.collab_requests set status = case when _accept then 'aceito' else 'recusado' end where id = _request;
  if _accept then
    insert into public.project_members(project_id, user_id, role) values (r.project_id, r.user_id, 'colaboração') on conflict do nothing;
    insert into public.follows(follower_id, target_type, target_id) values (r.user_id, 'project', r.project_id) on conflict do nothing;
  end if;
  perform public.notify(r.user_id, case when _accept then 'collab_accepted' else 'collab_declined' end, auth.uid(), null, r.project_id);
end $$;

-- Moderação: resolver denúncia (ocultar post ou descartar).
create or replace function public.resolve_report(_report uuid, _action text) returns void
language plpgsql security definer set search_path = '' as $$
declare _post uuid;
begin
  select post_id into _post from public.reports where id = _report;
  if not public.can_moderate((select author_id from public.posts where id = _post)) then
    raise exception 'Este post é de outra universidade; a moderação de lá cuida dele.';
  end if;
  if _action = 'hide' then
    update public.posts set hidden = true where id = _post;
    update public.reports set status = 'oculto' where post_id = _post and status = 'aberta';
    perform public.notify((select author_id from public.posts where id = _post), 'post_hidden', auth.uid(), _post, null);
  else
    update public.reports set status = 'descartada' where id = _report;
  end if;
end $$;

-- ---------- Segurança em nível de linha (RLS) ----------
-- Toda leitura exige estar logado (rede fechada da comunidade).
alter table public.profiles        enable row level security;
alter table public.projects        enable row level security;
alter table public.project_members enable row level security;
alter table public.posts           enable row level security;
alter table public.comments        enable row level security;
alter table public.likes           enable row level security;
alter table public.follows         enable row level security;
alter table public.notifications   enable row level security;
alter table public.reports         enable row level security;
alter table public.institutions    enable row level security;
alter table public.institution_domains enable row level security;
alter table public.collab_requests enable row level security;

-- A lista de universidades é pública (a tela de cadastro mostra quem participa).
create policy "universidades: todos leem" on public.institutions for select using (true);
create policy "domínios: todos leem"      on public.institution_domains for select using (true);

create policy "colaboração: pede como si" on public.collab_requests for insert to authenticated
  with check (user_id = auth.uid() and status = 'pendente' and not public.is_project_member(project_id));
create policy "colaboração: quem pediu ou coordenação lê" on public.collab_requests for select to authenticated
  using (user_id = auth.uid() or public.is_project_owner(project_id));

create policy "perfis: logados leem"      on public.profiles for select to authenticated using (true);
create policy "perfis: cria o próprio"    on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "perfis: edita o próprio"   on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "projetos: logados leem"    on public.projects for select to authenticated using (true);
create policy "projetos: cria como dono"  on public.projects for insert to authenticated with check (owner_id = auth.uid());
create policy "projetos: dono edita"      on public.projects for update to authenticated using (owner_id = auth.uid());
create policy "projetos: dono ou mod apaga" on public.projects for delete to authenticated using (owner_id = auth.uid() or public.can_moderate(owner_id));

create policy "membros: logados leem"     on public.project_members for select to authenticated using (true);
create policy "membros: dono adiciona"    on public.project_members for insert to authenticated with check (public.is_project_owner(project_id));
create policy "membros: sair ou dono remove" on public.project_members for delete to authenticated
  using ((user_id = auth.uid() and not public.is_project_owner(project_id)) or (public.is_project_owner(project_id) and user_id <> auth.uid()));

create policy "posts: logados leem visíveis" on public.posts for select to authenticated
  using (not hidden or author_id = auth.uid() or public.can_moderate(author_id));
create policy "posts: publica como si"    on public.posts for insert to authenticated
  with check (author_id = auth.uid() and hidden = false and (project_id is null or public.is_project_member(project_id)));
create policy "posts: autor ou mod apaga" on public.posts for delete to authenticated using (author_id = auth.uid() or public.can_moderate(author_id));

create policy "comentários: logados leem" on public.comments for select to authenticated using (true);
create policy "comentários: comenta como si" on public.comments for insert to authenticated with check (author_id = auth.uid());
create policy "comentários: autor ou mod apaga" on public.comments for delete to authenticated using (author_id = auth.uid() or public.can_moderate(author_id));

create policy "curtidas: logados leem"    on public.likes for select to authenticated using (true);
create policy "curtidas: curte como si"   on public.likes for insert to authenticated with check (user_id = auth.uid());
create policy "curtidas: descurte"        on public.likes for delete to authenticated using (user_id = auth.uid());

create policy "seguir: logados leem"      on public.follows for select to authenticated using (true);
create policy "seguir: segue como si"     on public.follows for insert to authenticated
  with check (follower_id = auth.uid() and not (target_type = 'user' and target_id = auth.uid()));
create policy "seguir: deixa de seguir"   on public.follows for delete to authenticated using (follower_id = auth.uid());

create policy "notificações: só as suas"  on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "notificações: marca lidas" on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "denúncias: denuncia como si" on public.reports for insert to authenticated with check (reporter_id = auth.uid() and status = 'aberta');
create policy "denúncias: mod lê"         on public.reports for select to authenticated
  using (reporter_id = auth.uid() or public.can_moderate((select author_id from public.posts where id = post_id)));

-- ---------- Imagens dos posts (Storage) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-images', 'post-images', false, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- Cada pessoa envia para a própria pasta: post-images/<uid>/arquivo.jpg
create policy "imagens: logados veem" on storage.objects for select to authenticated using (bucket_id = 'post-images');
create policy "imagens: envia na própria pasta" on storage.objects for insert to authenticated
  with check (bucket_id = 'post-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "imagens: apaga as próprias" on storage.objects for delete to authenticated
  using (bucket_id = 'post-images' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- Primeira pessoa da equipe geral ----------
-- Depois de criar sua conta pelo app, rode (trocando o e-mail):
-- update public.profiles set is_admin = true where id = (select id from auth.users where email = 'seu.email@graduacao.uerj.br');
-- Moderação local de uma universidade: set is_mod = true no perfil da pessoa.
