import React, { useEffect, useState, useMemo } from 'react';
import {
  getComplaints, getMyComplaints, getComplaintById,
  assignComplaint, reassignComplaint, reassignComplaintToNew, updateComplaintStatus,
  addInternalNote, addCustomerNote, updateSentiment,
  escalateComplaint, resolveComplaint, closeComplaint,
  recommendPm, getAuditTrail, escalationTargetForRole,
} from '../../services/api';
import {
  COMPLAINT_STATUSES, complaintStatusLabel, JOURNEY_STAGE_LABEL,
  COMPLAINT_SEVERITY, COMPLAINT_PRIORITY,
  ROOT_CAUSE_GROUPS, SENTIMENT_TAGS,
  formatAnonymousId,
} from '../../utils/constants';
import { Tabs, Badge, Modal, EmptyState, LoadingSpinner } from './UI';
import ComplaintTimeline from './ComplaintTimeline';
import {
  AlertTriangle, ArrowLeft, ArrowUpCircle, Check, CheckCircle2,
  Lock, MessageCircle, Send, Shield, ShieldOff, User, UserCog, History,
} from 'lucide-react';
import toast from 'react-hot-toast';

// Mask identity for anonymous complaints regardless of role (§2).
const displayCustomer = (c) => (c.anonymous ? c.customerName : c.customerName);
const isAnon = (c) => !!c.anonymous;

const SEVERITY_TONE = {
  minor:    'bg-gray-100 text-gray-700',
  moderate: 'bg-yellow-100 text-yellow-800',
  major:    'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
};

const PRIORITY_TONE = {
  low:    'bg-gray-100 text-gray-700',
  medium: 'bg-blue-100 text-blue-800',
  high:   'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
};

export default function ComplaintsModule({
  scope = 'all',            // 'all' (SM/Director) | 'mine' (PM) | 'customer' (client)
  currentUser,
  canAssign = false,
  canEscalate = false,
  canResolve = false,
  canClose = false,
  showInternalNotes = false,
  branchFilter = null,
}) {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterStage, setFilterStage] = useState('all');
  const [selectedId, setSelectedId] = useState(null);
  const [open, setOpen] = useState(null);

  // Modal state
  const [assignModal, setAssignModal] = useState(false);
  const [escalateModal, setEscalateModal] = useState(false);
  const [closeModal, setCloseModal] = useState(false);
  const [auditModal, setAuditModal] = useState(false);

  const load = () => {
    setLoading(true);
    const promise = scope === 'mine'
      ? getComplaints({ assignedPmId: currentUser?.id })
      : scope === 'customer'
        ? getMyComplaints(currentUser?.id)
        : getComplaints({ branch: branchFilter || undefined });
    promise.then(({ data }) => {
      setComplaints(data);
      setLoading(false);
    });
  };

  useEffect(load, [scope, currentUser?.id, branchFilter]);

  useEffect(() => {
    if (!selectedId) { setOpen(null); return; }
    getComplaintById(selectedId).then(({ data }) => setOpen(data));
  }, [selectedId, complaints]);

  const filtered = useMemo(() => {
    let rows = [...complaints];
    if (filterStatus !== 'all') rows = rows.filter((c) => c.status === filterStatus);
    if (filterStage !== 'all') rows = rows.filter((c) => c.journeyStage === filterStage);
    return rows;
  }, [complaints, filterStatus, filterStage]);

  const stats = useMemo(() => ({
    total: complaints.length,
    openCount: complaints.filter((c) => !['resolved', 'closed'].includes(c.status)).length,
    escalated: complaints.filter((c) => c.status === 'escalated').length,
    resolved: complaints.filter((c) => c.status === 'resolved' || c.status === 'closed').length,
  }), [complaints]);

  const handleMarkInProgress = (c) => {
    updateComplaintStatus(c.id, { status: 'in_progress', actor: currentUser?.name || 'PM' }).then(() => {
      toast.success(`${c.ticket} moved to In Progress`);
      load();
    });
  };
  const handleMarkContacted = (c) => {
    updateComplaintStatus(c.id, { status: 'customer_contacted', actor: currentUser?.name || 'PM' }).then(() => {
      toast.success(`${c.ticket} marked Customer Contacted`);
      load();
    });
  };
  const handleMarkPending = (c) => {
    updateComplaintStatus(c.id, { status: 'pending_customer', actor: currentUser?.name || 'PM' }).then(() => {
      toast.success(`${c.ticket} is Pending Customer`);
      load();
    });
  };

  const handleAddInternal = (c, text) => {
    addInternalNote(c.id, { text, author: currentUser?.name || 'Staff' }).then(() => {
      toast.success('Internal note added');
      load();
    });
  };
  const handleAddCustomer = (c, text) => {
    addCustomerNote(c.id, { text, author: currentUser?.name || 'Staff' }).then(() => {
      toast.success('Customer update sent');
      load();
    });
  };

  const handleSentiment = (c, sentiment) => {
    updateSentiment(c.id, sentiment, currentUser?.name || 'Staff').then(() => {
      toast.success(`Sentiment tagged: ${sentiment}`);
      load();
    });
  };

  if (selectedId && open) {
    return (
      <ComplaintDetail
        c={open}
        currentUser={currentUser}
        canAssign={canAssign}
        canEscalate={canEscalate}
        canResolve={canResolve}
        canClose={canClose}
        showInternalNotes={showInternalNotes}
        onBack={() => { setSelectedId(null); setOpen(null); }}
        onAssign={() => setAssignModal(true)}
        onEscalate={() => setEscalateModal(true)}
        onClose={() => setCloseModal(true)}
        onAudit={() => setAuditModal(true)}
        onInProgress={() => handleMarkInProgress(open)}
        onContacted={() => handleMarkContacted(open)}
        onPending={() => handleMarkPending(open)}
        onResolve={() => {
          resolveComplaint(open.id, { author: currentUser?.name || 'Staff' }).then(() => {
            toast.success('Complaint resolved');
            load();
          });
        }}
        onAddInternal={(t) => handleAddInternal(open, t)}
        onAddCustomer={(t) => handleAddCustomer(open, t)}
        onSentiment={(s) => handleSentiment(open, s)}
        AssignModalEl={
          <AssignModalContent
            isOpen={assignModal}
            onClose={() => setAssignModal(false)}
            complaint={open}
            onAssigned={() => { setAssignModal(false); load(); }}
          />
        }
        EscalateModalEl={
          <EscalateModalContent
            isOpen={escalateModal}
            onClose={() => setEscalateModal(false)}
            complaint={open}
            currentUser={currentUser}
            onEscalated={() => { setEscalateModal(false); load(); }}
          />
        }
        CloseModalEl={
          <CloseWithRootCauseModal
            isOpen={closeModal}
            onClose={() => setCloseModal(false)}
            complaint={open}
            currentUser={currentUser}
            onClosed={() => { setCloseModal(false); load(); }}
          />
        }
        AuditModalEl={
          <AuditTrailModal
            isOpen={auditModal}
            onClose={() => setAuditModal(false)}
            complaint={open}
          />
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <StatsBar stats={stats} />

      <div className="flex flex-wrap gap-3 items-center bg-white dark:bg-ticano-dark-card rounded-xl p-3 border border-gray-100 dark:border-gray-700">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
        >
          <option value="all">All statuses</option>
          {COMPLAINT_STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <select
          value={filterStage}
          onChange={(e) => setFilterStage(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
        >
          <option value="all">All journey stages</option>
          {Object.entries(JOURNEY_STAGE_LABEL).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <div className="ml-auto text-sm text-gray-500">{filtered.length} of {complaints.length}</div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : filtered.length === 0 ? (
        <EmptyState title="No complaints" message="No complaints match the current filters." />
      ) : (
        <ComplaintList complaints={filtered} onOpen={setSelectedId} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
//  Stats bar
// ---------------------------------------------------------------------
function StatsBar({ stats }) {
  const cards = [
    { label: 'Total',     value: stats.total,     tone: 'bg-gray-100 text-gray-700' },
    { label: 'Open',      value: stats.openCount, tone: 'bg-blue-100 text-blue-700' },
    { label: 'Escalated', value: stats.escalated, tone: 'bg-orange-100 text-orange-700' },
    { label: 'Resolved',  value: stats.resolved,  tone: 'bg-green-100 text-green-700' },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map((c) => (
        <div key={c.label} className="bg-white dark:bg-ticano-dark-card rounded-xl p-4 border border-gray-100 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{c.label}</div>
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold text-ticano-charcoal dark:text-white">{c.value}</div>
            <span className={`text-xs px-2 py-0.5 rounded ${c.tone}`}>{c.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------
//  Complaint list
// ---------------------------------------------------------------------
function ComplaintList({ complaints, onOpen }) {
  return (
    <div className="bg-white dark:bg-ticano-dark-card rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">Ticket</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Severity</th>
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">PM</th>
              <th className="px-4 py-3 text-right">Open</th>
            </tr>
          </thead>
          <tbody>
            {complaints.map((c) => (
              <tr key={c.id} className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/60 cursor-pointer" onClick={() => onOpen(c.id)}>
                <td className="px-4 py-3 font-semibold text-ticano-red">{c.ticket}</td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-200">
                  <div className="flex items-center gap-2">
                    {isAnon(c) && <Lock size={14} className="text-gray-400" />}
                    <span>{displayCustomer(c)}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{c.category}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-1 rounded ${SEVERITY_TONE[c.severity] || ''}`}>{c.severity}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-1 rounded ${PRIORITY_TONE[c.priority] || ''}`}>{c.priority}</span>
                </td>
                <td className="px-4 py-3"><Badge status={c.status}>{complaintStatusLabel(c.status)}</Badge></td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{c.assignedPmName || <em className="text-gray-400">Unassigned</em>}</td>
                <td className="px-4 py-3 text-right text-ticano-red text-xs">View →</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
//  Complaint detail view (split panel)
// ---------------------------------------------------------------------
function ComplaintDetail({
  c, currentUser, canAssign, canEscalate, canResolve, canClose, showInternalNotes,
  onBack, onAssign, onEscalate, onClose, onAudit,
  onInProgress, onContacted, onPending, onResolve,
  onAddInternal, onAddCustomer, onSentiment,
  AssignModalEl, EscalateModalEl, CloseModalEl, AuditModalEl,
}) {
  const [internal, setInternal] = useState('');
  const [customerMsg, setCustomerMsg] = useState('');

  const terminal = ['resolved', 'closed'].includes(c.status);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 bg-white dark:bg-ticano-dark-card rounded-xl border border-gray-100 dark:border-gray-700 p-5">
        <div>
          <button onClick={onBack} className="text-sm text-ticano-red flex items-center gap-1 mb-2 hover:underline">
            <ArrowLeft size={14} /> All complaints
          </button>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-2xl font-bold text-ticano-charcoal dark:text-white">{c.ticket}</h3>
            <Badge status={c.status}>{complaintStatusLabel(c.status)}</Badge>
            {isAnon(c) && <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded flex items-center gap-1"><Lock size={12} /> Anonymous</span>}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300">{c.category} · {JOURNEY_STAGE_LABEL[c.journeyStage]}</p>
        </div>
        <div className="text-right text-xs space-y-1">
          <div><span className="text-gray-500">Branch:</span> <span className="font-medium">{c.branch}</span></div>
          <div><span className="text-gray-500">Customer:</span> <span className="font-medium">{displayCustomer(c)}</span></div>
          <div><span className="text-gray-500">Created:</span> <span className="font-medium">{new Date(c.createdAt).toLocaleString()}</span></div>
          <button onClick={onAudit} className="text-ticano-red text-xs flex items-center gap-1 ml-auto hover:underline">
            <History size={12} /> Audit trail
          </button>
        </div>
      </div>

      {/* Severity / Priority / Sentiment row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Pill label="Severity" value={c.severity} tone={SEVERITY_TONE[c.severity]} />
        <Pill label="Priority" value={c.priority} tone={PRIORITY_TONE[c.priority]} />
        <Pill label="Sentiment" value={c.sentiment || 'neutral'} tone="bg-purple-100 text-purple-800" />
        <Pill label="Assigned PM" value={c.assignedPmName || 'Unassigned'} tone="bg-blue-50 text-blue-800" />
      </div>

      {/* Sentiment tag selector (internal) */}
      {showInternalNotes && (
        <div className="bg-white dark:bg-ticano-dark-card rounded-xl border border-gray-100 dark:border-gray-700 p-4">
          <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">Sentiment (internal)</div>
          <div className="flex flex-wrap gap-2">
            {SENTIMENT_TAGS.map((s) => (
              <button key={s.key} onClick={() => onSentiment(s.key)}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${c.sentiment === s.key ? 'bg-ticano-red text-white border-ticano-red' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-600 hover:bg-gray-50'}`}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Escalation banner */}
      {c.escalation && (
        <div className="bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-700 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-orange-600 flex-shrink-0 mt-1" size={20} />
            <div className="flex-1">
              <p className="font-semibold text-orange-900 dark:text-orange-200">
                {c.escalation.toLabel ? `Escalated to ${c.escalation.toLabel}` : 'Escalated'}
              </p>
              <p className="text-sm text-orange-800 dark:text-orange-300 mt-1">{c.escalation.reason}</p>
              <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">
                {new Date(c.escalation.at).toLocaleString()} · by {c.escalation.by}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Root cause (visible after close) */}
      {c.rootCause && (
        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-xl p-4">
          <p className="text-xs uppercase tracking-wide text-blue-700 dark:text-blue-300 mb-1">Root cause</p>
          <p className="font-semibold text-blue-900 dark:text-blue-200">{c.rootCause.cause}</p>
          <p className="text-xs text-blue-700 dark:text-blue-300">{c.rootCause.group}</p>
          {c.rootCause.notes && <p className="text-sm text-blue-800 dark:text-blue-200 mt-2">{c.rootCause.notes}</p>}
        </div>
      )}

      {/* Satisfaction survey (if completed) */}
      {c.satisfaction && (
        <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-xl p-4">
          <p className="text-xs uppercase tracking-wide text-green-700 dark:text-green-300 mb-2">Customer satisfaction survey</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div><span className="text-gray-500">Rating</span><div className="font-semibold">{c.satisfaction.rating}/5 ⭐</div></div>
            <div><span className="text-gray-500">Resolved</span><div className="font-semibold">{c.satisfaction.issueResolved ? 'Yes' : 'No'}</div></div>
            <div><span className="text-gray-500">Communication</span><div className="font-semibold">{c.satisfaction.communicationSatisfactory ? 'Good' : 'Poor'}</div></div>
            <div><span className="text-gray-500">PM professional</span><div className="font-semibold">{c.satisfaction.pmProfessional ? 'Yes' : 'No'}</div></div>
          </div>
          {c.satisfaction.comments && <p className="text-sm text-green-800 dark:text-green-200 mt-3 italic">"{c.satisfaction.comments}"</p>}
        </div>
      )}

      {/* Description */}
      <div className="bg-white dark:bg-ticano-dark-card rounded-xl border border-gray-100 dark:border-gray-700 p-5">
        <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Description</p>
        <p className="text-gray-800 dark:text-gray-200 leading-relaxed">{c.description}</p>
      </div>

      {/* Actions */}
      {!terminal && (
        <div className="flex flex-wrap gap-2">
          {canAssign && !c.assignedPmId && (
            <button onClick={onAssign} className="px-4 py-2 rounded-lg bg-ticano-red text-white text-sm hover:bg-ticano-red-dark flex items-center gap-1.5">
              <UserCog size={14} /> Assign PM
            </button>
          )}
          {canAssign && c.assignedPmId && (
            <button onClick={onAssign} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm hover:bg-gray-50 flex items-center gap-1.5">
              <UserCog size={14} /> Reassign
            </button>
          )}
          {c.status === 'assigned' && (
            <button onClick={onInProgress} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm hover:bg-gray-50">
              Start (In Progress)
            </button>
          )}
          {['in_progress', 'assigned'].includes(c.status) && (
            <button onClick={onContacted} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm hover:bg-gray-50">
              Mark Customer Contacted
            </button>
          )}
          {['in_progress', 'customer_contacted'].includes(c.status) && (
            <button onClick={onPending} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm hover:bg-gray-50">
              Awaiting Customer
            </button>
          )}
          {canEscalate && c.status !== 'escalated' && (() => {
            const target = escalationTargetForRole(currentUser?.role);
            return (
              <button onClick={onEscalate} className="px-4 py-2 rounded-lg border border-orange-400 text-orange-700 text-sm hover:bg-orange-50 flex items-center gap-1.5">
                <ArrowUpCircle size={14} /> {target ? `Escalate to ${target.label}` : 'Escalate'}
              </button>
            );
          })()}
          {canResolve && c.status !== 'resolved' && (
            <button onClick={onResolve} className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm hover:bg-green-700 flex items-center gap-1.5">
              <CheckCircle2 size={14} /> Mark Resolved
            </button>
          )}
          {canClose && c.status === 'resolved' && (
            <button onClick={onClose} className="px-4 py-2 rounded-lg bg-ticano-charcoal text-white text-sm hover:bg-black flex items-center gap-1.5">
              <Check size={14} /> Close (with root cause)
            </button>
          )}
        </div>
      )}

      {/* Notes — split between customer-facing & internal */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Customer-facing */}
        <div className="bg-white dark:bg-ticano-dark-card rounded-xl border border-gray-100 dark:border-gray-700 p-5">
          <div className="flex items-center gap-2 mb-3">
            <MessageCircle size={16} className="text-blue-600" />
            <p className="font-semibold text-ticano-charcoal dark:text-white">Customer Updates</p>
            <span className="text-xs text-gray-500">visible to customer</span>
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto mb-3">
            {(c.customerNotes || []).length === 0 ? (
              <p className="text-sm text-gray-400 italic">No customer updates yet.</p>
            ) : (
              (c.customerNotes || []).map((n, i) => (
                <div key={i} className="bg-blue-50 dark:bg-blue-900/30 rounded p-2 text-sm">
                  <div className="text-xs text-gray-500">{new Date(n.at).toLocaleString()} · {n.author}</div>
                  <p className="text-gray-800 dark:text-gray-200">{n.text}</p>
                </div>
              ))
            )}
          </div>
          {!terminal && (
            <div className="flex gap-2">
              <input
                value={customerMsg}
                onChange={(e) => setCustomerMsg(e.target.value)}
                placeholder="Update the customer..."
                className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
              />
              <button
                onClick={() => { if (customerMsg.trim()) { onAddCustomer(customerMsg); setCustomerMsg(''); } }}
                className="px-3 py-2 rounded-lg bg-ticano-red text-white text-sm flex items-center gap-1"
              >
                <Send size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Internal */}
        {showInternalNotes && (
          <div className="bg-white dark:bg-ticano-dark-card rounded-xl border-2 border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Shield size={16} className="text-ticano-charcoal dark:text-gray-300" />
              <p className="font-semibold text-ticano-charcoal dark:text-white">Internal Notes</p>
              <span className="text-xs text-gray-500">staff only</span>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto mb-3">
              {(c.internalNotes || []).length === 0 ? (
                <p className="text-sm text-gray-400 italic">No internal notes yet.</p>
              ) : (
                (c.internalNotes || []).map((n, i) => (
                  <div key={i} className="bg-gray-50 dark:bg-gray-800 rounded p-2 text-sm">
                    <div className="text-xs text-gray-500">{new Date(n.at).toLocaleString()} · {n.author}</div>
                    <p className="text-gray-800 dark:text-gray-200">{n.text}</p>
                  </div>
                ))
              )}
            </div>
            {!terminal && (
              <div className="flex gap-2">
                <input
                  value={internal}
                  onChange={(e) => setInternal(e.target.value)}
                  placeholder="Add an internal note..."
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
                />
                <button
                  onClick={() => { if (internal.trim()) { onAddInternal(internal); setInternal(''); } }}
                  className="px-3 py-2 rounded-lg bg-ticano-charcoal text-white text-sm flex items-center gap-1"
                >
                  <Send size={14} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="bg-white dark:bg-ticano-dark-card rounded-xl border border-gray-100 dark:border-gray-700 p-5">
        <p className="font-semibold text-ticano-charcoal dark:text-white mb-3">Timeline</p>
        <ComplaintTimeline timeline={c.timeline} />
      </div>

      {AssignModalEl}
      {EscalateModalEl}
      {CloseModalEl}
      {AuditModalEl}
    </div>
  );
}

function Pill({ label, value, tone }) {
  return (
    <div className="bg-white dark:bg-ticano-dark-card rounded-xl p-3 border border-gray-100 dark:border-gray-700">
      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</div>
      <span className={`text-sm font-medium px-2 py-1 rounded ${tone || 'bg-gray-100 text-gray-700'}`}>{value}</span>
    </div>
  );
}

// ---------------------------------------------------------------------
//  Modal: Assign / Reassign with smart recommendation (§6)
// ---------------------------------------------------------------------
function AssignModalContent({ isOpen, onClose, complaint, onAssigned }) {
  const [recs, setRecs] = useState([]);
  const [selectedPm, setSelectedPm] = useState(null);

  useEffect(() => {
    if (!isOpen || !complaint) return;
    recommendPm(complaint.id).then(({ data }) => {
      setRecs(data.recommendations || []);
      setSelectedPm(data.top || null);
    });
  }, [isOpen, complaint?.id]);

  const handleAssign = () => {
    if (!selectedPm) return toast.error('Select a PM');
    const fn = complaint.assignedPmId ? reassignComplaint : assignComplaint;
    fn(complaint.id, { pmId: selectedPm.pmId, pmName: selectedPm.pmName }).then(() => {
      toast.success(`Assigned to ${selectedPm.pmName}`);
      onAssigned();
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={complaint.assignedPmId ? 'Reassign Complaint' : 'Assign Complaint'}>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
        Smart recommendation based on workload, branch fit, category strength, and resolution speed.
      </p>
      <div className="space-y-2">
        {recs.map((pm, i) => (
          <label key={pm.pmId}
            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedPm?.pmId === pm.pmId ? 'border-ticano-red bg-ticano-red-light/30' : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}>
            <input
              type="radio"
              name="pm"
              checked={selectedPm?.pmId === pm.pmId}
              onChange={() => setSelectedPm(pm)}
              className="mt-1"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-ticano-charcoal dark:text-white">{pm.pmName}</span>
                {i === 0 && <span className="text-xs bg-ticano-red text-white px-2 py-0.5 rounded-full">Recommended</span>}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {pm.activeComplaints} active · avg {pm.avgResolutionDays}d · ⭐ {pm.satisfaction}
                {pm.branchMatch && <span className="ml-2 text-green-700">✓ branch fit</span>}
                {pm.categoryMatch && <span className="ml-2 text-blue-700">✓ category strength</span>}
              </div>
            </div>
          </label>
        ))}
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-sm">Cancel</button>
        <button onClick={handleAssign} className="px-4 py-2 rounded-lg bg-ticano-red text-white text-sm">Confirm</button>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------
//  Modal: Escalate with reason
// ---------------------------------------------------------------------
function EscalateModalContent({ isOpen, onClose, complaint, currentUser, onEscalated }) {
  const [reason, setReason] = useState('');
  const target = escalationTargetForRole(currentUser?.role);
  const targetLabel = target?.label || 'the next level';
  const handle = () => {
    if (!reason.trim()) return toast.error('Please provide an escalation reason');
    escalateComplaint(complaint.id, { reason, by: currentUser?.name || 'Staff', fromRole: currentUser?.role })
      .then(() => { toast.success(`${complaint.ticket} escalated to ${targetLabel}`); onEscalated(); })
      .catch((e) => toast.error(e.response?.data?.message || 'Could not escalate'));
  };
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Escalate to ${targetLabel}`}>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
        {currentUser?.role === 'service_manager'
          ? 'This routes the case up to the Director. A reason is required and recorded permanently.'
          : 'This routes the case to your branch Service Manager. A reason is required and recorded permanently.'}
      </p>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={4}
        placeholder="Why does this need to be escalated?"
        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
      />
      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-sm">Cancel</button>
        <button onClick={handle} className="px-4 py-2 rounded-lg bg-orange-600 text-white text-sm">Escalate to {targetLabel}</button>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------
//  Modal: Close with mandatory root cause (§5)
// ---------------------------------------------------------------------
function CloseWithRootCauseModal({ isOpen, onClose, complaint, currentUser, onClosed }) {
  const [group, setGroup] = useState('');
  const [cause, setCause] = useState('');
  const [notes, setNotes] = useState('');

  const availableCauses = ROOT_CAUSE_GROUPS.find((g) => g.group === group)?.causes || [];

  const handle = () => {
    if (!group || !cause) return toast.error('Select a root cause group and specific cause');
    closeComplaint(complaint.id, {
      rootCause: { group, cause, notes },
      author: currentUser?.name || 'Staff',
    }).then(() => {
      toast.success(`${complaint.ticket} closed`);
      onClosed();
    }).catch((e) => toast.error(e.response?.data?.message || 'Could not close'));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Close Complaint — Root Cause Required">
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
        Every closed complaint must have a documented root cause. This feeds the analytics dashboards.
      </p>
      <div className="space-y-3">
        <div>
          <label className="text-xs uppercase tracking-wide text-gray-500">Root cause group</label>
          <select
            value={group}
            onChange={(e) => { setGroup(e.target.value); setCause(''); }}
            className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
          >
            <option value="">Select a group…</option>
            {ROOT_CAUSE_GROUPS.map((g) => <option key={g.group} value={g.group}>{g.group}</option>)}
          </select>
        </div>
        {group && (
          <div>
            <label className="text-xs uppercase tracking-wide text-gray-500">Specific cause</label>
            <select
              value={cause}
              onChange={(e) => setCause(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
            >
              <option value="">Select a cause…</option>
              {availableCauses.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className="text-xs uppercase tracking-wide text-gray-500">Resolution notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Brief notes on the root cause and resolution..."
            className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-sm">Cancel</button>
        <button onClick={handle} className="px-4 py-2 rounded-lg bg-ticano-charcoal text-white text-sm">Close Complaint</button>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------
//  Modal: Audit trail (§15)
// ---------------------------------------------------------------------
function AuditTrailModal({ isOpen, onClose, complaint }) {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    if (!isOpen || !complaint) return;
    getAuditTrail({ complaintId: complaint.id }).then(({ data }) => setRows(data));
  }, [isOpen, complaint?.id]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Audit Trail — ${complaint?.ticket}`}>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
        Immutable log of every action taken on this complaint.
      </p>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {rows.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No audit entries.</p>
        ) : rows.map((r) => (
          <div key={r.id} className="bg-gray-50 dark:bg-gray-800 rounded p-3 text-sm border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-start gap-2">
              <div>
                <p className="font-semibold text-ticano-charcoal dark:text-white">{r.action}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {r.previousValue && <span><span className="font-mono">{r.previousValue}</span> → </span>}
                  <span className="font-mono">{r.newValue}</span>
                </p>
              </div>
              <div className="text-right text-xs text-gray-500">
                <p>{r.user}</p>
                <p>{new Date(r.at).toLocaleString()}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
