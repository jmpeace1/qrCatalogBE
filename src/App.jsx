import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import LiquidGlass from 'liquid-glass-react'
import GlassPanel from './GlassPanel'
import './App.css'

const isValid = (text) => /^\d*(\.\d{0,2})?$/.test(text)

const format = (n) => (Number.isFinite(n) ? n.toFixed(2) : '')

const selectAll = (e) => e.target.select()

function NumberField({ label, value, onChange, tint, inputRef }) {
  const handleChange = (e) => {
    const next = e.target.value
    if (!isValid(next)) return
    onChange(next)
    if (/\.\d{2}$/.test(next)) {
      const input = e.target
      setTimeout(() => input.blur(), 0)
    }
  }

  const handleBlur = () => {
    const formatted = format(parseFloat(value))
    if (formatted !== value) onChange(formatted)
  }

  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <input
        ref={inputRef}
        className={`amount-input ${tint}`}
        type="text"
        inputMode="decimal"
        enterKeyHint="done"
        name={`${label.toLowerCase()}-amount`}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        data-lpignore="true"
        data-1p-ignore="true"
        data-form-type="other"
        placeholder="0.00"
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
        onFocus={selectAll}
        onClick={selectAll}
      />
    </label>
  )
}

const BCB_RATES = { compra: '10.50', venta: '10.40' }

function App() {
  const [tc, setTc] = useState('12.22')
  const [bob, setBob] = useState('')
  const [usd, setUsd] = useState('')
  const [source, setSource] = useState('bob')
  const [overlayMode, setOverlayMode] = useState(null)
  const [bcbMode, setBcbMode] = useState(null)
  const bobRef = useRef(null)
  const usdRef = useRef(null)

  // Tapping outside a field blurs it, which dismisses the mobile keyboard
  useEffect(() => {
    if (!overlayMode) return
    const handleKeyDown = (e) => e.key === 'Escape' && setOverlayMode(null)
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [overlayMode])

  useEffect(() => {
    const handlePointerDown = (e) => {
      const active = document.activeElement
      if (active instanceof HTMLInputElement && !e.target.closest('.field')) {
        active.blur()
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [])

  const bobFromUsd = (usdValue, rate) =>
    usdValue === '' || !rate ? '' : format(parseFloat(usdValue) * rate)
  const usdFromBob = (bobValue, rate) =>
    bobValue === '' || !rate ? '' : format(parseFloat(bobValue) / rate)

  const handleBobChange = (value) => {
    setSource('bob')
    setBob(value)
    setUsd(usdFromBob(value, parseFloat(tc)))
  }

  const handleUsdChange = (value) => {
    setSource('usd')
    setUsd(value)
    setBob(bobFromUsd(value, parseFloat(tc)))
  }

  const handleTcChange = (value) => {
    setTc(value)
    const rate = parseFloat(value)
    if (source === 'bob') setUsd(usdFromBob(bob, rate))
    else setBob(bobFromUsd(usd, rate))
  }

  const handleBcbPress = () => {
    const mode = overlayMode
    // Flush so the panel is gone and the fields are reordered before focusing
    flushSync(() => {
      setBcbMode(mode)
      handleTcChange(BCB_RATES[mode])
      setOverlayMode(null)
    })
    const input = (mode === 'compra' ? bobRef : usdRef).current
    input?.focus()
    input?.select()
  }

  const [pillFrom, pillTo] =
    bcbMode === 'venta' ? ['USD', 'BOB'] : ['BOB', 'USD']

  const bobField = (
    <NumberField
      label="BOB"
      tint="tint-blue"
      inputRef={bobRef}
      value={bob}
      onChange={handleBobChange}
    />
  )
  const usdField = (
    <NumberField
      label="USD"
      tint="tint-green"
      inputRef={usdRef}
      value={usd}
      onChange={handleUsdChange}
    />
  )

  return (
    <main className="stage">
      <GlassPanel className="panel">
        <div className="pill-slot">
          <LiquidGlass
            displacementScale={25}
            blurAmount={0.08}
            saturation={140}
            aberrationIntensity={1}
            elasticity={0.25}
            cornerRadius={999}
            padding="14px 28px"
            style={{ position: 'absolute', top: '50%', left: '50%' }}
          >
            <span className="hello">
              <svg
                className="person-icon"
                viewBox="0 0 24 24"
                width="22"
                height="22"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2c-4.42 0-8 2.24-8 5v3h16v-3c0-2.76-3.58-5-8-5z" />
              </svg>
              {pillFrom}
              <svg
                className="arrow-icon"
                viewBox="0 0 24 24"
                width="22"
                height="22"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-label="to"
                role="img"
              >
                <path d="M4 12h16M14 6l6 6-6 6" />
              </svg>
              {pillTo}
            </span>
          </LiquidGlass>
        </div>
        <div className="actions">
          <button
            type="button"
            className="action-button"
            onClick={() => setOverlayMode('compra')}
          >
            COMPRA USD
          </button>
          <button
            type="button"
            className="action-button"
            onClick={() => setOverlayMode('venta')}
          >
            VENTA USD
          </button>
        </div>
        <div className="fields">
          <NumberField label="TC" value={tc} onChange={handleTcChange} />
          {bcbMode === 'venta' ? (
            <>
              {usdField}
              {bobField}
            </>
          ) : (
            <>
              {bobField}
              {usdField}
            </>
          )}
          <p className="description">
            {bcbMode === 'venta'
              ? `${usd || '0.00'} dólares son Bs. ${bob || '0.00'} a ${tc || '0.00'}`
              : `Bs. ${bob || '0.00'} son ${usd || '0.00'} dólares a ${tc || '0.00'}`}
          </p>
        </div>
      </GlassPanel>
      {overlayMode && (
        <div
          className="overlay"
          onClick={(e) => e.target === e.currentTarget && setOverlayMode(null)}
        >
          <GlassPanel
            className="overlay-panel"
            blurAmount={0.6}
            role="dialog"
            aria-modal="true"
          >
            <button
              type="button"
              className="close-button"
              aria-label="Close"
              onClick={() => setOverlayMode(null)}
            >
              ✕
            </button>
            <button
              type="button"
              className="action-button"
              onClick={handleBcbPress}
            >
              {bcbMode === overlayMode && (
                <span className="check" aria-label="selected">
                  ✓
                </span>
              )}
              BCB {BCB_RATES[overlayMode]}
            </button>
          </GlassPanel>
        </div>
      )}
    </main>
  )
}

export default App
