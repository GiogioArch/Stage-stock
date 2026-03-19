import React, { createElement } from 'react'
import { BASE, SPACE, TYPO, RADIUS } from '../lib/theme'

/**
 * Pilules de filtre (ex: Tous | Merchandising | Matériel | Consommables).
 *
 * @param {Array}    options  - [{id, label, icon?, color?}]
 * @param {string}   active   - id du filtre actif
 * @param {Function} onChange - callback(id)
 * @param {boolean}  [small]  - Variante compacte
 */
export function FilterPills({ options, active, onChange, small }) {
  return (
    <div style={{
      display: 'flex',
      gap: SPACE.sm,
      overflowX: 'auto',
      WebkitOverflowScrolling: 'touch',
      padding: small ? `${SPACE.xs}px 0` : `${SPACE.sm}px 0`,
    }}>
      {options.map(opt => {
        const isActive = opt.id === active
        return (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: SPACE.xs,
              padding: small
                ? `${SPACE.xs}px ${SPACE.md}px`
                : `${SPACE.sm}px ${SPACE.lg}px`,
              borderRadius: RADIUS.pill,
              border: 'none',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s',
              ...(isActive
                ? {
                    background: BASE.text,
                    color: BASE.white,
                    ...(small ? TYPO.micro : TYPO.caption),
                  }
                : {
                    background: BASE.bgHover,
                    color: BASE.textMuted,
                    ...(small ? TYPO.micro : TYPO.caption),
                  }
              ),
            }}
          >
            {opt.icon && createElement(opt.icon, { size: small ? 12 : 14 })}
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
