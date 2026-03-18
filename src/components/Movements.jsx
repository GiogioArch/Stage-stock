import React, { useState, useMemo } from 'react'
import { getMoveConf, fmtDate, Badge } from './UI'
import { ArrowDownToLine, ArrowUpFromLine, RefreshCw, Search, X, Filter, ClipboardList } from 'lucide-react'

export default function Movements({ movements, products, locations, onToast }) {
  const [typeFilter, setTypeFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const pName = (id) => products.find(p => p.id === id)?.name || '?'
  const lName = (id) => locations.find(l => l.id === id)?.name || '?'

  const filtered = useMemo(() => {
    let list = [...movements]
    if (typeFilter !== 'all') list = list.filter(m => m.type === typeFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(m => {
        const name = pName(m.product_id).toLowerCase()
        const from = lName(m.from_loc).toLowerCase()
        const to = lName(m.to_loc).toLowerCase()
        return name.includes(q) || from.includes(q) || to.includes(q)
      })
    }
    if (dateFrom) list = list.filter(m => m.created_at >= dateFrom)
    if (dateTo) list = list.filter(m => m.created_at <= dateTo + 'T23:59:59')
    return list
  }, [movements, typeFilter, search, dateFrom, dateTo])

  const totalIn = filtered.filter(m => m.type === 'in').reduce((s, m) => s + (m.quantity || 0), 0)
  const totalOut = filtered.filter(m => m.type === 'out').reduce((s, m) => s + (m.quantity || 0), 0)
  const totalTransfer = filtered.filter(m => m.type === 'transfer').reduce((s, m) => s + (m.quantity || 0), 0)

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

  const MOVE_ICONS = { in: ArrowDownToLine, out: ArrowUpFromLine, transfer: RefreshCw }

  return (
    <div style={{ padding: '0 16px 24px' }}>
      {/* Header stats */}
      <div className="card" style={{ marginBottom: 16, padding: '16px' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#1E293B', marginBottom: 10 }}>
          Historique ({filtered.length} mouvement{filtered.length > 1 ? 's' : ''})
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <StatPill Icon={ArrowDownToLine} value={totalIn} label="Entrées" color="#5DAB8B" />
          <StatPill Icon={ArrowUpFromLine} value={totalOut} label="Sorties" color="#D4648A" />
          <StatPill Icon={RefreshCw} value={totalTransfer} label="Transferts" color="#5B8DB8" />
        </div>
      </div>

      {/* Search + filter toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <div className="search-bar" style={{ flex: 1, marginBottom: 0 }}>
          <span className="search-icon"><Search size={16} /></span>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher produit, lieu..."
          />
        </div>
        <button onClick={() => setShowFilters(!showFilters)} style={{
          width: 40, height: 40, borderRadius: 6,
          background: showFilters ? 'rgba(91,141,184,0.12)' : '#F8FAFC',
          border: `1px solid ${showFilters ? 'rgba(91,141,184,0.2)' : '#E2E8F0'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}>
          {showFilters ? <X size={16} color="#A5B4FC" /> : <Filter size={16} color="#94A3B8" />}
        </button>
      </div>

      {/* Expanded filters */}
      {showFilters && (
        <div className="card" style={{ marginBottom: 12, padding: '12px 14px' }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: '#94A3B8', marginBottom: 8 }}>Filtres avancés</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, color: '#CBD5E1', fontWeight: 500 }}>Du</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="input" style={{ marginTop: 4 }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, color: '#CBD5E1', fontWeight: 500 }}>Au</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="input" style={{ marginTop: 4 }} />
            </div>
          </div>
          {(dateFrom || dateTo || typeFilter !== 'all' || search) && (
            <button onClick={() => { setDateFrom(''); setDateTo(''); setTypeFilter('all'); setSearch('') }}
              style={{ fontSize: 12, color: '#D4648A', fontWeight: 500, padding: '4px 0' }}>
              Réinitialiser les filtres
            </button>
          )}
        </div>
      )}

      {/* Type filter pills */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, overflowX: 'auto' }}>
        {[
          { id: 'all', label: 'Tous', color: '#1E293B' },
          { id: 'in', label: 'Entrées', color: '#5DAB8B', Icon: ArrowDownToLine },
          { id: 'out', label: 'Sorties', color: '#D4648A', Icon: ArrowUpFromLine },
          { id: 'transfer', label: 'Transferts', color: '#5B8DB8', Icon: RefreshCw },
        ].map(f => (
          <button key={f.id} onClick={() => setTypeFilter(f.id)} style={{
            padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500,
            whiteSpace: 'nowrap', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 4,
            background: typeFilter === f.id ? `${f.color}15` : 'transparent',
            color: typeFilter === f.id ? f.color : '#94A3B8',
            border: `1px solid ${typeFilter === f.id ? f.color + '30' : '#E2E8F0'}`,
          }}>
            {f.Icon && <f.Icon size={12} />}
            {f.label}
          </button>
        ))}
      </div>

      {/* Movement list grouped by date */}
      {filtered.length === 0 ? (
        <div className="empty-state" style={{ padding: 40 }}>
          <div className="empty-icon"><ClipboardList size={28} /></div>
          <div className="empty-text">Aucun mouvement trouvé</div>
        </div>
      ) : (
        grouped.map(([day, moves]) => (
          <div key={day} style={{ marginBottom: 16 }}>
            <div style={{
              fontSize: 12, fontWeight: 600, color: '#94A3B8', marginBottom: 8,
              textTransform: 'capitalize',
            }}>{formatDay(day)}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {moves.map(m => {
                const conf = getMoveConf(m.type)
                const MoveIcon = MOVE_ICONS[m.type] || RefreshCw
                return (
                  <div key={m.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px' }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 8, background: conf.bg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}><MoveIcon size={16} color={conf.color} /></div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#1E293B' }}>
                        {pName(m.product_id)}
                      </div>
                      <div style={{ fontSize: 11, color: '#94A3B8' }}>
                        {m.type === 'transfer'
                          ? `${lName(m.from_loc)} → ${lName(m.to_loc)}`
                          : m.type === 'in'
                            ? `→ ${lName(m.to_loc)}`
                            : `${lName(m.from_loc)} →`
                        }
                      </div>
                      {m.note && (
                        <div style={{ fontSize: 10, color: '#CBD5E1', marginTop: 2, fontStyle: 'italic' }}>
                          {m.note}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: conf.color }}>
                        {m.type === 'out' ? '−' : '+'}{m.quantity}
                      </div>
                      <div style={{ fontSize: 10, color: '#CBD5E1' }}>
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

function StatPill({ Icon, value, label, color }) {
  return (
    <div style={{
      flex: 1, textAlign: 'center', padding: '8px 4px',
      background: '#F1F5F9', borderRadius: 8, border: '1px solid #E2E8F0',
    }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 2 }}><Icon size={14} color={color} /></div>
      <div style={{ fontSize: 15, fontWeight: 600, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 9, color: '#94A3B8', fontWeight: 500, marginTop: 2 }}>{label}</div>
    </div>
  )
}
