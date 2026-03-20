/**
 * BackStage — Fonctions utilitaires partagées
 */

// Parse "2026-03-20" as local date (not UTC)
export function parseDate(d) {
  if (!d) return new Date()
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
    const [y, m, day] = d.split('-').map(Number)
    return new Date(y, m - 1, day)
  }
  return new Date(d)
}

// Format ISO date → "20 mars, 14:30"
export function fmtDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

// Format date → "sam. 20 mars"
export function fmtDateShort(iso) {
  if (!iso) return ''
  return parseDate(iso).toLocaleDateString('fr-FR', {
    weekday: 'short', day: 'numeric', month: 'long',
  })
}

// Integer-only input sanitizer (quantities)
export function intOnly(value) {
  return value.replace(/[^0-9]/g, '')
}

// Decimal-only input sanitizer (prices)
export function decimalOnly(value) {
  return value.replace(/[^0-9.]/g, '')
}

// Mask IBAN: FR76 •••• •••• •••• 1234
export function maskIban(v) {
  if (!v || v.length < 8) return v || ''
  return v.slice(0, 4) + ' •••• •••• •••• ' + v.slice(-4)
}

// Mask Social Security: 1 97 •• •• ••• ••• 42
export function maskSS(v) {
  if (!v || v.length < 6) return v || ''
  return v.slice(0, 1) + ' ' + v.slice(1, 3) + ' •• •• ••• ••• ' + v.slice(-2)
}

// Format currency: 1234.5 → "1 235 €"
export function fmtCurrency(n) {
  if (n == null) return ''
  return Math.round(n).toLocaleString('fr-FR') + ' €'
}
