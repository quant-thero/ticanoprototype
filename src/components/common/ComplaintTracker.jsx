import React, { useState, useEffect } from 'react';
import { Hash, Users, UserCircle, Calendar, Hourglass } from 'lucide-react';
import { getQueuePosition } from '../../services/api';
import { complaintStatusLabel, OPEN_COMPLAINT_STATUSES } from '../../utils/constants';
import { formatDateTime } from '../../utils/format';

/**
 * Customer-facing complaint summary card.
 * Shows ticket number, status, assigned staff, date created, and (for open
 * complaints) live queue position (§8 + §9).
 */
export default function ComplaintTracker({ complaint, compact = false }) {
  const [queue, setQueue] = useState(null);
  const isOpen = OPEN_COMPLAINT_STATUSES.includes(complaint?.status);

  useEffect(() => {
    if (!complaint?.id || !isOpen) return;
    getQueuePosition(complaint.id).then(({ data }) => setQueue(data)).catch(() => {});
  }, [complaint?.id, complaint?.status, isOpen]);

  if (!complaint) return null;

  const queueLine = (() => {
    if (!isOpen) return null;
    if (!queue) return 'Calculating your queue position…';
    if (queue.position === 1) return 'You are number 1 in the queue. Your complaint is currently being reviewed.';
    if (queue.position > 1) return `You are number ${queue.position} in the queue.`;
    return 'Your complaint is currently being reviewed.';
  })();

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

      {/* Queue indicator */}
      {isOpen && (
        <div className="mt-4 flex items-start gap-2 p-3 rounded-xl bg-ticano-red/5 border border-ticano-red/15">
          <Hourglass size={16} className="text-ticano-red mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="text-ticano-red font-semibold">Queue position</p>
            <p className="text-gray-700 dark:text-gray-300">{queueLine}</p>
            {queue?.totalInQueue !== undefined && (
              <p className="text-xs text-gray-500 mt-0.5">{queue.totalInQueue} complaint{queue.totalInQueue === 1 ? '' : 's'} currently in the queue.</p>
            )}
          </div>
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
