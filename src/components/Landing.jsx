import React from 'react'

const FEATURES = [
  { icon: '📦', title: 'Gestion de stock', desc: 'Multi-lieux, mouvements, alertes de rupture en temps réel' },
  { icon: '🎪', title: 'Tournée', desc: 'Événements, packing lists auto, checklists par concert' },
  { icon: '👥', title: 'Équipe', desc: '12 rôles métier, accès personnalisés par module' },
  { icon: '📊', title: 'Forecast', desc: 'Projections de ventes merch par format et territoire' },
  { icon: '💰', title: 'Finance', desc: 'Amortissement linéaire, valorisation du stock' },
  { icon: '📷', title: 'Scanner', desc: 'Scan code-barres depuis la caméra du téléphone' },
]

const STEPS = [
  { num: '1', text: 'Crée ton compte gratuitement' },
  { num: '2', text: 'Crée ton projet et invite ton équipe' },
  { num: '3', text: 'Gère ton stock, ta tournée, ton merch' },
]

export default function Landing({ onGetStarted }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #080808 0%, #FEF0E8 30%, #F8F0FA 70%, #F0F4FD 100%)',
    }}>
      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '60px 24px 40px' }}>
        <div style={{
          width: 88, height: 88, borderRadius: 26,
          background: 'linear-gradient(135deg, #C8A46A, #A8883D)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 44, boxShadow: '0 12px 40px rgba(232,115,90,0.3)',
          marginBottom: 20,
        }}>🎪</div>
        <h1 style={{ fontSize: 32, fontWeight: 900, color: '#C8A46A', margin: '0 0 8px', letterSpacing: 0.5 }}>
          STAGE STOCK
        </h1>
        <p style={{ fontSize: 16, color: '#F0ECE2', fontWeight: 700, margin: '0 0 8px', lineHeight: 1.4 }}>
          Le WMS des artistes et pros du spectacle
        </p>
        <p style={{ fontSize: 14, color: '#8A7D75', margin: '0 auto 32px', maxWidth: 340, lineHeight: 1.6 }}>
          Gère ton stock, ta tournée et ton merch depuis ton téléphone. Conçu pour les équipes en mouvement.
        </p>
        <button onClick={onGetStarted} style={{
          padding: '16px 40px', borderRadius: 16, fontSize: 16, fontWeight: 800,
          background: 'linear-gradient(135deg, #C8A46A, #8B1A2B)',
          color: 'white', border: 'none', cursor: 'pointer',
          boxShadow: '0 8px 32px rgba(232,115,90,0.3)',
        }}>
          Commencer gratuitement
        </button>
      </div>

      {/* Features */}
      <div style={{ padding: '0 20px 40px', maxWidth: 500, margin: '0 auto' }}>
        <h2 style={{ fontSize: 18, fontWeight: 900, color: '#F0ECE2', textAlign: 'center', marginBottom: 20 }}>
          Tout ce qu'il te faut
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {FEATURES.map((f, i) => (
            <div key={i} style={{
              padding: '16px 14px', borderRadius: 16, background: 'white',
              border: '1.5px solid #1a1a1a', boxShadow: '0 2px 8px rgba(180,150,130,0.06)',
            }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{f.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#F0ECE2', marginBottom: 4 }}>{f.title}</div>
              <div style={{ fontSize: 11, color: '#8A7D75', lineHeight: 1.4 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div style={{ padding: '40px 20px', background: 'white', borderTop: '1px solid #1a1a1a' }}>
        <div style={{ maxWidth: 400, margin: '0 auto' }}>
          <h2 style={{ fontSize: 18, fontWeight: 900, color: '#F0ECE2', textAlign: 'center', marginBottom: 24 }}>
            Comment ça marche
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {STEPS.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 14, flexShrink: 0,
                  background: 'linear-gradient(135deg, #C8A46A15, #9B7DC415)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, fontWeight: 900, color: '#C8A46A',
                }}>{s.num}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#F0ECE2' }}>{s.text}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div style={{ textAlign: 'center', padding: '40px 24px' }}>
        <p style={{ fontSize: 20, fontWeight: 800, color: '#F0ECE2', marginBottom: 16 }}>
          Prêt à organiser ta tournée ?
        </p>
        <button onClick={onGetStarted} style={{
          padding: '16px 40px', borderRadius: 16, fontSize: 16, fontWeight: 800,
          background: 'linear-gradient(135deg, #C8A46A, #8B1A2B)',
          color: 'white', border: 'none', cursor: 'pointer',
          boxShadow: '0 8px 32px rgba(232,115,90,0.3)',
        }}>
          Créer mon compte
        </button>
      </div>

      {/* Footer */}
      <div style={{
        padding: '20px 24px', borderTop: '1px solid #1a1a1a',
        textAlign: 'center', fontSize: 11, color: '#6B6058',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 8 }}>
          <a href="#cgu" onClick={e => { e.preventDefault(); window.dispatchEvent(new CustomEvent('show-legal', { detail: 'cgu' })) }}
            style={{ color: '#8A7D75', textDecoration: 'none' }}>CGU</a>
          <a href="#privacy" onClick={e => { e.preventDefault(); window.dispatchEvent(new CustomEvent('show-legal', { detail: 'privacy' })) }}
            style={{ color: '#8A7D75', textDecoration: 'none' }}>Confidentialité</a>
        </div>
        Stage Stock — WMS pour artistes et professionnels du spectacle
      </div>
    </div>
  )
}
