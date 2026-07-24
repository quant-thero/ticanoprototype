import React, { useState, useEffect } from 'react';
import { Modal, Badge } from './UI';
import ComplaintTimeline from './ComplaintTimeline';
import { AlertTriangle, ArrowUpCircle, User, MapPin, UserCog, Clock, CornerUpLeft, MessageSquare, Send } from 'lucide-react';
import { complaintStatusLabel, JOURNEY_STAGE_LABEL } from '../../utils/constants';
import { formatDateTime } from '../../utils/format';
import { returnComplaintToPm, resolveComplaint, getComplaintNotes, addInternalNote } from '../../services/supabaseApi';
import toast from 'react-hot-toast';

/**
 * Shows the full detail of an escalated complaint when an escalation row is
 * clicked (Service Manager + Director dashboards).
 */
export default function EscalationDetailModal({ complaint, onClose, currentUser, onReturned }) {
  const [returning, setReturning] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [returnNote, setReturnNote] = useState('');
  const [notes, setNotes] = useState(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [postingNote, setPostingNote] = useState(false);

  useEffect(() => {
    if (!complaint?.id) { setNotes(null); return; }
    getComplaintNotes(complaint.id).then(({ data }) => setNotes(data.internalNotes)).catch(() => setNotes([]));
  }, [complaint?.id]);

  const postNote = async () => {
    if (!noteDraft.trim()) return;
    setPostingNote(true);
    try {
      await addInternalNote(complaint.id, { author: currentUser?.name || 'Director', text: noteDraft.trim() });
      setNoteDraft('');
      const { data } = await getComplaintNotes(complaint.id);
      setNotes(data.internalNotes);
      toast.success('Note added');
    } catch (err) {
      toast.error(err?.message || 'Could not add note');
    } finally {
      setPostingNote(false);
    }
  };

  if (!complaint) return null;
  const c = complaint;
  const esc = c.escalation || {};
  const chain = esc.chain && esc.chain.length ? esc.chain : (esc.reason ? [{ at: esc.at, by: esc.by, fromRole: esc.byRole, toLevel: esc.toLevel, reason: esc.reason }] : []);

  const canAct = (currentUser?.role === 'service_manager' || currentUser?.role === 'director') && esc.to === currentUser?.role;
  // Once this escalation has already been returned/resolved, disable the
  // button rather than let it fire again, resolved_at on the escalation
  // record flips the moment returnComplaintToPm() runs, so this needs no
  // new column of its own to know.
  const alreadyReturned = Boolean(esc.resolvedAt);
  const canReturnToPm = canAct && !alreadyReturned;

  const handleReturn = async () => {
    setReturning(true);
    try {
      await returnComplaintToPm(c.id, returnNote.trim() || null, currentUser?.name, currentUser?.role);
      toast.success(currentUser?.role === 'director'
        ? `${c.ticket} returned to the Service Manager`
        : `${c.ticket} returned to ${c.assignedPmName || 'the PM'}`);
      onReturned?.();
      onClose();
    } catch (err) {
      toast.error(err?.message || 'Could not return this complaint');
    } finally {
      setReturning(false);
    }
  };

  const handleResolve = async () => {
    if (!window.confirm(`Mark ${c.ticket} as resolved?`)) return;
    setResolving(true);
    try {
      await resolveComplaint(c.id, { author: currentUser?.name });
      toast.success(`${c.ticket} marked resolved`);
      onReturned?.();
      onClose();
    } catch (err) {
      toast.error(err?.message || 'Could not resolve this complaint');
    } finally {
      setResolving(false);
    }
  };

  const Row = ({ icon: Icon, label, value }) => (
    <div className="flex items-center gap-2 text-sm">
      <Icon size={14} className="text-gray-400" />
      <span className="text-gray-500 dark:text-gray-400">{label}:</span>
      <span className="font-medium text-gray-800 dark:text-white">{value || '-'}</span>
    </div>
  );

  return (
    <Modal isOpen={!!complaint} onClose={onClose} title={`${c.ticket}, Escalation detail`} size="lg">
      {/* Header */}
      <div className="flex items-center flex-wrap gap-2 mb-4">
        <span className="font-mono font-bold text-ticano-red text-lg">{c.ticket}</span>
        <span className="font-semibold text-ticano-charcoal dark:text-white">{c.customerName}</span>
        <Badge status={c.severity} />
        <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">{complaintStatusLabel(c.status)}</span>
      </div>

      {/* Complaint detail */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
        <Row icon={MapPin} label="Branch" value={c.branch} />
        <Row icon={UserCog} label="Portfolio Manager" value={c.assignedPmName} />
        <Row icon={User} label="Client type" value={c.clientType === 'new' ? 'New client' : 'Existing client'} />
        <Row icon={Clock} label="Opened" value={formatDateTime(c.createdAt)} />
      </div>

      <div className="mb-4">
        <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">
          {JOURNEY_STAGE_LABEL[c.journeyStage] || 'Complaint'} · {c.category}
        </p>
        <p className="text-sm text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-800 rounded-xl p-3">{c.description}</p>
      </div>

      {/* Escalation chain */}
      <div className="rounded-xl border border-orange-200 dark:border-orange-700/40 bg-orange-50/60 dark:bg-orange-900/10 p-4 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="text-orange-600" size={18} />
          <h4 className="font-semibold text-orange-900 dark:text-orange-200">Escalation history</h4>
        </div>
        {chain.length === 0 ? (
          <p className="text-sm text-gray-500">No escalation details recorded.</p>
        ) : (
          <ol className="space-y-3">
            {chain.map((step, i) => (
              <li key={i} className="flex gap-3">
                <ArrowUpCircle size={16} className="text-orange-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-white">
                    {labelForRole(step.fromRole)} → {labelForLevel(step.toLevel)}
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-200">{step.reason}</p>
                  <p className="text-xs text-gray-400 mt-0.5">by {step.by || esc.by} · {formatDateTime(step.at || esc.at)}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Timeline */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Case timeline</h4>
        <ComplaintTimeline status={c.status} timeline={c.timeline} escalation={c.escalation} />
      </div>

      {/* Director/Service Manager notes, a running thread on this specific
          complaint, separate from the one-off note attached when
          returning it. Visible only to staff, not the customer. */}
      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-2">
          <MessageSquare size={15} className="text-gray-400" />
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Notes</h4>
          <span className="text-xs text-gray-400">staff only</span>
        </div>
        <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
          {notes === null ? (
            <p className="text-sm text-gray-400 italic">Loading…</p>
          ) : notes.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No notes yet on this complaint.</p>
          ) : (
            notes.map((n, i) => (
              <div key={i} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2.5 text-sm">
                <div className="text-xs text-gray-500 mb-0.5">{formatDateTime(n.at)} · {n.author}</div>
                <p className="text-gray-800 dark:text-gray-200">{n.text}</p>
              </div>
            ))
          )}
        </div>
        <div className="flex gap-2">
          <input
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') postNote(); }}
            placeholder="Add a note on this complaint…"
            className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-ticano-red"
          />
          <button
            onClick={postNote}
            disabled={postingNote || !noteDraft.trim()}
            className="px-3 py-2 rounded-lg bg-ticano-charcoal text-white text-sm flex items-center gap-1 disabled:opacity-50"
          >
            <Send size={14} />
          </button>
        </div>
      </div>

      {canAct && !alreadyReturned && (
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          <label className="text-xs uppercase tracking-wide text-gray-500 mb-1 block">Note to include when returning (optional)</label>
          <textarea
            value={returnNote}
            onChange={(e) => setReturnNote(e.target.value)}
            rows={2}
            placeholder="e.g. Please follow up with the client directly and confirm resolution by Friday…"
            className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm p-2.5 mb-3 focus:outline-none focus:ring-2 focus:ring-ticano-red resize-none"
          />
          <div className="flex justify-end gap-2">
            <button onClick={handleResolve} disabled={resolving || returning}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-ticano-red text-white text-sm font-semibold hover:bg-ticano-red-dark disabled:opacity-60">
              {resolving ? 'Resolving…' : 'Mark Resolved'}
            </button>
            <button onClick={handleReturn} disabled={returning || resolving || !canReturnToPm}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed">
              <CornerUpLeft size={14} /> {returning ? 'Returning…' : (currentUser?.role === 'director' ? 'Return to Service Manager' : 'Return to PM')}
            </button>
          </div>
        </div>
      )}
      {alreadyReturned && canAct && (
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 text-sm text-gray-500 flex items-center gap-2">
          <CornerUpLeft size={14} className="text-gray-400" />
          This escalation has already been returned. It can't be returned again.
        </div>
      )}
    </Modal>
  );
}

function labelForRole(role) {
  return { portfolio_manager: 'Portfolio Manager', service_manager: 'Service Manager', director: 'Director' }[role] || 'Staff';
}
function labelForLevel(level) {
  return { service_manager: 'Service Manager', director: 'Director' }[level] || 'Management';
}
