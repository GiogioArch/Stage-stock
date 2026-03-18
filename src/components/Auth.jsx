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

  const handleSubmit = async () => {
    if (mode === 'forgot') {
      if (!email) return setError('Email requis')
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

    if (!email || !password) return setError('Email et mot de passe requis')
    if (password.length < 6) return setError('Mot de passe : 6 caractères minimum')

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
            background: '#5B8DB8',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 16,
          }}><Box size={28} color="#fff" /></div>
          <div style={{ fontSize: 24, fontWeight: 600, color: '#1E293B' }}>BackStage</div>
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
              padding: 10, borderRadius: 6, background: 'rgba(212,100,138,0.12)',
              border: '1px solid rgba(212,100,138,0.2)', color: '#D4648A',
              fontSize: 13, fontWeight: 500, marginBottom: 16,
            }}>{error}</div>
          )}

          {success && (
            <div style={{
              padding: 10, borderRadius: 6, background: 'rgba(34,197,94,0.12)',
              border: '1px solid rgba(34,197,94,0.2)', color: '#5DAB8B',
              fontSize: 13, fontWeight: 500, marginBottom: 16,
            }}>{success}</div>
          )}

          <div style={{ marginBottom: 14 }}>
            <label className="label">Email</label>
            <input
              className="input"
              type="email"
              placeholder="ton@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          {mode !== 'forgot' && (
            <div style={{ marginBottom: 20 }}>
              <label className="label">Mot de passe</label>
              <input
                className="input"
                type="password"
                placeholder="6 caractères minimum"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </div>
          )}

          <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Chargement...' : mode === 'forgot' ? 'Envoyer le lien' : mode === 'login' ? 'Se connecter' : 'Créer le compte'}
          </button>

          <div style={{ textAlign: 'center', marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {mode === 'login' && (
              <button
                onClick={() => { setMode('forgot'); setError(''); setSuccess('') }}
                style={{ fontSize: 12, color: '#94A3B8', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Mot de passe oublié ?
              </button>
            )}
            <button
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setSuccess('') }}
              style={{ fontSize: 13, color: '#5B8DB8', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer' }}
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
          v10.5 — BackStage
        </div>
      </div>
    </div>
  )
}
