import React, { useState, useCallback } from 'react'
import CaThirtyDaysSheet from './CaThirtyDaysSheet'
import SalesTodaySheet from './SalesTodaySheet'
import AvgBasketSheet from './AvgBasketSheet'
import TopProductSheet from './TopProductSheet'
import BestConcertSheet from './BestConcertSheet'
import TransactionsSheet from './TransactionsSheet'
import StockValueSheet from './StockValueSheet'
import CaPotentielSheet from './CaPotentielSheet'
import RotationSheet from './RotationSheet'
import StockHealthSheet from './StockHealthSheet'
import OrdersInProgressSheet from './OrdersInProgressSheet'

/**
 * useKpiSheet — Hook de gestion des bottom sheets KPI.
 *
 * Usage dans Board.jsx :
 *   const { openSheet, SheetRenderer } = useKpiSheet()
 *   <KpiCard onClick={() => openSheet('ca30')} />
 *   <SheetRenderer data={{ sales, saleItems, events, products, stock, purchaseOrders, suppliers }} />
 *
 * Clés supportées :
 *   'ca30', 'salesToday', 'panier', 'topProduct', 'bestConcert',
 *   'transactions', 'stockValue', 'caPotentiel', 'rotation',
 *   'stockHealth', 'ordersInProgress'
 */
export function useKpiSheet() {
  const [openKpi, setOpenKpi] = useState(null)

  const openSheet = useCallback((kpiKey) => setOpenKpi(kpiKey), [])
  const closeSheet = useCallback(() => setOpenKpi(null), [])

  const SheetRenderer = useCallback(({ data = {} }) => {
    const props = {
      isOpen: !!openKpi,
      onClose: closeSheet,
      sales: data.sales || [],
      saleItems: data.saleItems || [],
      events: data.events || [],
      products: data.products || [],
      stock: data.stock || [],
      locations: data.locations || [],
      movements: data.movements || [],
      purchaseOrders: data.purchaseOrders || [],
      suppliers: data.suppliers || [],
    }

    switch (openKpi) {
      case 'ca30':             return <CaThirtyDaysSheet {...props} />
      case 'salesToday':       return <SalesTodaySheet {...props} />
      case 'panier':           return <AvgBasketSheet {...props} />
      case 'topProduct':       return <TopProductSheet {...props} />
      case 'bestConcert':      return <BestConcertSheet {...props} />
      case 'transactions':     return <TransactionsSheet {...props} />
      case 'stockValue':       return <StockValueSheet {...props} />
      case 'caPotentiel':      return <CaPotentielSheet {...props} />
      case 'rotation':         return <RotationSheet {...props} />
      case 'stockHealth':      return <StockHealthSheet {...props} />
      case 'ordersInProgress': return <OrdersInProgressSheet {...props} />
      default: return null
    }
  }, [openKpi, closeSheet])

  return { openKpi, openSheet, closeSheet, SheetRenderer }
}

export default useKpiSheet
