import React from 'react'
import { BASE, SPACE, RADIUS, TYPO } from '../../lib/theme'

// ─── Formatters ───
export function fmtEuro(v) {
  const n = Math.round((v || 0) * 100) / 100
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '\u00A0€'
}

export function fmtInt(v) {
  return Math.round(v || 0).toLocaleString('fr-FR')
}

export function fmtDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function fmtDateTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) +
    ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

// ─── Section heading ───
export function Section({ title, accent, right, children, style }) {
  return (
    <div style={{ marginBottom: SPACE.lg, ...style }}>
      {(title || right) && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: SPACE.sm,
        }}>
          {title && (
            <h3 style={{
              ...TYPO.label,
              margin: 0,
              color: accent || BASE.textSoft,
            }}>
              {title}
            </h3>
          )}
          {right}
        </div>
      )}
      {children}
    </div>
  )
}

// ─── StatRow : label + value ───
export function StatRow({ label, value, accent, bold }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      padding: `${SPACE.sm}px 0`,
      borderBottom: `1px solid ${BASE.border}`,
      gap: SPACE.md,
    }}>
      <span style={{ ...TYPO.body, color: BASE.textSoft }}>{label}</span>
      <span style={{
        ...(bold ? TYPO.bodyBold : TYPO.body),
        color: accent || BASE.text,
        textAlign: 'right',
      }}>
        {value}
      </span>
    </div>
  )
}

// ─── StatGrid : 2 colonnes de stats ───
export function StatGrid({ items }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: SPACE.sm,
    }}>
      {items.map((it, i) => (
        <div key={i} style={{
          padding: SPACE.md,
          background: BASE.bgSurface,
          borderRadius: RADIUS.lg,
          border: `1px solid ${BASE.border}`,
        }}>
          <div style={{ ...TYPO.micro, color: BASE.textMuted, marginBottom: 4 }}>
            {it.label}
          </div>
          <div style={{ ...TYPO.h3, color: it.color || BASE.text }}>
            {it.value}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── EmptyState ───
export function EmptyState({ message }) {
  return (
    <div style={{
      padding: SPACE.xl,
      textAlign: 'center',
      color: BASE.textMuted,
      background: BASE.bgSurface,
      borderRadius: RADIUS.lg,
      border: `1px dashed ${BASE.border}`,
      ...TYPO.body,
    }}>
      {message}
    </div>
  )
}

// ─── ActionButton (primary) ───
export function ActionButton({ onClick, children, accent = '#5B8DB8', variant = 'primary', style }) {
  const primaryStyle = {
    background: accent,
    color: '#FFFFFF',
    border: 'none',
  }
  const secondaryStyle = {
    background: 'transparent',
    color: accent,
    border: `1px solid ${accent}40`,
  }
  return (
    <button
      onClick={onClick}
      style={{
        padding: `${SPACE.sm}px ${SPACE.lg}px`,
        borderRadius: RADIUS.md,
        fontWeight: 600,
        fontSize: 14,
        cursor: 'pointer',
        ...(variant === 'primary' ? primaryStyle : secondaryStyle),
        ...style,
      }}
    >
      {children}
    </button>
  )
}

// ─── LineChart SVG ultra-simple ───
// data : [{ x: 'label', y: number }]
export function SvgLineChart({ data, accent = '#5B8DB8', height = 120 }) {
  if (!data || data.length === 0) return null
  const W = 320
  const H = height
  const PAD = 8
  const xs = data.map((_, i) => i)
  const ys = data.map(d => d.y)
  const maxY = Math.max(1, ...ys)
  const minY = 0
  const xScale = (i) => PAD + (i / Math.max(1, data.length - 1)) * (W - 2 * PAD)
  const yScale = (y) => H - PAD - ((y - minY) / (maxY - minY || 1)) * (H - 2 * PAD)
  const path = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${xScale(i).toFixed(1)},${yScale(d.y).toFixed(1)}`).join(' ')
  const area = `${path} L${xScale(data.length - 1).toFixed(1)},${H - PAD} L${xScale(0).toFixed(1)},${H - PAD} Z`
  const gradId = `grad-${accent.replace('#', '')}-${height}`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none"
         style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="0.25" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} />
      <path d={path} fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((d, i) => (
        <circle key={i} cx={xScale(i)} cy={yScale(d.y)} r="2.5" fill={accent} />
      ))}
    </svg>
  )
}

// ─── Bar chart SVG ───
// data : [{ label, value }]
export function SvgBarChart({ data, accent = '#5B8DB8', height = 120, showValues = true }) {
  if (!data || data.length === 0) return null
  const W = 320
  const H = height
  const PAD_T = 8
  const PAD_B = 28
  const PAD_X = 4
  const maxY = Math.max(1, ...data.map(d => d.value || 0))
  const barWidth = ((W - 2 * PAD_X) / data.length) * 0.68
  const step = (W - 2 * PAD_X) / data.length
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none"
         style={{ display: 'block' }}>
      {data.map((d, i) => {
        const h = ((d.value || 0) / maxY) * (H - PAD_T - PAD_B)
        const x = PAD_X + i * step + (step - barWidth) / 2
        const y = H - PAD_B - h
        return (
          <g key={i}>
            <rect x={x} y={y} width={barWidth} height={Math.max(0, h)} fill={accent} rx="3" />
            {showValues && d.value > 0 && (
              <text x={x + barWidth / 2} y={y - 3} fontSize="9" fill={BASE.textSoft}
                    textAnchor="middle" fontWeight="600">
                {d.value}
              </text>
            )}
            <text x={x + barWidth / 2} y={H - 10} fontSize="9" fill={BASE.textMuted}
                  textAnchor="middle">
              {d.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ─── Sortable header cell ───
export function SortableTh({ label, active, direction, onClick, align = 'left' }) {
  return (
    <th
      onClick={onClick}
      style={{
        textAlign: align,
        padding: `${SPACE.sm}px ${SPACE.sm}px`,
        ...TYPO.micro,
        color: active ? BASE.text : BASE.textMuted,
        cursor: 'pointer',
        userSelect: 'none',
        borderBottom: `1px solid ${BASE.border}`,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
      {active ? (direction === 'asc' ? ' ↑' : ' ↓') : ''}
    </th>
  )
}
