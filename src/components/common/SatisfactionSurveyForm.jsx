import React, { useState } from 'react';
import { Star, Send, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { submitSatisfactionSurvey } from '../../services/supabaseApi';

/**
 * §4, Post-closure customer satisfaction survey.
 *
 * Triggered when a complaint reaches status === 'closed' and no satisfaction
 * record exists yet. Outputs feed PM / Branch / system-wide CSAT scores.
 */
export default function SatisfactionSurveyForm({ complaint, onSubmitted }) {
  const [issueResolved, setIssueResolved] = useState(null);
  const [communicationSatisfactory, setCommunicationSatisfactory] = useState(null);
  const [pmProfessional, setPmProfessional] = useState(null);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comments, setComments] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = () => {
    if (issueResolved === null || communicationSatisfactory === null || pmProfessional === null) {
      return toast.error('Please answer all questions');
    }
    if (rating < 1) return toast.error('Please give a star rating');
    setBusy(true);
    submitSatisfactionSurvey(complaint.id, {
      issueResolved, communicationSatisfactory, pmProfessional, rating, comments,
    }).then(({ data }) => {
      toast.success(data.message);
      onSubmitted?.();
    }).catch((err) => {
      console.error('[SatisfactionSurveyForm]', err);
      toast.error(err?.message || 'Could not submit your rating, please try again');
    }).finally(() => setBusy(false));
  };

  const YesNo = ({ value, onChange }) => (
    <div className="flex gap-2">
      {[true, false].map((v) => (
        <button key={String(v)}
          onClick={() => onChange(v)}
          className={`px-4 py-1.5 rounded-lg text-sm border transition-colors ${value === v ? (v ? 'bg-green-600 text-white border-green-600' : 'bg-gray-500 text-white border-gray-500') : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>
          {v ? 'Yes' : 'No'}
        </button>
      ))}
    </div>
  );

  return (
    <div className="bg-white dark:bg-ticano-dark-card rounded-xl border-2 border-green-200 dark:border-green-700 p-6">
      <div className="flex items-start gap-3 mb-5">
        <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/40 flex items-center justify-center flex-shrink-0">
          <CheckCircle2 className="text-green-600 dark:text-green-400" size={20} />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-ticano-charcoal dark:text-white">How did we do?</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Complaint <span className="font-semibold text-ticano-red">{complaint.ticket}</span> has been closed. Help us improve by sharing your experience.
          </p>
        </div>
      </div>

      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Was your issue resolved?</span>
          <YesNo value={issueResolved} onChange={setIssueResolved} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Was communication satisfactory?</span>
          <YesNo value={communicationSatisfactory} onChange={setCommunicationSatisfactory} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Was your PM professional?</span>
          <YesNo value={pmProfessional} onChange={setPmProfessional} />
        </div>

        <div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200 block mb-2">Overall rating</span>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)} onClick={() => setRating(n)}>
                <Star
                  size={32}
                  className={`transition-colors ${(hover || rating) >= n ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
                />
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs uppercase tracking-wide text-gray-500">Additional comments (optional)</label>
          <textarea
            rows={3}
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm resize-none"
          />
        </div>

        <button
          onClick={submit}
          disabled={busy}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-sm disabled:opacity-60"
        >
          <Send size={14} />
          {busy ? 'Sending…' : 'Submit Feedback'}
        </button>
      </div>
    </div>
  );
}
