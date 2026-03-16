import React, { useState, useCallback, useMemo } from 'react'
import { db, safe } from '../lib/supabase'
import { ROLE_CONF } from './RolePicker'
import { parseDate } from './UI'

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
  { id: 'identity', label: 'Identité' },
  { id: 'pro', label: 'Pro' },
  { id: 'projects', label: 'Projets' },
  { id: 'gear', label: 'Matériel' },
  { id: 'calendar', label: 'Calendrier' },
  { id: 'finances', label: 'Finances' },
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
  userGear, userAvailability, userIncome, allEvents,
  onClose, onToast, onReload, onLogout, onSwitchProject,
}) {
  const [tab, setTab] = useState('identity')
  const [editing, setEditing] = useState(!initialDetails)
  const [details, setDetails] = useState(initialDetails || { account_type: 'physical' })
  const [form, setForm] = useState({ ...details })
  const [saving, setSaving] = useState(false)
  const [showIban, setShowIban] = useState(false)
  const [showSS, setShowSS] = useState(false)

  const roleConf = userRole ? (ROLE_CONF[userRole.code] || { icon: '', color: '#71717A', label: userRole.name }) : null
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
      onToast('Erreur : ' + e.message, '#A78BFA')
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
      background: 'linear-gradient(180deg, #FFF8F0 0%, #111113 30%, #111113 70%, #111113 100%)',
      overflow: 'auto',
    }}>
      {/* Header — only show back button when overlay */}
      {!inline && (
        <header style={{
          padding: '16px 18px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <button onClick={onClose} style={{
            padding: '8px 14px', borderRadius: 12, fontSize: 13, fontWeight: 600,
            background: '#18181B', border: '1px solid rgba(255,255,255,0.06)', color: '#71717A', cursor: 'pointer',
          }}>← Retour</button>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#A78BFA' }}>Mon profil</div>
          <div style={{ width: 80 }} />
        </header>
      )}

      {/* Avatar + name banner */}
      <div style={{ textAlign: 'center', padding: '20px 16px 8px' }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%', margin: '0 auto 12px',
          background: details.avatar_url ? `url(${details.avatar_url}) center/cover` : (roleConf ? `${roleConf.color}15` : 'rgba(255,255,255,0.06)'),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 40, border: `3px solid ${roleConf?.color || 'rgba(255,255,255,0.06)'}40`,
        }}>
          {!details.avatar_url && (roleConf?.icon || '')}
        </div>
        <div style={{ fontSize: 20, fontWeight: 600, color: '#FAFAFA' }}>
          {isPhysical
            ? [details.first_name, details.last_name].filter(Boolean).join(' ') || details.stage_name || membership?.display_name || user.email
            : details.company_name || membership?.display_name || user.email
          }
        </div>
        <div style={{
          display: 'inline-block', marginTop: 6, padding: '3px 12px', borderRadius: 8,
          background: isPhysical ? '#A78BFA15' : '#3B82F615',
          color: isPhysical ? '#A78BFA' : '#3B82F6',
          fontSize: 11, fontWeight: 600,
        }}>
          {isPhysical ? 'Personne physique' : 'Personne morale'}
        </div>
        <div style={{ fontSize: 12, color: '#71717A', marginTop: 4 }}>{user.email}</div>
      </div>

      {/* Tab pills */}
      <div style={{ display: 'flex', gap: 6, padding: '12px 16px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
            whiteSpace: 'nowrap', cursor: 'pointer', flexShrink: 0,
            background: tab === t.id ? '#A78BFA' : 'white',
            color: tab === t.id ? 'white' : '#71717A',
            border: `1px solid ${tab === t.id ? '#A78BFA' : 'rgba(255,255,255,0.06)'}`,
          }}>
            {t.label}
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
        {tab === 'gear' && (
          <GearTab user={user} gear={userGear || []} onToast={onToast} onReload={onReload} />
        )}
        {tab === 'calendar' && (
          <CalendarTab user={user} events={allEvents || []} availability={userAvailability || []} onToast={onToast} onReload={onReload} />
        )}
        {tab === 'finances' && (
          <FinancesTab user={user} income={userIncome || []} events={allEvents || []} onToast={onToast} onReload={onReload} />
        )}
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
            flex: 1, padding: '12px 8px', borderRadius: 8, fontSize: 12, fontWeight: 700,
            background: '#EEF4FA', border: '1px solid #3B82F630', color: '#3B82F6', cursor: 'pointer',
          }}> Changer projet</button>
          <button onClick={() => { onClose(); onLogout() }} style={{
            flex: 1, padding: '12px 8px', borderRadius: 8, fontSize: 12, fontWeight: 700,
            background: '#FDF0F4', border: '1px solid #A78BFA30', color: '#A78BFA', cursor: 'pointer',
          }}> Déconnexion</button>
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
            padding: '7px 16px', borderRadius: 10, fontSize: 12, fontWeight: 600,
            background: '#A78BFA15', border: '1px solid #A78BFA30', color: '#A78BFA', cursor: 'pointer',
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
        <div style={{ fontSize: 12, fontWeight: 600, color: '#FAFAFA', marginBottom: 8 }}>Type de compte</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { val: 'physical', label: 'Personne physique', color: '#A78BFA' },
            { val: 'legal', label: 'Personne morale', color: '#3B82F6' },
          ].map(o => (
            <button key={o.val} onClick={() => set('account_type', o.val)} style={{
              flex: 1, padding: '10px 8px', borderRadius: 12, fontSize: 12, fontWeight: 700,
              cursor: 'pointer', textAlign: 'center',
              background: form.account_type === o.val ? `${o.color}15` : 'white',
              color: form.account_type === o.val ? o.color : '#71717A',
              border: `1px solid ${form.account_type === o.val ? o.color + '50' : 'rgba(255,255,255,0.06)'}`,
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
        <div style={{ fontSize: 12, fontWeight: 600, color: '#FAFAFA', marginBottom: 8 }}>Réseaux sociaux</div>
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
            padding: '7px 16px', borderRadius: 10, fontSize: 12, fontWeight: 600,
            background: '#A78BFA15', border: '1px solid #A78BFA30', color: '#A78BFA', cursor: 'pointer',
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
            <div style={{ fontSize: 12, fontWeight: 600, color: '#FAFAFA', marginBottom: 8 }}>Compétences</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {details.skills.map(s => {
                const opt = SKILL_OPTIONS.find(o => o.code === s)
                return (
                  <span key={s} style={{
                    padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                    background: '#A78BFA15', color: '#A78BFA',
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
          <div style={{ fontSize: 12, fontWeight: 600, color: '#FAFAFA', marginBottom: 10 }}>Compétences</div>
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
                  background: selected ? '#A78BFA' : 'white',
                  color: selected ? 'white' : '#71717A',
                  border: `1px solid ${selected ? '#A78BFA' : 'rgba(255,255,255,0.06)'}`,
                }}>{opt.label}</button>
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
        <div className="card" style={{ padding: 16, borderLeft: '4px solid #A78BFA' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 8,
              background: 'linear-gradient(135deg, #A78BFA20, #A78BFA10)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
            }}></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#FAFAFA' }}>{selectedOrg.name}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                {membership?.is_admin && (
                  <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600, background: '#6366F115', color: '#6366F1' }}>Admin</span>
                )}
                {membership?.role_code && (
                  <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600, background: '#A78BFA15', color: '#A78BFA' }}>
                    {ROLE_CONF[membership.role_code]?.label || membership.role_code}
                  </span>
                )}
              </div>
              {membership?.created_at && (
                <div style={{ fontSize: 10, color: '#71717A', marginTop: 4 }}>
                  Membre depuis {new Date(membership.created_at).toLocaleDateString('fr-FR')}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <button onClick={onSwitchProject} style={{
        width: '100%', padding: 14, borderRadius: 8, marginTop: 12,
        fontSize: 13, fontWeight: 700, cursor: 'pointer', textAlign: 'center',
        background: '#EEF4FA', border: '1px solid #3B82F630', color: '#3B82F6',
      }}>+ Changer de projet / Créer un projet</button>
    </div>
  )
}

// ════════════════════════════════════════
// Section 4 — Matériel personnel
// ════════════════════════════════════════
const GEAR_CATS = {
  instrument: { icon: '', label: 'Instrument', color: '#A78BFA' },
  son:        { icon: '', label: 'Son', color: '#3B82F6' },
  lumiere:    { icon: '', label: 'Lumière', color: '#F59E0B' },
  tech:       { icon: '💻', label: 'Tech', color: '#A78BFA' },
  scene:      { icon: '', label: 'Scène', color: '#6366F1' },
  transport:  { icon: '', label: 'Transport', color: '#22C55E' },
  other:      { icon: '', label: 'Autre', color: '#71717A' },
}

const CONDITION_CONF = {
  neuf:      { label: 'Neuf', color: '#22C55E' },
  excellent: { label: 'Excellent', color: '#3B82F6' },
  bon:       { label: 'Bon', color: '#F59E0B' },
  use:       { label: 'Usé', color: '#A78BFA' },
  hs:        { label: 'HS', color: '#71717A' },
}

function GearTab({ user, gear, onToast, onReload }) {
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', category: 'instrument', brand: '', model: '', serial_number: '', purchase_value: '', current_condition: 'bon', notes: '' })
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const totalValue = gear.reduce((s, g) => s + (g.purchase_value || 0), 0)

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      await db.insert('user_gear', {
        user_id: user.id,
        name: form.name.trim(),
        category: form.category,
        brand: form.brand.trim() || null,
        model: form.model.trim() || null,
        serial_number: form.serial_number.trim() || null,
        purchase_value: form.purchase_value ? parseFloat(form.purchase_value) : 0,
        current_condition: form.current_condition,
        notes: form.notes.trim() || null,
      })
      onToast('Équipement ajouté')
      setForm({ name: '', category: 'instrument', brand: '', model: '', serial_number: '', purchase_value: '', current_condition: 'bon', notes: '' })
      setShowAdd(false)
      if (onReload) onReload()
    } catch (e) {
      onToast('Erreur : ' + e.message, '#A78BFA')
    } finally {
      setSaving(false)
    }
  }

  const deleteGear = async (id) => {
    try {
      await db.delete('user_gear', `id=eq.${id}`)
      onToast('Supprimé')
      if (onReload) onReload()
    } catch (e) {
      onToast('Erreur : ' + e.message, '#A78BFA')
    }
  }

  return (
    <div>
      {/* Stats */}
      <div className="card" style={{ padding: '14px 16px', marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 8, textAlign: 'center' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 600, color: '#6366F1' }}>{gear.length}</div>
            <div style={{ fontSize: 9, color: '#71717A', fontWeight: 600 }}>Équipements</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 600, color: '#22C55E' }}>{Math.round(totalValue)}€</div>
            <div style={{ fontSize: 9, color: '#71717A', fontWeight: 600 }}>Valeur totale</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 600, color: '#3B82F6' }}>{gear.filter(g => g.available).length}</div>
            <div style={{ fontSize: 9, color: '#71717A', fontWeight: 600 }}>Disponibles</div>
          </div>
        </div>
      </div>

      {/* Add button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button onClick={() => setShowAdd(!showAdd)} style={{
          padding: '8px 16px', borderRadius: 10, fontSize: 12, fontWeight: 600,
          background: showAdd ? 'rgba(255,255,255,0.06)' : '#A78BFA', color: showAdd ? '#71717A' : 'white',
          cursor: 'pointer', border: 'none',
        }}>{showAdd ? 'Annuler' : '+ Ajouter'}</button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="card" style={{ padding: 16, marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#FAFAFA', marginBottom: 12 }}>Nouvel équipement</div>
          <Field label="Nom" value={form.name} onChange={v => set('name', v)} placeholder="ex: Guitare Martin D-28" />
          <div style={{ marginBottom: 12 }}>
            <label className="label">Catégorie</label>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {Object.entries(GEAR_CATS).map(([k, v]) => (
                <button key={k} onClick={() => set('category', k)} style={{
                  padding: '5px 10px', borderRadius: 8, fontSize: 10, fontWeight: 700, cursor: 'pointer',
                  background: form.category === k ? `${v.color}15` : 'white',
                  color: form.category === k ? v.color : '#71717A',
                  border: `1px solid ${form.category === k ? v.color + '40' : 'rgba(255,255,255,0.06)'}`,
                }}>{v.icon} {v.label}</button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}><Field label="Marque" value={form.brand} onChange={v => set('brand', v)} /></div>
            <div style={{ flex: 1 }}><Field label="Modèle" value={form.model} onChange={v => set('model', v)} /></div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}><Field label="N° série" value={form.serial_number} onChange={v => set('serial_number', v)} /></div>
            <div style={{ flex: 1 }}><Field label="Valeur (€)" value={form.purchase_value} onChange={v => set('purchase_value', v.replace(/[^0-9.]/g, ''))} inputMode="decimal" /></div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label className="label">État</label>
            <div style={{ display: 'flex', gap: 4 }}>
              {Object.entries(CONDITION_CONF).map(([k, v]) => (
                <button key={k} onClick={() => set('current_condition', k)} style={{
                  flex: 1, padding: '6px 4px', borderRadius: 8, fontSize: 10, fontWeight: 700, cursor: 'pointer', textAlign: 'center',
                  background: form.current_condition === k ? `${v.color}15` : 'white',
                  color: form.current_condition === k ? v.color : '#71717A',
                  border: `1px solid ${form.current_condition === k ? v.color + '40' : 'rgba(255,255,255,0.06)'}`,
                }}>{v.label}</button>
              ))}
            </div>
          </div>
          <Field label="Notes" value={form.notes} onChange={v => set('notes', v)} multiline placeholder="Optionnel" />
          <button onClick={handleSave} disabled={!form.name.trim() || saving} className="btn-primary">
            {saving ? 'Ajout...' : 'Ajouter'}
          </button>
        </div>
      )}

      {/* Gear list */}
      {gear.length === 0 && !showAdd ? (
        <div className="card" style={{ padding: '32px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}></div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#FAFAFA' }}>Aucun matériel</div>
          <div style={{ fontSize: 12, color: '#71717A', marginTop: 4 }}>Ajoute tes instruments et équipements perso</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {gear.map(g => {
            const cat = GEAR_CATS[g.category] || GEAR_CATS.other
            const cond = CONDITION_CONF[g.current_condition] || CONDITION_CONF.bon
            return (
              <div key={g.id} className="card" style={{
                padding: '12px 14px', borderLeft: `4px solid ${cat.color}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: `${cat.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                  }}>{cat.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#FAFAFA', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</div>
                    <div style={{ fontSize: 10, color: '#71717A' }}>
                      {[g.brand, g.model].filter(Boolean).join(' ') || cat.label}
                      {g.serial_number ? ` · SN: ${g.serial_number}` : ''}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    {g.purchase_value > 0 && <div style={{ fontSize: 13, fontWeight: 600, color: '#F59E0B' }}>{g.purchase_value}€</div>}
                    <span style={{
                      padding: '2px 8px', borderRadius: 6, fontSize: 9, fontWeight: 600,
                      background: `${cond.color}15`, color: cond.color,
                    }}>{cond.label}</span>
                  </div>
                  <button onClick={() => deleteGear(g.id)} style={{
                    width: 28, height: 28, borderRadius: 8, background: '#A78BFA10',
                    border: 'none', color: '#A78BFA', fontSize: 12, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>×</button>
                </div>
                {g.notes && <div style={{ fontSize: 10, color: '#71717A', marginTop: 4, paddingLeft: 50 }}>{g.notes}</div>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════
// Section 5 — Calendrier / Disponibilités
// ════════════════════════════════════════
const AVAIL_CONF = {
  available:   { label: 'Dispo', color: '#22C55E', icon: '' },
  unavailable: { label: 'Indispo', color: '#A78BFA', icon: '' },
  maybe:       { label: 'Peut-être', color: '#F59E0B', icon: '' },
  unknown:     { label: 'Non renseigné', color: '#71717A', icon: '' },
}

function CalendarTab({ user, events, availability, onToast, onReload }) {
  const today = new Date().toISOString().split('T')[0]

  const availMap = useMemo(() => {
    const map = {}
    ;(availability || []).forEach(a => { map[a.event_id] = a })
    return map
  }, [availability])

  const sortedEvents = useMemo(() =>
    [...(events || [])].sort((a, b) => a.date.localeCompare(b.date)),
    [events]
  )

  const upcomingEvents = sortedEvents.filter(e => e.date >= today)
  const pastEvents = sortedEvents.filter(e => e.date < today)

  const stats = useMemo(() => {
    const s = { available: 0, unavailable: 0, maybe: 0, unknown: 0 }
    upcomingEvents.forEach(e => {
      const a = availMap[e.id]
      s[a?.status || 'unknown']++
    })
    return s
  }, [upcomingEvents, availMap])

  const setAvailability = async (eventId, status) => {
    try {
      const existing = availMap[eventId]
      if (existing) {
        await db.update('user_availability', `id=eq.${existing.id}`, {
          status,
          updated_at: new Date().toISOString(),
        })
      } else {
        await db.upsert('user_availability', {
          user_id: user.id,
          event_id: eventId,
          status,
        })
      }
      onToast(AVAIL_CONF[status].label)
      if (onReload) onReload()
    } catch (e) {
      onToast('Erreur : ' + e.message, '#A78BFA')
    }
  }

  const renderEventRow = (ev) => {
    const avail = availMap[ev.id]
    const st = AVAIL_CONF[avail?.status || 'unknown']
    const isPast = ev.date < today
    const daysUntil = Math.ceil((new Date(ev.date) - new Date()) / 86400000)
    return (
      <div key={ev.id} className="card" style={{
        padding: '12px 14px', opacity: isPast ? 0.5 : 1,
        borderLeft: `4px solid ${st.color}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: isPast ? 0 : 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#FAFAFA', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {ev.name || ev.lieu}
            </div>
            <div style={{ fontSize: 10, color: '#71717A' }}>
              {parseDate(ev.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' })}
              {ev.ville ? ` — ${ev.ville}` : ''}
              {!isPast && daysUntil >= 0 ? ` · J-${daysUntil}` : ''}
            </div>
          </div>
          <span style={{
            padding: '3px 10px', borderRadius: 8, fontSize: 10, fontWeight: 600,
            background: `${st.color}15`, color: st.color,
          }}>{st.icon} {st.label}</span>
        </div>
        {!isPast && (
          <div style={{ display: 'flex', gap: 4 }}>
            {['available', 'maybe', 'unavailable'].map(s => {
              const c = AVAIL_CONF[s]
              const active = (avail?.status || 'unknown') === s
              return (
                <button key={s} onClick={() => setAvailability(ev.id, s)} style={{
                  flex: 1, padding: '6px 4px', borderRadius: 8, fontSize: 10, fontWeight: 700,
                  cursor: 'pointer', textAlign: 'center',
                  background: active ? `${c.color}20` : 'white',
                  color: active ? c.color : '#71717A',
                  border: `1px solid ${active ? c.color + '40' : 'rgba(255,255,255,0.06)'}`,
                }}>{c.icon} {c.label}</button>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      {/* Stats */}
      <div className="card" style={{ padding: '14px 16px', marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 8, textAlign: 'center' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 600, color: '#6366F1' }}>{upcomingEvents.length}</div>
            <div style={{ fontSize: 9, color: '#71717A', fontWeight: 600 }}>Dates à venir</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 600, color: '#22C55E' }}>{stats.available}</div>
            <div style={{ fontSize: 9, color: '#71717A', fontWeight: 600 }}>Dispo</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 600, color: '#F59E0B' }}>{stats.maybe}</div>
            <div style={{ fontSize: 9, color: '#71717A', fontWeight: 600 }}>Peut-être</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 600, color: '#A78BFA' }}>{stats.unavailable}</div>
            <div style={{ fontSize: 9, color: '#71717A', fontWeight: 600 }}>Indispo</div>
          </div>
        </div>
      </div>

      {/* Upcoming */}
      {upcomingEvents.length === 0 ? (
        <div className="card" style={{ padding: '32px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}></div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#FAFAFA' }}>Aucune date à venir</div>
        </div>
      ) : (
        <>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#71717A', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
            À venir ({upcomingEvents.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {upcomingEvents.map(renderEventRow)}
          </div>
        </>
      )}

      {/* Past events */}
      {pastEvents.length > 0 && (
        <>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#71717A', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
            Passés ({pastEvents.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pastEvents.slice(-5).reverse().map(renderEventRow)}
          </div>
        </>
      )}
    </div>
  )
}

// ════════════════════════════════════════
// Section 6 — Finances personnelles
// ════════════════════════════════════════
const INCOME_TYPES = {
  cachet:         { label: 'Cachet', color: '#22C55E', icon: '' },
  facture:        { label: 'Facture', color: '#3B82F6', icon: '📄' },
  remboursement:  { label: 'Remboursement', color: '#F59E0B', icon: '💸' },
  prime:          { label: 'Prime', color: '#A78BFA', icon: '⭐' },
  autre:          { label: 'Autre', color: '#71717A', icon: '📝' },
}

const INCOME_STATUS = {
  pending:   { label: 'En attente', color: '#F59E0B' },
  paid:      { label: 'Payé', color: '#22C55E' },
  cancelled: { label: 'Annulé', color: '#A78BFA' },
}

function FinancesTab({ user, income, events, onToast, onReload }) {
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ type: 'cachet', description: '', amount: '', date: new Date().toISOString().split('T')[0], event_id: '', notes: '' })
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const sortedIncome = useMemo(() =>
    [...(income || [])].sort((a, b) => (b.date || '').localeCompare(a.date || '')),
    [income]
  )

  const totalEarned = income.filter(i => i.status === 'paid').reduce((s, i) => s + (i.amount || 0), 0)
  const totalPending = income.filter(i => i.status === 'pending').reduce((s, i) => s + (i.amount || 0), 0)
  const totalAll = income.reduce((s, i) => s + (i.status !== 'cancelled' ? (i.amount || 0) : 0), 0)

  const handleSave = async () => {
    if (!form.description.trim() || !form.amount) return
    setSaving(true)
    try {
      await db.insert('user_income', {
        user_id: user.id,
        type: form.type,
        description: form.description.trim(),
        amount: parseFloat(form.amount) || 0,
        date: form.date || new Date().toISOString().split('T')[0],
        event_id: form.event_id || null,
        notes: form.notes.trim() || null,
        status: 'pending',
      })
      onToast('Revenu ajouté')
      setForm({ type: 'cachet', description: '', amount: '', date: new Date().toISOString().split('T')[0], event_id: '', notes: '' })
      setShowAdd(false)
      if (onReload) onReload()
    } catch (e) {
      onToast('Erreur : ' + e.message, '#A78BFA')
    } finally {
      setSaving(false)
    }
  }

  const toggleStatus = async (item) => {
    const next = item.status === 'pending' ? 'paid' : item.status === 'paid' ? 'pending' : item.status
    try {
      await db.update('user_income', `id=eq.${item.id}`, { status: next })
      onToast(next === 'paid' ? 'Marqué payé' : 'Marqué en attente')
      if (onReload) onReload()
    } catch (e) {
      onToast('Erreur : ' + e.message, '#A78BFA')
    }
  }

  const deleteIncome = async (id) => {
    try {
      await db.delete('user_income', `id=eq.${id}`)
      onToast('Supprimé')
      if (onReload) onReload()
    } catch (e) {
      onToast('Erreur : ' + e.message, '#A78BFA')
    }
  }

  return (
    <div>
      {/* Stats */}
      <div className="card" style={{ padding: '14px 16px', marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 8, textAlign: 'center' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 600, color: '#22C55E' }}>{Math.round(totalEarned)}€</div>
            <div style={{ fontSize: 9, color: '#71717A', fontWeight: 600 }}>Encaissé</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 600, color: '#F59E0B' }}>{Math.round(totalPending)}€</div>
            <div style={{ fontSize: 9, color: '#71717A', fontWeight: 600 }}>En attente</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 600, color: '#A78BFA' }}>{Math.round(totalAll)}€</div>
            <div style={{ fontSize: 9, color: '#71717A', fontWeight: 600 }}>Total</div>
          </div>
        </div>
      </div>

      {/* Progress bar earned vs pending */}
      {totalAll > 0 && (
        <div className="card" style={{ padding: '10px 14px', marginBottom: 14 }}>
          <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', position: 'relative' }}>
            <div style={{
              position: 'absolute', left: 0, top: 0, bottom: 0,
              width: `${Math.round((totalEarned / totalAll) * 100)}%`,
              background: 'linear-gradient(90deg, #22C55E, #4A9A7A)',
              borderRadius: 4, transition: 'width 0.3s',
            }} />
          </div>
          <div style={{ fontSize: 10, color: '#71717A', marginTop: 4, textAlign: 'center' }}>
            {Math.round((totalEarned / totalAll) * 100)}% encaissé
          </div>
        </div>
      )}

      {/* Add button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button onClick={() => setShowAdd(!showAdd)} style={{
          padding: '8px 16px', borderRadius: 10, fontSize: 12, fontWeight: 600,
          background: showAdd ? 'rgba(255,255,255,0.06)' : '#22C55E', color: showAdd ? '#71717A' : 'white',
          cursor: 'pointer', border: 'none',
        }}>{showAdd ? 'Annuler' : '+ Ajouter un revenu'}</button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="card" style={{ padding: 16, marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#FAFAFA', marginBottom: 12 }}>Nouveau revenu</div>
          <div style={{ marginBottom: 12 }}>
            <label className="label">Type</label>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {Object.entries(INCOME_TYPES).map(([k, v]) => (
                <button key={k} onClick={() => set('type', k)} style={{
                  padding: '5px 10px', borderRadius: 8, fontSize: 10, fontWeight: 700, cursor: 'pointer',
                  background: form.type === k ? `${v.color}15` : 'white',
                  color: form.type === k ? v.color : '#71717A',
                  border: `1px solid ${form.type === k ? v.color + '40' : 'rgba(255,255,255,0.06)'}`,
                }}>{v.icon} {v.label}</button>
              ))}
            </div>
          </div>
          <Field label="Description" value={form.description} onChange={v => set('description', v)} placeholder="ex: Cachet concert Triple 8" />
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}><Field label="Montant (€)" value={form.amount} onChange={v => set('amount', v.replace(/[^0-9.]/g, ''))} inputMode="decimal" /></div>
            <div style={{ flex: 1 }}><Field label="Date" value={form.date} onChange={v => set('date', v)} type="date" /></div>
          </div>
          {(events || []).length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <label className="label">Concert associé (optionnel)</label>
              <select className="input" value={form.event_id} onChange={e => set('event_id', e.target.value)}>
                <option value="">— Aucun —</option>
                {(events || []).sort((a, b) => a.date.localeCompare(b.date)).map(ev => (
                  <option key={ev.id} value={ev.id}>
                    {parseDate(ev.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} — {ev.name || ev.lieu}
                  </option>
                ))}
              </select>
            </div>
          )}
          <Field label="Notes" value={form.notes} onChange={v => set('notes', v)} placeholder="Optionnel" />
          <button onClick={handleSave} disabled={!form.description.trim() || !form.amount || saving} className="btn-primary">
            {saving ? 'Ajout...' : 'Ajouter'}
          </button>
        </div>
      )}

      {/* Income list */}
      {sortedIncome.length === 0 && !showAdd ? (
        <div className="card" style={{ padding: '32px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}></div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#FAFAFA' }}>Aucun revenu enregistré</div>
          <div style={{ fontSize: 12, color: '#71717A', marginTop: 4 }}>Ajoute tes cachets, factures et remboursements</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sortedIncome.map(item => {
            const tp = INCOME_TYPES[item.type] || INCOME_TYPES.autre
            const st = INCOME_STATUS[item.status] || INCOME_STATUS.pending
            const ev = item.event_id ? (events || []).find(e => e.id === item.event_id) : null
            return (
              <div key={item.id} className="card" style={{
                padding: '12px 14px',
                borderLeft: `4px solid ${st.color}`,
                opacity: item.status === 'cancelled' ? 0.4 : 1,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: `${tp.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                  }}>{tp.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#FAFAFA', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.description}
                    </div>
                    <div style={{ fontSize: 10, color: '#71717A' }}>
                      {tp.label} · {item.date ? parseDate(item.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : ''}
                      {ev ? ` · ${ev.name || ev.lieu}` : ''}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: st.color }}>{item.amount}€</div>
                    <button onClick={() => toggleStatus(item)} style={{
                      padding: '2px 8px', borderRadius: 6, fontSize: 9, fontWeight: 600,
                      background: `${st.color}15`, color: st.color, border: 'none', cursor: 'pointer',
                    }}>{st.label}</button>
                  </div>
                  <button onClick={() => deleteIncome(item.id)} style={{
                    width: 24, height: 24, borderRadius: 6, background: '#A78BFA10',
                    border: 'none', color: '#A78BFA', fontSize: 11, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>×</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
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
      <span style={{ fontSize: 12, color: '#71717A', fontWeight: 600, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, color: '#FAFAFA', fontWeight: 700, textAlign: 'right', wordBreak: 'break-word' }}>{value}</span>
    </div>
  )
}

function SensitiveRow({ label, value, masked, show, onToggle }) {
  if (!value) return null
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', background: '#FFFDF5', borderRadius: 8, margin: '2px -4px', paddingLeft: 4, paddingRight: 4 }}>
      <span style={{ fontSize: 12, color: '#71717A', fontWeight: 600 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 13, color: '#FAFAFA', fontWeight: 700, fontFamily: 'monospace' }}>
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
  return <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '12px 0' }} />
}

function SaveBar({ onSave, onCancel, saving, hasId }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
      {hasId && (
        <button onClick={onCancel} style={{
          flex: 1, padding: 14, borderRadius: 8, fontSize: 13, fontWeight: 700,
          background: '#18181B', border: '1px solid rgba(255,255,255,0.06)', color: '#71717A', cursor: 'pointer',
        }}>Annuler</button>
      )}
      <button className="btn-primary" onClick={onSave} disabled={saving} style={{ flex: 2 }}>
        {saving ? 'Enregistrement...' : 'Enregistrer'}
      </button>
    </div>
  )
}
