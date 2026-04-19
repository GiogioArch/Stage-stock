import React from 'react'
import { AlertTriangle } from 'lucide-react'

// ─── Module-level boundary (inline recovery, no full reload) ───
export class ModuleBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error(`[${this.props.name || 'Module'}] crash:`, error, errorInfo)
  }

  componentDidUpdate(prevProps) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, error: null })
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: 32, textAlign: 'center', display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 12, color: '#64748B',
        }}>
          <AlertTriangle size={32} color="#D97706" />
          <div style={{ fontSize: 15, fontWeight: 600, color: '#1E293B' }}>
            {this.props.name || 'Ce module'} a rencontré une erreur
          </div>
          <div style={{ fontSize: 12, color: '#94A3B8', maxWidth: 280 }}>
            {this.state.error?.message || 'Erreur inconnue'}
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: '#F1F5F9', color: '#1E293B', cursor: 'pointer', border: '1px solid #E2E8F0',
            }}
          >
            Réessayer
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

// ─── App-level boundary (full page crash, reload) ───
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Stage Stock crash:', error, errorInfo)
    // Future: send to Sentry or monitoring service
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', padding: 32, textAlign: 'center',
          background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 30%, #F8FAFC 70%, #F8FAFC 100%)',
        }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>💥</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#DC2626', marginBottom: 8 }}>
            Oups, une erreur est survenue
          </div>
          <div style={{ fontSize: 13, color: '#94A3B8', marginBottom: 6, lineHeight: 1.5, maxWidth: 320 }}>
            L'application a rencontré un problème inattendu.
          </div>
          <div style={{
            fontSize: 11, color: '#CBD5E1', background: '#F1F5F9', borderRadius: 10,
            padding: '8px 14px', marginBottom: 20, maxWidth: 320, wordBreak: 'break-word',
          }}>
            {this.state.error?.message || 'Erreur inconnue'}
          </div>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload() }}
            style={{
              padding: '12px 32px', borderRadius: 8, fontSize: 14, fontWeight: 600,
              background: 'linear-gradient(135deg, #6366F1, #DC2626)',
              color: 'white', cursor: 'pointer', border: 'none',
              boxShadow: '0 4px 16px rgba(232,115,90,0.25)',
            }}
          >
            Recharger l'application
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
