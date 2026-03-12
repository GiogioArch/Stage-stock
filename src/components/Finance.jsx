import React, { useState, useMemo } from 'react'
import { Badge } from './UI'

export default function Finance({ products, stock, events, locations, depreciation }) {
  const [section, setSection] = useState('overview') // overview | depreciation | revenue

  const today = new Date().toISOString().split('T')[0]

  // ─── Revenue from events ───
  const revenueData = useMemo(() => {
    const past = (events || []).filter(e => e.date < today && e.ca_reel != null)
    const upcoming = (events || []).filter(e => e.date >= today)
    const caReel = past.reduce((s, e) => s + (e.ca_reel || 0), 0)
    const caPrevu = upcoming.reduce((s, e) => s + (e.ca_prevu || 0), 0)
    const ventesReelles = past.reduce((s, e) => s + (e.ventes_reelles || 0), 0)
    const ventesPrevues = upcoming.reduce((s, e) => s + (e.ventes_prevues || 0), 0)
    return { past, upcoming, caReel, caPrevu, ventesReelles, ventesPrevues }
  }, [events, today])

  // ─── Depreciation data ───
  const depreciationItems = useMemo(() => {
    return (depreciation || []).map(d => {
      const product = (products || []).find(p => p.id === d.product_id)
      return { ...d, product }
    }).sort((a, b) => (b.valeur_nette || 0) - (a.valeur_nette || 0))
  }, [depreciation, products])

  const totalBrut = depreciationItems.reduce((s, d) => s + (d.prix_achat_ht || 0), 0)
  const totalAmorti = depreciationItems.reduce((s, d) => s + (d.amortissement_cumule || 0), 0)
  const totalNet = depreciationItems.reduce((s, d) => s + (d.valeur_nette || 0), 0)

  // ─── Stock valuation (rough) ───
  const stockValue = useMemo(() => {
    return (products || []).reduce((total, p) => {
      const qty = (stock || []).filter(s => s.product_id === p.id).reduce((s, st) => s + (st.quantity || 0), 0)
      const unitPrice = p.prix_achat_ht || p.prix_vente || 0
      return total + qty * unitPrice
    }, 0)
  }, [products, stock])

  const SECTIONS = [
    { id: 'overview', label: 'Vue globale', icon: '💰' },
    { id: 'revenue', label: 'Revenus', icon: '📈' },
    { id: 'depreciation', label: 'Amortissements', icon: '📉' },
  ]

  return (
    <div style={{ padding: '0 16px 24px' }}>

      {/* Header */}
      <div className="card" style={{
        marginBottom: 16, padding: '18px 16px',
        background: 'linear-gradient(135deg, #E8935A08, #E8935A18)',
        border: '1.5px solid #E8935A25',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: 'linear-gradient(135deg, #E8935A, #D4824A)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, color: 'white', boxShadow: '0 4px 16px #E8935A30',
          }}>💰</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#3D3042' }}>Finance</div>
            <div style={{ fontSize: 12, color: '#9A8B94', fontWeight: 600 }}>
              Suivi financier — EK TOUR 25 ANS
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <KpiBox label="CA réalisé" value={`${revenueData.caReel}€`} color="#5DAB8B" />
          <KpiBox label="CA prévu" value={`${revenueData.caPrevu}€`} color="#E8935A" />
          <KpiBox label="Valeur stock" value={`${Math.round(stockValue)}€`} color="#5B8DB8" />
        </div>
      </div>

      {/* Section tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {SECTIONS.map(s => (
          <button key={s.id} onClick={() => setSection(s.id)} style={{
            flex: 1, padding: '7px 10px', borderRadius: 10, fontSize: 11, fontWeight: 700,
            cursor: 'pointer', textAlign: 'center',
            background: section === s.id ? '#E8935A15' : 'white',
            color: section === s.id ? '#E8935A' : '#9A8B94',
            border: `1.5px solid ${section === s.id ? '#E8935A40' : '#E8DED8'}`,
          }}>{s.icon} {s.label}</button>
        ))}
      </div>

      {/* ─── Overview ─── */}
      {section === 'overview' && (
        <div>
          {/* Revenue summary */}
          <div className="card" style={{ padding: '14px 16px', marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#9A8B94', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
              Revenus merch
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#B8A0AE' }}>Ventes réalisées</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: '#5DAB8B' }}>{revenueData.ventesReelles}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#B8A0AE' }}>CA réalisé</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: '#5DAB8B' }}>{revenueData.caReel}€</div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#B8A0AE' }}>Ventes prévues</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: '#E8935A' }}>{revenueData.ventesPrevues}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#B8A0AE' }}>CA prévu</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: '#E8935A' }}>{revenueData.caPrevu}€</div>
              </div>
            </div>
          </div>

          {/* Asset summary */}
          {depreciationItems.length > 0 && (
            <div className="card" style={{ padding: '14px 16px', marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#9A8B94', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
                Immobilisations
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, textAlign: 'center' }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: '#5B8DB8' }}>{Math.round(totalBrut)}€</div>
                  <div style={{ fontSize: 9, color: '#9A8B94', fontWeight: 600 }}>Valeur brute</div>
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: '#E8935A' }}>{Math.round(totalAmorti)}€</div>
                  <div style={{ fontSize: 9, color: '#9A8B94', fontWeight: 600 }}>Amorti</div>
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: '#5DAB8B' }}>{Math.round(totalNet)}€</div>
                  <div style={{ fontSize: 9, color: '#9A8B94', fontWeight: 600 }}>Valeur nette</div>
                </div>
              </div>
            </div>
          )}

          {/* Stock value */}
          <div className="card" style={{ padding: '14px 16px' }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#9A8B94', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
              Valorisation du stock
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#5B8DB8' }}>{Math.round(stockValue)}€</div>
              <div style={{ fontSize: 11, color: '#9A8B94', marginTop: 4 }}>
                Valeur estimée au prix d'achat HT
              </div>
            </div>
          </div>

          {/* Legal note */}
          <div style={{
            marginTop: 14, padding: '10px 14px', borderRadius: 12,
            background: '#F0E8E440', fontSize: 10, color: '#9A8B94', lineHeight: 1.6,
          }}>
            Comptabilité française — Amortissement linéaire, prorata temporis base 360j.
            Seuil immobilisation : 500€ HT. Les durées doivent être validées par expert-comptable.
          </div>
        </div>
      )}

      {/* ─── Revenue detail ─── */}
      {section === 'revenue' && (
        <div>
          {/* Past events with revenue */}
          <div style={{ fontSize: 12, fontWeight: 800, color: '#9A8B94', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
            Concerts avec résultats
          </div>
          {revenueData.past.length === 0 ? (
            <div className="empty-state" style={{ padding: 32 }}>
              <div className="empty-icon">📈</div>
              <div className="empty-text">Aucun résultat enregistré</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {revenueData.past.map(ev => (
                <div key={ev.id} className="card" style={{ padding: '12px 14px', borderLeft: '4px solid #5DAB8B' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{ev.name || ev.lieu}</div>
                      <div style={{ fontSize: 11, color: '#9A8B94' }}>
                        {new Date(ev.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} — {ev.ville}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 16, fontWeight: 900, color: '#5DAB8B' }}>{ev.ca_reel}€</div>
                      <div style={{ fontSize: 10, color: '#9A8B94' }}>{ev.ventes_reelles} ventes</div>
                    </div>
                  </div>
                  {ev.ca_prevu && (
                    <div style={{ fontSize: 10, color: '#B8A0AE' }}>
                      Prévu: {ev.ca_prevu}€ · Écart: {ev.ca_reel - ev.ca_prevu > 0 ? '+' : ''}{ev.ca_reel - ev.ca_prevu}€
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Upcoming forecasts */}
          {revenueData.upcoming.filter(e => e.ca_prevu).length > 0 && (
            <>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#9A8B94', textTransform: 'uppercase', letterSpacing: 1, margin: '16px 0 10px' }}>
                Prévisions
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {revenueData.upcoming.filter(e => e.ca_prevu).map(ev => (
                  <div key={ev.id} className="card" style={{ padding: '12px 14px', borderLeft: '4px solid #E8935A' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>{ev.name || ev.lieu}</div>
                        <div style={{ fontSize: 11, color: '#9A8B94' }}>
                          {new Date(ev.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} — {ev.ville}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 16, fontWeight: 900, color: '#E8935A' }}>{ev.ca_prevu}€</div>
                        {ev.ventes_prevues && <div style={{ fontSize: 10, color: '#9A8B94' }}>{ev.ventes_prevues} ventes</div>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ─── Depreciation detail ─── */}
      {section === 'depreciation' && (
        <div>
          {depreciationItems.length === 0 ? (
            <div className="empty-state" style={{ padding: 32 }}>
              <div className="empty-icon">📉</div>
              <div className="empty-text">Aucune immobilisation</div>
              <div style={{ fontSize: 11, color: '#B8A0AE', marginTop: 4 }}>
                Les produits de plus de 500€ HT apparaîtront ici
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {depreciationItems.map((d, i) => {
                const pct = d.prix_achat_ht > 0 ? Math.round((d.amortissement_cumule / d.prix_achat_ht) * 100) : 0
                return (
                  <div key={i} className="card" style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <span style={{ fontSize: 16 }}>{d.product?.image || '🔧'}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {d.product?.name || 'Produit inconnu'}
                        </div>
                        <div style={{ fontSize: 10, color: '#9A8B94' }}>
                          Durée: {d.duree_amort || '?'} ans · Acquis: {d.date_acquisition ? new Date(d.date_acquisition).toLocaleDateString('fr-FR') : '?'}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 14, fontWeight: 900, color: '#5DAB8B' }}>{Math.round(d.valeur_nette || 0)}€</div>
                        <div style={{ fontSize: 9, color: '#9A8B94' }}>net</div>
                      </div>
                    </div>
                    {/* Progress */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 10, color: '#9A8B94' }}>Brut: {Math.round(d.prix_achat_ht || 0)}€</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#E8935A' }}>{pct}% amorti</span>
                    </div>
                    <div style={{ height: 4, borderRadius: 2, background: '#F0E8E4', overflow: 'hidden' }}>
                      <div style={{
                        width: `${pct}%`, height: '100%', borderRadius: 2,
                        background: pct >= 100 ? '#5DAB8B' : '#E8935A',
                        transition: 'width 0.3s',
                      }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function KpiBox({ label, value, color }) {
  return (
    <div style={{
      flex: 1, textAlign: 'center', padding: '8px 4px',
      background: 'white', borderRadius: 10, border: '1px solid #F0E8E4',
    }}>
      <div style={{ fontSize: 14, fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 8, color: '#9A8B94', fontWeight: 700, marginTop: 2 }}>{label}</div>
    </div>
  )
}
