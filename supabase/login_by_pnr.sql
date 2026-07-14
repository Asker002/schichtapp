-- ============================================================
--  LOGIN PER PERSONALNUMMER
--  Erlaubt Anmeldung mit Personalnummer ODER E-Mail.
--  Diese Funktion löst eine Personalnummer zur hinterlegten
--  Login-E-Mail auf. SECURITY DEFINER -> darf auth.users lesen
--  und umgeht RLS (wird VOR dem Login als 'anon' aufgerufen).
--
--  Einmal im Supabase SQL-Editor ausführen (idempotent).
-- ============================================================

create or replace function public.login_email(pnr text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select u.email
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.personalnummer = pnr
    and p.active
  limit 1
$$;

-- Vor dem Login ist der Nutzer 'anon' -> Ausführung erlauben.
grant execute on function public.login_email(text) to anon, authenticated;
