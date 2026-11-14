-- =========================================================
-- Rede do ILE — esquema para Supabase (PostgreSQL)
-- Espelha a camada de demonstração em js/store.js.
-- Rode no SQL Editor de um projeto Supabase NOVO.
-- Ainda não foi aplicado em nenhum projeto.
-- =========================================================

-- ---------- Cadastro restrito a e-mail institucional ----------
-- Bloqueia no servidor qualquer cadastro fora de @uerj.br ou subdomínios
-- (ex.: @graduacao.uerj.br). A validação no app é só conveniência.
create or replace function public.enforce_uerj_email()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.email !~* '^[^@\s]+@([a-z0-9-]+\.)*uerj\.br$' then
    raise exception 'Cadastro permitido apenas com e-mail institucional da UERJ (uerj.br).';
  end if;
  return new;
end $$;

drop trigger if exists enforce_uerj_email on auth.users;
create trigger enforce_uerj_email before insert or update of email on auth.users
  for each row execute function public.enforce_uerj_email();
-- Em Authentication > Providers > Email, mantenha "Confirm email" ATIVADO.

-- ---------- Tabelas ----------
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null check (char_length(name) between 3 and 80),
  role        text not null default 'aluno' check (role in ('aluno','professor')),
  course      text not null default 'Outro',
  bio         text not null default '' check (char_length(bio) <= 300),
  is_mod      boolean not null default false,
  created_at  timestamptz not null default now()
);

create table public.projects (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 3 and 100),
  kind        text not null default 'Outro',
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
  select coalesce((select is_mod from public.profiles where id = auth.uid()), false)
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
  if new.is_mod is distinct from old.is_mod and auth.uid() is not null and not public.is_mod() then
    new.is_mod := old.is_mod;
  end if;
  return new;
end $$;
create trigger protect_is_mod before update on public.profiles
  for each row execute function public.protect_is_mod();

-- Quem cria o projeto entra como coordenação e passa a acompanhá-lo.
create or replace function public.on_project_created() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
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

-- Moderação: resolver denúncia (ocultar post ou descartar).
create or replace function public.resolve_report(_report uuid, _action text) returns void
language plpgsql security definer set search_path = '' as $$
declare _post uuid;
begin
  if not public.is_mod() then raise exception 'Acesso restrito à moderação.'; end if;
  select post_id into _post from public.reports where id = _report;
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

create policy "perfis: logados leem"      on public.profiles for select to authenticated using (true);
create policy "perfis: cria o próprio"    on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "perfis: edita o próprio"   on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "projetos: logados leem"    on public.projects for select to authenticated using (true);
create policy "projetos: cria como dono"  on public.projects for insert to authenticated with check (owner_id = auth.uid());
create policy "projetos: dono edita"      on public.projects for update to authenticated using (owner_id = auth.uid());
create policy "projetos: dono ou mod apaga" on public.projects for delete to authenticated using (owner_id = auth.uid() or public.is_mod());

create policy "membros: logados leem"     on public.project_members for select to authenticated using (true);
create policy "membros: dono adiciona"    on public.project_members for insert to authenticated with check (public.is_project_owner(project_id));
create policy "membros: sair ou dono remove" on public.project_members for delete to authenticated
  using ((user_id = auth.uid() and not public.is_project_owner(project_id)) or (public.is_project_owner(project_id) and user_id <> auth.uid()));

create policy "posts: logados leem visíveis" on public.posts for select to authenticated
  using (not hidden or author_id = auth.uid() or public.is_mod());
create policy "posts: publica como si"    on public.posts for insert to authenticated
  with check (author_id = auth.uid() and hidden = false and (project_id is null or public.is_project_member(project_id)));
create policy "posts: autor ou mod apaga" on public.posts for delete to authenticated using (author_id = auth.uid() or public.is_mod());

create policy "comentários: logados leem" on public.comments for select to authenticated using (true);
create policy "comentários: comenta como si" on public.comments for insert to authenticated with check (author_id = auth.uid());
create policy "comentários: autor ou mod apaga" on public.comments for delete to authenticated using (author_id = auth.uid() or public.is_mod());

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
create policy "denúncias: mod lê"         on public.reports for select to authenticated using (public.is_mod() or reporter_id = auth.uid());

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

-- ---------- Primeiro moderador ----------
-- Depois de criar sua conta pelo app, rode (trocando o e-mail):
-- update public.profiles set is_mod = true where id = (select id from auth.users where email = 'seu.email@graduacao.uerj.br');
