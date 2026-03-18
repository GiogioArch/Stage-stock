import React, { useState, useMemo } from 'react'
import { Badge, parseDate } from './UI'

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

  return (
    <div style={{ padding: '0 16px 24px' }}>

      {/* ─── Header card ─── */}
      <div className="card" style={{
        marginBottom: 16, padding: '18px 16px',
        background: 'linear-gradient(135deg, #5B8DB808, #D4648A18)',
        border: '1px solid #5B8DB825',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 8,
            background: 'linear-gradient(135deg, #5B8DB8, #D4648A)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, color: 'white',
            boxShadow: '0 4px 16px #5B8DB830',
          }}></div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#1E293B' }}>Prévisions Merch</div>
            <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 600 }}>
              {upcomingEvents.length} concert{upcomingEvents.length > 1 ? 's' : ''} à venir · {merchProducts.length} réf. merch
            </div>
          </div>
        </div>

        {/* KPI row */}
        <div style={{ display: 'flex', gap: 8 }}>
          <KpiBox label="Stock actuel" value={totalMerchStock} color="#5B8DB8" />
          <KpiBox label="Ventes proj." value={totalProjectedSales} color="#5B8DB8" />
          <KpiBox label="CA proj." value={`${totalProjectedCA}€`} color="#5DAB8B" />
          <KpiBox label="Solde" value={totalMerchStock - totalProjectedSales} color={totalMerchStock - totalProjectedSales < 0 ? '#D4648A' : '#5DAB8B'} />
        </div>
      </div>

      {/* ─── Scenario selector ─── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[
          { id: 'low', label: 'Pessimiste', color: '#5B8DB8' },
          { id: 'mid', label: 'Réaliste', color: '#5B8DB8' },
          { id: 'high', label: 'Optimiste', color: '#5DAB8B' },
        ].map(s => (
          <button key={s.id} onClick={() => setScenario(s.id)} style={{
            flex: 1, padding: '8px 6px', borderRadius: 10, fontSize: 12, fontWeight: 700,
            cursor: 'pointer', textAlign: 'center',
            background: scenario === s.id ? `${s.color}15` : 'white',
            color: scenario === s.id ? s.color : '#94A3B8',
            border: `1px solid ${scenario === s.id ? s.color + '40' : '#CBD5E1'}`,
          }}>{s.label}</button>
        ))}
      </div>

      {/* ─── Alert banners ─── */}
      {firstRupture && (
        <div className="card" style={{
          marginBottom: 12, padding: '12px 14px',
          background: '#D4648A10', borderLeft: '4px solid #D4648A',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22 }}></span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#D4648A' }}>Rupture projetée</div>
              <div style={{ fontSize: 12, color: '#1E293B' }}>
                {firstRupture.name || firstRupture.lieu} — {parseDate(firstRupture.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
              </div>
              <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
                Stock insuffisant dès ce concert ({firstRupture.stockAfter} unités manquantes)
              </div>
            </div>
          </div>
        </div>
      )}

      {firstReappro && !firstRupture && (
        <div className="card" style={{
          marginBottom: 12, padding: '12px 14px',
          background: '#5B8DB810', borderLeft: '4px solid #5B8DB8',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22 }}></span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#5B8DB8' }}>Réappro recommandé</div>
              <div style={{ fontSize: 12, color: '#1E293B' }}>
                Avant {firstReappro.name || firstReappro.lieu} — {parseDate(firstReappro.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
              </div>
              <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
                Stock projeté : {firstReappro.stockAfter} unités ({firstReappro.pctRemaining}% restant)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Stock gauge ─── */}
      <div className="card" style={{ padding: '14px 16px', marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
          Jauge stock merch
        </div>
        <div style={{
          height: 24, borderRadius: 12, background: '#F1F5F9',
          overflow: 'hidden', position: 'relative',
        }}>
          {/* Projected consumption */}
          <div style={{
            position: 'absolute', left: 0, top: 0, bottom: 0,
            width: `${totalMerchStock > 0 ? Math.min(100, Math.round((totalProjectedSales / totalMerchStock) * 100)) : 0}%`,
            background: totalProjectedSales > totalMerchStock
              ? 'linear-gradient(90deg, #5B8DB8, #D4648A)'
              : 'linear-gradient(90deg, #5B8DB8, #5B8DB8)',
            borderRadius: 12,
            transition: 'width 0.4s',
          }} />
          {/* Label */}
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 600, color: '#1E293B',
          }}>
            {totalProjectedSales}/{totalMerchStock} projetées
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
          <span style={{ fontSize: 10, color: '#94A3B8' }}>0</span>
          <span style={{ fontSize: 10, color: '#94A3B8' }}>{totalMerchStock} unités</span>
        </div>
      </div>

      {/* ─── Timeline ─── */}
      <div style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, padding: '0 4px' }}>
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
                    width: 2, height: 20, background: '#CBD5E1',
                    marginLeft: 19,
                  }} />
                )}

                <div
                  className="card"
                  onClick={() => setShowDetail(isExpanded ? null : ev.id)}
                  style={{
                    padding: '12px 14px', cursor: 'pointer',
                    borderLeft: `4px solid ${ev.rupture ? '#D4648A' : ev.reappro ? '#5B8DB8' : '#5DAB8B'}`,
                    opacity: ev.rupture ? 1 : 1,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {/* Date circle */}
                    <div style={{
                      width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                      background: ev.rupture ? '#D4648A15' : ev.reappro ? '#5B8DB815' : '#5DAB8B15',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 600, textAlign: 'center', lineHeight: 1.2,
                      color: ev.rupture ? '#D4648A' : ev.reappro ? '#5B8DB8' : '#5DAB8B',
                    }}>
                      {parseDate(ev.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 13, fontWeight: 700, color: '#1E293B',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {ev.name || ev.lieu}
                      </div>
                      <div style={{ fontSize: 11, color: '#94A3B8' }}>
                        {ev.ville} · {ev.format} · {ev.capacite} pers.
                        {ev.territoire && ` · ${ev.territoire}`}
                      </div>
                    </div>

                    {/* Projected sales */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{
                        fontSize: 16, fontWeight: 600,
                        color: ev.rupture ? '#D4648A' : '#5B8DB8',
                      }}>
                        −{ev.projectedSales}
                      </div>
                      <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 600 }}>
                        J-{daysUntil}
                      </div>
                    </div>
                  </div>

                  {/* Stock bar */}
                  <div style={{ marginTop: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 10, color: '#94A3B8' }}>
                        Stock après : {ev.stockAfter < 0 ? `−${Math.abs(ev.stockAfter)}` : ev.stockAfter}
                      </span>
                      <span style={{
                        fontSize: 10, fontWeight: 700,
                        color: ev.rupture ? '#D4648A' : ev.reappro ? '#5B8DB8' : '#5DAB8B',
                      }}>
                        {ev.pctRemaining}%
                      </span>
                    </div>
                    <div style={{ height: 5, borderRadius: 3, background: '#F1F5F9', overflow: 'hidden' }}>
                      <div style={{
                        width: `${ev.pctRemaining}%`,
                        height: '100%', borderRadius: 3, transition: 'width 0.3s',
                        background: ev.rupture ? '#D4648A' : ev.reappro ? '#5B8DB8' : '#5DAB8B',
                      }} />
                    </div>
                  </div>

                  {/* Badges */}
                  <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                    <Badge color="#94A3B8">
                      Taux {Math.round(ev.convRate * 100)}% × {ev.territoryMult}
                    </Badge>
                    {ev.rupture && <Badge color="#D4648A">RUPTURE</Badge>}
                    {ev.reappro && !ev.rupture && <Badge color="#5B8DB8">RÉAPPRO</Badge>}
                    {ev.transport_inter_iles && <Badge color="#5B8DB8">Inter-îles</Badge>}
                  </div>
                </div>

                {/* ─── Expanded detail ─── */}
                {isExpanded && (
                  <div style={{
                    marginLeft: 16, marginTop: -2, marginBottom: 4,
                    padding: '12px 14px', background: '#F8FAFC',
                    borderRadius: '0 0 14px 14px', border: '1px solid #F1F5F9',
                    borderTop: 'none',
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                      Détail par produit
                    </div>
                    {getProductBreakdown(ev).map(p => (
                      <div key={p.id} style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0',
                        borderBottom: '1px solid #F1F5F920',
                      }}>
                        <span style={{ fontSize: 14 }}>{p.image || ''}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: 12, fontWeight: 600,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>{p.name}</div>
                          <div style={{ fontSize: 10, color: '#94A3B8' }}>
                            Stock: {p.totalQty} → proj. −{p.projectedQty}
                          </div>
                        </div>
                        <div style={{
                          fontSize: 13, fontWeight: 600,
                          color: p.remaining < 0 ? '#D4648A' : p.remaining === 0 ? '#5B8DB8' : '#5DAB8B',
                        }}>
                          {p.remaining < 0 ? `−${Math.abs(p.remaining)}` : p.remaining}
                        </div>
                      </div>
                    ))}

                    {/* Calculation explanation */}
                    <div style={{
                      marginTop: 10, padding: '8px 10px', borderRadius: 8,
                      background: '#F1F5F940', fontSize: 10, color: '#94A3B8', lineHeight: 1.6,
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
            fontSize: 12, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase',
            letterSpacing: 1, marginTop: 20, marginBottom: 10, padding: '0 4px',
          }}>
            Stock merch actuel
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {merchProducts.map(p => (
              <div key={p.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px' }}>
                <span style={{ fontSize: 18 }}>{p.image || ''}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13, fontWeight: 600,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{p.name}</div>
                  <div style={{ fontSize: 10, color: '#94A3B8' }}>{p.sku}</div>
                </div>
                <div style={{
                  fontSize: 16, fontWeight: 600,
                  color: p.totalQty === 0 ? '#D4648A' : p.totalQty <= (p.min_stock || 5) ? '#5B8DB8' : '#5DAB8B',
                }}>{p.totalQty}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Sub-components ───
function KpiBox({ label, value, color }) {
  return (
    <div style={{
      flex: 1, textAlign: 'center', padding: '8px 4px',
      background: '#F1F5F9', borderRadius: 10, border: '1px solid #F1F5F9',
    }}>
      <div style={{ fontSize: 16, fontWeight: 600, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 8, color: '#94A3B8', fontWeight: 700, marginTop: 2 }}>{label}</div>
    </div>
  )
}
