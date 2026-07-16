-- ============================================================
--  ESKALATIONS-/LEITUNGS-KONTAKTE für Postfach
--  - Schichtführung (Meister/Vorarbeiter/Gruppenführer) und
--    Betriebsleitung: erreichen Personalabteilung (HR) sowie
--    die Betriebsleitung des EIGENEN Betriebs.
--  - Personalabteilung (HR): erreicht ALLE Betriebsleiter/
--    Assistenten und alle HR firmenweit.
--  Liefert die Kontakte, ohne fremde Team-Profile zu zeigen.
--
--  Voraussetzung: assistent_rights.sql. Einmal im SQL-Editor ausführen.
-- ============================================================

drop function if exists leadership_contacts();
create or replace function leadership_contacts()
returns table (profile_id uuid, full_name text, role text, betrieb_name text)
language sql stable security definer set search_path = public as $$
  select p.id, p.full_name, p.role::text, b.name
  from profiles p
  left join betriebe b on b.id = p.betrieb_id
  where p.active and p.id <> auth.uid() and (
    p.role = 'personal'
    or (p.role in ('betriebsleiter','assistent')
        and (auth_role() = 'personal' or p.betrieb_id = auth_betrieb()))
  )
  order by (case p.role::text when 'betriebsleiter' then 1 when 'assistent' then 2 else 3 end), p.full_name
$$;
grant execute on function leadership_contacts() to authenticated;
