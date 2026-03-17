import React, { useState, useEffect, useRef, createElement } from 'react'
import { auth, db } from '../lib/supabase'
import { ROLE_CONF, getInheritedModules, getInheritedRoles } from './RolePicker'
import {
  Box, Music, ArrowRight, Loader2, Eye, EyeOff,
  FolderPlus, QrCode, UserCheck, Check,
} from 'lucide-react'

// ─── Design tokens ───
const C = {
  accent: '#6366F1',
  text: '#1E293B',
  textSoft: '#64748B',
  textMuted: '#94A3B8',
  bg: '#FFFFFF',
  surface: '#F8FAFC',
  border: '#E2E8F0',
  melodie: '#8B5CF6',  // Mélodie's signature color
  success: '#10B981',
}

const ALL_MODULES = ['dashboard', 'equipe', 'articles', 'depots', 'stock', 'tournee', 'alertes', 'finance', 'forecast']

// ─── Chat bubble component ───
function Bubble({ children, delay = 0, align = 'left' }) {
  const [visible, setVisible] = useState(delay === 0)
  const [typing, setTyping] = useState(delay > 0)

  useEffect(() => {
    if (delay === 0) return
    const t1 = setTimeout(() => setTyping(true), delay * 0.3)
    const t2 = setTimeout(() => { setTyping(false); setVisible(true) }, delay)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [delay])

  if (!visible && !typing) return null

  if (typing) {
    return (
      <div style={{ display: 'flex', justifyContent: align === 'right' ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
        <div style={{
          padding: '10px 16px', borderRadius: 16, background: align === 'right' ? `${C.accent}12` : C.surface,
          border: `1px solid ${C.border}`, fontSize: 14, color: C.textMuted,
        }}>
          <span style={{ animation: 'pulse 1s infinite' }}>...</span>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex', justifyContent: align === 'right' ? 'flex-end' : 'flex-start',
      marginBottom: 8, animation: 'fadeIn 0.3s ease',
    }}>
      <div style={{
        maxWidth: '85%', padding: '12px 16px',
        borderRadius: align === 'right' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
        background: align === 'right' ? `${C.accent}10` : C.surface,
        border: `1px solid ${align === 'right' ? `${C.accent}20` : C.border}`,
        fontSize: 14, color: C.text, lineHeight: 1.6,
      }}>
        {children}
      </div>
    </div>
  )
}

// ─── Mélodie avatar ───
function MelodieAvatar({ size = 40 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size / 2,
      background: `linear-gradient(135deg, ${C.melodie}, ${C.accent})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <Music size={size * 0.5} color="white" />
    </div>
  )
}

// ─── Fade transition wrapper ───
function FadeScreen({ children, onDone, duration = 2500 }) {
  const [phase, setPhase] = useState('in') // in → visible → out → done

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('visible'), 600)
    const t2 = setTimeout(() => setPhase('out'), duration - 600)
    const t3 = setTimeout(() => onDone?.(), duration)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [duration, onDone])

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: C.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: 16,
      opacity: phase === 'in' ? 0 : phase === 'out' ? 0 : 1,
      transition: 'opacity 0.6s ease',
    }}>
      {children}
    </div>
  )
}

// ═══════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════
export default function Melodie({ onAuth, onComplete, roles, onToast, existingUser, startStep }) {
  const [step, setStep] = useState(startStep || 'splash')
  const [user, setUser] = useState(existingUser || null)
  const scrollRef = useRef(null)

  // Auth form state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState('')

  // Profile state
  const [displayName, setDisplayName] = useState('')

  // Project state
  const [projectName, setProjectName] = useState('')
  const [createdOrg, setCreatedOrg] = useState(null)
  const [createdMembership, setCreatedMembership] = useState(null)

  // Role state
  const [selectedRole, setSelectedRole] = useState(null)

  // Saving state
  const [saving, setSaving] = useState(false)

  // Auto-scroll to bottom when step changes
  useEffect(() => {
    if (scrollRef.current) {
      setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }), 100)
    }
  }, [step])

  // ─── Auth handlers ───
  const handleSignup = async () => {
    if (!email || !password) return setAuthError('Email et mot de passe requis')
    if (password.length < 6) return setAuthError('6 caracteres minimum')
    setAuthLoading(true)
    setAuthError('')
    try {
      const data = await auth.signUp(email, password)
      if (data.error) {
        setAuthError(data.error_description || data.error)
      } else if (data.access_token) {
        setUser(data.user)
        setStep('registered')
      } else if (data.id) {
        // Email confirmation required — try login immediately
        const login = await auth.signIn(email, password)
        if (login.access_token) {
          setUser(login.user)
          setStep('registered')
        } else {
          setStep('confirm_email')
        }
      }
    } catch (e) {
      setAuthError(e.message || 'Erreur reseau')
    } finally {
      setAuthLoading(false)
    }
  }

  const handleLogin = async () => {
    if (!email || !password) return setAuthError('Email et mot de passe requis')
    setAuthLoading(true)
    setAuthError('')
    try {
      const data = await auth.signIn(email, password)
      if (data.error) {
        setAuthError(data.error_description || data.error)
      } else if (data.access_token) {
        setUser(data.user)
        onAuth(data.user)
      }
    } catch (e) {
      setAuthError(e.message || 'Erreur reseau')
    } finally {
      setAuthLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    if (!email) return setAuthError('Entre ton email d\'abord')
    setAuthLoading(true)
    setAuthError('')
    try {
      await auth.resetPassword(email)
      setAuthError('')
      setStep('reset_sent')
    } catch (e) {
      setAuthError(e.message)
    } finally {
      setAuthLoading(false)
    }
  }

  // ─── Profile save ───
  const saveProfile = async () => {
    if (!displayName.trim()) return
    setSaving(true)
    try {
      await db.upsert('user_details', {
        user_id: user.id,
        first_name: displayName.trim(),
      })
    } catch {
      try {
        await db.insert('user_details', {
          user_id: user.id,
          first_name: displayName.trim(),
        })
      } catch { /* silent */ }
    }
    setSaving(false)
    setStep('greet')
  }

  // ─── Project create ───
  const createProject = async () => {
    if (!projectName.trim()) return
    setSaving(true)
    try {
      const slug = projectName.trim().toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 30)
      const orgs = await db.insert('organizations', {
        name: projectName.trim(),
        slug: slug || 'projet',
      })
      const org = orgs[0]
      setCreatedOrg(org)
      const members = await db.insert('project_members', {
        user_id: user.id,
        org_id: org.id,
        module_access: ALL_MODULES,
        is_admin: true,
        status: 'active',
      })
      setCreatedMembership({ ...members[0], org })
      setStep('ask_role')
    } catch (e) {
      onToast?.('Erreur: ' + e.message, '#DC2626')
    } finally {
      setSaving(false)
    }
  }

  // ─── Role save ───
  const saveRole = async () => {
    if (!selectedRole || !createdOrg) return
    setSaving(true)
    try {
      const moduleAccess = getInheritedModules(selectedRole.code)
      await db.upsert('user_profiles', {
        user_id: user.id,
        role_id: selectedRole.id || selectedRole.code,
        org_id: createdOrg.id,
      })
      try {
        const members = await db.get('project_members', `user_id=eq.${user.id}&org_id=eq.${createdOrg.id}`)
        if (members && members.length > 0) {
          await db.update('project_members', `id=eq.${members[0].id}`, {
            role_id: selectedRole.id || selectedRole.code,
            module_access: moduleAccess,
          })
        }
      } catch { /* non-blocking */ }
      localStorage.setItem('onboarding_complete', 'true')
      setStep('complete')
    } catch (e) {
      onToast?.('Erreur: ' + e.message, '#DC2626')
    } finally {
      setSaving(false)
    }
  }

  // ─── Final complete ───
  const finishOnboarding = () => {
    onAuth(user)
    if (createdMembership) onComplete(createdMembership)
  }

  // ═══════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════

  // ─── 1. SPLASH ───
  if (step === 'splash') {
    return (
      <FadeScreen onDone={() => setStep('welcome')} duration={2800}>
        <div style={{
          width: 64, height: 64, borderRadius: 16,
          background: C.accent,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Box size={36} color="white" />
        </div>
        <div style={{ fontSize: 24, fontWeight: 700, color: C.text }}>Stage Stock</div>
        <div style={{ fontSize: 13, color: C.textMuted }}>Gestion intelligente du spectacle</div>
      </FadeScreen>
    )
  }

  // ─── 2. WELCOME ───
  if (step === 'welcome') {
    return (
      <div style={{
        minHeight: '100dvh', background: C.bg,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: 24, animation: 'fadeIn 0.5s ease',
      }}>
        <MelodieAvatar size={64} />
        <div style={{ fontSize: 28, fontWeight: 700, color: C.text, marginTop: 20, marginBottom: 4 }}>
          Bienvenue
        </div>
        <div style={{ fontSize: 14, color: C.textSoft, textAlign: 'center', marginBottom: 40, maxWidth: 300, lineHeight: 1.6 }}>
          Je suis <strong style={{ color: C.melodie }}>Melodie</strong>, ton assistante.
          Je vais t'accompagner pas a pas.
        </div>
        <div style={{ width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button
            onClick={() => setStep('signup')}
            style={{
              padding: '16px 24px', borderRadius: 14,
              background: C.accent, color: 'white',
              fontSize: 16, fontWeight: 600, border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            Premiere connexion
            <ArrowRight size={18} />
          </button>
          <button
            onClick={() => setStep('login')}
            style={{
              padding: '16px 24px', borderRadius: 14,
              background: C.surface, color: C.text,
              fontSize: 16, fontWeight: 600, border: `1px solid ${C.border}`, cursor: 'pointer',
            }}
          >
            Se connecter
          </button>
        </div>
        <div style={{ marginTop: 32, fontSize: 11, color: C.textMuted }}>
          Stage Stock v11.0
        </div>
      </div>
    )
  }

  // ─── 3. SIGNUP FORM ───
  if (step === 'signup') {
    return (
      <div style={{
        minHeight: '100dvh', background: C.bg,
        display: 'flex', flexDirection: 'column', padding: 24,
        animation: 'fadeIn 0.3s ease',
      }}>
        <button onClick={() => setStep('welcome')} style={{
          fontSize: 14, color: C.textMuted, background: 'none', border: 'none',
          cursor: 'pointer', alignSelf: 'flex-start', marginBottom: 16, padding: '8px 0',
        }}>
          ← Retour
        </button>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: 380, width: '100%', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <MelodieAvatar size={36} />
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.text }}>Creer ton compte</div>
              <div style={{ fontSize: 12, color: C.textSoft }}>C'est rapide, je te guide</div>
            </div>
          </div>

          {authError && (
            <div style={{
              padding: '10px 14px', borderRadius: 10, marginBottom: 16,
              background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.15)',
              color: '#DC2626', fontSize: 13,
            }}>{authError}</div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.textSoft, display: 'block', marginBottom: 6 }}>Email</label>
            <input className="input" type="email" placeholder="ton@email.com" value={email}
              onChange={e => setEmail(e.target.value)} autoComplete="email" autoFocus
              style={{ fontSize: 16, padding: '14px 16px' }} />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.textSoft, display: 'block', marginBottom: 6 }}>Mot de passe</label>
            <div style={{ position: 'relative' }}>
              <input className="input" type={showPwd ? 'text' : 'password'} placeholder="6 caracteres minimum"
                value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password"
                onKeyDown={e => e.key === 'Enter' && handleSignup()}
                style={{ fontSize: 16, padding: '14px 16px', paddingRight: 48 }} />
              <button onClick={() => setShowPwd(!showPwd)} style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted,
              }}>
                {createElement(showPwd ? EyeOff : Eye, { size: 18 })}
              </button>
            </div>
          </div>
          <button onClick={handleSignup} disabled={authLoading} style={{
            padding: '16px', borderRadius: 12, background: C.accent, color: 'white',
            fontSize: 16, fontWeight: 600, border: 'none', cursor: 'pointer',
            opacity: authLoading ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            {authLoading ? <><Loader2 size={18} className="spin" /> Inscription...</> : 'Creer mon compte'}
          </button>
          <button onClick={() => { setStep('login'); setAuthError('') }} style={{
            marginTop: 12, fontSize: 13, color: C.accent, background: 'none', border: 'none', cursor: 'pointer',
          }}>
            Deja un compte ? Se connecter
          </button>
        </div>
      </div>
    )
  }

  // ─── 4. LOGIN FORM ───
  if (step === 'login') {
    return (
      <div style={{
        minHeight: '100dvh', background: C.bg,
        display: 'flex', flexDirection: 'column', padding: 24,
        animation: 'fadeIn 0.3s ease',
      }}>
        <button onClick={() => setStep('welcome')} style={{
          fontSize: 14, color: C.textMuted, background: 'none', border: 'none',
          cursor: 'pointer', alignSelf: 'flex-start', marginBottom: 16, padding: '8px 0',
        }}>
          ← Retour
        </button>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: 380, width: '100%', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <MelodieAvatar size={36} />
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.text }}>Content de te revoir</div>
              <div style={{ fontSize: 12, color: C.textSoft }}>Connecte-toi pour continuer</div>
            </div>
          </div>

          {authError && (
            <div style={{
              padding: '10px 14px', borderRadius: 10, marginBottom: 16,
              background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.15)',
              color: '#DC2626', fontSize: 13,
            }}>{authError}</div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.textSoft, display: 'block', marginBottom: 6 }}>Email</label>
            <input className="input" type="email" placeholder="ton@email.com" value={email}
              onChange={e => setEmail(e.target.value)} autoComplete="email" autoFocus
              style={{ fontSize: 16, padding: '14px 16px' }} />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.textSoft, display: 'block', marginBottom: 6 }}>Mot de passe</label>
            <div style={{ position: 'relative' }}>
              <input className="input" type={showPwd ? 'text' : 'password'} placeholder="Ton mot de passe"
                value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password"
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                style={{ fontSize: 16, padding: '14px 16px', paddingRight: 48 }} />
              <button onClick={() => setShowPwd(!showPwd)} style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted,
              }}>
                {createElement(showPwd ? EyeOff : Eye, { size: 18 })}
              </button>
            </div>
          </div>
          <button onClick={handleLogin} disabled={authLoading} style={{
            padding: '16px', borderRadius: 12, background: C.accent, color: 'white',
            fontSize: 16, fontWeight: 600, border: 'none', cursor: 'pointer',
            opacity: authLoading ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            {authLoading ? <><Loader2 size={18} className="spin" /> Connexion...</> : 'Se connecter'}
          </button>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
            <button onClick={handleForgotPassword} style={{
              fontSize: 12, color: C.textMuted, background: 'none', border: 'none', cursor: 'pointer',
            }}>
              Mot de passe oublie ?
            </button>
            <button onClick={() => { setStep('signup'); setAuthError('') }} style={{
              fontSize: 13, color: C.accent, background: 'none', border: 'none', cursor: 'pointer',
            }}>
              Creer un compte
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─── 4b. PASSWORD RESET SENT ───
  if (step === 'reset_sent') {
    return (
      <FadeScreen onDone={() => setStep('login')} duration={4000}>
        <MelodieAvatar size={56} />
        <div style={{ fontSize: 18, fontWeight: 600, color: C.text, textAlign: 'center', maxWidth: 300 }}>
          Email envoye !
        </div>
        <div style={{ fontSize: 14, color: C.textSoft, textAlign: 'center', maxWidth: 300 }}>
          Verifie ta boite mail pour reinitialiser ton mot de passe.
        </div>
      </FadeScreen>
    )
  }

  // ─── 4c. CONFIRM EMAIL ───
  if (step === 'confirm_email') {
    return (
      <div style={{
        minHeight: '100dvh', background: C.bg,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: 24,
      }}>
        <MelodieAvatar size={56} />
        <div style={{ fontSize: 20, fontWeight: 700, color: C.text, marginTop: 20, textAlign: 'center' }}>
          Verifie ton email
        </div>
        <div style={{ fontSize: 14, color: C.textSoft, textAlign: 'center', maxWidth: 300, marginTop: 8, lineHeight: 1.6 }}>
          Un email de confirmation a ete envoye. Clique sur le lien, puis reviens ici pour te connecter.
        </div>
        <button onClick={() => { setStep('login'); setAuthError('') }} style={{
          marginTop: 24, padding: '14px 32px', borderRadius: 12,
          background: C.accent, color: 'white', fontSize: 15, fontWeight: 600,
          border: 'none', cursor: 'pointer',
        }}>
          Se connecter
        </button>
      </div>
    )
  }

  // ─── 5. REGISTERED (transition) ───
  if (step === 'registered') {
    return (
      <FadeScreen onDone={() => setStep('intro')} duration={2500}>
        <div style={{
          width: 56, height: 56, borderRadius: 28,
          background: `${C.success}15`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Check size={28} color={C.success} />
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color: C.text }}>Parfait, tu es inscrit !</div>
      </FadeScreen>
    )
  }

  // ─── 6. INTRO (transition) ───
  if (step === 'intro') {
    return (
      <FadeScreen onDone={() => setStep('ask_name')} duration={3000}>
        <MelodieAvatar size={56} />
        <div style={{ fontSize: 18, fontWeight: 600, color: C.text, textAlign: 'center', maxWidth: 300 }}>
          Je vais te montrer comment je fonctionne
        </div>
        <div style={{ fontSize: 13, color: C.textSoft }}>Ca ne prendra qu'une minute</div>
      </FadeScreen>
    )
  }

  // ─── 7. ASK NAME (chat-style) ───
  if (step === 'ask_name') {
    return (
      <div style={{
        minHeight: '100dvh', background: C.bg,
        display: 'flex', flexDirection: 'column', padding: 24,
        animation: 'fadeIn 0.3s ease',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <MelodieAvatar size={32} />
          <div style={{ fontSize: 14, fontWeight: 600, color: C.melodie }}>Melodie</div>
        </div>

        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto' }}>
          <Bubble delay={300}>Comment tu t'appelles ?</Bubble>
          <Bubble delay={800}>C'est pour personnaliser ton experience.</Bubble>
        </div>

        <div style={{ paddingTop: 16 }}>
          <input className="input" placeholder="Ton prenom ou pseudo" value={displayName}
            onChange={e => setDisplayName(e.target.value)} autoFocus
            onKeyDown={e => e.key === 'Enter' && displayName.trim() && saveProfile()}
            style={{ fontSize: 16, padding: '14px 16px', marginBottom: 12 }} />
          <button onClick={saveProfile} disabled={!displayName.trim() || saving} style={{
            width: '100%', padding: '14px', borderRadius: 12,
            background: displayName.trim() ? C.accent : C.border,
            color: displayName.trim() ? 'white' : C.textMuted,
            fontSize: 15, fontWeight: 600, border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            {saving ? <Loader2 size={16} className="spin" /> : 'Continuer'}
          </button>
        </div>
      </div>
    )
  }

  // ─── 8. GREET ───
  if (step === 'greet') {
    return (
      <FadeScreen onDone={() => setStep('show_menu')} duration={2500}>
        <MelodieAvatar size={56} />
        <div style={{ fontSize: 20, fontWeight: 700, color: C.text }}>
          Enchante, {displayName} !
        </div>
      </FadeScreen>
    )
  }

  // ─── 9. SHOW MENU EXPLANATION ───
  if (step === 'show_menu') {
    return (
      <div style={{
        minHeight: '100dvh', background: C.bg,
        display: 'flex', flexDirection: 'column', padding: 24,
        animation: 'fadeIn 0.3s ease',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <MelodieAvatar size={32} />
          <div style={{ fontSize: 14, fontWeight: 600, color: C.melodie }}>Melodie</div>
        </div>

        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto' }}>
          <Bubble delay={300}>
            Voici comment ca marche, {displayName}.
          </Bubble>
          <Bubble delay={1200}>
            Depuis ton <strong>menu principal</strong>, tu pourras voir rapidement tout ce qui concerne tes projets, les projets dans lesquels tu es membre, ton calendrier, des rappels, tes prochaines dates et tes prochaines missions.
          </Bubble>
          <Bubble delay={2400}>
            Mais d'abord, il faut creer ou rejoindre un projet.
          </Bubble>
        </div>

        <div style={{ paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={() => setStep('create_project')} style={{
            padding: '16px', borderRadius: 14, background: C.accent, color: 'white',
            fontSize: 15, fontWeight: 600, border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          }}>
            {createElement(FolderPlus, { size: 18 })}
            Creer un projet
          </button>
          <button onClick={() => setStep('join_project')} style={{
            padding: '16px', borderRadius: 14, background: C.surface, color: C.text,
            fontSize: 15, fontWeight: 600, border: `1px solid ${C.border}`, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          }}>
            {createElement(QrCode, { size: 18 })}
            Rejoindre un projet
          </button>
          <button onClick={() => {
            localStorage.setItem('onboarding_complete', 'true')
            onAuth(user)
            onComplete(null)
          }} style={{
            marginTop: 4, fontSize: 12, color: C.textMuted,
            background: 'none', border: 'none', cursor: 'pointer',
            textDecoration: 'underline',
          }}>
            Plus tard
          </button>
        </div>
      </div>
    )
  }

  // ─── 10. CREATE PROJECT ───
  if (step === 'create_project') {
    return (
      <div style={{
        minHeight: '100dvh', background: C.bg,
        display: 'flex', flexDirection: 'column', padding: 24,
        animation: 'fadeIn 0.3s ease',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <MelodieAvatar size={32} />
          <div style={{ fontSize: 14, fontWeight: 600, color: C.melodie }}>Melodie</div>
        </div>

        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto' }}>
          <Bubble delay={300}>
            Super ! Un projet, c'est une tournee, un festival, une compagnie... tout ce qui necessite de gerer du stock et une equipe.
          </Bubble>
          <Bubble delay={1000}>
            Comment s'appelle ton projet ?
          </Bubble>
        </div>

        <div style={{ paddingTop: 16 }}>
          <input className="input" placeholder="Ex: Ma Tournee 2026" value={projectName}
            onChange={e => setProjectName(e.target.value)} autoFocus
            onKeyDown={e => e.key === 'Enter' && projectName.trim() && createProject()}
            style={{ fontSize: 16, padding: '14px 16px', marginBottom: 12 }} />
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setStep('show_menu')} style={{
              padding: '14px 16px', borderRadius: 12, background: C.surface,
              color: C.textSoft, fontSize: 14, fontWeight: 600, border: `1px solid ${C.border}`, cursor: 'pointer',
            }}>Retour</button>
            <button onClick={createProject} disabled={!projectName.trim() || saving} style={{
              flex: 1, padding: '14px', borderRadius: 12,
              background: projectName.trim() ? C.accent : C.border,
              color: projectName.trim() ? 'white' : C.textMuted,
              fontSize: 15, fontWeight: 600, border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              {saving ? <Loader2 size={16} className="spin" /> : <>Creer {createElement(ArrowRight, { size: 16 })}</>}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─── 11. JOIN PROJECT (QR placeholder) ───
  if (step === 'join_project') {
    return (
      <div style={{
        minHeight: '100dvh', background: C.bg,
        display: 'flex', flexDirection: 'column', padding: 24,
        animation: 'fadeIn 0.3s ease',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <MelodieAvatar size={32} />
          <div style={{ fontSize: 14, fontWeight: 600, color: C.melodie }}>Melodie</div>
        </div>

        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <Bubble delay={300}>
            Demande le code d'invitation ou le QR code au responsable du projet. Tu pourras scanner le QR code depuis l'application une fois connecte.
          </Bubble>
          <div style={{ margin: '24px 0', padding: 32, borderRadius: 20, background: C.surface, border: `2px dashed ${C.border}`, textAlign: 'center' }}>
            {createElement(QrCode, { size: 48, color: C.textMuted })}
            <div style={{ fontSize: 13, color: C.textMuted, marginTop: 12 }}>Scan QR disponible dans l'app</div>
          </div>
        </div>

        <div style={{ paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={() => {
            localStorage.setItem('onboarding_complete', 'true')
            onAuth(user)
            onComplete(null)
          }} style={{
            padding: '16px', borderRadius: 14, background: C.accent, color: 'white',
            fontSize: 15, fontWeight: 600, border: 'none', cursor: 'pointer',
          }}>
            Continuer vers l'application
          </button>
          <button onClick={() => setStep('show_menu')} style={{
            fontSize: 13, color: C.textMuted, background: 'none', border: 'none', cursor: 'pointer',
          }}>
            Retour
          </button>
        </div>
      </div>
    )
  }

  // ─── 12. ASK ROLE ───
  if (step === 'ask_role') {
    const roleOrder = ['TM', 'PM', 'TD', 'SE', 'LD', 'SM', 'BL', 'MM', 'LOG', 'SAFE', 'AA', 'PA']
    const availableRoles = roles?.length > 0
      ? roleOrder.map(code => roles.find(r => r.code === code)).filter(Boolean)
      : roleOrder.map(code => ({ code, id: code, ...ROLE_CONF[code] }))

    return (
      <div style={{
        minHeight: '100dvh', background: C.bg,
        display: 'flex', flexDirection: 'column', padding: 24,
        animation: 'fadeIn 0.3s ease',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <MelodieAvatar size={32} />
          <div style={{ fontSize: 14, fontWeight: 600, color: C.melodie }}>Melodie</div>
        </div>

        <Bubble>Derniere etape ! Quel est ton role dans ce projet ?</Bubble>

        <div style={{ flex: 1, overflowY: 'auto', marginTop: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {availableRoles.map(role => {
              const conf = ROLE_CONF[role.code]
              if (!conf) return null
              const isSelected = selectedRole?.code === role.code
              const inherited = getInheritedRoles(role.code)
              return (
                <button key={role.code} onClick={() => setSelectedRole(role)} style={{
                  padding: '12px 10px', borderRadius: 12, cursor: 'pointer',
                  border: `2px solid ${isSelected ? conf.color : C.border}`,
                  background: isSelected ? `${conf.color}10` : 'white',
                  textAlign: 'center', transition: 'all 0.15s', position: 'relative',
                }}>
                  {inherited.length > 0 && (
                    <div style={{
                      position: 'absolute', top: 4, right: 4,
                      fontSize: 8, fontWeight: 700, color: conf.color,
                      background: `${conf.color}15`, borderRadius: 4, padding: '2px 5px',
                    }}>+{inherited.length}</div>
                  )}
                  <div style={{ marginBottom: 4, display: 'flex', justifyContent: 'center' }}>
                    {createElement(conf.icon, { size: 22, color: isSelected ? conf.color : C.textMuted })}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: isSelected ? conf.color : C.text }}>
                    {conf.label}
                  </div>
                  {isSelected && (
                    <div style={{
                      position: 'absolute', top: 4, left: 4,
                      width: 16, height: 16, borderRadius: 5,
                      background: conf.color, color: 'white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Check size={10} strokeWidth={3} />
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {selectedRole && getInheritedRoles(selectedRole.code).length > 0 && (
            <div style={{
              marginTop: 12, padding: '10px 14px', borderRadius: 12,
              background: `${ROLE_CONF[selectedRole.code]?.color}08`,
              border: `1px solid ${ROLE_CONF[selectedRole.code]?.color}20`,
              fontSize: 11, color: C.textSoft,
            }}>
              <strong style={{ color: ROLE_CONF[selectedRole.code]?.color }}>
                {ROLE_CONF[selectedRole.code]?.label}
              </strong> donne aussi acces a : {getInheritedRoles(selectedRole.code).map(c => ROLE_CONF[c]?.label).filter(Boolean).join(', ')}
            </div>
          )}
        </div>

        <div style={{ paddingTop: 16 }}>
          <button onClick={saveRole} disabled={!selectedRole || saving} style={{
            width: '100%', padding: '16px', borderRadius: 12,
            background: selectedRole ? (ROLE_CONF[selectedRole.code]?.color || C.accent) : C.border,
            color: selectedRole ? 'white' : C.textMuted,
            fontSize: 16, fontWeight: 600, border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            {saving ? <Loader2 size={16} className="spin" /> : 'Valider'}
          </button>
        </div>
      </div>
    )
  }

  // ─── 13. COMPLETE ───
  if (step === 'complete') {
    return (
      <FadeScreen onDone={finishOnboarding} duration={3000}>
        <MelodieAvatar size={56} />
        <div style={{ fontSize: 20, fontWeight: 700, color: C.text }}>
          C'est parti, {displayName} !
        </div>
        <div style={{ fontSize: 14, color: C.textSoft, textAlign: 'center', maxWidth: 280 }}>
          Ton projet est pret. Je serai toujours la si tu as besoin d'aide.
        </div>
      </FadeScreen>
    )
  }

  return null
}
