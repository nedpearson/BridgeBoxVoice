import React from 'react'
import ReactDOM from 'react-dom/client'
import * as Sentry from '@sentry/react'
import App from './App.tsx'
import './index.css'

// ─── Sentry Error Tracking ────────────────────────────────────────────────────
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    replaysOnErrorSampleRate: 1.0,
    integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],
  })
}

// ─── Intercom Support Chat ────────────────────────────────────────────────────
const INTERCOM_APP_ID = import.meta.env.VITE_INTERCOM_APP_ID
if (INTERCOM_APP_ID) {
  ;(window as any).intercomSettings = { app_id: INTERCOM_APP_ID }
  const ic = (window as any).Intercom
  if (typeof ic === 'function') {
    ic('reattach_activator')
    ic('update', (window as any).intercomSettings)
  } else {
    const s = document.createElement('script')
    s.src = `https://widget.intercom.io/widget/${INTERCOM_APP_ID}`
    s.async = true
    document.head.appendChild(s)
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
