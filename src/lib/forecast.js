// ─── Forecast business rules (single source of truth) ───
// Taux conversion par format : concert live 10-12%, sound system 6-8%, impro 12-15%
// Multiplicateur territoire : Martinique ×1.0, Guadeloupe ×0.85, Guyane ×0.80, Reunion ×0.75

export const CONVERSION_RATES = {
  'concert live': { low: 0.10, mid: 0.11, high: 0.12 },
  'concert':      { low: 0.10, mid: 0.11, high: 0.12 },
  'live':         { low: 0.10, mid: 0.11, high: 0.12 },
  'sound system':  { low: 0.06, mid: 0.07, high: 0.08 },
  'soundsystem':   { low: 0.06, mid: 0.07, high: 0.08 },
  'impro':         { low: 0.12, mid: 0.135, high: 0.15 },
  'improvisation': { low: 0.12, mid: 0.135, high: 0.15 },
}

export const DEFAULT_RATE = { low: 0.08, mid: 0.10, high: 0.12 }

export const TERRITORY_MULT = {
  'martinique': 1.0,
  'guadeloupe': 0.85,
  'guyane':     0.80,
  'reunion':    0.75,
  'france':     0.95,
}

export const DEFAULT_TERRITORY = 0.90

/** Get conversion rates {low, mid, high} for an event format */
export function getConversionRate(format) {
  if (!format) return DEFAULT_RATE
  return CONVERSION_RATES[format.toLowerCase().trim()] || DEFAULT_RATE
}

/** Get territory multiplier (number) */
export function getTerritoryMult(territoire) {
  if (!territoire) return DEFAULT_TERRITORY
  return TERRITORY_MULT[territoire.toLowerCase().trim()] || DEFAULT_TERRITORY
}

/** Get mid conversion rate (single number, for simple estimates) */
export function getMidRate(format) {
  return getConversionRate(format).mid
}
