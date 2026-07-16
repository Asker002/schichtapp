// Abwesenheitsnachweis (PDF) für die Personalabteilung.
// Wird LIVE aus den aktuellen Daten erzeugt -> immer aktuell, eine Datei je Mitarbeiter.
// Sammelt ALLE Abwesenheiten (Urlaub + Krank) mit Zeitraum, Tagen und Status.
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

const dm = (iso) => (iso ? iso.split('-').reverse().join('.') : '')
const days = (a, b) => (a && b ? Math.max(1, Math.round((Date.parse(b) - Date.parse(a)) / 86400000) + 1) : 1)
const STATUS = { offen: 'Offen', genehmigt: 'Genehmigt', geaendert: 'Geändert', abgelehnt: 'Abgelehnt' }

export function downloadAbsencePdf(person, requests) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const now = new Date()

  // Kopf
  doc.setFontSize(9); doc.setTextColor(120)
  doc.text('Shin-Etsu · SE Tylose GmbH & Co. KG · Werk Wiesbaden', 15, 14)
  doc.setFontSize(18); doc.setTextColor(10, 58, 92)
  doc.text('Abwesenheitsnachweis', 15, 24)
  doc.setDrawColor(0, 84, 140); doc.setLineWidth(0.6); doc.line(15, 27, 195, 27)

  // Mitarbeiter-Angaben
  doc.setFontSize(11); let y = 36
  const info = [
    ['Name', person.full_name || '—'],
    ['Personalnummer', person.personalnummer || '—'],
    ['Betrieb', person.betrieb_name || '—'],
    ['Schicht', person.team_name || '—'],
    ['Erstellt am', now.toLocaleDateString('de-DE') + ' ' + now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })],
  ]
  info.forEach(([k, v]) => {
    doc.setTextColor(120); doc.text(k + ':', 15, y)
    doc.setTextColor(25); doc.text(String(v), 58, y); y += 6.5
  })

  // Sortiert nach Startdatum (neueste zuerst)
  const rows = [...(requests || [])]
    .sort((a, b) => String(b.start_date).localeCompare(String(a.start_date)))
    .map((r) => [
      r.type === 'krank' ? 'Krank' : 'Urlaub',
      dm(r.start_date), dm(r.end_date),
      String(days(r.start_date, r.end_date)),
      STATUS[r.status] || r.status || '',
    ])

  autoTable(doc, {
    startY: y + 4,
    head: [['Art', 'Von', 'Bis', 'Tage', 'Status']],
    body: rows.length ? rows : [['Keine Abwesenheiten erfasst', '', '', '', '']],
    styles: { fontSize: 10, cellPadding: 2.6 },
    headStyles: { fillColor: [0, 84, 140], textColor: 255 },
    alternateRowStyles: { fillColor: [244, 247, 250] },
    columnStyles: { 3: { halign: 'right' } },
    margin: { left: 15, right: 15 },
  })

  // Fuß
  const fy = doc.internal.pageSize.getHeight() - 12
  doc.setFontSize(8); doc.setTextColor(150)
  doc.text('Automatisch aus der Schichtapp erstellt · Anträge sind über den persönlichen Login verbindlich.', 15, fy)

  const safe = (person.full_name || 'Mitarbeiter').replace(/[^\wÄÖÜäöüß]+/g, '_')
  doc.save(`Abwesenheitsnachweis_${safe}${person.personalnummer ? '_' + person.personalnummer : ''}.pdf`)
}
