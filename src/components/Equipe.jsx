import React, { useState, useMemo, createElement } from 'react'
import { Badge } from './UI'
import { ROLE_CONF } from './RolePicker'
import { db, safe } from '../lib/supabase'
import {
  ChevronDown, ChevronRight, User, Mail, Phone, Calendar,
  CheckCircle2, Circle, Clock, MapPin, AlertTriangle, Star,
  Briefcase, ClipboardList, CalendarDays, Users, Eye,
} from 'lucide-react'

// ─── Constants ───
const ROLE_ORDER = ['TM', 'PM', 'SE', 'LD', 'BL', 'SM', 'TD', 'MM', 'LOG', 'SAFE', 'AA', 'PA']

const TASK_STATUS_CONF = {
  pending: { label: 'À faire', color: '#94A3B8', icon: Circle },
  in_progress: { label: 'En cours', color: '#E8935A', icon: Clock },
  done: { label: 'Fait', color: '#5DAB8B', icon: CheckCircle2 },
  skipped: { label: 'Ignoré', color: '#B8A0AE', icon: Circle },
}

const CATEGORY_COLORS = {
  logistique: '#5B8DB8', son: '#2563EB', lumiere: '#E8935A', scene: '#9B7DC4',
  merch: '#D4648A', artiste: '#E8735A', securite: '#DC2626', transport: '#5DAB8B',
  communication: '#6366F1', autre: '#94A3B8',
}

export default function Equipe({
  roles, userProfiles, eventPacking, events, userRole,
  eventTasks, checklists, userAvailability, user,
  orgId, onReload, onToast,
}) {
  const [view, setView] = useState('roles') // roles | membres | planning
  const [expandedRole, setExpandedRole] = useState(null)
  const [selectedMember, setSelectedMember] = useState(null)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

  const today = new Date().toISOString().split('T')[0]

  // ─── Computed data ───
  const teamByRole = useMemo(() => {
    return ROLE_ORDER.map(code => {
      const role = (roles || []).find(r => r.code === code)
      if (!role) return null
      const conf = ROLE_CONF[code] || { icon: ClipboardList, color: '#9A8B94', label: role.name }
      const members = (userProfiles || []).filter(p => p.role_id === role.id)

      // Packing progress
      const upcomingPacking = (eventPacking || []).filter(ep =>
        ep.role_code === code && (events || []).find(e => e.id === ep.event_id && e.date >= today)
      )
      const packDone = upcomingPacking.filter(ep => ep.packed).length
      const packTotal = upcomingPacking.length

      // Tasks for this role
      const roleTasks = (eventTasks || []).filter(t => t.assigned_role === code && t.status !== 'done')

      return { code, role, conf, members, packDone, packTotal, pendingTasks: roleTasks.length }
    }).filter(Boolean)
  }, [roles, userProfiles, eventPacking, events, eventTasks, today])

  const allMembers = useMemo(() => {
    return (userProfiles || []).map(p => {
      const role = (roles || []).find(r => r.id === p.role_id)
      const code = role?.code
      const conf = code ? (ROLE_CONF[code] || { icon: ClipboardList, color: '#9A8B94', label: role.name }) : null
      // Tasks assigned to this member
      const memberTasks = (eventTasks || []).filter(t =>
        t.assigned_user_id === p.user_id || (!t.assigned_user_id && t.assigned_role === code)
      )
      // Availability for upcoming events
      const availability = (userAvailability || []).filter(a => a.user_id === p.user_id)
      // Checklists checked by this member (approximate via checked_at)
      const checksDone = (checklists || []).filter(c => c.checked).length
      return { ...p, role, roleCode: code, roleConf: conf, memberTasks, availability, checksDone }
    }).sort((a, b) => {
      const ai = ROLE_ORDER.indexOf(a.roleCode)
      const bi = ROLE_ORDER.indexOf(b.roleCode)
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
    })
  }, [userProfiles, roles, eventTasks, userAvailability, checklists])

  // Upcoming events for planning view
  const upcomingEvents = useMemo(() =>
    (events || []).filter(e => e.date >= today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 10),
    [events, today]
  )

  // Planning data for selected date
  const dayTasks = useMemo(() => {
    return (eventTasks || []).filter(t => {
      const evt = (events || []).find(e => e.id === t.event_id)
      if (!evt) return false
      // Calculate task date from event date + hour_offset
      const eventDate = new Date(evt.date + 'T00:00:00')
      const taskDate = new Date(eventDate.getTime() + t.hour_offset * 3600000)
      return taskDate.toISOString().split('T')[0] === selectedDate
    }).sort((a, b) => a.hour_offset - b.hour_offset)
  }, [eventTasks, events, selectedDate])

  const totalMembers = allMembers.length
  const assignedRoles = teamByRole.filter(t => t.members.length > 0).length
  const totalPendingTasks = (eventTasks || []).filter(t => t.status !== 'done').length

  // ─── Task toggle handler ───
  const handleTaskToggle = async (task) => {
    const newStatus = task.status === 'done' ? 'pending' : 'done'
    try {
      await db.update('event_tasks', `id=eq.${task.id}`, {
        status: newStatus,
        completed_at: newStatus === 'done' ? new Date().toISOString() : null,
        completed_by: newStatus === 'done' ? user?.id : null,
        updated_at: new Date().toISOString(),
      })
      onToast?.(newStatus === 'done' ? 'Tâche terminée ✓' : 'Tâche rouverte')
      onReload?.()
    } catch (e) {
      onToast?.('Erreur: ' + e.message, '#D4648A')
    }
  }

  return (
    <div style={{ padding: '0 16px 24px' }}>

      {/* ─── Header ─── */}
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
            color: 'white', boxShadow: '0 4px 16px #9B7DC430',
          }}>{createElement(Users, { size: 24 })}</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#3D3042' }}>Équipe</div>
            <div style={{ fontSize: 12, color: '#9A8B94', fontWeight: 600 }}>
              {totalMembers} membre{totalMembers > 1 ? 's' : ''} · {roles?.length || 0} rôles
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <KpiBox label="Membres" value={totalMembers} color="#9B7DC4" />
          <KpiBox label="Rôles actifs" value={assignedRoles} color="#5DAB8B" />
          <KpiBox label="Tâches" value={totalPendingTasks} color="#E8935A" />
        </div>
      </div>

      {/* ─── View toggle ─── */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {[
          { id: 'roles', label: 'Par rôle', color: '#9B7DC4' },
          { id: 'membres', label: 'Par membre', color: '#5B8DB8' },
          { id: 'planning', label: 'Planning', color: '#5DAB8B' },
        ].map(v => (
          <button key={v.id} onClick={() => { setView(v.id); setSelectedMember(null) }} style={{
            flex: 1, padding: '8px 4px', borderRadius: 10, fontSize: 11, fontWeight: 700,
            cursor: 'pointer', textAlign: 'center',
            background: view === v.id ? `${v.color}15` : 'white',
            color: view === v.id ? v.color : '#9A8B94',
            border: `1.5px solid ${view === v.id ? v.color + '40' : '#E8DED8'}`,
          }}>{v.label}</button>
        ))}
      </div>

      {/* ═══ VIEW: BY ROLE ═══ */}
      {view === 'roles' && !selectedMember && (
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
                    borderLeft: `4px solid ${t.members.length > 0 ? t.conf.color : '#E8DED8'}`,
                    opacity: t.members.length > 0 ? 1 : 0.6,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 12,
                      background: `${t.conf.color}15`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>{createElement(t.conf.icon, { size: 22, color: t.conf.color })}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: t.conf.color }}>{t.conf.label}</div>
                      <div style={{ fontSize: 11, color: '#9A8B94' }}>
                        {t.members.length > 0
                          ? `${t.members.length} membre${t.members.length > 1 ? 's' : ''}`
                          : 'Non assigné'
                        }
                        {t.pendingTasks > 0 && ` · ${t.pendingTasks} tâche${t.pendingTasks > 1 ? 's' : ''}`}
                      </div>
                    </div>
                    {t.packTotal > 0 && (
                      <div style={{ textAlign: 'center', marginRight: 8 }}>
                        <div style={{
                          fontSize: 13, fontWeight: 900,
                          color: t.packDone === t.packTotal ? '#5DAB8B' : '#E8935A',
                        }}>
                          {Math.round((t.packDone / t.packTotal) * 100)}%
                        </div>
                        <div style={{ fontSize: 8, color: '#9A8B94' }}>packing</div>
                      </div>
                    )}
                    <span style={{
                      fontSize: 12, color: '#B8A0AE', transition: 'transform 0.2s',
                      transform: isExpanded ? 'rotate(180deg)' : 'none',
                    }}>▼</span>
                  </div>
                </button>

                {isExpanded && (
                  <div style={{
                    margin: '0 8px', padding: '12px 14px', background: '#FEFBF8',
                    borderRadius: '0 0 14px 14px', border: '1px solid #F0E8E4', borderTop: 'none',
                  }}>
                    {t.role.description && (
                      <div style={{ fontSize: 12, color: '#9A8B94', marginBottom: 10, lineHeight: 1.5, fontStyle: 'italic' }}>
                        {t.role.description}
                      </div>
                    )}
                    {t.members.length === 0 ? (
                      <div style={{ fontSize: 12, color: '#B8A0AE', textAlign: 'center', padding: 8 }}>
                        Aucun membre n'a choisi ce rôle
                      </div>
                    ) : (
                      t.members.map((m, i) => (
                        <button key={i} onClick={() => setSelectedMember(m)} style={{
                          display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
                          borderBottom: i < t.members.length - 1 ? '1px solid #F0E8E4' : 'none',
                          width: '100%', background: 'none', border: 'none',
                          borderBottomWidth: i < t.members.length - 1 ? 1 : 0,
                          borderBottomStyle: 'solid', borderBottomColor: '#F0E8E4',
                          cursor: 'pointer', textAlign: 'left',
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
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#3D3042' }}>
                              {m.display_name || m.pseudo || 'Membre'}
                            </div>
                            {m.email && <div style={{ fontSize: 10, color: '#B8A0AE' }}>{m.email}</div>}
                          </div>
                          {user && m.user_id === user.id && <Badge color={t.conf.color}>Moi</Badge>}
                          {createElement(ChevronRight, { size: 14, color: '#B8A0AE' })}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ═══ VIEW: BY MEMBER ═══ */}
      {view === 'membres' && !selectedMember && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {allMembers.length === 0 ? (
            <div className="empty-state" style={{ padding: 40 }}>
              <div className="empty-icon">👥</div>
              <div className="empty-text">Aucun membre dans l'équipe</div>
            </div>
          ) : (
            allMembers.map((m, i) => (
              <button key={i} onClick={() => setSelectedMember(m)} className="card" style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
                borderLeft: m.roleConf ? `4px solid ${m.roleConf.color}` : '4px solid #E8DED8',
                width: '100%', cursor: 'pointer', textAlign: 'left',
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: m.roleConf ? `${m.roleConf.color}15` : '#F0E8E4',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, fontWeight: 800, color: m.roleConf?.color || '#9A8B94',
                }}>
                  {(m.display_name || m.pseudo || '?')[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#3D3042' }}>
                    {m.display_name || m.pseudo || 'Membre'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                    {m.roleConf && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: m.roleConf.color }}>
                        {m.roleConf.label}
                      </span>
                    )}
                    {m.memberTasks.filter(t => t.status !== 'done').length > 0 && (
                      <span style={{ fontSize: 10, color: '#E8935A', fontWeight: 700 }}>
                        {m.memberTasks.filter(t => t.status !== 'done').length} tâche{m.memberTasks.filter(t => t.status !== 'done').length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
                {user && m.user_id === user.id && <Badge color={m.roleConf?.color || '#9A8B94'}>Moi</Badge>}
                {createElement(ChevronRight, { size: 16, color: '#B8A0AE' })}
              </button>
            ))
          )}
        </div>
      )}

      {/* ═══ VIEW: PLANNING JOURNALIER ═══ */}
      {view === 'planning' && !selectedMember && (
        <div>
          {/* Date selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <button onClick={() => {
              const d = new Date(selectedDate)
              d.setDate(d.getDate() - 1)
              setSelectedDate(d.toISOString().split('T')[0])
            }} style={{
              width: 36, height: 36, borderRadius: 10, background: 'white',
              border: '1.5px solid #E8DED8', cursor: 'pointer', fontSize: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>‹</button>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#3D3042' }}>
                {new Date(selectedDate + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </div>
              {selectedDate === today && (
                <div style={{ fontSize: 10, color: '#5DAB8B', fontWeight: 700 }}>Aujourd'hui</div>
              )}
            </div>
            <button onClick={() => {
              const d = new Date(selectedDate)
              d.setDate(d.getDate() + 1)
              setSelectedDate(d.toISOString().split('T')[0])
            }} style={{
              width: 36, height: 36, borderRadius: 10, background: 'white',
              border: '1.5px solid #E8DED8', cursor: 'pointer', fontSize: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>›</button>
          </div>

          {/* Events on this date */}
          {upcomingEvents.filter(e => e.date === selectedDate).map(evt => (
            <div key={evt.id} className="card" style={{
              padding: '12px 14px', marginBottom: 12,
              borderLeft: '4px solid #9B7DC4',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {createElement(Calendar, { size: 16, color: '#9B7DC4' })}
                <span style={{ fontSize: 13, fontWeight: 800, color: '#3D3042' }}>{evt.name}</span>
              </div>
              {evt.lieu && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  {createElement(MapPin, { size: 12, color: '#9A8B94' })}
                  <span style={{ fontSize: 11, color: '#9A8B94' }}>{evt.lieu}{evt.ville ? `, ${evt.ville}` : ''}</span>
                </div>
              )}
            </div>
          ))}

          {/* Tasks grouped by role */}
          {dayTasks.length === 0 ? (
            <div className="empty-state" style={{ padding: 32 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
              <div className="empty-text">Aucune tâche pour cette date</div>
              <div style={{ fontSize: 11, color: '#B8A0AE', marginTop: 4 }}>
                Utilisez le mode événement pour planifier les tâches heure par heure
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {dayTasks.map(task => {
                const conf = ROLE_CONF[task.assigned_role] || { icon: ClipboardList, color: '#9A8B94', label: task.assigned_role }
                const statusConf = TASK_STATUS_CONF[task.status] || TASK_STATUS_CONF.pending
                const catColor = CATEGORY_COLORS[task.category] || '#94A3B8'
                const hour = task.hour_offset >= 0 ? `+${task.hour_offset}h` : `${task.hour_offset}h`
                return (
                  <button key={task.id} onClick={() => handleTaskToggle(task)} className="card" style={{
                    padding: '12px 14px', width: '100%', cursor: 'pointer', textAlign: 'left',
                    borderLeft: `3px solid ${catColor}`,
                    opacity: task.status === 'done' ? 0.6 : 1,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <div style={{ paddingTop: 2 }}>
                        {createElement(statusConf.icon, { size: 18, color: statusConf.color })}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 13, fontWeight: 700, color: '#3D3042',
                          textDecoration: task.status === 'done' ? 'line-through' : 'none',
                        }}>{task.title}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
                          <span style={{
                            fontSize: 9, fontWeight: 800, color: conf.color,
                            padding: '2px 6px', borderRadius: 6, background: `${conf.color}12`,
                          }}>{conf.label}</span>
                          <span style={{ fontSize: 10, color: '#9A8B94' }}>{hour}</span>
                          {task.priority === 'critical' && (
                            <span style={{ fontSize: 9, color: '#DC2626', fontWeight: 800 }}>CRITIQUE</span>
                          )}
                          {task.priority === 'high' && (
                            <span style={{ fontSize: 9, color: '#E8935A', fontWeight: 800 }}>PRIORITÉ</span>
                          )}
                        </div>
                      </div>
                      {task.flow_type && (
                        <span style={{
                          fontSize: 8, padding: '2px 6px', borderRadius: 6,
                          background: task.flow_type === 'physique' ? '#5DAB8B15' : task.flow_type === 'info' ? '#5B8DB815' : '#9B7DC415',
                          color: task.flow_type === 'physique' ? '#5DAB8B' : task.flow_type === 'info' ? '#5B8DB8' : '#9B7DC4',
                          fontWeight: 700,
                        }}>
                          {task.flow_type === 'physique' ? 'FLUX PHY' : task.flow_type === 'info' ? 'FLUX INFO' : 'PHY+INFO'}
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══ MEMBER DETAIL SHEET ═══ */}
      {selectedMember && (
        <MemberDetail
          member={selectedMember}
          roles={roles}
          events={events}
          eventTasks={eventTasks}
          eventPacking={eventPacking}
          checklists={checklists}
          userAvailability={userAvailability}
          user={user}
          today={today}
          onBack={() => setSelectedMember(null)}
          onTaskToggle={handleTaskToggle}
        />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════
// Member Detail — Full profile view
// ═══════════════════════════════════════════════
function MemberDetail({
  member, roles, events, eventTasks, eventPacking, checklists,
  userAvailability, user, today, onBack, onTaskToggle,
}) {
  const [subTab, setSubTab] = useState('apercu') // apercu | taches | dispo | packing

  const role = (roles || []).find(r => r.id === member.role_id)
  const code = role?.code
  const conf = code ? (ROLE_CONF[code] || { icon: ClipboardList, color: '#9A8B94', label: role.name }) : null
  const isMe = user && member.user_id === user.id

  // Member's tasks
  const myTasks = useMemo(() => {
    return (eventTasks || []).filter(t =>
      t.assigned_user_id === member.user_id || (!t.assigned_user_id && t.assigned_role === code)
    ).sort((a, b) => {
      // Sort: pending first, then by event date
      if (a.status === 'done' && b.status !== 'done') return 1
      if (a.status !== 'done' && b.status === 'done') return -1
      return (a.hour_offset || 0) - (b.hour_offset || 0)
    })
  }, [eventTasks, member.user_id, code])

  // Member's packing items
  const myPacking = useMemo(() => {
    return (eventPacking || []).filter(ep =>
      ep.role_code === code && (events || []).find(e => e.id === ep.event_id && e.date >= today)
    )
  }, [eventPacking, code, events, today])

  // Availability
  const myAvailability = useMemo(() => {
    return (userAvailability || []).filter(a => a.user_id === member.user_id)
  }, [userAvailability, member.user_id])

  const pendingTasks = myTasks.filter(t => t.status !== 'done').length
  const doneTasks = myTasks.filter(t => t.status === 'done').length
  const packDone = myPacking.filter(p => p.packed).length

  return (
    <div>
      {/* Back button */}
      <button onClick={onBack} style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '8px 0', marginBottom: 12,
        background: 'none', border: 'none', cursor: 'pointer', color: '#9A8B94', fontSize: 13, fontWeight: 700,
      }}>
        ‹ Retour
      </button>

      {/* Profile card */}
      <div className="card" style={{
        padding: '20px 16px', marginBottom: 16, textAlign: 'center',
        borderTop: `4px solid ${conf?.color || '#E8DED8'}`,
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: 18, margin: '0 auto 12px',
          background: conf ? `${conf.color}15` : '#F0E8E4',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28, fontWeight: 900, color: conf?.color || '#9A8B94',
          border: `2px solid ${conf?.color || '#E8DED8'}30`,
        }}>
          {(member.display_name || member.pseudo || '?')[0].toUpperCase()}
        </div>
        <div style={{ fontSize: 18, fontWeight: 900, color: '#3D3042' }}>
          {member.display_name || member.pseudo || 'Membre'}
          {isMe && <span style={{ fontSize: 12, color: conf?.color, marginLeft: 6 }}>(moi)</span>}
        </div>
        {conf && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 6 }}>
            {createElement(conf.icon, { size: 14, color: conf.color })}
            <span style={{ fontSize: 13, fontWeight: 700, color: conf.color }}>{conf.label}</span>
          </div>
        )}
        {member.email && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8 }}>
            {createElement(Mail, { size: 12, color: '#B8A0AE' })}
            <span style={{ fontSize: 11, color: '#B8A0AE' }}>{member.email}</span>
          </div>
        )}

        {/* Quick stats */}
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <KpiBox label="À faire" value={pendingTasks} color="#E8935A" />
          <KpiBox label="Fait" value={doneTasks} color="#5DAB8B" />
          <KpiBox label="Packing" value={myPacking.length > 0 ? `${packDone}/${myPacking.length}` : '—'} color="#5B8DB8" />
        </div>
      </div>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {[
          { id: 'apercu', label: 'Aperçu', color: '#9B7DC4' },
          { id: 'taches', label: `Tâches (${myTasks.length})`, color: '#E8935A' },
          { id: 'dispo', label: 'Dispo', color: '#5DAB8B' },
          { id: 'packing', label: 'Packing', color: '#5B8DB8' },
        ].map(s => (
          <button key={s.id} onClick={() => setSubTab(s.id)} style={{
            flex: 1, padding: '7px 2px', borderRadius: 8, fontSize: 10, fontWeight: 700,
            cursor: 'pointer', textAlign: 'center',
            background: subTab === s.id ? `${s.color}15` : 'white',
            color: subTab === s.id ? s.color : '#9A8B94',
            border: `1.5px solid ${subTab === s.id ? s.color + '40' : '#E8DED8'}`,
          }}>{s.label}</button>
        ))}
      </div>

      {/* ─── SUB: Aperçu ─── */}
      {subTab === 'apercu' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Role description */}
          {role?.description && (
            <div className="card" style={{ padding: '14px 16px' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#9A8B94', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
                Mission du rôle
              </div>
              <div style={{ fontSize: 12, color: '#3D3042', lineHeight: 1.5 }}>{role.description}</div>
            </div>
          )}

          {/* Upcoming tasks preview */}
          {myTasks.filter(t => t.status !== 'done').slice(0, 3).map(task => {
            const statusConf = TASK_STATUS_CONF[task.status]
            const evt = (events || []).find(e => e.id === task.event_id)
            return (
              <div key={task.id} className="card" style={{ padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {createElement(statusConf.icon, { size: 16, color: statusConf.color })}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#3D3042' }}>{task.title}</div>
                    {evt && <div style={{ fontSize: 10, color: '#9A8B94' }}>{evt.name} · {task.hour_offset >= 0 ? '+' : ''}{task.hour_offset}h</div>}
                  </div>
                  {task.priority === 'critical' && createElement(AlertTriangle, { size: 14, color: '#DC2626' })}
                </div>
              </div>
            )
          })}

          {myTasks.filter(t => t.status !== 'done').length === 0 && (
            <div style={{ textAlign: 'center', padding: 20, color: '#B8A0AE', fontSize: 12 }}>
              Aucune tâche en attente
            </div>
          )}
        </div>
      )}

      {/* ─── SUB: Tâches ─── */}
      {subTab === 'taches' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {myTasks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 20, color: '#B8A0AE', fontSize: 12 }}>
              Aucune tâche assignée
            </div>
          ) : (
            myTasks.map(task => {
              const statusConf = TASK_STATUS_CONF[task.status]
              const evt = (events || []).find(e => e.id === task.event_id)
              const catColor = CATEGORY_COLORS[task.category] || '#94A3B8'
              return (
                <button key={task.id} onClick={() => onTaskToggle(task)} className="card" style={{
                  padding: '12px 14px', width: '100%', cursor: 'pointer', textAlign: 'left',
                  borderLeft: `3px solid ${catColor}`,
                  opacity: task.status === 'done' ? 0.6 : 1,
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    {createElement(statusConf.icon, { size: 18, color: statusConf.color })}
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: 13, fontWeight: 700, color: '#3D3042',
                        textDecoration: task.status === 'done' ? 'line-through' : 'none',
                      }}>{task.title}</div>
                      {task.description && (
                        <div style={{ fontSize: 11, color: '#9A8B94', marginTop: 2 }}>{task.description}</div>
                      )}
                      <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                        {evt && <span style={{ fontSize: 10, color: '#5B8DB8' }}>{evt.name}</span>}
                        <span style={{ fontSize: 10, color: '#9A8B94' }}>{task.hour_offset >= 0 ? '+' : ''}{task.hour_offset}h</span>
                        <span style={{
                          fontSize: 9, padding: '1px 5px', borderRadius: 4,
                          background: `${catColor}15`, color: catColor, fontWeight: 700,
                        }}>{task.category}</span>
                      </div>
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>
      )}

      {/* ─── SUB: Disponibilité ─── */}
      {subTab === 'dispo' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(events || []).filter(e => e.date >= today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 8).map(evt => {
            const avail = myAvailability.find(a => a.event_id === evt.id)
            const statusMap = {
              available: { color: '#5DAB8B', label: 'Disponible', bg: '#5DAB8B15' },
              unavailable: { color: '#DC2626', label: 'Indisponible', bg: '#DC262615' },
              maybe: { color: '#E8935A', label: 'Peut-être', bg: '#E8935A15' },
            }
            const status = avail ? (statusMap[avail.status] || { color: '#94A3B8', label: 'Inconnu', bg: '#94A3B815' }) : { color: '#94A3B8', label: 'Non renseigné', bg: '#94A3B815' }
            return (
              <div key={evt.id} className="card" style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#3D3042' }}>{evt.name}</div>
                  <div style={{ fontSize: 11, color: '#9A8B94' }}>
                    {new Date(evt.date + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    {evt.lieu ? ` · ${evt.lieu}` : ''}
                  </div>
                </div>
                <span style={{
                  fontSize: 10, fontWeight: 800, padding: '4px 10px', borderRadius: 8,
                  background: status.bg, color: status.color,
                }}>{status.label}</span>
              </div>
            )
          })}
          {(events || []).filter(e => e.date >= today).length === 0 && (
            <div style={{ textAlign: 'center', padding: 20, color: '#B8A0AE', fontSize: 12 }}>
              Aucun événement à venir
            </div>
          )}
        </div>
      )}

      {/* ─── SUB: Packing ─── */}
      {subTab === 'packing' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {myPacking.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 20, color: '#B8A0AE', fontSize: 12 }}>
              Aucun item de packing assigné
            </div>
          ) : (
            myPacking.map(p => {
              const evt = (events || []).find(e => e.id === p.event_id)
              return (
                <div key={p.id} className="card" style={{
                  padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10,
                  opacity: p.packed ? 0.6 : 1,
                }}>
                  {createElement(p.packed ? CheckCircle2 : Circle, {
                    size: 18, color: p.packed ? '#5DAB8B' : '#B8A0AE',
                  })}
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: 12, fontWeight: 700, color: '#3D3042',
                      textDecoration: p.packed ? 'line-through' : 'none',
                    }}>
                      Qty: {p.quantity_needed || 1}
                      {p.notes ? ` — ${p.notes}` : ''}
                    </div>
                    {evt && <div style={{ fontSize: 10, color: '#9A8B94' }}>{evt.name}</div>}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

// ─── KPI Box ───
function KpiBox({ label, value, color }) {
  return (
    <div style={{
      flex: 1, textAlign: 'center', padding: '8px 4px',
      background: 'white', borderRadius: 10, border: '1px solid #F0E8E4',
    }}>
      <div style={{ fontSize: 16, fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 8, color: '#9A8B94', fontWeight: 700, marginTop: 2 }}>{label}</div>
    </div>
  )
}
