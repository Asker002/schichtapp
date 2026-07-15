-- ============================================================
--  ASSISTENT = gleiche Rechte wie BETRIEBSLEITER (werksweit)
--  + Personalabteilung (HR) darf Leitung (BL/Assistent) anlegen.
--
--  Voraussetzung: supabase/betriebe_directory.sql wurde ausgeführt
--  (dort wird die Rolle 'assistent' angelegt).
--  Einmal im Supabase SQL-Editor ausführen (idempotent).
-- ============================================================

-- 1) Helfer: Werksleitung = Betriebsleiter ODER Assistent.
create or replace function is_leitung()
returns boolean language sql stable security definer set search_path = public
as $$ select auth_role() in ('betriebsleiter','assistent') $$;

-- 2) PROFILE ---------------------------------------------------
drop policy if exists profiles_select on profiles;
create policy profiles_select on profiles for select using (
  id = auth.uid()
  or (is_lead() and team_id = auth_team())
  or ((is_leitung() or auth_role() = 'personal') and betrieb_id = auth_betrieb())
  -- HR darf die Werksleitung aller Betriebe sehen:
  or (auth_role() = 'personal' and role in ('betriebsleiter','assistent'))
);

drop policy if exists profiles_admin_all on profiles;
create policy profiles_admin_all on profiles for all
  using (is_leitung() and betrieb_id = auth_betrieb())
  with check (is_leitung() and betrieb_id = auth_betrieb());

-- HR legt werksweit Leitung (Betriebsleiter/Assistent) an und verwaltet sie.
drop policy if exists profiles_personal_leitung on profiles;
create policy profiles_personal_leitung on profiles for all
  using (auth_role() = 'personal' and role in ('betriebsleiter','assistent'))
  with check (auth_role() = 'personal' and role in ('betriebsleiter','assistent'));

-- 3) TEAMS ----------------------------------------------------
drop policy if exists teams_admin on teams;
create policy teams_admin on teams for all
  using (is_leitung() and betrieb_id = auth_betrieb())
  with check (is_leitung() and betrieb_id = auth_betrieb());

-- 4) ZEITEN / ANTRÄGE / EINTEILUNG (Lesen betriebsweit) -------
drop policy if exists time_select on time_entries;
create policy time_select on time_entries for select using (
  profile_id = auth.uid()
  or (is_lead() and same_team(profile_id))
  or ((is_leitung() or auth_role() = 'personal') and same_betrieb(profile_id))
);

drop policy if exists absence_select on absence_requests;
create policy absence_select on absence_requests for select using (
  profile_id = auth.uid()
  or (is_lead() and same_team(profile_id))
  or ((is_leitung() or auth_role() = 'personal') and same_betrieb(profile_id))
);

drop policy if exists assign_select on station_assignments;
create policy assign_select on station_assignments for select using (
  same_team(profile_id)
  or ((is_leitung() or auth_role() = 'personal') and same_betrieb(profile_id))
);

-- 5) POSTFACH (Leitung/Personal werksweit senden) -------------
drop policy if exists messages_insert on messages;
create policy messages_insert on messages for insert with check (
  betrieb_id = auth_betrieb()
  and sender_id = auth.uid()
  and (is_leitung() or auth_role() = 'personal' or (is_lead() and team_id = auth_team()))
);

-- 6) Mitarbeiter aus Team lösen: Assistent wie Betriebsleiter --
create or replace function remove_from_team(target uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if is_leitung()
     and (select betrieb_id from profiles where id = target) = auth_betrieb() then
    update profiles set team_id = null where id = target;
  elsif is_lead()
     and (select team_id from profiles where id = target) = auth_team()
     and (select role from profiles where id = target) = 'mitarbeiter' then
    update profiles set team_id = null where id = target;
  else
    raise exception 'nicht berechtigt';
  end if;
end $$;
