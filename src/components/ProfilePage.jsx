import React, { useState, useCallback, useMemo, createElement } from 'react'
import { db, safe } from '../lib/supabase'
import { ROLE_CONF } from './RolePicker'
import { parseDate, maskIban, maskSS } from '../shared/utils'
import {
  Field, FieldSelect, SensitiveField, SensitiveRow,
  ReadCard, ReadRow, SaveBar, Divider, EmptyState, SocialRow,
} from '../shared/ui'

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
  // icon deliberately excluded — ROLE_CONF.icon is a Lucide component, not renderable as text
}))

const TABS = [
  { id: 'identity', label: 'Identité' },
  { id: 'pro', label: 'Pro' },
  { id: 'projects', label: 'Projets' },
  { id: 'gear', label: 'Matériel' },
  { id: 'calendar', label: 'Calendrier' },
  { id: 'finances', label: 'Finances' },
]


export default function ProfilePage({
  user, userProfile, userRole, userDetails: initialDetails,
  membership, selectedOrg, allProjects, roles,
  userGear, userAvailability, userIncome, allEvents,
  onClose, onToast, onReload, onLogout, onSwitchProject, onOpenProject,
}) {
  const [tab, setTab] = useState('identity')
  const [editing, setEditing] = useState(!initialDetails)
  const [details, setDetails] = useState(initialDetails || { account_type: 'physical' })
  const [form, setForm] = useState({ ...details })
  const [saving, setSaving] = useState(false)
  const [showIban, setShowIban] = useState(false)
  const [showSS, setShowSS] = useState(false)

  const roleConf = userRole ? (ROLE_CONF[userRole.code] || { icon: '', color: '#94A3B8', label: userRole.name }) : null
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
      onToast('Erreur : ' + e.message, '#8B6DB8')
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
      background: 'linear-gradient(180deg, #FFF8F0 0%, #F8FAFC 30%, #F8FAFC 70%, #F8FAFC 100%)',
      overflow: 'auto',
    }}>
      {/* Header — only show back button when overlay */}
      {!inline && (
        <header style={{
          padding: '16px 18px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <button onClick={onClose} style={{
            padding: '8px 14px', borderRadius: 12, fontSize: 13, fontWeight: 600,
            background: '#F1F5F9', border: '1px solid #E2E8F0', color: '#94A3B8', cursor: 'pointer',
          }}>← Retour</button>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#8B6DB8' }}>Mon profil</div>
          <div style={{ width: 80 }} />
        </header>
      )}

      {/* Avatar + name banner */}
      <div style={{ textAlign: 'center', padding: '20px 16px 8px' }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%', margin: '0 auto 12px',
          background: details.avatar_url ? `url(${details.avatar_url}) center/cover` : (roleConf ? `${roleConf.color}15` : '#E2E8F0'),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 40, border: `3px solid ${roleConf?.color || '#E2E8F0'}40`,
        }}>
          {!details.avatar_url && roleConf?.icon && createElement(roleConf.icon, { size: 32, color: roleConf.color })}
        </div>
        <div style={{ fontSize: 20, fontWeight: 600, color: '#1E293B' }}>
          {isPhysical
            ? [details.first_name, details.last_name].filter(Boolean).join(' ') || details.stage_name || membership?.display_name || user.email
            : details.company_name || membership?.display_name || user.email
          }
        </div>
        <div style={{
          display: 'inline-block', marginTop: 6, padding: '3px 12px', borderRadius: 8,
          background: isPhysical ? '#8B6DB815' : '#5B8DB815',
          color: isPhysical ? '#8B6DB8' : '#5B8DB8',
          fontSize: 11, fontWeight: 600,
        }}>
          {isPhysical ? 'Personne physique' : 'Personne morale'}
        </div>
        <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>{user.email}</div>
      </div>

      {/* Tab pills */}
      <div role="tablist" aria-label="Sections du profil" style={{ display: 'flex', gap: 6, padding: '12px 16px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {TABS.map(t => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} style={{
            padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
            whiteSpace: 'nowrap', cursor: 'pointer', flexShrink: 0,
            background: tab === t.id ? '#8B6DB8' : 'white',
            color: tab === t.id ? 'white' : '#94A3B8',
            border: `1px solid ${tab === t.id ? '#8B6DB8' : '#E2E8F0'}`,
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
            user={user} membership={membership} selectedOrg={selectedOrg}
            allProjects={allProjects || []} roles={roles}
            onSwitchProject={onSwitchProject} onOpenProject={onOpenProject}
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
          <button onClick={() => onSwitchProject && onSwitchProject()} style={{
            flex: 1, padding: '12px 8px', borderRadius: 8, fontSize: 12, fontWeight: 700,
            background: '#EEF4FA', border: '1px solid #5B8DB830', color: '#5B8DB8', cursor: 'pointer',
          }}> Changer projet</button>
          <button onClick={() => { onClose && onClose(); onLogout && onLogout() }} style={{
            flex: 1, padding: '12px 8px', borderRadius: 8, fontSize: 12, fontWeight: 700,
            background: '#FDF0F4', border: '1px solid #8B6DB830', color: '#8B6DB8', cursor: 'pointer',
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
            background: '#8B6DB815', border: '1px solid #8B6DB830', color: '#8B6DB8', cursor: 'pointer',
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
        <div style={{ fontSize: 12, fontWeight: 600, color: '#1E293B', marginBottom: 8 }}>Type de compte</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { val: 'physical', label: 'Personne physique', color: '#8B6DB8' },
            { val: 'legal', label: 'Personne morale', color: '#5B8DB8' },
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
        <div style={{ fontSize: 12, fontWeight: 600, color: '#1E293B', marginBottom: 8 }}>Réseaux sociaux</div>
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
            background: '#8B6DB815', border: '1px solid #8B6DB830', color: '#8B6DB8', cursor: 'pointer',
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
            <div style={{ fontSize: 12, fontWeight: 600, color: '#1E293B', marginBottom: 8 }}>Compétences</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {details.skills.map(s => {
                const opt = SKILL_OPTIONS.find(o => o.code === s)
                return (
                  <span key={s} style={{
                    padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                    background: '#8B6DB815', color: '#8B6DB8',
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
            <div style={{ marginBottom: 12 }}>
              <label className="label">SIREN (auto)</label>
              <input className="input" disabled value={(form.siret || '').replace(/[^0-9]/g, '').slice(0, 9) || '—'} style={{ background: '#F1F5F9', color: '#94A3B8' }} />
            </div>
            <Field label="N° TVA intracommunautaire" value={form.tva_number} onChange={v => set('tva_number', v)} />
          </>
        )}
        <Divider />
        <SensitiveField label="IBAN" value={form.iban} onChange={v => set('iban', v)} />
        <Field label="BIC" value={form.bic} onChange={v => set('bic', v)} />
      </div>

      {isPhysical && (
        <div className="card" style={{ padding: 16, marginTop: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#1E293B', marginBottom: 10 }}>Compétences</div>
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
                  background: selected ? '#8B6DB8' : 'white',
                  color: selected ? 'white' : '#94A3B8',
                  border: `1px solid ${selected ? '#8B6DB8' : '#E2E8F0'}`,
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
function ProjectsTab({ user, membership, selectedOrg, allProjects, roles, onSwitchProject, onOpenProject }) {
  const projects = allProjects || []

  return (
    <div>
      {projects.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 32, color: '#94A3B8' }}>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>Aucun projet</div>
          <div style={{ fontSize: 12 }}>Rejoignez ou créez un projet pour commencer</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {projects.map(p => {
            const isActive = selectedOrg?.id === p.org_id
            const roleConf = p.role_code ? ROLE_CONF[p.role_code] : null
            return (
              <button
                key={p.id}
                onClick={() => onOpenProject && onOpenProject(p)}
                className="card"
                style={{
                  width: '100%', padding: '14px 16px', textAlign: 'left', cursor: 'pointer',
                  borderLeft: `4px solid ${isActive ? '#5B8DB8' : '#E2E8F0'}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 10,
                    background: isActive ? '#5B8DB810' : '#F1F5F9',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 600, color: isActive ? '#5B8DB8' : '#94A3B8',
                  }}>
                    {(p.org?.name || 'P')[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#1E293B' }}>
                      {p.org?.name || 'Projet'}
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                      {p.is_admin && (
                        <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600, background: '#5B8DB810', color: '#5B8DB8' }}>Admin</span>
                      )}
                      {roleConf && (
                        <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600, background: `${roleConf.color}10`, color: roleConf.color }}>
                          {roleConf.label}
                        </span>
                      )}
                      {isActive && (
                        <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600, background: '#5DAB8B10', color: '#5DAB8B' }}>Actif</span>
                      )}
                    </div>
                    {p.created_at && (
                      <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 4 }}>
                        Membre depuis {new Date(p.created_at).toLocaleDateString('fr-FR')}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      <button onClick={onSwitchProject} style={{
        width: '100%', padding: 14, borderRadius: 8, marginTop: 12,
        fontSize: 13, fontWeight: 600, cursor: 'pointer', textAlign: 'center',
        background: '#F1F5F9', border: '1px solid #E2E8F0', color: '#5B8DB8',
      }}>+ Changer de projet / Créer un projet</button>
    </div>
  )
}

// ════════════════════════════════════════
// Section 4 — Matériel personnel
// ════════════════════════════════════════
const GEAR_CATS = {
  instrument: { icon: '', label: 'Instrument', color: '#8B6DB8' },
  son:        { icon: '', label: 'Son', color: '#5B8DB8' },
  lumiere:    { icon: '', label: 'Lumière', color: '#E8935A' },
  tech:       { icon: '', label: 'Tech', color: '#8B6DB8' },
  scene:      { icon: '', label: 'Scène', color: '#5B8DB8' },
  transport:  { icon: '', label: 'Transport', color: '#5DAB8B' },
  other:      { icon: '', label: 'Autre', color: '#94A3B8' },
}

const CONDITION_CONF = {
  neuf:      { label: 'Neuf', color: '#5DAB8B' },
  excellent: { label: 'Excellent', color: '#5B8DB8' },
  bon:       { label: 'Bon', color: '#E8935A' },
  use:       { label: 'Usé', color: '#8B6DB8' },
  hs:        { label: 'HS', color: '#94A3B8' },
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
      onToast('Erreur : ' + e.message, '#8B6DB8')
    } finally {
      setSaving(false)
    }
  }

  const deleteGear = async (id) => {
    if (!window.confirm('Supprimer cet équipement ?')) return
    try {
      await db.delete('user_gear', `id=eq.${id}`)
      onToast('Supprimé')
      if (onReload) onReload()
    } catch (e) {
      onToast('Erreur : ' + e.message, '#8B6DB8')
    }
  }

  return (
    <div>
      {/* Stats */}
      <div className="card" style={{ padding: '14px 16px', marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 8, textAlign: 'center' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 600, color: '#5B8DB8' }}>{gear.length}</div>
            <div style={{ fontSize: 9, color: '#94A3B8', fontWeight: 600 }}>Équipements</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 600, color: '#5DAB8B' }}>{Math.round(totalValue)}€</div>
            <div style={{ fontSize: 9, color: '#94A3B8', fontWeight: 600 }}>Valeur totale</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 600, color: '#5B8DB8' }}>{gear.filter(g => g.available).length}</div>
            <div style={{ fontSize: 9, color: '#94A3B8', fontWeight: 600 }}>Disponibles</div>
          </div>
        </div>
      </div>

      {/* Add button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button onClick={() => setShowAdd(!showAdd)} style={{
          padding: '8px 16px', borderRadius: 10, fontSize: 12, fontWeight: 600,
          background: showAdd ? '#E2E8F0' : '#8B6DB8', color: showAdd ? '#94A3B8' : 'white',
          cursor: 'pointer', border: 'none',
        }}>{showAdd ? 'Annuler' : '+ Ajouter'}</button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="card" style={{ padding: 16, marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1E293B', marginBottom: 12 }}>Nouvel équipement</div>
          <Field label="Nom" value={form.name} onChange={v => set('name', v)} placeholder="ex: Guitare Martin D-28" />
          <div style={{ marginBottom: 12 }}>
            <label className="label">Catégorie</label>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {Object.entries(GEAR_CATS).map(([k, v]) => (
                <button key={k} onClick={() => set('category', k)} style={{
                  padding: '5px 10px', borderRadius: 8, fontSize: 10, fontWeight: 700, cursor: 'pointer',
                  background: form.category === k ? `${v.color}15` : 'white',
                  color: form.category === k ? v.color : '#94A3B8',
                  border: `1px solid ${form.category === k ? v.color + '40' : '#E2E8F0'}`,
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
                  color: form.current_condition === k ? v.color : '#94A3B8',
                  border: `1px solid ${form.current_condition === k ? v.color + '40' : '#E2E8F0'}`,
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
        <EmptyState icon="" title="Aucun matériel" subtitle="Ajoute tes instruments et équipements perso" />
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
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</div>
                    <div style={{ fontSize: 10, color: '#94A3B8' }}>
                      {[g.brand, g.model].filter(Boolean).join(' ') || cat.label}
                      {g.serial_number ? ` · SN: ${g.serial_number}` : ''}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    {g.purchase_value > 0 && <div style={{ fontSize: 13, fontWeight: 600, color: '#E8935A' }}>{g.purchase_value}€</div>}
                    <span style={{
                      padding: '2px 8px', borderRadius: 6, fontSize: 9, fontWeight: 600,
                      background: `${cond.color}15`, color: cond.color,
                    }}>{cond.label}</span>
                  </div>
                  <button onClick={() => deleteGear(g.id)} aria-label="Supprimer" style={{
                    width: 28, height: 28, borderRadius: 8, background: '#8B6DB810',
                    border: 'none', color: '#8B6DB8', fontSize: 12, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>×</button>
                </div>
                {g.notes && <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 4, paddingLeft: 50 }}>{g.notes}</div>}
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
  available:   { label: 'Dispo', color: '#5DAB8B', icon: '' },
  unavailable: { label: 'Indispo', color: '#8B6DB8', icon: '' },
  maybe:       { label: 'Peut-être', color: '#E8935A', icon: '' },
  unknown:     { label: 'Non renseigné', color: '#94A3B8', icon: '' },
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
      onToast('Erreur : ' + e.message, '#8B6DB8')
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
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {ev.name || ev.lieu}
            </div>
            <div style={{ fontSize: 10, color: '#94A3B8' }}>
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
                  color: active ? c.color : '#94A3B8',
                  border: `1px solid ${active ? c.color + '40' : '#E2E8F0'}`,
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
            <div style={{ fontSize: 20, fontWeight: 600, color: '#5B8DB8' }}>{upcomingEvents.length}</div>
            <div style={{ fontSize: 9, color: '#94A3B8', fontWeight: 600 }}>Dates à venir</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 600, color: '#5DAB8B' }}>{stats.available}</div>
            <div style={{ fontSize: 9, color: '#94A3B8', fontWeight: 600 }}>Dispo</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 600, color: '#E8935A' }}>{stats.maybe}</div>
            <div style={{ fontSize: 9, color: '#94A3B8', fontWeight: 600 }}>Peut-être</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 600, color: '#8B6DB8' }}>{stats.unavailable}</div>
            <div style={{ fontSize: 9, color: '#94A3B8', fontWeight: 600 }}>Indispo</div>
          </div>
        </div>
      </div>

      {/* Upcoming */}
      {upcomingEvents.length === 0 ? (
        <EmptyState icon="" title="Aucune date à venir" />
      ) : (
        <>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
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
          <div style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
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
  cachet:         { label: 'Cachet', color: '#5DAB8B', icon: '' },
  facture:        { label: 'Facture', color: '#5B8DB8', icon: '' },
  remboursement:  { label: 'Remboursement', color: '#E8935A', icon: '' },
  prime:          { label: 'Prime', color: '#8B6DB8', icon: '' },
  autre:          { label: 'Autre', color: '#94A3B8', icon: '' },
}

const INCOME_STATUS = {
  pending:   { label: 'En attente', color: '#E8935A' },
  paid:      { label: 'Payé', color: '#5DAB8B' },
  cancelled: { label: 'Annulé', color: '#8B6DB8' },
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
      onToast('Erreur : ' + e.message, '#8B6DB8')
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
      onToast('Erreur : ' + e.message, '#8B6DB8')
    }
  }

  const deleteIncome = async (id) => {
    if (!window.confirm('Supprimer ce revenu ?')) return
    try {
      await db.delete('user_income', `id=eq.${id}`)
      onToast('Supprimé')
      if (onReload) onReload()
    } catch (e) {
      onToast('Erreur : ' + e.message, '#8B6DB8')
    }
  }

  return (
    <div>
      {/* Stats */}
      <div className="card" style={{ padding: '14px 16px', marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 8, textAlign: 'center' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 600, color: '#5DAB8B' }}>{Math.round(totalEarned)}€</div>
            <div style={{ fontSize: 9, color: '#94A3B8', fontWeight: 600 }}>Encaissé</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 600, color: '#E8935A' }}>{Math.round(totalPending)}€</div>
            <div style={{ fontSize: 9, color: '#94A3B8', fontWeight: 600 }}>En attente</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 600, color: '#8B6DB8' }}>{Math.round(totalAll)}€</div>
            <div style={{ fontSize: 9, color: '#94A3B8', fontWeight: 600 }}>Total</div>
          </div>
        </div>
      </div>

      {/* Progress bar earned vs pending */}
      {totalAll > 0 && (
        <div className="card" style={{ padding: '10px 14px', marginBottom: 14 }}>
          <div style={{ height: 8, borderRadius: 4, background: '#E2E8F0', overflow: 'hidden', position: 'relative' }}>
            <div style={{
              position: 'absolute', left: 0, top: 0, bottom: 0,
              width: `${Math.round((totalEarned / totalAll) * 100)}%`,
              background: 'linear-gradient(90deg, #5DAB8B, #4A9A7A)',
              borderRadius: 4, transition: 'width 0.3s',
            }} />
          </div>
          <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 4, textAlign: 'center' }}>
            {Math.round((totalEarned / totalAll) * 100)}% encaissé
          </div>
        </div>
      )}

      {/* Add button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button onClick={() => setShowAdd(!showAdd)} style={{
          padding: '8px 16px', borderRadius: 10, fontSize: 12, fontWeight: 600,
          background: showAdd ? '#E2E8F0' : '#5DAB8B', color: showAdd ? '#94A3B8' : 'white',
          cursor: 'pointer', border: 'none',
        }}>{showAdd ? 'Annuler' : '+ Ajouter un revenu'}</button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="card" style={{ padding: 16, marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1E293B', marginBottom: 12 }}>Nouveau revenu</div>
          <div style={{ marginBottom: 12 }}>
            <label className="label">Type</label>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {Object.entries(INCOME_TYPES).map(([k, v]) => (
                <button key={k} onClick={() => set('type', k)} style={{
                  padding: '5px 10px', borderRadius: 8, fontSize: 10, fontWeight: 700, cursor: 'pointer',
                  background: form.type === k ? `${v.color}15` : 'white',
                  color: form.type === k ? v.color : '#94A3B8',
                  border: `1px solid ${form.type === k ? v.color + '40' : '#E2E8F0'}`,
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
        <EmptyState icon="" title="Aucun revenu enregistré" subtitle="Ajoute tes cachets, factures et remboursements" />
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
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.description}
                    </div>
                    <div style={{ fontSize: 10, color: '#94A3B8' }}>
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
                  <button onClick={() => deleteIncome(item.id)} aria-label="Supprimer" style={{
                    width: 24, height: 24, borderRadius: 6, background: '#8B6DB810',
                    border: 'none', color: '#8B6DB8', fontSize: 11, cursor: 'pointer',
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

