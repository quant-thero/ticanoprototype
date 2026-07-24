import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import { getMyProfile, completePendingSignup } from '../services/supabaseApi';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

// Supabase's own client persists the session (localStorage) and
// auto-refreshes the access token indefinitely, as long as the tab keeps
// getting used from time to time, with no timeout logic of its own, a
// session left open (or just closed and reopened) survives forever,
// including "closed the laptop overnight, still logged in the next
// morning" with zero password prompt. These two timeouts are enforced
// separately, in the app layer, on top of Supabase's own session:
//
// - IDLE: signed out after this long with no mouse/keyboard/touch
// activity, even if the tab stays open.
// - ABSOLUTE: signed out this long after the login itself, regardless of
// activity, this is what actually guarantees "came back the next day"
// always requires a password again.
const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const ABSOLUTE_TIMEOUT_MS = 12 * 60 * 60 * 1000; // 12 hours
const LOGIN_AT_KEY = 'ticano_session_login_at';
const LAST_ACTIVITY_KEY = 'ticano_session_last_activity';

const markLoginNow = () => {
  const now = Date.now();
  localStorage.setItem(LOGIN_AT_KEY, String(now));
  localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
};
const markActivityNow = () => localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
const clearSessionTimestamps = () => {
  localStorage.removeItem(LOGIN_AT_KEY);
  localStorage.removeItem(LAST_ACTIVITY_KEY);
};
// Returns a reason string ('idle' | 'absolute') if the session should be
// force-expired, or null if it's still within both limits. Missing
// timestamps (e.g. a session from before this feature existed) count as
// expired, safer to require a fresh login than to trust an unknown age.
const checkSessionExpiry = () => {
  const now = Date.now();
  const loginAt = Number(localStorage.getItem(LOGIN_AT_KEY));
  const lastActivity = Number(localStorage.getItem(LAST_ACTIVITY_KEY));
  if (!loginAt || !lastActivity) return 'absolute';
  if (now - loginAt > ABSOLUTE_TIMEOUT_MS) return 'absolute';
  if (now - lastActivity > IDLE_TIMEOUT_MS) return 'idle';
  return null;
};

// Supabase's own client already persists the session (localStorage, under
// its own key) and handles token refresh, so this context doesn't manage
// tokens/storage itself anymore. It just mirrors auth state + the joined
// app profile (role, branch, etc.) for the rest of the app to read.
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpiredReason, setSessionExpiredReason] = useState(null); // null | 'idle' | 'absolute'
  const profileCache = useRef(new Map()); // authUserId -> profile, avoids refetching on every tab focus

  const loadProfile = async (session, attempt = 0) => {
    if (!session) {
      setUser(null);
      setToken(null);
      return;
    }
    const cacheKey = session.user.id;
    if (profileCache.current.has(cacheKey)) {
      setUser(profileCache.current.get(cacheKey));
      setToken(session.access_token);
      return;
    }
    try {
      let { data: profile } = await getMyProfile();
      if (!profile) {
        // Real session exists but no app profile yet, this is exactly the
        // case where email confirmation was required at signup, so the
        // users/client_profiles rows were deferred. Finish that now that a
        // real session (and therefore auth.uid()) actually exists.
        const completed = await completePendingSignup().catch(() => null);
        if (completed) { ({ data: profile } = await getMyProfile()); markLoginNow(); }
      }
      if (profile) {
        const withDefaults = { avatar: null, notifyEmail: true, notifyWhatsApp: true, notifyInApp: true, ...profile };
        profileCache.current.set(cacheKey, withDefaults);
        // Set together, a component must never see a truthy token with a
        // still-null user, or role-gating (ProtectedRoute) will incorrectly
        // treat a signed-in person as unauthorized before their role loads.
        setUser(withDefaults);
        setToken(session.access_token);
      } else {
        // Authenticated with Supabase but no matching `users` row yet
        // e.g. mid-signup, or an auth account not yet linked to an app
        // profile. Treat as logged out for role-gating purposes.
        setUser(null);
        setToken(null);
      }
    } catch (err) {
      // We were HANDED a real Supabase session here, so a thrown error is
      // almost never "this person isn't logged in", it's a transient
      // hiccup (network blip, cold start, the profile query racing the
      // auth token attaching right after a hard refresh). Previously this
      // immediately nulled out user/token, which bounced a perfectly
      // signed-in person back to the login page just because they hit F5.
      // Retry a couple of times with a short backoff before giving up, so
      // "logged in" reliably survives a page refresh anywhere in the app.
      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
        return loadProfile(session, attempt + 1);
      }
      console.error('[auth] Failed to load profile after retries:', err.message);
      setUser(null);
      setToken(null);
    }
  };

  const forceExpiredLogout = async (reason) => {
    clearSessionTimestamps();
    await supabase.auth.signOut().catch(() => {});
    profileCache.current.clear();
    setUser(null);
    setToken(null);
    setSessionExpiredReason(reason || 'idle');
    toast.error(
      reason === 'idle'
        ? 'You were signed out after a period of inactivity. Please sign in again.'
        : 'Your session has expired. Please sign in again.',
      { duration: 6000 }
    );
  };

  const dismissSessionExpired = () => setSessionExpiredReason(null);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (!mounted) return;
        if (!session) return; // nothing to expire, a fresh visitor, not an expired one

        const expiryReason = checkSessionExpiry();
        if (expiryReason) {
          // Expired by our own app-layer clock even though Supabase's
          // token might still be technically valid/refreshable, this is
          // what actually guarantees "closed it overnight" always asks
          // for a password again, rather than relying on the access
          // token's own (much longer, auto-refreshing) lifetime.
          return forceExpiredLogout(expiryReason);
        }
        return loadProfile(session);
      })
      .catch((err) => {
        console.error('[auth] Failed to restore session:', err.message);
      })
      .finally(() => { if (mounted) setLoading(false); });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      loadProfile(session).catch((err) => console.error('[auth] onAuthStateChange error:', err.message));
    });

    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  // Idle tracking + periodic expiry check, covers the case where the tab
  // is left open (not just closed and reopened): activity resets the idle
  // clock, and a check every minute catches either timeout without
  // needing a page refresh to notice.
  useEffect(() => {
    if (!token) return; // only relevant once actually signed in
    const onActivity = () => markActivityNow();
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));

    const interval = setInterval(() => {
      const reason = checkSessionExpiry();
      if (reason) forceExpiredLogout(reason);
    }, 60 * 1000);

    return () => {
      events.forEach((e) => window.removeEventListener(e, onActivity));
      clearInterval(interval);
    };
  }, [token]);

  // Called after a successful supabaseApi.signIn()/signUp(), re-fetches the
  // session so `user`/`token` update immediately rather than waiting for
  // the next onAuthStateChange tick.
  const refreshSession = async (isFreshLogin = false) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (isFreshLogin) markLoginNow();
    if (session) setSessionExpiredReason(null);
    await loadProfile(session);
  };

  const updateUser = (patch) => {
    setUser((prev) => {
      const next = { ...prev, ...patch };
      if (prev) profileCache.current.set(prev.userId ? `profile:${prev.userId}` : 'unknown', next);
      return next;
    });
  };

  const logout = async () => {
    await supabase.auth.signOut();
    clearSessionTimestamps();
    profileCache.current.clear();
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, refreshSession, logout, updateUser, sessionExpiredReason, dismissSessionExpired }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
