import React, { useState, useEffect, useRef, useCallback } from 'react'
import { createRealtimeWs } from '../lib/supabase'

export default function LiveDisplay() {
  const [emojis, setEmojis] = useState([])
  const [emojiCounts, setEmojiCounts] = useState({}) // emoji → count
  const [totalCount, setTotalCount] = useState(0)
  const nextId = useRef(0)
  const containerRef = useRef(null)

  // Auto fullscreen on first click
  const requestFullscreen = useCallback(() => {
    const el = containerRef.current || document.documentElement
    if (el.requestFullscreen) el.requestFullscreen()
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen()
  }, [])

  useEffect(() => {
    const cleanup = createRealtimeWs(
      'realtime:public:live_reactions',
      (row) => {
        const id = nextId.current++
        const left = 5 + Math.random() * 90
        const size = 40 + Math.random() * 60
        setEmojis(prev => [...prev, { id, emoji: row.emoji, left, size }])
        setTotalCount(prev => prev + 1)
        setEmojiCounts(prev => ({ ...prev, [row.emoji]: (prev[row.emoji] || 0) + 1 }))
        setTimeout(() => {
          setEmojis(prev => prev.filter(e => e.id !== id))
        }, 3000)
      }
    )
    return cleanup
  }, [])

  return (
    <div ref={containerRef} onClick={requestFullscreen} style={{
      position: 'fixed', inset: 0,
      background: '#000000',
      overflow: 'hidden',
      fontFamily: "'Nunito', sans-serif",
      cursor: 'pointer',
    }}>
      {/* EK LIVE branding */}
      <div style={{
        position: 'absolute', top: 20, left: 20,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: 14,
          background: 'linear-gradient(135deg, #C5A55A, #A8883D)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, boxShadow: '0 4px 20px rgba(197,165,90,0.4)',
        }}>🎪</div>
        <div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#C5A55A', letterSpacing: 2 }}>EK LIVE</div>
          <div style={{ fontSize: 10, color: 'rgba(240,236,226,0.3)', letterSpacing: 2, textTransform: 'uppercase', fontWeight: 700 }}>
            Réactions du public
          </div>
        </div>
      </div>

      {/* Per-emoji counters */}
      <div style={{
        position: 'absolute', top: 20, right: 20,
        display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end',
      }}>
        {/* Total */}
        <div style={{
          padding: '10px 20px', borderRadius: 14,
          background: 'rgba(197,165,90,0.08)', backdropFilter: 'blur(8px)',
          color: '#F0ECE2', fontSize: 22, fontWeight: 900,
          display: 'flex', alignItems: 'center', gap: 8,
          border: '1px solid rgba(197,165,90,0.15)',
        }}>
          <span style={{ fontSize: 24 }}>🔥</span>
          {totalCount}
        </div>
        {/* Per emoji breakdown */}
        <div style={{ display: 'flex', gap: 6 }}>
          {Object.entries(emojiCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([emoji, count]) => (
              <div key={emoji} style={{
                padding: '6px 10px', borderRadius: 10,
                background: 'rgba(197,165,90,0.15)',
                color: '#F0ECE2', fontSize: 13, fontWeight: 800,
                display: 'flex', alignItems: 'center', gap: 4,
                border: '1px solid rgba(197,165,90,0.08)',
              }}>
                <span style={{ fontSize: 16 }}>{emoji}</span>
                {count}
              </div>
            ))}
        </div>
      </div>

      {/* Floating emojis */}
      {emojis.map(e => (
        <div key={e.id} style={{
          position: 'absolute',
          bottom: 0,
          left: `${e.left}%`,
          fontSize: e.size,
          animation: 'display-float 3s ease-out forwards',
          pointerEvents: 'none',
        }}>{e.emoji}</div>
      ))}

      {/* Tap hint (fades after 5s) */}
      <div style={{
        position: 'absolute', bottom: 30, left: 0, right: 0,
        textAlign: 'center', color: 'rgba(240,236,226,0.2)', fontSize: 12, fontWeight: 700,
        animation: 'ek-fade-hint 5s forwards',
      }}>
        Cliquez pour plein écran
      </div>

      <style>{`
        @keyframes display-float {
          0% { transform: translateY(0) scale(0.5) rotate(0deg); opacity: 0; }
          10% { opacity: 1; transform: translateY(-10vh) scale(1) rotate(5deg); }
          90% { opacity: 0.8; }
          100% { transform: translateY(-100vh) scale(1.2) rotate(-10deg); opacity: 0; }
        }
        @keyframes ek-fade-hint {
          0%, 60% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  )
}
