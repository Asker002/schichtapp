-- ============================================================
--  KOLLEGEN IM URLAUB — nur ANZAHL pro Tag (Datenschutz)
--  Ein Mitarbeiter sieht NICHT, WER im Urlaub ist, sondern nur
--  WIE VIELE Kollegen seines Teams je Tag genehmigten Urlaub haben.
--  SECURITY DEFINER -> liefert aggregierte Zahlen ohne Namen.
--  Einmal im SQL-Editor ausführen (idempotent).
-- ============================================================

create or replace function team_leave_counts(d1 date, d2 date)
returns table (work_date date, cnt int)
language sql stable security definer set search_path = public as $$
  select gs.gd::date as work_date, count(distinct a.profile_id)::int as cnt
  from generate_series(d1, d2, interval '1 day') gs(gd)
  join profiles p
    on p.team_id = auth_team() and p.id <> auth.uid() and p.active
  join absence_requests a
    on a.profile_id = p.id
   and a.type = 'urlaub'
   and a.status in ('genehmigt','geaendert')
   and gs.gd::date between a.start_date and a.end_date
  group by gs.gd
$$;
grant execute on function team_leave_counts(date, date) to authenticated;
