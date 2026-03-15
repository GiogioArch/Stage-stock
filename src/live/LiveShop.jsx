import React, { useState, useEffect } from 'react'
import { safe, db } from '../lib/supabase'

export default function LiveShop({ eventId, fanId }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [cart, setCart] = useState([]) // { product, variant, qty }
  const [showCheckout, setShowCheckout] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmation, setConfirmation] = useState(null) // { pickupCode }

  useEffect(() => {
    const load = async () => {
      try {
        // Load merch products (family code MERCH)
        const families = await safe('families')
        const merchFamily = (families || []).find(f => f.code === 'MERCH' || f.name === 'Merchandising')
        if (!merchFamily) { setLoading(false); return }

        const subfams = await safe('subfamilies', `family_id=eq.${merchFamily.id}`)
        const subfamIds = (subfams || []).map(s => s.id)
        if (subfamIds.length === 0) { setLoading(false); return }

        const prods = await safe('products', `subfamily_id=in.(${subfamIds.join(',')})&order=name.asc`)
        const stockData = await safe('stock')
        const variants = await safe('product_variants')

        const enriched = (prods || []).map(p => {
          const pVariants = (variants || []).filter(v => v.product_id === p.id)
          const pStock = (stockData || []).filter(s => s.product_id === p.id)
          const totalStock = pStock.reduce((sum, s) => sum + (s.quantity || 0), 0)
          return { ...p, variants: pVariants, totalStock }
        }).filter(p => p.totalStock > 0)

        setProducts(enriched)
      } catch { /* ignore */ }
      setLoading(false)
    }
    load()
  }, [])

  const addToCart = (product, variant) => {
    setCart(prev => {
      const existing = prev.find(c => c.product.id === product.id && (c.variant?.id || null) === (variant?.id || null))
      if (existing) {
        return prev.map(c =>
          c === existing ? { ...c, qty: c.qty + 1 } : c
        )
      }
      return [...prev, { product, variant, qty: 1 }]
    })
  }

  const removeFromCart = (index) => {
    setCart(prev => prev.filter((_, i) => i !== index))
  }

  const updateQty = (index, delta) => {
    setCart(prev => prev.map((c, i) => {
      if (i !== index) return c
      const newQty = c.qty + delta
      return newQty > 0 ? { ...c, qty: newQty } : c
    }))
  }

  const cartTotal = cart.reduce((sum, c) => sum + (c.product.price || 0) * c.qty, 0)

  const handleOrder = async () => {
    if (!firstName.trim() || !phone.trim() || cart.length === 0) return
    setSaving(true)
    try {
      const pickupCode = String(Math.floor(1000 + Math.random() * 9000))
      const orders = await db.insert('live_orders', {
        event_id: eventId,
        fan_id: fanId,
        fan_name: firstName.trim(),
        fan_phone: phone.replace(/[^0-9+]/g, ''),
        pickup_code: pickupCode,
        total: cartTotal,
        status: 'pending',
      })
      const order = orders[0]
      for (const item of cart) {
        await db.insert('live_order_items', {
          order_id: order.id,
          product_id: item.product.id,
          variant_id: item.variant?.id || null,
          quantity: item.qty,
          unit_price: item.product.price || 0,
        })
      }
      setConfirmation({ pickupCode })
      setCart([])
    } catch (e) {
      alert('Erreur: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  if (confirmation) {
    return (
      <div style={{ padding: '40px 16px', textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: '#F0ECE2', marginBottom: 8 }}>Commande enregistree !</div>
        <div style={{ fontSize: 14, color: 'rgba(240,236,226,0.6)', marginBottom: 24 }}>
          Presente ce code au stand merch
        </div>
        <div style={{
          fontSize: 48, fontWeight: 900, color: '#C5A55A', letterSpacing: 12,
          background: 'rgba(197,165,90,0.12)', borderRadius: 20, padding: '24px 32px',
          display: 'inline-block', border: '2px solid rgba(197,165,90,0.3)',
        }}>
          {confirmation.pickupCode}
        </div>
        <button onClick={() => setConfirmation(null)} style={{
          marginTop: 32, padding: '14px 32px', borderRadius: 14,
          background: 'rgba(197,165,90,0.08)', border: '1px solid rgba(197,165,90,0.15)',
          color: '#F0ECE2', fontSize: 14, fontWeight: 700, cursor: 'pointer',
          display: 'block', width: '100%',
        }}>Retour a la boutique</button>
      </div>
    )
  }

  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#F0ECE2' }}>
      <div className="loader" style={{ margin: '0 auto 12px', borderTopColor: '#C5A55A', borderColor: 'rgba(240,236,226,0.15)' }} />
      Chargement...
    </div>
  )

  return (
    <div style={{ padding: '0 16px 100px' }}>
      <div style={{ fontSize: 18, fontWeight: 900, color: '#F0ECE2', marginBottom: 4 }}>
        Boutique merch
      </div>
      <div style={{ fontSize: 12, color: 'rgba(240,236,226,0.5)', marginBottom: 16 }}>
        Commande et recupere au stand !
      </div>

      {/* Products */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        {products.map(p => (
          <div key={p.id} style={{
            background: 'rgba(197,165,90,0.08)', borderRadius: 14, padding: '14px 16px',
            border: '1px solid rgba(197,165,90,0.15)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14,
                background: 'rgba(197,165,90,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24,
              }}>{p.emoji || '👕'}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#F0ECE2' }}>{p.name}</div>
                <div style={{ fontSize: 12, color: 'rgba(240,236,226,0.5)', marginTop: 2 }}>
                  Stock : {p.totalStock}
                </div>
              </div>
              <div style={{ fontSize: 16, fontWeight: 900, color: '#C5A55A' }}>
                {p.price ? `${p.price}€` : '-'}
              </div>
            </div>

            {/* Variants (sizes) */}
            {p.variants && p.variants.length > 0 ? (
              <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                {p.variants.map(v => (
                  <button key={v.id} onClick={() => addToCart(p, v)} style={{
                    padding: '8px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700,
                    background: 'rgba(197,165,90,0.12)', border: '1px solid rgba(197,165,90,0.25)',
                    color: '#C5A55A', cursor: 'pointer', minHeight: 48, minWidth: 48,
                  }}>
                    {v.label || v.size || v.name}
                  </button>
                ))}
              </div>
            ) : (
              <button onClick={() => addToCart(p, null)} style={{
                marginTop: 10, width: '100%', padding: '10px', borderRadius: 14,
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
                background: '#C5A55A', color: '#1B2244', border: 'none', minHeight: 48,
              }}>Ajouter au panier</button>
            )}
          </div>
        ))}

        {products.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: 'rgba(240,236,226,0.4)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🛍️</div>
            Pas de merch disponible pour le moment
          </div>
        )}
      </div>

      {/* Cart */}
      {cart.length > 0 && (
        <div style={{
          background: 'rgba(197,165,90,0.1)', borderRadius: 16, padding: 16,
          border: '1.5px solid rgba(197,165,90,0.25)', marginBottom: 16,
        }}>
          <div style={{ fontSize: 14, fontWeight: 900, color: '#F0ECE2', marginBottom: 12 }}>
            Panier ({cart.reduce((s, c) => s + c.qty, 0)} article{cart.reduce((s, c) => s + c.qty, 0) > 1 ? 's' : ''})
          </div>
          {cart.map((c, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8,
              padding: '8px 0', borderBottom: '1px solid rgba(197,165,90,0.15)',
            }}>
              <div style={{ flex: 1, fontSize: 13, color: '#F0ECE2' }}>
                {c.product.name}{c.variant ? ` (${c.variant.label || c.variant.size || c.variant.name})` : ''}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button onClick={() => updateQty(i, -1)} style={{
                  width: 32, height: 32, borderRadius: 8, background: 'rgba(197,165,90,0.1)',
                  color: '#F0ECE2', border: 'none', fontSize: 16, cursor: 'pointer',
                }}>-</button>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#F0ECE2', minWidth: 20, textAlign: 'center' }}>{c.qty}</span>
                <button onClick={() => updateQty(i, 1)} style={{
                  width: 32, height: 32, borderRadius: 8, background: 'rgba(197,165,90,0.1)',
                  color: '#F0ECE2', border: 'none', fontSize: 16, cursor: 'pointer',
                }}>+</button>
                <button onClick={() => removeFromCart(i)} style={{
                  width: 32, height: 32, borderRadius: 8, background: 'rgba(197,165,90,0.15)',
                  color: '#C5A55A', border: 'none', fontSize: 14, cursor: 'pointer', marginLeft: 4,
                }}>✕</button>
              </div>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'rgba(240,236,226,0.6)' }}>Total</span>
            <span style={{ fontSize: 18, fontWeight: 900, color: '#C5A55A' }}>{cartTotal}€</span>
          </div>

          {!showCheckout ? (
            <button onClick={() => setShowCheckout(true)} style={{
              marginTop: 14, width: '100%', padding: 14, borderRadius: 14,
              background: '#C5A55A', color: '#1B2244', fontSize: 15, fontWeight: 800,
              border: 'none', cursor: 'pointer', minHeight: 48,
            }}>Commander</button>
          ) : (
            <div style={{ marginTop: 14 }}>
              <input
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                placeholder="Prenom"
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: 12, marginBottom: 8,
                  background: 'rgba(197,165,90,0.08)', border: '1px solid rgba(197,165,90,0.15)',
                  color: '#F0ECE2', fontSize: 14, outline: 'none',
                }}
              />
              <input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="Telephone"
                type="tel"
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: 12, marginBottom: 12,
                  background: 'rgba(197,165,90,0.08)', border: '1px solid rgba(197,165,90,0.15)',
                  color: '#F0ECE2', fontSize: 14, outline: 'none',
                }}
              />
              <button onClick={handleOrder} disabled={!firstName.trim() || !phone.trim() || saving} style={{
                width: '100%', padding: 14, borderRadius: 14,
                background: (!firstName.trim() || !phone.trim()) ? 'rgba(197,165,90,0.4)' : '#C5A55A',
                color: '#1B2244', fontSize: 15, fontWeight: 800,
                border: 'none', cursor: 'pointer', minHeight: 48,
              }}>
                {saving ? 'Envoi...' : `Confirmer (${cartTotal}€)`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
