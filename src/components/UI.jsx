import React, { useEffect } from 'react'

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
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#3D3042' }}>{title}</h3>
            <button onClick={onClose} style={{ fontSize: 22, color: '#B8A0AE', padding: 4 }}>✕</button>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

// ─── Confirm Dialog ───
export function Confirm({ message, detail, onConfirm, onCancel, confirmLabel = 'Confirmer', confirmColor = '#E8735A' }) {
  return (
    <div className="confirm-dialog">
      <div className="confirm-box">
        <div style={{ fontSize: 15, fontWeight: 800, color: '#3D3042', marginBottom: 8 }}>{message}</div>
        {detail && <div style={{ fontSize: 13, color: '#9A8B94', marginBottom: 20, lineHeight: 1.5 }}>{detail}</div>}
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
    const t = setTimeout(onDone, 2500)
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
  { id: 'merch', name: 'Merchandising', icon: '👕', color: '#D4648A', bg: '#FDF0F4' },
  { id: 'materiel', name: 'Matériel', icon: '🎸', color: '#5B8DB8', bg: '#EEF4FA' },
  { id: 'consommables', name: 'Consommables', icon: '🔋', color: '#5DAB8B', bg: '#EDF7F2' },
]

export function getCat(id) {
  return CATEGORIES.find(c => c.id === id) || CATEGORIES[0]
}

export function Badge({ color, children }) {
  return (
    <span className="badge" style={{ background: `${color}15`, color, border: `1px solid ${color}20` }}>
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
    in: { icon: '📥', color: '#5DAB8B', label: 'Entrée', bg: '#EDF7F2' },
    out: { icon: '📤', color: '#D4648A', label: 'Sortie', bg: '#FDF0F4' },
    transfer: { icon: '🔄', color: '#5B8DB8', label: 'Transfert', bg: '#EEF4FA' },
  }
  return conf[type] || conf.in
}

// ─── Integer only input handler ───
export function intOnly(value) {
  return value.replace(/[^0-9]/g, '')
}
