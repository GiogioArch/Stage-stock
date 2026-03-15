import React, { useState, useEffect, useRef } from 'react'

const SUPABASE_URL = 'https://domuweiczcimqncriykk.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvbXV3ZWljemNpbXFuY3JpeWtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4NTMyMTEsImV4cCI6MjA4ODQyOTIxMX0.fqkP4jYa1Q_Y6jQGDwSV_sAfQV0lkDQvgZI445Q-u30'

export default function LiveDisplay() {
  const [emojis, setEmojis] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const nextId = useRef(0)

  useEffect(() => {
    let ws
    try {
      ws = new WebSocket(`wss://domuweiczcimqncriykk.supabase.co/realtime/v1/websocket?apikey=${SUPABASE_KEY}&vsn=1.0.0`)
      ws.onopen = () => {
        ws.send(JSON.stringify({
          topic: 'realtime:public:live_reactions',
          event: 'phx_join',
          payload: {},
          ref: '1',
        }))
      }
      ws.onmessage = (msg) => {
        try {
          const data = JSON.parse(msg.data)
          if (data.event === 'INSERT') {
            const row = data.payload?.record
            if (row) {
              const id = nextId.current++
              const left = 5 + Math.random() * 90
              const size = 40 + Math.random() * 60
              setEmojis(prev => [...prev, { id, emoji: row.emoji, left, size }])
              setTotalCount(prev => prev + 1)
              // Remove after 3s
              setTimeout(() => {
                setEmojis(prev => prev.filter(e => e.id !== id))
              }, 3000)
            }
          }
          if (data.event === 'heartbeat' || data.ref === 'heartbeat') {
            ws.send(JSON.stringify({ topic: 'phoenix', event: 'heartbeat', payload: {}, ref: 'heartbeat' }))
          }
        } catch { /* ignore */ }
      }
      const hb = setInterval(() => {
        if (ws.readyState === 1) {
          ws.send(JSON.stringify({ topic: 'phoenix', event: 'heartbeat', payload: {}, ref: 'heartbeat' }))
        }
      }, 30000)
      return () => { clearInterval(hb); ws.close() }
    } catch {
      return () => {}
    }
  }, [])

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'transparent',
      overflow: 'hidden',
      fontFamily: "'Nunito', sans-serif",
    }}>
      {/* Total counter */}
      <div style={{
        position: 'absolute', top: 20, right: 20,
        padding: '12px 24px', borderRadius: 16,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
        color: '#F0ECE2', fontSize: 24, fontWeight: 900,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ fontSize: 28 }}>🔥</span>
        {totalCount}
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

      <style>{`
        @keyframes display-float {
          0% { transform: translateY(0) scale(0.5) rotate(0deg); opacity: 0; }
          10% { opacity: 1; transform: translateY(-10vh) scale(1) rotate(5deg); }
          90% { opacity: 0.8; }
          100% { transform: translateY(-100vh) scale(1.2) rotate(-10deg); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
