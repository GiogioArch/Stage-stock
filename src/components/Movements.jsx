import React, { useState, useMemo } from 'react'
import { getMoveConf, fmtDate, Badge, Confirm } from './UI'
import { db } from '../lib/supabase'
import { logAction } from '../lib/auditLog'
import { ArrowDownToLine, ArrowUpFromLine, RefreshCw, Search, X, Filter, ClipboardList, RotateCcw, Download, ChevronDown } from 'lucide-react'
import { exportCSV, todayISO } from '../lib/csvExport'

const PAGE_SIZE = 200

export default function Movements({ movements, setMovements, products, locations, stock, orgId, onReload, onToast }) {
  const [typeFilter, setTypeFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [undoTarget, setUndoTarget] = useState(null)
  const [undoLoading, setUndoLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const hasMore = movements.length > 0 && movements.length % PAGE_SIZE === 0

  const loadMore = async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    try {
      const offset = movements.length
      const more = await db.get('movements', `org_id=eq.${orgId}&order=created_at.desc&limit=${PAGE_SIZE}&offset=${offset}`)
      if (more && more.length > 0 && setMovements) {
        setMovements(prev => [...prev, ...more])
      }
    } catch (e) {
      if (onToast) onToast('Erreur chargement: ' + e.message, '#DC2626')
    } finally {
      setLoadingMore(false)
    }
  }

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

  const { totalIn, totalOut, totalTransfer } = useMemo(() => ({
    totalIn: filtered.filter(m => m.type === 'in').reduce((s, m) => s + (m.quantity || 0), 0),
    totalOut: filtered.filter(m => m.type === 'out').reduce((s, m) => s + (m.quantity || 0), 0),
    totalTransfer: filtered.filter(m => m.type === 'transfer').reduce((s, m) => s + (m.quantity || 0), 0),
  }), [filtered])

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

  // Tolère "[Annulé]" (accent) ou "[Annule]" (sans accent — selon ce que la RPC écrit)
  const isUndoneNote = (note) => !!note && (note.startsWith('[Annulé]') || note.startsWith('[Annule]'))

  const canUndo = (m) => {
    if (!m.created_at) return false
    if (isUndoneNote(m.note)) return false
    if (m.note && m.note.startsWith('Annulation:')) return false
    const age = Date.now() - new Date(m.created_at).getTime()
    return age < 24 * 60 * 60 * 1000
  }

  // Fallback client-side undo (non-atomic) — used only if the RPC is unavailable
  const handleUndoFallback = async (m) => {
    // 1. Create reverse stock movement
    if (m.type === 'in') {
      // Reverse an "in" = take stock out from to_loc
      try { await db.rpc('move_stock', { p_product_id: m.product_id, p_location_id: m.to_loc, p_delta: -m.quantity }) }
      catch {
        const cur = stock.find(s => s.product_id === m.product_id && s.location_id === m.to_loc)?.quantity || 0
        await db.upsert('stock', { product_id: m.product_id, location_id: m.to_loc, quantity: Math.max(0, cur - m.quantity), org_id: orgId })
      }
    } else if (m.type === 'out') {
      // Reverse an "out" = put stock back in from_loc
      try { await db.rpc('move_stock', { p_product_id: m.product_id, p_location_id: m.from_loc, p_delta: m.quantity }) }
      catch {
        const cur = stock.find(s => s.product_id === m.product_id && s.location_id === m.from_loc)?.quantity || 0
        await db.upsert('stock', { product_id: m.product_id, location_id: m.from_loc, quantity: cur + m.quantity, org_id: orgId })
      }
    } else if (m.type === 'transfer') {
      // Reverse transfer = swap from/to
      try {
        await db.rpc('move_stock', { p_product_id: m.product_id, p_location_id: m.to_loc, p_delta: -m.quantity })
        await db.rpc('move_stock', { p_product_id: m.product_id, p_location_id: m.from_loc, p_delta: m.quantity })
      } catch {
        const srcStock = stock.find(s => s.product_id === m.product_id && s.location_id === m.to_loc)?.quantity || 0
        const dstStock = stock.find(s => s.product_id === m.product_id && s.location_id === m.from_loc)?.quantity || 0
        await db.upsert('stock', { product_id: m.product_id, location_id: m.to_loc, quantity: Math.max(0, srcStock - m.quantity), org_id: orgId })
        await db.upsert('stock', { product_id: m.product_id, location_id: m.from_loc, quantity: dstStock + m.quantity, org_id: orgId })
      }
    }

    // 2. Record reverse movement
    const reverseType = m.type === 'in' ? 'out' : m.type === 'out' ? 'in' : 'transfer'
    await db.insert('movements', {
      type: reverseType,
      product_id: m.product_id,
      from_loc: m.type === 'transfer' ? m.to_loc : m.type === 'out' ? null : m.from_loc,
      to_loc: m.type === 'transfer' ? m.from_loc : m.type === 'in' ? null : m.to_loc,
      quantity: m.quantity,
      note: `Annulation: ${m.note || 'mouvement'}`,
      org_id: orgId,
    })

    // 3. Mark original as undone
    await db.update('movements', `id=eq.${m.id}`, {
      note: `[Annulé] ${m.note || ''}`.trim(),
    })
  }

  const handleUndo = async (m) => {
    setUndoLoading(true)
    try {
      // Primary path: atomic RPC (transaction en DB — stock + reverse movement + marquage)
      let usedFallback = false
      try {
        const result = await db.rpc('undo_movement', { p_movement_id: m.id })
        // La RPC renvoie JSON — peut contenir { error: ... } ou { success: true, ... }
        if (result && typeof result === 'object' && result.error) {
          throw new Error(result.error)
        }
      } catch (rpcErr) {
        // Si la RPC n'est pas dispo (404 / fonction inexistante) → fallback client-side
        const msg = String(rpcErr?.message || '')
        const rpcMissing = msg.includes('PGRST202') || msg.includes('not find') || msg.includes('does not exist') || msg.includes('404')
        if (!rpcMissing) throw rpcErr
        usedFallback = true
        await handleUndoFallback(m)
      }

      logAction('movement.undo', {
        orgId,
        targetType: 'movement',
        targetId: m.id,
        details: { original_type: m.type, product_id: m.product_id, quantity: m.quantity, fallback: usedFallback },
      })

      onToast('Mouvement annulé', '#16A34A')
      setUndoTarget(null)
      if (onReload) onReload()
    } catch (e) {
      onToast('Erreur annulation : ' + e.message, '#DC2626')
    } finally {
      setUndoLoading(false)
    }
  }

  return (
    <div style={{ padding: '0 16px 24px' }}>
      {/* Header stats */}
      <div className="card" style={{ marginBottom: 16, padding: '16px' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#1E293B', marginBottom: 4 }}>
          Historique ({filtered.length} mouvement{filtered.length > 1 ? 's' : ''})
        </div>
        <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 8 }}>
          Affichage de {movements.length} mouvement{movements.length > 1 ? 's' : ''}{hasMore ? ' (plus disponibles)' : ''}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <StatPill Icon={ArrowDownToLine} value={totalIn} label="Entrées" color="#16A34A" />
          <StatPill Icon={ArrowUpFromLine} value={totalOut} label="Sorties" color="#DC2626" />
          <StatPill Icon={RefreshCw} value={totalTransfer} label="Transferts" color="#2563EB" />
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
        <button onClick={() => {
          const TYPE_LABELS = { in: 'Entrée', out: 'Sortie', transfer: 'Transfert' }
          exportCSV(filtered, `mouvements-${todayISO()}.csv`, [
            { key: row => row.created_at ? new Date(row.created_at).toLocaleDateString('fr-FR') : '', label: 'Date' },
            { key: row => TYPE_LABELS[row.type] || row.type, label: 'Type' },
            { key: row => pName(row.product_id), label: 'Produit' },
            { key: 'quantity', label: 'Quantité' },
            { key: row => row.from_loc ? lName(row.from_loc) : '', label: 'De' },
            { key: row => row.to_loc ? lName(row.to_loc) : '', label: 'Vers' },
            { key: 'note', label: 'Note' },
          ])
          if (onToast) onToast('Export CSV mouvements téléchargé')
        }} style={{
          width: 40, height: 40, borderRadius: 6,
          background: 'rgba(22,163,106,0.08)',
          border: '1px solid rgba(22,163,106,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }} title="Exporter CSV">
          <Download size={16} color="#16A34A" />
        </button>
        <button onClick={() => setShowFilters(!showFilters)} style={{
          width: 40, height: 40, borderRadius: 6,
          background: showFilters ? 'rgba(99,102,241,0.12)' : '#F8FAFC',
          border: `1px solid ${showFilters ? 'rgba(99,102,241,0.2)' : '#E2E8F0'}`,
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
              style={{ fontSize: 12, color: '#DC2626', fontWeight: 500, padding: '4px 0' }}>
              Réinitialiser les filtres
            </button>
          )}
        </div>
      )}

      {/* Type filter pills */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, overflowX: 'auto' }}>
        {[
          { id: 'all', label: 'Tous', color: '#1E293B' },
          { id: 'in', label: 'Entrées', color: '#16A34A', Icon: ArrowDownToLine },
          { id: 'out', label: 'Sorties', color: '#DC2626', Icon: ArrowUpFromLine },
          { id: 'transfer', label: 'Transferts', color: '#2563EB', Icon: RefreshCw },
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
                const isUndone = isUndoneNote(m.note)
                return (
                  <div key={m.id} className="card" style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                    opacity: isUndone ? 0.45 : 1,
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 8, background: conf.bg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}><MoveIcon size={16} color={conf.color} /></div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        color: '#1E293B',
                        textDecoration: isUndone ? 'line-through' : 'none',
                      }}>
                        {pName(m.product_id)}
                      </div>
                      <div style={{ fontSize: 11, color: '#94A3B8', textDecoration: isUndone ? 'line-through' : 'none' }}>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      {canUndo(m) && (
                        <button
                          onClick={() => setUndoTarget(m)}
                          title="Annuler ce mouvement"
                          style={{
                            width: 30, height: 30, borderRadius: 6,
                            background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', padding: 0,
                          }}
                        >
                          <RotateCcw size={14} color="#DC2626" />
                        </button>
                      )}
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 15, fontWeight: 600, color: conf.color, textDecoration: isUndone ? 'line-through' : 'none' }}>
                          {m.type === 'out' ? '−' : '+'}{m.quantity}
                        </div>
                        <div style={{ fontSize: 10, color: '#CBD5E1' }}>
                          {m.created_at ? new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))
      )}

      {/* Load more button */}
      {hasMore && (
        <button
          onClick={loadMore}
          disabled={loadingMore}
          style={{
            width: '100%', padding: '12px', marginTop: 8, marginBottom: 8,
            borderRadius: 10, border: '1.5px solid #E2E8F0', background: '#FFFFFF',
            color: '#64748B', fontSize: 13, fontWeight: 600, cursor: loadingMore ? 'wait' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            opacity: loadingMore ? 0.6 : 1,
          }}
        >
          {loadingMore ? (
            <><div className="loader" style={{ width: 16, height: 16, borderWidth: 2 }} /> Chargement...</>
          ) : (
            <><ChevronDown size={16} /> Charger plus</>
          )}
        </button>
      )}

      {/* Undo confirmation dialog */}
      {undoTarget && (
        <Confirm
          message="Annuler ce mouvement ?"
          detail={`${undoTarget.quantity}× ${pName(undoTarget.product_id)} — ${getMoveConf(undoTarget.type).label}`}
          confirmLabel={undoLoading ? 'Annulation...' : 'Annuler le mouvement'}
          confirmColor="#DC2626"
          onConfirm={() => handleUndo(undoTarget)}
          onCancel={() => setUndoTarget(null)}
        />
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
