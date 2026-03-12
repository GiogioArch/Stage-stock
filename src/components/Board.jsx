import React from 'react'
import { getCat, CATEGORIES, fmtDate, getMoveConf, Badge } from './UI'

export default function Board({ products, locations, stock, movements, alerts, events, onQuickAction, onNavigate }) {
  // ─── KPI calculations ───
  const totalProducts = products.length
  const totalStock = stock.reduce((sum, s) => sum + (s.quantity || 0), 0)
  const totalAlerts = alerts.length
  const criticalAlerts = alerts.filter(a => a.level === 'rupture')

  // Stock by category
  const stockByCategory = CATEGORIES.map(cat => {
    const catProducts = products.filter(p => p.category === cat.id)
    const catProductIds = new Set(catProducts.map(p => p.id))
    const qty = stock.filter(s => catProductIds.has(s.product_id)).reduce((sum, s) => sum + (s.quantity || 0), 0)
    return { ...cat, qty, count: catProducts.length }
  })

  // Stock by location
  const stockByLocation = locations.map(loc => {
    const qty = stock.filter(s => s.location_id === loc.id).reduce((sum, s) => sum + (s.quantity || 0), 0)
    const nbProducts = new Set(stock.filter(s => s.location_id === loc.id && s.quantity > 0).map(s => s.product_id)).size
    return { ...loc, qty, nbProducts }
  })

  // Last 5 movements
  const recentMoves = movements.slice(0, 5)

  // Next event
  const now = new Date().toISOString().split('T')[0]
  const nextEvent = events.find(e => e.date >= now)

  // Product name helper
  const pName = (id) => products.find(p => p.id === id)?.name || '?'
  const lName = (id) => locations.find(l => l.id === id)?.name || '?'

  return (
    <div style={{ padding: '0 16px 24px' }}>
      {/* KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        <KpiCard icon="📦" value={totalProducts} label="Produits" color="#E8735A" />
        <KpiCard icon="📊" value={totalStock} label="Stock total" color="#5B8DB8" />
        <KpiCard icon="⚠️" value={totalAlerts} label={`Alerte${totalAlerts > 1 ? 's' : ''}`} color={totalAlerts > 0 ? '#E8935A' : '#5DAB8B'} />
        <KpiCard icon="🚨" value={criticalAlerts.length} label="Rupture(s)" color={criticalAlerts.length > 0 ? '#D4648A' : '#5DAB8B'} />
      </div>

      {/* Next Event */}
      {nextEvent && (
        <div className="card" style={{ marginBottom: 16, borderLeft: '4px solid #E8735A' }}>
          <div className="section-title">Prochain concert</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800 }}>{nextEvent.name || nextEvent.lieu}</div>
              <div style={{ fontSize: 12, color: '#9A8B94', marginTop: 2 }}>
                {nextEvent.ville} — {nextEvent.format} — {nextEvent.capacite} pers.
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#E8735A' }}>
                {new Date(nextEvent.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="section-title">Actions rapides</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
        <QuickBtn icon="📥" label="Entrée" color="#5DAB8B" bg="#EDF7F2" onClick={() => onQuickAction('in')} />
        <QuickBtn icon="📤" label="Sortie" color="#D4648A" bg="#FDF0F4" onClick={() => onQuickAction('out')} />
        <QuickBtn icon="🔄" label="Transfert" color="#5B8DB8" bg="#EEF4FA" onClick={() => onQuickAction('transfer')} />
      </div>

      {/* Stock by Category */}
      <div className="section-title">Stock par catégorie</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        {stockByCategory.map(cat => (
          <div key={cat.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12, background: cat.bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
            }}>{cat.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{cat.name}</div>
              <div style={{ fontSize: 11, color: '#9A8B94' }}>{cat.count} produit{cat.count > 1 ? 's' : ''}</div>
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, color: cat.color }}>{cat.qty}</div>
          </div>
        ))}
      </div>

      {/* Stock by Location */}
      <div className="section-title">Stock par lieu</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        {stockByLocation.map(loc => (
          <div key={loc.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12,
              background: (loc.color || '#E8735A') + '15',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
            }}>{loc.icon || '📍'}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{loc.name}</div>
              <div style={{ fontSize: 11, color: '#9A8B94' }}>{loc.nbProducts} réf. en stock</div>
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#3D3042' }}>{loc.qty}</div>
          </div>
        ))}
      </div>

      {/* Recent Movements */}
      <div className="section-title">Derniers mouvements</div>
      {recentMoves.length === 0 ? (
        <div className="empty-state" style={{ padding: 24 }}>
          <div className="empty-icon">📋</div>
          <div className="empty-text">Aucun mouvement enregistré</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {recentMoves.map(m => {
            const conf = getMoveConf(m.type)
            return (
              <div key={m.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px' }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10, background: conf.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                }}>{conf.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {pName(m.product_id)}
                  </div>
                  <div style={{ fontSize: 11, color: '#9A8B94' }}>
                    {m.type === 'transfer'
                      ? `${lName(m.from_loc)} → ${lName(m.to_loc)}`
                      : lName(m.type === 'in' ? m.to_loc : m.from_loc)
                    }
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: conf.color }}>
                    {m.type === 'out' ? '−' : '+'}{m.quantity}
                  </div>
                  <div style={{ fontSize: 10, color: '#B8A0AE' }}>{fmtDate(m.created_at)}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Alerts preview */}
      {alerts.length > 0 && (
        <>
          <div className="section-title" style={{ marginTop: 20 }}>Alertes stock</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {alerts.slice(0, 3).map((a, i) => (
              <div key={i} className="card" style={{
                padding: '10px 14px',
                borderLeft: `4px solid ${a.level === 'rupture' ? '#D4648A' : '#E8935A'}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{a.name}</div>
                    <div style={{ fontSize: 11, color: '#9A8B94' }}>
                      Stock: {a.currentStock} / Seuil: {a.minStock}
                    </div>
                  </div>
                  <Badge color={a.level === 'rupture' ? '#D4648A' : '#E8935A'}>
                    {a.level === 'rupture' ? '🚨 Rupture' : '⚠️ Alerte'}
                  </Badge>
                </div>
              </div>
            ))}
            {alerts.length > 3 && (
              <button onClick={() => onNavigate('stocks')} style={{
                fontSize: 13, fontWeight: 700, color: '#E8735A', padding: 8, textAlign: 'center',
              }}>
                Voir les {alerts.length} alertes →
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Sub-components ───
function KpiCard({ icon, value, label, color }) {
  return (
    <div className="card" style={{ textAlign: 'center', padding: '16px 12px' }}>
      <div style={{ fontSize: 24, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 28, fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, color: '#9A8B94', fontWeight: 700, marginTop: 4 }}>{label}</div>
    </div>
  )
}

function QuickBtn({ icon, label, color, bg, onClick }) {
  return (
    <button onClick={onClick} style={{
      background: bg, border: `1.5px solid ${color}30`, borderRadius: 16,
      padding: '16px 8px', textAlign: 'center', color, fontWeight: 800, fontSize: 13,
      cursor: 'pointer', transition: 'transform 0.1s',
    }}>
      <div style={{ fontSize: 28, marginBottom: 4 }}>{icon}</div>
      {label}
    </button>
  )
}
