import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, XCircle } from 'lucide-react';

const SLA_DAYS = 14;

export default function SLACountdown({ createdAt, status, compact = false }) {
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    const calc = () => {
      const created = new Date(createdAt);
      const deadline = new Date(created.getTime() + SLA_DAYS * 24 * 60 * 60 * 1000);
      const now = new Date();
      const diff = deadline - now;
      setTimeLeft(diff);
    };
    calc();
    const interval = setInterval(calc, 60000);
    return () => clearInterval(interval);
  }, [createdAt]);

  if (['resolved','closed'].includes(status)) return null;
  if (timeLeft === null) return null;

  const breached = timeLeft <= 0;
  const critical = !breached && timeLeft < 24 * 60 * 60 * 1000;
  const warning = !breached && !critical && timeLeft < 48 * 60 * 60 * 1000;

  const totalMs = SLA_DAYS * 24 * 60 * 60 * 1000;
  const elapsed = totalMs - Math.max(0, timeLeft);
  const pct = Math.min(100, Math.round((elapsed / totalMs) * 100));

  const absDiff = Math.abs(timeLeft);
  const days = Math.floor(absDiff / (24 * 60 * 60 * 1000));
  const hours = Math.floor((absDiff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const mins = Math.floor((absDiff % (60 * 60 * 1000)) / 60000);

  const label = breached
    ? `Breached ${days}d ${hours}h ago`
    : days > 0
      ? `${days}d ${hours}h left`
      : `${hours}h ${mins}m left`;

  const color = breached ? 'text-red-600' : critical ? 'text-red-500' : warning ? 'text-amber-500' : 'text-green-600';
  const barColor = breached ? 'bg-red-500' : critical ? 'bg-red-400' : warning ? 'bg-amber-400' : 'bg-green-500';
  const Icon = breached ? XCircle : critical ? AlertTriangle : Clock;

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1 text-xs font-semibold ${color} ${breached ? 'animate-pulse' : ''}`}>
        <Icon size={11} />
        {label}
      </span>
    );
  }

  return (
    <div className={`p-3 rounded-xl border ${breached ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800' : warning || critical ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800' : 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700'}`}>
      <div className="flex items-center justify-between mb-2">
        <div className={`flex items-center gap-1.5 text-sm font-semibold ${color}`}>
          <Icon size={14} className={breached ? 'animate-pulse' : ''} />
          SLA {breached ? 'BREACHED' : 'Countdown'}
        </div>
        <span className={`text-sm font-bold font-mono ${color}`}>{label}</span>
      </div>
      <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full ${barColor} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-gray-400 mt-1">{pct}% of 14-day SLA used</p>
    </div>
  );
}
