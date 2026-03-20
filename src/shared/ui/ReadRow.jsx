import React from 'react'

/**
 * ReadCard — Carte de lecture seule (wrapper)
 */
export function ReadCard({ children }) {
  return <div className="card" style={{ padding: 16 }}>{children}</div>
}

/**
 * ReadRow — Ligne label: valeur pour affichage lecture seule
 */
export function ReadRow({ label, value }) {
  if (!value) return null
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '6px 0', gap: 12 }}>
      <span style={{ fontSize: 12, color: '#94A3B8', fontWeight: 600, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, color: '#1E293B', fontWeight: 700, textAlign: 'right', wordBreak: 'break-word' }}>{value}</span>
    </div>
  )
}
