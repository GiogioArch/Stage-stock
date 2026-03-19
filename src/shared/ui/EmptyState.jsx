import React from 'react'

/**
 * EmptyState — État vide avec emoji, titre et sous-titre
 */
export function EmptyState({ icon, title, subtitle }) {
  return (
    <div className="card" style={{ padding: '32px 20px', textAlign: 'center' }}>
      {icon && <div style={{ fontSize: 48, marginBottom: 12 }}>{icon}</div>}
      <div style={{ fontSize: 14, fontWeight: 600, color: '#1E293B' }}>{title}</div>
      {subtitle && <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>{subtitle}</div>}
    </div>
  )
}
