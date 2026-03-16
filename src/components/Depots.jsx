import React, { useState, useMemo } from 'react'
import { db } from '../lib/supabase'
import { Badge } from './UI'
import DepotDetail from './DepotDetail'

export default function Depots({ locations, stock, products, movements, families, subfamilies, orgId, onReload, onToast, onMovement }) {
  const [showAdd, setShowAdd] = useState(false)
  const [expandedId, setExpandedId] = useState(null)
  const [selectedDepot, setSelectedDepot] = useState(null)
  const [editingLocation, setEditingLocation] = useState(null)
  const [deletingLocation, setDeletingLocation] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // Stats per location
  const locationStats = useMemo(() => {
    return (locations || []).map(loc => {
      const locStock = (stock || []).filter(s => s.location_id === loc.id && s.quantity > 0)
      const totalQty = locStock.reduce((sum, s) => sum + (s.quantity || 0), 0)
      const nbProducts = new Set(locStock.map(s => s.product_id)).size
      // Products detail
      const productDetails = locStock
        .map(s => {
          const p = (products || []).find(pr => pr.id === s.product_id)
          return p ? { ...p, qty: s.quantity } : null
        })
        .filter(Boolean)
        .sort((a, b) => b.qty - a.qty)
      return { ...loc, totalQty, nbProducts, productDetails }
    })
  }, [locations, stock, products])

  const totalStock = locationStats.reduce((s, l) => s + l.totalQty, 0)
  const activeLocations = locationStats.filter(l => l.totalQty > 0).length

  const handleDelete = async () => {
    if (!deletingLocation) return
    setDeleting(true)
    try {
      // Delete stock and movements for this location, then the location itself
      await db.delete('stock', `location_id=eq.${deletingLocation.id}`)
      await db.delete('movements', `from_loc=eq.${deletingLocation.id}`)
      await db.delete('movements', `to_loc=eq.${deletingLocation.id}`)
      await db.delete('locations', `id=eq.${deletingLocation.id}`)
      onToast('Dépôt supprimé')
      setDeletingLocation(null)
      onReload()
    } catch (e) {
      onToast('Erreur: ' + e.message, '#EF4444')
    } finally {
      setDeleting(false)
    }
  }

  // ─── Depot detail overlay ───
  if (selectedDepot) {
    return (
      <DepotDetail
        location={selectedDepot}
        stock={stock}
        products={products}
        movements={movements}
        families={families}
        subfamilies={subfamilies}
        onClose={() => setSelectedDepot(null)}
        onMovement={onMovement}
        onToast={onToast}
        onEdit={(loc) => { setSelectedDepot(null); setEditingLocation(loc) }}
        onDelete={(loc) => { setSelectedDepot(null); setDeletingLocation(loc) }}
        onReload={onReload}
      />
    )
  }

  return (
    <div style={{ padding: '0 16px 24px' }}>

      {/* Header */}
      <div className="card" style={{
        marginBottom: 16, padding: '18px 16px',
        background: 'linear-gradient(135deg, #3B82F608, #3B82F618)',
        border: '1px solid #3B82F625',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 8,
            background: 'linear-gradient(135deg, #3B82F6, #4A7CA7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, color: 'white', boxShadow: '0 4px 16px #3B82F630',
          }}></div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#FAFAFA' }}>Dépôts de stockage</div>
            <div style={{ fontSize: 12, color: '#71717A', fontWeight: 600 }}>
              {locations.length} lieu{locations.length > 1 ? 'x' : ''} de stockage
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <KpiBox label="Lieux" value={locations.length} color="#3B82F6" />
          <KpiBox label="Actifs" value={activeLocations} color="#22C55E" />
          <KpiBox label="Stock total" value={totalStock} color="#6366F1" />
        </div>
      </div>

      {/* Edit location form */}
      {editingLocation && (
        <LocationForm
          location={editingLocation}
          orgId={orgId}
          onDone={() => { setEditingLocation(null); onReload() }}
          onCancel={() => setEditingLocation(null)}
          onToast={onToast}
        />
      )}

      {/* Delete confirmation */}
      {deletingLocation && (
        <div className="card" style={{
          padding: 20, marginBottom: 14,
          border: '2px solid #EF444430', background: 'rgba(200,164,106,0.08)',
        }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#EF4444', marginBottom: 8, textAlign: 'center' }}>
            Supprimer ce dépôt ?
          </div>
          <div style={{ fontSize: 12, color: '#71717A', textAlign: 'center', marginBottom: 6, lineHeight: 1.5 }}>
            <strong>{deletingLocation.icon} {deletingLocation.name}</strong>
          </div>
          {(() => {
            const locSt = locationStats.find(l => l.id === deletingLocation.id)
            if (locSt && locSt.totalQty > 0) {
              return (
                <div style={{
                  padding: '8px 12px', borderRadius: 10, marginBottom: 12,
                  background: '#FEF3CD', border: '1px solid #F0D78C',
                  fontSize: 11, color: '#856404', fontWeight: 700, textAlign: 'center',
                }}>
                  Ce dépôt contient {locSt.totalQty} unités de stock qui seront supprimées.
                </div>
              )
            }
            return null
          })()}
          <div style={{ fontSize: 11, color: '#71717A', textAlign: 'center', marginBottom: 16 }}>
            Cette action est irréversible.
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setDeletingLocation(null)} style={{
              flex: 1, padding: 12, borderRadius: 8, fontSize: 13, fontWeight: 700,
              background: '#18181B', color: '#71717A', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)',
            }}>Annuler</button>
            <button onClick={handleDelete} disabled={deleting} style={{
              flex: 1, padding: 12, borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: '#EF4444', color: 'white', cursor: 'pointer', border: 'none',
              opacity: deleting ? 0.6 : 1,
            }}>{deleting ? 'Suppression...' : 'Supprimer'}</button>
          </div>
        </div>
      )}

      {/* Add location */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button onClick={() => setShowAdd(!showAdd)} style={{
          padding: '8px 16px', borderRadius: 10, fontSize: 12, fontWeight: 600,
          background: showAdd ? '#18181B' : '#3B82F6', color: showAdd ? '#71717A' : 'white',
          cursor: 'pointer', border: 'none',
        }}>
          {showAdd ? 'Annuler' : '+ Ajouter un dépôt'}
        </button>
      </div>

      {showAdd && (
        <LocationForm
          orgId={orgId}
          onDone={() => { setShowAdd(false); onReload() }}
          onCancel={() => setShowAdd(false)}
          onToast={onToast}
        />
      )}

      {/* Locations list */}
      {locationStats.length === 0 ? (
        <div className="empty-state" style={{ padding: 40 }}>
          <div className="empty-icon"></div>
          <div className="empty-text">Aucun dépôt configuré</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {locationStats.map(loc => {
            const isExpanded = expandedId === loc.id
            const fillPct = totalStock > 0 ? Math.round((loc.totalQty / totalStock) * 100) : 0
            return (
              <div key={loc.id}>
                <button
                  onClick={() => setSelectedDepot(loc)}
                  className="card"
                  style={{ width: '100%', padding: '14px 16px', cursor: 'pointer', textAlign: 'left' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 46, height: 46, borderRadius: 8,
                      background: (loc.color || '#3B82F6') + '15',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 22,
                    }}>{loc.icon || ''}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: '#FAFAFA' }}>{loc.name}</div>
                      <div style={{ fontSize: 11, color: '#71717A' }}>
                        {loc.nbProducts} réf. · {loc.totalQty} unités
                        {loc.description && ` · ${loc.description}`}
                      </div>
                      {/* Fill bar */}
                      <div style={{ marginTop: 6, height: 4, borderRadius: 2, background: '#18181B', overflow: 'hidden' }}>
                        <div style={{
                          width: `${fillPct}%`, height: '100%', borderRadius: 2,
                          background: loc.color || '#3B82F6', transition: 'width 0.3s',
                        }} />
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 20, fontWeight: 600, color: loc.color || '#3B82F6' }}>{loc.totalQty}</div>
                      <div style={{ fontSize: 9, color: '#52525B', fontWeight: 600 }}>{fillPct}% du stock</div>
                    </div>
                    <span style={{
                      fontSize: 12, color: '#52525B', transition: 'transform 0.2s',
                      transform: isExpanded ? 'rotate(180deg)' : 'none',
                    }}>▼</span>
                  </div>
                </button>

                {/* Expanded: products in this location */}
                {isExpanded && (
                  <div style={{
                    margin: '0 8px', padding: '12px 14px', background: '#111113',
                    borderRadius: '0 0 14px 14px', border: '1px solid #18181B', borderTop: 'none',
                  }}>
                    {loc.productDetails.length === 0 ? (
                      <div style={{ fontSize: 12, color: '#52525B', textAlign: 'center', padding: 12 }}>
                        Aucun stock dans ce dépôt
                      </div>
                    ) : (
                      <>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#71717A', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                          {loc.productDetails.length} produit{loc.productDetails.length > 1 ? 's' : ''} en stock
                        </div>
                        {loc.productDetails.slice(0, 20).map(p => (
                          <div key={p.id} style={{
                            display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0',
                            borderBottom: '1px solid #18181B10',
                          }}>
                            <span style={{ fontSize: 14 }}>{p.image || ''}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {p.name}
                              </div>
                              <div style={{ fontSize: 10, color: '#52525B' }}>{p.sku || ''}</div>
                            </div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: loc.color || '#3B82F6' }}>{p.qty}</div>
                          </div>
                        ))}
                        {loc.productDetails.length > 20 && (
                          <div style={{ fontSize: 11, color: '#52525B', textAlign: 'center', marginTop: 6 }}>
                            +{loc.productDetails.length - 20} autres produits
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Shared form for Create + Edit ───
function LocationForm({ location, orgId, onDone, onCancel, onToast }) {
  const isEdit = !!location
  const [name, setName] = useState(location?.name || '')
  const [icon, setIcon] = useState(location?.icon || '')
  const [color, setColor] = useState(location?.color || '#3B82F6')
  const [description, setDescription] = useState(location?.description || '')
  const [saving, setSaving] = useState(false)

  const ICONS = ['', '', '🏢', '', '', '', '', '']
  const COLORS = ['#3B82F6', '#6366F1', '#22C55E', '#EF4444', '#6366F1', '#A78BFA', '#8BAB5D']

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      const data = {
        name: name.trim(),
        icon,
        color,
        description: description.trim() || null,
      }
      if (isEdit) {
        await db.update('locations', `id=eq.${location.id}`, data)
        onToast('Dépôt modifié')
      } else {
        await db.insert('locations', { ...data, org_id: orgId })
        onToast('Dépôt créé')
      }
      onDone()
    } catch (e) {
      onToast('Erreur: ' + e.message, '#EF4444')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card" style={{ padding: 16, marginBottom: 14, border: `2px solid ${isEdit ? '#3B82F630' : 'rgba(255,255,255,0.1)'}` }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#FAFAFA', marginBottom: 12 }}>
        {isEdit ? 'Modifier le dépôt' : 'Nouveau dépôt'}
      </div>
      <input className="input" value={name} onChange={e => setName(e.target.value)}
        placeholder="Nom du dépôt" style={{ marginBottom: 10 }} autoFocus />
      <input className="input" value={description} onChange={e => setDescription(e.target.value)}
        placeholder="Description (optionnel)" style={{ marginBottom: 10 }} />
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#71717A', marginBottom: 4 }}>Icône</div>
          <div style={{ display: 'flex', gap: 4 }}>
            {ICONS.map(i => (
              <button key={i} onClick={() => setIcon(i)} style={{
                width: 32, height: 32, borderRadius: 8, fontSize: 16,
                border: icon === i ? '2px solid #3B82F6' : '1px solid rgba(255,255,255,0.1)',
                background: icon === i ? '#3B82F612' : 'white', cursor: 'pointer',
              }}>{i}</button>
            ))}
          </div>
        </div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#71717A', marginBottom: 4 }}>Couleur</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {COLORS.map(c => (
            <button key={c} onClick={() => setColor(c)} style={{
              width: 28, height: 28, borderRadius: 8, background: c, cursor: 'pointer',
              border: color === c ? '3px solid #FAFAFA' : '2px solid transparent',
            }} />
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        {onCancel && (
          <button onClick={onCancel} style={{
            flex: 1, padding: 12, borderRadius: 8, fontSize: 13, fontWeight: 700,
            background: '#18181B', color: '#71717A', cursor: 'pointer', border: 'none',
          }}>Annuler</button>
        )}
        <button onClick={handleSave} disabled={!name.trim() || saving} className="btn-primary" style={{ flex: 2 }}>
          {saving ? 'Enregistrement...' : isEdit ? 'Enregistrer' : 'Créer le dépôt'}
        </button>
      </div>
    </div>
  )
}

function KpiBox({ label, value, color }) {
  return (
    <div style={{
      flex: 1, textAlign: 'center', padding: '8px 4px',
      background: '#18181B', borderRadius: 10, border: '1px solid #18181B',
    }}>
      <div style={{ fontSize: 16, fontWeight: 600, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 8, color: '#71717A', fontWeight: 700, marginTop: 2 }}>{label}</div>
    </div>
  )
}
