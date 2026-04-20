import React, { useMemo } from 'react'
import { RefreshCw } from 'lucide-react'
import KpiDetailSheet from './KpiDetailSheet'
import { Section, StatGrid, EmptyState, fmtInt } from './_shared'
import { BASE, SPACE, RADIUS, TYPO } from '../../lib/theme'

const ACCENT = '#5B8DB8'
const DAY_MS = 86400000

export default function RotationSheet({ isOpen, onClose, movements = [], stock = [] }) {
  const calc = useMemo(() => {
    const now = Date.now()
    const curFrom = now - 30 * DAY_MS
    const prevFrom = now - 60 * DAY_MS

    const out = (movements || []).filter(m => m.type === 'out')
    const curOut = out
      .filter(m => new Date(m.created_at).getTime() >= curFrom)
      .reduce((s, m) => s + Number(m.quantity || 0), 0)
    const prevOut = out
      .filter(m => {
        const t = new Date(m.created_at).getTime()
        return t >= prevFrom && t < curFrom
      })
      .reduce((s, m) => s + Number(m.quantity || 0), 0)

    const totalStock = (stock || []).reduce((s, r) => s + Number(r.quantity || 0), 0)
    const stockMoyen = Math.max(1, totalStock / 2)
    const curRate = curOut / stockMoyen
    const prevRate = prevOut / stockMoyen
    const delta = prevRate > 0 ? Math.round(((curRate - prevRate) / prevRate) * 100) : null

    return {
      curOut, prevOut, totalStock, stockMoyen,
      curRate, prevRate, delta,
    }
  }, [movements, stock])

  return (
    <KpiDetailSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Rotation 30j"
      subtitle={`${calc.curRate.toFixed(2)} × · ${fmtInt(calc.curOut)} sorties`}
      accentColor={ACCENT}
      icon={RefreshCw}
    >
      {calc.totalStock === 0 ? (
        <EmptyState message="Aucun stock à rotater." />
      ) : (
        <>
          <Section title="Formule" accent={ACCENT}>
            <div style={{
              padding: SPACE.lg,
              background: `${ACCENT}10`,
              borderRadius: RADIUS.lg,
              border: `1px solid ${ACCENT}30`,
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 14, color: BASE.textSoft, marginBottom: 6, fontFamily: 'monospace' }}>
                rotation = sorties 30j / stock moyen
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: ACCENT }}>
                {calc.curRate.toFixed(2)} ×
              </div>
            </div>
          </Section>

          <Section title="Comparaison période précédente" accent={ACCENT}>
            <StatGrid items={[
              { label: 'Période actuelle', value: `${calc.curRate.toFixed(2)} ×`, color: ACCENT },
              { label: '30j précédents', value: `${calc.prevRate.toFixed(2)} ×` },
              { label: 'Sorties actuelles', value: fmtInt(calc.curOut), color: ACCENT },
              {
                label: 'Évolution',
                value: calc.delta === null ? '—' : `${calc.delta >= 0 ? '+' : ''}${calc.delta}%`,
                color: (calc.delta ?? 0) >= 0 ? '#5DAB8B' : '#D4648A',
              },
            ]} />
          </Section>

          <Section title="Ce que ça veut dire" accent={ACCENT}>
            <div style={{
              padding: SPACE.md,
              background: BASE.bgSurface,
              borderRadius: RADIUS.lg,
              border: `1px solid ${BASE.border}`,
              ...TYPO.body,
              color: BASE.textSoft,
              lineHeight: 1.6,
            }}>
              <p style={{ margin: 0, marginBottom: SPACE.sm }}>
                La rotation mesure combien de fois ton stock <strong>tourne</strong> sur une période. Plus c'est élevé, plus ton stock est actif.
              </p>
              <p style={{ margin: 0, marginBottom: SPACE.sm }}>
                <strong>&lt; 0,5</strong> : stock qui dort, beaucoup d'articles non vendus.
              </p>
              <p style={{ margin: 0, marginBottom: SPACE.sm }}>
                <strong>0,5 - 1,5</strong> : rotation normale pour du merch de tournée.
              </p>
              <p style={{ margin: 0 }}>
                <strong>&gt; 2</strong> : très actif, attention aux ruptures.
              </p>
            </div>
          </Section>
        </>
      )}
    </KpiDetailSheet>
  )
}
