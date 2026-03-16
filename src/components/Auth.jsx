import React, { useState } from 'react'
import { auth } from '../lib/supabase'

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
      background: 'linear-gradient(180deg, #080808 0%, #FEF0E8 30%, #F8F0FA 70%, #F0F4FD 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 22,
            background: 'linear-gradient(135deg, #C8A46A, #A8883D)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 36, boxShadow: '0 8px 32px rgba(232,115,90,0.25)',
            marginBottom: 16,
          }}>🎪</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#C8A46A', letterSpacing: 0.5 }}>STAGE STOCK</div>
          <div style={{ fontSize: 11, color: '#6B6058', letterSpacing: 3, textTransform: 'uppercase', fontWeight: 700, marginTop: 4 }}>
            WMS pour artistes
          </div>
        </div>

        {/* Form */}
        <div className="card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 20, textAlign: 'center' }}>
            {mode === 'forgot' ? 'Mot de passe oublié' : mode === 'login' ? 'Connexion' : 'Créer un compte'}
          </h2>

          {error && (
            <div style={{
              padding: 12, borderRadius: 12, background: '#FDF0F4',
              border: '1px solid #F5C4BC', color: '#8B1A2B',
              fontSize: 13, fontWeight: 600, marginBottom: 16,
            }}>{error}</div>
          )}

          {success && (
            <div style={{
              padding: 12, borderRadius: 12, background: '#F0FAF4',
              border: '1px solid #B8E0C8', color: '#5DAB8B',
              fontSize: 13, fontWeight: 600, marginBottom: 16,
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
            {loading ? '⏳ Chargement...' : mode === 'forgot' ? 'Envoyer le lien' : mode === 'login' ? 'Se connecter' : 'Créer le compte'}
          </button>

          <div style={{ textAlign: 'center', marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {mode === 'login' && (
              <button
                onClick={() => { setMode('forgot'); setError(''); setSuccess('') }}
                style={{ fontSize: 12, color: '#8A7D75', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Mot de passe oublié ?
              </button>
            )}
            <button
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setSuccess('') }}
              style={{ fontSize: 13, color: '#C8A46A', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}
            >
              {mode === 'forgot' ? 'Retour à la connexion' : mode === 'login' ? 'Pas encore de compte ? Créer' : 'Déjà un compte ? Se connecter'}
            </button>
          </div>
        </div>

        {onBack && (
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <button onClick={onBack} style={{
              fontSize: 12, color: '#8A7D75', fontWeight: 600,
              background: 'none', border: 'none', cursor: 'pointer',
            }}>← Retour à l'accueil</button>
          </div>
        )}
        <div style={{ textAlign: 'center', marginTop: 12, fontSize: 11, color: '#C4A8B6' }}>
          v10.5 — Stage Stock
        </div>
      </div>
    </div>
  )
}
