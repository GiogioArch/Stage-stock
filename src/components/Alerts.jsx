import React, { useState, useMemo } from 'react'
import { AlertOctagon, AlertTriangle, CheckCircle, Calendar, Circle, Filter } from 'lucide-react'
import { Badge } from './UI'
import { getModuleTheme, BASE, SEMANTIC, SPACE, TYPO, RADIUS, SHADOW } from '../lib/theme'
import { GradientHeader, FilterPills, ModuleCard } from '../design'

function StatusIcon({ type, size = 20 }) {
  if (type === 'rupture') return <AlertOctagon size={size} color={SEMANTIC.danger} />
  if (type === 'alerte') return <AlertTriangle size={size} color={SEMANTIC.warning} />
  if (type === 'event_urgent') return <Circle size={size} color={SEMANTIC.danger} fill={SEMANTIC.danger} />
  if (type === 'event_soon') return <Circle size={size} color={SEMANTIC.warning} fill={SEMANTIC.warning} />
  if (type === 'event_upcoming') return <Circle size={size} color={SEMANTIC.info} fill={SEMANTIC.info} />
  return <Circle size={size} color={BASE.textMuted} />
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
        list.push({ type: 'event_urgent', label: `Concert dans ${d}j`, detail: `${ev.name || ev.lieu} — ${ev.ville}`, color: SEMANTIC.danger, date: ev.date, event: ev })
      } else if (d <= 7) {
        list.push({ type: 'event_soon', label: `Concert dans ${d}j`, detail: `${ev.name || ev.lieu} — ${ev.ville}`, color: SEMANTIC.warning, date: ev.date, event: ev })
      } else if (d <= 14) {
        list.push({ type: 'event_upcoming', label: `Concert dans ${d}j`, detail: `${ev.name || ev.lieu} — ${ev.ville}`, color: SEMANTIC.info, date: ev.date, event: ev })
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
        color: a.level === 'rupture' ? SEMANTIC.danger : SEMANTIC.warning,
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

  const filterOptions = [
    { id: 'all', label: `Tout (${allNotifs.length})`, icon: Filter },
    { id: 'rupture', label: `Ruptures (${ruptures})`, icon: AlertOctagon },
    { id: 'alerte', label: `Alertes (${alertes})`, icon: AlertTriangle },
    { id: 'event', label: `Concerts (${evtCount})`, icon: Calendar },
  ]

  return (
    <div style={{ paddingBottom: SPACE.xxl }}>
      {/* ═══ HEADER GRADIENT ═══ */}
      <GradientHeader
        module="alertes"
        title="Centre de notifications"
        stats={[
          { value: ruptures, label: 'Ruptures' },
          { value: alertes, label: 'Alertes' },
          { value: evtCount, label: 'Concerts' },
        ]}
      />

      <div style={{ padding: `0 ${SPACE.lg}px` }}>
        {/* ─── Filter pills ─── */}
        <FilterPills
          options={filterOptions}
          active={filter}
          onChange={setFilter}
        />

        {/* ─── Notification list ─── */}
        {allNotifs.length === 0 ? (
          <div className="empty-state" style={{ padding: 40 }}>
            <div className="empty-icon"><CheckCircle size={32} color={SEMANTIC.success} /></div>
            <div className="empty-text" style={{ color: BASE.text }}>Aucune notification</div>
            <div style={{ ...TYPO.micro, color: BASE.textMuted, marginTop: SPACE.xs }}>Tout est en ordre !</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.sm }}>
            {allNotifs.map((n, i) => (
              <ModuleCard key={i} borderLeft={n.color} padding={SPACE.md}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: SPACE.md }}>
                  <div style={{ marginTop: 2 }}>
                    <StatusIcon type={n.type} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ ...TYPO.caption, color: BASE.text }}>{n.label}</div>
                    <div style={{ ...TYPO.micro, color: BASE.textSoft, marginTop: 2 }}>{n.detail}</div>
                    {n.currentStock !== undefined && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: SPACE.sm, marginTop: SPACE.sm }}>
                        <div style={{
                          flex: 1, height: 4, borderRadius: RADIUS.sm / 2, background: BASE.bgActive,
                          overflow: 'hidden',
                        }}>
                          <div style={{
                            width: `${Math.min(100, (n.currentStock / n.minStock) * 100)}%`,
                            height: '100%', borderRadius: RADIUS.sm / 2,
                            background: n.level === 'rupture' ? SEMANTIC.danger : SEMANTIC.warning,
                          }} />
                        </div>
                        <span style={{ ...TYPO.label, color: n.color }}>
                          {n.currentStock}/{n.minStock}
                        </span>
                      </div>
                    )}
                  </div>
                  <Badge color={n.color}>
                    {n.type === 'rupture' ? 'RUPTURE' : n.type === 'alerte' ? 'BAS' : n.type.includes('event') ? 'CONCERT' : ''}
                  </Badge>
                </div>
              </ModuleCard>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
