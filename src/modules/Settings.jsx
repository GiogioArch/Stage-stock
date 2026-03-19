import React, { useState, createElement } from 'react'
import { BarChart3, Calendar, Package, Warehouse, ClipboardList, Users, Coins, Bell, TrendingUp, ShoppingCart, ShoppingBag, ClipboardCheck, Truck, Settings as SettingsGear, Box } from 'lucide-react'
import { MODULES, DEFAULT_ACTIVE, setActiveModuleIds } from './registry'
import AccessManager from './AccessManager'
import { useToast } from '../shared/hooks'

const MOD_ICONS = {
  'bar-chart-3': BarChart3, tent: Calendar, package: Package, warehouse: Warehouse,
  'clipboard-list': ClipboardList, users: Users, coins: Coins, bell: Bell,
  'trending-up': TrendingUp, 'shopping-cart': ShoppingCart, 'shopping-bag': ShoppingBag,
  'clipboard-check': ClipboardCheck, truck: Truck, settings: SettingsGear,
}

export default function Settings({ activeModuleIds: rawIds, onModulesChanged, onToast: _legacyToast, onClose, membership, roles, userProfiles, onReload }) {
  const toast = useToast()
  const onToast = _legacyToast || toast
  const activeModuleIds = Array.isArray(rawIds) ? rawIds : DEFAULT_ACTIVE
  const [subTab, setSubTab] = useState('access') // access | modules
  const [localActive, setLocalActive] = useState(() => new Set(activeModuleIds))

  const moduleList = Object.values(MODULES).sort((a, b) => a.order - b.order)

  const toggle = (moduleId) => {
    const mod = MODULES[moduleId]
    if (mod.alwaysActive) return

    const next = new Set(localActive)
    if (next.has(moduleId)) {
      next.delete(moduleId)
      Object.values(MODULES).forEach(m => {
        if (m.deps.includes(moduleId)) next.delete(m.id)
      })
    } else {
      next.add(moduleId)
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
      {/* ─── Sub-tab navigation ─── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[
          { id: 'access', label: ' Accès', color: '#8B6DB8' },
          { id: 'modules', label: ' Modules', color: '#1E293B' },
        ].map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id)} style={{
            flex: 1, padding: '10px 8px', borderRadius: 12, fontSize: 13, fontWeight: 700,
            cursor: 'pointer', textAlign: 'center',
            background: subTab === t.id ? `${t.color}12` : 'white',
            color: subTab === t.id ? t.color : '#94A3B8',
            border: `1px solid ${subTab === t.id ? t.color + '40' : '#CBD5E1'}`,
          }}>{t.label}</button>
        ))}
      </div>

      {/* ─── Access tab ─── */}
      {subTab === 'access' && (
        <AccessManager
          membership={membership}
          roles={roles || []}
          userProfiles={userProfiles || []}
          onReload={onReload}
          onToast={onToast}
        />
      )}

      {/* ─── Modules tab ─── */}
      {subTab === 'modules' && (
        <>
          {/* Header */}
          <div className="card" style={{
            marginBottom: 16, padding: '18px 16px',
            background: 'linear-gradient(135deg, #1E293B08, #94A3B818)',
            border: '1px solid #1E293B15',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 8,
                background: 'linear-gradient(135deg, #1E293B, #94A3B8)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24, color: 'white',
              }}></div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#1E293B' }}>Modules</div>
                <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 600 }}>
                  Active ou désactive les modules de BackStage
                </div>
              </div>
            </div>
          </div>

          <div style={{ fontSize: 11, color: '#94A3B8', lineHeight: 1.6, marginBottom: 16, padding: '0 4px' }}>
            Chaque module ajoute un onglet et ses fonctionnalités. Les dépendances sont activées automatiquement.
          </div>

          {/* Module list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {moduleList.map(mod => {
              const isActive = localActive.has(mod.id)
              const isLocked = mod.alwaysActive
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
                    borderLeft: `4px solid ${isActive ? mod.color : '#CBD5E1'}`,
                    opacity: isActive ? 1 : 0.5,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 44, height: 26, borderRadius: 13, padding: 2,
                      background: isActive ? mod.color : '#CBD5E1',
                      transition: 'background 0.2s', flexShrink: 0,
                    }}>
                      <div style={{
                        width: 22, height: 22, borderRadius: 11, background: '#F1F5F9',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                        transform: isActive ? 'translateX(18px)' : 'translateX(0)',
                        transition: 'transform 0.2s',
                      }} />
                    </div>
                    <div style={{
                      width: 40, height: 40, borderRadius: 12,
                      background: `${mod.color}15`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 20,
                    }}>{MOD_ICONS[mod.icon] ? createElement(MOD_ICONS[mod.icon], { size: 20, color: mod.color }) : null}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: isActive ? '#1E293B' : '#94A3B8' }}>
                          {mod.name}
                        </span>
                        {isLocked && (
                          <span style={{ fontSize: 8, padding: '2px 6px', borderRadius: 4, background: '#1E293B', color: 'white', fontWeight: 600 }}>
                            REQUIS
                          </span>
                        )}
                        {isRequired && !isLocked && (
                          <span style={{ fontSize: 8, padding: '2px 6px', borderRadius: 4, background: '#5B8DB8', color: 'white', fontWeight: 600 }}>
                            DÉPENDANCE
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2, lineHeight: 1.4 }}>
                        {mod.description}
                      </div>
                      {mod.deps.length > 0 && (
                        <div style={{ fontSize: 9, color: '#CBD5E1', marginTop: 3 }}>
                          Requiert : {mod.deps.map(d => MODULES[d]?.name).filter(Boolean).join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {hasChanges && (
            <div style={{ position: 'sticky', bottom: 80, marginTop: 20, padding: '12px 0' }}>
              <button onClick={handleSave} className="btn-primary" style={{
                boxShadow: '0 6px 24px rgba(232,115,90,0.3)',
              }}>
                Appliquer les changements
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
