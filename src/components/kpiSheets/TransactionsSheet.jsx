import React, { useMemo, useState } from 'react'
import { ListOrdered, Download, ChevronLeft, ChevronRight } from 'lucide-react'
import KpiDetailSheet from './KpiDetailSheet'
import { fmtEuro, fmtDateTime, Section, EmptyState, ActionButton } from './_shared'
import { exportCSV, todayISO } from '../../lib/csvExport'
import { BASE, SPACE, RADIUS, TYPO } from '../../lib/theme'

const ACCENT = '#5DAB8B'
const DAY_MS = 86400000
const PAGE_SIZE = 20

export default function TransactionsSheet({
  isOpen, onClose,
  sales = [], events = [],
}) {
  const [filterEvent, setFilterEvent] = useState('all')
  const [filterPayment, setFilterPayment] = useState('all')
  const [sort, setSort] = useState('date-desc')
  const [page, setPage] = useState(0)

  const now = Date.now()
  const from = now - 30 * DAY_MS

  const filtered = useMemo(() => {
    let list = (sales || []).filter(s => {
      if (!s?.created_at) return false
      const t = new Date(s.created_at).getTime()
      return t >= from && t <= now
    })
    if (filterEvent !== 'all') list = list.filter(s => s.event_id === filterEvent)
    if (filterPayment !== 'all') {
      list = list.filter(s => (s.payment_method || '').toLowerCase().includes(filterPayment))
    }
    if (sort === 'date-desc') list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    if (sort === 'date-asc') list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    if (sort === 'amount-desc') list.sort((a, b) => Number(b.total_amount || 0) - Number(a.total_amount || 0))
    if (sort === 'amount-asc') list.sort((a, b) => Number(a.total_amount || 0) - Number(b.total_amount || 0))
    return list
  }, [sales, filterEvent, filterPayment, sort, from, now])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const slice = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE)

  const eventOptions = useMemo(() => {
    const ids = new Set((sales || []).map(s => s.event_id).filter(Boolean))
    return Array.from(ids).map(id => {
      const ev = (events || []).find(e => e.id === id)
      return { id, name: ev?.name || ev?.lieu || '—' }
    })
  }, [sales, events])

  const handleExport = () => {
    exportCSV(
      filtered,
      `transactions-30j-${todayISO()}.csv`,
      [
        { key: 'sale_number', label: 'N°' },
        { key: s => fmtDateTime(s.created_at), label: 'Date' },
        { key: s => (events || []).find(e => e.id === s.event_id)?.name || '', label: 'Concert' },
        { key: 'payment_method', label: 'Paiement' },
        { key: 'total_amount', label: 'Montant (€)' },
        { key: s => s.is_aggregate ? 'oui' : 'non', label: 'Bilan agrégé' },
      ]
    )
  }

  const selectStyle = {
    ...TYPO.caption,
    padding: `6px 10px`,
    borderRadius: RADIUS.md,
    border: `1px solid ${BASE.border}`,
    background: BASE.bg,
    color: BASE.text,
    cursor: 'pointer',
  }

  return (
    <KpiDetailSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Transactions 30j"
      subtitle={`${filtered.length} résultat${filtered.length > 1 ? 's' : ''}`}
      accentColor={ACCENT}
      icon={ListOrdered}
      footer={
        <ActionButton onClick={handleExport} accent={ACCENT}
                      style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Download size={16} /> Exporter CSV
        </ActionButton>
      }
    >
      <Section title="Filtres" accent={ACCENT}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: SPACE.sm }}>
          <select value={filterEvent} onChange={e => { setFilterEvent(e.target.value); setPage(0) }} style={selectStyle}>
            <option value="all">Tous concerts</option>
            {eventOptions.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
          <select value={filterPayment} onChange={e => { setFilterPayment(e.target.value); setPage(0) }} style={selectStyle}>
            <option value="all">Tous paiements</option>
            <option value="cb">CB / Carte</option>
            <option value="esp">Espèces</option>
          </select>
          <select value={sort} onChange={e => setSort(e.target.value)} style={selectStyle}>
            <option value="date-desc">Date ↓</option>
            <option value="date-asc">Date ↑</option>
            <option value="amount-desc">Montant ↓</option>
            <option value="amount-asc">Montant ↑</option>
          </select>
        </div>
      </Section>

      {filtered.length === 0 ? (
        <EmptyState message="Aucune transaction ne correspond aux filtres." />
      ) : (
        <>
          <div style={{
            background: BASE.bgSurface,
            borderRadius: RADIUS.lg,
            border: `1px solid ${BASE.border}`,
            overflow: 'hidden',
          }}>
            {slice.map((s, i) => {
              const ev = (events || []).find(e => e.id === s.event_id)
              return (
                <div key={s.id || i} style={{
                  padding: SPACE.md,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: SPACE.sm,
                  borderBottom: i < slice.length - 1 ? `1px solid ${BASE.border}` : 'none',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ ...TYPO.bodyBold, color: BASE.text }}>
                        {s.sale_number || `#${(s.id || '').slice(0, 6)}`}
                      </span>
                      {s.is_aggregate && (
                        <span style={{
                          ...TYPO.micro,
                          padding: '2px 6px',
                          borderRadius: 4,
                          background: '#E8935A20',
                          color: '#E8935A',
                        }}>
                          bilan
                        </span>
                      )}
                    </div>
                    <div style={{ ...TYPO.micro, color: BASE.textMuted }}>
                      {fmtDateTime(s.created_at)}
                      {ev && ` · ${ev.name || ev.lieu}`}
                      {s.payment_method && ` · ${s.payment_method}`}
                    </div>
                  </div>
                  <div style={{ ...TYPO.bodyBold, color: ACCENT, flexShrink: 0 }}>
                    {fmtEuro(s.total_amount)}
                  </div>
                </div>
              )
            })}
          </div>

          {pageCount > 1 && (
            <div style={{
              marginTop: SPACE.md,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={safePage === 0}
                      style={pageBtnStyle(safePage === 0)}>
                <ChevronLeft size={14} /> Préc.
              </button>
              <span style={{ ...TYPO.caption, color: BASE.textSoft }}>
                Page {safePage + 1} / {pageCount}
              </span>
              <button onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))} disabled={safePage === pageCount - 1}
                      style={pageBtnStyle(safePage === pageCount - 1)}>
                Suiv. <ChevronRight size={14} />
              </button>
            </div>
          )}
        </>
      )}
    </KpiDetailSheet>
  )
}

function pageBtnStyle(disabled) {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '6px 10px',
    borderRadius: RADIUS.md,
    border: `1px solid ${BASE.border}`,
    background: BASE.bg,
    color: disabled ? BASE.textDisabled : BASE.text,
    ...TYPO.caption,
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.5 : 1,
  }
}
