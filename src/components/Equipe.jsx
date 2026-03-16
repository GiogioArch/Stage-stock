import React, { useState, useMemo, createElement } from 'react'
import { Badge, Modal } from './UI'
import { ROLE_CONF } from './RolePicker'
import { db, safe } from '../lib/supabase'
import {
  ChevronDown, ChevronRight, ChevronLeft, User, Mail, Phone, Calendar,
  CheckCircle2, Circle, Clock, MapPin, AlertTriangle, Star,
  Briefcase, ClipboardList, CalendarDays, Users, Eye, Search,
  ArrowRight, Link2, Shield, Zap, Crown, UserCheck, Network,
  MoreVertical, Edit3, Trash2, Plus, Filter, X,
} from 'lucide-react'

// ─── Hiérarchie des rôles ───
// 3 niveaux : Direction → Chefs techniques → Opérateurs
const HIERARCHY = {
  direction: {
    label: 'Direction',
    color: '#6366F1',
    icon: Crown,
    codes: ['TM', 'PM'],
    description: 'Pilotage stratégique et décisionnel de la tournée',
  },
  chefs: {
    label: 'Chefs Techniques',
    color: '#14B8A6',
    icon: Shield,
    codes: ['TD', 'SE', 'LD', 'SM'],
    description: 'Responsables de département, coordination technique',
  },
  operateurs: {
    label: 'Opérateurs',
    color: '#E8935A',
    icon: Zap,
    codes: ['BL', 'MM', 'LOG', 'SAFE', 'AA', 'PA'],
    description: 'Exécution terrain, logistique et support',
  },
}

// Liens inter-rôles : qui reporte à qui, qui collabore avec qui
const ROLE_RELATIONS = {
  TM: { reportsTo: null, supervises: ['PM', 'MM', 'LOG', 'SAFE', 'AA'], collaborates: ['PM'] },
  PM: { reportsTo: 'TM', supervises: ['TD', 'SE', 'LD', 'SM', 'PA'], collaborates: ['TM'] },
  TD: { reportsTo: 'PM', supervises: ['BL'], collaborates: ['SE', 'LD', 'SM'] },
  SE: { reportsTo: 'PM', supervises: [], collaborates: ['TD', 'LD', 'BL'] },
  LD: { reportsTo: 'PM', supervises: [], collaborates: ['TD', 'SE', 'SM'] },
  SM: { reportsTo: 'PM', supervises: [], collaborates: ['TD', 'LD', 'SE'] },
  BL: { reportsTo: 'TD', supervises: [], collaborates: ['SE', 'SM'] },
  MM: { reportsTo: 'TM', supervises: [], collaborates: ['LOG', 'PA'] },
  LOG: { reportsTo: 'TM', supervises: [], collaborates: ['MM', 'SAFE', 'SM'] },
  SAFE: { reportsTo: 'TM', supervises: [], collaborates: ['SM', 'LOG'] },
  AA: { reportsTo: 'TM', supervises: [], collaborates: ['PA', 'SE'] },
  PA: { reportsTo: 'PM', supervises: [], collaborates: ['AA', 'MM', 'LOG'] },
}

const ROLE_ORDER = ['TM', 'PM', 'TD', 'SE', 'LD', 'SM', 'BL', 'MM', 'LOG', 'SAFE', 'AA', 'PA']

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

// ─── Missions par rôle ───
const ROLE_MISSIONS = {
  TM: [
    'Coordination générale de la tournée',
    'Interface avec les promoteurs et organisateurs',
    'Gestion du budget et des contrats',
    'Décisions opérationnelles en temps réel',
    'Supervision de toute l\'équipe terrain',
  ],
  PM: [
    'Planification technique des événements',
    'Coordination des départements techniques',
    'Gestion des fiches techniques',
    'Validation du rider et des besoins',
    'Suivi des prestataires locaux',
  ],
  TD: [
    'Direction technique globale',
    'Validation des montages et installations',
    'Sécurité technique des installations',
    'Coordination son/lumière/scène/backline',
    'Interface avec les régisseurs locaux',
  ],
  SE: [
    'Sonorisation façade et retours',
    'Calage système et mix live',
    'Maintenance du parc audio',
    'Sound check et balance artiste',
    'Gestion des fichiers et presets',
  ],
  LD: [
    'Conception du plan lumière',
    'Programmation et conduite lumière',
    'Maintenance du parc éclairage',
    'Adaptation aux contraintes locales',
    'Coordination avec la vidéo',
  ],
  SM: [
    'Régie scène et changements de plateau',
    'Gestion de l\'espace scénique',
    'Coordination des entrées/sorties artistes',
    'Supervision du montage/démontage',
    'Plan de scène et marquage',
  ],
  BL: [
    'Préparation et accord des instruments',
    'Maintenance du backline',
    'Setup et changements sur scène',
    'Gestion des amplis, pédales, accessoires',
    'Stock cordes, peaux, consommables',
  ],
  MM: [
    'Gestion du stock merchandising',
    'Ventes sur site et comptabilité caisse',
    'Réapprovisionnement et prévisions',
    'Installation/démontage du stand',
    'Rapport de ventes post-concert',
  ],
  LOG: [
    'Organisation des transports inter-îles',
    'Chargement/déchargement du matériel',
    'Gestion des véhicules et prestataires',
    'Suivi des manifestes de transport',
    'Coordination avec les dépôts',
  ],
  SAFE: [
    'Plan de sécurité pour chaque site',
    'Coordination avec la sécurité locale',
    'Gestion des accès et accréditations',
    'Protocoles d\'urgence',
    'Sécurité du matériel stocké',
  ],
  AA: [
    'Accompagnement quotidien de l\'artiste',
    'Gestion du planning artiste',
    'Coordination loges et catering',
    'Interface artiste/production',
    'Suivi des besoins personnels',
  ],
  PA: [
    'Support administratif à la production',
    'Gestion documentaire (contrats, riders)',
    'Coordination logistique quotidienne',
    'Suivi des deadlines et livrables',
    'Backup opérationnel multi-postes',
  ],
}

function getHierarchyLevel(code) {
  for (const [level, data] of Object.entries(HIERARCHY)) {
    if (data.codes.includes(code)) return level
  }
  return 'operateurs'
}

function getHierarchyInfo(code) {
  const level = getHierarchyLevel(code)
  return HIERARCHY[level]
}

// ═══════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════
export default function Equipe({
  roles, userProfiles, eventPacking, events, userRole,
  eventTasks, checklists, userAvailability, user,
  orgId, onReload, onToast,
}) {
  const [view, setView] = useState('organigramme')
  const [expandedRole, setExpandedRole] = useState(null)
  const [expandedLevel, setExpandedLevel] = useState('direction')
  const [selectedMember, setSelectedMember] = useState(null)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [searchQuery, setSearchQuery] = useState('')

  const today = new Date().toISOString().split('T')[0]

  // ─── Computed data ───
  const allMembers = useMemo(() => {
    return (userProfiles || []).map(p => {
      const role = (roles || []).find(r => r.id === p.role_id)
      const code = role?.code
      const conf = code ? (ROLE_CONF[code] || { icon: ClipboardList, color: '#9A8B94', label: role.name }) : null
      const memberTasks = (eventTasks || []).filter(t =>
        t.assigned_user_id === p.user_id || (!t.assigned_user_id && t.assigned_role === code)
      )
      const availability = (userAvailability || []).filter(a => a.user_id === p.user_id)
      const packing = (eventPacking || []).filter(ep =>
        ep.role_code === code && (events || []).find(e => e.id === ep.event_id && e.date >= today)
      )
      const hierarchyLevel = code ? getHierarchyLevel(code) : null
      const relations = code ? ROLE_RELATIONS[code] : null
      const missions = code ? (ROLE_MISSIONS[code] || []) : []
      return {
        ...p, role, roleCode: code, roleConf: conf, memberTasks, availability,
        packing, hierarchyLevel, relations, missions,
      }
    }).sort((a, b) => {
      const ai = ROLE_ORDER.indexOf(a.roleCode)
      const bi = ROLE_ORDER.indexOf(b.roleCode)
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
    })
  }, [userProfiles, roles, eventTasks, userAvailability, eventPacking, events, today])

  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return allMembers
    const q = searchQuery.toLowerCase()
    return allMembers.filter(m =>
      (m.display_name || '').toLowerCase().includes(q) ||
      (m.pseudo || '').toLowerCase().includes(q) ||
      (m.roleConf?.label || '').toLowerCase().includes(q) ||
      (m.roleCode || '').toLowerCase().includes(q)
    )
  }, [allMembers, searchQuery])

  const teamByRole = useMemo(() => {
    return ROLE_ORDER.map(code => {
      const role = (roles || []).find(r => r.code === code)
      if (!role) return null
      const conf = ROLE_CONF[code] || { icon: ClipboardList, color: '#9A8B94', label: role.name }
      const members = allMembers.filter(m => m.roleCode === code)
      const roleTasks = (eventTasks || []).filter(t => t.assigned_role === code && t.status !== 'done')
      const upcomingPacking = (eventPacking || []).filter(ep =>
        ep.role_code === code && (events || []).find(e => e.id === ep.event_id && e.date >= today)
      )
      const packDone = upcomingPacking.filter(ep => ep.packed).length
      const packTotal = upcomingPacking.length
      return { code, role, conf, members, pendingTasks: roleTasks.length, packDone, packTotal }
    }).filter(Boolean)
  }, [roles, allMembers, eventTasks, eventPacking, events, today])

  const upcomingEvents = useMemo(() =>
    (events || []).filter(e => e.date >= today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 10),
    [events, today]
  )

  const dayTasks = useMemo(() => {
    return (eventTasks || []).filter(t => {
      const evt = (events || []).find(e => e.id === t.event_id)
      if (!evt) return false
      const eventDate = new Date(evt.date + 'T00:00:00')
      const taskDate = new Date(eventDate.getTime() + t.hour_offset * 3600000)
      return taskDate.toISOString().split('T')[0] === selectedDate
    }).sort((a, b) => a.hour_offset - b.hour_offset)
  }, [eventTasks, events, selectedDate])

  // KPIs
  const totalMembers = allMembers.length
  const assignedRoles = teamByRole.filter(t => t.members.length > 0).length
  const totalPendingTasks = (eventTasks || []).filter(t => t.status !== 'done').length
  const nextEvent = upcomingEvents[0]

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
      onToast?.('Erreur: ' + e.message, '#DC2626')
    }
  }

  // Helper to find member by role code
  const getMembersByRole = (code) => allMembers.filter(m => m.roleCode === code)

  return (
    <div style={{ padding: '0 16px 24px' }}>

      {/* ─── Header KPI ─── */}
      <div className="card" style={{
        marginBottom: 16, padding: '18px 16px',
        background: 'linear-gradient(135deg, #6366F108, #6366F118)',
        border: '1.5px solid #6366F125',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', boxShadow: '0 4px 16px #6366F130',
          }}>{createElement(Users, { size: 24 })}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#1E293B' }}>Équipe</div>
            <div style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>
              {totalMembers} membre{totalMembers > 1 ? 's' : ''} · {assignedRoles}/{teamByRole.length} rôles pourvus
            </div>
          </div>
          {nextEvent && (
            <div style={{
              padding: '6px 10px', borderRadius: 8, background: '#6366F110',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 9, color: '#6366F1', fontWeight: 700 }}>PROCHAIN</div>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#1E293B' }}>
                {new Date(nextEvent.date + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
              </div>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <KpiBox label="Membres" value={totalMembers} color="#6366F1" />
          <KpiBox label="Rôles actifs" value={assignedRoles} color="#14B8A6" />
          <KpiBox label="Tâches" value={totalPendingTasks} color="#E8935A" />
          <KpiBox label="Événements" value={upcomingEvents.length} color="#8B5CF6" />
        </div>
      </div>

      {/* ─── View toggle ─── */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: 16, padding: 3,
        background: '#F1F5F9', borderRadius: 12,
      }}>
        {[
          { id: 'organigramme', label: 'Organigramme', icon: Network },
          { id: 'membres', label: 'Membres', icon: Users },
          { id: 'planning', label: 'Planning', icon: CalendarDays },
        ].map(v => (
          <button key={v.id} onClick={() => { setView(v.id); setSelectedMember(null) }} style={{
            flex: 1, padding: '9px 4px', borderRadius: 10, fontSize: 11, fontWeight: 700,
            cursor: 'pointer', textAlign: 'center',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            background: view === v.id ? 'white' : 'transparent',
            color: view === v.id ? '#1E293B' : '#94A3B8',
            border: 'none',
            boxShadow: view === v.id ? '0 1px 3px #0001' : 'none',
            transition: 'all 0.2s',
          }}>
            {createElement(v.icon, { size: 13 })}
            {v.label}
          </button>
        ))}
      </div>

      {/* ═══ VIEW: ORGANIGRAMME (HIÉRARCHIE) ═══ */}
      {view === 'organigramme' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {Object.entries(HIERARCHY).map(([level, data]) => {
            const isExpanded = expandedLevel === level
            const levelMembers = allMembers.filter(m => data.codes.includes(m.roleCode))
            const levelRoles = teamByRole.filter(t => data.codes.includes(t.code))

            return (
              <div key={level}>
                {/* Level header */}
                <button
                  onClick={() => setExpandedLevel(isExpanded ? null : level)}
                  className="card"
                  style={{
                    width: '100%', padding: '16px', cursor: 'pointer', textAlign: 'left',
                    background: isExpanded ? `${data.color}08` : 'white',
                    borderLeft: `4px solid ${data.color}`,
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 12,
                      background: `${data.color}12`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {createElement(data.icon, { size: 22, color: data.color })}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 900, color: data.color }}>
                        {data.label}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748B' }}>
                        {data.description}
                      </div>
                    </div>
                    <div style={{ textAlign: 'center', marginRight: 4 }}>
                      <div style={{ fontSize: 16, fontWeight: 900, color: data.color }}>
                        {levelMembers.length}
                      </div>
                      <div style={{ fontSize: 8, color: '#94A3B8', fontWeight: 600 }}>
                        membre{levelMembers.length > 1 ? 's' : ''}
                      </div>
                    </div>
                    <span style={{
                      transition: 'transform 0.2s',
                      transform: isExpanded ? 'rotate(180deg)' : 'none',
                      color: '#94A3B8',
                    }}>
                      {createElement(ChevronDown, { size: 16 })}
                    </span>
                  </div>
                </button>

                {/* Level content */}
                {isExpanded && (
                  <div style={{
                    margin: '0 4px', padding: '12px',
                    background: `${data.color}04`,
                    borderRadius: '0 0 14px 14px',
                    border: `1px solid ${data.color}15`,
                    borderTop: 'none',
                  }}>
                    {/* Connection lines visual */}
                    {level !== 'direction' && (
                      <div style={{
                        textAlign: 'center', padding: '0 0 10px',
                        fontSize: 10, color: '#94A3B8', fontWeight: 600,
                      }}>
                        {createElement(ArrowRight, { size: 12, style: { verticalAlign: 'middle', transform: 'rotate(90deg)' } })}
                        {' '}Reporte à {level === 'chefs' ? 'Direction' : 'Chefs Techniques'}
                      </div>
                    )}

                    {levelRoles.map(t => (
                      <div key={t.code} style={{ marginBottom: 10 }}>
                        {/* Role card within level */}
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '12px', background: 'white', borderRadius: 12,
                          border: `1px solid ${t.conf.color}20`,
                          marginBottom: t.members.length > 0 ? 6 : 0,
                        }}>
                          <div style={{
                            width: 38, height: 38, borderRadius: 10,
                            background: `${t.conf.color}12`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            {createElement(t.conf.icon, { size: 20, color: t.conf.color })}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 800, color: '#1E293B' }}>
                              {t.conf.label}
                            </div>
                            <div style={{ fontSize: 10, color: '#64748B' }}>
                              {t.members.length > 0
                                ? `${t.members.length} membre${t.members.length > 1 ? 's' : ''}`
                                : 'Poste vacant'}
                              {t.pendingTasks > 0 && ` · ${t.pendingTasks} tâche${t.pendingTasks > 1 ? 's' : ''}`}
                            </div>
                          </div>
                          {/* Relations indicator */}
                          {ROLE_RELATIONS[t.code] && (
                            <div style={{
                              display: 'flex', alignItems: 'center', gap: 2,
                            }}>
                              {createElement(Link2, { size: 12, color: '#94A3B8' })}
                              <span style={{ fontSize: 9, color: '#94A3B8', fontWeight: 700 }}>
                                {(ROLE_RELATIONS[t.code].collaborates || []).length}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Members under this role */}
                        {t.members.map((m, i) => (
                          <button key={i} onClick={() => setSelectedMember(m)} style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '10px 12px 10px 24px',
                            background: 'white', borderRadius: 10,
                            border: '1px solid #E2E8F020',
                            width: '100%', cursor: 'pointer', textAlign: 'left',
                            marginBottom: 4, marginLeft: 16,
                            borderLeft: `3px solid ${t.conf.color}40`,
                          }}>
                            <div style={{
                              width: 32, height: 32, borderRadius: 8,
                              background: `${t.conf.color}12`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 13, fontWeight: 800, color: t.conf.color,
                            }}>
                              {(m.display_name || m.pseudo || '?')[0].toUpperCase()}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 12, fontWeight: 700, color: '#1E293B' }}>
                                {m.display_name || m.pseudo || 'Membre'}
                              </div>
                              <div style={{ fontSize: 10, color: '#64748B' }}>
                                {m.memberTasks.filter(tk => tk.status !== 'done').length} tâche{m.memberTasks.filter(tk => tk.status !== 'done').length !== 1 ? 's' : ''} en cours
                              </div>
                            </div>
                            {user && m.user_id === user.id && <Badge color={t.conf.color}>Moi</Badge>}
                            {createElement(ChevronRight, { size: 14, color: '#94A3B8' })}
                          </button>
                        ))}

                        {t.members.length === 0 && (
                          <div style={{
                            marginLeft: 16, padding: '8px 12px',
                            fontSize: 11, color: '#94A3B8', fontStyle: 'italic',
                          }}>
                            Aucun membre assigné
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ═══ VIEW: MEMBRES (TROMBINOSCOPE) ═══ */}
      {view === 'membres' && (
        <div>
          {/* Search bar */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
            background: '#F8FAFC', borderRadius: 12, border: '1px solid #E2E8F0',
            marginBottom: 14,
          }}>
            {createElement(Search, { size: 16, color: '#94A3B8' })}
            <input
              type="text"
              placeholder="Rechercher un membre ou un rôle..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                flex: 1, border: 'none', background: 'none', outline: 'none',
                fontSize: 13, color: '#1E293B',
              }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 2,
              }}>
                {createElement(X, { size: 14, color: '#94A3B8' })}
              </button>
            )}
          </div>

          {/* Members grid */}
          {filteredMembers.length === 0 ? (
            <div className="empty-state" style={{ padding: 40 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>
                {createElement(Users, { size: 48, color: '#E2E8F0' })}
              </div>
              <div className="empty-text">{searchQuery ? 'Aucun résultat' : 'Aucun membre dans l\'équipe'}</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filteredMembers.map((m, i) => {
                const pendingCount = m.memberTasks.filter(t => t.status !== 'done').length
                const doneCount = m.memberTasks.filter(t => t.status === 'done').length
                const totalTasks = m.memberTasks.length
                const completionRate = totalTasks > 0 ? Math.round((doneCount / totalTasks) * 100) : 0
                const hierInfo = m.roleCode ? getHierarchyInfo(m.roleCode) : null

                return (
                  <button key={i} onClick={() => setSelectedMember(m)} className="card" style={{
                    display: 'flex', alignItems: 'center', gap: 14, padding: '16px',
                    width: '100%', cursor: 'pointer', textAlign: 'left',
                    borderLeft: m.roleConf ? `4px solid ${m.roleConf.color}` : '4px solid #E2E8F0',
                  }}>
                    {/* Avatar */}
                    <div style={{ position: 'relative' }}>
                      <div style={{
                        width: 50, height: 50, borderRadius: 14,
                        background: m.roleConf ? `${m.roleConf.color}12` : '#F1F5F9',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 20, fontWeight: 900, color: m.roleConf?.color || '#94A3B8',
                        border: `2px solid ${m.roleConf?.color || '#E2E8F0'}25`,
                      }}>
                        {(m.display_name || m.pseudo || '?')[0].toUpperCase()}
                      </div>
                      {/* Hierarchy badge */}
                      {hierInfo && (
                        <div style={{
                          position: 'absolute', bottom: -3, right: -3,
                          width: 18, height: 18, borderRadius: 6,
                          background: hierInfo.color,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          border: '2px solid white',
                        }}>
                          {createElement(hierInfo.icon, { size: 10, color: 'white' })}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: '#1E293B' }}>
                          {m.display_name || m.pseudo || 'Membre'}
                        </span>
                        {user && m.user_id === user.id && (
                          <span style={{
                            fontSize: 9, fontWeight: 700, color: '#6366F1',
                            padding: '1px 6px', borderRadius: 4, background: '#6366F110',
                          }}>MOI</span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                        {m.roleConf && (
                          <span style={{ fontSize: 11, fontWeight: 700, color: m.roleConf.color }}>
                            {m.roleConf.label}
                          </span>
                        )}
                        {hierInfo && (
                          <span style={{
                            fontSize: 9, color: hierInfo.color, fontWeight: 600,
                            padding: '1px 5px', borderRadius: 4, background: `${hierInfo.color}10`,
                          }}>{hierInfo.label}</span>
                        )}
                      </div>
                      {/* Mini progress */}
                      {totalTasks > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                          <div style={{
                            flex: 1, height: 4, borderRadius: 2, background: '#F1F5F9',
                            maxWidth: 100,
                          }}>
                            <div style={{
                              width: `${completionRate}%`, height: '100%', borderRadius: 2,
                              background: completionRate >= 80 ? '#10B981' : completionRate >= 50 ? '#E8935A' : '#94A3B8',
                              transition: 'width 0.3s',
                            }} />
                          </div>
                          <span style={{ fontSize: 10, color: '#64748B', fontWeight: 600 }}>
                            {doneCount}/{totalTasks}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Right stats */}
                    <div style={{ textAlign: 'right' }}>
                      {pendingCount > 0 && (
                        <div style={{
                          fontSize: 11, fontWeight: 800, color: '#E8935A',
                          display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end',
                        }}>
                          {createElement(Clock, { size: 12 })}
                          {pendingCount}
                        </div>
                      )}
                      {m.packing.length > 0 && (
                        <div style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>
                          {m.packing.filter(p => p.packed).length}/{m.packing.length} pack
                        </div>
                      )}
                    </div>

                    {createElement(ChevronRight, { size: 16, color: '#CBD5E1' })}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══ VIEW: PLANNING JOURNALIER ═══ */}
      {view === 'planning' && (
        <div>
          {/* Date selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <button onClick={() => {
              const d = new Date(selectedDate)
              d.setDate(d.getDate() - 1)
              setSelectedDate(d.toISOString().split('T')[0])
            }} style={{
              width: 36, height: 36, borderRadius: 10, background: 'white',
              border: '1px solid #E2E8F0', cursor: 'pointer', fontSize: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>‹</button>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#1E293B' }}>
                {new Date(selectedDate + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </div>
              {selectedDate === today && (
                <div style={{ fontSize: 10, color: '#10B981', fontWeight: 700 }}>Aujourd'hui</div>
              )}
            </div>
            <button onClick={() => {
              const d = new Date(selectedDate)
              d.setDate(d.getDate() + 1)
              setSelectedDate(d.toISOString().split('T')[0])
            }} style={{
              width: 36, height: 36, borderRadius: 10, background: 'white',
              border: '1px solid #E2E8F0', cursor: 'pointer', fontSize: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>›</button>
          </div>

          {/* Quick jump to event dates */}
          {upcomingEvents.length > 0 && (
            <div style={{
              display: 'flex', gap: 6, marginBottom: 14, overflowX: 'auto',
              WebkitOverflowScrolling: 'touch', paddingBottom: 4,
            }}>
              {upcomingEvents.slice(0, 6).map(evt => (
                <button key={evt.id} onClick={() => setSelectedDate(evt.date)} style={{
                  padding: '6px 12px', borderRadius: 8, whiteSpace: 'nowrap',
                  fontSize: 11, fontWeight: 700, cursor: 'pointer',
                  background: selectedDate === evt.date ? '#6366F110' : '#F8FAFC',
                  color: selectedDate === evt.date ? '#6366F1' : '#64748B',
                  border: `1px solid ${selectedDate === evt.date ? '#6366F130' : '#E2E8F0'}`,
                  flexShrink: 0,
                }}>
                  {new Date(evt.date + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                </button>
              ))}
            </div>
          )}

          {/* Events on selected date */}
          {upcomingEvents.filter(e => e.date === selectedDate).map(evt => (
            <div key={evt.id} className="card" style={{
              padding: '12px 14px', marginBottom: 12,
              borderLeft: '4px solid #6366F1',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {createElement(Calendar, { size: 16, color: '#6366F1' })}
                <span style={{ fontSize: 13, fontWeight: 800, color: '#1E293B' }}>{evt.name}</span>
              </div>
              {evt.lieu && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  {createElement(MapPin, { size: 12, color: '#94A3B8' })}
                  <span style={{ fontSize: 11, color: '#94A3B8' }}>{evt.lieu}{evt.ville ? `, ${evt.ville}` : ''}</span>
                </div>
              )}
            </div>
          ))}

          {/* Tasks grouped by role */}
          {dayTasks.length === 0 ? (
            <div className="empty-state" style={{ padding: 32 }}>
              <div style={{ marginBottom: 8 }}>
                {createElement(CalendarDays, { size: 40, color: '#E2E8F0' })}
              </div>
              <div className="empty-text">Aucune tâche pour cette date</div>
              <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>
                Utilisez le mode événement pour planifier les tâches
              </div>
            </div>
          ) : (
            <div>
              {/* Group tasks by role */}
              {ROLE_ORDER.filter(code =>
                dayTasks.some(t => t.assigned_role === code)
              ).map(code => {
                const conf = ROLE_CONF[code] || { icon: ClipboardList, color: '#94A3B8', label: code }
                const roleDayTasks = dayTasks.filter(t => t.assigned_role === code)
                const roleMember = getMembersByRole(code)

                return (
                  <div key={code} style={{ marginBottom: 14 }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 0', marginBottom: 6,
                    }}>
                      {createElement(conf.icon, { size: 16, color: conf.color })}
                      <span style={{ fontSize: 12, fontWeight: 800, color: conf.color }}>{conf.label}</span>
                      {roleMember.length > 0 && (
                        <span style={{ fontSize: 10, color: '#94A3B8' }}>
                          — {roleMember.map(m => m.display_name || m.pseudo).join(', ')}
                        </span>
                      )}
                      <span style={{
                        marginLeft: 'auto', fontSize: 10, fontWeight: 700,
                        color: '#64748B', padding: '2px 6px', borderRadius: 4,
                        background: '#F1F5F9',
                      }}>{roleDayTasks.length}</span>
                    </div>

                    {roleDayTasks.map(task => {
                      const statusConf = TASK_STATUS_CONF[task.status] || TASK_STATUS_CONF.pending
                      const catColor = CATEGORY_COLORS[task.category] || '#94A3B8'
                      const hour = task.hour_offset >= 0 ? `H+${task.hour_offset}` : `H${task.hour_offset}`
                      return (
                        <button key={task.id} onClick={() => handleTaskToggle(task)} className="card" style={{
                          padding: '10px 14px', width: '100%', cursor: 'pointer', textAlign: 'left',
                          borderLeft: `3px solid ${catColor}`,
                          opacity: task.status === 'done' ? 0.55 : 1,
                          marginBottom: 4,
                        }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                            <div style={{ paddingTop: 1 }}>
                              {createElement(statusConf.icon, { size: 16, color: statusConf.color })}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{
                                fontSize: 12, fontWeight: 700, color: '#1E293B',
                                textDecoration: task.status === 'done' ? 'line-through' : 'none',
                              }}>{task.title}</div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
                                <span style={{
                                  fontSize: 10, fontWeight: 800, color: '#6366F1',
                                  padding: '1px 6px', borderRadius: 4, background: '#6366F108',
                                  fontFamily: 'monospace',
                                }}>{hour}</span>
                                {task.priority === 'critical' && (
                                  <span style={{ fontSize: 9, color: '#DC2626', fontWeight: 800 }}>CRITIQUE</span>
                                )}
                                {task.priority === 'high' && (
                                  <span style={{ fontSize: 9, color: '#E8935A', fontWeight: 800 }}>PRIORITÉ</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══ MEMBER DETAIL BOTTOM SHEET ═══ */}
      {selectedMember && (
        <div
          onClick={() => setSelectedMember(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(15,23,42,0.35)',
            backdropFilter: 'blur(2px)',
            WebkitBackdropFilter: 'blur(2px)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            animation: 'fadeIn 0.15s ease',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 480,
              maxHeight: '82vh',
              background: 'white',
              borderRadius: '20px 20px 0 0',
              boxShadow: '0 -8px 40px rgba(0,0,0,0.15)',
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
              animation: 'slideUp 0.25s ease',
              padding: '0 0 env(safe-area-inset-bottom, 16px)',
            }}
          >
            {/* Drag handle */}
            <div style={{
              display: 'flex', justifyContent: 'center', padding: '10px 0 4px',
              position: 'sticky', top: 0, background: 'white', zIndex: 1,
              borderRadius: '20px 20px 0 0',
            }}>
              <div style={{
                width: 36, height: 4, borderRadius: 2, background: '#E2E8F0',
              }} />
            </div>
            <div style={{ padding: '0 16px 24px' }}>
              <MemberDetail
                member={selectedMember}
                allMembers={allMembers}
                roles={roles}
                events={events}
                eventTasks={eventTasks}
                eventPacking={eventPacking}
                checklists={checklists}
                userAvailability={userAvailability}
                user={user}
                today={today}
                upcomingEvents={upcomingEvents}
                onBack={() => setSelectedMember(null)}
                onSelectMember={setSelectedMember}
                onTaskToggle={handleTaskToggle}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════
// MEMBER DETAIL — Fiche complète
// ═══════════════════════════════════════════════
function MemberDetail({
  member, allMembers, roles, events, eventTasks, eventPacking,
  checklists, userAvailability, user, today, upcomingEvents,
  onBack, onSelectMember, onTaskToggle,
}) {
  const [subTab, setSubTab] = useState('apercu')

  const role = (roles || []).find(r => r.id === member.role_id)
  const code = role?.code
  const conf = code ? (ROLE_CONF[code] || { icon: ClipboardList, color: '#9A8B94', label: role.name }) : null
  const isMe = user && member.user_id === user.id
  const hierInfo = code ? getHierarchyInfo(code) : null
  const relations = code ? ROLE_RELATIONS[code] : null
  const missions = code ? (ROLE_MISSIONS[code] || []) : []

  // Member's tasks
  const myTasks = useMemo(() => {
    return (eventTasks || []).filter(t =>
      t.assigned_user_id === member.user_id || (!t.assigned_user_id && t.assigned_role === code)
    ).sort((a, b) => {
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

  // Related members (supervisor, supervised, collaborators)
  const relatedMembers = useMemo(() => {
    if (!relations) return { supervisor: null, supervised: [], collaborators: [] }
    const supervisor = relations.reportsTo
      ? allMembers.find(m => m.roleCode === relations.reportsTo) || null
      : null
    const supervised = (relations.supervises || [])
      .flatMap(rc => allMembers.filter(m => m.roleCode === rc))
    const collaborators = (relations.collaborates || [])
      .flatMap(rc => allMembers.filter(m => m.roleCode === rc))
    return { supervisor, supervised, collaborators }
  }, [relations, allMembers])

  // Stats
  const pendingTasks = myTasks.filter(t => t.status !== 'done').length
  const doneTasks = myTasks.filter(t => t.status === 'done').length
  const totalTasks = myTasks.length
  const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0
  const packDone = myPacking.filter(p => p.packed).length
  const availableCount = myAvailability.filter(a => a.status === 'available').length

  // Tasks by event
  const tasksByEvent = useMemo(() => {
    const grouped = {}
    myTasks.forEach(t => {
      const evt = (events || []).find(e => e.id === t.event_id)
      const key = evt?.id || 'unlinked'
      if (!grouped[key]) grouped[key] = { event: evt, tasks: [] }
      grouped[key].tasks.push(t)
    })
    return Object.values(grouped).sort((a, b) => {
      if (!a.event) return 1
      if (!b.event) return -1
      return (a.event.date || '').localeCompare(b.event.date || '')
    })
  }, [myTasks, events])

  return (
    <div>
      {/* ─── Profile card ─── */}
      <div className="card" style={{
        padding: '24px 16px 20px', marginBottom: 16, textAlign: 'center',
        background: conf ? `linear-gradient(180deg, ${conf.color}08, white)` : 'white',
        borderTop: `4px solid ${conf?.color || '#E2E8F0'}`,
        position: 'relative',
      }}>
        {/* Close button */}
        <button onClick={onBack} style={{
          position: 'absolute', top: 10, right: 10,
          width: 30, height: 30, borderRadius: 8,
          background: '#F1F5F9', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {createElement(X, { size: 16, color: '#94A3B8' })}
        </button>
        {/* Avatar */}
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20, margin: '0 auto 14px',
            background: conf ? `${conf.color}12` : '#F1F5F9',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 30, fontWeight: 900, color: conf?.color || '#94A3B8',
            border: `3px solid ${conf?.color || '#E2E8F0'}25`,
          }}>
            {(member.display_name || member.pseudo || '?')[0].toUpperCase()}
          </div>
          {hierInfo && (
            <div style={{
              position: 'absolute', bottom: 10, right: -4,
              padding: '3px 8px', borderRadius: 6,
              background: hierInfo.color, color: 'white',
              fontSize: 8, fontWeight: 800, border: '2px solid white',
              display: 'flex', alignItems: 'center', gap: 3,
            }}>
              {createElement(hierInfo.icon, { size: 9 })}
              {hierInfo.label.split(' ')[0]}
            </div>
          )}
        </div>

        <div style={{ fontSize: 20, fontWeight: 900, color: '#1E293B' }}>
          {member.display_name || member.pseudo || 'Membre'}
          {isMe && <span style={{ fontSize: 12, color: conf?.color, marginLeft: 6 }}>(moi)</span>}
        </div>

        {conf && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 6 }}>
            {createElement(conf.icon, { size: 16, color: conf.color })}
            <span style={{ fontSize: 14, fontWeight: 700, color: conf.color }}>{conf.label}</span>
          </div>
        )}

        {member.email && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8 }}>
            {createElement(Mail, { size: 12, color: '#94A3B8' })}
            <span style={{ fontSize: 12, color: '#94A3B8' }}>{member.email}</span>
          </div>
        )}

        {/* ─── Stats row ─── */}
        <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
          <KpiBox label="À faire" value={pendingTasks} color="#E8935A" />
          <KpiBox label="Fait" value={doneTasks} color="#10B981" />
          <KpiBox label="Packing" value={myPacking.length > 0 ? `${packDone}/${myPacking.length}` : '—'} color="#2563EB" />
          <KpiBox label="Dispo" value={availableCount > 0 ? `${availableCount}/${upcomingEvents.length}` : '—'} color="#8B5CF6" />
        </div>

        {/* Completion bar */}
        {totalTasks > 0 && (
          <div style={{ marginTop: 14 }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', marginBottom: 4,
            }}>
              <span style={{ fontSize: 10, color: '#64748B', fontWeight: 600 }}>Progression tâches</span>
              <span style={{ fontSize: 10, fontWeight: 800, color: completionRate >= 80 ? '#10B981' : '#E8935A' }}>
                {completionRate}%
              </span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: '#F1F5F9' }}>
              <div style={{
                width: `${completionRate}%`, height: '100%', borderRadius: 3,
                background: completionRate >= 80 ? '#10B981' : completionRate >= 50 ? '#E8935A' : '#94A3B8',
                transition: 'width 0.5s ease',
              }} />
            </div>
          </div>
        )}
      </div>

      {/* ─── Sub-tabs ─── */}
      <div style={{
        display: 'flex', gap: 3, marginBottom: 14, padding: 3,
        background: '#F1F5F9', borderRadius: 10, overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}>
        {[
          { id: 'apercu', label: 'Aperçu' },
          { id: 'missions', label: 'Missions' },
          { id: 'taches', label: `Tâches (${totalTasks})` },
          { id: 'relations', label: 'Liens' },
          { id: 'dispo', label: 'Dispo' },
        ].map(s => (
          <button key={s.id} onClick={() => setSubTab(s.id)} style={{
            flex: 1, padding: '7px 6px', borderRadius: 8, fontSize: 10, fontWeight: 700,
            cursor: 'pointer', textAlign: 'center', whiteSpace: 'nowrap',
            background: subTab === s.id ? 'white' : 'transparent',
            color: subTab === s.id ? '#1E293B' : '#94A3B8',
            border: 'none',
            boxShadow: subTab === s.id ? '0 1px 3px #0001' : 'none',
          }}>{s.label}</button>
        ))}
      </div>

      {/* ─── SUB: Aperçu ─── */}
      {subTab === 'apercu' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Role description */}
          {role?.description && (
            <div className="card" style={{ padding: '14px 16px' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#94A3B8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
                Description du rôle
              </div>
              <div style={{ fontSize: 13, color: '#1E293B', lineHeight: 1.6 }}>{role.description}</div>
            </div>
          )}

          {/* Hierarchy position */}
          {hierInfo && relations && (
            <div className="card" style={{ padding: '14px 16px' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#94A3B8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
                Position dans l'équipe
              </div>
              {relations.reportsTo && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  {createElement(ArrowRight, { size: 12, color: '#94A3B8', style: { transform: 'rotate(-90deg)' } })}
                  <span style={{ fontSize: 12, color: '#64748B' }}>
                    Reporte à <strong style={{ color: ROLE_CONF[relations.reportsTo]?.color }}>{ROLE_CONF[relations.reportsTo]?.label}</strong>
                  </span>
                </div>
              )}
              {relations.supervises.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  {createElement(ArrowRight, { size: 12, color: '#94A3B8', style: { transform: 'rotate(90deg)' } })}
                  <span style={{ fontSize: 12, color: '#64748B' }}>
                    Supervise {relations.supervises.map(c => (
                      <strong key={c} style={{ color: ROLE_CONF[c]?.color }}>{ROLE_CONF[c]?.label}</strong>
                    )).reduce((prev, curr) => [prev, ', ', curr])}
                  </span>
                </div>
              )}
              {relations.collaborates.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {createElement(Link2, { size: 12, color: '#94A3B8' })}
                  <span style={{ fontSize: 12, color: '#64748B' }}>
                    Collabore avec {relations.collaborates.map(c => (
                      <strong key={c} style={{ color: ROLE_CONF[c]?.color }}>{ROLE_CONF[c]?.label}</strong>
                    )).reduce((prev, curr) => [prev, ', ', curr])}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Next tasks preview */}
          <div className="card" style={{ padding: '14px 16px' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#94A3B8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
              Prochaines tâches
            </div>
            {myTasks.filter(t => t.status !== 'done').slice(0, 4).map(task => {
              const statusConf = TASK_STATUS_CONF[task.status]
              const evt = (events || []).find(e => e.id === task.event_id)
              return (
                <div key={task.id} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 0',
                  borderBottom: '1px solid #F1F5F9',
                }}>
                  {createElement(statusConf.icon, { size: 14, color: statusConf.color })}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</div>
                    {evt && <div style={{ fontSize: 10, color: '#94A3B8' }}>{evt.name}</div>}
                  </div>
                  {task.priority === 'critical' && createElement(AlertTriangle, { size: 12, color: '#DC2626' })}
                  {task.priority === 'high' && createElement(AlertTriangle, { size: 12, color: '#E8935A' })}
                </div>
              )
            })}
            {myTasks.filter(t => t.status !== 'done').length === 0 && (
              <div style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', padding: 12 }}>
                Aucune tâche en attente
              </div>
            )}
            {myTasks.filter(t => t.status !== 'done').length > 4 && (
              <button onClick={() => setSubTab('taches')} style={{
                width: '100%', padding: '8px 0', background: 'none', border: 'none',
                cursor: 'pointer', fontSize: 11, fontWeight: 700, color: '#6366F1',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
              }}>
                Voir les {myTasks.filter(t => t.status !== 'done').length} tâches
                {createElement(ChevronRight, { size: 12 })}
              </button>
            )}
          </div>

          {/* Next event availability */}
          {upcomingEvents.slice(0, 2).map(evt => {
            const avail = myAvailability.find(a => a.event_id === evt.id)
            const statusMap = {
              available: { color: '#10B981', label: 'Dispo' },
              unavailable: { color: '#DC2626', label: 'Absent' },
              maybe: { color: '#E8935A', label: 'Incertain' },
            }
            const status = avail ? (statusMap[avail.status] || { color: '#94A3B8', label: '?' }) : { color: '#94A3B8', label: 'Non renseigné' }
            return (
              <div key={evt.id} className="card" style={{
                padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10,
              }}>
                {createElement(Calendar, { size: 16, color: '#6366F1' })}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#1E293B' }}>{evt.name}</div>
                  <div style={{ fontSize: 10, color: '#94A3B8' }}>
                    {new Date(evt.date + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                  </div>
                </div>
                <span style={{
                  fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 6,
                  background: `${status.color}12`, color: status.color,
                }}>{status.label}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* ─── SUB: Missions ─── */}
      {subTab === 'missions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Role missions */}
          <div className="card" style={{ padding: '16px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14,
            }}>
              {conf && createElement(conf.icon, { size: 20, color: conf.color })}
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#1E293B' }}>
                  Missions — {conf?.label || 'Rôle'}
                </div>
                {hierInfo && (
                  <div style={{ fontSize: 10, color: hierInfo.color, fontWeight: 600 }}>
                    Niveau : {hierInfo.label}
                  </div>
                )}
              </div>
            </div>

            {missions.map((mission, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '10px 0',
                borderBottom: i < missions.length - 1 ? '1px solid #F1F5F9' : 'none',
              }}>
                <div style={{
                  width: 24, height: 24, borderRadius: 7, flexShrink: 0,
                  background: `${conf?.color || '#94A3B8'}10`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 800, color: conf?.color || '#94A3B8',
                }}>{i + 1}</div>
                <div style={{ fontSize: 13, color: '#1E293B', lineHeight: 1.5, paddingTop: 2 }}>
                  {mission}
                </div>
              </div>
            ))}
          </div>

          {/* Responsabilités spécifiques (from role deps) */}
          {role?.dependency_codes && role.dependency_codes.length > 0 && (
            <div className="card" style={{ padding: '14px 16px' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#94A3B8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
                Coordination requise
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {role.dependency_codes.map(depCode => {
                  const depConf = ROLE_CONF[depCode]
                  return depConf ? (
                    <span key={depCode} style={{
                      fontSize: 11, fontWeight: 700, padding: '4px 10px',
                      borderRadius: 8, background: `${depConf.color}10`,
                      color: depConf.color,
                    }}>{depConf.label}</span>
                  ) : null
                })}
              </div>
            </div>
          )}

          {/* Packing responsibility */}
          {myPacking.length > 0 && (
            <div className="card" style={{ padding: '14px 16px' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#94A3B8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
                Responsabilité Packing
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <div style={{
                  fontSize: 22, fontWeight: 900,
                  color: packDone === myPacking.length ? '#10B981' : '#E8935A',
                }}>
                  {Math.round((packDone / myPacking.length) * 100)}%
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#1E293B' }}>
                    {packDone}/{myPacking.length} items packés
                  </div>
                  <div style={{ fontSize: 10, color: '#94A3B8' }}>
                    pour les prochains événements
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── SUB: Tâches (par événement) ─── */}
      {subTab === 'taches' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {tasksByEvent.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24, color: '#94A3B8', fontSize: 12 }}>
              Aucune tâche assignée
            </div>
          ) : (
            tasksByEvent.map(({ event: evt, tasks }) => (
              <div key={evt?.id || 'unlinked'}>
                {/* Event header */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 0', marginBottom: 6,
                }}>
                  {createElement(Calendar, { size: 14, color: '#6366F1' })}
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#1E293B' }}>
                    {evt?.name || 'Sans événement'}
                  </span>
                  {evt?.date && (
                    <span style={{ fontSize: 10, color: '#94A3B8' }}>
                      {new Date(evt.date + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </span>
                  )}
                  <span style={{
                    marginLeft: 'auto', fontSize: 10, fontWeight: 700,
                    color: tasks.filter(t => t.status === 'done').length === tasks.length ? '#10B981' : '#64748B',
                  }}>
                    {tasks.filter(t => t.status === 'done').length}/{tasks.length}
                  </span>
                </div>

                {tasks.map(task => {
                  const statusConf = TASK_STATUS_CONF[task.status] || TASK_STATUS_CONF.pending
                  const catColor = CATEGORY_COLORS[task.category] || '#94A3B8'
                  return (
                    <button key={task.id} onClick={() => onTaskToggle(task)} className="card" style={{
                      padding: '10px 14px', width: '100%', cursor: 'pointer', textAlign: 'left',
                      borderLeft: `3px solid ${catColor}`,
                      opacity: task.status === 'done' ? 0.55 : 1,
                      marginBottom: 4,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        {createElement(statusConf.icon, { size: 16, color: statusConf.color })}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: 12, fontWeight: 700, color: '#1E293B',
                            textDecoration: task.status === 'done' ? 'line-through' : 'none',
                          }}>{task.title}</div>
                          {task.description && (
                            <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>{task.description}</div>
                          )}
                          <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                            <span style={{
                              fontSize: 10, fontWeight: 800, color: '#6366F1',
                              padding: '1px 6px', borderRadius: 4, background: '#6366F108',
                              fontFamily: 'monospace',
                            }}>
                              {task.hour_offset >= 0 ? `H+${task.hour_offset}` : `H${task.hour_offset}`}
                            </span>
                            <span style={{
                              fontSize: 9, padding: '1px 5px', borderRadius: 4,
                              background: `${catColor}10`, color: catColor, fontWeight: 700,
                            }}>{task.category}</span>
                            {task.priority === 'critical' && (
                              <span style={{ fontSize: 9, color: '#DC2626', fontWeight: 800 }}>CRITIQUE</span>
                            )}
                            {task.flow_type && (
                              <span style={{
                                fontSize: 8, padding: '1px 5px', borderRadius: 4,
                                background: task.flow_type === 'physique' ? '#10B98110' : '#2563EB10',
                                color: task.flow_type === 'physique' ? '#10B981' : '#2563EB',
                                fontWeight: 700,
                              }}>
                                {task.flow_type === 'physique' ? 'PHY' : task.flow_type === 'info' ? 'INFO' : 'PHY+INFO'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>
      )}

      {/* ─── SUB: Relations (liens inter-membres) ─── */}
      {subTab === 'relations' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Supervisor */}
          {relatedMembers.supervisor && (
            <div className="card" style={{ padding: '14px 16px' }}>
              <div style={{
                fontSize: 11, fontWeight: 800, color: '#94A3B8', marginBottom: 10,
                textTransform: 'uppercase', letterSpacing: 1,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                {createElement(Crown, { size: 12 })} Supérieur hiérarchique
              </div>
              <MemberMiniCard
                member={relatedMembers.supervisor}
                onSelect={onSelectMember}
                user={user}
              />
            </div>
          )}

          {/* Supervised */}
          {relatedMembers.supervised.length > 0 && (
            <div className="card" style={{ padding: '14px 16px' }}>
              <div style={{
                fontSize: 11, fontWeight: 800, color: '#94A3B8', marginBottom: 10,
                textTransform: 'uppercase', letterSpacing: 1,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                {createElement(UserCheck, { size: 12 })} Supervise ({relatedMembers.supervised.length})
              </div>
              {relatedMembers.supervised.map((m, i) => (
                <div key={i} style={{ marginBottom: i < relatedMembers.supervised.length - 1 ? 8 : 0 }}>
                  <MemberMiniCard member={m} onSelect={onSelectMember} user={user} />
                </div>
              ))}
            </div>
          )}

          {/* Collaborators */}
          {relatedMembers.collaborators.length > 0 && (
            <div className="card" style={{ padding: '14px 16px' }}>
              <div style={{
                fontSize: 11, fontWeight: 800, color: '#94A3B8', marginBottom: 10,
                textTransform: 'uppercase', letterSpacing: 1,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                {createElement(Link2, { size: 12 })} Collaborateurs ({relatedMembers.collaborators.length})
              </div>
              {relatedMembers.collaborators.map((m, i) => (
                <div key={i} style={{ marginBottom: i < relatedMembers.collaborators.length - 1 ? 8 : 0 }}>
                  <MemberMiniCard member={m} onSelect={onSelectMember} user={user} />
                </div>
              ))}
            </div>
          )}

          {/* No relations */}
          {!relatedMembers.supervisor && relatedMembers.supervised.length === 0 && relatedMembers.collaborators.length === 0 && (
            <div style={{ textAlign: 'center', padding: 24, color: '#94A3B8', fontSize: 12 }}>
              Aucune relation définie pour ce rôle
            </div>
          )}

          {/* Shared tasks with related members */}
          {(relatedMembers.supervised.length > 0 || relatedMembers.collaborators.length > 0) && (
            <div className="card" style={{ padding: '14px 16px' }}>
              <div style={{
                fontSize: 11, fontWeight: 800, color: '#94A3B8', marginBottom: 10,
                textTransform: 'uppercase', letterSpacing: 1,
              }}>
                Vue d'ensemble tâches liées
              </div>
              {[...relatedMembers.supervised, ...relatedMembers.collaborators]
                .filter((m, i, arr) => arr.findIndex(x => x.user_id === m.user_id) === i) // dedupe
                .map(m => {
                  const pending = m.memberTasks.filter(t => t.status !== 'done').length
                  const done = m.memberTasks.filter(t => t.status === 'done').length
                  return (
                    <div key={m.user_id} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '6px 0',
                      borderBottom: '1px solid #F1F5F9',
                    }}>
                      <div style={{
                        width: 24, height: 24, borderRadius: 7,
                        background: `${m.roleConf?.color || '#94A3B8'}12`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, fontWeight: 800, color: m.roleConf?.color || '#94A3B8',
                      }}>
                        {(m.display_name || '?')[0].toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#1E293B' }}>
                          {m.display_name || m.pseudo}
                        </span>
                        <span style={{ fontSize: 10, color: m.roleConf?.color, marginLeft: 6 }}>
                          {m.roleConf?.label}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        {pending > 0 && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#E8935A' }}>{pending}</span>
                        )}
                        <span style={{ fontSize: 10, color: '#10B981', fontWeight: 700 }}>{done}✓</span>
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </div>
      )}

      {/* ─── SUB: Disponibilité ─── */}
      {subTab === 'dispo' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Stats banner */}
          <div className="card" style={{
            padding: '12px 16px', display: 'flex', gap: 12, justifyContent: 'center',
          }}>
            {[
              { label: 'Dispo', count: myAvailability.filter(a => a.status === 'available').length, color: '#10B981' },
              { label: 'Absent', count: myAvailability.filter(a => a.status === 'unavailable').length, color: '#DC2626' },
              { label: 'Incertain', count: myAvailability.filter(a => a.status === 'maybe').length, color: '#E8935A' },
              { label: 'Non renseigné', count: upcomingEvents.length - myAvailability.length, color: '#94A3B8' },
            ].filter(s => s.count > 0).map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: s.color }}>{s.count}</div>
                <div style={{ fontSize: 9, color: '#64748B', fontWeight: 600 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Events list */}
          {(events || []).filter(e => e.date >= today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 12).map(evt => {
            const avail = myAvailability.find(a => a.event_id === evt.id)
            const statusMap = {
              available: { color: '#10B981', label: 'Disponible', bg: '#10B98110' },
              unavailable: { color: '#DC2626', label: 'Indisponible', bg: '#DC262610' },
              maybe: { color: '#E8935A', label: 'Peut-être', bg: '#E8935A10' },
            }
            const status = avail ? (statusMap[avail.status] || { color: '#94A3B8', label: 'Inconnu', bg: '#94A3B810' }) : { color: '#94A3B8', label: 'Non renseigné', bg: '#94A3B810' }
            const tasksForEvent = myTasks.filter(t => t.event_id === evt.id)

            return (
              <div key={evt.id} className="card" style={{
                padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <div style={{
                  width: 42, textAlign: 'center', flexShrink: 0,
                }}>
                  <div style={{ fontSize: 16, fontWeight: 900, color: '#1E293B' }}>
                    {new Date(evt.date + 'T12:00:00').getDate()}
                  </div>
                  <div style={{ fontSize: 9, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase' }}>
                    {new Date(evt.date + 'T12:00:00').toLocaleDateString('fr-FR', { month: 'short' })}
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {evt.name}
                  </div>
                  <div style={{ fontSize: 10, color: '#94A3B8' }}>
                    {evt.lieu ? evt.lieu : ''}
                    {tasksForEvent.length > 0 && ` · ${tasksForEvent.length} tâche${tasksForEvent.length > 1 ? 's' : ''}`}
                  </div>
                </div>
                <span style={{
                  fontSize: 10, fontWeight: 800, padding: '4px 10px', borderRadius: 8,
                  background: status.bg, color: status.color, whiteSpace: 'nowrap',
                }}>{status.label}</span>
              </div>
            )
          })}
          {(events || []).filter(e => e.date >= today).length === 0 && (
            <div style={{ textAlign: 'center', padding: 20, color: '#94A3B8', fontSize: 12 }}>
              Aucun événement à venir
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════
// MemberMiniCard — for relations tab
// ═══════════════════════════════════════════════
function MemberMiniCard({ member, onSelect, user }) {
  const conf = member.roleConf
  const isMe = user && member.user_id === user.id
  const pendingCount = member.memberTasks.filter(t => t.status !== 'done').length

  return (
    <button onClick={() => onSelect(member)} style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 12px', background: '#F8FAFC', borderRadius: 10,
      border: '1px solid #E2E8F0', width: '100%', cursor: 'pointer', textAlign: 'left',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: conf ? `${conf.color}12` : '#F1F5F9',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, fontWeight: 800, color: conf?.color || '#94A3B8',
      }}>
        {(member.display_name || member.pseudo || '?')[0].toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#1E293B' }}>
            {member.display_name || member.pseudo || 'Membre'}
          </span>
          {isMe && <span style={{ fontSize: 9, color: '#6366F1', fontWeight: 700 }}>(moi)</span>}
        </div>
        {conf && (
          <div style={{ fontSize: 11, color: conf.color, fontWeight: 600 }}>{conf.label}</div>
        )}
      </div>
      {pendingCount > 0 && (
        <span style={{
          fontSize: 10, fontWeight: 700, color: '#E8935A',
          padding: '2px 6px', borderRadius: 4, background: '#E8935A10',
        }}>{pendingCount} tâche{pendingCount > 1 ? 's' : ''}</span>
      )}
      {createElement(ChevronRight, { size: 14, color: '#CBD5E1' })}
    </button>
  )
}

// ─── KPI Box ───
function KpiBox({ label, value, color }) {
  return (
    <div style={{
      flex: 1, textAlign: 'center', padding: '8px 4px',
      background: 'white', borderRadius: 10, border: '1px solid #F1F5F9',
    }}>
      <div style={{ fontSize: 16, fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 8, color: '#64748B', fontWeight: 700, marginTop: 2 }}>{label}</div>
    </div>
  )
}
