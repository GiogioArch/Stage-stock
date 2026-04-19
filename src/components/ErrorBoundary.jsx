import React, { createElement } from 'react'
import { AlertTriangle } from 'lucide-react'

// ─── Live Error Boundary (minimaliste, pour EK LIVE fan-facing) ───
export class LiveErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100dvh',
          background: '#FFFFFF',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: 16, padding: 32, textAlign: 'center',
          fontFamily: "'Inter', sans-serif",
        }}>
          {createElement(AlertTriangle, { size: 40, color: '#D4648A' })}
          <div style={{ fontSize: 18, fontWeight: 600, color: '#1E293B' }}>
            Erreur technique
          </div>
          <div style={{ fontSize: 14, color: '#94A3B8', lineHeight: 1.6, maxWidth: 300 }}>
            Recharge la page pour continuer.
          </div>
          <button onClick={() => window.location.reload()} className="btn-primary" style={{
            marginTop: 8, maxWidth: 200,
          }}>Recharger</button>
        </div>
      )
    }
    return this.props.children
  }
}

// ─── Main App Error Boundary (rich : stack, component stack, state dump) ───
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, componentStack: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('BackStage crash:', error)
    console.error('Component stack:', errorInfo?.componentStack)
    this.setState({ componentStack: errorInfo?.componentStack || null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', padding: 32, textAlign: 'center',
          background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 30%, #F8FAFC 70%, #F8FAFC 100%)',
        }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>{createElement(AlertTriangle, { size: 56, color: '#D4648A' })}</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#D4648A', marginBottom: 8 }}>
            Oups, une erreur est survenue
          </div>
          <div style={{ fontSize: 13, color: '#94A3B8', marginBottom: 6, lineHeight: 1.5, maxWidth: 320 }}>
            L'application a rencontré un problème inattendu.
          </div>
          <div style={{
            fontSize: 11, color: '#CBD5E1', background: '#F1F5F9', borderRadius: 10,
            padding: '8px 14px', marginBottom: 20, maxWidth: 320, wordBreak: 'break-word',
          }}>
            {String(this.state.error?.message || 'Erreur inconnue')}
          </div>
          {typeof window !== 'undefined' && window.__bs_state && (
            <div style={{
              fontSize: 10, color: '#5B8DB8', background: '#E8F0FE', borderRadius: 8,
              padding: '6px 10px', marginBottom: 12, maxWidth: 320, wordBreak: 'break-word',
              fontFamily: 'monospace',
            }}>
              {window.__bs_state}
            </div>
          )}
          {this.state.componentStack && (
            <div style={{ marginBottom: 12, maxWidth: 320, textAlign: 'left' }}>
              <div style={{ fontSize: 11, color: '#D4648A', fontWeight: 600, marginBottom: 4 }}>Composant :</div>
              <pre style={{
                fontSize: 9, color: '#64748B', background: '#FDE4EE', borderRadius: 8,
                padding: 8, overflow: 'auto', maxHeight: 120, whiteSpace: 'pre-wrap',
              }}>{this.state.componentStack}</pre>
            </div>
          )}
          {this.state.error?.stack && (
            <details style={{ marginBottom: 16, maxWidth: 320, textAlign: 'left' }}>
              <summary style={{ fontSize: 11, color: '#94A3B8', cursor: 'pointer' }}>Stack technique</summary>
              <pre style={{
                fontSize: 9, color: '#94A3B8', background: '#F1F5F9', borderRadius: 8,
                padding: 8, marginTop: 6, overflow: 'auto', maxHeight: 200, whiteSpace: 'pre-wrap',
              }}>{this.state.error.stack}</pre>
            </details>
          )}
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload() }}
            style={{
              padding: '12px 32px', borderRadius: 8, fontSize: 14, fontWeight: 600,
              background: 'linear-gradient(135deg, #5B8DB8, #D4648A)',
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
