import React, { useState, useRef, useEffect, createElement } from 'react'
import { MessageCircle, X, Send, Loader2, Music, Sparkles, HelpCircle } from 'lucide-react'

// ─── Design tokens ───
const C = {
  melodie: '#8B5CF6',
  accent: '#6366F1',
  text: '#1E293B',
  textSoft: '#64748B',
  textMuted: '#94A3B8',
  bg: '#FFFFFF',
  surface: '#F8FAFC',
  border: '#E2E8F0',
}

// ─── Quick suggestions by context ───
const SUGGESTIONS = [
  'Comment ajouter un produit ?',
  'Comment preparer un concert ?',
  "C'est quoi la packing list ?",
  'Comment gerer mon equipe ?',
]

// ─── Melodie avatar ───
function Avatar({ size = 32 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size / 2,
      background: `linear-gradient(135deg, ${C.melodie}, ${C.accent})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      {createElement(Music, { size: size * 0.5, color: 'white' })}
    </div>
  )
}

export default function MelodieChat({ user, userRole, orgName, events, data }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [pulse, setPulse] = useState(true)
  const scrollRef = useRef(null)
  const inputRef = useRef(null)

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, loading])

  // Focus input when chat opens
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 200)
    }
  }, [open])

  // Welcome message on first open
  useEffect(() => {
    if (open && messages.length === 0) {
      const name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || ''
      setMessages([{
        role: 'assistant',
        content: `Salut${name ? ` ${name}` : ''} ! Je suis **Melodie**, ton assistante Stage Stock.\n\nJe peux t'aider avec :\n- Le stock et les mouvements\n- La preparation des concerts\n- La gestion d'equipe\n- Le merchandising et les previsions\n\nPose-moi ta question !`,
      }])
    }
  }, [open])

  // Build user context for the API
  const buildContext = () => {
    const ctx = {}
    const name = user?.user_metadata?.full_name || user?.email?.split('@')[0]
    if (name) ctx.name = name
    if (userRole) ctx.role = userRole
    if (orgName) ctx.project = orgName
    if (events?.length) {
      const next = events.find(e => e.date >= new Date().toISOString().split('T')[0])
      if (next) ctx.nextEvent = `${next.name || next.lieu} le ${next.date}`
    }
    // Add some stats if available
    const stats = []
    if (data?.products?.length) stats.push(`${data.products.length} articles`)
    if (data?.locations?.length) stats.push(`${data.locations.length} depots`)
    if (events?.length) stats.push(`${events.length} evenements`)
    if (stats.length) ctx.stats = stats.join(', ')
    return ctx
  }

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || loading) return

    setPulse(false)
    const userMsg = { role: 'user', content: text }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      // Call the Pages Function API
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          userContext: buildContext(),
        }),
      })

      const data = await res.json()
      setMessages([...newMessages, {
        role: 'assistant',
        content: data.response || "Desole, je n'ai pas pu repondre.",
      }])
    } catch (e) {
      setMessages([...newMessages, {
        role: 'assistant',
        content: "Probleme de connexion. Verifie ta connexion internet et reessaie.",
      }])
    } finally {
      setLoading(false)
    }
  }

  // ─── Floating button ───
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed', bottom: 80, right: 16, zIndex: 150,
          width: 52, height: 52, borderRadius: 26,
          background: `linear-gradient(135deg, ${C.melodie}, ${C.accent})`,
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 4px 20px ${C.melodie}40`,
          animation: pulse ? 'pulse 2s infinite' : undefined,
        }}
      >
        {createElement(MessageCircle, { size: 24, color: 'white' })}
        {/* Notification dot */}
        {pulse && (
          <span style={{
            position: 'absolute', top: 2, right: 2,
            width: 12, height: 12, borderRadius: 6,
            background: '#10B981', border: '2px solid white',
          }} />
        )}
      </button>
    )
  }

  // ─── Chat window ───
  return (
    <div style={{
      position: 'fixed', bottom: 0, right: 0, zIndex: 250,
      width: '100%', maxWidth: 400, height: '70vh', maxHeight: 540,
      display: 'flex', flexDirection: 'column',
      background: C.bg,
      borderRadius: '20px 20px 0 0',
      boxShadow: '0 -8px 40px rgba(0,0,0,0.15)',
      animation: 'slideUp 0.25s ease',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        background: `linear-gradient(135deg, ${C.melodie}, ${C.accent})`,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <Avatar size={36} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'white' }}>Melodie</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>Assistante Stage Stock</div>
        </div>
        <button onClick={() => setOpen(false)} style={{
          width: 32, height: 32, borderRadius: 8,
          background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {createElement(X, { size: 18, color: 'white' })}
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} style={{
        flex: 1, overflowY: 'auto', padding: 12,
        WebkitOverflowScrolling: 'touch',
      }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            display: 'flex', gap: 8, marginBottom: 10,
            flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
            alignItems: 'flex-end',
          }}>
            {msg.role === 'assistant' && <Avatar size={26} />}
            <div style={{
              maxWidth: '80%', padding: '10px 14px',
              borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
              background: msg.role === 'user' ? `${C.accent}12` : C.surface,
              border: `1px solid ${msg.role === 'user' ? `${C.accent}20` : C.border}`,
              fontSize: 13, lineHeight: 1.5, color: C.text,
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            }}>
              {formatMessage(msg.content)}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'flex-end' }}>
            <Avatar size={26} />
            <div style={{
              padding: '10px 14px', borderRadius: '14px 14px 14px 4px',
              background: C.surface, border: `1px solid ${C.border}`,
            }}>
              <div style={{ display: 'flex', gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: 3, background: C.melodie, animation: 'bounce 1s infinite', animationDelay: '0s' }} />
                <span style={{ width: 6, height: 6, borderRadius: 3, background: C.melodie, animation: 'bounce 1s infinite', animationDelay: '0.15s' }} />
                <span style={{ width: 6, height: 6, borderRadius: 3, background: C.melodie, animation: 'bounce 1s infinite', animationDelay: '0.3s' }} />
              </div>
            </div>
          </div>
        )}

        {/* Quick suggestions (only on welcome) */}
        {messages.length <= 1 && !loading && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {SUGGESTIONS.map((s, i) => (
              <button key={i} onClick={() => { setInput(s); inputRef.current?.focus() }} style={{
                padding: '6px 12px', borderRadius: 20,
                background: `${C.melodie}08`, border: `1px solid ${C.melodie}20`,
                fontSize: 11, color: C.melodie, fontWeight: 500, cursor: 'pointer',
              }}>
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{
        padding: '10px 12px', borderTop: `1px solid ${C.border}`,
        background: C.surface, display: 'flex', gap: 8, alignItems: 'center',
        paddingBottom: 'max(10px, env(safe-area-inset-bottom))',
      }}>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          placeholder="Pose ta question..."
          disabled={loading}
          style={{
            flex: 1, padding: '10px 14px', borderRadius: 12,
            border: `1px solid ${C.border}`, background: C.bg,
            fontSize: 14, color: C.text, outline: 'none',
          }}
        />
        <button onClick={sendMessage} disabled={!input.trim() || loading} style={{
          width: 40, height: 40, borderRadius: 12,
          background: input.trim() ? C.accent : C.border,
          border: 'none', cursor: input.trim() ? 'pointer' : 'default',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.15s',
        }}>
          {loading
            ? createElement(Loader2, { size: 18, color: 'white', className: 'spin' })
            : createElement(Send, { size: 18, color: 'white' })
          }
        </button>
      </div>
    </div>
  )
}

// ─── Simple markdown-ish formatting ───
function formatMessage(text) {
  if (!text) return null
  // Bold **text**
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    return <span key={i}>{part}</span>
  })
}
