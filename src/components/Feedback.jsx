import React, { useState } from 'react'
import { db, safe } from '../lib/supabase'
import { MessageSquare, Send, X, ThumbsUp, ThumbsDown, Meh, Loader2, CheckCircle } from 'lucide-react'

const MOODS = [
  { id: 'bad', icon: ThumbsDown, color: '#D4648A', label: 'Difficile' },
  { id: 'ok', icon: Meh, color: '#E8935A', label: 'Moyen' },
  { id: 'good', icon: ThumbsUp, color: '#5DAB8B', label: 'Facile' },
]

// Lightweight feedback widget — appears as a floating button
// Stores feedback in Supabase table 'feedback' (will be created if needed)
export default function Feedback({ user, orgId, context }) {
  const [open, setOpen] = useState(false)
  const [mood, setMood] = useState(null)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async () => {
    if (!mood && !message.trim()) return
    setSending(true)
    try {
      await db.insert('feedback', {
        user_id: user?.id,
        org_id: orgId || null,
        mood: mood,
        message: message.trim(),
        context: context || null, // e.g. 'packing-list', 'stock', 'concert'
        page_url: window.location.pathname,
        user_agent: navigator.userAgent.slice(0, 200),
      })
    } catch {
      // Table might not exist — store locally as fallback
      try {
        const existing = JSON.parse(localStorage.getItem('ss_feedback') || '[]')
        existing.push({
          mood, message: message.trim(), context, date: new Date().toISOString(),
        })
        localStorage.setItem('ss_feedback', JSON.stringify(existing))
      } catch { /* silent */ }
    }
    setSending(false)
    setSent(true)
    setTimeout(() => { setSent(false); setOpen(false); setMood(null); setMessage('') }, 2000)
  }

  // Floating button
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        aria-label="Donner un avis"
        style={{
          position: 'fixed', bottom: 80, right: 16, zIndex: 90,
          width: 44, height: 44, borderRadius: 22,
          background: '#5B8DB8', color: 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(91,141,184,0.3)',
          border: 'none', cursor: 'pointer',
          transition: 'transform 0.2s',
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        <MessageSquare size={20} />
      </button>
    )
  }

  return (
    <div style={{
      position: 'fixed', bottom: 80, right: 16, zIndex: 90,
      width: 280, borderRadius: 16, background: '#FFFFFF',
      border: '1px solid #E2E8F0', boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
      padding: '16px', animation: 'slideUp 0.2s ease-out',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#1E293B' }}>
          {sent ? <><CheckCircle size={14} color="#5DAB8B" style={{ verticalAlign: 'middle', marginRight: 4 }} />Merci !</> : 'Ton avis compte'}
        </span>
        <button onClick={() => setOpen(false)} aria-label="Fermer" style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 4,
        }}>
          <X size={16} color="#94A3B8" />
        </button>
      </div>

      {sent ? (
        <p style={{ fontSize: 13, color: '#5DAB8B', textAlign: 'center', padding: '8px 0' }}>
          Feedback enregistré. Ça nous aide à améliorer BackStage !
        </p>
      ) : (
        <>
          {/* Mood selector */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {MOODS.map(m => {
              const Icon = m.icon
              const isSelected = mood === m.id
              return (
                <button
                  key={m.id}
                  onClick={() => setMood(mood === m.id ? null : m.id)}
                  style={{
                    flex: 1, padding: '10px 6px', borderRadius: 10, cursor: 'pointer',
                    border: `2px solid ${isSelected ? m.color : '#E2E8F0'}`,
                    background: isSelected ? `${m.color}10` : '#F8FAFC',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                    transition: 'all 0.15s',
                  }}
                >
                  <Icon size={20} color={isSelected ? m.color : '#94A3B8'} />
                  <span style={{ fontSize: 10, fontWeight: 600, color: isSelected ? m.color : '#94A3B8' }}>
                    {m.label}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Message */}
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Un problème ? Une idée ? Dis-nous tout..."
            style={{
              width: '100%', height: 64, borderRadius: 8, padding: '8px 10px',
              border: '1px solid #E2E8F0', fontSize: 12, color: '#1E293B',
              resize: 'none', fontFamily: 'Inter, sans-serif',
              outline: 'none',
            }}
            onFocus={e => e.target.style.borderColor = '#5B8DB8'}
            onBlur={e => e.target.style.borderColor = '#E2E8F0'}
          />

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={(!mood && !message.trim()) || sending}
            style={{
              width: '100%', padding: '10px', borderRadius: 8, marginTop: 8,
              background: (mood || message.trim()) ? '#5B8DB8' : '#CBD5E1',
              color: 'white', fontSize: 13, fontWeight: 600, border: 'none',
              cursor: (mood || message.trim()) ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            {sending ? <><Loader2 size={14} className="spin" /> Envoi...</> : <><Send size={14} /> Envoyer</>}
          </button>
        </>
      )}
    </div>
  )
}
