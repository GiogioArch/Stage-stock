import React from 'react'

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
          background: 'linear-gradient(180deg, #09090B 0%, #111113 30%, #111113 70%, #111113 100%)',
        }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>💥</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#EF4444', marginBottom: 8 }}>
            Oups, une erreur est survenue
          </div>
          <div style={{ fontSize: 13, color: '#71717A', marginBottom: 6, lineHeight: 1.5, maxWidth: 320 }}>
            L'application a rencontré un problème inattendu.
          </div>
          <div style={{
            fontSize: 11, color: '#52525B', background: '#18181B', borderRadius: 10,
            padding: '8px 14px', marginBottom: 20, maxWidth: 320, wordBreak: 'break-word',
          }}>
            {this.state.error?.message || 'Erreur inconnue'}
          </div>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload() }}
            style={{
              padding: '12px 32px', borderRadius: 8, fontSize: 14, fontWeight: 600,
              background: 'linear-gradient(135deg, #6366F1, #EF4444)',
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
