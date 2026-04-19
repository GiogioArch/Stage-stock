import React, { useState, useRef, useMemo, createElement } from 'react'
import { db } from '../lib/supabase'
import { FileDown, Upload, AlertCircle, CheckCircle, FileText } from 'lucide-react'
import { Modal } from './UI'
import { useProject, useToast } from '../shared/hooks'
import { exportCSV } from '../lib/csvExport'
import { logAction } from '../lib/auditLog'

// ─── Composant : Mise a jour en masse des articles ───
// Accessible aux roles gestionnaire stock : TM, PM, LOG, PA, MM
// Export template : genere un CSV avec le catalogue actuel (pour modifier en Excel)
// Import : match par SKU, met a jour cost_ht, sell_price_ttc, min_stock, active, sale_price
// Preview des changements avant application + audit log

const UPDATABLE_FIELDS = [
  { key: 'cost_ht',        label: 'Prix achat HT (EUR)',    type: 'number' },
  { key: 'sell_price_ttc', label: 'Prix vente TTC (EUR)',   type: 'number' },
  { key: 'sale_price',     label: 'Prix vente (alias)',     type: 'number' },
  { key: 'min_stock',      label: 'Stock minimum',          type: 'int' },
  { key: 'active',         label: 'Actif (true/false)',     type: 'bool' },
  { key: 'barcode',        label: 'Code-barres',            type: 'text' },
  { key: 'name',           label: 'Nom',                    type: 'text' },
  { key: 'unit',           label: 'Unite',                  type: 'text' },
]

export default function BulkProductUpdate({ products, onDone, onClose }) {
  const { orgId } = useProject()
  const onToast = useToast()
  const [rows, setRows] = useState([])
  const [headers, setHeaders] = useState([])
  const [changes, setChanges] = useState([]) // { sku, product, updates, errors }
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)
  const fileRef = useRef()

  // ─── Export template ───
  const exportTemplate = () => {
    const columns = [
      { key: 'sku', label: 'SKU' }, // clé de match, ne pas modifier
      { key: 'name', label: 'Nom' },
      { key: 'cost_ht', label: 'Prix achat HT' },
      { key: 'sell_price_ttc', label: 'Prix vente TTC' },
      { key: 'sale_price', label: 'Prix vente (alias)' },
      { key: 'min_stock', label: 'Stock min' },
      { key: 'active', label: 'Actif (true/false)' },
      { key: 'barcode', label: 'Code-barres' },
      { key: 'unit', label: 'Unite' },
    ]
    const data = (products || []).map(p => ({
      sku: p.sku,
      name: p.name,
      cost_ht: p.cost_ht ?? '',
      sell_price_ttc: p.sell_price_ttc ?? '',
      sale_price: p.sale_price ?? '',
      min_stock: p.min_stock ?? '',
      active: p.active === false ? 'false' : 'true',
      barcode: p.barcode ?? '',
      unit: p.unit ?? '',
    }))
    const date = new Date().toISOString().split('T')[0]
    exportCSV(data, `template-articles-${date}.csv`, columns)
    onToast('Template exporte')
  }

  // ─── Parse CSV ───
  const parseCSV = (text) => {
    const lines = text.split(/\r?\n/).filter(l => l.trim())
    if (lines.length < 2) return { headers: [], rows: [] }
    const sep = lines[0].includes(';') ? ';' : ','
    const hdrs = lines[0].split(sep).map(h => h.trim().replace(/^"|"$/g, ''))
    const data = lines.slice(1).map(line => {
      const vals = line.split(sep).map(v => v.trim().replace(/^"|"$/g, ''))
      const row = {}
      hdrs.forEach((h, i) => { row[h] = vals[i] || '' })
      return row
    }).filter(r => Object.values(r).some(v => v))
    return { headers: hdrs, rows: data }
  }

  // ─── Analyse des diffs ───
  const analyzeChanges = (data, hdrs) => {
    const skuCol = hdrs.find(h => h.toLowerCase() === 'sku') || 'sku'
    const results = []

    for (const row of data) {
      const sku = String(row[skuCol] || '').trim()
      if (!sku) {
        results.push({ sku: '(vide)', errors: ['SKU manquant'], updates: {}, product: null })
        continue
      }
      const product = (products || []).find(p => p.sku === sku)
      if (!product) {
        results.push({ sku, errors: ['SKU introuvable dans le catalogue'], updates: {}, product: null })
        continue
      }

      const updates = {}
      const errors = []

      for (const field of UPDATABLE_FIELDS) {
        const col = hdrs.find(h => h.toLowerCase().replace(/[_\s-]/g, '') === field.key.replace(/_/g, ''))
        if (!col) continue
        const raw = String(row[col] || '').trim()
        if (raw === '') continue

        let parsed
        try {
          if (field.type === 'number') {
            parsed = parseFloat(raw.replace(',', '.'))
            if (isNaN(parsed) || parsed < 0) throw new Error(`Valeur invalide pour ${field.label} : ${raw}`)
          } else if (field.type === 'int') {
            parsed = parseInt(raw.replace(/[^0-9-]/g, ''), 10)
            if (isNaN(parsed) || parsed < 0) throw new Error(`Valeur invalide pour ${field.label} : ${raw}`)
          } else if (field.type === 'bool') {
            const low = raw.toLowerCase()
            if (['true', 'vrai', '1', 'oui', 'yes'].includes(low)) parsed = true
            else if (['false', 'faux', '0', 'non', 'no'].includes(low)) parsed = false
            else throw new Error(`Booleen invalide : ${raw}`)
          } else {
            parsed = raw
          }
          // Seulement si changement
          if (parsed !== product[field.key]) {
            updates[field.key] = parsed
          }
        } catch (e) {
          errors.push(e.message)
        }
      }

      results.push({ sku, product, updates, errors })
    }
    return results
  }

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const { headers: hdrs, rows: data } = parseCSV(ev.target.result)
      setHeaders(hdrs)
      setRows(data)
      setChanges(analyzeChanges(data, hdrs))
    }
    reader.readAsText(file)
  }

  // ─── Stats changements ───
  const stats = useMemo(() => {
    const toUpdate = changes.filter(c => Object.keys(c.updates).length > 0 && c.errors.length === 0)
    const errors = changes.filter(c => c.errors.length > 0)
    const unchanged = changes.filter(c => Object.keys(c.updates).length === 0 && c.errors.length === 0)
    return {
      toUpdate: toUpdate.length,
      errors: errors.length,
      unchanged: unchanged.length,
      total: changes.length,
    }
  }, [changes])

  // ─── Application des updates ───
  const handleApply = async () => {
    setImporting(true)
    let success = 0
    let failed = 0
    const toUpdate = changes.filter(c => Object.keys(c.updates).length > 0 && c.errors.length === 0)

    for (const change of toUpdate) {
      try {
        await db.update('products', `id=eq.${change.product.id}`, change.updates)
        logAction('product.bulk_update', {
          orgId,
          targetType: 'product',
          targetId: change.product.id,
          details: { sku: change.sku, updates: change.updates },
        }).catch(() => {})
        success++
      } catch {
        failed++
      }
    }
    setResult({ success, failed })
    setImporting(false)
    if (success > 0) onDone?.()
  }

  // ─── Rendu ───
  return (
    <Modal title="Mise a jour en masse des articles" onClose={onClose}>
      {!rows.length ? (
        <div style={{ padding: '12px 0' }}>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            {createElement(FileText, { size: 40, color: '#94A3B8' })}
          </div>

          <div style={{
            padding: '14px', borderRadius: 12, background: '#EEF4FA',
            border: '1px solid #C7D9EC', marginBottom: 16, fontSize: 12, color: '#1E293B', lineHeight: 1.6,
          }}>
            <strong style={{ color: '#2563EB' }}>Mode d'emploi :</strong>
            <ol style={{ margin: '6px 0 0 18px', padding: 0 }}>
              <li>Exporte le template (contient tous tes articles actuels)</li>
              <li>Modifie les colonnes a mettre a jour dans Excel / Google Sheets</li>
              <li>Sauvegarde en CSV</li>
              <li>Importe : les articles sont identifies par leur SKU (non modifiable)</li>
              <li>Tu verras un recap des changements avant validation</li>
            </ol>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button onClick={exportTemplate} style={{
              padding: '14px 20px', borderRadius: 8, fontSize: 14, fontWeight: 600,
              background: '#16A34A', color: 'white', cursor: 'pointer', border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              {createElement(FileDown, { size: 16 })}
              Exporter le template ({(products || []).length} articles)
            </button>

            <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFile} style={{ display: 'none' }} />

            <button onClick={() => fileRef.current?.click()} style={{
              padding: '14px 20px', borderRadius: 8, fontSize: 14, fontWeight: 600,
              background: '#7C3AED', color: 'white', cursor: 'pointer', border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              {createElement(Upload, { size: 16 })}
              Importer un CSV modifie
            </button>
          </div>

          <div style={{ marginTop: 16, fontSize: 11, color: '#94A3B8', textAlign: 'center' }}>
            Champs modifiables : prix achat HT, prix vente TTC, stock min, actif, code-barres, nom, unite
          </div>
        </div>
      ) : result ? (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ marginBottom: 12 }}>
            {createElement(CheckCircle, { size: 48, color: result.failed === 0 ? '#16A34A' : '#D97706' })}
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#1E293B', marginBottom: 8 }}>Import termine</div>
          <div style={{ fontSize: 14, color: '#16A34A', fontWeight: 600 }}>
            {result.success} article{result.success > 1 ? 's' : ''} mis a jour
          </div>
          {result.failed > 0 && (
            <div style={{ fontSize: 13, color: '#DC2626', fontWeight: 600, marginTop: 4 }}>
              {result.failed} erreur{result.failed > 1 ? 's' : ''}
            </div>
          )}
          <button onClick={onClose} style={{
            marginTop: 20, padding: '10px 24px', borderRadius: 8, fontSize: 14, fontWeight: 600,
            background: '#7C3AED', color: 'white', cursor: 'pointer', border: 'none',
          }}>Fermer</button>
        </div>
      ) : (
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1E293B', marginBottom: 4 }}>
            {rows.length} ligne{rows.length > 1 ? 's' : ''} analysee{rows.length > 1 ? 's' : ''}
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <span style={{
              padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
              background: '#16A34A15', color: '#16A34A',
            }}>{stats.toUpdate} a mettre a jour</span>
            <span style={{
              padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
              background: '#94A3B815', color: '#64748B',
            }}>{stats.unchanged} inchange{stats.unchanged > 1 ? 's' : ''}</span>
            {stats.errors > 0 && (
              <span style={{
                padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                background: '#DC262615', color: '#DC2626',
              }}>{stats.errors} erreur{stats.errors > 1 ? 's' : ''}</span>
            )}
          </div>

          {/* Preview changements */}
          <div style={{ maxHeight: 300, overflowY: 'auto', marginBottom: 16 }}>
            {changes.slice(0, 50).map((c, i) => {
              const updateKeys = Object.keys(c.updates)
              const hasErrors = c.errors.length > 0
              const hasUpdates = updateKeys.length > 0
              return (
                <div key={`${c.sku}-${i}`} style={{
                  padding: '8px 10px', borderBottom: '1px solid #F1F5F9',
                  background: hasErrors ? '#DC262608' : hasUpdates ? '#16A34A08' : 'transparent',
                }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#1E293B', marginBottom: 2 }}>
                    {c.sku} {c.product?.name ? `— ${c.product.name}` : ''}
                  </div>
                  {hasErrors && (
                    <div style={{ fontSize: 10, color: '#DC2626', display: 'flex', alignItems: 'center', gap: 4 }}>
                      {createElement(AlertCircle, { size: 10 })}
                      {c.errors.join(' · ')}
                    </div>
                  )}
                  {hasUpdates && updateKeys.map(k => {
                    const oldVal = c.product?.[k]
                    const newVal = c.updates[k]
                    return (
                      <div key={k} style={{ fontSize: 10, color: '#64748B' }}>
                        <strong>{k}</strong> : {String(oldVal ?? '—')} → <span style={{ color: '#16A34A', fontWeight: 700 }}>{String(newVal)}</span>
                      </div>
                    )
                  })}
                  {!hasErrors && !hasUpdates && (
                    <div style={{ fontSize: 10, color: '#94A3B8' }}>Aucun changement detecte</div>
                  )}
                </div>
              )
            })}
            {changes.length > 50 && (
              <div style={{ padding: 10, textAlign: 'center', fontSize: 11, color: '#94A3B8' }}>
                ... et {changes.length - 50} autres lignes
              </div>
            )}
          </div>

          <button
            onClick={handleApply}
            disabled={importing || stats.toUpdate === 0}
            style={{
              padding: '14px 20px', borderRadius: 8, fontSize: 14, fontWeight: 600,
              width: '100%', cursor: stats.toUpdate === 0 ? 'not-allowed' : 'pointer',
              background: stats.toUpdate === 0 ? '#CBD5E1' : '#7C3AED',
              color: 'white', border: 'none',
              opacity: importing ? 0.5 : 1,
            }}
          >
            {importing
              ? 'Mise a jour en cours...'
              : stats.toUpdate === 0
                ? 'Aucun changement a appliquer'
                : `Appliquer ${stats.toUpdate} mise${stats.toUpdate > 1 ? 's' : ''} a jour`}
          </button>

          <button
            onClick={() => { setRows([]); setChanges([]); setHeaders([]) }}
            style={{
              marginTop: 8, padding: '10px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              width: '100%', cursor: 'pointer',
              background: '#F1F5F9', color: '#64748B', border: '1px solid #E2E8F0',
            }}
          >
            Annuler et recommencer
          </button>
        </div>
      )}
    </Modal>
  )
}
