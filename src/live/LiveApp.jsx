import React, { useState, useEffect } from 'react'
import { safe } from '../lib/supabase'
import LiveSetlist from './LiveSetlist'
import LiveShop from './LiveShop'
import LiveReactions from './LiveReactions'

const SCREENS = [
  { id: 'home', label: 'Accueil', icon: '🏠' },
  { id: 'setlist', label: 'Setlist', icon: '🎵' },
  { id: 'shop', label: 'Boutique', icon: '🛍️' },
]

// Generate or retrieve a persistent fan fingerprint
function getFanId() {
  let id = localStorage.getItem('ek_fan_id')
  if (!id) {
    id = 'fan_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
    localStorage.setItem('ek_fan_id', id)
  }
  return id
}

export default function LiveApp() {
  const [screen, setScreen] = useState('home')
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const fanId = getFanId()

  // Load the next upcoming event
  useEffect(() => {
    const load = async () => {
      try {
        const now = new Date().toISOString().slice(0, 10)
        const events = await safe('events', `date=gte.${now}&order=date.asc&limit=1`)
        if (events && events.length > 0) {
          setEvent(events[0])
        }
      } catch { /* ignore */ }
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return (
    <div style={{
      minHeight: '100dvh',
      background: 'linear-gradient(180deg, #1a1520 0%, #2a1f30 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: 16,
      fontFamily: "'Nunito', sans-serif",
    }}>
      <div style={{ fontSize: 48 }}>🎪</div>
      <div className="loader" style={{ borderTopColor: '#E8735A', borderColor: 'rgba(240,236,226,0.15)' }} />
      <div style={{ color: '#E8735A', fontWeight: 900, fontSize: 22 }}>EK LIVE</div>
    </div>
  )

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'linear-gradient(180deg, #1a1520 0%, #2a1f30 100%)',
      fontFamily: "'Nunito', sans-serif",
      paddingBottom: 80,
    }}>
      {/* Header */}
      <header style={{
        padding: '16px 18px 14px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 14,
            background: 'linear-gradient(135deg, #E8735A, #D4648A)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, boxShadow: '0 4px 16px rgba(232,115,90,0.3)',
          }}>🎪</div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#E8735A', letterSpacing: 1 }}>EK LIVE</div>
            <div style={{ fontSize: 10, color: 'rgba(240,236,226,0.4)', letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 700 }}>
              {event?.name || event?.venue || 'Concert'}
            </div>
          </div>
        </div>
        {event?.date && (
          <div style={{
            padding: '6px 12px', borderRadius: 10,
            background: 'rgba(232,115,90,0.12)', border: '1px solid rgba(232,115,90,0.25)',
            color: '#E8735A', fontSize: 11, fontWeight: 800,
          }}>
            {new Date(event.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
          </div>
        )}
      </header>

      {/* Screen content */}
      {screen === 'home' && <LiveHome event={event} onNavigate={setScreen} />}
      {screen === 'setlist' && event && <LiveSetlist eventId={event.id} fanId={fanId} />}
      {screen === 'shop' && event && <LiveShop eventId={event.id} fanId={fanId} />}

      {/* Reactions bar (always visible) */}
      {event && <LiveReactions eventId={event.id} fanId={fanId} />}

      {/* Navigation (above reactions bar) */}
      <nav style={{
        position: 'fixed', bottom: 68, left: 0, right: 0, zIndex: 90,
        display: 'flex', justifyContent: 'center', gap: 6,
        padding: '8px 16px',
      }}>
        {SCREENS.map(s => (
          <button key={s.id} onClick={() => setScreen(s.id)} style={{
            padding: '8px 18px', borderRadius: 12,
            background: screen === s.id ? 'rgba(232,115,90,0.2)' : 'rgba(255,255,255,0.06)',
            border: screen === s.id ? '1px solid rgba(232,115,90,0.4)' : '1px solid rgba(255,255,255,0.08)',
            color: screen === s.id ? '#E8735A' : 'rgba(240,236,226,0.5)',
            fontSize: 12, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <span>{s.icon}</span> {s.label}
          </button>
        ))}
      </nav>
    </div>
  )
}

// ─── Home screen ───
function LiveHome({ event, onNavigate }) {
  if (!event) {
    return (
      <div style={{ padding: '60px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🎪</div>
        <div style={{ fontSize: 20, fontWeight: 900, color: '#F0ECE2', marginBottom: 8 }}>
          Pas de concert en cours
        </div>
        <div style={{ fontSize: 13, color: 'rgba(240,236,226,0.5)', lineHeight: 1.6 }}>
          Reviens bientot pour le prochain show !
        </div>
      </div>
    )
  }

  const daysLeft = Math.ceil((new Date(event.date) - new Date()) / 86400000)

  return (
    <div style={{ padding: '16px 16px 24px' }}>
      {/* Event hero card */}
      <div style={{
        background: 'rgba(255,255,255,0.08)', borderRadius: 18, padding: '24px 20px',
        border: '1px solid rgba(255,255,255,0.06)', marginBottom: 16,
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🎤</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: '#F0ECE2', marginBottom: 4 }}>
          {event.name || event.venue || 'Concert'}
        </div>
        {event.venue && event.name && (
          <div style={{ fontSize: 14, color: 'rgba(240,236,226,0.6)', marginBottom: 4 }}>
            {event.venue}
          </div>
        )}
        <div style={{ fontSize: 14, color: '#E8735A', fontWeight: 700, marginTop: 8 }}>
          {new Date(event.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
        {event.time && (
          <div style={{ fontSize: 13, color: 'rgba(240,236,226,0.5)', marginTop: 2 }}>{event.time}</div>
        )}
        {daysLeft > 0 && (
          <div style={{
            marginTop: 12, display: 'inline-block',
            padding: '6px 16px', borderRadius: 10,
            background: 'rgba(232,115,90,0.12)', border: '1px solid rgba(232,115,90,0.25)',
            color: '#E8735A', fontSize: 13, fontWeight: 800,
          }}>
            J-{daysLeft}
          </div>
        )}
        {daysLeft <= 0 && (
          <div style={{
            marginTop: 12, display: 'inline-block',
            padding: '6px 16px', borderRadius: 10,
            background: 'rgba(93,171,139,0.15)', border: '1px solid rgba(93,171,139,0.3)',
            color: '#5DAB8B', fontSize: 13, fontWeight: 800,
          }}>
            C'est ce soir !
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={() => onNavigate('setlist')} style={{
          flex: 1, padding: '20px 12px', borderRadius: 16, textAlign: 'center',
          background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.06)',
          cursor: 'pointer',
        }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>🎵</div>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#F0ECE2' }}>Voter la setlist</div>
          <div style={{ fontSize: 10, color: 'rgba(240,236,226,0.4)', marginTop: 2 }}>Choisis les titres</div>
        </button>
        <button onClick={() => onNavigate('shop')} style={{
          flex: 1, padding: '20px 12px', borderRadius: 16, textAlign: 'center',
          background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.06)',
          cursor: 'pointer',
        }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>🛍️</div>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#F0ECE2' }}>Merch</div>
          <div style={{ fontSize: 10, color: 'rgba(240,236,226,0.4)', marginTop: 2 }}>T-shirts & plus</div>
        </button>
      </div>
    </div>
  )
}
