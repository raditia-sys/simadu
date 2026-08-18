import { Component } from 'react';

/**
 * ErrorBoundary — catches runtime errors in any child component tree.
 *
 * Placed at the Layout/Route level so that if a page crashes, the user still
 * sees the Sidebar and Topbar — not a blank page with no context.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Log to console for development debugging
    console.error('[SIMADU ErrorBoundary]', error, info.componentStack);
    // TODO: In production, send to error reporting service
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    // Navigate back to dashboard
    window.location.href = '/dashboard';
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const errorMessage = this.state.error?.message || 'Terjadi kesalahan tidak terduga.';

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
        {/* Error Icon */}
        <div className="w-16 h-16 rounded-2xl bg-accent-orange/10 dark:bg-dark-accent-orange/15 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-accent-orange dark:text-dark-accent-orange"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
        </div>

        {/* Error Heading */}
        <div className="text-center max-w-md">
          <h2 className="font-heading text-xl font-semibold text-text-primary dark:text-dark-text-primary mb-2">
            Halaman mengalami error
          </h2>
          <p className="text-sm text-text-secondary dark:text-dark-text-secondary mb-1">
            Terjadi kesalahan saat memuat halaman ini. Detail error:
          </p>
          <code className="block mt-2 px-3 py-2 rounded-xl bg-status-neutral/20 dark:bg-dark-status-neutral/20 text-xs text-text-primary dark:text-dark-text-primary font-mono text-left break-all">
            {errorMessage}
          </code>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={this.handleReset}
            className="btn-primary"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
            Kembali ke Dasbor
          </button>
          <button
            onClick={() => window.location.reload()}
            className="btn-secondary"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            Muat Ulang
          </button>
        </div>
      </div>
    );
  }
}
