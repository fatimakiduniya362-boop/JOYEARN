import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2, ShieldCheck } from 'lucide-react';
import { crashlytics } from '../services/crashlytics';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    // Real-time Firebase Crashlytics logging
    crashlytics.recordError(error, {
      type: 'fatal',
      componentStack: errorInfo.componentStack || undefined,
      metadata: {
        caughtBy: 'ReactErrorBoundary',
        timestamp: new Date().toISOString(),
      },
    });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetCache = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      window.location.reload();
    } catch {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-sm w-full bg-slate-800 border-2 border-rose-500/50 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto text-3xl">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-black text-white">Oops! Something went wrong</h2>
              <p className="text-xs text-slate-400">
                JoyEarn encountered a momentary glitch. Don't worry, your wallet points and streak are safely stored!
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 bg-slate-950/80 rounded-xl text-[11px] text-rose-300 font-mono text-left overflow-x-auto max-h-24">
                {this.state.error.message || 'Unknown runtime error'}
              </div>
            )}

            <div className="space-y-2 pt-2">
              <button
                onClick={this.handleReload}
                className="w-full py-3 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-extrabold rounded-2xl text-xs flex items-center justify-center gap-2 tap-bounce shadow-lg shadow-rose-500/30"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload JoyEarn</span>
              </button>

              <button
                onClick={this.handleResetCache}
                className="w-full py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold rounded-2xl text-xs flex items-center justify-center gap-2 tap-bounce"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Cache & Restart</span>
              </button>
            </div>

            <p className="text-[10px] text-slate-500">
              Google Play Stability Verified • Auto-Crash Recovery
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
