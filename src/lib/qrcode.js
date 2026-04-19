// ─── Code 128B Barcode SVG Generator ───
// Zero-dependency barcode generator for inventory SKUs
// Compatible with BarcodeDetector('code_128') in Scanner.jsx

// Code 128B encoding table: each code is 6 elements (bar,space,bar,space,bar,space)
// Values represent module widths (1-4)
const CODE128B_PATTERNS = [
  [2,1,2,2,2,2],[2,2,2,1,2,2],[2,2,2,2,2,1],[1,2,1,2,2,3],[1,2,1,3,2,2],
  [1,3,1,2,2,2],[1,2,2,2,1,3],[1,2,2,3,1,2],[1,3,2,2,1,2],[2,2,1,2,1,3],
  [2,2,1,3,1,2],[2,3,1,2,1,2],[1,1,2,2,3,2],[1,2,2,1,3,2],[1,2,2,2,3,1],
  [1,1,3,2,2,2],[1,2,3,1,2,2],[1,2,3,2,2,1],[2,2,3,2,1,1],[2,2,1,1,3,2],
  [2,2,1,2,3,1],[2,1,3,2,1,2],[2,2,3,1,1,2],[3,1,2,1,3,1],[3,1,1,2,2,2],
  [3,2,1,1,2,2],[3,2,1,2,2,1],[3,1,2,2,1,2],[3,2,2,1,1,2],[3,2,2,2,1,1],
  [2,1,2,1,2,3],[2,1,2,3,2,1],[2,3,2,1,2,1],[1,1,1,3,2,3],[1,3,1,1,2,3],
  [1,3,1,3,2,1],[1,1,2,3,1,3],[1,3,2,1,1,3],[1,3,2,3,1,1],[2,1,1,3,1,3],
  [2,3,1,1,1,3],[2,3,1,3,1,1],[1,1,2,1,3,3],[1,1,2,3,3,1],[1,3,2,1,3,1],
  [1,1,3,1,2,3],[1,1,3,3,2,1],[1,3,3,1,2,1],[3,1,3,1,2,1],[2,1,1,3,3,1],
  [2,3,1,1,3,1],[2,1,3,1,1,3],[2,1,3,3,1,1],[2,1,3,1,3,1],[3,1,1,1,2,3],
  [3,1,1,3,2,1],[3,3,1,1,2,1],[3,1,2,1,1,3],[3,1,2,3,1,1],[3,3,2,1,1,1],
  [3,1,4,1,1,1],[2,2,1,4,1,1],[4,3,1,1,1,1],[1,1,1,2,2,4],[1,1,1,4,2,2],
  [1,2,1,1,2,4],[1,2,1,4,2,1],[1,4,1,1,2,2],[1,4,1,2,2,1],[1,1,2,2,1,4],
  [1,1,2,4,1,2],[1,2,2,1,1,4],[1,2,2,4,1,1],[1,4,2,1,1,2],[1,4,2,2,1,1],
  [2,4,1,2,1,1],[2,2,1,1,1,4],[4,1,3,1,1,1],[2,4,1,1,1,2],[1,3,4,1,1,1],
  [1,1,1,2,4,2],[1,2,1,1,4,2],[1,2,1,2,4,1],[1,1,4,2,1,2],[1,2,4,1,1,2],
  [1,2,4,2,1,1],[4,1,1,2,1,2],[4,2,1,1,1,2],[4,2,1,2,1,1],[2,1,2,1,4,1],
  [2,1,4,1,2,1],[4,1,2,1,2,1],[1,1,1,1,4,3],[1,1,1,3,4,1],[1,3,1,1,4,1],
  [1,1,4,1,1,3],[1,1,4,3,1,1],[4,1,1,1,1,3],[4,1,1,3,1,1],[1,1,3,1,4,1],
  [1,1,4,1,3,1],[3,1,1,1,4,1],[4,1,1,1,3,1],[2,1,1,4,1,2],[2,1,1,2,1,4],
  [2,1,1,2,3,2],
]

// Stop pattern: 7 elements (includes final bar)
const STOP_PATTERN = [2,3,3,1,1,1,2]

const START_B = 104
const STOP_CODE = 106

/**
 * Generate a Code 128B barcode as an SVG string
 * @param {string} text - The text to encode
 * @param {object} options
 * @param {number} options.width - SVG width (default 200)
 * @param {number} options.height - SVG height (default 80)
 * @returns {string} SVG markup string
 */
export function generateBarcodeSVG(text, { width = 200, height = 80 } = {}) {
  if (!text || typeof text !== 'string') {
    return ''
  }

  // Encode: Start B + characters + checksum + Stop
  const codes = [START_B]
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i)
    if (charCode < 32 || charCode > 127) {
      // Skip non-encodable characters, substitute with space
      codes.push(0)
    } else {
      codes.push(charCode - 32)
    }
  }

  // Calculate checksum
  let checksum = START_B
  for (let i = 1; i < codes.length; i++) {
    checksum += codes[i] * i
  }
  checksum = checksum % 103
  codes.push(checksum)

  // Build bar pattern from codes
  const bars = []
  for (const code of codes) {
    const pattern = CODE128B_PATTERNS[code]
    if (pattern) {
      for (let j = 0; j < pattern.length; j++) {
        bars.push({ width: pattern[j], isBar: j % 2 === 0 })
      }
    }
  }
  // Add stop pattern
  for (let j = 0; j < STOP_PATTERN.length; j++) {
    bars.push({ width: STOP_PATTERN[j], isBar: j % 2 === 0 })
  }

  // Calculate total modules
  const totalModules = bars.reduce((sum, b) => sum + b.width, 0)

  // Add quiet zones (10 modules each side)
  const quietZone = 10
  const totalWithQuiet = totalModules + quietZone * 2

  // Build SVG rects
  const barHeight = height - 20 // Leave room for text
  const moduleWidth = width / totalWithQuiet
  let x = quietZone * moduleWidth
  const rects = []

  for (const bar of bars) {
    const w = bar.width * moduleWidth
    if (bar.isBar) {
      rects.push(`<rect x="${x.toFixed(2)}" y="0" width="${w.toFixed(2)}" height="${barHeight}" fill="#1E293B"/>`)
    }
    x += w
  }

  // Text below barcode
  const fontSize = Math.min(12, Math.max(8, width / text.length / 1.2))

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <rect width="${width}" height="${height}" fill="white"/>
  ${rects.join('\n  ')}
  <text x="${width / 2}" y="${height - 4}" text-anchor="middle" font-family="monospace" font-size="${fontSize}" fill="#1E293B">${escapeXml(text)}</text>
</svg>`
}

function escapeXml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
