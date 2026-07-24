import React, { useState, useEffect } from 'react';
import { Quote, Plus, Trash2, Edit2, Eye, EyeOff, Star, Save, X, CheckCircle2, XCircle, Archive, Inbox } from 'lucide-react';
import { EmptyState } from './UI';
import { getAllTestimonials, createTestimonial, updateTestimonial, deleteTestimonial, setTestimonialEnabled, getPendingTestimonials, setTestimonialReviewStatus, subscribeToTable } from '../../services/supabaseApi';
import { BRANCHES } from '../../utils/constants';
import toast from 'react-hot-toast';

const blank = { name: '', company: '', rating: 5, comment: '', branch: 'Gaborone', enabled: true };

function Stars({ n, size = 11 }) {
  return <span className="flex">{[1, 2, 3, 4, 5].map((i) => <Star key={i} size={size} className={i <= n ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'} />)}</span>;
}

export default function TestimonialsManager() {
  const [list, setList] = useState([]);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(blank);
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'published' | 'rejected' | 'archived'

  const load = () => {
    Promise.all([getAllTestimonials(), getPendingTestimonials()])
      .then(([all, pend]) => { setList(all.data); setPending(pend.data); setLoading(false); })
      .catch((err) => { console.error('[TestimonialsManager]', err); toast.error('Could not load testimonials'); setLoading(false); });
  };
  useEffect(load, []);

  // Live sync: a fresh 5-star rating lands in Outstanding Reviews the
  // moment it's submitted, no refresh needed.
  useEffect(() => {
    const unsubscribe = subscribeToTable('testimonials', {}, load);
    return unsubscribe;
  }, []);

  const reset = () => { setForm(blank); setEditingId(null); setShowForm(false); };
  const startCreate = () => { setForm(blank); setEditingId(null); setShowForm(true); };
  const startEdit = (t) => { setForm({ name: t.name, company: t.company, rating: t.rating, comment: t.comment, branch: t.branch, enabled: t.enabled }); setEditingId(t.id); setShowForm(true); };

  const save = () => {
    if (!form.name.trim() || !form.comment.trim()) return toast.error('Name and review text are required');
    const done = () => { toast.success(editingId ? 'Review updated' : 'Review added'); reset(); load(); };
    if (editingId) updateTestimonial(editingId, form).then(done).catch(() => toast.error('Could not save review'));
    else createTestimonial(form).then(done).catch(() => toast.error('Could not save review'));
  };
  const toggle = (t) => { setTestimonialEnabled(t.id, !t.enabled).then(() => { toast.success(!t.enabled ? 'Shown on homepage' : 'Hidden from homepage'); load(); }).catch(() => toast.error('Could not update')); };
  const remove = (id) => { if (!window.confirm('Remove this review?')) return; deleteTestimonial(id).then(() => { toast.success('Removed'); load(); }).catch(() => toast.error('Could not remove')); };

  const review = (id, status) => {
    setTestimonialReviewStatus(id, status)
      .then(({ data }) => { toast.success(data.message); load(); })
      .catch((err) => toast.error(err?.message || 'Could not update review status'));
  };

  const inp = 'w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-ticano-red';

  if (loading) return <div className="flex justify-center py-10"><div className="w-8 h-8 border-2 border-gray-200 border-t-ticano-red rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ---------- Outstanding Reviews queue ---------- */}
      <div>
        <h3 className="text-lg font-bold text-ticano-charcoal dark:text-white flex items-center gap-2 mb-1">
          <Inbox size={18} /> Outstanding Reviews {pending.length > 0 && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-ticano-red text-white">{pending.length}</span>}
        </h3>
        <p className="text-sm text-gray-500 mb-3">Every 5-star rating lands here first. Nothing reaches the homepage until you publish it.</p>

        {pending.length === 0 ? (
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6 text-center text-sm text-gray-400">Nothing waiting for review right now.</div>
        ) : (
          <div className="space-y-3">
            {pending.map((t) => (
              <div key={t.id} className="bg-white dark:bg-ticano-dark-card rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-900/10 p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-800 dark:text-white text-sm">{t.name}</p>
                      {t.company && <span className="text-xs text-gray-400">· {t.company}</span>}
                      <Stars n={t.rating} />
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold dark:bg-amber-900/30 dark:text-amber-400">Pending review</span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 italic">"{t.comment}"</p>
                    <p className="text-[11px] text-gray-400 mt-1">{t.branch}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => review(t.id, 'published')} className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700"><CheckCircle2 size={13} /> Publish</button>
                    <button onClick={() => review(t.id, 'rejected')} className="flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-100 dark:bg-red-900/20"><XCircle size={13} /> Reject</button>
                    <button onClick={() => review(t.id, 'archived')} className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-xs font-semibold hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"><Archive size={13} /> Archive</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ---------- All reviews ---------- */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-bold text-ticano-charcoal dark:text-white flex items-center gap-2"><Quote size={18} /> All Reviews</h3>
          <p className="text-sm text-gray-500 mt-0.5">Everything published, rejected, or archived, plus anything you've added directly.</p>
        </div>
        <button onClick={startCreate} className="flex items-center gap-2 px-4 py-2 bg-ticano-red text-white rounded-xl text-sm font-semibold hover:bg-ticano-red-dark transition-colors"><Plus size={15} /> Add review</button>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {[
          ['all', 'All'],
          ['published', 'Published'],
          ['rejected', 'Rejected'],
          ['archived', 'Archived'],
        ].map(([key, label]) => {
          const count = key === 'all'
            ? list.filter((t) => t.reviewStatus !== 'pending').length
            : list.filter((t) => t.reviewStatus === key).length;
          return (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${statusFilter === key ? 'bg-ticano-red text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
            >
              {label} ({count})
            </button>
          );
        })}
      </div>

      {showForm && (
        <div className="bg-white dark:bg-ticano-dark-card rounded-2xl border border-gray-100 dark:border-gray-700 p-5 animate-scale-in space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-gray-800 dark:text-white">{editingId ? 'Edit review' : 'New review'}</h4>
            <button onClick={reset} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input className={inp} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Client name" />
            <input className={inp} value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Company" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select className={inp} value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })}>
              {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500 mr-1">Rating:</span>
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setForm({ ...form, rating: n })}><Star size={20} className={n <= form.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} /></button>
              ))}
            </div>
          </div>
          <textarea rows={3} className={inp + ' resize-none'} value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} placeholder="What the client said…" />
          <div className="flex justify-end gap-2">
            <button onClick={reset} className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300">Cancel</button>
            <button onClick={save} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-ticano-red text-white text-sm font-semibold hover:bg-ticano-red-dark"><Save size={14} /> {editingId ? 'Save changes' : 'Add review'}</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {list.filter((t) => statusFilter === 'all' ? t.reviewStatus !== 'pending' : t.reviewStatus === statusFilter).length === 0 ? (
          <EmptyState title={statusFilter === 'archived' ? 'No archived reviews' : 'Nothing here yet'} message={statusFilter === 'archived' ? "Reviews you archive will show up here instead of disappearing." : undefined} icon={Quote} />
        ) : list.filter((t) => statusFilter === 'all' ? t.reviewStatus !== 'pending' : t.reviewStatus === statusFilter).map((t) => (
          <div key={t.id} className={`bg-white dark:bg-ticano-dark-card rounded-xl border p-4 ${t.enabled ? 'border-gray-100 dark:border-gray-700' : 'border-dashed border-gray-300 dark:border-gray-600 opacity-70'}`}>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-gray-800 dark:text-white text-sm">{t.name}</p>
                  {t.company && <span className="text-xs text-gray-400">· {t.company}</span>}
                  <Stars n={t.rating} />
                  {t.source === 'survey' && <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-semibold">Auto-picked · 5★ survey</span>}
                  {t.reviewStatus === 'rejected' && <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-semibold">Rejected</span>}
                  {t.reviewStatus === 'archived' && <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-200 text-gray-500 font-semibold">Archived</span>}
                  {t.enabled
                    ? <span className="text-[11px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold">On homepage</span>
                    : t.reviewStatus === 'published' && <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-200 text-gray-500 font-semibold">Hidden</span>}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 italic">"{t.comment}"</p>
                <p className="text-[11px] text-gray-400 mt-1">{t.branch}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => toggle(t)} title={t.enabled ? 'Hide' : 'Show'} className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg">{t.enabled ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                <button onClick={() => startEdit(t)} title="Edit" className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"><Edit2 size={14} /></button>
                <button onClick={() => remove(t.id)} title="Remove" className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Trash2 size={14} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
