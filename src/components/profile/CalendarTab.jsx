import React, { useMemo } from 'react'
import { db } from '../../lib/supabase'
import { parseDate } from '../UI'

export const AVAIL_CONF = {
  available:   { label: 'Dispo', color: '#16A34A', icon: '' },
  unavailable: { label: 'Indispo', color: '#7C3AED', icon: '' },
  maybe:       { label: 'Peut-\u00eatre', color: '#D97706', icon: '' },
  unknown:     { label: 'Non renseign\u00e9', color: '#94A3B8', icon: '' },
}

export default function CalendarTab({ user, events, availability, onToast, onReload }) {
  const today = new Date().toISOString().split('T')[0]

  const availMap = useMemo(() => {
    const map = {}
    ;(availability || []).forEach(a => { map[a.event_id] = a })
    return map
  }, [availability])

  const sortedEvents = useMemo(() =>
    [...(events || [])].sort((a, b) => a.date.localeCompare(b.date)),
    [events]
  )

  const upcomingEvents = sortedEvents.filter(e => e.date >= today)
  const pastEvents = sortedEvents.filter(e => e.date < today)

  const stats = useMemo(() => {
    const s = { available: 0, unavailable: 0, maybe: 0, unknown: 0 }
    upcomingEvents.forEach(e => {
      const a = availMap[e.id]
      s[a?.status || 'unknown']++
    })
    return s
  }, [upcomingEvents, availMap])

  const setAvailability = async (eventId, status) => {
    try {
      const existing = availMap[eventId]
      if (existing) {
        await db.update('user_availability', `id=eq.${existing.id}`, {
          status,
          updated_at: new Date().toISOString(),
        })
      } else {
        await db.upsert('user_availability', {
          user_id: user.id,
          event_id: eventId,
          status,
        })
      }
      onToast(AVAIL_CONF[status].label)
      if (onReload) onReload()
    } catch (e) {
      onToast('Erreur : ' + e.message, '#7C3AED')
    }
  }

  const renderEventRow = (ev) => {
    const avail = availMap[ev.id]
    const st = AVAIL_CONF[avail?.status || 'unknown']
    const isPast = ev.date < today
    const daysUntil = Math.ceil((new Date(ev.date) - new Date()) / 86400000)
    return (
      <div key={ev.id} className="card" style={{
        padding: '12px 14px', opacity: isPast ? 0.5 : 1,
        borderLeft: `4px solid ${st.color}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: isPast ? 0 : 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {ev.name || ev.lieu}
            </div>
            <div style={{ fontSize: 10, color: '#94A3B8' }}>
              {parseDate(ev.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' })}
              {ev.ville ? ` \u2014 ${ev.ville}` : ''}
              {!isPast && daysUntil >= 0 ? ` \u00b7 J-${daysUntil}` : ''}
            </div>
          </div>
          <span style={{
            padding: '3px 10px', borderRadius: 8, fontSize: 10, fontWeight: 600,
            background: `${st.color}15`, color: st.color,
          }}>{st.icon} {st.label}</span>
        </div>
        {!isPast && (
          <div style={{ display: 'flex', gap: 4 }}>
            {['available', 'maybe', 'unavailable'].map(s => {
              const c = AVAIL_CONF[s]
              const active = (avail?.status || 'unknown') === s
              return (
                <button key={s} onClick={() => setAvailability(ev.id, s)} style={{
                  flex: 1, padding: '6px 4px', borderRadius: 8, fontSize: 10, fontWeight: 700,
                  cursor: 'pointer', textAlign: 'center',
                  background: active ? `${c.color}20` : 'white',
                  color: active ? c.color : '#94A3B8',
                  border: `1px solid ${active ? c.color + '40' : '#E2E8F0'}`,
                }}>{c.icon} {c.label}</button>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      {/* Stats */}
      <div className="card" style={{ padding: '14px 16px', marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 8, textAlign: 'center' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 600, color: '#6366F1' }}>{upcomingEvents.length}</div>
            <div style={{ fontSize: 9, color: '#94A3B8', fontWeight: 600 }}>Dates \u00e0 venir</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 600, color: '#16A34A' }}>{stats.available}</div>
            <div style={{ fontSize: 9, color: '#94A3B8', fontWeight: 600 }}>Dispo</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 600, color: '#D97706' }}>{stats.maybe}</div>
            <div style={{ fontSize: 9, color: '#94A3B8', fontWeight: 600 }}>Peut-\u00eatre</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 600, color: '#7C3AED' }}>{stats.unavailable}</div>
            <div style={{ fontSize: 9, color: '#94A3B8', fontWeight: 600 }}>Indispo</div>
          </div>
        </div>
      </div>

      {/* Upcoming */}
      {upcomingEvents.length === 0 ? (
        <div className="card" style={{ padding: '32px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}></div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#1E293B' }}>Aucune date \u00e0 venir</div>
        </div>
      ) : (
        <>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
            \u00c0 venir ({upcomingEvents.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {upcomingEvents.map(renderEventRow)}
          </div>
        </>
      )}

      {/* Past events */}
      {pastEvents.length > 0 && (
        <>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
            Pass\u00e9s ({pastEvents.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pastEvents.slice(-5).reverse().map(renderEventRow)}
          </div>
        </>
      )}
    </div>
  )
}
