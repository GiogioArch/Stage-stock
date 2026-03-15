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
      onToast('Erreur: ' + e.message, '#D4648A')
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
        background: 'linear-gradient(135deg, #5B8DB808, #5B8DB818)',
        border: '1.5px solid #5B8DB825',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: 'linear-gradient(135deg, #5B8DB8, #4A7CA7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, color: 'white', boxShadow: '0 4px 16px #5B8DB830',
          }}>🏭</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#3D3042' }}>Dépôts de stockage</div>
            <div style={{ fontSize: 12, color: '#9A8B94', fontWeight: 600 }}>
              {locations.length} lieu{locations.length > 1 ? 'x' : ''} de stockage
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <KpiBox label="Lieux" value={locations.length} color="#5B8DB8" />
          <KpiBox label="Actifs" value={activeLocations} color="#5DAB8B" />
          <KpiBox label="Stock total" value={totalStock} color="#E8735A" />
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
          border: '2px solid #D4648A30', background: '#FDF0F4',
        }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#D4648A', marginBottom: 8, textAlign: 'center' }}>
            Supprimer ce dépôt ?
          </div>
          <div style={{ fontSize: 12, color: '#9A8B94', textAlign: 'center', marginBottom: 6, lineHeight: 1.5 }}>
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
          <div style={{ fontSize: 11, color: '#9A8B94', textAlign: 'center', marginBottom: 16 }}>
            Cette action est irréversible.
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setDeletingLocation(null)} style={{
              flex: 1, padding: 12, borderRadius: 14, fontSize: 13, fontWeight: 700,
              background: 'white', color: '#9A8B94', cursor: 'pointer', border: '1.5px solid #E8DED8',
            }}>Annuler</button>
            <button onClick={handleDelete} disabled={deleting} style={{
              flex: 1, padding: 12, borderRadius: 14, fontSize: 13, fontWeight: 800,
              background: '#D4648A', color: 'white', cursor: 'pointer', border: 'none',
              opacity: deleting ? 0.6 : 1,
            }}>{deleting ? 'Suppression...' : 'Supprimer'}</button>
          </div>
        </div>
      )}

      {/* Add location */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button onClick={() => setShowAdd(!showAdd)} style={{
          padding: '8px 16px', borderRadius: 10, fontSize: 12, fontWeight: 800,
          background: showAdd ? '#F0E8E4' : '#5B8DB8', color: showAdd ? '#9A8B94' : 'white',
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
          <div className="empty-icon">🏭</div>
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
                      width: 46, height: 46, borderRadius: 14,
                      background: (loc.color || '#5B8DB8') + '15',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 22,
                    }}>{loc.icon || '📍'}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#3D3042' }}>{loc.name}</div>
                      <div style={{ fontSize: 11, color: '#9A8B94' }}>
                        {loc.nbProducts} réf. · {loc.totalQty} unités
                        {loc.description && ` · ${loc.description}`}
                      </div>
                      {/* Fill bar */}
                      <div style={{ marginTop: 6, height: 4, borderRadius: 2, background: '#F0E8E4', overflow: 'hidden' }}>
                        <div style={{
                          width: `${fillPct}%`, height: '100%', borderRadius: 2,
                          background: loc.color || '#5B8DB8', transition: 'width 0.3s',
                        }} />
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 20, fontWeight: 900, color: loc.color || '#5B8DB8' }}>{loc.totalQty}</div>
                      <div style={{ fontSize: 9, color: '#B8A0AE', fontWeight: 600 }}>{fillPct}% du stock</div>
                    </div>
                    <span style={{
                      fontSize: 12, color: '#B8A0AE', transition: 'transform 0.2s',
                      transform: isExpanded ? 'rotate(180deg)' : 'none',
                    }}>▼</span>
                  </div>
                </button>

                {/* Expanded: products in this location */}
                {isExpanded && (
                  <div style={{
                    margin: '0 8px', padding: '12px 14px', background: '#FEFBF8',
                    borderRadius: '0 0 14px 14px', border: '1px solid #F0E8E4', borderTop: 'none',
                  }}>
                    {loc.productDetails.length === 0 ? (
                      <div style={{ fontSize: 12, color: '#B8A0AE', textAlign: 'center', padding: 12 }}>
                        Aucun stock dans ce dépôt
                      </div>
                    ) : (
                      <>
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#9A8B94', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                          {loc.productDetails.length} produit{loc.productDetails.length > 1 ? 's' : ''} en stock
                        </div>
                        {loc.productDetails.slice(0, 20).map(p => (
                          <div key={p.id} style={{
                            display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0',
                            borderBottom: '1px solid #F0E8E410',
                          }}>
                            <span style={{ fontSize: 14 }}>{p.image || '📦'}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {p.name}
                              </div>
                              <div style={{ fontSize: 10, color: '#B8A0AE' }}>{p.sku || ''}</div>
                            </div>
                            <div style={{ fontSize: 14, fontWeight: 900, color: loc.color || '#5B8DB8' }}>{p.qty}</div>
                          </div>
                        ))}
                        {loc.productDetails.length > 20 && (
                          <div style={{ fontSize: 11, color: '#B8A0AE', textAlign: 'center', marginTop: 6 }}>
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
  const [icon, setIcon] = useState(location?.icon || '📍')
  const [color, setColor] = useState(location?.color || '#5B8DB8')
  const [description, setDescription] = useState(location?.description || '')
  const [saving, setSaving] = useState(false)

  const ICONS = ['📍', '🏭', '🏢', '🚛', '🏠', '📦', '🎪', '🛒']
  const COLORS = ['#5B8DB8', '#E8735A', '#5DAB8B', '#D4648A', '#E8935A', '#9B7DC4', '#8BAB5D']

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
      onToast('Erreur: ' + e.message, '#D4648A')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card" style={{ padding: 16, marginBottom: 14, border: `2px solid ${isEdit ? '#5B8DB830' : '#E8DED8'}` }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: '#3D3042', marginBottom: 12 }}>
        {isEdit ? 'Modifier le dépôt' : 'Nouveau dépôt'}
      </div>
      <input className="input" value={name} onChange={e => setName(e.target.value)}
        placeholder="Nom du dépôt" style={{ marginBottom: 10 }} autoFocus />
      <input className="input" value={description} onChange={e => setDescription(e.target.value)}
        placeholder="Description (optionnel)" style={{ marginBottom: 10 }} />
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#9A8B94', marginBottom: 4 }}>Icône</div>
          <div style={{ display: 'flex', gap: 4 }}>
            {ICONS.map(i => (
              <button key={i} onClick={() => setIcon(i)} style={{
                width: 32, height: 32, borderRadius: 8, fontSize: 16,
                border: icon === i ? '2px solid #5B8DB8' : '1px solid #E8DED8',
                background: icon === i ? '#5B8DB812' : 'white', cursor: 'pointer',
              }}>{i}</button>
            ))}
          </div>
        </div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#9A8B94', marginBottom: 4 }}>Couleur</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {COLORS.map(c => (
            <button key={c} onClick={() => setColor(c)} style={{
              width: 28, height: 28, borderRadius: 8, background: c, cursor: 'pointer',
              border: color === c ? '3px solid #3D3042' : '2px solid transparent',
            }} />
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        {onCancel && (
          <button onClick={onCancel} style={{
            flex: 1, padding: 12, borderRadius: 14, fontSize: 13, fontWeight: 700,
            background: '#F0E8E4', color: '#9A8B94', cursor: 'pointer', border: 'none',
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
      background: 'white', borderRadius: 10, border: '1px solid #F0E8E4',
    }}>
      <div style={{ fontSize: 16, fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 8, color: '#9A8B94', fontWeight: 700, marginTop: 2 }}>{label}</div>
    </div>
  )
}
