-- =====================================================================
--  SCHICHT-APP · Datenmodell + Row Level Security (RLS)
--  Ziel: Rollenlogik in der Datenbank erzwingen, nicht im React-Code.
--  Region: Supabase-Projekt in der EU (Frankfurt) anlegen! (DSGVO)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0) Rollen als Enum. Vier Rollen aus deinem Plan.
-- ---------------------------------------------------------------------
create type app_role as enum (
  'mitarbeiter',      -- sieht nur sich selbst
  'schichtmeister',   -- Schichtführung: Freigaben, nur eigenes Team
  'vorarbeiter',      -- Schichtführung (gleiche Rechte wie Schichtmeister)
  'gruppenfuehrer',   -- Schichtführung (gleiche Rechte wie Schichtmeister)
  'betriebsleiter',   -- werksweit
  'personal'          -- Lohn/Zeit, werksweit
);

create type shift_type as enum ('tag', 'nacht', 'frei');

create type absence_type as enum ('urlaub', 'krank');

create type request_status as enum (
  'offen',            -- eingereicht, wartet auf Meister
  'genehmigt',
  'abgelehnt',
  'geaendert'         -- Meister hat Zeitraum angepasst und genehmigt
);

-- ---------------------------------------------------------------------
-- 1) Betrieb / Werk  (später mandantenfähig; Stufe 1 = 1 Betrieb)
-- ---------------------------------------------------------------------
create table betriebe (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 2) Teams / Schichtgruppen
--    Vollkonti 12h: Muster 1 Tag / 1 Nacht / 2 frei = 4-Tage-Zyklus.
--    Für 24/7-Abdeckung braucht man 4 Crews, je um 1 Tag versetzt.
--    rotation_offset (0..3) = Startposition im 4-Tage-Zyklus.
-- ---------------------------------------------------------------------
create table teams (
  id              uuid primary key default gen_random_uuid(),
  betrieb_id      uuid not null references betriebe(id) on delete cascade,
  name            text not null,                 -- "Team A", "Team B", ...
  rotation_offset int  not null default 0
                    check (rotation_offset between 0 and 3),
  anchor_date     date not null default '2026-01-01',  -- Tag 0 des Zyklus
  created_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 3) Profile  (erweitert auth.users von Supabase)
--    Rolle + Team + Entgeltgruppe hängen am Profil.
-- ---------------------------------------------------------------------
create table profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  betrieb_id     uuid references betriebe(id) on delete set null,
  team_id        uuid references teams(id)    on delete set null,  -- NULL bei Leitung/Personal
  role           app_role not null default 'mitarbeiter',
  full_name      text not null,
  personalnummer text unique,
  entgeltgruppe  text,                          -- IG-BCE, z.B. "E7" – nur Anzeige, keine Rechnung
  language       text not null default 'de'
                   check (language in ('de','tr','en')),
  active         boolean not null default true,
  created_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 4) Zeiterfassung  (Ist-Zeiten; Soll-Plan wird aus Rotation berechnet)
-- ---------------------------------------------------------------------
create table time_entries (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references profiles(id) on delete cascade,
  work_date   date not null,
  shift       shift_type not null,
  clock_in    timestamptz,
  clock_out   timestamptz,
  note        text,
  created_at  timestamptz not null default now(),
  unique (profile_id, work_date)
);

-- ---------------------------------------------------------------------
-- 5) Abwesenheits-Anträge  (Urlaub / Krank)
--    Meister kann Zeitraum ändern -> status 'geaendert'.
-- ---------------------------------------------------------------------
create table absence_requests (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references profiles(id) on delete cascade,
  type          absence_type not null,
  start_date    date not null,
  end_date      date not null,
  status        request_status not null default 'offen',
  employee_note text,
  approver_id   uuid references profiles(id),
  approver_note text,
  decided_at    timestamptz,
  created_at    timestamptz not null default now(),
  check (end_date >= start_date)
);

-- ---------------------------------------------------------------------
-- 6) Lohnzettel  (nur Anzeige! PDF vom Lohnbüro hochgeladen)
--    Datei liegt in Supabase Storage-Bucket 'payslips', hier nur Metadaten.
--    KEINE Lohnberechnung -> keine Haftung.
-- ---------------------------------------------------------------------
create table payslips (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references profiles(id) on delete cascade,
  period       date not null,                 -- Monatserster, z.B. 2026-06-01
  storage_path text not null,                 -- Pfad im Storage-Bucket
  uploaded_by  uuid references profiles(id),
  uploaded_at  timestamptz not null default now(),
  unique (profile_id, period)
);

-- =====================================================================
--  HILFSFUNKTIONEN für RLS
--  SECURITY DEFINER + Lesen aus profiles, ohne die RLS-Policies der
--  aufrufenden Rolle erneut auszulösen (sonst Rekursion).
-- =====================================================================
create or replace function auth_role()
returns app_role
language sql stable security definer set search_path = public
as $$ select role from profiles where id = auth.uid() $$;

create or replace function auth_team()
returns uuid
language sql stable security definer set search_path = public
as $$ select team_id from profiles where id = auth.uid() $$;

create or replace function auth_betrieb()
returns uuid
language sql stable security definer set search_path = public
as $$ select betrieb_id from profiles where id = auth.uid() $$;

-- Schichtführung: Schichtmeister + Vorarbeiter + Gruppenführer haben gleiche Team-Rechte.
create or replace function is_lead()
returns boolean
language sql stable security definer set search_path = public
as $$ select auth_role() in ('schichtmeister','vorarbeiter','gruppenfuehrer') $$;

-- Mitarbeiter aus dem Team lösen (team_id -> NULL).
-- Schichtführung: nur eigene Team-Mitarbeiter. Betriebsleiter: jeder im Betrieb.
create or replace function remove_from_team(target uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth_role() = 'betriebsleiter'
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

-- =====================================================================
--  RLS AKTIVIEREN  (Default-deny: ohne Policy sieht niemand etwas)
-- =====================================================================
alter table betriebe          enable row level security;
alter table teams             enable row level security;
alter table profiles          enable row level security;
alter table time_entries      enable row level security;
alter table absence_requests  enable row level security;
alter table payslips          enable row level security;

-- ---------------------------------------------------------------------
--  PROFILES
-- ---------------------------------------------------------------------
-- Lesen: eigenes Profil; Meister -> eigenes Team; Leitung/Personal -> ganzer Betrieb.
create policy profiles_select on profiles for select using (
  id = auth.uid()
  or (is_lead()  and team_id    = auth_team())
  or (auth_role() in ('betriebsleiter','personal') and betrieb_id = auth_betrieb())
);
-- Eigene Sprache/Name aktualisieren darf jeder für sich.
create policy profiles_update_self on profiles for update
  using (id = auth.uid()) with check (id = auth.uid());
-- Leitung darf im eigenen Betrieb Profile anlegen/ändern (Rollen, Teams zuweisen).
create policy profiles_admin_all on profiles for all
  using (auth_role() = 'betriebsleiter' and betrieb_id = auth_betrieb())
  with check (auth_role() = 'betriebsleiter' and betrieb_id = auth_betrieb());
-- Schichtführung darf NUR Mitarbeiter im eigenen Team anlegen (keine Rollenvergabe).
create policy profiles_create_lead on profiles for insert
  with check (is_lead() and betrieb_id = auth_betrieb() and team_id = auth_team() and role = 'mitarbeiter');

-- ---------------------------------------------------------------------
--  TEAMS  (jeder im Betrieb darf Teams sehen; ändern nur Leitung)
-- ---------------------------------------------------------------------
create policy teams_select on teams for select
  using (betrieb_id = auth_betrieb());
create policy teams_admin on teams for all
  using (auth_role() = 'betriebsleiter' and betrieb_id = auth_betrieb())
  with check (auth_role() = 'betriebsleiter' and betrieb_id = auth_betrieb());

-- ---------------------------------------------------------------------
--  BETRIEBE  (nur eigener Betrieb sichtbar)
-- ---------------------------------------------------------------------
create policy betriebe_select on betriebe for select
  using (id = auth_betrieb());

-- ---------------------------------------------------------------------
--  TIME_ENTRIES  (Zeiterfassung)
-- ---------------------------------------------------------------------
-- Helfer: gehört ein Profil zu meinem Team? / meinem Betrieb?
create or replace function same_team(p uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from profiles where id = p and team_id = auth_team()) $$;

create or replace function same_betrieb(p uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from profiles where id = p and betrieb_id = auth_betrieb()) $$;

create policy time_select on time_entries for select using (
  profile_id = auth.uid()
  or (is_lead() and same_team(profile_id))
  or (auth_role() in ('betriebsleiter','personal') and same_betrieb(profile_id))
);
-- Mitarbeiter stempelt für sich selbst.
create policy time_insert_self on time_entries for insert
  with check (profile_id = auth.uid());
create policy time_update_self on time_entries for update
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());
-- Meister/Personal dürfen Zeiten des eigenen Teams/Betriebs korrigieren.
create policy time_manage on time_entries for all using (
  (is_lead() and same_team(profile_id))
  or (auth_role() = 'personal' and same_betrieb(profile_id))
) with check (
  (is_lead() and same_team(profile_id))
  or (auth_role() = 'personal' and same_betrieb(profile_id))
);

-- ---------------------------------------------------------------------
--  ABSENCE_REQUESTS  (Urlaub / Krank)
-- ---------------------------------------------------------------------
create policy absence_select on absence_requests for select using (
  profile_id = auth.uid()
  or (is_lead() and same_team(profile_id))
  or (auth_role() in ('betriebsleiter','personal') and same_betrieb(profile_id))
);
-- Mitarbeiter stellt eigenen Antrag.
create policy absence_insert_self on absence_requests for insert
  with check (profile_id = auth.uid());
-- Solange 'offen': eigener Antrag darf noch geändert werden.
create policy absence_update_self on absence_requests for update
  using (profile_id = auth.uid() and status = 'offen')
  with check (profile_id = auth.uid());
-- Solange 'offen': eigener Antrag darf zurückgezogen (gelöscht) werden.
create policy absence_delete_self on absence_requests for delete
  using (profile_id = auth.uid() and status = 'offen');
-- Meister genehmigt/ändert Anträge des eigenen Teams.
create policy absence_decide on absence_requests for update using (
  is_lead() and same_team(profile_id)
) with check (
  is_lead() and same_team(profile_id)
);

-- ---------------------------------------------------------------------
--  PAYSLIPS  (Lohnzettel – hochsensibel)
-- ---------------------------------------------------------------------
-- Mitarbeiter sieht NUR eigene; Personal verwaltet für den ganzen Betrieb.
-- Bewusst: Meister/Betriebsleiter sehen KEINE fremden Lohnzettel.
create policy payslips_select_self on payslips for select
  using (profile_id = auth.uid());
create policy payslips_personal on payslips for all using (
  auth_role() = 'personal' and same_betrieb(profile_id)
) with check (
  auth_role() = 'personal' and same_betrieb(profile_id)
);

-- =====================================================================
--  STORAGE-POLICIES  (Lohnzettel-PDFs)
--  Voraussetzung: im Dashboard einen PRIVATEN Bucket 'payslips' anlegen.
--  Dateipfad-Konvention:  <profile_id>/<periode>.pdf   (z.B. 8f3c.../2026-06.pdf)
--  So liegt jede Datei im Ordner = Profil-ID des Mitarbeiters.
-- =====================================================================

-- Mitarbeiter darf nur Dateien im eigenen Ordner lesen (Ordnername = eigene ID).
create policy payslip_own_read on storage.objects for select using (
  bucket_id = 'payslips'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Personalabteilung darf im eigenen Betrieb Lohnzettel hochladen/verwalten.
-- (Ordnername = Profil-ID; same_betrieb() prüft, ob dieses Profil zum Betrieb der Personalstelle gehört.)
create policy payslip_personal_all on storage.objects for all using (
  bucket_id = 'payslips'
  and auth_role() = 'personal'
  and same_betrieb(((storage.foldername(name))[1])::uuid)
) with check (
  bucket_id = 'payslips'
  and auth_role() = 'personal'
  and same_betrieb(((storage.foldername(name))[1])::uuid)
);
