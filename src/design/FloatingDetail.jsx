import React from 'react'
import { X } from 'lucide-react'
import { RADIUS, SHADOW, SPACE, BASE } from '../lib/theme'

/**
 * Overlay flottant pour les fiches détail (bottom sheet style).
 *
 * @param {boolean}         open     - Afficher ou non
 * @param {Function}        onClose  - Callback fermeture
 * @param {React.ReactNode} children - Contenu de la fiche
 */
export function FloatingDetail({ open, onClose, children }) {
  if (!open) return null

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: 'rgba(0,0,0,0.3)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-end',
        padding: `${SPACE.lg}px`,
        animation: 'fadeIn 0.2s',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: BASE.bg,
          borderRadius: RADIUS.modal,
          boxShadow: SHADOW.modal,
          width: '100%',
          maxWidth: 560,
          maxHeight: '85vh',
          overflow: 'auto',
          animation: 'scaleIn 0.25s',
          position: 'relative',
        }}
      >
        {/* Bouton fermer */}
        <button
          onClick={onClose}
          style={{
            position: 'sticky',
            top: SPACE.sm,
            float: 'right',
            margin: `${SPACE.sm}px ${SPACE.sm}px 0 0`,
            background: BASE.bgHover,
            border: 'none',
            borderRadius: RADIUS.round,
            width: 32,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 10,
          }}
        >
          <X size={16} color={BASE.textSoft} />
        </button>

        {children}
      </div>
    </div>
  )
}
