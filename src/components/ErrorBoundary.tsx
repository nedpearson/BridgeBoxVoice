import { Component, ErrorInfo, ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { hasError: boolean; error: Error | null; errorInfo: ErrorInfo | null }

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo })
    // Forward to Sentry if loaded
    const win = window as any
    if (win.__Sentry__) {
      win.__Sentry__.captureException(error, { extra: errorInfo })
    }
    console.error('[ErrorBoundary]', error, errorInfo)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    const { error } = this.state

    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', background: '#0B0F19', fontFamily: "'Inter', sans-serif", padding: 40,
        color: '#E2E8F0', textAlign: 'center',
      }}>
        <div style={{ maxWidth: 480, width: '100%' }}>
          {/* Icon */}
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: 28 }}>
            ⚠️
          </div>

          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#F1F5F9', margin: '0 0 12px' }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6, margin: '0 0 32px' }}>
            Bridgebox Voice encountered an unexpected error. Our team has been notified automatically via Sentry.
          </p>

          {/* Error detail (collapsible) */}
          <details style={{ textAlign: 'left', marginBottom: 32, background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '12px 16px' }}>
            <summary style={{ cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#EF4444', userSelect: 'none' }}>
              Error details
            </summary>
            <pre style={{ marginTop: 8, fontSize: 11, color: '#94A3B8', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.5 }}>
              {error?.message}
              {'\n'}
              {error?.stack?.split('\n').slice(0, 5).join('\n')}
            </pre>
          </details>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button
              onClick={() => window.location.reload()}
              style={{ padding: '10px 24px', background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
            >
              Reload page
            </button>
            <button
              onClick={() => { window.location.href = '/' }}
              style={{ padding: '10px 24px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#94A3B8', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
            >
              Go to Dashboard
            </button>
          </div>

          <p style={{ marginTop: 24, fontSize: 12, color: '#334155' }}>
            If this keeps happening, contact{' '}
            <a href="mailto:support@bridgebox.ai" style={{ color: '#6366F1' }}>support@bridgebox.ai</a>
          </p>
        </div>
      </div>
    )
  }
}
