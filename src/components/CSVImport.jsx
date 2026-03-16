import React, { useState, useRef } from 'react'
import { db } from '../lib/supabase'
import { Modal } from './UI'

export default function CSVImport({ families, subfamilies, orgId, onDone, onClose, onToast }) {
  const [rows, setRows] = useState([])
  const [headers, setHeaders] = useState([])
  const [mapping, setMapping] = useState({})
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)
  const fileRef = useRef()

  const FIELDS = [
    { key: 'name', label: 'Nom *', required: true },
    { key: 'sku', label: 'SKU' },
    { key: 'category', label: 'Catégorie (merch/materiel/consommables)' },
    { key: 'family_id', label: 'Famille' },
    { key: 'subfamily_id', label: 'Sous-famille' },
    { key: 'unit', label: 'Unité' },
    { key: 'min_stock', label: 'Stock minimum' },
    { key: 'cost_ht', label: 'Coût HT' },
    { key: 'image', label: 'Emoji / image' },
  ]

  const parseCSV = (text) => {
    const lines = text.split(/\r?\n/).filter(l => l.trim())
    if (lines.length < 2) return { headers: [], rows: [] }

    // Detect separator
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

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      const { headers: hdrs, rows: data } = parseCSV(ev.target.result)
      setHeaders(hdrs)
      setRows(data)

      // Auto-map headers
      const autoMap = {}
      FIELDS.forEach(f => {
        const match = hdrs.find(h =>
          h.toLowerCase().replace(/[_\s-]/g, '') === f.key.replace(/_/g, '') ||
          h.toLowerCase().includes(f.key.replace(/_/g, ' ').split(' ')[0])
        )
        if (match) autoMap[f.key] = match
      })
      setMapping(autoMap)
    }
    reader.readAsText(file)
  }

  const resolveFamilyId = (val) => {
    if (!val) return null
    const fam = families.find(f =>
      f.name?.toLowerCase() === val.toLowerCase() ||
      f.code?.toLowerCase() === val.toLowerCase()
    )
    return fam?.id || null
  }

  const resolveSubfamilyId = (val) => {
    if (!val) return null
    const sf = subfamilies.find(s =>
      s.name?.toLowerCase() === val.toLowerCase() ||
      s.code?.toLowerCase() === val.toLowerCase()
    )
    return sf?.id || null
  }

  const handleImport = async () => {
    if (!mapping.name) {
      onToast('Mappe au moins le champ "Nom"', '#EF4444')
      return
    }
    setImporting(true)
    let success = 0
    let errors = 0

    for (const row of rows) {
      try {
        const product = { org_id: orgId }

        FIELDS.forEach(f => {
          const col = mapping[f.key]
          if (!col) return
          let val = row[col]
          if (!val) return

          switch (f.key) {
            case 'min_stock':
              product.min_stock = parseInt(val) || 5
              break
            case 'cost_ht':
              product.cost_ht = parseFloat(val.replace(',', '.')) || null
              break
            case 'family_id':
              product.family_id = resolveFamilyId(val)
              break
            case 'subfamily_id':
              product.subfamily_id = resolveSubfamilyId(val)
              break
            case 'category':
              val = val.toLowerCase().trim()
              if (['merch', 'merchandising'].includes(val)) product.category = 'merch'
              else if (['mat', 'materiel', 'matériel'].includes(val)) product.category = 'materiel'
              else if (['conso', 'consommables', 'consommable'].includes(val)) product.category = 'consommables'
              else product.category = val
              break
            default:
              product[f.key] = val
          }
        })

        if (!product.name) { errors++; continue }

        await db.insert('products', product)
        success++
      } catch {
        errors++
      }
    }

    setResult({ success, errors })
    setImporting(false)
    if (success > 0) onDone()
  }

  return (
    <Modal title="Importer des produits (CSV)" onClose={onClose}>
      {!rows.length ? (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📄</div>
          <p style={{ fontSize: 13, color: '#71717A', marginBottom: 16, lineHeight: 1.5 }}>
            Importe un fichier CSV ou Excel (exporté en .csv).<br />
            Séparateurs supportés : virgule (,) ou point-virgule (;)
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.txt"
            onChange={handleFile}
            style={{ display: 'none' }}
          />
          <button onClick={() => fileRef.current?.click()} style={{
            padding: '14px 32px', borderRadius: 8, fontSize: 14, fontWeight: 600,
            background: 'linear-gradient(135deg, #3B82F6, #22C55E)',
            color: 'white', cursor: 'pointer', border: 'none',
            boxShadow: '0 4px 16px rgba(91,141,184,0.25)',
          }}>Choisir un fichier CSV</button>

          <div style={{ marginTop: 20, padding: '14px', borderRadius: 12, background: '#18181B', textAlign: 'left' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#FAFAFA', marginBottom: 6 }}>Format attendu :</div>
            <code style={{ fontSize: 10, color: '#71717A', lineHeight: 1.8, display: 'block' }}>
              name;sku;category;unit;min_stock;cost_ht<br />
              T-shirt Noir Homme;TSH-NH-01;merch;pièce;10;8.50<br />
              Câble XLR 10m;CAB-XLR-10;materiel;pièce;5;12.00
            </code>
          </div>
        </div>
      ) : result ? (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>{result.errors === 0 ? '' : ''}</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#FAFAFA', marginBottom: 8 }}>Import terminé</div>
          <div style={{ fontSize: 14, color: '#22C55E', fontWeight: 700 }}>{result.success} produit{result.success > 1 ? 's' : ''} importé{result.success > 1 ? 's' : ''}</div>
          {result.errors > 0 && (
            <div style={{ fontSize: 13, color: '#EF4444', fontWeight: 600, marginTop: 4 }}>{result.errors} erreur{result.errors > 1 ? 's' : ''}</div>
          )}
          <button onClick={onClose} className="btn-primary" style={{ marginTop: 20, maxWidth: 200 }}>Fermer</button>
        </div>
      ) : (
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#FAFAFA', marginBottom: 4 }}>
            {rows.length} ligne{rows.length > 1 ? 's' : ''} détectée{rows.length > 1 ? 's' : ''}
          </div>
          <div style={{ fontSize: 11, color: '#71717A', marginBottom: 16 }}>
            Colonnes : {headers.join(', ')}
          </div>

          {/* Field mapping */}
          <div style={{ fontSize: 12, fontWeight: 600, color: '#FAFAFA', marginBottom: 8 }}>
            Correspondance des colonnes
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {FIELDS.map(f => (
              <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#71717A', width: 120, flexShrink: 0 }}>
                  {f.label}
                </span>
                <select
                  className="input"
                  style={{ flex: 1, padding: '6px 8px', fontSize: 12 }}
                  value={mapping[f.key] || ''}
                  onChange={e => setMapping(prev => ({ ...prev, [f.key]: e.target.value }))}
                >
                  <option value="">— ignorer —</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            ))}
          </div>

          {/* Preview */}
          <div style={{ fontSize: 11, fontWeight: 700, color: '#71717A', marginBottom: 6 }}>Aperçu (3 premières lignes)</div>
          <div style={{ overflowX: 'auto', marginBottom: 16 }}>
            <table style={{ fontSize: 10, borderCollapse: 'collapse', width: '100%' }}>
              <thead>
                <tr>{headers.map(h => <th key={h} style={{ padding: '4px 6px', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#71717A', fontWeight: 700 }}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {rows.slice(0, 3).map((r, i) => (
                  <tr key={i}>{headers.map(h => <td key={h} style={{ padding: '4px 6px', borderBottom: '1px solid #18181B', color: '#FAFAFA' }}>{r[h]}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={handleImport}
            disabled={importing || !mapping.name}
            className="btn-primary"
            style={{ opacity: importing || !mapping.name ? 0.5 : 1 }}
          >
            {importing ? `Import en cours...` : `Importer ${rows.length} produit${rows.length > 1 ? 's' : ''}`}
          </button>
        </div>
      )}
    </Modal>
  )
}
