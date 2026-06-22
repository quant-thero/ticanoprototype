import React, { useState, useEffect } from 'react';
import { Settings, Power, Clock, AlertTriangle, CheckCircle, Shield, Database, Globe, Users, Bell } from 'lucide-react';
import { getMaintenanceState, setMaintenanceState } from './MaintenanceMode';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import toast from 'react-hot-toast';

const SERVICES = ['Client Portal', 'Complaint Management', 'WhatsApp Notifications', 'Email Notifications', 'Reports', 'Analytics'];

export default function MaintenancePanel() {
  const { user } = useAuth();
  const { addNotification } = useNotifications?.() || {};
  const [active, setActive]       = useState(false);
  const [form, setForm]           = useState({
    message: 'The Ticano platform is undergoing scheduled maintenance. We apologise for any inconvenience.',
    startDate: new Date().toISOString().split('T')[0],
    startTime: new Date(Date.now() + 5*60000).toTimeString().slice(0,5),
    endDate: new Date().toISOString().split('T')[0],
    endTime: new Date(Date.now() + 2*3600000).toTimeString().slice(0,5),
    services: [...SERVICES],
  });

  useEffect(() => {
    const s = getMaintenanceState();
    setActive(s?.active || false);
  }, []);

  const handleActivate = () => {
    const startTime = new Date(`${form.startDate}T${form.startTime}`).toISOString();
    const endTime   = new Date(`${form.endDate}T${form.endTime}`).toISOString();
    if (new Date(endTime) <= new Date(startTime)) return toast.error('End time must be after start time');

    const state = {
      active: true,
      message: form.message,
      startTime,
      endTime,
      services: form.services,
      initiatedBy: user?.name || 'Admin',
      activatedAt: new Date().toISOString(),
    };
    setMaintenanceState(state);
    setActive(true);
    toast.success('Maintenance mode activated — all users will see the maintenance screen');

    // Add system notification
    try {
      addNotification?.({
        type: 'system',
        title: 'System Maintenance Activated',
        body: `Maintenance mode is now active. Expected completion: ${new Date(endTime).toLocaleString()}`,
      });
    } catch {}
  };

  const handleDeactivate = () => {
    setMaintenanceState(null);
    setActive(false);
    toast.success('Maintenance mode deactivated — system is back online');
    try {
      addNotification?.({
        type: 'system',
        title: 'System Back Online',
        body: 'The Ticano platform is back online. All services restored.',
      });
    } catch {}
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

  return (
    <div className="space-y-5">
      {/* Status banner */}
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
            {active ? '🔴 System is in MAINTENANCE MODE' : '🟢 System is ONLINE'}
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

      {/* Config form */}
      {!active && (
        <div className="bg-white dark:bg-ticano-dark-card rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-5 animate-fade-up">
          <div className="flex items-center gap-2 mb-1">
            <Settings size={16} className="text-ticano-red" />
            <h4 className="font-bold text-gray-800 dark:text-white">Configure Maintenance Window</h4>
          </div>

          {/* Message */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Maintenance Message</label>
            <textarea value={form.message} onChange={e => setForm({...form, message: e.target.value})}
              className={inp + ' resize-none'} rows={3}
              placeholder="What users will see on the maintenance screen…" />
          </div>

          {/* Date/Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                <span className="flex items-center gap-1"><Clock size={11}/>Start Date & Time</span>
              </label>
              <div className="flex gap-2">
                <input type="date" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} className={inp} />
                <input type="time" value={form.startTime} onChange={e => setForm({...form, startTime: e.target.value})} className={inp} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                <span className="flex items-center gap-1"><Clock size={11}/>Expected End Date & Time</span>
              </label>
              <div className="flex gap-2">
                <input type="date" value={form.endDate} onChange={e => setForm({...form, endDate: e.target.value})} className={inp} />
                <input type="time" value={form.endTime} onChange={e => setForm({...form, endTime: e.target.value})} className={inp} />
              </div>
            </div>
          </div>

          {/* Affected services */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Affected Services</label>
            <div className="flex flex-wrap gap-2">
              {SERVICES.map(svc => (
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

          {/* Preview */}
          <div className="p-4 bg-ticano-charcoal rounded-xl text-center">
            <Settings size={24} className="text-ticano-red mx-auto mb-2 animate-spin" style={{animationDuration:'4s'}}/>
            <p className="text-white font-bold text-sm">System Under Maintenance</p>
            <p className="text-gray-400 text-xs mt-1 max-w-xs mx-auto leading-relaxed">{form.message}</p>
            <p className="text-ticano-red text-xs mt-2 font-mono font-bold">
              Back at {form.endTime} on {form.endDate}
            </p>
          </div>

          {/* Warnings */}
          <div className="space-y-2">
            {[
              [Shield, 'You (Admin) will still have full access during maintenance'],
              [Users, 'All other users will see the maintenance screen immediately'],
              [Bell, 'A system notification will be sent to all users'],
            ].map(([Icon, text]) => (
              <div key={text} className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <Icon size={12} className="text-ticano-red shrink-0" />
                {text}
              </div>
            ))}
          </div>

          {/* Activate button */}
          <button onClick={handleActivate}
            className="w-full flex items-center justify-center gap-2 py-3 bg-ticano-red hover:bg-ticano-red-dark text-white rounded-xl font-bold text-sm transition-all duration-200 shadow-md hover:shadow-lg">
            <Power size={16} /> Activate Maintenance Mode
          </button>
        </div>
      )}

      {/* Active maintenance info */}
      {active && (() => {
        const s = getMaintenanceState();
        return s ? (
          <div className="bg-white dark:bg-ticano-dark-card rounded-2xl border border-gray-100 dark:border-gray-700 p-5 animate-fade-up">
            <h4 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
              <Settings size={15} className="text-ticano-red animate-spin" style={{animationDuration:'4s'}}/> Active Maintenance Details
            </h4>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Started', new Date(s.startTime).toLocaleString()],
                ['Ends', new Date(s.endTime).toLocaleString()],
                ['Activated by', s.initiatedBy],
                ['Affected services', s.services?.length + ' services'],
              ].map(([label, val]) => (
                <div key={label} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                  <p className="text-sm font-semibold text-gray-800 dark:text-white">{val}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-red-500 mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
              ⚠️ All non-admin users are currently seeing the maintenance screen. Click "Bring Back Online" above to restore access.
            </p>
          </div>
        ) : null;
      })()}
    </div>
  );
}
