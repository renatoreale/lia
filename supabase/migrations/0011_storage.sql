-- =====================================================================
-- 0011_storage.sql
-- Storage buckets and policies.
--
-- Path conventions (enforced by policy, produced by the app/services):
--   documents/{condominium_id}/{document_id}/{filename}
--   email-attachments/{condominium_id}/{email_id}/{filename}
--   avatars/{user_id}/{filename}
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('documents', 'documents', false, 52428800, array[
    'application/pdf', 'image/png', 'image/jpeg', 'image/tiff',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]),
  ('email-attachments', 'email-attachments', false, 52428800, null),
  ('avatars', 'avatars', true, 5242880, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- documents bucket
-- ---------------------------------------------------------------------

create policy "documents bucket: read accessible"
  on storage.objects for select
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1]::uuid in (select public.my_condominium_ids())
  );

create policy "documents bucket: writers upload"
  on storage.objects for insert
  with check (
    bucket_id = 'documents'
    and public.can_write_condominium((storage.foldername(name))[1]::uuid)
  );

create policy "documents bucket: writers update"
  on storage.objects for update
  using (
    bucket_id = 'documents'
    and public.can_write_condominium((storage.foldername(name))[1]::uuid)
  );

create policy "documents bucket: writers delete"
  on storage.objects for delete
  using (
    bucket_id = 'documents'
    and public.can_write_condominium((storage.foldername(name))[1]::uuid)
  );

-- ---------------------------------------------------------------------
-- email-attachments bucket
-- ---------------------------------------------------------------------

create policy "email-attachments bucket: read accessible"
  on storage.objects for select
  using (
    bucket_id = 'email-attachments'
    and (storage.foldername(name))[1]::uuid in (select public.my_condominium_ids())
  );

create policy "email-attachments bucket: writers manage"
  on storage.objects for insert
  with check (
    bucket_id = 'email-attachments'
    and public.can_write_condominium((storage.foldername(name))[1]::uuid)
  );

create policy "email-attachments bucket: writers delete"
  on storage.objects for delete
  using (
    bucket_id = 'email-attachments'
    and public.can_write_condominium((storage.foldername(name))[1]::uuid)
  );

-- ---------------------------------------------------------------------
-- avatars bucket (public read, owner-only write)
-- ---------------------------------------------------------------------

create policy "avatars bucket: public read"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "avatars bucket: owner upload"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars bucket: owner update"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars bucket: owner delete"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
