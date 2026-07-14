-- ============================================================
--  POSTFACH: interne Nachrichten (Arbeitgeber -> Mitarbeiter)
--  Einmal im Supabase SQL Editor ausführen (idempotent).
-- ============================================================

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  betrieb_id uuid not null references betriebe(id),
  sender_id  uuid references profiles(id),
  team_id    uuid references teams(id),      -- NULL = werksweit (alle), sonst nur diese Schicht
  subject    text not null,
  body       text not null,
  created_at timestamptz not null default now()
);
create index if not exists messages_betrieb_idx on messages(betrieb_id, created_at desc);

create table if not exists message_reads (
  message_id uuid not null references messages(id) on delete cascade,
  profile_id uuid not null references profiles(id),
  read_at    timestamptz not null default now(),
  primary key (message_id, profile_id)
);

alter table messages      enable row level security;
alter table message_reads enable row level security;

-- Lesen: eigener Betrieb + (werksweit ODER eigene Schicht)
drop policy if exists messages_select on messages;
create policy messages_select on messages for select using (
  betrieb_id = auth_betrieb() and (team_id is null or team_id = auth_team())
);
-- Senden: Personal/Leitung werksweit im Betrieb; Schichtführung nur eigene Schicht
drop policy if exists messages_insert on messages;
create policy messages_insert on messages for insert with check (
  betrieb_id = auth_betrieb()
  and sender_id = auth.uid()
  and (
    auth_role() in ('personal','betriebsleiter')
    or (is_lead() and team_id = auth_team())
  )
);
-- Absender darf eigene Nachricht löschen
drop policy if exists messages_delete on messages;
create policy messages_delete on messages for delete using (sender_id = auth.uid());

-- Gelesen-Status: jeder verwaltet nur seinen eigenen
drop policy if exists reads_select on message_reads;
create policy reads_select on message_reads for select using (profile_id = auth.uid());
drop policy if exists reads_insert on message_reads;
create policy reads_insert on message_reads for insert with check (profile_id = auth.uid());

-- ---------- ANHÄNGE (Fotos/Dateien) ----------
-- Metadaten je Nachricht: [{ path, name, type, size }]
alter table messages add column if not exists attachments jsonb not null default '[]'::jsonb;

-- Privater Storage-Bucket für die Datei-Inhalte.
insert into storage.buckets (id, name, public) values ('message-files','message-files', false)
  on conflict (id) do nothing;

-- Angemeldete Nutzer dürfen hochladen und (per signierter URL) lesen. Pfade sind UUID-basiert.
drop policy if exists msgfiles_read on storage.objects;
create policy msgfiles_read on storage.objects for select
  using (bucket_id = 'message-files' and auth.uid() is not null);
drop policy if exists msgfiles_write on storage.objects;
create policy msgfiles_write on storage.objects for insert
  with check (bucket_id = 'message-files' and auth.uid() is not null);
