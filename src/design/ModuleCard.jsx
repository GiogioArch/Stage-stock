import React from 'react'
import { BASE, SPACE, RADIUS, SHADOW } from '../lib/theme'

/**
 * Carte de contenu avec ombre et bordure gauche optionnelle.
 *
 * @param {React.ReactNode} children
 * @param {string}  [borderLeft] - Couleur de la bordure gauche accent
 * @param {number}  [padding]    - Padding interne (défaut: 16)
 * @param {Function} [onClick]   - Rend la carte cliquable
 */
export function ModuleCard({ children, borderLeft, padding = 16, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: BASE.bg,
        borderRadius: RADIUS.lg,
        boxShadow: SHADOW.card,
        border: `1px solid ${BASE.border}`,
        borderLeft: borderLeft ? `4px solid ${borderLeft}` : `1px solid ${BASE.border}`,
        padding,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'box-shadow 0.2s, transform 0.2s',
      }}
    >
      {children}
    </div>
  )
}
