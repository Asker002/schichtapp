-- ============================================================
--  MITARBEITER dürfen Nachrichten schreiben – aber nur an die
--  Führung (Schichtmeister/Vorarbeiter/Gruppenführer des eigenen
--  Teams) oder die Betriebsleitung (Betriebsleiter/Assistent) –
--  NICHT an Kollegen. Antworten inklusive.
--
--  Voraussetzung: assistent_rights.sql + hr_broadcast.sql.
--  Einmal im SQL-Editor ausführen (idempotent).
-- ============================================================

-- Führungskräfte des Mitarbeiters (Name + Rolle) – ohne Kollegen zu zeigen.
create or replace function my_leadership()
returns table (profile_id uuid, full_name text, role text)
language sql stable security definer set search_path = public as $$
  select p.id, p.full_name, p.role::text
  from profiles p
  where p.active and (
    (p.role in ('schichtmeister','vorarbeiter','gruppenfuehrer') and p.team_id = auth_team())
    or (p.role in ('betriebsleiter','assistent') and p.betrieb_id = auth_betrieb())
  )
  order by (case p.role::text when 'betriebsleiter' then 1 when 'assistent' then 2
                              when 'schichtmeister' then 3 else 4 end), p.full_name
$$;
grant execute on function my_leadership() to authenticated;

-- Senden: zusätzlich Mitarbeiter -> Direktnachricht an Nicht-Mitarbeiter
-- (Führung/Leitung/HR) des EIGENEN Betriebs. Kollegen bleiben ausgeschlossen.
drop policy if exists messages_insert on messages;
create policy messages_insert on messages for insert with check (
  sender_id = auth.uid()
  and (
    (recipient_id is not null and (
       is_leitung() or auth_role() = 'personal' or is_lead()
       or (auth_role() = 'mitarbeiter'
           and (select role from profiles where id = recipient_id) <> 'mitarbeiter'
           and (select betrieb_id from profiles where id = recipient_id) = auth_betrieb())
    ))
    or (recipient_id is null and (
          auth_role() = 'personal'
          or (is_leitung() and betrieb_id = auth_betrieb())
          or (is_lead() and betrieb_id = auth_betrieb() and team_id = auth_team())
       ))
  )
);
