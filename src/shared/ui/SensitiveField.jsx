import React, { useState, createElement } from 'react'
import { Eye, EyeOff } from 'lucide-react'

/**
 * SensitiveField — Input avec toggle afficher/masquer (IBAN, SS, etc.)
 */
export function SensitiveField({ label, value, onChange }) {
  const [visible, setVisible] = useState(false)
  return (
    <div style={{ marginBottom: 12 }}>
      <label className="label">{label}</label>
      <div style={{ position: 'relative' }}>
        <input className="input" type={visible ? 'text' : 'password'} value={value || ''} onChange={e => onChange(e.target.value)}
          style={{ background: '#FFFDF5', paddingRight: 36 }}
        />
        <button onClick={() => setVisible(!visible)} aria-label={visible ? 'Masquer' : 'Afficher'} type="button" style={{
          position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
          background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#94A3B8',
        }}>{createElement(visible ? EyeOff : Eye, { size: 16 })}</button>
      </div>
    </div>
  )
}

/**
 * SensitiveRow — Ligne lecture seule avec donnée masquée + toggle
 */
export function SensitiveRow({ label, value, masked, show, onToggle }) {
  if (!value) return null
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', background: '#FFFDF5', borderRadius: 8, margin: '2px -4px', paddingLeft: 4, paddingRight: 4 }}>
      <span style={{ fontSize: 12, color: '#94A3B8', fontWeight: 600 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 13, color: '#1E293B', fontWeight: 700, fontFamily: 'monospace' }}>
          {show ? value : masked}
        </span>
        <button onClick={onToggle} aria-label={show ? 'Masquer' : 'Afficher'} style={{
          background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: 2,
        }}>{show ? createElement(EyeOff, { size: 14 }) : createElement(Eye, { size: 14 })}</button>
      </div>
    </div>
  )
}
