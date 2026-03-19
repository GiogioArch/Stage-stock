import React, { useEffect } from 'react'
import { Shirt, Guitar, Battery, ArrowDownToLine, ArrowUpFromLine, RefreshCw, X, Package, AlertTriangle, CheckCircle, Info, ChevronLeft } from 'lucide-react'

// ─── Date helper: parse "2026-03-20" as local date (not UTC) ───
export function parseDate(d) {
  if (!d) return new Date()
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
    const [y, m, day] = d.split('-').map(Number)
    return new Date(y, m - 1, day)
  }
  return new Date(d)
}

// ─── Bottom Sheet Modal ───
export function Modal({ onClose, title, children }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        {title && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, color: '#1E293B' }}>{title}</h3>
            <button onClick={onClose} aria-label="Fermer" style={{ color: '#94A3B8', padding: 4, display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer' }}>
              <X size={20} />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

// ─── Confirm Dialog ───
export function Confirm({ message, detail, onConfirm, onCancel, confirmLabel = 'Confirmer', confirmColor = '#5B8DB8' }) {
  return (
    <div className="confirm-dialog">
      <div className="confirm-box">
        <div style={{ fontSize: 15, fontWeight: 600, color: '#1E293B', marginBottom: 8 }}>{message}</div>
        {detail && <div style={{ fontSize: 13, color: '#94A3B8', marginBottom: 20, lineHeight: 1.5 }}>{detail}</div>}
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-secondary" style={{ flex: 1 }} onClick={onCancel}>Annuler</button>
          <button className="btn-primary" style={{ flex: 1, background: confirmColor }} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}

// ─── Toast ───
export function Toast({ message, color = '#5DAB8B', onDone }) {
  useEffect(() => {
    const t = setTimeout(() => onDone?.(), 2500)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div className="toast" style={{ background: color }}>
      {message}
    </div>
  )
}

// ─── Category helpers ───
export const CATEGORIES = [
  { id: 'merch', name: 'Merchandising', icon: Shirt, color: '#D4648A', bg: 'rgba(212,100,138,0.08)' },
  { id: 'materiel', name: 'Matériel', icon: Guitar, color: '#5B8DB8', bg: 'rgba(91,141,184,0.08)' },
  { id: 'consommables', name: 'Consommables', icon: Battery, color: '#5DAB8B', bg: 'rgba(93,171,139,0.08)' },
]

export function getCat(id) {
  return CATEGORIES.find(c => c.id === id) || CATEGORIES[0]
}

export function Badge({ color, children }) {
  return (
    <span className="badge" style={{ background: `${color}15`, color, border: `1px solid ${color}20`, borderRadius: 6 }}>
      {children}
    </span>
  )
}

// ─── Format date ───
export function fmtDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

// ─── Movement config ───
export function getMoveConf(type) {
  const conf = {
    in: { icon: ArrowDownToLine, color: '#5DAB8B', label: 'Entrée', bg: 'rgba(93,171,139,0.08)' },
    out: { icon: ArrowUpFromLine, color: '#D4648A', label: 'Sortie', bg: 'rgba(212,100,138,0.08)' },
    transfer: { icon: RefreshCw, color: '#5B8DB8', label: 'Transfert', bg: 'rgba(91,141,184,0.08)' },
  }
  return conf[type] || conf.in
}

// ─── Integer only input handler ───
export function intOnly(value) {
  return value.replace(/[^0-9]/g, '')
}
