import React, { useState, useEffect } from 'react'
import { safe } from '../lib/supabase'
import { parseDate } from '../components/UI'
import LiveSetlist from './LiveSetlist'
import LiveReactions from './LiveReactions'
import LiveShop from './LiveShop'

// ─── Design tokens matching esykennenga.fr ───
export const EK = {
  bleu: '#10204E',
  bleuF: '#0B1735',
  camel: '#5B8DB8',
  camelH: '#8BB8D8',
  kaki: '#3D4825',
  bordeaux: '#D4648A',
  green: '#5DAB8B',
  card: '#F8FAFC',
  cardBorder: '#CBD5E1',
  bg: '#FFFFFF',
  text: '#1E293B',
  textDim: 'rgba(240,236,226,0.55)',
  textMuted: 'rgba(240,236,226,0.3)',
  overlay: 'rgba(16,32,78,0.08)',
}

const SCREENS = [
  { id: 'home', label: 'Accueil', icon: '' },
  { id: 'setlist', label: 'Setlist', icon: '' },
  { id: 'shop', label: 'Merch', icon: '' },
  { id: 'info', label: 'Infos', icon: 'ℹ️' },
]

// Persistent fan fingerprint
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

  // Inject Google Fonts + theme-color
  useEffect(() => {
    // Fonts
    if (!document.querySelector('link[href*="Jost"]')) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Jost:wght@300;400;500;600;700;800;900&display=swap'
      document.head.appendChild(link)
    }
    // Theme color
    let meta = document.querySelector('meta[name="theme-color"]')
    if (!meta) { meta = document.createElement('meta'); meta.name = 'theme-color'; document.head.appendChild(meta) }
    meta.content = EK.bg
    return () => { meta.content = '#FFF8F0' }
  }, [])

  // Load next upcoming event
  useEffect(() => {
    const load = async () => {
      try {
        const now = new Date().toISOString().slice(0, 10)
        const events = await safe('events', `date=gte.${now}&order=date.asc&limit=1`)
        if (events && events.length > 0) setEvent(events[0])
      } catch { /* ignore */ }
      setLoading(false)
    }
    load()
  }, [])

  // ─── Loading screen ───
  if (loading) return (
    <div style={{
      minHeight: '100dvh', background: EK.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: 20, fontFamily: "'Inter', sans-serif",
    }}>
      <img
        src="https://images.squarespace-cdn.com/content/6674cfe71695a578165178c4/2bae59e9-2a91-41ba-80db-8bc7f5aba758/Logo+EK25+Ce%CC%81le%CC%81bration-09.png?content-type=image%2Fpng"
        alt="EK 25"
        style={{ height: 100, objectFit: 'contain', opacity: 0.9 }}
      />
      <div className="loader" style={{ borderTopColor: EK.camel, borderColor: 'rgba(200,164,106,0.12)' }} />
      <div style={{
        fontFamily: "'Inter', sans-serif", color: EK.camel,
        fontWeight: 700, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase',
      }}>Chargement...</div>
    </div>
  )

  return (
    <div style={{
      minHeight: '100dvh', background: EK.bg,
      fontFamily: "'Inter', sans-serif",
      paddingBottom: 140,
    }}>
      {/* ─── Frosted glass header ─── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        padding: '10px 16px',
        background: 'rgba(8,8,8,0.85)',
        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${EK.cardBorder}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <img
          src="https://images.squarespace-cdn.com/content/6674cfe71695a578165178c4/2bae59e9-2a91-41ba-80db-8bc7f5aba758/Logo+EK25+Ce%CC%81le%CC%81bration-09.png?content-type=image%2Fpng"
          alt="EK 25 Célébration"
          style={{ height: 50, objectFit: 'contain' }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {event?.date && (
            <div style={{
              padding: '5px 12px', borderRadius: 8,
              background: EK.card, border: `1px solid ${EK.cardBorder}`,
              color: EK.camel, fontSize: 11, fontWeight: 700, letterSpacing: '0.05em',
            }}>
              {parseDate(event.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }).toUpperCase()}
            </div>
          )}
          <div style={{
            padding: '5px 10px', borderRadius: 8,
            background: EK.green, color: '#fff',
            fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>LIVE</div>
        </div>
      </header>

      {/* ─── Screen content ─── */}
      {screen === 'home' && <LiveHome event={event} onNavigate={setScreen} />}
      {screen === 'setlist' && event && <LiveSetlist eventId={event.id} fanId={fanId} />}
      {screen === 'shop' && event && <LiveShop eventId={event.id} fanId={fanId} />}
      {screen === 'info' && <LiveInfo event={event} />}

      {/* ─── Reactions bar (always visible during event) ─── */}
      {event && <LiveReactions eventId={event.id} fanId={fanId} />}

      {/* ─── Bottom navigation ─── */}
      <nav style={{
        position: 'fixed', bottom: 68, left: 0, right: 0, zIndex: 90,
        display: 'flex', justifyContent: 'center', gap: 4,
        padding: '6px 12px',
      }}>
        {SCREENS.map(s => {
          const active = screen === s.id
          return (
            <button key={s.id} onClick={() => setScreen(s.id)} style={{
              padding: '9px 16px', borderRadius: 12,
              background: active ? EK.bleu : EK.card,
              border: `1px solid ${active ? EK.camel + '60' : EK.cardBorder}`,
              color: active ? EK.camel : EK.textDim,
              fontSize: 11, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 5,
              letterSpacing: '0.03em',
              transition: 'all 0.2s ease',
              transform: active ? 'translateY(-1px)' : 'none',
            }}>
              <span style={{ fontSize: 14 }}>{s.icon}</span> {s.label}
            </button>
          )
        })}
      </nav>

      {/* ─── Global live styles ─── */}
      <style>{`
        * { box-sizing: border-box; }
        body { background: ${EK.bg}; margin: 0; }
        ::selection { background: ${EK.camel}40; color: ${EK.text}; }
        input::placeholder { color: ${EK.textMuted}; }
      `}</style>
    </div>
  )
}

// ─── Home screen ───
function LiveHome({ event, onNavigate }) {
  if (!event) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center' }}>
        <div style={{
          width: 100, height: 100, borderRadius: '50%', margin: '0 auto 24px',
          background: EK.card, border: `1px solid ${EK.cardBorder}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40,
        }}></div>
        <div style={{
          fontFamily: "'Inter', serif",
          fontSize: 28, fontWeight: 700, color: EK.text, marginBottom: 12,
        }}>Aucun concert prévu</div>
        <div style={{ fontSize: 14, color: EK.textDim, lineHeight: 1.8, maxWidth: 300, margin: '0 auto' }}>
          Il n'y a pas de show programmé pour le moment.
          Suis <span style={{ color: EK.camel, fontWeight: 700 }}>E.sy Kennenga</span> sur les réseaux !
        </div>
        {/* Social links */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 24 }}>
          {[
            { label: 'IG', url: 'https://instagram.com/esykennenga' },
            { label: 'YT', url: 'https://youtube.com/@esykennenga' },
            { label: 'FB', url: 'https://facebook.com/esykennenga' },
            { label: 'TT', url: 'https://tiktok.com/@esykennenga' },
          ].map(s => (
            <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer" style={{
              width: 42, height: 42, borderRadius: 12,
              background: EK.card, border: `1px solid ${EK.cardBorder}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: EK.camel, fontSize: 12, fontWeight: 600, textDecoration: 'none',
              letterSpacing: '0.05em',
            }}>{s.label}</a>
          ))}
        </div>
      </div>
    )
  }

  const daysLeft = Math.ceil((new Date(event.date) - new Date()) / 86400000)
  const isTonight = daysLeft <= 0
  const formatConf = {
    'concert live': { color: EK.bleu, label: 'Concert Live' },
    'sound system': { color: EK.kaki, label: 'Sound System' },
    'impro': { color: EK.bordeaux, label: 'Impro' },
  }
  const fmt = formatConf[(event.format || '').toLowerCase()] || formatConf['concert live']

  return (
    <div style={{ padding: '16px 14px 24px' }}>
      {/* ─── Hero event card ─── */}
      <div style={{
        background: EK.card, borderRadius: 20, overflow: 'hidden',
        border: `1px solid ${EK.cardBorder}`, marginBottom: 14,
      }}>
        {/* Event image or gradient */}
        <div style={{
          height: 160, background: `linear-gradient(135deg, ${EK.bleu}, ${EK.bleuF})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative',
        }}>
          <img
            src="https://images.squarespace-cdn.com/content/6674cfe71695a578165178c4/2bae59e9-2a91-41ba-80db-8bc7f5aba758/Logo+EK25+Ce%CC%81le%CC%81bration-09.png?content-type=image%2Fpng"
            alt="EK 25"
            style={{ height: 80, objectFit: 'contain', opacity: 0.7 }}
          />
          {/* Format tag */}
          <div style={{
            position: 'absolute', top: 12, left: 12,
            padding: '5px 12px', borderRadius: 6,
            background: fmt.color, color: '#fff',
            fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
          }}>{fmt.label}</div>
          {/* Countdown badge */}
          <div style={{
            position: 'absolute', top: 12, right: 12,
            padding: '5px 12px', borderRadius: 6,
            background: isTonight ? EK.green : 'rgba(0,0,0,0.5)',
            color: '#fff', fontSize: 11, fontWeight: 600,
          }}>
            {isTonight ? "C'est ce soir !" : `J-${daysLeft}`}
          </div>
        </div>

        {/* Event details */}
        <div style={{ padding: '18px 18px 20px' }}>
          <div style={{
            fontFamily: "'Inter', serif",
            fontSize: 24, fontWeight: 700, color: EK.text, lineHeight: 1.2, marginBottom: 6,
          }}>
            {event.name || event.venue || 'Concert'}
          </div>
          {event.venue && event.name && (
            <div style={{ fontSize: 13, color: EK.textDim, marginBottom: 2 }}> {event.venue}</div>
          )}
          {event.location && (
            <div style={{ fontSize: 12, color: EK.textMuted }}>{event.location}</div>
          )}
          <div style={{
            marginTop: 12, display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{
              padding: '8px 14px', borderRadius: 10,
              background: `${EK.camel}12`, border: `1px solid ${EK.camel}25`,
            }}>
              <div style={{ fontSize: 28, fontWeight: 600, color: EK.camel, lineHeight: 1 }}>
                {parseDate(event.date).getDate()}
              </div>
              <div style={{ fontSize: 10, color: EK.camel, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                {parseDate(event.date).toLocaleDateString('fr-FR', { month: 'short' })}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: EK.text }}>
                {parseDate(event.date).toLocaleDateString('fr-FR', { weekday: 'long' })}
              </div>
              {event.time && <div style={{ fontSize: 12, color: EK.textDim }}>{event.time}</div>}
              {event.capacity && <div style={{ fontSize: 11, color: EK.textMuted }}>{event.capacity} places</div>}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Quick actions ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        <ActionCard
          icon="" title="Voter la setlist"
          subtitle="Choisis les titres"
          onClick={() => onNavigate('setlist')}
          accent={EK.camel}
        />
        <ActionCard
          icon="" title="Boutique merch"
          subtitle="T-shirts & plus"
          onClick={() => onNavigate('shop')}
          accent={EK.green}
        />
      </div>

      {/* ─── Ticket CTA ─── */}
      {event.ticket_url && (
        <a href={event.ticket_url} target="_blank" rel="noopener noreferrer" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '14px 20px', borderRadius: 999,
          background: EK.green, color: '#fff',
          fontSize: 13, fontWeight: 700, letterSpacing: '0.03em',
          textDecoration: 'none', textTransform: 'uppercase',
          transition: 'transform 0.2s ease',
        }}>
          🎟️ Réserver ma place
        </a>
      )}
    </div>
  )
}

// ─── Action card component ───
function ActionCard({ icon, title, subtitle, onClick, accent }) {
  return (
    <button onClick={onClick} style={{
      padding: '20px 14px', borderRadius: 12, textAlign: 'center',
      background: EK.card, border: `1px solid ${EK.cardBorder}`,
      cursor: 'pointer', transition: 'all 0.2s ease',
    }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: EK.text }}>{title}</div>
      <div style={{ fontSize: 11, color: EK.textMuted, marginTop: 3 }}>{subtitle}</div>
    </button>
  )
}

// ─── Info screen ───
function LiveInfo({ event }) {
  return (
    <div style={{ padding: '16px 14px' }}>
      <div style={{
        fontFamily: "'Inter', serif",
        fontSize: 24, fontWeight: 700, color: EK.text, marginBottom: 16,
      }}>Informations</div>

      {event ? (
        <div style={{
          background: EK.card, borderRadius: 12, padding: 18,
          border: `1px solid ${EK.cardBorder}`, marginBottom: 14,
        }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: EK.text, marginBottom: 10 }}>
            {event.name || 'Concert'}
          </div>
          <InfoRow label="Date" value={parseDate(event.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} />
          {event.time && <InfoRow label="Heure" value={event.time} />}
          {event.venue && <InfoRow label="Lieu" value={event.venue} />}
          {event.location && <InfoRow label="Ville" value={event.location} />}
          {event.capacity && <InfoRow label="Capacité" value={`${event.capacity} places`} />}
          {event.format && <InfoRow label="Format" value={event.format} />}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: 40, color: EK.textDim }}>
          Pas d'événement programmé
        </div>
      )}

      {/* Artist info */}
      <div style={{
        background: EK.card, borderRadius: 12, padding: 18,
        border: `1px solid ${EK.cardBorder}`, marginBottom: 14,
      }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: EK.text, marginBottom: 10 }}>E.sy Kennenga</div>
        <div style={{ fontSize: 13, color: EK.textDim, lineHeight: 1.8, fontWeight: 300 }}>
          25 ans de carrière musicale. Tournée anniversaire 2026 — Martinique & Guadeloupe.
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
          {[
            { label: 'Site web', url: 'https://www.esykennenga.fr', icon: '🌐' },
            { label: 'Instagram', url: 'https://instagram.com/esykennenga', icon: '📸' },
            { label: 'YouTube', url: 'https://youtube.com/@esykennenga', icon: '▶️' },
          ].map(l => (
            <a key={l.label} href={l.url} target="_blank" rel="noopener noreferrer" style={{
              padding: '8px 14px', borderRadius: 10,
              background: `${EK.bleu}`, border: `1px solid ${EK.camel}30`,
              color: EK.camel, fontSize: 11, fontWeight: 700,
              textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5,
              letterSpacing: '0.05em', textTransform: 'uppercase',
            }}>
              {l.icon} {l.label}
            </a>
          ))}
        </div>
      </div>

      {/* Powered by */}
      <div style={{ textAlign: 'center', padding: '20px 0', color: EK.textMuted, fontSize: 11 }}>
        Propulsé par <span style={{ color: EK.camel, fontWeight: 700 }}>BackStage</span>
      </div>
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '8px 0', borderBottom: `1px solid ${EK.cardBorder}`,
    }}>
      <span style={{ fontSize: 12, color: EK.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
      <span style={{ fontSize: 13, color: EK.text, fontWeight: 500 }}>{value}</span>
    </div>
  )
}
