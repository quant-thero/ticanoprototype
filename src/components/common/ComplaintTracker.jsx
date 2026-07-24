import React, { useState, useEffect } from 'react';
import { Hash, Users, UserCircle, Calendar } from 'lucide-react';
import { getQueuePosition } from '../../services/supabaseApi';
import { complaintStatusLabel, OPEN_COMPLAINT_STATUSES } from '../../utils/constants';
import { formatDateTime } from '../../utils/format';
import QueueCard from './QueueCard';

/**
 * Customer-facing complaint summary card.
 * Shows ticket number, status, assigned staff, date created, and (for open
 * complaints) a live Queue Card, position, people ahead, total active,
 * priority, last updated. Always dynamically computed on load and on a
 * refresh interval, never a stored/hardcoded number.
 */
export default function ComplaintTracker({ complaint, compact = false }) {
  const [queue, setQueue] = useState(null);
  const [queueError, setQueueError] = useState(null);
  const isOpen = OPEN_COMPLAINT_STATUSES.includes(complaint?.status);

  const loadQueue = () => {
    if (!complaint?.id || !isOpen) return;
    getQueuePosition(complaint.id)
      .then(({ data }) => { setQueue(data); setQueueError(null); })
      .catch((err) => {
        console.error('[ComplaintTracker] getQueuePosition failed:', err);
        setQueueError(err?.message || 'Could not load queue position');
      });
  };

  useEffect(() => {
    loadQueue();
    if (!isOpen) return;
    // Keeps the card genuinely live, other customers' complaints
    // entering/leaving the queue shift this position without the
    // customer needing to manually refresh the page.
    const interval = setInterval(loadQueue, 30000);
    return () => clearInterval(interval);
  }, [complaint?.id, complaint?.status, isOpen]);

  if (!complaint) return null;

  return (
    <div className={`rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-ticano-dark-card ${compact ? 'p-4' : 'p-5'} shadow-sm`}>
      {/* Header: ticket + status */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-ticano-charcoal dark:text-white">
            <Hash size={16} className="text-ticano-red" />
            <span className="font-bold text-lg">{complaint.ticket}</span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{complaint.category} · {complaint.journeyStage?.replace(/_/g, ' ')}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
          isOpen ? 'bg-ticano-red/10 text-ticano-red' :
          complaint.status === 'escalated' ? 'bg-orange-100 text-orange-700' :
          'bg-green-100 text-green-700'
        }`}>
          {complaintStatusLabel(complaint.status)}
        </span>
      </div>

      {/* Body */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Info icon={UserCircle} label="Assigned Staff" value={complaint.assignedPmName || 'Pending assignment'} />
        <Info icon={Calendar} label="Date Created" value={formatDateTime(complaint.createdAt)} />
        <Info icon={Users} label="Branch" value={complaint.branch} />
      </div>

      {/* Queue Card */}
      {isOpen && (
        <div className="mt-4">
          {queueError ? (
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-3 text-xs text-gray-500">
              Queue position isn't available right now.
            </div>
          ) : (
            <QueueCard queue={queue} />
          )}
        </div>
      )}

      {/* Description (only in full mode) */}
      {!compact && complaint.description && (
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-300 border-t border-gray-100 dark:border-gray-700 pt-3">
          {complaint.description}
        </p>
      )}
    </div>
  );
}

function Info({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2">
      <Icon size={15} className="text-gray-400 mt-0.5 shrink-0" />
      <div>
        <p className="text-[11px] uppercase tracking-wide text-gray-400">{label}</p>
        <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{value}</p>
      </div>
    </div>
  );
}
