import React, { useState, useMemo } from 'react'
import { getMoveConf, fmtDate, Badge } from './UI'

export default function Movements({ movements, products, locations, onToast }) {
  const [typeFilter, setTypeFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const pName = (id) => products.find(p => p.id === id)?.name || '?'
  const lName = (id) => locations.find(l => l.id === id)?.name || '?'

  // ─── Filtered movements ───
  const filtered = useMemo(() => {
    let list = [...movements]
    if (typeFilter !== 'all') {
      list = list.filter(m => m.type === typeFilter)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(m => {
        const name = pName(m.product_id).toLowerCase()
        const from = lName(m.from_loc).toLowerCase()
        const to = lName(m.to_loc).toLowerCase()
        return name.includes(q) || from.includes(q) || to.includes(q)
      })
    }
    if (dateFrom) {
      list = list.filter(m => m.created_at >= dateFrom)
    }
    if (dateTo) {
      list = list.filter(m => m.created_at <= dateTo + 'T23:59:59')
    }
    return list
  }, [movements, typeFilter, search, dateFrom, dateTo])

  // ─── Stats ───
  const totalIn = filtered.filter(m => m.type === 'in').reduce((s, m) => s + (m.quantity || 0), 0)
  const totalOut = filtered.filter(m => m.type === 'out').reduce((s, m) => s + (m.quantity || 0), 0)
  const totalTransfer = filtered.filter(m => m.type === 'transfer').reduce((s, m) => s + (m.quantity || 0), 0)

  // ─── Group by date ───
  const grouped = useMemo(() => {
    const groups = {}
    filtered.forEach(m => {
      const day = m.created_at ? m.created_at.split('T')[0] : 'unknown'
      if (!groups[day]) groups[day] = []
      groups[day].push(m)
    })
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
  }, [filtered])

  const formatDay = (iso) => {
    const d = new Date(iso)
    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    if (iso === today) return "Aujourd'hui"
    if (iso === yesterday) return 'Hier'
    return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  }

  return (
    <div style={{ padding: '0 16px 24px' }}>
      {/* ─── Header stats ─── */}
      <div className="card" style={{
        marginBottom: 16, padding: '16px',
        background: 'linear-gradient(135deg, #5B8DB808, #5B8DB818)',
        border: '1.5px solid #5B8DB825',
      }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: '#F0ECE2', marginBottom: 10 }}>
          Historique ({filtered.length} mouvement{filtered.length > 1 ? 's' : ''})
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <StatPill icon="📥" value={totalIn} label="Entrées" color="#2FB65D" />
          <StatPill icon="📤" value={totalOut} label="Sorties" color="#8B1A2B" />
          <StatPill icon="🔄" value={totalTransfer} label="Transferts" color="#5B8DB8" />
        </div>
      </div>

      {/* ─── Search + filter toggle ─── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher produit, lieu..."
          style={{
            flex: 1, padding: '10px 14px', borderRadius: 12,
            border: '1.5px solid #222222', fontSize: 13,
            background: 'white',
          }}
        />
        <button onClick={() => setShowFilters(!showFilters)} style={{
          padding: '10px 14px', borderRadius: 12,
          background: showFilters ? '#5B8DB815' : 'white',
          border: `1.5px solid ${showFilters ? '#5B8DB8' : '#222222'}`,
          fontSize: 16, cursor: 'pointer',
        }}>
          {showFilters ? '✕' : '🔍'}
        </button>
      </div>

      {/* ─── Expanded filters ─── */}
      {showFilters && (
        <div className="card" style={{ marginBottom: 12, padding: '12px 14px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#8A7D75', marginBottom: 8 }}>Filtres avancés</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, color: '#6B6058', fontWeight: 600 }}>Du</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 10, border: '1.5px solid #222222', fontSize: 12 }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, color: '#6B6058', fontWeight: 600 }}>Au</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 10, border: '1.5px solid #222222', fontSize: 12 }} />
            </div>
          </div>
          {(dateFrom || dateTo || typeFilter !== 'all' || search) && (
            <button onClick={() => { setDateFrom(''); setDateTo(''); setTypeFilter('all'); setSearch('') }}
              style={{ fontSize: 12, color: '#8B1A2B', fontWeight: 700, padding: '4px 0' }}>
              Réinitialiser les filtres
            </button>
          )}
        </div>
      )}

      {/* ─── Type filter pills ─── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto' }}>
        {[
          { id: 'all', label: 'Tous', color: '#F0ECE2' },
          { id: 'in', label: '📥 Entrées', color: '#2FB65D' },
          { id: 'out', label: '📤 Sorties', color: '#8B1A2B' },
          { id: 'transfer', label: '🔄 Transferts', color: '#5B8DB8' },
        ].map(f => (
          <button key={f.id} onClick={() => setTypeFilter(f.id)} style={{
            padding: '7px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700,
            whiteSpace: 'nowrap', cursor: 'pointer',
            background: typeFilter === f.id ? `${f.color}15` : 'white',
            color: typeFilter === f.id ? f.color : '#8A7D75',
            border: `1.5px solid ${typeFilter === f.id ? f.color + '30' : '#222222'}`,
          }}>{f.label}</button>
        ))}
      </div>

      {/* ─── Movement list grouped by date ─── */}
      {filtered.length === 0 ? (
        <div className="empty-state" style={{ padding: 40 }}>
          <div className="empty-icon">📋</div>
          <div className="empty-text">Aucun mouvement trouvé</div>
        </div>
      ) : (
        grouped.map(([day, moves]) => (
          <div key={day} style={{ marginBottom: 16 }}>
            <div style={{
              fontSize: 12, fontWeight: 800, color: '#8A7D75', marginBottom: 8,
              textTransform: 'capitalize',
            }}>{formatDay(day)}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {moves.map(m => {
                const conf = getMoveConf(m.type)
                return (
                  <div key={m.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px' }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: 10, background: conf.bg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                      flexShrink: 0,
                    }}>{conf.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {pName(m.product_id)}
                      </div>
                      <div style={{ fontSize: 11, color: '#8A7D75' }}>
                        {m.type === 'transfer'
                          ? `${lName(m.from_loc)} → ${lName(m.to_loc)}`
                          : m.type === 'in'
                            ? `→ ${lName(m.to_loc)}`
                            : `${lName(m.from_loc)} →`
                        }
                      </div>
                      {m.note && (
                        <div style={{ fontSize: 10, color: '#6B6058', marginTop: 2, fontStyle: 'italic' }}>
                          {m.note}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 900, color: conf.color }}>
                        {m.type === 'out' ? '−' : '+'}{m.quantity}
                      </div>
                      <div style={{ fontSize: 10, color: '#6B6058' }}>
                        {m.created_at ? new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))
      )}
    </div>
  )
}

function StatPill({ icon, value, label, color }) {
  return (
    <div style={{
      flex: 1, textAlign: 'center', padding: '8px 4px',
      background: 'white', borderRadius: 10, border: '1px solid #1a1a1a',
    }}>
      <div style={{ fontSize: 10, marginBottom: 2 }}>{icon}</div>
      <div style={{ fontSize: 16, fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 9, color: '#8A7D75', fontWeight: 600, marginTop: 2 }}>{label}</div>
    </div>
  )
}
