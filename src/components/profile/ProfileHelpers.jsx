import React from 'react'

// ─── Mask helpers ───
export function maskIban(v) {
  if (!v || v.length < 8) return v || ''
  return v.slice(0, 4) + ' •••• •••• •••• ' + v.slice(-4)
}
export function maskSS(v) {
  if (!v || v.length < 6) return v || ''
  return v.slice(0, 1) + ' ' + v.slice(1, 3) + ' •• •• ••• ••• ' + v.slice(-2)
}

// ─── Shared constants ───
export const LEGAL_STATUS_LABELS = {
  intermittent: 'Intermittent du spectacle',
  auto_entrepreneur: 'Auto-entrepreneur',
  salarie: 'Salarié',
  benevole: 'Bénévole',
  micro_entreprise: 'Micro-entreprise',
}

export const LEGAL_FORM_LABELS = {
  sarl: 'SARL',
  sas: 'SAS',
  sasu: 'SASU',
  association_1901: 'Association loi 1901',
  micro_entreprise: 'Micro-entreprise',
  eurl: 'EURL',
  ei: 'Entreprise individuelle',
}

// ─── Shared sub-components ───
export function Field({ label, value, onChange, type = 'text', placeholder, multiline, inputMode, error }) {
  const fieldId = label.toLowerCase().replace(/[^a-z0-9]/g, '-')
  const errorStyle = error ? { borderColor: '#DC2626' } : {}
  return (
    <div style={{ marginBottom: 12 }}>
      <label className="label" htmlFor={fieldId}>{label}</label>
      {multiline ? (
        <textarea id={fieldId} className="input" value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3} style={{ resize: 'vertical', ...errorStyle }} />
      ) : (
        <input id={fieldId} className="input" type={type} inputMode={inputMode} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={errorStyle} />
      )}
      {error && <div style={{ fontSize: 11, color: '#DC2626', fontWeight: 600, marginTop: 3 }}>{error}</div>}
    </div>
  )
}

export function FieldSelect({ label, value, onChange, options }) {
  const fieldId = label.toLowerCase().replace(/[^a-z0-9]/g, '-')
  return (
    <div style={{ marginBottom: 12 }}>
      <label className="label" htmlFor={fieldId}>{label}</label>
      <select id={fieldId} className="input" value={value || ''} onChange={e => onChange(e.target.value || null)}>
        <option value="">— Choisir —</option>
        {Object.entries(options).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
    </div>
  )
}

export function SensitiveField({ label, value, onChange }) {
  const fieldId = label.toLowerCase().replace(/[^a-z0-9]/g, '-')
  return (
    <div style={{ marginBottom: 12 }}>
      <label className="label" htmlFor={fieldId}>{label}</label>
      <input id={fieldId} className="input" type="text" value={value || ''} onChange={e => onChange(e.target.value)}
        style={{ background: '#FFFDF5' }}
      />
    </div>
  )
}

export function ReadCard({ children }) {
  return <div className="card" style={{ padding: 16 }}>{children}</div>
}

export function ReadRow({ label, value }) {
  if (!value) return null
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '6px 0', gap: 12 }}>
      <span style={{ fontSize: 12, color: '#94A3B8', fontWeight: 600, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, color: '#1E293B', fontWeight: 700, textAlign: 'right', wordBreak: 'break-word' }}>{value}</span>
    </div>
  )
}

export function SensitiveRow({ label, value, masked, show, onToggle }) {
  if (!value) return null
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', background: '#FFFDF5', borderRadius: 8, margin: '2px -4px', paddingLeft: 4, paddingRight: 4 }}>
      <span style={{ fontSize: 12, color: '#94A3B8', fontWeight: 600 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 13, color: '#1E293B', fontWeight: 700, fontFamily: 'monospace' }}>
          {show ? value : masked}
        </span>
        <button onClick={onToggle} style={{
          background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: 2,
        }}>{show ? '\u{1F512}' : '\u{1F441}\uFE0F'}</button>
      </div>
    </div>
  )
}

function SocialBadge({ label, value, color }) {
  return (
    <span style={{
      padding: '3px 10px', borderRadius: 8, fontSize: 10, fontWeight: 700,
      background: `${color}12`, color, cursor: 'default',
    }}>{label}: {value}</span>
  )
}

export function SocialRow({ instagram, facebook, linkedin }) {
  if (!instagram && !facebook && !linkedin) return null
  return (
    <div style={{ display: 'flex', gap: 8, paddingTop: 8 }}>
      {instagram && <SocialBadge label="Instagram" value={instagram} color="#E1306C" />}
      {facebook && <SocialBadge label="Facebook" value={facebook} color="#1877F2" />}
      {linkedin && <SocialBadge label="LinkedIn" value={linkedin} color="#0A66C2" />}
    </div>
  )
}

export function Divider() {
  return <div style={{ height: 1, background: '#E2E8F0', margin: '12px 0' }} />
}

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
