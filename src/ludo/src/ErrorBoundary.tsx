import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = {
  children: ReactNode
}

type State = {
  hasError: boolean
  message: string
}

/** Catches render failures so a single UI crash does not blank the whole app. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    message: '',
  }

  static getDerivedStateFromError(error: unknown): State {
    const message = error instanceof Error ? error.message : 'Something went wrong.'
    return { hasError: true, message }
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    console.error('Ludo UI error:', error, info.componentStack)
  }

  private handleReload = (): void => {
    window.location.reload()
  }

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children
    }

    return (
      <main
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          padding: 24,
          fontFamily: 'system-ui, sans-serif',
          background: '#edf5ff',
          color: '#1d2939',
        }}
      >
        <div
          style={{
            maxWidth: 420,
            width: '100%',
            padding: 24,
            borderRadius: 16,
            border: '1px solid #d2dceb',
            background: '#ffffff',
            boxShadow: '0 8px 24px rgba(33, 53, 87, 0.08)',
          }}
        >
          <h1 style={{ margin: '0 0 8px', fontSize: '1.25rem' }}>Game hit a snag</h1>
          <p style={{ margin: '0 0 16px', color: '#415062', fontSize: '0.95rem' }}>
            The board failed to render. Reloading usually fixes it. Your local match is kept in this
            browser when possible.
          </p>
          <p
            style={{
              margin: '0 0 16px',
              fontSize: '0.8rem',
              color: '#6b7c93',
              wordBreak: 'break-word',
            }}
          >
            {this.state.message}
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            style={{
              border: 0,
              borderRadius: 10,
              padding: '10px 14px',
              background: '#2d7ae8',
              color: '#fff',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Reload game
          </button>
        </div>
      </main>
    )
  }
}
