-- ============================================================
--  ESKALATIONS-KONTAKTE für die Schichtführung
--  Meister/Vorarbeiter/Gruppenführer können an Betriebsleiter,
--  Betriebsassistent (eigener Betrieb) und Personalabteilung
--  schreiben. Diese Funktion liefert die Kontakte, ohne dass
--  die Führung fremde Team-Profile sehen muss.
--
--  Voraussetzung: assistent_rights.sql. Einmal im SQL-Editor ausführen.
-- ============================================================

create or replace function leadership_contacts()
returns table (profile_id uuid, full_name text, role text)
language sql stable security definer set search_path = public as $$
  select p.id, p.full_name, p.role::text
  from profiles p
  where p.active and (
    (p.role in ('betriebsleiter','assistent') and p.betrieb_id = auth_betrieb())
    or p.role = 'personal'
  )
  order by (case p.role::text when 'betriebsleiter' then 1 when 'assistent' then 2 else 3 end), p.full_name
$$;
grant execute on function leadership_contacts() to authenticated;
