import React, { useState, useMemo } from 'react'
import { db } from '../lib/supabase'
import { Modal, Confirm, getCat, CATEGORIES, Badge, intOnly } from './UI'

export default function Products({ products, families, subfamilies, stock, locations, onReload, onToast }) {
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('all')
  const [filterSubfam, setFilterSubfam] = useState('all')
  const [modal, setModal] = useState(null) // null | {type: 'add'|'edit'|'detail', product?}
  const [confirm, setConfirm] = useState(null)

  // ─── Filtered products ───
  const filtered = useMemo(() => {
    let list = products
    if (filterCat !== 'all') list = list.filter(p => p.category === filterCat)
    if (filterSubfam !== 'all') list = list.filter(p => p.subfamily_id === filterSubfam)
    if (search) {
      const s = search.toLowerCase()
      list = list.filter(p =>
        p.name.toLowerCase().includes(s) ||
        p.sku.toLowerCase().includes(s) ||
        (p.category || '').toLowerCase().includes(s)
      )
    }
    return list.sort((a, b) => a.name.localeCompare(b.name))
  }, [products, filterCat, filterSubfam, search])

  // Subfamilies for current category
  const availableSubfams = useMemo(() => {
    if (filterCat === 'all') return subfamilies
    const famId = families.find(f => f.code?.toLowerCase() === filterCat || f.name?.toLowerCase().includes(filterCat))?.id
    return famId ? subfamilies.filter(sf => sf.family_id === famId) : subfamilies
  }, [filterCat, families, subfamilies])

  // Stock total for a product
  const productStock = (pid) => stock.filter(s => s.product_id === pid).reduce((sum, s) => sum + (s.quantity || 0), 0)

  // ─── Delete product ───
  const handleDelete = async (product) => {
    try {
      await db.delete('stock', `product_id=eq.${product.id}`)
      await db.delete('movements', `product_id=eq.${product.id}`)
      await db.delete('products', `id=eq.${product.id}`)
      onToast('Produit supprimé')
      setConfirm(null)
      setModal(null)
      onReload()
    } catch (e) {
      onToast('Erreur: ' + e.message, '#D4648A')
    }
  }

  return (
    <div style={{ padding: '0 16px 24px' }}>
      {/* Search */}
      <div className="search-bar">
        <span className="search-icon">🔍</span>
        <input
          placeholder="Rechercher un produit..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Category pills */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, overflowX: 'auto', paddingBottom: 4 }}>
        <FilterPill active={filterCat === 'all'} onClick={() => { setFilterCat('all'); setFilterSubfam('all') }}>
          Tous ({products.length})
        </FilterPill>
        {CATEGORIES.map(cat => {
          const count = products.filter(p => p.category === cat.id).length
          return (
            <FilterPill key={cat.id} active={filterCat === cat.id} color={cat.color}
              onClick={() => { setFilterCat(cat.id); setFilterSubfam('all') }}>
              {cat.icon} {cat.name} ({count})
            </FilterPill>
          )
        })}
      </div>

      {/* Subfamily filter (if category selected) */}
      {filterCat !== 'all' && availableSubfams.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
          <FilterPill small active={filterSubfam === 'all'} onClick={() => setFilterSubfam('all')}>
            Tout
          </FilterPill>
          {availableSubfams.map(sf => (
            <FilterPill key={sf.id} small active={filterSubfam === sf.id} onClick={() => setFilterSubfam(sf.id)}>
              {sf.name}
            </FilterPill>
          ))}
        </div>
      )}

      {/* Product count + Add button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 13, color: '#9A8B94', fontWeight: 600 }}>{filtered.length} produit{filtered.length > 1 ? 's' : ''}</span>
        <button onClick={() => setModal({ type: 'add' })} style={{
          padding: '8px 16px', borderRadius: 12, background: 'linear-gradient(135deg, #E8735A, #D4648A)',
          color: 'white', fontSize: 13, fontWeight: 800,
        }}>+ Ajouter</button>
      </div>

      {/* Product list */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📦</div>
          <div className="empty-title">Aucun produit</div>
          <div className="empty-text">{search ? 'Aucun résultat pour cette recherche' : 'Ajoute ton premier produit'}</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(p => {
            const cat = getCat(p.category)
            const qty = productStock(p.id)
            const isLow = qty <= (p.min_stock || 5)
            const isZero = qty === 0
            return (
              <div key={p.id} className="card" onClick={() => setModal({ type: 'detail', product: p })}
                style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', padding: '12px 16px' }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 13, background: cat.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
                }}>{p.image || cat.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.name}
                  </div>
                  <div style={{ fontSize: 11, color: '#9A8B94', marginTop: 2 }}>
                    {p.sku} · <span style={{ color: cat.color }}>{cat.name}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{
                    fontSize: 18, fontWeight: 900,
                    color: isZero ? '#D4648A' : isLow ? '#E8935A' : '#5DAB8B',
                  }}>{qty}</div>
                  {isZero && <div style={{ fontSize: 9, color: '#D4648A', fontWeight: 700 }}>RUPTURE</div>}
                  {isLow && !isZero && <div style={{ fontSize: 9, color: '#E8935A', fontWeight: 700 }}>BAS</div>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ─── Product Detail Modal ─── */}
      {modal?.type === 'detail' && (
        <ProductDetail
          product={modal.product}
          stock={stock}
          locations={locations}
          onClose={() => setModal(null)}
          onEdit={() => setModal({ type: 'edit', product: modal.product })}
          onDelete={() => setConfirm({
            message: `Supprimer "${modal.product.name}" ?`,
            detail: 'Le produit, son stock et son historique de mouvements seront supprimés. Cette action est irréversible.',
            onConfirm: () => handleDelete(modal.product),
          })}
        />
      )}

      {/* ─── Add/Edit Modal ─── */}
      {(modal?.type === 'add' || modal?.type === 'edit') && (
        <ProductForm
          product={modal.product}
          families={families}
          subfamilies={subfamilies}
          onClose={() => setModal(null)}
          onSave={async (data) => {
            try {
              if (modal.type === 'edit') {
                await db.update('products', `id=eq.${modal.product.id}`, data)
                onToast('Produit modifié')
              } else {
                await db.insert('products', data)
                onToast('Produit ajouté')
              }
              setModal(null)
              onReload()
            } catch (e) {
              onToast('Erreur: ' + e.message, '#D4648A')
            }
          }}
        />
      )}

      {/* Confirm dialog */}
      {confirm && (
        <Confirm
          message={confirm.message}
          detail={confirm.detail}
          confirmLabel="Supprimer"
          confirmColor="#D4648A"
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  )
}

// ─── Product Detail ───
function ProductDetail({ product, stock, locations, onClose, onEdit, onDelete }) {
  const cat = getCat(product.category)
  const productStock = stock.filter(s => s.product_id === product.id)
  const totalQty = productStock.reduce((sum, s) => sum + (s.quantity || 0), 0)

  return (
    <Modal title={product.name} onClose={onClose}>
      {/* Header info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
        <div style={{
          width: 56, height: 56, borderRadius: 16, background: cat.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
        }}>{product.image || cat.icon}</div>
        <div>
          <Badge color={cat.color}>{cat.name}</Badge>
          <div style={{ fontSize: 12, color: '#9A8B94', marginTop: 4 }}>SKU: {product.sku}</div>
          {product.variants && <div style={{ fontSize: 12, color: '#9A8B94' }}>Variantes: {product.variants}</div>}
        </div>
      </div>

      {/* Total stock */}
      <div className="card" style={{ textAlign: 'center', marginBottom: 16, padding: 20, background: totalQty === 0 ? '#FDF0F4' : '#EDF7F2' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#9A8B94', textTransform: 'uppercase', letterSpacing: 1 }}>Stock total</div>
        <div style={{ fontSize: 36, fontWeight: 900, color: totalQty === 0 ? '#D4648A' : '#5DAB8B' }}>{totalQty}</div>
        <div style={{ fontSize: 12, color: '#9A8B94' }}>Seuil min: {product.min_stock || 5}</div>
      </div>

      {/* Stock by location */}
      <div className="section-title">Stock par lieu</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
        {locations.map(loc => {
          const s = productStock.find(st => st.location_id === loc.id)
          const qty = s?.quantity || 0
          return (
            <div key={loc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #F0E8E4' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16 }}>{loc.icon || '📍'}</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{loc.name}</span>
              </div>
              <span style={{ fontSize: 16, fontWeight: 800, color: qty > 0 ? '#3D3042' : '#B8A0AE' }}>{qty}</span>
            </div>
          )
        })}
      </div>

      {/* Depreciation info */}
      {product.cost_ht > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div className="section-title">Comptabilité</div>
          <div className="card" style={{ padding: '12px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: '#9A8B94' }}>Coût HT</span>
              <span style={{ fontSize: 14, fontWeight: 800 }}>{product.cost_ht.toFixed(2)} €</span>
            </div>
            {product.purchase_date && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: '#9A8B94' }}>Achat</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{new Date(product.purchase_date).toLocaleDateString('fr-FR')}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: '#9A8B94' }}>Régime</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: product.cost_ht >= 500 ? '#5B8DB8' : '#E8935A' }}>
                {product.cost_ht >= 500 ? 'Immobilisation' : 'Charge'}
              </span>
            </div>
            {product.cost_ht >= 500 && product.useful_life_months && product.purchase_date && (() => {
              const months = product.useful_life_months
              const monthsElapsed = Math.max(0,
                (new Date().getFullYear() - new Date(product.purchase_date).getFullYear()) * 12
                + new Date().getMonth() - new Date(product.purchase_date).getMonth()
              )
              const cumDepr = Math.min(product.cost_ht, (product.cost_ht / months) * monthsElapsed)
              const nbv = Math.max(0, product.cost_ht - cumDepr)
              const pct = Math.round((cumDepr / product.cost_ht) * 100)
              return (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: '#9A8B94' }}>Durée</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{months} mois ({Math.round(months/12)} ans)</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: '#F0E8E4', overflow: 'hidden', marginBottom: 6 }}>
                    <div style={{ height: '100%', width: `${pct}%`, borderRadius: 3, background: 'linear-gradient(90deg, #5B8DB8, #5DAB8B)' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, color: '#9A8B94' }}>VNC</span>
                    <span style={{ fontSize: 14, fontWeight: 800, color: nbv > 0 ? '#5DAB8B' : '#D4648A' }}>{nbv.toFixed(2)} € ({pct}% amorti)</span>
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn-secondary" style={{ flex: 1 }} onClick={onEdit}>✏️ Modifier</button>
        <button className="btn-secondary" style={{ flex: 1, borderColor: '#D4648A30', color: '#D4648A' }} onClick={onDelete}>🗑️ Supprimer</button>
      </div>
    </Modal>
  )
}

// ─── Product Form (Add/Edit) ───
function ProductForm({ product, families, subfamilies, onClose, onSave }) {
  const isEdit = !!product
  const [name, setName] = useState(product?.name || '')
  const [sku, setSku] = useState(product?.sku || '')
  const [category, setCategory] = useState(product?.category || 'merch')
  const [familyId, setFamilyId] = useState(product?.family_id || '')
  const [subfamilyId, setSubfamilyId] = useState(product?.subfamily_id || '')
  const [unit, setUnit] = useState(product?.unit || 'pièce')
  const [minStock, setMinStock] = useState(String(product?.min_stock ?? 5))
  const [variants, setVariants] = useState(product?.variants || '')
  const [image, setImage] = useState(product?.image || '')
  const [costHt, setCostHt] = useState(product?.cost_ht != null ? String(product.cost_ht) : '')
  const [purchaseDate, setPurchaseDate] = useState(product?.purchase_date || '')
  const [usefulLife, setUsefulLife] = useState(product?.useful_life_months != null ? String(product.useful_life_months) : '')

  const availableSubfams = familyId ? subfamilies.filter(sf => sf.family_id === familyId) : []

  const handleSave = () => {
    if (!name.trim() || !sku.trim()) return
    onSave({
      name: name.trim(),
      sku: sku.trim(),
      category,
      family_id: familyId || null,
      subfamily_id: subfamilyId || null,
      unit,
      min_stock: parseInt(minStock) || 5,
      variants: variants.trim(),
      image: image || '📦',
      cost_ht: costHt ? parseFloat(costHt) : null,
      purchase_date: purchaseDate || null,
      useful_life_months: usefulLife ? parseInt(usefulLife) : null,
    })
  }

  return (
    <Modal title={isEdit ? 'Modifier le produit' : 'Nouveau produit'} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label className="label">Nom *</label>
          <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="T-shirt Solda Lanmou Homme Noir" />
        </div>

        <div>
          <label className="label">SKU *</label>
          <input className="input" value={sku} onChange={e => setSku(e.target.value)} placeholder="TS-H-02" />
        </div>

        <div>
          <label className="label">Catégorie</label>
          <select className="input" value={category} onChange={e => setCategory(e.target.value)}>
            {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label className="label">Famille</label>
            <select className="input" value={familyId} onChange={e => { setFamilyId(e.target.value); setSubfamilyId('') }}>
              <option value="">—</option>
              {families.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Sous-famille</label>
            <select className="input" value={subfamilyId} onChange={e => setSubfamilyId(e.target.value)}>
              <option value="">—</option>
              {availableSubfams.map(sf => <option key={sf.id} value={sf.id}>{sf.name}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label className="label">Unité</label>
            <select className="input" value={unit} onChange={e => setUnit(e.target.value)}>
              <option value="pièce">Pièce</option>
              <option value="mètre">Mètre</option>
              <option value="rouleau">Rouleau</option>
              <option value="lot">Lot</option>
            </select>
          </div>
          <div>
            <label className="label">Seuil alerte</label>
            <input className="input" type="number" min="0" step="1" value={minStock}
              onChange={e => setMinStock(intOnly(e.target.value))} />
          </div>
        </div>

        <div>
          <label className="label">Variantes (tailles, couleurs...)</label>
          <input className="input" value={variants} onChange={e => setVariants(e.target.value)} placeholder="S,M,L,XL,XXL" />
        </div>

        <div>
          <label className="label">Emoji / Image</label>
          <input className="input" value={image} onChange={e => setImage(e.target.value)} placeholder="👕 ou URL d'image" />
        </div>

        {/* Amortissement */}
        <div style={{ borderTop: '1px solid #F0E8E4', paddingTop: 14, marginTop: 4 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#9A8B94', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
            Comptabilité
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label className="label">Coût HT (€)</label>
              <input className="input" type="number" min="0" step="0.01" value={costHt}
                onChange={e => setCostHt(e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <label className="label">Date d'achat</label>
              <input className="input" type="date" value={purchaseDate}
                onChange={e => setPurchaseDate(e.target.value)} />
            </div>
          </div>
          <div style={{ marginTop: 10 }}>
            <label className="label">Durée amortissement (mois)</label>
            <input className="input" type="number" min="0" step="1" value={usefulLife}
              onChange={e => setUsefulLife(intOnly(e.target.value))} placeholder="Ex: 36 (3 ans)" />
          </div>
          {costHt && parseFloat(costHt) > 0 && parseFloat(costHt) < 500 && (
            <div style={{ fontSize: 11, color: '#E8935A', marginTop: 6, fontWeight: 600 }}>
              Sous le seuil de 500€ HT → comptabilisé en charge
            </div>
          )}
          {costHt && parseFloat(costHt) >= 500 && !usefulLife && (
            <div style={{ fontSize: 11, color: '#5B8DB8', marginTop: 6, fontWeight: 600 }}>
              Immobilisation → renseigner la durée d'amortissement
            </div>
          )}
        </div>

        <button className="btn-primary" onClick={handleSave} disabled={!name.trim() || !sku.trim()}>
          {isEdit ? 'Enregistrer' : 'Ajouter le produit'}
        </button>
      </div>
    </Modal>
  )
}

// ─── Filter pill ───
function FilterPill({ active, color, small, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      padding: small ? '5px 12px' : '7px 14px',
      borderRadius: 20,
      fontSize: small ? 11 : 12,
      fontWeight: 700,
      whiteSpace: 'nowrap',
      border: `1.5px solid ${active ? (color || '#E8735A') : '#E8DED8'}`,
      background: active ? `${color || '#E8735A'}12` : 'white',
      color: active ? (color || '#E8735A') : '#9A8B94',
      cursor: 'pointer',
      transition: 'all 0.15s',
    }}>{children}</button>
  )
}
