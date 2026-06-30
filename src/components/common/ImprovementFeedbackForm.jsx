import React, { useState } from 'react';
import { Lightbulb, Send, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { submitImprovementFeedback } from '../../services/api';
import { IMPROVEMENT_CATEGORIES, BRANCHES } from '../../utils/constants';

/**
 * §3 — "How can we improve your experience with Ticano?"
 *
 * This is intentionally separate from the complaint system. Submissions do
 * NOT enter the complaint queue. They route to the Service Manager Feedback
 * Dashboard and the Director Insights Dashboard.
 */
export default function ImprovementFeedbackForm({ author, defaultBranch, onSubmitted }) {
  const [category, setCategory] = useState(IMPROVEMENT_CATEGORIES[0]);
  const [text, setText] = useState('');
  const [branch, setBranch] = useState(defaultBranch || '');
  const [anonymous, setAnonymous] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = () => {
    if (!text.trim()) return toast.error('Please share your suggestion');
    setBusy(true);
    submitImprovementFeedback({ category, text, branch: branch || null, anonymous, author })
      .then(({ data }) => {
        toast.success(data.message);
        setText('');
        setAnonymous(false);
        onSubmitted?.();
      })
      .finally(() => setBusy(false));
  };

  return (
    <div className="bg-white dark:bg-ticano-dark-card rounded-xl border border-gray-100 dark:border-gray-700 p-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-yellow-100 dark:bg-yellow-900/40 flex items-center justify-center flex-shrink-0">
          <Lightbulb className="text-yellow-600 dark:text-yellow-400" size={20} />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-ticano-charcoal dark:text-white">How can we improve your experience with Ticano?</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Suggestions and ideas — not a complaint. We use these to make the service better.</p>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs uppercase tracking-wide text-gray-500">What's the suggestion about?</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
          >
            {IMPROVEMENT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs uppercase tracking-wide text-gray-500">Which branch (optional)</label>
          <select
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
          >
            <option value="">All / system-wide</option>
            {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs uppercase tracking-wide text-gray-500">Your idea</label>
          <textarea
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What would make the service better?"
            className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm resize-none"
          />
        </div>

        <label className="flex items-start gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} className="mt-1" />
          <span className="flex items-center gap-1 text-gray-600 dark:text-gray-300">
            <Lock size={12} /> Submit anonymously (we won't store your name)
          </span>
        </label>

        <button
          onClick={submit}
          disabled={busy}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-medium text-sm disabled:opacity-60"
        >
          <Send size={14} />
          {busy ? 'Sending…' : 'Send Suggestion'}
        </button>
      </div>
    </div>
  );
}
