import { Component, type ErrorInfo, type ReactNode } from 'react';

/**
 * Stops one broken screen from showing a blank white page.
 *
 * This matters more than usual here: the app is shared with family who cannot
 * be asked to open a console, and their photos and notes are only on their own
 * phone. So the fallback's first job is to reassure them the data is intact and
 * offer a way to get it out.
 */
interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // No telemetry by design — but leave a trace for a dev looking at the console.
    console.error('PropScout crashed:', error, info.componentStack);
  }

  private reset = () => {
    this.setState({ error: null });
    // Back to the list, which is the safest screen to land on.
    if (window.location.hash && window.location.hash !== '#/') {
      window.location.hash = '#/';
    }
  };

  private reload = () => {
    window.location.reload();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="shell">
        <main className="main">
          <div className="empty">
            <div className="empty__icon" aria-hidden="true">
              😕
            </div>
            <h2>Something went wrong on this screen</h2>
            <p className="small muted">
              Your properties, photos and notes are safe — nothing has been deleted. Only this
              screen failed to draw.
            </p>
          </div>

          <div className="btnrow">
            <button type="button" className="btn btn--primary btn--lg" onClick={this.reset}>
              Back to my properties
            </button>
          </div>
          <button type="button" className="btn" onClick={this.reload}>
            Reload the app
          </button>

          <div className="note note--info">
            <span className="note__icon" aria-hidden="true">
              💾
            </span>
            <div className="grow">
              <strong>If it keeps happening,</strong> go to Settings and export a full backup before
              doing anything else. Then you can reinstall and restore from that file without losing
              a thing.
            </div>
          </div>

          <details className="card card--pad">
            <summary className="small muted" style={{ cursor: 'pointer' }}>
              Technical details
            </summary>
            <pre
              className="tiny"
              style={{ whiteSpace: 'pre-wrap', marginTop: 10, color: 'var(--ink-2)' }}
            >
              {error.name}: {error.message}
            </pre>
          </details>
        </main>
      </div>
    );
  }
}
