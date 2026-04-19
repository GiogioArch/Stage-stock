import React, { useState, useEffect } from 'react'
import { safe, db } from '../lib/supabase'
import { EK } from './LiveApp'

export default function LiveShop({ eventId, fanId }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [cart, setCart] = useState([])
  const [showCheckout, setShowCheckout] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmation, setConfirmation] = useState(null)

  useEffect(() => {
    const load = async () => {
      try {
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
      if (existing) return prev.map(c => c === existing ? { ...c, qty: c.qty + 1 } : c)
      return [...prev, { product, variant, qty: 1 }]
    })
  }

  const removeFromCart = (index) => setCart(prev => prev.filter((_, i) => i !== index))

  const updateQty = (index, delta) => {
    setCart(prev => prev.map((c, i) => {
      if (i !== index) return c
      const newQty = c.qty + delta
      return newQty > 0 ? { ...c, qty: newQty } : c
    }))
  }

  const cartTotal = cart.reduce((sum, c) => sum + (c.product.price || 0) * c.qty, 0)
  const cartCount = cart.reduce((s, c) => s + c.qty, 0)

  const handleOrder = async () => {
    if (!firstName.trim() || !phone.trim() || cart.length === 0) return
    setSaving(true)
    try {
      const pickupCode = String(Math.floor(1000 + Math.random() * 9000))
      const orders = await db.insert('live_orders', {
        event_id: eventId,
        fan_name: firstName.trim(),
        fan_phone: phone.replace(/[^0-9+]/g, ''),
        pickup_code: pickupCode, total: cartTotal, status: 'pending',
      })
      const order = orders[0]
      for (const item of cart) {
        const variantLabel = item.variant
          ? (item.variant.label || item.variant.size || item.variant.name || null)
          : null
        await db.insert('live_order_items', {
          order_id: order.id,
          product_id: item.product.id,
          product_name: item.product.name,
          variant: variantLabel,
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

  // ─── Confirmation screen ───
  if (confirmation) {
    return (
      <div style={{ padding: '50px 20px', textAlign: 'center' }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%', margin: '0 auto 20px',
          background: `${EK.green}20`, border: `2px solid ${EK.green}40`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36,
        }}></div>
        <div style={{
          fontFamily: "'Inter', serif",
          fontSize: 26, fontWeight: 700, color: EK.text, marginBottom: 8,
        }}>Commande enregistrée !</div>
        <div style={{ fontSize: 13, color: EK.textDim, marginBottom: 28, fontWeight: 300 }}>
          Présente ce code au stand merch
        </div>
        <div style={{
          fontSize: 48, fontWeight: 600, color: EK.camel, letterSpacing: 14,
          background: EK.card, borderRadius: 20, padding: '28px 36px',
          display: 'inline-block', border: `2px solid ${EK.camel}30`,
          fontFamily: "'Inter', sans-serif",
        }}>
          {confirmation.pickupCode}
        </div>
        <button onClick={() => setConfirmation(null)} style={{
          marginTop: 32, padding: '14px 32px', borderRadius: 8,
          background: EK.card, border: `1px solid ${EK.cardBorder}`,
          color: EK.text, fontSize: 13, fontWeight: 600, cursor: 'pointer',
          display: 'block', width: '100%', letterSpacing: '0.03em',
        }}>Retour à la boutique</button>
      </div>
    )
  }

  // ─── Loading ───
  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center', color: EK.text }}>
      <div className="loader" style={{ margin: '0 auto 12px', borderTopColor: EK.camel, borderColor: `${EK.camel}15` }} />
      <div style={{ fontSize: 12, color: EK.textMuted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Chargement...</div>
    </div>
  )

  return (
    <div style={{ padding: '0 14px 100px' }}>
      <div style={{
        fontFamily: "'Inter', serif",
        fontSize: 22, fontWeight: 700, color: EK.text, marginBottom: 4,
      }}>Boutique merch</div>
      <div style={{ fontSize: 12, color: EK.textDim, marginBottom: 16, fontWeight: 300 }}>
        Commande et récupère au stand !
      </div>

      {/* ─── Products ─── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        {products.map(p => (
          <div key={p.id} style={{
            background: EK.card, borderRadius: 12, padding: '16px',
            border: `1px solid ${EK.cardBorder}`,
            transition: 'border-color 0.2s ease',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: p.variants?.length > 0 ? 12 : 0 }}>
              <div style={{
                width: 50, height: 50, borderRadius: 8,
                background: `${EK.bleu}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24, border: `1px solid ${EK.camel}20`,
              }}>{p.emoji || ''}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: EK.text }}>{p.name}</div>
                <div style={{ fontSize: 11, color: EK.textMuted, marginTop: 2 }}>
                  {p.totalStock} en stock
                </div>
              </div>
              <div style={{ fontSize: 18, fontWeight: 600, color: EK.camel }}>
                {p.price ? `${p.price}€` : '-'}
              </div>
            </div>

            {/* Variants */}
            {p.variants && p.variants.length > 0 ? (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {p.variants.map(v => (
                  <button key={v.id} onClick={() => addToCart(p, v)} style={{
                    padding: '9px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                    background: EK.bleu, border: `1px solid ${EK.camel}30`,
                    color: EK.camel, cursor: 'pointer', minHeight: 42,
                    letterSpacing: '0.05em', textTransform: 'uppercase',
                    transition: 'all 0.2s ease',
                  }}>
                    {v.label || v.size || v.name}
                  </button>
                ))}
              </div>
            ) : (
              <button onClick={() => addToCart(p, null)} style={{
                marginTop: 10, width: '100%', padding: '12px', borderRadius: 12,
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
                background: EK.green, color: '#fff', border: 'none', minHeight: 44,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                transition: 'transform 0.2s ease',
              }}>Ajouter au panier</button>
            )}
          </div>
        ))}

        {products.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: EK.textMuted }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}></div>
            <div style={{ fontSize: 13, fontWeight: 300 }}>Pas de merch disponible</div>
          </div>
        )}
      </div>

      {/* ─── Cart ─── */}
      {cart.length > 0 && (
        <div style={{
          background: EK.card, borderRadius: 12, padding: 16,
          border: `1px solid ${EK.camel}30`, marginBottom: 16,
        }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: EK.text, marginBottom: 12 }}>
            Panier ({cartCount} article{cartCount > 1 ? 's' : ''})
          </div>
          {cart.map((c, i) => (
            <div key={`${c.product.id}-${c.variant?.id || 'no-variant'}`} style={{
              display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8,
              padding: '8px 0', borderBottom: `1px solid ${EK.cardBorder}`,
            }}>
              <div style={{ flex: 1, fontSize: 13, color: EK.text, fontWeight: 500 }}>
                {c.product.name}{c.variant ? ` (${c.variant.label || c.variant.size || c.variant.name})` : ''}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button onClick={() => updateQty(i, -1)} style={{
                  width: 32, height: 32, borderRadius: 8, background: `${EK.camel}10`,
                  color: EK.text, border: `1px solid ${EK.cardBorder}`, fontSize: 16, cursor: 'pointer',
                }}>-</button>
                <span style={{ fontSize: 14, fontWeight: 600, color: EK.text, minWidth: 20, textAlign: 'center' }}>{c.qty}</span>
                <button onClick={() => updateQty(i, 1)} style={{
                  width: 32, height: 32, borderRadius: 8, background: `${EK.camel}10`,
                  color: EK.text, border: `1px solid ${EK.cardBorder}`, fontSize: 16, cursor: 'pointer',
                }}>+</button>
                <button onClick={() => removeFromCart(i)} style={{
                  width: 32, height: 32, borderRadius: 8, background: `${EK.bordeaux}20`,
                  color: EK.bordeaux, border: `1px solid ${EK.bordeaux}30`, fontSize: 13, cursor: 'pointer', marginLeft: 4,
                }}></button>
              </div>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: EK.textDim, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total</span>
            <span style={{ fontSize: 20, fontWeight: 600, color: EK.camel }}>{cartTotal}€</span>
          </div>

          {!showCheckout ? (
            <button onClick={() => setShowCheckout(true)} style={{
              marginTop: 14, width: '100%', padding: 14, borderRadius: 999,
              background: EK.green, color: '#fff', fontSize: 13, fontWeight: 700,
              border: 'none', cursor: 'pointer', minHeight: 48,
              letterSpacing: '0.05em', textTransform: 'uppercase',
            }}>Commander</button>
          ) : (
            <div style={{ marginTop: 14 }}>
              <input
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                placeholder="Prénom"
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: 10, marginBottom: 8,
                  background: `${EK.bleu}`, border: `1px solid ${EK.camel}25`,
                  color: EK.text, fontSize: 14, outline: 'none',
                  fontFamily: "'Inter', sans-serif",
                }}
              />
              <input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="Téléphone"
                type="tel"
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: 10, marginBottom: 12,
                  background: `${EK.bleu}`, border: `1px solid ${EK.camel}25`,
                  color: EK.text, fontSize: 14, outline: 'none',
                  fontFamily: "'Inter', sans-serif",
                }}
              />
              <button onClick={handleOrder} disabled={!firstName.trim() || !phone.trim() || saving} style={{
                width: '100%', padding: 14, borderRadius: 999,
                background: (!firstName.trim() || !phone.trim()) ? `${EK.green}60` : EK.green,
                color: '#fff', fontSize: 13, fontWeight: 700,
                border: 'none', cursor: 'pointer', minHeight: 48,
                letterSpacing: '0.05em', textTransform: 'uppercase',
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
