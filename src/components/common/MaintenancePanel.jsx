import React, { useState, useEffect } from 'react';
import { Settings, Power, Clock, AlertTriangle, CheckCircle, Shield, Users, Bell } from 'lucide-react';
import { getSiteSettings, updateSiteSettings } from '../../services/supabaseApi';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import toast from 'react-hot-toast';

const CORE_SERVICES = ['Client Portal', 'Complaint Management', 'WhatsApp Notifications', 'Email Notifications', 'Reports', 'Analytics'];
// Public-facing pages are opt-in only, maintenance mode should never lock
// people out of the homepage or login page unless an admin deliberately
// includes them (e.g. a full-site outage), since login also doubles as
// the only way an admin can get back in to turn maintenance off.
const PUBLIC_PAGES = ['Homepage', 'Login Page'];
const SERVICES = [...CORE_SERVICES, ...PUBLIC_PAGES];

// notifications.audience_role is a typed enum (no "everyone" value), so a
// true broadcast means one row per role.
const ALL_ROLES = ['customer', 'portfolio_manager', 'service_manager', 'director', 'marketing', 'admin'];
const broadcastToAllRoles = (addNotification, notif) => {
  ALL_ROLES.forEach((role) => addNotification?.({ ...notif, audienceRole: role }));
};

export default function MaintenancePanel() {
  const { user } = useAuth();
  const { addNotification } = useNotifications?.() || {};
  const [active, setActive] = useState(false);
  const [current, setCurrent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    message: 'The Ticano platform is undergoing scheduled maintenance. We apologise for any inconvenience.',
    startDate: new Date().toISOString().split('T')[0],
    startTime: new Date(Date.now() + 5 * 60000).toTimeString().slice(0, 5),
    endDate: new Date().toISOString().split('T')[0],
    endTime: new Date(Date.now() + 2 * 3600000).toTimeString().slice(0, 5),
    services: [...CORE_SERVICES],
  });

  const load = () => {
    setLoading(true);
    getSiteSettings().then(({ data }) => {
      setCurrent(data.maintenance || null);
      setActive(!!data.maintenance?.active);
    }).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handleActivate = async () => {
    const startTime = new Date(`${form.startDate}T${form.startTime}`).toISOString();
    const endTime = new Date(`${form.endDate}T${form.endTime}`).toISOString();
    if (new Date(endTime) <= new Date(startTime)) return toast.error('End time must be after start time');

    const maintenance = {
      active: true,
      message: form.message,
      startTime,
      endTime,
      services: form.services,
      initiatedBy: user?.name || 'Admin',
      activatedAt: new Date().toISOString(),
    };
    try {
      await updateSiteSettings({ maintenance }, user?.name || 'Admin');
      setCurrent(maintenance);
      setActive(true);
      toast.success('Maintenance mode activated, all users will see the maintenance screen immediately');
      broadcastToAllRoles(addNotification, {
        type: 'system',
        title: 'System Maintenance Activated',
        body: `Maintenance mode is now active. Expected completion: ${new Date(endTime).toLocaleString()}`,
      });
    } catch (e) {
      toast.error(e?.message || 'Could not activate maintenance mode');
    }
  };

  const handleDeactivate = async () => {
    const maintenance = { active: false, message: '', startTime: null, endTime: null, services: [], initiatedBy: null, activatedAt: null };
    try {
      await updateSiteSettings({ maintenance }, user?.name || 'Admin');
      setCurrent(null);
      setActive(false);
      toast.success('Maintenance mode deactivated, system is back online');
      broadcastToAllRoles(addNotification, {
        type: 'system',
        title: 'System Back Online',
        body: 'The Ticano platform is back online. All services restored.',
      });
    } catch (e) {
      toast.error(e?.message || 'Could not deactivate maintenance mode');
    }
  };

  const toggleService = (svc) => {
    setForm(prev => ({
      ...prev,
      services: prev.services.includes(svc)
        ? prev.services.filter(s => s !== svc)
        : [...prev.services, svc],
    }));
  };

  const inp = 'w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-ticano-red transition-all';

  if (loading) return <div className="text-sm text-gray-400 p-4">Loading maintenance status…</div>;

  return (
    <div className="space-y-5">
      <div className={`flex items-center gap-4 p-4 rounded-2xl border ${
        active
          ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
          : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
      }`}>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${active ? 'bg-red-100 dark:bg-red-900/40' : 'bg-green-100 dark:bg-green-900/40'}`}>
          {active ? <AlertTriangle size={20} className="text-red-500 animate-pulse" /> : <CheckCircle size={20} className="text-green-500" />}
        </div>
        <div className="flex-1">
          <p className={`font-bold text-sm ${active ? 'text-red-700 dark:text-red-300' : 'text-green-700 dark:text-green-300'}`}>
            {active ? 'System is in MAINTENANCE MODE' : 'System is ONLINE'}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {active ? 'All non-admin users see the maintenance screen' : 'All users have full access to the platform'}
          </p>
        </div>
        {active && (
          <button onClick={handleDeactivate}
            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm">
            Bring Back Online
          </button>
        )}
      </div>

      {!active && (
        <div className="bg-white dark:bg-ticano-dark-card rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-5 animate-fade-up">
          <div className="flex items-center gap-2 mb-1">
            <Settings size={16} className="text-ticano-red" />
            <h4 className="font-bold text-gray-800 dark:text-white">Configure Maintenance Window</h4>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Maintenance Message</label>
            <textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })}
              className={inp + ' resize-none'} rows={3}
              placeholder="What users will see on the maintenance screen…" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                <span className="flex items-center gap-1"><Clock size={11} />Start Date & Time</span>
              </label>
              <div className="flex gap-2">
                <input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} className={inp} />
                <input type="time" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} className={inp} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                <span className="flex items-center gap-1"><Clock size={11} />Expected End Date & Time</span>
              </label>
              <div className="flex gap-2">
                <input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} className={inp} />
                <input type="time" value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })} className={inp} />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Affected Services</label>
            <div className="flex flex-wrap gap-2">
              {CORE_SERVICES.map(svc => (
                <button key={svc} onClick={() => toggleService(svc)}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${
                    form.services.includes(svc)
                      ? 'bg-ticano-red/10 border-ticano-red/40 text-ticano-red'
                      : 'border-gray-200 dark:border-gray-600 text-gray-400 hover:border-gray-300'
                  }`}>
                  {svc}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Public Pages (opt-in, off by default)</label>
            <p className="text-xs text-gray-400 mb-2">The homepage and login page stay accessible during maintenance unless you turn these on. Turning on "Login Page" means nobody, including you, can log in until maintenance ends, so only use this for a full-site outage.</p>
            <div className="flex flex-wrap gap-2">
              {PUBLIC_PAGES.map(svc => (
                <button key={svc} onClick={() => toggleService(svc)}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${
                    form.services.includes(svc)
                      ? 'bg-amber-50 border-amber-400 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
                      : 'border-gray-200 dark:border-gray-600 text-gray-400 hover:border-gray-300'
                  }`}>
                  {svc}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 bg-ticano-charcoal rounded-xl text-center">
            <Settings size={24} className="text-ticano-red mx-auto mb-2 animate-spin" style={{ animationDuration: '4s' }} />
            <p className="text-white font-bold text-sm">System Under Maintenance</p>
            <p className="text-gray-400 text-xs mt-1 max-w-xs mx-auto leading-relaxed">{form.message}</p>
            <p className="text-ticano-red text-xs mt-2 font-mono font-bold">
              Back at {form.endTime} on {form.endDate}
            </p>
          </div>

          <div className="space-y-2">
            {[
              [Shield, 'You (Admin) will still have full access during maintenance'],
              [Users, 'All other users will see the maintenance screen immediately, on every device, via realtime sync'],
              [Bell, 'A system notification will be sent to all users'],
            ].map(([Icon, text]) => (
              <div key={text} className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <Icon size={12} className="text-ticano-red shrink-0" />
                {text}
              </div>
            ))}
          </div>

          <button onClick={handleActivate}
            className="w-full flex items-center justify-center gap-2 py-3 bg-ticano-red hover:bg-ticano-red-dark text-white rounded-xl font-bold text-sm transition-all duration-200 shadow-md hover:shadow-lg">
            <Power size={16} /> Activate Maintenance Mode
          </button>
        </div>
      )}

      {active && current && (
        <div className="bg-white dark:bg-ticano-dark-card rounded-2xl border border-gray-100 dark:border-gray-700 p-5 animate-fade-up">
          <h4 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <Settings size={15} className="text-ticano-red animate-spin" style={{ animationDuration: '4s' }} /> Active Maintenance Details
          </h4>
          {current.endTime && new Date() > new Date(current.endTime) && (
            <p className="text-xs text-amber-700 dark:text-amber-400 mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
              This window ended at {new Date(current.endTime).toLocaleString()}, users can access the system again automatically, but this is still marked active. Click "Bring Back Online" to formally close it out.
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            {[
              ['Started', current.startTime ? new Date(current.startTime).toLocaleString() : '-'],
              ['Ends', current.endTime ? new Date(current.endTime).toLocaleString() : '-'],
              ['Activated by', current.initiatedBy],
              ['Affected services', (current.services?.length || 0) + ' services'],
            ].map(([label, val]) => (
              <div key={label} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                <p className="text-sm font-semibold text-gray-800 dark:text-white">{val}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-red-500 mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
            Non-admin users see the maintenance screen on {current.services?.includes('Homepage') || current.services?.includes('Login Page') ? 'every page, including the homepage and login' : 'every page except the homepage and login'}, until the window ends or you click "Bring Back Online" above.
          </p>
        </div>
      )}
    </div>
  );
}
