import React, { createElement } from 'react'
import { BASE, SPACE, TYPO, RADIUS } from '../lib/theme'

/**
 * Onglets de section (ex: Résumé | Équipe | Check | Pack).
 *
 * @param {Array}    tabs     - [{id, label, icon?}]
 * @param {string}   active   - id de l'onglet actif
 * @param {Function} onChange - callback(id)
 */
export function SubTabs({ tabs, active, onChange }) {
  return (
    <div style={{
      display: 'flex',
      gap: SPACE.xs + 2,
      padding: `${SPACE.sm}px ${SPACE.lg}px`,
      overflowX: 'auto',
      WebkitOverflowScrolling: 'touch',
    }}>
      {tabs.map(tab => {
        const isActive = tab.id === active
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: SPACE.xs,
              padding: `${SPACE.sm}px ${SPACE.md}px`,
              borderRadius: RADIUS.md,
              border: 'none',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s',
              ...(isActive
                ? { background: BASE.text, color: BASE.white, ...TYPO.caption }
                : { background: BASE.bgHover, color: BASE.textMuted, ...TYPO.caption }
              ),
            }}
          >
            {tab.icon && createElement(tab.icon, { size: 14 })}
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
