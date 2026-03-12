// ─── Module Registry ───
// Chaque module déclare ses tables Supabase, ses dépendances, et son tab
// Le Shell ne charge que les tables des modules actifs

export const MODULES = {
  dashboard: {
    id: 'dashboard',
    name: 'Dashboard',
    icon: '📊',
    color: '#E8735A',
    description: 'Vue d\'ensemble, KPIs et actions rapides',
    tables: {},
    deps: [],
    alwaysActive: true,
    order: 0,
    tab: { id: 'board', label: 'Board', icon: '📊' },
  },
  tournee: {
    id: 'tournee',
    name: 'Tournée',
    icon: '🎪',
    color: '#9B7DC4',
    description: 'Dates de concert, fiches détaillées, checklists et packing lists',
    tables: {
      events: 'order=date.asc',
      checklists: 'order=category.asc,item.asc',
      event_packing: 'order=role_code.asc,created_at.asc',
    },
    deps: ['articles', 'depots', 'equipe'],
    order: 5,
    tab: { id: 'tournee', label: 'Tournée', icon: '🎪' },
  },
  articles: {
    id: 'articles',
    name: 'Articles',
    icon: '📦',
    color: '#D4648A',
    description: 'Catalogue produits, familles et sous-familles',
    tables: {
      products: 'order=name.asc',
      families: 'order=name.asc',
      subfamilies: 'order=name.asc',
    },
    deps: [],
    order: 10,
    tab: { id: 'articles', label: 'Articles', icon: '📦' },
  },
  depots: {
    id: 'depots',
    name: 'Dépôts',
    icon: '🏭',
    color: '#5B8DB8',
    description: 'Lieux de stockage, entrepôts et véhicules',
    tables: {
      locations: 'order=name.asc',
    },
    deps: [],
    order: 20,
    tab: { id: 'depots', label: 'Dépôts', icon: '🏭' },
  },
  stock: {
    id: 'stock',
    name: 'Gestion de stock',
    icon: '📋',
    color: '#5DAB8B',
    description: 'Mouvements d\'entrée/sortie, transferts, inventaire et scanner',
    tables: {
      stock: '',
      movements: 'order=created_at.desc&limit=200',
    },
    deps: ['articles', 'depots'],
    order: 30,
    tab: { id: 'stock', label: 'Stock', icon: '📋' },
  },
  equipe: {
    id: 'equipe',
    name: 'Équipe',
    icon: '👥',
    color: '#9B7DC4',
    description: 'Gestion de l\'équipe, rôles et responsabilités',
    tables: {
      user_profiles: 'order=display_name.asc',
      roles: 'order=code.asc',
    },
    deps: [],
    alwaysActive: true, // requis pour auth + rôle picker
    order: 40,
    tab: { id: 'equipe', label: 'Équipe', icon: '👥' },
  },
  finance: {
    id: 'finance',
    name: 'Finance',
    icon: '💰',
    color: '#E8935A',
    description: 'Amortissements, revenus concerts et suivi financier',
    tables: {
      product_depreciation: '',
    },
    deps: ['articles'],
    order: 50,
    tab: { id: 'finance', label: 'Finance', icon: '💰' },
  },
  alertes: {
    id: 'alertes',
    name: 'Alertes',
    icon: '🔔',
    color: '#D4648A',
    description: 'Notifications de rupture, stock bas et échéances',
    tables: {},
    deps: ['stock'],
    order: 60,
    tab: { id: 'alertes', label: 'Alertes', icon: '🔔' },
  },
  forecast: {
    id: 'forecast',
    name: 'Prévisions',
    icon: '📈',
    color: '#E8735A',
    description: 'Projections de ventes merch et réapprovisionnement',
    tables: {},
    deps: ['articles', 'stock', 'tournee'],
    order: 70,
    tab: { id: 'forecast', label: 'Prévisions', icon: '📈' },
  },
}

// Modules actifs par défaut pour un nouveau compte
export const DEFAULT_ACTIVE = [
  'dashboard', 'tournee', 'articles', 'depots', 'stock', 'equipe', 'alertes',
]

// ─── Helpers ───

const STORAGE_KEY = 'stage_stock_modules'

export function getActiveModuleIds() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored)
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
