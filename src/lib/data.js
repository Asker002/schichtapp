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
  const { data, error } = await supabase.from('teams').select('id, name, rotation_offset, anchor_date').order('name')
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

// Passwort-Reset-Link per E-Mail anfordern. Der Link führt zurück auf die App
// (redirectTo = aktuelle Origin), wo dann das neue Passwort gesetzt wird.
export async function sendPasswordReset(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin,
  })
  if (error) throw error
}

// ---------- POSTFACH (interne Nachrichten) ----------
// RLS liefert nur erlaubte Nachrichten (werksweit + eigene Schicht).
// reads = eigene Lese-Markierung (RLS zeigt nur den eigenen Read) -> gelesen wenn vorhanden.
export async function listMessages() {
  const { data, error } = await supabase
    .from('messages')
    .select('id, subject, body, team_id, recipient_id, sender_id, created_at, attachments, sender:profiles!sender_id(full_name), reads:message_reads(profile_id)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}
// Eigene Nachricht löschen (RLS: nur der Absender). Reads werden per Cascade entfernt.
export async function deleteMessage(id) {
  const { error } = await supabase.from('messages').delete().eq('id', id)
  if (error) throw error
}

// ---------- SCHICHTEINTEILUNG (Bereich je Mitarbeiter & Tag) ----------
// Einteilung für einen Tag (RLS: eigenes Team / Betrieb). date = 'YYYY-MM-DD'.
export async function listAssignments(date) {
  let q = supabase.from('station_assignments').select('profile_id, station')
  if (date) q = q.eq('work_date', date)
  const { data, error } = await q
  if (error) throw error
  return data
}
// Einteilen (nur Schichtführung fürs eigene Team, per RLS abgesichert).
export async function setAssignment(profileId, date, station) {
  const { data: u } = await supabase.auth.getUser()
  const { error } = await supabase.from('station_assignments').upsert(
    { profile_id: profileId, work_date: date, station: station || null, updated_by: u.user.id, updated_at: new Date().toISOString() },
    { onConflict: 'profile_id,work_date' },
  )
  if (error) throw error
}
// Team + Einteilung eines Tages (Name + Bereich) – auch für Mitarbeiter (Kollegen-Sicht).
export async function teamAssignments(date) {
  const { data, error } = await supabase.rpc('team_assignments', { d: date })
  if (error) throw error
  return data
}

// Firmen-Verzeichnis für HR: alle Betriebe + Belegschaft (nach Hierarchie sortiert).
// Nur Rolle 'personal' bekommt Daten (SECURITY DEFINER prüft das).
export async function companyDirectory() {
  const { data, error } = await supabase.rpc('company_directory')
  if (error) throw error
  return data
}
// Alle Schichten aller Betriebe (für die HR-Nachrichten-Empfängerauswahl).
export async function companyTeams() {
  const { data, error } = await supabase.rpc('company_teams')
  if (error) throw error
  return data
}
// Alle Abwesenheits-Anträge aller Werke (HR-Übersicht).
export async function companyRequests() {
  const { data, error } = await supabase.rpc('company_requests')
  if (error) throw error
  return data
}
// Status pro Mitarbeiter heute (im Dienst/frei/krank/Urlaub) über alle Werke.
export async function companyOverview(date) {
  const { data, error } = await supabase.rpc('company_overview', { d: date })
  if (error) throw error
  return data
}
// Anzahl Team-Kollegen (ohne mich) mit genehmigtem Urlaub je Tag – nur Zahlen, keine Namen.
export async function teamLeaveCounts(d1, d2) {
  const { data, error } = await supabase.rpc('team_leave_counts', { d1, d2 })
  if (error) throw error
  return data
}
export async function sendMessage({ subject, body, team_id, betrieb_id, recipient_id = null, attachments = [] }) {
  const { data: u } = await supabase.auth.getUser()
  const { error } = await supabase.from('messages').insert({
    betrieb_id, sender_id: u.user.id, team_id: team_id || null, recipient_id: recipient_id || null, subject, body, attachments,
  })
  if (error) throw error
}
// Datei/Foto in den privaten Bucket laden -> gibt Metadaten für die Nachricht zurück.
export async function uploadMessageFile(file) {
  const { data: u } = await supabase.auth.getUser()
  const safe = file.name.replace(/[^\w.\-]+/g, '_')
  const path = `${u.user.id}/${crypto.randomUUID()}-${safe}`
  const { error } = await supabase.storage.from('message-files').upload(path, file, {
    contentType: file.type || undefined, upsert: false,
  })
  if (error) throw error
  return { path, name: file.name, type: file.type || '', size: file.size }
}
// Kurzlebige signierte URL für einen Anhang (1 Std).
export async function messageFileUrl(path) {
  const { data, error } = await supabase.storage.from('message-files').createSignedUrl(path, 3600)
  if (error) throw error
  return data.signedUrl
}
export async function markMessageRead(id) {
  const { data: u } = await supabase.auth.getUser()
  const { error } = await supabase
    .from('message_reads')
    .upsert({ message_id: id, profile_id: u.user.id }, { onConflict: 'message_id,profile_id', ignoreDuplicates: true })
  if (error) throw error
}

// ---------- AUTH ----------
// Personalnummer -> hinterlegte Login-E-Mail (per SECURITY-DEFINER-Funktion).
// Gibt null zurück, wenn keine aktive Person mit dieser Nummer existiert.
export async function emailForPnr(pnr) {
  const { data, error } = await supabase.rpc('login_email', { pnr })
  if (error) throw error
  return data || null
}
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
    .select('id, role, full_name, personalnummer, entgeltgruppe, language, active, betrieb_id, betrieb:betriebe(id, name), team:teams(id, name, rotation_offset, anchor_date)')
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
    .select('id, profile_id, type, start_date, end_date, status, employee_note, approver_note, decided_at, profile:profiles!profile_id(full_name, team_id, role)')
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
// Ohne profileId: eigene (RLS). Mit profileId: für Personal, um einen Mitarbeiter zu filtern.
export async function listPayslips(profileId) {
  let q = supabase.from('payslips')
    .select('id, period, storage_path, profile_id')
    .order('period', { ascending: false })
  if (profileId) q = q.eq('profile_id', profileId)
  const { data, error } = await q
  if (error) throw error
  return data
}

// Kurzlebige signierte URL fürs PDF (5 Min). Bucket 'payslips' ist privat.
export async function payslipUrl(storagePath) {
  const { data, error } = await supabase.storage
    .from('payslips')
    .createSignedUrl(storagePath, 300)
  if (error) throw error
  return data.signedUrl
}

// Lohnzettel hochladen (nur Personal, per RLS abgesichert). period = 'YYYY-MM'.
export async function uploadPayslip(profileId, period, file) {
  const path = `${profileId}/${period}.pdf`
  const { error: upErr } = await supabase.storage.from('payslips')
    .upload(path, file, { contentType: 'application/pdf', upsert: true })
  if (upErr) throw upErr
  const { data: u } = await supabase.auth.getUser()
  const { error } = await supabase.from('payslips').upsert(
    { profile_id: profileId, period: `${period}-01`, storage_path: path, uploaded_by: u.user.id },
    { onConflict: 'profile_id,period' },
  )
  if (error) throw error
}
