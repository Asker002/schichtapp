-- ============================================================
--  SCHICHTEINTEILUNG: Bereich je Mitarbeiter
--  Einmal im Supabase SQL Editor ausführen (idempotent).
--  Schichtführung teilt ein, Mitarbeiter sieht eigene, Leitung/Personal sehen alles.
-- ============================================================

create table if not exists station_assignments (
  profile_id uuid primary key references profiles(id) on delete cascade,
  station    text,
  updated_by uuid references profiles(id),
  updated_at timestamptz not null default now()
);

alter table station_assignments enable row level security;

-- Lesen: eigene; Schichtführung ihr Team; Leitung/Personal ganzer Betrieb.
drop policy if exists assign_select on station_assignments;
create policy assign_select on station_assignments for select using (
  profile_id = auth.uid()
  or (is_lead() and same_team(profile_id))
  or (auth_role() in ('betriebsleiter','personal') and same_betrieb(profile_id))
);
-- Einteilen (anlegen/ändern): NUR Schichtführung für das eigene Team.
drop policy if exists assign_write on station_assignments;
create policy assign_write on station_assignments for all using (
  is_lead() and same_team(profile_id)
) with check (
  is_lead() and same_team(profile_id)
);
