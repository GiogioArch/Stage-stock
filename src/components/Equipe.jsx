import React, { useState, useMemo } from 'react'
import { Badge } from './UI'
import { ROLE_CONF } from './RolePicker'

export default function Equipe({ roles, userProfiles, eventPacking, events, userRole }) {
  const [expandedRole, setExpandedRole] = useState(null)
  const [view, setView] = useState('roles') // roles | membres

  const today = new Date().toISOString().split('T')[0]

  // Role order
  const roleOrder = ['TM', 'PM', 'SE', 'LD', 'BL', 'SM', 'TD', 'MM', 'LOG', 'SAFE', 'AA', 'PA']

  // Team data grouped by role
  const teamByRole = useMemo(() => {
    return roleOrder.map(code => {
      const role = (roles || []).find(r => r.code === code)
      if (!role) return null
      const conf = ROLE_CONF[code] || { icon: '📋', color: '#8A7D75', label: role.name }
      const members = (userProfiles || []).filter(p => p.role_id === role.id)

      // Upcoming events with packing for this role
      const upcomingPacking = (eventPacking || []).filter(ep =>
        ep.role_code === code && (events || []).find(e => e.id === ep.event_id && e.date >= today)
      )
      const packDone = upcomingPacking.filter(ep => ep.packed).length
      const packTotal = upcomingPacking.length

      return { code, role, conf, members, packDone, packTotal }
    }).filter(Boolean)
  }, [roles, userProfiles, eventPacking, events, roleOrder, today])

  // All members flat list
  const allMembers = useMemo(() => {
    return (userProfiles || []).map(p => {
      const role = (roles || []).find(r => r.id === p.role_id)
      const code = role?.code
      const conf = code ? (ROLE_CONF[code] || { icon: '📋', color: '#8A7D75', label: role.name }) : null
      return { ...p, role, roleCode: code, roleConf: conf }
    }).sort((a, b) => {
      const ai = roleOrder.indexOf(a.roleCode)
      const bi = roleOrder.indexOf(b.roleCode)
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
    })
  }, [userProfiles, roles, roleOrder])

  const totalMembers = allMembers.length
  const assignedRoles = teamByRole.filter(t => t.members.length > 0).length

  return (
    <div style={{ padding: '0 16px 24px' }}>

      {/* Header */}
      <div className="card" style={{
        marginBottom: 16, padding: '18px 16px',
        background: 'linear-gradient(135deg, #9B7DC408, #9B7DC418)',
        border: '1.5px solid #9B7DC425',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: 'linear-gradient(135deg, #9B7DC4, #8A6CB3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, color: 'white', boxShadow: '0 4px 16px #9B7DC430',
          }}>👥</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#F0ECE2' }}>Équipe</div>
            <div style={{ fontSize: 12, color: '#8A7D75', fontWeight: 600 }}>
              {totalMembers} membre{totalMembers > 1 ? 's' : ''} · {roles.length} rôles
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <KpiBox label="Membres" value={totalMembers} color="#9B7DC4" />
          <KpiBox label="Rôles actifs" value={assignedRoles} color="#2FB65D" />
          <KpiBox label="Rôles total" value={roles.length} color="#5B8DB8" />
        </div>
      </div>

      {/* View toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[
          { id: 'roles', label: 'Par rôle', color: '#9B7DC4' },
          { id: 'membres', label: 'Par membre', color: '#5B8DB8' },
        ].map(v => (
          <button key={v.id} onClick={() => setView(v.id)} style={{
            flex: 1, padding: '8px 6px', borderRadius: 10, fontSize: 12, fontWeight: 700,
            cursor: 'pointer', textAlign: 'center',
            background: view === v.id ? `${v.color}15` : 'white',
            color: view === v.id ? v.color : '#8A7D75',
            border: `1.5px solid ${view === v.id ? v.color + '40' : '#222222'}`,
          }}>{v.label}</button>
        ))}
      </div>

      {/* ─── View by role ─── */}
      {view === 'roles' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {teamByRole.map(t => {
            const isExpanded = expandedRole === t.code
            return (
              <div key={t.code}>
                <button
                  onClick={() => setExpandedRole(isExpanded ? null : t.code)}
                  className="card"
                  style={{
                    width: '100%', padding: '14px 16px', cursor: 'pointer', textAlign: 'left',
                    borderLeft: `4px solid ${t.members.length > 0 ? t.conf.color : '#222222'}`,
                    opacity: t.members.length > 0 ? 1 : 0.6,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 12,
                      background: `${t.conf.color}15`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
                    }}>{t.conf.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: t.conf.color }}>{t.conf.label}</div>
                      <div style={{ fontSize: 11, color: '#8A7D75' }}>
                        {t.members.length > 0
                          ? `${t.members.length} membre${t.members.length > 1 ? 's' : ''}`
                          : 'Non assigné'
                        }
                      </div>
                    </div>
                    {t.packTotal > 0 && (
                      <div style={{ textAlign: 'center', marginRight: 8 }}>
                        <div style={{
                          fontSize: 13, fontWeight: 900,
                          color: t.packDone === t.packTotal ? '#2FB65D' : '#C8A46A',
                        }}>
                          {Math.round((t.packDone / t.packTotal) * 100)}%
                        </div>
                        <div style={{ fontSize: 8, color: '#8A7D75' }}>packing</div>
                      </div>
                    )}
                    <span style={{
                      fontSize: 12, color: '#6B6058', transition: 'transform 0.2s',
                      transform: isExpanded ? 'rotate(180deg)' : 'none',
                    }}>▼</span>
                  </div>
                </button>

                {isExpanded && (
                  <div style={{
                    margin: '0 8px', padding: '12px 14px', background: '#FEFBF8',
                    borderRadius: '0 0 14px 14px', border: '1px solid #1a1a1a', borderTop: 'none',
                  }}>
                    {t.role.description && (
                      <div style={{ fontSize: 12, color: '#8A7D75', marginBottom: 10, lineHeight: 1.5, fontStyle: 'italic' }}>
                        {t.role.description}
                      </div>
                    )}
                    {t.members.length === 0 ? (
                      <div style={{ fontSize: 12, color: '#6B6058', textAlign: 'center', padding: 8 }}>
                        Aucun membre n'a choisi ce rôle
                      </div>
                    ) : (
                      t.members.map((m, i) => (
                        <div key={i} style={{
                          display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
                          borderBottom: i < t.members.length - 1 ? '1px solid #1a1a1a' : 'none',
                        }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: 10,
                            background: `${t.conf.color}15`, display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                            fontSize: 14, fontWeight: 800, color: t.conf.color,
                          }}>
                            {(m.display_name || m.pseudo || '?')[0].toUpperCase()}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#F0ECE2' }}>
                              {m.display_name || m.pseudo || 'Membre'}
                            </div>
                            {m.email && <div style={{ fontSize: 10, color: '#6B6058' }}>{m.email}</div>}
                          </div>
                          {userRole && userRole.id === t.role.id && m.user_id === (userProfiles || []).find(p => p.role_id === userRole.id)?.user_id && (
                            <Badge color={t.conf.color}>Moi</Badge>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ─── View by member ─── */}
      {view === 'membres' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {allMembers.length === 0 ? (
            <div className="empty-state" style={{ padding: 40 }}>
              <div className="empty-icon">👥</div>
              <div className="empty-text">Aucun membre dans l'équipe</div>
            </div>
          ) : (
            allMembers.map((m, i) => (
              <div key={i} className="card" style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
                borderLeft: m.roleConf ? `4px solid ${m.roleConf.color}` : '4px solid #222222',
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: m.roleConf ? `${m.roleConf.color}15` : '#1a1a1a',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, fontWeight: 800, color: m.roleConf?.color || '#8A7D75',
                }}>
                  {(m.display_name || m.pseudo || '?')[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#F0ECE2' }}>
                    {m.display_name || m.pseudo || 'Membre'}
                  </div>
                  {m.email && (
                    <div style={{ fontSize: 11, color: '#6B6058', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.email}
                    </div>
                  )}
                </div>
                {m.roleConf && (
                  <Badge color={m.roleConf.color}>
                    {m.roleConf.icon} {m.roleConf.label}
                  </Badge>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

function KpiBox({ label, value, color }) {
  return (
    <div style={{
      flex: 1, textAlign: 'center', padding: '8px 4px',
      background: 'white', borderRadius: 10, border: '1px solid #1a1a1a',
    }}>
      <div style={{ fontSize: 16, fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 8, color: '#8A7D75', fontWeight: 700, marginTop: 2 }}>{label}</div>
    </div>
  )
}
