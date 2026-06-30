import React, { useState, useEffect } from 'react';
import { Settings, Clock, AlertTriangle, CheckCircle, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

// Global maintenance state — persisted in localStorage for demo
const STORAGE_KEY = 'ticano_maintenance';

export const getMaintenanceState = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch { return null; }
};

export const setMaintenanceState = (state) => {
  if (state) localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  else localStorage.removeItem(STORAGE_KEY);
};

// Countdown hook
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
  return `${h > 0 ? h + 'h ' : ''}${m.toString().padStart(2,'0')}m ${s.toString().padStart(2,'0')}s`;
}

// ---- Maintenance Screen shown to all non-admin users ----
function MaintenanceScreen({ state }) {
  const remaining = useCountdown(state.endTime);
  return (
    <div className="fixed inset-0 z-[9999] bg-ticano-charcoal flex items-center justify-center p-6">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-ticano-red/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-ticano-red/10 rounded-full blur-3xl animate-pulse" style={{animationDelay:'1s'}}/>
        <div className="absolute inset-0" style={{backgroundImage:'linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px)',backgroundSize:'40px 40px'}}/>
      </div>
      <div className="relative z-10 max-w-lg w-full text-center">
        {/* Icon */}
        <div className="w-20 h-20 bg-ticano-red/15 border border-ticano-red/30 rounded-2xl flex items-center justify-center mx-auto mb-6 animate-pulse">
          <Settings size={36} className="text-ticano-red animate-spin" style={{animationDuration:'4s'}}/>
        </div>
        {/* Title */}
        <h1 className="text-2xl font-black text-white mb-2">System Under Maintenance</h1>
        <p className="text-gray-400 text-sm mb-6 leading-relaxed">{state.message || 'The Ticano platform is currently undergoing scheduled maintenance. We will be back shortly.'}</p>
        {/* Countdown */}
        {state.endTime && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-5">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 flex items-center justify-center gap-1"><Clock size={11}/>Estimated time remaining</p>
            <p className="text-3xl font-black font-mono text-ticano-red">{formatCountdown(remaining)}</p>
            <p className="text-xs text-gray-500 mt-2">Expected back: {new Date(state.endTime).toLocaleString()}</p>
          </div>
        )}
        {/* Details */}
        <div className="grid grid-cols-2 gap-3 text-left mb-5">
          {[
            ['Started at', new Date(state.startTime).toLocaleTimeString()],
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

// ---- Main component ----
export default function MaintenanceMode() {
  const { user } = useAuth();
  const [state, setState] = useState(getMaintenanceState);

  // Poll for state changes every 5 seconds (simulates real-time in demo)
  useEffect(() => {
    const interval = setInterval(() => {
      const current = getMaintenanceState();
      setState(current);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!state?.active) return null;
  if (user?.role === 'admin') return null; // Admin bypasses maintenance

  return <MaintenanceScreen state={state} />;
}
