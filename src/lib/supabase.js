// ─── Supabase Configuration ───
export const SUPABASE_URL = 'https://domuweiczcimqncriykk.supabase.co'
export const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvbXV3ZWljemNpbXFuY3JpeWtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4NTMyMTEsImV4cCI6MjA4ODQyOTIxMX0.fqkP4jYa1Q_Y6jQGDwSV_sAfQV0lkDQvgZI445Q-u30'

// NOTE: If the key above stops working (401 errors), check INSTRUCTIONS-PROJET.md
// The anon key starts with eyJ...NzI4NTMyMTE

let accessToken = null

function headers() {
  const h = {
    'apikey': SUPABASE_KEY,
    'Content-Type': 'application/json',
  }
  if (accessToken) {
    h['Authorization'] = `Bearer ${accessToken}`
  } else {
    h['Authorization'] = `Bearer ${SUPABASE_KEY}`
  }
  return h
}

// ─── Auth ───
export const auth = {
  async signUp(email, password) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: 'POST',
      headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (data.access_token) {
      accessToken = data.access_token
      localStorage.setItem('sb_token', data.access_token)
      localStorage.setItem('sb_refresh', data.refresh_token)
    }
    return data
  },

  async signIn(email, password) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (data.access_token) {
      accessToken = data.access_token
      localStorage.setItem('sb_token', data.access_token)
      localStorage.setItem('sb_refresh', data.refresh_token)
    }
    return data
  },

  async signOut() {
    accessToken = null
    localStorage.removeItem('sb_token')
    localStorage.removeItem('sb_refresh')
  },

  async getUser() {
    const token = localStorage.getItem('sb_token')
    if (!token) return null
    accessToken = token
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${token}` },
      })
      if (res.status === 401) {
        // Try refresh
        const refreshed = await auth.refresh()
        if (!refreshed) return null
        const res2 = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${accessToken}` },
        })
        if (!res2.ok) return null
        return res2.json()
      }
      if (!res.ok) return null
      return res.json()
    } catch {
      return null
    }
  },

  async resetPassword(email) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/recover`, {
      method: 'POST',
      headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error_description || data.msg || 'Erreur')
    }
  },

  async refresh() {
    const rt = localStorage.getItem('sb_refresh')
    if (!rt) return false
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: rt }),
      })
      const data = await res.json()
      if (data.access_token) {
        accessToken = data.access_token
        localStorage.setItem('sb_token', data.access_token)
        localStorage.setItem('sb_refresh', data.refresh_token)
        return true
      }
      return false
    } catch {
      return false
    }
  },
}

// ─── Network helpers ───
async function fetchWithRetry(url, options, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      if (!navigator.onLine) throw new Error('Pas de connexion internet')
      return await fetch(url, options)
    } catch (e) {
      if (i === retries) throw new Error(e.message === 'Failed to fetch' ? 'Erreur réseau — vérifie ta connexion' : e.message)
      await new Promise(r => setTimeout(r, 1000 * (i + 1)))
    }
  }
}

// ─── Database (safe wrappers) ───
// Every call is individually try/caught — no Promise.all that fails as a block

async function handleResponse(res) {
  if (res.status === 401) {
    const refreshed = await auth.refresh()
    if (refreshed) throw new Error('RETRY')
    throw new Error('Non authentifié')
  }
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `Erreur ${res.status}`)
  }
  const text = await res.text()
  return text ? JSON.parse(text) : []
}

export const db = {
  async get(table, query = '') {
    const url = `${SUPABASE_URL}/rest/v1/${table}${query ? '?' + query : ''}`
    let res = await fetchWithRetry(url, { headers: headers() })
    try {
      return await handleResponse(res)
    } catch (e) {
      if (e.message === 'RETRY') {
        res = await fetchWithRetry(url, { headers: headers() }, 0)
        return await handleResponse(res)
      }
      throw e
    }
  },

  async insert(table, data) {
    const res = await fetchWithRetry(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: { ...headers(), 'Prefer': 'return=representation' },
      body: JSON.stringify(data),
    })
    return handleResponse(res)
  },

  async update(table, match, data) {
    const res = await fetchWithRetry(`${SUPABASE_URL}/rest/v1/${table}?${match}`, {
      method: 'PATCH',
      headers: { ...headers(), 'Prefer': 'return=representation' },
      body: JSON.stringify(data),
    })
    return handleResponse(res)
  },

  async upsert(table, data) {
    const res = await fetchWithRetry(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: { ...headers(), 'Prefer': 'return=representation,resolution=merge-duplicates' },
      body: JSON.stringify(data),
    })
    return handleResponse(res)
  },

  async delete(table, match) {
    const res = await fetchWithRetry(`${SUPABASE_URL}/rest/v1/${table}?${match}`, {
      method: 'DELETE',
      headers: headers(),
    })
    return res.ok
  },

  async rpc(fn, params = {}) {
    const res = await fetchWithRetry(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(params),
    })
    return handleResponse(res)
  },
}

// ─── Safe fetcher (tables that might not exist) ───
export async function safe(table, query = '') {
  try {
    return await db.get(table, query)
  } catch {
    return []
  }
}

// ─── Realtime WebSocket helper (for EK LIVE) ───
export function createRealtimeWs(topic, onInsert, onStatusChange) {
  let ws
  let hbInterval
  try {
    ws = new WebSocket(`wss://domuweiczcimqncriykk.supabase.co/realtime/v1/websocket?apikey=${SUPABASE_KEY}&vsn=1.0.0`)
    ws.onopen = () => {
      ws.send(JSON.stringify({ topic, event: 'phx_join', payload: {}, ref: '1' }))
      if (onStatusChange) onStatusChange('connected')
    }
    ws.onclose = () => { if (onStatusChange) onStatusChange('disconnected') }
    ws.onerror = () => { if (onStatusChange) onStatusChange('disconnected') }
    ws.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data)
        if (data.event === 'INSERT') {
          const row = data.payload?.record
          if (row && onInsert) onInsert(row)
        }
        if (data.event === 'heartbeat' || data.ref === 'heartbeat') {
          ws.send(JSON.stringify({ topic: 'phoenix', event: 'heartbeat', payload: {}, ref: 'heartbeat' }))
        }
      } catch { /* ignore */ }
    }
    hbInterval = setInterval(() => {
      if (ws.readyState === 1) {
        ws.send(JSON.stringify({ topic: 'phoenix', event: 'heartbeat', payload: {}, ref: 'heartbeat' }))
      }
    }, 30000)
  } catch {
    if (onStatusChange) onStatusChange('disconnected')
    return () => {}
  }
  return () => { clearInterval(hbInterval); ws.close() }
}
