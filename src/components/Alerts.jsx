import React, { useState, useMemo } from 'react'
import { AlertOctagon, AlertTriangle, CheckCircle, Calendar, Circle, Filter } from 'lucide-react'
import { Badge } from './UI'

const COLORS = {
  danger: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
  success: '#22C55E',
  accent: '#6366F1',
  textPrimary: '#FAFAFA',
  textSecondary: '#A1A1AA',
  textTertiary: '#71717A',
  bgSurface: '#111113',
  border: 'rgba(255,255,255,0.06)',
}

function StatusIcon({ type, size = 20 }) {
  if (type === 'rupture') return <AlertOctagon size={size} color={COLORS.danger} />
  if (type === 'alerte') return <AlertTriangle size={size} color={COLORS.warning} />
  if (type === 'event_urgent') return <Circle size={size} color={COLORS.danger} fill={COLORS.danger} />
  if (type === 'event_soon') return <Circle size={size} color={COLORS.warning} fill={COLORS.warning} />
  if (type === 'event_upcoming') return <Circle size={size} color={COLORS.info} fill={COLORS.info} />
  return <Circle size={size} color={COLORS.textTertiary} />
}

function FilterIcon({ id }) {
  if (id === 'rupture') return <AlertOctagon size={12} style={{ marginRight: 4 }} />
  if (id === 'alerte') return <AlertTriangle size={12} style={{ marginRight: 4 }} />
  if (id === 'event') return <Calendar size={12} style={{ marginRight: 4 }} />
  return <Filter size={12} style={{ marginRight: 4 }} />
}

export default function Alerts({ alerts, events, products, stock, locations, userRole }) {
  const [filter, setFilter] = useState('all') // all, rupture, alerte, event

  const now = new Date()
  const today = now.toISOString().split('T')[0]

  // ─── Event alerts ───
  const eventAlerts = useMemo(() => {
    const list = []
    events.filter(e => e.date >= today).forEach(ev => {
      const d = Math.ceil((new Date(ev.date) - now) / 86400000)
      if (d <= 3) {
        list.push({ type: 'event_urgent', label: `Concert dans ${d}j`, detail: `${ev.name || ev.lieu} — ${ev.ville}`, color: COLORS.danger, date: ev.date, event: ev })
      } else if (d <= 7) {
        list.push({ type: 'event_soon', label: `Concert dans ${d}j`, detail: `${ev.name || ev.lieu} — ${ev.ville}`, color: COLORS.warning, date: ev.date, event: ev })
      } else if (d <= 14) {
        list.push({ type: 'event_upcoming', label: `Concert dans ${d}j`, detail: `${ev.name || ev.lieu} — ${ev.ville}`, color: COLORS.info, date: ev.date, event: ev })
      }
    })
    return list
  }, [events, today])

  // ─── Stock alerts with location details ───
  const stockAlerts = useMemo(() => {
    return alerts.map(a => {
      const stockLocs = stock
        .filter(s => s.product_id === a.id && s.quantity > 0)
        .map(s => ({ loc: locations.find(l => l.id === s.location_id)?.name || '?', qty: s.quantity }))
      return {
        ...a,
        type: a.level,
        label: a.name,
        detail: stockLocs.length > 0
          ? stockLocs.map(sl => `${sl.loc}: ${sl.qty}`).join(' · ')
          : 'Aucun stock disponible',
        color: a.level === 'rupture' ? COLORS.danger : COLORS.warning,
      }
    })
  }, [alerts, stock, locations])

  // ─── All notifications combined and sorted ───
  const allNotifs = useMemo(() => {
    const list = []
    if (filter === 'all' || filter === 'event') list.push(...eventAlerts)
    if (filter === 'all' || filter === 'rupture') list.push(...stockAlerts.filter(a => a.level === 'rupture'))
    if (filter === 'all' || filter === 'alerte') list.push(...stockAlerts.filter(a => a.level === 'alerte'))
    // Sort: ruptures first, then event urgents, then rest
    const priority = { rupture: 0, event_urgent: 1, alerte: 2, event_soon: 3, event_upcoming: 4 }
    return list.sort((a, b) => (priority[a.type] ?? 5) - (priority[b.type] ?? 5))
  }, [filter, eventAlerts, stockAlerts])

  const ruptures = stockAlerts.filter(a => a.level === 'rupture').length
  const alertes = stockAlerts.filter(a => a.level === 'alerte').length
  const evtCount = eventAlerts.length

  const filterItems = [
    { id: 'all', label: `Tout (${allNotifs.length})`, color: COLORS.textPrimary },
    { id: 'rupture', label: `Ruptures (${ruptures})`, color: COLORS.danger },
    { id: 'alerte', label: `Alertes (${alertes})`, color: COLORS.warning },
    { id: 'event', label: `Concerts (${evtCount})`, color: COLORS.info },
  ]

  return (
    <div style={{ padding: '0 16px 24px' }}>
      {/* ─── Summary card ─── */}
      <div className="card" style={{
        marginBottom: 16, padding: '16px',
        background: ruptures > 0
          ? `linear-gradient(135deg, ${COLORS.danger}08, ${COLORS.danger}18)`
          : `linear-gradient(135deg, ${COLORS.success}08, ${COLORS.success}18)`,
        border: `1px solid ${ruptures > 0 ? COLORS.danger + '25' : COLORS.success + '25'}`,
        borderRadius: 12,
      }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.textPrimary, marginBottom: 10 }}>
          Centre de notifications
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <SummaryPill value={ruptures} label="Ruptures" color={COLORS.danger} />
          <SummaryPill value={alertes} label="Alertes" color={COLORS.warning} />
          <SummaryPill value={evtCount} label="Événements" color={COLORS.info} />
        </div>
      </div>

      {/* ─── Filter pills ─── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto' }}>
        {filterItems.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} style={{
            padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
            whiteSpace: 'nowrap', cursor: 'pointer',
            display: 'flex', alignItems: 'center',
            background: filter === f.id ? `${f.color}15` : COLORS.bgSurface,
            color: filter === f.id ? f.color : COLORS.textTertiary,
            border: `1px solid ${filter === f.id ? f.color + '30' : COLORS.border}`,
          }}>
            <FilterIcon id={f.id} />
            {f.label}
          </button>
        ))}
      </div>

      {/* ─── Notification list ─── */}
      {allNotifs.length === 0 ? (
        <div className="empty-state" style={{ padding: 40 }}>
          <div className="empty-icon"><CheckCircle size={32} color={COLORS.success} /></div>
          <div className="empty-text" style={{ color: COLORS.textPrimary }}>Aucune notification</div>
          <div style={{ fontSize: 12, color: COLORS.textTertiary, marginTop: 4 }}>Tout est en ordre !</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {allNotifs.map((n, i) => (
            <div key={i} className="card" style={{
              padding: '12px 14px',
              borderLeft: `4px solid ${n.color}`,
              borderRadius: 12,
              background: COLORS.bgSurface,
              border: `1px solid ${COLORS.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ marginTop: 2 }}>
                  <StatusIcon type={n.type} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.textPrimary }}>{n.label}</div>
                  <div style={{ fontSize: 11, color: COLORS.textSecondary, marginTop: 2 }}>{n.detail}</div>
                  {n.currentStock !== undefined && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                      <div style={{
                        flex: 1, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)',
                        overflow: 'hidden',
                      }}>
                        <div style={{
                          width: `${Math.min(100, (n.currentStock / n.minStock) * 100)}%`,
                          height: '100%', borderRadius: 2,
                          background: n.level === 'rupture' ? COLORS.danger : COLORS.warning,
                        }} />
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 700, color: n.color }}>
                        {n.currentStock}/{n.minStock}
                      </span>
                    </div>
                  )}
                </div>
                <Badge color={n.color}>
                  {n.type === 'rupture' ? 'RUPTURE' : n.type === 'alerte' ? 'BAS' : n.type.includes('event') ? 'CONCERT' : ''}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SummaryPill({ value, label, color }) {
  return (
    <div style={{
      flex: 1, textAlign: 'center', padding: '8px 4px',
      background: COLORS.bgSurface, borderRadius: 8, border: `1px solid ${COLORS.border}`,
    }}>
      <div style={{ fontSize: 18, fontWeight: 600, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 9, color: COLORS.textSecondary, fontWeight: 600, marginTop: 2 }}>{label}</div>
    </div>
  )
}
