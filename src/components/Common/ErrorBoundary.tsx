import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '400px',
          padding: '40px',
          textAlign: 'center',
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          margin: '20px'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '24px'
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path
                d="M10.29 3.86L1.82 18C1.64 18.35 1.64 18.73 1.82 19.08C2 19.43 2.36 19.66 2.75 19.66H21.25C21.64 19.66 22 19.43 22.18 19.08C22.36 18.73 22.36 18.35 22.18 18L13.71 3.86C13.53 3.51 13.17 3.28 12.78 3.28C12.39 3.28 12.03 3.51 11.85 3.86H10.29Z"
                stroke="white"
                strokeWidth="2"
              />
              <line x1="12" y1="9" x2="12" y2="13" stroke="white" strokeWidth="2"/>
              <circle cx="12" cy="17" r="1" fill="white"/>
            </svg>
          </div>

          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '600',
            color: '#1f2937',
            marginBottom: '8px'
          }}>
            Something went wrong
          </h2>

          <p style={{
            fontSize: '1rem',
            color: '#6b7280',
            marginBottom: '24px',
            maxWidth: '500px',
            lineHeight: '1.5'
          }}>
            We encountered an unexpected error. This has been logged and our team will investigate.
          </p>

          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details style={{
              marginBottom: '24px',
              padding: '16px',
              background: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              maxWidth: '600px',
              width: '100%'
            }}>
              <summary style={{
                cursor: 'pointer',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Error Details (Development Mode)
              </summary>
              <pre style={{
                fontSize: '0.875rem',
                color: '#dc2626',
                overflow: 'auto',
                maxHeight: '200px',
                background: '#ffffff',
                padding: '12px',
                borderRadius: '4px',
                border: '1px solid #fee2e2'
              }}>
                {this.state.error.stack}
              </pre>
            </details>
          )}

          <div style={{
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap',
            justifyContent: 'center'
          }}>
            <button
              onClick={this.handleRetry}
              style={{
                background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
                color: '#ffffff',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(30, 60, 114, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <polyline points="23 4 23 10 17 10" stroke="currentColor" strokeWidth="2"/>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" stroke="currentColor" strokeWidth="2"/>
              </svg>
              Try Again
            </button>

            <button
              onClick={this.handleReload}
              style={{
                background: '#6b7280',
                color: '#ffffff',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#374151';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#6b7280';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <polyline points="1 4 1 10 7 10" stroke="currentColor" strokeWidth="2"/>
                <polyline points="23 20 23 14 17 14" stroke="currentColor" strokeWidth="2"/>
                <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" stroke="currentColor" strokeWidth="2"/>
              </svg>
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;