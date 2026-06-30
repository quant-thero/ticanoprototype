import React, { useState, useEffect } from 'react';
import { ClipboardList, Plus, Trash2, Edit2, Eye, EyeOff, BarChart2, Users, X, Star } from 'lucide-react';
import {
  getQuestionnaires, createQuestionnaire, updateQuestionnaire,
  setQuestionnaireStatus, deleteQuestionnaire,
  getQuestionnaireResponses, getQuestionnaireAnalytics,
} from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const QTYPES = [{ value: 'rating', label: 'Rating (1–5)' }, { value: 'choice', label: 'Multiple choice' }, { value: 'text', label: 'Free text' }];
const blankQuestion = () => ({ id: `q${Date.now()}${Math.floor(Math.random() * 99)}`, type: 'rating', text: '', options: [] });
const blankForm = { title: '', description: '', questions: [blankQuestion()] };

export default function QuestionnairesManagement() {
  const { user } = useAuth();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(blankForm);
  const [viewing, setViewing] = useState(null); // {mode:'responses'|'analytics', q}
  const [panelData, setPanelData] = useState(null);

  const load = () => { getQuestionnaires().then(({ data }) => { setList(data); setLoading(false); }); };
  useEffect(load, []);

  const reset = () => { setForm(blankForm); setEditingId(null); setShowForm(false); };
  const startCreate = () => { setForm({ ...blankForm, questions: [blankQuestion()] }); setEditingId(null); setShowForm(true); };
  const startEdit = (q) => { setForm({ title: q.title, description: q.description, questions: q.questions.length ? q.questions : [blankQuestion()] }); setEditingId(q.id); setShowForm(true); };

  const setQ = (i, patch) => setForm((f) => ({ ...f, questions: f.questions.map((q, idx) => idx === i ? { ...q, ...patch } : q) }));
  const addQ = () => setForm((f) => ({ ...f, questions: [...f.questions, blankQuestion()] }));
  const removeQ = (i) => setForm((f) => ({ ...f, questions: f.questions.filter((_, idx) => idx !== i) }));

  const save = (publish) => {
    if (!form.title.trim()) return toast.error('Title is required');
    if (form.questions.some((q) => !q.text.trim())) return toast.error('Every question needs text');
    const payload = {
      ...form,
      author: user?.name || 'Marketing Team',
      status: publish ? 'published' : 'draft',
      questions: form.questions.map((q) => ({ ...q, options: q.type === 'choice' ? (q.options || []).filter(Boolean) : undefined })),
    };
    const done = () => { toast.success(publish ? 'Questionnaire published' : 'Draft saved'); reset(); load(); };
    if (editingId) updateQuestionnaire(editingId, payload).then(done);
    else createQuestionnaire(payload).then(done);
  };

  const togglePublish = (q) => {
    const next = q.status === 'published' ? 'draft' : 'published';
    setQuestionnaireStatus(q.id, next).then(() => { toast.success(next === 'published' ? 'Published' : 'Unpublished'); load(); });
  };
  const remove = (id) => { if (!window.confirm('Delete this questionnaire and its responses?')) return; deleteQuestionnaire(id).then(() => { toast.success('Deleted'); load(); }); };

  const openResponses = async (q) => { const { data } = await getQuestionnaireResponses(q.id); setViewing({ mode: 'responses', q }); setPanelData(data); };
  const openAnalytics = async (q) => { const { data } = await getQuestionnaireAnalytics(q.id); setViewing({ mode: 'analytics', q }); setPanelData(data); };

  const inp = 'w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-ticano-red';

  if (loading) return <div className="flex justify-center py-10"><div className="w-8 h-8 border-2 border-gray-200 border-t-ticano-red rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-bold text-ticano-charcoal dark:text-white flex items-center gap-2"><ClipboardList size={18} /> Questionnaires & Surveys</h3>
          <p className="text-sm text-gray-500 mt-0.5">Published questionnaires appear to clients as optional surveys in their portal.</p>
        </div>
        <button onClick={startCreate} className="flex items-center gap-2 px-4 py-2 bg-ticano-red text-white rounded-xl text-sm font-semibold hover:bg-ticano-red-dark transition-colors"><Plus size={15} /> New Questionnaire</button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-ticano-dark-card rounded-2xl border border-gray-100 dark:border-gray-700 p-5 animate-scale-in">
          <h4 className="font-bold text-gray-800 dark:text-white mb-4">{editingId ? 'Edit Questionnaire' : 'New Questionnaire'}</h4>
          <div className="space-y-3">
            <input className={inp} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Questionnaire title" />
            <textarea className={inp + ' resize-none'} rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Short description shown to clients…" />

            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Questions</p>
              {form.questions.map((q, i) => (
                <div key={q.id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-400">Q{i + 1}</span>
                    <select className={inp + ' max-w-[170px]'} value={q.type} onChange={(e) => setQ(i, { type: e.target.value })}>
                      {QTYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                    {form.questions.length > 1 && <button onClick={() => removeQ(i)} className="ml-auto p-1.5 text-gray-300 hover:text-red-500 rounded-lg"><Trash2 size={13} /></button>}
                  </div>
                  <input className={inp} value={q.text} onChange={(e) => setQ(i, { text: e.target.value })} placeholder="Question text" />
                  {q.type === 'choice' && (
                    <input className={inp} value={(q.options || []).join(', ')} onChange={(e) => setQ(i, { options: e.target.value.split(',').map((o) => o.trim()) })} placeholder="Options, comma separated (e.g. Yes, No, Maybe)" />
                  )}
                </div>
              ))}
              <button onClick={addQ} className="flex items-center gap-1.5 text-sm text-ticano-red font-medium hover:underline"><Plus size={14} /> Add question</button>
            </div>

            <div className="flex flex-wrap gap-2 justify-end pt-1">
              <button onClick={reset} className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300">Cancel</button>
              <button onClick={() => save(false)} className="px-4 py-2 rounded-xl border border-ticano-red text-ticano-red text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-900/10">Save as draft</button>
              <button onClick={() => save(true)} className="px-4 py-2 rounded-xl bg-ticano-red text-white text-sm font-semibold hover:bg-ticano-red-dark">{editingId ? 'Save & publish' : 'Publish'}</button>
            </div>
          </div>
        </div>
      )}

      {list.length === 0 ? (
        <p className="text-center text-gray-400 py-10">No questionnaires yet.</p>
      ) : (
        <div className="space-y-3">
          {list.map((q) => (
            <div key={q.id} className="bg-white dark:bg-ticano-dark-card rounded-xl border border-gray-100 dark:border-gray-700 p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-800 dark:text-white text-sm">{q.title}</p>
                    {q.status === 'published'
                      ? <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-green-100 text-green-700">Published</span>
                      : <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-amber-100 text-amber-700">Draft</span>}
                    <span className="text-[11px] text-gray-400">{q.questions.length} question{q.questions.length !== 1 ? 's' : ''}</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{q.description}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => openResponses(q)} title="Responses" className="p-2 text-gray-400 hover:text-ticano-charcoal dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><Users size={14} /></button>
                  <button onClick={() => openAnalytics(q)} title="Analytics" className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg"><BarChart2 size={14} /></button>
                  <button onClick={() => togglePublish(q)} title={q.status === 'published' ? 'Unpublish' : 'Publish'} className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg">{q.status === 'published' ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                  <button onClick={() => startEdit(q)} title="Edit" className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"><Edit2 size={14} /></button>
                  <button onClick={() => remove(q.id)} title="Delete" className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Responses / Analytics panel */}
      {viewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setViewing(null); setPanelData(null); }} />
          <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-white dark:bg-ticano-dark-card rounded-2xl shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-ticano-dark-card">
              <p className="font-semibold text-ticano-charcoal dark:text-white">{viewing.q.title} — {viewing.mode === 'responses' ? 'Responses' : 'Analytics'}</p>
              <button onClick={() => { setViewing(null); setPanelData(null); }} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
            </div>
            <div className="p-5">
              {viewing.mode === 'analytics' && panelData && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4"><p className="text-xs text-gray-400">Responses</p><p className="text-2xl font-bold text-ticano-charcoal dark:text-white">{panelData.responseCount}</p></div>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4"><p className="text-xs text-gray-400">Completion rate</p><p className="text-2xl font-bold text-ticano-charcoal dark:text-white">{panelData.completionRate}%</p></div>
                  </div>
                  {panelData.perQuestion.map((pq, i) => (
                    <div key={i} className="border border-gray-100 dark:border-gray-700 rounded-xl p-3">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">{pq.question}</p>
                      {pq.type === 'rating' && <p className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-1"><Star size={14} className="text-yellow-400 fill-yellow-400" /> Average {pq.average} / 5 <span className="text-gray-400">({pq.count} responses)</span></p>}
                      {pq.type === 'choice' && <div className="space-y-1">{Object.entries(pq.distribution).map(([opt, n]) => <div key={opt} className="flex items-center justify-between text-sm"><span className="text-gray-600 dark:text-gray-300">{opt}</span><span className="text-gray-400">{n}</span></div>)}</div>}
                      {pq.type === 'text' && <div className="space-y-1 max-h-40 overflow-y-auto">{pq.answers.length ? pq.answers.map((a, idx) => <p key={idx} className="text-sm text-gray-600 dark:text-gray-300 italic border-l-2 border-gray-200 pl-2">“{a}”</p>) : <p className="text-sm text-gray-400">No text answers yet</p>}</div>}
                    </div>
                  ))}
                </div>
              )}
              {viewing.mode === 'responses' && panelData && (
                panelData.length === 0 ? <p className="text-center text-gray-400 py-8">No responses yet.</p> : (
                  <div className="space-y-3">
                    {panelData.map((r) => (
                      <div key={r.id} className="border border-gray-100 dark:border-gray-700 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{r.clientName} <span className="text-[11px] font-normal text-gray-400">{r.clientId}</span></p>
                          <span className="text-xs text-gray-400">{new Date(r.submittedAt).toLocaleDateString()}</span>
                        </div>
                        <div className="space-y-1">
                          {viewing.q.questions.map((qq) => (
                            <p key={qq.id} className="text-xs text-gray-500 dark:text-gray-400"><span className="text-gray-400">{qq.text}:</span> <span className="text-gray-700 dark:text-gray-300 font-medium">{String(r.answers?.[qq.id] ?? '—')}</span></p>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
