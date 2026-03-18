// ─── Module Registry ───
// Chaque module déclare ses tables Supabase, ses dépendances, et son tab
// Le Shell ne charge que les tables des modules actifs

export const MODULES = {
  dashboard: {
    id: 'dashboard',
    name: 'Dashboard',
    icon: 'bar-chart-3',
    color: '#E8735A',
    description: 'Vue d\'ensemble, KPIs et actions rapides',
    tables: {},
    deps: [],
    alwaysActive: true,
    order: 0,
    tab: { id: 'board', label: 'Board', icon: 'bar-chart-3' },
  },
  tournee: {
    id: 'tournee',
    name: 'Tournee',
    icon: 'tent',
    color: '#E8735A',
    description: 'Dates de concert, fiches detaillees, checklists et packing lists',
    tables: {
      events: 'order=date.asc',
      checklists: 'order=category.asc,item.asc',
      event_packing: 'order=role_code.asc,created_at.asc',
    },
    deps: ['articles', 'depots', 'equipe'],
    order: 5,
    tab: { id: 'tournee', label: 'Tournee', icon: 'tent' },
  },
  articles: {
    id: 'articles',
    name: 'Articles',
    icon: 'package',
    color: '#8B6DB8',
    description: 'Catalogue produits, familles et sous-familles',
    tables: {
      products: 'order=name.asc',
      families: 'order=name.asc',
      subfamilies: 'order=name.asc',
    },
    deps: [],
    order: 10,
    tab: { id: 'articles', label: 'Articles', icon: 'package' },
  },
  depots: {
    id: 'depots',
    name: 'Depots',
    icon: 'warehouse',
    color: '#5B8DB8',
    description: 'Lieux de stockage, entrepots et vehicules',
    tables: {
      locations: 'order=name.asc',
    },
    deps: [],
    order: 20,
    tab: { id: 'depots', label: 'Depots', icon: 'warehouse' },
  },
  stock: {
    id: 'stock',
    name: 'Gestion de stock',
    icon: 'clipboard-list',
    color: '#5DAB8B',
    description: 'Mouvements d\'entree/sortie, transferts, inventaire et scanner',
    tables: {
      stock: '',
      movements: 'order=created_at.desc&limit=200',
    },
    deps: ['articles', 'depots'],
    order: 30,
    tab: { id: 'stock', label: 'Stock', icon: 'clipboard-list' },
  },
  equipe: {
    id: 'equipe',
    name: 'Equipe',
    icon: 'users',
    color: '#E8735A',
    description: 'Gestion de l\'equipe, roles et responsabilites',
    tables: {
      user_profiles: 'order=display_name.asc',
      roles: 'order=code.asc',
      user_availability: '',
    },
    deps: [],
    alwaysActive: true, // requis pour auth + role picker
    order: 40,
    tab: { id: 'equipe', label: 'Equipe', icon: 'users' },
  },
  finance: {
    id: 'finance',
    name: 'Finance',
    icon: 'coins',
    color: '#E8935A',
    description: 'Amortissements, revenus, depenses et bilan financier',
    tables: {
      product_depreciation: '',
      expenses: 'order=date.desc',
    },
    deps: ['articles', 'tournee', 'ventes'],
    order: 50,
    tab: { id: 'finance', label: 'Finance', icon: 'coins' },
  },
  alertes: {
    id: 'alertes',
    name: 'Alertes',
    icon: 'bell',
    color: '#D4648A',
    description: 'Notifications de rupture, stock bas et echeances',
    tables: {},
    deps: ['stock'],
    order: 60,
    tab: { id: 'alertes', label: 'Alertes', icon: 'bell' },
  },
  timeline: {
    id: 'timeline',
    name: 'Mode Evenement',
    icon: 'clock',
    color: '#5B8DB8',
    description: 'Planning 48h heure par heure autour des evenements',
    tables: {
      event_tasks: 'order=hour_offset.asc',
      event_task_templates: '',
    },
    deps: ['tournee', 'equipe'],
    order: 46,
    tab: { id: 'timeline', label: 'Evenement', icon: 'clock' },
  },
  forecast: {
    id: 'forecast',
    name: 'Previsions',
    icon: 'trending-up',
    color: '#E8735A',
    description: 'Projections de ventes merch et reapprovisionnement',
    tables: {},
    deps: ['articles', 'stock', 'tournee'],
    order: 70,
    tab: { id: 'forecast', label: 'Previsions', icon: 'trending-up' },
  },
  ventes: {
    id: 'ventes',
    name: 'Ventes',
    icon: 'shopping-cart',
    color: '#5DAB8B',
    description: 'Point de vente concert, historique ventes et rapport de caisse',
    tables: {
      sales: 'order=created_at.desc&limit=100',
      sale_items: '',
      cash_reports: 'order=created_at.desc',
    },
    deps: ['articles', 'stock', 'tournee'],
    order: 45,
    tab: { id: 'ventes', label: 'Ventes', icon: 'shopping-cart' },
  },
  achats: {
    id: 'achats',
    name: 'Achats',
    icon: 'shopping-bag',
    color: '#D4648A',
    description: 'Fournisseurs, bons de commande et receptions',
    tables: {
      suppliers: 'order=name.asc',
      purchase_orders: 'order=created_at.desc',
      purchase_order_lines: '',
      purchase_receipts: '',
    },
    deps: ['articles', 'depots', 'stock'],
    order: 55,
    tab: { id: 'achats', label: 'Achats', icon: 'shopping-bag' },
  },
  inventaire: {
    id: 'inventaire',
    name: 'Inventaire',
    icon: 'clipboard-check',
    color: '#8BAB5D',
    description: 'Comptage physique et correction des ecarts stock',
    tables: {},
    deps: ['articles', 'stock', 'depots'],
    order: 65,
    tab: { id: 'inventaire', label: 'Inventaire', icon: 'clipboard-check' },
  },
  transport: {
    id: 'transport',
    name: 'Transport',
    icon: 'truck',
    color: '#E8735A',
    description: 'Logistique inter-iles, prestataires et suivi des transports',
    tables: {
      transport_providers: 'order=name.asc',
      vehicles: '',
      transport_routes: 'order=name.asc',
      transport_needs: 'order=created_at.desc',
      transport_bookings: '',
      transport_manifests: '',
      transport_costs: '',
    },
    deps: ['tournee', 'depots'],
    order: 75,
    tab: { id: 'transport', label: 'Transport', icon: 'truck' },
  },
}

// Modules actifs par defaut pour un nouveau compte
export const DEFAULT_ACTIVE = [
  'dashboard', 'tournee', 'articles', 'depots', 'stock', 'equipe', 'timeline', 'alertes',
]

// ─── Helpers ───

const STORAGE_KEY = 'stage_stock_modules'

export function getActiveModuleIds() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed)) return parsed
    }
  } catch { /* ignore */ }
  return DEFAULT_ACTIVE
}

export function setActiveModuleIds(ids) {
  // Always include alwaysActive modules
  const always = Object.values(MODULES).filter(m => m.alwaysActive).map(m => m.id)
  const merged = [...new Set([...always, ...ids])]
  localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
  return merged
}

// Resolve a module + all its transitive dependencies
function resolveDeps(moduleId, resolved = new Set()) {
  if (resolved.has(moduleId)) return
  const mod = MODULES[moduleId]
  if (!mod) return
  mod.deps.forEach(dep => resolveDeps(dep, resolved))
  resolved.add(moduleId)
  return resolved
}

// Get all tables that need to be loaded for a set of active modules
export function getRequiredTables(activeIds) {
  const allModuleIds = new Set()
  activeIds.forEach(id => resolveDeps(id, allModuleIds))

  const tables = {}
  allModuleIds.forEach(id => {
    const mod = MODULES[id]
    if (!mod) return
    Object.entries(mod.tables).forEach(([table, query]) => {
      // Keep the most specific query (non-empty wins)
      if (!tables[table] || (query && !tables[table])) {
        tables[table] = query
      }
    })
  })
  return tables
}

// ─── Tab Groups (bottom nav) ───
// Regroupe les modules en onglets principaux pour reduire la nav
export const TAB_GROUPS = [
  { id: 'board', label: 'Board', icon: 'bar-chart-3', tabIds: ['board'] },
  { id: 'tournee', label: 'Tournee', icon: 'tent', tabIds: ['tournee'] },
  { id: 'stock-group', label: 'Stock', icon: 'package', tabIds: ['articles', 'depots', 'stock', 'inventaire', 'achats', 'alertes', 'forecast'] },
  { id: 'ventes', label: 'Ventes', icon: 'shopping-cart', tabIds: ['ventes'] },
  { id: 'finance', label: 'Finance', icon: 'coins', tabIds: ['finance'] },
  { id: 'transport', label: 'Transport', icon: 'truck', tabIds: ['transport'] },
  { id: 'reglages', label: 'Reglages', icon: 'settings', tabIds: ['equipe', 'settings'] },
]

// Build the tab list for active modules, sorted by order
export function getActiveTabs(activeIds) {
  // Resolve deps to know which modules are effectively active
  const allIds = new Set()
  activeIds.forEach(id => resolveDeps(id, allIds))

  return Object.values(MODULES)
    .filter(m => allIds.has(m.id))
    .sort((a, b) => a.order - b.order)
    .map(m => ({ ...m.tab, moduleId: m.id }))
}
