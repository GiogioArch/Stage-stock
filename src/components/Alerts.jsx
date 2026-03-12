import React, { useState, useMemo } from 'react'
import { Badge } from './UI'

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
        list.push({ type: 'event_urgent', icon: '🔴', label: `Concert dans ${d}j`, detail: `${ev.name || ev.lieu} — ${ev.ville}`, color: '#D4648A', date: ev.date, event: ev })
      } else if (d <= 7) {
        list.push({ type: 'event_soon', icon: '🟠', label: `Concert dans ${d}j`, detail: `${ev.name || ev.lieu} — ${ev.ville}`, color: '#E8935A', date: ev.date, event: ev })
      } else if (d <= 14) {
        list.push({ type: 'event_upcoming', icon: '🔵', label: `Concert dans ${d}j`, detail: `${ev.name || ev.lieu} — ${ev.ville}`, color: '#5B8DB8', date: ev.date, event: ev })
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
        icon: a.level === 'rupture' ? '🚨' : '⚠️',
        label: a.name,
        detail: stockLocs.length > 0
          ? stockLocs.map(sl => `${sl.loc}: ${sl.qty}`).join(' · ')
          : 'Aucun stock disponible',
        color: a.level === 'rupture' ? '#D4648A' : '#E8935A',
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

  return (
    <div style={{ padding: '0 16px 24px' }}>
      {/* ─── Summary card ─── */}
      <div className="card" style={{
        marginBottom: 16, padding: '16px',
        background: ruptures > 0
          ? 'linear-gradient(135deg, #D4648A08, #D4648A18)'
          : 'linear-gradient(135deg, #5DAB8B08, #5DAB8B18)',
        border: `1.5px solid ${ruptures > 0 ? '#D4648A25' : '#5DAB8B25'}`,
      }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: '#3D3042', marginBottom: 10 }}>
          Centre de notifications
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <SummaryPill value={ruptures} label="Ruptures" color="#D4648A" />
          <SummaryPill value={alertes} label="Alertes" color="#E8935A" />
          <SummaryPill value={evtCount} label="Événements" color="#5B8DB8" />
        </div>
      </div>

      {/* ─── Filter pills ─── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto' }}>
        {[
          { id: 'all', label: `Tout (${allNotifs.length})`, color: '#3D3042' },
          { id: 'rupture', label: `🚨 Ruptures (${ruptures})`, color: '#D4648A' },
          { id: 'alerte', label: `⚠️ Alertes (${alertes})`, color: '#E8935A' },
          { id: 'event', label: `📅 Concerts (${evtCount})`, color: '#5B8DB8' },
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} style={{
            padding: '7px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700,
            whiteSpace: 'nowrap', cursor: 'pointer',
            background: filter === f.id ? `${f.color}15` : 'white',
            color: filter === f.id ? f.color : '#9A8B94',
            border: `1.5px solid ${filter === f.id ? f.color + '30' : '#E8DED8'}`,
          }}>{f.label}</button>
        ))}
      </div>

      {/* ─── Notification list ─── */}
      {allNotifs.length === 0 ? (
        <div className="empty-state" style={{ padding: 40 }}>
          <div className="empty-icon">✅</div>
          <div className="empty-text">Aucune notification</div>
          <div style={{ fontSize: 12, color: '#B8A0AE', marginTop: 4 }}>Tout est en ordre !</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {allNotifs.map((n, i) => (
            <div key={i} className="card" style={{
              padding: '12px 14px',
              borderLeft: `4px solid ${n.color}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ fontSize: 20, lineHeight: 1, marginTop: 2 }}>{n.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#3D3042' }}>{n.label}</div>
                  <div style={{ fontSize: 11, color: '#9A8B94', marginTop: 2 }}>{n.detail}</div>
                  {n.currentStock !== undefined && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                      <div style={{
                        flex: 1, height: 4, borderRadius: 2, background: '#F0E8E4',
                        overflow: 'hidden',
                      }}>
                        <div style={{
                          width: `${Math.min(100, (n.currentStock / n.minStock) * 100)}%`,
                          height: '100%', borderRadius: 2,
                          background: n.level === 'rupture' ? '#D4648A' : '#E8935A',
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
      background: 'white', borderRadius: 10, border: '1px solid #F0E8E4',
    }}>
      <div style={{ fontSize: 18, fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 9, color: '#9A8B94', fontWeight: 600, marginTop: 2 }}>{label}</div>
    </div>
  )
}
