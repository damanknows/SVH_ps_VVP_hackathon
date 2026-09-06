'use client';

import React, { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ChartErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, errorInfo: React.ErrorInfo) {
    console.error('Chart Error Boundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex flex-col items-center justify-center p-6 border border-amber-500/30 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 text-center">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              Visualisation temporarily unavailable
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
              Rendering fallback data table mode.
            </p>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
