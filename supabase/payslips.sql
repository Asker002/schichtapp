-- ============================================================
--  LOHNZETTEL-STORAGE: privater Bucket + Rechte
--  Einmal im Supabase SQL Editor ausführen (idempotent).
--  Pfad-Konvention: <profile_id>/<YYYY-MM>.pdf
-- ============================================================

insert into storage.buckets (id, name, public) values ('payslips','payslips', false)
  on conflict (id) do nothing;

-- Lesen: Mitarbeiter nur EIGENEN Ordner; Personal den ganzen Bucket.
drop policy if exists payslips_read on storage.objects;
create policy payslips_read on storage.objects for select using (
  bucket_id = 'payslips' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or auth_role() = 'personal'
  )
);
-- Hochladen/Überschreiben/Löschen: nur Personal.
drop policy if exists payslips_write on storage.objects;
create policy payslips_write on storage.objects for insert with check (
  bucket_id = 'payslips' and auth_role() = 'personal'
);
drop policy if exists payslips_update on storage.objects;
create policy payslips_update on storage.objects for update using (
  bucket_id = 'payslips' and auth_role() = 'personal'
);
drop policy if exists payslips_delete on storage.objects;
create policy payslips_delete on storage.objects for delete using (
  bucket_id = 'payslips' and auth_role() = 'personal'
);
