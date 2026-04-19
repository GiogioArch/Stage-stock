import React, { useState, createElement } from 'react'
import { db } from '../lib/supabase'
import { ROLE_CONF } from './RolePicker'
import { Rocket, FolderPlus, UserCheck, ArrowRight, ArrowLeft, Loader2, Sparkles } from 'lucide-react'

const ALL_MODULES = ['dashboard', 'equipe', 'articles', 'depots', 'stock', 'tournee', 'alertes', 'finance', 'forecast']

// UUID v4 detector — backward compatibility: if selectedRole.id is already a UUID, use it as-is
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Resolve role UUID from either a UUID or a role code (TM, PM, etc.)
async function resolveRoleId(selectedRole) {
  if (!selectedRole) return null
  if (selectedRole.id && UUID_RE.test(selectedRole.id)) return selectedRole.id
  const code = selectedRole.code
  if (!code) return null
  try {
    const rows = await db.get('roles', `code=eq.${encodeURIComponent(code)}`)
    if (rows && rows.length > 0 && rows[0].id) return rows[0].id
  } catch { /* fallthrough */ }
  return null
}

const STEPS = [
  { id: 'welcome', icon: Rocket, color: '#6366F1', title: 'Bienvenue sur Stage Stock' },
  { id: 'project', icon: FolderPlus, color: '#2563EB', title: 'Ton premier projet' },
  { id: 'role', icon: UserCheck, color: '#16A34A', title: 'Ton rôle' },
]

export default function Onboarding({ user, onComplete, onToast }) {
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)

  // Step 1: Display name
  const [displayName, setDisplayName] = useState(user?.user_metadata?.full_name || user?.email?.split('@')[0] || '')

  // Step 2: Project name
  const [projectName, setProjectName] = useState('')

  // Step 3: Role selection
  const [selectedRole, setSelectedRole] = useState(null)

  // Created data refs
  const [createdOrg, setCreatedOrg] = useState(null)
  const [createdMembership, setCreatedMembership] = useState(null)

  const canAdvance = step === 0 ? displayName.trim().length > 0
    : step === 1 ? projectName.trim().length > 0
    : step === 2 ? selectedRole !== null
    : false

  const handleNext = async () => {
    if (!canAdvance) return
    setSaving(true)

    try {
      if (step === 0) {
        // Save display name to user_details
        try {
          await db.upsert('user_details', {
            user_id: user.id,
            first_name: displayName.trim(),
          })
        } catch {
          // Table might not exist yet, that's ok
          try {
            await db.insert('user_details', {
              user_id: user.id,
              first_name: displayName.trim(),
            })
          } catch { /* silent */ }
        }
        setStep(1)
      } else if (step === 1) {
        // Création atomique via RPC (org + membership en 1 transaction)
        const slug = projectName.trim().toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 30)
        const uniqueSlug = `${slug || 'projet'}-${Date.now().toString(36)}`
        const result = await db.rpc('create_project', {
          p_name: projectName.trim(),
          p_slug: uniqueSlug,
          p_modules: ALL_MODULES,
        })
        if (!result || result.error) {
          throw new Error(result?.error || 'Création échouée')
        }
        const org = { id: result.org_id, name: result.org_name, slug: result.org_slug }
        setCreatedOrg(org)
        setCreatedMembership({ id: result.member_id, org_id: result.org_id, org })
        setStep(2)
      } else if (step === 2) {
        // Save role — resolve UUID from code first (role_id is a UUID FK to roles.id).
        // In this component, selectedRole is built as { code, id: code, ...conf } so id == code.
        const roleUuid = await resolveRoleId(selectedRole)
        if (roleUuid) {
          try {
            await db.upsert('user_profiles', {
              user_id: user.id,
              role_id: roleUuid,
              org_id: createdOrg.id,
            })
          } catch {
            try {
              await db.insert('user_profiles', {
                user_id: user.id,
                role_id: roleUuid,
                org_id: createdOrg.id,
              })
            } catch { /* silent */ }
          }
        }

        // Mark onboarding complete
        localStorage.setItem('onboarding_complete', 'true')

        // Enter the project
        onComplete(createdMembership)
      }
    } catch (e) {
      onToast?.('Erreur: ' + e.message, '#DC2626')
    } finally {
      setSaving(false)
    }
  }

  const roleOrder = ['TM', 'PM', 'SE', 'LD', 'BL', 'SM', 'TD', 'MM', 'LOG', 'SAFE', 'AA', 'PA']

  return (
    <div style={{
      minHeight: '100dvh', background: '#FFFFFF',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '24px 20px',
    }}>
      {/* Step indicator */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
        {STEPS.map((s, i) => (
          <div key={s.id} style={{
            width: i === step ? 32 : 10, height: 10, borderRadius: 5,
            background: i <= step ? STEPS[step].color : '#E2E8F0',
            transition: 'all 0.3s ease',
          }} />
        ))}
      </div>

      {/* Icon */}
      <div style={{
        width: 80, height: 80, borderRadius: 20,
        background: `${STEPS[step].color}12`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 24, transition: 'all 0.3s',
      }}>
        {createElement(STEPS[step].icon, { size: 36, color: STEPS[step].color })}
      </div>

      {/* Title */}
      <h1 style={{
        fontSize: 22, fontWeight: 700, color: '#1E293B',
        textAlign: 'center', marginBottom: 8,
      }}>
        {STEPS[step].title}
      </h1>

      {/* Content */}
      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* ── Step 0: Welcome ── */}
        {step === 0 && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: '#64748B', marginBottom: 24, lineHeight: 1.6 }}>
              Le WMS mobile pour les pros du spectacle.
              Gère ton stock, prépare tes concerts, anticipe les ruptures.
            </p>
            <div style={{ textAlign: 'left', marginBottom: 8 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: '#64748B', display: 'block', marginBottom: 4 }}>
                Comment on t'appelle ?
              </label>
              <input
                className="input"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Ton prénom ou pseudo"
                autoFocus
                style={{ fontSize: 16, padding: '14px 16px', textAlign: 'center' }}
              />
            </div>
          </div>
        )}

        {/* ── Step 1: Create project ── */}
        {step === 1 && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: '#64748B', marginBottom: 24, lineHeight: 1.6 }}>
              Un projet = une tournée, un festival, une compagnie.
              Tu pourras en créer d'autres plus tard.
            </p>
            <div style={{ textAlign: 'left', marginBottom: 8 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: '#64748B', display: 'block', marginBottom: 4 }}>
                Nom du projet
              </label>
              <input
                className="input"
                value={projectName}
                onChange={e => setProjectName(e.target.value)}
                placeholder="Ex: Ma Tournée 2026"
                autoFocus
                style={{ fontSize: 16, padding: '14px 16px' }}
              />
            </div>
          </div>
        )}

        {/* ── Step 2: Choose role ── */}
        {step === 2 && (
          <div>
            <p style={{ fontSize: 14, color: '#64748B', marginBottom: 16, textAlign: 'center', lineHeight: 1.6 }}>
              Ton rôle détermine quels stocks tu vois en priorité.
            </p>
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr',
              gap: 8, maxHeight: '50vh', overflowY: 'auto', padding: '0 2px',
            }}>
              {roleOrder.map(code => {
                const conf = ROLE_CONF[code]
                if (!conf) return null
                const isSelected = selectedRole?.code === code
                return (
                  <button
                    key={code}
                    onClick={() => setSelectedRole({ code, id: code, ...conf })}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '12px 10px', borderRadius: 12, cursor: 'pointer',
                      border: `2px solid ${isSelected ? conf.color : '#E2E8F0'}`,
                      background: isSelected ? `${conf.color}10` : '#FFFFFF',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: `${conf.color}15`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {createElement(conf.icon, { size: 18, color: conf.color })}
                    </div>
                    <span style={{
                      fontSize: 12, fontWeight: 600, textAlign: 'left',
                      color: isSelected ? conf.color : '#1E293B',
                    }}>
                      {conf.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Navigation buttons ── */}
        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              className="btn-secondary"
              style={{ flex: 0, padding: '12px 16px' }}
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={!canAdvance || saving}
            className="btn-primary"
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '14px 20px', fontSize: 15,
              background: canAdvance ? STEPS[step].color : '#CBD5E1',
            }}
          >
            {saving ? (
              <><Loader2 size={18} className="spin" /> Un instant...</>
            ) : step === 2 ? (
              <><Sparkles size={18} /> C'est parti !</>
            ) : (
              <>Continuer <ArrowRight size={18} /></>
            )}
          </button>
        </div>
      </div>

      {/* Skip link */}
      <button
        onClick={() => {
          localStorage.setItem('onboarding_complete', 'true')
          onComplete(null)
        }}
        style={{
          marginTop: 24, fontSize: 12, color: '#94A3B8',
          background: 'none', border: 'none', cursor: 'pointer',
          textDecoration: 'underline',
        }}
      >
        Passer pour le moment
      </button>
    </div>
  )
}
