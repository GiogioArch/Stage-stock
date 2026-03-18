import React, { useState, useMemo } from 'react'
import { Search, FileDown, Package, Plus, ChevronRight, Edit, Trash2, Filter } from 'lucide-react'
import { db } from '../lib/supabase'
import { Modal, Confirm, getCat, CATEGORIES, Badge, intOnly } from './UI'
import ProductDetail from './ProductDetail'
import CSVImport from './CSVImport'

const colors = {
  textPrimary: '#1E293B',
  textSecondary: '#64748B',
  textTertiary: '#94A3B8',
  accent: '#6366F1',
  bgSurface: '#F8FAFC',
  border: '#E2E8F0',
  danger: '#DC2626',
  warning: '#D97706',
  success: '#16A34A',
}

export default function Products({ products, families, subfamilies, stock, locations, movements, events, eventPacking, userRole, orgId, onReload, onToast }) {
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('all')
  const [filterSubfam, setFilterSubfam] = useState('all')
  const [modal, setModal] = useState(null)
  const [confirm, setConfirm] = useState(null)

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

  const availableSubfams = useMemo(() => {
    if (filterCat === 'all') return subfamilies
    const famId = families.find(f => f.code?.toLowerCase() === filterCat || f.name?.toLowerCase().includes(filterCat))?.id
    return famId ? subfamilies.filter(sf => sf.family_id === famId) : subfamilies
  }, [filterCat, families, subfamilies])

  function productStock(pid) {
    return stock.filter(s => s.product_id === pid).reduce((sum, s) => sum + (s.quantity || 0), 0)
  }

  async function handleDelete(product) {
    try {
      await db.delete('stock', `product_id=eq.${product.id}`)
      await db.delete('movements', `product_id=eq.${product.id}`)
      await db.delete('products', `id=eq.${product.id}`)
      onToast('Produit supprimé')
      setConfirm(null)
      setModal(null)
      onReload()
    } catch (e) {
      onToast('Erreur: ' + e.message, colors.danger)
    }
  }

  function getStockColor(qty, minStock) {
    if (qty === 0) return colors.danger
    if (qty <= (minStock || 5)) return colors.warning
    return colors.success
  }

  return (
    <>
    {/* Product Detail (floating window) */}
    {modal?.type === 'detail' && (
      <div
        onClick={() => setModal(null)}
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(15,23,42,0.4)',
          backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16,
          animation: 'fadeIn 0.15s ease',
        }}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{
            width: '100%', maxWidth: 420, maxHeight: '78vh',
            background: 'white', borderRadius: 20,
            boxShadow: '0 12px 48px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.04)',
            overflowY: 'auto', WebkitOverflowScrolling: 'touch',
            animation: 'scaleIn 0.2s ease',
          }}
        >
          <div style={{ position: 'sticky', top: 0, zIndex: 2, background: 'white', borderRadius: '20px 20px 0 0', padding: '10px 14px 0', display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => setModal(null)} style={{ width: 30, height: 30, borderRadius: 15, background: '#F1F5F9', border: 'none', fontSize: 16, color: '#94A3B8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          </div>
          <ProductDetail
            embedded
            product={modal.product}
            products={products}
            stock={stock}
            locations={locations}
            movements={movements || []}
            events={events || []}
            eventPacking={eventPacking || []}
            userRole={userRole}
            onClose={() => setModal(null)}
            onEdit={() => setModal({ type: 'edit', product: modal.product })}
            onDelete={() => setConfirm({
              message: `Supprimer "${modal.product.name}" ?`,
              detail: 'Le produit, son stock et son historique de mouvements seront supprimés. Cette action est irréversible.',
              onConfirm: () => handleDelete(modal.product),
            })}
            onToast={onToast}
          />
        </div>
      </div>
    )}

    <div style={{ padding: '0 16px 24px' }}>
      {/* Search */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: colors.bgSurface, borderRadius: 12,
        border: `1px solid ${colors.border}`, padding: '10px 14px', marginBottom: 14,
      }}>
        <Search size={16} color={colors.textTertiary} />
        <input
          placeholder="Rechercher un produit..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1, background: 'none', border: 'none', outline: 'none',
            color: colors.textPrimary, fontSize: 14,
          }}
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
              {cat.icon && React.createElement(cat.icon, { size: 12 })} {cat.name} ({count})
            </FilterPill>
          )
        })}
      </div>

      {/* Subfamily filter */}
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

      {/* Product count + action buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 13, color: colors.textTertiary, fontWeight: 600 }}>
          {filtered.length} produit{filtered.length > 1 ? 's' : ''}
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setModal({ type: 'csv' })} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 12px', borderRadius: 8, background: 'rgba(99,102,241,0.08)',
            border: `1px solid rgba(99,102,241,0.2)`, color: colors.accent, fontSize: 12, fontWeight: 700, cursor: 'pointer',
          }}>
            <FileDown size={14} /> CSV
          </button>
          <button onClick={() => setModal({ type: 'add' })} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 8, background: colors.accent,
            color: '#FFFFFF', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer',
          }}>
            <Plus size={14} /> Ajouter
          </button>
        </div>
      </div>

      {/* Product list */}
      {filtered.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '48px 24px',
          background: colors.bgSurface, borderRadius: 12, border: `1px solid ${colors.border}`,
        }}>
          <Package size={40} color={colors.textTertiary} style={{ marginBottom: 12 }} />
          <div style={{ fontSize: 16, fontWeight: 700, color: colors.textPrimary, marginBottom: 4 }}>Aucun produit</div>
          <div style={{ fontSize: 13, color: colors.textSecondary }}>
            {search ? 'Aucun résultat pour cette recherche' : 'Ajoute ton premier produit'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(p => {
            const cat = getCat(p.category)
            const qty = productStock(p.id)
            const isLow = qty <= (p.min_stock || 5)
            const isZero = qty === 0
            return (
              <div key={p.id} onClick={() => setModal({ type: 'detail', product: p })}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', padding: '12px 16px',
                  background: colors.bgSurface, borderRadius: 12, border: `1px solid ${colors.border}`,
                  transition: 'border-color 0.15s',
                }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12, background: `${cat.color || colors.accent}15`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
                }}>{p.image || (cat.icon && React.createElement(cat.icon, { size: 22 }))}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: colors.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.name}
                  </div>
                  <div style={{ fontSize: 11, color: colors.textTertiary, marginTop: 2 }}>
                    {p.sku} · <span style={{ color: cat.color }}>{cat.name}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div>
                    <div style={{
                      fontSize: 18, fontWeight: 600,
                      color: getStockColor(qty, p.min_stock),
                    }}>{qty}</div>
                    {isZero && <div style={{ fontSize: 9, color: colors.danger, fontWeight: 700 }}>RUPTURE</div>}
                    {isLow && !isZero && <div style={{ fontSize: 9, color: colors.warning, fontWeight: 700 }}>BAS</div>}
                  </div>
                  <ChevronRight size={16} color={colors.textTertiary} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
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
                await db.insert('products', { ...data, org_id: orgId })
                onToast('Produit ajouté')
              }
              setModal(null)
              onReload()
            } catch (e) {
              onToast('Erreur: ' + e.message, colors.danger)
            }
          }}
        />
      )}

      {/* CSV Import */}
      {modal?.type === 'csv' && (
        <CSVImport
          families={families}
          subfamilies={subfamilies}
          orgId={orgId}
          onDone={() => { setModal(null); onReload() }}
          onClose={() => setModal(null)}
          onToast={onToast}
        />
      )}

      {/* Confirm dialog */}
      {confirm && (
        <Confirm
          message={confirm.message}
          detail={confirm.detail}
          confirmLabel="Supprimer"
          confirmColor={colors.danger}
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
    </>
  )
}

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

  function handleSave() {
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
      image: image || '',
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
            {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label className="label">Famille</label>
            <select className="input" value={familyId} onChange={e => { setFamilyId(e.target.value); setSubfamilyId('') }}>
              <option value="">--</option>
              {families.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Sous-famille</label>
            <select className="input" value={subfamilyId} onChange={e => setSubfamilyId(e.target.value)}>
              <option value="">--</option>
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
          <input className="input" value={image} onChange={e => setImage(e.target.value)} placeholder="URL d'image" />
        </div>

        {/* Comptabilité */}
        <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: 14, marginTop: 4 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
            Comptabilité
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label className="label">Coût HT (EUR)</label>
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
            <div style={{ fontSize: 11, color: colors.warning, marginTop: 6, fontWeight: 600 }}>
              Sous le seuil de 500 EUR HT - comptabilisé en charge
            </div>
          )}
          {costHt && parseFloat(costHt) >= 500 && !usefulLife && (
            <div style={{ fontSize: 11, color: colors.accent, marginTop: 6, fontWeight: 600 }}>
              Immobilisation - renseigner la durée d'amortissement
            </div>
          )}
        </div>

        <button className="btn-primary" onClick={handleSave} disabled={!name.trim() || !sku.trim()}
          style={{ background: colors.accent, borderRadius: 8 }}>
          {isEdit ? 'Enregistrer' : 'Ajouter le produit'}
        </button>
      </div>
    </Modal>
  )
}

function FilterPill({ active, color, small, onClick, children }) {
  const activeColor = color || colors.accent
  return (
    <button onClick={onClick} style={{
      padding: small ? '5px 12px' : '7px 14px',
      borderRadius: 20,
      fontSize: small ? 11 : 12,
      fontWeight: 700,
      whiteSpace: 'nowrap',
      border: `1px solid ${active ? activeColor : colors.border}`,
      background: active ? `${activeColor}15` : colors.bgSurface,
      color: active ? activeColor : colors.textSecondary,
      cursor: 'pointer',
      transition: 'all 0.15s',
    }}>{children}</button>
  )
}
