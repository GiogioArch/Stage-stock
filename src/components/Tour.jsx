import React, { useState, useMemo } from 'react'
import { Badge } from './UI'
import EventDetail from './EventDetail'

const FORMAT_CONF = {
  'concert live': { icon: '🎤', color: '#E8735A' },
  'concert':      { icon: '🎤', color: '#E8735A' },
  'live':         { icon: '🎤', color: '#E8735A' },
  'sound system':  { icon: '🔊', color: '#5B8DB8' },
  'soundsystem':   { icon: '🔊', color: '#5B8DB8' },
  'impro':         { icon: '🎭', color: '#9B7DC4' },
  'improvisation': { icon: '🎭', color: '#9B7DC4' },
}

function getFormatConf(format) {
  if (!format) return { icon: '🎵', color: '#E8735A' }
  return FORMAT_CONF[format.toLowerCase().trim()] || { icon: '🎵', color: '#E8735A' }
}

export default function Tour({ events, products, stock, locations, families, subfamilies, checklists, roles, eventPacking, userProfiles, userRole, onReload, onToast }) {
  const [filter, setFilter] = useState('upcoming') // upcoming | past | all
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [search, setSearch] = useState('')

  const today = new Date().toISOString().split('T')[0]

  // Filter & sort events
  const filteredEvents = useMemo(() => {
    let list = [...events]
    if (filter === 'upcoming') list = list.filter(e => e.date >= today)
    else if (filter === 'past') list = list.filter(e => e.date < today)

    if (search.trim()) {
      const q = search.toLowerCase().trim()
      list = list.filter(e =>
        (e.name || '').toLowerCase().includes(q) ||
        (e.lieu || '').toLowerCase().includes(q) ||
        (e.ville || '').toLowerCase().includes(q) ||
        (e.territoire || '').toLowerCase().includes(q)
      )
    }

    return filter === 'past'
      ? list.sort((a, b) => b.date.localeCompare(a.date))
      : list.sort((a, b) => a.date.localeCompare(b.date))
  }, [events, filter, search, today])

  // Stats
  const totalEvents = events.length
  const upcomingCount = events.filter(e => e.date >= today).length
  const pastCount = events.filter(e => e.date < today).length
  const nextEvent = events.filter(e => e.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0]

  // Group by month
  const groupedByMonth = useMemo(() => {
    const groups = {}
    filteredEvents.forEach(ev => {
      const d = new Date(ev.date)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
      if (!groups[key]) groups[key] = { label, events: [] }
      groups[key].events.push(ev)
    })
    return Object.entries(groups).sort(([a], [b]) =>
      filter === 'past' ? b.localeCompare(a) : a.localeCompare(b)
    )
  }, [filteredEvents, filter])

  // If event detail is open, show it full screen
  if (selectedEvent) {
    return (
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
        userProfiles={userProfiles}
        userRole={userRole}
        onClose={() => setSelectedEvent(null)}
        onReload={onReload}
        onToast={onToast}
        onNavigateEvent={(ev) => setSelectedEvent(ev)}
      />
    )
  }

  return (
    <div style={{ padding: '0 16px 24px' }}>

      {/* Header */}
      <div className="card" style={{
        marginBottom: 16, padding: '18px 16px',
        background: 'linear-gradient(135deg, #E8735A08, #9B7DC418)',
        border: '1.5px solid #E8735A25',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: 'linear-gradient(135deg, #E8735A, #9B7DC4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, color: 'white',
            boxShadow: '0 4px 16px #E8735A30',
          }}>🎪</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#3D3042' }}>EK TOUR 25 ANS</div>
            <div style={{ fontSize: 12, color: '#9A8B94', fontWeight: 600 }}>
              {totalEvents} date{totalEvents > 1 ? 's' : ''} programm{totalEvents > 1 ? 'ées' : 'ée'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <StatBox label="A venir" value={upcomingCount} color="#E8735A" />
          <StatBox label="Passées" value={pastCount} color="#9A8B94" />
          <StatBox label="Total" value={totalEvents} color="#5B8DB8" />
          {nextEvent && (
            <StatBox
              label="Prochain"
              value={`J-${Math.max(0, Math.ceil((new Date(nextEvent.date) - new Date()) / 86400000))}`}
              color="#5DAB8B"
            />
          )}
        </div>
      </div>

      {/* Prochain concert - accès rapide */}
      {nextEvent && (
        <button
          onClick={() => setSelectedEvent(nextEvent)}
          className="card"
          style={{
            width: '100%', marginBottom: 16, padding: '14px 16px',
            borderLeft: '4px solid #E8735A', cursor: 'pointer', textAlign: 'left',
            background: '#E8735A06',
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 800, color: '#E8735A', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6 }}>
            Prochain concert
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#3D3042' }}>{nextEvent.name || nextEvent.lieu}</div>
              <div style={{ fontSize: 12, color: '#9A8B94', marginTop: 2 }}>
                {nextEvent.lieu} — {nextEvent.ville} ({nextEvent.territoire})
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 14, fontWeight: 900, color: '#E8735A' }}>
                {new Date(nextEvent.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
              </div>
              <div style={{ fontSize: 10, color: '#9A8B94', marginTop: 2 }}>
                {nextEvent.format} · {nextEvent.capacite} pers.
              </div>
            </div>
          </div>
        </button>
      )}

      {/* Search */}
      <div className="search-bar" style={{ marginBottom: 12 }}>
        <span className="search-icon">🔍</span>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher un concert, lieu, ville..."
        />
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[
          { id: 'upcoming', label: `A venir (${upcomingCount})`, color: '#E8735A' },
          { id: 'past', label: `Passées (${pastCount})`, color: '#9A8B94' },
          { id: 'all', label: `Toutes (${totalEvents})`, color: '#5B8DB8' },
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} style={{
            flex: 1, padding: '8px 6px', borderRadius: 10, fontSize: 11, fontWeight: 700,
            cursor: 'pointer', textAlign: 'center',
            background: filter === f.id ? `${f.color}15` : 'white',
            color: filter === f.id ? f.color : '#9A8B94',
            border: `1.5px solid ${filter === f.id ? f.color + '40' : '#E8DED8'}`,
          }}>{f.label}</button>
        ))}
      </div>

      {/* Event list grouped by month */}
      {filteredEvents.length === 0 ? (
        <div className="empty-state" style={{ padding: 40 }}>
          <div className="empty-icon">📅</div>
          <div className="empty-text">
            {search ? 'Aucun résultat' : filter === 'past' ? 'Aucune date passée' : 'Aucune date à venir'}
          </div>
        </div>
      ) : (
        groupedByMonth.map(([key, group]) => (
          <div key={key} style={{ marginBottom: 20 }}>
            <div style={{
              fontSize: 12, fontWeight: 800, color: '#9A8B94', textTransform: 'uppercase',
              letterSpacing: 1.5, marginBottom: 10, padding: '0 4px',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span>{group.label}</span>
              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, background: '#F0E8E4', color: '#B8A0AE', fontWeight: 700 }}>
                {group.events.length}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {group.events.map((ev, i) => {
                const d = new Date(ev.date)
                const daysUntil = Math.ceil((d - new Date()) / 86400000)
                const isPast = ev.date < today
                const isNext = nextEvent && ev.id === nextEvent.id
                const fmt = getFormatConf(ev.format)

                // Checklist progress for this event
                const evChecks = checklists.filter(c => c.event_id === ev.id)
                const checksDone = evChecks.filter(c => c.checked).length
                const checksTotal = evChecks.length

                // Packing progress
                const evPacking = (eventPacking || []).filter(ep => ep.event_id === ev.id)
                const packDone = evPacking.filter(ep => ep.packed).length
                const packTotal = evPacking.length

                return (
                  <div key={ev.id}>
                    {/* Timeline connector */}
                    {i > 0 && (
                      <div style={{
                        width: 2, height: 12, background: '#E8DED8', marginLeft: 19,
                      }} />
                    )}

                    <button
                      onClick={() => setSelectedEvent(ev)}
                      className="card"
                      style={{
                        width: '100%', padding: '14px 16px', cursor: 'pointer', textAlign: 'left',
                        borderLeft: `4px solid ${isNext ? '#E8735A' : isPast ? '#B8A0AE' : fmt.color}`,
                        opacity: isPast ? 0.7 : 1,
                      }}
                    >
                      <div style={{ display: 'flex', gap: 12 }}>
                        {/* Date block */}
                        <div style={{
                          width: 48, height: 52, borderRadius: 12, flexShrink: 0,
                          background: isPast ? '#F0E8E4' : isNext ? '#E8735A12' : `${fmt.color}12`,
                          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                          border: isNext ? '2px solid #E8735A40' : 'none',
                        }}>
                          <div style={{ fontSize: 16, fontWeight: 900, color: isPast ? '#B8A0AE' : isNext ? '#E8735A' : fmt.color, lineHeight: 1 }}>
                            {d.getDate()}
                          </div>
                          <div style={{ fontSize: 9, fontWeight: 700, color: isPast ? '#B8A0AE' : '#9A8B94', textTransform: 'uppercase' }}>
                            {d.toLocaleDateString('fr-FR', { month: 'short' })}
                          </div>
                          <div style={{ fontSize: 8, color: '#B8A0AE', fontWeight: 600 }}>
                            {d.toLocaleDateString('fr-FR', { weekday: 'short' })}
                          </div>
                        </div>

                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                            <span style={{ fontSize: 15, fontWeight: 800, color: '#3D3042', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {ev.name || ev.lieu}
                            </span>
                            {isNext && <span style={{ fontSize: 8, padding: '2px 6px', borderRadius: 4, background: '#E8735A', color: 'white', fontWeight: 800 }}>PROCHAIN</span>}
                          </div>
                          <div style={{ fontSize: 12, color: '#9A8B94', marginBottom: 6 }}>
                            {ev.lieu && ev.lieu !== ev.name ? `${ev.lieu} — ` : ''}{ev.ville} ({ev.territoire})
                          </div>

                          {/* Badges */}
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            <Badge color={fmt.color}>{fmt.icon} {ev.format}</Badge>
                            {ev.capacite && <Badge color="#9B7DC4">{ev.capacite} pers.</Badge>}
                            {!isPast && daysUntil >= 0 && (
                              <Badge color={daysUntil <= 3 ? '#D4648A' : daysUntil <= 7 ? '#E8935A' : '#5B8DB8'}>
                                J-{daysUntil}
                              </Badge>
                            )}
                            {isPast && <Badge color="#B8A0AE">Terminé</Badge>}
                            {ev.transport_inter_iles && <Badge color="#E8935A">Inter-îles</Badge>}
                          </div>

                          {/* Progress indicators */}
                          {(checksTotal > 0 || packTotal > 0) && (
                            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                              {checksTotal > 0 && (
                                <ProgressMini
                                  label="Checklist"
                                  done={checksDone}
                                  total={checksTotal}
                                  color="#5DAB8B"
                                />
                              )}
                              {packTotal > 0 && (
                                <ProgressMini
                                  label="Packing"
                                  done={packDone}
                                  total={packTotal}
                                  color="#5B8DB8"
                                />
                              )}
                            </div>
                          )}
                        </div>

                        {/* Arrow */}
                        <div style={{ display: 'flex', alignItems: 'center', color: '#D8CDD2', fontSize: 16 }}>›</div>
                      </div>
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        ))
      )}
    </div>
  )
}

function StatBox({ label, value, color }) {
  return (
    <div style={{
      flex: 1, textAlign: 'center', padding: '8px 4px',
      background: 'white', borderRadius: 10, border: '1px solid #F0E8E4',
    }}>
      <div style={{ fontSize: 16, fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 8, color: '#9A8B94', fontWeight: 700, marginTop: 2 }}>{label}</div>
    </div>
  )
}

function ProgressMini({ label, done, total, color }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  return (
    <div style={{ flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
        <span style={{ fontSize: 9, color: '#9A8B94', fontWeight: 700 }}>{label}</span>
        <span style={{ fontSize: 9, color, fontWeight: 800 }}>{done}/{total}</span>
      </div>
      <div style={{ height: 3, borderRadius: 2, background: '#F0E8E4', overflow: 'hidden' }}>
        <div style={{
          width: `${pct}%`, height: '100%', borderRadius: 2,
          background: pct === 100 ? '#5DAB8B' : color,
          transition: 'width 0.3s',
        }} />
      </div>
    </div>
  )
}
