import React, { useMemo } from 'react'
import { Euro, Download } from 'lucide-react'
import KpiDetailSheet from './KpiDetailSheet'
import {
  fmtEuro, fmtDate, Section, StatGrid, EmptyState, ActionButton, SvgLineChart,
} from './_shared'
import { exportCSV, todayISO } from '../../lib/csvExport'
import { caLastDays, caTrendPct } from '../../lib/salesKpis'
import { BASE, SPACE, RADIUS, TYPO } from '../../lib/theme'

const ACCENT = '#5DAB8B'
const DAY_MS = 86400000

export default function CaThirtyDaysSheet({ isOpen, onClose, sales = [], events = [] }) {
  const calc = useMemo(() => {
    const now = Date.now()
    const from = now - 30 * DAY_MS
    const within = (sales || []).filter(s => {
      if (!s?.created_at) return false
      const t = new Date(s.created_at).getTime()
      return t >= from && t <= now
    })
    // Série par jour (30 points)
    const byDay = new Array(30).fill(0)
    for (const s of within) {
      const t = new Date(s.created_at).getTime()
      const idx = 29 - Math.floor((now - t) / DAY_MS)
      if (idx >= 0 && idx < 30) byDay[idx] += Number(s.total_amount || 0)
    }
    const serie = byDay.map((v, i) => {
      const d = new Date(now - (29 - i) * DAY_MS)
      return { x: d.toISOString().slice(0, 10), y: Math.round(v * 100) / 100 }
    })
    // Ventilation par event
    const byEvent = {}
    for (const s of within) {
      const eid = s.event_id || '_none'
      byEvent[eid] = (byEvent[eid] || 0) + Number(s.total_amount || 0)
    }
    const eventBreakdown = Object.entries(byEvent)
      .map(([eid, total]) => {
        const ev = (events || []).find(e => e.id === eid)
        return {
          id: eid,
          name: ev?.name || ev?.lieu || (eid === '_none' ? 'Sans concert' : 'Concert inconnu'),
          date: ev?.date || null,
          total,
        }
      })
      .sort((a, b) => b.total - a.total)

    return {
      within,
      serie,
      eventBreakdown,
      total: caLastDays(sales, 30),
      trend: caTrendPct(sales, 30),
    }
  }, [sales, events])

  const handleExport = () => {
    exportCSV(
      calc.serie,
      `ca-30j-${todayISO()}.csv`,
      [
        { key: 'x', label: 'Date' },
        { key: 'y', label: 'CA (€)' },
      ]
    )
  }

  const subtitle = calc.trend !== null
    ? `${fmtEuro(calc.total)} · ${calc.trend >= 0 ? '↑' : '↓'} ${Math.abs(calc.trend)}% vs 30j préc.`
    : fmtEuro(calc.total)

  return (
    <KpiDetailSheet
      isOpen={isOpen}
      onClose={onClose}
      title="CA 30 jours"
      subtitle={subtitle}
      accentColor={ACCENT}
      icon={Euro}
      footer={
        <ActionButton onClick={handleExport} accent={ACCENT}
                      style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Download size={16} /> Exporter CSV
        </ActionButton>
      }
    >
      {calc.within.length === 0 ? (
        <EmptyState message="Aucune vente sur les 30 derniers jours." />
      ) : (
        <>
          <Section title="Courbe du CA (30 jours)" accent={ACCENT}>
            <div style={{
              padding: SPACE.md,
              background: BASE.bgSurface,
              borderRadius: RADIUS.lg,
              border: `1px solid ${BASE.border}`,
            }}>
              <SvgLineChart data={calc.serie} accent={ACCENT} height={140} />
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: SPACE.xs,
                ...TYPO.micro,
                color: BASE.textMuted,
              }}>
                <span>{fmtDate(calc.serie[0].x)}</span>
                <span>Auj.</span>
              </div>
            </div>
          </Section>

          <Section title="Synthèse" accent={ACCENT}>
            <StatGrid items={[
              { label: 'CA total', value: fmtEuro(calc.total), color: ACCENT },
              { label: 'Nb tickets', value: calc.within.length },
              { label: 'Ticket moyen', value: fmtEuro(calc.total / (calc.within.length || 1)) },
              { label: 'Évolution', value: calc.trend !== null ? `${calc.trend >= 0 ? '+' : ''}${calc.trend}%` : '—',
                color: (calc.trend ?? 0) >= 0 ? ACCENT : '#D4648A' },
            ]} />
          </Section>

          <Section title="Ventilation par concert" accent={ACCENT}>
            <div style={{
              background: BASE.bgSurface,
              borderRadius: RADIUS.lg,
              border: `1px solid ${BASE.border}`,
              overflow: 'hidden',
            }}>
              {calc.eventBreakdown.slice(0, 10).map((ev, i) => {
                const pct = Math.round((ev.total / calc.total) * 100)
                return (
                  <div key={i} style={{
                    padding: SPACE.md,
                    borderBottom: i < calc.eventBreakdown.length - 1 ? `1px solid ${BASE.border}` : 'none',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <div style={{ ...TYPO.bodyBold, color: BASE.text, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ev.name}
                      </div>
                      <div style={{ ...TYPO.bodyBold, color: ACCENT, marginLeft: SPACE.sm }}>
                        {fmtEuro(ev.total)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', ...TYPO.micro, color: BASE.textMuted }}>
                      <span>{ev.date ? fmtDate(ev.date) : '—'}</span>
                      <span>{pct}%</span>
                    </div>
                    <div style={{ marginTop: 6, height: 4, background: BASE.bgHover, borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: ACCENT }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </Section>
        </>
      )}
    </KpiDetailSheet>
  )
}
