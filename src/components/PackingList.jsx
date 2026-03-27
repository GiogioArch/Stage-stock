import React, { useState, useMemo, useCallback } from 'react'
import { db } from '../lib/supabase'
import { Badge, parseDate } from './UI'
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
      onToast('Packing list générée')
      onReload()
    } catch (e) {
      onToast('Erreur: ' + e.message, '#DC2626')
    } finally {
      setGenerating(false)
    }
  }, [event.id, onReload, onToast])

  // Build packing list HTML for print/export
  const buildPackingHTML = useCallback((forDownload = false) => {
    const roleEntries = Object.entries(groupedByRole)
    const dateStr = parseDate(event.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    const eventName = event.name || event.lieu

    let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Packing - ${eventName}</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: 'Inter', Arial, sans-serif; padding: 24px; color: #1E293B; font-size: 12px; }
      .header { border-bottom: 3px solid #6366F1; padding-bottom: 12px; margin-bottom: 16px; }
      h1 { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
      .meta { color: #64748B; font-size: 11px; line-height: 1.6; }
      .stats { display: flex; gap: 16px; margin: 12px 0; }
      .stat { padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: 600; }
      .stat-ok { background: #F0FDF4; color: #16A34A; }
      .stat-warn { background: #FEF2F2; color: #DC2626; }
      .stat-info { background: #EFF6FF; color: #2563EB; }
      h2 { font-size: 13px; font-weight: 700; margin: 18px 0 6px; padding: 6px 10px; border-radius: 6px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
      th { text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; color: #94A3B8; border-bottom: 1px solid #E2E8F0; padding: 4px 8px; font-weight: 600; }
      td { padding: 5px 8px; border-bottom: 1px solid #F1F5F9; font-size: 11px; }
      tr:hover td { background: #F8FAFC; }
      .check { width: 24px; text-align: center; font-size: 14px; }
      .qty { text-align: right; width: 50px; font-weight: 500; }
      .shortage { color: #DC2626; font-weight: 700; }
      .packed-row { opacity: 0.5; }
      .packed-row td:nth-child(2) { text-decoration: line-through; }
      .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #E2E8F0; font-size: 9px; color: #94A3B8; display: flex; justify-content: space-between; }
      @media print { body { padding: 12px; } .no-print { display: none; } }
    </style></head><body>`

    // Header
    html += `<div class="header">
      <h1>📦 Packing List — ${eventName}</h1>
      <div class="meta">${dateStr} · ${event.lieu || ''} · ${event.ville || ''} ${event.territoire ? '(' + event.territoire + ')' : ''} · ${event.format || ''} · ${event.capacite || '?'} pers.</div>
    </div>`

    // Stats bar
    html += `<div class="stats">
      <span class="stat stat-info">${totalItems} items</span>
      <span class="stat stat-ok">${packedItems} emballés (${overallPercent}%)</span>
      ${shortageItems.length > 0 ? `<span class="stat stat-warn">${shortageItems.length} manquants (-${totalShortage})</span>` : ''}
    </div>`

    // Role sections
    roleEntries.forEach(([role, items]) => {
      const rc = ROLE_CONF[role] || { label: role, color: '#94A3B8' }
      const done = items.filter(i => i.packed).length
      const pct = items.length > 0 ? Math.round((done / items.length) * 100) : 0
      html += `<h2 style="background:${rc.color}10;color:${rc.color};border-left:3px solid ${rc.color}">${rc.label || role} — ${done}/${items.length} (${pct}%)</h2>`
      html += `<table><tr><th class="check">OK</th><th>Produit</th><th>SKU</th><th class="qty">Besoin</th><th class="qty">Préparé</th><th class="qty">Manque</th></tr>`
      items.forEach(item => {
        const p = products.find(pr => pr.id === item.product_id)
        const rowClass = item.packed ? 'packed-row' : ''
        html += `<tr class="${rowClass}">
          <td class="check">${item.packed ? '✅' : '☐'}</td>
          <td>${p?.name || '?'}</td>
          <td style="color:#94A3B8;font-size:10px">${p?.sku || ''}</td>
          <td class="qty">${item.quantity_needed}</td>
          <td class="qty">${item.quantity_packed}</td>
          <td class="qty ${item.shortage > 0 ? 'shortage' : ''}">${item.shortage > 0 ? '-' + item.shortage : '—'}</td>
        </tr>`
      })
      html += `</table>`
    })

    // Footer
    html += `<div class="footer">
      <span>Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
      <span>Stage Stock — ${eventName}</span>
    </div>`

    html += `</body></html>`
    return html
  }, [event, groupedByRole, products, totalItems, packedItems, overallPercent, shortageItems, totalShortage])

  // Print packing list
  const handlePrint = useCallback(() => {
    const html = buildPackingHTML(false)
    const printWindow = window.open('', '_blank')
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }, [buildPackingHTML])

  // Download as HTML file (openable in any browser, saveable as PDF)
  const handleDownload = useCallback(() => {
    const html = buildPackingHTML(true)
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const eventSlug = (event.name || event.lieu || 'packing').replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()
    const dateSlug = event.date ? event.date.slice(0, 10) : new Date().toISOString().slice(0, 10)
    a.href = url
    a.download = `packing-${eventSlug}-${dateSlug}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    onToast('Packing list téléchargée')
  }, [buildPackingHTML, event, onToast])

  // Share via native share API (mobile)
  const handleShare = useCallback(async () => {
    const eventName = event.name || event.lieu || 'Concert'
    const dateStr = parseDate(event.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

    // Build a simple text summary for sharing
    const roleEntries = Object.entries(groupedByRole)
    let text = `📦 Packing List — ${eventName}\n📅 ${dateStr}\n📍 ${event.lieu || ''}, ${event.ville || ''}\n\n`
    text += `✅ ${packedItems}/${totalItems} emballés (${overallPercent}%)\n`
    if (shortageItems.length > 0) text += `⚠️ ${shortageItems.length} manquants (-${totalShortage} unités)\n`
    text += '\n'

    roleEntries.forEach(([role, items]) => {
      const rc = ROLE_CONF[role] || { label: role }
      const done = items.filter(i => i.packed).length
      text += `── ${rc.label} (${done}/${items.length}) ──\n`
      items.forEach(item => {
        const p = products.find(pr => pr.id === item.product_id)
        const check = item.packed ? '✅' : '☐'
        const shortage = item.shortage > 0 ? ` ⚠️-${item.shortage}` : ''
        text += `${check} ${p?.name || '?'} — ${item.quantity_packed}/${item.quantity_needed}${shortage}\n`
      })
      text += '\n'
    })
    text += `\nGénéré par Stage Stock — ${new Date().toLocaleDateString('fr-FR')}`

    if (navigator.share) {
      try {
        await navigator.share({ title: `Packing — ${eventName}`, text })
      } catch { /* user cancelled */ }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(text)
        onToast('Copié dans le presse-papier')
      } catch {
        onToast('Partage non disponible', '#D97706')
      }
    }
  }, [event, groupedByRole, products, packedItems, totalItems, overallPercent, shortageItems, totalShortage, onToast])

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
      onToast('Erreur: ' + e.message, '#DC2626')
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
      onToast('Erreur: ' + e.message, '#DC2626')
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
      onToast('Erreur: ' + e.message, '#DC2626')
    }
  }, [groupedByRole, onReload, onToast])

  // No packing items yet
  if (packingItems.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 16px' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}></div>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#1E293B', marginBottom: 6 }}>
          Aucune packing list
        </div>
        <div style={{ fontSize: 13, color: '#94A3B8', marginBottom: 8, lineHeight: 1.5 }}>
          Calcul auto selon le format, la capacite et le territoire.
        </div>
        {/* Event info */}
        <div style={{
          display: 'inline-flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', justifyContent: 'center',
        }}>
          {event.format && <Badge color="#2563EB">{event.format}</Badge>}
          {event.capacite && <Badge color="#6366F1">{event.capacite} pers.</Badge>}
          {event.territoire && <Badge color="#16A34A">{event.territoire}</Badge>}
        </div>
        <div>
          <button
            onClick={handleGenerate}
            disabled={generating}
            style={{
              padding: '12px 24px', borderRadius: 8, fontSize: 14, fontWeight: 600,
              background: generating ? '#CBD5E1' : 'linear-gradient(135deg, #6366F1, #DC2626)',
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
            fontSize: 22, fontWeight: 600,
            color: overallPercent === 100 ? '#16A34A' : overallPercent >= 50 ? '#6366F1' : '#DC2626',
          }}>{overallPercent}%</span>
        </div>
        <div style={{ height: 8, borderRadius: 4, background: '#F1F5F9', overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 4, transition: 'width 0.3s',
            width: `${overallPercent}%`,
            background: overallPercent === 100
              ? 'linear-gradient(90deg, #16A34A, #4A9A7A)'
              : 'linear-gradient(90deg, #6366F1, #DC2626)',
          }} />
        </div>
      </div>

      {/* Export / action buttons */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
        <button onClick={handlePrint} style={{
          flex: 1, minWidth: 80, padding: '10px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700,
          background: '#EFF6FF', border: '1px solid #2563EB25', color: '#2563EB', cursor: 'pointer',
        }}>🖨️ Imprimer</button>
        <button onClick={handleDownload} style={{
          flex: 1, minWidth: 80, padding: '10px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700,
          background: '#F0FDF4', border: '1px solid #16A34A25', color: '#16A34A', cursor: 'pointer',
        }}>📥 Télécharger</button>
        <button onClick={handleShare} style={{
          flex: 1, minWidth: 80, padding: '10px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700,
          background: '#FAF5FF', border: '1px solid #8B5CF625', color: '#8B5CF6', cursor: 'pointer',
        }}>📤 Partager</button>
      </div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        <button onClick={handleGenerate} disabled={generating} style={{
          flex: 1, padding: '10px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700,
          background: '#FEF2F2', border: '1px solid #DC262625', color: '#DC2626', cursor: 'pointer',
          opacity: generating ? 0.5 : 1,
        }}>{generating ? '...' : '🔄 Recalculer'}</button>
      </div>

      {/* Shortage warning */}
      {shortageItems.length > 0 && (
        <div className="card" style={{
          padding: '10px 14px', marginBottom: 10,
          background: 'rgba(200,164,106,0.08)', border: '1px solid #DC262625',
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#DC2626', marginBottom: 4 }}>
            Manque de stock
          </div>
          <div style={{ fontSize: 11, color: '#94A3B8' }}>
            {shortageItems.length} produit{shortageItems.length > 1 ? 's' : ''} en quantite insuffisante ({totalShortage} unites manquantes)
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
            {shortageItems.slice(0, 5).map((i, idx) => (
              <span key={idx} style={{
                fontSize: 10, padding: '2px 8px', borderRadius: 6,
                background: '#DC262615', color: '#DC2626', fontWeight: 700,
              }}>
                {i.product?.name || '?'} (-{i.shortage})
              </span>
            ))}
            {shortageItems.length > 5 && (
              <span style={{ fontSize: 10, color: '#CBD5E1' }}>+{shortageItems.length - 5} autres</span>
            )}
          </div>
        </div>
      )}

      {/* Action bar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginBottom: 12 }}>
        <button onClick={handleGenerate} disabled={generating} style={{
          padding: '6px 12px', borderRadius: 10, fontSize: 11, fontWeight: 600,
          background: '#F8FAFC', border: '1px solid #CBD5E1',
          color: '#94A3B8', cursor: generating ? 'wait' : 'pointer',
        }}>
          {generating ? '...' : 'Regenerer'}
        </button>
      </div>

      {/* Groups by role */}
      {Object.entries(groupedByRole).map(([code, items]) => {
        const conf = ROLE_CONF[code] || { icon: '', color: '#94A3B8', label: code }
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
                background: '#F1F5F9', borderRadius: 8, border: `1px solid ${conf.color}25`,
                marginBottom: 6,
              }}
            >
              <span style={{ fontSize: 20, display: 'flex', alignItems: 'center' }}>{conf.icon && React.createElement(conf.icon, { size: 20, color: conf.color })}</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: conf.color }}>{conf.label}</span>
                  {roleShortages > 0 && (
                    <span style={{
                      fontSize: 9, padding: '1px 5px', borderRadius: 4,
                      background: '#DC2626', color: 'white', fontWeight: 600,
                    }}>{roleShortages} manque</span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: '#94A3B8' }}>
                  {rolePacked}/{items.length} item{items.length > 1 ? 's' : ''}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  fontSize: 16, fontWeight: 600,
                  color: rolePercent === 100 ? '#16A34A' : rolePercent > 0 ? '#6366F1' : '#DC2626',
                }}>{rolePercent}%</span>
                <span style={{
                  fontSize: 12, color: '#CBD5E1',
                  transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s',
                }}>▼</span>
              </div>
            </button>

            {/* Role progress bar */}
            <div style={{ height: 4, borderRadius: 2, background: '#F1F5F9', overflow: 'hidden', marginBottom: 6, marginLeft: 14, marginRight: 14 }}>
              <div style={{
                height: '100%', borderRadius: 2, transition: 'width 0.3s',
                width: `${rolePercent}%`,
                background: rolePercent === 100 ? '#16A34A' : conf.color,
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
                    const statusColor = item.packed ? '#16A34A'
                      : item.quantity_packed > 0 ? '#6366F1' : '#DC2626'
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
                          border: `2px solid ${item.packed ? '#16A34A' : '#CBD5E1'}`,
                          background: item.packed ? '#16A34A' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer',
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
                            {p.image || ''} {p.name}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                            <span style={{ fontSize: 10, color: '#CBD5E1' }}>{p.sku || ''}</span>
                            {item.shortage > 0 && (
                              <span style={{
                                fontSize: 9, padding: '1px 5px', borderRadius: 4,
                                background: '#DC262615', color: '#DC2626', fontWeight: 600,
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
                              fontSize: 13, fontWeight: 600, color: statusColor,
                              border: `1px solid ${statusColor}30`, background: statusBg,
                            }}
                          />
                          <span style={{ fontSize: 12, color: '#94A3B8', fontWeight: 700 }}>
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
