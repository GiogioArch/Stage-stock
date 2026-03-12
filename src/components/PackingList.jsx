import React, { useState, useMemo, useCallback } from 'react'
import { db } from '../lib/supabase'
import { Badge } from './UI'

// Role display config
const ROLE_CONF = {
  TM:   { icon: '🎯', color: '#E8735A', label: 'Tour Manager' },
  PM:   { icon: '🎬', color: '#9B7DC4', label: 'Chef de Production' },
  SE:   { icon: '🔊', color: '#5B8DB8', label: 'Ingé Son' },
  LD:   { icon: '💡', color: '#E8935A', label: 'Régisseur Lumière' },
  BL:   { icon: '🎸', color: '#D4648A', label: 'Backline' },
  SM:   { icon: '🎭', color: '#8BAB5D', label: 'Régisseur Scène' },
  TD:   { icon: '⚙️', color: '#5DAB8B', label: 'Directeur Technique' },
  MM:   { icon: '👕', color: '#E8735A', label: 'Merch Manager' },
  LOG:  { icon: '🚛', color: '#5B8DB8', label: 'Logistique' },
  SAFE: { icon: '🛡️', color: '#D4648A', label: 'Sécurité' },
  AA:   { icon: '🎤', color: '#9B7DC4', label: 'Assistant Artiste' },
  PA:   { icon: '📋', color: '#8BAB5D', label: 'Assistant Production' },
}

export default function PackingList({ event, products, stock, locations, roles, eventPacking, onReload, onToast }) {
  const [generating, setGenerating] = useState(false)
  const [expandedRole, setExpandedRole] = useState(null)

  // Packing items for this event
  const packingItems = useMemo(() =>
    (eventPacking || []).filter(ep => ep.event_id === event.id),
    [eventPacking, event.id]
  )

  // Group by role_code
  const groupedByRole = useMemo(() => {
    const groups = {}
    packingItems.forEach(item => {
      const code = item.role_code || 'TM'
      if (!groups[code]) groups[code] = []
      const product = products.find(p => p.id === item.product_id)
      groups[code].push({ ...item, product })
    })
    // Sort groups by role order
    const order = ['TM', 'PM', 'SE', 'LD', 'BL', 'SM', 'TD', 'MM', 'LOG', 'SAFE', 'AA', 'PA']
    const sorted = {}
    order.forEach(code => {
      if (groups[code]) sorted[code] = groups[code]
    })
    // Add any remaining
    Object.keys(groups).forEach(code => {
      if (!sorted[code]) sorted[code] = groups[code]
    })
    return sorted
  }, [packingItems, products])

  // Overall stats
  const totalItems = packingItems.length
  const packedItems = packingItems.filter(i => i.packed).length
  const overallPercent = totalItems > 0 ? Math.round((packedItems / totalItems) * 100) : 0

  // Generate packing list via RPC
  const handleGenerate = useCallback(async () => {
    setGenerating(true)
    try {
      await db.rpc('generate_packing_list', { p_event_id: event.id })
      onToast('Packing list générée')
      onReload()
    } catch (e) {
      onToast('Erreur: ' + e.message, '#D4648A')
    } finally {
      setGenerating(false)
    }
  }, [event.id, onReload, onToast])

  // Toggle packed status
  const togglePacked = useCallback(async (item) => {
    const newPacked = !item.packed
    const newQtyPacked = newPacked ? item.quantity_needed : 0
    try {
      await db.update('event_packing', `id=eq.${item.id}`, {
        packed: newPacked,
        quantity_packed: newQtyPacked,
      })
      onReload()
    } catch (e) {
      onToast('Erreur: ' + e.message, '#D4648A')
    }
  }, [onReload, onToast])

  // Update quantity packed
  const updateQtyPacked = useCallback(async (item, newQty) => {
    const qty = Math.max(0, Math.min(parseInt(newQty) || 0, item.quantity_needed))
    try {
      await db.update('event_packing', `id=eq.${item.id}`, {
        quantity_packed: qty,
        packed: qty >= item.quantity_needed,
      })
      onReload()
    } catch (e) {
      onToast('Erreur: ' + e.message, '#D4648A')
    }
  }, [onReload, onToast])

  // No packing items yet
  if (packingItems.length === 0) {
    return (
      <div>
        <div style={{ textAlign: 'center', padding: '32px 16px' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📦</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#3D3042', marginBottom: 6 }}>
            Aucune packing list
          </div>
          <div style={{ fontSize: 13, color: '#9A8B94', marginBottom: 20, lineHeight: 1.5 }}>
            Générez automatiquement la liste de colisage pour cet événement basée sur le format, la capacité et le territoire.
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating}
            style={{
              padding: '12px 24px', borderRadius: 14, fontSize: 14, fontWeight: 800,
              background: generating ? '#E8DED8' : 'linear-gradient(135deg, #E8735A, #D4648A)',
              color: 'white', cursor: generating ? 'wait' : 'pointer',
              boxShadow: '0 4px 16px rgba(232,115,90,0.25)',
              border: 'none',
            }}
          >
            {generating ? '⏳ Génération...' : '🚀 Générer la packing list'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Overall progress */}
      <div className="card" style={{ padding: '14px 16px', marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>
            {packedItems}/{totalItems} emballé{packedItems > 1 ? 's' : ''}
          </span>
          <span style={{
            fontSize: 22, fontWeight: 900,
            color: overallPercent === 100 ? '#5DAB8B' : overallPercent >= 50 ? '#E8935A' : '#D4648A',
          }}>
            {overallPercent}%
          </span>
        </div>
        <div style={{ height: 8, borderRadius: 4, background: '#F0E8E4', overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 4, transition: 'width 0.3s',
            width: `${overallPercent}%`,
            background: overallPercent === 100
              ? 'linear-gradient(90deg, #5DAB8B, #4A9A7A)'
              : 'linear-gradient(90deg, #E8735A, #D4648A)',
          }} />
        </div>
      </div>

      {/* Regenerate button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button
          onClick={handleGenerate}
          disabled={generating}
          style={{
            padding: '6px 14px', borderRadius: 10, fontSize: 11, fontWeight: 800,
            background: '#F8F0FA', border: '1.5px solid #E8DED8',
            color: '#9A8B94', cursor: generating ? 'wait' : 'pointer',
          }}
        >
          {generating ? '⏳ ...' : '🔄 Régénérer'}
        </button>
      </div>

      {/* Groups by role */}
      {Object.entries(groupedByRole).map(([code, items]) => {
        const conf = ROLE_CONF[code] || { icon: '📋', color: '#9A8B94', label: code }
        const rolePacked = items.filter(i => i.packed).length
        const rolePercent = items.length > 0 ? Math.round((rolePacked / items.length) * 100) : 0
        const isExpanded = expandedRole === null || expandedRole === code

        return (
          <div key={code} style={{ marginBottom: 14 }}>
            {/* Role header */}
            <button
              onClick={() => setExpandedRole(expandedRole === code ? null : code)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                padding: '10px 14px', cursor: 'pointer', textAlign: 'left',
                background: 'white', borderRadius: 14, border: `1.5px solid ${conf.color}25`,
                marginBottom: 6,
              }}
            >
              <span style={{ fontSize: 20 }}>{conf.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: conf.color }}>{conf.label}</div>
                <div style={{ fontSize: 11, color: '#9A8B94' }}>
                  {rolePacked}/{items.length} item{items.length > 1 ? 's' : ''}
                </div>
              </div>
              <div style={{ width: 60, textAlign: 'right' }}>
                <div style={{
                  fontSize: 16, fontWeight: 900,
                  color: rolePercent === 100 ? '#5DAB8B' : rolePercent > 0 ? '#E8935A' : '#D4648A',
                }}>
                  {rolePercent}%
                </div>
              </div>
              <span style={{ fontSize: 14, color: '#B8A0AE', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                ▼
              </span>
            </button>

            {/* Role progress bar */}
            <div style={{ height: 4, borderRadius: 2, background: '#F0E8E4', overflow: 'hidden', marginBottom: 6, marginLeft: 14, marginRight: 14 }}>
              <div style={{
                height: '100%', borderRadius: 2, transition: 'width 0.3s',
                width: `${rolePercent}%`,
                background: rolePercent === 100 ? '#5DAB8B' : rolePercent > 0 ? '#E8935A' : '#D4648A',
              }} />
            </div>

            {/* Items */}
            {isExpanded && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {items.map(item => {
                  const p = item.product
                  if (!p) return null
                  const statusColor = item.packed ? '#5DAB8B'
                    : item.quantity_packed > 0 ? '#E8935A'
                    : '#D4648A'
                  const statusBg = item.packed ? '#EDF7F2'
                    : item.quantity_packed > 0 ? '#FFF5EB'
                    : '#FDF0F4'

                  return (
                    <div key={item.id} className="card" style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                      borderLeft: `3px solid ${statusColor}`,
                      opacity: item.packed ? 0.7 : 1,
                    }}>
                      {/* Checkbox */}
                      <button
                        onClick={() => togglePacked(item)}
                        style={{
                          width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                          border: `2px solid ${item.packed ? '#5DAB8B' : '#D8CDD2'}`,
                          background: item.packed ? '#5DAB8B' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'white', fontSize: 14, fontWeight: 900, cursor: 'pointer',
                        }}
                      >
                        {item.packed ? '✓' : ''}
                      </button>

                      {/* Product info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 13, fontWeight: 600,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          textDecoration: item.packed ? 'line-through' : 'none',
                        }}>
                          {p.image || '📦'} {p.name}
                        </div>
                        <div style={{ fontSize: 10, color: '#B8A0AE' }}>
                          {p.sku || ''}
                        </div>
                      </div>

                      {/* Quantity */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                        <input
                          type="text"
                          value={item.quantity_packed}
                          onChange={e => {
                            const val = e.target.value.replace(/[^0-9]/g, '')
                            if (val !== '') updateQtyPacked(item, val)
                          }}
                          style={{
                            width: 32, height: 28, borderRadius: 6, textAlign: 'center',
                            fontSize: 13, fontWeight: 800, color: statusColor,
                            border: `1.5px solid ${statusColor}30`, background: statusBg,
                          }}
                        />
                        <span style={{ fontSize: 12, color: '#9A8B94', fontWeight: 700 }}>
                          / {item.quantity_needed}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
