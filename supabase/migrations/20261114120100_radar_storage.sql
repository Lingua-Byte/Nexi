-- Bucket privado para os documentos de habilitação do Radar Licita.
-- Cada usuário só acessa a pasta com o próprio id: radar-docs/<user_id>/arquivo.pdf
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('radar-docs', 'radar-docs', false, 10485760,
        array['application/pdf', 'image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy "radar-docs: dono lê" on storage.objects
  for select to authenticated
  using (bucket_id = 'radar-docs' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "radar-docs: dono envia" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'radar-docs' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "radar-docs: dono substitui" on storage.objects
  for update to authenticated
  using (bucket_id = 'radar-docs' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "radar-docs: dono apaga" on storage.objects
  for delete to authenticated
  using (bucket_id = 'radar-docs' and (storage.foldername(name))[1] = (select auth.uid())::text);
