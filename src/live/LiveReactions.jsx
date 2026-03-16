import React, { useState, useRef, useCallback } from 'react'
import { db } from '../lib/supabase'
import { EK } from './LiveApp'

const EMOJIS = ['🔥', '❤️', '🎵', '👏', '🤩']
const COOLDOWN_MS = 1000

export default function LiveReactions({ eventId, fanId }) {
  const [floaters, setFloaters] = useState([])
  const [cooldown, setCooldown] = useState(false)
  const [tappedEmoji, setTappedEmoji] = useState(null)
  const lastTap = useRef(0)
  const nextId = useRef(0)

  const handleTap = useCallback((emoji) => {
    const now = Date.now()
    if (now - lastTap.current < COOLDOWN_MS) return
    lastTap.current = now

    if (navigator.vibrate) navigator.vibrate(50)

    setTappedEmoji(emoji)
    setTimeout(() => setTappedEmoji(null), 200)

    setCooldown(true)
    setTimeout(() => setCooldown(false), COOLDOWN_MS)

    const id = nextId.current++
    const left = 10 + Math.random() * 80
    setFloaters(prev => [...prev, { id, emoji, left }])
    setTimeout(() => { setFloaters(prev => prev.filter(f => f.id !== id)) }, 2000)

    try {
      db.insert('live_reactions', { event_id: eventId, fan_id: fanId, emoji })
    } catch { /* fire & forget */ }
  }, [eventId, fanId])

  return (
    <>
      {/* Floating emojis */}
      {floaters.map(f => (
        <div key={f.id} style={{
          position: 'fixed', bottom: 80, left: `${f.left}%`,
          fontSize: 32, pointerEvents: 'none', zIndex: 200,
          animation: 'ek-float-up 2s ease-out forwards',
        }}>{f.emoji}</div>
      ))}

      {/* Emoji bar — frosted glass */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
        background: 'rgba(8,8,8,0.92)',
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        borderTop: `1px solid ${EK.cardBorder}`,
        display: 'flex', justifyContent: 'space-around', alignItems: 'center',
        padding: '8px 8px max(8px, env(safe-area-inset-bottom))',
      }}>
        {EMOJIS.map(emoji => (
          <button key={emoji} onClick={() => handleTap(emoji)} style={{
            width: 52, height: 52, borderRadius: 14,
            background: cooldown ? `${EK.camel}08` : EK.card,
            border: `1px solid ${tappedEmoji === emoji ? EK.camel : EK.cardBorder}`,
            fontSize: 24, cursor: cooldown ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transform: tappedEmoji === emoji ? 'scale(1.25)' : 'scale(1)',
            transition: 'transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1), border-color 0.2s ease',
            opacity: cooldown ? 0.5 : 1,
          }}>{emoji}</button>
        ))}
        {/* Cooldown bar */}
        {cooldown && (
          <div style={{
            position: 'absolute', top: -2, left: 0, right: 0, height: 2,
            background: `linear-gradient(90deg, ${EK.camel}, ${EK.green})`,
            animation: 'ek-cooldown 1s linear forwards',
          }} />
        )}
      </div>

      <style>{`
        @keyframes ek-float-up {
          0% { transform: translateY(0) scale(1); opacity: 1; }
          100% { transform: translateY(-300px) scale(1.5); opacity: 0; }
        }
        @keyframes ek-cooldown {
          0% { transform: scaleX(1); transform-origin: left; }
          100% { transform: scaleX(0); transform-origin: left; }
        }
      `}</style>
    </>
  )
}
