-- ============================================================
--  HR verwaltet auch die PERSONALABTEILUNG (Rolle 'personal')
--  - HR darf HR-Kollegen anlegen und deaktivieren.
--  - "Entfernen" = active = false (reversibel, sicher).
--
--  Voraussetzung: supabase/assistent_rights.sql wurde ausgeführt.
--  Einmal im SQL-Editor ausführen (idempotent).
-- ============================================================

-- HR darf Leitung UND Personalabteilung anlegen/ändern/deaktivieren.
drop policy if exists profiles_personal_leitung on profiles;
create policy profiles_personal_leitung on profiles for all
  using (auth_role() = 'personal' and role in ('betriebsleiter','assistent','personal'))
  with check (auth_role() = 'personal' and role in ('betriebsleiter','assistent','personal'));

-- HR darf Leitung + Personalabteilung firmenweit sehen (für die Liste).
drop policy if exists profiles_select on profiles;
create policy profiles_select on profiles for select using (
  id = auth.uid()
  or (is_lead() and team_id = auth_team())
  or ((is_leitung() or auth_role() = 'personal') and betrieb_id = auth_betrieb())
  or (auth_role() = 'personal' and role in ('betriebsleiter','assistent','personal'))
);
