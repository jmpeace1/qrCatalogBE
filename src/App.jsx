import { useEffect, useId, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import './App.css'

const isValid = (text) => /^\d*(\.\d{0,2})?$/.test(text)

const format = (n) => (Number.isFinite(n) ? n.toFixed(2) : '')

const selectAll = (e) => e.target.select()

const QUICK_VALUES = [1, 10, 100, 1000]

const MINI_ICON = {
  viewBox: '0 0 24 24',
  width: 14,
  height: 14,
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': 'true',
}

function QuickGrid({ tint, disabled, onPick }) {
  return (
    <div className="quick-grid">
      {QUICK_VALUES.map((amount) => (
        <button
          key={amount}
          type="button"
          className={`quick-button ${tint}`}
          disabled={disabled}
          onClick={() => onPick(amount)}
        >
          {amount}
        </button>
      ))}
    </div>
  )
}

// `controls` (optional) adds the RESTAR / SUMAR button grids, the revert
// button and the clear (X) button around the input.
function NumberField({
  label,
  name,
  value,
  onChange,
  tint,
  inputRef,
  controls,
}) {
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

  const isZero = !parseFloat(value)

  return (
    <div className="field">
      <div className="field-head">
        {controls ? <span className="quick-caption">RESTAR</span> : <span />}
        <div className="field-title">
          {controls && (
            <button
              type="button"
              className="mini-button"
              aria-label={`Revert ${label}`}
              disabled={!controls.canRevert}
              onClick={controls.onRevert}
            >
              <svg {...MINI_ICON}>
                <path d="M3 12a9 9 0 1 0 3-6.7" />
                <path d="M3 4v5h5" />
              </svg>
            </button>
          )}
          <label className="field-label" htmlFor={id}>
            {label}
          </label>
          {controls && (
            <button
              type="button"
              className="mini-button"
              aria-label={`Clear ${label}`}
              onClick={controls.onClear}
            >
              <svg {...MINI_ICON}>
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          )}
        </div>
        {controls ? <span className="quick-caption">SUMAR</span> : <span />}
      </div>
      <div className="field-row">
        {controls ? (
          <QuickGrid
            tint={tint}
            disabled={isZero}
            onPick={(amount) => controls.onAdjust(-amount)}
          />
        ) : (
          <div className="quick-spacer" />
        )}
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
        {controls ? (
          <QuickGrid
            tint={tint}
            onPick={(amount) => controls.onAdjust(amount)}
          />
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
  { key: 'paralelo', label: 'PARALELO', prefix: 'PARALELO' },
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
  // Per-field undo history: entries are { value, session }. Changes made in
  // the same session (one focus / one button press) share a single entry.
  const [history, setHistory] = useState({ bob: [], usd: [] })
  const sessionRef = useRef(0)
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

  const newSession = () => {
    sessionRef.current += 1
  }

  // Focus changes start a new undo step
  useEffect(() => {
    document.addEventListener('focusin', newSession)
    document.addEventListener('focusout', newSession)
    return () => {
      document.removeEventListener('focusin', newSession)
      document.removeEventListener('focusout', newSession)
    }
  }, [])

  const record = (field, previous) => {
    const session = sessionRef.current
    setHistory((h) => {
      const stack = h[field]
      if (stack.length && stack[stack.length - 1].session === session) return h
      return {
        ...h,
        [field]: [...stack, { value: previous, session }].slice(-100),
      }
    })
  }

  const bobFromUsd = (usdValue, rate) =>
    usdValue === '' || !rate ? '' : format(parseFloat(usdValue) * rate)
  const usdFromBob = (bobValue, rate) =>
    bobValue === '' || !rate ? '' : format(parseFloat(bobValue) / rate)

  // Sets BOB or USD as if typed there and recalculates the other one.
  // `track: false` skips recording the field's own previous value (revert).
  const setField = (field, value, { track = true } = {}) => {
    const rate = parseFloat(tc)
    if (field === 'bob') {
      const nextUsd = usdFromBob(value, rate)
      if (track && value !== bob) record('bob', bob)
      if (nextUsd !== usd) record('usd', usd)
      setSource('bob')
      setBob(value)
      setUsd(nextUsd)
    } else {
      const nextBob = bobFromUsd(value, rate)
      if (track && value !== usd) record('usd', usd)
      if (nextBob !== bob) record('bob', bob)
      setSource('usd')
      setUsd(value)
      setBob(nextBob)
    }
  }

  const handleBobChange = (value) => setField('bob', value)
  const handleUsdChange = (value) => setField('usd', value)

  const fieldControls = (field) => ({
    canRevert: history[field].length > 0,
    onAdjust: (delta) => {
      newSession()
      const current = parseFloat(field === 'bob' ? bob : usd) || 0
      const next = Math.max(0, Math.round((current + delta) * 100) / 100)
      setField(field, format(next))
    },
    onClear: () => {
      newSession()
      setField(field, '0.00')
    },
    onRevert: () => {
      newSession()
      const current = field === 'bob' ? bob : usd
      const stack = [...history[field]]
      // Skip steps that wouldn't change anything
      while (stack.length && stack[stack.length - 1].value === current) {
        stack.pop()
      }
      if (!stack.length) {
        setHistory((h) => ({ ...h, [field]: [] }))
        return
      }
      const { value } = stack.pop()
      setHistory((h) => ({ ...h, [field]: stack }))
      setField(field, value, { track: false })
    },
  })

  // Core TC update, also used when a rate option is selected
  const changeTc = (value) => {
    tcTouched.current = true
    setTc(value)
    const rate = parseFloat(value)
    if (source === 'bob') {
      const nextUsd = usdFromBob(bob, rate)
      if (nextUsd !== usd) record('usd', usd)
      setUsd(nextUsd)
    } else {
      const nextBob = bobFromUsd(usd, rate)
      if (nextBob !== bob) record('bob', bob)
      setBob(nextBob)
    }
  }

  // Manual TC edits deselect the COMPRA/VENTA choice
  const handleTcInput = (value) => {
    setRateMode(null)
    setRateSource(null)
    changeTc(value)
  }

  const handleRatePress = (selected) => {
    newSession()
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

  const [fromCurrency, toCurrency] =
    rateMode === 'venta' ? ['USD', 'BOB'] : ['BOB', 'USD']
  const pageTitle = `${fromCurrency} → ${toCurrency}`

  // The BOB → USD / USD → BOB label is the page title
  useEffect(() => {
    document.title = pageTitle
  }, [pageTitle])

  const bobField = (
    <NumberField
      label="BOB"
      name="bob"
      tint="tint-blue"
      controls={fieldControls('bob')}
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
      controls={fieldControls('usd')}
      inputRef={usdRef}
      value={usd}
      onChange={handleUsdChange}
    />
  )

  return (
    <main className="stage">
      <section className="panel card-3d">
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
          <section
            className="overlay-panel card-3d"
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
