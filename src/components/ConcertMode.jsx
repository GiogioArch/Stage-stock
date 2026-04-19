import React, { useState, useMemo, useCallback } from 'react'
import { db } from '../lib/supabase'
import { parseDate } from './UI'

const PAYMENT_METHODS = [
  { id: 'cash', label: 'Espèces', icon: '' },
  { id: 'card', label: 'CB', icon: '💳' },
  { id: 'mobile', label: 'Mobile', icon: '📱' },
]

const VARIANT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

export default function ConcertMode({
  products, stock, locations, events, orgId, userId,
  onClose, onReload, onToast,
}) {
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [cart, setCart] = useState([])
  const [payMethod, setPayMethod] = useState('cash')
  const [showPayment, setShowPayment] = useState(false)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedVariant, setSelectedVariant] = useState(null)
  const [salesLog, setSalesLog] = useState([])

  // ─── Event selection ───
  const today = new Date().toISOString().split('T')[0]
  const upcomingEvents = useMemo(() =>
    (events || [])
      .filter(e => e.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 10),
    [events, today]
  )

  // ─── Sellable products (merch with sale_price > 0) ───
  const sellable = useMemo(() =>
    (products || []).filter(p => p.sale_price > 0).sort((a, b) => (a.name || '').localeCompare(b.name || '')),
    [products]
  )

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return sellable
    const q = search.toLowerCase()
    return sellable.filter(p =>
      (p.name || '').toLowerCase().includes(q) ||
      (p.sku || '').toLowerCase().includes(q)
    )
  }, [sellable, search])

  // ─── Stock lookup ───
  const getStock = useCallback((productId) =>
    (stock || []).filter(s => s.product_id === productId).reduce((sum, s) => sum + (s.quantity || 0), 0),
    [stock]
  )

  // ─── Cart helpers ───
  const cartTotal = cart.reduce((s, item) => s + item.lineTotal, 0)
  const cartCount = cart.reduce((s, item) => s + item.quantity, 0)

  const addToCart = useCallback((product, variant) => {
    setCart(prev => {
      const key = `${product.id}_${variant || ''}`
      const existing = prev.find(item => item.key === key)
      if (existing) {
        return prev.map(item =>
          item.key === key
            ? { ...item, quantity: item.quantity + 1, lineTotal: (item.quantity + 1) * item.unitPrice }
            : item
        )
      }
      return [...prev, {
        key,
        productId: product.id,
        name: product.name,
        image: product.image || '',
        variant: variant || null,
        unitPrice: product.sale_price,
        quantity: 1,
        lineTotal: product.sale_price,
      }]
    })
    setSelectedVariant(null)
  }, [])

  const removeFromCart = useCallback((key) => {
    setCart(prev => {
      const item = prev.find(i => i.key === key)
      if (!item) return prev
      if (item.quantity > 1) {
        return prev.map(i =>
          i.key === key
            ? { ...i, quantity: i.quantity - 1, lineTotal: (i.quantity - 1) * i.unitPrice }
            : i
        )
      }
      return prev.filter(i => i.key !== key)
    })
  }, [])

  const clearCart = useCallback(() => setCart([]), [])

  // ─── Process sale ───
  // Atomic path: use process_sale RPC (DB-side insert sale + sale_items + decrement stock
  // in a single transaction, avoiding race conditions between concurrent POS devices).
  // Fallback: client-side read-modify-write only if RPC unavailable (best-effort).
  const processSale = async () => {
    if (cart.length === 0) return
    setSaving(true)
    try {
      const saleNum = `V${Date.now().toString(36).toUpperCase()}`
      let saleId = null

      // 1. Try atomic RPC first
      const rpcItems = cart.map(item => ({
        product_id: item.productId,
        variant: item.variant,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        line_total: item.lineTotal,
      }))

      try {
        const rpcResult = await db.rpc('process_sale', {
          p_org_id: orgId,
          p_event_id: selectedEvent?.id || null,
          p_sale_number: saleNum,
          p_payment_method: payMethod,
          p_total_amount: cartTotal,
          p_items_count: cartCount,
          p_sold_by: userId,
          p_items: rpcItems,
        })
        // RPC returns the new sale uuid (scalar or wrapped)
        saleId = typeof rpcResult === 'string' ? rpcResult : (rpcResult?.id || rpcResult?.[0]?.id || rpcResult)
      } catch (rpcErr) {
        console.warn('process_sale RPC failed, falling back:', rpcErr?.message)
        // Fallback path: insert sale + sale_items, then decrement stock via move_stock per item.
        const saleResult = await db.insert('sales', {
          org_id: orgId,
          event_id: selectedEvent?.id || null,
          sale_number: saleNum,
          payment_method: payMethod,
          total_amount: cartTotal,
          items_count: cartCount,
          sold_by: userId,
        })
        saleId = saleResult?.[0]?.id
        if (!saleId) throw new Error('Vente non créée')

        for (const item of cart) {
          try {
            await db.insert('sale_items', {
              org_id: orgId,
              sale_id: saleId,
              product_id: item.productId,
              variant: item.variant,
              quantity: item.quantity,
              unit_price: item.unitPrice,
              line_total: item.lineTotal,
            })
          } catch (e) {
            console.error('Sale item error:', e)
          }
        }

        // Decrement stock: try atomic move_stock per item; otherwise best-effort RMW.
        for (const item of cart) {
          try {
            const productStock = (stock || [])
              .filter(s => s.product_id === item.productId && s.quantity > 0)
              .sort((a, b) => b.quantity - a.quantity)
            if (productStock.length === 0) continue
            const loc = productStock[0]
            try {
              await db.rpc('move_stock', {
                p_product_id: item.productId,
                p_location_id: loc.location_id,
                p_delta: -item.quantity,
              })
            } catch {
              const newQty = Math.max(0, loc.quantity - item.quantity)
              await db.update('stock', `id=eq.${loc.id}`, { quantity: newQty })
            }
          } catch (e) {
            console.error('Stock decrement error:', e)
          }
        }
      }

      // 2. Record a movement row per item to trace the sale in the movement history
      for (const item of cart) {
        try {
          const productStock = (stock || [])
            .filter(s => s.product_id === item.productId)
            .sort((a, b) => b.quantity - a.quantity)
          const fromLocId = productStock[0]?.location_id || null
          await db.insert('movements', {
            type: 'out',
            product_id: item.productId,
            from_loc: fromLocId,
            to_loc: null,
            quantity: item.quantity,
            note: `Vente ${saleNum}${item.variant ? ` (${item.variant})` : ''}`,
            org_id: orgId,
          })
        } catch (e) {
          console.error('Movement trace error:', e)
        }
      }

      // 3. Log + reset
      setSalesLog(prev => [{
        num: saleNum,
        total: cartTotal,
        count: cartCount,
        method: payMethod,
        time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      }, ...prev])

      clearCart()
      setShowPayment(false)
      onToast(`Vente ${saleNum} — ${cartTotal}€`)
      if (onReload) onReload()
    } catch (e) {
      onToast('Erreur : ' + e.message, '#7C3AED')
    } finally {
      setSaving(false)
    }
  }

  // ─── Session stats ───
  const sessionTotal = salesLog.reduce((s, l) => s + l.total, 0)
  const sessionCount = salesLog.length
  const sessionCash = salesLog.filter(l => l.method === 'cash').reduce((s, l) => s + l.total, 0)
  const sessionCard = salesLog.filter(l => l.method === 'card').reduce((s, l) => s + l.total, 0)
  const sessionMobile = salesLog.filter(l => l.method === 'mobile').reduce((s, l) => s + l.total, 0)
  const sessionItems = salesLog.reduce((s, l) => s + l.count, 0)

  const [showReport, setShowReport] = useState(false)
  const [closingCaisse, setClosingCaisse] = useState(false)

  // ─── Close cash register ───
  const closeCaisse = async () => {
    if (salesLog.length === 0) { onToast('Aucune vente à clôturer', '#7C3AED'); return }
    setClosingCaisse(true)
    try {
      await db.insert('cash_reports', {
        org_id: orgId,
        event_id: selectedEvent?.id || null,
        total_sales: sessionTotal,
        total_cash: sessionCash,
        total_card: sessionCard,
        total_mobile: sessionMobile,
        nb_transactions: sessionCount,
        nb_items_sold: sessionItems,
        closed_by: userId,
      })
      onToast('Caisse clôturée')
      setShowReport(true)
    } catch (e) {
      onToast('Erreur : ' + e.message, '#7C3AED')
    } finally {
      setClosingCaisse(false)
    }
  }

  // ═══════════════════════════════════════
  // Cash report screen
  // ═══════════════════════════════════════
  if (showReport) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: '#1A1520', color: 'white', overflow: 'auto',
      }}>
        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🧾</div>
          <div style={{ fontSize: 22, fontWeight: 600, color: '#16A34A', marginBottom: 4 }}>Caisse clôturée</div>
          <div style={{ fontSize: 13, color: '#94A3B8', marginBottom: 24 }}>
            {selectedEvent?.name || 'Vente libre'}
          </div>

          <div style={{
            background: '#2A2530', borderRadius: 12, padding: '20px 16px', marginBottom: 20,
            border: '1px solid #3A3540',
          }}>
            <div style={{ fontSize: 36, fontWeight: 600, color: '#6366F1', marginBottom: 4 }}>{sessionTotal}€</div>
            <div style={{ fontSize: 12, color: '#94A3B8' }}>{sessionCount} vente{sessionCount > 1 ? 's' : ''} · {sessionItems} article{sessionItems > 1 ? 's' : ''}</div>

            <div style={{ height: 1, background: '#3A3540', margin: '16px 0' }} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 600, color: '#16A34A' }}>{sessionCash}€</div>
                <div style={{ fontSize: 10, color: '#94A3B8' }}>Espèces</div>
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 600, color: '#2563EB' }}>{sessionCard}€</div>
                <div style={{ fontSize: 10, color: '#94A3B8' }}>CB</div>
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 600, color: '#7C3AED' }}>{sessionMobile}€</div>
                <div style={{ fontSize: 10, color: '#94A3B8' }}>Mobile</div>
              </div>
            </div>
          </div>

          {/* Sales log */}
          <div style={{ background: '#2A2530', borderRadius: 8, padding: '12px 14px', textAlign: 'left', border: '1px solid #3A3540' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', marginBottom: 8 }}>DÉTAIL DES VENTES</div>
            {salesLog.map((l, i) => (
              <div key={l.num} style={{
                display: 'flex', justifyContent: 'space-between', padding: '4px 0',
                borderBottom: i < salesLog.length - 1 ? '1px solid #3A3540' : 'none', fontSize: 12,
              }}>
                <span style={{ color: '#94A3B8' }}>{l.time} · {l.num}</span>
                <span>
                  <span style={{ color: '#94A3B8', marginRight: 6 }}>{l.count} art.</span>
                  <span style={{ fontWeight: 600 }}>{l.total}€</span>
                  <span style={{ marginLeft: 6, fontSize: 10, color: '#94A3B8' }}>
                    {l.method === 'cash' ? '' : l.method === 'card' ? '💳' : '📱'}
                  </span>
                </span>
              </div>
            ))}
          </div>

          <button onClick={onClose} style={{
            width: '100%', padding: 16, borderRadius: 8, marginTop: 20,
            fontSize: 15, fontWeight: 600, background: '#6366F1', border: 'none', color: 'white', cursor: 'pointer',
          }}>Fermer le mode concert</button>
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════
  // Event picker (if no event selected)
  // ═══════════════════════════════════════
  if (!selectedEvent) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: '#1A1520', color: 'white', overflow: 'auto',
      }}>
        <header style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={onClose} style={{
            padding: '10px 16px', borderRadius: 12, fontSize: 14, fontWeight: 600,
            background: '#2A2530', border: 'none', color: '#94A3B8', cursor: 'pointer',
          }}>← Retour</button>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#6366F1' }}>Mode Concert</div>
          <div style={{ width: 80 }} />
        </header>

        <div style={{ padding: '20px 16px' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#94A3B8', marginBottom: 16 }}>
            Sélectionne le concert pour démarrer les ventes
          </div>

          {upcomingEvents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}></div>
              <div style={{ fontSize: 14, color: '#94A3B8' }}>Aucun concert à venir</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {upcomingEvents.map(ev => (
                <button key={ev.id} onClick={() => setSelectedEvent(ev)} style={{
                  padding: '16px 18px', borderRadius: 8, textAlign: 'left', cursor: 'pointer',
                  background: '#2A2530', border: '1px solid #3A3540', color: 'white',
                }}>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>{ev.name || ev.lieu}</div>
                  <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>
                    {parseDate(ev.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' })}
                    {ev.ville ? ` — ${ev.ville}` : ''}
                    {ev.capacite ? ` · ${ev.capacite} places` : ''}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Start without event */}
          <button onClick={() => setSelectedEvent({ id: null, name: 'Vente libre' })} style={{
            width: '100%', padding: 14, borderRadius: 8, marginTop: 16,
            fontSize: 13, fontWeight: 700, cursor: 'pointer', textAlign: 'center',
            background: 'transparent', border: '1.5px dashed #3A3540', color: '#94A3B8',
          }}>
            Vente sans concert
          </button>
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════
  // POS Interface
  // ═══════════════════════════════════════
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: '#1A1520', color: 'white',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* ─── Top bar ─── */}
      <header style={{
        padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10,
        background: '#2A2530', borderBottom: '1px solid #3A3540', flexShrink: 0,
      }}>
        <button onClick={onClose} style={{
          width: 36, height: 36, borderRadius: 10, background: '#3A3540',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, cursor: 'pointer', border: 'none', color: '#94A3B8',
        }}>←</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#6366F1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {selectedEvent.name || 'Concert'}
          </div>
          <div style={{ fontSize: 10, color: '#94A3B8' }}>
            {sessionCount > 0 ? `${sessionCount} vente${sessionCount > 1 ? 's' : ''} · ${sessionTotal}€` : 'Aucune vente'}
          </div>
        </div>
        {salesLog.length > 0 && (
          <>
            <div style={{
              padding: '4px 10px', borderRadius: 8, background: '#16A34A20',
              color: '#16A34A', fontSize: 12, fontWeight: 600,
            }}>
              {sessionTotal}€
            </div>
            <button onClick={closeCaisse} disabled={closingCaisse} style={{
              padding: '6px 10px', borderRadius: 8, fontSize: 10, fontWeight: 600,
              background: '#D9770620', border: 'none', color: '#D97706', cursor: 'pointer',
            }}>🧾 Clôturer</button>
          </>
        )}
      </header>

      {/* ─── Search bar ─── */}
      <div style={{ padding: '10px 16px', flexShrink: 0 }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher un article..."
          style={{
            width: '100%', padding: '12px 16px', borderRadius: 12, fontSize: 14, fontWeight: 600,
            background: '#2A2530', border: '1px solid #3A3540', color: 'white',
            outline: 'none',
          }}
        />
      </div>

      {/* ─── Product grid ─── */}
      <div style={{
        flex: 1, overflow: 'auto', padding: '0 16px 16px',
        display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10,
        alignContent: 'start',
      }}>
        {filteredProducts.map(p => {
          const pStock = getStock(p.id)
          const inCart = cart.filter(c => c.productId === p.id).reduce((s, c) => s + c.quantity, 0)
          const hasVariants = p.has_variants || (p.sku && p.sku.includes('-'))
          return (
            <button
              key={p.id}
              onClick={() => {
                if (pStock <= inCart) { onToast('Stock épuisé', '#7C3AED'); return }
                if (hasVariants) { setSelectedVariant(p); return }
                addToCart(p)
              }}
              disabled={pStock <= 0}
              style={{
                padding: '14px 10px', borderRadius: 8, textAlign: 'center', cursor: pStock > 0 ? 'pointer' : 'default',
                background: pStock <= 0 ? '#2A253080' : '#2A2530', border: '1px solid #3A3540',
                color: 'white', position: 'relative', opacity: pStock <= 0 ? 0.4 : 1,
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 6 }}>{p.image || ''}</div>
              <div style={{
                fontSize: 12, fontWeight: 600, lineHeight: 1.2, marginBottom: 4,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{p.name}</div>
              <div style={{ fontSize: 18, fontWeight: 600, color: '#6366F1' }}>{p.sale_price}€</div>
              <div style={{ fontSize: 10, color: pStock <= 3 ? '#7C3AED' : '#94A3B8', marginTop: 2 }}>
                Stock : {pStock}
              </div>
              {inCart > 0 && (
                <div style={{
                  position: 'absolute', top: -6, right: -6,
                  width: 24, height: 24, borderRadius: '50%',
                  background: '#6366F1', color: 'white',
                  fontSize: 12, fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{inCart}</div>
              )}
            </button>
          )
        })}
      </div>

      {/* ─── Variant picker modal ─── */}
      {selectedVariant && (
        <div style={{
          position: 'absolute', bottom: cart.length > 0 ? 140 : 0, left: 0, right: 0,
          background: '#2A2530', borderTop: '1px solid #3A3540', padding: 16,
          borderRadius: '18px 18px 0 0',
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
            {selectedVariant.name} — Choisir la taille
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {VARIANT_SIZES.map(size => (
              <button key={size} onClick={() => addToCart(selectedVariant, size)} style={{
                padding: '12px 18px', borderRadius: 12, fontSize: 14, fontWeight: 600,
                background: '#3A3540', border: '1px solid #4A4550', color: 'white',
                cursor: 'pointer', minWidth: 56,
              }}>{size}</button>
            ))}
          </div>
          <button onClick={() => setSelectedVariant(null)} style={{
            width: '100%', padding: 10, marginTop: 10, borderRadius: 10,
            background: 'transparent', border: '1px solid #3A3540', color: '#94A3B8',
            fontSize: 12, fontWeight: 700, cursor: 'pointer',
          }}>Annuler</button>
        </div>
      )}

      {/* ─── Cart bar (sticky bottom) ─── */}
      {cart.length > 0 && (
        <div style={{
          flexShrink: 0, background: '#2A2530', borderTop: '1px solid #3A3540',
          padding: '12px 16px',
        }}>
          {/* Cart items (scrollable) */}
          <div style={{ maxHeight: 120, overflowY: 'auto', marginBottom: 10 }}>
            {cart.map(item => (
              <div key={item.key} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0',
              }}>
                <span style={{ fontSize: 14 }}>{item.image}</span>
                <div style={{ flex: 1, fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.name}{item.variant ? ` (${item.variant})` : ''}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button onClick={() => removeFromCart(item.key)} style={{
                    width: 28, height: 28, borderRadius: 8, background: '#7C3AED30',
                    color: '#7C3AED', fontSize: 16, fontWeight: 600, border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>-</button>
                  <span style={{ fontSize: 14, fontWeight: 600, minWidth: 20, textAlign: 'center' }}>{item.quantity}</span>
                  <button onClick={() => addToCart({ id: item.productId, name: item.name, image: item.image, sale_price: item.unitPrice }, item.variant)} style={{
                    width: 28, height: 28, borderRadius: 8, background: '#16A34A30',
                    color: '#16A34A', fontSize: 16, fontWeight: 600, border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>+</button>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#6366F1', minWidth: 50, textAlign: 'right' }}>
                  {item.lineTotal}€
                </div>
              </div>
            ))}
          </div>

          {/* Payment row */}
          {showPayment ? (
            <div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                {PAYMENT_METHODS.map(pm => (
                  <button key={pm.id} onClick={() => setPayMethod(pm.id)} style={{
                    flex: 1, padding: '10px 6px', borderRadius: 10, fontSize: 12, fontWeight: 600,
                    textAlign: 'center', cursor: 'pointer',
                    background: payMethod === pm.id ? '#6366F1' : '#3A3540',
                    color: payMethod === pm.id ? 'white' : '#94A3B8',
                    border: 'none',
                  }}>{pm.icon} {pm.label}</button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setShowPayment(false)} style={{
                  flex: 1, padding: 14, borderRadius: 12, fontSize: 13, fontWeight: 700,
                  background: '#3A3540', border: 'none', color: '#94A3B8', cursor: 'pointer',
                }}>Annuler</button>
                <button onClick={processSale} disabled={saving} style={{
                  flex: 2, padding: 14, borderRadius: 12, fontSize: 16, fontWeight: 600,
                  background: saving ? '#94A3B8' : '#16A34A', border: 'none', color: 'white', cursor: 'pointer',
                }}>
                  {saving ? 'Enregistrement...' : `Encaisser ${cartTotal}€`}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={clearCart} style={{
                padding: '14px 16px', borderRadius: 12, fontSize: 13, fontWeight: 700,
                background: '#7C3AED20', border: 'none', color: '#7C3AED', cursor: 'pointer',
              }}>Vider</button>
              <button onClick={() => setShowPayment(true)} style={{
                flex: 1, padding: 14, borderRadius: 12, fontSize: 16, fontWeight: 600,
                background: '#6366F1', border: 'none', color: 'white', cursor: 'pointer',
              }}>
                {cartCount} article{cartCount > 1 ? 's' : ''} · {cartTotal}€
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
