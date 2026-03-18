import React, { useState, useMemo } from 'react'
import { db } from '../lib/supabase'
import { Badge } from './UI'

export default function Inventaire({ products, stock, locations, orgId, onReload, onToast }) {
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [counts, setCounts] = useState({}) // { productId: counted_qty }
  const [saving, setSaving] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [results, setResults] = useState(null)

  // Products with stock at selected location
  const locationProducts = useMemo(() => {
    if (!selectedLocation) return []
    return (products || []).map(p => {
      const stockRow = (stock || []).find(s => s.product_id === p.id && s.location_id === selectedLocation.id)
      const systemQty = stockRow?.quantity || 0
      return { ...p, systemQty, stockId: stockRow?.id }
    }).filter(p => p.systemQty > 0 || counts[p.id] != null)
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  }, [products, stock, selectedLocation, counts])

  const setCount = (productId, value) => {
    setCounts(prev => ({ ...prev, [productId]: value }))
  }

  // ─── Apply corrections ───
  const applyCorrections = async () => {
    const diffs = locationProducts
      .filter(p => counts[p.id] != null && parseInt(counts[p.id]) !== p.systemQty)
      .map(p => ({
        ...p,
        counted: parseInt(counts[p.id]) || 0,
        diff: (parseInt(counts[p.id]) || 0) - p.systemQty,
      }))

    if (diffs.length === 0) {
      onToast('Aucun écart détecté')
      setResults({ diffs: [], total: locationProducts.length })
      setCompleted(true)
      return
    }

    setSaving(true)
    try {
      for (const item of diffs) {
        if (item.stockId) {
          try {
            await db.update('stock', `id=eq.${item.stockId}`, { quantity: item.counted })
          } catch (e) {
            console.error('Stock update error:', e)
          }
        }
        // Log as movement
        try {
          await db.insert('movements', {
            org_id: orgId,
            product_id: item.id,
            type: item.diff > 0 ? 'in' : 'out',
            quantity: Math.abs(item.diff),
            to_loc: item.diff > 0 ? selectedLocation.id : null,
            from_loc: item.diff < 0 ? selectedLocation.id : null,
            note: `Inventaire physique — écart ${item.diff > 0 ? '+' : ''}${item.diff}`,
          })
        } catch (e) {
          console.error('Movement log error:', e)
        }
      }

      setResults({ diffs, total: locationProducts.length })
      setCompleted(true)
      onToast(`Inventaire terminé — ${diffs.length} correction${diffs.length > 1 ? 's' : ''}`)
      if (onReload) onReload()
    } catch (e) {
      onToast('Erreur : ' + e.message, '#8B6DB8')
    } finally {
      setSaving(false)
    }
  }

  // ─── Results screen ───
  if (completed && results) {
    return (
      <div style={{ padding: '0 16px 24px' }}>
        <div className="card" style={{
          padding: '24px 16px', textAlign: 'center', marginBottom: 16,
          background: 'linear-gradient(135deg, #5DAB8B08, #5DAB8B18)',
          border: '1px solid #5DAB8B25',
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}></div>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#5DAB8B' }}>Inventaire terminé</div>
          <div style={{ fontSize: 13, color: '#94A3B8', marginTop: 6 }}>
            {selectedLocation.icon} {selectedLocation.name} · {results.total} produits vérifiés
          </div>
        </div>

        {results.diffs.length > 0 && (
          <div className="card" style={{ padding: '14px 16px', marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
              {results.diffs.length} écart{results.diffs.length > 1 ? 's' : ''} corrigé{results.diffs.length > 1 ? 's' : ''}
            </div>
            {results.diffs.map((d, i) => (
              <div key={d.id} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0',
                borderBottom: i < results.diffs.length - 1 ? '1px solid #E2E8F0' : 'none',
              }}>
                <span style={{ fontSize: 14 }}>{d.image || ''}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>{d.name}</div>
                  <div style={{ fontSize: 10, color: '#94A3B8' }}>Système: {d.systemQty} → Réel: {d.counted}</div>
                </div>
                <span style={{
                  fontSize: 14, fontWeight: 600,
                  color: d.diff > 0 ? '#5DAB8B' : '#8B6DB8',
                }}>{d.diff > 0 ? '+' : ''}{d.diff}</span>
              </div>
            ))}
          </div>
        )}

        <button onClick={() => { setCompleted(false); setSelectedLocation(null); setCounts({}); setResults(null) }}
          className="btn-primary">Nouvel inventaire</button>
      </div>
    )
  }

  // ─── Location picker ───
  if (!selectedLocation) {
    return (
      <div style={{ padding: '0 16px 24px' }}>
        <div className="card" style={{
          marginBottom: 16, padding: '18px 16px',
          background: 'linear-gradient(135deg, #8BAB5D08, #8BAB5D18)',
          border: '1px solid #8BAB5D25',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 8,
              background: 'linear-gradient(135deg, #8BAB5D, #7A9A4C)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 24, color: 'white', boxShadow: '0 4px 16px #8BAB5D30',
            }}></div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#1E293B' }}>Inventaire physique</div>
              <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 600 }}>
                Comptage réel vs système
              </div>
            </div>
          </div>
        </div>

        <div style={{ fontSize: 13, fontWeight: 600, color: '#94A3B8', marginBottom: 12 }}>
          Sélectionne le dépôt à inventorier
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {(locations || []).map(loc => {
            const locQty = (stock || []).filter(s => s.location_id === loc.id && s.quantity > 0).reduce((s, st) => s + st.quantity, 0)
            const nbProds = new Set((stock || []).filter(s => s.location_id === loc.id && s.quantity > 0).map(s => s.product_id)).size
            return (
              <button key={loc.id} onClick={() => setSelectedLocation(loc)} className="card" style={{
                padding: '14px 16px', cursor: 'pointer', textAlign: 'left', width: '100%',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: (loc.color || '#5B8DB8') + '15',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
                  }}>{loc.icon || ''}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{loc.name}</div>
                    <div style={{ fontSize: 11, color: '#94A3B8' }}>{nbProds} réf. · {locQty} unités</div>
                  </div>
                  <span style={{ fontSize: 14, color: '#94A3B8' }}>→</span>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // ─── Counting interface ───
  const countedCount = Object.keys(counts).length
  const totalProducts = locationProducts.length

  return (
    <div style={{ padding: '0 16px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <button onClick={() => { setSelectedLocation(null); setCounts({}) }} style={{
          padding: '8px 14px', borderRadius: 12, fontSize: 13, fontWeight: 600,
          background: '#F1F5F9', border: '1px solid #E2E8F0', color: '#94A3B8', cursor: 'pointer',
        }}>← Retour</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#1E293B' }}>
            {selectedLocation.icon} {selectedLocation.name}
          </div>
          <div style={{ fontSize: 11, color: '#94A3B8' }}>
            {countedCount}/{totalProducts} comptés
          </div>
        </div>
      </div>

      {/* Progress */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ height: 6, borderRadius: 3, background: '#E2E8F0', overflow: 'hidden' }}>
          <div style={{
            width: `${totalProducts > 0 ? Math.round((countedCount / totalProducts) * 100) : 0}%`,
            height: '100%', borderRadius: 3, background: '#8BAB5D', transition: 'width 0.3s',
          }} />
        </div>
      </div>

      {/* Product list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {locationProducts.map(p => {
          const counted = counts[p.id]
          const hasCount = counted != null && counted !== ''
          const countedInt = parseInt(counted) || 0
          const hasDiff = hasCount && countedInt !== p.systemQty
          return (
            <div key={p.id} className="card" style={{
              padding: '12px 14px',
              borderLeft: hasDiff ? `4px solid ${countedInt > p.systemQty ? '#5DAB8B' : '#8B6DB8'}` : hasCount ? '4px solid #8BAB5D' : '4px solid #E2E8F0',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 16 }}>{p.image || ''}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                  <div style={{ fontSize: 10, color: '#94A3B8' }}>
                    Système : <strong>{p.systemQty}</strong>
                    {hasDiff && <span style={{ color: countedInt > p.systemQty ? '#5DAB8B' : '#8B6DB8', fontWeight: 600 }}>
                      {' '}→ {countedInt} ({countedInt - p.systemQty > 0 ? '+' : ''}{countedInt - p.systemQty})
                    </span>}
                  </div>
                </div>
                <input
                  value={counted ?? ''}
                  onChange={e => setCount(p.id, e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder={String(p.systemQty)}
                  inputMode="numeric"
                  style={{
                    width: 64, padding: '8px 6px', borderRadius: 10, textAlign: 'center',
                    fontSize: 16, fontWeight: 600, border: `2px solid ${hasDiff ? '#8B6DB8' : hasCount ? '#8BAB5D' : '#E2E8F0'}`,
                    background: hasDiff ? '#FDF0F410' : 'white', outline: 'none',
                    color: hasDiff ? '#8B6DB8' : '#1E293B',
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Validate */}
      {countedCount > 0 && (
        <div style={{ position: 'sticky', bottom: 80, paddingTop: 16 }}>
          <button onClick={applyCorrections} disabled={saving} className="btn-primary" style={{ width: '100%' }}>
            {saving ? 'Application des corrections...' : `Valider l'inventaire (${countedCount} produits)`}
          </button>
        </div>
      )}
    </div>
  )
}
