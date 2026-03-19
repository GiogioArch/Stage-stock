import React, { useState, useMemo, createElement } from 'react'
import { db } from '../lib/supabase'
import { TrendingDown, BarChart3, DollarSign, Receipt, Scale, Clock } from 'lucide-react'
import { Badge, parseDate } from './UI'

export default function Finance({ products, stock, events, locations, depreciation, expenses, sales, orgId, orgName, onReload, onToast }) {
  const [section, setSection] = useState('overview')
  const [showAddExpense, setShowAddExpense] = useState(false)

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

  // ─── Expenses ───
  const expenseData = useMemo(() => {
    const items = expenses || []
    const total = items.reduce((s, e) => s + (e.amount || 0), 0)
    const byCategory = {}
    items.forEach(e => {
      const cat = e.category || 'other'
      if (!byCategory[cat]) byCategory[cat] = { total: 0, count: 0 }
      byCategory[cat].total += e.amount || 0
      byCategory[cat].count++
    })
    return { items, total, byCategory }
  }, [expenses])

  // ─── Sales totals ───
  const salesTotals = useMemo(() => {
    const items = sales || []
    const total = items.reduce((s, sale) => s + (sale.total_amount || 0), 0)
    const count = items.length
    const byCash = items.filter(s => s.payment_method === 'cash').reduce((sum, s) => sum + (s.total_amount || 0), 0)
    const byCard = items.filter(s => s.payment_method === 'card').reduce((sum, s) => sum + (s.total_amount || 0), 0)
    return { total, count, byCash, byCard }
  }, [sales])

  // ─── Margin ───
  const margin = revenueData.caReel + salesTotals.total - expenseData.total

  const EXPENSE_CATS = {
    transport: 'Transport', lodging: 'Hébergement', food: 'Restauration',
    equipment: 'Matériel', merch_purchase: 'Achat merch', venue: 'Salle',
    marketing: 'Marketing', admin: 'Admin', other: 'Autre',
  }

  const SECTIONS = [
    { id: 'overview', label: 'Vue globale', icon: BarChart3 },
    { id: 'revenue', label: 'Revenus', icon: DollarSign },
    { id: 'expenses', label: 'Dépenses', icon: Receipt },
    { id: 'bilan', label: 'Bilan', icon: Scale },
    { id: 'depreciation', label: 'Amortis.', icon: Clock },
  ]

  return (
    <div style={{ padding: '0 16px 24px' }}>

      {/* Header */}
      <div className="card" style={{
        marginBottom: 16, padding: '18px 16px',
        background: 'linear-gradient(135deg, #E8935A08, #E8935A18)',
        border: '1px solid #E8935A25',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 8,
            background: 'linear-gradient(135deg, #E8935A, #D4824A)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, color: 'white', boxShadow: '0 4px 16px #E8935A30',
          }}></div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#1E293B' }}>Finance</div>
            <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 600 }}>
              Suivi financier — {orgName || 'Projet'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <KpiBox label="Revenus" value={`${Math.round(revenueData.caReel + salesTotals.total)}€`} color="#5DAB8B" />
          <KpiBox label="Dépenses" value={`${Math.round(expenseData.total)}€`} color="#D4648A" />
          <KpiBox label="Marge" value={`${Math.round(margin)}€`} color={margin >= 0 ? '#5DAB8B' : '#D4648A'} />
        </div>
      </div>

      {/* Section tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {SECTIONS.map(s => (
          <button key={s.id} onClick={() => setSection(s.id)} style={{
            flex: 1, padding: '7px 10px', borderRadius: 10, fontSize: 11, fontWeight: 700,
            cursor: 'pointer', textAlign: 'center',
            background: section === s.id ? '#E8935A15' : 'white',
            color: section === s.id ? '#E8935A' : '#94A3B8',
            border: `1px solid ${section === s.id ? '#E8935A40' : '#CBD5E1'}`,
          }}>{createElement(s.icon, { size: 14 })} {s.label}</button>
        ))}
      </div>

      {/* ─── Overview ─── */}
      {section === 'overview' && (
        <div>
          {/* Revenue summary */}
          <div className="card" style={{ padding: '14px 16px', marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
              Revenus merch
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#CBD5E1' }}>Ventes réalisées</div>
                <div style={{ fontSize: 20, fontWeight: 600, color: '#5DAB8B' }}>{revenueData.ventesReelles}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#CBD5E1' }}>CA réalisé</div>
                <div style={{ fontSize: 20, fontWeight: 600, color: '#5DAB8B' }}>{revenueData.caReel}€</div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#CBD5E1' }}>Ventes prévues</div>
                <div style={{ fontSize: 20, fontWeight: 600, color: '#E8935A' }}>{revenueData.ventesPrevues}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#CBD5E1' }}>CA prévu</div>
                <div style={{ fontSize: 20, fontWeight: 600, color: '#E8935A' }}>{revenueData.caPrevu}€</div>
              </div>
            </div>
          </div>

          {/* Asset summary */}
          {depreciationItems.length > 0 && (
            <div className="card" style={{ padding: '14px 16px', marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
                Immobilisations
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, textAlign: 'center' }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: '#E8935A' }}>{Math.round(totalBrut)}€</div>
                  <div style={{ fontSize: 9, color: '#94A3B8', fontWeight: 600 }}>Valeur brute</div>
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: '#E8935A' }}>{Math.round(totalAmorti)}€</div>
                  <div style={{ fontSize: 9, color: '#94A3B8', fontWeight: 600 }}>Amorti</div>
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: '#5DAB8B' }}>{Math.round(totalNet)}€</div>
                  <div style={{ fontSize: 9, color: '#94A3B8', fontWeight: 600 }}>Valeur nette</div>
                </div>
              </div>
            </div>
          )}

          {/* Stock value */}
          <div className="card" style={{ padding: '14px 16px' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
              Valorisation du stock
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 600, color: '#E8935A' }}>{Math.round(stockValue)}€</div>
              <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>
                Valeur estimée au prix d'achat HT
              </div>
            </div>
          </div>

          {/* Legal note */}
          <div style={{
            marginTop: 14, padding: '10px 14px', borderRadius: 12,
            background: '#F1F5F940', fontSize: 10, color: '#94A3B8', lineHeight: 1.6,
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
          <div style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
            Concerts avec résultats
          </div>
          {revenueData.past.length === 0 ? (
            <div className="empty-state" style={{ padding: 32 }}>
              <div className="empty-icon"></div>
              <div className="empty-text">Aucun résultat enregistré</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {revenueData.past.map(ev => (
                <div key={ev.id} className="card" style={{ padding: '12px 14px', borderLeft: '4px solid #5DAB8B' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{ev.name || ev.lieu}</div>
                      <div style={{ fontSize: 11, color: '#94A3B8' }}>
                        {parseDate(ev.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} — {ev.ville}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 16, fontWeight: 600, color: '#5DAB8B' }}>{ev.ca_reel}€</div>
                      <div style={{ fontSize: 10, color: '#94A3B8' }}>{ev.ventes_reelles} ventes</div>
                    </div>
                  </div>
                  {ev.ca_prevu && (
                    <div style={{ fontSize: 10, color: '#CBD5E1' }}>
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
              <div style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, margin: '16px 0 10px' }}>
                Prévisions
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {revenueData.upcoming.filter(e => e.ca_prevu).map(ev => (
                  <div key={ev.id} className="card" style={{ padding: '12px 14px', borderLeft: '4px solid #E8935A' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>{ev.name || ev.lieu}</div>
                        <div style={{ fontSize: 11, color: '#94A3B8' }}>
                          {parseDate(ev.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} — {ev.ville}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 16, fontWeight: 600, color: '#E8935A' }}>{ev.ca_prevu}€</div>
                        {ev.ventes_prevues && <div style={{ fontSize: 10, color: '#94A3B8' }}>{ev.ventes_prevues} ventes</div>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ─── Expenses ─── */}
      {section === 'expenses' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button onClick={() => setShowAddExpense(!showAddExpense)} style={{
              padding: '8px 16px', borderRadius: 10, fontSize: 12, fontWeight: 600,
              background: showAddExpense ? '#F1F5F9' : '#D4648A', color: showAddExpense ? '#94A3B8' : 'white',
              cursor: 'pointer', border: 'none',
            }}>{showAddExpense ? 'Annuler' : '+ Ajouter dépense'}</button>
          </div>

          {showAddExpense && (
            <AddExpenseForm events={events} orgId={orgId} onDone={() => { setShowAddExpense(false); if (onReload) onReload() }} onToast={onToast} cats={EXPENSE_CATS} />
          )}

          {/* Summary by category */}
          {expenseData.total > 0 && (
            <div className="card" style={{ padding: '14px 16px', marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
                Par catégorie · {Math.round(expenseData.total)}€ total
              </div>
              {Object.entries(expenseData.byCategory).sort((a, b) => b[1].total - a[1].total).map(([cat, data]) => {
                const pct = Math.round((data.total / expenseData.total) * 100)
                return (
                  <div key={cat} style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                      <span style={{ color: '#1E293B', fontWeight: 600 }}>{EXPENSE_CATS[cat] || cat}</span>
                      <span style={{ fontWeight: 600, color: '#D4648A' }}>{Math.round(data.total)}€</span>
                    </div>
                    <div style={{ height: 4, borderRadius: 2, background: '#F1F5F9', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', borderRadius: 2, background: '#D4648A' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Expense list */}
          {expenseData.items.length === 0 ? (
            <div className="card" style={{ padding: 32, textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}></div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#1E293B' }}>Aucune dépense</div>
            </div>
          ) : (
            <div className="card" style={{ padding: '6px 12px' }}>
              {expenseData.items.sort((a, b) => (b.date || '').localeCompare(a.date || '')).map((exp, i) => {
                const ev = (events || []).find(e => e.id === exp.event_id)
                return (
                  <div key={exp.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
                    borderBottom: i < expenseData.items.length - 1 ? '1px solid #F1F5F9' : 'none',
                  }}>
                    <span style={{ fontSize: 14 }}>{(EXPENSE_CATS[exp.category] || '').split(' ')[0]}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exp.description}</div>
                      <div style={{ fontSize: 10, color: '#94A3B8' }}>
                        {exp.date}{ev ? ` · ${ev.name || ev.lieu}` : ''}{exp.paid ? ' · Payé' : ''}
                      </div>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#D4648A' }}>{exp.amount}€</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── Bilan par événement ─── */}
      {section === 'bilan' && (
        <div>
          {(events || []).filter(e => e.date < today).length === 0 ? (
            <div className="card" style={{ padding: 32, textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}></div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#1E293B' }}>Aucun concert passé</div>
              <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>Le bilan apparaîtra après les premiers concerts</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(events || []).filter(e => e.date < today).sort((a, b) => b.date.localeCompare(a.date)).map(ev => {
                const evExpenses = (expenses || []).filter(e => e.event_id === ev.id).reduce((s, e) => s + (e.amount || 0), 0)
                const evSales = (sales || []).filter(s => s.event_id === ev.id).reduce((s, sale) => s + (sale.total_amount || 0), 0)
                const evRevenu = (ev.ca_reel || 0) + evSales
                const evTickets = ev.ticket_revenue || 0
                const evSponsors = ev.sponsor_revenue || 0
                const evTotal = evRevenu + evTickets + evSponsors
                const evMargin = evTotal - evExpenses
                return (
                  <div key={ev.id} className="card" style={{
                    padding: '14px 16px', borderLeft: `4px solid ${evMargin >= 0 ? '#5DAB8B' : '#D4648A'}`,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{ev.name || ev.lieu}</div>
                        <div style={{ fontSize: 11, color: '#94A3B8' }}>
                          {parseDate(ev.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} — {ev.ville}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 18, fontWeight: 600, color: evMargin >= 0 ? '#5DAB8B' : '#D4648A' }}>
                          {evMargin >= 0 ? '+' : ''}{Math.round(evMargin)}€
                        </div>
                        <div style={{ fontSize: 9, color: '#94A3B8' }}>marge</div>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, fontSize: 11 }}>
                      <div><span style={{ color: '#94A3B8' }}>Merch :</span> <strong style={{ color: '#5DAB8B' }}>{evRevenu}€</strong></div>
                      <div><span style={{ color: '#94A3B8' }}>Billets :</span> <strong>{evTickets}€</strong></div>
                      <div><span style={{ color: '#94A3B8' }}>Sponsors :</span> <strong>{evSponsors}€</strong></div>
                    </div>
                    {evExpenses > 0 && (
                      <div style={{ fontSize: 11, marginTop: 4 }}>
                        <span style={{ color: '#94A3B8' }}>Dépenses :</span> <strong style={{ color: '#D4648A' }}>-{Math.round(evExpenses)}€</strong>
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Total */}
              <div className="card" style={{ padding: '14px 16px', background: '#F1F5F920' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                  Bilan consolidé
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, textAlign: 'center' }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 600, color: '#5DAB8B' }}>{Math.round(revenueData.caReel + salesTotals.total)}€</div>
                    <div style={{ fontSize: 9, color: '#94A3B8' }}>Total revenus</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 600, color: '#D4648A' }}>{Math.round(expenseData.total)}€</div>
                    <div style={{ fontSize: 9, color: '#94A3B8' }}>Total dépenses</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 600, color: margin >= 0 ? '#5DAB8B' : '#D4648A' }}>{Math.round(margin)}€</div>
                    <div style={{ fontSize: 9, color: '#94A3B8' }}>Marge nette</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Depreciation detail ─── */}
      {section === 'depreciation' && (
        <div>
          {depreciationItems.length === 0 ? (
            <div className="empty-state" style={{ padding: 32 }}>
              <div className="empty-icon">{createElement(TrendingDown, { size: 40, color: '#94A3B8' })}</div>
              <div className="empty-text">Aucune immobilisation</div>
              <div style={{ fontSize: 11, color: '#CBD5E1', marginTop: 4 }}>
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
                      <span style={{ fontSize: 16 }}>{d.product?.image || ''}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {d.product?.name || 'Produit inconnu'}
                        </div>
                        <div style={{ fontSize: 10, color: '#94A3B8' }}>
                          Durée: {d.duree_amort || '?'} ans · Acquis: {d.date_acquisition ? parseDate(d.date_acquisition).toLocaleDateString('fr-FR') : '?'}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#5DAB8B' }}>{Math.round(d.valeur_nette || 0)}€</div>
                        <div style={{ fontSize: 9, color: '#94A3B8' }}>net</div>
                      </div>
                    </div>
                    {/* Progress */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 10, color: '#94A3B8' }}>Brut: {Math.round(d.prix_achat_ht || 0)}€</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#E8935A' }}>{pct}% amorti</span>
                    </div>
                    <div style={{ height: 4, borderRadius: 2, background: '#F1F5F9', overflow: 'hidden' }}>
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

function AddExpenseForm({ events, orgId, onDone, onToast, cats }) {
  const [category, setCategory] = useState('other')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [eventId, setEventId] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!description.trim() || !amount) return
    setSaving(true)
    try {
      await db.insert('expenses', {
        org_id: orgId,
        event_id: eventId || null,
        category,
        description: description.trim(),
        amount: parseFloat(amount) || 0,
        date,
      })
      onToast('Dépense ajoutée')
      onDone()
    } catch (e) {
      onToast('Erreur : ' + e.message, '#D4648A')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card" style={{ padding: 16, marginBottom: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#1E293B', marginBottom: 12 }}>Nouvelle dépense</div>
      <input className="input" value={description} onChange={e => setDescription(e.target.value)} placeholder="Description" style={{ marginBottom: 10 }} />
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <input className="input" value={amount} onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="Montant €" inputMode="decimal" style={{ flex: 1 }} />
        <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} style={{ flex: 1 }} />
      </div>
      <select className="input" value={category} onChange={e => setCategory(e.target.value)} style={{ marginBottom: 10 }}>
        {Object.entries(cats).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
      <select className="input" value={eventId} onChange={e => setEventId(e.target.value)} style={{ marginBottom: 10 }}>
        <option value="">— Concert (optionnel) —</option>
        {(events || []).map(ev => (
          <option key={ev.id} value={ev.id}>{ev.name || ev.lieu} — {ev.date}</option>
        ))}
      </select>
      <button onClick={handleSave} disabled={!description.trim() || !amount || saving} className="btn-primary">
        {saving ? 'Ajout...' : 'Ajouter'}
      </button>
    </div>
  )
}

function KpiBox({ label, value, color }) {
  return (
    <div style={{
      flex: 1, textAlign: 'center', padding: '8px 4px',
      background: '#F1F5F9', borderRadius: 10, border: '1px solid #F1F5F9',
    }}>
      <div style={{ fontSize: 14, fontWeight: 600, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 8, color: '#94A3B8', fontWeight: 700, marginTop: 2 }}>{label}</div>
    </div>
  )
}
