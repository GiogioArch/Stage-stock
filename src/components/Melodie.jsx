import React, { useState, useEffect, useRef, createElement, useCallback } from 'react'
import { auth, db } from '../lib/supabase'
import { ROLE_CONF, getInheritedModules, getInheritedRoles } from './RolePicker'
import {
  Music, Loader2, Eye, EyeOff, FolderPlus, QrCode, Check,
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
  success: '#10B981',
}

const ALL_MODULES = ['dashboard', 'equipe', 'articles', 'depots', 'stock', 'tournee', 'alertes', 'finance', 'forecast']

// ─── Typing effect hook ───
function useTyping(text, speed = 35, startDelay = 300) {
  const [displayed, setDisplayed] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    setDisplayed('')
    setDone(false)
    if (!text) { setDone(true); return }

    let i = 0
    const delay = setTimeout(() => {
      const interval = setInterval(() => {
        i++
        setDisplayed(text.slice(0, i))
        if (i >= text.length) {
          clearInterval(interval)
          setDone(true)
        }
      }, speed)
      return () => clearInterval(interval)
    }, startDelay)
    return () => clearTimeout(delay)
  }, [text, speed, startDelay])

  return { displayed, done }
}

// ─── Single typing bubble ───
function TypingBubble({ text, speed = 35, delay = 300, onDone }) {
  const { displayed, done } = useTyping(text, speed, delay)

  useEffect(() => {
    if (done && onDone) onDone()
  }, [done])

  if (!displayed) return null

  return (
    <div style={{
      display: 'flex', gap: 10, marginBottom: 12,
      alignItems: 'flex-start', animation: 'fadeIn 0.2s ease',
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 16,
        background: `linear-gradient(135deg, ${C.melodie}, ${C.accent})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        {createElement(Music, { size: 16, color: 'white' })}
      </div>
      <div style={{
        padding: '10px 14px', borderRadius: '14px 14px 14px 4px',
        background: C.surface, border: `1px solid ${C.border}`,
        fontSize: 15, lineHeight: 1.6, color: C.text, maxWidth: '80%',
      }}>
        {displayed}
        {!done && <span style={{ animation: 'pulse 0.8s infinite', marginLeft: 2 }}>|</span>}
      </div>
    </div>
  )
}

// ─── Static bubble (already typed) ───
function StaticBubble({ text, isUser }) {
  return (
    <div style={{
      display: 'flex', gap: 10, marginBottom: 12,
      alignItems: 'flex-start',
      flexDirection: isUser ? 'row-reverse' : 'row',
    }}>
      {!isUser && (
        <div style={{
          width: 32, height: 32, borderRadius: 16,
          background: `linear-gradient(135deg, ${C.melodie}, ${C.accent})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          {createElement(Music, { size: 16, color: 'white' })}
        </div>
      )}
      <div style={{
        padding: '10px 14px',
        borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
        background: isUser ? `${C.accent}10` : C.surface,
        border: `1px solid ${isUser ? `${C.accent}20` : C.border}`,
        fontSize: 15, lineHeight: 1.6, color: C.text, maxWidth: '80%',
      }}>
        {text}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════
// MAIN — Conversational onboarding
// ═══════════════════════════════════════════════
export default function Melodie({ onAuth, onComplete, roles, onToast, existingUser, startStep }) {
  const [step, setStep] = useState(startStep || 0)
  const [history, setHistory] = useState([]) // Past messages
  const [typing, setTyping] = useState(null) // Current typing text
  const [showInput, setShowInput] = useState(null) // 'name' | 'signup' | 'login' | 'roles' | 'project' | 'buttons'
  const [user, setUser] = useState(existingUser || null)
  const scrollRef = useRef(null)

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

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }), 50)
    }
  }, [history, typing, showInput, step])

  // ─── Step machine ───
  const addToHistory = useCallback((text, isUser = false) => {
    setHistory(h => [...h, { text, isUser }])
  }, [])

  const runStep = useCallback((s) => {
    setShowInput(null)
    setTyping(null)

    switch (s) {
      case 0: // Bonjour
        setTyping('Bonjour')
        break
      case 1: // Je m'appelle Melodie
        setTyping("Je m'appelle Melodie")
        break
      case 2: // Je suis ton assistante
        setTyping('Je suis ton assistante')
        break
      case 3: // Premiere connexion ?
        setTyping("C'est ta premiere connexion ?")
        break
      case 'show_first_buttons': // OUI / NON
        setShowInput('first_choice')
        break
      case 4: // Comment tu t'appelles ?
        setTyping("Comment tu t'appelles ?")
        break
      case 'show_name_input':
        setShowInput('name')
        break
      case 5: // Enchante PRENOM
        setTyping(`Enchante ${displayName} !`)
        break
      case 6:
        setTyping("Bienvenue dans Stage Stock, la webapp dediee aux professionnels du spectacle vivant.")
        break
      case 7:
        setTyping("Suis-moi, je vais te montrer.")
        break
      case 8:
        setTyping("Commence par t'inscrire avec une adresse mail et un mot de passe.")
        break
      case 'show_signup':
        setShowInput('signup')
        break
      case 9: // After signup
        setTyping("Super ! Tu es inscrit !")
        break
      case 10:
        setTyping("Maintenant je veux en savoir plus sur toi pour parametrer ton profil.")
        break
      case 11:
        setTyping("Commence par selectionner ton metier. Tu peux en choisir plusieurs si tu es polyvalent.")
        break
      case 'show_roles':
        setShowInput('roles')
        break
      case 12: // After roles
        setTyping("Parfait ! Tu es " + selectedRoles.map(r => ROLE_CONF[r]?.label).filter(Boolean).join(', ') + ".")
        break
      case 13:
        setTyping("Derniere etape : donne un nom a ton premier projet.")
        break
      case 14:
        setTyping("Un projet, c'est une tournee, un festival, une compagnie... tout ce qui necessite de gerer du stock et une equipe.")
        break
      case 'show_project':
        setShowInput('project')
        break
      case 15: // After project
        setTyping("C'est parti ! Ton espace est pret.")
        break
      case 16:
        setTyping("Je serai toujours la si tu as besoin d'aide. Clique sur le bouton violet en bas a droite pour me parler.")
        break
      case 'finish':
        setTimeout(() => {
          onAuth(user)
          if (createdMembership) onComplete(createdMembership)
          else onComplete(null)
        }, 1500)
        break
      default:
        break
    }
  }, [displayName, selectedRoles, user, createdMembership, onAuth, onComplete])

  // Start the conversation
  useEffect(() => {
    if (existingUser) {
      // Already logged in, skip to name
      runStep(4)
    } else {
      runStep(0)
    }
  }, [])

  // Step sequencing
  const onTypingDone = useCallback(() => {
    const s = step
    addToHistory(typing)
    setTyping(null)

    const SEQUENCES = {
      0: 1,
      1: 2,
      2: 3,
      3: 'show_first_buttons',
      4: 'show_name_input',
      5: 6,
      6: 7,
      7: 8,
      8: 'show_signup',
      9: 10,
      10: 11,
      11: 'show_roles',
      12: 13,
      13: 14,
      14: 'show_project',
      15: 16,
      16: 'finish',
    }

    const next = SEQUENCES[s]
    if (next !== undefined) {
      setStep(next)
      setTimeout(() => runStep(next), 400)
    }
  }, [step, typing, addToHistory, runStep])

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
        return
      }
      if (data.access_token) {
        setUser(data.user)
      } else if (data.id) {
        const login = await auth.signIn(email, password)
        if (login.access_token) {
          setUser(login.user)
        } else {
          setAuthError('Compte cree ! Verifie ton email puis connecte-toi.')
          return
        }
      }
      // Success — save name if we have it
      if (displayName.trim()) {
        try {
          await db.upsert('user_details', { user_id: (data.user || data).id, first_name: displayName.trim() })
        } catch { try { await db.insert('user_details', { user_id: (data.user || data).id, first_name: displayName.trim() }) } catch {} }
      }
      setShowInput(null)
      addToHistory(`${email}`, true)
      setStep(9)
      setTimeout(() => runStep(9), 400)
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

  // ─── Role save ───
  const handleRolesConfirm = async () => {
    if (selectedRoles.length === 0) return
    setShowInput(null)
    addToHistory(selectedRoles.map(r => ROLE_CONF[r]?.label).join(', '), true)
    setStep(12)
    setTimeout(() => runStep(12), 400)
  }

  // ─── Project create ───
  const handleProjectCreate = async () => {
    if (!projectName.trim() || !user) return
    setSaving(true)
    try {
      const slug = projectName.trim().toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 30)
      const orgs = await db.insert('organizations', { name: projectName.trim(), slug: slug || 'projet' })
      const org = orgs[0]
      setCreatedOrg(org)

      // Create membership
      const primaryRole = selectedRoles[0] || null
      const moduleAccess = primaryRole ? getInheritedModules(primaryRole) : ALL_MODULES
      const members = await db.insert('project_members', {
        user_id: user.id, org_id: org.id,
        module_access: moduleAccess, is_admin: true, status: 'active',
        role_id: primaryRole,
      })
      setCreatedMembership({ ...members[0], org })

      // Save role profile
      if (primaryRole) {
        try {
          await db.upsert('user_profiles', { user_id: user.id, role_id: primaryRole, org_id: org.id })
        } catch { try { await db.insert('user_profiles', { user_id: user.id, role_id: primaryRole, org_id: org.id }) } catch {} }
      }

      localStorage.setItem('onboarding_complete', 'true')
      setShowInput(null)
      addToHistory(projectName.trim(), true)
      setStep(15)
      setTimeout(() => runStep(15), 400)
    } catch (e) {
      onToast?.('Erreur: ' + e.message, '#DC2626')
    } finally {
      setSaving(false)
    }
  }

  // ═══════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════
  return (
    <div style={{
      minHeight: '100dvh', background: C.bg,
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Chat area */}
      <div ref={scrollRef} style={{
        flex: 1, overflowY: 'auto', padding: '48px 20px 24px',
        WebkitOverflowScrolling: 'touch',
      }}>
        {/* History */}
        {history.map((msg, i) => (
          <StaticBubble key={i} text={msg.text} isUser={msg.isUser} />
        ))}

        {/* Currently typing */}
        {typing && (
          <TypingBubble text={typing} speed={30} delay={200} onDone={onTypingDone} />
        )}

        {/* ─── Interactive inputs ─── */}

        {/* First choice: OUI / NON */}
        {showInput === 'first_choice' && (
          <div style={{ display: 'flex', gap: 10, marginLeft: 42, marginBottom: 12, animation: 'fadeIn 0.3s ease' }}>
            <button onClick={() => {
              addToHistory('Oui', true)
              setShowInput(null)
              setStep(4)
              setTimeout(() => runStep(4), 400)
            }} style={{
              padding: '12px 28px', borderRadius: 12, background: C.accent,
              color: 'white', fontSize: 15, fontWeight: 600, border: 'none', cursor: 'pointer',
            }}>Oui</button>
            <button onClick={() => {
              addToHistory('Non', true)
              setShowInput(null)
              setShowInput('login')
            }} style={{
              padding: '12px 28px', borderRadius: 12, background: C.surface,
              color: C.text, fontSize: 15, fontWeight: 600, border: `1px solid ${C.border}`, cursor: 'pointer',
            }}>Non</button>
          </div>
        )}

        {/* Name input */}
        {showInput === 'name' && (
          <div style={{ marginLeft: 42, marginBottom: 12, animation: 'fadeIn 0.3s ease' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="input"
                placeholder="Ton prenom ou pseudo"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && displayName.trim()) {
                    addToHistory(displayName.trim(), true)
                    setShowInput(null)
                    setStep(5)
                    setTimeout(() => runStep(5), 400)
                  }
                }}
                autoFocus
                style={{ flex: 1, fontSize: 15, padding: '12px 14px', borderRadius: 12 }}
              />
              <button onClick={() => {
                if (!displayName.trim()) return
                addToHistory(displayName.trim(), true)
                setShowInput(null)
                setStep(5)
                setTimeout(() => runStep(5), 400)
              }} disabled={!displayName.trim()} style={{
                padding: '12px 20px', borderRadius: 12,
                background: displayName.trim() ? C.accent : C.border,
                color: 'white', fontWeight: 600, border: 'none', cursor: 'pointer',
                fontSize: 14,
              }}>OK</button>
            </div>
          </div>
        )}

        {/* Signup form */}
        {showInput === 'signup' && (
          <div style={{ marginLeft: 42, marginBottom: 12, animation: 'fadeIn 0.3s ease', maxWidth: 340 }}>
            {authError && (
              <div style={{
                padding: '8px 12px', borderRadius: 8, marginBottom: 10,
                background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.15)',
                color: '#DC2626', fontSize: 12,
              }}>{authError}</div>
            )}
            <div style={{ marginBottom: 10 }}>
              <input className="input" type="email" placeholder="Email" value={email}
                onChange={e => setEmail(e.target.value)} autoComplete="email" autoFocus
                style={{ fontSize: 15, padding: '12px 14px', borderRadius: 12 }} />
            </div>
            <div style={{ marginBottom: 12, position: 'relative' }}>
              <input className="input" type={showPwd ? 'text' : 'password'} placeholder="Mot de passe (6 car. min)"
                value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password"
                onKeyDown={e => e.key === 'Enter' && handleSignup()}
                style={{ fontSize: 15, padding: '12px 14px', paddingRight: 44, borderRadius: 12 }} />
              <button onClick={() => setShowPwd(!showPwd)} style={{
                position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, padding: 4,
              }}>
                {createElement(showPwd ? EyeOff : Eye, { size: 18 })}
              </button>
            </div>
            <button onClick={handleSignup} disabled={authLoading} style={{
              width: '100%', padding: '14px', borderRadius: 12,
              background: C.accent, color: 'white', fontSize: 15, fontWeight: 600,
              border: 'none', cursor: 'pointer', opacity: authLoading ? 0.6 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              {authLoading ? <>{createElement(Loader2, { size: 16, className: 'spin' })} Inscription...</> : "S'inscrire"}
            </button>
          </div>
        )}

        {/* Login form */}
        {showInput === 'login' && (
          <div style={{ marginLeft: 42, marginBottom: 12, animation: 'fadeIn 0.3s ease', maxWidth: 340 }}>
            <StaticBubble text="Content de te revoir ! Connecte-toi." />
            {authError && (
              <div style={{
                padding: '8px 12px', borderRadius: 8, marginBottom: 10,
                background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.15)',
                color: '#DC2626', fontSize: 12,
              }}>{authError}</div>
            )}
            <div style={{ marginBottom: 10 }}>
              <input className="input" type="email" placeholder="Email" value={email}
                onChange={e => setEmail(e.target.value)} autoComplete="email" autoFocus
                style={{ fontSize: 15, padding: '12px 14px', borderRadius: 12 }} />
            </div>
            <div style={{ marginBottom: 12, position: 'relative' }}>
              <input className="input" type={showPwd ? 'text' : 'password'} placeholder="Mot de passe"
                value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password"
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                style={{ fontSize: 15, padding: '12px 14px', paddingRight: 44, borderRadius: 12 }} />
              <button onClick={() => setShowPwd(!showPwd)} style={{
                position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, padding: 4,
              }}>
                {createElement(showPwd ? EyeOff : Eye, { size: 18 })}
              </button>
            </div>
            <button onClick={handleLogin} disabled={authLoading} style={{
              width: '100%', padding: '14px', borderRadius: 12,
              background: C.accent, color: 'white', fontSize: 15, fontWeight: 600,
              border: 'none', cursor: 'pointer', opacity: authLoading ? 0.6 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              {authLoading ? <>{createElement(Loader2, { size: 16, className: 'spin' })} Connexion...</> : 'Se connecter'}
            </button>
            <button onClick={() => {
              setShowInput(null)
              setAuthError('')
              addToHistory('Finalement, oui', true)
              setStep(4)
              setTimeout(() => runStep(4), 400)
            }} style={{
              marginTop: 8, fontSize: 12, color: C.textMuted,
              background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'center',
            }}>
              Premiere connexion ? Creer un compte
            </button>
          </div>
        )}

        {/* Role selector */}
        {showInput === 'roles' && (
          <div style={{ marginLeft: 42, marginBottom: 12, animation: 'fadeIn 0.3s ease' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, maxWidth: 360 }}>
              {['TM', 'PM', 'TD', 'SE', 'LD', 'SM', 'BL', 'MM', 'LOG', 'SAFE', 'AA', 'PA'].map(code => {
                const conf = ROLE_CONF[code]
                if (!conf) return null
                const isSelected = selectedRoles.includes(code)
                return (
                  <button key={code} onClick={() => {
                    setSelectedRoles(prev =>
                      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
                    )
                  }} style={{
                    padding: '10px 8px', borderRadius: 12, cursor: 'pointer',
                    border: `2px solid ${isSelected ? conf.color : C.border}`,
                    background: isSelected ? `${conf.color}10` : 'white',
                    display: 'flex', alignItems: 'center', gap: 8,
                    transition: 'all 0.15s', position: 'relative',
                  }}>
                    {isSelected && (
                      <div style={{
                        position: 'absolute', top: 4, right: 4,
                        width: 16, height: 16, borderRadius: 8,
                        background: conf.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {createElement(Check, { size: 10, color: 'white', strokeWidth: 3 })}
                      </div>
                    )}
                    <div style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: `${conf.color}15`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {createElement(conf.icon, { size: 16, color: isSelected ? conf.color : C.textMuted })}
                    </div>
                    <span style={{
                      fontSize: 11, fontWeight: 600, textAlign: 'left',
                      color: isSelected ? conf.color : C.text,
                    }}>{conf.label}</span>
                  </button>
                )
              })}
            </div>
            {selectedRoles.length > 0 && (
              <button onClick={handleRolesConfirm} style={{
                marginTop: 12, width: '100%', maxWidth: 360, padding: '14px',
                borderRadius: 12, background: C.accent, color: 'white',
                fontSize: 15, fontWeight: 600, border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                Valider ({selectedRoles.length} role{selectedRoles.length > 1 ? 's' : ''})
              </button>
            )}
          </div>
        )}

        {/* Project name input */}
        {showInput === 'project' && (
          <div style={{ marginLeft: 42, marginBottom: 12, animation: 'fadeIn 0.3s ease', maxWidth: 340 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="input"
                placeholder="Ex: EK Tour 2026"
                value={projectName}
                onChange={e => setProjectName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && projectName.trim() && handleProjectCreate()}
                autoFocus
                style={{ flex: 1, fontSize: 15, padding: '12px 14px', borderRadius: 12 }}
              />
              <button onClick={handleProjectCreate} disabled={!projectName.trim() || saving} style={{
                padding: '12px 20px', borderRadius: 12,
                background: projectName.trim() ? C.accent : C.border,
                color: 'white', fontWeight: 600, border: 'none', cursor: 'pointer', fontSize: 14,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                {saving ? createElement(Loader2, { size: 14, className: 'spin' }) : 'Creer'}
              </button>
            </div>
            <button onClick={() => {
              // Skip project creation
              localStorage.setItem('onboarding_complete', 'true')
              setShowInput(null)
              addToHistory('Plus tard', true)
              onAuth(user)
              onComplete(null)
            }} style={{
              marginTop: 8, fontSize: 12, color: C.textMuted,
              background: 'none', border: 'none', cursor: 'pointer',
            }}>
              Plus tard
            </button>
          </div>
        )}
      </div>

      {/* Skip link at bottom */}
      {step !== 'finish' && (
        <div style={{ padding: '12px 20px', textAlign: 'center' }}>
          <button onClick={() => {
            localStorage.setItem('onboarding_complete', 'true')
            if (user) { onAuth(user); onComplete(null) }
            else setShowInput('login')
          }} style={{
            fontSize: 11, color: C.textMuted, background: 'none', border: 'none',
            cursor: 'pointer', textDecoration: 'underline',
          }}>
            Passer l'introduction
          </button>
        </div>
      )}
    </div>
  )
}
