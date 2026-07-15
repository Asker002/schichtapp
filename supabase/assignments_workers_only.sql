-- ============================================================
--  Schichteinteilung: Kollegen-Sicht nur MITARBEITER
--  (Schichtführung erscheint nicht mehr in "Team heute").
--  Ersetzt nur die Funktion – die Tabelle bleibt unangetastet.
--  Einmal im Supabase SQL-Editor ausführen.
-- ============================================================

create or replace function team_assignments(d date)
returns table (profile_id uuid, full_name text, station text)
language sql stable security definer set search_path = public as $$
  select p.id, p.full_name, sa.station
  from profiles p
  left join station_assignments sa on sa.profile_id = p.id and sa.work_date = d
  where p.team_id = auth_team() and p.active and p.role = 'mitarbeiter'
  order by p.full_name
$$;
