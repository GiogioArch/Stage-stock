import React, { useState, useEffect, useRef, useCallback } from 'react'
import { createRealtimeWs } from '../lib/supabase'
import { EK } from './LiveApp'

export default function LiveDisplay() {
  const [emojis, setEmojis] = useState([])
  const [emojiCounts, setEmojiCounts] = useState({})
  const [totalCount, setTotalCount] = useState(0)
  const nextId = useRef(0)
  const containerRef = useRef(null)

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
        setTimeout(() => { setEmojis(prev => prev.filter(e => e.id !== id)) }, 3000)
      }
    )
    return cleanup
  }, [])

  return (
    <div ref={containerRef} onClick={requestFullscreen} style={{
      position: 'fixed', inset: 0,
      background: '#000000',
      overflow: 'hidden',
      fontFamily: "'Inter', sans-serif",
      cursor: 'pointer',
    }}>
      {/* Branding */}
      <div style={{
        position: 'absolute', top: 24, left: 24,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <img
          src="https://images.squarespace-cdn.com/content/6674cfe71695a578165178c4/2bae59e9-2a91-41ba-80db-8bc7f5aba758/Logo+EK25+Ce%CC%81le%CC%81bration-09.png?content-type=image%2Fpng"
          alt="EK 25"
          style={{ height: 50, objectFit: 'contain', opacity: 0.8 }}
        />
        <div>
          <div style={{
            fontSize: 10, color: EK.camel, letterSpacing: '0.2em',
            textTransform: 'uppercase', fontWeight: 700,
          }}>Réactions du public</div>
        </div>
      </div>

      {/* Counters */}
      <div style={{
        position: 'absolute', top: 24, right: 24,
        display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end',
      }}>
        <div style={{
          padding: '12px 24px', borderRadius: 8,
          background: EK.card, backdropFilter: 'blur(8px)',
          color: EK.text, fontSize: 28, fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 10,
          border: `1px solid ${EK.cardBorder}`,
        }}>
          <span style={{ fontSize: 28 }}>🔥</span>
          {totalCount}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {Object.entries(emojiCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([emoji, count]) => (
              <div key={emoji} style={{
                padding: '6px 12px', borderRadius: 10,
                background: EK.card, border: `1px solid ${EK.cardBorder}`,
                color: EK.text, fontSize: 14, fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <span style={{ fontSize: 18 }}>{emoji}</span>
                {count}
              </div>
            ))}
        </div>
      </div>

      {/* Floating emojis */}
      {emojis.map(e => (
        <div key={e.id} style={{
          position: 'absolute', bottom: 0, left: `${e.left}%`,
          fontSize: e.size,
          animation: 'display-float 3s ease-out forwards',
          pointerEvents: 'none',
        }}>{e.emoji}</div>
      ))}

      {/* Tap hint */}
      <div style={{
        position: 'absolute', bottom: 30, left: 0, right: 0,
        textAlign: 'center', color: EK.textMuted, fontSize: 12, fontWeight: 600,
        animation: 'ek-fade-hint 5s forwards', letterSpacing: '0.1em',
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
