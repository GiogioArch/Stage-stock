import React, { useState, useMemo, createElement } from 'react'
import { db } from '../lib/supabase'
import { Badge, fmtDate } from './UI'
import { ShoppingCart, Users } from 'lucide-react'

const STATUS_CONF = {
  draft:     { label: 'Brouillon', color: '#94A3B8' },
  sent:      { label: 'Envoyé', color: '#5B8DB8' },
  confirmed: { label: 'Confirmé', color: '#D4648A' },
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
    { id: 'orders', label: 'Commandes', icon: ShoppingCart },
    { id: 'suppliers', label: 'Fournisseurs', icon: Users },
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
          padding: '8px 14px', borderRadius: 12, fontSize: 13, fontWeight: 600,
          background: '#F1F5F9', border: '1px solid #E2E8F0', color: '#94A3B8', cursor: 'pointer',
          marginBottom: 16,
        }}>← Retour</button>

        <div className="card" style={{ padding: 16, marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#1E293B' }}>{order.order_number || 'Commande'}</div>
              <div style={{ fontSize: 12, color: '#94A3B8' }}>{supplier?.name || 'Fournisseur non défini'}</div>
            </div>
            <Badge color={st.color}>{st.label}</Badge>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
            <div><span style={{ color: '#94A3B8' }}>Date :</span> <strong>{order.order_date || '—'}</strong></div>
            <div><span style={{ color: '#94A3B8' }}>Livraison prévue :</span> <strong>{order.expected_date || '—'}</strong></div>
            <div><span style={{ color: '#94A3B8' }}>Total HT :</span> <strong style={{ color: '#E8935A' }}>{order.total_ht}€</strong></div>
            <div><span style={{ color: '#94A3B8' }}>TVA :</span> <strong>{order.tva_rate}%</strong></div>
          </div>
          {order.notes && <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 8 }}>{order.notes}</div>}
        </div>

        {/* Lines */}
        <div style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
          Lignes de commande ({lines.length})
        </div>
        {lines.length === 0 ? (
          <div className="card" style={{ padding: 20, textAlign: 'center', color: '#94A3B8', fontSize: 12 }}>
            Aucune ligne — ajoutez des articles à cette commande
          </div>
        ) : (
          <div className="card" style={{ padding: '6px 12px' }}>
            {lines.map((l, i) => {
              const p = (products || []).find(pr => pr.id === l.product_id)
              return (
                <div key={l.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
                  borderBottom: i < lines.length - 1 ? '1px solid #E2E8F0' : 'none',
                }}>
                  <span style={{ fontSize: 14 }}>{p?.image || ''}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700 }}>{l.description || p?.name || '?'}</div>
                    <div style={{ fontSize: 10, color: '#94A3B8' }}>
                      {l.quantity} × {l.unit_price_ht}€ HT
                      {l.quantity_received > 0 && ` · Reçu: ${l.quantity_received}`}
                    </div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#E8935A' }}>{l.line_total_ht}€</div>
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
        background: 'linear-gradient(135deg, #D4648A08, #D4648A18)',
        border: '1px solid #D4648A25',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 8,
            background: 'linear-gradient(135deg, #D4648A, #8A6CB3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, color: 'white', boxShadow: '0 4px 16px #D4648A30',
          }}></div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#1E293B' }}>Achats & Appro</div>
            <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 600 }}>
              Fournisseurs et bons de commande
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <KpiBox label="Fournisseurs" value={activeSuppliers.length} color="#D4648A" />
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
            background: section === s.id ? '#D4648A15' : 'white',
            color: section === s.id ? '#D4648A' : '#94A3B8',
            border: `1px solid ${section === s.id ? '#D4648A40' : '#E2E8F0'}`,
          }}>{createElement(s.icon, { size: 14 })} {s.label}</button>
        ))}
      </div>

      {/* ─── Orders ─── */}
      {section === 'orders' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button onClick={() => setShowAddOrder(!showAddOrder)} style={{
              padding: '8px 16px', borderRadius: 10, fontSize: 12, fontWeight: 600,
              background: showAddOrder ? '#E2E8F0' : '#D4648A', color: showAddOrder ? '#94A3B8' : 'white',
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
              <div style={{ fontSize: 40, marginBottom: 8 }}></div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#1E293B' }}>Aucune commande</div>
              <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>Créez votre premier bon de commande</div>
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
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#1E293B' }}>
                          {o.order_number || 'Commande'}
                        </div>
                        <div style={{ fontSize: 11, color: '#94A3B8' }}>
                          {supplier?.name || '?'} · {nbLines} article{nbLines > 1 ? 's' : ''} · {o.order_date}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#E8935A' }}>{o.total_ht}€</div>
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
              padding: '8px 16px', borderRadius: 10, fontSize: 12, fontWeight: 600,
              background: showAddSupplier ? '#E2E8F0' : '#D4648A', color: showAddSupplier ? '#94A3B8' : 'white',
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
              <div style={{ fontSize: 40, marginBottom: 8 }}></div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#1E293B' }}>Aucun fournisseur</div>
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
                        background: '#D4648A15', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
                      }}></div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#1E293B' }}>{s.name}</div>
                        <div style={{ fontSize: 11, color: '#94A3B8' }}>
                          {s.contact_name || ''}{s.contact_phone ? ` · ${s.contact_phone}` : ''}
                          {s.delivery_days ? ` · Délai ${s.delivery_days}j` : ''}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#D4648A' }}>{nbOrders}</div>
                        <div style={{ fontSize: 9, color: '#94A3B8' }}>cmd.</div>
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
      <div style={{ fontSize: 13, fontWeight: 600, color: '#1E293B', marginBottom: 12 }}>Nouveau fournisseur</div>
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
      <div style={{ fontSize: 13, fontWeight: 600, color: '#1E293B', marginBottom: 12 }}>Nouvelle commande</div>

      <select className="input" value={supplierId} onChange={e => setSupplierId(e.target.value)} style={{ marginBottom: 10 }}>
        <option value="">— Fournisseur —</option>
        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>

      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <input className="input" type="date" value={expectedDate} onChange={e => setExpectedDate(e.target.value)} style={{ flex: 1 }} placeholder="Livraison prévue" />
        <input className="input" value={tvaRate} onChange={e => setTvaRate(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="TVA %" style={{ flex: '0 0 80px' }} />
      </div>

      <div style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', marginBottom: 6 }}>ARTICLES</div>
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
        background: '#E2E8F0', border: 'none', color: '#94A3B8', cursor: 'pointer', marginBottom: 10,
      }}>+ Ajouter une ligne</button>

      <textarea className="input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optionnel)" rows={2} style={{ marginBottom: 10, resize: 'vertical' }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 12, color: '#94A3B8' }}>Total HT :</span>
        <span style={{ fontSize: 18, fontWeight: 600, color: '#E8935A' }}>{totalHT}€</span>
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
      background: '#F1F5F9', borderRadius: 10, border: '1px solid #E2E8F0',
    }}>
      <div style={{ fontSize: 14, fontWeight: 600, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 8, color: '#94A3B8', fontWeight: 700, marginTop: 2 }}>{label}</div>
    </div>
  )
}
