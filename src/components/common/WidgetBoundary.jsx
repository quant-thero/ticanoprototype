import React from 'react';
import { AlertTriangle, RotateCcw, LogIn } from 'lucide-react';

// See ErrorBoundary.jsx for the full explanation, same direct,
// state-based check reading AuthContext's own session timestamps,
// alongside message-pattern matching for the split-second right after
// forceExpiredLogout() itself runs but before this component re-renders.
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const ABSOLUTE_TIMEOUT_MS = 12 * 60 * 60 * 1000;
const isSessionActuallyExpired = () => {
  try {
    const loginAt = Number(localStorage.getItem('ticano_session_login_at'));
    const lastActivity = Number(localStorage.getItem('ticano_session_last_activity'));
    if (!loginAt || !lastActivity) return false;
    const now = Date.now();
    return (now - loginAt > ABSOLUTE_TIMEOUT_MS) || (now - lastActivity > IDLE_TIMEOUT_MS);
  } catch {
    return false;
  }
};

const isSessionRelatedError = (error) => {
  const text = `${error?.message || ''} ${error?.name || ''}`.toLowerCase();
  const matchesKnownPattern = [
    'jwt', 'refresh token', 'not authenticated', 'unauthorized', '401', '403',
    'pgrst301', 'pgrst302', 'invalid token', 'session', 'auth session missing',
    'permission denied', 'row-level security', 'row level security',
  ].some((needle) => text.includes(needle));
  return matchesKnownPattern || isSessionActuallyExpired();
};

// WidgetBoundary, isolates ONE dashboard section/widget so a render
// error inside it can never take down the rest of the dashboard.
// Previously the app only had a single top-level ErrorBoundary
// (src/components/common/ErrorBoundary.jsx), so any exception thrown
// while rendering a widget, e.g. a chart choking on an unexpected
// shape of data from a failed/partial query, blanked the entire
// dashboard page, nav bar and all.
//
// Wrap each independently-loaded widget/section/tab with this
// component. If that section throws during render, only that
// section is replaced with a small "Unable to load this section"
// card with a Retry button; everything else on the page (nav,
// other tabs/widgets) keeps working normally.
//
// Retry: bumping an internal key remounts the wrapped subtree from
// scratch (re-running its own data-loading effects), which is what
// actually gives failed widgets/queries a real second chance rather
// than just re-displaying the same crashed state.
export default class WidgetBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, retryKey: 0 };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error(`[WidgetBoundary${this.props.label ? `:${this.props.label}` : ''}] section failed to render:`, error, info?.componentStack);
  }

  // If the parent tells us the underlying data/tab changed (via the
  // `resetKeys` prop), clear any stale error rather than keep showing
  // a retry card for a section the user has already navigated away
  // from and back to.
  componentDidUpdate(prevProps) {
    if (this.state.error && this.props.resetKeys && prevProps.resetKeys !== this.props.resetKeys) {
      // eslint-disable-next-line react/no-did-update-set-state
      this.setState({ error: null });
    }
  }

  handleRetry = () => {
    this.setState((s) => ({ error: null, retryKey: s.retryKey + 1 }));
  };

  render() {
    if (this.state.error) {
      if (isSessionRelatedError(this.state.error)) {
        return (
          <div className="bg-white dark:bg-ticano-dark-card rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 text-center">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-3">
              <LogIn size={22} className="text-ticano-red" />
            </div>
            <p className="text-sm font-semibold text-ticano-charcoal dark:text-white mb-1">Your session has timed out</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Please sign in again to continue.</p>
            <a href="/login" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-ticano-red text-white text-xs font-semibold hover:bg-ticano-red-dark transition-colors">
              <LogIn size={13} /> Sign in
            </a>
          </div>
        );
      }
      return (
        <div className="bg-white dark:bg-ticano-dark-card rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 text-center">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-3">
            <AlertTriangle size={22} className="text-ticano-red" />
          </div>
          <p className="text-sm font-semibold text-ticano-charcoal dark:text-white mb-1">
            Unable to load this section
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            {this.props.label ? `${this.props.label} hit an unexpected error.` : 'Something went wrong loading this widget.'} The rest of the dashboard is unaffected.
          </p>
          <button
            onClick={this.handleRetry}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-ticano-red text-white text-xs font-semibold hover:bg-ticano-red-dark transition-colors"
          >
            <RotateCcw size={13} /> Retry
          </button>
        </div>
      );
    }
    // key forces a full remount on retry, so the child's own effects
    // (data fetching) actually run again instead of reusing stale state.
    return <React.Fragment key={this.state.retryKey}>{this.props.children}</React.Fragment>;
  }
}
