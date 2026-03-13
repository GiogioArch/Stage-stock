import React, { useState, useCallback } from 'react'
import { db, safe } from '../lib/supabase'
import { ROLE_CONF } from './RolePicker'

const LEGAL_STATUS_LABELS = {
  intermittent: 'Intermittent du spectacle',
  auto_entrepreneur: 'Auto-entrepreneur',
  salarie: 'Salarié',
  benevole: 'Bénévole',
  micro_entreprise: 'Micro-entreprise',
}

const LEGAL_FORM_LABELS = {
  sarl: 'SARL',
  sas: 'SAS',
  sasu: 'SASU',
  association_1901: 'Association loi 1901',
  micro_entreprise: 'Micro-entreprise',
  eurl: 'EURL',
  ei: 'Entreprise individuelle',
}

const SKILL_OPTIONS = Object.entries(ROLE_CONF).map(([code, conf]) => ({
  code,
  label: conf.label,
  icon: conf.icon,
}))

const TABS = [
  { id: 'identity', label: 'Identité', icon: '👤' },
  { id: 'pro', label: 'Pro', icon: '💼' },
  { id: 'projects', label: 'Projets', icon: '🎪' },
  { id: 'gear', label: 'Matériel', icon: '📦' },
  { id: 'calendar', label: 'Calendrier', icon: '📅' },
  { id: 'finances', label: 'Finances', icon: '💰' },
]

// ─── Mask helpers ───
function maskIban(v) {
  if (!v || v.length < 8) return v || ''
  return v.slice(0, 4) + ' •••• •••• •••• ' + v.slice(-4)
}
function maskSS(v) {
  if (!v || v.length < 6) return v || ''
  return v.slice(0, 1) + ' ' + v.slice(1, 3) + ' •• •• ••• ••• ' + v.slice(-2)
}

export default function ProfilePage({
  user, userProfile, userRole, userDetails: initialDetails,
  membership, selectedOrg, roles,
  onClose, onToast, onReload, onLogout, onSwitchProject,
}) {
  const [tab, setTab] = useState('identity')
  const [editing, setEditing] = useState(!initialDetails)
  const [details, setDetails] = useState(initialDetails || { account_type: 'physical' })
  const [form, setForm] = useState({ ...details })
  const [saving, setSaving] = useState(false)
  const [showIban, setShowIban] = useState(false)
  const [showSS, setShowSS] = useState(false)

  const roleConf = userRole ? (ROLE_CONF[userRole.code] || { icon: '📋', color: '#9A8B94', label: userRole.name }) : null
  const isPhysical = (editing ? form.account_type : details.account_type) !== 'legal'

  const set = useCallback((key, val) => setForm(prev => ({ ...prev, [key]: val })), [])

  // ─── Save ───
  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = {
        ...form,
        user_id: user.id,
        siret: (form.siret || '').replace(/[^0-9]/g, ''),
        siren: isPhysical ? form.siren : (form.siret || '').replace(/[^0-9]/g, '').slice(0, 9),
        profile_completed: true,
        updated_at: new Date().toISOString(),
      }
      delete payload.id
      delete payload.created_at

      if (details.id) {
        await db.update('user_details', `id=eq.${details.id}`, payload)
      } else {
        await db.upsert('user_details', payload)
      }

      const [refreshed] = await safe('user_details', `user_id=eq.${user.id}`)
      if (refreshed) {
        setDetails(refreshed)
        setForm({ ...refreshed })
      }
      setEditing(false)
      onToast('Profil enregistré')
      if (onReload) onReload()
    } catch (e) {
      onToast('Erreur : ' + e.message, '#D4648A')
    } finally {
      setSaving(false)
    }
  }

  const startEdit = () => {
    setForm({ ...details })
    setEditing(true)
  }
  const cancelEdit = () => {
    if (details.id) {
      setForm({ ...details })
      setEditing(false)
    }
  }

  // inline = rendered as a tab (no fixed overlay)
  const inline = !selectedOrg && !membership

  // ─── Render ───
  return (
    <div style={inline ? {} : {
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'linear-gradient(180deg, #FFF8F0 0%, #FEF0E8 30%, #F8F0FA 70%, #F0F4FD 100%)',
      overflow: 'auto',
    }}>
      {/* Header — only show back button when overlay */}
      {!inline && (
        <header style={{
          padding: '16px 18px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <button onClick={onClose} style={{
            padding: '8px 14px', borderRadius: 12, fontSize: 13, fontWeight: 800,
            background: 'white', border: '1.5px solid #E8DED8', color: '#9A8B94', cursor: 'pointer',
          }}>← Retour</button>
          <div style={{ fontSize: 15, fontWeight: 900, color: '#9B7DC4' }}>Mon profil</div>
          <div style={{ width: 80 }} />
        </header>
      )}

      {/* Avatar + name banner */}
      <div style={{ textAlign: 'center', padding: '20px 16px 8px' }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%', margin: '0 auto 12px',
          background: details.avatar_url ? `url(${details.avatar_url}) center/cover` : (roleConf ? `${roleConf.color}15` : '#F0E8E4'),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 40, border: `3px solid ${roleConf?.color || '#E8DED8'}40`,
        }}>
          {!details.avatar_url && (roleConf?.icon || '👤')}
        </div>
        <div style={{ fontSize: 20, fontWeight: 900, color: '#3D3042' }}>
          {isPhysical
            ? [details.first_name, details.last_name].filter(Boolean).join(' ') || details.stage_name || membership?.display_name || user.email
            : details.company_name || membership?.display_name || user.email
          }
        </div>
        <div style={{
          display: 'inline-block', marginTop: 6, padding: '3px 12px', borderRadius: 8,
          background: isPhysical ? '#9B7DC415' : '#5B8DB815',
          color: isPhysical ? '#9B7DC4' : '#5B8DB8',
          fontSize: 11, fontWeight: 800,
        }}>
          {isPhysical ? 'Personne physique' : 'Personne morale'}
        </div>
        <div style={{ fontSize: 12, color: '#B8A0AE', marginTop: 4 }}>{user.email}</div>
      </div>

      {/* Tab pills */}
      <div style={{ display: 'flex', gap: 6, padding: '12px 16px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
            whiteSpace: 'nowrap', cursor: 'pointer', flexShrink: 0,
            background: tab === t.id ? '#9B7DC4' : 'white',
            color: tab === t.id ? 'white' : '#9A8B94',
            border: `1.5px solid ${tab === t.id ? '#9B7DC4' : '#E8DED8'}`,
          }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: '0 16px 120px' }}>
        {tab === 'identity' && (
          <IdentityTab
            form={form} details={details} editing={editing} isPhysical={isPhysical}
            set={set} onSave={handleSave} onEdit={startEdit} onCancel={cancelEdit} saving={saving}
          />
        )}
        {tab === 'pro' && (
          <ProTab
            form={form} details={details} editing={editing} isPhysical={isPhysical}
            set={set} onSave={handleSave} onEdit={startEdit} onCancel={cancelEdit} saving={saving}
            showIban={showIban} setShowIban={setShowIban}
            showSS={showSS} setShowSS={setShowSS}
          />
        )}
        {tab === 'projects' && (
          <ProjectsTab
            user={user} membership={membership} selectedOrg={selectedOrg} roles={roles}
            onSwitchProject={onSwitchProject}
          />
        )}
        {tab === 'gear' && <PlaceholderTab icon="📦" title="Mon matériel" desc="Inventaire personnel de ton matériel, instruments et équipements." />}
        {tab === 'calendar' && <PlaceholderTab icon="📅" title="Mon calendrier" desc="Tes dates de disponibilité, engagements et planning personnel." />}
        {tab === 'finances' && <PlaceholderTab icon="💰" title="Mes finances" desc="Suivi des cachets, factures, notes de frais et revenus." />}
      </div>

      {/* Bottom actions — only in overlay mode */}
      {!inline && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          padding: '12px 16px', display: 'flex', gap: 8,
          background: 'linear-gradient(180deg, transparent 0%, #FFF8F0 30%)',
          paddingTop: 24,
        }}>
          <button onClick={onSwitchProject} style={{
            flex: 1, padding: '12px 8px', borderRadius: 14, fontSize: 12, fontWeight: 700,
            background: '#EEF4FA', border: '1.5px solid #5B8DB830', color: '#5B8DB8', cursor: 'pointer',
          }}>🔄 Changer projet</button>
          <button onClick={() => { onClose(); onLogout() }} style={{
            flex: 1, padding: '12px 8px', borderRadius: 14, fontSize: 12, fontWeight: 700,
            background: '#FDF0F4', border: '1.5px solid #D4648A30', color: '#D4648A', cursor: 'pointer',
          }}>🚪 Déconnexion</button>
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════
// Section 1 — Identité
// ════════════════════════════════════════
function IdentityTab({ form, details, editing, isPhysical, set, onSave, onEdit, onCancel, saving }) {
  if (!editing) {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <button onClick={onEdit} style={{
            padding: '7px 16px', borderRadius: 10, fontSize: 12, fontWeight: 800,
            background: '#9B7DC415', border: '1.5px solid #9B7DC430', color: '#9B7DC4', cursor: 'pointer',
          }}>Modifier</button>
        </div>
        <ReadCard>
          {isPhysical ? (
            <>
              <ReadRow label="Prénom" value={details.first_name} />
              <ReadRow label="Nom" value={details.last_name} />
              <ReadRow label="Nom de scène" value={details.stage_name} />
              <ReadRow label="Date de naissance" value={details.birth_date} />
              <ReadRow label="Nationalité" value={details.nationality} />
            </>
          ) : (
            <>
              <ReadRow label="Raison sociale" value={details.company_name} />
              <ReadRow label="Forme juridique" value={LEGAL_FORM_LABELS[details.legal_form] || details.legal_form} />
              <ReadRow label="Représentant légal" value={details.representative_name} />
              <ReadRow label="Fonction" value={details.representative_role} />
              <ReadRow label="Date de création" value={details.company_creation_date} />
              <ReadRow label="Capital social" value={details.capital} />
            </>
          )}
          <Divider />
          <ReadRow label="Téléphone" value={details.phone} />
          {details.phone_secondary && <ReadRow label="Tél. secondaire" value={details.phone_secondary} />}
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
        <div style={{ fontSize: 12, fontWeight: 800, color: '#3D3042', marginBottom: 8 }}>Type de compte</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { val: 'physical', label: 'Personne physique', color: '#9B7DC4' },
            { val: 'legal', label: 'Personne morale', color: '#5B8DB8' },
          ].map(o => (
            <button key={o.val} onClick={() => set('account_type', o.val)} style={{
              flex: 1, padding: '10px 8px', borderRadius: 12, fontSize: 12, fontWeight: 700,
              cursor: 'pointer', textAlign: 'center',
              background: form.account_type === o.val ? `${o.color}15` : 'white',
              color: form.account_type === o.val ? o.color : '#9A8B94',
              border: `1.5px solid ${form.account_type === o.val ? o.color + '50' : '#E8DED8'}`,
            }}>{o.label}</button>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 16 }}>
        {isPhysical ? (
          <>
            <Field label="Prénom" value={form.first_name} onChange={v => set('first_name', v)} />
            <Field label="Nom" value={form.last_name} onChange={v => set('last_name', v)} />
            <Field label="Nom de scène" value={form.stage_name} onChange={v => set('stage_name', v)} placeholder="Optionnel" />
            <Field label="Date de naissance" value={form.birth_date} onChange={v => set('birth_date', v)} type="date" />
            <Field label="Nationalité" value={form.nationality} onChange={v => set('nationality', v)} />
          </>
        ) : (
          <>
            <Field label="Raison sociale" value={form.company_name} onChange={v => set('company_name', v)} />
            <FieldSelect label="Forme juridique" value={form.legal_form} onChange={v => set('legal_form', v)} options={LEGAL_FORM_LABELS} />
            <Field label="Représentant légal" value={form.representative_name} onChange={v => set('representative_name', v)} />
            <Field label="Fonction du représentant" value={form.representative_role} onChange={v => set('representative_role', v)} />
            <Field label="Date de création" value={form.company_creation_date} onChange={v => set('company_creation_date', v)} type="date" />
            <Field label="Capital social" value={form.capital} onChange={v => set('capital', v)} placeholder="ex: 1 000 €" />
          </>
        )}

        <Divider />
        <Field label="Téléphone" value={form.phone} onChange={v => set('phone', v)} type="tel" />
        <Field label="Tél. secondaire" value={form.phone_secondary} onChange={v => set('phone_secondary', v)} type="tel" placeholder="Optionnel" />
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
        {isPhysical && <Field label="Bio" value={form.bio} onChange={v => set('bio', v)} multiline placeholder="Présentation courte..." />}

        <Divider />
        <div style={{ fontSize: 12, fontWeight: 800, color: '#3D3042', marginBottom: 8 }}>Réseaux sociaux</div>
        <Field label="Instagram" value={form.social_instagram} onChange={v => set('social_instagram', v)} placeholder="@pseudo" />
        <Field label="Facebook" value={form.social_facebook} onChange={v => set('social_facebook', v)} />
        <Field label="LinkedIn" value={form.social_linkedin} onChange={v => set('social_linkedin', v)} />
      </div>

      <SaveBar onSave={onSave} onCancel={onCancel} saving={saving} hasId={!!details.id} />
    </div>
  )
}

// ════════════════════════════════════════
// Section 2 — Professionnel
// ════════════════════════════════════════
function ProTab({ form, details, editing, isPhysical, set, onSave, onEdit, onCancel, saving, showIban, setShowIban, showSS, setShowSS }) {
  if (!editing) {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <button onClick={onEdit} style={{
            padding: '7px 16px', borderRadius: 10, fontSize: 12, fontWeight: 800,
            background: '#9B7DC415', border: '1.5px solid #9B7DC430', color: '#9B7DC4', cursor: 'pointer',
          }}>Modifier</button>
        </div>
        <ReadCard>
          {isPhysical ? (
            <>
              <ReadRow label="Statut juridique" value={LEGAL_STATUS_LABELS[details.legal_status] || details.legal_status} />
              <ReadRow label="SIRET" value={details.siret} />
              <ReadRow label="Pôle Emploi Spectacle" value={details.pole_emploi_spectacle} />
              <SensitiveRow label="N° Sécurité sociale" value={details.social_security_number} masked={maskSS(details.social_security_number)} show={showSS} onToggle={() => setShowSS(!showSS)} />
            </>
          ) : (
            <>
              <ReadRow label="SIRET" value={details.siret} />
              <ReadRow label="SIREN" value={details.siren} />
              <ReadRow label="N° TVA" value={details.tva_number} />
              <ReadRow label="Forme juridique" value={LEGAL_FORM_LABELS[details.legal_form] || details.legal_form} />
            </>
          )}
          <Divider />
          <SensitiveRow label="IBAN" value={details.iban} masked={maskIban(details.iban)} show={showIban} onToggle={() => setShowIban(!showIban)} />
          <ReadRow label="BIC" value={details.bic} />
        </ReadCard>

        {isPhysical && details.skills && details.skills.length > 0 && (
          <div className="card" style={{ padding: 14, marginTop: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#3D3042', marginBottom: 8 }}>Compétences</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {details.skills.map(s => {
                const opt = SKILL_OPTIONS.find(o => o.code === s)
                return (
                  <span key={s} style={{
                    padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                    background: '#9B7DC415', color: '#9B7DC4',
                  }}>{opt ? `${opt.icon} ${opt.label}` : s}</span>
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
            <Field label="N° Pôle Emploi Spectacle / Audiens" value={form.pole_emploi_spectacle} onChange={v => set('pole_emploi_spectacle', v)} />
            <SensitiveField label="N° Sécurité sociale" value={form.social_security_number} onChange={v => set('social_security_number', v)} />
          </>
        ) : (
          <>
            <Field label="SIRET (14 chiffres)" value={form.siret} onChange={v => set('siret', v.replace(/[^0-9]/g, '').slice(0, 14))} inputMode="numeric" />
            <ReadRow label="SIREN (auto)" value={(form.siret || '').replace(/[^0-9]/g, '').slice(0, 9) || '—'} />
            <Field label="N° TVA intracommunautaire" value={form.tva_number} onChange={v => set('tva_number', v)} />
          </>
        )}
        <Divider />
        <SensitiveField label="IBAN" value={form.iban} onChange={v => set('iban', v)} />
        <Field label="BIC" value={form.bic} onChange={v => set('bic', v)} />
      </div>

      {isPhysical && (
        <div className="card" style={{ padding: 16, marginTop: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#3D3042', marginBottom: 10 }}>Compétences</div>
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
                  background: selected ? '#9B7DC4' : 'white',
                  color: selected ? 'white' : '#9A8B94',
                  border: `1.5px solid ${selected ? '#9B7DC4' : '#E8DED8'}`,
                }}>{opt.icon} {opt.label}</button>
              )
            })}
          </div>
          <Field label="Autres compétences" value={form.availability_notes} onChange={v => set('availability_notes', v)} placeholder="Compétences additionnelles..." />
        </div>
      )}

      <SaveBar onSave={onSave} onCancel={onCancel} saving={saving} hasId={!!details.id} />
    </div>
  )
}

// ════════════════════════════════════════
// Section 3 — Projets
// ════════════════════════════════════════
function ProjectsTab({ user, membership, selectedOrg, roles, onSwitchProject }) {
  return (
    <div>
      {selectedOrg && (
        <div className="card" style={{ padding: 16, borderLeft: '4px solid #9B7DC4' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 14,
              background: 'linear-gradient(135deg, #9B7DC420, #9B7DC410)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
            }}>🎪</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 900, color: '#3D3042' }}>{selectedOrg.name}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                {membership?.is_admin && (
                  <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 800, background: '#E8735A15', color: '#E8735A' }}>Admin</span>
                )}
                {membership?.role_code && (
                  <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 800, background: '#9B7DC415', color: '#9B7DC4' }}>
                    {ROLE_CONF[membership.role_code]?.label || membership.role_code}
                  </span>
                )}
              </div>
              {membership?.created_at && (
                <div style={{ fontSize: 10, color: '#B8A0AE', marginTop: 4 }}>
                  Membre depuis {new Date(membership.created_at).toLocaleDateString('fr-FR')}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <button onClick={onSwitchProject} style={{
        width: '100%', padding: 14, borderRadius: 14, marginTop: 12,
        fontSize: 13, fontWeight: 700, cursor: 'pointer', textAlign: 'center',
        background: '#EEF4FA', border: '1.5px solid #5B8DB830', color: '#5B8DB8',
      }}>+ Changer de projet / Créer un projet</button>
    </div>
  )
}

// ════════════════════════════════════════
// Placeholder tabs
// ════════════════════════════════════════
function PlaceholderTab({ icon, title, desc }) {
  return (
    <div className="card" style={{ padding: '32px 20px', textAlign: 'center', opacity: 0.6 }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 16, fontWeight: 900, color: '#3D3042', marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13, color: '#9A8B94', lineHeight: 1.5, marginBottom: 12 }}>{desc}</div>
      <span style={{
        display: 'inline-block', padding: '4px 14px', borderRadius: 8,
        background: '#E8DED8', color: '#9A8B94', fontSize: 11, fontWeight: 800,
      }}>Bientôt disponible</span>
    </div>
  )
}

// ════════════════════════════════════════
// Shared sub-components
// ════════════════════════════════════════
function Field({ label, value, onChange, type = 'text', placeholder, multiline, inputMode }) {
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

function FieldSelect({ label, value, onChange, options }) {
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

function SensitiveField({ label, value, onChange }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label className="label">{label}</label>
      <input className="input" type="text" value={value || ''} onChange={e => onChange(e.target.value)}
        style={{ background: '#FFFDF5' }}
      />
    </div>
  )
}

function ReadCard({ children }) {
  return <div className="card" style={{ padding: 16 }}>{children}</div>
}

function ReadRow({ label, value }) {
  if (!value) return null
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '6px 0', gap: 12 }}>
      <span style={{ fontSize: 12, color: '#9A8B94', fontWeight: 600, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, color: '#3D3042', fontWeight: 700, textAlign: 'right', wordBreak: 'break-word' }}>{value}</span>
    </div>
  )
}

function SensitiveRow({ label, value, masked, show, onToggle }) {
  if (!value) return null
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', background: '#FFFDF5', borderRadius: 8, margin: '2px -4px', paddingLeft: 4, paddingRight: 4 }}>
      <span style={{ fontSize: 12, color: '#9A8B94', fontWeight: 600 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 13, color: '#3D3042', fontWeight: 700, fontFamily: 'monospace' }}>
          {show ? value : masked}
        </span>
        <button onClick={onToggle} style={{
          background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: 2,
        }}>{show ? '🔒' : '👁️'}</button>
      </div>
    </div>
  )
}

function SocialRow({ instagram, facebook, linkedin }) {
  if (!instagram && !facebook && !linkedin) return null
  return (
    <div style={{ display: 'flex', gap: 8, paddingTop: 8 }}>
      {instagram && <SocialBadge label="Instagram" value={instagram} color="#E1306C" />}
      {facebook && <SocialBadge label="Facebook" value={facebook} color="#1877F2" />}
      {linkedin && <SocialBadge label="LinkedIn" value={linkedin} color="#0A66C2" />}
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

function Divider() {
  return <div style={{ height: 1, background: '#E8DED8', margin: '12px 0' }} />
}

function SaveBar({ onSave, onCancel, saving, hasId }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
      {hasId && (
        <button onClick={onCancel} style={{
          flex: 1, padding: 14, borderRadius: 14, fontSize: 13, fontWeight: 700,
          background: 'white', border: '1.5px solid #E8DED8', color: '#9A8B94', cursor: 'pointer',
        }}>Annuler</button>
      )}
      <button className="btn-primary" onClick={onSave} disabled={saving} style={{ flex: 2 }}>
        {saving ? '⏳ Enregistrement...' : 'Enregistrer'}
      </button>
    </div>
  )
}
