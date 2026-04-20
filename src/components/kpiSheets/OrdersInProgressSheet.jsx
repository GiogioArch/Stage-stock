import React, { useMemo } from 'react'
import { ShoppingCart } from 'lucide-react'
import KpiDetailSheet from './KpiDetailSheet'
import { fmtEuro, fmtDate, Section, EmptyState, StatGrid } from './_shared'
import { BASE, SPACE, RADIUS, TYPO } from '../../lib/theme'

const ACCENT = '#D4648A'

const STATUS_CONF = {
  draft:     { label: 'Brouillon', color: '#94A3B8' },
  sent:      { label: 'Envoyée',   color: '#5B8DB8' },
  confirmed: { label: 'Confirmée', color: '#5DAB8B' },
  shipped:   { label: 'Expédiée',  color: '#E8935A' },
  received:  { label: 'Reçue',     color: '#5DAB8B' },
  cancelled: { label: 'Annulée',   color: '#D4648A' },
}

export default function OrdersInProgressSheet({
  isOpen, onClose,
  purchaseOrders = [], suppliers = [],
}) {
  const calc = useMemo(() => {
    const active = (purchaseOrders || []).filter(po => !['received', 'cancelled'].includes(po.status))
    const totalHT = active.reduce((s, po) => s + Number(po.total_ht || 0), 0)
    const totalTTC = active.reduce((s, po) => s + Number(po.total_ttc || 0), 0)
    const byStatus = {}
    for (const po of active) {
      byStatus[po.status] = (byStatus[po.status] || 0) + 1
    }
    const list = [...active].sort((a, b) => {
      // Tri : brouillon > envoyée > confirmée > expédiée, puis date
      const order = { draft: 0, sent: 1, confirmed: 2, shipped: 3 }
      const oa = order[a.status] ?? 9
      const ob = order[b.status] ?? 9
      if (oa !== ob) return oa - ob
      return (a.expected_date || '').localeCompare(b.expected_date || '')
    })
    return { active, list, totalHT, totalTTC, byStatus }
  }, [purchaseOrders])

  return (
    <KpiDetailSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Commandes en cours"
      subtitle={`${calc.active.length} commande${calc.active.length > 1 ? 's' : ''} · ${fmtEuro(calc.totalHT)} HT`}
      accentColor={ACCENT}
      icon={ShoppingCart}
    >
      {calc.active.length === 0 ? (
        <EmptyState message="Aucune commande en cours." />
      ) : (
        <>
          <Section title="Synthèse" accent={ACCENT}>
            <StatGrid items={[
              { label: 'Total HT', value: fmtEuro(calc.totalHT), color: ACCENT },
              { label: 'Total TTC', value: fmtEuro(calc.totalTTC) },
              { label: 'Brouillons', value: calc.byStatus.draft || 0 },
              { label: 'En transit', value: (calc.byStatus.sent || 0) + (calc.byStatus.confirmed || 0) + (calc.byStatus.shipped || 0) },
            ]} />
          </Section>

          <Section title="Liste" accent={ACCENT}>
            <div style={{
              background: BASE.bgSurface,
              borderRadius: RADIUS.lg,
              border: `1px solid ${BASE.border}`,
              overflow: 'hidden',
            }}>
              {calc.list.map((po, i) => {
                const st = STATUS_CONF[po.status] || { label: po.status, color: BASE.textSoft }
                const sup = (suppliers || []).find(s => s.id === po.supplier_id)
                return (
                  <div key={po.id || i} style={{
                    padding: SPACE.md,
                    borderBottom: i < calc.list.length - 1 ? `1px solid ${BASE.border}` : 'none',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                      <div style={{ ...TYPO.bodyBold, color: BASE.text, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {sup?.name || po.supplier_name || 'Fournisseur inconnu'}
                      </div>
                      <div style={{ ...TYPO.bodyBold, color: ACCENT, marginLeft: SPACE.sm }}>
                        {fmtEuro(po.total_ht)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                      <span style={{
                        ...TYPO.micro,
                        padding: '2px 8px',
                        borderRadius: 999,
                        background: `${st.color}15`,
                        color: st.color,
                        fontWeight: 700,
                      }}>
                        {st.label}
                      </span>
                      <span style={{ ...TYPO.micro, color: BASE.textMuted }}>
                        {po.expected_date ? `Livraison ${fmtDate(po.expected_date)}` : 'Date à définir'}
                      </span>
                    </div>
                    {po.order_number && (
                      <div style={{ ...TYPO.micro, color: BASE.textMuted, marginTop: 4 }}>
                        N° {po.order_number}
                      </div>
                    )}
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
