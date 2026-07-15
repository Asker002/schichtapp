-- ============================================================
--  HR-NACHRICHTEN über mehrere Betriebe
--  - HR (personal) kann an ALLE Betriebe (firmenweit), an einen
--    ganzen Betrieb oder an eine Schicht eines Betriebs senden.
--  - Empfänger lesen firmenweite Nachrichten (betrieb_id NULL)
--    sowie Nachrichten an ihren Betrieb / ihre Schicht.
--
--  Voraussetzung: supabase/assistent_rights.sql (is_leitung()).
--  Einmal im SQL-Editor ausführen (idempotent).
-- ============================================================

-- betrieb_id darf jetzt NULL sein = firmenweit (alle Betriebe).
alter table messages alter column betrieb_id drop not null;

-- Lesen: Absender; Empfänger einer Direktnachricht; firmenweite Rundnachricht;
-- oder Rundnachricht an den eigenen Betrieb (werksweit ODER eigene Schicht).
drop policy if exists messages_select on messages;
create policy messages_select on messages for select using (
  sender_id = auth.uid()
  or (recipient_id is not null and recipient_id = auth.uid())
  or (recipient_id is null and (
        betrieb_id is null
        or (betrieb_id = auth_betrieb() and (team_id is null or team_id = auth_team()))
     ))
);

-- Senden:
--  - Direktnachricht: Führung / Leitung / Personal
--  - Rundnachricht: Personal firmenweit/an jeden Betrieb;
--                   Leitung nur eigener Betrieb; Schichtführung nur eigene Schicht
drop policy if exists messages_insert on messages;
create policy messages_insert on messages for insert with check (
  sender_id = auth.uid()
  and (
    (recipient_id is not null and (is_leitung() or auth_role() = 'personal' or is_lead()))
    or (recipient_id is null and (
          auth_role() = 'personal'
          or (is_leitung() and betrieb_id = auth_betrieb())
          or (is_lead() and betrieb_id = auth_betrieb() and team_id = auth_team())
       ))
  )
);

-- Alle Schichten aller Betriebe – nur für HR (Empfängerauswahl beim Verfassen).
create or replace function company_teams()
returns table (team_id uuid, team_name text, betrieb_id uuid, betrieb_name text)
language sql stable security definer set search_path = public as $$
  select t.id, t.name, b.id, b.name
  from teams t join betriebe b on b.id = t.betrieb_id
  where auth_role() = 'personal'
  order by b.name, t.name
$$;
grant execute on function company_teams() to authenticated;
