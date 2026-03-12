import React, { useState, useMemo } from 'react'
import { db } from '../lib/supabase'
import { Modal, Badge, getCat, CATEGORIES, fmtDate } from './UI'

const CHECK_CATS = {
  son:          { icon: '🔊', color: '#5B8DB8', label: 'Son' },
  lumiere:      { icon: '💡', color: '#E8935A', label: 'Lumière' },
  instruments:  { icon: '🎸', color: '#D4648A', label: 'Instruments' },
  decor:        { icon: '🎭', color: '#9B7DC4', label: 'Décor' },
  merch:        { icon: '👕', color: '#E8735A', label: 'Merch' },
  logistique:   { icon: '🚛', color: '#5DAB8B', label: 'Logistique' },
  consommables: { icon: '🔋', color: '#8BAB5D', label: 'Consommables' },
}

export default function EventDetail({ event, products, stock, locations, families, subfamilies, checklists, onClose, onReload, onToast }) {
  const [section, setSection] = useState('overview') // overview | merch | materiel | consommables | checklist

  // Products by category with stock
  const productsByCategory = useMemo(() => {
    const result = {}
    CATEGORIES.forEach(cat => {
      const catProducts = products.filter(p => p.category === cat.id).map(p => {
        const stockEntries = stock.filter(s => s.product_id === p.id)
        const totalQty = stockEntries.reduce((sum, s) => sum + (s.quantity || 0), 0)
        const byLocation = locations.map(loc => ({
          ...loc,
          qty: stockEntries.find(s => s.location_id === loc.id)?.quantity || 0,
        })).filter(l => l.qty > 0)
        const sf = subfamilies.find(sf => sf.id === p.subfamily_id)
        return { ...p, totalQty, byLocation, subfamilyName: sf?.name || '' }
      }).sort((a, b) => a.name.localeCompare(b.name))
      result[cat.id] = catProducts
    })
    return result
  }, [products, stock, locations, subfamilies])

  // Checklist for this event
  const eventChecklist = useMemo(() =>
    checklists.filter(c => c.event_id === event.id),
    [checklists, event.id]
  )
  const checkDone = eventChecklist.filter(c => c.checked).length
  const checkTotal = eventChecklist.length

  // Group checklist by category
  const checklistGrouped = useMemo(() => {
    const groups = {}
    eventChecklist.forEach(item => {
      const cat = item.category || 'autre'
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(item)
    })
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
  }, [eventChecklist])

  // Toggle checklist item
  const toggleCheck = async (item) => {
    try {
      await db.update('checklists', `id=eq.${item.id}`, {
        checked: !item.checked,
        checked_at: !item.checked ? new Date().toISOString() : null,
      })
      onReload()
    } catch (e) {
      onToast('Erreur: ' + e.message, '#D4648A')
    }
  }

  // Add checklist item
  const [addItem, setAddItem] = useState('')
  const [addCat, setAddCat] = useState('logistique')
  const handleAddItem = async () => {
    if (!addItem.trim()) return
    try {
      await db.insert('checklists', {
        event_id: event.id,
        item: addItem.trim(),
        category: addCat,
        checked: false,
      })
      setAddItem('')
      onToast('Item ajouté')
      onReload()
    } catch (e) {
      onToast('Erreur: ' + e.message, '#D4648A')
    }
  }

  // Stats per category
  const catStats = CATEGORIES.map(cat => {
    const prods = productsByCategory[cat.id]
    const totalQty = prods.reduce((sum, p) => sum + p.totalQty, 0)
    return { ...cat, count: prods.length, qty: totalQty }
  })

  // Days until event
  const daysUntil = Math.ceil((new Date(event.date) - new Date()) / 86400000)

  const SECTIONS = [
    { id: 'overview', label: 'Résumé', icon: '📋' },
    { id: 'merch', label: 'Merch', icon: '👕' },
    { id: 'materiel', label: 'Matériel', icon: '🎸' },
    { id: 'consommables', label: 'Conso', icon: '🔋' },
    { id: 'checklist', label: `Check (${checkDone}/${checkTotal})`, icon: '✅' },
  ]

  return (
    <Modal title="" onClose={onClose}>
      {/* Event header */}
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 900, color: '#3D3042', marginBottom: 4 }}>{event.name}</div>
        <div style={{ fontSize: 13, color: '#9A8B94', marginBottom: 8 }}>
          {event.lieu} — {event.ville} ({event.territoire})
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Badge color="#E8735A">
            {new Date(event.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
          </Badge>
          <Badge color={daysUntil <= 3 ? '#D4648A' : daysUntil <= 7 ? '#E8935A' : '#5B8DB8'}>
            {daysUntil > 0 ? `J-${daysUntil}` : daysUntil === 0 ? "Aujourd'hui" : 'Passé'}
          </Badge>
          {event.format && <Badge color="#5DAB8B">{event.format}</Badge>}
          {event.capacite && <Badge color="#9B7DC4">{event.capacite} pers.</Badge>}
        </div>
      </div>

      {/* Section tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
        {SECTIONS.map(s => (
          <button key={s.id} onClick={() => setSection(s.id)} style={{
            padding: '6px 12px', borderRadius: 16, fontSize: 11, fontWeight: 700,
            whiteSpace: 'nowrap', cursor: 'pointer', transition: 'all 0.15s',
            border: `1.5px solid ${section === s.id ? '#E8735A' : '#E8DED8'}`,
            background: section === s.id ? '#E8735A12' : 'white',
            color: section === s.id ? '#E8735A' : '#9A8B94',
          }}>
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      {/* ─── Overview ─── */}
      {section === 'overview' && (
        <div>
          {/* Prévisions */}
          {(event.ventes_prevues || event.ca_prevu) && (
            <div className="card" style={{ padding: '14px 16px', marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#9A8B94', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Prévisions merch</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {event.ventes_prevues != null && (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 900, color: '#E8735A' }}>{event.ventes_prevues}</div>
                    <div style={{ fontSize: 10, color: '#9A8B94', fontWeight: 600 }}>Ventes prévues</div>
                  </div>
                )}
                {event.ca_prevu != null && (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 900, color: '#5DAB8B' }}>{event.ca_prevu}€</div>
                    <div style={{ fontSize: 10, color: '#9A8B94', fontWeight: 600 }}>CA prévu</div>
                  </div>
                )}
                {event.merch_a_transferer != null && (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 900, color: '#5B8DB8' }}>{event.merch_a_transferer}</div>
                    <div style={{ fontSize: 10, color: '#9A8B94', fontWeight: 600 }}>À transférer</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Résultats réels */}
          {(event.ventes_reelles != null || event.ca_reel != null) && (
            <div className="card" style={{ padding: '14px 16px', marginBottom: 12, borderLeft: '4px solid #5DAB8B' }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#9A8B94', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Résultats réels</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {event.ventes_reelles != null && (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 900, color: '#5DAB8B' }}>{event.ventes_reelles}</div>
                    <div style={{ fontSize: 10, color: '#9A8B94', fontWeight: 600 }}>Ventes réelles</div>
                  </div>
                )}
                {event.ca_reel != null && (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 900, color: '#5DAB8B' }}>{event.ca_reel}€</div>
                    <div style={{ fontSize: 10, color: '#9A8B94', fontWeight: 600 }}>CA réel</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Stock overview by category */}
          <div style={{ fontSize: 12, fontWeight: 800, color: '#9A8B94', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, padding: '0 4px' }}>Stock disponible</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
            {catStats.map(cat => (
              <button key={cat.id} onClick={() => setSection(cat.id)} className="card" style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer', textAlign: 'left',
              }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 12, background: cat.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                }}>{cat.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{cat.name}</div>
                  <div style={{ fontSize: 11, color: '#9A8B94' }}>{cat.count} réf.</div>
                </div>
                <div style={{ fontSize: 20, fontWeight: 900, color: cat.color }}>{cat.qty}</div>
              </button>
            ))}
          </div>

          {/* Flags */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            {event.transport_inter_iles && <Badge color="#E8935A">Transport inter-îles</Badge>}
            {event.reappro_necessaire && <Badge color="#D4648A">Réappro nécessaire</Badge>}
            {event.statut && <Badge color="#5B8DB8">{event.statut}</Badge>}
          </div>

          {/* Notes */}
          {event.notes && (
            <div className="card" style={{ padding: '12px 16px', background: '#FFFBF5', borderLeft: '4px solid #E8935A' }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#E8935A', marginBottom: 6 }}>Notes</div>
              <div style={{ fontSize: 13, color: '#3D3042', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{event.notes}</div>
            </div>
          )}

          {/* Checklist progress */}
          {checkTotal > 0 && (
            <button onClick={() => setSection('checklist')} className="card" style={{
              marginTop: 12, padding: '14px 16px', width: '100%', cursor: 'pointer', textAlign: 'left',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>✅ Checklist</span>
                <span style={{ fontSize: 16, fontWeight: 900, color: checkDone === checkTotal ? '#5DAB8B' : '#E8735A' }}>
                  {checkDone}/{checkTotal}
                </span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: '#F0E8E4', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 3, transition: 'width 0.3s',
                  width: `${checkTotal > 0 ? Math.round((checkDone / checkTotal) * 100) : 0}%`,
                  background: checkDone === checkTotal ? '#5DAB8B' : 'linear-gradient(90deg, #E8735A, #D4648A)',
                }} />
              </div>
            </button>
          )}
        </div>
      )}

      {/* ─── Product list sections ─── */}
      {(section === 'merch' || section === 'materiel' || section === 'consommables') && (
        <ProductSection
          products={productsByCategory[section]}
          category={CATEGORIES.find(c => c.id === section)}
          locations={locations}
        />
      )}

      {/* ─── Checklist section ─── */}
      {section === 'checklist' && (
        <div>
          {/* Progress */}
          <div className="card" style={{ padding: '14px 16px', marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{checkDone}/{checkTotal} complété{checkDone > 1 ? 's' : ''}</span>
              <span style={{ fontSize: 22, fontWeight: 900, color: checkDone === checkTotal && checkTotal > 0 ? '#5DAB8B' : '#E8735A' }}>
                {checkTotal > 0 ? Math.round((checkDone / checkTotal) * 100) : 0}%
              </span>
            </div>
            <div style={{ height: 8, borderRadius: 4, background: '#F0E8E4', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 4, transition: 'width 0.3s',
                width: `${checkTotal > 0 ? Math.round((checkDone / checkTotal) * 100) : 0}%`,
                background: checkDone === checkTotal && checkTotal > 0
                  ? 'linear-gradient(90deg, #5DAB8B, #4A9A7A)'
                  : 'linear-gradient(90deg, #E8735A, #D4648A)',
              }} />
            </div>
          </div>

          {/* Items grouped by category */}
          {checklistGrouped.map(([cat, items]) => {
            const conf = CHECK_CATS[cat] || { icon: '📋', color: '#9A8B94', label: cat }
            return (
              <div key={cat} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, padding: '0 4px' }}>
                  <span style={{ fontSize: 14 }}>{conf.icon}</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: conf.color, textTransform: 'uppercase', letterSpacing: 1 }}>{conf.label}</span>
                  <span style={{ fontSize: 11, color: '#B8A0AE' }}>{items.filter(i => i.checked).length}/{items.length}</span>
                </div>
                {items.map(item => (
                  <div key={item.id} className="card" style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', marginBottom: 6,
                    opacity: item.checked ? 0.6 : 1,
                  }}>
                    <button onClick={() => toggleCheck(item)} style={{
                      width: 26, height: 26, borderRadius: 7, flexShrink: 0,
                      border: `2px solid ${item.checked ? conf.color : '#D8CDD2'}`,
                      background: item.checked ? conf.color : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', fontSize: 13, fontWeight: 900, cursor: 'pointer',
                    }}>
                      {item.checked ? '✓' : ''}
                    </button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 13, fontWeight: 600,
                        textDecoration: item.checked ? 'line-through' : 'none',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>{item.item}</div>
                      {item.checked_at && (
                        <div style={{ fontSize: 10, color: '#B8A0AE', marginTop: 1 }}>{fmtDate(item.checked_at)}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          })}

          {/* Add item inline */}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <select className="input" value={addCat} onChange={e => setAddCat(e.target.value)} style={{ width: 90, fontSize: 11, padding: '8px 6px' }}>
              {Object.entries(CHECK_CATS).map(([id, conf]) => (
                <option key={id} value={id}>{conf.icon} {conf.label}</option>
              ))}
            </select>
            <input className="input" value={addItem} onChange={e => setAddItem(e.target.value)}
              placeholder="Ajouter un item..." style={{ flex: 1, fontSize: 13 }}
              onKeyDown={e => e.key === 'Enter' && handleAddItem()} />
            <button onClick={handleAddItem} disabled={!addItem.trim()} style={{
              padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 800,
              background: addItem.trim() ? '#E8735A' : '#E8DED8', color: 'white', cursor: 'pointer',
            }}>+</button>
          </div>
        </div>
      )}
    </Modal>
  )
}

// ─── Product Section (Merch / Matériel / Consommables) ───
function ProductSection({ products, category, locations }) {
  const [expandedSub, setExpandedSub] = useState('all')

  // Group by subfamily
  const grouped = useMemo(() => {
    const groups = {}
    products.forEach(p => {
      const key = p.subfamilyName || 'Autre'
      if (!groups[key]) groups[key] = []
      groups[key].push(p)
    })
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
  }, [products])

  const totalQty = products.reduce((sum, p) => sum + p.totalQty, 0)
  const lowStock = products.filter(p => p.totalQty > 0 && p.totalQty <= (p.min_stock || 5))
  const outOfStock = products.filter(p => p.totalQty === 0)

  return (
    <div>
      {/* Summary */}
      <div className="card" style={{ padding: '14px 16px', marginBottom: 14, borderLeft: `4px solid ${category.color}` }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 900, color: category.color }}>{totalQty}</div>
            <div style={{ fontSize: 10, color: '#9A8B94', fontWeight: 600 }}>Total stock</div>
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 900, color: outOfStock.length > 0 ? '#D4648A' : '#5DAB8B' }}>{outOfStock.length}</div>
            <div style={{ fontSize: 10, color: '#9A8B94', fontWeight: 600 }}>Ruptures</div>
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 900, color: lowStock.length > 0 ? '#E8935A' : '#5DAB8B' }}>{lowStock.length}</div>
            <div style={{ fontSize: 10, color: '#9A8B94', fontWeight: 600 }}>Stock bas</div>
          </div>
        </div>
      </div>

      {/* Products grouped by subfamily */}
      {grouped.map(([subfam, prods]) => (
        <div key={subfam} style={{ marginBottom: 12 }}>
          <button onClick={() => setExpandedSub(expandedSub === subfam ? 'all' : subfam)} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
            padding: '6px 4px', cursor: 'pointer', textAlign: 'left',
          }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: category.color, textTransform: 'uppercase', letterSpacing: 1 }}>
              {subfam}
            </span>
            <span style={{ fontSize: 11, color: '#B8A0AE', fontWeight: 600 }}>
              {prods.reduce((s, p) => s + p.totalQty, 0)} pcs · {prods.length} réf.
            </span>
          </button>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {prods.map(p => {
              const isZero = p.totalQty === 0
              const isLow = p.totalQty > 0 && p.totalQty <= (p.min_stock || 5)
              return (
                <div key={p.id} className="card" style={{ padding: '8px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 18 }}>{p.image || category.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 13, fontWeight: 600, overflow: 'hidden',
                        textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>{p.name}</div>
                      <div style={{ fontSize: 10, color: '#B8A0AE' }}>
                        {p.sku}
                        {p.byLocation.length > 0 && (' · ' + p.byLocation.map(l => `${l.name}: ${l.qty}`).join(', '))}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{
                        fontSize: 16, fontWeight: 900,
                        color: isZero ? '#D4648A' : isLow ? '#E8935A' : '#5DAB8B',
                      }}>{p.totalQty}</div>
                      {isZero && <div style={{ fontSize: 8, color: '#D4648A', fontWeight: 700 }}>RUPTURE</div>}
                      {isLow && <div style={{ fontSize: 8, color: '#E8935A', fontWeight: 700 }}>BAS</div>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {products.length === 0 && (
        <div className="empty-state" style={{ padding: 24 }}>
          <div className="empty-icon">{category.icon}</div>
          <div className="empty-text">Aucun produit dans cette catégorie</div>
        </div>
      )}
    </div>
  )
}
