import React, { useState, useMemo } from 'react'
import { Badge, getCat, fmtDate, getMoveConf, parseDate } from './UI'
import { getModuleTheme, BASE, SEMANTIC, SPACE, TYPO, RADIUS, SHADOW } from '../lib/theme'
import { SubTabs } from '../design'
import { useToast } from '../shared/hooks'

const theme = getModuleTheme('articles')

function hexToRgbLocal(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r},${g},${b}`
}

// ─── Forecast helpers (same logic as Forecast.jsx) ───
const CONV_RATES = {
  'concert live': 0.11, 'concert': 0.11, 'live': 0.11,
  'sound system': 0.07, 'soundsystem': 0.07,
  'impro': 0.135, 'improvisation': 0.135,
}
const TERR_MULT = { 'martinique': 1.0, 'guadeloupe': 0.85 }

function getRate(format) {
  return CONV_RATES[(format || '').toLowerCase().trim()] || 0.10
}
function getMult(territoire) {
  return TERR_MULT[(territoire || '').toLowerCase().trim()] || 0.90
}

const SECTIONS = [
  { id: 'resume', label: 'Résumé', icon: '' },
  { id: 'stock', label: 'Stock', icon: '' },
  { id: 'mouvements', label: 'Mouvements', icon: '' },
  { id: 'concerts', label: 'Concerts', icon: '' },
  { id: 'compta', label: 'Compta', icon: '' },
]

export default function ProductDetail({ product, stock, locations, movements, events, eventPacking, products, userRole, onClose, onEdit, onDelete, onToast: _legacyToast, embedded }) {
  const toast = useToast()
  const onToast = _legacyToast || toast
  const [section, setSection] = useState('resume')

  const cat = getCat(product.category)

  // ─── Stock data ───
  const productStock = useMemo(() =>
    stock.filter(s => s.product_id === product.id),
    [stock, product.id]
  )
  const totalQty = productStock.reduce((sum, s) => sum + (s.quantity || 0), 0)
  const maxLocQty = Math.max(1, ...productStock.map(s => s.quantity || 0))

  // ─── Movement history ───
  const productMoves = useMemo(() =>
    movements.filter(m => m.product_id === product.id),
    [movements, product.id]
  )

  // Movement stats
  const moveStats = useMemo(() => {
    const ins = productMoves.filter(m => m.type === 'in')
    const outs = productMoves.filter(m => m.type === 'out')
    const transfers = productMoves.filter(m => m.type === 'transfer')
    const totalIn = ins.reduce((s, m) => s + (m.quantity || 0), 0)
    const totalOut = outs.reduce((s, m) => s + (m.quantity || 0), 0)
    return { ins: ins.length, outs: outs.length, transfers: transfers.length, totalIn, totalOut }
  }, [productMoves])

  // ─── Concert linkage ───
  const today = new Date().toISOString().split('T')[0]

  // Events that have this product in packing list
  const linkedEvents = useMemo(() => {
    const packingForProduct = (eventPacking || []).filter(ep => ep.product_id === product.id)
    return events.map(ev => {
      const packing = packingForProduct.find(ep => ep.event_id === ev.id)
      // Forecast projection for merch
      const isMerch = product.category === 'merch'
      const totalMerchStock = isMerch
        ? products.filter(p => p.category === 'merch').reduce((s, p) =>
          s + stock.filter(st => st.product_id === p.id).reduce((ss, st) => ss + (st.quantity || 0), 0), 0)
        : 0
      const totalMerchProducts = isMerch ? products.filter(p => p.category === 'merch').length : 0
      const projectedEventSales = isMerch && ev.capacite
        ? Math.round((ev.capacite * getRate(ev.format) * getMult(ev.territoire)) * (totalMerchProducts > 0 ? totalQty / Math.max(1, totalMerchStock) : 0))
        : 0

      return {
        ...ev,
        packing,
        projectedSales: projectedEventSales,
        isPast: ev.date < today,
        daysUntil: Math.ceil((new Date(ev.date) - new Date()) / 86400000),
      }
    }).filter(ev => ev.packing || (product.category === 'merch' && ev.date >= today))
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [events, eventPacking, product, products, stock, totalQty, today])

  // ─── CA per concert (from movements out linked to events) ───
  const caPerConcert = useMemo(() => {
    // Group out movements by date proximity to events
    const result = []
    const outMoves = productMoves.filter(m => m.type === 'out')
    events.filter(e => e.date < today).forEach(ev => {
      const evDate = new Date(ev.date)
      // Movements within 2 days of the event
      const eventMoves = outMoves.filter(m => {
        const mDate = new Date(m.created_at)
        const diff = Math.abs(mDate - evDate) / 86400000
        return diff <= 2
      })
      const qty = eventMoves.reduce((s, m) => s + (m.quantity || 0), 0)
      if (qty > 0) {
        const prixUnit = product.selling_price || product.cost_ht || 25
        result.push({ event: ev, qty, ca: Math.round(qty * prixUnit) })
      }
    })
    return result
  }, [productMoves, events, product, today])

  // Location name helper
  const lName = (id) => locations.find(l => l.id === id)?.name || '?'

  return (
    <div style={{
      ...(!embedded ? { position: 'fixed', inset: 0, zIndex: 100 } : {}),
      background: `linear-gradient(180deg, ${BASE.bg} 0%, ${BASE.bgSurface} 30%, ${BASE.bgSurface} 70%, ${BASE.bgSurface} 100%)`,
      overflowY: embedded ? undefined : 'auto',
      animation: embedded ? undefined : 'fadeIn 0.2s ease-out',
    }}>
      {/* ─── Top bar ─── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(16px)',
        padding: `${SPACE.md}px ${SPACE.lg}px`, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: `1px solid ${BASE.bgHover}`,
      }}>
        <button onClick={onClose} style={{
          display: 'flex', alignItems: 'center', gap: SPACE.xs + 2,
          ...TYPO.bodyBold, color: theme.color,
        }}>
          ← Retour
        </button>
        <div style={{ display: 'flex', gap: SPACE.sm }}>
          <button onClick={onEdit} style={{
            padding: `${SPACE.xs + 2}px ${SPACE.lg}px`, borderRadius: RADIUS.md, ...TYPO.caption,
            background: theme.tint08, color: theme.color, border: `1px solid ${theme.tint25}`,
          }}>Modifier</button>
          <button onClick={onDelete} style={{
            padding: `${SPACE.xs + 2}px ${SPACE.lg}px`, borderRadius: RADIUS.md, ...TYPO.caption,
            background: `rgba(${hexToRgbLocal(SEMANTIC.danger)}, 0.08)`, color: SEMANTIC.danger, border: `1px solid rgba(${hexToRgbLocal(SEMANTIC.danger)}, 0.18)`,
          }}>Supprimer</button>
        </div>
      </div>

      <div style={{ padding: `${SPACE.lg}px ${SPACE.lg}px ${embedded ? SPACE.xxl + 'px' : '100px'}` }}>

        {/* ─── Header card with photo ─── */}
        <div className="card" style={{
          marginBottom: SPACE.lg, padding: `${SPACE.xl}px ${SPACE.lg}px`,
          background: `linear-gradient(135deg, ${cat.color}06, ${cat.color}14)`,
          border: `1px solid ${cat.color}20`,
        }}>
          <div style={{ display: 'flex', gap: SPACE.lg, alignItems: 'flex-start' }}>
            {/* Photo placeholder */}
            <div style={{
              width: 80, height: 80, borderRadius: RADIUS.lg, flexShrink: 0,
              background: product.photo_url ? 'none' : cat.bg,
              border: `2px dashed ${cat.color}40`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: product.photo_url ? 0 : 36, overflow: 'hidden',
            }}>
              {product.photo_url ? (
                <img src={product.photo_url} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                product.image || (cat.icon && React.createElement(cat.icon, { size: 36 }))
              )}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ ...TYPO.h2, color: BASE.text, marginBottom: SPACE.xs, lineHeight: 1.2 }}>
                {product.name}
              </div>
              <div style={{ ...TYPO.caption, color: BASE.textMuted, marginBottom: SPACE.sm }}>
                SKU: {product.sku}
              </div>
              <div style={{ display: 'flex', gap: SPACE.xs + 2, flexWrap: 'wrap' }}>
                <Badge color={cat.color}>{cat.icon && React.createElement(cat.icon, { size: 12 })} {cat.name}</Badge>
                {product.variants && <Badge color={BASE.textMuted}>{product.variants}</Badge>}
                {product.unit && product.unit !== 'pièce' && <Badge color={theme.color}>{product.unit}</Badge>}
              </div>
            </div>
          </div>

          {/* Description */}
          {product.description && (
            <div style={{
              marginTop: SPACE.lg, padding: `${SPACE.md}px ${SPACE.md}px`, borderRadius: RADIUS.md,
              background: BASE.bgHover, border: `1px solid ${BASE.bgHover}`,
              ...TYPO.body, color: BASE.text,
            }}>
              {product.description}
            </div>
          )}
        </div>

        {/* ─── KPI row ─── */}
        <div style={{ display: 'flex', gap: SPACE.sm, marginBottom: SPACE.lg }}>
          <KpiCard
            label="Stock total"
            value={totalQty}
            color={totalQty === 0 ? SEMANTIC.danger : totalQty <= (product.min_stock || 5) ? SEMANTIC.warning : SEMANTIC.success}
            sub={`seuil: ${product.min_stock || 5}`}
          />
          <KpiCard
            label="Entrées"
            value={moveStats.totalIn}
            color={SEMANTIC.success}
            sub={`${moveStats.ins} mvts`}
          />
          <KpiCard
            label="Sorties"
            value={moveStats.totalOut}
            color={SEMANTIC.danger}
            sub={`${moveStats.outs} mvts`}
          />
          <KpiCard
            label="Concerts"
            value={linkedEvents.length}
            color={SEMANTIC.melodie}
            sub={`liés`}
          />
        </div>

        {/* ─── Section tabs ─── */}
        <SubTabs tabs={SECTIONS} active={section} onChange={setSection} />

        {/* ═══════════ RÉSUMÉ ═══════════ */}
        {section === 'resume' && (
          <div>
            {/* Identité */}
            <SectionLabel>Identité produit</SectionLabel>
            <div className="card" style={{ marginBottom: 14, padding: '14px 16px' }}>
              <InfoRow label="Nom" value={product.name} />
              <InfoRow label="SKU" value={product.sku} />
              <InfoRow label="Catégorie" value={cat.name} />
              {product.variants && <InfoRow label="Variantes" value={product.variants} />}
              <InfoRow label="Unité" value={product.unit || 'pièce'} />
              <InfoRow label="Seuil alerte" value={`${product.min_stock || 5} unités`} />
              {product.purchase_date && (
                <InfoRow label="Date d'achat" value={parseDate(product.purchase_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} />
              )}
              {product.cost_ht != null && product.cost_ht > 0 && (
                <InfoRow label="Coût HT" value={`${product.cost_ht.toFixed(2)} €`} />
              )}
              {product.selling_price != null && product.selling_price > 0 && (
                <InfoRow label="Prix de vente" value={`${product.selling_price.toFixed(2)} €`} />
              )}
            </div>

            {/* Qui / Quoi / Où / Quand / Comment */}
            <SectionLabel>Fiche opérationnelle</SectionLabel>
            <div className="card" style={{ marginBottom: 14, padding: '14px 16px' }}>
              <OpRow icon="" label="Qui" value={userRole ? `Géré par ${userRole.name}` : 'Tout le monde'} />
              <OpRow icon="" label="Quoi" value={`${totalQty} en stock, ${productStock.filter(s => s.quantity > 0).length} lieu(x)`} />
              <OpRow icon="" label="Où" value={productStock.filter(s => s.quantity > 0).map(s => lName(s.location_id)).join(', ') || 'Aucun stock'} />
              <OpRow icon="" label="Quand" value={product.purchase_date ? `Acheté le ${parseDate(product.purchase_date).toLocaleDateString('fr-FR')}` : 'Date non renseignée'} />
              <OpRow icon="" label="Comment" value={`${moveStats.ins + moveStats.outs + moveStats.transfers} mouvements enregistrés`} />
              <OpRow icon="" label="Avec quoi" value={linkedEvents.length > 0 ? `${linkedEvents.length} concert(s) lié(s)` : 'Aucun concert lié'} />
            </div>

            {/* CA par concert (si historique) */}
            {caPerConcert.length > 0 && (
              <>
                <SectionLabel>CA par concert</SectionLabel>
                <div className="card" style={{ marginBottom: SPACE.lg, padding: `${SPACE.lg}px` }}>
                  {caPerConcert.map((c, i) => (
                    <div key={i} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: `${SPACE.sm}px 0`, borderBottom: i < caPerConcert.length - 1 ? `1px solid ${BASE.bgHover}` : 'none',
                    }}>
                      <div>
                        <div style={{ ...TYPO.bodyBold }}>{c.event.name || c.event.lieu}</div>
                        <div style={{ ...TYPO.micro, color: BASE.textMuted }}>
                          {parseDate(c.event.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} · {c.qty} vendus
                        </div>
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 600, color: SEMANTIC.success }}>{c.ca}€</div>
                    </div>
                  ))}
                  <div style={{
                    marginTop: SPACE.sm, paddingTop: SPACE.sm, borderTop: `2px solid ${BASE.bgHover}`,
                    display: 'flex', justifyContent: 'space-between',
                  }}>
                    <span style={{ ...TYPO.bodyBold }}>Total</span>
                    <span style={{ ...TYPO.h2, color: SEMANTIC.success }}>
                      {caPerConcert.reduce((s, c) => s + c.ca, 0)}€
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ═══════════ STOCK ═══════════ */}
        {section === 'stock' && (
          <div>
            {/* Total */}
            <div className="card" style={{
              textAlign: 'center', marginBottom: SPACE.lg, padding: SPACE.xl,
              background: totalQty === 0 ? `rgba(${hexToRgbLocal(SEMANTIC.danger)}, 0.08)` : totalQty <= (product.min_stock || 5) ? `rgba(${hexToRgbLocal(SEMANTIC.warning)}, 0.08)` : `rgba(${hexToRgbLocal(SEMANTIC.success)}, 0.08)`,
            }}>
              <div style={{ ...TYPO.overline, color: BASE.textMuted }}>Stock total</div>
              <div style={{
                fontSize: 48, fontWeight: 600, lineHeight: 1.1,
                color: totalQty === 0 ? SEMANTIC.danger : totalQty <= (product.min_stock || 5) ? SEMANTIC.warning : SEMANTIC.success,
              }}>{totalQty}</div>
              <div style={{ ...TYPO.caption, color: BASE.textMuted, marginTop: SPACE.xs }}>
                Seuil min : {product.min_stock || 5} · Unité : {product.unit || 'pièce'}
              </div>
              {totalQty === 0 && <Badge color={SEMANTIC.danger}>RUPTURE DE STOCK</Badge>}
              {totalQty > 0 && totalQty <= (product.min_stock || 5) && <Badge color={SEMANTIC.warning}>STOCK BAS</Badge>}
            </div>

            {/* By location with bar chart */}
            <SectionLabel>Répartition par dépôt</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.sm }}>
              {locations.map(loc => {
                const s = productStock.find(st => st.location_id === loc.id)
                const qty = s?.quantity || 0
                const pct = maxLocQty > 0 ? (qty / maxLocQty) * 100 : 0
                return (
                  <div key={loc.id} className="card" style={{ padding: `${SPACE.md}px ${SPACE.lg}px` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACE.xs + 2 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: SPACE.sm }}>
                        <span style={{ fontSize: 18 }}>{loc.icon || ''}</span>
                        <span style={{ ...TYPO.bodyBold }}>{loc.name}</span>
                      </div>
                      <span style={{
                        fontSize: 18, fontWeight: 600,
                        color: qty > 0 ? BASE.text : BASE.textDisabled,
                      }}>{qty}</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: BASE.bgHover, overflow: 'hidden' }}>
                      <div style={{
                        width: `${pct}%`, height: '100%', borderRadius: 3,
                        background: qty > 0 ? cat.color : 'transparent',
                        transition: 'width 0.3s',
                      }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ═══════════ MOUVEMENTS ═══════════ */}
        {section === 'mouvements' && (
          <div>
            {/* Stats */}
            <div style={{ display: 'flex', gap: SPACE.sm, marginBottom: SPACE.lg }}>
              <StatPill icon="" label="Entrées" value={moveStats.totalIn} count={moveStats.ins} color={SEMANTIC.success} />
              <StatPill icon="" label="Sorties" value={moveStats.totalOut} count={moveStats.outs} color={SEMANTIC.danger} />
              <StatPill icon="" label="Transferts" value={moveStats.transfers} count={moveStats.transfers} color={SEMANTIC.info} />
            </div>

            {/* List */}
            {productMoves.length === 0 ? (
              <div className="empty-state" style={{ padding: 32 }}>
                <div className="empty-icon"></div>
                <div className="empty-text">Aucun mouvement enregistré</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.xs + 2 }}>
                {productMoves.map(m => {
                  const conf = getMoveConf(m.type)
                  return (
                    <div key={m.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: SPACE.md, padding: `${SPACE.md}px ${SPACE.lg}px` }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: RADIUS.md, background: conf.bg,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0,
                      }}>{conf.icon && React.createElement(conf.icon, { size: 16, color: conf.color })}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ ...TYPO.bodyBold, color: conf.color }}>
                          {conf.label}
                          <span style={{ fontWeight: 400, color: BASE.textMuted, marginLeft: SPACE.xs + 2, fontSize: 11 }}>
                            {m.type === 'transfer'
                              ? `${lName(m.from_loc)} → ${lName(m.to_loc)}`
                              : lName(m.type === 'in' ? m.to_loc : m.from_loc)
                            }
                          </span>
                        </div>
                        <div style={{ ...TYPO.label, color: BASE.textDisabled, marginTop: 2, textTransform: 'none' }}>
                          {fmtDate(m.created_at)}
                          {m.note && ` · ${m.note}`}
                        </div>
                      </div>
                      <div style={{
                        fontSize: 16, fontWeight: 600,
                        color: m.type === 'out' ? SEMANTIC.danger : m.type === 'in' ? SEMANTIC.success : SEMANTIC.info,
                      }}>
                        {m.type === 'out' ? '−' : m.type === 'in' ? '+' : '↔'}{m.quantity}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══════════ CONCERTS ═══════════ */}
        {section === 'concerts' && (
          <div>
            {linkedEvents.length === 0 ? (
              <div className="empty-state" style={{ padding: 32 }}>
                <div className="empty-icon"></div>
                <div className="empty-text">Aucun concert lié à ce produit</div>
              </div>
            ) : (
              <>
                {/* Future events */}
                {linkedEvents.filter(e => !e.isPast).length > 0 && (
                  <>
                    <SectionLabel>Concerts à venir</SectionLabel>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.sm, marginBottom: SPACE.lg }}>
                      {linkedEvents.filter(e => !e.isPast).map(ev => (
                        <div key={ev.id} className="card" style={{
                          padding: `${SPACE.md}px ${SPACE.lg}px`,
                          borderLeft: `4px solid ${theme.color}`,
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <div style={{ ...TYPO.bodyBold, color: BASE.text }}>
                                {ev.name || ev.lieu}
                              </div>
                              <div style={{ ...TYPO.micro, color: BASE.textMuted, marginTop: 2 }}>
                                {parseDate(ev.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' })}
                                {' · '}{ev.ville} · {ev.format}
                              </div>
                            </div>
                            <Badge color={ev.daysUntil <= 3 ? SEMANTIC.danger : theme.color}>
                              J-{ev.daysUntil}
                            </Badge>
                          </div>

                          {/* Needs */}
                          <div style={{ display: 'flex', gap: SPACE.md, marginTop: SPACE.md }}>
                            {ev.packing && (
                              <MiniInfo label="Besoin packing" value={ev.packing.quantity_needed} color={theme.color} />
                            )}
                            {ev.projectedSales > 0 && (
                              <MiniInfo label="Ventes proj." value={`~${ev.projectedSales}`} color={theme.color} />
                            )}
                            {ev.capacite && (
                              <MiniInfo label="Capacité" value={ev.capacite} color={theme.color} />
                            )}
                          </div>

                          {/* Sufficiency check */}
                          {ev.packing && (
                            <div style={{ marginTop: SPACE.sm }}>
                              {totalQty >= ev.packing.quantity_needed ? (
                                <div style={{ ...TYPO.micro, color: SEMANTIC.success }}>
                                  Stock suffisant ({totalQty} dispo / {ev.packing.quantity_needed} requis)
                                </div>
                              ) : (
                                <div style={{ ...TYPO.micro, color: SEMANTIC.danger }}>
                                  Stock insuffisant ! Manque {ev.packing.quantity_needed - totalQty} unité(s)
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* Past events */}
                {linkedEvents.filter(e => e.isPast).length > 0 && (
                  <>
                    <SectionLabel>Concerts passés</SectionLabel>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.xs + 2 }}>
                      {linkedEvents.filter(e => e.isPast).map(ev => {
                        const concertCA = caPerConcert.find(c => c.event.id === ev.id)
                        return (
                          <div key={ev.id} className="card" style={{ padding: `${SPACE.md}px ${SPACE.lg}px`, opacity: 0.8 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <div style={{ ...TYPO.bodyBold }}>{ev.name || ev.lieu}</div>
                                <div style={{ ...TYPO.micro, color: BASE.textMuted }}>
                                  {parseDate(ev.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} · {ev.ville}
                                </div>
                              </div>
                              {concertCA && (
                                <div style={{ textAlign: 'right' }}>
                                  <div style={{ ...TYPO.bodyBold, color: SEMANTIC.success }}>{concertCA.ca}€</div>
                                  <div style={{ ...TYPO.label, color: BASE.textMuted, textTransform: 'none' }}>{concertCA.qty} vendus</div>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* ═══════════ COMPTABILITÉ ═══════════ */}
        {section === 'compta' && (
          <div>
            {product.cost_ht > 0 ? (
              <>
                <div className="card" style={{ padding: '14px 16px', marginBottom: 14 }}>
                  <InfoRow label="Coût HT unitaire" value={`${product.cost_ht.toFixed(2)} €`} />
                  <InfoRow label="Coût total" value={`${(product.cost_ht * totalQty).toFixed(2)} €`} />
                  {product.selling_price > 0 && (
                    <>
                      <InfoRow label="Prix de vente" value={`${product.selling_price.toFixed(2)} €`} />
                      <InfoRow label="Marge unitaire" value={`${(product.selling_price - product.cost_ht).toFixed(2)} € (${Math.round(((product.selling_price - product.cost_ht) / product.selling_price) * 100)}%)`} />
                    </>
                  )}
                  {product.purchase_date && (
                    <InfoRow label="Date d'achat" value={parseDate(product.purchase_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} />
                  )}
                  <div style={{
                    marginTop: SPACE.sm, padding: `${SPACE.sm}px ${SPACE.md}px`, borderRadius: RADIUS.sm,
                    background: product.cost_ht >= 500 ? theme.tint08 : `rgba(${hexToRgbLocal(SEMANTIC.warning)}, 0.08)`,
                  }}>
                    <span style={{
                      ...TYPO.caption,
                      color: product.cost_ht >= 500 ? theme.color : SEMANTIC.warning,
                    }}>
                      {product.cost_ht >= 500 ? 'Immobilisation' : 'Charge'} — {product.cost_ht >= 500 ? 'amortissement linéaire' : 'sous le seuil de 500€ HT'}
                    </span>
                  </div>
                </div>

                {/* Amortissement */}
                {product.cost_ht >= 500 && product.useful_life_months && product.purchase_date && (() => {
                  const months = product.useful_life_months
                  const monthsElapsed = Math.max(0,
                    (new Date().getFullYear() - new Date(product.purchase_date).getFullYear()) * 12
                    + new Date().getMonth() - new Date(product.purchase_date).getMonth()
                  )
                  const monthlyDepr = product.cost_ht / months
                  const cumDepr = Math.min(product.cost_ht, monthlyDepr * monthsElapsed)
                  const nbv = Math.max(0, product.cost_ht - cumDepr)
                  const pct = Math.round((cumDepr / product.cost_ht) * 100)
                  const endDate = new Date(product.purchase_date)
                  endDate.setMonth(endDate.getMonth() + months)

                  return (
                    <div className="card" style={{ padding: '14px 16px' }}>
                      <SectionLabel>Amortissement linéaire</SectionLabel>
                      <InfoRow label="Durée" value={`${months} mois (${Math.round(months / 12)} ans)`} />
                      <InfoRow label="Dotation mensuelle" value={`${monthlyDepr.toFixed(2)} €`} />
                      <InfoRow label="Mois écoulés" value={`${Math.min(monthsElapsed, months)} / ${months}`} />
                      <InfoRow label="Amortissement cumulé" value={`${cumDepr.toFixed(2)} €`} />
                      <InfoRow label="Fin amortissement" value={endDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })} />

                      <div style={{ margin: '12px 0 8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: SPACE.xs }}>
                          <span style={{ ...TYPO.micro, color: BASE.textMuted }}>Amorti : {pct}%</span>
                          <span style={{ ...TYPO.micro, fontWeight: 700, color: nbv > 0 ? theme.color : SEMANTIC.success }}>VNC : {nbv.toFixed(2)}€</span>
                        </div>
                        <div style={{ height: 10, borderRadius: 5, background: BASE.bgHover, overflow: 'hidden' }}>
                          <div style={{
                            width: `${pct}%`, height: '100%', borderRadius: 5,
                            background: `linear-gradient(90deg, ${theme.color}, ${SEMANTIC.success})`,
                            transition: 'width 0.3s',
                          }} />
                        </div>
                      </div>

                      <div style={{
                        marginTop: SPACE.md, padding: `${SPACE.sm}px ${SPACE.md}px`, borderRadius: RADIUS.sm,
                        background: `rgba(${hexToRgbLocal(SEMANTIC.warning)}, 0.08)`, ...TYPO.label, color: theme.color, lineHeight: 1.5, textTransform: 'none',
                      }}>
                        Amortissement linéaire, prorata temporis base 360j. Durées à valider par expert-comptable.
                      </div>
                    </div>
                  )
                })()}
              </>
            ) : (
              <div className="empty-state" style={{ padding: 32 }}>
                <div className="empty-icon"></div>
                <div className="empty-text">Aucune donnée comptable</div>
                <div style={{ fontSize: 12, color: '#CBD5E1', marginTop: 4 }}>Renseigner le coût HT pour activer le suivi</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Sub-components ───

function SectionLabel({ children }) {
  return (
    <div style={{
      ...TYPO.caption, color: BASE.textMuted,
      textTransform: 'uppercase', letterSpacing: 1.5,
      marginBottom: SPACE.md, marginTop: SPACE.xs, padding: `0 2px`,
    }}>{children}</div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: `${SPACE.sm - 1}px 0`, borderBottom: `1px solid ${BASE.bgHover}20`,
    }}>
      <span style={{ ...TYPO.caption, color: BASE.textMuted }}>{label}</span>
      <span style={{ ...TYPO.bodyBold, color: BASE.text, textAlign: 'right', maxWidth: '60%' }}>{value}</span>
    </div>
  )
}

function OpRow({ icon, label, value }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: SPACE.md,
      padding: `${SPACE.sm}px 0`, borderBottom: `1px solid ${BASE.bgHover}20`,
    }}>
      <span style={{ fontSize: 16 }}>{icon}</span>
      <span style={{ ...TYPO.caption, color: BASE.textMuted, minWidth: 60 }}>{label}</span>
      <span style={{ ...TYPO.bodyBold, color: BASE.text, flex: 1 }}>{value}</span>
    </div>
  )
}

function KpiCard({ label, value, color, sub }) {
  return (
    <div style={{
      flex: 1, textAlign: 'center', padding: `${SPACE.md}px ${SPACE.xs}px`,
      background: BASE.bgHover, borderRadius: RADIUS.sm, border: `1px solid ${BASE.bgHover}`,
      boxShadow: SHADOW.sm,
    }}>
      <div style={{ fontSize: 20, fontWeight: 600, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 9, color: BASE.textMuted, fontWeight: 700, marginTop: 3 }}>{label}</div>
      {sub && <div style={{ fontSize: 8, color: BASE.textDisabled, marginTop: 1 }}>{sub}</div>}
    </div>
  )
}

function StatPill({ icon, label, value, count, color }) {
  return (
    <div className="card" style={{ flex: 1, textAlign: 'center', padding: `${SPACE.md}px ${SPACE.xs + 2}px` }}>
      <div style={{ fontSize: 18, marginBottom: 2 }}>{icon}</div>
      <div style={{ fontSize: 18, fontWeight: 600, color }}>{value}</div>
      <div style={{ fontSize: 9, color: BASE.textMuted, fontWeight: 700 }}>{label}</div>
    </div>
  )
}

function MiniInfo({ label, value, color }) {
  return (
    <div style={{
      flex: 1, textAlign: 'center', padding: `${SPACE.xs + 2}px ${SPACE.xs}px`,
      background: `${color}08`, borderRadius: RADIUS.sm, border: `1px solid ${color}15`,
    }}>
      <div style={{ ...TYPO.bodyBold, color }}>{value}</div>
      <div style={{ fontSize: 9, color: BASE.textMuted, fontWeight: 600 }}>{label}</div>
    </div>
  )
}
