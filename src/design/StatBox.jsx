import React from 'react'
import { BASE, TYPO, SPACE, RADIUS, SHADOW } from '../lib/theme'

/**
 * Boîte de statistique réutilisable.
 *
 * @param {string|number} value - Valeur à afficher
 * @param {string}        label - Libellé sous la valeur
 * @param {string}        [color] - Couleur de la valeur (défaut: BASE.text)
 * @param {'sm'|'md'|'lg'} [size] - Taille de la valeur
 */
export function StatBox({ value, label, color, size = 'md' }) {
  const valueFontSize = size === 'lg' ? 24 : size === 'sm' ? 16 : 20

  return (
    <div style={{
      flex: 1,
      textAlign: 'center',
      padding: `${SPACE.md}px ${SPACE.sm}px`,
      background: BASE.bg,
      borderRadius: RADIUS.md,
      boxShadow: SHADOW.sm,
      border: `1px solid ${BASE.border}`,
    }}>
      <div style={{
        fontSize: valueFontSize,
        fontWeight: 800,
        color: color || BASE.text,
        lineHeight: 1.2,
      }}>
        {value}
      </div>
      <div style={{ ...TYPO.micro, color: BASE.textSoft, marginTop: 2 }}>
        {label}
      </div>
    </div>
  )
}
