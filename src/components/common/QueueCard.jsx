import React from 'react';
import { Hourglass, Users, AlertCircle, Clock } from 'lucide-react';

const PRIORITY_STYLE = {
  urgent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  low: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
};

const timeAgo = (iso) => {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 10) return 'Just now';
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
};

/**
 * Queue Card, dynamically computed, never hardcoded. queue is the
 * object returned by getQueuePosition(): { position, ahead, totalInQueue,
 * priority, lastUpdated } or null while still loading.
 */
export default function QueueCard({ queue }) {
  if (!queue) {
    return (
      <div className="rounded-2xl border border-ticano-red/15 bg-ticano-red/5 p-4 animate-pulse">
        <div className="h-4 w-40 bg-ticano-red/10 rounded mb-3" />
        <div className="h-8 w-24 bg-ticano-red/10 rounded" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-ticano-red/15 bg-ticano-red/5 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Hourglass size={16} className="text-ticano-red" />
        <p className="text-ticano-red font-semibold text-sm">Queue Position</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-gray-400">Current Position</p>
          <p className="text-2xl font-bold text-ticano-charcoal dark:text-white">#{queue.position ?? '-'}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-gray-400 flex items-center gap-1"><Users size={11} /> People Ahead</p>
          <p className="text-2xl font-bold text-ticano-charcoal dark:text-white">{queue.ahead ?? 0}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-gray-400">Total Active</p>
          <p className="text-2xl font-bold text-ticano-charcoal dark:text-white">{queue.totalInQueue ?? 0}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-gray-400 flex items-center gap-1"><AlertCircle size={11} /> Priority</p>
          {queue.priority ? (
            <span className={`inline-block mt-1 px-2.5 py-1 rounded-full text-xs font-bold capitalize ${PRIORITY_STYLE[queue.priority] || PRIORITY_STYLE.low}`}>{queue.priority}</span>
          ) : <p className="text-sm text-gray-400 mt-1">, </p>}
        </div>
      </div>

      <p className="text-[11px] text-gray-400 mt-3 flex items-center gap-1"><Clock size={10} /> Last updated: {timeAgo(queue.lastUpdated)}</p>
    </div>
  );
}
