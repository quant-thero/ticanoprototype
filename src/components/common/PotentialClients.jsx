import React, { useState, useEffect } from 'react';
import { UserCheck, Phone, Mail, MapPin, ArrowRight, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, Modal, EmptyState, LoadingSpinner } from './UI';
import { getPotentialClients, convertToClient, INDUSTRIES } from '../../services/supabaseApi';
import { useAuth } from '../../context/AuthContext';
import LeadsModule from './LeadsModule';

export default function PotentialClients() {
  const { user } = useAuth();
  const [section, setSection] = useState('awaiting'); // 'awaiting' | 'prospects'
  const [clients, setClients] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [converting, setConverting] = useState(null);
  const [form, setForm] = useState({ companyName: '', regNumber: '', industry: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const load = () => {
    if (!user?.id) return;
    setLoadError(null);
    getPotentialClients(user.id).then(({ data }) => setClients(data)).catch((err) => { console.error('[PotentialClients]', err); setLoadError(err.message || 'Failed to load'); });
  };
  useEffect(load, [user?.id]);

  const startConvert = (client) => {
    setConverting(client);
    setForm({ companyName: client.name || '', regNumber: '', industry: client.industry || '', notes: '' });
  };

  const submitConvert = async () => {
    if (!form.companyName.trim()) return toast.error('Company / client name is required');
    setSaving(true);
    try {
      await convertToClient(converting.id, form);
      toast.success(`${converting.name} moved to your Client Portfolio`);
      setConverting(null);
      load();
    } catch (err) {
      toast.error(err.message || 'Could not convert this client');
    } finally {
      setSaving(false);
    }
  };

  if (loadError) return <p className="text-sm text-red-500 text-center py-10">Couldn't load potential clients: {loadError}</p>;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setSection('awaiting')}
          className={`text-left p-4 rounded-2xl border transition-colors ${section === 'awaiting' ? 'border-ticano-red bg-red-50 dark:bg-red-900/10' : 'border-gray-100 dark:border-gray-700 bg-white dark:bg-ticano-dark-card hover:bg-gray-50 dark:hover:bg-gray-800'}`}
        >
          <UserCheck size={18} className={section === 'awaiting' ? 'text-ticano-red' : 'text-gray-400'} />
          <p className="font-semibold text-sm text-ticano-charcoal dark:text-white mt-2">Awaiting Portfolio</p>
          <p className="text-xs text-gray-500 mt-0.5">Registered customers assigned to you, not yet in your Client Portfolio</p>
        </button>
        <button
          onClick={() => setSection('prospects')}
          className={`text-left p-4 rounded-2xl border transition-colors ${section === 'prospects' ? 'border-ticano-red bg-red-50 dark:bg-red-900/10' : 'border-gray-100 dark:border-gray-700 bg-white dark:bg-ticano-dark-card hover:bg-gray-50 dark:hover:bg-gray-800'}`}
        >
          <UserPlus size={18} className={section === 'prospects' ? 'text-ticano-red' : 'text-gray-400'} />
          <p className="font-semibold text-sm text-ticano-charcoal dark:text-white mt-2">New Prospects</p>
          <p className="text-xs text-gray-500 mt-0.5">Walk-ins and enquiries who haven't registered yet, add one here</p>
        </button>
      </div>

      {section === 'prospects' ? <LeadsModule branch={user?.branch} /> : (
      <>
      {!clients ? <LoadingSpinner /> : (
      <>
      <div>
        <h3 className="text-lg font-bold text-ticano-charcoal dark:text-white flex items-center gap-2"><UserCheck size={18} /> Potential Clients</h3>
        <p className="text-sm text-gray-500 mt-0.5">Customers assigned to you who haven't been converted into your Client Portfolio yet.</p>
      </div>

      {clients.length === 0 ? (
        <EmptyState title="No potential clients right now" message="New customers assigned to you by a Service Manager (or auto-assign) will show up here first." icon={UserCheck} />
      ) : (
        <div className="space-y-2.5">
          {clients.map((c) => (
            <div key={c.id} className="bg-white dark:bg-ticano-dark-card rounded-2xl border border-gray-100 dark:border-gray-700 p-4 flex items-center gap-4">
              <div className="w-11 h-11 rounded-full bg-ticano-red/10 text-ticano-red flex items-center justify-center font-bold shrink-0">
                {c.name?.charAt(0) || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-ticano-charcoal dark:text-white truncate">{c.name}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500 mt-0.5">
                  {c.whatsappNumber && <span className="flex items-center gap-1"><Phone size={11} /> {c.whatsappNumber}</span>}
                  {c.email && <span className="flex items-center gap-1"><Mail size={11} /> {c.email}</span>}
                  {c.branch && <span className="flex items-center gap-1"><MapPin size={11} /> {c.branch}</span>}
                </div>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 shrink-0 capitalize">{c.clientType} client</span>
              <button onClick={() => startConvert(c)} className="flex items-center gap-1.5 px-3 py-2 bg-ticano-red text-white rounded-xl text-xs font-semibold hover:bg-ticano-red-dark shrink-0">
                Convert <ArrowRight size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
      </>
      )}
      </>
      )}

      <Modal isOpen={!!converting} onClose={() => setConverting(null)} title={`Convert ${converting?.name || ''} to a client`}>
        <div className="space-y-3">
          <p className="text-sm text-gray-500">This creates their record in your Client Portfolio, starting with zero assists, log their first assist once they take their first facility from Ticano.</p>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Company / Client Name</label>
            <input className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-800 dark:text-white" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Registration Number (optional)</label>
            <input className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-800 dark:text-white" value={form.regNumber} onChange={(e) => setForm({ ...form, regNumber: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Industry</label>
            <select className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-800 dark:text-white" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })}>
              <option value="">Select…</option>
              {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
            </select>
            {converting?.industry && <p className="text-[11px] text-gray-400 mt-1">Pre-filled from what they selected at registration, change it if needed.</p>}
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Notes (optional)</label>
            <textarea rows={2} className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-800 dark:text-white resize-none" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => setConverting(null)} className="px-4 py-2 text-sm rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">Cancel</button>
            <button onClick={submitConvert} disabled={saving} className="px-5 py-2 text-sm rounded-xl bg-ticano-red text-white hover:bg-ticano-red-dark disabled:opacity-60">{saving ? 'Converting…' : 'Convert to Client'}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
