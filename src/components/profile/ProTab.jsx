import React from 'react'
import { ROLE_CONF } from '../RolePicker'
import {
  LEGAL_STATUS_LABELS, LEGAL_FORM_LABELS,
  maskIban, maskSS,
  Field, FieldSelect, ReadCard, ReadRow, SensitiveRow, SensitiveField, Divider, SaveBar,
} from './ProfileHelpers'

const SKILL_OPTIONS = Object.entries(ROLE_CONF).map(([code, conf]) => ({
  code,
  label: conf.label,
  // icon deliberately excluded — ROLE_CONF.icon is a Lucide component, not renderable as text
}))

export { SKILL_OPTIONS }

export default function ProTab({ form, details, editing, isPhysical, set, onSave, onEdit, onCancel, saving, showIban, setShowIban, showSS, setShowSS }) {
  if (!editing) {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <button onClick={onEdit} style={{
            padding: '7px 16px', borderRadius: 10, fontSize: 12, fontWeight: 600,
            background: '#7C3AED15', border: '1px solid #7C3AED30', color: '#7C3AED', cursor: 'pointer',
          }}>Modifier</button>
        </div>
        <ReadCard>
          {isPhysical ? (
            <>
              <ReadRow label="Statut juridique" value={LEGAL_STATUS_LABELS[details.legal_status] || details.legal_status} />
              <ReadRow label="SIRET" value={details.siret} />
              <ReadRow label="P\u00f4le Emploi Spectacle" value={details.pole_emploi_spectacle} />
              <SensitiveRow label="N\u00b0 S\u00e9curit\u00e9 sociale" value={details.social_security_number} masked={maskSS(details.social_security_number)} show={showSS} onToggle={() => setShowSS(!showSS)} />
            </>
          ) : (
            <>
              <ReadRow label="SIRET" value={details.siret} />
              <ReadRow label="SIREN" value={details.siren} />
              <ReadRow label="N\u00b0 TVA" value={details.tva_number} />
              <ReadRow label="Forme juridique" value={LEGAL_FORM_LABELS[details.legal_form] || details.legal_form} />
            </>
          )}
          <Divider />
          <SensitiveRow label="IBAN" value={details.iban} masked={maskIban(details.iban)} show={showIban} onToggle={() => setShowIban(!showIban)} />
          <ReadRow label="BIC" value={details.bic} />
        </ReadCard>

        {isPhysical && details.skills && details.skills.length > 0 && (
          <div className="card" style={{ padding: 14, marginTop: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#1E293B', marginBottom: 8 }}>Comp\u00e9tences</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {details.skills.map(s => {
                const opt = SKILL_OPTIONS.find(o => o.code === s)
                return (
                  <span key={s} style={{
                    padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                    background: '#7C3AED15', color: '#7C3AED',
                  }}>{opt ? opt.label : s}</span>
                )
              })}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="card" style={{ padding: 16 }}>
        {isPhysical ? (
          <>
            <FieldSelect label="Statut juridique" value={form.legal_status} onChange={v => set('legal_status', v)} options={LEGAL_STATUS_LABELS} />
            <Field label="SIRET (14 chiffres)" value={form.siret} onChange={v => set('siret', v.replace(/[^0-9]/g, '').slice(0, 14))} inputMode="numeric" />
            <Field label="N\u00b0 P\u00f4le Emploi Spectacle / Audiens" value={form.pole_emploi_spectacle} onChange={v => set('pole_emploi_spectacle', v)} />
            <SensitiveField label="N\u00b0 S\u00e9curit\u00e9 sociale" value={form.social_security_number} onChange={v => set('social_security_number', v)} />
          </>
        ) : (
          <>
            <Field label="SIRET (14 chiffres)" value={form.siret} onChange={v => set('siret', v.replace(/[^0-9]/g, '').slice(0, 14))} inputMode="numeric" />
            <ReadRow label="SIREN (auto)" value={(form.siret || '').replace(/[^0-9]/g, '').slice(0, 9) || '\u2014'} />
            <Field label="N\u00b0 TVA intracommunautaire" value={form.tva_number} onChange={v => set('tva_number', v)} />
          </>
        )}
        <Divider />
        <SensitiveField label="IBAN" value={form.iban} onChange={v => set('iban', v)} />
        <Field label="BIC" value={form.bic} onChange={v => set('bic', v)} />
      </div>

      {isPhysical && (
        <div className="card" style={{ padding: 16, marginTop: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#1E293B', marginBottom: 10 }}>Comp\u00e9tences</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            {SKILL_OPTIONS.map(opt => {
              const selected = (form.skills || []).includes(opt.code)
              return (
                <button key={opt.code} onClick={() => {
                  const cur = form.skills || []
                  set('skills', selected ? cur.filter(s => s !== opt.code) : [...cur, opt.code])
                }} style={{
                  padding: '6px 12px', borderRadius: 10, fontSize: 11, fontWeight: 700,
                  cursor: 'pointer',
                  background: selected ? '#7C3AED' : 'white',
                  color: selected ? 'white' : '#94A3B8',
                  border: `1px solid ${selected ? '#7C3AED' : '#E2E8F0'}`,
                }}>{opt.label}</button>
              )
            })}
          </div>
          <Field label="Autres comp\u00e9tences" value={form.availability_notes} onChange={v => set('availability_notes', v)} placeholder="Comp\u00e9tences additionnelles..." />
        </div>
      )}

      <SaveBar onSave={onSave} onCancel={onCancel} saving={saving} hasId={!!details.id} />
    </div>
  )
}
