import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { XCircle, RefreshCw } from 'lucide-react';

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error('RetroCast Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="crash-screen">
          <div className="crash-window">
            <div className="crash-header">
              <XCircle size={16} />
              <span>SYSTEM ERROR</span>
            </div>
            <div className="crash-body">
              <pre className="crash-art">{`
  ____________________
 /                    \\
|   FATAL EXCEPTION   |
|   ================  |
|                     |
|   An error has      |
|   occurred. The     |
|   current app has   |
|   been terminated.  |
|                     |
|  Press RETRY to     |
|  continue.          |
 \\____________________/
              `}</pre>
              <div className="crash-details">
                <strong>ERROR:</strong> {this.state.error?.message || 'Unknown error'}
              </div>
              {this.state.errorInfo && (
                <details className="crash-stack">
                  <summary>Stack Trace</summary>
                  <pre>{this.state.errorInfo.componentStack}</pre>
                </details>
              )}
              <button
                className="crash-btn"
                onClick={() => {
                  this.setState({ hasError: false, error: null, errorInfo: null });
                }}
              >
                <RefreshCw size={16} />
                RETRY
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
