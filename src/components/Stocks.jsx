import React, { useState, useMemo } from 'react'
import { MapPin, Factory, Truck, Tent, Plane, Package, Home, ArrowDownToLine, ArrowUpFromLine, Trash2, ChevronDown, ChevronRight, Plus, Download } from 'lucide-react'
import { db } from '../lib/supabase'
import { Modal, Confirm, getCat, CATEGORIES, Badge } from './UI'
import { exportCSV, todayISO } from '../lib/csvExport'

const ICON_MAP = {
  '📍': MapPin,
  '🏭': Factory,
  '🚐': Truck,
  '🎪': Tent,
  '✈️': Plane,
  '📦': Package,
  '🏠': Home,
}

const ICON_KEYS = Object.keys(ICON_MAP)

const PALETTE = {
  textPrimary: '#1E293B',
  textSecondary: '#64748B',
  textTertiary: '#94A3B8',
  accent: '#6366F1',
  bgSurface: '#F8FAFC',
  bgHover: '#F1F5F9',
  border: '#E2E8F0',
  danger: '#DC2626',
}

const LOCATION_COLORS = ['#6366F1', '#DC2626', '#2563EB', '#16A34A', '#D97706', '#8B5DAB']

function LocationIcon({ emoji, size = 20, color }) {
  const IconComponent = ICON_MAP[emoji] || MapPin
  return <IconComponent size={size} color={color || PALETTE.textSecondary} />
}

export default function Stocks({ products, locations, stock, orgId, onReload, onToast, onMovement }) {
  const [expanded, setExpanded] = useState({})
  const [filterCat, setFilterCat] = useState('all')
  const [modal, setModal] = useState(null)
  const [confirm, setConfirm] = useState(null)

  const toggle = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }))

  const locationData = useMemo(() => {
    return locations.map(loc => {
      const locStock = stock.filter(s => s.location_id === loc.id && s.quantity > 0)
      let items = locStock.map(s => {
        const product = products.find(p => p.id === s.product_id)
        if (!product || product.active === false) return null
        return { ...s, product }
      }).filter(Boolean)

      if (filterCat !== 'all') {
        items = items.filter(i => i.product.category === filterCat)
      }

      const totalQty = items.reduce((sum, i) => sum + i.quantity, 0)
      return { ...loc, items, totalQty, nbProducts: items.length }
    })
  }, [locations, stock, products, filterCat])

  const globalTotal = locationData.reduce((sum, l) => sum + l.totalQty, 0)

  const handleDeleteLocation = async (loc) => {
    try {
      await db.delete('stock', `location_id=eq.${loc.id}`)
      await db.delete('locations', `id=eq.${loc.id}`)
      onToast('Lieu supprimé')
      setConfirm(null)
      setModal(null)
      onReload()
    } catch (e) {
      onToast('Erreur: ' + e.message, PALETTE.danger)
    }
  }

  return (
    <div style={{ padding: '0 16px 24px' }}>
      {/* Total bar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 16, padding: '14px 18px', borderRadius: 12,
        background: PALETTE.bgSurface, border: `1px solid ${PALETTE.border}`,
      }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: PALETTE.textTertiary, textTransform: 'uppercase', letterSpacing: 1 }}>Stock total</div>
          <div style={{ fontSize: 28, fontWeight: 600, color: PALETTE.accent }}>{globalTotal}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: PALETTE.textTertiary }}>{locations.length} lieu{locations.length > 1 ? 'x' : ''}</div>
            <div style={{ fontSize: 11, color: PALETTE.textTertiary }}>{products.length} produits</div>
          </div>
          <button onClick={() => {
            const rows = []
            locationData.forEach(loc => {
              loc.items.forEach(item => {
                rows.push({ product: item.product.name, sku: item.product.sku, location: loc.name, quantity: item.quantity })
              })
            })
            exportCSV(rows, `stock-${todayISO()}.csv`, [
              { key: 'product', label: 'Produit' },
              { key: 'sku', label: 'SKU' },
              { key: 'location', label: 'Lieu' },
              { key: 'quantity', label: 'Quantité' },
            ])
            if (onToast) onToast('Export CSV stock téléchargé')
          }} style={{
            width: 36, height: 36, borderRadius: 8,
            background: 'rgba(22,163,106,0.08)',
            border: '1px solid rgba(22,163,106,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            padding: 0, flexShrink: 0,
          }} title="Exporter CSV">
            <Download size={16} color="#16A34A" />
          </button>
        </div>
      </div>

      {/* Category filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
        <FilterPill active={filterCat === 'all'} onClick={() => setFilterCat('all')}>Tous</FilterPill>
        {CATEGORIES.map(cat => {
          const CatIcon = cat.icon
          return (
            <FilterPill key={cat.id} active={filterCat === cat.id} color={cat.color} onClick={() => setFilterCat(cat.id)}>
              <CatIcon size={13} style={{ marginRight: 4, verticalAlign: -2 }} /> {cat.name}
            </FilterPill>
          )
        })}
      </div>

      {/* Locations */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {locationData.map(loc => (
          <div key={loc.id} style={{
            borderRadius: 12, overflow: 'hidden',
            background: PALETTE.bgSurface, border: `1px solid ${PALETTE.border}`,
          }}>
            {/* Location header */}
            <button onClick={() => toggle(loc.id)} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
            }}>
              <div style={{
                width: 42, height: 42, borderRadius: 12,
                background: (loc.color || PALETTE.accent) + '15',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <LocationIcon emoji={loc.icon || '📍'} size={20} color={loc.color || PALETTE.accent} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: PALETTE.textPrimary }}>{loc.name}</div>
                <div style={{ fontSize: 11, color: PALETTE.textTertiary }}>
                  {loc.nbProducts} réf. · {loc.totalQty} pièces
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 20, fontWeight: 600, color: loc.color || PALETTE.accent }}>{loc.totalQty}</span>
                {expanded[loc.id]
                  ? <ChevronDown size={16} color={PALETTE.textTertiary} />
                  : <ChevronRight size={16} color={PALETTE.textTertiary} />
                }
              </div>
            </button>

            {/* Expanded: stock items */}
            {expanded[loc.id] && (
              <div style={{ borderTop: `1px solid ${PALETTE.border}`, padding: '8px 16px 12px' }}>
                {loc.items.length === 0 ? (
                  <div style={{ padding: '12px 0', textAlign: 'center', fontSize: 13, color: PALETTE.textTertiary }}>
                    Aucun stock ici
                  </div>
                ) : (
                  loc.items.sort((a, b) => a.product.name.localeCompare(b.product.name)).map(item => {
                    const cat = getCat(item.product.category)
                    const CatIcon = cat.icon
                    return (
                      <div key={item.product_id} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 0', borderBottom: `1px solid ${PALETTE.border}`,
                      }}>
                        <CatIcon size={16} color={cat.color} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: PALETTE.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.product.name}
                          </div>
                          <div style={{ fontSize: 10, color: cat.color }}>{cat.name}</div>
                        </div>
                        <span style={{ fontSize: 16, fontWeight: 600, color: item.quantity <= (item.product.min_stock || 5) ? '#D97706' : PALETTE.textPrimary }}>
                          {item.quantity}
                        </span>
                      </div>
                    )
                  })
                )}
                {/* Location actions */}
                <div style={{ display: 'flex', gap: 8, marginTop: 8, paddingTop: 8, borderTop: `1px solid ${PALETTE.border}` }}>
                  <button className="btn-secondary" style={{ flex: 1, fontSize: 12, padding: '8px 12px', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                    onClick={() => onMovement('in', loc.id)}>
                    <ArrowDownToLine size={14} /> Entrée
                  </button>
                  <button className="btn-secondary" style={{ flex: 1, fontSize: 12, padding: '8px 12px', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                    onClick={() => onMovement('out', loc.id)}>
                    <ArrowUpFromLine size={14} /> Sortie
                  </button>
                  <button className="btn-secondary" style={{ fontSize: 12, padding: '8px 12px', borderRadius: 8, borderColor: `${PALETTE.danger}30`, color: PALETTE.danger, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onClick={() => setConfirm({
                      message: `Supprimer "${loc.name}" ?`,
                      detail: 'Le lieu et tout le stock associé seront supprimés.',
                      onConfirm: () => handleDeleteLocation(loc),
                    })}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add location button */}
      <button onClick={() => setModal({ type: 'addLocation' })} style={{
        width: '100%', marginTop: 16, padding: 14, borderRadius: 12,
        border: `2px dashed ${PALETTE.border}`, background: 'transparent',
        color: PALETTE.textTertiary, fontSize: 14, fontWeight: 700, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      }}>
        <Plus size={16} /> Ajouter un lieu de stockage
      </button>

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
              onToast('Erreur: ' + e.message, PALETTE.danger)
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
          confirmColor={PALETTE.danger}
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
  const [color, setColor] = useState('#6366F1')

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
            {ICON_KEYS.map(key => {
              const IconComp = ICON_MAP[key]
              const isActive = icon === key
              return (
                <button key={key} onClick={() => setIcon(key)} style={{
                  width: 44, height: 44, borderRadius: 12, fontSize: 22,
                  border: `2px solid ${isActive ? PALETTE.accent : PALETTE.border}`,
                  background: isActive ? `${PALETTE.accent}12` : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                }}>
                  <IconComp size={20} color={isActive ? PALETTE.accent : PALETTE.textTertiary} />
                </button>
              )
            })}
          </div>
        </div>
        <div>
          <label className="label">Couleur</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {LOCATION_COLORS.map(c => (
              <button key={c} onClick={() => setColor(c)} style={{
                width: 36, height: 36, borderRadius: 10,
                background: c, border: `3px solid ${color === c ? PALETTE.textPrimary : 'transparent'}`,
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
      border: `1px solid ${active ? (color || PALETTE.accent) : PALETTE.border}`,
      background: active ? `${color || PALETTE.accent}12` : 'transparent',
      color: active ? (color || PALETTE.accent) : PALETTE.textSecondary, cursor: 'pointer',
      display: 'flex', alignItems: 'center',
    }}>{children}</button>
  )
}
