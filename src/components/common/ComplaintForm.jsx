import React, { useState } from 'react';
import DocumentUpload from './DocumentUpload';
import { Send, Lock, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  JOURNEY_STAGES, COMPLAINT_CATEGORIES,
  COMPLAINT_SEVERITY, COMPLAINT_PRIORITY,
} from '../../utils/constants';

/**
 * Customer-facing complaint submission form.
 *
 * Implements:
 *   §1  — sets status to 'created'
 *   §2  — anonymous toggle (strict privacy)
 *   §14 — severity AND priority captured independently
 *   §18 — no document upload field
 */
export default function ComplaintForm({ onSubmit, clientType = 'existing', defaultBranch = 'Gaborone' }) {
  const [form, setForm] = useState({
    journeyStage: 'before_applying',
    category: COMPLAINT_CATEGORIES.before_applying[0],
    severity: 'moderate',
    priority: 'medium',
    description: '',
    anonymous: false,
  });
  const [submitting, setSubmitting] = useState(false);

  const set = (k, v) => {
    if (k === 'journeyStage') {
      setForm((p) => ({ ...p, journeyStage: v, category: COMPLAINT_CATEGORIES[v][0] }));
    } else {
      setForm((p) => ({ ...p, [k]: v }));
    }
  };

  const handleSubmit = async () => {
    if (!form.description.trim()) return toast.error('Please describe your complaint');
    setSubmitting(true);
    try {
      await onSubmit?.({ ...form, clientType, branch: defaultBranch });
      setForm({
        journeyStage: 'before_applying',
        category: COMPLAINT_CATEGORIES.before_applying[0],
        severity: 'moderate',
        priority: 'medium',
        description: '',
        anonymous: false,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const input = 'w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-ticano-red';
  const label = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={label}>When did this happen? *</label>
          <select value={form.journeyStage} onChange={(e) => set('journeyStage', e.target.value)} className={input}>
            {JOURNEY_STAGES.map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Category *</label>
          <select value={form.category} onChange={(e) => set('category', e.target.value)} className={input}>
            {COMPLAINT_CATEGORIES[form.journeyStage].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={label}>Severity</label>
          <div className="flex flex-wrap gap-2">
            {COMPLAINT_SEVERITY.map((s) => (
              <button
                type="button" key={s.key}
                onClick={() => set('severity', s.key)}
                className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                  form.severity === s.key
                    ? 'bg-ticano-red text-white border-ticano-red'
                    : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-ticano-red'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className={label}>Priority</label>
          <div className="flex flex-wrap gap-2">
            {COMPLAINT_PRIORITY.map((p) => (
              <button
                type="button" key={p.key}
                onClick={() => set('priority', p.key)}
                className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                  form.priority === p.key
                    ? 'bg-ticano-charcoal text-white border-ticano-charcoal'
                    : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-ticano-charcoal'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <label className={label}>Describe your complaint *</label>
        <textarea
          rows={4}
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder="Please tell us what happened, where, and when, in as much detail as you can…"
          className={`${input} resize-none`}
        />
      </div>

      {/* Anonymous toggle (§2) */}
      <label className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${form.anonymous ? 'border-ticano-charcoal bg-gray-50 dark:bg-gray-800' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}>
        <input
          type="checkbox"
          checked={form.anonymous}
          onChange={(e) => set('anonymous', e.target.checked)}
          className="mt-1"
        />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Lock size={14} className="text-ticano-charcoal dark:text-gray-300" />
            <span className="font-medium text-ticano-charcoal dark:text-white">Submit as anonymous</span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Your name, phone and email will NOT be stored. You will receive an anonymous ID (e.g. ANON-000123) to track this complaint. No one — not even an administrator — can recover your identity.
          </p>
        </div>
      </label>

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full flex items-center justify-center gap-2 py-3 bg-ticano-red text-white rounded-xl font-semibold text-sm hover:bg-ticano-red-dark transition-colors disabled:opacity-60"
      >
        <Send size={16} />
        {submitting ? 'Submitting…' : 'Submit Complaint'}
      </button>

      <p className="text-xs text-gray-400 text-center flex items-center justify-center gap-1">
        <Info size={12} /> Document uploads are not supported. Please describe everything in writing.
      </p>
    </div>
  );
}
