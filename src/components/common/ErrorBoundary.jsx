import React from 'react';
import { AlertTriangle, RotateCcw, LogIn, Home } from 'lucide-react';

// Reads the exact same timestamps AuthContext.jsx uses to track idle/
// absolute timeout, independently, so "was the session actually expired
// right now" is a real, direct check, not a guess based on whether this
// particular error's message happens to contain a recognisable word.
// Message matching below still helps for the split-second right after
// forceExpiredLogout() itself runs (timestamps already cleared, but the
// component reading `user` a beat too soon throws its own distinct error).
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const ABSOLUTE_TIMEOUT_MS = 12 * 60 * 60 * 1000;
const isSessionActuallyExpired = () => {
  try {
    const loginAt = Number(localStorage.getItem('ticano_session_login_at'));
    const lastActivity = Number(localStorage.getItem('ticano_session_last_activity'));
    if (!loginAt || !lastActivity) return false; // no session was ever tracked here, not what this check is for
    const now = Date.now();
    return (now - loginAt > ABSOLUTE_TIMEOUT_MS) || (now - lastActivity > IDLE_TIMEOUT_MS);
  } catch {
    return false;
  }
};

// Recognises the shapes a stale/expired session tends to fail in, a
// request that was already in flight when the token expired, or a
// component reading `user` a beat before the redirect from
// forceExpiredLogout() takes effect. These aren't real bugs, so they
// don't deserve "Something went wrong" and a stack trace; the honest,
// useful thing to tell someone here is just that they need to sign in
// again, not confront them with an error screen that looks broken.
const isSessionRelatedError = (error) => {
  const text = `${error?.message || ''} ${error?.name || ''}`.toLowerCase();
  const matchesKnownPattern = [
    'jwt', 'refresh token', 'not authenticated', 'unauthorized', '401', '403',
    'pgrst301', 'pgrst302', 'invalid token', 'session', 'auth session missing',
    'permission denied', 'row-level security', 'row level security',
    "cannot read properties of null (reading 'role')",
    "cannot read properties of null (reading 'id')",
    "cannot read properties of null (reading 'name')",
    "cannot read properties of undefined (reading 'role')",
    "cannot read properties of undefined (reading 'id')",
  ].some((needle) => text.includes(needle));
  return matchesKnownPattern || isSessionActuallyExpired();
};

// Class component is required here, React only supports error boundaries
// via getDerivedStateFromError/componentDidCatch, no hook equivalent exists.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary] Caught a render error:', error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    if (isSessionRelatedError(this.state.error)) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-ticano-bg dark:bg-ticano-dark-bg px-4">
          <div className="max-w-md w-full bg-white dark:bg-ticano-dark-card rounded-2xl shadow-lg p-6 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-4">
              <LogIn size={26} className="text-ticano-red" />
            </div>
            <h1 className="text-lg font-bold text-ticano-charcoal dark:text-white mb-1">Your session has timed out</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
              You've been signed out after a period of inactivity. Please sign in again to continue.
            </p>
            <div className="flex items-center justify-center gap-2">
              <a href="/login" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-ticano-red text-white text-sm font-semibold hover:bg-ticano-red-dark transition-colors">
                <LogIn size={15} /> Sign in
              </a>
              <a href="/" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <Home size={15} /> Homepage
              </a>
            </div>
          </div>
        </div>
      );
    }

    const isDev = import.meta.env.DEV;

    return (
      <div className="min-h-screen flex items-center justify-center bg-ticano-bg dark:bg-ticano-dark-bg px-4">
        <div className="max-w-lg w-full bg-white dark:bg-ticano-dark-card rounded-2xl shadow-lg p-6 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-4">
            <AlertTriangle size={26} className="text-ticano-red" />
          </div>
          <h1 className="text-lg font-bold text-ticano-charcoal dark:text-white mb-1">Something went wrong</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            The app hit an unexpected error and couldn't continue rendering this page.
          </p>

          {isDev && (
            <pre className="text-left text-xs bg-gray-50 dark:bg-black/30 text-red-600 dark:text-red-400 rounded-xl p-3 mb-4 overflow-auto max-h-56 whitespace-pre-wrap">
              {this.state.error.message}
              {'\n\n'}
              {this.state.error.stack}
            </pre>
          )}

          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-ticano-red text-white text-sm font-semibold hover:bg-ticano-red-dark transition-colors"
          >
            <RotateCcw size={15} /> Reload the app
          </button>
        </div>
      </div>
    );
  }
}
