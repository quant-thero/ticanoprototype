import React, { useState, useEffect } from 'react';
import { Megaphone, Send, Trash2, Search, Users, Bell, Mail, MessageCircle, Filter } from 'lucide-react';
import { previewTenderRecipients, getClientIndustries } from '../../services/supabaseApi';
import { getTenderBroadcasts, createTenderBroadcast, deleteTenderBroadcast } from '../../services/supabaseApi';
import { BRANCHES } from '../../utils/constants';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const CHANNELS = [
  { key: 'dashboard', label: 'Dashboard', icon: Bell },
  { key: 'email', label: 'Email', icon: Mail },
  { key: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
];

export default function TenderBroadcasts() {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [channels, setChannels] = useState(['dashboard']);
  const [filters, setFilters] = useState({ branch: 'All', clientType: 'All', industry: 'All', status: 'All' });
  const [preview, setPreview] = useState({ count: 0, recipients: [] });
  const [industries, setIndustries] = useState([]);
  const [history, setHistory] = useState([]);
  const [query, setQuery] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => { getClientIndustries().then(({ data }) => setIndustries(data || [])).catch(() => {}); }, []);
  useEffect(() => { previewTenderRecipients(filters).then(({ data }) => setPreview(data)).catch(() => {}); }, [filters]);
  const loadHistory = () => { getTenderBroadcasts(query).then(({ data }) => setHistory(data)).catch((err) => { console.error('[TenderBroadcasts]', err); toast.error('Could not load broadcast history'); }); };
  useEffect(() => { loadHistory(); }, [query]);

  const toggleChannel = (key) => setChannels((prev) => prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key]);
  const setF = (patch) => setFilters((f) => ({ ...f, ...patch }));

  const send = async () => {
    if (!title.trim() || !body.trim()) return toast.error('Add a title and message');
    if (channels.length === 0) return toast.error('Select at least one delivery channel');
    if (preview.count === 0) return toast.error('No recipients match these filters');
    setSending(true);
    await createTenderBroadcast({ title, body, channels, filters, sentBy: user?.name || 'Marketing Team' });
    setSending(false);
    toast.success(`Tender broadcast sent to ${preview.count} client(s)`);
    setTitle(''); setBody(''); setChannels(['dashboard']); setFilters({ branch: 'All', clientType: 'All', industry: 'All', status: 'All' });
    loadHistory();
  };

  const remove = (id) => { if (!window.confirm('Remove this broadcast from history?')) return; deleteTenderBroadcast(id).then(() => { toast.success('Removed'); loadHistory(); }); };

  const inp = 'w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-ticano-red';
  const sel = inp;

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h3 className="text-lg font-bold text-ticano-charcoal dark:text-white flex items-center gap-2"><Megaphone size={18} /> Tender Broadcasts</h3>
        <p className="text-sm text-gray-500 mt-0.5">Broadcast tender opportunities, deadlines and procurement announcements to targeted clients.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Composer */}
        <div className="bg-white dark:bg-ticano-dark-card rounded-2xl border border-gray-100 dark:border-gray-700 p-5 space-y-3">
          <input className={inp} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tender title (e.g. Government PPE Supply Tender)" />
          <textarea className={inp + ' resize-none'} rows={4} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Announcement details, deadline, how to apply…" />

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Delivery channels</p>
            <div className="flex gap-2 flex-wrap">
              {CHANNELS.map((c) => {
                const Icon = c.icon; const on = channels.includes(c.key);
                return (
                  <button key={c.key} onClick={() => toggleChannel(c.key)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm border transition-colors ${on ? 'bg-ticano-red text-white border-ticano-red' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300'}`}>
                    <Icon size={14} /> {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5"><Filter size={12} /> Recipient filters</p>
            <div className="grid grid-cols-2 gap-2">
              <select className={sel} value={filters.branch} onChange={(e) => setF({ branch: e.target.value })}>
                <option value="All">All branches</option>
                {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
              <select className={sel} value={filters.clientType} onChange={(e) => setF({ clientType: e.target.value })}>
                <option value="All">All categories</option>
                <option value="new">New clients</option>
                <option value="existing">Existing clients</option>
              </select>
              <select className={sel} value={filters.industry} onChange={(e) => setF({ industry: e.target.value })}>
                <option value="All">All industries</option>
                {industries.map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
              <select className={sel} value={filters.status} onChange={(e) => setF({ status: e.target.value })}>
                <option value="All">Any status</option>
                <option value="active">Active</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-sm text-gray-500 flex items-center gap-1.5"><Users size={14} /> <strong className="text-ticano-charcoal dark:text-white">{preview.count}</strong> recipient{preview.count !== 1 ? 's' : ''}</span>
            <button onClick={send} disabled={sending} className="flex items-center gap-2 px-5 py-2.5 bg-ticano-red text-white rounded-xl text-sm font-semibold hover:bg-ticano-red-dark disabled:opacity-60">
              {sending ? 'Sending…' : <><Send size={14} /> Send broadcast</>}
            </button>
          </div>
          {preview.count > 0 && (
            <p className="text-[11px] text-gray-400">{preview.recipients.slice(0, 6).map((r) => `${r.name} (${r.clientId})`).join(', ')}{preview.count > 6 ? ` +${preview.count - 6} more` : ''}</p>
          )}
        </div>

        {/* History */}
        <div className="bg-white dark:bg-ticano-dark-card rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-gray-800 dark:text-white text-sm">Broadcast history</p>
          </div>
          <div className="relative mb-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search broadcasts…" className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-ticano-red" />
          </div>
          {history.length === 0 ? (
            <p className="text-center text-gray-400 py-8 text-sm">{query ? 'No broadcasts match your search.' : 'No broadcasts sent yet.'}</p>
          ) : (
            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {history.map((t) => (
                <div key={t.id} className="border border-gray-100 dark:border-gray-700 rounded-xl p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-sm text-gray-800 dark:text-white">{t.title}</p>
                    <button onClick={() => remove(t.id)} className="text-gray-300 hover:text-red-500 shrink-0"><Trash2 size={13} /></button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{t.body}</p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap text-[11px] text-gray-400">
                    <span className="flex items-center gap-1"><Users size={10} />{t.recipientCount}</span>
                    {(t.channels || []).map((c) => <span key={c} className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 capitalize">{c}</span>)}
                    <span className="ml-auto">{new Date(t.sentAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
