import { Component, type ErrorInfo, type ReactNode } from 'react';

interface State {
  hasError: boolean;
  message?: string;
}

// Catches render-time errors so the whole app doesn't blank out (NFR05 on the client).
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('Render error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
          <h1 className="text-2xl font-bold text-slate-800">Something went wrong</h1>
          <p className="max-w-md text-sm text-slate-500">{this.state.message}</p>
          <button
            onClick={() => window.location.assign('/')}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Back to home
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
