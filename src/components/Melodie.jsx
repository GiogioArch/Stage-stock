import React, { useState, useEffect, createElement, useCallback } from 'react'
import { auth, db } from '../lib/supabase'
import { ROLE_CONF, getInheritedModules } from './RolePicker'
import { ROLES_BY_FILIERE, ROLE_PROFILES } from '../config/roles'
import { buildBoardConfigFromRoles } from '../config/boardPresets'
import {
  Loader2, Eye, EyeOff, Check, Package, Mail, ChevronLeft, Lightbulb,
} from 'lucide-react'
import { useToast } from '../shared/hooks'

// ─── Design tokens (palette harmonisée) ───
const C = {
  accent: '#5B8DB8',
  melodie: '#8B6DB8',
  // Premium purple gradient endpoints
  purple: '#8B5CF6',
  purpleDeep: '#5B21B6',
  gradient: 'linear-gradient(135deg, #8B5CF6 0%, #5B21B6 100%)',
  text: '#1E293B',
  textSoft: '#64748B',
  textMuted: '#94A3B8',
  bg: '#FFFFFF',
  surface: '#F8FAFC',
  border: '#E2E8F0',
  success: '#5DAB8B',
  danger: '#D4648A',
}

const ALL_MODULES = ['dashboard', 'equipe', 'articles', 'stock', 'tournee', 'finance', 'forecast']

// Parcours raccourci : 8 étapes au lieu de 18
// splash (3s) → choice → bonjour (2s) → signup/login → verify → roles → project → go
const AUTO_ADVANCE = {
  splash: { next: 'choice', delay: 3000 },
  bonjour: { next: 'signup', delay: 2000 },
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
      fontSize: sub ? 14 : size,
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
// hideSkip: cache le bouton "Passer" (force l'utilisateur a completer le flow)
function Screen({ children, top, step, onSkip, hideSkip }) {
  const showSkip = step !== 'cest_parti' && step !== 'signup' && !hideSkip
  return (
    <div style={{
      minHeight: '100dvh', background: C.bg,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: top ? 'flex-start' : 'center',
      padding: top ? '60px 24px 24px' : 24,
      gap: 16,
    }}>
      {children}
      {showSkip && (
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

// ─── Micro-victory inline feedback (petit ✓ vert sous un input) ───
function MicroVictory({ show, label }) {
  if (!show) return null
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      fontSize: 12, color: '#5DAB8B', fontWeight: 600,
      marginTop: 4, marginLeft: 4,
      opacity: 0, animation: 'fadeSlideUp 0.3s ease forwards',
    }}>
      <Check size={13} strokeWidth={3} /> {label}
    </div>
  )
}

// ═══════════════════════════════════════════════
// MAIN — Onboarding cinématique (parcours court)
// ═══════════════════════════════════════════════
export default function Melodie({ onAuth, onComplete, roles, existingUser, startStep }) {
  const onToast = useToast()
  // startStep 'select_roles' est redirigé vers le nouvel entonnoir 3 écrans (M.1)
  const [step, setStep] = useState(
    startStep === 'select_roles' ? 'funnel_universe' : (startStep || 'splash')
  )
  const [user, setUser] = useState(existingUser || null)

  // Form state
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState('')
  const [selectedRoles, setSelectedRoles] = useState([])
  // Funnel state (M.1) — univers + filière choisis pour orienter la sélection de rôles
  const [universe, setUniverse] = useState(null)   // 'music' | 'theater' | 'festival' | 'other'
  const [filiere, setFiliere] = useState(null)      // 'direction' | 'technique' | 'operationnel' | 'discover'
  const [quizAnswers, setQuizAnswers] = useState({ q1: null, q2: null, q3: null })
  const [quizStep, setQuizStep] = useState(0)        // 0-2 pour les 3 questions, 3 = résultat
  const [projectName, setProjectName] = useState('')
  const [saving, setSaving] = useState(false)
  const [createdOrg, setCreatedOrg] = useState(null)
  const [createdMembership, setCreatedMembership] = useState(null)

  // ─── Invite token detection ───
  const [inviteToken, setInviteToken] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('invite')
    if (token) {
      localStorage.setItem('pending_invite_token', token)
      // Clean URL
      const url = new URL(window.location.href)
      url.searchParams.delete('invite')
      window.history.replaceState({}, '', url.pathname + url.search)
      return token
    }
    return localStorage.getItem('pending_invite_token') || null
  })

  // ─── Auto-advance effect ───
  useEffect(() => {
    const rule = AUTO_ADVANCE[step]
    if (!rule) return
    const t = setTimeout(() => setStep(rule.next), rule.delay)
    return () => clearTimeout(t)
  }, [step])

  // ─── Finish + redirect ───
  useEffect(() => {
    if (step !== 'cest_parti') return
    const t = setTimeout(() => {
      onAuth(user)
      onComplete(createdMembership || null)
    }, 2000)
    return () => clearTimeout(t)
  }, [step])

  // ─── Skip handler ───
  const handleSkip = useCallback(() => {
    localStorage.setItem('onboarding_complete', 'true')
    if (user) { onAuth(user); onComplete(null) }
    else setStep('login')
  }, [user, onAuth, onComplete])

  // ─── Friendly error messages ───
  const friendlyError = (msg) => {
    if (!msg) return 'Erreur inconnue'
    const m = msg.toLowerCase()
    if (m.includes('email not confirmed')) return 'Email non confirmé. Vérifie ta boîte mail (et tes spams) puis clique sur le lien de confirmation.'
    if (m.includes('invalid login') || m.includes('invalid_grant')) return 'Email ou mot de passe incorrect.'
    if (m.includes('user already registered')) return 'Ce compte existe déjà. Connecte-toi plutôt.'
    if (m.includes('rate limit') || m.includes('too many')) return 'Trop de tentatives. Attends quelques minutes.'
    if (m.includes('network') || m.includes('fetch')) return 'Erreur réseau — vérifie ta connexion.'
    return msg
  }

  // ─── Auth handlers ───
  const handleSignup = async () => {
    if (!email || !password) return setAuthError('Email et mot de passe requis')
    if (password.length < 6) return setAuthError('6 caractères minimum')
    setAuthLoading(true)
    setAuthError('')
    try {
      const data = await auth.signUp(email, password)
      if (data.error) { setAuthError(friendlyError(data.error_description || data.error)); return }
      // Supabase returns a fake user (no error) when email already exists (anti-leak)
      // Detect: no identities = email already taken
      if (data.identities && data.identities.length === 0) {
        setAuthError('Ce compte existe déjà. Connecte-toi plutôt.')
        return
      }
      // Store displayName for after login
      if (displayName.trim()) localStorage.setItem('pending_display_name', displayName.trim())
      setStep('verify_email')
    } catch (e) { setAuthError(friendlyError(e.message)) }
    finally { setAuthLoading(false) }
  }

  const handleResendVerification = async () => {
    if (!email) return setAuthError('Entre ton email d\'abord')
    setAuthLoading(true)
    setAuthError('')
    try {
      // Re-calling signUp with same email resends the confirmation
      const data = await auth.signUp(email, password || 'dummy_resend')
      if (data.error) { setAuthError(friendlyError(data.error_description || data.error)); return }
      onToast('Email de confirmation renvoyé !')
    } catch (e) { setAuthError(friendlyError(e.message)) }
    finally { setAuthLoading(false) }
  }

  const handleForgotPassword = async () => {
    if (!email) return setAuthError('Entre ton email d\'abord')
    setAuthLoading(true)
    setAuthError('')
    try {
      await auth.resetPassword(email)
      onToast('Email de réinitialisation envoyé !')
    } catch (e) { setAuthError(friendlyError(e.message)) }
    finally { setAuthLoading(false) }
  }

  const handleLogin = async () => {
    if (!email || !password) return setAuthError('Email et mot de passe requis')
    setAuthLoading(true)
    setAuthError('')
    try {
      const data = await auth.signIn(email, password)
      if (data.error) { setAuthError(friendlyError(data.error_description || data.error)); return }
      if (data.access_token) {
        const u = data.user
        setUser(u)
        // Recover displayName from signup or from current form
        const name = displayName.trim() || localStorage.getItem('pending_display_name') || ''
        if (name) {
          localStorage.removeItem('pending_display_name')
          try { await db.upsert('user_details', { user_id: u.id, first_name: name }) }
          catch { try { await db.insert('user_details', { user_id: u.id, first_name: name }) } catch {} }
        }
        // If user has an invite token, auto-join the org and skip onboarding
        const pendingToken = inviteToken || localStorage.getItem('pending_invite_token')
        if (pendingToken) {
          const joined = await handleJoinViaInvite(u)
          if (joined) {
            setStep('cest_parti')
            return
          }
        }
        // Pas d'invitation : signaler a App.jsx de bootstrapper auto un projet par defaut
        // (skip role/project picker → 3 clics max)
        if (!localStorage.getItem('onboarding_complete')) {
          localStorage.setItem('auto_bootstrap_pending', '1')
        }
        onAuth(u)
      } else if (!data.error) {
        setAuthError('Connexion échouée. Vérifie tes identifiants.')
      }
    } catch (e) { setAuthError(friendlyError(e.message)) }
    finally { setAuthLoading(false) }
  }

  // ─── Join org via invite token ───
  const handleJoinViaInvite = async (currentUser) => {
    const token = inviteToken || localStorage.getItem('pending_invite_token')
    if (!token || !currentUser) return false
    try {
      // Validate invite token
      const invites = await db.get('project_invitations',
        `token=eq.${token}&accepted_at=is.null`)
      if (!invites || invites.length === 0) {
        onToast('Invitation invalide ou expirée', C.danger)
        localStorage.removeItem('pending_invite_token')
        return false
      }
      const invite = invites[0]
      // Check expiry
      if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
        onToast('Invitation expirée', C.danger)
        localStorage.removeItem('pending_invite_token')
        return false
      }
      // Check if already a member
      const existing = await db.get('project_members',
        `user_id=eq.${currentUser.id}&org_id=eq.${invite.org_id}`)
      let members
      if (existing && existing.length > 0) {
        members = existing
      } else {
        members = await db.insert('project_members', {
          user_id: currentUser.id,
          org_id: invite.org_id,
          project_id: invite.project_id,
          module_access: ALL_MODULES,
          is_admin: false,
          status: 'active',
        })
      }
      // Mark invite as accepted
      try {
        await db.update('project_invitations', `id=eq.${invite.id}`, {
          accepted_at: new Date().toISOString(),
        })
      } catch { /* non-critical */ }
      // Get org info
      const orgs = await db.get('organizations', `id=eq.${invite.org_id}`)
      const org = orgs?.[0] || { id: invite.org_id, name: 'Projet' }
      localStorage.removeItem('pending_invite_token')
      localStorage.setItem('onboarding_complete', 'true')
      setCreatedMembership({ ...members[0], org })
      setInviteToken(null)
      return true
    } catch (e) {
      onToast('Erreur: ' + e.message, C.danger)
      return false
    }
  }

  const handleRolesConfirm = () => {
    if (selectedRoles.length === 0) return
    setStep('project')
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
      // Preset Board métier depuis les rôles sélectionnés à l'étape SELECT_ROLES
      const boardConfig = buildBoardConfigFromRoles(selectedRoles)
      const members = await db.insert('project_members', {
        user_id: user.id, org_id: org.id,
        module_access: moduleAccess, is_admin: true, status: 'active',
        board_config: boardConfig,
      })
      setCreatedMembership({ ...members[0], org })
      if (primaryRole) {
        try { await db.upsert('user_profiles', { user_id: user.id, role_id: primaryRole, org_id: org.id }) }
        catch { try { await db.insert('user_profiles', { user_id: user.id, role_id: primaryRole, org_id: org.id }) } catch {} }
      }
      localStorage.setItem('onboarding_complete', 'true')
      setStep('cest_parti')
    } catch (e) { onToast?.('Erreur : ' + e.message, C.danger) }
    finally { setSaving(false) }
  }

  // ═══════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════

  // 1. SPLASH — logo + nom
  if (step === 'splash') {
    return (
      <div style={{
        minHeight: '100dvh', background: C.bg,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 20,
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
        <FadeText size={32} color={C.text} delay={800}>BackStage</FadeText>
      </div>
    )
  }

  // 2. CHOICE — Première connexion / Se connecter
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
        <div style={{ opacity: 0, animation: 'fadeSlideUp 0.6s ease 0.2s forwards', textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.text }}>BackStage</div>
        </div>
        <div style={{
          width: '100%', maxWidth: 320, marginTop: 32,
          display: 'flex', flexDirection: 'column', gap: 12,
          opacity: 0, animation: 'fadeSlideUp 0.6s ease 0.5s forwards',
        }}>
          <button onClick={() => setStep('bonjour')} style={{
            width: '100%', padding: '16px', borderRadius: 14,
            background: C.accent, color: 'white', fontSize: 16, fontWeight: 600,
            border: 'none', cursor: 'pointer',
          }}>
            Première connexion
          </button>
          <button onClick={() => setStep('login')} style={{
            width: '100%', padding: '16px', borderRadius: 14,
            background: 'transparent', color: C.text, fontSize: 16, fontWeight: 500,
            border: `1px solid ${C.border}`, cursor: 'pointer',
          }}>
            Se connecter
          </button>
        </div>
      </div>
    )
  }

  // 3. BONJOUR — Mélodie se présente (1 seul écran, enchaîne direct vers signup)
  if (step === 'bonjour') {
    return (
      <Screen step={step} onSkip={handleSkip}>
        <FadeText size={24}>Bonjour, je suis <span style={{ color: C.melodie }}>Mélodie</span></FadeText>
        <FadeText sub delay={500}>Je vais t'accompagner</FadeText>
      </Screen>
    )
  }

  // 4. SIGNUP — Inscription avec prénom intégré + micro-victoires PNL
  if (step === 'signup') {
    const nameValid = displayName.trim().length >= 2
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    const pwdStrong = password.length >= 8
    const pwdOk = password.length >= 6
    return (
      <Screen step={step} onSkip={handleSkip}>
        <FadeText size={26}>Bienvenue !</FadeText>
        <FadeText sub delay={200}>En 30 secondes tu es operationnel</FadeText>
        <div style={{
          width: '100%', maxWidth: 340, marginTop: 12,
          opacity: 0, animation: 'fadeSlideUp 0.6s ease 0.3s forwards',
        }}>
          {authError && (
            <div style={{
              padding: '10px 14px', borderRadius: 12, marginBottom: 12,
              background: `${C.danger}10`, border: `1px solid ${C.danger}20`,
              color: C.danger, fontSize: 13,
            }}>{authError}</div>
          )}

          {/* Prenom */}
          <div style={{ marginBottom: 12 }}>
            <input className="input" placeholder="Ton prenom ou pseudo" value={displayName}
              onChange={e => setDisplayName(e.target.value)} autoFocus
              style={{ fontSize: 16, padding: '14px 16px', borderRadius: 14 }} />
            <MicroVictory show={nameValid} label="Enchante !" />
          </div>

          {/* Email */}
          <div style={{ marginBottom: 12 }}>
            <input className="input" type="email" placeholder="Email" value={email}
              onChange={e => setEmail(e.target.value)} autoComplete="email"
              style={{ fontSize: 16, padding: '14px 16px', borderRadius: 14 }} />
            <MicroVictory show={emailValid} label="Email valide" />
          </div>

          {/* Password */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ position: 'relative' }}>
              <input className="input" type={showPwd ? 'text' : 'password'} placeholder="Mot de passe (6 car. min)"
                value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password"
                onKeyDown={e => e.key === 'Enter' && handleSignup()}
                style={{ fontSize: 16, padding: '14px 16px', paddingRight: 48, borderRadius: 14 }} />
              <button onClick={() => setShowPwd(!showPwd)} aria-label={showPwd ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted,
              }}>
                {createElement(showPwd ? EyeOff : Eye, { size: 18 })}
              </button>
            </div>
            <MicroVictory show={pwdStrong} label="Mot de passe solide" />
            {!pwdStrong && pwdOk && (
              <div style={{
                fontSize: 12, color: C.textMuted, marginTop: 4, marginLeft: 4,
              }}>
                Astuce : 8 caracteres ou + = vraiment solide
              </div>
            )}
          </div>

          {/* CTA premium gradient */}
          <button onClick={handleSignup} disabled={authLoading} style={{
            width: '100%', padding: '16px', borderRadius: 14,
            background: C.gradient, color: 'white', fontSize: 16, fontWeight: 700,
            border: 'none', cursor: 'pointer', opacity: authLoading ? 0.7 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: '0 8px 20px rgba(124, 58, 237, 0.35)',
            transition: 'transform 0.15s',
          }}
          onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
          onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
            {authLoading
              ? <>{createElement(Loader2, { size: 16, className: 'spin' })} Inscription...</>
              : "Creer mon compte"}
          </button>

          {/* Ligne reassurance */}
          <div style={{
            display: 'flex', justifyContent: 'center', gap: 10, marginTop: 14,
            fontSize: 11, color: '#64748B', flexWrap: 'wrap',
          }}>
            <span>Donnees chiffrees</span>
            <span>·</span>
            <span>Sans engagement</span>
            <span>·</span>
            <span>RGPD</span>
          </div>

          {/* Vers login */}
          <button onClick={() => { setStep('login'); setAuthError('') }} style={{
            marginTop: 14, fontSize: 13, color: C.purpleDeep, background: 'none',
            border: 'none', cursor: 'pointer', width: '100%', textAlign: 'center',
            fontWeight: 600,
          }}>
            Deja un compte ? Se connecter
          </button>
        </div>
      </Screen>
    )
  }

  // 5. VERIFY EMAIL
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
          width: '100%', maxWidth: 320, marginTop: 20,
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
          <button onClick={handleResendVerification} disabled={authLoading} style={{
            width: '100%', padding: '12px', borderRadius: 14,
            background: 'none', color: C.accent, fontSize: 14, fontWeight: 500,
            border: `1px solid ${C.accent}30`, cursor: 'pointer',
            opacity: authLoading ? 0.6 : 1,
          }}>
            {authLoading ? 'Envoi...' : 'Renvoyer l\'email'}
          </button>
          <div style={{ fontSize: 12, color: C.textMuted, textAlign: 'center' }}>
            Vérifie aussi tes spams si tu ne trouves pas l'email
          </div>
        </div>
      </Screen>
    )
  }

  // 6. LOGIN
  if (step === 'login') {
    return (
      <Screen step={step} onSkip={handleSkip}>
        <FadeText size={24}>Content de te revoir</FadeText>
        <FadeText sub delay={200}>Reprends ou tu t'es arrete</FadeText>
        <div style={{
          width: '100%', maxWidth: 340, marginTop: 12,
          opacity: 0, animation: 'fadeSlideUp 0.6s ease 0.3s forwards',
        }}>
          {authError && (
            <div style={{
              padding: '10px 14px', borderRadius: 12, marginBottom: 12,
              background: `${C.danger}10`, border: `1px solid ${C.danger}20`,
              color: C.danger, fontSize: 13,
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
            <button onClick={() => setShowPwd(!showPwd)} aria-label={showPwd ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} style={{
              position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted,
            }}>
              {createElement(showPwd ? EyeOff : Eye, { size: 18 })}
            </button>
          </div>
          <button onClick={handleLogin} disabled={authLoading} style={{
            width: '100%', padding: '16px', borderRadius: 14,
            background: C.gradient, color: 'white', fontSize: 16, fontWeight: 700,
            border: 'none', cursor: 'pointer', opacity: authLoading ? 0.7 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: '0 8px 20px rgba(124, 58, 237, 0.35)',
            transition: 'transform 0.15s',
          }}
          onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
          onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
            {authLoading ? <>{createElement(Loader2, { size: 16, className: 'spin' })} Connexion...</> : 'Se connecter'}
          </button>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, gap: 8 }}>
            <button onClick={handleForgotPassword} disabled={authLoading} style={{
              fontSize: 13, color: C.textMuted, background: 'none',
              border: 'none', cursor: 'pointer', textAlign: 'left',
            }}>
              Mot de passe oublie ?
            </button>
            <button onClick={handleResendVerification} disabled={authLoading} style={{
              fontSize: 13, color: C.textMuted, background: 'none',
              border: 'none', cursor: 'pointer', textAlign: 'right',
            }}>
              Renvoyer le lien
            </button>
          </div>
          <button onClick={() => { setStep('bonjour'); setAuthError('') }} style={{
            marginTop: 10, fontSize: 13, color: C.purpleDeep, background: 'none',
            border: 'none', cursor: 'pointer', width: '100%', textAlign: 'center',
            fontWeight: 600,
          }}>
            Premiere connexion ?
          </button>
        </div>
      </Screen>
    )
  }

  // ═══════════════════════════════════════════════
  // M.1 — ENTONNOIR 3 ÉCRANS (+ mini quiz)
  // 7a. funnel_universe — univers d'activité
  // 7b. funnel_filiere  — filière / famille de métier
  // 7c. funnel_quiz     — mini quiz "Je découvre"
  // 7d. funnel_roles    — fiches métier de la filière choisie
  // L'ancienne étape 'select_roles' est redirigée vers funnel_universe.
  // ═══════════════════════════════════════════════

  // Helper — bouton "retour" en haut à gauche
  const BackBtn = ({ onClick }) => (
    <button onClick={onClick} aria-label="Retour" style={{
      position: 'absolute', top: 16, left: 16,
      background: 'none', border: 'none', cursor: 'pointer',
      color: C.textMuted, display: 'flex', alignItems: 'center',
      gap: 4, fontSize: 13, padding: 8,
    }}>
      {createElement(ChevronLeft, { size: 18 })} Retour
    </button>
  )

  // 7a. FUNNEL_UNIVERSE — "C'est quoi ton univers ?"
  if (step === 'funnel_universe') {
    const UNIVERSES = [
      { code: 'music',    emoji: '🎤', label: 'Musique / Tournée' },
      { code: 'theater',  emoji: '🎭', label: 'Théâtre / Spectacle vivant' },
      { code: 'festival', emoji: '🎪', label: 'Festival / Événementiel' },
      { code: 'other',    emoji: '🎬', label: 'Autre (audiovisuel, corporate)' },
    ]
    return (
      <Screen step={step} onSkip={handleSkip} top>
        <FadeText size={22}>C'est quoi ton univers ?</FadeText>
        <FadeText sub delay={200}>Pour mieux t'orienter dans l'app</FadeText>
        <div role="radiogroup" aria-label="Choisis ton univers" style={{
          display: 'flex', flexDirection: 'column', gap: 10,
          width: '100%', maxWidth: 360, marginTop: 12,
          opacity: 0, animation: 'fadeSlideUp 0.5s ease 0.3s forwards',
        }}>
          {UNIVERSES.map(u => {
            const sel = universe === u.code
            return (
              <button key={u.code} role="radio" aria-checked={sel}
                aria-label={u.label}
                onClick={() => { setUniverse(u.code); setStep('funnel_filiere') }}
                style={{
                  minHeight: 56, padding: '14px 16px', borderRadius: 14,
                  border: `2px solid ${sel ? C.purple : C.border}`,
                  background: sel ? 'rgba(124,58,237,0.08)' : 'white',
                  display: 'flex', alignItems: 'center', gap: 12,
                  cursor: 'pointer', transition: 'all 0.15s',
                  textAlign: 'left',
                }}>
                <span style={{ fontSize: 24 }}>{u.emoji}</span>
                <span style={{ fontSize: 15, fontWeight: 600, color: C.text }}>{u.label}</span>
              </button>
            )
          })}
        </div>
      </Screen>
    )
  }

  // 7b. FUNNEL_FILIERE — "Plutôt côté..."
  if (step === 'funnel_filiere') {
    const FILIERES = [
      { code: 'direction',    emoji: '👔', label: 'Direction / Organisation', hint: 'TM, PM, PA' },
      { code: 'technique',    emoji: '🎛️', label: 'Technique / Régie',        hint: 'TD, SE, LD, SM, BL' },
      { code: 'operationnel', emoji: '💼', label: 'Opérationnel / Terrain',    hint: 'MM, LOG, AA, SAFE' },
      { code: 'discover',     emoji: '🤔', label: 'Je découvre, aide-moi',     hint: '3 questions rapides' },
    ]
    return (
      <Screen step={step} onSkip={handleSkip} top>
        <BackBtn onClick={() => setStep('funnel_universe')} />
        <FadeText size={22}>Plutôt côté...</FadeText>
        <FadeText sub delay={200}>Choisis la famille qui te ressemble</FadeText>
        <div role="radiogroup" aria-label="Choisis ta filière" style={{
          display: 'flex', flexDirection: 'column', gap: 10,
          width: '100%', maxWidth: 360, marginTop: 12,
          opacity: 0, animation: 'fadeSlideUp 0.5s ease 0.3s forwards',
        }}>
          {FILIERES.map(f => {
            const sel = filiere === f.code
            return (
              <button key={f.code} role="radio" aria-checked={sel}
                aria-label={f.label}
                onClick={() => {
                  setFiliere(f.code)
                  if (f.code === 'discover') {
                    setQuizStep(0)
                    setQuizAnswers({ q1: null, q2: null, q3: null })
                    setStep('funnel_quiz')
                  } else {
                    setStep('funnel_roles')
                  }
                }}
                style={{
                  minHeight: 64, padding: '14px 16px', borderRadius: 14,
                  border: `2px solid ${sel ? C.purple : C.border}`,
                  background: sel ? 'rgba(124,58,237,0.08)' : 'white',
                  display: 'flex', alignItems: 'center', gap: 12,
                  cursor: 'pointer', transition: 'all 0.15s',
                  textAlign: 'left',
                }}>
                <span style={{ fontSize: 24 }}>{f.emoji}</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: C.text }}>{f.label}</span>
                  <span style={{ fontSize: 12, color: C.textMuted }}>{f.hint}</span>
                </div>
              </button>
            )
          })}
        </div>
      </Screen>
    )
  }

  // 7c. FUNNEL_QUIZ — mini quiz "Je découvre" (3 questions oui/non)
  if (step === 'funnel_quiz') {
    const QUESTIONS = [
      { key: 'q1', text: 'Tu décides des budgets et du planning global ?' },
      { key: 'q2', text: 'Tu manipules des équipements techniques (son, lumière, instruments) ?' },
      { key: 'q3', text: 'Tu es proche de l\'artiste ou de la production au quotidien ?' },
    ]

    // Logique de suggestion basée sur les réponses
    const computeSuggestion = (ans) => {
      if (ans.q1 === true) return { role: 'TM', filiere: 'direction' }
      if (ans.q2 === true) return { role: null, filiere: 'technique' }
      if (ans.q3 === true) return { role: 'AA', filiere: 'operationnel' }
      return { role: 'MM', filiere: 'operationnel' }
    }

    // Résultat du quiz (quizStep dépasse le nombre de questions)
    if (quizStep >= QUESTIONS.length) {
      const suggestion = computeSuggestion(quizAnswers)
      const suggestedRole = suggestion.role
      const suggestedLabel = suggestedRole ? ROLE_CONF[suggestedRole]?.label : null
      return (
        <Screen step={step} onSkip={handleSkip} top>
          <BackBtn onClick={() => setQuizStep(QUESTIONS.length - 1)} />
          <div style={{
            width: 56, height: 56, borderRadius: 28,
            background: 'rgba(124,58,237,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: 0, animation: 'fadeSlideUp 0.5s ease forwards',
          }}>
            {createElement(Lightbulb, { size: 26, color: C.purple })}
          </div>
          <FadeText size={20} delay={150}>
            {suggestedLabel ? `On te suggère ${suggestedLabel}` : 'On te propose la filière Technique'}
          </FadeText>
          <FadeText sub delay={350}>Tu peux changer à l'écran suivant</FadeText>
          <div style={{
            width: '100%', maxWidth: 360, marginTop: 16,
            opacity: 0, animation: 'fadeSlideUp 0.5s ease 0.5s forwards',
            display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            <button onClick={() => {
              if (suggestedRole) setSelectedRoles([suggestedRole])
              setFiliere(suggestion.filiere)
              setStep('funnel_roles')
            }} style={{
              width: '100%', minHeight: 52, padding: '14px', borderRadius: 14,
              background: C.gradient, color: 'white', fontSize: 16, fontWeight: 700,
              border: 'none', cursor: 'pointer',
              boxShadow: '0 8px 20px rgba(124,58,237,0.35)',
            }}>
              Valider
            </button>
            <button onClick={() => {
              setQuizStep(0)
              setQuizAnswers({ q1: null, q2: null, q3: null })
            }} style={{
              width: '100%', minHeight: 44, padding: '10px', borderRadius: 14,
              background: 'none', color: C.textMuted, fontSize: 13,
              border: 'none', cursor: 'pointer',
            }}>
              Refaire le quiz
            </button>
          </div>
        </Screen>
      )
    }

    const q = QUESTIONS[quizStep]
    const answerQuestion = (value) => {
      const next = { ...quizAnswers, [q.key]: value }
      setQuizAnswers(next)
      setQuizStep(quizStep + 1)
    }
    return (
      <Screen step={step} onSkip={handleSkip} top>
        <BackBtn onClick={() => {
          if (quizStep === 0) setStep('funnel_filiere')
          else setQuizStep(quizStep - 1)
        }} />
        <div style={{ fontSize: 12, color: C.textMuted, fontWeight: 600 }}>
          Question {quizStep + 1} / {QUESTIONS.length}
        </div>
        <FadeText size={20}>{q.text}</FadeText>
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 10,
          width: '100%', maxWidth: 360, marginTop: 16,
          opacity: 0, animation: 'fadeSlideUp 0.5s ease 0.2s forwards',
        }}>
          <button onClick={() => answerQuestion(true)} style={{
            width: '100%', minHeight: 52, padding: '14px', borderRadius: 14,
            background: 'white', color: C.text, fontSize: 16, fontWeight: 600,
            border: `2px solid ${C.border}`, cursor: 'pointer',
            transition: 'all 0.15s',
          }}>
            Oui
          </button>
          <button onClick={() => answerQuestion(false)} style={{
            width: '100%', minHeight: 52, padding: '14px', borderRadius: 14,
            background: 'white', color: C.text, fontSize: 16, fontWeight: 600,
            border: `2px solid ${C.border}`, cursor: 'pointer',
            transition: 'all 0.15s',
          }}>
            Non
          </button>
        </div>
      </Screen>
    )
  }

  // 7d. FUNNEL_ROLES — fiches métier filtrées par filière (choix multiple)
  if (step === 'funnel_roles') {
    const codes = filiere && filiere !== 'discover'
      ? (ROLES_BY_FILIERE[filiere] || [])
      : ROLES_BY_FILIERE.operationnel
    const MODULE_LABELS = {
      dashboard: 'Tableau', equipe: 'Équipe', articles: 'Articles',
      stock: 'Stock', tournee: 'Tournée', finance: 'Finance',
      forecast: 'Prévisions', ventes: 'Ventes', achats: 'Achats',
      inventaire: 'Inventaire', transport: 'Transport', timeline: 'Timeline',
    }
    return (
      <Screen step={step} onSkip={handleSkip} top>
        <BackBtn onClick={() => setStep(filiere === 'discover' ? 'funnel_quiz' : 'funnel_filiere')} />
        <FadeText size={22}>Ton rôle précis</FadeText>
        <FadeText sub delay={200}>Tu peux en cumuler plusieurs</FadeText>
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 10,
          width: '100%', maxWidth: 420, marginTop: 12,
          opacity: 0, animation: 'fadeSlideUp 0.5s ease 0.3s forwards',
        }}>
          {codes.map(code => {
            const conf = ROLE_CONF[code]
            const profile = ROLE_PROFILES[code] || {}
            if (!conf) return null
            const sel = selectedRoles.includes(code)
            const modules = (getInheritedModules(code) || []).slice(0, 6)
            return (
              <button key={code} role="checkbox" aria-checked={sel}
                aria-label={`${conf.label} — ${profile.tagline || ''}`}
                onClick={() => {
                  setSelectedRoles(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code])
                }}
                style={{
                  width: '100%', padding: '14px 16px', borderRadius: 14,
                  border: `2px solid ${sel ? '#7C3AED' : C.border}`,
                  background: sel ? 'rgba(124,58,237,0.08)' : 'white',
                  display: 'flex', flexDirection: 'column', gap: 8,
                  cursor: 'pointer', transition: 'all 0.15s',
                  textAlign: 'left', position: 'relative',
                }}>
                {sel && (
                  <div style={{
                    position: 'absolute', top: 10, right: 10,
                    width: 20, height: 20, borderRadius: 10,
                    background: '#7C3AED', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    {createElement(Check, { size: 12, color: 'white', strokeWidth: 3 })}
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: `${conf.color}15`, display: 'flex',
                    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    {createElement(conf.icon, { size: 18, color: conf.color })}
                  </div>
                  <span style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{conf.label}</span>
                </div>
                {profile.tagline && (
                  <div style={{ fontSize: 13, color: C.text, lineHeight: 1.4 }}>
                    {profile.tagline}
                  </div>
                )}
                {modules.length > 0 && (
                  <div style={{ fontSize: 12, color: C.textSoft, lineHeight: 1.4 }}>
                    🔓 {modules.map(m => MODULE_LABELS[m] || m).join(' · ')}
                  </div>
                )}
                {profile.recommended && (
                  <div style={{
                    fontSize: 12, color: C.textMuted, lineHeight: 1.4,
                    fontStyle: 'italic',
                  }}>
                    💡 Recommandé si {profile.recommended}
                  </div>
                )}
              </button>
            )
          })}
        </div>
        {selectedRoles.length > 0 && (
          <button onClick={handleRolesConfirm} style={{
            position: 'sticky', bottom: 16,
            marginTop: 16, width: '100%', maxWidth: 420,
            minHeight: 52, padding: '14px',
            borderRadius: 14, background: C.gradient, color: 'white',
            fontSize: 16, fontWeight: 700, border: 'none', cursor: 'pointer',
            boxShadow: '0 8px 20px rgba(124,58,237,0.35)',
          }}>
            Valider ({selectedRoles.length})
          </button>
        )}
      </Screen>
    )
  }

  // 8. PROJECT — nom du projet
  if (step === 'project') {
    return (
      <Screen step={step} onSkip={handleSkip}>
        <FadeText size={18}>Dernière étape</FadeText>
        <FadeText sub delay={200}>Donne un nom à ton premier projet</FadeText>
        <div style={{
          width: '100%', maxWidth: 320, marginTop: 12,
          opacity: 0, animation: 'fadeSlideUp 0.6s ease 0.4s forwards',
        }}>
          <input className="input" placeholder="Ex : EK Tour 2026" value={projectName}
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

  // 9. C'EST PARTI
  if (step === 'cest_parti') {
    return (
      <Screen step={step} onSkip={handleSkip}>
        <FadeText size={26}>C'est parti{displayName ? `, ${displayName}` : ''} !</FadeText>
        <FadeText sub delay={400}>Je serai toujours là si tu as besoin</FadeText>
      </Screen>
    )
  }

  return null
}
