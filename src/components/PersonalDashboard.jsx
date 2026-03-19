import React, { useState, useEffect } from 'react'
import { LayoutDashboard, FolderOpen, Calendar, Zap, ChevronRight, User } from 'lucide-react'
import { safe } from '../lib/supabase'
import { ROLE_CONF } from './RolePicker'
import { useToast } from '../shared/hooks'

export default function PersonalDashboard({
  user, userDetails, allProjects,
  onOpenProject, onNavigate, onToast: _legacyToast,
}) {
  const toast = useToast()
  const onToast = _legacyToast || toast
  const [allEvents, setAllEvents] = useState([])
  const [loadingEvents, setLoadingEvents] = useState(true)

  // Load events from all projects
  useEffect(() => {
    if (!allProjects || allProjects.length === 0) {
      setAllEvents([])
      setLoadingEvents(false)
      return
    }
    let cancelled = false
    const load = async () => {
      setLoadingEvents(true)
      const results = []
      for (const p of allProjects) {
        try {
          const events = await safe('events', `org_id=eq.${p.org_id}&order=date.asc`)
          events.forEach(e => results.push({ ...e, _project: p }))
        } catch { /* skip */ }
      }
      if (!cancelled) {
        setAllEvents(results)
        setLoadingEvents(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [allProjects])

  const displayName = userDetails?.first_name
    || userDetails?.company_name
    || user?.email?.split('@')[0]
    || 'Pro'

  const profilePercent = userDetails ? computeProfilePercent(userDetails) : 0

  // Next 5 events across all projects
  const now = new Date().toISOString().slice(0, 10)
  const upcoming = allEvents
    .filter(e => e.date >= now)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5)

  return (
    <div style={{ padding: '0 16px 24px' }}>
      {/* Welcome card */}
      <div style={{
        padding: '22px 18px', marginBottom: 16, borderRadius: 12,
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: userDetails?.avatar_url
              ? `url(${userDetails.avatar_url}) center/cover`
              : 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 600, color: '#1E293B',
            border: '2px solid var(--border)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          }}>
            {!userDetails?.avatar_url && (displayName[0] || '?').toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>
              Salut {displayName} !
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
              {allProjects.length} projet{allProjects.length > 1 ? 's' : ''} actif{allProjects.length > 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Profile completion */}
        {profilePercent < 100 && (
          <button onClick={() => onNavigate('profile')} style={{
            marginTop: 14, width: '100%', padding: '10px 14px', borderRadius: 8,
            background: 'var(--bg-hover)', border: '1px solid var(--border)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', marginBottom: 4 }}>
                Profil complete a {profilePercent}%
              </div>
              <div style={{
                height: 6, borderRadius: 3, background: 'var(--bg-hover)', overflow: 'hidden',
              }}>
                <div style={{
                  width: `${profilePercent}%`, height: '100%', borderRadius: 3,
                  background: 'var(--accent)',
                }} />
              </div>
            </div>
            <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>Completer</span>
          </button>
        )}
      </div>

      {/* Mes projets en cours */}
      <SectionTitle icon={LayoutDashboard} title="Mes projets" action="Voir tout" onAction={() => onNavigate('projects')} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        {allProjects.length === 0 && (
          <div style={{
            padding: 20, textAlign: 'center', borderRadius: 12,
            background: 'var(--bg-surface)', border: '1px solid var(--border)',
          }}>
            <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Aucun projet pour le moment</div>
          </div>
        )}
        {allProjects.slice(0, 3).map(p => (
          <ProjectCard key={p.id} project={p} events={allEvents.filter(e => e.org_id === p.org_id)} onOpen={() => onOpenProject(p)} />
        ))}
        {allProjects.length > 3 && (
          <button onClick={() => onNavigate('projects')} style={{
            padding: 10, borderRadius: 8, fontSize: 12, fontWeight: 500,
            background: 'var(--accent-subtle)', border: '1px solid var(--border)', color: 'var(--accent)',
            cursor: 'pointer', textAlign: 'center',
          }}>+ {allProjects.length - 3} autre{allProjects.length - 3 > 1 ? 's' : ''} projet{allProjects.length - 3 > 1 ? 's' : ''}</button>
        )}
      </div>

      {/* Prochaines dates */}
      <SectionTitle icon={Calendar} title="Prochaines dates" action="Calendrier" onAction={() => onNavigate('calendar')} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
        {loadingEvents && (
          <div style={{
            padding: 16, textAlign: 'center', borderRadius: 12,
            background: 'var(--bg-surface)', border: '1px solid var(--border)',
          }}>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Chargement...</div>
          </div>
        )}
        {!loadingEvents && upcoming.length === 0 && (
          <div style={{
            padding: 20, textAlign: 'center', borderRadius: 12,
            background: 'var(--bg-surface)', border: '1px solid var(--border)',
          }}>
            <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Aucune date a venir</div>
          </div>
        )}
        {upcoming.map(ev => (
          <EventRow key={ev.id} event={ev} onOpen={() => onOpenProject(ev._project)} />
        ))}
      </div>

      {/* Actions rapides */}
      <SectionTitle icon={Zap} title="Actions rapides" />
      <div style={{ display: 'flex', gap: 10 }}>
        {allProjects.length > 0 && (
          <QuickAction icon={LayoutDashboard} label="Ouvrir projet" onClick={() => onOpenProject(allProjects[0])} />
        )}
        <QuickAction icon={FolderOpen} label="Mes projets" onClick={() => onNavigate('projects')} />
        <QuickAction icon={User} label="Mon profil" onClick={() => onNavigate('profile')} />
      </div>
    </div>
  )
}

// ─── Sub-components ───

function SectionTitle({ icon: Icon, title, action, onAction }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 2px', marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 600, color: 'var(--text-secondary)' }}>
        <Icon size={16} />
        {title}
      </div>
      {action && (
        <button onClick={onAction} style={{
          display: 'flex', alignItems: 'center', gap: 2,
          fontSize: 11, fontWeight: 500, color: 'var(--accent)', background: 'none',
          border: 'none', cursor: 'pointer', padding: 0,
        }}>
          {action}
          <ChevronRight size={14} />
        </button>
      )}
    </div>
  )
}

function ProjectCard({ project, events, onOpen }) {
  const now = new Date().toISOString().slice(0, 10)
  const nextEvent = events.filter(e => e.date >= now).sort((a, b) => a.date.localeCompare(b.date))[0]
  const roleConf = project.role_code ? ROLE_CONF[project.role_code] : null

  return (
    <button onClick={onOpen} style={{
      width: '100%', padding: '16px', textAlign: 'left', cursor: 'pointer',
      borderRadius: 12, background: 'var(--bg-surface)', border: '1px solid var(--border)',
      borderLeft: `3px solid ${roleConf?.color || 'var(--accent)'}`,
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: 'var(--accent-subtle)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--accent)',
        }}>
          <LayoutDashboard size={20} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
            {project.org?.name || 'Projet'}
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
            {project.is_admin && (
              <span style={{
                padding: '1px 7px', borderRadius: 6, fontSize: 9, fontWeight: 600,
                background: 'var(--accent-subtle)', color: 'var(--accent)',
              }}>Admin</span>
            )}
            {roleConf && (
              <span style={{
                padding: '1px 7px', borderRadius: 6, fontSize: 9, fontWeight: 600,
                background: `${roleConf.color}15`, color: roleConf.color,
              }}>
                {roleConf.label}
              </span>
            )}
          </div>
          {nextEvent && (
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>
              Prochain : {nextEvent.name || nextEvent.venue} — {formatDate(nextEvent.date)}
            </div>
          )}
        </div>
        <ChevronRight size={18} style={{ color: 'var(--text-tertiary)' }} />
      </div>
    </button>
  )
}

function EventRow({ event, onOpen }) {
  const daysLeft = Math.ceil((parseLocalDate(event.date) - new Date()) / 86400000)
  const isUrgent = daysLeft <= 7
  return (
    <button onClick={onOpen} style={{
      width: '100%', padding: '12px 14px', textAlign: 'left', cursor: 'pointer',
      borderRadius: 12, background: 'var(--bg-surface)', border: '1px solid var(--border)',
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 8,
          background: isUrgent ? 'rgba(212,100,138,0.1)' : 'var(--accent-subtle)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column',
        }}>
          <div style={{
            fontSize: 13, fontWeight: 600, lineHeight: 1,
            color: isUrgent ? '#D4648A' : 'var(--accent)',
          }}>
            {daysLeft <= 0 ? 'J' : `J-${daysLeft}`}
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 13, fontWeight: 500, color: 'var(--text-primary)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {event.name || event.venue || 'Concert'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 1 }}>
            {formatDate(event.date)} — {event._project?.org?.name || 'Projet'}
          </div>
        </div>
        {event.venue && (
          <div style={{
            fontSize: 10, color: 'var(--text-tertiary)', fontWeight: 500,
            maxWidth: 80, textAlign: 'right',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {event.venue}
          </div>
        )}
      </div>
    </button>
  )
}

function QuickAction({ icon: Icon, label, onClick }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, padding: '14px 8px', borderRadius: 12, textAlign: 'center',
      background: 'var(--bg-surface)', border: '1px solid var(--border)', cursor: 'pointer',
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    }}>
      <div style={{
        display: 'flex', justifyContent: 'center', marginBottom: 4,
        color: 'var(--accent)',
      }}>
        <Icon size={22} />
      </div>
      <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)' }}>{label}</div>
    </button>
  )
}

// Parse "2026-03-20" as LOCAL date (not UTC) to avoid timezone shift
function parseLocalDate(d) {
  if (!d) return new Date()
  const [y, m, day] = d.split('-').map(Number)
  return new Date(y, m - 1, day)
}

function formatDate(d) {
  if (!d) return ''
  return parseLocalDate(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

function computeProfilePercent(d) {
  const fields = ['first_name', 'last_name', 'phone', 'address_city', 'bio', 'siret', 'iban']
  if (d.account_type === 'legal') {
    fields.splice(0, 2, 'company_name', 'legal_form')
  }
  const filled = fields.filter(f => d[f] && String(d[f]).trim()).length
  return Math.round((filled / fields.length) * 100)
}
