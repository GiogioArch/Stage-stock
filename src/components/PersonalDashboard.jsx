import React, { useState, useEffect } from 'react'
import { safe } from '../lib/supabase'
import { ROLE_CONF } from './RolePicker'

export default function PersonalDashboard({
  user, userDetails, allProjects,
  onOpenProject, onNavigate, onToast,
}) {
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
      {/* ─── Welcome card ─── */}
      <div className="card" style={{
        padding: '22px 18px', marginBottom: 16,
        background: 'linear-gradient(135deg, #9B7DC415, #E8735A08)',
        border: '1.5px solid #9B7DC420',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: userDetails?.avatar_url ? `url(${userDetails.avatar_url}) center/cover` : 'linear-gradient(135deg, #9B7DC4, #E8735A)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, color: 'white',
            border: '3px solid white', boxShadow: '0 4px 16px rgba(155,125,196,0.2)',
          }}>
            {!userDetails?.avatar_url && (displayName[0] || '?').toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#3D3042' }}>
              Salut {displayName} !
            </div>
            <div style={{ fontSize: 12, color: '#9A8B94', marginTop: 2 }}>
              {allProjects.length} projet{allProjects.length > 1 ? 's' : ''} actif{allProjects.length > 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Profile completion */}
        {profilePercent < 100 && (
          <button onClick={() => onNavigate('profile')} style={{
            marginTop: 14, width: '100%', padding: '10px 14px', borderRadius: 12,
            background: 'white', border: '1.5px solid #9B7DC430', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#9B7DC4', marginBottom: 4 }}>
                Profil complété à {profilePercent}%
              </div>
              <div style={{
                height: 6, borderRadius: 3, background: '#E8DED8', overflow: 'hidden',
              }}>
                <div style={{
                  width: `${profilePercent}%`, height: '100%', borderRadius: 3,
                  background: 'linear-gradient(90deg, #9B7DC4, #E8735A)',
                }} />
              </div>
            </div>
            <span style={{ fontSize: 12, color: '#9B7DC4', fontWeight: 800 }}>Compléter</span>
          </button>
        )}
      </div>

      {/* ─── Mes projets en cours ─── */}
      <SectionTitle icon="🎪" title="Mes projets" action="Voir tout" onAction={() => onNavigate('projects')} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        {allProjects.length === 0 && (
          <div className="card" style={{ padding: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: '#9A8B94' }}>Aucun projet pour le moment</div>
          </div>
        )}
        {allProjects.slice(0, 3).map(p => (
          <ProjectCard key={p.id} project={p} events={allEvents.filter(e => e.org_id === p.org_id)} onOpen={() => onOpenProject(p)} />
        ))}
        {allProjects.length > 3 && (
          <button onClick={() => onNavigate('projects')} style={{
            padding: 10, borderRadius: 12, fontSize: 12, fontWeight: 700,
            background: '#EEF4FA', border: '1.5px solid #5B8DB830', color: '#5B8DB8',
            cursor: 'pointer', textAlign: 'center',
          }}>+ {allProjects.length - 3} autre{allProjects.length - 3 > 1 ? 's' : ''} projet{allProjects.length - 3 > 1 ? 's' : ''}</button>
        )}
      </div>

      {/* ─── Prochaines dates ─── */}
      <SectionTitle icon="📅" title="Prochaines dates" action="Calendrier" onAction={() => onNavigate('calendar')} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
        {loadingEvents && (
          <div className="card" style={{ padding: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: '#9A8B94' }}>Chargement...</div>
          </div>
        )}
        {!loadingEvents && upcoming.length === 0 && (
          <div className="card" style={{ padding: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: '#9A8B94' }}>Aucune date à venir</div>
          </div>
        )}
        {upcoming.map(ev => (
          <EventRow key={ev.id} event={ev} onOpen={() => onOpenProject(ev._project)} />
        ))}
      </div>

      {/* ─── Mon matériel (aperçu) ─── */}
      <SectionTitle icon="📦" title="Mon matériel" />
      <div className="card" style={{ padding: '24px 16px', textAlign: 'center', opacity: 0.6, marginBottom: 20 }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>📦</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#3D3042' }}>Matériel personnel</div>
        <div style={{ fontSize: 11, color: '#9A8B94', marginTop: 4 }}>Bientôt disponible</div>
      </div>

      {/* ─── Raccourcis rapides ─── */}
      <SectionTitle icon="⚡" title="Actions rapides" />
      <div style={{ display: 'flex', gap: 10 }}>
        {allProjects.length > 0 && (
          <QuickAction icon="🎪" label="Ouvrir projet" color="#E8735A" onClick={() => onOpenProject(allProjects[0])} />
        )}
        <QuickAction icon="📁" label="Mes projets" color="#5B8DB8" onClick={() => onNavigate('projects')} />
        <QuickAction icon="👤" label="Mon profil" color="#9B7DC4" onClick={() => onNavigate('profile')} />
      </div>
    </div>
  )
}

// ─── Sub-components ───

function SectionTitle({ icon, title, action, onAction }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 2px', marginBottom: 10 }}>
      <div style={{ fontSize: 15, fontWeight: 900, color: '#3D3042' }}>{icon} {title}</div>
      {action && (
        <button onClick={onAction} style={{
          fontSize: 11, fontWeight: 700, color: '#9B7DC4', background: 'none',
          border: 'none', cursor: 'pointer', padding: 0,
        }}>{action} →</button>
      )}
    </div>
  )
}

function ProjectCard({ project, events, onOpen }) {
  const now = new Date().toISOString().slice(0, 10)
  const nextEvent = events.filter(e => e.date >= now).sort((a, b) => a.date.localeCompare(b.date))[0]
  const roleConf = project.role_code ? ROLE_CONF[project.role_code] : null

  return (
    <button onClick={onOpen} className="card" style={{
      width: '100%', padding: '16px', textAlign: 'left', cursor: 'pointer',
      borderLeft: `4px solid ${roleConf?.color || '#E8735A'}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 14,
          background: `linear-gradient(135deg, ${roleConf?.color || '#E8735A'}15, ${roleConf?.color || '#E8735A'}08)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
        }}>{project.org?.logo || '🎪'}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#3D3042' }}>{project.org?.name || 'Projet'}</div>
          <div style={{ display: 'flex', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
            {project.is_admin && (
              <span style={{ padding: '1px 7px', borderRadius: 6, fontSize: 9, fontWeight: 800, background: '#E8735A15', color: '#E8735A' }}>Admin</span>
            )}
            {roleConf && (
              <span style={{ padding: '1px 7px', borderRadius: 6, fontSize: 9, fontWeight: 800, background: `${roleConf.color}15`, color: roleConf.color }}>
                {roleConf.icon} {roleConf.label}
              </span>
            )}
          </div>
          {nextEvent && (
            <div style={{ fontSize: 11, color: '#9A8B94', marginTop: 4 }}>
              Prochain : {nextEvent.name || nextEvent.venue} — {formatDate(nextEvent.date)}
            </div>
          )}
        </div>
        <div style={{ fontSize: 18, color: '#B8A0AE' }}>→</div>
      </div>
    </button>
  )
}

function EventRow({ event, onOpen }) {
  const daysLeft = Math.ceil((new Date(event.date) - new Date()) / 86400000)
  return (
    <button onClick={onOpen} className="card" style={{
      width: '100%', padding: '12px 14px', textAlign: 'left', cursor: 'pointer',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: daysLeft <= 7 ? '#E8735A12' : '#5B8DB812',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column',
        }}>
          <div style={{ fontSize: 13, fontWeight: 900, color: daysLeft <= 7 ? '#E8735A' : '#5B8DB8', lineHeight: 1 }}>
            {daysLeft <= 0 ? 'J' : `J-${daysLeft}`}
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#3D3042', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {event.name || event.venue || 'Concert'}
          </div>
          <div style={{ fontSize: 11, color: '#9A8B94', marginTop: 1 }}>
            {formatDate(event.date)} — {event._project?.org?.name || 'Projet'}
          </div>
        </div>
        {event.venue && (
          <div style={{ fontSize: 10, color: '#B8A0AE', fontWeight: 600, maxWidth: 80, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {event.venue}
          </div>
        )}
      </div>
    </button>
  )
}

function QuickAction({ icon, label, color, onClick }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, padding: '14px 8px', borderRadius: 16, textAlign: 'center',
      background: 'white', border: `1.5px solid ${color}25`, cursor: 'pointer',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    }}>
      <div style={{ fontSize: 22, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 11, fontWeight: 700, color }}>{label}</div>
    </button>
  )
}

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

function computeProfilePercent(d) {
  const fields = ['first_name', 'last_name', 'phone', 'address_city', 'bio', 'siret', 'iban']
  if (d.account_type === 'legal') {
    fields.splice(0, 2, 'company_name', 'legal_form')
  }
  const filled = fields.filter(f => d[f] && String(d[f]).trim()).length
  return Math.round((filled / fields.length) * 100)
}
