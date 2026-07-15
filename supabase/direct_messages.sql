-- ============================================================
--  PERSÖNLICHE NACHRICHTEN (Direktnachricht an eine Person)
--  Führung / Betriebsleitung / HR können einem einzelnen
--  Mitarbeiter persönlich schreiben. Nur Absender + Empfänger
--  sehen die Nachricht.
--
--  Voraussetzung: supabase/assistent_rights.sql wurde ausgeführt
--  (Funktion is_leitung()). Einmal im SQL-Editor ausführen.
-- ============================================================

alter table messages add column if not exists recipient_id uuid references profiles(id) on delete cascade;
create index if not exists messages_recipient_idx on messages(recipient_id);

-- Lesen: Absender; Empfänger einer Direktnachricht; sonst Rundnachricht
-- (werksweit ODER eigene Schicht) im eigenen Betrieb.
drop policy if exists messages_select on messages;
create policy messages_select on messages for select using (
  sender_id = auth.uid()
  or (recipient_id is not null and recipient_id = auth.uid())
  or (recipient_id is null and betrieb_id = auth_betrieb() and (team_id is null or team_id = auth_team()))
);

-- Senden:
--  - Direktnachricht (recipient_id gesetzt): nur Schichtführung / Leitung / Personal
--  - Rundnachricht: Leitung/Personal werksweit, Schichtführung nur eigene Schicht
drop policy if exists messages_insert on messages;
create policy messages_insert on messages for insert with check (
  betrieb_id = auth_betrieb()
  and sender_id = auth.uid()
  and (
    (recipient_id is not null and (is_leitung() or auth_role() = 'personal' or is_lead()))
    or (recipient_id is null and (is_leitung() or auth_role() = 'personal' or (is_lead() and team_id = auth_team())))
  )
);
