import React, { useState, useMemo } from 'react'
import { db } from '../lib/supabase'
import { Modal, Confirm, getCat, CATEGORIES, Badge } from './UI'

export default function Stocks({ products, locations, stock, orgId, onReload, onToast, onMovement }) {
  const [expanded, setExpanded] = useState({})
  const [filterCat, setFilterCat] = useState('all')
  const [modal, setModal] = useState(null) // {type: 'addLocation'} | {type: 'locationDetail', location}
  const [confirm, setConfirm] = useState(null)

  // Toggle location expand
  const toggle = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }))

  // Stock data by location
  const locationData = useMemo(() => {
    return locations.map(loc => {
      const locStock = stock.filter(s => s.location_id === loc.id && s.quantity > 0)
      let items = locStock.map(s => {
        const product = products.find(p => p.id === s.product_id)
        if (!product) return null
        return { ...s, product }
      }).filter(Boolean)

      if (filterCat !== 'all') {
        items = items.filter(i => i.product.category === filterCat)
      }

      const totalQty = items.reduce((sum, i) => sum + i.quantity, 0)
      return { ...loc, items, totalQty, nbProducts: items.length }
    })
  }, [locations, stock, products, filterCat])

  // Global totals
  const globalTotal = locationData.reduce((sum, l) => sum + l.totalQty, 0)

  // Delete location
  const handleDeleteLocation = async (loc) => {
    try {
      await db.delete('stock', `location_id=eq.${loc.id}`)
      await db.delete('locations', `id=eq.${loc.id}`)
      onToast('Lieu supprimé')
      setConfirm(null)
      setModal(null)
      onReload()
    } catch (e) {
      onToast('Erreur: ' + e.message, '#8B1A2B')
    }
  }

  return (
    <div style={{ padding: '0 16px 24px' }}>
      {/* Total bar */}
      <div className="card" style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 16, padding: '14px 18px', background: 'linear-gradient(135deg, #080808, #FEF0E8)',
      }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#8A7D75', textTransform: 'uppercase', letterSpacing: 1 }}>Stock total</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#C8A46A' }}>{globalTotal}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: '#8A7D75' }}>{locations.length} lieu{locations.length > 1 ? 'x' : ''}</div>
          <div style={{ fontSize: 11, color: '#8A7D75' }}>{products.length} produits</div>
        </div>
      </div>

      {/* Category filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
        <FilterPill active={filterCat === 'all'} onClick={() => setFilterCat('all')}>Tous</FilterPill>
        {CATEGORIES.map(cat => (
          <FilterPill key={cat.id} active={filterCat === cat.id} color={cat.color} onClick={() => setFilterCat(cat.id)}>
            {cat.icon} {cat.name}
          </FilterPill>
        ))}
      </div>

      {/* Locations */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {locationData.map(loc => (
          <div key={loc.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {/* Location header */}
            <button onClick={() => toggle(loc.id)} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
            }}>
              <div style={{
                width: 42, height: 42, borderRadius: 12,
                background: (loc.color || '#C8A46A') + '15',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
              }}>{loc.icon || '📍'}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#F0ECE2' }}>{loc.name}</div>
                <div style={{ fontSize: 11, color: '#8A7D75' }}>
                  {loc.nbProducts} réf. · {loc.totalQty} pièces
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 20, fontWeight: 900, color: loc.color || '#C8A46A' }}>{loc.totalQty}</span>
                <span style={{ fontSize: 14, color: '#6B6058', transition: 'transform 0.2s', transform: expanded[loc.id] ? 'rotate(180deg)' : '' }}>▼</span>
              </div>
            </button>

            {/* Expanded: stock items */}
            {expanded[loc.id] && (
              <div style={{ borderTop: '1px solid #1a1a1a', padding: '8px 16px 12px' }}>
                {loc.items.length === 0 ? (
                  <div style={{ padding: '12px 0', textAlign: 'center', fontSize: 13, color: '#6B6058' }}>
                    Aucun stock ici
                  </div>
                ) : (
                  loc.items.sort((a, b) => a.product.name.localeCompare(b.product.name)).map(item => {
                    const cat = getCat(item.product.category)
                    return (
                      <div key={item.product_id} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 0', borderBottom: '1px solid #F8F4F0',
                      }}>
                        <span style={{ fontSize: 16 }}>{item.product.image || cat.icon}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.product.name}
                          </div>
                          <div style={{ fontSize: 10, color: cat.color }}>{cat.name}</div>
                        </div>
                        <span style={{ fontSize: 16, fontWeight: 800, color: item.quantity <= (item.product.min_stock || 5) ? '#C8A46A' : '#F0ECE2' }}>
                          {item.quantity}
                        </span>
                      </div>
                    )
                  })
                )}
                {/* Location actions */}
                <div style={{ display: 'flex', gap: 8, marginTop: 8, paddingTop: 8, borderTop: '1px solid #1a1a1a' }}>
                  <button className="btn-secondary" style={{ flex: 1, fontSize: 12, padding: '8px 12px' }}
                    onClick={() => onMovement('in', loc.id)}>📥 Entrée</button>
                  <button className="btn-secondary" style={{ flex: 1, fontSize: 12, padding: '8px 12px' }}
                    onClick={() => onMovement('out', loc.id)}>📤 Sortie</button>
                  <button className="btn-secondary" style={{ flex: 1, fontSize: 12, padding: '8px 12px', borderColor: '#8B1A2B30', color: '#8B1A2B' }}
                    onClick={() => setConfirm({
                      message: `Supprimer "${loc.name}" ?`,
                      detail: 'Le lieu et tout le stock associé seront supprimés.',
                      onConfirm: () => handleDeleteLocation(loc),
                    })}>🗑️</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add location button */}
      <button onClick={() => setModal({ type: 'addLocation' })} style={{
        width: '100%', marginTop: 16, padding: 14, borderRadius: 16,
        border: '2px dashed #222222', background: 'transparent',
        color: '#8A7D75', fontSize: 14, fontWeight: 700, cursor: 'pointer',
      }}>+ Ajouter un lieu de stockage</button>

      {/* Add Location Modal */}
      {modal?.type === 'addLocation' && (
        <AddLocationModal
          onClose={() => setModal(null)}
          onSave={async (data) => {
            try {
              await db.insert('locations', { ...data, org_id: orgId })
              onToast('Lieu ajouté')
              setModal(null)
              onReload()
            } catch (e) {
              onToast('Erreur: ' + e.message, '#8B1A2B')
            }
          }}
        />
      )}

      {/* Confirm */}
      {confirm && (
        <Confirm
          message={confirm.message}
          detail={confirm.detail}
          confirmLabel="Supprimer"
          confirmColor="#8B1A2B"
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  )
}

// ─── Add Location Modal ───
function AddLocationModal({ onClose, onSave }) {
  const [name, setName] = useState('')
  const [type, setType] = useState('fixe')
  const [icon, setIcon] = useState('📍')
  const [color, setColor] = useState('#C8A46A')

  const icons = ['📍', '🏭', '🚐', '🎪', '✈️', '📦', '🏠']
  const colors = ['#C8A46A', '#8B1A2B', '#5B8DB8', '#2FB65D', '#C8A46A', '#8B5DAB']

  return (
    <Modal title="Nouveau lieu" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label className="label">Nom du lieu *</label>
          <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Entrepôt Martinique" />
        </div>
        <div>
          <label className="label">Type</label>
          <select className="input" value={type} onChange={e => setType(e.target.value)}>
            <option value="fixe">Fixe (entrepôt)</option>
            <option value="mobile">Mobile (véhicule)</option>
            <option value="ephemere">Éphémère (stand)</option>
            <option value="temporaire">Temporaire (transit)</option>
          </select>
        </div>
        <div>
          <label className="label">Icône</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {icons.map(i => (
              <button key={i} onClick={() => setIcon(i)} style={{
                width: 44, height: 44, borderRadius: 12, fontSize: 22,
                border: `2px solid ${icon === i ? '#C8A46A' : '#222222'}`,
                background: icon === i ? '#C8A46A12' : 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              }}>{i}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="label">Couleur</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {colors.map(c => (
              <button key={c} onClick={() => setColor(c)} style={{
                width: 36, height: 36, borderRadius: 10,
                background: c, border: `3px solid ${color === c ? '#F0ECE2' : 'transparent'}`,
                cursor: 'pointer',
              }} />
            ))}
          </div>
        </div>
        <button className="btn-primary" onClick={() => { if (name.trim()) onSave({ name: name.trim(), type, icon, color }) }} disabled={!name.trim()}>
          Ajouter le lieu
        </button>
      </div>
    </Modal>
  )
}

function FilterPill({ active, color, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
      border: `1.5px solid ${active ? (color || '#C8A46A') : '#222222'}`,
      background: active ? `${color || '#C8A46A'}12` : 'white',
      color: active ? (color || '#C8A46A') : '#8A7D75', cursor: 'pointer',
    }}>{children}</button>
  )
}
