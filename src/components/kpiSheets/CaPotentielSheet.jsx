import React, { useMemo } from 'react'
import { TrendingUp } from 'lucide-react'
import KpiDetailSheet from './KpiDetailSheet'
import { fmtEuro, fmtInt, Section, StatGrid, EmptyState } from './_shared'
import { BASE, SPACE, RADIUS, TYPO } from '../../lib/theme'

const ACCENT = '#E8935A'

export default function CaPotentielSheet({ isOpen, onClose, stock = [], products = [] }) {
  const calc = useMemo(() => {
    const pMap = Object.fromEntries((products || []).map(p => [p.id, p]))
    let potentiel = 0
    let valeur = 0
    let units = 0
    const byProduct = {}

    for (const s of stock || []) {
      const p = pMap[s.product_id]
      if (!p) continue
      const qty = Number(s.quantity || 0)
      const ttc = Number(p.sell_price_ttc || 0)
      const ht = Number(p.cost_ht || 0)
      const pot = qty * ttc
      const val = qty * ht
      potentiel += pot
      valeur += val
      units += qty
      if (qty > 0 && ttc > 0) {
        if (!byProduct[p.id]) byProduct[p.id] = { name: p.name, qty: 0, potentiel: 0, valeur: 0 }
        byProduct[p.id].qty += qty
        byProduct[p.id].potentiel += pot
        byProduct[p.id].valeur += val
      }
    }

    const marge = potentiel - valeur
    const margePct = potentiel > 0 ? Math.round((marge / potentiel) * 100) : 0
    const topContrib = Object.values(byProduct)
      .sort((a, b) => b.potentiel - a.potentiel)
      .slice(0, 10)

    return { potentiel, valeur, marge, margePct, units, topContrib }
  }, [stock, products])

  return (
    <KpiDetailSheet
      isOpen={isOpen}
      onClose={onClose}
      title="CA potentiel"
      subtitle={`Si tout le stock est vendu · ${fmtEuro(calc.potentiel)}`}
      accentColor={ACCENT}
      icon={TrendingUp}
    >
      {calc.potentiel === 0 ? (
        <EmptyState message="Aucun prix de vente TTC renseigné sur les produits." />
      ) : (
        <>
          <Section title="Simulation" accent={ACCENT}>
            <div style={{
              padding: SPACE.lg,
              background: `${ACCENT}10`,
              borderRadius: RADIUS.lg,
              border: `1px solid ${ACCENT}30`,
              textAlign: 'center',
            }}>
              <div style={{ ...TYPO.caption, color: BASE.textSoft, marginBottom: 4 }}>
                Si 100% du stock est vendu au prix catalogue :
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: ACCENT }}>
                {fmtEuro(calc.potentiel)}
              </div>
              <div style={{ ...TYPO.micro, color: BASE.textMuted, marginTop: 4 }}>
                {fmtInt(calc.units)} unités au total
              </div>
            </div>
          </Section>

          <Section title="Décomposition" accent={ACCENT}>
            <StatGrid items={[
              { label: 'CA potentiel (TTC)', value: fmtEuro(calc.potentiel), color: ACCENT },
              { label: 'Valeur stock (HT)', value: fmtEuro(calc.valeur) },
              { label: 'Marge attendue', value: fmtEuro(calc.marge), color: '#5DAB8B' },
              { label: 'Taux de marge', value: `${calc.margePct}%`, color: '#5DAB8B' },
            ]} />
            <div style={{
              ...TYPO.micro,
              color: BASE.textMuted,
              marginTop: SPACE.sm,
              padding: SPACE.sm,
              background: BASE.bgHover,
              borderRadius: RADIUS.sm,
              fontStyle: 'italic',
            }}>
              Formule : CA potentiel = Σ (stock × prix de vente TTC). Marge = potentiel − coût HT du stock.
            </div>
          </Section>

          <Section title="Top 10 contributeurs" accent={ACCENT}>
            <div style={{
              background: BASE.bgSurface,
              borderRadius: RADIUS.lg,
              border: `1px solid ${BASE.border}`,
              overflow: 'hidden',
            }}>
              {calc.topContrib.map((p, i) => {
                const pct = Math.round((p.potentiel / calc.potentiel) * 100)
                return (
                  <div key={i} style={{
                    padding: SPACE.md,
                    borderBottom: i < calc.topContrib.length - 1 ? `1px solid ${BASE.border}` : 'none',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <div style={{ ...TYPO.bodyBold, color: BASE.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.name}
                      </div>
                      <div style={{ ...TYPO.bodyBold, color: ACCENT, marginLeft: SPACE.sm }}>
                        {fmtEuro(p.potentiel)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', ...TYPO.micro, color: BASE.textMuted }}>
                      <span>{fmtInt(p.qty)} u</span>
                      <span>{pct}%</span>
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
