import React, { useState, useEffect } from 'react'
import { safe } from '../lib/supabase'
import LiveSetlist from './LiveSetlist'
import LiveReactions from './LiveReactions'

const SCREENS = [
  { id: 'home', label: 'Accueil', icon: '🏠' },
  { id: 'setlist', label: 'Setlist', icon: '🎵' },
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

  // Set dark status bar
  useEffect(() => {
    let meta = document.querySelector('meta[name="theme-color"]')
    if (!meta) {
      meta = document.createElement('meta')
      meta.name = 'theme-color'
      document.head.appendChild(meta)
    }
    meta.content = '#1B2244'
    return () => { meta.content = '#FFF8F0' }
  }, [])

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
      background: 'linear-gradient(180deg, #1B2244 0%, #232D54 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: 16,
      fontFamily: "'Nunito', sans-serif",
    }}>
      <div style={{ fontSize: 48 }}>🎪</div>
      <div className="loader" style={{ borderTopColor: '#C5A55A', borderColor: 'rgba(240,236,226,0.15)' }} />
      <div style={{ color: '#C5A55A', fontWeight: 900, fontSize: 22 }}>EK LIVE</div>
    </div>
  )

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'linear-gradient(180deg, #1B2244 0%, #232D54 100%)',
      fontFamily: "'Nunito', sans-serif",
      paddingBottom: 80,
    }}>
      {/* Header */}
      <header style={{
        padding: '16px 18px 14px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid rgba(197,165,90,0.15)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img
            src="https://images.squarespace-cdn.com/content/6674cfe71695a578165178c4/2bae59e9-2a91-41ba-80db-8bc7f5aba758/Logo+EK25+Ce%CC%81le%CC%81bration-09.png?content-type=image%2Fpng"
            alt="EK 25 Célébration"
            style={{ height: 80, objectFit: 'contain' }}
          />
        </div>
        {event?.date && (
          <div style={{
            padding: '6px 12px', borderRadius: 10,
            background: 'rgba(197,165,90,0.12)', border: '1px solid rgba(197,165,90,0.25)',
            color: '#C5A55A', fontSize: 11, fontWeight: 800,
          }}>
            {new Date(event.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
          </div>
        )}
      </header>

      {/* Screen content */}
      {screen === 'home' && <LiveHome event={event} onNavigate={setScreen} />}
      {screen === 'setlist' && event && <LiveSetlist eventId={event.id} fanId={fanId} />}

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
            background: screen === s.id ? 'rgba(197,165,90,0.2)' : 'rgba(197,165,90,0.15)',
            border: screen === s.id ? '1px solid rgba(197,165,90,0.4)' : '1px solid rgba(197,165,90,0.08)',
            color: screen === s.id ? '#C5A55A' : 'rgba(240,236,226,0.5)',
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
        <div style={{ fontSize: 80, marginBottom: 20 }}>🎤</div>
        <div style={{ fontSize: 24, fontWeight: 900, color: '#F0ECE2', marginBottom: 10 }}>
          Aucun concert prévu
        </div>
        <div style={{ fontSize: 14, color: 'rgba(240,236,226,0.5)', lineHeight: 1.7, maxWidth: 280, margin: '0 auto' }}>
          Il n'y a pas de show programmé pour le moment. Suis <span style={{ color: '#C5A55A', fontWeight: 700 }}>E.sy Kennenga</span> sur les réseaux pour ne rien rater !
        </div>
        <div style={{
          marginTop: 24, display: 'inline-block',
          padding: '10px 24px', borderRadius: 14,
          background: 'rgba(197,165,90,0.1)', border: '1px solid rgba(197,165,90,0.2)',
          color: '#C5A55A', fontSize: 13, fontWeight: 800,
        }}>
          Reviens bientôt
        </div>
      </div>
    )
  }

  const daysLeft = Math.ceil((new Date(event.date) - new Date()) / 86400000)

  return (
    <div style={{ padding: '16px 16px 24px' }}>
      {/* Event hero card */}
      <div style={{
        background: 'rgba(197,165,90,0.08)', borderRadius: 18, padding: '24px 20px',
        border: '1px solid rgba(197,165,90,0.15)', marginBottom: 16,
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
        <div style={{ fontSize: 14, color: '#C5A55A', fontWeight: 700, marginTop: 8 }}>
          {new Date(event.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
        {event.time && (
          <div style={{ fontSize: 13, color: 'rgba(240,236,226,0.5)', marginTop: 2 }}>{event.time}</div>
        )}
        {daysLeft > 0 && (
          <div style={{
            marginTop: 12, display: 'inline-block',
            padding: '6px 16px', borderRadius: 10,
            background: 'rgba(197,165,90,0.12)', border: '1px solid rgba(197,165,90,0.25)',
            color: '#C5A55A', fontSize: 13, fontWeight: 800,
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

      {/* Quick action — Setlist only */}
      <button onClick={() => onNavigate('setlist')} style={{
        width: '100%', padding: '22px 16px', borderRadius: 16, textAlign: 'center',
        background: 'rgba(197,165,90,0.08)', border: '1px solid rgba(197,165,90,0.15)',
        cursor: 'pointer',
      }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>🎵</div>
        <div style={{ fontSize: 15, fontWeight: 800, color: '#F0ECE2' }}>Voter la setlist</div>
        <div style={{ fontSize: 12, color: 'rgba(240,236,226,0.4)', marginTop: 4 }}>Choisis les titres du concert !</div>
      </button>
    </div>
  )
}
