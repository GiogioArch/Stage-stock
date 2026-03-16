import React, { useState, useMemo } from 'react'
import { getCat, CATEGORIES, fmtDate, getMoveConf, Badge, parseDate } from './UI'
import { ROLE_CONF } from './RolePicker'
import EventDetail from './EventDetail'

export default function Board({ products, locations, stock, movements, alerts, events, families, subfamilies, checklists, roles, eventPacking, userProfiles, userRole, onQuickAction, onNavigate, onReload, onToast }) {
  const [selectedEvent, setSelectedEvent] = useState(null)

  // ─── Role config ───
  const roleConf = userRole ? (ROLE_CONF[userRole.code] || { icon: '📋', color: '#8A7D75', label: userRole.name }) : null
  const isAdmin = !userRole || ['TM', 'PM', 'LOG', 'PA'].includes(userRole?.code)

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

  // Upcoming events
  const now = new Date().toISOString().split('T')[0]
  const upcomingEvents = events.filter(e => e.date >= now)
  const nextEvent = upcomingEvents[0]

  // ─── Role-specific packing stats ───
  const myPackingItems = userRole
    ? eventPacking.filter(ep => ep.role_code === userRole.code)
    : []
  const nextEventPacking = nextEvent
    ? myPackingItems.filter(ep => ep.event_id === nextEvent.id)
    : []
  const packingDone = nextEventPacking.filter(ep => ep.packed).length
  const packingTotal = nextEventPacking.length
  const packingPct = packingTotal > 0 ? Math.round((packingDone / packingTotal) * 100) : 0

  // ─── Low stock items for my role ───
  const myLowStock = alerts.slice(0, 5)

  // ─── Movement trends (last 7 days) ───
  const moveTrend = useMemo(() => {
    const days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().split('T')[0]
      const label = d.toLocaleDateString('fr-FR', { weekday: 'short' }).slice(0, 3)
      const dayMoves = movements.filter(m => m.created_at?.startsWith(key))
      days.push({
        key, label,
        in: dayMoves.filter(m => m.type === 'in').reduce((s, m) => s + (m.quantity || 0), 0),
        out: dayMoves.filter(m => m.type === 'out').reduce((s, m) => s + (m.quantity || 0), 0),
      })
    }
    return days
  }, [movements])

  const maxMoveVal = Math.max(1, ...moveTrend.map(d => Math.max(d.in, d.out)))

  // Product name helper
  const pName = (id) => products.find(p => p.id === id)?.name || '?'
  const lName = (id) => locations.find(l => l.id === id)?.name || '?'

  return (
    <div style={{ padding: '0 16px 24px' }}>

      {/* ─── Role Welcome Card ─── */}
      {roleConf && (
        <div className="card" style={{
          marginBottom: 16, padding: '18px 16px',
          background: `linear-gradient(135deg, ${roleConf.color}08, ${roleConf.color}18)`,
          border: `1.5px solid ${roleConf.color}25`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: `linear-gradient(135deg, ${roleConf.color}, ${roleConf.color}CC)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 24, color: 'white',
              boxShadow: `0 4px 16px ${roleConf.color}30`,
            }}>{roleConf.icon}</div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 900, color: '#F0ECE2' }}>
                {roleConf.label}
              </div>
              <div style={{ fontSize: 12, color: '#8A7D75', fontWeight: 600 }}>
                {isAdmin ? 'Vue complète — tous les stocks' : `${totalProducts} produit${totalProducts > 1 ? 's' : ''} sous ta responsabilité`}
              </div>
            </div>
          </div>

          {/* Role KPI row */}
          <div style={{ display: 'flex', gap: 8 }}>
            <MiniKpi label="Stock" value={totalStock} color={roleConf.color} />
            <MiniKpi label="Alertes" value={totalAlerts} color={totalAlerts > 0 ? '#C8A46A' : '#2FB65D'} />
            <MiniKpi label="Ruptures" value={criticalAlerts.length} color={criticalAlerts.length > 0 ? '#8B1A2B' : '#2FB65D'} />
            {packingTotal > 0 && (
              <MiniKpi label="Packing" value={`${packingPct}%`} color={packingPct === 100 ? '#2FB65D' : '#5B8DB8'} />
            )}
          </div>
        </div>
      )}

      {/* ─── My Packing Progress (if next event has items for my role) ─── */}
      {packingTotal > 0 && nextEvent && (
        <div className="card" style={{ marginBottom: 16, padding: '14px 16px', borderLeft: `4px solid ${roleConf?.color || '#5B8DB8'}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#F0ECE2' }}>
                Mon packing — {nextEvent.name || nextEvent.lieu}
              </div>
              <div style={{ fontSize: 11, color: '#8A7D75' }}>
                {packingDone}/{packingTotal} items prêts
              </div>
            </div>
            <div style={{
              fontSize: 20, fontWeight: 900,
              color: packingPct === 100 ? '#2FB65D' : packingPct >= 50 ? '#C8A46A' : '#8B1A2B',
            }}>{packingPct}%</div>
          </div>
          <div style={{
            height: 6, borderRadius: 3, background: '#1a1a1a',
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${packingPct}%`, height: '100%', borderRadius: 3,
              background: packingPct === 100 ? '#2FB65D' : roleConf?.color || '#5B8DB8',
              transition: 'width 0.3s',
            }} />
          </div>
          {/* Show first unpacked items */}
          {nextEventPacking.filter(ep => !ep.packed).slice(0, 3).map((ep, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 8, marginTop: 8,
              fontSize: 12, color: '#8A7D75',
            }}>
              <span style={{ color: '#8B1A2B' }}>○</span>
              <span>{pName(ep.product_id)}</span>
              <span style={{ marginLeft: 'auto', fontWeight: 700 }}>×{ep.quantity_needed}</span>
            </div>
          ))}
          {nextEventPacking.filter(ep => !ep.packed).length > 3 && (
            <div style={{ fontSize: 11, color: '#6B6058', marginTop: 6, textAlign: 'center' }}>
              +{nextEventPacking.filter(ep => !ep.packed).length - 3} autres items...
            </div>
          )}
        </div>
      )}

      {/* ─── Next Event ─── */}
      {nextEvent && (
        <div className="card" style={{ marginBottom: 16, borderLeft: '4px solid #C8A46A', cursor: 'pointer' }}
          onClick={() => setSelectedEvent(nextEvent)}>
          <div className="section-title">Prochain concert</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800 }}>{nextEvent.name || nextEvent.lieu}</div>
              <div style={{ fontSize: 12, color: '#8A7D75', marginTop: 2 }}>
                {nextEvent.ville} — {nextEvent.format} — {nextEvent.capacite} pers.
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#C8A46A' }}>
                {parseDate(nextEvent.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
              </div>
              <div style={{ fontSize: 10, color: '#6B6058', marginTop: 2 }}>Voir fiche →</div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Quick Actions ─── */}
      <div className="section-title">Actions rapides</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
        <QuickBtn icon="📥" label="Entrée" color="#2FB65D" bg="rgba(47,182,93,0.08)" onClick={() => onQuickAction('in')} />
        <QuickBtn icon="📤" label="Sortie" color="#8B1A2B" bg="rgba(200,164,106,0.08)" onClick={() => onQuickAction('out')} />
        <QuickBtn icon="🔄" label="Transfert" color="#5B8DB8" bg="rgba(91,141,184,0.08)" onClick={() => onQuickAction('transfer')} />
      </div>

      {/* ─── EK LIVE link ─── */}
      <a href="/live" target="_blank" rel="noopener noreferrer" style={{
        display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none',
        padding: '14px 16px', borderRadius: 16, marginBottom: 20, cursor: 'pointer',
        background: 'linear-gradient(135deg, #1a1520, #2a1f30)',
        border: '1.5px solid rgba(200,164,106,0.3)',
        boxShadow: '0 4px 16px rgba(26,21,32,0.15)',
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: 'linear-gradient(135deg, #C8A46A, #8B1A2B)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, flexShrink: 0,
        }}>🎪</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 900, color: '#C8A46A', letterSpacing: 0.5 }}>EK LIVE</div>
          <div style={{ fontSize: 11, color: 'rgba(240,236,226,0.5)' }}>Ouvrir l'app fan — vote setlist & réactions</div>
        </div>
        <div style={{ color: 'rgba(240,236,226,0.3)', fontSize: 14 }}>→</div>
      </a>

      {/* ─── Alerts (priority display) ─── */}
      {alerts.length > 0 && (
        <>
          <div className="section-title">
            {isAdmin ? 'Alertes stock' : 'Mes alertes'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {myLowStock.map((a, i) => (
              <div key={i} className="card" style={{
                padding: '10px 14px',
                borderLeft: `4px solid ${a.level === 'rupture' ? '#8B1A2B' : '#C8A46A'}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{a.name}</div>
                    <div style={{ fontSize: 11, color: '#8A7D75' }}>
                      Stock: {a.currentStock} / Seuil: {a.minStock}
                    </div>
                  </div>
                  <Badge color={a.level === 'rupture' ? '#8B1A2B' : '#C8A46A'}>
                    {a.level === 'rupture' ? '🚨 Rupture' : '⚠️ Alerte'}
                  </Badge>
                </div>
              </div>
            ))}
            {alerts.length > 5 && (
              <button onClick={() => onNavigate('stocks')} style={{
                fontSize: 13, fontWeight: 700, color: '#C8A46A', padding: 8, textAlign: 'center',
              }}>
                Voir les {alerts.length} alertes →
              </button>
            )}
          </div>
        </>
      )}

      {/* ─── Stock by Category ─── */}
      <div className="section-title">Stock par catégorie</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        {stockByCategory.filter(c => c.count > 0).map(cat => (
          <div key={cat.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12, background: cat.bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
            }}>{cat.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{cat.name}</div>
              <div style={{ fontSize: 11, color: '#8A7D75' }}>{cat.count} produit{cat.count > 1 ? 's' : ''}</div>
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, color: cat.color }}>{cat.qty}</div>
          </div>
        ))}
      </div>

      {/* ─── Movement Trends (7 days) ─── */}
      {movements.length > 0 && (
        <>
          <div className="section-title">Mouvements — 7 derniers jours</div>
          <div className="card" style={{ padding: '14px 16px', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 100 }}>
              {moveTrend.map((d, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 80, width: '100%' }}>
                    <div style={{
                      flex: 1, borderRadius: '4px 4px 0 0',
                      background: '#2FB65D',
                      height: `${Math.max(2, (d.in / maxMoveVal) * 80)}px`,
                      transition: 'height 0.3s',
                    }} title={`Entrées: ${d.in}`} />
                    <div style={{
                      flex: 1, borderRadius: '4px 4px 0 0',
                      background: '#8B1A2B',
                      height: `${Math.max(2, (d.out / maxMoveVal) * 80)}px`,
                      transition: 'height 0.3s',
                    }} title={`Sorties: ${d.out}`} />
                  </div>
                  <div style={{ fontSize: 8, color: '#6B6058', fontWeight: 700 }}>{d.label}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 10 }}>
              <span style={{ fontSize: 10, color: '#2FB65D', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: '#2FB65D', display: 'inline-block' }} /> Entrées
              </span>
              <span style={{ fontSize: 10, color: '#8B1A2B', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: '#8B1A2B', display: 'inline-block' }} /> Sorties
              </span>
            </div>
          </div>
        </>
      )}

      {/* ─── Stock Distribution Chart ─── */}
      {totalStock > 0 && (
        <>
          <div className="section-title">Répartition du stock</div>
          <div className="card" style={{ padding: '14px 16px', marginBottom: 20 }}>
            {/* Horizontal stacked bar */}
            <div style={{ display: 'flex', height: 24, borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}>
              {stockByCategory.filter(c => c.qty > 0).map(cat => (
                <div key={cat.id} style={{
                  width: `${(cat.qty / totalStock) * 100}%`,
                  background: cat.color,
                  transition: 'width 0.3s',
                  minWidth: 2,
                }} title={`${cat.name}: ${cat.qty}`} />
              ))}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {stockByCategory.filter(c => c.qty > 0).map(cat => (
                <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: cat.color, display: 'inline-block' }} />
                  <span style={{ fontSize: 11, color: '#F0ECE2', fontWeight: 600 }}>
                    {cat.name} <span style={{ color: '#8A7D75' }}>({cat.qty})</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ─── Stock by Location ─── */}
      <div className="section-title">Stock par lieu</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        {stockByLocation.filter(l => l.qty > 0).map(loc => (
          <div key={loc.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12,
              background: (loc.color || '#C8A46A') + '15',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
            }}>{loc.icon || '📍'}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{loc.name}</div>
              <div style={{ fontSize: 11, color: '#8A7D75' }}>{loc.nbProducts} réf. en stock</div>
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#F0ECE2' }}>{loc.qty}</div>
          </div>
        ))}
      </div>

      {/* ─── Recent Movements ─── */}
      <div className="section-title">Derniers mouvements</div>
      {recentMoves.length === 0 ? (
        <div className="empty-state" style={{ padding: 24 }}>
          <div className="empty-icon">📋</div>
          <div className="empty-text">Aucun mouvement enregistré</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
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
                  <div style={{ fontSize: 11, color: '#8A7D75' }}>
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
                  <div style={{ fontSize: 10, color: '#6B6058' }}>{fmtDate(m.created_at)}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ─── Upcoming events ─── */}
      {upcomingEvents.length > 1 && (
        <>
          <div className="section-title">Événements à venir</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {upcomingEvents.slice(1, 6).map(ev => {
              const d = Math.ceil((new Date(ev.date) - new Date()) / 86400000)
              return (
                <div key={ev.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', cursor: 'pointer' }}
                  onClick={() => setSelectedEvent(ev)}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 12, background: '#C8A46A15',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 900, color: '#C8A46A', lineHeight: 1.1, textAlign: 'center',
                  }}>
                    {parseDate(ev.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ev.name || ev.lieu}
                    </div>
                    <div style={{ fontSize: 11, color: '#8A7D75' }}>{ev.ville} · {ev.format}</div>
                  </div>
                  <Badge color={d <= 7 ? '#C8A46A' : '#5B8DB8'}>J-{d}</Badge>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* ─── Tournée shortcut ─── */}
      {events.length > 0 && (
        <button onClick={() => onNavigate('tournee')} style={{
          width: '100%', marginTop: 16, padding: '14px', borderRadius: 14,
          background: 'linear-gradient(135deg, #C8A46A08, #9B7DC418)',
          border: '1.5px solid #C8A46A25', cursor: 'pointer', textAlign: 'center',
        }}>
          <span style={{ fontSize: 14 }}>🎪</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: '#C8A46A', marginLeft: 8 }}>
            Voir toute la tournée ({events.length} dates)
          </span>
        </button>
      )}

      {/* ─── Event Detail Full Screen ─── */}
      {selectedEvent && (
        <EventDetail
          event={selectedEvent}
          events={events}
          products={products}
          stock={stock}
          locations={locations}
          families={families}
          subfamilies={subfamilies}
          checklists={checklists}
          roles={roles}
          eventPacking={eventPacking}
          userProfiles={userProfiles || []}
          userRole={userRole}
          onClose={() => setSelectedEvent(null)}
          onReload={onReload}
          onToast={onToast}
          onNavigateEvent={(ev) => setSelectedEvent(ev)}
        />
      )}
    </div>
  )
}

// ─── Sub-components ───
function MiniKpi({ label, value, color }) {
  return (
    <div style={{
      flex: 1, textAlign: 'center', padding: '8px 4px',
      background: 'white', borderRadius: 10,
      border: '1px solid #1a1a1a',
    }}>
      <div style={{ fontSize: 18, fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 9, color: '#8A7D75', fontWeight: 700, marginTop: 2 }}>{label}</div>
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
