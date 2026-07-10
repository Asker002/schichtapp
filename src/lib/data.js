// =====================================================================
//  Datenzugriffs-Schicht (Supabase)
//  Alle DB-Zugriffe der App laufen über dieses Modul.
//  WICHTIG: Die Rollen-Sichtbarkeit ("Meister nur eigenes Team" usw.)
//  wird NICHT hier gefiltert, sondern von der Row Level Security in der
//  Datenbank erzwungen (siehe supabase/schema.sql). Die Abfragen holen
//  einfach "alles Erlaubte" – die DB liefert nur, was die Rolle darf.
// =====================================================================
import { supabase, createSignupClient } from './supabase'

// ---------- ADMIN: MITARBEITER-VERWALTUNG ----------
// Teams im eigenen Betrieb (für die Schicht-Auswahl). RLS begrenzt automatisch.
export async function listTeams() {
  const { data, error } = await supabase.from('teams').select('id, name').order('name')
  if (error) throw error
  return data
}
// Mitarbeiter im Scope (Meister: eigenes Team, Betriebsleiter: ganzer Betrieb).
export async function listEmployees() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, personalnummer, role, team_id, team:teams(name)')
    .order('full_name')
  if (error) throw error
  return data
}
// Neuen Mitarbeiter anlegen: Login (signUp über separaten Client) + Profil.
export async function createEmployee({ email, password, full_name, personalnummer, team_id, role, betrieb_id }) {
  const signup = createSignupClient()
  const { data, error } = await signup.auth.signUp({ email, password })
  if (error) throw error
  const uid = data.user?.id
  if (!uid) throw new Error('Kein Login angelegt – ist die E-Mail-Bestätigung in Supabase noch aktiv?')
  const { error: pErr } = await supabase.from('profiles').insert({
    id: uid, betrieb_id, team_id, role, full_name,
    personalnummer: personalnummer || null,
  })
  if (pErr) throw pErr
  return uid
}
// Rolle/Team eines Mitarbeiters ändern (nur Betriebsleiter – per RLS abgesichert).
export async function updateEmployee(id, fields) {
  const { error } = await supabase.from('profiles').update(fields).eq('id', id)
  if (error) throw error
}
// Mitarbeiter aus dem Team lösen (Meister: eigenes Team; Betriebsleiter: ganzer Betrieb).
// Die Berechtigung prüft die DB-Funktion (SECURITY DEFINER).
export async function removeFromTeam(id) {
  const { error } = await supabase.rpc('remove_from_team', { target: id })
  if (error) throw error
}

// ---------- EIGENES KONTO ----------
export async function changePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
}

// ---------- AUTH ----------
export function signIn(email, password) {
  return supabase.auth.signInWithPassword({ email, password })
}
export function signOut() {
  return supabase.auth.signOut()
}
export async function getSession() {
  const { data } = await supabase.auth.getSession()
  return data.session
}
export function onAuthChange(cb) {
  return supabase.auth.onAuthStateChange((_event, session) => cb(session))
}

// ---------- PROFIL (mit Team) ----------
export async function getMyProfile() {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('profiles')
    .select('id, role, full_name, personalnummer, entgeltgruppe, language, betrieb_id, team:teams(id, name, rotation_offset, anchor_date)')
    .eq('id', user.id)   // gezielt das EIGENE Profil (Meister sieht sonst sein ganzes Team)
    .single()
  if (error) throw error
  return data
}

// Mitarbeiter im erlaubten Scope (Team bzw. Betrieb – RLS begrenzt automatisch).
export async function listProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role, team_id, entgeltgruppe')
    .eq('active', true)
    .order('full_name')
  if (error) throw error
  return data
}

// ---------- ABWESENHEITS-ANTRÄGE (Urlaub / Krank) ----------
export async function listRequests() {
  const { data, error } = await supabase
    .from('absence_requests')
    .select('id, profile_id, type, start_date, end_date, status, employee_note, approver_note, decided_at, profile:profiles!profile_id(full_name, team_id)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createRequest({ type, start_date, end_date, employee_note = null }) {
  const { data: userData } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('absence_requests')
    .insert({ profile_id: userData.user.id, type, start_date, end_date, employee_note })
    .select()
    .single()
  if (error) throw error
  return data
}

// Eigenen offenen Antrag ändern (Datum korrigieren). RLS erlaubt nur eigenen + status='offen'.
export async function updateRequest(id, { start_date, end_date }) {
  const { data, error } = await supabase
    .from('absence_requests')
    .update({ start_date, end_date })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

// Eigenen offenen Antrag zurückziehen (löschen).
export async function deleteRequest(id) {
  const { error } = await supabase.from('absence_requests').delete().eq('id', id)
  if (error) throw error
}

// status: 'genehmigt' | 'abgelehnt' | 'geaendert'
export async function decideRequest(id, status, approver_note = null) {
  const { data: userData } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('absence_requests')
    .update({ status, approver_id: userData.user.id, approver_note, decided_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

// ---------- ZEITERFASSUNG ----------
export async function listTimeEntries(fromISO, toISO) {
  const { data, error } = await supabase
    .from('time_entries')
    .select('id, profile_id, work_date, shift, clock_in, clock_out, note')
    .gte('work_date', fromISO)
    .lte('work_date', toISO)
    .order('work_date')
  if (error) throw error
  return data
}

// ---------- LOHNZETTEL (nur Anzeige) ----------
export async function listPayslips() {
  const { data, error } = await supabase
    .from('payslips')
    .select('id, period, storage_path')
    .order('period', { ascending: false })
  if (error) throw error
  return data
}

// Kurzlebige signierte URL fürs PDF (60 s). Bucket 'payslips' ist privat.
export async function payslipUrl(storagePath) {
  const { data, error } = await supabase.storage
    .from('payslips')
    .createSignedUrl(storagePath, 60)
  if (error) throw error
  return data.signedUrl
}
