import React, { useState, useEffect } from 'react';
import { MapPin, Send, Clock, CheckCircle2, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { requestBranchChange, getMyBranchChangeRequests } from '../../services/supabaseApi';
import { BRANCHES } from '../../utils/constants';

const STATUS_BADGE = {
  pending: { label: 'Pending review', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  approved: { label: 'Approved', cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  rejected: { label: 'Declined', cls: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' },
};

export default function BranchChangeRequest({ currentBranch }) {
  const [requests, setRequests] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [branch, setBranch] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    getMyBranchChangeRequests().then(({ data }) => setRequests(data)).catch(() => setRequests([]));
  };
  useEffect(load, []);

  const hasPending = requests?.some((r) => r.status === 'pending');

  const submit = async () => {
    if (!branch) return toast.error('Please select a branch');
    setSubmitting(true);
    try {
      const { data } = await requestBranchChange(branch, reason.trim() || null);
      toast.success(data.message);
      setShowForm(false);
      setBranch('');
      setReason('');
      load();
    } catch (err) {
      toast.error(err?.message || 'Could not submit your request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-ticano-dark-card rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
        <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2"><MapPin size={16} /> Servicing Branch</h3>
        {!showForm && !hasPending && (
          <button onClick={() => setShowForm(true)} className="text-xs font-semibold text-ticano-red hover:text-ticano-red-dark">
            Request Branch Change
          </button>
        )}
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-300">{currentBranch || 'Not set'}</p>

      {hasPending && !showForm && (
        <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">You have a branch change request awaiting review.</p>
      )}

      {showForm && (
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 space-y-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Requested branch</label>
            <select value={branch} onChange={(e) => setBranch(e.target.value)} className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-800 dark:text-white">
              <option value="">Select a branch…</option>
              {BRANCHES.filter((b) => b !== currentBranch).map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Reason <span className="text-gray-400">(optional)</span></label>
            <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why would you like to move branches?" className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-800 dark:text-white resize-none" />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">Cancel</button>
            <button onClick={submit} disabled={submitting} className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-xl bg-ticano-red text-white hover:bg-ticano-red-dark disabled:opacity-60">
              <Send size={13} /> {submitting ? 'Submitting…' : 'Submit Request'}
            </button>
          </div>
        </div>
      )}

      {requests?.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Request history</p>
          {requests.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-2 text-sm py-1.5">
              <div className="min-w-0">
                <p className="text-gray-700 dark:text-gray-200">{r.currentBranch || '-'} → {r.requestedBranch}</p>
                <p className="text-xs text-gray-400">{new Date(r.requestedAt).toLocaleDateString()}{r.decidedAt ? ` · decided ${new Date(r.decidedAt).toLocaleDateString()}` : ''}</p>
              </div>
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${STATUS_BADGE[r.status].cls}`}>{STATUS_BADGE[r.status].label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
