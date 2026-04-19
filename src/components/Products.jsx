import React, { useState, useMemo, useEffect } from 'react'
import { Search, FileDown, Download, Package, Plus, ChevronRight, Edit, Trash2, Filter, ChevronDown, Eye, EyeOff } from 'lucide-react'
import { db } from '../lib/supabase'
import { logAction } from '../lib/auditLog'
import { Modal, Confirm, getCat, CATEGORIES, Badge, intOnly } from './UI'
import ProductDetail from './ProductDetail'
import CSVImport from './CSVImport'
import { exportCSV, todayISO } from '../lib/csvExport'

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
  const [showInactive, setShowInactive] = useState(false)
  const [modal, setModal] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [displayCount, setDisplayCount] = useState(50)

  // Reset displayCount when filters change
  useEffect(() => { setDisplayCount(50) }, [search, filterCat, filterSubfam, showInactive])

  const filtered = useMemo(() => {
    let list = products
    if (!showInactive) list = list.filter(p => p.active !== false)
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
  }, [products, filterCat, filterSubfam, search, showInactive])

  const availableSubfams = useMemo(() => {
    if (filterCat === 'all') return subfamilies
    const famId = families.find(f => f.code?.toLowerCase() === filterCat || f.name?.toLowerCase().includes(filterCat))?.id
    return famId ? subfamilies.filter(sf => sf.family_id === famId) : subfamilies
  }, [filterCat, families, subfamilies])

  function productStock(pid) {
    return stock.filter(s => s.product_id === pid).reduce((sum, s) => sum + (s.quantity || 0), 0)
  }

  async function handleDeactivate(product) {
    try {
      await db.update('products', `id=eq.${product.id}`, { active: false })
      logAction('product.deactivate', {
        orgId,
        targetType: 'product',
        targetId: product.id,
        details: { name: product.name, sku: product.sku },
      })
      onToast('Article désactivé')
      setConfirm(null)
      setModal(null)
      onReload()
    } catch (e) {
      onToast('Erreur: ' + e.message, colors.danger)
    }
  }

  async function handleHardDelete(product) {
    try {
      await db.delete('stock', `product_id=eq.${product.id}`)
      await db.delete('movements', `product_id=eq.${product.id}`)
      await db.delete('products', `id=eq.${product.id}`)
      logAction('product.delete', {
        orgId,
        targetType: 'product',
        targetId: product.id,
        details: { name: product.name, sku: product.sku },
      })
      onToast('Produit supprimé définitivement')
      setConfirm(null)
      setModal(null)
      onReload()
    } catch (e) {
      onToast('Erreur: ' + e.message, colors.danger)
    }
  }

  async function handleToggleActive(e, product) {
    e.stopPropagation()
    const newActive = product.active === false
    try {
      await db.update('products', `id=eq.${product.id}`, { active: newActive })
      onToast(newActive ? 'Article réactivé' : 'Article désactivé')
      onReload()
    } catch (err) {
      onToast('Erreur: ' + err.message, colors.danger)
    }
  }

  function getStockColor(qty, minStock) {
    if (qty === 0) return colors.danger
    if (qty <= (minStock || 5)) return colors.warning
    return colors.success
  }

  return (
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
        <label style={{
          display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
          fontSize: 11, color: showInactive ? colors.accent : colors.textTertiary,
          fontWeight: 600, whiteSpace: 'nowrap', userSelect: 'none',
        }}>
          <div onClick={() => setShowInactive(!showInactive)} style={{
            width: 32, height: 18, borderRadius: 9, position: 'relative',
            background: showInactive ? colors.accent : '#CBD5E1',
            transition: 'background 0.2s', cursor: 'pointer',
          }}>
            <div style={{
              width: 14, height: 14, borderRadius: 7, background: '#FFF',
              position: 'absolute', top: 2,
              left: showInactive ? 16 : 2,
              transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }} />
          </div>
          Inactifs
        </label>
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
          {filtered.length > displayCount
            ? `${displayCount} sur ${filtered.length} produit${filtered.length > 1 ? 's' : ''}`
            : `${filtered.length} produit${filtered.length > 1 ? 's' : ''}`
          }
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => {
            const subfamName = (id) => subfamilies.find(sf => sf.id === id)?.name || ''
            exportCSV(filtered, `produits-${todayISO()}.csv`, [
              { key: 'sku', label: 'SKU' },
              { key: 'name', label: 'Nom' },
              { key: row => getCat(row.category)?.name || row.category || '', label: 'Catégorie' },
              { key: row => subfamName(row.subfamily_id), label: 'Sous-famille' },
              { key: row => row.unit || 'pièce', label: 'Unité' },
              { key: 'min_stock', label: 'Stock min' },
              { key: row => row.cost_ht != null ? String(row.cost_ht).replace('.', ',') : '', label: 'Coût HT' },
              { key: row => row.sell_price_ttc != null ? String(row.sell_price_ttc).replace('.', ',') : '', label: 'Prix vente TTC' },
              { key: 'barcode', label: 'Code-barres' },
            ])
            onToast('Export CSV produits téléchargé')
          }} style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '8px 10px', borderRadius: 8, background: 'rgba(22,163,106,0.08)',
            border: '1px solid rgba(22,163,106,0.2)', color: '#16A34A', fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}>
            <Download size={14} /> Exporter
          </button>
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
          {filtered.slice(0, displayCount).map(p => {
            const cat = getCat(p.category)
            const qty = productStock(p.id)
            const isLow = qty <= (p.min_stock || 5)
            const isZero = qty === 0
            const isInactive = p.active === false
            return (
              <div key={p.id} onClick={() => setModal({ type: 'detail', product: p })}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', padding: '12px 16px',
                  background: colors.bgSurface, borderRadius: 12, border: `1px solid ${colors.border}`,
                  transition: 'border-color 0.15s',
                  opacity: isInactive ? 0.5 : 1,
                }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12, background: `${cat.color || colors.accent}15`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
                }}>{p.image || (cat.icon && React.createElement(cat.icon, { size: 22 }))}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 14, fontWeight: 700, color: colors.textPrimary,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    textDecoration: isInactive ? 'line-through' : 'none',
                  }}>
                    {p.name}
                  </div>
                  <div style={{ fontSize: 11, color: colors.textTertiary, marginTop: 2 }}>
                    {p.sku} · <span style={{ color: cat.color }}>{cat.name}</span>
                  </div>
                  {p.sell_price_ttc > 0 && (
                    <div style={{ fontSize: 11, marginTop: 2, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ color: colors.success, fontWeight: 700 }}>{Number(p.sell_price_ttc).toFixed(2)}€ TTC</span>
                      {p.cost_ht > 0 && (() => {
                        const margin = p.sell_price_ttc - p.cost_ht
                        const pct = ((margin / p.sell_price_ttc) * 100).toFixed(0)
                        return <span style={{ color: colors.textTertiary }}>Marge: {margin.toFixed(2)}€ ({pct}%)</span>
                      })()}
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button onClick={(e) => handleToggleActive(e, p)} title={isInactive ? 'Réactiver' : 'Désactiver'}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                    {isInactive
                      ? <EyeOff size={16} color={colors.textTertiary} />
                      : <Eye size={16} color={colors.textTertiary} />
                    }
                  </button>
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
          {filtered.length > displayCount && (
            <button
              onClick={() => setDisplayCount(prev => prev + 50)}
              style={{
                width: '100%', padding: '12px', marginTop: 8,
                borderRadius: 10, border: `1.5px solid ${colors.border}`, background: '#FFFFFF',
                color: colors.textSecondary, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <ChevronDown size={16} /> Voir plus ({Math.min(displayCount + 50, filtered.length)} sur {filtered.length})
            </button>
          )}
        </div>
      )}

      {/* Product Detail (full screen) */}
      {modal?.type === 'detail' && (
        <ProductDetail
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
          onDelete={() => {
            const isInactive = modal.product.active === false
            if (isInactive) {
              setConfirm({
                message: `Supprimer définitivement "${modal.product.name}" ?`,
                detail: 'Le produit, son stock et son historique de mouvements seront supprimés. Cette action est irréversible.',
                confirmLabel: 'Supprimer définitivement',
                confirmColor: colors.danger,
                onConfirm: () => handleHardDelete(modal.product),
              })
            } else {
              setConfirm({
                message: `Désactiver "${modal.product.name}" ?`,
                detail: 'L\'article sera masqué des listes et des alertes. Vous pourrez le réactiver à tout moment.',
                confirmLabel: 'Désactiver',
                confirmColor: colors.warning,
                onConfirm: () => handleDeactivate(modal.product),
              })
            }
          }}
          onToast={onToast}
        />
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
                logAction('product.update', {
                  orgId,
                  targetType: 'product',
                  targetId: modal.product.id,
                  details: { name: data.name, sku: data.sku },
                })
                onToast('Produit modifié')
              } else {
                const result = await db.insert('products', { ...data, org_id: orgId })
                logAction('product.create', {
                  orgId,
                  targetType: 'product',
                  targetId: result?.[0]?.id || null,
                  details: { name: data.name, sku: data.sku },
                })
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
          confirmLabel={confirm.confirmLabel || 'Confirmer'}
          confirmColor={confirm.confirmColor || colors.danger}
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  )
}

function ProductForm({ product, families, subfamilies, onClose, onSave }) {
  const isEdit = !!product
  const [active, setActive] = useState(product?.active !== false)
  const [name, setName] = useState(product?.name || '')
  const [sku, setSku] = useState(product?.sku || '')
  const [category, setCategory] = useState(product?.category || 'merch')
  const [familyId, setFamilyId] = useState(product?.family_id || '')
  const [subfamilyId, setSubfamilyId] = useState(product?.subfamily_id || '')
  const [unit, setUnit] = useState(product?.unit || 'pièce')
  const [minStock, setMinStock] = useState(String(product?.min_stock ?? 5))
  const [variants, setVariants] = useState(product?.variants || '')
  const [image, setImage] = useState(product?.image || '')
  const [barcode, setBarcode] = useState(product?.barcode || '')
  const [costHt, setCostHt] = useState(product?.cost_ht != null ? String(product.cost_ht) : '')
  const [sellPriceTtc, setSellPriceTtc] = useState(product?.sell_price_ttc != null ? String(product.sell_price_ttc) : '')
  const [purchaseDate, setPurchaseDate] = useState(product?.purchase_date || '')
  const [usefulLife, setUsefulLife] = useState(product?.useful_life_months != null ? String(product.useful_life_months) : '')
  const [errors, setErrors] = useState({})

  const availableSubfams = familyId ? subfamilies.filter(sf => sf.family_id === familyId) : []

  function clearError(field) {
    setErrors(prev => { const next = { ...prev }; delete next[field]; return next })
  }

  function handleSave() {
    const errs = {}
    if (!name.trim()) errs.name = 'Nom obligatoire'
    if (!sku.trim()) errs.sku = 'SKU obligatoire'
    const minStockNum = parseInt(minStock)
    if (minStock !== '' && (isNaN(minStockNum) || minStockNum < 0 || String(minStockNum) !== minStock.trim())) errs.min_stock = 'Valeur invalide'
    if (costHt !== '' && (isNaN(parseFloat(costHt)) || parseFloat(costHt) < 0)) errs.cost_ht = 'Valeur invalide'
    if (sellPriceTtc !== '' && (isNaN(parseFloat(sellPriceTtc)) || parseFloat(sellPriceTtc) < 0)) errs.sell_price_ttc = 'Valeur invalide'
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    onSave({
      active,
      name: name.trim(),
      sku: sku.trim(),
      category,
      family_id: familyId || null,
      subfamily_id: subfamilyId || null,
      unit,
      min_stock: parseInt(minStock) || 5,
      variants: variants.trim(),
      image: image || '',
      barcode: barcode.trim() || null,
      cost_ht: costHt ? parseFloat(costHt) : null,
      sell_price_ttc: sellPriceTtc ? parseFloat(sellPriceTtc) : null,
      purchase_date: purchaseDate || null,
      useful_life_months: usefulLife ? parseInt(usefulLife) : null,
    })
  }

  return (
    <Modal title={isEdit ? 'Modifier le produit' : 'Nouveau produit'} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Active toggle */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px', borderRadius: 10,
          background: active ? 'rgba(22,163,106,0.06)' : 'rgba(220,38,38,0.06)',
          border: `1px solid ${active ? 'rgba(22,163,106,0.2)' : 'rgba(220,38,38,0.2)'}`,
        }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: active ? '#16A34A' : '#DC2626' }}>
            {active ? 'Article actif' : 'Article inactif'}
          </span>
          <div onClick={() => setActive(!active)} style={{
            width: 40, height: 22, borderRadius: 11, position: 'relative',
            background: active ? '#16A34A' : '#CBD5E1',
            transition: 'background 0.2s', cursor: 'pointer',
          }}>
            <div style={{
              width: 18, height: 18, borderRadius: 9, background: '#FFF',
              position: 'absolute', top: 2,
              left: active ? 20 : 2,
              transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }} />
          </div>
        </div>

        <div>
          <label className="label">Nom *</label>
          <input className="input" value={name} onChange={e => { setName(e.target.value); clearError('name') }} placeholder="T-shirt Solda Lanmou Homme Noir" style={errors.name ? { borderColor: '#DC2626' } : {}} />
          {errors.name && <div style={{ fontSize: 11, color: '#DC2626', fontWeight: 600, marginTop: 3 }}>{errors.name}</div>}
        </div>

        <div>
          <label className="label">SKU *</label>
          <input className="input" value={sku} onChange={e => { setSku(e.target.value); clearError('sku') }} placeholder="TS-H-02" style={errors.sku ? { borderColor: '#DC2626' } : {}} />
          {errors.sku && <div style={{ fontSize: 11, color: '#DC2626', fontWeight: 600, marginTop: 3 }}>{errors.sku}</div>}
        </div>

        <div>
          <label className="label">Code-barres</label>
          <input className="input" value={barcode} onChange={e => setBarcode(e.target.value)} placeholder="EAN / Code 128 (laisser vide = utilise le SKU)" />
        </div>

        <div>
          <label className="label">Categorie</label>
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
            <label className="label">Unite</label>
            <select className="input" value={unit} onChange={e => setUnit(e.target.value)}>
              <option value="pièce">Piece</option>
              <option value="mètre">Metre</option>
              <option value="rouleau">Rouleau</option>
              <option value="lot">Lot</option>
            </select>
          </div>
          <div>
            <label className="label">Seuil alerte</label>
            <input className="input" type="number" min="0" step="1" value={minStock}
              onChange={e => { setMinStock(intOnly(e.target.value)); clearError('min_stock') }} style={errors.min_stock ? { borderColor: '#DC2626' } : {}} />
            {errors.min_stock && <div style={{ fontSize: 11, color: '#DC2626', fontWeight: 600, marginTop: 3 }}>{errors.min_stock}</div>}
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

        {/* Comptabilite */}
        <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: 14, marginTop: 4 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
            Comptabilite
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label className="label">Cout HT (EUR)</label>
              <input className="input" type="number" min="0" step="0.01" value={costHt}
                onChange={e => { setCostHt(e.target.value); clearError('cost_ht') }} placeholder="0.00" style={errors.cost_ht ? { borderColor: '#DC2626' } : {}} />
              {errors.cost_ht && <div style={{ fontSize: 11, color: '#DC2626', fontWeight: 600, marginTop: 3 }}>{errors.cost_ht}</div>}
            </div>
            <div>
              <label className="label">Prix vente TTC</label>
              <input className="input" inputMode="decimal" min="0" step="0.01" value={sellPriceTtc}
                onChange={e => { setSellPriceTtc(e.target.value.replace(/[^0-9.]/g, '')); clearError('sell_price_ttc') }} placeholder="0.00" style={errors.sell_price_ttc ? { borderColor: '#DC2626' } : {}} />
              {errors.sell_price_ttc && <div style={{ fontSize: 11, color: '#DC2626', fontWeight: 600, marginTop: 3 }}>{errors.sell_price_ttc}</div>}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
            <div>
              <label className="label">Date d'achat</label>
              <input className="input" type="date" value={purchaseDate}
                onChange={e => setPurchaseDate(e.target.value)} />
            </div>
            <div>
              <label className="label">Amortissement (mois)</label>
              <input className="input" type="number" min="0" step="1" value={usefulLife}
                onChange={e => setUsefulLife(intOnly(e.target.value))} placeholder="Ex: 36" />
            </div>
          </div>
          {costHt && parseFloat(costHt) > 0 && parseFloat(costHt) < 500 && (
            <div style={{ fontSize: 11, color: colors.warning, marginTop: 6, fontWeight: 600 }}>
              Sous le seuil de 500 EUR HT - comptabilise en charge
            </div>
          )}
          {costHt && parseFloat(costHt) >= 500 && !usefulLife && (
            <div style={{ fontSize: 11, color: colors.accent, marginTop: 6, fontWeight: 600 }}>
              Immobilisation - renseigner la duree d'amortissement
            </div>
          )}
        </div>

        <button className="btn-primary" onClick={handleSave}
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
