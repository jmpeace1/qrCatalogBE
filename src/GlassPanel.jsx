import { useLayoutEffect, useRef, useState } from 'react'
import LiquidGlass from 'liquid-glass-react'

const RADIUS = 28

// Container with a liquid glass background layer sized to match its content.
// LiquidGlass sizes itself from its children, so a placeholder child is
// rendered at the measured size and remounted whenever that size changes.
function GlassPanel({ className = '', children }) {
  const ref = useRef(null)
  const [size, setSize] = useState(null)

  useLayoutEffect(() => {
    const el = ref.current
    const measure = () =>
      setSize((prev) => {
        const next = { w: el.offsetWidth, h: el.offsetHeight }
        return prev && prev.w === next.w && prev.h === next.h ? prev : next
      })
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <section ref={ref} className={`glass-panel ${className}`}>
      {size && (
        <div className="glass-panel-bg" aria-hidden="true">
          <LiquidGlass
            key={`${size.w}x${size.h}`}
            displacementScale={40}
            blurAmount={0.1}
            saturation={140}
            aberrationIntensity={1.5}
            elasticity={0}
            cornerRadius={RADIUS}
            padding="0"
            style={{ position: 'absolute', top: '50%', left: '50%' }}
          >
            <div
              className="glass-panel-tint"
              style={{ width: size.w, height: size.h }}
            />
          </LiquidGlass>
        </div>
      )}
      {children}
    </section>
  )
}

export default GlassPanel
