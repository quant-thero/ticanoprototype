import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ClipboardList, Plus, Trash2, Edit2, Eye, EyeOff, BarChart2, X, Star, Copy, Sparkles, GripVertical, Download, Share2 } from 'lucide-react';
import {
  getQuestionnaires, createQuestionnaire, updateQuestionnaire,
  setQuestionnaireStatus, deleteQuestionnaire,
  getQuestionnaireAnalytics,
} from '../../services/supabaseApi';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const QTYPES = [{ value: 'rating', label: 'Rating (1-5)' }, { value: 'choice', label: 'Multiple choice' }, { value: 'text', label: 'Free text' }];
const blankQuestion = (overrides = {}) => ({ id: `q${Date.now()}${Math.floor(Math.random() * 99)}`, type: 'rating', text: '', options: [], ...overrides });
const blankForm = { title: '', description: '', questions: [blankQuestion()] };

// Shared by both download and share, a plain-text summary of the
// aggregate results (never individual responses, matching the anonymity
// guarantee everywhere else in this feature).
function formatResultsSummary(questionnaire, data) {
  const lines = [
    `${questionnaire.title}, Results`,
    `${data.responseCount} response${data.responseCount === 1 ? '' : 's'} · ${data.completionRate}% completion rate`,
    '',
  ];
  data.perQuestion.forEach((pq, i) => {
    lines.push(`${i + 1}. ${pq.question}`);
    if (pq.type === 'rating') lines.push(` Average: ${pq.average} / 5 (${pq.count} responses)`);
    else if (pq.type === 'choice') Object.entries(pq.distribution || {}).forEach(([opt, n]) => lines.push(` ${opt}: ${n}`));
    else if (pq.type === 'text') (pq.answers || []).forEach((a) => lines.push(` - "${a}"`));
    lines.push('');
  });
  return lines.join('\n');
}

function downloadResultsCsv(questionnaire, data) {
  const rows = [['Question', 'Type', 'Metric', 'Value']];
  data.perQuestion.forEach((pq) => {
    if (pq.type === 'rating') rows.push([pq.question, 'Rating', 'Average (of 5)', pq.average]);
    else if (pq.type === 'choice') Object.entries(pq.distribution || {}).forEach(([opt, n]) => rows.push([pq.question, 'Choice', opt, n]));
    else if (pq.type === 'text') (pq.answers || []).forEach((a, i) => rows.push([pq.question, 'Text', `Answer ${i + 1}`, a]));
  });
  const csv = rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${questionnaire.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-results.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function shareResults(questionnaire, data) {
  const text = formatResultsSummary(questionnaire, data);
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(
      () => toast.success('Summary copied, paste it anywhere to share'),
      () => toast.error('Could not copy to clipboard')
    );
  } else {
    toast.error('Clipboard not available in this browser');
  }
}

// Quick-insert templates for the most common survey questions, the
// biggest single time-saver for someone building a survey from scratch.
// One click adds a fully-formed question instead of typing it out.
const QUICK_ADD = [
  { label: 'Overall satisfaction', build: () => blankQuestion({ type: 'rating', text: 'How satisfied are you with our service overall?' }) },
  { label: 'Would recommend?', build: () => blankQuestion({ type: 'choice', text: 'Would you recommend Ticano to another business?', options: ['Yes', 'No', 'Maybe'] }) },
  { label: 'What could improve', build: () => blankQuestion({ type: 'text', text: 'What could we do better?' }) },
  { label: 'Response time', build: () => blankQuestion({ type: 'rating', text: 'How would you rate our response time?' }) },
];

export default function QuestionnairesManagement() {
  const { user } = useAuth();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(blankForm);
  const [viewing, setViewing] = useState(null); // the questionnaire currently showing results
  const [panelData, setPanelData] = useState(null);

  const load = () => { getQuestionnaires().then(({ data }) => { setList(data); setLoading(false); }).catch((err) => { console.error('[QuestionnairesManagement]', err); toast.error('Could not load questionnaires'); setLoading(false); }); };
  useEffect(load, []);

  const reset = () => { setForm(blankForm); setEditingId(null); setShowForm(false); };
  const startCreate = () => { setForm({ ...blankForm, questions: [blankQuestion()] }); setEditingId(null); setShowForm(true); };
  const startEdit = (q) => { setForm({ title: q.title, description: q.description, questions: q.questions.length ? q.questions : [blankQuestion()] }); setEditingId(q.id); setShowForm(true); };
  const startDuplicate = (q) => {
    setForm({ title: `${q.title} (Copy)`, description: q.description, questions: q.questions.length ? q.questions.map((qq) => ({ ...qq, id: `q${Date.now()}${Math.floor(Math.random() * 99)}` })) : [blankQuestion()] });
    setEditingId(null);
    setShowForm(true);
    toast('Duplicated, review and publish when ready', { icon: '' });
  };

  const setQ = (i, patch) => setForm((f) => ({ ...f, questions: f.questions.map((q, idx) => idx === i ? { ...q, ...patch } : q) }));
  const addQ = () => setForm((f) => ({ ...f, questions: [...f.questions, blankQuestion()] }));
  const addQuickQ = (build) => setForm((f) => ({ ...f, questions: [...f.questions, build()] }));
  const removeQ = (i) => setForm((f) => ({ ...f, questions: f.questions.filter((_, idx) => idx !== i) }));
  const moveQ = (i, dir) => setForm((f) => {
    const next = [...f.questions];
    const j = i + dir;
    if (j < 0 || j >= next.length) return f;
    [next[i], next[j]] = [next[j], next[i]];
    return { ...f, questions: next };
  });

  // Choice options as individual add/remove fields instead of one
  // comma-separated text box, easier to read, easier to fix a typo in
  // one option without retyping the rest.
  const setOption = (qi, oi, value) => setQ(qi, { options: form.questions[qi].options.map((o, idx) => idx === oi ? value : o) });
  const addOption = (qi) => setQ(qi, { options: [...(form.questions[qi].options || []), ''] });
  const removeOption = (qi, oi) => setQ(qi, { options: form.questions[qi].options.filter((_, idx) => idx !== oi) });

  const save = async (publish) => {
    if (!form.title.trim()) return toast.error('Title is required');
    if (form.questions.length === 0) return toast.error('Add at least one question');
    if (form.questions.some((q) => !q.text.trim())) return toast.error('Every question needs text');
    if (form.questions.some((q) => q.type === 'choice' && (q.options || []).filter(Boolean).length < 2)) return toast.error('Multiple choice questions need at least 2 options');
    setSaving(true);
    try {
      const payload = {
        ...form,
        author: user?.name || 'Marketing Team',
        status: publish ? 'published' : 'draft',
        questions: form.questions.map((q) => ({ ...q, options: q.type === 'choice' ? (q.options || []).filter(Boolean) : undefined })),
      };
      if (editingId) await updateQuestionnaire(editingId, payload);
      else await createQuestionnaire(payload);
      toast.success(publish ? 'Questionnaire published' : 'Draft saved');
      reset(); load();
    } catch (err) {
      toast.error(err?.message || 'Could not save this questionnaire');
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = (q) => {
    const next = q.status === 'published' ? 'draft' : 'published';
    setQuestionnaireStatus(q.id, next).then(() => { toast.success(next === 'published' ? 'Published' : 'Unpublished'); load(); }).catch(() => toast.error('Could not update status'));
  };
  const remove = (id) => { if (!window.confirm('Delete this questionnaire and its responses?')) return; deleteQuestionnaire(id).then(() => { toast.success('Deleted'); load(); }).catch(() => toast.error('Could not delete')); };

  const openAnalytics = async (q) => {
    setViewing(q);
    setPanelData(null);
    try {
      const { data } = await getQuestionnaireAnalytics(q.id);
      setPanelData(data);
    } catch (err) {
      toast.error(err?.message || 'Could not load results');
      setViewing(null);
    }
  };

  const inp = 'w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-ticano-red';

  if (loading) return <div className="flex justify-center py-10"><div className="w-8 h-8 border-2 border-gray-200 border-t-ticano-red rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-bold text-ticano-charcoal dark:text-white flex items-center gap-2"><ClipboardList size={18} /> Questionnaires & Surveys</h3>
          <p className="text-sm text-gray-500 mt-0.5">Published questionnaires appear to clients as optional surveys in their portal. Responses are always anonymous, results show as aggregate statistics only, never tied to a specific client.</p>
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
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Questions</p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-gray-400 flex items-center gap-1"><Sparkles size={11} /> Quick add:</span>
                  {QUICK_ADD.map((t) => (
                    <button key={t.label} onClick={() => addQuickQ(t.build)} className="text-[11px] px-2 py-1 rounded-full border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-ticano-red hover:text-ticano-red transition-colors">
                      + {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {form.questions.map((q, i) => (
                <div key={q.id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-400 w-6">Q{i + 1}</span>
                    <select className={inp + ' max-w-[170px]'} value={q.type} onChange={(e) => setQ(i, { type: e.target.value, options: e.target.value === 'choice' ? (q.options?.length ? q.options : ['', '']) : q.options })}>
                      {QTYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                    <div className="ml-auto flex items-center gap-0.5">
                      <button onClick={() => moveQ(i, -1)} disabled={i === 0} title="Move up" className="p-1.5 text-gray-300 hover:text-gray-600 disabled:opacity-30 disabled:hover:text-gray-300 rounded-lg"><GripVertical size={13} className="rotate-90" /></button>
                      {form.questions.length > 1 && <button onClick={() => removeQ(i)} title="Remove question" className="p-1.5 text-gray-300 hover:text-red-500 rounded-lg"><Trash2 size={13} /></button>}
                    </div>
                  </div>
                  <input className={inp} value={q.text} onChange={(e) => setQ(i, { text: e.target.value })} placeholder="Question text" />
                  {q.type === 'choice' && (
                    <div className="space-y-1.5 pl-1">
                      {(q.options || []).map((opt, oi) => (
                        <div key={oi} className="flex items-center gap-1.5">
                          <input className={inp} value={opt} onChange={(e) => setOption(i, oi, e.target.value)} placeholder={`Option ${oi + 1}`} />
                          {(q.options || []).length > 2 && <button onClick={() => removeOption(i, oi)} className="p-1.5 text-gray-300 hover:text-red-500 shrink-0"><X size={13} /></button>}
                        </div>
                      ))}
                      <button onClick={() => addOption(i)} className="text-xs text-ticano-red font-medium hover:underline flex items-center gap-1"><Plus size={11} /> Add option</button>
                    </div>
                  )}
                </div>
              ))}
              <button onClick={addQ} className="flex items-center gap-1.5 text-sm text-ticano-red font-medium hover:underline"><Plus size={14} /> Add blank question</button>
            </div>

            <div className="flex flex-wrap gap-2 justify-end pt-1">
              <button onClick={reset} className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300">Cancel</button>
              <button onClick={() => save(false)} disabled={saving} className="px-4 py-2 rounded-xl border border-ticano-red text-ticano-red text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-900/10 disabled:opacity-60">Save as draft</button>
              <button onClick={() => save(true)} disabled={saving} className="px-4 py-2 rounded-xl bg-ticano-red text-white text-sm font-semibold hover:bg-ticano-red-dark disabled:opacity-60">{saving ? 'Saving…' : editingId ? 'Save & publish' : 'Publish'}</button>
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
                  <button onClick={() => openAnalytics(q)} title="View results" className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg"><BarChart2 size={13} /> Results</button>
                  <button onClick={() => startDuplicate(q)} title="Duplicate" className="p-2 text-gray-400 hover:text-ticano-charcoal dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><Copy size={14} /></button>
                  <button onClick={() => togglePublish(q)} title={q.status === 'published' ? 'Unpublish' : 'Publish'} className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg">{q.status === 'published' ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                  <button onClick={() => startEdit(q)} title="Edit" className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"><Edit2 size={14} /></button>
                  <button onClick={() => remove(q.id)} title="Delete" className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Results panel, always aggregate, never an individual response.
          Rendered via a portal directly into document.body so it always
          sits above the dashboard's own sticky nav, regardless of any
          ancestor stacking context (z-index alone wasn't reliable here, a transformed/positioned ancestor was trapping it underneath
          the nav bar no matter how high this modal's own z-index was set). */}
      {viewing && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setViewing(null); setPanelData(null); }} />
          <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-white dark:bg-ticano-dark-card rounded-2xl shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-ticano-dark-card gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-ticano-charcoal dark:text-white truncate">{viewing.title}, Results</p>
                <p className="text-[11px] text-gray-400">Anonymous aggregate data only</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {panelData && (
                  <>
                    <button onClick={() => shareResults(viewing, panelData)} title="Share" className="p-2 text-gray-400 hover:text-ticano-red hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><Share2 size={16} /></button>
                    <button onClick={() => downloadResultsCsv(viewing, panelData)} title="Download as CSV" className="p-2 text-gray-400 hover:text-ticano-red hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><Download size={16} /></button>
                  </>
                )}
                <button onClick={() => { setViewing(null); setPanelData(null); }} className="p-2 text-gray-400 hover:text-gray-600"><X size={16} /></button>
              </div>
            </div>
            <div className="p-5">
              {!panelData ? (
                <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-gray-200 border-t-ticano-red rounded-full animate-spin" /></div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4"><p className="text-xs text-gray-400">Responses</p><p className="text-2xl font-bold text-ticano-charcoal dark:text-white">{panelData.responseCount}</p></div>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4"><p className="text-xs text-gray-400">Completion rate</p><p className="text-2xl font-bold text-ticano-charcoal dark:text-white">{panelData.completionRate}%</p></div>
                  </div>
                  {panelData.perQuestion.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-6">No responses yet.</p>
                  ) : panelData.perQuestion.map((pq, i) => (
                    <div key={i} className="border border-gray-100 dark:border-gray-700 rounded-xl p-3">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">{pq.question}</p>
                      {pq.type === 'rating' && <p className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-1"><Star size={14} className="text-yellow-400 fill-yellow-400" /> Average {pq.average} / 5 <span className="text-gray-400">({pq.count} responses)</span></p>}
                      {pq.type === 'choice' && <div className="space-y-1">{Object.entries(pq.distribution || {}).map(([opt, n]) => <div key={opt} className="flex items-center justify-between text-sm"><span className="text-gray-600 dark:text-gray-300">{opt}</span><span className="text-gray-400">{n}</span></div>)}</div>}
                      {pq.type === 'text' && <div className="space-y-1 max-h-40 overflow-y-auto">{(pq.answers || []).length ? pq.answers.map((a, idx) => <p key={idx} className="text-sm text-gray-600 dark:text-gray-300 italic border-l-2 border-gray-200 pl-2">"{a}"</p>) : <p className="text-sm text-gray-400">No text answers yet</p>}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
