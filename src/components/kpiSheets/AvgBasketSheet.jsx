import React, { useMemo } from 'react'
import { ShoppingBasket } from 'lucide-react'
import KpiDetailSheet from './KpiDetailSheet'
import { fmtEuro, fmtDateTime, Section, StatGrid, EmptyState, SvgBarChart } from './_shared'
import { BASE, SPACE, RADIUS, TYPO } from '../../lib/theme'

const ACCENT = '#5DAB8B'
const DAY_MS = 86400000

const BUCKETS = [
  { label: '0-10', min: 0, max: 10 },
  { label: '10-20', min: 10, max: 20 },
  { label: '20-30', min: 20, max: 30 },
  { label: '30-50', min: 30, max: 50 },
  { label: '50+', min: 50, max: Infinity },
]

export default function AvgBasketSheet({ isOpen, onClose, sales = [] }) {
  const calc = useMemo(() => {
    const now = Date.now()
    const from = now - 30 * DAY_MS
    const win = (sales || [])
      .filter(s => s?.created_at && !s.is_aggregate)
      .filter(s => {
        const t = new Date(s.created_at).getTime()
        return t >= from && t <= now
      })
    if (win.length === 0) {
      return { win, count: 0, avg: 0, median: 0, min: 0, max: 0, buckets: [], top: [], bottom: [] }
    }
    const amounts = win.map(s => Number(s.total_amount || 0)).sort((a, b) => a - b)
    const sum = amounts.reduce((a, b) => a + b, 0)
    const avg = sum / amounts.length
    const mid = Math.floor(amounts.length / 2)
    const median = amounts.length % 2 === 0
      ? (amounts[mid - 1] + amounts[mid]) / 2
      : amounts[mid]
    const buckets = BUCKETS.map(b => ({
      label: b.label,
      value: amounts.filter(a => a >= b.min && a < b.max).length,
    }))
    const sorted = [...win].sort((a, b) => Number(b.total_amount || 0) - Number(a.total_amount || 0))
    return {
      win,
      count: amounts.length,
      avg,
      median,
      min: amounts[0],
      max: amounts[amounts.length - 1],
      buckets,
      top: sorted.slice(0, 5),
      bottom: sorted.slice(-5).reverse(),
    }
  }, [sales])

  return (
    <KpiDetailSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Panier moyen"
      subtitle={`${fmtEuro(calc.avg)} · ${calc.count} ticket${calc.count > 1 ? 's' : ''}`}
      accentColor={ACCENT}
      icon={ShoppingBasket}
    >
      {calc.count === 0 ? (
        <EmptyState message="Aucune transaction individuelle sur 30 jours." />
      ) : calc.count < 5 ? (
        <EmptyState message={`Données insuffisantes — ${calc.count} transaction${calc.count > 1 ? 's' : ''} seulement.`} />
      ) : (
        <>
          <Section title="Distribution des paniers" accent={ACCENT}>
            <div style={{
              padding: SPACE.md,
              background: BASE.bgSurface,
              borderRadius: RADIUS.lg,
              border: `1px solid ${BASE.border}`,
            }}>
              <SvgBarChart data={calc.buckets} accent={ACCENT} height={140} />
            </div>
          </Section>

          <Section title="Statistiques" accent={ACCENT}>
            <StatGrid items={[
              { label: 'Moyen', value: fmtEuro(calc.avg), color: ACCENT },
              { label: 'Médian', value: fmtEuro(calc.median) },
              { label: 'Min', value: fmtEuro(calc.min) },
              { label: 'Max', value: fmtEuro(calc.max), color: ACCENT },
            ]} />
          </Section>

          <Section title="Top 5 paniers" accent={ACCENT}>
            <SaleList list={calc.top} accent={ACCENT} />
          </Section>

          <Section title="Bas 5 paniers" accent={ACCENT}>
            <SaleList list={calc.bottom} accent="#E8935A" />
          </Section>
        </>
      )}
    </KpiDetailSheet>
  )
}

function SaleList({ list, accent }) {
  return (
    <div style={{
      background: BASE.bgSurface,
      borderRadius: RADIUS.lg,
      border: `1px solid ${BASE.border}`,
      overflow: 'hidden',
    }}>
      {list.map((s, i) => (
        <div key={s.id || i} style={{
          padding: SPACE.md,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: i < list.length - 1 ? `1px solid ${BASE.border}` : 'none',
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ ...TYPO.bodyBold, color: BASE.text }}>
              {s.sale_number || `#${(s.id || '').slice(0, 6)}`}
            </div>
            <div style={{ ...TYPO.micro, color: BASE.textMuted }}>
              {fmtDateTime(s.created_at)}
            </div>
          </div>
          <div style={{ ...TYPO.bodyBold, color: accent }}>
            {fmtEuro(s.total_amount)}
          </div>
        </div>
      ))}
    </div>
  )
}
