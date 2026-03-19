import React, { useState, useMemo } from 'react'
import { Badge, parseDate } from './UI'
import { GradientHeader, FilterPills } from '../design'
import { MODULES, SEMANTIC, BASE, SPACE, TYPO, RADIUS, SHADOW, getModuleTheme } from '../lib/theme'

// ─── Forecast configuration ───
const CONVERSION_RATES = {
  'concert live': { low: 0.10, mid: 0.11, high: 0.12 },
  'concert':      { low: 0.10, mid: 0.11, high: 0.12 },
  'live':         { low: 0.10, mid: 0.11, high: 0.12 },
  'sound system':  { low: 0.06, mid: 0.07, high: 0.08 },
  'soundsystem':   { low: 0.06, mid: 0.07, high: 0.08 },
  'impro':         { low: 0.12, mid: 0.135, high: 0.15 },
  'improvisation': { low: 0.12, mid: 0.135, high: 0.15 },
}
const DEFAULT_RATE = { low: 0.08, mid: 0.10, high: 0.12 }

const TERRITORY_MULT = {
  'martinique': 1.0,
  'guadeloupe': 0.85,
}
const DEFAULT_TERRITORY = 0.90

function getConversionRate(format) {
  if (!format) return DEFAULT_RATE
  const key = format.toLowerCase().trim()
  return CONVERSION_RATES[key] || DEFAULT_RATE
}

function getTerritoryMult(territoire) {
  if (!territoire) return DEFAULT_TERRITORY
  const key = territoire.toLowerCase().trim()
  return TERRITORY_MULT[key] || DEFAULT_TERRITORY
}

export default function Forecast({ products, stock, events, locations }) {
  const [scenario, setScenario] = useState('mid') // low, mid, high
  const [showDetail, setShowDetail] = useState(null) // event id

  const today = new Date().toISOString().split('T')[0]

  // ─── Merch products with current total stock ───
  const merchProducts = useMemo(() => {
    return products
      .filter(p => p.category === 'merch')
      .map(p => {
        const totalQty = stock
          .filter(s => s.product_id === p.id)
          .reduce((sum, s) => sum + (s.quantity || 0), 0)
        return { ...p, totalQty }
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [products, stock])

  const totalMerchStock = merchProducts.reduce((s, p) => s + p.totalQty, 0)

  // ─── Upcoming events sorted by date ───
  const upcomingEvents = useMemo(() =>
    events.filter(e => e.date >= today).sort((a, b) => a.date.localeCompare(b.date)),
    [events, today]
  )

  // ─── Forecast projections per event ───
  const projections = useMemo(() => {
    let runningStock = totalMerchStock
    let cumulSales = 0

    return upcomingEvents.map(ev => {
      const cap = ev.capacite || 0
      const rate = getConversionRate(ev.format)
      const mult = getTerritoryMult(ev.territoire)
      const convRate = rate[scenario]

      const projectedSales = Math.round(cap * convRate * mult)
      cumulSales += projectedSales
      const stockAfter = totalMerchStock - cumulSales
      const rupture = stockAfter <= 0
      const reappro = stockAfter > 0 && stockAfter < totalMerchStock * 0.2 // below 20% = réappro warning

      const stockBefore = runningStock
      runningStock = stockAfter

      return {
        ...ev,
        projectedSales,
        convRate,
        territoryMult: mult,
        cumulSales,
        stockBefore,
        stockAfter,
        rupture,
        reappro,
        pctRemaining: totalMerchStock > 0 ? Math.max(0, Math.round((stockAfter / totalMerchStock) * 100)) : 0,
      }
    })
  }, [upcomingEvents, totalMerchStock, scenario])

  // ─── Key alerts ───
  const firstRupture = projections.find(p => p.rupture)
  const firstReappro = projections.find(p => p.reappro && !p.rupture)
  const totalProjectedSales = projections.reduce((s, p) => s + p.projectedSales, 0)
  const totalProjectedCA = Math.round(totalProjectedSales * 25) // ~25€ prix moyen t-shirt

  // ─── Per-product breakdown for detail view ───
  const getProductBreakdown = (ev) => {
    if (merchProducts.length === 0) return []
    const rate = getConversionRate(ev.format)
    const mult = getTerritoryMult(ev.territoire)
    const totalSales = Math.round((ev.capacite || 0) * rate[scenario] * mult)

    // Distribute proportionally to stock
    const totalStock = merchProducts.reduce((s, p) => s + p.totalQty, 0)
    return merchProducts.map(p => {
      const ratio = totalStock > 0 ? p.totalQty / totalStock : 1 / merchProducts.length
      const qty = Math.round(totalSales * ratio)
      return { ...p, projectedQty: qty, remaining: p.totalQty - qty }
    })
  }

  const t = getModuleTheme('previsions')

  return (
    <div>

      {/* ─── Gradient Header Banner (full-width) ─── */}
      <GradientHeader
        module="previsions"
        title="Prévisions Merch"
        subtitle={`${upcomingEvents.length} concert${upcomingEvents.length > 1 ? 's' : ''} à venir · ${merchProducts.length} réf. merch`}
        stats={[
          { value: totalMerchStock, label: 'Stock actuel' },
          { value: totalProjectedSales, label: 'Ventes proj.' },
          { value: `${totalProjectedCA}€`, label: 'CA proj.' },
          { value: totalMerchStock - totalProjectedSales, label: 'Solde' },
        ]}
      />

      <div style={{ padding: `0 ${SPACE.lg}px ${SPACE.xxl}px` }}>

      {/* ─── Scenario selector ─── */}
      <FilterPills
        options={[
          { id: 'low', label: 'Pessimiste' },
          { id: 'mid', label: 'Réaliste' },
          { id: 'high', label: 'Optimiste' },
        ]}
        active={scenario}
        onChange={setScenario}
      />

      {/* ─── Alert banners ─── */}
      {firstRupture && (
        <div className="card" style={{
          marginBottom: SPACE.md, padding: `${SPACE.md}px ${SPACE.lg}px`,
          background: `${SEMANTIC.danger}10`, borderLeft: `4px solid ${SEMANTIC.danger}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22 }}></span>
            <div>
              <div style={{ ...TYPO.bodyBold, color: SEMANTIC.danger }}>Rupture projetée</div>
              <div style={{ ...TYPO.body, color: BASE.text }}>
                {firstRupture.name || firstRupture.lieu} — {parseDate(firstRupture.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
              </div>
              <div style={{ ...TYPO.micro, color: BASE.textMuted, marginTop: 2 }}>
                Stock insuffisant dès ce concert ({firstRupture.stockAfter} unités manquantes)
              </div>
            </div>
          </div>
        </div>
      )}

      {firstReappro && !firstRupture && (
        <div className="card" style={{
          marginBottom: SPACE.md, padding: `${SPACE.md}px ${SPACE.lg}px`,
          background: `${SEMANTIC.warning}10`, borderLeft: `4px solid ${SEMANTIC.warning}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22 }}></span>
            <div>
              <div style={{ ...TYPO.bodyBold, color: SEMANTIC.warning }}>Réappro recommandé</div>
              <div style={{ ...TYPO.body, color: BASE.text }}>
                Avant {firstReappro.name || firstReappro.lieu} — {parseDate(firstReappro.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
              </div>
              <div style={{ ...TYPO.micro, color: BASE.textMuted, marginTop: 2 }}>
                Stock projeté : {firstReappro.stockAfter} unités ({firstReappro.pctRemaining}% restant)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Stock gauge ─── */}
      <div className="card" style={{ padding: `${SPACE.lg}px`, marginBottom: SPACE.lg }}>
        <div style={{ ...TYPO.caption, color: BASE.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
          Jauge stock merch
        </div>
        <div style={{
          height: 24, borderRadius: RADIUS.lg, background: BASE.bgHover,
          overflow: 'hidden', position: 'relative',
        }}>
          {/* Projected consumption */}
          <div style={{
            position: 'absolute', left: 0, top: 0, bottom: 0,
            width: `${totalMerchStock > 0 ? Math.min(100, Math.round((totalProjectedSales / totalMerchStock) * 100)) : 0}%`,
            background: totalProjectedSales > totalMerchStock
              ? `linear-gradient(90deg, ${SEMANTIC.warning}, ${SEMANTIC.danger})`
              : `linear-gradient(90deg, ${t.color}, ${t.color})`,
            borderRadius: RADIUS.lg,
            transition: 'width 0.4s',
          }} />
          {/* Label */}
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            ...TYPO.micro, color: BASE.text,
          }}>
            {totalProjectedSales}/{totalMerchStock} projetées
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
          <span style={{ ...TYPO.label, color: BASE.textMuted }}>0</span>
          <span style={{ ...TYPO.label, color: BASE.textMuted }}>{totalMerchStock} unités</span>
        </div>
      </div>

      {/* ─── Timeline ─── */}
      <div style={{ ...TYPO.caption, color: BASE.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, padding: '0 4px' }}>
        Timeline prévisions
      </div>

      {projections.length === 0 ? (
        <div className="empty-state" style={{ padding: 40 }}>
          <div className="empty-icon"></div>
          <div className="empty-text">Aucun concert à venir</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {projections.map((ev, i) => {
            const daysUntil = Math.ceil((new Date(ev.date) - new Date()) / 86400000)
            const isExpanded = showDetail === ev.id

            return (
              <div key={ev.id}>
                {/* Timeline connector */}
                {i > 0 && (
                  <div style={{
                    width: 2, height: 20, background: BASE.borderHover,
                    marginLeft: 19,
                  }} />
                )}

                <div
                  className="card"
                  onClick={() => setShowDetail(isExpanded ? null : ev.id)}
                  style={{
                    padding: `${SPACE.md}px ${SPACE.lg}px`, cursor: 'pointer',
                    borderLeft: `4px solid ${ev.rupture ? SEMANTIC.danger : ev.reappro ? SEMANTIC.warning : SEMANTIC.success}`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {/* Date circle */}
                    <div style={{
                      width: 38, height: 38, borderRadius: RADIUS.md, flexShrink: 0,
                      background: ev.rupture ? `${SEMANTIC.danger}15` : ev.reappro ? `${SEMANTIC.warning}15` : `${SEMANTIC.success}15`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      ...TYPO.label, textAlign: 'center', lineHeight: 1.2,
                      color: ev.rupture ? SEMANTIC.danger : ev.reappro ? SEMANTIC.warning : SEMANTIC.success,
                    }}>
                      {parseDate(ev.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        ...TYPO.h3, color: BASE.text,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {ev.name || ev.lieu}
                      </div>
                      <div style={{ ...TYPO.micro, color: BASE.textMuted }}>
                        {ev.ville} · {ev.format} · {ev.capacite} pers.
                        {ev.territoire && ` · ${ev.territoire}`}
                      </div>
                    </div>

                    {/* Projected sales */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{
                        fontSize: 16, fontWeight: 600,
                        color: ev.rupture ? SEMANTIC.danger : t.color,
                      }}>
                        −{ev.projectedSales}
                      </div>
                      <div style={{ ...TYPO.label, color: BASE.textMuted }}>
                        J-{daysUntil}
                      </div>
                    </div>
                  </div>

                  {/* Stock bar */}
                  <div style={{ marginTop: SPACE.sm }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ ...TYPO.label, color: BASE.textMuted }}>
                        Stock après : {ev.stockAfter < 0 ? `−${Math.abs(ev.stockAfter)}` : ev.stockAfter}
                      </span>
                      <span style={{
                        ...TYPO.label, fontWeight: 700,
                        color: ev.rupture ? SEMANTIC.danger : ev.reappro ? SEMANTIC.warning : SEMANTIC.success,
                      }}>
                        {ev.pctRemaining}%
                      </span>
                    </div>
                    <div style={{ height: 5, borderRadius: 3, background: BASE.bgHover, overflow: 'hidden' }}>
                      <div style={{
                        width: `${ev.pctRemaining}%`,
                        height: '100%', borderRadius: 3, transition: 'width 0.3s',
                        background: ev.rupture ? SEMANTIC.danger : ev.reappro ? SEMANTIC.warning : SEMANTIC.success,
                      }} />
                    </div>
                  </div>

                  {/* Badges */}
                  <div style={{ display: 'flex', gap: 6, marginTop: SPACE.sm, flexWrap: 'wrap' }}>
                    <Badge color={BASE.textMuted}>
                      Taux {Math.round(ev.convRate * 100)}% × {ev.territoryMult}
                    </Badge>
                    {ev.rupture && <Badge color={SEMANTIC.danger}>RUPTURE</Badge>}
                    {ev.reappro && !ev.rupture && <Badge color={SEMANTIC.warning}>RÉAPPRO</Badge>}
                    {ev.transport_inter_iles && <Badge color={SEMANTIC.warning}>Inter-îles</Badge>}
                  </div>
                </div>

                {/* ─── Expanded detail ─── */}
                {isExpanded && (
                  <div style={{
                    marginLeft: SPACE.lg, marginTop: -2, marginBottom: SPACE.xs,
                    padding: `${SPACE.md}px ${SPACE.lg}px`, background: BASE.bgSurface,
                    borderRadius: `0 0 ${RADIUS.lg}px ${RADIUS.lg}px`, border: `1px solid ${BASE.bgHover}`,
                    borderTop: 'none',
                  }}>
                    <div style={{ ...TYPO.micro, color: BASE.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: SPACE.sm }}>
                      Détail par produit
                    </div>
                    {getProductBreakdown(ev).map(p => (
                      <div key={p.id} style={{
                        display: 'flex', alignItems: 'center', gap: SPACE.sm, padding: '6px 0',
                        borderBottom: `1px solid ${BASE.bgHover}20`,
                      }}>
                        <span style={{ fontSize: 14 }}>{p.image || ''}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            ...TYPO.caption,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>{p.name}</div>
                          <div style={{ ...TYPO.label, color: BASE.textMuted }}>
                            Stock: {p.totalQty} → proj. −{p.projectedQty}
                          </div>
                        </div>
                        <div style={{
                          ...TYPO.bodyBold,
                          color: p.remaining < 0 ? SEMANTIC.danger : p.remaining === 0 ? SEMANTIC.warning : SEMANTIC.success,
                        }}>
                          {p.remaining < 0 ? `−${Math.abs(p.remaining)}` : p.remaining}
                        </div>
                      </div>
                    ))}

                    {/* Calculation explanation */}
                    <div style={{
                      marginTop: 10, padding: `${SPACE.sm}px ${SPACE.md}px`, borderRadius: RADIUS.sm,
                      background: `${BASE.bgHover}40`, ...TYPO.label, color: BASE.textMuted, lineHeight: 1.6,
                    }}>
                      Calcul : {ev.capacite} pers. × {Math.round(ev.convRate * 100)}% conversion × {ev.territoryMult} territoire = {ev.projectedSales} ventes
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ─── Merch products stock summary ─── */}
      {merchProducts.length > 0 && (
        <>
          <div style={{
            ...TYPO.caption, color: BASE.textMuted, textTransform: 'uppercase',
            letterSpacing: 1, marginTop: SPACE.xl, marginBottom: 10, padding: '0 4px',
          }}>
            Stock merch actuel
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {merchProducts.map(p => (
              <div key={p.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: `${SPACE.md}px ${SPACE.lg}px` }}>
                <span style={{ fontSize: 18 }}>{p.image || ''}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    ...TYPO.bodyBold,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{p.name}</div>
                  <div style={{ ...TYPO.label, color: BASE.textMuted }}>{p.sku}</div>
                </div>
                <div style={{
                  fontSize: 16, fontWeight: 600,
                  color: p.totalQty === 0 ? SEMANTIC.danger : p.totalQty <= (p.min_stock || 5) ? SEMANTIC.warning : SEMANTIC.success,
                }}>{p.totalQty}</div>
              </div>
            ))}
          </div>
        </>
      )}
      </div>
    </div>
  )
}

