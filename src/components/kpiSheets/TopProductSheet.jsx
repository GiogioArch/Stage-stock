import React, { useMemo } from 'react'
import { Trophy } from 'lucide-react'
import KpiDetailSheet from './KpiDetailSheet'
import { fmtEuro, fmtInt, Section, EmptyState, SvgBarChart, StatGrid } from './_shared'
import { BASE, SPACE, RADIUS, TYPO } from '../../lib/theme'

const ACCENT = '#5DAB8B'
const DAY_MS = 86400000

export default function TopProductSheet({
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
    const winSaleIds = new Set(winSales.map(s => s.id))
    const byProduct = {}
    for (const it of saleItems || []) {
      if (!winSaleIds.has(it.sale_id)) continue
      const pid = it.product_id
      if (!pid) continue
      if (!byProduct[pid]) byProduct[pid] = { qty: 0, total: 0, lines: [] }
      byProduct[pid].qty += Number(it.quantity || 0)
      byProduct[pid].total += Number(it.line_total || 0)
      byProduct[pid].lines.push(it)
    }
    const entries = Object.entries(byProduct).sort((a, b) => b[1].qty - a[1].qty)
    if (entries.length === 0) return { product: null }
    const [pid, stats] = entries[0]
    const product = (products || []).find(p => p.id === pid) || { id: pid, name: 'Produit inconnu' }

    // 10 meilleures lignes de vente pour ce produit
    const bestLines = [...stats.lines]
      .sort((a, b) => Number(b.quantity || 0) - Number(a.quantity || 0))
      .slice(0, 10)
      .map(l => {
        const sale = winSales.find(s => s.id === l.sale_id)
        const ev = sale ? (events || []).find(e => e.id === sale.event_id) : null
        return { line: l, sale, event: ev }
      })

    // Répartition par concert
    const byEvent = {}
    for (const l of stats.lines) {
      const sale = winSales.find(s => s.id === l.sale_id)
      if (!sale) continue
      const eid = sale.event_id || '_none'
      byEvent[eid] = (byEvent[eid] || 0) + Number(l.quantity || 0)
    }
    const eventDist = Object.entries(byEvent)
      .map(([eid, qty]) => {
        const ev = (events || []).find(e => e.id === eid)
        return {
          label: ev?.name ? ev.name.slice(0, 8) : (eid === '_none' ? 'HS' : '—'),
          value: qty,
        }
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 6)

    return { product, stats, bestLines, eventDist }
  }, [sales, saleItems, products, events])

  return (
    <KpiDetailSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Top produit 30j"
      subtitle={calc.product?.name || '—'}
      accentColor={ACCENT}
      icon={Trophy}
    >
      {!calc.product ? (
        <EmptyState message="Aucune vente de produit sur 30 jours." />
      ) : (
        <>
          <Section title="Produit" accent={ACCENT}>
            <div style={{
              padding: SPACE.md,
              background: `${ACCENT}10`,
              borderRadius: RADIUS.lg,
              border: `1px solid ${ACCENT}30`,
            }}>
              <div style={{ ...TYPO.h3, color: BASE.text, marginBottom: 4 }}>
                {calc.product.name}
              </div>
              <div style={{ ...TYPO.micro, color: BASE.textMuted }}>
                SKU {calc.product.sku || '—'} · Prix {fmtEuro(calc.product.sell_price_ttc)}
              </div>
            </div>
          </Section>

          <Section title="Performance" accent={ACCENT}>
            <StatGrid items={[
              { label: 'Qté vendue', value: fmtInt(calc.stats.qty), color: ACCENT },
              { label: 'CA généré', value: fmtEuro(calc.stats.total), color: ACCENT },
              { label: 'Lignes', value: fmtInt(calc.stats.lines.length) },
              { label: 'Prix moyen', value: fmtEuro(calc.stats.total / Math.max(1, calc.stats.qty)) },
            ]} />
          </Section>

          {calc.eventDist.length > 0 && (
            <Section title="Répartition par concert" accent={ACCENT}>
              <div style={{
                padding: SPACE.md,
                background: BASE.bgSurface,
                borderRadius: RADIUS.lg,
                border: `1px solid ${BASE.border}`,
              }}>
                <SvgBarChart data={calc.eventDist} accent={ACCENT} height={130} />
              </div>
            </Section>
          )}

          <Section title="10 meilleures ventes" accent={ACCENT}>
            <div style={{
              background: BASE.bgSurface,
              borderRadius: RADIUS.lg,
              border: `1px solid ${BASE.border}`,
              overflow: 'hidden',
            }}>
              {calc.bestLines.map((r, i) => (
                <div key={i} style={{
                  padding: SPACE.md,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: i < calc.bestLines.length - 1 ? `1px solid ${BASE.border}` : 'none',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ ...TYPO.bodyBold, color: BASE.text }}>
                      {r.event?.name || r.event?.lieu || 'Hors concert'}
                    </div>
                    <div style={{ ...TYPO.micro, color: BASE.textMuted }}>
                      {fmtInt(r.line.quantity)} u · {fmtEuro(r.line.line_total)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </>
      )}
    </KpiDetailSheet>
  )
}
