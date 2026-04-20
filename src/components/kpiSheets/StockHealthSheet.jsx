import React, { useMemo, useState } from 'react'
import { HeartPulse, AlertTriangle, PackageX, PackagePlus } from 'lucide-react'
import KpiDetailSheet from './KpiDetailSheet'
import { fmtInt, Section, EmptyState } from './_shared'
import { BASE, SPACE, RADIUS, TYPO } from '../../lib/theme'

const ACCENT = '#D4648A'
const DAY_MS = 86400000

export default function StockHealthSheet({
  isOpen, onClose,
  products = [], movements = [], stock = [],
}) {
  const [tab, setTab] = useState('dormants')

  const calc = useMemo(() => {
    const now = Date.now()
    const stockByProduct = {}
    for (const s of stock || []) {
      const pid = s.product_id
      stockByProduct[pid] = (stockByProduct[pid] || 0) + Number(s.quantity || 0)
    }
    const lastMoveByProduct = {}
    const lastOutByProduct = {}
    for (const m of movements || []) {
      const pid = m.product_id
      const t = new Date(m.created_at).getTime()
      if (!lastMoveByProduct[pid] || t > lastMoveByProduct[pid]) lastMoveByProduct[pid] = t
      if (m.type === 'out') {
        if (!lastOutByProduct[pid] || t > lastOutByProduct[pid]) lastOutByProduct[pid] = t
      }
    }

    const dormants = []
    const morts = []
    const surstock = []

    for (const p of products || []) {
      const qty = stockByProduct[p.id] || 0
      const lastMove = lastMoveByProduct[p.id]
      const lastOut = lastOutByProduct[p.id]
      const daysNoMove = lastMove ? Math.floor((now - lastMove) / DAY_MS) : Infinity
      const daysNoOut = lastOut ? Math.floor((now - lastOut) / DAY_MS) : Infinity

      if (daysNoMove > 90) dormants.push({ product: p, qty, days: daysNoMove === Infinity ? '∞' : daysNoMove })
      if (qty > 0 && daysNoOut > 180) morts.push({ product: p, qty, days: daysNoOut === Infinity ? '∞' : daysNoOut })
      const min = Number(p.min_stock || 5)
      if (qty > min * 3) surstock.push({ product: p, qty, min, ratio: (qty / min).toFixed(1) })
    }

    dormants.sort((a, b) => b.qty - a.qty)
    morts.sort((a, b) => b.qty - a.qty)
    surstock.sort((a, b) => b.qty - a.qty)

    return { dormants, morts, surstock }
  }, [products, movements, stock])

  const tabs = [
    { id: 'dormants', label: 'Dormants', count: calc.dormants.length, icon: AlertTriangle, color: '#E8935A' },
    { id: 'morts',    label: 'Morts',    count: calc.morts.length,    icon: PackageX, color: '#D4648A' },
    { id: 'surstock', label: 'Surstock', count: calc.surstock.length, icon: PackagePlus, color: '#5B8DB8' },
  ]

  const active = tabs.find(t => t.id === tab)
  const data = calc[tab]

  return (
    <KpiDetailSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Santé du stock"
      subtitle={`${calc.dormants.length} dorm. · ${calc.morts.length} morts · ${calc.surstock.length} sursto.`}
      accentColor={ACCENT}
      icon={HeartPulse}
    >
      <Section accent={ACCENT}>
        <div style={{
          display: 'flex',
          gap: SPACE.xs,
          padding: 4,
          background: BASE.bgHover,
          borderRadius: RADIUS.lg,
        }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex: 1,
              padding: '8px 6px',
              border: 'none',
              borderRadius: RADIUS.md,
              background: tab === t.id ? BASE.bg : 'transparent',
              color: tab === t.id ? t.color : BASE.textSoft,
              ...TYPO.caption,
              fontWeight: tab === t.id ? 700 : 600,
              cursor: 'pointer',
              boxShadow: tab === t.id ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
            }}>
              {t.label}
              <span style={{
                marginLeft: 4,
                opacity: 0.8,
              }}>
                ({t.count})
              </span>
            </button>
          ))}
        </div>
      </Section>

      <Section title={tabDescription(tab)} accent={active?.color}>
        {data.length === 0 ? (
          <EmptyState message="Rien à signaler dans cette catégorie." />
        ) : (
          <div style={{
            background: BASE.bgSurface,
            borderRadius: RADIUS.lg,
            border: `1px solid ${BASE.border}`,
            overflow: 'hidden',
          }}>
            {data.map((r, i) => (
              <div key={r.product.id || i} style={{
                padding: SPACE.md,
                borderBottom: i < data.length - 1 ? `1px solid ${BASE.border}` : 'none',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                  <div style={{ ...TYPO.bodyBold, color: BASE.text, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.product.name}
                  </div>
                  <div style={{ ...TYPO.bodyBold, color: active?.color, marginLeft: SPACE.sm }}>
                    {fmtInt(r.qty)} u
                  </div>
                </div>
                <div style={{ ...TYPO.micro, color: BASE.textMuted }}>
                  {tab === 'dormants' && `Aucun mouvement depuis ${r.days} jours`}
                  {tab === 'morts' && `Stocké mais aucune sortie depuis ${r.days} jours`}
                  {tab === 'surstock' && `${r.ratio}× le stock min (${r.min})`}
                </div>
              </div>
            ))}
          </div>
        )}
        <div style={{
          marginTop: SPACE.md,
          ...TYPO.micro,
          color: BASE.textMuted,
          fontStyle: 'italic',
        }}>
          Actions rapides (solder, transférer, archiver) : à brancher depuis Board.jsx.
        </div>
      </Section>
    </KpiDetailSheet>
  )
}

function tabDescription(tab) {
  if (tab === 'dormants') return 'Produits sans mouvement depuis plus de 90 jours'
  if (tab === 'morts') return 'Produits en stock sans vente depuis 180+ jours'
  return 'Produits en surstock (> 3× le min)'
}
