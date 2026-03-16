import React, { useState, useMemo } from 'react'
import { getCat, CATEGORIES, fmtDate, getMoveConf, Badge, parseDate } from './UI'
import { ROLE_CONF } from './RolePicker'
import EventDetail from './EventDetail'
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  RefreshCw,
  AlertTriangle,
  MapPin,
  ClipboardList,
  Tent,
  Package,
  ChevronRight,
  CircleDot,
  ExternalLink,
  Calendar,
  AlertOctagon,
} from 'lucide-react'

// ─── Design tokens ───
const COLOR = {
  textPrimary: '#1E293B',
  textSecondary: '#64748B',
  textTertiary: '#94A3B8',
  accent: '#6366F1',
  accentSubtle: 'rgba(99,102,241,0.12)',
  bgSurface: '#F8FAFC',
  bgHover: '#F1F5F9',
  border: '#E2E8F0',
  success: '#16A34A',
  danger: '#DC2626',
  warning: '#D97706',
  info: '#2563EB',
}

export default function Board({ products, locations, stock, movements, alerts, events, families, subfamilies, checklists, roles, eventPacking, userProfiles, userRole, onQuickAction, onNavigate, onReload, onToast }) {
  const [selectedEvent, setSelectedEvent] = useState(null)

  // ─── Role config ───
  const roleConf = userRole ? (ROLE_CONF[userRole.code] || { icon: ClipboardList, color: COLOR.accent, label: userRole.name }) : null
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
          background: COLOR.bgSurface,
          border: `1px solid ${COLOR.border}`,
          borderRadius: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: COLOR.accentSubtle,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: COLOR.accent,
            }}>
              {roleConf.icon && React.createElement(roleConf.icon, { size: 24 })}
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: COLOR.textPrimary }}>
                {roleConf.label}
              </div>
              <div style={{ fontSize: 12, color: COLOR.textSecondary, fontWeight: 600 }}>
                {isAdmin ? 'Vue complete — tous les stocks' : `${totalProducts} produit${totalProducts > 1 ? 's' : ''} sous ta responsabilite`}
              </div>
            </div>
          </div>

          {/* Role KPI row */}
          <div style={{ display: 'flex', gap: 8 }}>
            <MiniKpi label="Stock" value={totalStock} color={COLOR.accent} />
            <MiniKpi label="Alertes" value={totalAlerts} color={totalAlerts > 0 ? COLOR.warning : COLOR.success} />
            <MiniKpi label="Ruptures" value={criticalAlerts.length} color={criticalAlerts.length > 0 ? COLOR.danger : COLOR.success} />
            {packingTotal > 0 && (
              <MiniKpi label="Packing" value={`${packingPct}%`} color={packingPct === 100 ? COLOR.success : COLOR.info} />
            )}
          </div>
        </div>
      )}

      {/* ─── My Packing Progress (if next event has items for my role) ─── */}
      {packingTotal > 0 && nextEvent && (
        <div className="card" style={{
          marginBottom: 16, padding: '14px 16px',
          borderLeft: `3px solid ${COLOR.accent}`,
          background: COLOR.bgSurface,
          borderRadius: 12,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: COLOR.textPrimary }}>
                Mon packing — {nextEvent.name || nextEvent.lieu}
              </div>
              <div style={{ fontSize: 11, color: COLOR.textSecondary }}>
                {packingDone}/{packingTotal} items prets
              </div>
            </div>
            <div style={{
              fontSize: 20, fontWeight: 600,
              color: packingPct === 100 ? COLOR.success : packingPct >= 50 ? COLOR.warning : COLOR.danger,
            }}>{packingPct}%</div>
          </div>
          <div style={{
            height: 6, borderRadius: 3, background: COLOR.bgHover,
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${packingPct}%`, height: '100%', borderRadius: 3,
              background: packingPct === 100 ? COLOR.success : COLOR.accent,
              transition: 'width 0.3s',
            }} />
          </div>
          {/* Show first unpacked items */}
          {nextEventPacking.filter(ep => !ep.packed).slice(0, 3).map((ep, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 8, marginTop: 8,
              fontSize: 12, color: COLOR.textSecondary,
            }}>
              <CircleDot size={12} style={{ color: COLOR.danger, flexShrink: 0 }} />
              <span>{pName(ep.product_id)}</span>
              <span style={{ marginLeft: 'auto', fontWeight: 700 }}>{ep.quantity_needed}</span>
            </div>
          ))}
          {nextEventPacking.filter(ep => !ep.packed).length > 3 && (
            <div style={{ fontSize: 11, color: COLOR.textTertiary, marginTop: 6, textAlign: 'center' }}>
              +{nextEventPacking.filter(ep => !ep.packed).length - 3} autres items...
            </div>
          )}
        </div>
      )}

      {/* ─── Next Event ─── */}
      {nextEvent && (
        <div className="card" style={{
          marginBottom: 16, borderLeft: `3px solid ${COLOR.warning}`,
          cursor: 'pointer', background: COLOR.bgSurface, borderRadius: 12,
        }}
          onClick={() => setSelectedEvent(nextEvent)}>
          <div className="section-title">Prochain concert</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: COLOR.textPrimary }}>{nextEvent.name || nextEvent.lieu}</div>
              <div style={{ fontSize: 12, color: COLOR.textSecondary, marginTop: 2 }}>
                {nextEvent.ville} — {nextEvent.format} — {nextEvent.capacite} pers.
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: COLOR.warning }}>
                {parseDate(nextEvent.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
              </div>
              <div style={{ fontSize: 10, color: COLOR.textTertiary, marginTop: 2, display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'flex-end' }}>
                Voir fiche <ChevronRight size={10} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Quick Actions ─── */}
      <div className="section-title">Actions rapides</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
        <QuickBtn icon={ArrowDownToLine} label="Entree" color={COLOR.success} onClick={() => onQuickAction('in')} />
        <QuickBtn icon={ArrowUpFromLine} label="Sortie" color={COLOR.danger} onClick={() => onQuickAction('out')} />
        <QuickBtn icon={RefreshCw} label="Transfert" color={COLOR.info} onClick={() => onQuickAction('transfer')} />
      </div>

      {/* ─── EK LIVE link ─── */}
      <a href="/live" target="_blank" rel="noopener noreferrer" style={{
        display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none',
        padding: '14px 16px', borderRadius: 12, marginBottom: 20, cursor: 'pointer',
        background: COLOR.bgSurface,
        border: `1px solid ${COLOR.border}`,
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 8,
          background: COLOR.accentSubtle,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, color: COLOR.accent,
        }}>
          <Tent size={20} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: COLOR.textPrimary, letterSpacing: 0.5 }}>EK LIVE</div>
          <div style={{ fontSize: 11, color: COLOR.textTertiary }}>Ouvrir l'app fan — vote setlist & reactions</div>
        </div>
        <ExternalLink size={14} style={{ color: COLOR.textTertiary }} />
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
                borderLeft: `3px solid ${a.level === 'rupture' ? COLOR.danger : COLOR.warning}`,
                background: COLOR.bgSurface,
                borderRadius: 12,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: COLOR.textPrimary }}>{a.name}</div>
                    <div style={{ fontSize: 11, color: COLOR.textSecondary }}>
                      Stock: {a.currentStock} / Seuil: {a.minStock}
                    </div>
                  </div>
                  <Badge color={a.level === 'rupture' ? COLOR.danger : COLOR.warning}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {a.level === 'rupture'
                        ? <><AlertOctagon size={12} /> Rupture</>
                        : <><AlertTriangle size={12} /> Alerte</>
                      }
                    </span>
                  </Badge>
                </div>
              </div>
            ))}
            {alerts.length > 5 && (
              <button onClick={() => onNavigate('stocks')} style={{
                fontSize: 13, fontWeight: 700, color: COLOR.accent, padding: 8, textAlign: 'center',
                background: 'none', border: 'none', cursor: 'pointer',
              }}>
                Voir les {alerts.length} alertes
                <ChevronRight size={14} style={{ verticalAlign: 'middle', marginLeft: 2 }} />
              </button>
            )}
          </div>
        </>
      )}

      {/* ─── Stock by Category ─── */}
      <div className="section-title">Stock par categorie</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        {stockByCategory.filter(c => c.count > 0).map(cat => (
          <div key={cat.id} className="card" style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
            background: COLOR.bgSurface, borderRadius: 12, border: `1px solid ${COLOR.border}`,
          }}>
            <div style={{
              width: 42, height: 42, borderRadius: 8, background: cat.bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: cat.color,
            }}>
              {cat.icon && React.createElement(cat.icon, { size: 20 })}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: COLOR.textPrimary }}>{cat.name}</div>
              <div style={{ fontSize: 11, color: COLOR.textSecondary }}>{cat.count} produit{cat.count > 1 ? 's' : ''}</div>
            </div>
            <div style={{ fontSize: 20, fontWeight: 600, color: cat.color }}>{cat.qty}</div>
          </div>
        ))}
      </div>

      {/* ─── Movement Trends (7 days) ─── */}
      {movements.length > 0 && (
        <>
          <div className="section-title">Mouvements — 7 derniers jours</div>
          <div className="card" style={{ padding: '14px 16px', marginBottom: 20, background: COLOR.bgSurface, borderRadius: 12, border: `1px solid ${COLOR.border}` }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 100 }}>
              {moveTrend.map((d, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 80, width: '100%' }}>
                    <div style={{
                      flex: 1, borderRadius: '4px 4px 0 0',
                      background: COLOR.success,
                      height: `${Math.max(2, (d.in / maxMoveVal) * 80)}px`,
                      transition: 'height 0.3s',
                    }} title={`Entrees: ${d.in}`} />
                    <div style={{
                      flex: 1, borderRadius: '4px 4px 0 0',
                      background: COLOR.danger,
                      height: `${Math.max(2, (d.out / maxMoveVal) * 80)}px`,
                      transition: 'height 0.3s',
                    }} title={`Sorties: ${d.out}`} />
                  </div>
                  <div style={{ fontSize: 8, color: COLOR.textTertiary, fontWeight: 700 }}>{d.label}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 10 }}>
              <span style={{ fontSize: 10, color: COLOR.success, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: COLOR.success, display: 'inline-block' }} /> Entrees
              </span>
              <span style={{ fontSize: 10, color: COLOR.danger, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: COLOR.danger, display: 'inline-block' }} /> Sorties
              </span>
            </div>
          </div>
        </>
      )}

      {/* ─── Stock Distribution Chart ─── */}
      {totalStock > 0 && (
        <>
          <div className="section-title">Repartition du stock</div>
          <div className="card" style={{ padding: '14px 16px', marginBottom: 20, background: COLOR.bgSurface, borderRadius: 12, border: `1px solid ${COLOR.border}` }}>
            {/* Horizontal stacked bar */}
            <div style={{ display: 'flex', height: 24, borderRadius: 8, overflow: 'hidden', marginBottom: 12 }}>
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
                  <span style={{ fontSize: 11, color: COLOR.textPrimary, fontWeight: 600 }}>
                    {cat.name} <span style={{ color: COLOR.textSecondary }}>({cat.qty})</span>
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
          <div key={loc.id} className="card" style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
            background: COLOR.bgSurface, borderRadius: 12, border: `1px solid ${COLOR.border}`,
          }}>
            <div style={{
              width: 42, height: 42, borderRadius: 8,
              background: COLOR.accentSubtle,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: COLOR.accent,
            }}>
              <MapPin size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: COLOR.textPrimary }}>{loc.name}</div>
              <div style={{ fontSize: 11, color: COLOR.textSecondary }}>{loc.nbProducts} ref. en stock</div>
            </div>
            <div style={{ fontSize: 20, fontWeight: 600, color: COLOR.textPrimary }}>{loc.qty}</div>
          </div>
        ))}
      </div>

      {/* ─── Recent Movements ─── */}
      <div className="section-title">Derniers mouvements</div>
      {recentMoves.length === 0 ? (
        <div className="empty-state" style={{ padding: 24 }}>
          <ClipboardList size={32} style={{ color: COLOR.textTertiary, marginBottom: 8 }} />
          <div className="empty-text">Aucun mouvement enregistre</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {recentMoves.map(m => {
            const conf = getMoveConf(m.type)
            return (
              <div key={m.id} className="card" style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                background: COLOR.bgSurface, borderRadius: 12, border: `1px solid ${COLOR.border}`,
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8, background: conf.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: conf.color,
                }}>
                  {conf.icon && React.createElement(conf.icon, { size: 16 })}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: COLOR.textPrimary }}>
                    {pName(m.product_id)}
                  </div>
                  <div style={{ fontSize: 11, color: COLOR.textSecondary }}>
                    {m.type === 'transfer'
                      ? `${lName(m.from_loc)} → ${lName(m.to_loc)}`
                      : lName(m.type === 'in' ? m.to_loc : m.from_loc)
                    }
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: conf.color }}>
                    {m.type === 'out' ? '-' : '+'}{m.quantity}
                  </div>
                  <div style={{ fontSize: 10, color: COLOR.textTertiary }}>{fmtDate(m.created_at)}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ─── Upcoming events ─── */}
      {upcomingEvents.length > 1 && (
        <>
          <div className="section-title">Evenements a venir</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {upcomingEvents.slice(1, 6).map(ev => {
              const d = Math.ceil((new Date(ev.date) - new Date()) / 86400000)
              return (
                <div key={ev.id} className="card" style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', cursor: 'pointer',
                  background: COLOR.bgSurface, borderRadius: 12, border: `1px solid ${COLOR.border}`,
                }}
                  onClick={() => setSelectedEvent(ev)}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 8, background: COLOR.accentSubtle,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 600, color: COLOR.accent, lineHeight: 1.1, textAlign: 'center',
                  }}>
                    {parseDate(ev.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: COLOR.textPrimary }}>
                      {ev.name || ev.lieu}
                    </div>
                    <div style={{ fontSize: 11, color: COLOR.textSecondary }}>{ev.ville} · {ev.format}</div>
                  </div>
                  <Badge color={d <= 7 ? COLOR.warning : COLOR.info}>J-{d}</Badge>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* ─── Tournee shortcut ─── */}
      {events.length > 0 && (
        <button onClick={() => onNavigate('tournee')} style={{
          width: '100%', marginTop: 16, padding: '14px', borderRadius: 12,
          background: COLOR.bgSurface,
          border: `1px solid ${COLOR.border}`, cursor: 'pointer', textAlign: 'center',
        }}>
          <Tent size={16} style={{ verticalAlign: 'middle', color: COLOR.accent }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: COLOR.accent, marginLeft: 8 }}>
            Voir toute la tournee ({events.length} dates)
          </span>
        </button>
      )}

      {/* ─── Event Detail Bottom Sheet ─── */}
      {selectedEvent && (
        <div
          onClick={() => setSelectedEvent(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(15,23,42,0.35)',
            backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            animation: 'fadeIn 0.15s ease',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 480, maxHeight: '85vh',
              background: 'white', borderRadius: '20px 20px 0 0',
              boxShadow: '0 -8px 40px rgba(0,0,0,0.15)',
              overflowY: 'auto', WebkitOverflowScrolling: 'touch',
              animation: 'slideUp 0.25s ease',
              padding: '0 0 env(safe-area-inset-bottom, 16px)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px', position: 'sticky', top: 0, background: 'white', zIndex: 1, borderRadius: '20px 20px 0 0' }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: '#E2E8F0' }} />
            </div>
            <EventDetail
              embedded
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
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Sub-components ───
function MiniKpi({ label, value, color }) {
  return (
    <div style={{
      flex: 1, textAlign: 'center', padding: '8px 4px',
      background: COLOR.bgHover, borderRadius: 8,
      border: `1px solid ${COLOR.border}`,
    }}>
      <div style={{ fontSize: 18, fontWeight: 600, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 9, color: COLOR.textSecondary, fontWeight: 700, marginTop: 2 }}>{label}</div>
    </div>
  )
}

function QuickBtn({ icon, label, color, onClick }) {
  return (
    <button onClick={onClick} style={{
      background: COLOR.bgSurface, border: `1px solid ${COLOR.border}`, borderRadius: 12,
      padding: '16px 8px', textAlign: 'center', color, fontWeight: 600, fontSize: 13,
      cursor: 'pointer', transition: 'transform 0.1s',
    }}>
      <div style={{ marginBottom: 4, display: 'flex', justifyContent: 'center' }}>
        {React.createElement(icon, { size: 28 })}
      </div>
      {label}
    </button>
  )
}
