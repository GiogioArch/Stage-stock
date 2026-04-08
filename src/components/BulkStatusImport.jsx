import React, { useState, useRef, useMemo } from 'react'
import { db } from '../lib/supabase'
import { FileSpreadsheet, Upload, Check, AlertTriangle, X } from 'lucide-react'
import { Modal } from './UI'
import { useProject, useToast } from '../shared/hooks'
import { getModuleTheme, BASE, SEMANTIC } from '../lib/theme'
import { PRODUCT_STATUS } from '../lib/productStatus'
import * as XLSX from 'xlsx'

const theme = getModuleTheme('articles')

const STATUS_OPTIONS = [
  { id: 'inactif', label: 'Inactif', color: '#94A3B8', description: 'Article retiré du catalogue' },
  { id: 'stock_mort', label: 'Stock mort', color: SEMANTIC.danger, description: 'Invendable, à écouler ou détruire' },
  { id: 'stock_dormant', label: 'Stock dormant', color: SEMANTIC.warning, description: 'Pas de mouvement depuis longtemps' },
  { id: 'sur_stock', label: 'Sur-stock', color: '#5B8DB8', description: 'Quantité excessive par rapport à la demande' },
  { id: 'active', label: 'Actif', color: SEMANTIC.success, description: 'Article en vente / en service' },
]

export default function BulkStatusImport({ products, onDone, onClose }) {
  const { orgId } = useProject()
  const onToast = useToast()
  const fileRef = useRef()
  const [rows, setRows] = useState([])
  const [headers, setHeaders] = useState([])
  const [skuColumn, setSkuColumn] = useState('')
  const [nameColumn, setNameColumn] = useState('')
  const [targetStatus, setTargetStatus] = useState('inactif')
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)

  // Match file rows to existing products
  const matched = useMemo(() => {
    if (!rows.length || (!skuColumn && !nameColumn)) return []
    return rows.map(row => {
      const skuVal = skuColumn ? (row[skuColumn] || '').toString().trim() : ''
      const nameVal = nameColumn ? (row[nameColumn] || '').toString().trim() : ''
      const match = products.find(p => {
        if (skuVal && p.sku?.toLowerCase() === skuVal.toLowerCase()) return true
        if (nameVal && p.name?.toLowerCase() === nameVal.toLowerCase()) return true
        return false
      })
      return { row, skuVal, nameVal, match }
    })
  }, [rows, skuColumn, nameColumn, products])

  const matchedCount = matched.filter(m => m.match).length
  const unmatchedCount = matched.filter(m => !m.match).length

  const parseFile = (file) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        const json = XLSX.utils.sheet_to_json(sheet, { defval: '' })
        if (!json.length) {
          onToast('Fichier vide ou format non reconnu', SEMANTIC.danger)
          return
        }
        const hdrs = Object.keys(json[0])
        setHeaders(hdrs)
        setRows(json)

        // Auto-detect SKU and name columns
        const skuMatch = hdrs.find(h =>
          h.toLowerCase().replace(/[_\s-]/g, '') === 'sku' ||
          h.toLowerCase().includes('référence') ||
          h.toLowerCase().includes('reference') ||
          h.toLowerCase().includes('code')
        )
        const nameMatch = hdrs.find(h =>
          h.toLowerCase().replace(/[_\s-]/g, '') === 'nom' ||
          h.toLowerCase().includes('name') ||
          h.toLowerCase().includes('désignation') ||
          h.toLowerCase().includes('designation') ||
          h.toLowerCase().includes('produit') ||
          h.toLowerCase().includes('article')
        )
        if (skuMatch) setSkuColumn(skuMatch)
        if (nameMatch) setNameColumn(nameMatch)
      } catch (err) {
        onToast('Erreur lecture fichier: ' + err.message, SEMANTIC.danger)
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    parseFile(file)
  }

  const handleImport = async () => {
    const toUpdate = matched.filter(m => m.match).map(m => m.match)
    if (!toUpdate.length) {
      onToast('Aucun article correspondant trouvé', SEMANTIC.warning)
      return
    }

    setImporting(true)
    try {
      const skus = toUpdate.map(p => p.sku)
      const data = await db.rpc('bulk_update_product_status', {
        p_org_id: orgId,
        p_skus: skus,
        p_status: targetStatus,
      })
      if (data && !data.success) throw new Error(data.error)
      setResult({
        updated: data?.updated || toUpdate.length,
        notFound: data?.not_found || [],
        total: rows.length,
      })
      onToast(`${data?.updated || toUpdate.length} articles mis à jour`)
      onDone()
    } catch (e) {
      onToast('Erreur: ' + e.message, SEMANTIC.danger)
    } finally {
      setImporting(false)
    }
  }

  const statusConf = STATUS_OPTIONS.find(s => s.id === targetStatus)

  return (
    <Modal title="Mise à jour statut en masse" onClose={onClose}>
      {!rows.length ? (
        /* Step 1: File upload */
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <FileSpreadsheet size={48} color={BASE.textMuted} style={{ marginBottom: 12 }} />
          <p style={{ fontSize: 13, color: BASE.textSoft, marginBottom: 8, lineHeight: 1.6 }}>
            Charge un fichier <strong>CSV</strong> ou <strong>Excel (.xlsx)</strong> contenant
            les articles à modifier.
          </p>
          <p style={{ fontSize: 11, color: BASE.textMuted, marginBottom: 20, lineHeight: 1.5 }}>
            Le fichier doit contenir au minimum une colonne SKU ou Nom
            pour identifier les articles.
          </p>

          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx,.xls,.txt"
            onChange={handleFile}
            style={{ display: 'none' }}
          />
          <button onClick={() => fileRef.current?.click()} style={{
            padding: '14px 32px', borderRadius: 8, fontSize: 14, fontWeight: 600,
            background: `linear-gradient(135deg, ${theme.color}, ${SEMANTIC.success})`,
            color: 'white', cursor: 'pointer', border: 'none',
            boxShadow: `0 4px 16px ${theme.color}40`,
          }}>
            <Upload size={16} style={{ marginRight: 8, verticalAlign: -2 }} />
            Choisir un fichier
          </button>

          <div style={{
            marginTop: 20, padding: 14, borderRadius: 12,
            background: BASE.bgSurface, textAlign: 'left',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: BASE.text, marginBottom: 6 }}>
              Format attendu :
            </div>
            <code style={{ fontSize: 10, color: BASE.textMuted, lineHeight: 1.8, display: 'block' }}>
              sku;nom<br />
              TSH-NH-01;T-shirt Noir Homme<br />
              CAB-XLR-10;Câble XLR 10m
            </code>
          </div>
        </div>
      ) : result ? (
        /* Step 3: Result */
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <Check size={48} color={SEMANTIC.success} style={{ marginBottom: 12 }} />
          <div style={{ fontSize: 16, fontWeight: 600, color: BASE.text, marginBottom: 8 }}>
            Mise à jour terminée
          </div>
          <div style={{ fontSize: 14, color: SEMANTIC.success, fontWeight: 700 }}>
            {result.updated} article{result.updated > 1 ? 's' : ''} passé{result.updated > 1 ? 's' : ''} en "{statusConf?.label}"
          </div>
          {result.notFound?.length > 0 && (
            <div style={{ fontSize: 12, color: SEMANTIC.warning, marginTop: 8 }}>
              {result.notFound.length} SKU non trouvé{result.notFound.length > 1 ? 's' : ''}
            </div>
          )}
          <button onClick={onClose} className="btn-primary" style={{ marginTop: 20, maxWidth: 200 }}>
            Fermer
          </button>
        </div>
      ) : (
        /* Step 2: Column mapping + status selection + preview */
        <div>
          {/* Target status */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: BASE.text, marginBottom: 8 }}>
              Nouveau statut à appliquer
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setTargetStatus(opt.id)}
                  style={{
                    padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                    background: targetStatus === opt.id ? opt.color : BASE.bgSurface,
                    color: targetStatus === opt.id ? 'white' : BASE.textSoft,
                    border: `1.5px solid ${targetStatus === opt.id ? opt.color : BASE.border}`,
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {statusConf && (
              <div style={{ fontSize: 11, color: BASE.textMuted, marginTop: 6 }}>
                {statusConf.description}
              </div>
            )}
          </div>

          {/* Column mapping */}
          <div style={{
            padding: 14, borderRadius: 12, marginBottom: 16,
            background: BASE.bgSurface, border: `1px solid ${BASE.border}`,
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: BASE.text, marginBottom: 10 }}>
              Correspondance colonnes
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: BASE.textMuted, width: 100, flexShrink: 0 }}>
                  SKU / Réf.
                </span>
                <select
                  className="input"
                  style={{ flex: 1, padding: '6px 8px', fontSize: 12 }}
                  value={skuColumn}
                  onChange={e => setSkuColumn(e.target.value)}
                >
                  <option value="">— ignorer —</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: BASE.textMuted, width: 100, flexShrink: 0 }}>
                  Nom article
                </span>
                <select
                  className="input"
                  style={{ flex: 1, padding: '6px 8px', fontSize: 12 }}
                  value={nameColumn}
                  onChange={e => setNameColumn(e.target.value)}
                >
                  <option value="">— ignorer —</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            </div>
            {!skuColumn && !nameColumn && (
              <div style={{ fontSize: 11, color: SEMANTIC.warning, marginTop: 8, fontWeight: 600 }}>
                Sélectionne au moins une colonne (SKU ou Nom) pour identifier les articles
              </div>
            )}
          </div>

          {/* Match summary */}
          {(skuColumn || nameColumn) && (
            <div style={{
              display: 'flex', gap: 10, marginBottom: 16,
            }}>
              <div style={{
                flex: 1, padding: 12, borderRadius: 10, textAlign: 'center',
                background: `${SEMANTIC.success}10`, border: `1px solid ${SEMANTIC.success}30`,
              }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: SEMANTIC.success }}>{matchedCount}</div>
                <div style={{ fontSize: 10, color: SEMANTIC.success, fontWeight: 600 }}>Trouvés</div>
              </div>
              <div style={{
                flex: 1, padding: 12, borderRadius: 10, textAlign: 'center',
                background: `${SEMANTIC.warning}10`, border: `1px solid ${SEMANTIC.warning}30`,
              }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: SEMANTIC.warning }}>{unmatchedCount}</div>
                <div style={{ fontSize: 10, color: SEMANTIC.warning, fontWeight: 600 }}>Non trouvés</div>
              </div>
              <div style={{
                flex: 1, padding: 12, borderRadius: 10, textAlign: 'center',
                background: `${BASE.textMuted}10`, border: `1px solid ${BASE.border}`,
              }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: BASE.text }}>{rows.length}</div>
                <div style={{ fontSize: 10, color: BASE.textMuted, fontWeight: 600 }}>Total lignes</div>
              </div>
            </div>
          )}

          {/* Preview matched */}
          {matchedCount > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: BASE.textMuted, marginBottom: 6 }}>
                Aperçu ({Math.min(matchedCount, 10)} premiers articles trouvés)
              </div>
              <div style={{
                maxHeight: 200, overflowY: 'auto', borderRadius: 10,
                border: `1px solid ${BASE.border}`,
              }}>
                {matched.filter(m => m.match).slice(0, 10).map((m, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 12px', fontSize: 12,
                    borderBottom: `1px solid ${BASE.border}`,
                    background: i % 2 === 0 ? 'white' : BASE.bgSurface,
                  }}>
                    <Check size={14} color={SEMANTIC.success} />
                    <span style={{ fontWeight: 600, color: BASE.text, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.match.name}
                    </span>
                    <span style={{ fontSize: 10, color: BASE.textMuted, flexShrink: 0 }}>
                      {m.match.sku}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Unmatched preview */}
          {unmatchedCount > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: SEMANTIC.warning, marginBottom: 6 }}>
                Non trouvés ({Math.min(unmatchedCount, 5)} premiers)
              </div>
              <div style={{
                maxHeight: 120, overflowY: 'auto', borderRadius: 10,
                border: `1px solid ${SEMANTIC.warning}30`, background: `${SEMANTIC.warning}05`,
              }}>
                {matched.filter(m => !m.match).slice(0, 5).map((m, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 12px', fontSize: 12,
                    borderBottom: `1px solid ${SEMANTIC.warning}15`,
                  }}>
                    <AlertTriangle size={14} color={SEMANTIC.warning} />
                    <span style={{ color: BASE.textSoft }}>
                      {m.skuVal || m.nameVal || '(vide)'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action button */}
          <button
            onClick={handleImport}
            disabled={importing || matchedCount === 0}
            className="btn-primary"
            style={{
              background: matchedCount > 0 ? statusConf?.color : BASE.bgActive,
              opacity: importing || matchedCount === 0 ? 0.5 : 1,
              width: '100%',
            }}
          >
            {importing
              ? 'Mise à jour en cours...'
              : matchedCount > 0
                ? `Passer ${matchedCount} article${matchedCount > 1 ? 's' : ''} en "${statusConf?.label}"`
                : 'Aucun article à modifier'
            }
          </button>
        </div>
      )}
    </Modal>
  )
}

