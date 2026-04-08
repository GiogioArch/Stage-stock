import { SEMANTIC } from './theme'

export const PRODUCT_STATUS = [
  { id: 'active', label: 'Actif', color: SEMANTIC.success, bg: `${SEMANTIC.success}15` },
  { id: 'inactif', label: 'Inactif', color: '#94A3B8', bg: '#94A3B815' },
  { id: 'stock_mort', label: 'Stock mort', color: SEMANTIC.danger, bg: `${SEMANTIC.danger}15` },
  { id: 'stock_dormant', label: 'Stock dormant', color: SEMANTIC.warning, bg: `${SEMANTIC.warning}15` },
  { id: 'sur_stock', label: 'Sur-stock', color: '#5B8DB8', bg: '#5B8DB815' },
]

export function getStatusConf(status) {
  return PRODUCT_STATUS.find(s => s.id === status) || PRODUCT_STATUS[0]
}
