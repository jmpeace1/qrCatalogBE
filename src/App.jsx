import { useEffect, useId, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import LiquidGlass from 'liquid-glass-react'
import './App.css'

const isValid = (text) => /^\d*(\.\d{0,2})?$/.test(text)

const format = (n) => (Number.isFinite(n) ? n.toFixed(2) : '')

const selectAll = (e) => e.target.select()

const QUICK_VALUES = [1, 10, 100, 1000]

function NumberField({ label, name, value, onChange, tint, inputRef, quick }) {
  const id = useId()
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
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <div className="field-row">
        <input
          id={id}
          ref={inputRef}
          className={`amount-input ${tint}`}
          type="text"
          inputMode="decimal"
          enterKeyHint="done"
          name={`${name}-amount`}
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
        {quick ? (
          <div className="quick-grid">
            {QUICK_VALUES.map((amount) => (
              <button
                key={amount}
                type="button"
                className={`quick-button ${tint}`}
                onClick={() => onChange(format(amount))}
              >
                {amount}
              </button>
            ))}
          </div>
        ) : (
          <div className="quick-spacer" />
        )}
      </div>
    </div>
  )
}

// Fallback rates, used until /last.json loads (or if it can't be read)
const DEFAULT_RATES = {
  BCB_COMPRA: 10.5,
  BCB_VENTA: 10.4,
  BINANCE_COMPRA: 12.5,
  BINANCE_VENTA: 12.4,
}

// Options shown in the COMPRA USD / VENTA USD panel, in order. Values come
// from <PREFIX>_COMPRA / <PREFIX>_VENTA in last.json.
const RATE_OPTIONS = [
  { key: 'bcb', label: 'BCB', prefix: 'BCB' },
  { key: 'binance', label: 'BINANCE', prefix: 'BINANCE' },
  { key: 'bybit', label: 'BYBIT', prefix: 'BYBIT' },
  { key: 'airtm', label: 'AIRTM', prefix: 'AIRTM' },
]

const RATE_KEYS = RATE_OPTIONS.flatMap(({ prefix }) => [
  `${prefix}_COMPRA`,
  `${prefix}_VENTA`,
])

// Options missing from the file (and without a fallback) are left out
const buildRateSources = (rates) =>
  RATE_OPTIONS.filter(
    ({ prefix }) => rates[`${prefix}_COMPRA`] && rates[`${prefix}_VENTA`],
  ).map(({ key, label, prefix }) => ({
    key,
    label,
    rates: {
      compra: format(rates[`${prefix}_COMPRA`]),
      venta: format(rates[`${prefix}_VENTA`]),
    },
  }))

const ICON_PROPS = {
  viewBox: '0 0 24 24',
  width: 20,
  height: 20,
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': 'true',
}

const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Fallback for browsers/contexts without the async clipboard API
    const area = document.createElement('textarea')
    area.value = text
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    const ok = document.execCommand('copy')
    area.remove()
    return ok
  }
}

function App() {
  const [tc, setTc] = useState('')
  const [bob, setBob] = useState('')
  const [usd, setUsd] = useState('')
  const [source, setSource] = useState('bob')
  const [rates, setRates] = useState(DEFAULT_RATES)
  const [updated, setUpdated] = useState('')
  const [overlayMode, setOverlayMode] = useState(null)
  const [rateMode, setRateMode] = useState(null)
  const [rateSource, setRateSource] = useState(null)
  const bobRef = useRef(null)
  const usdRef = useRef(null)
  const tcChangeRef = useRef(null)
  const tcTouched = useRef(false)
  const copiedTimer = useRef(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    let applied = false
    // Initial selection is COMPRA / BCB, unless the user already changed TC
    const applyStartupTc = (rate) => {
      if (applied || tcTouched.current) return
      applied = true
      tcChangeRef.current(format(rate))
      tcTouched.current = false
      setRateMode('compra')
      setRateSource('bcb')
    }
    fetch('/last.json', { cache: 'no-store', signal: controller.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data) => {
        const loaded = {}
        for (const key of RATE_KEYS) {
          const value = Number(data[key])
          if (Number.isFinite(value) && value > 0) loaded[key] = value
        }
        const next = { ...DEFAULT_RATES, ...loaded }
        setRates(next)
        if (typeof data.UPDATED === 'string') setUpdated(data.UPDATED)
        applyStartupTc(next.BCB_COMPRA)
      })
      .catch((err) => {
        if (err?.name !== 'AbortError') applyStartupTc(DEFAULT_RATES.BCB_COMPRA)
      })
    return () => controller.abort()
  }, [])

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

  // Core TC update, also used when a rate option is selected
  const changeTc = (value) => {
    tcTouched.current = true
    setTc(value)
    const rate = parseFloat(value)
    if (source === 'bob') setUsd(usdFromBob(bob, rate))
    else setBob(bobFromUsd(usd, rate))
  }

  // Manual TC edits deselect the COMPRA/VENTA choice
  const handleTcInput = (value) => {
    setRateMode(null)
    setRateSource(null)
    changeTc(value)
  }

  const handleRatePress = (selected) => {
    const mode = overlayMode
    // Flush so the panel is gone and the fields are reordered before focusing
    flushSync(() => {
      setRateMode(mode)
      setRateSource(selected.key)
      changeTc(selected.rates[mode])
      setOverlayMode(null)
    })
    const input = (mode === 'compra' ? bobRef : usdRef).current
    // Only jump into the field when it is still empty / 0.00
    if (input && !parseFloat(input.value)) {
      input.focus()
      input.select()
    }
  }

  tcChangeRef.current = changeTc

  const descriptionText =
    rateMode === 'venta'
      ? `${usd || '0.00'} dólares son Bs. ${bob || '0.00'} a TC ${tc || '0.00'}`
      : `Bs. ${bob || '0.00'} son ${usd || '0.00'} dólares a TC ${tc || '0.00'}`

  const handleCopy = async () => {
    if (await copyText(descriptionText)) {
      setCopied(true)
      clearTimeout(copiedTimer.current)
      copiedTimer.current = setTimeout(() => setCopied(false), 1500)
    }
  }

  const rateSources = buildRateSources(rates)
  const selectedSource = rateSources.find((option) => option.key === rateSource)
  const tcLabel =
    rateMode && selectedSource
      ? `TC ${selectedSource.label} ${rateMode === 'compra' ? 'Compra' : 'Venta'}`
      : 'TC'

  const [pillFrom, pillTo] =
    rateMode === 'venta' ? ['USD', 'BOB'] : ['BOB', 'USD']

  const bobField = (
    <NumberField
      label="BOB"
      name="bob"
      tint="tint-blue"
      quick
      inputRef={bobRef}
      value={bob}
      onChange={handleBobChange}
    />
  )
  const usdField = (
    <NumberField
      label="USD"
      name="usd"
      tint="tint-green"
      quick
      inputRef={usdRef}
      value={usd}
      onChange={handleUsdChange}
    />
  )

  return (
    <main className="stage">
      <section className="panel">
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
        {updated && (
          <p className="updated-label">TCs actualizados en {updated}</p>
        )}
        <div className="actions">
          <button
            type="button"
            className="action-button"
            onClick={() => setOverlayMode('compra')}
          >
            {rateMode === 'compra' && (
              <span className="check" aria-label="selected">
                ✓
              </span>
            )}
            COMPRA USD
          </button>
          <button
            type="button"
            className="action-button"
            onClick={() => setOverlayMode('venta')}
          >
            {rateMode === 'venta' && (
              <span className="check" aria-label="selected">
                ✓
              </span>
            )}
            VENTA USD
          </button>
        </div>
        <div className="fields">
          <NumberField
            label={tcLabel}
            name="tc"
            value={tc}
            onChange={handleTcInput}
          />
          {rateMode === 'venta' ? (
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
          <div className="description-row">
            <p className="description">{descriptionText}</p>
            <button
              type="button"
              className="copy-button"
              aria-label="Copy to clipboard"
              onClick={handleCopy}
            >
              {copied ? (
                <svg {...ICON_PROPS} className="copied-icon">
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
              ) : (
                <svg {...ICON_PROPS}>
                  <rect x="9" y="9" width="11" height="11" rx="2" />
                  <path d="M5 15V6a2 2 0 0 1 2-2h9" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </section>
      {overlayMode && (
        <div
          className="overlay"
          onClick={(e) => e.target === e.currentTarget && setOverlayMode(null)}
        >
          <section className="overlay-panel" role="dialog" aria-modal="true">
            <button
              type="button"
              className="close-button"
              aria-label="Close"
              onClick={() => setOverlayMode(null)}
            >
              ✕
            </button>
            {rateSources.map((option) => (
              <button
                key={option.key}
                type="button"
                className="action-button"
                onClick={() => handleRatePress(option)}
              >
                {rateMode === overlayMode && rateSource === option.key && (
                  <span className="check" aria-label="selected">
                    ✓
                  </span>
                )}
                {option.label} {option.rates[overlayMode]}
              </button>
            ))}
          </section>
        </div>
      )}
    </main>
  )
}

export default App
