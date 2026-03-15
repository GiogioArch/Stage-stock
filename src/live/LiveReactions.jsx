import React, { useState, useRef, useCallback } from 'react'
import { db } from '../lib/supabase'

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

    // Haptic feedback
    if (navigator.vibrate) navigator.vibrate(50)

    // Scale bounce feedback
    setTappedEmoji(emoji)
    setTimeout(() => setTappedEmoji(null), 200)

    // Cooldown visual
    setCooldown(true)
    setTimeout(() => setCooldown(false), COOLDOWN_MS)

    // Float-up animation
    const id = nextId.current++
    const left = 10 + Math.random() * 80
    setFloaters(prev => [...prev, { id, emoji, left }])
    setTimeout(() => {
      setFloaters(prev => prev.filter(f => f.id !== id))
    }, 2000)

    // Insert reaction (fire and forget)
    try {
      db.insert('live_reactions', {
        event_id: eventId,
        fan_id: fanId,
        emoji,
      })
    } catch { /* ignore */ }
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

      {/* Emoji bar */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
        background: 'rgba(26,21,32,0.95)', backdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', justifyContent: 'space-around', alignItems: 'center',
        padding: '8px 0 max(8px, env(safe-area-inset-bottom))',
      }}>
        {EMOJIS.map(emoji => (
          <button key={emoji} onClick={() => handleTap(emoji)} style={{
            width: 54, height: 54, borderRadius: 16,
            background: cooldown ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.1)',
            fontSize: 26, cursor: cooldown ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transform: tappedEmoji === emoji ? 'scale(1.3)' : 'scale(1)',
            transition: 'transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)',
            opacity: cooldown ? 0.5 : 1,
          }}>{emoji}</button>
        ))}
        {/* Cooldown indicator */}
        {cooldown && (
          <div style={{
            position: 'absolute', top: -2, left: 0, right: 0, height: 2,
            background: '#E8735A',
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
