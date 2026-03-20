import React, { useState, lazy, Suspense } from 'react'
import { SubTabs } from '../design'

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
  onMovement, initialTab,
}) {
  const [activeTab, setActiveTab] = useState(initialTab || 'par_lieu')

  const alertBadge = alerts && alerts.length > 0 ? { alertes: alerts.length } : undefined

  return (
    <div>
      <SubTabs
        tabs={TABS}
        active={activeTab}
        onChange={setActiveTab}
        color={MODULE_COLOR}
        badge={alertBadge}
      />

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
            onMovement={onMovement}
          />
        )}
        {activeTab === 'par_produit' && (
          <Stocks
            products={products}
            locations={locations}
            stock={stock}
            onMovement={onMovement}
          />
        )}
        {activeTab === 'mouvements' && (
          <Movements
            movements={movements}
            products={products}
            locations={locations}
          />
        )}
        {activeTab === 'alertes' && (
          <Alerts
            alerts={alerts || []}
            events={events}
            products={products}
            stock={stock}
            locations={locations}
          />
        )}
      </Suspense>
    </div>
  )
}
