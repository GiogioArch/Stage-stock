import React, { createElement } from 'react'
import { BASE, SPACE, TYPO, RADIUS } from '../lib/theme'

/**
 * Onglets de section (ex: Résumé | Équipe | Check | Pack).
 *
 * @param {Array}    tabs     - [{id, label, icon?}]
 * @param {string}   active   - id de l'onglet actif
 * @param {Function} onChange - callback(id)
 */
export function SubTabs({ tabs, active, onChange, color, badge }) {
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
                ? { background: color || BASE.text, color: BASE.white, ...TYPO.caption, boxShadow: color ? `0 2px 8px ${color}40` : 'none' }
                : { background: BASE.bgHover, color: BASE.textMuted, ...TYPO.caption }
              ),
            }}
          >
            {tab.icon && createElement(tab.icon, { size: 14 })}
            {tab.label}
            {badge && badge[tab.id] != null && (
              <span style={{
                marginLeft: 4, padding: '1px 6px', borderRadius: 10,
                background: isActive ? 'rgba(255,255,255,0.3)' : '#D4648A',
                color: '#fff', fontSize: 10, fontWeight: 700,
              }}>{badge[tab.id]}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
