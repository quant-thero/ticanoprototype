import React, { useState, useEffect } from 'react';
import { ClipboardList, X, Star, Send, CheckCircle2 } from 'lucide-react';
import { clientIdFor } from '../../services/supabaseApi';
import { getPublishedQuestionnaires, getMyAnsweredQuestionnaireIds, submitQuestionnaireResponse } from '../../services/supabaseApi';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

// Optional client questionnaires. Clients may complete or dismiss them, they
// never block normal portal usage.
export default function ClientQuestionnaires() {
  const { user } = useAuth();
  const [list, setList] = useState([]);
  const [dismissed, setDismissed] = useState([]);
  const [done, setDone] = useState([]);
  const [active, setActive] = useState(null);
  const [answers, setAnswers] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getPublishedQuestionnaires().then(({ data }) => setList(data || [])).catch(() => {});
    // Permanent, not session-only, a client who already answered a
    // survey (possibly days ago, on a different device) should never
    // see it again, not just for as long as this page stays open.
    getMyAnsweredQuestionnaireIds().then(({ data }) => setDone(data || [])).catch(() => {});
  }, []);

  const visible = list.filter((q) => !dismissed.includes(q.id) && !done.includes(q.id));
  if (visible.length === 0) return null;

  const open = (q) => { setActive(q); setAnswers({}); };
  const close = () => { setActive(null); setAnswers({}); };

  const submit = async () => {
    setSaving(true);
    try {
      await submitQuestionnaireResponse(active.id, {
        clientId: clientIdFor(user?.id),
        clientName: user?.name || 'Client',
        answers,
      });
      setDone((d) => [...d, active.id]);
      toast.success('Thank you for your feedback!');
      setActive(null);
    } catch (err) {
      console.error('[ClientQuestionnaires] submit failed:', err);
      toast.error(err?.message || 'Could not submit your response, please try again');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      {visible.map((q) => (
        <div key={q.id} className="bg-ticano-red/5 border border-ticano-red/20 rounded-2xl p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-ticano-red/10 text-ticano-red flex items-center justify-center shrink-0"><ClipboardList size={17} /></div>
              <div className="min-w-0">
                <p className="font-semibold text-ticano-charcoal dark:text-white text-sm">{q.title} <span className="text-[11px] font-normal text-gray-400">· optional</span></p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{q.description}</p>
              </div>
            </div>
            <button onClick={() => setDismissed((d) => [...d, q.id])} className="text-gray-300 hover:text-gray-500 shrink-0" title="Dismiss"><X size={15} /></button>
          </div>
          {active?.id !== q.id ? (
            <button onClick={() => open(q)} className="mt-3 px-4 py-2 bg-ticano-red text-white rounded-xl text-xs font-semibold hover:bg-ticano-red-dark transition-colors">
              Take the survey
            </button>
          ) : (
            <div className="mt-4 space-y-4 animate-fade-in">
              {q.questions.map((qq) => (
                <div key={qq.id}>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">{qq.text}</p>
                  {qq.type === 'rating' && (
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button key={n} onClick={() => setAnswers((a) => ({ ...a, [qq.id]: n }))}>
                          <Star size={24} className={n <= (answers[qq.id] || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} />
                        </button>
                      ))}
                    </div>
                  )}
                  {qq.type === 'choice' && (
                    <div className="flex flex-wrap gap-2">
                      {qq.options.map((o) => (
                        <button key={o} onClick={() => setAnswers((a) => ({ ...a, [qq.id]: o }))}
                          className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${answers[qq.id] === o ? 'bg-ticano-red text-white border-ticano-red' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300'}`}>
                          {o}
                        </button>
                      ))}
                    </div>
                  )}
                  {qq.type === 'text' && (
                    <textarea rows={2} value={answers[qq.id] || ''} onChange={(e) => setAnswers((a) => ({ ...a, [qq.id]: e.target.value }))}
                      className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-ticano-red resize-none"
                      placeholder="Your answer…" />
                  )}
                </div>
              ))}
              <div className="flex gap-2">
                <button onClick={close} className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300">Cancel</button>
                <button onClick={submit} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-ticano-red text-white rounded-xl text-sm font-semibold hover:bg-ticano-red-dark disabled:opacity-60">
                  {saving ? 'Submitting…' : <><Send size={13} /> Submit</>}
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
