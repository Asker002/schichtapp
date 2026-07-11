# Deployment auf Vercel

Die App ist eine Vite-PWA. Vercel erkennt Vite automatisch (Build: `npm run build`,
Ausgabe: `dist/`). Es sind **keine** weiteren Build-Einstellungen nötig – nur die
Supabase-Umgebungsvariablen.

## Schritt für Schritt

1. **vercel.com** → mit **GitHub anmelden** (Konto `Asker002`).
2. **Add New… → Project** → das Repo **`schichtapp`** importieren.
3. Vercel erkennt **Vite** automatisch. Framework/Build/Output **nicht ändern**.
4. **Environment Variables** setzen (aus deiner lokalen `.env`):
   - `VITE_SUPABASE_URL` = `https://dejnwlukxtcjpdhgraeo.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = dein `sb_publishable_…`-Schlüssel
   Beide für **Production, Preview, Development** anhaken.
5. **Deploy** klicken. Nach ~1 Min ist die App unter `https://schichtapp-….vercel.app` live.

## Wichtig
- Die Variablen müssen **vor** dem Build gesetzt sein (Vite backt sie beim Build ein).
  Fehlen sie, läuft die App im Demo-Modus (Login geht nicht).
- Bei jedem `git push` auf `main` deployt Vercel automatisch neu.

## Auf dem Handy installieren
- **Android/Chrome:** Seite öffnen → „App installieren".
- **iPhone/Safari:** Teilen → „Zum Home-Bildschirm".

## Später (optional)
- Supabase → Authentication → URL Configuration → **Site URL** auf die Vercel-URL setzen
  (wird für Passwort-Reset-E-Mails gebraucht; für den normalen Login nicht nötig).
