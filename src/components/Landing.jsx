import React from 'react'
import { Package, Calendar, TrendingUp, ArrowRight, Box } from 'lucide-react'

// ─── Gradient premium purple ───
const GRADIENT = 'linear-gradient(135deg, #8B5CF6 0%, #5B21B6 100%)'
const PURPLE = '#7C3AED'
const PURPLE_DEEP = '#5B21B6'

const FEATURES = [
  {
    Icon: Package,
    title: 'Stock en temps reel',
    desc: 'Suis chaque t-shirt vendu, chaque entrepot, chaque concert.',
  },
  {
    Icon: Calendar,
    title: 'Tournee centralisee',
    desc: 'Tes concerts, ton planning, ton equipe — au meme endroit.',
  },
  {
    Icon: TrendingUp,
    title: 'Pilotage merch',
    desc: 'Top ventes, rupture, rotation : pilote tes ventes.',
  },
]

const STATS = [
  { value: '150+', label: 'Tournees pilotees' },
  { value: '4.8/5', label: 'Satisfaction equipes' },
  { value: '3min', label: 'Pour etre operationnel' },
]

// ─── Feature card ───
function FeatureCard({ Icon, title, desc }) {
  return (
    <div style={{
      padding: '20px 16px',
      borderRadius: 16,
      background: '#FFFFFF',
      border: '1px solid #EDE9FE',
      boxShadow: '0 2px 12px rgba(124, 58, 237, 0.06)',
      transition: 'transform 0.2s, box-shadow 0.2s',
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: 'linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 12,
      }}>
        <Icon size={22} color={PURPLE} strokeWidth={2.2} />
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#1E293B', marginBottom: 6 }}>
        {title}
      </div>
      <div style={{ fontSize: 13, color: '#64748B', lineHeight: 1.5 }}>
        {desc}
      </div>
    </div>
  )
}

// ─── Primary CTA button ───
function PrimaryCTA({ onClick, children, large = false }) {
  return (
    <button onClick={onClick} style={{
      padding: large ? '16px 32px' : '14px 28px',
      borderRadius: 14,
      fontSize: large ? 16 : 15,
      fontWeight: 700,
      background: GRADIENT,
      color: 'white',
      border: 'none',
      cursor: 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      gap: 10,
      boxShadow: '0 8px 24px rgba(124, 58, 237, 0.35)',
      transition: 'transform 0.15s, box-shadow 0.15s',
    }}
    onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
    onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
      {children} <ArrowRight size={18} />
    </button>
  )
}

export default function Landing({ onGetStarted, onLogin }) {
  const handleLogin = () => {
    if (onLogin) onLogin()
    else onGetStarted?.()
  }

  const onLegal = (which) => (e) => {
    e.preventDefault()
    window.dispatchEvent(new CustomEvent('show-legal', { detail: which }))
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#FFFFFF',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Soft purple glow top */}
      <div style={{
        position: 'absolute', top: -120, left: '50%', transform: 'translateX(-50%)',
        width: 420, height: 420, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(139,92,246,0.18) 0%, rgba(139,92,246,0) 70%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* ─── HERO ─── */}
      <section style={{
        position: 'relative', zIndex: 1,
        padding: '60px 24px 40px',
        textAlign: 'center',
        maxWidth: 560, margin: '0 auto',
      }}>
        {/* Logo */}
        <div style={{
          width: 64, height: 64, borderRadius: 18,
          background: GRADIENT,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 20,
          boxShadow: '0 12px 32px rgba(91, 33, 182, 0.35)',
        }}>
          <Box size={32} color="#fff" strokeWidth={2.2} />
        </div>

        {/* Brand */}
        <h1 style={{
          fontSize: 30, fontWeight: 800, color: '#1E293B',
          margin: '0 0 24px', letterSpacing: '-0.02em',
        }}>
          BackStage
        </h1>

        {/* Tagline PNL */}
        <h2 style={{
          fontSize: 26, fontWeight: 800, color: '#0F172A',
          margin: '0 0 14px', lineHeight: 1.2, letterSpacing: '-0.02em',
        }}>
          Ta tournee, sous controle.
        </h2>
        <p style={{
          fontSize: 15, color: '#475569',
          margin: '0 auto 28px', maxWidth: 380, lineHeight: 1.6,
        }}>
          Pilote ton stock merch, ton equipe et tes concerts.<br />
          Du fond de scene, en 3 clics.
        </p>

        {/* CTA */}
        <PrimaryCTA onClick={onGetStarted} large>
          Commencer gratuitement
        </PrimaryCTA>
        <div style={{
          marginTop: 14, fontSize: 12, color: '#94A3B8',
          display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap',
        }}>
          <span>Pas de carte bancaire</span>
          <span>·</span>
          <span>Sans engagement</span>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section style={{
        padding: '20px 20px 48px',
        maxWidth: 560, margin: '0 auto',
        position: 'relative', zIndex: 1,
      }}>
        <h3 style={{
          fontSize: 20, fontWeight: 700, color: '#1E293B',
          textAlign: 'center', margin: '0 0 8px', letterSpacing: '-0.01em',
        }}>
          Conçu pour la tournee
        </h3>
        <p style={{
          fontSize: 13, color: '#94A3B8', textAlign: 'center', margin: '0 0 24px',
        }}>
          Trois outils, un seul ecran, zero friction.
        </p>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 12,
        }}>
          {FEATURES.map((f, i) => <FeatureCard key={i} {...f} />)}
        </div>
      </section>

      {/* ─── SOCIAL PROOF ─── */}
      <section style={{
        padding: '36px 24px',
        background: 'linear-gradient(180deg, #F8FAFC 0%, #F5F3FF 100%)',
        borderTop: '1px solid #EDE9FE',
        borderBottom: '1px solid #EDE9FE',
      }}>
        <div style={{
          maxWidth: 560, margin: '0 auto',
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16,
          textAlign: 'center',
        }}>
          {STATS.map((s, i) => (
            <div key={i}>
              <div style={{
                fontSize: 28, fontWeight: 800, color: PURPLE,
                lineHeight: 1, marginBottom: 6, letterSpacing: '-0.02em',
              }}>
                {s.value}
              </div>
              <div style={{ fontSize: 12, color: '#64748B', fontWeight: 500, lineHeight: 1.3 }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── CTA FINAL ─── */}
      <section style={{
        padding: '48px 24px',
        textAlign: 'center',
        maxWidth: 560, margin: '0 auto',
      }}>
        <h3 style={{
          fontSize: 22, fontWeight: 800, color: '#0F172A',
          margin: '0 0 20px', lineHeight: 1.3, letterSpacing: '-0.02em',
        }}>
          Pret a piloter ta prochaine tournee ?
        </h3>
        <PrimaryCTA onClick={onGetStarted} large>
          Commencer gratuitement
        </PrimaryCTA>
        <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 12 }}>
          Cree ton projet en moins de 3 minutes.
        </p>
      </section>

      {/* ─── FOOTER ─── */}
      <footer style={{
        padding: '24px 24px 32px',
        borderTop: '1px solid #EDE9FE',
        background: '#FAFAFF',
      }}>
        <div style={{
          maxWidth: 560, margin: '0 auto',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
        }}>
          <button onClick={handleLogin} style={{
            fontSize: 14, fontWeight: 600, color: PURPLE_DEEP,
            background: 'none', border: 'none', cursor: 'pointer',
            textDecoration: 'underline', textUnderlineOffset: 3,
          }}>
            Deja un compte ? Se connecter
          </button>
          <div style={{
            display: 'flex', gap: 14, fontSize: 12, color: '#94A3B8',
            flexWrap: 'wrap', justifyContent: 'center',
          }}>
            <a href="#cgu" onClick={onLegal('cgu')}
              style={{ color: '#94A3B8', textDecoration: 'none' }}>CGU</a>
            <span>·</span>
            <a href="#privacy" onClick={onLegal('privacy')}
              style={{ color: '#94A3B8', textDecoration: 'none' }}>Confidentialite</a>
          </div>
          <div style={{ fontSize: 11, color: '#CBD5E1', textAlign: 'center' }}>
            BackStage — Le WMS des artistes et pros du spectacle
          </div>
        </div>
      </footer>
    </div>
  )
}
