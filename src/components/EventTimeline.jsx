import React, { useState, useMemo, createElement, useCallback } from 'react'
import { ROLE_CONF } from './RolePicker'
import { db } from '../lib/supabase'
import { useToast, useProject, useAuth } from '../shared/hooks'
import {
  Clock, ChevronDown, ChevronRight, Plus, Check, Circle,
  CheckCircle2, AlertTriangle, Truck, MessageSquare, Zap,
  MapPin, Users, ArrowDown, ArrowUp, X, Save,
  ClipboardList, Filter, Eye, EyeOff, Mic, Timer,
} from 'lucide-react'

// ─── Constants ───
const HOURS = Array.from({ length: 49 }, (_, i) => i - 24) // -24 to +24

const CATEGORIES = [
  { id: 'logistique', label: 'Logistique', color: '#5B8DB8', icon: Truck },
  { id: 'son', label: 'Son', color: '#5B8DB8', icon: Zap },
  { id: 'lumiere', label: 'Lumière', color: '#E8935A', icon: Zap },
  { id: 'scene', label: 'Scène', color: '#9B7DC4', icon: ClipboardList },
  { id: 'merch', label: 'Merch', color: '#D4648A', icon: ClipboardList },
  { id: 'artiste', label: 'Artiste', color: '#E8735A', icon: Users },
  { id: 'securite', label: 'Sécurité', color: '#D4648A', icon: AlertTriangle },
  { id: 'transport', label: 'Transport', color: '#5DAB8B', icon: Truck },
  { id: 'communication', label: 'Communication', color: '#5B8DB8', icon: MessageSquare },
  { id: 'autre', label: 'Autre', color: '#94A3B8', icon: ClipboardList },
]

const PRIORITIES = [
  { id: 'low', label: 'Basse', color: '#94A3B8' },
  { id: 'medium', label: 'Moyenne', color: '#5B8DB8' },
  { id: 'high', label: 'Haute', color: '#E8935A' },
  { id: 'critical', label: 'Critique', color: '#D4648A' },
]

const FLOW_TYPES = [
  { id: 'physique', label: 'Flux physique', color: '#5DAB8B' },
  { id: 'info', label: 'Flux info', color: '#5B8DB8' },
  { id: 'both', label: 'Les deux', color: '#9B7DC4' },
]

const ROLE_ORDER = ['TM', 'PM', 'SE', 'LD', 'BL', 'SM', 'TD', 'MM', 'LOG', 'SAFE', 'AA', 'PA']

export default function EventTimeline({
  event, events, eventTasks, roles, userProfiles,
  onToast: _legacyToast, onBack,
}) {
  const toast = useToast()
  const onToast = _legacyToast || toast
  const { orgId, reload } = useProject()
  const { user } = useAuth()
  const [viewMode, setViewMode] = useState('timeline') // timeline | role | flow
  const [showAddTask, setShowAddTask] = useState(false)
  const [expandedHour, setExpandedHour] = useState(null)
  const [filterRole, setFilterRole] = useState(null)
  const [filterFlow, setFilterFlow] = useState(null)
  const [showPast, setShowPast] = useState(true)

  // Tasks for this event
  const tasks = useMemo(() => {
    return (eventTasks || [])
      .filter(t => t.event_id === event?.id)
      .sort((a, b) => a.hour_offset - b.hour_offset)
  }, [eventTasks, event])

  // Apply filters
  const filteredTasks = useMemo(() => {
    let result = tasks
    if (filterRole) result = result.filter(t => t.assigned_role === filterRole)
    if (filterFlow) result = result.filter(t => t.flow_type === filterFlow)
    return result
  }, [tasks, filterRole, filterFlow])

  // Group by hour
  const tasksByHour = useMemo(() => {
    const map = {}
    filteredTasks.forEach(t => {
      if (!map[t.hour_offset]) map[t.hour_offset] = []
      map[t.hour_offset].push(t)
    })
    return map
  }, [filteredTasks])

  // Group by role
  const tasksByRole = useMemo(() => {
    const map = {}
    filteredTasks.forEach(t => {
      if (!map[t.assigned_role]) map[t.assigned_role] = []
      map[t.assigned_role].push(t)
    })
    return map
  }, [filteredTasks])

  // Stats
  const totalTasks = tasks.length
  const doneTasks = tasks.filter(t => t.status === 'done').length
  const criticalTasks = tasks.filter(t => t.priority === 'critical' && t.status !== 'done').length
  const progressPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0

  // Current hour offset (relative to event)
  const currentHourOffset = useMemo(() => {
    if (!event?.date) return null
    const now = new Date()
    const eventStart = new Date(event.date + 'T00:00:00')
    const diffHours = Math.round((now - eventStart) / 3600000)
    return diffHours >= -24 && diffHours <= 24 ? diffHours : null
  }, [event])

  // ─── Handlers ───
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
      reload?.()
    } catch (e) {
      onToast?.('Erreur: ' + e.message, '#D4648A')
    }
  }

  if (!event) {
    return (
      <div style={{ padding: '40px 16px', textAlign: 'center' }}>
        <div style={{ marginBottom: 12 }}>{createElement(ClipboardList, { size: 48, color: '#3D3042' })}</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#3D3042' }}>Sélectionne un événement</div>
        <div style={{ fontSize: 12, color: '#9A8B94', marginTop: 4 }}>
          Ouvre un événement depuis la Tournée pour accéder au planning 48h
        </div>
      </div>
    )
  }

  // Format hour label
  const formatHour = (offset) => {
    if (offset === 0) return 'H+0 — SHOWTIME'
    const sign = offset > 0 ? '+' : ''
    const label = offset < 0 ? 'Préparation' : 'Post-event'
    return `H${sign}${offset} — ${label}`
  }

  const formatTimeFromOffset = (offset) => {
    // Assuming event at 20:00 (default concert time)
    const baseHour = 20
    const hour = ((baseHour + offset) % 24 + 24) % 24
    return `${hour.toString().padStart(2, '0')}:00`
  }

  return (
    <div style={{ padding: '0 16px 24px' }}>

      {/* ─── Back + Event Header ─── */}
      {onBack && (
        <button onClick={onBack} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '8px 0', marginBottom: 8,
          background: 'none', border: 'none', cursor: 'pointer', color: '#9A8B94', fontSize: 13, fontWeight: 700,
        }}>
          ‹ Retour à la tournée
        </button>
      )}

      <div className="card" style={{
        padding: '18px 16px', marginBottom: 16,
        background: 'linear-gradient(135deg, #5B8DB808, #5B8DB818)',
        border: '1.5px solid #5B8DB825',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: 'linear-gradient(135deg, #5B8DB8, #4A7DA8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', boxShadow: '0 4px 16px #5B8DB830',
          }}>{createElement(Clock, { size: 24 })}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#3D3042' }}>Mode Événement</div>
            <div style={{ fontSize: 12, color: '#9A8B94', fontWeight: 600 }}>{event.name}</div>
          </div>
          {event.date && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#5B8DB8' }}>
                {new Date(event.date + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
              </div>
              {event.lieu && <div style={{ fontSize: 10, color: '#9A8B94' }}>{event.lieu}</div>}
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#9A8B94' }}>Progression</span>
            <span style={{ fontSize: 10, fontWeight: 800, color: progressPct === 100 ? '#5DAB8B' : '#5B8DB8' }}>
              {progressPct}% ({doneTasks}/{totalTasks})
            </span>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: '#E8DED8' }}>
            <div style={{
              height: '100%', borderRadius: 3, transition: 'width 0.3s',
              width: `${progressPct}%`,
              background: progressPct === 100 ? '#5DAB8B' : 'linear-gradient(90deg, #5B8DB8, #818CF8)',
            }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <StatBox label="Total" value={totalTasks} color="#5B8DB8" />
          <StatBox label="Fait" value={doneTasks} color="#5DAB8B" />
          <StatBox label="Critique" value={criticalTasks} color="#D4648A" />
        </div>
      </div>

      {/* ─── View mode + Filters ─── */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {[
          { id: 'timeline', label: 'Timeline', color: '#5B8DB8' },
          { id: 'role', label: 'Par rôle', color: '#9B7DC4' },
          { id: 'flow', label: 'Flux', color: '#5DAB8B' },
        ].map(v => (
          <button key={v.id} onClick={() => setViewMode(v.id)} style={{
            flex: 1, padding: '7px 4px', borderRadius: 8, fontSize: 11, fontWeight: 700,
            cursor: 'pointer', textAlign: 'center',
            background: viewMode === v.id ? `${v.color}15` : 'white',
            color: viewMode === v.id ? v.color : '#9A8B94',
            border: `1.5px solid ${viewMode === v.id ? v.color + '40' : '#E8DED8'}`,
          }}>{v.label}</button>
        ))}
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
        <button onClick={() => setFilterRole(null)} style={{
          padding: '4px 10px', borderRadius: 8, fontSize: 10, fontWeight: 700,
          background: !filterRole ? '#5B8DB815' : 'white',
          color: !filterRole ? '#5B8DB8' : '#9A8B94',
          border: `1px solid ${!filterRole ? '#5B8DB840' : '#E8DED8'}`,
          cursor: 'pointer', whiteSpace: 'nowrap',
        }}>Tous</button>
        {ROLE_ORDER.filter(code => tasks.some(t => t.assigned_role === code)).map(code => {
          const conf = ROLE_CONF[code]
          if (!conf) return null
          return (
            <button key={code} onClick={() => setFilterRole(filterRole === code ? null : code)} style={{
              padding: '4px 10px', borderRadius: 8, fontSize: 10, fontWeight: 700,
              background: filterRole === code ? `${conf.color}15` : 'white',
              color: filterRole === code ? conf.color : '#9A8B94',
              border: `1px solid ${filterRole === code ? conf.color + '40' : '#E8DED8'}`,
              cursor: 'pointer', whiteSpace: 'nowrap',
            }}>{code}</button>
          )
        })}
      </div>

      {/* ═══ TIMELINE VIEW ═══ */}
      {viewMode === 'timeline' && (
        <div style={{ position: 'relative' }}>
          {/* Vertical timeline line */}
          <div style={{
            position: 'absolute', left: 20, top: 0, bottom: 0,
            width: 2, background: '#E8DED830',
          }} />

          {HOURS.filter(h => {
            if (!showPast && h < (currentHourOffset || 0)) return false
            return tasksByHour[h] || h === 0 || h === currentHourOffset
          }).map(hour => {
            const hourTasks = tasksByHour[hour] || []
            const isShowtime = hour === 0
            const isCurrent = hour === currentHourOffset
            const isExpanded = expandedHour === hour || hourTasks.length <= 3

            return (
              <div key={hour} style={{ position: 'relative', marginBottom: 8 }}>
                {/* Timeline dot */}
                <div style={{
                  position: 'absolute', left: 14, top: 14, width: 14, height: 14,
                  borderRadius: 7, zIndex: 1,
                  background: isShowtime ? '#E8735A' : isCurrent ? '#5B8DB8' : hourTasks.length > 0 ? '#5DAB8B' : '#E8DED8',
                  border: `2px solid ${isShowtime ? '#E8735A30' : isCurrent ? '#5B8DB830' : 'white'}`,
                }} />

                <div style={{ marginLeft: 44 }}>
                  {/* Hour label */}
                  <div style={{
                    fontSize: isShowtime ? 13 : 11,
                    fontWeight: isShowtime ? 900 : 700,
                    color: isShowtime ? '#E8735A' : isCurrent ? '#5B8DB8' : '#3D3042',
                    marginBottom: 6,
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <span>{formatHour(hour)}</span>
                    <span style={{ fontSize: 10, color: '#B8A0AE', fontWeight: 500 }}>
                      {formatTimeFromOffset(hour)}
                    </span>
                    {isCurrent && (
                      <span style={{
                        fontSize: 9, padding: '1px 6px', borderRadius: 6,
                        background: '#5B8DB815', color: '#5B8DB8', fontWeight: 800,
                      }}>MAINTENANT</span>
                    )}
                  </div>

                  {/* Tasks at this hour */}
                  {hourTasks.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
                      {(isExpanded ? hourTasks : hourTasks.slice(0, 3)).map(task => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          onToggle={() => handleTaskToggle(task)}
                          compact
                        />
                      ))}
                      {!isExpanded && hourTasks.length > 3 && (
                        <button onClick={() => setExpandedHour(hour)} style={{
                          padding: '6px', fontSize: 11, color: '#5B8DB8', fontWeight: 700,
                          background: 'none', border: 'none', cursor: 'pointer',
                        }}>
                          + {hourTasks.length - 3} autres tâches
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {filteredTasks.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px', marginLeft: 44 }}>
              <div style={{ marginBottom: 8 }}>{createElement(Timer, { size: 40, color: '#3D3042' })}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#3D3042' }}>Timeline vide</div>
              <div style={{ fontSize: 12, color: '#9A8B94', marginTop: 4 }}>
                Ajoutez des tâches pour planifier les 48h autour de l'événement
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ ROLE VIEW ═══ */}
      {viewMode === 'role' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {ROLE_ORDER.filter(code => tasksByRole[code]).map(code => {
            const conf = ROLE_CONF[code] || { icon: ClipboardList, color: '#9A8B94', label: code }
            const roleTasks = tasksByRole[code]
            const done = roleTasks.filter(t => t.status === 'done').length
            const pct = Math.round((done / roleTasks.length) * 100)

            return (
              <div key={code} className="card" style={{
                padding: '14px 16px',
                borderLeft: `4px solid ${conf.color}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: `${conf.color}15`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{createElement(conf.icon, { size: 18, color: conf.color })}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: conf.color }}>{conf.label}</div>
                    <div style={{ fontSize: 10, color: '#9A8B94' }}>{done}/{roleTasks.length} terminées</div>
                  </div>
                  <div style={{
                    fontSize: 14, fontWeight: 900,
                    color: pct === 100 ? '#5DAB8B' : '#E8935A',
                  }}>{pct}%</div>
                </div>

                {/* Mini progress */}
                <div style={{ height: 4, borderRadius: 2, background: '#E8DED8', marginBottom: 10 }}>
                  <div style={{
                    height: '100%', borderRadius: 2, width: `${pct}%`,
                    background: pct === 100 ? '#5DAB8B' : conf.color,
                    transition: 'width 0.3s',
                  }} />
                </div>

                {roleTasks.map(task => (
                  <TaskCard key={task.id} task={task} onToggle={() => handleTaskToggle(task)} compact />
                ))}
              </div>
            )
          })}
        </div>
      )}

      {/* ═══ FLOW VIEW ═══ */}
      {viewMode === 'flow' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {FLOW_TYPES.map(flow => {
            const flowTasks = filteredTasks.filter(t => t.flow_type === flow.id)
            if (flowTasks.length === 0) return null
            return (
              <div key={flow.id}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
                  padding: '8px 12px', borderRadius: 10,
                  background: `${flow.color}10`, border: `1px solid ${flow.color}25`,
                }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: 4, background: flow.color,
                  }} />
                  <span style={{ fontSize: 13, fontWeight: 800, color: flow.color }}>{flow.label}</span>
                  <span style={{ fontSize: 11, color: '#9A8B94', marginLeft: 'auto' }}>
                    {flowTasks.length} tâche{flowTasks.length > 1 ? 's' : ''}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {flowTasks.map(task => (
                    <TaskCard key={task.id} task={task} onToggle={() => handleTaskToggle(task)} showHour />
                  ))}
                </div>
              </div>
            )
          })}

          {filteredTasks.filter(t => !t.flow_type).length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#9A8B94', marginBottom: 8 }}>Non classé</div>
              {filteredTasks.filter(t => !t.flow_type).map(task => (
                <TaskCard key={task.id} task={task} onToggle={() => handleTaskToggle(task)} showHour />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Add Task FAB ─── */}
      <button onClick={() => setShowAddTask(true)} aria-label="Ajouter une tâche" style={{
        position: 'fixed', bottom: 90, right: 16, zIndex: 80,
        width: 52, height: 52, borderRadius: 16,
        background: 'linear-gradient(135deg, #5B8DB8, #4A7DA8)',
        color: 'white', border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 6px 24px rgba(91,141,184,0.4)',
      }}>
        {createElement(Plus, { size: 24 })}
      </button>

      {/* ─── Add Task Modal ─── */}
      {showAddTask && (
        <AddTaskModal
          event={event}
          roles={roles}
          userProfiles={userProfiles}
          onClose={() => setShowAddTask(false)}
          onDone={() => { setShowAddTask(false); reload?.() }}
          onToast={onToast}
        />
      )}
    </div>
  )
}

// ─── Task Card ───
function TaskCard({ task, onToggle, compact, showHour }) {
  const conf = ROLE_CONF[task.assigned_role] || { icon: ClipboardList, color: '#9A8B94', label: task.assigned_role }
  const catColor = CATEGORIES.find(c => c.id === task.category)?.color || '#94A3B8'
  const isDone = task.status === 'done'

  return (
    <button onClick={onToggle} className="card" style={{
      padding: compact ? '8px 12px' : '12px 14px',
      width: '100%', cursor: 'pointer', textAlign: 'left',
      borderLeft: `3px solid ${catColor}`,
      opacity: isDone ? 0.55 : 1,
      marginBottom: compact ? 0 : 4,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        {createElement(isDone ? CheckCircle2 : Circle, {
          size: compact ? 16 : 18,
          color: isDone ? '#5DAB8B' : '#B8A0AE',
        })}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: compact ? 12 : 13, fontWeight: 700, color: '#3D3042',
            textDecoration: isDone ? 'line-through' : 'none',
          }}>{task.title}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 9, fontWeight: 800, color: conf.color,
              padding: '1px 5px', borderRadius: 4, background: `${conf.color}12`,
            }}>{conf.label}</span>
            {showHour && (
              <span style={{ fontSize: 10, color: '#9A8B94' }}>
                H{task.hour_offset >= 0 ? '+' : ''}{task.hour_offset}
              </span>
            )}
            {task.priority === 'critical' && (
              <span style={{ fontSize: 9, color: '#D4648A', fontWeight: 800 }}>CRITIQUE</span>
            )}
            {task.priority === 'high' && (
              <span style={{ fontSize: 9, color: '#E8935A', fontWeight: 800 }}>PRIORITÉ</span>
            )}
            {task.duration_minutes && task.duration_minutes !== 60 && (
              <span style={{ fontSize: 9, color: '#9A8B94' }}>{task.duration_minutes}min</span>
            )}
          </div>
        </div>
        {task.flow_type && (
          <div style={{
            width: 6, height: 6, borderRadius: 3, flexShrink: 0, marginTop: 6,
            background: task.flow_type === 'physique' ? '#5DAB8B' : task.flow_type === 'info' ? '#5B8DB8' : '#9B7DC4',
          }} />
        )}
      </div>
    </button>
  )
}

// ─── Add Task Modal ───
function AddTaskModal({ event, roles, userProfiles, onClose, onDone, onToast: _legacyToast }) {
  const toast = useToast()
  const onToast = _legacyToast || toast
  const { orgId } = useProject()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('autre')
  const [assignedRole, setAssignedRole] = useState('TM')
  const [hourOffset, setHourOffset] = useState(0)
  const [duration, setDuration] = useState(60)
  const [flowType, setFlowType] = useState('both')
  const [priority, setPriority] = useState('medium')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!title.trim()) return
    setSaving(true)
    try {
      await db.insert('event_tasks', {
        event_id: event.id,
        org_id: orgId,
        assigned_role: assignedRole,
        title: title.trim(),
        description: description.trim() || null,
        category,
        hour_offset: parseInt(hourOffset),
        duration_minutes: parseInt(duration),
        flow_type: flowType,
        priority,
        status: 'pending',
      })
      onToast?.('Tâche ajoutée ✓')
      onDone()
    } catch (e) {
      onToast?.('Erreur: ' + e.message, '#D4648A')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ padding: '20px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#3D3042' }}>Nouvelle tâche</div>
            <button onClick={onClose} aria-label="Fermer" style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 4,
            }}>{createElement(X, { size: 20, color: '#9A8B94' })}</button>
          </div>

          {/* Title */}
          <div style={{ marginBottom: 14 }}>
            <label className="label">Titre *</label>
            <input className="input" value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Ex: Soundcheck principal" />
          </div>

          {/* Description */}
          <div style={{ marginBottom: 14 }}>
            <label className="label">Description</label>
            <textarea className="input" value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Détails optionnels..." rows={2}
              style={{ resize: 'none', minHeight: 48 }} />
          </div>

          {/* Hour offset */}
          <div style={{ marginBottom: 14 }}>
            <label className="label">Heure (relatif à l'événement)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input type="range" min={-24} max={24} value={hourOffset}
                onChange={e => setHourOffset(e.target.value)}
                style={{ flex: 1 }} />
              <span style={{
                fontSize: 13, fontWeight: 800, minWidth: 50, textAlign: 'center',
                color: hourOffset == 0 ? '#E8735A' : '#5B8DB8',
              }}>
                {hourOffset == 0 ? 'SHOW' : `H${hourOffset > 0 ? '+' : ''}${hourOffset}`}
              </span>
            </div>
          </div>

          {/* Role assignment */}
          <div style={{ marginBottom: 14 }}>
            <label className="label">Rôle assigné</label>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {ROLE_ORDER.map(code => {
                const c = ROLE_CONF[code]
                if (!c) return null
                return (
                  <button key={code} onClick={() => setAssignedRole(code)} style={{
                    padding: '5px 8px', borderRadius: 8, fontSize: 10, fontWeight: 700,
                    cursor: 'pointer',
                    background: assignedRole === code ? `${c.color}15` : 'white',
                    color: assignedRole === code ? c.color : '#9A8B94',
                    border: `1.5px solid ${assignedRole === code ? c.color + '40' : '#E8DED8'}`,
                  }}>{code}</button>
                )
              })}
            </div>
          </div>

          {/* Category */}
          <div style={{ marginBottom: 14 }}>
            <label className="label">Catégorie</label>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {CATEGORIES.map(cat => (
                <button key={cat.id} onClick={() => setCategory(cat.id)} style={{
                  padding: '5px 8px', borderRadius: 8, fontSize: 10, fontWeight: 700,
                  cursor: 'pointer',
                  background: category === cat.id ? `${cat.color}15` : 'white',
                  color: category === cat.id ? cat.color : '#9A8B94',
                  border: `1.5px solid ${category === cat.id ? cat.color + '40' : '#E8DED8'}`,
                }}>{cat.label}</button>
              ))}
            </div>
          </div>

          {/* Flow type */}
          <div style={{ marginBottom: 14 }}>
            <label className="label">Type de flux</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {FLOW_TYPES.map(f => (
                <button key={f.id} onClick={() => setFlowType(f.id)} style={{
                  flex: 1, padding: '8px 4px', borderRadius: 8, fontSize: 10, fontWeight: 700,
                  cursor: 'pointer', textAlign: 'center',
                  background: flowType === f.id ? `${f.color}15` : 'white',
                  color: flowType === f.id ? f.color : '#9A8B94',
                  border: `1.5px solid ${flowType === f.id ? f.color + '40' : '#E8DED8'}`,
                }}>{f.label}</button>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div style={{ marginBottom: 14 }}>
            <label className="label">Priorité</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {PRIORITIES.map(p => (
                <button key={p.id} onClick={() => setPriority(p.id)} style={{
                  flex: 1, padding: '8px 4px', borderRadius: 8, fontSize: 10, fontWeight: 700,
                  cursor: 'pointer', textAlign: 'center',
                  background: priority === p.id ? `${p.color}15` : 'white',
                  color: priority === p.id ? p.color : '#9A8B94',
                  border: `1.5px solid ${priority === p.id ? p.color + '40' : '#E8DED8'}`,
                }}>{p.label}</button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div style={{ marginBottom: 20 }}>
            <label className="label">Durée (minutes)</label>
            <input className="input" type="number" value={duration}
              onChange={e => setDuration(e.target.value.replace(/[^0-9]/g, ''))}
              min={5} max={480} />
          </div>

          {/* Save */}
          <button className="btn-primary" onClick={handleSave} disabled={!title.trim() || saving}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {saving ? '⏳ Enregistrement...' : <>Ajouter la tâche</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Stat Box ───
function StatBox({ label, value, color }) {
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
