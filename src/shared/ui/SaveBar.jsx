import React from 'react'

/**
 * SaveBar — Barre Annuler / Enregistrer pour formulaires
 */
export function SaveBar({ onSave, onCancel, saving, hasId }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
      {hasId && (
        <button onClick={onCancel} style={{
          flex: 1, padding: 14, borderRadius: 8, fontSize: 13, fontWeight: 700,
          background: '#F1F5F9', border: '1px solid #E2E8F0', color: '#94A3B8', cursor: 'pointer',
        }}>Annuler</button>
      )}
      <button className="btn-primary" onClick={onSave} disabled={saving} style={{ flex: 2 }}>
        {saving ? 'Enregistrement...' : 'Enregistrer'}
      </button>
    </div>
  )
}
