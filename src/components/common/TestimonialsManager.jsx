import React, { useState, useEffect } from 'react';
import { Quote, Plus, Trash2, Edit2, Eye, EyeOff, Star, Save, X } from 'lucide-react';
import { getAllTestimonials, createTestimonial, updateTestimonial, deleteTestimonial, setTestimonialEnabled } from '../../services/api';
import { BRANCHES } from '../../utils/constants';
import toast from 'react-hot-toast';

const blank = { name: '', company: '', rating: 5, comment: '', branch: 'Gaborone', enabled: true };

export default function TestimonialsManager() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(blank);

  const load = () => { getAllTestimonials().then(({ data }) => { setList(data); setLoading(false); }); };
  useEffect(load, []);

  const reset = () => { setForm(blank); setEditingId(null); setShowForm(false); };
  const startCreate = () => { setForm(blank); setEditingId(null); setShowForm(true); };
  const startEdit = (t) => { setForm({ name: t.name, company: t.company, rating: t.rating, comment: t.comment, branch: t.branch, enabled: t.enabled }); setEditingId(t.id); setShowForm(true); };

  const save = () => {
    if (!form.name.trim() || !form.comment.trim()) return toast.error('Name and testimonial text are required');
    const done = () => { toast.success(editingId ? 'Testimonial updated' : 'Testimonial added'); reset(); load(); };
    if (editingId) updateTestimonial(editingId, form).then(done);
    else createTestimonial(form).then(done);
  };
  const toggle = (t) => { setTestimonialEnabled(t.id, !t.enabled).then(() => { toast.success(!t.enabled ? 'Shown on homepage' : 'Hidden from homepage'); load(); }); };
  const remove = (id) => { if (!window.confirm('Remove this testimonial?')) return; deleteTestimonial(id).then(() => { toast.success('Removed'); load(); }); };

  const inp = 'w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-ticano-red';

  if (loading) return <div className="flex justify-center py-10"><div className="w-8 h-8 border-2 border-gray-200 border-t-ticano-red rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-bold text-ticano-charcoal dark:text-white flex items-center gap-2"><Quote size={18} /> Testimonials & Reviews</h3>
          <p className="text-sm text-gray-500 mt-0.5">5-star customer satisfaction survey responses are picked up automatically. Remove any you don't want shown, or add a testimonial a client sent by text/WhatsApp.</p>
        </div>
        <button onClick={startCreate} className="flex items-center gap-2 px-4 py-2 bg-ticano-red text-white rounded-xl text-sm font-semibold hover:bg-ticano-red-dark transition-colors"><Plus size={15} /> Add testimonial</button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-ticano-dark-card rounded-2xl border border-gray-100 dark:border-gray-700 p-5 animate-scale-in space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-gray-800 dark:text-white">{editingId ? 'Edit testimonial' : 'New testimonial'}</h4>
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
            <button onClick={save} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-ticano-red text-white text-sm font-semibold hover:bg-ticano-red-dark"><Save size={14} /> {editingId ? 'Save changes' : 'Add testimonial'}</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {list.map((t) => (
          <div key={t.id} className={`bg-white dark:bg-ticano-dark-card rounded-xl border p-4 ${t.enabled ? 'border-gray-100 dark:border-gray-700' : 'border-dashed border-gray-300 dark:border-gray-600 opacity-70'}`}>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-gray-800 dark:text-white text-sm">{t.name}</p>
                  {t.company && <span className="text-xs text-gray-400">· {t.company}</span>}
                  <span className="flex">{[1, 2, 3, 4, 5].map((n) => <Star key={n} size={11} className={n <= t.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'} />)}</span>
                  {t.source === 'survey' && <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-semibold">Auto-picked · 5★ survey</span>}
                  {t.enabled
                    ? <span className="text-[11px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold">On homepage</span>
                    : <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-200 text-gray-500 font-semibold">Hidden</span>}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 italic">“{t.comment}”</p>
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
