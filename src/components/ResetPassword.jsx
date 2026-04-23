import React, { useState, useEffect, createElement } from 'react'
import { auth } from '../lib/supabase'
import { Loader2, Eye, EyeOff, Check, Lock, CheckCircle2, AlertCircle } from 'lucide-react'

// Palette coherente avec Melodie.jsx
const C = {
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

/**
 * Ecran de reinitialisation de mot de passe.
 * Active quand Supabase renvoie vers l'app avec #type=recovery dans le hash.
 * App.jsx hydrate la session depuis les tokens, puis monte ce composant.
 *
 * Flow :
 *   1. L'utilisateur saisit un nouveau MDP + confirmation
 *   2. On appelle auth.updatePassword(newPwd)
 *   3. Succes -> message + redirect vers /
 *   4. Erreur -> message visible
 */
export default function ResetPassword({ onDone }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Focus auto sur le 1er champ au montage
  useEffect(() => {
    const el = document.getElementById('rp-new-pwd')
    if (el) el.focus()
  }, [])

  const pwdOk = password.length >= 6
  const pwdStrong = password.length >= 8
  const match = password && password === confirm
  const canSubmit = pwdOk && match && !loading

  async function handleSubmit(e) {
    if (e && e.preventDefault) e.preventDefault()
    setError('')
    if (!pwdOk) return setError('6 caracteres minimum')
    if (!match) return setError('Les deux mots de passe ne correspondent pas')
    setLoading(true)
    try {
      await auth.updatePassword(password)
      setSuccess(true)
      // Nettoyage du hash pour que l'app ne re-declenche pas le flow recovery
      if (typeof window !== 'undefined' && window.history && window.history.replaceState) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search)
      }
      // Redirection apres 2s : retour vers login normal
      setTimeout(() => {
        if (onDone) onDone()
        else if (typeof window !== 'undefined') window.location.href = '/'
      }, 2000)
    } catch (err) {
      setError(err.message || 'Erreur lors du changement de mot de passe')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div style={wrapperStyle}>
        <div style={cardStyle}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: `${C.success}15`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            {createElement(CheckCircle2, { size: 40, color: C.success })}
          </div>
          <h2 style={{ fontSize: 22, color: C.text, margin: '0 0 8px', fontWeight: 600 }}>
            Mot de passe modifie
          </h2>
          <p style={{ fontSize: 14, color: C.textSoft, margin: 0, lineHeight: 1.5 }}>
            Ton nouveau mot de passe est enregistre. Tu vas etre redirige vers l'ecran de connexion.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={wrapperStyle}>
      <div style={cardStyle}>
        <div style={{
          width: 56, height: 56, borderRadius: 14,
          background: C.gradient,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 18px',
        }}>
          {createElement(Lock, { size: 28, color: '#fff' })}
        </div>
        <h2 style={{ fontSize: 22, color: C.text, margin: '0 0 6px', fontWeight: 600, textAlign: 'center' }}>
          Nouveau mot de passe
        </h2>
        <p style={{ fontSize: 14, color: C.textSoft, margin: '0 0 24px', textAlign: 'center', lineHeight: 1.5 }}>
          Choisis un nouveau mot de passe pour ton compte BackStage.
        </p>

        <form onSubmit={handleSubmit}>
          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: 12, marginBottom: 14,
              background: `${C.danger}10`, border: `1px solid ${C.danger}20`,
              color: C.danger, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8,
            }}>
              {createElement(AlertCircle, { size: 16, style: { flexShrink: 0 } })}
              {error}
            </div>
          )}

          {/* Nouveau MDP */}
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Nouveau mot de passe</label>
            <div style={{ position: 'relative' }}>
              <input
                id="rp-new-pwd"
                type={showPwd ? 'text' : 'password'}
                placeholder="6 caracteres minimum"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                style={inputStyle}
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                aria-label={showPwd ? 'Masquer' : 'Afficher'}
                style={eyeBtnStyle}
              >
                {createElement(showPwd ? EyeOff : Eye, { size: 18 })}
              </button>
            </div>
            {pwdStrong && (
              <div style={hintOkStyle}>
                {createElement(Check, { size: 14 })} Mot de passe solide
              </div>
            )}
            {!pwdStrong && pwdOk && (
              <div style={hintMutedStyle}>Astuce : 8 caracteres ou + pour plus de securite</div>
            )}
          </div>

          {/* Confirm MDP */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Confirmer le mot de passe</label>
            <input
              type={showPwd ? 'text' : 'password'}
              placeholder="Retape le mot de passe"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              style={inputStyle}
            />
            {match && (
              <div style={hintOkStyle}>
                {createElement(Check, { size: 14 })} Identique
              </div>
            )}
            {confirm && !match && (
              <div style={{ ...hintMutedStyle, color: C.danger }}>
                Les deux mots de passe ne correspondent pas
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            style={{
              ...submitBtnStyle,
              opacity: canSubmit ? 1 : 0.5,
              cursor: canSubmit ? 'pointer' : 'not-allowed',
            }}
          >
            {loading ? (
              <>
                {createElement(Loader2, { size: 18, style: { animation: 'spin 1s linear infinite' } })}
                Enregistrement...
              </>
            ) : (
              'Changer mon mot de passe'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Styles ───
const wrapperStyle = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 20,
  background: C.surface,
}

const cardStyle = {
  width: '100%',
  maxWidth: 420,
  background: C.bg,
  borderRadius: 20,
  padding: '32px 24px',
  boxShadow: '0 10px 40px rgba(15,23,42,0.08)',
  border: `1px solid ${C.border}`,
}

const labelStyle = {
  display: 'block',
  fontSize: 13,
  color: C.textSoft,
  fontWeight: 500,
  marginBottom: 6,
  marginLeft: 4,
}

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  fontSize: 16,
  padding: '14px 16px',
  paddingRight: 48,
  borderRadius: 14,
  border: `1px solid ${C.border}`,
  background: C.bg,
  color: C.text,
  outline: 'none',
  transition: 'border-color 160ms',
}

const eyeBtnStyle = {
  position: 'absolute',
  right: 12,
  top: '50%',
  transform: 'translateY(-50%)',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: C.textMuted,
  padding: 4,
  display: 'flex',
  alignItems: 'center',
}

const hintOkStyle = {
  fontSize: 12,
  color: C.success,
  marginTop: 6,
  marginLeft: 4,
  display: 'flex',
  alignItems: 'center',
  gap: 4,
}

const hintMutedStyle = {
  fontSize: 12,
  color: C.textMuted,
  marginTop: 6,
  marginLeft: 4,
}

const submitBtnStyle = {
  width: '100%',
  padding: '14px 20px',
  borderRadius: 14,
  background: C.gradient,
  color: '#fff',
  border: 'none',
  fontSize: 15,
  fontWeight: 600,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  transition: 'transform 120ms, opacity 120ms',
}
