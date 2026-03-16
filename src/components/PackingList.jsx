import React, { useState, useMemo, useCallback } from 'react'
import { db } from '../lib/supabase'
import { Badge } from './UI'
import { ROLE_CONF } from './RolePicker'

export default function PackingList({ event, products, stock, locations, roles, eventPacking, onReload, onToast }) {
  const [generating, setGenerating] = useState(false)
  const [expandedRole, setExpandedRole] = useState(null)
  const [viewMode, setViewMode] = useState('role') // role | status | category

  // Packing items for this event
  const packingItems = useMemo(() =>
    (eventPacking || []).filter(ep => ep.event_id === event.id),
    [eventPacking, event.id]
  )

  // Stock lookup helper
  const getProductStock = useCallback((productId) => {
    return stock
      .filter(s => s.product_id === productId)
      .reduce((sum, s) => sum + (s.quantity || 0), 0)
  }, [stock])

  // Group by role_code
  const groupedByRole = useMemo(() => {
    const groups = {}
    packingItems.forEach(item => {
      const code = item.role_code || 'TM'
      if (!groups[code]) groups[code] = []
      const product = products.find(p => p.id === item.product_id)
      const available = getProductStock(item.product_id)
      const shortage = Math.max(0, item.quantity_needed - available)
      groups[code].push({ ...item, product, available, shortage })
    })
    const order = ['TM', 'PM', 'SE', 'LD', 'BL', 'SM', 'TD', 'MM', 'LOG', 'SAFE', 'AA', 'PA']
    const sorted = {}
    order.forEach(code => { if (groups[code]) sorted[code] = groups[code] })
    Object.keys(groups).forEach(code => { if (!sorted[code]) sorted[code] = groups[code] })
    return sorted
  }, [packingItems, products, getProductStock])

  // Overall stats
  const totalItems = packingItems.length
  const packedItems = packingItems.filter(i => i.packed).length
  const overallPercent = totalItems > 0 ? Math.round((packedItems / totalItems) * 100) : 0

  // Shortage stats
  const allItems = Object.values(groupedByRole).flat()
  const shortageItems = allItems.filter(i => i.shortage > 0)
  const totalShortage = shortageItems.reduce((s, i) => s + i.shortage, 0)

  // Generate packing list via RPC
  const handleGenerate = useCallback(async () => {
    setGenerating(true)
    try {
      await db.rpc('generate_packing_list', { p_event_id: event.id })
      onToast('Packing list generee')
      onReload()
    } catch (e) {
      onToast('Erreur: ' + e.message, '#8B1A2B')
    } finally {
      setGenerating(false)
    }
  }, [event.id, onReload, onToast])

  // Print / export packing list
  const handlePrint = useCallback(() => {
    const roleEntries = Object.entries(groupedByRole)
    const dateStr = new Date(event.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Packing - ${event.name || event.lieu}</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 20px; color: #333; font-size: 12px; }
      h1 { font-size: 18px; margin-bottom: 4px; }
      h2 { font-size: 14px; margin: 16px 0 6px; border-bottom: 2px solid #C8A46A; padding-bottom: 4px; }
      .sub { color: #888; font-size: 11px; margin-bottom: 16px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
      th { text-align: left; font-size: 10px; text-transform: uppercase; color: #888; border-bottom: 1px solid #ccc; padding: 4px 6px; }
      td { padding: 4px 6px; border-bottom: 1px solid #eee; }
      .check { width: 20px; text-align: center; }
      .qty { text-align: right; width: 50px; }
      .shortage { color: #8B1A2B; font-weight: bold; }
      @media print { body { padding: 0; } }
    </style></head><body>`
    html += `<h1>Packing List — ${event.name || event.lieu}</h1>`
    html += `<div class="sub">${dateStr} · ${event.lieu} · ${event.ville} (${event.territoire}) · ${event.format} · ${event.capacite || '?'} pers.</div>`

    roleEntries.forEach(([role, items]) => {
      const rc = ROLE_CONF[role] || { label: role }
      const done = items.filter(i => i.packed).length
      html += `<h2>${rc.label || role} (${done}/${items.length})</h2>`
      html += `<table><tr><th class="check">OK</th><th>Produit</th><th class="qty">Besoin</th><th class="qty">Préparé</th><th class="qty">Manque</th></tr>`
      items.forEach(item => {
        const p = products.find(pr => pr.id === item.product_id)
        html += `<tr>
          <td class="check">${item.packed ? '✓' : '☐'}</td>
          <td>${p?.name || '?'}</td>
          <td class="qty">${item.quantity_needed}</td>
          <td class="qty">${item.quantity_packed}</td>
          <td class="qty ${item.shortage > 0 ? 'shortage' : ''}">${item.shortage > 0 ? '-' + item.shortage : '—'}</td>
        </tr>`
      })
      html += `</table>`
    })

    html += `<div style="margin-top:20px;font-size:10px;color:#aaa">Généré le ${new Date().toLocaleDateString('fr-FR')} — Stage Stock</div></body></html>`

    const printWindow = window.open('', '_blank')
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }, [event, groupedByRole, products])

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
      onToast('Erreur: ' + e.message, '#8B1A2B')
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
      onToast('Erreur: ' + e.message, '#8B1A2B')
    }
  }, [onReload, onToast])

  // Pack all items for a role
  const packAllRole = useCallback(async (code) => {
    const items = groupedByRole[code]?.filter(i => !i.packed) || []
    if (items.length === 0) return
    try {
      for (const item of items) {
        await db.update('event_packing', `id=eq.${item.id}`, {
          packed: true,
          quantity_packed: item.quantity_needed,
        })
      }
      onToast(`${items.length} items emballes`)
      onReload()
    } catch (e) {
      onToast('Erreur: ' + e.message, '#8B1A2B')
    }
  }, [groupedByRole, onReload, onToast])

  // No packing items yet
  if (packingItems.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 16px' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>📦</div>
        <div style={{ fontSize: 15, fontWeight: 800, color: '#F0ECE2', marginBottom: 6 }}>
          Aucune packing list
        </div>
        <div style={{ fontSize: 13, color: '#8A7D75', marginBottom: 8, lineHeight: 1.5 }}>
          Calcul auto selon le format, la capacite et le territoire.
        </div>
        {/* Event info */}
        <div style={{
          display: 'inline-flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', justifyContent: 'center',
        }}>
          {event.format && <Badge color="#5B8DB8">{event.format}</Badge>}
          {event.capacite && <Badge color="#C8A46A">{event.capacite} pers.</Badge>}
          {event.territoire && <Badge color="#2FB65D">{event.territoire}</Badge>}
        </div>
        <div>
          <button
            onClick={handleGenerate}
            disabled={generating}
            style={{
              padding: '12px 24px', borderRadius: 14, fontSize: 14, fontWeight: 800,
              background: generating ? '#222222' : 'linear-gradient(135deg, #C8A46A, #8B1A2B)',
              color: 'white', cursor: generating ? 'wait' : 'pointer',
              boxShadow: '0 4px 16px rgba(232,115,90,0.25)', border: 'none',
            }}
          >
            {generating ? '... Generation...' : 'Generer la packing list'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Overall progress */}
      <div className="card" style={{ padding: '14px 16px', marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>
            {packedItems}/{totalItems} emballe{packedItems > 1 ? 's' : ''}
          </span>
          <span style={{
            fontSize: 22, fontWeight: 900,
            color: overallPercent === 100 ? '#2FB65D' : overallPercent >= 50 ? '#C8A46A' : '#8B1A2B',
          }}>{overallPercent}%</span>
        </div>
        <div style={{ height: 8, borderRadius: 4, background: '#1a1a1a', overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 4, transition: 'width 0.3s',
            width: `${overallPercent}%`,
            background: overallPercent === 100
              ? 'linear-gradient(90deg, #2FB65D, #4A9A7A)'
              : 'linear-gradient(90deg, #C8A46A, #8B1A2B)',
          }} />
        </div>
      </div>

      {/* Print / regenerate buttons */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <button onClick={handlePrint} style={{
          flex: 1, padding: '10px 8px', borderRadius: 12, fontSize: 12, fontWeight: 700,
          background: 'rgba(91,141,184,0.08)', border: '1.5px solid #5B8DB830', color: '#5B8DB8', cursor: 'pointer',
        }}>🖨️ Imprimer / PDF</button>
        <button onClick={handleGenerate} disabled={generating} style={{
          flex: 1, padding: '10px 8px', borderRadius: 12, fontSize: 12, fontWeight: 700,
          background: 'rgba(200,164,106,0.08)', border: '1.5px solid #8B1A2B30', color: '#8B1A2B', cursor: 'pointer',
          opacity: generating ? 0.5 : 1,
        }}>{generating ? '⏳...' : '🔄 Recalculer'}</button>
      </div>

      {/* Shortage warning */}
      {shortageItems.length > 0 && (
        <div className="card" style={{
          padding: '10px 14px', marginBottom: 10,
          background: 'rgba(200,164,106,0.08)', border: '1.5px solid #8B1A2B25',
        }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#8B1A2B', marginBottom: 4 }}>
            Manque de stock
          </div>
          <div style={{ fontSize: 11, color: '#8A7D75' }}>
            {shortageItems.length} produit{shortageItems.length > 1 ? 's' : ''} en quantite insuffisante ({totalShortage} unites manquantes)
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
            {shortageItems.slice(0, 5).map((i, idx) => (
              <span key={idx} style={{
                fontSize: 10, padding: '2px 8px', borderRadius: 6,
                background: '#8B1A2B15', color: '#8B1A2B', fontWeight: 700,
              }}>
                {i.product?.name || '?'} (-{i.shortage})
              </span>
            ))}
            {shortageItems.length > 5 && (
              <span style={{ fontSize: 10, color: '#6B6058' }}>+{shortageItems.length - 5} autres</span>
            )}
          </div>
        </div>
      )}

      {/* Action bar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginBottom: 12 }}>
        <button onClick={handleGenerate} disabled={generating} style={{
          padding: '6px 12px', borderRadius: 10, fontSize: 11, fontWeight: 800,
          background: '#F8F0FA', border: '1.5px solid #222222',
          color: '#8A7D75', cursor: generating ? 'wait' : 'pointer',
        }}>
          {generating ? '...' : 'Regenerer'}
        </button>
      </div>

      {/* Groups by role */}
      {Object.entries(groupedByRole).map(([code, items]) => {
        const conf = ROLE_CONF[code] || { icon: '📋', color: '#8A7D75', label: code }
        const rolePacked = items.filter(i => i.packed).length
        const rolePercent = items.length > 0 ? Math.round((rolePacked / items.length) * 100) : 0
        const roleShortages = items.filter(i => i.shortage > 0).length
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: conf.color }}>{conf.label}</span>
                  {roleShortages > 0 && (
                    <span style={{
                      fontSize: 9, padding: '1px 5px', borderRadius: 4,
                      background: '#8B1A2B', color: 'white', fontWeight: 800,
                    }}>{roleShortages} manque</span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: '#8A7D75' }}>
                  {rolePacked}/{items.length} item{items.length > 1 ? 's' : ''}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  fontSize: 16, fontWeight: 900,
                  color: rolePercent === 100 ? '#2FB65D' : rolePercent > 0 ? '#C8A46A' : '#8B1A2B',
                }}>{rolePercent}%</span>
                <span style={{
                  fontSize: 12, color: '#6B6058',
                  transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s',
                }}>▼</span>
              </div>
            </button>

            {/* Role progress bar */}
            <div style={{ height: 4, borderRadius: 2, background: '#1a1a1a', overflow: 'hidden', marginBottom: 6, marginLeft: 14, marginRight: 14 }}>
              <div style={{
                height: '100%', borderRadius: 2, transition: 'width 0.3s',
                width: `${rolePercent}%`,
                background: rolePercent === 100 ? '#2FB65D' : conf.color,
              }} />
            </div>

            {/* Items */}
            {isExpanded && (
              <>
                {/* Pack all button for this role */}
                {rolePacked < items.length && (
                  <button onClick={() => packAllRole(code)} style={{
                    fontSize: 11, fontWeight: 700, color: conf.color, padding: '4px 14px',
                    marginBottom: 6, background: 'none', border: 'none', cursor: 'pointer',
                  }}>
                    Tout emballer ({items.length - rolePacked} restants)
                  </button>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {items.map(item => {
                    const p = item.product
                    if (!p) return null
                    const statusColor = item.packed ? '#2FB65D'
                      : item.quantity_packed > 0 ? '#C8A46A' : '#8B1A2B'
                    const statusBg = item.packed ? 'rgba(47,182,93,0.08)'
                      : item.quantity_packed > 0 ? '#FFF5EB' : 'rgba(200,164,106,0.08)'

                    return (
                      <div key={item.id} className="card" style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                        borderLeft: `3px solid ${statusColor}`,
                        opacity: item.packed ? 0.7 : 1,
                      }}>
                        {/* Checkbox */}
                        <button onClick={() => togglePacked(item)} style={{
                          width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                          border: `2px solid ${item.packed ? '#2FB65D' : '#D8CDD2'}`,
                          background: item.packed ? '#2FB65D' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'white', fontSize: 14, fontWeight: 900, cursor: 'pointer',
                        }}>
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
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                            <span style={{ fontSize: 10, color: '#6B6058' }}>{p.sku || ''}</span>
                            {item.shortage > 0 && (
                              <span style={{
                                fontSize: 9, padding: '1px 5px', borderRadius: 4,
                                background: '#8B1A2B15', color: '#8B1A2B', fontWeight: 800,
                              }}>
                                Stock: {item.available} (manque {item.shortage})
                              </span>
                            )}
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
                          <span style={{ fontSize: 12, color: '#8A7D75', fontWeight: 700 }}>
                            / {item.quantity_needed}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}
