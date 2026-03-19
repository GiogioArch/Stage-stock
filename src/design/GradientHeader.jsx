import React from 'react'
import { getModuleTheme, TYPO, SPACE } from '../lib/theme'

/**
 * Header gradient plein, edge-to-edge.
 *
 * @param {string}  module   - Clé du module (ex: 'tournee', 'finance')
 * @param {string}  title    - Titre principal (blanc, bold)
 * @param {string}  [subtitle] - Sous-titre (blanc 80%)
 * @param {Array}   [stats]  - [{value, label}] max 4 stats affichées
 * @param {React.ReactNode} [children] - Contenu additionnel sous les stats
 */
export function GradientHeader({ module, title, subtitle, stats, children }) {
  const t = getModuleTheme(module)

  return (
    <div style={{
      background: t.gradientCSS,
      padding: `${SPACE.xl}px ${SPACE.lg}px ${SPACE.lg}px`,
      color: '#FFFFFF',
    }}>
      {/* Overline */}
      <div style={{ ...TYPO.overline, opacity: 0.85, marginBottom: SPACE.xs }}>
        {t.label}
      </div>

      {/* Titre */}
      <div style={{ ...TYPO.h1, color: '#FFFFFF', marginBottom: subtitle ? 2 : SPACE.sm }}>
        {title}
      </div>

      {/* Sous-titre */}
      {subtitle && (
        <div style={{ ...TYPO.caption, color: 'rgba(255,255,255,0.8)', marginBottom: SPACE.sm }}>
          {subtitle}
        </div>
      )}

      {/* Stats */}
      {stats && stats.length > 0 && (
        <div style={{
          display: 'flex',
          gap: SPACE.sm,
          marginTop: SPACE.sm,
          overflowX: 'auto',
        }}>
          {stats.map((s, i) => (
            <div key={i} style={{
              ...t.statBox,
              flex: 1,
              textAlign: 'center',
              minWidth: 0,
            }}>
              <div style={{ ...TYPO.h2, color: '#FFFFFF' }}>{s.value}</div>
              <div style={{ ...TYPO.micro, color: 'rgba(255,255,255,0.8)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Slot enfant */}
      {children}
    </div>
  )
}
