import React, { useState } from 'react'
import { MODULES, getActiveModuleIds, setActiveModuleIds } from './registry'

export default function Settings({ activeModuleIds, onModulesChanged, onToast, onClose }) {
  const [localActive, setLocalActive] = useState(new Set(activeModuleIds))

  const moduleList = Object.values(MODULES).sort((a, b) => a.order - b.order)

  const toggle = (moduleId) => {
    const mod = MODULES[moduleId]
    if (mod.alwaysActive) return // Can't disable

    const next = new Set(localActive)
    if (next.has(moduleId)) {
      next.delete(moduleId)
      // Also remove modules that depend on this one
      Object.values(MODULES).forEach(m => {
        if (m.deps.includes(moduleId)) next.delete(m.id)
      })
    } else {
      next.add(moduleId)
      // Also activate dependencies
      mod.deps.forEach(dep => next.add(dep))
    }
    setLocalActive(next)
  }

  const handleSave = () => {
    const ids = setActiveModuleIds([...localActive])
    onModulesChanged(ids)
    onToast('Modules mis à jour')
    if (onClose) onClose()
  }

  const hasChanges = JSON.stringify([...localActive].sort()) !== JSON.stringify([...activeModuleIds].sort())

  return (
    <div style={{ padding: '0 16px 24px' }}>

      {/* Header */}
      <div className="card" style={{
        marginBottom: 16, padding: '18px 16px',
        background: 'linear-gradient(135deg, #3D304208, #9A8B9418)',
        border: '1.5px solid #3D304215',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: 'linear-gradient(135deg, #3D3042, #9A8B94)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, color: 'white',
          }}>⚙️</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#3D3042' }}>Modules</div>
            <div style={{ fontSize: 12, color: '#9A8B94', fontWeight: 600 }}>
              Active ou désactive les modules de Stage Stock
            </div>
          </div>
        </div>
      </div>

      <div style={{ fontSize: 11, color: '#9A8B94', lineHeight: 1.6, marginBottom: 16, padding: '0 4px' }}>
        Chaque module ajoute un onglet et ses fonctionnalités. Les dépendances sont activées automatiquement.
      </div>

      {/* Module list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {moduleList.map(mod => {
          const isActive = localActive.has(mod.id)
          const isLocked = mod.alwaysActive
          // Check if any active module depends on this one
          const depBy = Object.values(MODULES).filter(m => m.deps.includes(mod.id) && localActive.has(m.id))
          const isRequired = depBy.length > 0

          return (
            <button
              key={mod.id}
              onClick={() => toggle(mod.id)}
              className="card"
              style={{
                width: '100%', padding: '14px 16px', cursor: isLocked ? 'default' : 'pointer',
                textAlign: 'left', transition: 'all 0.2s',
                borderLeft: `4px solid ${isActive ? mod.color : '#E8DED8'}`,
                opacity: isActive ? 1 : 0.5,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* Toggle */}
                <div style={{
                  width: 44, height: 26, borderRadius: 13, padding: 2,
                  background: isActive ? mod.color : '#E8DED8',
                  transition: 'background 0.2s', flexShrink: 0,
                }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: 11, background: 'white',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                    transform: isActive ? 'translateX(18px)' : 'translateX(0)',
                    transition: 'transform 0.2s',
                  }} />
                </div>

                {/* Icon */}
                <div style={{
                  width: 40, height: 40, borderRadius: 12,
                  background: `${mod.color}15`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20,
                }}>{mod.icon}</div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: isActive ? '#3D3042' : '#9A8B94' }}>
                      {mod.name}
                    </span>
                    {isLocked && (
                      <span style={{ fontSize: 8, padding: '2px 6px', borderRadius: 4, background: '#3D3042', color: 'white', fontWeight: 800 }}>
                        REQUIS
                      </span>
                    )}
                    {isRequired && !isLocked && (
                      <span style={{ fontSize: 8, padding: '2px 6px', borderRadius: 4, background: '#E8935A', color: 'white', fontWeight: 800 }}>
                        DÉPENDANCE
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: '#9A8B94', marginTop: 2, lineHeight: 1.4 }}>
                    {mod.description}
                  </div>
                  {mod.deps.length > 0 && (
                    <div style={{ fontSize: 9, color: '#B8A0AE', marginTop: 3 }}>
                      Requiert : {mod.deps.map(d => MODULES[d]?.name).filter(Boolean).join(', ')}
                    </div>
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Save button */}
      {hasChanges && (
        <div style={{
          position: 'sticky', bottom: 80, marginTop: 20,
          padding: '12px 0',
        }}>
          <button onClick={handleSave} className="btn-primary" style={{
            boxShadow: '0 6px 24px rgba(232,115,90,0.3)',
          }}>
            Appliquer les changements
          </button>
        </div>
      )}
    </div>
  )
}
