import React, { useState } from 'react'
import { auth } from '../lib/supabase'
import { Box, Loader } from 'lucide-react'

export default function Auth({ onAuth, onBack }) {
  const [mode, setMode] = useState('login') // login | signup | forgot
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  function clearFieldError(field) {
    setFieldErrors(prev => { const next = { ...prev }; delete next[field]; return next })
  }

  const handleSubmit = async () => {
    const errs = {}
    if (email && !email.includes('@')) errs.email = 'Email invalide'
    if (!email) errs.email = 'Email invalide'

    if (mode === 'forgot') {
      if (Object.keys(errs).length > 0) { setFieldErrors(errs); return }
      setFieldErrors({})
      setLoading(true)
      setError('')
      setSuccess('')
      try {
        await auth.resetPassword(email)
        setSuccess('Email de réinitialisation envoyé ! Vérifie ta boîte mail.')
      } catch (e) {
        setError(e.message || 'Erreur réseau')
      } finally {
        setLoading(false)
      }
      return
    }

    if (mode !== 'forgot') {
      if (password.length < 8) {
        errs.password = '8 caractères minimum'
      } else if (mode === 'signup' && !/[a-zA-Z]/.test(password)) {
        errs.password = 'Au moins une lettre requise'
      } else if (mode === 'signup' && !/[0-9]/.test(password)) {
        errs.password = 'Au moins un chiffre requis'
      }
    }
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); return }
    setFieldErrors({})

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const data = mode === 'login'
        ? await auth.signIn(email, password)
        : await auth.signUp(email, password)

      if (data.error) {
        setError(data.error_description || data.error || 'Erreur de connexion')
      } else if (data.access_token) {
        onAuth(data.user)
      } else if (data.id && mode === 'signup') {
        setSuccess('Compte créé ! Vérifie ton email si la confirmation est activée, sinon connecte-toi.')
        setMode('login')
      }
    } catch (e) {
      setError(e.message || 'Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#FFFFFF',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: '#6366F1',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 16,
          }}><Box size={28} color="#fff" /></div>
          <div style={{ fontSize: 24, fontWeight: 600, color: '#1E293B' }}>Stage Stock</div>
          <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>
            Gestion de stock pour le spectacle
          </div>
        </div>

        {/* Form */}
        <div className="card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20, textAlign: 'center', color: '#1E293B' }}>
            {mode === 'forgot' ? 'Mot de passe oublié' : mode === 'login' ? 'Connexion' : 'Créer un compte'}
          </h2>

          {error && (
            <div style={{
              padding: 10, borderRadius: 6, background: 'rgba(239,68,68,0.12)',
              border: '1px solid rgba(239,68,68,0.2)', color: '#DC2626',
              fontSize: 13, fontWeight: 500, marginBottom: 16,
            }}>{error}</div>
          )}

          {success && (
            <div style={{
              padding: 10, borderRadius: 6, background: 'rgba(34,197,94,0.12)',
              border: '1px solid rgba(34,197,94,0.2)', color: '#16A34A',
              fontSize: 13, fontWeight: 500, marginBottom: 16,
            }}>{success}</div>
          )}

          <div style={{ marginBottom: 14 }}>
            <label className="label" htmlFor="auth-email">Email</label>
            <input
              id="auth-email"
              className="input"
              type="email"
              placeholder="ton@email.com"
              value={email}
              onChange={e => { setEmail(e.target.value); clearFieldError('email') }}
              autoComplete="email"
              style={fieldErrors.email ? { borderColor: '#DC2626' } : {}}
            />
            {fieldErrors.email && <div style={{ fontSize: 11, color: '#DC2626', fontWeight: 600, marginTop: 3 }}>{fieldErrors.email}</div>}
          </div>

          {mode !== 'forgot' && (
            <div style={{ marginBottom: 20 }}>
              <label className="label" htmlFor="auth-password">Mot de passe</label>
              <input
                id="auth-password"
                className="input"
                type="password"
                placeholder={mode === 'signup' ? '8 caractères, lettre + chiffre' : '8 caractères minimum'}
                value={password}
                onChange={e => { setPassword(e.target.value); clearFieldError('password') }}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                style={fieldErrors.password ? { borderColor: '#DC2626' } : {}}
              />
              {fieldErrors.password && <div style={{ fontSize: 11, color: '#DC2626', fontWeight: 600, marginTop: 3 }}>{fieldErrors.password}</div>}
            </div>
          )}

          <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Chargement...' : mode === 'forgot' ? 'Envoyer le lien' : mode === 'login' ? 'Se connecter' : 'Créer le compte'}
          </button>

          <div style={{ textAlign: 'center', marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {mode === 'login' && (
              <button
                onClick={() => { setMode('forgot'); setError(''); setSuccess(''); setFieldErrors({}) }}
                style={{ fontSize: 12, color: '#94A3B8', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Mot de passe oublié ?
              </button>
            )}
            <button
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setSuccess(''); setFieldErrors({}) }}
              style={{ fontSize: 13, color: '#6366F1', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer' }}
            >
              {mode === 'forgot' ? 'Retour à la connexion' : mode === 'login' ? 'Pas encore de compte ? Créer' : 'Déjà un compte ? Se connecter'}
            </button>
          </div>
        </div>

        {onBack && (
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <button onClick={onBack} style={{
              fontSize: 12, color: '#94A3B8', fontWeight: 500,
              background: 'none', border: 'none', cursor: 'pointer',
            }}>Retour</button>
          </div>
        )}
        <div style={{ textAlign: 'center', marginTop: 12, fontSize: 11, color: '#CBD5E1' }}>
          v10.5 — Stage Stock
        </div>
      </div>
    </div>
  )
}
