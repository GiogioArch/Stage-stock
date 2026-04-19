import React from 'react'
import { LEGAL_FORM_LABELS, Field, FieldSelect, ReadCard, ReadRow, Divider, SaveBar, SocialRow } from './ProfileHelpers'

export default function IdentityTab({ form, details, editing, isPhysical, set, onSave, onEdit, onCancel, saving }) {
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
              <ReadRow label="Pr\u00e9nom" value={details.first_name} />
              <ReadRow label="Nom" value={details.last_name} />
              <ReadRow label="Nom de sc\u00e8ne" value={details.stage_name} />
              <ReadRow label="Date de naissance" value={details.birth_date} />
              <ReadRow label="Nationalit\u00e9" value={details.nationality} />
            </>
          ) : (
            <>
              <ReadRow label="Raison sociale" value={details.company_name} />
              <ReadRow label="Forme juridique" value={LEGAL_FORM_LABELS[details.legal_form] || details.legal_form} />
              <ReadRow label="Repr\u00e9sentant l\u00e9gal" value={details.representative_name} />
              <ReadRow label="Fonction" value={details.representative_role} />
              <ReadRow label="Date de cr\u00e9ation" value={details.company_creation_date} />
              <ReadRow label="Capital social" value={details.capital} />
            </>
          )}
          <Divider />
          <ReadRow label="T\u00e9l\u00e9phone" value={details.phone} />
          {details.phone_secondary && <ReadRow label="T\u00e9l. secondaire" value={details.phone_secondary} />}
          <ReadRow label="Adresse" value={[details.address_street, details.address_postal_code, details.address_city, details.address_country].filter(Boolean).join(', ')} />
          <ReadRow label="Site web" value={details.website} />
          {details.bio && <ReadRow label="Bio" value={details.bio} />}
          <SocialRow instagram={details.social_instagram} facebook={details.social_facebook} linkedin={details.social_linkedin} />
        </ReadCard>
      </div>
    )
  }

  return (
    <div>
      {/* Account type switch */}
      <div className="card" style={{ padding: 14, marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#1E293B', marginBottom: 8 }}>Type de compte</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { val: 'physical', label: 'Personne physique', color: '#7C3AED' },
            { val: 'legal', label: 'Personne morale', color: '#2563EB' },
          ].map(o => (
            <button key={o.val} onClick={() => set('account_type', o.val)} style={{
              flex: 1, padding: '10px 8px', borderRadius: 12, fontSize: 12, fontWeight: 700,
              cursor: 'pointer', textAlign: 'center',
              background: form.account_type === o.val ? `${o.color}15` : 'white',
              color: form.account_type === o.val ? o.color : '#94A3B8',
              border: `1px solid ${form.account_type === o.val ? o.color + '50' : '#E2E8F0'}`,
            }}>{o.label}</button>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 16 }}>
        {isPhysical ? (
          <>
            <Field label="Pr\u00e9nom" value={form.first_name} onChange={v => set('first_name', v)} />
            <Field label="Nom" value={form.last_name} onChange={v => set('last_name', v)} />
            <Field label="Nom de sc\u00e8ne" value={form.stage_name} onChange={v => set('stage_name', v)} placeholder="Optionnel" />
            <Field label="Date de naissance" value={form.birth_date} onChange={v => set('birth_date', v)} type="date" />
            <Field label="Nationalit\u00e9" value={form.nationality} onChange={v => set('nationality', v)} />
          </>
        ) : (
          <>
            <Field label="Raison sociale" value={form.company_name} onChange={v => set('company_name', v)} />
            <FieldSelect label="Forme juridique" value={form.legal_form} onChange={v => set('legal_form', v)} options={LEGAL_FORM_LABELS} />
            <Field label="Repr\u00e9sentant l\u00e9gal" value={form.representative_name} onChange={v => set('representative_name', v)} />
            <Field label="Fonction du repr\u00e9sentant" value={form.representative_role} onChange={v => set('representative_role', v)} />
            <Field label="Date de cr\u00e9ation" value={form.company_creation_date} onChange={v => set('company_creation_date', v)} type="date" />
            <Field label="Capital social" value={form.capital} onChange={v => set('capital', v)} placeholder="ex: 1 000 \u20ac" />
          </>
        )}

        <Divider />
        <Field label="T\u00e9l\u00e9phone" value={form.phone} onChange={v => set('phone', v)} type="tel" />
        <Field label="T\u00e9l. secondaire" value={form.phone_secondary} onChange={v => set('phone_secondary', v)} type="tel" placeholder="Optionnel" />
        <Field label="Rue" value={form.address_street} onChange={v => set('address_street', v)} />
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: '0 0 100px' }}>
            <Field label="Code postal" value={form.address_postal_code} onChange={v => set('address_postal_code', v.replace(/[^0-9]/g, ''))} />
          </div>
          <div style={{ flex: 1 }}>
            <Field label="Ville" value={form.address_city} onChange={v => set('address_city', v)} />
          </div>
        </div>
        <Field label="Pays" value={form.address_country} onChange={v => set('address_country', v)} />
        <Field label="Site web" value={form.website} onChange={v => set('website', v)} placeholder="https://..." />
        {isPhysical && <Field label="Bio" value={form.bio} onChange={v => set('bio', v)} multiline placeholder="Pr\u00e9sentation courte..." />}

        <Divider />
        <div style={{ fontSize: 12, fontWeight: 600, color: '#1E293B', marginBottom: 8 }}>R\u00e9seaux sociaux</div>
        <Field label="Instagram" value={form.social_instagram} onChange={v => set('social_instagram', v)} placeholder="@pseudo" />
        <Field label="Facebook" value={form.social_facebook} onChange={v => set('social_facebook', v)} />
        <Field label="LinkedIn" value={form.social_linkedin} onChange={v => set('social_linkedin', v)} />
      </div>

      <SaveBar onSave={onSave} onCancel={onCancel} saving={saving} hasId={!!details.id} />
    </div>
  )
}
