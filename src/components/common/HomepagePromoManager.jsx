import React, { useState, useEffect } from 'react';
import { Megaphone, Save, Monitor, Square, ArrowRight, X } from 'lucide-react';
import { getHomepagePromo, setHomepagePromo } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const THEMES = [
  { key: 'red', label: 'Ticano Red', cls: 'bg-ticano-red text-white' },
  { key: 'charcoal', label: 'Charcoal', cls: 'bg-ticano-charcoal text-white' },
  { key: 'light', label: 'Light', cls: 'bg-amber-50 text-ticano-charcoal border border-amber-200' },
];

export default function HomepagePromoManager() {
  const { user } = useAuth();
  const [p, setP] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { getHomepagePromo().then(({ data }) => setP(data)); }, []);
  if (!p) return <div className="flex justify-center py-10"><div className="w-8 h-8 border-2 border-gray-200 border-t-ticano-red rounded-full animate-spin" /></div>;

  const set = (patch) => setP((prev) => ({ ...prev, ...patch }));
  const save = async () => {
    if (!p.title.trim() || !p.message.trim()) return toast.error('Add a title and message');
    setSaving(true);
    const { data } = await setHomepagePromo(p, user?.name || 'Marketing');
    setP(data.promo);
    setSaving(false);
    toast.success(p.enabled ? 'Promotion published — live on the homepage' : 'Promotion saved (hidden)');
  };

  const inp = 'w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-ticano-red';
  const themeCls = (THEMES.find((t) => t.key === p.theme) || THEMES[0]).cls;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-bold text-ticano-charcoal dark:text-white flex items-center gap-2"><Megaphone size={18} /> Homepage Promotion</h3>
          <p className="text-sm text-gray-500 mt-0.5">Publish a promotional banner or pop-up to the public homepage.</p>
        </div>
        <button onClick={() => set({ enabled: !p.enabled })}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${p.enabled ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-700'}`}>
          {p.enabled ? 'Enabled' : 'Disabled'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white dark:bg-ticano-dark-card rounded-2xl border border-gray-100 dark:border-gray-700 p-5 space-y-3">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Display as</p>
            <div className="flex gap-2">
              <button onClick={() => set({ mode: 'banner' })} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm border ${p.mode === 'banner' ? 'bg-ticano-red text-white border-ticano-red' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300'}`}><Monitor size={14} /> Top banner</button>
              <button onClick={() => set({ mode: 'popup' })} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm border ${p.mode === 'popup' ? 'bg-ticano-red text-white border-ticano-red' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300'}`}><Square size={14} /> Pop-up</button>
            </div>
          </div>
          <div><label className="text-xs text-gray-500 mb-1 block">Title</label><input className={inp} value={p.title} onChange={(e) => set({ title: e.target.value })} placeholder="Promotion title" /></div>
          <div><label className="text-xs text-gray-500 mb-1 block">Message</label><textarea rows={3} className={inp + ' resize-none'} value={p.message} onChange={(e) => set({ message: e.target.value })} placeholder="Promotion message" /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="text-xs text-gray-500 mb-1 block">Button label</label><input className={inp} value={p.ctaLabel} onChange={(e) => set({ ctaLabel: e.target.value })} placeholder="Apply now" /></div>
            <div><label className="text-xs text-gray-500 mb-1 block">Button link</label><input className={inp} value={p.ctaLink} onChange={(e) => set({ ctaLink: e.target.value })} placeholder="/register or https://…" /></div>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Theme {p.mode === 'popup' && <span className="normal-case text-gray-400">(banner only)</span>}</p>
            <div className="flex gap-2">
              {THEMES.map((t) => (
                <button key={t.key} onClick={() => set({ theme: t.key })} className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${p.theme === t.key ? 'border-ticano-red ring-2 ring-ticano-red/30' : 'border-gray-200 dark:border-gray-600'} ${t.cls}`}>{t.label}</button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between pt-1">
            <p className="text-[11px] text-gray-400">Updated {new Date(p.updatedAt).toLocaleDateString('en-GB')} by {p.updatedBy}</p>
            <button onClick={save} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 bg-ticano-red text-white rounded-xl text-sm font-semibold hover:bg-ticano-red-dark disabled:opacity-60"><Save size={14} /> Save & publish</button>
          </div>
        </div>

        {/* Live preview */}
        <div className="bg-white dark:bg-ticano-dark-card rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Preview {!p.enabled && <span className="normal-case text-amber-600">· currently hidden</span>}</p>
          {p.mode === 'banner' ? (
            <div className={`rounded-xl px-4 py-2.5 flex items-center justify-center gap-3 text-center text-sm ${themeCls}`}>
              <span className="font-semibold">{p.title}</span>
              <span className="hidden sm:inline opacity-90">{p.message}</span>
              {p.ctaLabel && <span className="shrink-0 px-3 py-1 rounded-lg bg-white/20 font-semibold">{p.ctaLabel}</span>}
              <X size={14} className="opacity-70" />
            </div>
          ) : (
            <div className="border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden max-w-sm mx-auto">
              <div className="bg-ticano-red h-2" />
              <div className="p-6 text-center">
                <div className="w-12 h-12 rounded-2xl bg-ticano-red/10 text-ticano-red flex items-center justify-center mx-auto mb-3"><Megaphone size={22} /></div>
                <h3 className="text-xl font-black text-ticano-charcoal dark:text-white mb-2">{p.title}</h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-5">{p.message}</p>
                {p.ctaLabel && <span className="inline-flex items-center gap-2 px-6 py-3 bg-ticano-red text-white rounded-xl font-bold">{p.ctaLabel} <ArrowRight size={16} /></span>}
              </div>
            </div>
          )}
          <p className="text-[11px] text-gray-400 mt-3">{p.mode === 'banner' ? 'Shown as a dismissible strip at the very top of the homepage.' : 'Shown as a pop-up shortly after the homepage loads. Visitors can dismiss it.'}</p>
        </div>
      </div>
    </div>
  );
}
