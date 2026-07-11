-- =====================================================================
--  SEED-DATEN · SE Tylose · Werk Wiesbaden
--  Nach schema.sql ausführen (SQL-Editor im Supabase-Dashboard).
--  Legt Betrieb + 4 Schichtgruppen (Vollkonti-Rotation) an.
-- =====================================================================

-- Betrieb + 4 Teams in einem Rutsch (Team-Offsets 0–3 decken 24/7 ab).
-- anchor_date = Tag 0 des 4-Tage-Zyklus (Tag/Nacht/frei/frei); ggf. an echten
-- Schichtplan anpassen, damit "heute" die richtige Schicht zeigt.
with b as (
  insert into betriebe (name)
  values ('SE Tylose · Werk Wiesbaden')
  returning id
)
-- Geeicht auf den echten SE-Tylose-Plan: Anker So 12.07.2026 (D=Tag, B=Nacht),
-- Offsets so, dass Mo 13.07. A=Tag/D=Nacht ergibt. Muster: T/N/F/F.
insert into teams (betrieb_id, name, rotation_offset, anchor_date)
select b.id, t.name, t.off, date '2026-07-12'
from b, (values
  ('Schicht A', 3),
  ('Schicht B', 1),
  ('Schicht C', 2),
  ('Schicht D', 0)
) as t(name, off);

-- =====================================================================
--  PROFILE / MITARBEITER
--  Wichtig: profiles.id referenziert auth.users(id). Deshalb erst die
--  Login-Accounts anlegen (Dashboard → Authentication → Add user, oder
--  per Einladung), dann hier die Profile mit deren UUID eintragen.
--
--  Vorlage (UUIDs und Teams anpassen). team_id über Namens-Lookup:
--
--  insert into profiles (id, betrieb_id, team_id, role, full_name, personalnummer, entgeltgruppe, language)
--  select
--    '00000000-0000-0000-0000-000000000000',            -- auth.users.id des Mitarbeiters
--    (select id from betriebe where name = 'SE Tylose · Werk Wiesbaden'),
--    (select id from teams   where name = 'Schicht C'),
--    'mitarbeiter', 'Daniel Schäfer', '10432', 'E7', 'de';
--
--  Rollen: 'mitarbeiter' | 'schichtmeister' | 'betriebsleiter' | 'personal'
--  Für Leitung/Personal team_id = NULL lassen (werksweit).
-- =====================================================================
