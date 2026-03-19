import React from 'react'

/**
 * Field — Input de formulaire réutilisable
 * Supporte: text, date, tel, textarea (multiline), select
 */
export function Field({ label, value, onChange, type = 'text', placeholder, multiline, inputMode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label className="label">{label}</label>
      {multiline ? (
        <textarea className="input" value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3} style={{ resize: 'vertical' }} />
      ) : (
        <input className="input" type={type} inputMode={inputMode} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
      )}
    </div>
  )
}

/**
 * FieldSelect — Select de formulaire avec options {key: label}
 */
export function FieldSelect({ label, value, onChange, options }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label className="label">{label}</label>
      <select className="input" value={value || ''} onChange={e => onChange(e.target.value || null)}>
        <option value="">— Choisir —</option>
        {Object.entries(options).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
    </div>
  )
}
