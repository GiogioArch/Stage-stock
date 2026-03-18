import React, { useState, useEffect, createElement, useCallback } from 'react'
import { auth, db } from '../lib/supabase'
import { ROLE_CONF, getInheritedModules } from './RolePicker'
import {
  Loader2, Eye, EyeOff, Check, Package, Mail,
} from 'lucide-react'

// ─── Design tokens ───
const C = {
  accent: '#6366F1',
  melodie: '#8B5CF6',
  text: '#1E293B',
  textSoft: '#64748B',
  textMuted: '#94A3B8',
  bg: '#FFFFFF',
  surface: '#F8FAFC',
  border: '#E2E8F0',
}

const ALL_MODULES = ['dashboard', 'equipe', 'articles', 'depots', 'stock', 'tournee', 'alertes', 'finance', 'forecast']

// Auto-advance map: step → { next, delay }
const AUTO_ADVANCE = {
  splash: { next: 'choice', delay: 3500 },
  bonjour: { next: 'je_mappelle', delay: 2200 },
  je_mappelle: { next: 'assistante', delay: 2500 },
  assistante: { next: 'comment_tu_tappelles', delay: 2200 },
  enchante: { next: 'bienvenue', delay: 2200 },
  bienvenue: { next: 'suis_moi', delay: 3000 },
  suis_moi: { next: 'inscription_intro', delay: 2200 },
  inscription_intro: { next: 'signup', delay: 2500 },
  inscrit: { next: 'en_savoir_plus', delay: 2500 },
  en_savoir_plus: { next: 'select_roles_intro', delay: 2200 },
  select_roles_intro: { next: 'select_roles', delay: 2500 },
  roles_confirm: { next: 'project_intro', delay: 2200 },
  project_intro: { next: 'project_create', delay: 2500 },
}

// ─── Centered fade-in text ───
function FadeText({ children, size = 28, color = C.text, delay = 0, sub = false }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(t)
  }, [delay])

  return (
    <div style={{
      fontSize: sub ? 15 : size,
      fontWeight: sub ? 400 : 600,
      color: sub ? C.textSoft : color,
      textAlign: 'center',
      lineHeight: 1.5,
      maxWidth: 320,
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(20px)',
      transition: 'opacity 0.6s ease, transform 0.6s ease',
    }}>
      {children}
    </div>
  )
}

// ─── Centered screen wrapper ───
function Screen({ children, top, step, onSkip }) {
  return (
    <div style={{
      minHeight: '100dvh', background: C.bg,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: top ? 'flex-start' : 'center',
      padding: top ? '60px 24px 24px' : 24,
      gap: 16,
    }}>
      {children}
      {step !== 'cest_parti' && (
        <button onClick={onSkip} style={{
          position: 'fixed', bottom: 20, fontSize: 11, color: C.textMuted,
          background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline',
        }}>
          Passer
        </button>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════
// MAIN — Cinematic onboarding
// ═══════════════════════════════════════════════
export default function Melodie({ onAuth, onComplete, roles, onToast, existingUser, startStep }) {
  const [step, setStep] = useState(startStep || 'splash')
  const [user, setUser] = useState(existingUser || null)

  // Form state
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState('')
  const [selectedRoles, setSelectedRoles] = useState([])
  const [projectName, setProjectName] = useState('')
  const [saving, setSaving] = useState(false)
  const [createdOrg, setCreatedOrg] = useState(null)
  const [createdMembership, setCreatedMembership] = useState(null)

  // ─── Single top-level effect for auto-advancing ───
  useEffect(() => {
    const rule = AUTO_ADVANCE[step]
    if (!rule) return
    const t = setTimeout(() => setStep(rule.next), rule.delay)
    return () => clearTimeout(t)
  }, [step])

  // ─── Special effect for "cest_parti" (finish + redirect) ───
  useEffect(() => {
    if (step !== 'cest_parti') return
    const t = setTimeout(() => {
      onAuth(user)
      if (createdMembership) onComplete(createdMembership)
      else onComplete(null)
    }, 2500)
    return () => clearTimeout(t)
  }, [step])

  // ─── Skip handler ───
  const handleSkip = useCallback(() => {
    localStorage.setItem('onboarding_complete', 'true')
    if (user) { onAuth(user); onComplete(null) }
    else setStep('login')
  }, [user, onAuth, onComplete])

  // ─── Auth handlers ───
  const handleSignup = async () => {
    if (!email || !password) return setAuthError('Email et mot de passe requis')
    if (password.length < 6) return setAuthError('6 caractères minimum')
    setAuthLoading(true)
    setAuthError('')
    try {
      const data = await auth.signUp(email, password)
      if (data.error) { setAuthError(data.error_description || data.error); return }
      // Toujours demander la verification email — ne PAS auto-login
      setStep('verify_email')
    } catch (e) { setAuthError(e.message || 'Erreur réseau') }
    finally { setAuthLoading(false) }
  }

  const handleLogin = async () => {
    if (!email || !password) return setAuthError('Email et mot de passe requis')
    setAuthLoading(true)
    setAuthError('')
    try {
      const data = await auth.signIn(email, password)
      if (data.error) { setAuthError(data.error_description || data.error); return }
      if (data.access_token) {
        const u = data.user
        setUser(u)
        // Sauvegarder le prenom si renseigne pendant l'onboarding
        if (displayName.trim()) {
          try { await db.upsert('user_details', { user_id: u.id, first_name: displayName.trim() }) }
          catch { try { await db.insert('user_details', { user_id: u.id, first_name: displayName.trim() }) } catch {} }
        }
        onAuth(u)
      }
    } catch (e) { setAuthError(e.message || 'Erreur réseau') }
    finally { setAuthLoading(false) }
  }

  const handleRolesConfirm = () => {
    if (selectedRoles.length === 0) return
    setStep('roles_confirm')
  }

  const handleProjectCreate = async () => {
    if (!projectName.trim() || !user) return
    setSaving(true)
    try {
      const slug = projectName.trim().toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 30)
      const orgs = await db.insert('organizations', { name: projectName.trim(), slug: slug || 'projet' })
      const org = orgs[0]
      setCreatedOrg(org)
      const primaryRole = selectedRoles[0] || null
      const moduleAccess = primaryRole ? getInheritedModules(primaryRole) : ALL_MODULES
      const members = await db.insert('project_members', {
        user_id: user.id, org_id: org.id,
        module_access: moduleAccess, is_admin: true, status: 'active', role_id: primaryRole,
      })
      setCreatedMembership({ ...members[0], org })
      if (primaryRole) {
        try { await db.upsert('user_profiles', { user_id: user.id, role_id: primaryRole, org_id: org.id }) }
        catch { try { await db.insert('user_profiles', { user_id: user.id, role_id: primaryRole, org_id: org.id }) } catch {} }
      }
      localStorage.setItem('onboarding_complete', 'true')
      setStep('cest_parti')
    } catch (e) { onToast?.('Erreur: ' + e.message, '#DC2626') }
    finally { setSaving(false) }
  }

  // ═══════════════════════════════════════════════
  // RENDER — based on current step
  // ═══════════════════════════════════════════════

  // 0. Splash — logo + nom de l'appli
  if (step === 'splash') {
    return (
      <div style={{
        minHeight: '100dvh', background: C.bg,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 20,
      }}>
        <div style={{
          width: 80, height: 80, borderRadius: 24,
          background: `linear-gradient(135deg, ${C.accent}, ${C.melodie})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: 0, animation: 'fadeSlideUp 0.8s ease 0.3s forwards',
          boxShadow: `0 8px 32px ${C.accent}30`,
        }}>
          {createElement(Package, { size: 36, color: 'white' })}
        </div>
        <FadeText size={32} color={C.text} delay={800}>Stage Stock</FadeText>
        <FadeText sub delay={1200}>Gestion de stock pour le spectacle vivant</FadeText>
      </div>
    )
  }

  // 0b. Choice — Première connexion / Se connecter
  if (step === 'choice') {
    return (
      <div style={{
        minHeight: '100dvh', background: C.bg,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: 24, gap: 16,
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: 18,
          background: `linear-gradient(135deg, ${C.accent}, ${C.melodie})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 8, boxShadow: `0 4px 16px ${C.accent}20`,
          opacity: 0, animation: 'fadeSlideUp 0.6s ease forwards',
        }}>
          {createElement(Package, { size: 26, color: 'white' })}
        </div>
        <div style={{
          opacity: 0, animation: 'fadeSlideUp 0.6s ease 0.2s forwards',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.text }}>Stage Stock</div>
        </div>
        <div style={{
          width: '100%', maxWidth: 320, marginTop: 32,
          display: 'flex', flexDirection: 'column', gap: 12,
          opacity: 0, animation: 'fadeSlideUp 0.6s ease 0.5s forwards',
        }}>
          <button onClick={() => setStep('bonjour')} style={{
            width: '100%', padding: '16px', borderRadius: 14,
            background: C.accent, color: 'white', fontSize: 16, fontWeight: 600,
            border: 'none', cursor: 'pointer', transition: 'all 0.15s',
          }}>
            Première connexion
          </button>
          <button onClick={() => setStep('login')} style={{
            width: '100%', padding: '16px', borderRadius: 14,
            background: 'transparent', color: C.text, fontSize: 16, fontWeight: 500,
            border: `1px solid ${C.border}`, cursor: 'pointer', transition: 'all 0.15s',
          }}>
            Se connecter
          </button>
        </div>
      </div>
    )
  }

  // 1. Bonjour
  if (step === 'bonjour') {
    return (
      <Screen step={step} onSkip={handleSkip}>
        <FadeText size={32}>Bonjour</FadeText>
      </Screen>
    )
  }

  // 2. Je m'appelle Melodie
  if (step === 'je_mappelle') {
    return (
      <Screen step={step} onSkip={handleSkip}>
        <FadeText size={24}>Je m'appelle</FadeText>
        <FadeText size={32} color={C.melodie} delay={400}>Melodie</FadeText>
      </Screen>
    )
  }

  // 3. Je suis ton assistante
  if (step === 'assistante') {
    return (
      <Screen step={step} onSkip={handleSkip}>
        <FadeText size={20}>Je suis ton assistante</FadeText>
      </Screen>
    )
  }

  // 4. Comment tu t'appelles ?
  if (step === 'comment_tu_tappelles') {
    return (
      <Screen step={step} onSkip={handleSkip}>
        <FadeText size={22}>Comment tu t'appelles ?</FadeText>
        <div style={{ width: '100%', maxWidth: 300, marginTop: 16, opacity: 0, animation: 'fadeSlideUp 0.6s ease 0.6s forwards' }}>
          <input className="input" placeholder="Ton prénom ou pseudo" value={displayName}
            onChange={e => setDisplayName(e.target.value)} autoFocus
            onKeyDown={e => e.key === 'Enter' && displayName.trim() && setStep('enchante')}
            style={{ fontSize: 18, padding: '14px 16px', borderRadius: 14, textAlign: 'center' }} />
          {displayName.trim() && (
            <button onClick={() => setStep('enchante')} style={{
              width: '100%', marginTop: 12, padding: '14px', borderRadius: 14,
              background: C.accent, color: 'white', fontSize: 16, fontWeight: 600,
              border: 'none', cursor: 'pointer',
            }}>Continuer</button>
          )}
        </div>
      </Screen>
    )
  }

  // 5. Enchante PRENOM !
  if (step === 'enchante') {
    return (
      <Screen step={step} onSkip={handleSkip}>
        <FadeText size={28}>Enchantée, {displayName} !</FadeText>
      </Screen>
    )
  }

  // 6. Bienvenue dans Stage Stock
  if (step === 'bienvenue') {
    return (
      <Screen step={step} onSkip={handleSkip}>
        <FadeText size={22}>Bienvenue dans</FadeText>
        <FadeText size={28} color={C.accent} delay={300}>Stage Stock</FadeText>
        <FadeText sub delay={700}>La webapp dédiée aux professionnels du spectacle vivant</FadeText>
      </Screen>
    )
  }

  // 7. Suis-moi
  if (step === 'suis_moi') {
    return (
      <Screen step={step} onSkip={handleSkip}>
        <FadeText size={20}>Suis-moi, je vais te montrer</FadeText>
      </Screen>
    )
  }

  // 8. Commence par t'inscrire
  if (step === 'inscription_intro') {
    return (
      <Screen step={step} onSkip={handleSkip}>
        <FadeText size={18}>Commence par t'inscrire avec</FadeText>
        <FadeText size={18} delay={300}>une adresse mail et un mot de passe</FadeText>
      </Screen>
    )
  }

  // 9. Signup form
  if (step === 'signup') {
    return (
      <Screen step={step} onSkip={handleSkip}>
        <FadeText size={20}>Inscription</FadeText>
        <div style={{
          width: '100%', maxWidth: 320, marginTop: 8,
          opacity: 0, animation: 'fadeSlideUp 0.6s ease 0.4s forwards',
        }}>
          {authError && (
            <div style={{
              padding: '8px 12px', borderRadius: 10, marginBottom: 10,
              background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.15)',
              color: '#DC2626', fontSize: 13,
            }}>{authError}</div>
          )}
          <div style={{ marginBottom: 12 }}>
            <input className="input" type="email" placeholder="Email" value={email}
              onChange={e => setEmail(e.target.value)} autoComplete="email" autoFocus
              style={{ fontSize: 16, padding: '14px 16px', borderRadius: 14 }} />
          </div>
          <div style={{ marginBottom: 16, position: 'relative' }}>
            <input className="input" type={showPwd ? 'text' : 'password'} placeholder="Mot de passe (6 car. min)"
              value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password"
              onKeyDown={e => e.key === 'Enter' && handleSignup()}
              style={{ fontSize: 16, padding: '14px 16px', paddingRight: 48, borderRadius: 14 }} />
            <button onClick={() => setShowPwd(!showPwd)} style={{
              position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted,
            }}>
              {createElement(showPwd ? EyeOff : Eye, { size: 18 })}
            </button>
          </div>
          <button onClick={handleSignup} disabled={authLoading} style={{
            width: '100%', padding: '16px', borderRadius: 14,
            background: C.accent, color: 'white', fontSize: 16, fontWeight: 600,
            border: 'none', cursor: 'pointer', opacity: authLoading ? 0.6 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            {authLoading ? <>{createElement(Loader2, { size: 16, className: 'spin' })} Inscription...</> : "S'inscrire"}
          </button>
        </div>
      </Screen>
    )
  }

  // 9b. Vérification email
  if (step === 'verify_email') {
    return (
      <Screen step={step} onSkip={handleSkip}>
        <div style={{
          width: 56, height: 56, borderRadius: 28,
          background: `${C.accent}12`, display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: 0, animation: 'fadeSlideUp 0.6s ease forwards',
        }}>
          {createElement(Mail, { size: 28, color: C.accent })}
        </div>
        <FadeText size={20} delay={200}>Vérifie ton email</FadeText>
        <FadeText sub delay={500}>
          Un lien de confirmation a été envoyé à {email}. Clique dessus pour activer ton compte.
        </FadeText>
        <div style={{
          width: '100%', maxWidth: 320, marginTop: 24,
          opacity: 0, animation: 'fadeSlideUp 0.6s ease 0.8s forwards',
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          <button onClick={() => { setAuthError(''); setStep('login') }} style={{
            width: '100%', padding: '16px', borderRadius: 14,
            background: C.accent, color: 'white', fontSize: 16, fontWeight: 600,
            border: 'none', cursor: 'pointer',
          }}>
            J'ai confirmé, me connecter
          </button>
          <div style={{ fontSize: 12, color: C.textMuted, textAlign: 'center', marginTop: 4 }}>
            Vérifie aussi tes spams si tu ne trouves pas l'email
          </div>
        </div>
      </Screen>
    )
  }

  // 9c. Login form
  if (step === 'login') {
    return (
      <Screen step={step} onSkip={handleSkip}>
        <FadeText size={20}>Contente de te revoir</FadeText>
        <div style={{
          width: '100%', maxWidth: 320, marginTop: 8,
          opacity: 0, animation: 'fadeSlideUp 0.6s ease 0.4s forwards',
        }}>
          {authError && (
            <div style={{
              padding: '8px 12px', borderRadius: 10, marginBottom: 10,
              background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.15)',
              color: '#DC2626', fontSize: 13,
            }}>{authError}</div>
          )}
          <div style={{ marginBottom: 12 }}>
            <input className="input" type="email" placeholder="Email" value={email}
              onChange={e => setEmail(e.target.value)} autoComplete="email" autoFocus
              style={{ fontSize: 16, padding: '14px 16px', borderRadius: 14 }} />
          </div>
          <div style={{ marginBottom: 16, position: 'relative' }}>
            <input className="input" type={showPwd ? 'text' : 'password'} placeholder="Mot de passe"
              value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password"
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              style={{ fontSize: 16, padding: '14px 16px', paddingRight: 48, borderRadius: 14 }} />
            <button onClick={() => setShowPwd(!showPwd)} style={{
              position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted,
            }}>
              {createElement(showPwd ? EyeOff : Eye, { size: 18 })}
            </button>
          </div>
          <button onClick={handleLogin} disabled={authLoading} style={{
            width: '100%', padding: '16px', borderRadius: 14,
            background: C.accent, color: 'white', fontSize: 16, fontWeight: 600,
            border: 'none', cursor: 'pointer', opacity: authLoading ? 0.6 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            {authLoading ? <>{createElement(Loader2, { size: 16, className: 'spin' })} Connexion...</> : 'Se connecter'}
          </button>
          <button onClick={() => { setStep('bonjour'); setAuthError('') }} style={{
            marginTop: 10, fontSize: 13, color: C.accent, background: 'none',
            border: 'none', cursor: 'pointer', width: '100%', textAlign: 'center',
          }}>
            Première connexion ?
          </button>
        </div>
      </Screen>
    )
  }

  // 10. Super ! Tu es inscrit
  if (step === 'inscrit') {
    return (
      <Screen step={step} onSkip={handleSkip}>
        <div style={{
          width: 56, height: 56, borderRadius: 28,
          background: '#10B98115', display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: 0, animation: 'fadeSlideUp 0.6s ease forwards',
        }}>
          {createElement(Check, { size: 28, color: '#10B981' })}
        </div>
        <FadeText size={24} delay={200}>Super !</FadeText>
        <FadeText size={24} delay={500}>Tu es inscrit</FadeText>
      </Screen>
    )
  }

  // 11. Je veux en savoir plus sur toi
  if (step === 'en_savoir_plus') {
    return (
      <Screen step={step} onSkip={handleSkip}>
        <FadeText size={18}>Maintenant je veux en savoir</FadeText>
        <FadeText size={18} delay={300}>plus sur toi</FadeText>
      </Screen>
    )
  }

  // 12. Sélectionne ton métier (intro)
  if (step === 'select_roles_intro') {
    return (
      <Screen step={step} onSkip={handleSkip}>
        <FadeText size={17}>Sélectionne ton métier</FadeText>
        <FadeText size={15} color={C.textSoft} delay={300}>Tu peux en choisir plusieurs si tu es polyvalent</FadeText>
      </Screen>
    )
  }

  // 13. Role grid
  if (step === 'select_roles') {
    return (
      <Screen step={step} onSkip={handleSkip} top>
        <FadeText size={18}>Quel est ton métier ?</FadeText>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
          width: '100%', maxWidth: 360, marginTop: 8,
          opacity: 0, animation: 'fadeSlideUp 0.5s ease 0.3s forwards',
        }}>
          {['TM', 'PM', 'TD', 'SE', 'LD', 'SM', 'BL', 'MM', 'LOG', 'SAFE', 'AA', 'PA'].map(code => {
            const conf = ROLE_CONF[code]
            if (!conf) return null
            const sel = selectedRoles.includes(code)
            return (
              <button key={code} onClick={() => {
                setSelectedRoles(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code])
              }} style={{
                padding: '10px 8px', borderRadius: 12, cursor: 'pointer',
                border: `2px solid ${sel ? conf.color : C.border}`,
                background: sel ? `${conf.color}10` : 'white',
                display: 'flex', alignItems: 'center', gap: 8,
                transition: 'all 0.15s', position: 'relative',
              }}>
                {sel && (
                  <div style={{
                    position: 'absolute', top: 4, right: 4, width: 16, height: 16, borderRadius: 8,
                    background: conf.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{createElement(Check, { size: 10, color: 'white', strokeWidth: 3 })}</div>
                )}
                <div style={{
                  width: 32, height: 32, borderRadius: 8, background: `${conf.color}15`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  {createElement(conf.icon, { size: 16, color: sel ? conf.color : C.textMuted })}
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: sel ? conf.color : C.text, textAlign: 'left' }}>
                  {conf.label}
                </span>
              </button>
            )
          })}
        </div>
        {selectedRoles.length > 0 && (
          <button onClick={handleRolesConfirm} style={{
            marginTop: 12, width: '100%', maxWidth: 360, padding: '14px',
            borderRadius: 14, background: C.accent, color: 'white',
            fontSize: 16, fontWeight: 600, border: 'none', cursor: 'pointer',
          }}>
            Valider ({selectedRoles.length})
          </button>
        )}
      </Screen>
    )
  }

  // 14. Roles confirmed
  if (step === 'roles_confirm') {
    const labels = selectedRoles.map(r => ROLE_CONF[r]?.label).filter(Boolean).join(', ')
    return (
      <Screen step={step} onSkip={handleSkip}>
        <FadeText size={20}>Parfait !</FadeText>
        <FadeText size={16} color={C.textSoft} delay={300}>{labels}</FadeText>
      </Screen>
    )
  }

  // 15. Dernière étape (intro)
  if (step === 'project_intro') {
    return (
      <Screen step={step} onSkip={handleSkip}>
        <FadeText size={18}>Dernière étape</FadeText>
        <FadeText size={16} color={C.textSoft} delay={400}>Donne un nom à ton premier projet</FadeText>
      </Screen>
    )
  }

  // 16. Project name
  if (step === 'project_create') {
    return (
      <Screen step={step} onSkip={handleSkip}>
        <FadeText size={18}>Ton projet</FadeText>
        <FadeText sub delay={200}>Une tournée, un festival, une compagnie...</FadeText>
        <div style={{
          width: '100%', maxWidth: 320, marginTop: 12,
          opacity: 0, animation: 'fadeSlideUp 0.6s ease 0.5s forwards',
        }}>
          <input className="input" placeholder="Ex: EK Tour 2026" value={projectName}
            onChange={e => setProjectName(e.target.value)} autoFocus
            onKeyDown={e => e.key === 'Enter' && projectName.trim() && handleProjectCreate()}
            style={{ fontSize: 18, padding: '14px 16px', borderRadius: 14, textAlign: 'center' }} />
          {projectName.trim() && (
            <button onClick={handleProjectCreate} disabled={saving} style={{
              width: '100%', marginTop: 12, padding: '14px', borderRadius: 14,
              background: C.accent, color: 'white', fontSize: 16, fontWeight: 600,
              border: 'none', cursor: 'pointer', opacity: saving ? 0.6 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              {saving ? createElement(Loader2, { size: 16, className: 'spin' }) : 'Créer'}
            </button>
          )}
          <button onClick={() => {
            localStorage.setItem('onboarding_complete', 'true')
            onAuth(user); onComplete(null)
          }} style={{
            marginTop: 10, fontSize: 12, color: C.textMuted, background: 'none',
            border: 'none', cursor: 'pointer', width: '100%', textAlign: 'center',
          }}>Plus tard</button>
        </div>
      </Screen>
    )
  }

  // 17. C'est parti !
  if (step === 'cest_parti') {
    return (
      <Screen step={step} onSkip={handleSkip}>
        <FadeText size={26}>C'est parti, {displayName} !</FadeText>
        <FadeText sub delay={400}>Je serai toujours là si tu as besoin</FadeText>
      </Screen>
    )
  }

  return null
}
