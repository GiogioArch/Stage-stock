import React from 'react'

export function SocialBadge({ label, value, color }) {
  return (
    <span style={{
      padding: '3px 10px', borderRadius: 8, fontSize: 10, fontWeight: 700,
      background: `${color}12`, color, cursor: 'default',
    }}>{label}: {value}</span>
  )
}

export function SocialRow({ instagram, facebook, linkedin }) {
  if (!instagram && !facebook && !linkedin) return null
  return (
    <div style={{ display: 'flex', gap: 8, paddingTop: 8 }}>
      {instagram && <SocialBadge label="Instagram" value={instagram} color="#E1306C" />}
      {facebook && <SocialBadge label="Facebook" value={facebook} color="#1877F2" />}
      {linkedin && <SocialBadge label="LinkedIn" value={linkedin} color="#0A66C2" />}
    </div>
  )
}
