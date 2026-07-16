-- ============================================================
--  GENEHMIGUNGS-HIERARCHIE für Abwesenheits-Anträge
--  - Schichtführung (Meister/Vorarbeiter/Gruppenführer) genehmigt
--    Anträge des eigenen Teams – ABER NICHT Schichtmeister-Anträge
--    und nicht den eigenen Antrag.
--  - Anträge von SCHICHTMEISTERN genehmigt die Werksleitung
--    (Betriebsleiter oder Betriebsassistent) ihres Betriebs.
--
--  Voraussetzung: supabase/assistent_rights.sql (is_leitung()).
--  Einmal im SQL-Editor ausführen (idempotent).
-- ============================================================

drop policy if exists absence_decide on absence_requests;
create policy absence_decide on absence_requests for update
using (
  (
    is_lead() and same_team(profile_id) and profile_id <> auth.uid()
    and (select role from profiles where id = profile_id) <> 'schichtmeister'
  )
  or (is_leitung() and same_betrieb(profile_id))
)
with check (
  (
    is_lead() and same_team(profile_id) and profile_id <> auth.uid()
    and (select role from profiles where id = profile_id) <> 'schichtmeister'
  )
  or (is_leitung() and same_betrieb(profile_id))
);
