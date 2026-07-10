import { createClient } from '@supabase/supabase-js'

const url = (import.meta.env.VITE_SUPABASE_URL ?? '').trim()
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim()

// Nur eine echte https-URL + Key zählt als konfiguriert. Sonst: Demo-Modus.
const validUrl = /^https?:\/\/[^\s]+$/i.test(url)
export const hasSupabaseConfig = validUrl && anonKey.length > 10

if (!hasSupabaseConfig) {
  console.warn('[supabase] Keine gültige Konfiguration – App läuft im Demo-Modus. Bitte VITE_SUPABASE_URL (https://…supabase.co) und VITE_SUPABASE_ANON_KEY in .env prüfen.')
}

// Bei ungültiger Config einen harmlosen Dummy-Client bauen, damit nichts crasht.
export const supabase = createClient(
  hasSupabaseConfig ? url : 'http://localhost:54321',
  hasSupabaseConfig ? anonKey : 'demo-anon-key',
)

// Separater Client zum Anlegen neuer Logins (signUp), OHNE die Admin-Sitzung zu
// überschreiben (persistSession:false = schreibt nicht in den lokalen Speicher).
export function createSignupClient() {
  return createClient(
    hasSupabaseConfig ? url : 'http://localhost:54321',
    hasSupabaseConfig ? anonKey : 'demo-anon-key',
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}
