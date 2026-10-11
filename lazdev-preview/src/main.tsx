import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/styles/globals.css'

// Placeholder App — Phase 1 (App Shell) will replace this.
function App() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'var(--bg-canvas)',
        color: 'var(--text-primary)',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
      }}
    >
      <div style={{ textAlign: 'center', gap: '8px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: '24px', fontWeight: 600, color: 'var(--accent)' }}>
          LazDev Device Preview
        </div>
        <div style={{ color: 'var(--text-secondary)' }}>
          Phase 0: Scaffold complete — awaiting Phase 1
        </div>
      </div>
    </div>
  )
}

const container = document.getElementById('root')
if (!container) throw new Error('Root element not found')

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

