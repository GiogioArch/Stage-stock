import React, { useState, useEffect, createElement } from 'react'
import { db } from '../lib/supabase'
import { ROLE_CONF } from './RolePicker'
import {
  Music, ArrowRight, Check, Loader2, Sparkles, UserCheck, Star,
} from 'lucide-react'

// ───────────────────────────────────────────────────
// MÉLODIE — Assistante d'accueil pour les nouveaux
// Flow invité : Bienvenue → Accepter l'invitation → Choisir rôle → C'est parti
// Flow classique : Bienvenue → Prénom → Créer projet → Choisir rôle → C'est parti
// ───────────────────────────────────────────────────

const MELODIE_COLOR = '#8B5CF6'
const MELODIE_BG = '#F5F3FF'

function MelodieAvatar({ size = 56 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size / 2,
      background: `linear-gradient(135deg, ${MELODIE_COLOR}, #A78BFA)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: `0 4px 16px ${MELODIE_COLOR}30`,
    }}>
      <Music size={size * 0.45} color="#fff" />
    </div>
  )
}

function MelodieBubble({ children, delay = 0 }) {
  const [visible, setVisible] = useState(delay === 0)
  useEffect(() => {
    if (delay > 0) {
      const t = setTimeout(() => setVisible(true), delay)
      return () => clearTimeout(t)
    }
  }, [delay])

  return (
    <div style={{
      background: MELODIE_BG,
      border: `1px solid ${MELODIE_COLOR}20`,
      borderRadius: '4px 18px 18px 18px',
      padding: '14px 18px',
      fontSize: 14, color: '#1E293B', lineHeight: 1.6,
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(8px)',
      transition: 'all 0.4s ease',
    }}>
      {children}
    </div>
  )
}

function StepDots({ total, current, color }) {
  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 28 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          width: i === current ? 28 : 8, height: 8, borderRadius: 4,
          background: i <= current ? color : '#E2E8F0',
          transition: 'all 0.3s ease',
        }} />
      ))}
    </div>
  )
}

export default function MelodieWelcome({
  user,
  pendingInvitation, // { id, org_id, org_name, invited_by_name, module_access }
  onComplete,
  onToast,
}) {
  const isInvited = !!pendingInvitation
  const totalSteps = isInvited ? 3 : 4 // Invité: welcome → rôle → go | Nouveau: welcome → prénom → projet → rôle
  // Actually: invited = welcome, accept+role, go | new = welcome+name, project, role, go

  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)

  // Data
  const [displayName, setDisplayName] = useState(
    user?.user_metadata?.full_name || user?.email?.split('@')[0] || ''
  )
  const [selectedRole, setSelectedRole] = useState(null)

  const roleOrder = ['TM', 'PM', 'SE', 'LD', 'BL', 'SM', 'TD', 'MM', 'LOG', 'SAFE', 'AA', 'PA']

  // ─── INVITED FLOW ───
  if (isInvited) {
    const steps = ['welcome', 'role', 'done']

    const handleAcceptAndChooseRole = async () => {
      if (!selectedRole) return
      setSaving(true)
      try {
        // 1. Save display name
        try {
          await db.upsert('user_details', { user_id: user.id, first_name: displayName.trim() })
        } catch {
          try { await db.insert('user_details', { user_id: user.id, first_name: displayName.trim() }) }
          catch { /* silent */ }
        }

        // 2. Claim the invitation — update placeholder to real user
        await db.update('project_members', `id=eq.${pendingInvitation.id}`, {
          user_id: user.id,
          status: 'active',
        })

        // 3. Save role
        try {
          await db.upsert('user_profiles', {
            user_id: user.id,
            role_id: selectedRole.code,
            org_id: pendingInvitation.org_id,
          })
        } catch {
          try {
            await db.insert('user_profiles', {
              user_id: user.id,
              role_id: selectedRole.code,
              org_id: pendingInvitation.org_id,
            })
          } catch { /* silent */ }
        }

        localStorage.setItem('onboarding_complete', 'true')
        setStep(2) // Show "done" briefly
        setTimeout(() => onComplete({
          org_id: pendingInvitation.org_id,
          org: { name: pendingInvitation.org_name },
        }), 1500)
      } catch (e) {
        onToast?.('Erreur: ' + e.message, '#DC2626')
      } finally {
        setSaving(false)
      }
    }

    return (
      <div style={{
        minHeight: '100dvh', background: '#FFFFFF',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '24px 20px',
      }}>
        <StepDots total={3} current={step} color={MELODIE_COLOR} />

        {/* ── Step 0: Welcome ── */}
        {step === 0 && (
          <div style={{ textAlign: 'center', maxWidth: 360, width: '100%' }}>
            <MelodieAvatar />
            <div style={{ marginTop: 20, marginBottom: 16 }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1E293B', marginBottom: 4 }}>
                Salut ! Moi c'est Mélodie
              </h1>
              <p style={{ fontSize: 13, color: '#94A3B8' }}>
                Ton assistante backstage
              </p>
            </div>

            <MelodieBubble>
              <strong>{pendingInvitation.invited_by_name || 'Un membre'}</strong> t'invite à rejoindre
              le projet <strong>{pendingInvitation.org_name}</strong> sur Stage Stock.
              <br /><br />
              Stage Stock, c'est l'outil qui gère les stocks,
              prépare les concerts et anticipe les manques.
              Tout depuis ton téléphone.
            </MelodieBubble>

            <div style={{ marginTop: 20, textAlign: 'left' }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: '#64748B', display: 'block', marginBottom: 4 }}>
                Comment on t'appelle ?
              </label>
              <input
                className="input"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Ton prénom"
                autoFocus
                style={{ fontSize: 16, padding: '14px 16px', textAlign: 'center' }}
              />
            </div>

            <button
              onClick={() => displayName.trim() && setStep(1)}
              disabled={!displayName.trim()}
              style={{
                marginTop: 16, width: '100%', padding: '14px 20px',
                borderRadius: 12, border: 'none', cursor: 'pointer',
                background: displayName.trim() ? MELODIE_COLOR : '#CBD5E1',
                color: '#fff', fontSize: 15, fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              Rejoindre le projet <ArrowRight size={18} />
            </button>
          </div>
        )}

        {/* ── Step 1: Choose role ── */}
        {step === 1 && (
          <div style={{ maxWidth: 400, width: '100%' }}>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <MelodieAvatar size={44} />
              <MelodieBubble delay={200}>
                Super {displayName} ! Dernière étape : quel est ton rôle dans l'équipe ?
                Ça me permettra de personnaliser ton interface.
              </MelodieBubble>
            </div>

            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr',
              gap: 8, maxHeight: '45vh', overflowY: 'auto', padding: '0 2px',
            }}>
              {roleOrder.map(code => {
                const conf = ROLE_CONF[code]
                if (!conf) return null
                const isSelected = selectedRole?.code === code
                return (
                  <button
                    key={code}
                    onClick={() => setSelectedRole({ code, ...conf })}
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
                    {isSelected && (
                      <Check size={14} color={conf.color} style={{ marginLeft: 'auto' }} />
                    )}
                  </button>
                )
              })}
            </div>

            <button
              onClick={handleAcceptAndChooseRole}
              disabled={!selectedRole || saving}
              style={{
                marginTop: 16, width: '100%', padding: '14px 20px',
                borderRadius: 12, border: 'none', cursor: 'pointer',
                background: selectedRole ? (selectedRole.color || MELODIE_COLOR) : '#CBD5E1',
                color: '#fff', fontSize: 15, fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? (
                <><Loader2 size={18} className="spin" /> Un instant...</>
              ) : selectedRole ? (
                <><UserCheck size={18} /> C'est parti en tant que {selectedRole.label} !</>
              ) : (
                'Choisis ton rôle'
              )}
            </button>
          </div>
        )}

        {/* ── Step 2: Done ── */}
        {step === 2 && (
          <div style={{ textAlign: 'center', maxWidth: 320 }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: '#10B98115', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <Sparkles size={36} color="#10B981" />
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1E293B', marginBottom: 8 }}>
              Bienvenue dans l'équipe !
            </h1>
            <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6 }}>
              Tu fais maintenant partie de <strong>{pendingInvitation.org_name}</strong>.
              Mélodie t'accompagne si tu as besoin.
            </p>
          </div>
        )}
      </div>
    )
  }

  // ─── NON-INVITED FLOW (new user, no projects) ───
  // Mélodie personality on standard onboarding
  const ALL_MODULES = ['dashboard', 'equipe', 'articles', 'depots', 'stock', 'tournee', 'alertes', 'finance', 'forecast']
  const [projectName, setProjectName] = useState('')
  const [createdOrg, setCreatedOrg] = useState(null)

  const stepsNew = ['welcome', 'project', 'role', 'done']

  const handleNextNew = async () => {
    setSaving(true)
    try {
      if (step === 0) {
        // Save display name
        if (!displayName.trim()) return
        try {
          await db.upsert('user_details', { user_id: user.id, first_name: displayName.trim() })
        } catch {
          try { await db.insert('user_details', { user_id: user.id, first_name: displayName.trim() }) }
          catch { /* silent */ }
        }
        setStep(1)
      } else if (step === 1) {
        // Création atomique via RPC (org + membership en 1 transaction)
        if (!projectName.trim()) return
        const slug = projectName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30)
        const uniqueSlug = `${slug || 'projet'}-${Date.now().toString(36)}`
        const result = await db.rpc('create_project', {
          p_name: projectName.trim(),
          p_slug: uniqueSlug,
          p_modules: ALL_MODULES,
        })
        if (!result || result.error) {
          throw new Error(result?.error || 'Création échouée')
        }
        setCreatedOrg({ id: result.org_id, name: result.org_name })
        setStep(2)
      } else if (step === 2) {
        // Save role
        if (!selectedRole || !createdOrg) return
        try {
          await db.upsert('user_profiles', {
            user_id: user.id,
            role_id: selectedRole.code,
            org_id: createdOrg.id,
          })
        } catch {
          try {
            await db.insert('user_profiles', {
              user_id: user.id,
              role_id: selectedRole.code,
              org_id: createdOrg.id,
            })
          } catch { /* silent */ }
        }
        localStorage.setItem('onboarding_complete', 'true')
        setStep(3)
        setTimeout(() => onComplete({
          org_id: createdOrg.id,
          org: { name: createdOrg.name },
        }), 1500)
      }
    } catch (e) {
      onToast?.('Erreur: ' + e.message, '#DC2626')
    } finally {
      setSaving(false)
    }
  }

  const canAdvanceNew = step === 0 ? displayName.trim().length > 0
    : step === 1 ? projectName.trim().length > 0
    : step === 2 ? selectedRole !== null
    : false

  return (
    <div style={{
      minHeight: '100dvh', background: '#FFFFFF',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '24px 20px',
    }}>
      <StepDots total={4} current={step} color={MELODIE_COLOR} />

      {/* ── Step 0: Welcome + name ── */}
      {step === 0 && (
        <div style={{ textAlign: 'center', maxWidth: 360, width: '100%' }}>
          <MelodieAvatar />
          <div style={{ marginTop: 20, marginBottom: 16 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1E293B', marginBottom: 4 }}>
              Salut ! Moi c'est Mélodie
            </h1>
            <p style={{ fontSize: 13, color: '#94A3B8' }}>
              Ton assistante backstage
            </p>
          </div>

          <MelodieBubble>
            Stage Stock, c'est l'appli qui gère tes stocks,
            prépare tes concerts et anticipe les ruptures.
            Tout depuis ton téléphone, en 30 secondes tu es prêt.
          </MelodieBubble>

          <div style={{ marginTop: 20, textAlign: 'left' }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: '#64748B', display: 'block', marginBottom: 4 }}>
              Comment on t'appelle ?
            </label>
            <input
              className="input"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Ton prénom"
              autoFocus
              style={{ fontSize: 16, padding: '14px 16px', textAlign: 'center' }}
            />
          </div>

          <button
            onClick={handleNextNew}
            disabled={!canAdvanceNew || saving}
            style={{
              marginTop: 16, width: '100%', padding: '14px 20px',
              borderRadius: 12, border: 'none', cursor: 'pointer',
              background: canAdvanceNew ? MELODIE_COLOR : '#CBD5E1',
              color: '#fff', fontSize: 15, fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {saving ? <Loader2 size={18} className="spin" /> : <>Continuer <ArrowRight size={18} /></>}
          </button>
        </div>
      )}

      {/* ── Step 1: Create project ── */}
      {step === 1 && (
        <div style={{ textAlign: 'center', maxWidth: 360, width: '100%' }}>
          <div style={{ marginBottom: 16 }}>
            <MelodieAvatar size={44} />
            <MelodieBubble delay={200}>
              Parfait {displayName} ! Maintenant, crée ton premier projet.
              Un projet = une tournée, un festival, une compagnie.
            </MelodieBubble>
          </div>

          <div style={{ textAlign: 'left' }}>
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

          <button
            onClick={handleNextNew}
            disabled={!canAdvanceNew || saving}
            style={{
              marginTop: 16, width: '100%', padding: '14px 20px',
              borderRadius: 12, border: 'none', cursor: 'pointer',
              background: canAdvanceNew ? MELODIE_COLOR : '#CBD5E1',
              color: '#fff', fontSize: 15, fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {saving ? <Loader2 size={18} className="spin" /> : <>Créer le projet <ArrowRight size={18} /></>}
          </button>
        </div>
      )}

      {/* ── Step 2: Choose role ── */}
      {step === 2 && (
        <div style={{ maxWidth: 400, width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <MelodieAvatar size={44} />
            <MelodieBubble delay={200}>
              Dernière étape ! Quel est ton rôle dans l'équipe ?
            </MelodieBubble>
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr',
            gap: 8, maxHeight: '45vh', overflowY: 'auto', padding: '0 2px',
          }}>
            {roleOrder.map(code => {
              const conf = ROLE_CONF[code]
              if (!conf) return null
              const isSelected = selectedRole?.code === code
              return (
                <button
                  key={code}
                  onClick={() => setSelectedRole({ code, ...conf })}
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
                  {isSelected && (
                    <Check size={14} color={conf.color} style={{ marginLeft: 'auto' }} />
                  )}
                </button>
              )
            })}
          </div>

          <button
            onClick={handleNextNew}
            disabled={!canAdvanceNew || saving}
            style={{
              marginTop: 16, width: '100%', padding: '14px 20px',
              borderRadius: 12, border: 'none', cursor: 'pointer',
              background: selectedRole ? (selectedRole.color || MELODIE_COLOR) : '#CBD5E1',
              color: '#fff', fontSize: 15, fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? (
              <><Loader2 size={18} className="spin" /> Un instant...</>
            ) : selectedRole ? (
              <><Sparkles size={18} /> C'est parti !</>
            ) : (
              'Choisis ton rôle'
            )}
          </button>
        </div>
      )}

      {/* ── Step 3: Done ── */}
      {step === 3 && (
        <div style={{ textAlign: 'center', maxWidth: 320 }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: '#10B98115', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <Star size={36} color="#10B981" />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1E293B', marginBottom: 8 }}>
            Tout est prêt !
          </h1>
          <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6 }}>
            Bienvenue sur <strong>{createdOrg?.name}</strong>, {displayName}.
            Mélodie t'accompagne si tu as besoin.
          </p>
        </div>
      )}

      {/* Skip */}
      {step < 3 && (
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
      )}
    </div>
  )
}
