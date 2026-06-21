import React from 'react';
import { Check, Clock, Circle, AlertTriangle, ShieldAlert } from 'lucide-react';
import { COMPLAINT_STATUSES, complaintStatusLabel } from '../../utils/constants';
import { formatDateTime } from '../../utils/format';

/**
 * Vertical timeline for a complaint case.
 * Renders every event from the complaint.timeline array in order, plus
 * a small status indicator at the head.
 */
export default function ComplaintTimeline({ status, timeline = [], escalation }) {
  const items = [...(timeline || [])].sort((a, b) => new Date(a.at) - new Date(b.at));
  const isEscalated = status === 'escalated' || !!escalation;
  const isResolved = status === 'resolved' || status === 'closed';

  return (
    <div className="pt-1">
      {/* Status pill */}
      <div className="mb-4 flex items-center gap-2">
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
          isResolved ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200' :
          isEscalated ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-200' :
          'bg-ticano-red/10 text-ticano-red dark:bg-ticano-red/20'
        }`}>
          {complaintStatusLabel(status)}
        </span>
        {isEscalated && (
          <span className="flex items-center gap-1 text-xs text-orange-700 dark:text-orange-300">
            <ShieldAlert size={13} /> Escalated to Management
          </span>
        )}
      </div>

      {/* Event timeline */}
      <div>
        {items.map((ev, idx) => {
          const isLast = idx === items.length - 1;
          const isResolvedEv = /resolved/i.test(ev.event);
          const isEscalatedEv = /escalated/i.test(ev.event);
          const Icon = isResolvedEv ? Check : isEscalatedEv ? AlertTriangle : isLast ? Clock : Check;
          const tone =
            isResolvedEv ? 'bg-green-600 border-green-600' :
            isEscalatedEv ? 'bg-orange-500 border-orange-500' :
            isLast ? 'bg-ticano-charcoal border-ticano-charcoal ring-4 ring-ticano-charcoal/15' :
                     'bg-ticano-red border-ticano-red';
          return (
            <div key={idx} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center ${tone}`}>
                  <Icon size={13} className="text-white" />
                </div>
                {!isLast && <div className="w-0.5 flex-1 min-h-[28px] bg-ticano-red" />}
              </div>
              <div className="pb-6">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{ev.event}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {ev.actor ? `${ev.actor} · ` : ''}{formatDateTime(ev.at)}
                </p>
                {isLast && !isResolved && (
                  <p className="text-xs text-ticano-red mt-0.5 font-medium">Current</p>
                )}
              </div>
            </div>
          );
        })}
        {items.length === 0 && (
          <div className="flex gap-3">
            <Circle size={13} className="text-gray-300" />
            <p className="text-sm text-gray-400">No events yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
