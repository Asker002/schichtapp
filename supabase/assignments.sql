-- ============================================================
--  SCHICHTEINTEILUNG mit HISTORIE: Bereich je Mitarbeiter & Tag
--  Einmal im Supabase SQL Editor ausführen (idempotent).
--  ACHTUNG: ersetzt die alte station_assignments-Tabelle (Testdaten gehen verloren).
-- ============================================================

drop table if exists station_assignments cascade;

create table station_assignments (
  profile_id uuid references profiles(id) on delete cascade,
  work_date  date not null,
  station    text,
  updated_by uuid references profiles(id),
  updated_at timestamptz not null default now(),
  primary key (profile_id, work_date)
);
create index if not exists station_assignments_date_idx on station_assignments(work_date);

alter table station_assignments enable row level security;

-- Lesen: eigenes Team (Kollegen sehen einander) + Leitung/Personal betriebsweit.
drop policy if exists assign_select on station_assignments;
create policy assign_select on station_assignments for select using (
  same_team(profile_id)
  or (auth_role() in ('betriebsleiter','personal') and same_betrieb(profile_id))
);
-- Einteilen (anlegen/ändern): NUR Schichtführung fürs eigene Team.
drop policy if exists assign_write on station_assignments;
create policy assign_write on station_assignments for all using (
  is_lead() and same_team(profile_id)
) with check (
  is_lead() and same_team(profile_id)
);

-- Team + Einteilung für einen Tag: liefert NUR Name + Bereich (keine sensiblen Felder).
create or replace function team_assignments(d date)
returns table (profile_id uuid, full_name text, station text)
language sql stable security definer set search_path = public as $$
  select p.id, p.full_name, sa.station
  from profiles p
  left join station_assignments sa on sa.profile_id = p.id and sa.work_date = d
  where p.team_id = auth_team() and p.active
  order by p.full_name
$$;
