// =====================================================================
//  Rotationslogik: 12h-Vollkonti
//  Muster pro Zyklus: 1 Tag / 1 Nacht / 2 frei  (4-Tage-Zyklus)
//  Der Plan wird BERECHNET, nicht von Hand gepflegt.
//  team.rotation_offset (0..3) versetzt jede Crew um einen Tag,
//  sodass 4 Teams zusammen 24/7 abdecken.
// =====================================================================

// Index im Zyklus -> Schichtart
export const CYCLE = ['tag', 'nacht', 'frei', 'frei']
export const CYCLE_LENGTH = CYCLE.length

// Ganze Tage zwischen zwei ISO-Daten (UTC-normalisiert, ohne Zeitzonen-Drift).
function daysBetween(anchorISO, dateISO) {
  const [ay, am, ad] = anchorISO.split('-').map(Number)
  const [dy, dm, dd] = dateISO.split('-').map(Number)
  const a = Date.UTC(ay, am - 1, ad)
  const d = Date.UTC(dy, dm - 1, dd)
  return Math.round((d - a) / 86_400_000)
}

/**
 * Schichtart für ein Team an einem Datum.
 * @param {{anchor_date: string, rotation_offset: number}} team
 * @param {string} dateISO  z.B. "2026-07-10"
 * @returns {'tag'|'nacht'|'frei'}
 */
export function shiftFor(team, dateISO) {
  const offset = team?.rotation_offset ?? 0
  const anchor = team?.anchor_date ?? '2026-01-01'
  const idx = (((daysBetween(anchor, dateISO) + offset) % CYCLE_LENGTH) + CYCLE_LENGTH) % CYCLE_LENGTH
  return CYCLE[idx]
}

/**
 * Erzeugt den Plan für N Tage ab startISO.
 * @returns {Array<{date: string, shift: string}>}
 */
export function planFor(team, startISO, days = 14) {
  const out = []
  const [y, m, d] = startISO.split('-').map(Number)
  for (let i = 0; i < days; i++) {
    const dt = new Date(Date.UTC(y, m - 1, d + i))
    const iso = dt.toISOString().slice(0, 10)
    out.push({ date: iso, shift: shiftFor(team, iso) })
  }
  return out
}
