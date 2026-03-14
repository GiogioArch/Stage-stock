import React, { useState, useMemo } from 'react'
import { db } from '../lib/supabase'
import { Badge, fmtDate } from './UI'

const STATUS_CONF = {
  draft:     { label: 'Brouillon', color: '#9A8B94' },
  sent:      { label: 'Envoyé', color: '#5B8DB8' },
  confirmed: { label: 'Confirmé', color: '#9B7DC4' },
  shipped:   { label: 'Expédié', color: '#E8935A' },
  received:  { label: 'Reçu', color: '#5DAB8B' },
  cancelled: { label: 'Annulé', color: '#D4648A' },
}

export default function Achats({
  suppliers, purchaseOrders, purchaseOrderLines, products,
  locations, orgId, userId, onReload, onToast,
}) {
  const [section, setSection] = useState('orders')
  const [showAddSupplier, setShowAddSupplier] = useState(false)
  const [showAddOrder, setShowAddOrder] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)

  const activeSuppliers = (suppliers || []).filter(s => s.active)

  // ─── Stats ───
  const ordersByStatus = useMemo(() => {
    const map = {}
    ;(purchaseOrders || []).forEach(o => {
      map[o.status] = (map[o.status] || 0) + 1
    })
    return map
  }, [purchaseOrders])

  const totalSpent = useMemo(() =>
    (purchaseOrders || []).filter(o => o.status === 'received').reduce((s, o) => s + (o.total_ht || 0), 0),
    [purchaseOrders]
  )

  const pendingOrders = (purchaseOrders || []).filter(o => !['received', 'cancelled'].includes(o.status))

  const SECTIONS = [
    { id: 'orders', label: 'Commandes', icon: '📋' },
    { id: 'suppliers', label: 'Fournisseurs', icon: '🏭' },
  ]

  // ─── Order detail view ───
  if (selectedOrder) {
    const order = selectedOrder
    const st = STATUS_CONF[order.status] || STATUS_CONF.draft
    const supplier = (suppliers || []).find(s => s.id === order.supplier_id)
    const lines = (purchaseOrderLines || []).filter(l => l.order_id === order.id)
    const statusFlow = ['draft', 'sent', 'confirmed', 'shipped', 'received']

    const advanceStatus = async () => {
      const idx = statusFlow.indexOf(order.status)
      if (idx >= statusFlow.length - 1) return
      const next = statusFlow[idx + 1]
      try {
        const updates = { status: next }
        if (next === 'received') updates.received_date = new Date().toISOString().split('T')[0]
        await db.update('purchase_orders', `id=eq.${order.id}`, updates)
        onToast(`Commande → ${STATUS_CONF[next].label}`)
        onReload()
        setSelectedOrder(null)
      } catch (e) {
        onToast('Erreur : ' + e.message, '#D4648A')
      }
    }

    return (
      <div style={{ padding: '0 16px 24px' }}>
        <button onClick={() => setSelectedOrder(null)} style={{
          padding: '8px 14px', borderRadius: 12, fontSize: 13, fontWeight: 800,
          background: 'white', border: '1.5px solid #E8DED8', color: '#9A8B94', cursor: 'pointer',
          marginBottom: 16,
        }}>← Retour</button>

        <div className="card" style={{ padding: 16, marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 900, color: '#3D3042' }}>{order.order_number || 'Commande'}</div>
              <div style={{ fontSize: 12, color: '#9A8B94' }}>{supplier?.name || 'Fournisseur non défini'}</div>
            </div>
            <Badge color={st.color}>{st.label}</Badge>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
            <div><span style={{ color: '#9A8B94' }}>Date :</span> <strong>{order.order_date || '—'}</strong></div>
            <div><span style={{ color: '#9A8B94' }}>Livraison prévue :</span> <strong>{order.expected_date || '—'}</strong></div>
            <div><span style={{ color: '#9A8B94' }}>Total HT :</span> <strong style={{ color: '#E8935A' }}>{order.total_ht}€</strong></div>
            <div><span style={{ color: '#9A8B94' }}>TVA :</span> <strong>{order.tva_rate}%</strong></div>
          </div>
          {order.notes && <div style={{ fontSize: 11, color: '#9A8B94', marginTop: 8 }}>{order.notes}</div>}
        </div>

        {/* Lines */}
        <div style={{ fontSize: 11, fontWeight: 800, color: '#9A8B94', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
          Lignes de commande ({lines.length})
        </div>
        {lines.length === 0 ? (
          <div className="card" style={{ padding: 20, textAlign: 'center', color: '#B8A0AE', fontSize: 12 }}>
            Aucune ligne — ajoutez des articles à cette commande
          </div>
        ) : (
          <div className="card" style={{ padding: '6px 12px' }}>
            {lines.map((l, i) => {
              const p = (products || []).find(pr => pr.id === l.product_id)
              return (
                <div key={l.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
                  borderBottom: i < lines.length - 1 ? '1px solid #F0E8E4' : 'none',
                }}>
                  <span style={{ fontSize: 14 }}>{p?.image || '📦'}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700 }}>{l.description || p?.name || '?'}</div>
                    <div style={{ fontSize: 10, color: '#9A8B94' }}>
                      {l.quantity} × {l.unit_price_ht}€ HT
                      {l.quantity_received > 0 && ` · Reçu: ${l.quantity_received}`}
                    </div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 900, color: '#E8935A' }}>{l.line_total_ht}€</div>
                </div>
              )
            })}
          </div>
        )}

        {/* Advance status */}
        {order.status !== 'received' && order.status !== 'cancelled' && (
          <button onClick={advanceStatus} className="btn-primary" style={{ marginTop: 16 }}>
            Passer à : {STATUS_CONF[statusFlow[statusFlow.indexOf(order.status) + 1]]?.label}
          </button>
        )}
      </div>
    )
  }

  return (
    <div style={{ padding: '0 16px 24px' }}>
      {/* Header */}
      <div className="card" style={{
        marginBottom: 16, padding: '18px 16px',
        background: 'linear-gradient(135deg, #9B7DC408, #9B7DC418)',
        border: '1.5px solid #9B7DC425',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: 'linear-gradient(135deg, #9B7DC4, #8A6CB3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, color: 'white', boxShadow: '0 4px 16px #9B7DC430',
          }}>🛍️</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#3D3042' }}>Achats & Appro</div>
            <div style={{ fontSize: 12, color: '#9A8B94', fontWeight: 600 }}>
              Fournisseurs et bons de commande
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <KpiBox label="Fournisseurs" value={activeSuppliers.length} color="#9B7DC4" />
          <KpiBox label="En cours" value={pendingOrders.length} color="#E8935A" />
          <KpiBox label="Dépensé" value={`${Math.round(totalSpent)}€`} color="#5DAB8B" />
        </div>
      </div>

      {/* Section tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {SECTIONS.map(s => (
          <button key={s.id} onClick={() => setSection(s.id)} style={{
            flex: 1, padding: '7px 10px', borderRadius: 10, fontSize: 11, fontWeight: 700,
            cursor: 'pointer', textAlign: 'center',
            background: section === s.id ? '#9B7DC415' : 'white',
            color: section === s.id ? '#9B7DC4' : '#9A8B94',
            border: `1.5px solid ${section === s.id ? '#9B7DC440' : '#E8DED8'}`,
          }}>{s.icon} {s.label}</button>
        ))}
      </div>

      {/* ─── Orders ─── */}
      {section === 'orders' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button onClick={() => setShowAddOrder(!showAddOrder)} style={{
              padding: '8px 16px', borderRadius: 10, fontSize: 12, fontWeight: 800,
              background: showAddOrder ? '#F0E8E4' : '#9B7DC4', color: showAddOrder ? '#9A8B94' : 'white',
              cursor: 'pointer', border: 'none',
            }}>
              {showAddOrder ? 'Annuler' : '+ Nouvelle commande'}
            </button>
          </div>

          {showAddOrder && (
            <AddOrderForm
              suppliers={activeSuppliers}
              products={products}
              orgId={orgId}
              userId={userId}
              onDone={() => { setShowAddOrder(false); onReload() }}
              onToast={onToast}
            />
          )}

          {(purchaseOrders || []).length === 0 ? (
            <div className="card" style={{ padding: 32, textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>🛍️</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#3D3042' }}>Aucune commande</div>
              <div style={{ fontSize: 12, color: '#9A8B94', marginTop: 4 }}>Créez votre premier bon de commande</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(purchaseOrders || []).sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '')).map(o => {
                const st = STATUS_CONF[o.status] || STATUS_CONF.draft
                const supplier = (suppliers || []).find(s => s.id === o.supplier_id)
                const nbLines = (purchaseOrderLines || []).filter(l => l.order_id === o.id).length
                return (
                  <button key={o.id} onClick={() => setSelectedOrder(o)} className="card" style={{
                    padding: '14px 16px', cursor: 'pointer', textAlign: 'left', width: '100%',
                    borderLeft: `4px solid ${st.color}`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: '#3D3042' }}>
                          {o.order_number || 'Commande'}
                        </div>
                        <div style={{ fontSize: 11, color: '#9A8B94' }}>
                          {supplier?.name || '?'} · {nbLines} article{nbLines > 1 ? 's' : ''} · {o.order_date}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 14, fontWeight: 900, color: '#E8935A' }}>{o.total_ht}€</div>
                        <Badge color={st.color}>{st.label}</Badge>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── Suppliers ─── */}
      {section === 'suppliers' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button onClick={() => setShowAddSupplier(!showAddSupplier)} style={{
              padding: '8px 16px', borderRadius: 10, fontSize: 12, fontWeight: 800,
              background: showAddSupplier ? '#F0E8E4' : '#9B7DC4', color: showAddSupplier ? '#9A8B94' : 'white',
              cursor: 'pointer', border: 'none',
            }}>
              {showAddSupplier ? 'Annuler' : '+ Ajouter fournisseur'}
            </button>
          </div>

          {showAddSupplier && (
            <AddSupplierForm orgId={orgId} onDone={() => { setShowAddSupplier(false); onReload() }} onToast={onToast} />
          )}

          {(suppliers || []).length === 0 ? (
            <div className="card" style={{ padding: 32, textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>🏭</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#3D3042' }}>Aucun fournisseur</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(suppliers || []).map(s => {
                const nbOrders = (purchaseOrders || []).filter(o => o.supplier_id === s.id).length
                return (
                  <div key={s.id} className="card" style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: 12,
                        background: '#9B7DC415', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
                      }}>🏭</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: '#3D3042' }}>{s.name}</div>
                        <div style={{ fontSize: 11, color: '#9A8B94' }}>
                          {s.contact_name || ''}{s.contact_phone ? ` · ${s.contact_phone}` : ''}
                          {s.delivery_days ? ` · Délai ${s.delivery_days}j` : ''}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 14, fontWeight: 900, color: '#9B7DC4' }}>{nbOrders}</div>
                        <div style={{ fontSize: 9, color: '#9A8B94' }}>cmd.</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Forms ───

function AddSupplierForm({ orgId, onDone, onToast }) {
  const [name, setName] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [deliveryDays, setDeliveryDays] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      await db.insert('suppliers', {
        org_id: orgId,
        name: name.trim(),
        contact_name: contactName.trim() || null,
        contact_phone: contactPhone.trim() || null,
        contact_email: contactEmail.trim() || null,
        delivery_days: deliveryDays ? parseInt(deliveryDays) : null,
      })
      onToast('Fournisseur ajouté')
      onDone()
    } catch (e) {
      onToast('Erreur : ' + e.message, '#D4648A')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card" style={{ padding: 16, marginBottom: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: '#3D3042', marginBottom: 12 }}>Nouveau fournisseur</div>
      <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Nom du fournisseur" style={{ marginBottom: 10 }} />
      <input className="input" value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Nom du contact" style={{ marginBottom: 10 }} />
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <input className="input" value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="Téléphone" style={{ flex: 1 }} />
        <input className="input" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="Email" style={{ flex: 1 }} />
      </div>
      <input className="input" value={deliveryDays} onChange={e => setDeliveryDays(e.target.value.replace(/[^0-9]/g, ''))} placeholder="Délai livraison (jours)" style={{ marginBottom: 10 }} />
      <button onClick={handleSave} disabled={!name.trim() || saving} className="btn-primary">
        {saving ? 'Création...' : 'Ajouter'}
      </button>
    </div>
  )
}

function AddOrderForm({ suppliers, products, orgId, userId, onDone, onToast }) {
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id || '')
  const [expectedDate, setExpectedDate] = useState('')
  const [tvaRate, setTvaRate] = useState('8.5')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState([{ productId: '', description: '', quantity: '1', unitPrice: '' }])
  const [saving, setSaving] = useState(false)

  const addLine = () => setLines(prev => [...prev, { productId: '', description: '', quantity: '1', unitPrice: '' }])
  const updateLine = (i, key, val) => setLines(prev => prev.map((l, idx) => idx === i ? { ...l, [key]: val } : l))
  const removeLine = (i) => setLines(prev => prev.filter((_, idx) => idx !== i))

  const totalHT = lines.reduce((s, l) => {
    const qty = parseInt(l.quantity) || 0
    const price = parseFloat(l.unitPrice) || 0
    return s + qty * price
  }, 0)

  const handleSave = async () => {
    if (!supplierId) return
    const validLines = lines.filter(l => (l.productId || l.description) && l.unitPrice)
    if (validLines.length === 0) { onToast('Ajoutez au moins une ligne', '#D4648A'); return }

    setSaving(true)
    try {
      const orderNum = `BC-${Date.now().toString(36).toUpperCase()}`
      const rate = parseFloat(tvaRate) || 8.5
      const result = await db.insert('purchase_orders', {
        org_id: orgId,
        supplier_id: supplierId,
        order_number: orderNum,
        status: 'draft',
        total_ht: totalHT,
        total_ttc: Math.round(totalHT * (1 + rate / 100) * 100) / 100,
        tva_rate: rate,
        expected_date: expectedDate || null,
        notes: notes.trim() || null,
        created_by: userId,
      })
      const orderId = result?.[0]?.id
      if (orderId) {
        for (const l of validLines) {
          const qty = parseInt(l.quantity) || 1
          const price = parseFloat(l.unitPrice) || 0
          try {
            await db.insert('purchase_order_lines', {
              org_id: orgId,
              order_id: orderId,
              product_id: l.productId || null,
              description: l.description || (products || []).find(p => p.id === l.productId)?.name || '',
              quantity: qty,
              unit_price_ht: price,
              line_total_ht: qty * price,
            })
          } catch (e) { console.error('Line insert error:', e) }
        }
      }
      onToast(`Commande ${orderNum} créée`)
      onDone()
    } catch (e) {
      onToast('Erreur : ' + e.message, '#D4648A')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card" style={{ padding: 16, marginBottom: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: '#3D3042', marginBottom: 12 }}>Nouvelle commande</div>

      <select className="input" value={supplierId} onChange={e => setSupplierId(e.target.value)} style={{ marginBottom: 10 }}>
        <option value="">— Fournisseur —</option>
        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>

      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <input className="input" type="date" value={expectedDate} onChange={e => setExpectedDate(e.target.value)} style={{ flex: 1 }} placeholder="Livraison prévue" />
        <input className="input" value={tvaRate} onChange={e => setTvaRate(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="TVA %" style={{ flex: '0 0 80px' }} />
      </div>

      <div style={{ fontSize: 11, fontWeight: 800, color: '#9A8B94', marginBottom: 6 }}>ARTICLES</div>
      {lines.map((l, i) => (
        <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 8, alignItems: 'center' }}>
          <select className="input" value={l.productId} onChange={e => {
            updateLine(i, 'productId', e.target.value)
            const p = (products || []).find(pr => pr.id === e.target.value)
            if (p) { updateLine(i, 'description', p.name); if (p.prix_achat_ht) updateLine(i, 'unitPrice', String(p.prix_achat_ht)) }
          }} style={{ flex: 2 }}>
            <option value="">— Article —</option>
            {(products || []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input className="input" value={l.quantity} onChange={e => updateLine(i, 'quantity', e.target.value.replace(/[^0-9]/g, ''))} placeholder="Qté" style={{ flex: '0 0 50px' }} />
          <input className="input" value={l.unitPrice} onChange={e => updateLine(i, 'unitPrice', e.target.value.replace(/[^0-9.]/g, ''))} placeholder="PU HT" style={{ flex: '0 0 70px' }} />
          {lines.length > 1 && (
            <button onClick={() => removeLine(i)} style={{
              width: 28, height: 28, borderRadius: 8, background: '#D4648A15',
              border: 'none', color: '#D4648A', fontSize: 14, cursor: 'pointer',
            }}>×</button>
          )}
        </div>
      ))}
      <button onClick={addLine} style={{
        width: '100%', padding: 8, borderRadius: 8, fontSize: 11, fontWeight: 700,
        background: '#F0E8E4', border: 'none', color: '#9A8B94', cursor: 'pointer', marginBottom: 10,
      }}>+ Ajouter une ligne</button>

      <textarea className="input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optionnel)" rows={2} style={{ marginBottom: 10, resize: 'vertical' }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 12, color: '#9A8B94' }}>Total HT :</span>
        <span style={{ fontSize: 18, fontWeight: 900, color: '#E8935A' }}>{totalHT}€</span>
      </div>

      <button onClick={handleSave} disabled={!supplierId || saving} className="btn-primary">
        {saving ? 'Création...' : 'Créer la commande'}
      </button>
    </div>
  )
}

function KpiBox({ label, value, color }) {
  return (
    <div style={{
      flex: 1, textAlign: 'center', padding: '8px 4px',
      background: 'white', borderRadius: 10, border: '1px solid #F0E8E4',
    }}>
      <div style={{ fontSize: 14, fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 8, color: '#9A8B94', fontWeight: 700, marginTop: 2 }}>{label}</div>
    </div>
  )
}
