import React, { useEffect, useRef, useState, useCallback } from 'react'
import { X } from 'lucide-react'
import { BASE, SPACE, RADIUS, TYPO, SHADOW } from '../../lib/theme'

/**
 * KpiDetailSheet — Bottom sheet modal générique pour fiches KPI détaillées.
 *
 * Comportement :
 *  - Slide depuis le bas (250ms ease-out)
 *  - Hauteur 85vh, border-radius top 24px (style iOS)
 *  - Backdrop cliquable → ferme
 *  - Poignée (grip bar) swipeable : drag down > 100px ferme
 *  - Fermeture Escape + focus trap
 *
 * Props :
 *  - isOpen (bool) : visible ?
 *  - onClose (fn) : callback fermeture
 *  - title (string) : titre de la fiche (required)
 *  - subtitle (string|node) : optionnel, sous le titre
 *  - accentColor (hex) : couleur d'accent du KPI
 *  - icon (Lucide component) : icône header
 *  - footer (node) : bouton(s) actions en bas
 *  - children (node) : corps scrollable
 */
export default function KpiDetailSheet({
  isOpen,
  onClose,
  title,
  subtitle,
  accentColor = '#5B8DB8',
  icon: Icon,
  footer,
  children,
}) {
  const [mounted, setMounted] = useState(isOpen)
  const [visible, setVisible] = useState(false)
  const [dragY, setDragY] = useState(0)
  const sheetRef = useRef(null)
  const titleId = useRef(`kpi-sheet-title-${Math.random().toString(36).slice(2, 9)}`)
  const dragStartRef = useRef(null)

  // Mount / unmount animation
  useEffect(() => {
    if (isOpen) {
      setMounted(true)
      // Laisse un tick pour que le DOM pose la position initiale avant d'animer
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true))
      })
    } else {
      setVisible(false)
      const t = setTimeout(() => setMounted(false), 260)
      return () => clearTimeout(t)
    }
  }, [isOpen])

  // Lock scroll du body quand ouvert
  useEffect(() => {
    if (!mounted) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [mounted])

  // Escape fermeture
  useEffect(() => {
    if (!mounted) return
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose?.()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mounted, onClose])

  // Focus trap
  useEffect(() => {
    if (!visible || !sheetRef.current) return
    const sheet = sheetRef.current
    const focusables = sheet.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    // Focus initial sur le bouton close pour un swipe clavier immédiat
    const closeBtn = sheet.querySelector('[data-kpi-close]')
    closeBtn?.focus()

    const onTab = (e) => {
      if (e.key !== 'Tab' || !first) return
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    sheet.addEventListener('keydown', onTab)
    return () => sheet.removeEventListener('keydown', onTab)
  }, [visible])

  // Swipe-to-close : pointer events sur la poignée + header
  const onPointerDown = useCallback((e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    dragStartRef.current = { y: e.clientY, t: Date.now() }
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch (_) {}
  }, [])

  const onPointerMove = useCallback((e) => {
    if (!dragStartRef.current) return
    const dy = e.clientY - dragStartRef.current.y
    if (dy > 0) setDragY(dy)
  }, [])

  const onPointerUp = useCallback((e) => {
    if (!dragStartRef.current) return
    const dy = e.clientY - dragStartRef.current.y
    const dt = Date.now() - dragStartRef.current.t
    dragStartRef.current = null
    try { e.currentTarget.releasePointerCapture(e.pointerId) } catch (_) {}
    // Seuil : > 100px OU vitesse élevée (flick)
    const flick = dy > 40 && dt < 250
    if (dy > 100 || flick) {
      onClose?.()
    }
    setDragY(0)
  }, [onClose])

  if (!mounted) return null

  const backdropStyle = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    opacity: visible ? 1 : 0,
    transition: 'opacity 250ms ease-out',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    WebkitTapHighlightColor: 'transparent',
  }

  const translate = visible ? dragY : (typeof window !== 'undefined' ? window.innerHeight : 900)
  const sheetStyle = {
    width: '100%',
    maxWidth: 560,
    height: '85vh',
    background: BASE.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    boxShadow: '0 -8px 32px rgba(0,0,0,0.18)',
    borderTop: `1px solid ${BASE.border}`,
    transform: `translateY(${translate}px)`,
    transition: dragStartRef.current ? 'none' : 'transform 250ms ease-out',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    touchAction: 'pan-y',
  }

  return (
    <div
      style={backdropStyle}
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.() }}
      aria-hidden={false}
    >
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId.current}
        style={sheetStyle}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Poignée / drag handle */}
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{
            padding: `${SPACE.sm}px 0 ${SPACE.xs}px 0`,
            display: 'flex',
            justifyContent: 'center',
            cursor: 'grab',
            touchAction: 'none',
          }}
          aria-hidden="true"
        >
          <div style={{
            width: 44,
            height: 5,
            background: BASE.border,
            borderRadius: RADIUS.round,
          }} />
        </div>

        {/* Header sticky */}
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{
            padding: `${SPACE.sm}px ${SPACE.lg}px ${SPACE.md}px ${SPACE.lg}px`,
            borderBottom: `1px solid ${BASE.border}`,
            display: 'flex',
            alignItems: 'center',
            gap: SPACE.md,
            background: BASE.bg,
            flexShrink: 0,
            touchAction: 'none',
          }}
        >
          {Icon && (
            <div style={{
              width: 40,
              height: 40,
              borderRadius: RADIUS.lg,
              background: `${accentColor}15`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Icon size={20} color={accentColor} strokeWidth={2.2} />
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 id={titleId.current} style={{
              ...TYPO.h2,
              margin: 0,
              color: BASE.text,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {title}
            </h2>
            {subtitle && (
              <div style={{
                ...TYPO.caption,
                color: BASE.textSoft,
                marginTop: 2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {subtitle}
              </div>
            )}
          </div>
          <button
            data-kpi-close
            onClick={onClose}
            aria-label="Fermer"
            style={{
              width: 36,
              height: 36,
              borderRadius: RADIUS.round,
              border: 'none',
              background: BASE.bgHover,
              color: BASE.textSoft,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body scrollable */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: SPACE.lg,
          WebkitOverflowScrolling: 'touch',
        }}>
          {children}
        </div>

        {/* Footer optionnel */}
        {footer && (
          <div style={{
            padding: SPACE.lg,
            borderTop: `1px solid ${BASE.border}`,
            background: BASE.bg,
            boxShadow: SHADOW.sm,
            flexShrink: 0,
          }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
