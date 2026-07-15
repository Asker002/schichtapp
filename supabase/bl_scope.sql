-- ============================================================
--  BETRIEBSLEITER / BETRIEBSASSISTENT: eingeschränkter Umfang
--  Dürfen NUR Mitarbeiter + Schichtführung (Schichtmeister/
--  Vorarbeiter/Gruppenführer) im EIGENEN Betrieb anlegen,
--  ändern und entfernen.
--  KEINE Personalabteilung, keine andere Leitung anlegen/ändern.
--
--  Voraussetzung: supabase/assistent_rights.sql wurde ausgeführt
--  (Funktion is_leitung()). Einmal im SQL-Editor ausführen.
-- ============================================================

-- Leitung darf nur diese Rollen verwalten:
drop policy if exists profiles_admin_all on profiles;
create policy profiles_admin_all on profiles for all
  using (
    is_leitung() and betrieb_id = auth_betrieb()
    and role in ('mitarbeiter','schichtmeister','vorarbeiter','gruppenfuehrer')
  )
  with check (
    is_leitung() and betrieb_id = auth_betrieb()
    and role in ('mitarbeiter','schichtmeister','vorarbeiter','gruppenfuehrer')
  );

-- Aus Team lösen: Leitung nur Mitarbeiter/Schichtführung des eigenen Betriebs;
-- Schichtführung weiterhin nur eigene Mitarbeiter.
create or replace function remove_from_team(target uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if is_leitung()
     and (select betrieb_id from profiles where id = target) = auth_betrieb()
     and (select role from profiles where id = target)
         in ('mitarbeiter','schichtmeister','vorarbeiter','gruppenfuehrer') then
    update profiles set team_id = null where id = target;
  elsif is_lead()
     and (select team_id from profiles where id = target) = auth_team()
     and (select role from profiles where id = target) = 'mitarbeiter' then
    update profiles set team_id = null where id = target;
  else
    raise exception 'nicht berechtigt';
  end if;
end $$;
