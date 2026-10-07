import { useState } from 'react'
import LiquidGlass from 'liquid-glass-react'
import './App.css'

const isValid = (text) => /^\d*(\.\d{0,2})?$/.test(text)

const format = (n) => (Number.isFinite(n) ? n.toFixed(2) : '')

function NumberField({ label, value, onChange }) {
  const handleChange = (e) => {
    if (isValid(e.target.value)) onChange(e.target.value)
  }

  const handleBlur = () => {
    const formatted = format(parseFloat(value))
    if (formatted !== value) onChange(formatted)
  }

  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <input
        className="amount-input"
        type="text"
        inputMode="decimal"
        placeholder="0.00"
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
      />
    </label>
  )
}

function App() {
  const [tc, setTc] = useState('12.22')
  const [bob, setBob] = useState('')
  const [sus, setSus] = useState('')
  const [source, setSource] = useState('bob')

  const bobFromSus = (susValue, rate) =>
    susValue === '' || !rate ? '' : format(parseFloat(susValue) * rate)
  const susFromBob = (bobValue, rate) =>
    bobValue === '' || !rate ? '' : format(parseFloat(bobValue) / rate)

  const handleBobChange = (value) => {
    setSource('bob')
    setBob(value)
    setSus(susFromBob(value, parseFloat(tc)))
  }

  const handleSusChange = (value) => {
    setSource('sus')
    setSus(value)
    setBob(bobFromSus(value, parseFloat(tc)))
  }

  const handleTcChange = (value) => {
    setTc(value)
    const rate = parseFloat(value)
    if (source === 'bob') setSus(susFromBob(bob, rate))
    else setBob(bobFromSus(sus, rate))
  }

  return (
    <main className="stage">
      <LiquidGlass
        displacementScale={25}
        blurAmount={0.08}
        saturation={140}
        aberrationIntensity={1}
        elasticity={0.25}
        cornerRadius={999}
        padding="14px 28px"
        style={{ position: 'fixed', top: '50%', left: '50%' }}
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
          Hello World
        </span>
      </LiquidGlass>
      <div className="fields">
        <NumberField label="TC" value={tc} onChange={handleTcChange} />
        <NumberField label="BOB" value={bob} onChange={handleBobChange} />
        <NumberField label="SUS" value={sus} onChange={handleSusChange} />
      </div>
    </main>
  )
}

export default App
