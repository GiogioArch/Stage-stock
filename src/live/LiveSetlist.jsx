import React, { useState, useEffect, useCallback } from 'react'
import { safe, db, createRealtimeWs } from '../lib/supabase'
import { EK } from './LiveApp'

export default function LiveSetlist({ eventId, fanId }) {
  const [songs, setSongs] = useState([])
  const [votes, setVotes] = useState({})
  const [myVotes, setMyVotes] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [wsStatus, setWsStatus] = useState('connecting')
  const [totalVoters, setTotalVoters] = useState(0)

  const loadData = useCallback(async () => {
    try {
      const songsData = await safe('live_songs', `event_id=eq.${eventId}&order=title.asc`)
      setSongs(songsData || [])

      const votesData = await safe('live_votes', `event_id=eq.${eventId}`)
      const counts = {}
      const mine = new Set()
      const uniqueFans = new Set()
      ;(votesData || []).forEach(v => {
        counts[v.song_id] = (counts[v.song_id] || 0) + 1
        uniqueFans.add(v.fan_id)
        if (v.fan_id === fanId) mine.add(v.song_id)
      })
      setVotes(counts)
      setMyVotes(mine)
      setTotalVoters(uniqueFans.size)
    } catch { /* ignore */ }
    setLoading(false)
  }, [eventId, fanId])

  useEffect(() => { loadData() }, [loadData])

  // Realtime
  useEffect(() => {
    let pollInterval = null
    const cleanup = createRealtimeWs(
      `realtime:public:live_votes:event_id=eq.${eventId}`,
      (row) => {
        setVotes(prev => ({ ...prev, [row.song_id]: (prev[row.song_id] || 0) + 1 }))
        if (row.fan_id === fanId) setMyVotes(prev => new Set([...prev, row.song_id]))
        setTotalVoters(prev => prev + 1)
      },
      (status) => {
        setWsStatus(status)
        if (status === 'disconnected' && !pollInterval) pollInterval = setInterval(loadData, 10000)
        if (status === 'connected' && pollInterval) { clearInterval(pollInterval); pollInterval = null }
      }
    )
    return () => { cleanup(); if (pollInterval) clearInterval(pollInterval) }
  }, [eventId, fanId, loadData])

  const handleVote = async (songId) => {
    if (myVotes.has(songId)) return
    setMyVotes(prev => new Set([...prev, songId]))
    setVotes(prev => ({ ...prev, [songId]: (prev[songId] || 0) + 1 }))
    try {
      await db.insert('live_votes', { event_id: eventId, song_id: songId, fan_id: fanId })
    } catch {
      setMyVotes(prev => { const n = new Set(prev); n.delete(songId); return n })
      setVotes(prev => ({ ...prev, [songId]: Math.max(0, (prev[songId] || 1) - 1) }))
    }
  }

  const sorted = [...songs].sort((a, b) => (votes[b.id] || 0) - (votes[a.id] || 0))
  const maxVotes = Math.max(1, ...Object.values(votes))

  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center', color: EK.text }}>
      <div className="loader" style={{ margin: '0 auto 12px', borderTopColor: EK.camel, borderColor: `${EK.camel}15` }} />
      <div style={{ fontSize: 12, color: EK.textMuted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Chargement...</div>
    </div>
  )

  return (
    <div style={{ padding: '0 14px 100px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <div style={{
          fontFamily: "'Inter', serif",
          fontSize: 22, fontWeight: 700, color: EK.text,
        }}>Setlist interactive</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{
            width: 7, height: 7, borderRadius: '50%',
            background: wsStatus === 'connected' ? EK.green : wsStatus === 'connecting' ? EK.camel : '#666',
            boxShadow: wsStatus === 'connected' ? `0 0 8px ${EK.green}90` : 'none',
            animation: wsStatus === 'connected' ? 'ek-pulse 2s infinite' : 'none',
          }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: wsStatus === 'connected' ? EK.green : EK.textMuted, letterSpacing: '0.05em' }}>
            {wsStatus === 'connected' ? 'En direct' : wsStatus === 'connecting' ? 'Connexion...' : 'Hors ligne'}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: EK.textDim, fontWeight: 300 }}>
          Vote pour les titres que tu veux entendre !
        </div>
        {totalVoters > 0 && (
          <div style={{
            padding: '3px 10px', borderRadius: 6,
            background: EK.card, border: `1px solid ${EK.cardBorder}`,
            color: EK.camel, fontSize: 10, fontWeight: 700, letterSpacing: '0.05em',
          }}>
            {totalVoters} fan{totalVoters > 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Songs list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sorted.map((song, i) => {
          const count = votes[song.id] || 0
          const voted = myVotes.has(song.id)
          const played = song.is_played
          const pct = maxVotes > 0 ? (count / maxVotes) * 100 : 0

          return (
            <div key={song.id} style={{
              background: EK.card, borderRadius: 8, padding: '14px 14px',
              border: `1px solid ${voted ? EK.camel + '50' : EK.cardBorder}`,
              opacity: played ? 0.45 : 1,
              position: 'relative', overflow: 'hidden',
              transition: 'border-color 0.2s ease',
            }}>
              {/* Vote progress bar background */}
              {count > 0 && !played && (
                <div style={{
                  position: 'absolute', top: 0, left: 0, bottom: 0,
                  width: `${pct}%`, background: `${EK.camel}08`,
                  transition: 'width 0.4s ease',
                }} />
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative', zIndex: 1 }}>
                {/* Rank */}
                <div style={{
                  width: 30, height: 30, borderRadius: 8,
                  background: played ? `${EK.green}15` : `${EK.camel}15`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 600,
                  color: played ? EK.green : (i < 3 ? EK.camel : EK.textMuted),
                }}>
                  {played ? '✓' : i + 1}
                </div>
                {/* Song info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 14, fontWeight: 600, color: EK.text,
                    textDecoration: played ? 'line-through' : 'none',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {song.title}
                  </div>
                  {song.artist && (
                    <div style={{ fontSize: 11, color: EK.textMuted, marginTop: 1 }}>{song.artist}</div>
                  )}
                </div>
                {/* Vote count + button */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: EK.camel, minWidth: 20, textAlign: 'center' }}>
                    {count || ''}
                  </span>
                  {!played && (
                    <button onClick={() => handleVote(song.id)} disabled={voted} style={{
                      padding: '8px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700,
                      cursor: voted ? 'default' : 'pointer',
                      background: voted ? EK.camel : 'rgba(197,165,90,0.12)',
                      color: voted ? EK.bleu : EK.camel,
                      border: voted ? `1px solid ${EK.camel}` : `1px solid ${EK.camel}40`,
                      minWidth: 44, minHeight: 44,
                      letterSpacing: '0.05em',
                      transition: 'all 0.2s ease',
                    }}>
                      {voted ? '✓' : '♪'}
                    </button>
                  )}
                  {played && (
                    <span style={{
                      padding: '4px 10px', borderRadius: 6, fontSize: 9, fontWeight: 700,
                      background: `${EK.green}15`, color: EK.green,
                      letterSpacing: '0.08em', textTransform: 'uppercase',
                    }}>Joué</span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {songs.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: EK.textMuted }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}></div>
          <div style={{ fontSize: 13, fontWeight: 300 }}>Pas encore de setlist pour cet event</div>
        </div>
      )}

      {wsStatus === 'disconnected' && (
        <div style={{
          marginTop: 12, padding: '8px 14px', borderRadius: 10, textAlign: 'center',
          background: EK.card, border: `1px solid ${EK.cardBorder}`,
          color: EK.camel, fontSize: 11, fontWeight: 600,
        }}>
          Connexion temps réel perdue — mise à jour auto toutes les 10s
        </div>
      )}

      <style>{`
        @keyframes ek-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  )
}
