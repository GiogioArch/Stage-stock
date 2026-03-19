import React, { useState, useMemo } from 'react'
import { useToast, useProject } from '../shared/hooks'
import { MapPin, Factory, Truck, Tent, Plane, Package, Home, ArrowDownToLine, ArrowUpFromLine, Trash2, ChevronDown, ChevronRight, Plus } from 'lucide-react'
import { db } from '../lib/supabase'
import { Modal, Confirm, getCat, CATEGORIES, Badge } from './UI'
import { getModuleTheme, BASE, SEMANTIC, SPACE, TYPO, RADIUS, SHADOW } from '../lib/theme'
import { GradientHeader, FilterPills } from '../design'

const theme = getModuleTheme('stock')

const ICON_MAP = {
  // Legacy emoji keys (existing DB entries)
  '📍': MapPin,
  '🏭': Factory,
  '🚐': Truck,
  '🎪': Tent,
  '✈️': Plane,
  '📦': Package,
  '🏠': Home,
  // New Lucide name keys
  'MapPin': MapPin,
  'Warehouse': Factory,
  'Store': Tent,
  'Building': Plane,
  'Box': Package,
  'Truck': Truck,
  'Home': Home,
  'Package': Package,
}

// Only legacy emoji keys for the icon picker (backward compat with existing DB data)
const ICON_KEYS = ['📍', '🏭', '🚐', '🎪', '✈️', '📦', '🏠']

const LOCATION_COLORS = [theme.color, SEMANTIC.danger, SEMANTIC.info, SEMANTIC.success, SEMANTIC.warning, SEMANTIC.melodie]

function LocationIcon({ emoji, size = 20, color }) {
  const IconComponent = ICON_MAP[emoji] || MapPin
  return <IconComponent size={size} color={color || BASE.textSoft} />
}

export default function Stocks({ products, locations, stock, onToast: _legacyToast, onMovement }) {
  const toast = useToast()
  const onToast = _legacyToast || toast
  const { orgId, reload } = useProject()
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

  const globalTotal = locationData.reduce((sum, l) => sum + l.totalQty, 0)

  const handleDeleteLocation = async (loc) => {
    try {
      await db.delete('stock', `location_id=eq.${loc.id}`)
      await db.delete('locations', `id=eq.${loc.id}`)
      onToast('Lieu supprimé')
      setConfirm(null)
      setModal(null)
      reload()
    } catch (e) {
      onToast('Erreur: ' + e.message, SEMANTIC.danger)
    }
  }

  return (
    <div style={{ paddingBottom: SPACE.xxl }}>
      {/* ─── Gradient Header ─── */}
      <GradientHeader
        module="stock"
        title={`${products.length} produit${products.length > 1 ? 's' : ''}`}
        subtitle={`${products.length} produits · ${locations.length} lieu${locations.length > 1 ? 'x' : ''}`}
        stats={[
          { value: globalTotal, label: 'Pièces totales' },
          { value: locations.length, label: 'Lieux' },
        ]}
      />

      <div style={{ padding: '0 16px' }}>
      {/* Category filter */}
      <FilterPills
        options={[
          { id: 'all', label: 'Tous' },
          ...CATEGORIES.map(cat => ({ id: cat.id, label: cat.name, icon: cat.icon })),
        ]}
        active={filterCat}
        onChange={setFilterCat}
      />

      {/* Locations */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {locationData.map(loc => (
          <div key={loc.id} style={{
            borderRadius: 12, overflow: 'hidden',
            background: BASE.bgSurface, border: `1px solid ${BASE.border}`,
          }}>
            {/* Location header */}
            <button onClick={() => toggle(loc.id)} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
            }}>
              <div style={{
                width: 42, height: 42, borderRadius: 12,
                background: (loc.color || theme.color) + '15',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <LocationIcon emoji={loc.icon || 'MapPin'} size={20} color={loc.color || theme.color} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: BASE.text }}>{loc.name}</div>
                <div style={{ fontSize: 11, color: BASE.textMuted }}>
                  {loc.nbProducts} réf. · {loc.totalQty} pièces
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 20, fontWeight: 600, color: loc.color || theme.color }}>{loc.totalQty}</span>
                {expanded[loc.id]
                  ? <ChevronDown size={16} color={BASE.textMuted} />
                  : <ChevronRight size={16} color={BASE.textMuted} />
                }
              </div>
            </button>

            {/* Expanded: stock items */}
            {expanded[loc.id] && (
              <div style={{ borderTop: `1px solid ${BASE.border}`, padding: '8px 16px 12px' }}>
                {loc.items.length === 0 ? (
                  <div style={{ padding: '12px 0', textAlign: 'center', fontSize: 13, color: BASE.textMuted }}>
                    Aucun stock ici
                  </div>
                ) : (
                  loc.items.sort((a, b) => a.product.name.localeCompare(b.product.name)).map(item => {
                    const cat = getCat(item.product.category)
                    const CatIcon = cat.icon
                    return (
                      <div key={item.product_id} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 0', borderBottom: `1px solid ${BASE.border}`,
                      }}>
                        <CatIcon size={16} color={cat.color} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: BASE.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.product.name}
                          </div>
                          <div style={{ fontSize: 10, color: cat.color }}>{cat.name}</div>
                        </div>
                        <span style={{ fontSize: 16, fontWeight: 600, color: item.quantity <= (item.product.min_stock || 5) ? SEMANTIC.warning : BASE.text }}>
                          {item.quantity}
                        </span>
                      </div>
                    )
                  })
                )}
                {/* Location actions */}
                <div style={{ display: 'flex', gap: 8, marginTop: 8, paddingTop: 8, borderTop: `1px solid ${BASE.border}` }}>
                  <button className="btn-secondary" style={{ flex: 1, fontSize: 12, padding: '8px 12px', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                    onClick={() => onMovement('in', loc.id)}>
                    <ArrowDownToLine size={14} /> Entrée
                  </button>
                  <button className="btn-secondary" style={{ flex: 1, fontSize: 12, padding: '8px 12px', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                    onClick={() => onMovement('out', loc.id)}>
                    <ArrowUpFromLine size={14} /> Sortie
                  </button>
                  <button className="btn-secondary" aria-label="Supprimer le lieu" style={{ fontSize: 12, padding: '8px 12px', borderRadius: 8, borderColor: `${SEMANTIC.danger}30`, color: SEMANTIC.danger, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
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
        border: `2px dashed ${BASE.border}`, background: 'transparent',
        color: BASE.textMuted, fontSize: 14, fontWeight: 700, cursor: 'pointer',
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
              reload()
            } catch (e) {
              onToast('Erreur: ' + e.message, SEMANTIC.danger)
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
          confirmColor={SEMANTIC.danger}
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
      </div>
    </div>
  )
}

// ─── Add Location Modal ───
function AddLocationModal({ onClose, onSave }) {
  const [name, setName] = useState('')
  const [type, setType] = useState('fixe')
  const [icon, setIcon] = useState('MapPin')
  const [color, setColor] = useState(theme.color)

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
                  border: `2px solid ${isActive ? theme.color : BASE.border}`,
                  background: isActive ? theme.tint08 : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                }}>
                  <IconComp size={20} color={isActive ? theme.color : BASE.textMuted} />
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
                background: c, border: `3px solid ${color === c ? BASE.text : 'transparent'}`,
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

