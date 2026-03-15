import React, { useState, useRef, useCallback } from 'react'
import { db } from '../lib/supabase'

const EMOJIS = ['🔥', '❤️', '🎵', '👏', '🤩']

export default function LiveReactions({ eventId, fanId }) {
  const [floaters, setFloaters] = useState([])
  const lastTap = useRef(0)
  const nextId = useRef(0)

  const handleTap = useCallback((emoji) => {
    const now = Date.now()
    if (now - lastTap.current < 1000) return // throttle 1/sec
    lastTap.current = now

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
        display: 'flex', justifyContent: 'space-around',
        padding: '8px 0 max(8px, env(safe-area-inset-bottom))',
      }}>
        {EMOJIS.map(emoji => (
          <button key={emoji} onClick={() => handleTap(emoji)} style={{
            width: 54, height: 54, borderRadius: 16,
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.1)',
            fontSize: 26, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'transform 0.1s',
          }}>{emoji}</button>
        ))}
      </div>

      <style>{`
        @keyframes ek-float-up {
          0% { transform: translateY(0) scale(1); opacity: 1; }
          100% { transform: translateY(-300px) scale(1.5); opacity: 0; }
        }
      `}</style>
    </>
  )
}
