import React, { useState, useMemo, createElement } from 'react'
import { getMoveConf, fmtDate, Badge } from './UI'

export default function DepotDetail({
  location, stock, products, movements, families, subfamilies,
  onClose, onMovement, onToast, onEdit, onDelete, onReload, embedded,
}) {
  const [section, setSection] = useState('inventory')

  // ─── Stock in this location ───
  const locStock = useMemo(() =>
    (stock || []).filter(s => s.location_id === location.id && s.quantity > 0),
    [stock, location.id]
  )

  const productDetails = useMemo(() =>
    locStock.map(s => {
      const p = (products || []).find(pr => pr.id === s.product_id)
      if (!p) return null
      const sf = (subfamilies || []).find(sf => sf.id === p.subfamily_id)
      const f = sf ? (families || []).find(fm => fm.id === sf.family_id) : null
      return { ...p, qty: s.quantity, subfamily: sf, family: f }
    }).filter(Boolean).sort((a, b) => b.qty - a.qty),
    [locStock, products, subfamilies, families]
  )

  // ─── Movement history for this location ───
  const locMovements = useMemo(() =>
    (movements || []).filter(m => m.from_loc === location.id || m.to_loc === location.id)
      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
      .slice(0, 50),
    [movements, location.id]
  )

  // ─── Stats ───
  const totalQty = locStock.reduce((s, item) => s + (item.quantity || 0), 0)
  const nbProducts = new Set(locStock.map(s => s.product_id)).size
  const totalValue = productDetails.reduce((s, p) => s + (p.qty * (p.sale_price || 0)), 0)

  // ─── Group by family ───
  const byFamily = useMemo(() => {
    const map = {}
    productDetails.forEach(p => {
      const fname = p.family?.name || 'Sans famille'
      if (!map[fname]) map[fname] = { name: fname, items: [], qty: 0, value: 0 }
      map[fname].items.push(p)
      map[fname].qty += p.qty
      map[fname].value += p.qty * (p.sale_price || 0)
    })
    return Object.values(map).sort((a, b) => b.qty - a.qty)
  }, [productDetails])

  // ─── Alerts (low stock) ───
  const alerts = useMemo(() =>
    productDetails.filter(p => {
      const minStock = p.min_stock || 5
      return p.qty <= minStock
    }),
    [productDetails]
  )

  const pName = (id) => (products || []).find(p => p.id === id)?.name || '?'
  const lName = (id) => location.id === id ? location.name : '?'

  const SECTIONS = [
    { id: 'inventory', label: 'Inventaire', icon: '' },
    { id: 'movements', label: 'Mouvements', icon: '' },
    { id: 'value', label: 'Valeur', icon: '' },
    { id: 'alerts', label: 'Alertes', icon: '', count: alerts.length },
  ]

  return (
    <div style={{
      ...(!embedded ? { position: 'fixed', inset: 0, zIndex: 1000 } : {}),
      background: 'linear-gradient(180deg, #FFF8F0 0%, #F8FAFC 30%, #F8FAFC 70%, #F8FAFC 100%)',
      overflow: embedded ? undefined : 'auto',
    }}>
      {/* Header */}
      <header style={{
        padding: '16px 18px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <button onClick={onClose} style={{
          padding: '8px 14px', borderRadius: 12, fontSize: 13, fontWeight: 600,
          background: '#F1F5F9', border: '1px solid #E2E8F0', color: '#94A3B8', cursor: 'pointer',
        }}>← Retour</button>
        <div style={{ fontSize: 15, fontWeight: 600, color: location.color || '#2563EB' }}>
          {location.icon || ''} {location.name}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {onEdit && (
            <button onClick={() => onEdit(location)} style={{
              padding: '8px 12px', borderRadius: 10, fontSize: 12, fontWeight: 700,
              background: '#EEF4FA', border: '1px solid #2563EB30', color: '#2563EB', cursor: 'pointer',
            }}>✏️</button>
          )}
          {onDelete && (
            <button onClick={() => onDelete(location)} style={{
              padding: '8px 12px', borderRadius: 10, fontSize: 12, fontWeight: 700,
              background: '#FDF0F4', border: '1px solid #7C3AED30', color: '#7C3AED', cursor: 'pointer',
            }}></button>
          )}
        </div>
      </header>

      {/* KPI Banner */}
      <div className="card" style={{
        margin: '16px 16px 0', padding: '18px 16px',
        background: `linear-gradient(135deg, ${(location.color || '#2563EB')}08, ${(location.color || '#2563EB')}18)`,
        border: `1px solid ${(location.color || '#2563EB')}25`,
      }}>
        {location.description && (
          <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 12 }}>{location.description}</div>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <KpiBox label="Références" value={nbProducts} color={location.color || '#2563EB'} />
          <KpiBox label="Unités" value={totalQty} color="#16A34A" />
          <KpiBox label="Valeur" value={`${Math.round(totalValue)}€`} color="#D97706" />
          {alerts.length > 0 && (
            <KpiBox label="Alertes" value={alerts.length} color="#7C3AED" />
          )}
        </div>
      </div>

      {/* Section tabs */}
      <div style={{ display: 'flex', gap: 4, padding: '16px 16px 0' }}>
        {SECTIONS.map(s => (
          <button key={s.id} onClick={() => setSection(s.id)} style={{
            flex: 1, padding: '7px 6px', borderRadius: 10, fontSize: 10, fontWeight: 700,
            cursor: 'pointer', textAlign: 'center', position: 'relative',
            background: section === s.id ? `${(location.color || '#2563EB')}15` : 'white',
            color: section === s.id ? (location.color || '#2563EB') : '#94A3B8',
            border: `1px solid ${section === s.id ? (location.color || '#2563EB') + '40' : '#E2E8F0'}`,
          }}>
            {s.icon} {s.label}
            {s.count > 0 && (
              <span style={{
                position: 'absolute', top: -4, right: -2,
                width: 16, height: 16, borderRadius: '50%',
                background: '#7C3AED', color: 'white', fontSize: 9, fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{s.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: '12px 16px 100px' }}>

        {/* ─── Inventory ─── */}
        {section === 'inventory' && (
          <div>
            {/* Quick action */}
            {onMovement && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <button onClick={() => onMovement('in', location.id)} style={{
                  flex: 1, padding: '10px 8px', borderRadius: 12, fontSize: 12, fontWeight: 700,
                  background: '#16A34A15', border: '1px solid #16A34A30', color: '#16A34A', cursor: 'pointer',
                }}>+ Entrée</button>
                <button onClick={() => onMovement('out', location.id)} style={{
                  flex: 1, padding: '10px 8px', borderRadius: 12, fontSize: 12, fontWeight: 700,
                  background: '#7C3AED15', border: '1px solid #7C3AED30', color: '#7C3AED', cursor: 'pointer',
                }}>- Sortie</button>
                <button onClick={() => onMovement('transfer', location.id)} style={{
                  flex: 1, padding: '10px 8px', borderRadius: 12, fontSize: 12, fontWeight: 700,
                  background: '#2563EB15', border: '1px solid #2563EB30', color: '#2563EB', cursor: 'pointer',
                }}>↔ Transfert</button>
              </div>
            )}

            {productDetails.length === 0 ? (
              <div className="card" style={{ padding: 32, textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>📭</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1E293B' }}>Dépôt vide</div>
                <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>Aucun stock dans ce lieu</div>
              </div>
            ) : (
              byFamily.map(fam => (
                <div key={fam.name} style={{ marginBottom: 12 }}>
                  <div style={{
                    fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase',
                    letterSpacing: 1, marginBottom: 6, display: 'flex', justifyContent: 'space-between',
                  }}>
                    <span>{fam.name}</span>
                    <span>{fam.qty} unités</span>
                  </div>
                  <div className="card" style={{ padding: '6px 12px' }}>
                    {fam.items.map((p, i) => {
                      const isLow = p.qty <= (p.min_stock || 5)
                      return (
                        <div key={p.id} style={{
                          display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
                          borderBottom: i < fam.items.length - 1 ? '1px solid #E2E8F0' : 'none',
                        }}>
                          <span style={{ fontSize: 16 }}>{p.image || ''}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontSize: 13, fontWeight: 700, color: '#1E293B',
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>{p.name}</div>
                            <div style={{ fontSize: 10, color: '#94A3B8' }}>
                              {p.sku || ''}{p.subfamily ? ` · ${p.subfamily.name}` : ''}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{
                              fontSize: 16, fontWeight: 600,
                              color: isLow ? '#7C3AED' : (location.color || '#2563EB'),
                            }}>{p.qty}</div>
                            {p.sale_price > 0 && (
                              <div style={{ fontSize: 9, color: '#94A3B8' }}>{Math.round(p.qty * p.sale_price)}€</div>
                            )}
                          </div>
                          {isLow && (
                            <span style={{ fontSize: 10, color: '#7C3AED', fontWeight: 600 }}></span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ─── Movements ─── */}
        {section === 'movements' && (
          <div>
            {locMovements.length === 0 ? (
              <div className="card" style={{ padding: 32, textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}></div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1E293B' }}>Aucun mouvement</div>
                <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>
                  Pas encore de mouvements pour ce dépôt
                </div>
              </div>
            ) : (
              <div className="card" style={{ padding: '6px 12px' }}>
                {locMovements.map((m, i) => {
                  const conf = getMoveConf(m.type)
                  const isIncoming = m.to_loc === location.id
                  return (
                    <div key={m.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
                      borderBottom: i < locMovements.length - 1 ? '1px solid #E2E8F0' : 'none',
                    }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: conf.color + '15',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                      }}>{conf.icon && React.createElement(conf.icon, { size: 14, color: conf.color })}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 12, fontWeight: 700, color: '#1E293B',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>{pName(m.product_id)}</div>
                        <div style={{ fontSize: 10, color: '#94A3B8' }}>
                          {m.type === 'transfer'
                            ? `${lName(m.from_loc)} → ${lName(m.to_loc)}`
                            : m.type === 'in' ? 'Entrée' : 'Sortie'
                          }
                          {m.note && ` · ${m.note}`}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{
                          fontSize: 14, fontWeight: 600,
                          color: isIncoming ? '#16A34A' : '#7C3AED',
                        }}>
                          {isIncoming ? '+' : '-'}{m.quantity}
                        </div>
                        <div style={{ fontSize: 9, color: '#94A3B8' }}>{fmtDate(m.created_at)}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            {locMovements.length >= 50 && (
              <div style={{ textAlign: 'center', padding: 8, fontSize: 11, color: '#94A3B8' }}>
                50 derniers mouvements affichés
              </div>
            )}
          </div>
        )}

        {/* ─── Value ─── */}
        {section === 'value' && (
          <div>
            <div className="card" style={{ padding: 16, textAlign: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 32, fontWeight: 600, color: '#D97706' }}>{Math.round(totalValue)}€</div>
              <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>Valeur totale du stock (prix de vente)</div>
            </div>

            {byFamily.length > 0 && (
              <div className="card" style={{ padding: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
                  Répartition par famille
                </div>
                {byFamily.map(fam => {
                  const pct = totalValue > 0 ? Math.round((fam.value / totalValue) * 100) : 0
                  return (
                    <div key={fam.name} style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#1E293B' }}>{fam.name}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#D97706' }}>{Math.round(fam.value)}€</span>
                      </div>
                      <div style={{ height: 6, borderRadius: 3, background: '#E2E8F0', overflow: 'hidden' }}>
                        <div style={{
                          width: `${pct}%`, height: '100%', borderRadius: 3,
                          background: location.color || '#2563EB', transition: 'width 0.3s',
                        }} />
                      </div>
                      <div style={{ fontSize: 9, color: '#94A3B8', marginTop: 2 }}>
                        {fam.qty} unités · {pct}%
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Top 5 by value */}
            {productDetails.length > 0 && (
              <div className="card" style={{ padding: 16, marginTop: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
                  Top 5 par valeur
                </div>
                {productDetails
                  .filter(p => p.sale_price > 0)
                  .sort((a, b) => (b.qty * b.sale_price) - (a.qty * a.sale_price))
                  .slice(0, 5)
                  .map((p, i) => (
                    <div key={p.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0',
                      borderBottom: i < 4 ? '1px solid #E2E8F0' : 'none',
                    }}>
                      <span style={{
                        width: 22, height: 22, borderRadius: 6,
                        background: '#D9770615', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 600, color: '#D97706',
                      }}>{i + 1}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 12, fontWeight: 700, color: '#1E293B',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>{p.name}</div>
                        <div style={{ fontSize: 10, color: '#94A3B8' }}>{p.qty} × {p.sale_price}€</div>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#D97706' }}>
                        {Math.round(p.qty * p.sale_price)}€
                      </div>
                    </div>
                  ))
                }
              </div>
            )}
          </div>
        )}

        {/* ─── Alerts ─── */}
        {section === 'alerts' && (
          <div>
            {alerts.length === 0 ? (
              <div className="card" style={{ padding: 32, textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}></div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#16A34A' }}>Tout va bien</div>
                <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>
                  Aucune alerte pour ce dépôt
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {alerts.map(p => {
                  const minStock = p.min_stock || 5
                  const isRupture = p.qty <= 0
                  return (
                    <div key={p.id} className="card" style={{
                      padding: '14px 16px',
                      borderLeft: `4px solid ${isRupture ? '#7C3AED' : '#D97706'}`,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 18 }}>{p.image || ''}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#1E293B' }}>{p.name}</div>
                          <div style={{ fontSize: 11, color: '#94A3B8' }}>
                            Seuil : {minStock} · Stock : {p.qty}
                          </div>
                        </div>
                        <Badge color={isRupture ? '#7C3AED' : '#D97706'}>
                          {isRupture ? 'Rupture' : 'Stock bas'}
                        </Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function KpiBox({ label, value, color }) {
  return (
    <div style={{
      flex: 1, textAlign: 'center', padding: '8px 4px',
      background: '#F1F5F9', borderRadius: 10, border: '1px solid #E2E8F0',
    }}>
      <div style={{ fontSize: 14, fontWeight: 600, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 8, color: '#94A3B8', fontWeight: 700, marginTop: 2 }}>{label}</div>
    </div>
  )
}
