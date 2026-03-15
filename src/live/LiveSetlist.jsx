import React, { useState, useEffect, useCallback } from 'react'
import { safe, db } from '../lib/supabase'

const SUPABASE_URL = 'https://domuweiczcimqncriykk.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvbXV3ZWljemNpbXFuY3JpeWtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4NTMyMTEsImV4cCI6MjA4ODQyOTIxMX0.fqkP4jYa1Q_Y6jQGDwSV_sAfQV0lkDQvgZI445Q-u30'

export default function LiveSetlist({ eventId, fanId }) {
  const [songs, setSongs] = useState([])
  const [votes, setVotes] = useState({}) // song_id → count
  const [myVotes, setMyVotes] = useState(new Set())
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    try {
      const songsData = await safe('live_songs', `event_id=eq.${eventId}&order=title.asc`)
      setSongs(songsData || [])

      const votesData = await safe('live_votes', `event_id=eq.${eventId}`)
      const counts = {}
      const mine = new Set()
      ;(votesData || []).forEach(v => {
        counts[v.song_id] = (counts[v.song_id] || 0) + 1
        if (v.fan_id === fanId) mine.add(v.song_id)
      })
      setVotes(counts)
      setMyVotes(mine)
    } catch { /* ignore */ }
    setLoading(false)
  }, [eventId, fanId])

  useEffect(() => { loadData() }, [loadData])

  // Realtime subscription
  useEffect(() => {
    let ws
    try {
      ws = new WebSocket(`wss://domuweiczcimqncriykk.supabase.co/realtime/v1/websocket?apikey=${SUPABASE_KEY}&vsn=1.0.0`)
      ws.onopen = () => {
        ws.send(JSON.stringify({
          topic: `realtime:public:live_votes:event_id=eq.${eventId}`,
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
              setVotes(prev => ({ ...prev, [row.song_id]: (prev[row.song_id] || 0) + 1 }))
              if (row.fan_id === fanId) setMyVotes(prev => new Set([...prev, row.song_id]))
            }
          }
          // Respond to heartbeat
          if (data.event === 'heartbeat' || data.ref === 'heartbeat') {
            ws.send(JSON.stringify({ topic: 'phoenix', event: 'heartbeat', payload: {}, ref: 'heartbeat' }))
          }
        } catch { /* ignore */ }
      }
      // Send heartbeat every 30s
      const hb = setInterval(() => {
        if (ws.readyState === 1) {
          ws.send(JSON.stringify({ topic: 'phoenix', event: 'heartbeat', payload: {}, ref: 'heartbeat' }))
        }
      }, 30000)
      return () => { clearInterval(hb); ws.close() }
    } catch {
      // Fallback: poll every 10s
      const interval = setInterval(loadData, 10000)
      return () => clearInterval(interval)
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
      <div style={{ fontSize: 18, fontWeight: 900, color: '#F0ECE2', marginBottom: 4 }}>
        Setlist interactive
      </div>
      <div style={{ fontSize: 12, color: 'rgba(240,236,226,0.5)', marginBottom: 16 }}>
        Vote pour les titres que tu veux entendre !
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
                  }}>Joue</span>
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
    </div>
  )
}
