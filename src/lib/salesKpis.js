// ============================================================
// salesKpis.js — Calculs KPIs ventes pour le Board
// ============================================================
// Toutes les fonctions sont pures et synchrones.
// Elles prennent en entrée les données déjà chargées dans App
// state (pas de requête Supabase interne).
//
// Schéma sales (cf. sql/create-sales-pos.sql) :
//   id, org_id, event_id, sale_number, payment_method,
//   total_amount, items_count, notes, sold_by, created_at
//
// Schéma sale_items :
//   id, org_id, sale_id, product_id, variant,
//   quantity, unit_price, line_total, created_at
//
// Pas de colonne `buyer_id` → uniqueBuyers tombe en fallback
// sur le compteur de transactions (comptes distincts sale.id).
// ============================================================

const DAY_MS = 86400000

// Retourne tableau des ventes dans une fenêtre [fromMs, toMs[
function filterByWindow(sales, fromMs, toMs) {
  return (sales || []).filter(s => {
    if (!s?.created_at) return false
    const t = new Date(s.created_at).getTime()
    return t >= fromMs && t < toMs
  })
}

// ── CA total sur les N derniers jours ──
export function caLastDays(sales, days = 30) {
  const now = Date.now()
  const from = now - days * DAY_MS
  return filterByWindow(sales, from, now + 1)
    .reduce((acc, s) => acc + Number(s.total_amount || 0), 0)
}

// ── Évolution % vs période précédente ──
// Compare J-N..J-0 à J-2N..J-N. Retourne un nombre (peut être null si pas de base).
export function caTrendPct(sales, days = 30) {
  const now = Date.now()
  const curFrom = now - days * DAY_MS
  const prevFrom = now - 2 * days * DAY_MS
  const cur = filterByWindow(sales, curFrom, now + 1)
    .reduce((a, s) => a + Number(s.total_amount || 0), 0)
  const prev = filterByWindow(sales, prevFrom, curFrom)
    .reduce((a, s) => a + Number(s.total_amount || 0), 0)
  if (prev <= 0) return cur > 0 ? 100 : null
  return Math.round(((cur - prev) / prev) * 100)
}

// ── Ventes aujourd'hui (count + total €) ──
export function salesToday(sales) {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const end = start + DAY_MS
  const today = filterByWindow(sales, start, end)
  return {
    count: today.length,
    total: today.reduce((a, s) => a + Number(s.total_amount || 0), 0),
  }
}

// ── Panier moyen sur N jours ──
export function avgBasket(sales, days = 30) {
  const now = Date.now()
  const from = now - days * DAY_MS
  const win = filterByWindow(sales, from, now + 1)
  if (win.length === 0) return 0
  const total = win.reduce((a, s) => a + Number(s.total_amount || 0), 0)
  return total / win.length
}

// ── Top produit sur N jours (nom + quantité + CA) ──
// saleItems est filtré par appartenance à une vente de la fenêtre.
export function topProduct(saleItems, products, days = 30, sales) {
  if (!Array.isArray(saleItems) || saleItems.length === 0) {
    return { name: null, qty: 0, total: 0 }
  }
  const now = Date.now()
  const from = now - days * DAY_MS
  const windowSaleIds = new Set(
    filterByWindow(sales, from, now + 1).map(s => s.id)
  )
  const pMap = {}
  ;(products || []).forEach(p => { pMap[p.id] = p })

  const agg = {}
  for (const it of saleItems) {
    if (!windowSaleIds.has(it.sale_id)) continue
    const pid = it.product_id
    if (!pid) continue
    if (!agg[pid]) agg[pid] = { qty: 0, total: 0 }
    agg[pid].qty += Number(it.quantity || 0)
    agg[pid].total += Number(it.line_total || 0)
  }
  const entries = Object.entries(agg)
  if (entries.length === 0) return { name: null, qty: 0, total: 0 }
  entries.sort((a, b) => b[1].qty - a[1].qty)
  const [pid, stats] = entries[0]
  const p = pMap[pid]
  return {
    name: p?.name || p?.sku || 'Produit inconnu',
    qty: stats.qty,
    total: stats.total,
  }
}

// ── Nombre de transactions sur N jours ──
export function salesCount(sales, days = 30) {
  const now = Date.now()
  const from = now - days * DAY_MS
  return filterByWindow(sales, from, now + 1).length
}

// ── Meilleur concert sur N jours ──
// Retourne l'event (rattaché via event_id) avec le plus gros CA.
export function bestConcert(sales, events, days = 30) {
  const now = Date.now()
  const from = now - days * DAY_MS
  const win = filterByWindow(sales, from, now + 1)
  const byEvent = {}
  for (const s of win) {
    const eid = s.event_id
    if (!eid) continue
    byEvent[eid] = (byEvent[eid] || 0) + Number(s.total_amount || 0)
  }
  const entries = Object.entries(byEvent)
  if (entries.length === 0) return { name: null, date: null, total: 0 }
  entries.sort((a, b) => b[1] - a[1])
  const [eid, total] = entries[0]
  const ev = (events || []).find(e => e.id === eid)
  return {
    name: ev?.name || ev?.lieu || 'Concert inconnu',
    date: ev?.date || null,
    total,
  }
}

// ── Acheteurs uniques ──
// `buyer_id` n'existe pas dans le schéma actuel → on retombe
// sur `sold_by` si dispo (distinct), sinon sur le nb de transactions.
export function uniqueBuyers(sales, days = 30) {
  const now = Date.now()
  const from = now - days * DAY_MS
  const win = filterByWindow(sales, from, now + 1)
  if (win.length === 0) return 0
  // Si au moins une vente a un champ buyer_id / sold_by non nul, on l'utilise.
  const hasBuyer = win.some(s => s.buyer_id || s.sold_by)
  if (hasBuyer) {
    const set = new Set()
    win.forEach(s => {
      const id = s.buyer_id || s.sold_by
      if (id) set.add(id)
    })
    return set.size
  }
  // Fallback : 1 vente = 1 client distinct (approximation panier)
  return win.length
}
