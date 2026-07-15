-- ============================================================
--  HR-ÜBERSICHT über ALLE Betriebe
--  - company_requests(): alle Abwesenheits-Anträge aller Werke
--  - company_overview(d): pro Mitarbeiter Status heute
--    (im Dienst / frei / krank / Urlaub) über alle Werke
--  Nur Rolle 'personal' bekommt Daten (SECURITY DEFINER prüft das).
--
--  Rotation exakt wie in der App:
--    idx = ((tage_seit_anker + offset) mod 4);  0/1 = Dienst (T/N), 2/3 = frei.
--  Einmal im SQL-Editor ausführen (idempotent).
-- ============================================================

create or replace function company_requests()
returns table (
  id uuid, profile_id uuid, full_name text, betrieb_name text, team_name text,
  type text, start_date date, end_date date, status text, created_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select a.id, p.id, p.full_name, b.name, t.name,
         a.type::text, a.start_date, a.end_date, a.status::text, a.created_at
  from absence_requests a
  join profiles  p on p.id = a.profile_id
  join betriebe  b on b.id = p.betrieb_id
  left join teams t on t.id = p.team_id
  where auth_role() = 'personal'
  order by (a.status = 'offen') desc, a.created_at desc
$$;
grant execute on function company_requests() to authenticated;

create or replace function company_overview(d date)
returns table (
  betrieb_id uuid, betrieb_name text, profile_id uuid, full_name text,
  role text, team_name text, status text
)
language sql stable security definer set search_path = public as $$
  select b.id, b.name, p.id, p.full_name, p.role::text, t.name,
    case
      when a.id is not null then (case when a.type = 'krank' then 'sick' else 'vac' end)
      when t.id is null then 'off'
      when ((((d - t.anchor_date) + t.rotation_offset) % 4) + 4) % 4 in (0,1) then 'duty'
      else 'off'
    end as status
  from betriebe b
  join profiles p on p.betrieb_id = b.id and p.active
       and p.role in ('mitarbeiter','schichtmeister','vorarbeiter','gruppenfuehrer')
  left join teams t on t.id = p.team_id
  left join lateral (
    select ar.id, ar.type
    from absence_requests ar
    where ar.profile_id = p.id
      and ar.status in ('genehmigt','geaendert')
      and d between ar.start_date and ar.end_date
    limit 1
  ) a on true
  where auth_role() = 'personal'
  order by b.name, p.full_name
$$;
grant execute on function company_overview(date) to authenticated;
