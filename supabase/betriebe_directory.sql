-- ============================================================
--  BETRIEBE-VERZEICHNIS für die Personalabteilung (HR)
--  - neue Rolle 'assistent'
--  - 4 Betriebe (Glutolin, HEC, Tyloshin 1, Tyloshin 2)
--  - Funktion company_directory(): liefert HR die ganze Firma,
--    nach Betrieb + Hierarchie sortiert (Betriebsleiter, Assistent,
--    Schichtführung, Belegschaft je Schicht).
--
--  Einmal im Supabase SQL-Editor ausführen (idempotent).
-- ============================================================

-- 1) Neue Rolle 'assistent' (falls noch nicht vorhanden).
alter type app_role add value if not exists 'assistent';

-- 2) Betriebe anlegen. Bestehenden Betrieb in 'Glutolin' umbenennen,
--    die drei weiteren ergänzen (nur, wenn der Name noch fehlt).
update betriebe
  set name = 'Glutolin'
  where id = (select id from betriebe order by created_at limit 1)
    and name <> 'Glutolin';

insert into betriebe (name)
select v.name from (values ('HEC'), ('Tyloshin 1'), ('Tyloshin 2')) as v(name)
where not exists (select 1 from betriebe b where b.name = v.name);

-- 3) Firmen-Verzeichnis für HR. SECURITY DEFINER -> umgeht die
--    Betrieb-Grenze der RLS, aber NUR für Rolle 'personal'.
create or replace function company_directory()
returns table (
  betrieb_id     uuid,
  betrieb_name   text,
  profile_id     uuid,
  full_name      text,
  role           text,
  team_name      text,
  personalnummer text
)
language sql stable security definer set search_path = public as $$
  select b.id, b.name, p.id, p.full_name, p.role::text, t.name, p.personalnummer
  from betriebe b
  left join profiles p on p.betrieb_id = b.id and p.active
  left join teams t on t.id = p.team_id
  where auth_role() = 'personal'
  order by
    b.name,
    case p.role::text
      when 'betriebsleiter'  then 1
      when 'assistent'       then 2
      when 'schichtmeister'  then 3
      when 'vorarbeiter'     then 3
      when 'gruppenfuehrer'  then 3
      when 'personal'        then 4
      else 5
    end,
    coalesce(t.name, ''),
    p.full_name;
$$;

grant execute on function company_directory() to authenticated;
