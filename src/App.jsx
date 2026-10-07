import LiquidGlass from 'liquid-glass-react'
import './App.css'

function App() {
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
        style={{ position: "fixed", top: "50%", left: "50%" }}
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
    </main>
  )
}

export default App
