import React, { useState, useMemo } from 'react'
import { ShoppingCart, TrendingUp, Users, CreditCard, Banknote, BarChart3, Filter, ChevronDown, ChevronUp } from 'lucide-react'

const ACCENT = '#5DAB8B'
const ACCENT_BG = '#E4F5EF'
const CARD_BG = '#FFFFFF'
const MUTED = '#64748B'
const BORDER = '#E2E8F0'

function KpiCard({ icon: Icon, label, value, sub, color = ACCENT }) {
  return (
    <div style={{
      background: CARD_BG, borderRadius: 14, padding: '14px 14px 12px',
      border: `1px solid ${BORDER}`, flex: '1 1 140px', minWidth: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={14} color={color} />
        </div>
        <span style={{ fontSize: 11, color: MUTED, fontWeight: 600 }}>{label}</span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: '#1E293B' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function BarH({ label, value, max, color = ACCENT, suffix = '' }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
        <span style={{ fontWeight: 600, color: '#1E293B' }}>{label}</span>
        <span style={{ fontWeight: 700, color }}>{value}{suffix}</span>
      </div>
      <div style={{ height: 8, background: '#F1F5F9', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width .3s' }} />
      </div>
    </div>
  )
}

function Section({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ background: CARD_BG, borderRadius: 14, border: `1px solid ${BORDER}`, marginBottom: 12, overflow: 'hidden' }}>
      <button onClick={() => setOpen(!open)} style={{
        width: '100%', padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'none', border: 'none', cursor: 'pointer', color: '#1E293B',
      }}>
        <span style={{ fontSize: 13, fontWeight: 700 }}>{title}</span>
        {open ? <ChevronUp size={16} color={MUTED} /> : <ChevronDown size={16} color={MUTED} />}
      </button>
      {open && <div style={{ padding: '0 14px 14px' }}>{children}</div>}
    </div>
  )
}

export default function SalesAnalytics({ sales = [], saleItems = [], products = [], events = [] }) {
  const [eventFilter, setEventFilter] = useState('all')

  // ─── Enrich sale items with product info ───
  const productMap = useMemo(() => {
    const m = {}
    ;(products || []).forEach(p => { m[p.id] = p })
    return m
  }, [products])

  const eventMap = useMemo(() => {
    const m = {}
    ;(events || []).forEach(e => { m[e.id] = e })
    return m
  }, [events])

  // Events that have sales
  const eventsWithSales = useMemo(() => {
    const ids = new Set((sales || []).map(s => s.event_id).filter(Boolean))
    return (events || []).filter(e => ids.has(e.id)).sort((a, b) => (a.date || '').localeCompare(b.date || ''))
  }, [sales, events])

  // Filtered sales
  const filteredSales = useMemo(() => {
    if (eventFilter === 'all') return sales || []
    return (sales || []).filter(s => s.event_id === eventFilter)
  }, [sales, eventFilter])

  const filteredSaleIds = useMemo(() => new Set(filteredSales.map(s => s.id)), [filteredSales])

  const filteredItems = useMemo(() =>
    (saleItems || []).filter(si => filteredSaleIds.has(si.sale_id)),
    [saleItems, filteredSaleIds]
  )

  // ─── KPIs ───
  const totalCA = filteredSales.reduce((s, v) => s + Number(v.total_amount || 0), 0)
  const totalItems = filteredItems.reduce((s, i) => s + (i.quantity || 0), 0)
  const totalTransactions = filteredSales.length
  const avgBasket = totalTransactions > 0 ? (totalCA / totalTransactions) : 0
  const avgPricePerItem = totalItems > 0 ? (totalCA / totalItems) : 0

  const paymentBreakdown = useMemo(() => {
    const bd = { card: 0, cash: 0, mobile: 0 }
    filteredSales.forEach(s => {
      const m = s.payment_method || 'cash'
      bd[m] = (bd[m] || 0) + Number(s.total_amount || 0)
    })
    return bd
  }, [filteredSales])

  // ─── Top products by quantity ───
  const productStats = useMemo(() => {
    const map = {}
    filteredItems.forEach(si => {
      const pid = si.product_id
      if (!map[pid]) map[pid] = { qty: 0, ca: 0, product: productMap[pid] || { name: 'Inconnu' } }
      map[pid].qty += si.quantity || 0
      map[pid].ca += Number(si.line_total || 0)
    })
    return Object.values(map).sort((a, b) => b.qty - a.qty)
  }, [filteredItems, productMap])

  const maxQty = productStats.length > 0 ? productStats[0].qty : 1

  // ─── Size breakdown ───
  const sizeStats = useMemo(() => {
    const map = {}
    filteredItems.forEach(si => {
      const size = si.variant || 'Unique'
      if (!map[size]) map[size] = { qty: 0, ca: 0 }
      map[size].qty += si.quantity || 0
      map[size].ca += Number(si.line_total || 0)
    })
    return Object.entries(map).sort((a, b) => b[1].qty - a[1].qty)
  }, [filteredItems])

  const maxSizeQty = sizeStats.length > 0 ? sizeStats[0][1].qty : 1

  // ─── Per-event breakdown ───
  const eventStats = useMemo(() => {
    const map = {}
    filteredSales.forEach(s => {
      const eid = s.event_id || 'libre'
      if (!map[eid]) {
        const ev = eventMap[eid]
        map[eid] = { name: ev?.name || 'Vente libre', date: ev?.date, ca: 0, qty: 0, txn: 0, capacite: ev?.capacite }
      }
      map[eid].ca += Number(s.total_amount || 0)
      map[eid].txn += 1
    })
    // Add item quantities
    filteredItems.forEach(si => {
      const s = filteredSales.find(sale => sale.id === si.sale_id)
      if (s) {
        const eid = s.event_id || 'libre'
        if (map[eid]) map[eid].qty += si.quantity || 0
      }
    })
    return Object.values(map).sort((a, b) => (a.date || '').localeCompare(b.date || ''))
  }, [filteredSales, filteredItems, eventMap])

  // ─── Prevu vs Réel ───
  const prevuVsReel = useMemo(() => {
    return eventsWithSales.map(ev => ({
      name: ev.name,
      date: ev.date,
      prevuQty: ev.ventes_prevues || 0,
      reelQty: ev.ventes_reelles || 0,
      prevuCA: Number(ev.ca_prevu || 0),
      reelCA: Number(ev.ca_reel || 0),
    }))
  }, [eventsWithSales])

  // ─── Aide à la récommande ───
  const reorderAdvice = useMemo(() => {
    return productStats
      .filter(ps => ps.product && ps.qty > 0)
      .map(ps => {
        const p = ps.product
        const ratio = ps.qty / totalItems
        return {
          name: p.name,
          sold: ps.qty,
          pctOfSales: Math.round(ratio * 100),
          ca: ps.ca,
        }
      })
  }, [productStats, totalItems])

  if (!sales || sales.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <ShoppingCart size={48} color={MUTED} style={{ marginBottom: 12, opacity: 0.3 }} />
        <div style={{ fontSize: 15, fontWeight: 600, color: MUTED }}>Aucune vente enregistrée</div>
        <div style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>Les données apparaîtront ici après le premier concert</div>
      </div>
    )
  }

  return (
    <div style={{ padding: '16px 16px 100px', maxWidth: 600, margin: '0 auto' }}>
      {/* ─── Header ─── */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#1E293B', marginBottom: 4 }}>
          Analyse des ventes
        </div>
        <div style={{ fontSize: 12, color: MUTED }}>
          {totalTransactions} transaction{totalTransactions > 1 ? 's' : ''} · {totalItems} articles · {totalCA.toFixed(0)}€ CA
        </div>
      </div>

      {/* ─── Event filter ─── */}
      {eventsWithSales.length > 1 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          <button
            onClick={() => setEventFilter('all')}
            style={{
              padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              background: eventFilter === 'all' ? ACCENT : '#F1F5F9',
              color: eventFilter === 'all' ? 'white' : MUTED,
              border: 'none',
            }}
          >Tous</button>
          {eventsWithSales.map(ev => (
            <button
              key={ev.id}
              onClick={() => setEventFilter(ev.id)}
              style={{
                padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                background: eventFilter === ev.id ? ACCENT : '#F1F5F9',
                color: eventFilter === ev.id ? 'white' : MUTED,
                border: 'none',
              }}
            >{ev.date ? new Date(ev.date + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : ev.name}</button>
          ))}
        </div>
      )}

      {/* ─── KPI Cards ─── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        <KpiCard icon={TrendingUp} label="CA Total" value={`${totalCA.toFixed(0)}€`} sub={`${paymentBreakdown.card.toFixed(0)}€ CB · ${paymentBreakdown.cash.toFixed(0)}€ espèces`} />
        <KpiCard icon={ShoppingCart} label="Articles vendus" value={totalItems} sub={`${totalTransactions} transaction${totalTransactions > 1 ? 's' : ''}`} />
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        <KpiCard icon={Users} label="Panier moyen" value={`${avgBasket.toFixed(0)}€`} sub="par client" color="#E8935A" />
        <KpiCard icon={BarChart3} label="Prix moyen" value={`${avgPricePerItem.toFixed(0)}€`} sub="par article" color="#8B6DB8" />
      </div>

      {/* ─── Top produits ─── */}
      <Section title="🏆 Top produits">
        {productStats.map((ps, i) => (
          <BarH
            key={i}
            label={ps.product.name}
            value={ps.qty}
            max={maxQty}
            suffix={` (${ps.ca.toFixed(0)}€)`}
            color={i === 0 ? ACCENT : i === 1 ? '#E8935A' : '#5B8DB8'}
          />
        ))}
      </Section>

      {/* ─── Répartition tailles ─── */}
      <Section title="📏 Répartition par taille">
        {sizeStats.map(([size, stat], i) => (
          <BarH
            key={size}
            label={size}
            value={stat.qty}
            max={maxSizeQty}
            suffix={` pcs (${stat.ca.toFixed(0)}€)`}
            color="#8B6DB8"
          />
        ))}
      </Section>

      {/* ─── Prévisions vs Réel ─── */}
      {prevuVsReel.length > 0 && (
        <Section title="📊 Prévu vs Réel">
          {prevuVsReel.map((pv, i) => {
            const pctQty = pv.prevuQty > 0 ? Math.round((pv.reelQty / pv.prevuQty) * 100) : 0
            const pctCA = pv.prevuCA > 0 ? Math.round((pv.reelCA / pv.prevuCA) * 100) : 0
            return (
              <div key={i} style={{
                padding: '10px 0', borderBottom: i < prevuVsReel.length - 1 ? `1px solid ${BORDER}` : 'none',
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#1E293B', marginBottom: 6 }}>
                  {pv.name}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 10, color: MUTED, marginBottom: 2 }}>Articles</div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>
                      <span style={{ color: pctQty >= 80 ? ACCENT : '#D4648A' }}>{pv.reelQty}</span>
                      <span style={{ color: MUTED, fontWeight: 400 }}> / {pv.prevuQty}</span>
                      <span style={{ fontSize: 11, color: pctQty >= 80 ? ACCENT : '#D4648A', marginLeft: 4 }}>({pctQty}%)</span>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: MUTED, marginBottom: 2 }}>CA</div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>
                      <span style={{ color: pctCA >= 80 ? ACCENT : '#D4648A' }}>{pv.reelCA.toFixed(0)}€</span>
                      <span style={{ color: MUTED, fontWeight: 400 }}> / {pv.prevuCA.toFixed(0)}€</span>
                      <span style={{ fontSize: 11, color: pctCA >= 80 ? ACCENT : '#D4648A', marginLeft: 4 }}>({pctCA}%)</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </Section>
      )}

      {/* ─── Par événement ─── */}
      {eventStats.length > 1 && (
        <Section title="🎤 Par concert">
          {eventStats.map((es, i) => (
            <div key={i} style={{
              padding: '10px 0', borderBottom: i < eventStats.length - 1 ? `1px solid ${BORDER}` : 'none',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#1E293B' }}>{es.name}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: ACCENT }}>{es.ca.toFixed(0)}€</span>
              </div>
              <div style={{ fontSize: 11, color: MUTED }}>
                {es.txn} vente{es.txn > 1 ? 's' : ''} · {es.qty} article{es.qty > 1 ? 's' : ''}
                {es.capacite ? ` · Taux conversion ${((es.txn / es.capacite) * 100).toFixed(1)}%` : ''}
              </div>
            </div>
          ))}
        </Section>
      )}

      {/* ─── Aide à la récommande ─── */}
      <Section title="🛒 Aide à la récommande">
        <div style={{ fontSize: 12, color: MUTED, marginBottom: 10 }}>
          Basé sur les ventes réelles. Priorise les produits les plus demandés.
        </div>
        <div style={{
          background: ACCENT_BG, borderRadius: 10, padding: 12, border: `1px solid ${ACCENT}30`,
        }}>
          {reorderAdvice.map((ra, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '6px 0', borderBottom: i < reorderAdvice.length - 1 ? `1px solid ${ACCENT}20` : 'none',
            }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#1E293B' }}>{ra.name}</div>
                <div style={{ fontSize: 10, color: MUTED }}>{ra.pctOfSales}% des ventes</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: ACCENT }}>{ra.sold} vendus</div>
                <div style={{ fontSize: 10, color: MUTED }}>{ra.ca.toFixed(0)}€ CA</div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ─── Détail des ventes ─── */}
      <Section title="📋 Détail des ventes" defaultOpen={false}>
        {filteredSales.map((sale, i) => {
          const items = filteredItems.filter(si => si.sale_id === sale.id)
          const ev = eventMap[sale.event_id]
          return (
            <div key={sale.id} style={{
              padding: '10px 0', borderBottom: i < filteredSales.length - 1 ? `1px solid ${BORDER}` : 'none',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#1E293B' }}>{sale.sale_number}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {sale.payment_method === 'card' && <CreditCard size={12} color={MUTED} />}
                  {sale.payment_method === 'cash' && <Banknote size={12} color={MUTED} />}
                  <span style={{ fontSize: 13, fontWeight: 700, color: ACCENT }}>{Number(sale.total_amount).toFixed(0)}€</span>
                </div>
              </div>
              <div style={{ fontSize: 10, color: MUTED, marginBottom: 4 }}>
                {ev ? new Date(ev.date + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) : ''}
                {sale.notes ? ` · ${sale.notes.substring(0, 60)}${sale.notes.length > 60 ? '...' : ''}` : ''}
              </div>
              {items.map((it, j) => {
                const p = productMap[it.product_id]
                return (
                  <div key={j} style={{ fontSize: 11, color: '#475569', paddingLeft: 8, marginBottom: 2 }}>
                    {it.quantity}x {p?.name || '?'}{it.variant ? ` (${it.variant})` : ''} — {Number(it.line_total).toFixed(0)}€
                  </div>
                )
              })}
            </div>
          )
        })}
      </Section>
    </div>
  )
}
