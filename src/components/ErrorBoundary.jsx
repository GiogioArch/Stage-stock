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
          background: 'linear-gradient(180deg, #080808 0%, #FEF0E8 30%, #F8F0FA 70%, #F0F4FD 100%)',
        }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>💥</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#8B1A2B', marginBottom: 8 }}>
            Oups, une erreur est survenue
          </div>
          <div style={{ fontSize: 13, color: '#8A7D75', marginBottom: 6, lineHeight: 1.5, maxWidth: 320 }}>
            L'application a rencontré un problème inattendu.
          </div>
          <div style={{
            fontSize: 11, color: '#6B6058', background: '#1a1a1a', borderRadius: 10,
            padding: '8px 14px', marginBottom: 20, maxWidth: 320, wordBreak: 'break-word',
          }}>
            {this.state.error?.message || 'Erreur inconnue'}
          </div>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload() }}
            style={{
              padding: '12px 32px', borderRadius: 14, fontSize: 14, fontWeight: 800,
              background: 'linear-gradient(135deg, #C8A46A, #8B1A2B)',
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
