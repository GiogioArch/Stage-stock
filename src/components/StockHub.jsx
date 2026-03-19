import React, { useState, lazy, Suspense } from 'react'
import { useToast, useProject } from '../shared/hooks'

const Depots = lazy(() => import('./Depots'))
const Stocks = lazy(() => import('./Stocks'))
const Movements = lazy(() => import('./Movements'))
const Alerts = lazy(() => import('./Alerts'))

const TABS = [
  { id: 'par_lieu', label: 'Par lieu' },
  { id: 'par_produit', label: 'Par produit' },
  { id: 'mouvements', label: 'Mouvements' },
  { id: 'alertes', label: 'Alertes' },
]

const MODULE_COLOR = '#5B8DB8'

export default function StockHub({
  locations, stock, products, movements, families, subfamilies,
  alerts, events,
  onToast: _legacyToast, onMovement,
}) {
  const { orgId, reload, userRole } = useProject()
  const toast = useToast()
  const onToast = _legacyToast || toast
  const [activeTab, setActiveTab] = useState('par_lieu')

  return (
    <div>
      {/* Sub-tab navigation */}
      <div style={{
        display: 'flex', gap: 6, padding: '0 16px 12px',
        overflowX: 'auto', WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
      }}>
        {TABS.map(t => {
          const isActive = activeTab === t.id
          return (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
              flex: 1, padding: '8px', borderRadius: 20, fontSize: 13, fontWeight: isActive ? 700 : 500,
              cursor: 'pointer', textAlign: 'center', whiteSpace: 'nowrap',
              background: isActive ? MODULE_COLOR : '#F1F5F9',
              color: isActive ? '#FFFFFF' : '#64748B',
              border: 'none',
              boxShadow: isActive ? `0 2px 8px ${MODULE_COLOR}40` : 'none',
              transition: 'all 0.2s ease',
            }}>{t.label}
              {t.id === 'alertes' && alerts && alerts.length > 0 && (
                <span style={{
                  marginLeft: 6, padding: '1px 6px', borderRadius: 10,
                  background: isActive ? 'rgba(255,255,255,0.3)' : '#D4648A',
                  color: isActive ? '#fff' : '#fff',
                  fontSize: 10, fontWeight: 700,
                }}>{alerts.length}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <Suspense fallback={<div style={{ padding: 32, textAlign: 'center' }}><div className="loader" /></div>}>
        {activeTab === 'par_lieu' && (
          <Depots
            locations={locations}
            stock={stock}
            products={products}
            movements={movements}
            families={families}
            subfamilies={subfamilies}
            orgId={orgId}
            onReload={reload}
            onToast={onToast}
            onMovement={onMovement}
          />
        )}
        {activeTab === 'par_produit' && (
          <Stocks
            products={products}
            locations={locations}
            stock={stock}
            orgId={orgId}
            onReload={reload}
            onToast={onToast}
            onMovement={onMovement}
          />
        )}
        {activeTab === 'mouvements' && (
          <Movements
            movements={movements}
            products={products}
            locations={locations}
            onToast={onToast}
          />
        )}
        {activeTab === 'alertes' && (
          <Alerts
            alerts={alerts || []}
            events={events}
            products={products}
            stock={stock}
            locations={locations}
            userRole={userRole}
          />
        )}
      </Suspense>
    </div>
  )
}
