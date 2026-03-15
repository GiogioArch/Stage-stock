import React, { useState, useEffect, useCallback } from 'react'
import { safe, db, createRealtimeWs } from '../lib/supabase'

export default function LiveSetlist({ eventId, fanId }) {
  const [songs, setSongs] = useState([])
  const [votes, setVotes] = useState({}) // song_id → count
  const [myVotes, setMyVotes] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [wsStatus, setWsStatus] = useState('connecting') // connecting | connected | disconnected
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

  // Realtime subscription with shared helper
  useEffect(() => {
    let pollInterval = null

    const cleanup = createRealtimeWs(
      `realtime:public:live_votes:event_id=eq.${eventId}`,
      (row) => {
        setVotes(prev => ({ ...prev, [row.song_id]: (prev[row.song_id] || 0) + 1 }))
        if (row.fan_id === fanId) setMyVotes(prev => new Set([...prev, row.song_id]))
        setTotalVoters(prev => prev + 1) // approximate — may count same fan twice but good enough for display
      },
      (status) => {
        setWsStatus(status)
        // Fallback polling if WS disconnects
        if (status === 'disconnected' && !pollInterval) {
          pollInterval = setInterval(loadData, 10000)
        }
        if (status === 'connected' && pollInterval) {
          clearInterval(pollInterval)
          pollInterval = null
        }
      }
    )

    return () => {
      cleanup()
      if (pollInterval) clearInterval(pollInterval)
    }
  }, [eventId, fanId, loadData])

  const handleVote = async (songId) => {
    if (myVotes.has(songId)) return
    setMyVotes(prev => new Set([...prev, songId]))
    setVotes(prev => ({ ...prev, [songId]: (prev[songId] || 0) + 1 }))
    try {
      await db.insert('live_votes', { event_id: eventId, song_id: songId, fan_id: fanId })
    } catch {
      // Undo optimistic update on error (likely duplicate)
      setMyVotes(prev => { const n = new Set(prev); n.delete(songId); return n })
      setVotes(prev => ({ ...prev, [songId]: Math.max(0, (prev[songId] || 1) - 1) }))
    }
  }

  // Sort by votes descending
  const sorted = [...songs].sort((a, b) => (votes[b.id] || 0) - (votes[a.id] || 0))

  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#F0ECE2' }}>
      <div className="loader" style={{ margin: '0 auto 12px', borderTopColor: '#E8735A', borderColor: 'rgba(240,236,226,0.15)' }} />
      Chargement...
    </div>
  )

  return (
    <div style={{ padding: '0 16px 100px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <div style={{ fontSize: 18, fontWeight: 900, color: '#F0ECE2' }}>
          Setlist interactive
        </div>
        {/* Live indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: wsStatus === 'connected' ? '#5DAB8B' : wsStatus === 'connecting' ? '#E8935A' : '#D4648A',
            boxShadow: wsStatus === 'connected' ? '0 0 8px rgba(93,171,139,0.6)' : 'none',
            animation: wsStatus === 'connected' ? 'ek-pulse 2s infinite' : 'none',
          }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: wsStatus === 'connected' ? '#5DAB8B' : 'rgba(240,236,226,0.4)' }}>
            {wsStatus === 'connected' ? 'En direct' : wsStatus === 'connecting' ? 'Connexion...' : 'Hors ligne'}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: 'rgba(240,236,226,0.5)' }}>
          Vote pour les titres que tu veux entendre !
        </div>
        {totalVoters > 0 && (
          <div style={{
            padding: '3px 10px', borderRadius: 8,
            background: 'rgba(232,115,90,0.12)', border: '1px solid rgba(232,115,90,0.25)',
            color: '#E8735A', fontSize: 11, fontWeight: 800,
          }}>
            {totalVoters} fan{totalVoters > 1 ? 's' : ''}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sorted.map((song, i) => {
          const count = votes[song.id] || 0
          const voted = myVotes.has(song.id)
          const played = song.is_played

          return (
            <div key={song.id} style={{
              background: played ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.08)',
              borderRadius: 14, padding: '14px 16px',
              border: voted ? '1.5px solid #E8735A50' : '1px solid rgba(255,255,255,0.06)',
              opacity: played ? 0.5 : 1,
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 10,
                background: played ? 'rgba(255,255,255,0.05)' : 'rgba(232,115,90,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 900, color: played ? 'rgba(240,236,226,0.3)' : '#E8735A',
              }}>
                {played ? '✓' : i + 1}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 14, fontWeight: 700, color: '#F0ECE2',
                  textDecoration: played ? 'line-through' : 'none',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {song.title}
                </div>
                {song.artist && (
                  <div style={{ fontSize: 11, color: 'rgba(240,236,226,0.4)', marginTop: 1 }}>{song.artist}</div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: '#E8735A', minWidth: 24, textAlign: 'center' }}>
                  {count}
                </span>
                {!played && (
                  <button onClick={() => handleVote(song.id)} disabled={voted} style={{
                    padding: '8px 14px', borderRadius: 10, fontSize: 12, fontWeight: 800,
                    cursor: voted ? 'default' : 'pointer',
                    background: voted ? 'rgba(232,115,90,0.2)' : '#E8735A',
                    color: voted ? '#E8735A' : 'white',
                    border: 'none', minWidth: 48, minHeight: 48,
                  }}>
                    {voted ? '✓' : '🎵'}
                  </button>
                )}
                {played && (
                  <span style={{
                    padding: '4px 10px', borderRadius: 8, fontSize: 10, fontWeight: 800,
                    background: 'rgba(93,171,139,0.15)', color: '#5DAB8B',
                  }}>Joué</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {songs.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: 'rgba(240,236,226,0.4)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎵</div>
          Pas encore de setlist pour cet event
        </div>
      )}

      {/* Fallback polling notice */}
      {wsStatus === 'disconnected' && (
        <div style={{
          marginTop: 12, padding: '8px 14px', borderRadius: 10, textAlign: 'center',
          background: 'rgba(212,100,138,0.1)', border: '1px solid rgba(212,100,138,0.2)',
          color: '#D4648A', fontSize: 11, fontWeight: 700,
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
