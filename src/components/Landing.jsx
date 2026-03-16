import React from 'react'
import { Package, Calendar, Users, TrendingUp, Coins, Camera, Box, ArrowRight, Check, Star, Zap, Crown } from 'lucide-react'

const FEATURES = [
  { Icon: Package, title: 'Gestion de stock', desc: 'Multi-lieux, mouvements, alertes de rupture en temps réel' },
  { Icon: Calendar, title: 'Tournée', desc: 'Événements, packing lists auto, checklists par concert' },
  { Icon: Users, title: 'Équipe', desc: '12 rôles métier, accès personnalisés par module' },
  { Icon: TrendingUp, title: 'Forecast', desc: 'Projections de ventes merch par format et territoire' },
  { Icon: Coins, title: 'Finance', desc: 'Amortissement linéaire, valorisation du stock' },
  { Icon: Camera, title: 'Scanner', desc: 'Scan code-barres depuis la caméra du téléphone' },
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
      background: '#FFFFFF',
    }}>
      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '60px 24px 40px' }}>
        <div style={{
          width: 56, height: 56, borderRadius: 8,
          background: '#6366F1',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 20,
        }}><Box size={32} color="#fff" /></div>
        <h1 style={{ fontSize: 28, fontWeight: 600, color: '#1E293B', margin: '0 0 8px' }}>
          Stage Stock
        </h1>
        <p style={{ fontSize: 15, color: '#64748B', fontWeight: 500, margin: '0 0 8px', lineHeight: 1.4 }}>
          Le WMS des artistes et pros du spectacle
        </p>
        <p style={{ fontSize: 14, color: '#94A3B8', margin: '0 auto 32px', maxWidth: 340, lineHeight: 1.6 }}>
          Gère ton stock, ta tournée et ton merch depuis ton téléphone. Conçu pour les équipes en mouvement.
        </p>
        <button onClick={onGetStarted} style={{
          padding: '12px 32px', borderRadius: 8, fontSize: 15, fontWeight: 600,
          background: '#6366F1',
          color: 'white', border: 'none', cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: 8,
        }}>
          Commencer gratuitement <ArrowRight size={16} />
        </button>
      </div>

      {/* Features */}
      <div style={{ padding: '0 20px 40px', maxWidth: 500, margin: '0 auto' }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1E293B', textAlign: 'center', marginBottom: 20 }}>
          Tout ce qu'il te faut
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {FEATURES.map((f, i) => (
            <div key={i} style={{
              padding: '16px 14px', borderRadius: 12, background: '#F8FAFC',
              border: '1px solid #E2E8F0',
            }}>
              <div style={{ marginBottom: 8 }}><f.Icon size={22} color="#6366F1" /></div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1E293B', marginBottom: 4 }}>{f.title}</div>
              <div style={{ fontSize: 11, color: '#94A3B8', lineHeight: 1.4 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div style={{ padding: '40px 20px', background: '#F8FAFC', borderTop: '1px solid #E2E8F0' }}>
        <div style={{ maxWidth: 400, margin: '0 auto' }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1E293B', textAlign: 'center', marginBottom: 24 }}>
            Comment ça marche
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {STEPS.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                  background: 'rgba(99,102,241,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, fontWeight: 600, color: '#6366F1',
                }}>{s.num}</div>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#1E293B' }}>{s.text}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div style={{ padding: '40px 20px', maxWidth: 500, margin: '0 auto' }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1E293B', textAlign: 'center', marginBottom: 6 }}>
          Tarifs simples
        </h2>
        <p style={{ fontSize: 13, color: '#94A3B8', textAlign: 'center', marginBottom: 24 }}>
          Commence gratuitement, monte en puissance quand tu veux.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Free */}
          <div style={{ padding: '16px', borderRadius: 12, border: '1px solid #E2E8F0', background: '#FFFFFF' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <Zap size={20} color="#6366F1" />
              <span style={{ fontSize: 15, fontWeight: 600, color: '#1E293B' }}>Starter</span>
              <span style={{ marginLeft: 'auto', fontSize: 18, fontWeight: 700, color: '#6366F1' }}>Gratuit</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {['1 projet', '2 membres', '50 produits', 'Packing list auto'].map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748B' }}>
                  <Check size={14} color="#16A34A" /> {f}
                </div>
              ))}
            </div>
          </div>
          {/* Team */}
          <div style={{ padding: '16px', borderRadius: 12, border: '2px solid #6366F1', background: '#FAFAFF', position: 'relative' }}>
            <div style={{
              position: 'absolute', top: -10, right: 16, padding: '2px 10px', borderRadius: 6,
              background: '#6366F1', color: 'white', fontSize: 10, fontWeight: 700,
            }}>POPULAIRE</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <Star size={20} color="#6366F1" />
              <span style={{ fontSize: 15, fontWeight: 600, color: '#1E293B' }}>Team</span>
              <span style={{ marginLeft: 'auto' }}>
                <span style={{ fontSize: 22, fontWeight: 700, color: '#6366F1' }}>49€</span>
                <span style={{ fontSize: 12, color: '#94A3B8' }}>/mois</span>
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {['Projets illimités', '10 membres', 'Produits illimités', 'Export PDF', 'Scanner code-barres', 'Forecast merch'].map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748B' }}>
                  <Check size={14} color="#16A34A" /> {f}
                </div>
              ))}
            </div>
          </div>
          {/* Pro */}
          <div style={{ padding: '16px', borderRadius: 12, border: '1px solid #E2E8F0', background: '#FFFFFF' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <Crown size={20} color="#D97706" />
              <span style={{ fontSize: 15, fontWeight: 600, color: '#1E293B' }}>Pro</span>
              <span style={{ marginLeft: 'auto' }}>
                <span style={{ fontSize: 22, fontWeight: 700, color: '#1E293B' }}>99€</span>
                <span style={{ fontSize: 12, color: '#94A3B8' }}>/mois</span>
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {['Tout de Team', 'Membres illimités', 'Finance & amortissement', 'API & intégrations', 'Support prioritaire'].map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748B' }}>
                  <Check size={14} color="#16A34A" /> {f}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Social proof / testimonials placeholder */}
      <div id="temoignages" style={{ padding: '40px 20px', background: '#F8FAFC', borderTop: '1px solid #E2E8F0' }}>
        <div style={{ maxWidth: 500, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1E293B', marginBottom: 24 }}>
            Ils gèrent leur tournée avec Stage Stock
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { quote: 'Retour terrain bientôt disponible', role: 'Tour Manager — EK TOUR 25 ANS', initials: 'EK' },
            ].map((t, i) => (
              <div key={i} style={{
                padding: '20px 16px', borderRadius: 12, background: '#FFFFFF',
                border: '1px solid #E2E8F0', textAlign: 'left',
              }}>
                <div style={{ fontSize: 13, color: '#64748B', fontStyle: 'italic', lineHeight: 1.6, marginBottom: 12 }}>
                  "{t.quote}"
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, background: '#6366F1',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontSize: 13, fontWeight: 600,
                  }}>{t.initials}</div>
                  <span style={{ fontSize: 12, fontWeight: 500, color: '#94A3B8' }}>{t.role}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div style={{ textAlign: 'center', padding: '40px 24px' }}>
        <p style={{ fontSize: 18, fontWeight: 600, color: '#1E293B', marginBottom: 16 }}>
          Prêt à organiser ta tournée ?
        </p>
        <button onClick={onGetStarted} style={{
          padding: '12px 32px', borderRadius: 8, fontSize: 15, fontWeight: 600,
          background: '#6366F1',
          color: 'white', border: 'none', cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: 8,
        }}>
          Commencer gratuitement <ArrowRight size={16} />
        </button>
        <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 8 }}>
          Pas de carte bancaire requise
        </p>
      </div>

      {/* Footer */}
      <div style={{
        padding: '20px 24px', borderTop: '1px solid #E2E8F0',
        textAlign: 'center', fontSize: 11, color: '#CBD5E1',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 8 }}>
          <a href="#cgu" onClick={e => { e.preventDefault(); window.dispatchEvent(new CustomEvent('show-legal', { detail: 'cgu' })) }}
            style={{ color: '#94A3B8', textDecoration: 'none' }}>CGU</a>
          <a href="#privacy" onClick={e => { e.preventDefault(); window.dispatchEvent(new CustomEvent('show-legal', { detail: 'privacy' })) }}
            style={{ color: '#94A3B8', textDecoration: 'none' }}>Confidentialité</a>
        </div>
        Stage Stock — WMS pour artistes et professionnels du spectacle
      </div>
    </div>
  )
}
