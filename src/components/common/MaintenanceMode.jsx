import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Settings, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getSiteSettings, subscribeToTable } from '../../services/supabaseApi';

function useCountdown(targetTime) {
  const [remaining, setRemaining] = useState(null);
  useEffect(() => {
    if (!targetTime) return;
    const calc = () => {
      const diff = new Date(targetTime) - new Date();
      setRemaining(Math.max(0, diff));
    };
    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [targetTime]);
  return remaining;
}

function formatCountdown(ms) {
  if (ms === null) return '--:--:--';
  if (ms <= 0) return 'System should be back online now';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${h > 0 ? h + 'h ' : ''}${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
}

function MaintenanceScreen({ state }) {
  const remaining = useCountdown(state.endTime);
  return (
    <div className="fixed inset-0 z-[9999] bg-ticano-charcoal flex items-center justify-center p-6">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-ticano-red/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-ticano-red/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>
      <div className="relative z-10 max-w-lg w-full text-center">
        <div className="w-20 h-20 bg-ticano-red/15 border border-ticano-red/30 rounded-2xl flex items-center justify-center mx-auto mb-6 animate-pulse">
          <Settings size={36} className="text-ticano-red animate-spin" style={{ animationDuration: '4s' }} />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">System Under Maintenance</h1>
        <p className="text-gray-400 text-sm mb-6 leading-relaxed">{state.message || 'The Ticano platform is currently undergoing scheduled maintenance. We will be back shortly.'}</p>
        {state.endTime && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-5">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 flex items-center justify-center gap-1"><Clock size={11} />Estimated time remaining</p>
            <p className="text-3xl font-bold font-mono text-ticano-red">{formatCountdown(remaining)}</p>
            <p className="text-xs text-gray-500 mt-2">Expected back: {new Date(state.endTime).toLocaleString()}</p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 text-left mb-5">
          {[
            ['Started at', state.startTime ? new Date(state.startTime).toLocaleTimeString() : '-'],
            ['Initiated by', state.initiatedBy || 'System Admin'],
            ['Affected services', state.services?.join(', ') || 'All services'],
            ['Contact', 'admin@ticanogroup.co.bw'],
          ].map(([label, val]) => (
            <div key={label} className="bg-white/5 rounded-xl p-3">
              <p className="text-xs text-gray-500 mb-0.5">{label}</p>
              <p className="text-xs text-white font-medium">{val}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-600">Please check back later or contact your system administrator.</p>
        <p className="text-xs text-gray-700 mt-1">ticanogroup.co.bw</p>
      </div>
    </div>
  );
}

// Maintenance state now lives in the `site_settings` table (key =
// 'maintenance') instead of localStorage, so it is the same for every
// user, on every device, immediately, a realtime subscription pushes the
// change the moment an admin flips the switch, no polling/refresh needed.
// Public paths that must always be reachable no matter what, losing
// access to these has no recovery path short of editing the database
// directly. Login is deliberately NOT in this list: it's the one page
// admins explicitly asked to be able to opt into blocking (see
// MaintenancePanel's "Login Page" toggle) for genuine full-site outages.
// That's a real lockout risk if misused, which is why the panel warns
// about it prominently, but it's a deliberate choice, not a bug.
const NEVER_BLOCK_PATHS = ['/register', '/reset-password'];

export default function MaintenanceMode() {
  const { user } = useAuth();
  const location = useLocation();
  const [state, setState] = useState(null);

  useEffect(() => {
    let mounted = true;
    getSiteSettings().then(({ data }) => { if (mounted) setState(data.maintenance || null); }).catch(() => {});

    const unsubscribe = subscribeToTable(
      'site_settings',
      { filter: 'key=eq.maintenance' },
      (payload) => {
        const row = payload.new;
        if (row?.value) setState(row.value);
      },
    );

    return () => { mounted = false; unsubscribe(); };
  }, []);

  if (!state?.active) return null;
  if (user?.role === 'admin') return null; // Admin bypasses maintenance entirely, on every page

  // The maintenance window has an *estimated* end time, but nothing
  // automatically flips the "active" flag off in the database, that
  // still needs an admin to click "Bring Back Online". Without this
  // check, everyone stays locked out indefinitely past the estimate even
  // though the work may already be done. Once the window has passed,
  // stop blocking access, the admin panel still shows it as active
  // (and overdue) as a prompt to formally end it.
  if (state.endTime && new Date() > new Date(state.endTime)) return null;

  // Never block the routes an admin needs to get back in, regardless of
  // the affected-services selection.
  if (NEVER_BLOCK_PATHS.includes(location.pathname)) return null;

  // Homepage and login page are opt-in only, everything else in
  // `services` (Client Portal, Complaints, etc.) blocks unconditionally
  // once maintenance is active, but these two public pages stay open
  // unless an admin deliberately included them.
  const services = state.services || [];
  if (location.pathname === '/' && !services.includes('Homepage')) return null;
  if (location.pathname === '/login' && !services.includes('Login Page')) return null;

  return <MaintenanceScreen state={state} />;
}
