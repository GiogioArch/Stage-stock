import React, { useState, useEffect, createElement, useCallback } from 'react'
import { auth, db } from '../lib/supabase'
import { ROLE_CONF, getInheritedModules } from './RolePicker'
import {
  Loader2, Eye, EyeOff, Check, Package, Mail,
} from 'lucide-react'
import { useToast } from '../shared/hooks'

// ─── Design tokens (palette harmonisée) ───
const C = {
  accent: '#5B8DB8',
  melodie: '#8B6DB8',
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
// MAIN — Onboarding cinématique (parcours court)
// ═══════════════════════════════════════════════
export default function Melodie({ onAuth, onComplete, roles, existingUser, startStep }) {
  const onToast = useToast()
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
      const members = await db.insert('project_members', {
        user_id: user.id, org_id: org.id,
        module_access: moduleAccess, is_admin: true, status: 'active',
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

  // 4. SIGNUP — Inscription avec prénom intégré
  if (step === 'signup') {
    return (
      <Screen step={step} onSkip={handleSkip}>
        <FadeText size={20}>Crée ton compte</FadeText>
        <div style={{
          width: '100%', maxWidth: 320, marginTop: 8,
          opacity: 0, animation: 'fadeSlideUp 0.6s ease 0.3s forwards',
        }}>
          {authError && (
            <div style={{
              padding: '8px 12px', borderRadius: 10, marginBottom: 10,
              background: `${C.danger}10`, border: `1px solid ${C.danger}20`,
              color: C.danger, fontSize: 13,
            }}>{authError}</div>
          )}
          <div style={{ marginBottom: 10 }}>
            <input className="input" placeholder="Ton prénom ou pseudo" value={displayName}
              onChange={e => setDisplayName(e.target.value)} autoFocus
              style={{ fontSize: 16, padding: '14px 16px', borderRadius: 14 }} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <input className="input" type="email" placeholder="Email" value={email}
              onChange={e => setEmail(e.target.value)} autoComplete="email"
              style={{ fontSize: 16, padding: '14px 16px', borderRadius: 14 }} />
          </div>
          <div style={{ marginBottom: 14, position: 'relative' }}>
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
          <button onClick={handleSignup} disabled={authLoading} style={{
            width: '100%', padding: '16px', borderRadius: 14,
            background: C.accent, color: 'white', fontSize: 16, fontWeight: 600,
            border: 'none', cursor: 'pointer', opacity: authLoading ? 0.6 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            {authLoading ? <>{createElement(Loader2, { size: 16, className: 'spin' })} Inscription...</> : "S'inscrire"}
          </button>
          <button onClick={() => { setStep('login'); setAuthError('') }} style={{
            marginTop: 10, fontSize: 13, color: C.accent, background: 'none',
            border: 'none', cursor: 'pointer', width: '100%', textAlign: 'center',
          }}>
            Déjà un compte ? Se connecter
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
        <FadeText size={20}>Contente de te revoir</FadeText>
        <div style={{
          width: '100%', maxWidth: 320, marginTop: 8,
          opacity: 0, animation: 'fadeSlideUp 0.6s ease 0.3s forwards',
        }}>
          {authError && (
            <div style={{
              padding: '8px 12px', borderRadius: 10, marginBottom: 10,
              background: `${C.danger}10`, border: `1px solid ${C.danger}20`,
              color: C.danger, fontSize: 13,
            }}>{authError}</div>
          )}
          <div style={{ marginBottom: 10 }}>
            <input className="input" type="email" placeholder="Email" value={email}
              onChange={e => setEmail(e.target.value)} autoComplete="email" autoFocus
              style={{ fontSize: 16, padding: '14px 16px', borderRadius: 14 }} />
          </div>
          <div style={{ marginBottom: 14, position: 'relative' }}>
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
            background: C.accent, color: 'white', fontSize: 16, fontWeight: 600,
            border: 'none', cursor: 'pointer', opacity: authLoading ? 0.6 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            {authLoading ? <>{createElement(Loader2, { size: 16, className: 'spin' })} Connexion...</> : 'Se connecter'}
          </button>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, gap: 8 }}>
            <button onClick={handleForgotPassword} disabled={authLoading} style={{
              fontSize: 13, color: C.textMuted, background: 'none',
              border: 'none', cursor: 'pointer', textAlign: 'left',
            }}>
              Mot de passe oublié ?
            </button>
            <button onClick={handleResendVerification} disabled={authLoading} style={{
              fontSize: 13, color: C.textMuted, background: 'none',
              border: 'none', cursor: 'pointer', textAlign: 'right',
            }}>
              Renvoyer le lien
            </button>
          </div>
          <button onClick={() => { setStep('bonjour'); setAuthError('') }} style={{
            marginTop: 6, fontSize: 13, color: C.accent, background: 'none',
            border: 'none', cursor: 'pointer', width: '100%', textAlign: 'center',
          }}>
            Première connexion ?
          </button>
        </div>
      </Screen>
    )
  }

  // 7. ROLES — sélection métier (directement après login pour nouveaux users)
  if (step === 'select_roles') {
    return (
      <Screen step={step} onSkip={handleSkip} top>
        <FadeText size={18}>Quel est ton métier ?</FadeText>
        <FadeText sub delay={200}>Tu peux en choisir plusieurs</FadeText>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
          width: '100%', maxWidth: 360, marginTop: 4,
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
