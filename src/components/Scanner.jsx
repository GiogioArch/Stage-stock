import React, { useState, useRef, useEffect, useCallback, createElement } from 'react'
import { useToast } from '../shared/hooks'
import { Keyboard, X } from 'lucide-react'
import { Modal } from './UI'

export default function Scanner({ products, locations, stock, onMovement, onClose }) {
  const onToast = useToast()
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const [scanning, setScanning] = useState(true)
  const [scannedCode, setScannedCode] = useState(null)
  const [matchedProduct, setMatchedProduct] = useState(null)
  const [manualMode, setManualMode] = useState(false)
  const [manualSku, setManualSku] = useState('')

  // ─── Start camera ───
  useEffect(() => {
    if (!scanning || manualMode) return
    let mounted = true

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
        })
        if (!mounted) { stream.getTracks().forEach(t => t.stop()); return }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play()
        }
      } catch (err) {
        if (mounted) {
          onToast('Camera non disponible — mode manuel activé', '#8B6DB8')
          setManualMode(true)
        }
      }
    }
    startCamera()

    return () => {
      mounted = false
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
        streamRef.current = null
      }
    }
  }, [scanning, manualMode])

  // ─── BarcodeDetector API (Chrome/Edge/Samsung) ───
  useEffect(() => {
    if (!scanning || manualMode || !videoRef.current) return
    if (!('BarcodeDetector' in window)) return

    let active = true
    const detector = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'code_128', 'qr_code', 'code_39'] })

    const scanLoop = async () => {
      if (!active || !videoRef.current || videoRef.current.readyState < 2) {
        if (active) requestAnimationFrame(scanLoop)
        return
      }
      try {
        const barcodes = await detector.detect(videoRef.current)
        if (barcodes.length > 0 && active) {
          handleScan(barcodes[0].rawValue)
          return
        }
      } catch {}
      if (active) requestAnimationFrame(scanLoop)
    }
    // Start scanning after video is playing
    const v = videoRef.current
    const onPlaying = () => scanLoop()
    v.addEventListener('playing', onPlaying)

    return () => {
      active = false
      v.removeEventListener('playing', onPlaying)
    }
  }, [scanning, manualMode])

  // ─── Handle scanned code ───
  const handleScan = useCallback((code) => {
    setScannedCode(code)
    setScanning(false)
    // Stop camera
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    // Find product by SKU
    const found = products.find(p =>
      p.sku?.toLowerCase() === code.toLowerCase() ||
      p.barcode?.toLowerCase() === code.toLowerCase()
    )
    setMatchedProduct(found || null)
  }, [products])

  // ─── Manual SKU search ───
  const handleManualSearch = () => {
    if (!manualSku.trim()) return
    handleScan(manualSku.trim())
  }

  // ─── Product stock info ───
  const productStock = matchedProduct
    ? stock.filter(s => s.product_id === matchedProduct.id && s.quantity > 0).map(s => ({
        location: locations.find(l => l.id === s.location_id)?.name || '?',
        qty: s.quantity,
      }))
    : []
  const totalQty = productStock.reduce((s, ps) => s + ps.qty, 0)

  // ─── Reset scan ───
  const resetScan = () => {
    setScannedCode(null)
    setMatchedProduct(null)
    setScanning(true)
    setManualSku('')
  }

  const hasBarcodeAPI = 'BarcodeDetector' in window

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: '#000', display: 'flex', flexDirection: 'column',
    }}>
      {/* ─── Header ─── */}
      <div style={{
        padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(0,0,0,0.8)', zIndex: 2,
      }}>
        <div style={{ color: 'white', fontWeight: 600, fontSize: 16 }}>
          {scanning ? 'Scanner' : 'Résultat'}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {scanning && (
            <button onClick={() => setManualMode(!manualMode)} style={{
              padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700,
              background: manualMode ? '#8B6DB8' : 'rgba(255,255,255,0.15)',
              color: 'white', border: 'none', cursor: 'pointer',
            }}>
              {manualMode ? ' Caméra' : <>{createElement(Keyboard, { size: 12 })} Manuel</>}
            </button>
          )}
          <button onClick={onClose} style={{
            padding: '6px 12px', borderRadius: 8, fontSize: 14, fontWeight: 700,
            background: 'rgba(255,255,255,0.15)', color: 'white', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }} aria-label="Fermer">{createElement(X, { size: 18 })}</button>
        </div>
      </div>

      {/* ─── Camera view ─── */}
      {scanning && !manualMode && (
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <video ref={videoRef} style={{
            width: '100%', height: '100%', objectFit: 'cover',
          }} playsInline muted />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          {/* Scan overlay */}
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              width: 260, height: 160, border: '3px solid rgba(232,115,90,0.8)',
              borderRadius: 12, boxShadow: '0 0 0 9999px rgba(0,0,0,0.4)',
            }} />
          </div>
          {/* Instructions */}
          <div style={{
            position: 'absolute', bottom: 40, left: 0, right: 0, textAlign: 'center',
          }}>
            <div style={{
              display: 'inline-block', padding: '8px 20px', borderRadius: 20,
              background: 'rgba(0,0,0,0.6)', color: 'white', fontSize: 13, fontWeight: 600,
            }}>
              {hasBarcodeAPI
                ? 'Place le code-barres dans le cadre'
                : 'BarcodeDetector non dispo — utilise le mode manuel'}
            </div>
          </div>
        </div>
      )}

      {/* ─── Manual input mode ─── */}
      {scanning && manualMode && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ marginBottom: 16 }}>{createElement(Keyboard, { size: 48, color: 'white' })}</div>
          <div style={{ color: 'white', fontSize: 14, fontWeight: 700, marginBottom: 16 }}>
            Saisie manuelle du SKU
          </div>
          <div style={{ display: 'flex', gap: 8, width: '100%', maxWidth: 320 }}>
            <input
              type="text"
              value={manualSku}
              onChange={e => setManualSku(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleManualSearch()}
              placeholder="SKU ou code-barres..."
              autoFocus
              style={{
                flex: 1, padding: '12px 16px', borderRadius: 12, fontSize: 15,
                border: '2px solid #8B6DB8', background: 'rgba(255,255,255,0.95)',
              }}
            />
            <button onClick={handleManualSearch} style={{
              padding: '12px 20px', borderRadius: 12, background: '#8B6DB8',
              color: 'white', fontWeight: 600, fontSize: 14, border: 'none', cursor: 'pointer',
            }}>OK</button>
          </div>
          {/* Quick product list */}
          <div style={{ marginTop: 20, width: '100%', maxWidth: 320, maxHeight: 300, overflowY: 'auto' }}>
            {manualSku.length >= 2 && products
              .filter(p => p.name.toLowerCase().includes(manualSku.toLowerCase()) || p.sku?.toLowerCase().includes(manualSku.toLowerCase()))
              .slice(0, 8)
              .map(p => (
                <button key={p.id} onClick={() => { setMatchedProduct(p); setScannedCode(p.sku || p.name); setScanning(false) }}
                  style={{
                    width: '100%', padding: '10px 14px', marginBottom: 4, borderRadius: 10,
                    background: 'rgba(255,255,255,0.9)', border: '1px solid #CBD5E1',
                    textAlign: 'left', cursor: 'pointer',
                  }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: '#94A3B8' }}>{p.sku || 'pas de SKU'}</div>
                </button>
              ))
            }
          </div>
        </div>
      )}

      {/* ─── Scan result ─── */}
      {!scanning && (
        <div style={{ flex: 1, padding: 20, overflowY: 'auto', background: 'linear-gradient(180deg, #F1F5F9, #2a2a2a)' }}>
          {/* Scanned code */}
          <div style={{
            textAlign: 'center', marginBottom: 20, padding: '12px 16px',
            background: 'rgba(255,255,255,0.08)', borderRadius: 12,
          }}>
            <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600 }}>Code scanné</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: 'white', fontFamily: 'monospace', marginTop: 4 }}>{scannedCode}</div>
          </div>

          {matchedProduct ? (
            <>
              {/* Product info */}
              <div style={{
                background: 'rgba(255,255,255,0.95)', borderRadius: 12, padding: '18px 16px',
                marginBottom: 16,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <div style={{
                    width: 50, height: 50, borderRadius: 8, background: '#F8FAFC',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
                  }}>{matchedProduct.image || ''}</div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: '#1E293B' }}>{matchedProduct.name}</div>
                    <div style={{ fontSize: 12, color: '#94A3B8' }}>
                      {matchedProduct.sku} · {matchedProduct.category}
                    </div>
                  </div>
                </div>

                {/* Stock by location */}
                <div style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8', marginBottom: 8 }}>Stock actuel</div>
                {productStock.length === 0 ? (
                  <div style={{ fontSize: 13, color: '#D4648A', fontWeight: 700 }}> Aucun stock disponible</div>
                ) : (
                  productStock.map((ps, i) => (
                    <div key={i} style={{
                      display: 'flex', justifyContent: 'space-between', padding: '6px 0',
                      borderBottom: i < productStock.length - 1 ? '1px solid #F1F5F9' : 'none',
                    }}>
                      <span style={{ fontSize: 13 }}>{ps.location}</span>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{ps.qty}</span>
                    </div>
                  ))
                )}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', padding: '8px 0 0',
                  marginTop: 8, borderTop: '2px solid #F1F5F9',
                }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>Total</span>
                  <span style={{
                    fontSize: 18, fontWeight: 600,
                    color: totalQty <= 0 ? '#D4648A' : totalQty <= (matchedProduct.min_stock || 5) ? '#8B6DB8' : '#5DAB8B',
                  }}>{totalQty}</span>
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                <button onClick={() => { onMovement('in'); onClose() }} style={{
                  flex: 1, padding: 14, borderRadius: 8, background: '#5DAB8B',
                  color: 'white', fontWeight: 600, fontSize: 14, border: 'none', cursor: 'pointer',
                }}> Entrée</button>
                <button onClick={() => { onMovement('out'); onClose() }} style={{
                  flex: 1, padding: 14, borderRadius: 8, background: '#D4648A',
                  color: 'white', fontWeight: 600, fontSize: 14, border: 'none', cursor: 'pointer',
                }}> Sortie</button>
                <button onClick={() => { onMovement('transfer'); onClose() }} style={{
                  flex: 1, padding: 14, borderRadius: 8, background: '#8B6DB8',
                  color: 'white', fontWeight: 600, fontSize: 14, border: 'none', cursor: 'pointer',
                }}> Transfert</button>
              </div>
            </>
          ) : (
            <div style={{
              background: 'rgba(255,255,255,0.95)', borderRadius: 12, padding: '30px 20px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>?</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#1E293B', marginBottom: 4 }}>Produit non trouvé</div>
              <div style={{ fontSize: 12, color: '#94A3B8' }}>
                Aucun produit ne correspond au code "{scannedCode}"
              </div>
            </div>
          )}

          {/* Scan again */}
          <button onClick={resetScan} style={{
            width: '100%', padding: 14, borderRadius: 8, marginTop: 12,
            background: 'rgba(255,255,255,0.15)', color: 'white',
            fontWeight: 600, fontSize: 14, border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer',
          }}> Scanner un autre</button>
        </div>
      )}
    </div>
  )
}
