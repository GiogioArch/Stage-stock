import React, { useMemo } from 'react'
import { Award, MapPin } from 'lucide-react'
import KpiDetailSheet from './KpiDetailSheet'
import { fmtEuro, fmtDate, fmtInt, Section, StatGrid, EmptyState } from './_shared'
import { BASE, SPACE, RADIUS, TYPO } from '../../lib/theme'

const ACCENT = '#5DAB8B'
const DAY_MS = 86400000

export default function BestConcertSheet({
  isOpen, onClose,
  sales = [], saleItems = [], products = [], events = [],
}) {
  const calc = useMemo(() => {
    const now = Date.now()
    const from = now - 30 * DAY_MS
    const winSales = (sales || []).filter(s => {
      if (!s?.created_at) return false
      const t = new Date(s.created_at).getTime()
      return t >= from && t <= now
    })
    const byEvent = {}
    for (const s of winSales) {
      const eid = s.event_id
      if (!eid) continue
      if (!byEvent[eid]) byEvent[eid] = { total: 0, sales: [], customers: new Set() }
      byEvent[eid].total += Number(s.total_amount || 0)
      byEvent[eid].sales.push(s)
      if (s.customer_id) byEvent[eid].customers.add(s.customer_id)
    }
    const entries = Object.entries(byEvent).sort((a, b) => b[1].total - a[1].total)
    if (entries.length === 0) return { event: null }
    const [eid, data] = entries[0]
    const event = (events || []).find(e => e.id === eid)
    // Items du concert
    const saleIds = new Set(data.sales.map(s => s.id))
    const items = (saleItems || []).filter(it => saleIds.has(it.sale_id))
    const itemByProduct = {}
    for (const it of items) {
      const pid = it.product_id
      if (!pid) continue
      if (!itemByProduct[pid]) itemByProduct[pid] = { qty: 0, total: 0 }
      itemByProduct[pid].qty += Number(it.quantity || 0)
      itemByProduct[pid].total += Number(it.line_total || 0)
    }
    const itemsList = Object.entries(itemByProduct)
      .map(([pid, s]) => {
        const p = (products || []).find(pr => pr.id === pid)
        return { name: p?.name || 'Produit inconnu', qty: s.qty, total: s.total }
      })
      .sort((a, b) => b.total - a.total)

    // Prévu vs réel (si le concert a un ca_previsionnel ou forecast)
    const prevu = Number(event?.ca_previsionnel || event?.forecast_total || 0)

    return {
      event,
      total: data.total,
      sales: data.sales,
      uniqueCustomers: data.customers.size,
      itemsList,
      prevu,
      ticketCount: data.sales.filter(s => !s.is_aggregate).length,
    }
  }, [sales, saleItems, products, events])

  const ev = calc.event
  const subtitle = ev
    ? `${fmtEuro(calc.total)} · ${ev.date ? fmtDate(ev.date) : ''}`
    : '—'

  return (
    <KpiDetailSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Meilleur concert 30j"
      subtitle={subtitle}
      accentColor={ACCENT}
      icon={Award}
    >
      {!calc.event ? (
        <EmptyState message="Aucun concert avec des ventes sur 30 jours." />
      ) : (
        <>
          <Section title="Événement" accent={ACCENT}>
            <div style={{
              padding: SPACE.md,
              background: `${ACCENT}10`,
              borderRadius: RADIUS.lg,
              border: `1px solid ${ACCENT}30`,
            }}>
              <div style={{ ...TYPO.h3, color: BASE.text, marginBottom: 4 }}>
                {ev.name || ev.lieu || 'Concert'}
              </div>
              <div style={{ ...TYPO.caption, color: BASE.textSoft, display: 'flex', alignItems: 'center', gap: 6 }}>
                <MapPin size={12} />
                {ev.lieu || '—'} {ev.territoire ? `· ${ev.territoire}` : ''}
              </div>
              <div style={{ ...TYPO.micro, color: BASE.textMuted, marginTop: 4 }}>
                {ev.date ? fmtDate(ev.date) : '—'}{ev.format ? ` · ${ev.format}` : ''}
              </div>
            </div>
          </Section>

          <Section title="Performance" accent={ACCENT}>
            <StatGrid items={[
              { label: 'CA total', value: fmtEuro(calc.total), color: ACCENT },
              { label: 'Tickets', value: fmtInt(calc.ticketCount) },
              { label: 'Clients ident.', value: fmtInt(calc.uniqueCustomers) },
              { label: 'Articles vendus', value: fmtInt(calc.itemsList.reduce((a, i) => a + i.qty, 0)) },
            ]} />
          </Section>

          {calc.prevu > 0 && (
            <Section title="Réel vs prévu" accent={ACCENT}>
              <div style={{
                padding: SPACE.md,
                background: BASE.bgSurface,
                borderRadius: RADIUS.lg,
                border: `1px solid ${BASE.border}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ ...TYPO.caption, color: BASE.textSoft }}>Prévu</span>
                  <span style={{ ...TYPO.bodyBold, color: BASE.text }}>{fmtEuro(calc.prevu)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ ...TYPO.caption, color: BASE.textSoft }}>Réel</span>
                  <span style={{
                    ...TYPO.bodyBold,
                    color: calc.total >= calc.prevu ? ACCENT : '#E8935A',
                  }}>
                    {fmtEuro(calc.total)} ({Math.round((calc.total / calc.prevu) * 100)}%)
                  </span>
                </div>
              </div>
            </Section>
          )}

          <Section title="Détail des items vendus" accent={ACCENT}>
            <div style={{
              background: BASE.bgSurface,
              borderRadius: RADIUS.lg,
              border: `1px solid ${BASE.border}`,
              overflow: 'hidden',
            }}>
              {calc.itemsList.slice(0, 15).map((it, i) => (
                <div key={i} style={{
                  padding: SPACE.md,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: i < calc.itemsList.length - 1 ? `1px solid ${BASE.border}` : 'none',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ ...TYPO.bodyBold, color: BASE.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {it.name}
                    </div>
                    <div style={{ ...TYPO.micro, color: BASE.textMuted }}>
                      {fmtInt(it.qty)} u
                    </div>
                  </div>
                  <div style={{ ...TYPO.bodyBold, color: ACCENT }}>{fmtEuro(it.total)}</div>
                </div>
              ))}
            </div>
          </Section>
        </>
      )}
    </KpiDetailSheet>
  )
}
