import React from 'react';
import { Modal, Badge } from './UI';
import ComplaintTimeline from './ComplaintTimeline';
import { AlertTriangle, ArrowUpCircle, User, MapPin, UserCog, Clock } from 'lucide-react';
import { complaintStatusLabel, JOURNEY_STAGE_LABEL } from '../../utils/constants';
import { formatDateTime } from '../../utils/format';

/**
 * Shows the full detail of an escalated complaint when an escalation row is
 * clicked (Service Manager + Director dashboards).
 */
export default function EscalationDetailModal({ complaint, onClose }) {
  if (!complaint) return null;
  const c = complaint;
  const esc = c.escalation || {};
  const chain = esc.chain && esc.chain.length ? esc.chain : (esc.reason ? [{ at: esc.at, by: esc.by, fromRole: esc.byRole, toLevel: esc.toLevel, reason: esc.reason }] : []);

  const Row = ({ icon: Icon, label, value }) => (
    <div className="flex items-center gap-2 text-sm">
      <Icon size={14} className="text-gray-400" />
      <span className="text-gray-500 dark:text-gray-400">{label}:</span>
      <span className="font-medium text-gray-800 dark:text-white">{value || '—'}</span>
    </div>
  );

  return (
    <Modal isOpen={!!complaint} onClose={onClose} title={`${c.ticket} — Escalation detail`} size="lg">
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
    </Modal>
  );
}

function labelForRole(role) {
  return { portfolio_manager: 'Portfolio Manager', service_manager: 'Service Manager', director: 'Director' }[role] || 'Staff';
}
function labelForLevel(level) {
  return { service_manager: 'Service Manager', director: 'Director' }[level] || 'Management';
}
