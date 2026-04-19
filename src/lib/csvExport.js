/**
 * Export data as CSV file with French Excel compatibility.
 * @param {Array<Object>} data - Array of objects to export
 * @param {string} filename - Output filename (e.g. "produits-2026-03-28.csv")
 * @param {Array<{key: string|function, label: string}>} columns - Column definitions
 *   key can be a string (property name) or a function (row) => value
 */
export function exportCSV(data, filename, columns) {
  const separator = ';'

  function escapeCell(value) {
    if (value == null) return ''
    const str = String(value)
    if (str.includes(separator) || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return '"' + str.replace(/"/g, '""') + '"'
    }
    return str
  }

  const header = columns.map(c => escapeCell(c.label)).join(separator)

  const rows = data.map(row =>
    columns.map(col => {
      const value = typeof col.key === 'function' ? col.key(row) : row[col.key]
      return escapeCell(value)
    }).join(separator)
  )

  const csvContent = '\uFEFF' + [header, ...rows].join('\r\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/** Returns today's date as YYYY-MM-DD for filenames */
export function todayISO() {
  return new Date().toISOString().split('T')[0]
}
