import React, { useMemo } from 'react'
import { Receipt, CreditCard, Banknote } from 'lucide-react'
import KpiDetailSheet from './KpiDetailSheet'
import { fmtEuro, fmtDateTime, Section, StatGrid, EmptyState } from './_shared'
import { BASE, SPACE, RADIUS, TYPO } from '../../lib/theme'

const ACCENT = '#5DAB8B'
const DAY_MS = 86400000

export default function SalesTodaySheet({ isOpen, onClose, sales = [], events = [] }) {
  const calc = useMemo(() => {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const end = start + DAY_MS
    const list = (sales || [])
      .filter(s => {
        if (!s?.created_at) return false
        const t = new Date(s.created_at).getTime()
        return t >= start && t < end
      })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

    const cb = list.filter(s => (s.payment_method || '').toLowerCase().includes('cb') || (s.payment_method || '').toLowerCase().includes('card'))
      .reduce((a, s) => a + Number(s.total_amount || 0), 0)
    const esp = list.filter(s => {
      const m = (s.payment_method || '').toLowerCase()
      return m.includes('esp') || m.includes('cash')
    }).reduce((a, s) => a + Number(s.total_amount || 0), 0)
    const total = list.reduce((a, s) => a + Number(s.total_amount || 0), 0)

    return { list, cb, esp, total }
  }, [sales])

  return (
    <KpiDetailSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Ventes aujourd'hui"
      subtitle={`${calc.list.length} ticket${calc.list.length > 1 ? 's' : ''} · ${fmtEuro(calc.total)}`}
      accentColor={ACCENT}
      icon={Receipt}
    >
      {calc.list.length === 0 ? (
        <EmptyState message="Aucune vente aujourd'hui pour le moment." />
      ) : (
        <>
          <Section title="Paiements" accent={ACCENT}>
            <StatGrid items={[
              { label: 'CB / Carte', value: fmtEuro(calc.cb), color: '#5B8DB8' },
              { label: 'Espèces', value: fmtEuro(calc.esp), color: '#E8935A' },
            ]} />
          </Section>

          <Section title="Tickets du jour" accent={ACCENT}>
            <div style={{
              background: BASE.bgSurface,
              borderRadius: RADIUS.lg,
              border: `1px solid ${BASE.border}`,
              overflow: 'hidden',
            }}>
              {calc.list.map((s, i) => {
                const ev = (events || []).find(e => e.id === s.event_id)
                const m = (s.payment_method || '').toLowerCase()
                const PayIcon = m.includes('cb') || m.includes('card') ? CreditCard : Banknote
                return (
                  <div key={s.id || i} style={{
                    padding: SPACE.md,
                    display: 'flex',
                    alignItems: 'center',
                    gap: SPACE.md,
                    borderBottom: i < calc.list.length - 1 ? `1px solid ${BASE.border}` : 'none',
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: RADIUS.md,
                      background: `${ACCENT}15`, display: 'flex',
                      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <PayIcon size={16} color={ACCENT} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ ...TYPO.bodyBold, color: BASE.text }}>
                        {s.sale_number || `Ticket #${(s.id || '').slice(0, 6)}`}
                      </div>
                      <div style={{ ...TYPO.micro, color: BASE.textMuted }}>
                        {fmtDateTime(s.created_at)}
                        {ev && ` · ${ev.name || ev.lieu}`}
                        {s.is_aggregate && ' · bilan'}
                      </div>
                    </div>
                    <div style={{ ...TYPO.bodyBold, color: ACCENT, flexShrink: 0 }}>
                      {fmtEuro(s.total_amount)}
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
