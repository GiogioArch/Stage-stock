import React, { useState, useMemo } from 'react'
import { db } from '../lib/supabase'
import { Modal, Confirm, getCat, getMoveConf, intOnly } from './UI'

export default function MovementModal({ type, products, locations, stock, preselectedLocation, orgId, onClose, onDone, onToast }) {
  const conf = getMoveConf(type)
  const [productId, setProductId] = useState('')
  const [fromLoc, setFromLoc] = useState(type === 'out' ? (preselectedLocation || '') : '')
  const [toLoc, setToLoc] = useState(type === 'in' ? (preselectedLocation || '') : '')
  const [quantity, setQuantity] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  // Available stock for selected product + location (for out/transfer)
  const availableStock = useMemo(() => {
    if (!productId || type === 'in') return Infinity
    const locId = type === 'transfer' ? fromLoc : fromLoc
    if (!locId) return 0
    const s = stock.find(st => st.product_id === productId && st.location_id === locId)
    return s?.quantity || 0
  }, [productId, fromLoc, type, stock])

  const qty = parseInt(quantity) || 0
  const isOverStock = type !== 'in' && qty > availableStock
  const canSubmit = productId && qty > 0 && !isOverStock && (type === 'in' ? toLoc : type === 'out' ? fromLoc : (fromLoc && toLoc && fromLoc !== toLoc))

  const selectedProduct = products.find(p => p.id === productId)

  const handleSubmit = async () => {
    if (!canSubmit) return
    setLoading(true)
    try {
      // Use RPC for atomic operation
      if (type === 'in') {
        try { await db.rpc('move_stock', { p_product_id: productId, p_location_id: toLoc, p_delta: qty }) }
        catch { await db.upsert('stock', { product_id: productId, location_id: toLoc, quantity: availableStock + qty, org_id: orgId }) }
      } else if (type === 'out') {
        try { await db.rpc('move_stock', { p_product_id: productId, p_location_id: fromLoc, p_delta: -qty }) }
        catch { await db.upsert('stock', { product_id: productId, location_id: fromLoc, quantity: Math.max(0, availableStock - qty), org_id: orgId }) }
      } else {
        // Transfer = out from source + in to destination
        try {
          await db.rpc('move_stock', { p_product_id: productId, p_location_id: fromLoc, p_delta: -qty })
          await db.rpc('move_stock', { p_product_id: productId, p_location_id: toLoc, p_delta: qty })
        } catch {
          const srcStock = stock.find(s => s.product_id === productId && s.location_id === fromLoc)?.quantity || 0
          const dstStock = stock.find(s => s.product_id === productId && s.location_id === toLoc)?.quantity || 0
          await db.upsert('stock', { product_id: productId, location_id: fromLoc, quantity: Math.max(0, srcStock - qty), org_id: orgId })
          await db.upsert('stock', { product_id: productId, location_id: toLoc, quantity: dstStock + qty, org_id: orgId })
        }
      }

      // Record movement
      await db.insert('movements', {
        type,
        product_id: productId,
        from_loc: type === 'in' ? null : fromLoc,
        to_loc: type === 'out' ? null : toLoc,
        quantity: qty,
        note: note.trim() || null,
        org_id: orgId,
      })

      onToast(`${conf.label} : ${qty}× ${selectedProduct?.name}`)
      setShowConfirm(false)
      onDone()
    } catch (e) {
      onToast('Erreur: ' + e.message, '#EF4444')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Modal title={conf.label} onClose={onClose}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Product select */}
          <div>
            <label className="label">Produit *</label>
            <select className="input" value={productId} onChange={e => setProductId(e.target.value)}>
              <option value="">Sélectionner un produit</option>
              {products.sort((a, b) => a.name.localeCompare(b.name)).map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Source location (out, transfer) */}
          {type !== 'in' && (
            <div>
              <label className="label">{type === 'transfer' ? 'Depuis' : 'Lieu'} *</label>
              <select className="input" value={fromLoc} onChange={e => setFromLoc(e.target.value)}>
                <option value="">Sélectionner</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.icon} {l.name}</option>)}
              </select>
              {productId && fromLoc && (
                <div style={{ fontSize: 12, color: availableStock === 0 ? '#EF4444' : '#71717A', marginTop: 4 }}>
                  Stock disponible: <strong>{availableStock}</strong>
                </div>
              )}
            </div>
          )}

          {/* Destination location (in, transfer) */}
          {type !== 'out' && (
            <div>
              <label className="label">{type === 'transfer' ? 'Vers' : 'Lieu'} *</label>
              <select className="input" value={toLoc} onChange={e => setToLoc(e.target.value)}>
                <option value="">Sélectionner</option>
                {locations.filter(l => l.id !== fromLoc).map(l => <option key={l.id} value={l.id}>{l.icon} {l.name}</option>)}
              </select>
            </div>
          )}

          {/* Quantity */}
          <div>
            <label className="label">Quantité *</label>
            <input
              className="input"
              type="number"
              min="1"
              step="1"
              value={quantity}
              onChange={e => setQuantity(intOnly(e.target.value))}
              placeholder="0"
              style={isOverStock ? { borderColor: '#EF4444', color: '#EF4444' } : {}}
            />
            {isOverStock && (
              <div style={{ fontSize: 12, color: '#EF4444', fontWeight: 700, marginTop: 4 }}>
                ! Stock insuffisant (max: {availableStock})
              </div>
            )}
          </div>

          {/* Note */}
          <div>
            <label className="label">Note (optionnel)</label>
            <input className="input" value={note} onChange={e => setNote(e.target.value)} placeholder="Réappro Triple 8..." />
          </div>

          {/* Submit */}
          <button className="btn-primary"
            style={{ background: conf.color }}
            disabled={!canSubmit || loading}
            onClick={() => setShowConfirm(true)}>
            {loading ? 'Chargement...' : `Valider ${conf.label.toLowerCase()}`}
          </button>
        </div>
      </Modal>

      {/* Confirmation */}
      {showConfirm && (
        <Confirm
          message={`Confirmer ${conf.label.toLowerCase()} ?`}
          detail={`${qty}× ${selectedProduct?.name}${type === 'transfer'
            ? ` de ${locations.find(l => l.id === fromLoc)?.name} vers ${locations.find(l => l.id === toLoc)?.name}`
            : ` — ${locations.find(l => l.id === (type === 'in' ? toLoc : fromLoc))?.name}`}`}
          confirmLabel={conf.label}
          confirmColor={conf.color}
          onConfirm={handleSubmit}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </>
  )
}
