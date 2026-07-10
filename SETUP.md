# Schicht-App · Setup (Stufe 1: Pilot)

Schlanker Pilot für deine eigene Firma. **Ohne Lohnberechnung** – Lohnzettel werden
nur angezeigt (PDF-Upload durchs Lohnbüro), nicht gerechnet. Das nimmt die Haftung raus.

## Vor echten Daten (wichtig)
- **Anwaltsblick in den Arbeitsvertrag** (Nebentätigkeit / IP).
- **DSGVO:** echte Mitarbeiterdaten erst nach Auftragsverarbeitungsvertrag (AVV) mit
  Supabase + Berechtigungskonzept. Krankmeldungen = Gesundheitsdaten (Art. 9, besonders sensibel).
- Bis dahin: **nur mit Test-Daten** entwickeln.

## Lokal starten (Demo-Modus, ohne Supabase)
```bash
npm install
npm run dev
```
Läuft sofort mit berechnetem Beispiel-Schichtplan. Sprache oben umschaltbar (DE/TR/EN/RU/PL).
Aktuell laufen alle Daten als Demo/Mock im Browser – noch ohne Backend.

## Auf echtes Supabase umstellen (das kann nur der Firmen-Account)
1. **Supabase-Projekt anlegen – Region: EU (Frankfurt)!** (DSGVO)
2. **SQL-Editor** → Inhalt von `supabase/schema.sql` einfügen & ausführen
   → legt Tabellen + Row Level Security (Rollenlogik) an.
3. **Storage** → Bucket `payslips` anlegen, **Privat**. Danach im SQL-Editor die
   Storage-Policies am Ende von `schema.sql` ausführen (Zugriff nur eigener Ordner / Personal).
4. **SQL-Editor** → `supabase/seed.sql` ausführen → Betrieb „SE Tylose · Werk Wiesbaden"
   + Schichten A–D. Rotation ggf. über `anchor_date` an den echten Plan angleichen.
5. **Login-Accounts** anlegen (Authentication → Add user) und in `profiles` eintragen
   (Vorlage unten in `seed.sql`) – Rolle + Team je Mitarbeiter.
6. `.env.example` → `.env` kopieren, `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`
   aus **Project Settings → API** eintragen.
7. `npm run dev` neu starten. (Hinweis: das Frontend liest die Daten noch aus dem
   Prototyp-Mock – das Anschließen der Views an die DB-Abfragen ist der nächste Coding-Schritt.)

## Rollen (in der DB erzwungen, nicht im Frontend)
| Rolle           | Sieht |
|-----------------|-------|
| mitarbeiter     | nur sich selbst |
| schichtmeister  | eigenes Team (Freigaben, „Ändern") |
| betriebsleiter  | ganzes Werk |
| personal        | ganzes Werk (Lohn/Zeit) |

Wichtig: Lohnzettel sehen **nur der Mitarbeiter selbst + Personal** – Meister/Leitung nicht.

## Rotationsmuster
12h-Vollkonti: `1 Tag / 1 Nacht / 2 frei` (4-Tage-Zyklus). Der Plan wird aus
`team.anchor_date + rotation_offset` **berechnet** (`src/lib/rotation.js`), nicht von Hand gepflegt.
4 Teams (Offset 0–3) decken zusammen 24/7 ab.

## Stand & nächste Schritte
Erledigt (Prototyp auf Mock-Daten, SE-Tylose-Branding, weißes Theme):
- [x] Datenmodell + RLS (`schema.sql`) inkl. Storage-Policies für Lohnzettel
- [x] Seed-Daten SE Tylose (`seed.sql`: Betrieb + Schichten A–D)
- [x] Login + DSGVO-Einwilligung, Impressum + Datenschutz (echte Firmendaten)
- [x] Urlaub/Krank-Formular → Meister-Freigabe (Kern-Loop, Demo)
- [x] Lohnzettel-Liste (Anzeige), Schicht-Erinnerung (Notification-Test)
- [x] Mehrsprachig DE/TR/EN/RU/PL, Sprachauswahl als Dropdown

Offen (echter Backend-Anschluss):
- [ ] Supabase-Projekt anlegen + schema.sql/seed.sql ausführen (Firmen-Account)
- [ ] Frontend-Views an DB-Abfragen hängen (Auth, Anträge schreiben/lesen, Profile/Rollen)
- [ ] Lohnzettel-Upload durch Personal (Storage) → echte PDFs in der Liste
- [ ] Echter Hintergrund-Push (Service Worker + VAPID) statt nur Test-Benachrichtigung
- [ ] PWA installierbar (Manifest + Service Worker) + Deploy auf Vercel
