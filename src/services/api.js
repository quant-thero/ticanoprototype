// =====================================================================
//  MOCK API LAYER — Ticano (UI-test only, no backend required)
// ---------------------------------------------------------------------
//  This is a complaint-centric mock layer. All previous application
//  tracking and client-transfer endpoints have been removed.
// =====================================================================

import {
  formatTicket,
  OPEN_COMPLAINT_STATUSES,
  BRANCHES,
  complaintStatusLabel,
  AGING_BUCKETS,
  SLA_BREACH_DAYS,
} from '../utils/constants';

const delay = (ms = 350) => new Promise((res) => setTimeout(res, ms));
const ok = async (data, ms) => { await delay(ms); return { data }; };
const clone = (o) => JSON.parse(JSON.stringify(o));

// ---------------------------------------------------------------------
//  DEMO ACCOUNTS — any password works in mock mode
// ---------------------------------------------------------------------
const DEMO_USERS = {
  'client@demo.com':   { userId: 1, name: 'Stacey Nthoi',      role: 'customer',          branch: 'Gaborone',    clientType: 'existing' },
  'pm@demo.com':       { userId: 2, name: 'Mojaboswa',         role: 'portfolio_manager', branch: 'Gaborone' },
  'service@demo.com':  { userId: 3, name: 'Janine Seabenyane', role: 'service_manager',   branch: 'Gaborone' },
  'director@demo.com': { userId: 4, name: 'Opelo Motswagae',   role: 'director',          branch: 'Head Office' },
  'admin@demo.com':    { userId: 5, name: 'Thero Setlhare',    role: 'admin',             branch: 'Head Office' },
  'marketing@demo.com':{ userId: 6, name: 'Katlego',           role: 'marketing',         branch: 'Head Office' },
};

// ---- Auth ----
export const login = async (identifier, _password) => {
  await delay();
  const key = String(identifier).trim().toLowerCase();
  const user = DEMO_USERS[key];
  if (!user) {
    const err = new Error('Invalid credentials');
    err.response = { status: 401, data: { message: 'Unknown account. Try one of the demo logins below.' } };
    throw err;
  }
  return { data: { token: 'mock-jwt-token.' + btoa(key), ...user } };
};

export const registerCustomer = (data) => {
  // §12 — Lead Conversion Automation: if this registrant matches an existing
  // potential client (by phone or email), convert that lead to a customer and
  // remove it from the Potential Clients pipeline. No duplicates created.
  const phone = (data?.whatsappNumber || data?.phone || '').replace(/\s+/g, '');
  const email = (data?.email || '').toLowerCase();
  let convertedLeadId = null;
  if (phone || email) {
    const match = LEADS.find((l) =>
      (phone && (l.phone || '').replace(/\s+/g, '') === phone) ||
      (email && (l.email || '').toLowerCase() === email)
    );
    if (match) {
      convertedLeadId = match.id;
      // Mark converted (moves out of "Potential Clients", into "Active Customers").
      LEADS = LEADS.map((l) => (l.id === match.id ? { ...l, status: 'Converted', convertedAt: new Date().toISOString() } : l));
    }
  }

  // §10 — Referral Network: log the referrer name when supplied.
  if (data?.referrerName && data?.referralSource && /friend|family/i.test(data.referralSource)) {
    logReferral(data.referrerName, data.name);
  }

  return ok({
    token: 'mock-jwt-token.newuser', userId: 99,
    name: data?.name || 'New Customer', role: 'customer',
    branch: data?.preferredBranch || 'Gaborone', clientType: 'new',
    convertedLeadId,
  });
};

// ---- Customer profile ----
//  §13: no Omang. §14: DOB optional with birthday opt-in. §16: location opt-in.
export const getProfile = () => ok({
  id: 1,
  name: 'Stacey Nthoi',
  whatsappNumber: '+26771234567',
  email: 'stacey@example.com',
  preferredBranch: 'Gaborone',
  baseLocation: 'Gaborone',
  birthdayMessagesOptIn: true,
  birthday: '1990-06-21',
  locationSharingOptIn: true,
  assignmentStatus: 'assigned',
  assignedPmName: 'Mojaboswa',
  clientType: 'existing',
  createdAt: '2025-11-02T09:14:00',
});

export const updateProfile = (data) => ok({ message: 'Profile updated', ...data });
export const optOut = () => ok({ message: 'WhatsApp messaging preference updated' });

export const getMyFeedback = () => ok([
  { id: 11, rating: 5, comment: 'Excellent service, very quick!', createdAt: '2026-06-01T10:20:00', branch: 'Gaborone' },
  { id: 12, rating: 4, comment: 'Friendly staff, short wait.',     createdAt: '2026-05-18T14:05:00', branch: 'Gaborone' },
  { id: 13, rating: 2, comment: 'Waited too long at the counter.', createdAt: '2026-04-29T11:40:00', branch: 'Gaborone' },
]);

export const submitRating = (data) => ok({ message: 'Thank you for your feedback!', ...data });

// ---- Feedback (public form) ----
export const getFeedbackForm = (token) => ok({
  token, valid: true, customerName: 'Stacey Nthoi', branch: 'Gaborone',
  serviceType: 'PO Financing enquiry', staffName: 'Mojaboswa',
});
export const submitFeedback = (token, data) => ok({ message: 'Feedback received. Thank you!', token, ...data });

// =====================================================================
//  COMPLAINT TRACKING — core domain (§4, §5, §6, §8, §9, §11, §12)
// =====================================================================

let TICKET_SEQ = 1;
const nextTicket = () => formatTicket(TICKET_SEQ++);

let ANON_SEQ = 1;
const nextAnonId = () => `ANON-${String(ANON_SEQ++).padStart(6, '0')}`;

// Pre-seeded complaint store. Every complaint now carries:
//   severity (minor|moderate|major|critical) + priority (low|medium|high|urgent)
//   sentiment, rootCause, anonymous, internalNotes, customerNotes, satisfaction.
let COMPLAINTS = [
  {
    id: 501, ticket: nextTicket(), // TCN-0001
    customerId: 1, customerName: 'Stacey Nthoi', clientType: 'existing', anonymous: false,
    journeyStage: 'after_disbursement', category: 'Payment issues',
    severity: 'major', priority: 'high', sentiment: 'negative',
    status: 'in_progress',
    description: 'Two duplicate debit orders on the loan account this month.',
    branch: 'Gaborone',
    assignedPmId: 2, assignedPmName: 'Mojaboswa',
    createdAt: '2026-06-11T10:00:00',
    resolvedAt: null, closedAt: null,
    escalation: null,
    rootCause: null,
    timeline: [
      { at: '2026-06-11T10:00:00', event: 'Created',     status: 'created',     actor: 'Stacey Nthoi' },
      { at: '2026-06-11T14:00:00', event: 'Assigned to Mojaboswa', status: 'assigned', actor: 'Service Manager' },
      { at: '2026-06-12T09:30:00', event: 'In Progress', status: 'in_progress', actor: 'Mojaboswa' },
    ],
    internalNotes: [
      { at: '2026-06-12T10:15:00', author: 'Mojaboswa', text: 'Pulled the debit order schedule, contacted accounts.' },
    ],
    customerNotes: [
      { at: '2026-06-11T14:30:00', author: 'Mojaboswa', text: 'We have received your complaint and are investigating the duplicate debit.' },
    ],
    satisfaction: null,
  },
  {
    id: 502, ticket: nextTicket(), // TCN-0002
    customerId: 7, customerName: 'Mpho Kgosi', clientType: 'new', anonymous: false,
    journeyStage: 'before_applying', category: 'Difficulty contacting staff',
    severity: 'moderate', priority: 'medium', sentiment: 'neutral',
    status: 'assigned',
    description: 'Called twice and was unable to reach the PM. No callback.',
    branch: 'Gaborone',
    assignedPmId: 9, assignedPmName: 'Onkarabile Sello',
    createdAt: '2026-06-13T09:00:00',
    resolvedAt: null, closedAt: null,
    escalation: null,
    rootCause: null,
    timeline: [
      { at: '2026-06-13T09:00:00', event: 'Created',  status: 'created',  actor: 'Mpho Kgosi' },
      { at: '2026-06-13T11:00:00', event: 'Assigned to Onkarabile Sello', status: 'assigned', actor: 'Service Manager' },
    ],
    internalNotes: [],
    customerNotes: [],
    satisfaction: null,
  },
  {
    id: 503, ticket: nextTicket(), // TCN-0003
    customerId: 8, customerName: 'Tshepo Molefe', clientType: 'new', anonymous: false,
    journeyStage: 'during_application', category: 'Application delays',
    severity: 'major', priority: 'urgent', sentiment: 'urgent_concern',
    status: 'escalated',
    description: 'PO Financing application has been pending for over two weeks with no update.',
    branch: 'Francistown',
    assignedPmId: 11, assignedPmName: 'Kefilwe Moyo',
    createdAt: '2026-06-08T11:30:00',
    resolvedAt: null, closedAt: null,
    escalation: { at: '2026-06-14T15:00:00', by: 'Kefilwe Moyo', reason: 'Customer rejected proposed timeline; needs management decision.' },
    rootCause: null,
    timeline: [
      { at: '2026-06-08T11:30:00', event: 'Created',           status: 'created',           actor: 'Tshepo Molefe' },
      { at: '2026-06-08T13:00:00', event: 'Assigned to Kefilwe Moyo', status: 'assigned',  actor: 'Service Manager' },
      { at: '2026-06-09T09:00:00', event: 'Customer Contacted', status: 'customer_contacted', actor: 'Kefilwe Moyo' },
      { at: '2026-06-14T15:00:00', event: 'Escalated',         status: 'escalated',         actor: 'Kefilwe Moyo' },
    ],
    internalNotes: [
      { at: '2026-06-09T09:30:00', author: 'Kefilwe Moyo', text: 'Customer wants written ETA. Proposed 5-day timeline.' },
    ],
    customerNotes: [
      { at: '2026-06-09T09:05:00', author: 'Kefilwe Moyo', text: 'I have escalated your case to management. You will hear back within 48 hours.' },
    ],
    satisfaction: null,
  },
  {
    id: 504, ticket: nextTicket(), // TCN-0004 — anonymous, closed, full lifecycle
    customerId: null, customerName: nextAnonId(), clientType: 'existing', anonymous: true,
    journeyStage: 'after_disbursement', category: 'Customer support issues',
    severity: 'minor', priority: 'low', sentiment: 'neutral',
    status: 'closed',
    description: 'Could not reach the call centre for a balance enquiry.',
    branch: 'Gaborone',
    assignedPmId: 2, assignedPmName: 'Mojaboswa',
    createdAt: '2026-05-30T08:00:00',
    resolvedAt: '2026-06-02T16:00:00',
    closedAt:   '2026-06-03T09:00:00',
    escalation: null,
    rootCause: { group: 'Service Issues', cause: 'Delayed response', notes: 'Call queue overflowed during peak hours.' },
    timeline: [
      { at: '2026-05-30T08:00:00', event: 'Created',  status: 'created',  actor: 'Anonymous' },
      { at: '2026-05-30T10:00:00', event: 'Assigned to Mojaboswa', status: 'assigned', actor: 'Service Manager' },
      { at: '2026-06-02T16:00:00', event: 'Resolved', status: 'resolved', actor: 'Mojaboswa' },
      { at: '2026-06-03T09:00:00', event: 'Closed',   status: 'closed',   actor: 'Mojaboswa' },
    ],
    internalNotes: [
      { at: '2026-06-02T15:30:00', author: 'Mojaboswa', text: 'Call queue was overflowed during the holiday — staffing fix proposed.' },
    ],
    customerNotes: [],
    satisfaction: {
      submittedAt: '2026-06-04T11:00:00',
      issueResolved: true,
      communicationSatisfactory: true,
      pmProfessional: true,
      rating: 4,
      comments: 'Took a few days but it was sorted out properly.',
    },
  },
];

let NEXT_COMPLAINT_ID = 600;

// ---------------------------------------------------------------------
// AUDIT LOG (§15) — immutable. Every state change appends here.
// ---------------------------------------------------------------------
let AUDIT_LOG = [
  { id: 1, complaintId: 501, ticket: 'TCN-0001', user: 'Stacey Nthoi',    action: 'Created',      previousValue: null,         newValue: 'created',     at: '2026-06-11T10:00:00' },
  { id: 2, complaintId: 501, ticket: 'TCN-0001', user: 'Service Manager', action: 'Assigned',     previousValue: 'created',    newValue: 'assigned',    at: '2026-06-11T14:00:00' },
  { id: 3, complaintId: 501, ticket: 'TCN-0001', user: 'Mojaboswa',       action: 'Updated',      previousValue: 'assigned',   newValue: 'in_progress', at: '2026-06-12T09:30:00' },
  { id: 4, complaintId: 503, ticket: 'TCN-0003', user: 'Kefilwe Moyo',    action: 'Escalated',    previousValue: 'customer_contacted', newValue: 'escalated', at: '2026-06-14T15:00:00' },
  { id: 5, complaintId: 504, ticket: 'TCN-0004', user: 'Mojaboswa',       action: 'Resolved',     previousValue: 'assigned',   newValue: 'resolved',    at: '2026-06-02T16:00:00' },
  { id: 6, complaintId: 504, ticket: 'TCN-0004', user: 'Mojaboswa',       action: 'Closed',       previousValue: 'resolved',   newValue: 'closed',      at: '2026-06-03T09:00:00' },
];
let NEXT_AUDIT_ID = 100;

const logAudit = (complaint, action, previousValue, newValue, user) => {
  AUDIT_LOG.unshift({
    id: NEXT_AUDIT_ID++,
    complaintId: complaint.id,
    ticket: complaint.ticket,
    user: user || 'system',
    action,
    previousValue,
    newValue,
    at: new Date().toISOString(),
  });
};

// ---- Public read endpoints ----
export const getComplaints = (filters = {}) => {
  let rows = [...COMPLAINTS];
  if (filters.customerId) rows = rows.filter((c) => c.customerId === filters.customerId);
  if (filters.assignedPmId) rows = rows.filter((c) => c.assignedPmId === filters.assignedPmId);
  if (filters.branch) rows = rows.filter((c) => c.branch === filters.branch);
  if (filters.status) rows = rows.filter((c) => c.status === filters.status);
  if (filters.journeyStage) rows = rows.filter((c) => c.journeyStage === filters.journeyStage);
  return ok(clone(rows));
};

export const getMyComplaints = (customerId = 1) =>
  ok(clone(COMPLAINTS.filter((c) => c.customerId === customerId)));

export const getComplaintById = (id) => {
  const c = COMPLAINTS.find((x) => x.id === Number(id) || x.ticket === id);
  return ok(c ? clone(c) : null);
};

// §9 — queue position: how many open complaints sit ahead of this one
export const getQueuePosition = (complaintId) => {
  const openQueue = COMPLAINTS
    .filter((c) => OPEN_COMPLAINT_STATUSES.includes(c.status))
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const idx = openQueue.findIndex((c) => c.id === Number(complaintId));
  const target = COMPLAINTS.find((c) => c.id === Number(complaintId));
  return ok({
    complaintId: Number(complaintId),
    position: idx >= 0 ? idx + 1 : null,
    totalInQueue: openQueue.length,
    status: target?.status || 'unknown',
    ahead: idx > 0 ? openQueue.slice(0, idx).map((c) => c.ticket) : [],
  });
};

// ---- Write endpoints ----
//
// submitComplaint supports anonymous mode (§2): when data.anonymous is true,
// identity fields are replaced with an Anonymous ID and NO name/phone/email
// is persisted. Identity recovery is impossible afterwards.
export const submitComplaint = (data) => {
  const id = NEXT_COMPLAINT_ID++;
  const now = new Date().toISOString();
  const isAnon = !!data.anonymous;
  const anonId = isAnon ? nextAnonId() : null;
  const displayName = isAnon ? anonId : (data.customerName || 'Stacey Nthoi');

  const complaint = {
    id, ticket: nextTicket(),
    customerId: isAnon ? null : (data.customerId || 1),
    customerName: displayName,
    clientType: data.clientType || 'existing',
    anonymous: isAnon,
    journeyStage: data.journeyStage,
    category: data.category,
    severity: data.severity || 'moderate',
    priority: data.priority || 'medium',
    sentiment: data.sentiment || 'neutral',
    status: 'created',
    description: data.description,
    branch: data.branch || 'Gaborone',
    assignedPmId: null,
    assignedPmName: null,
    createdAt: now,
    resolvedAt: null, closedAt: null,
    escalation: null,
    rootCause: null,
    timeline: [
      { at: now, event: 'Created', status: 'created', actor: displayName },
    ],
    internalNotes: [],
    customerNotes: [],
    satisfaction: null,
  };
  COMPLAINTS = [complaint, ...COMPLAINTS];
  logAudit(complaint, 'Created', null, 'created', displayName);
  return ok({ message: 'Complaint submitted', complaint: clone(complaint) });
};

const _applyToComplaint = (complaintId, updater) => {
  let updated = null;
  COMPLAINTS = COMPLAINTS.map((c) => {
    if (c.id !== Number(complaintId)) return c;
    updated = updater(c);
    return updated;
  });
  return updated;
};

export const assignComplaint = (complaintId, data) => {
  const now = new Date().toISOString();
  const before = COMPLAINTS.find((c) => c.id === Number(complaintId));
  const prevStatus = before?.status;
  // §14 — Smart Assignment override: if the manager picked someone other than
  // the recommended PM, a reason is mandatory and stored permanently.
  const isOverride = !!data.overrideReason || (data.recommendedPmId && data.recommendedPmId !== data.pmId);
  if (isOverride && !data.overrideReason) {
    const err = new Error('Override reason required');
    err.response = { status: 400, data: { message: 'A reason is required when overriding the recommended PM.' } };
    throw err;
  }
  const eventLabel = isOverride
    ? `Assigned to ${data.pmName} (override of recommendation)`
    : `Assigned to ${data.pmName}`;
  const c = _applyToComplaint(complaintId, (c) => ({
    ...c,
    assignedPmId: data.pmId,
    assignedPmName: data.pmName,
    status: 'assigned',
    assignment: {
      at: now, by: data.assignedBy || 'Service Manager',
      recommendedPmId: data.recommendedPmId || null,
      recommendedPmName: data.recommendedPmName || null,
      followedRecommendation: !isOverride,
      overrideReason: isOverride ? data.overrideReason : null,
    },
    timeline: [...c.timeline, { at: now, event: eventLabel, status: 'assigned', actor: data.assignedBy || 'Service Manager' }],
    internalNotes: isOverride
      ? [...c.internalNotes, { at: now, author: data.assignedBy || 'Service Manager', text: `Smart-assignment override reason: ${data.overrideReason}` }]
      : c.internalNotes,
  }));
  if (c) logAudit(c, isOverride ? 'Assigned (override)' : 'Assigned', prevStatus, 'assigned', data.assignedBy || 'Service Manager');
  return ok({ message: 'Complaint assigned', complaintId });
};

export const reassignComplaint = (complaintId, data) =>
  assignComplaint(complaintId, { ...data, assignedBy: 'Service Manager (reassign)' });

export const updateComplaintStatus = (complaintId, data) => {
  const now = new Date().toISOString();
  const before = COMPLAINTS.find((c) => c.id === Number(complaintId));
  const prev = before?.status;
  const c = _applyToComplaint(complaintId, (c) => ({
    ...c,
    status: data.status,
    timeline: [...c.timeline, { at: now, event: data.event || complaintStatusLabel(data.status), status: data.status, actor: data.actor || 'Staff' }],
  }));
  if (c) logAudit(c, 'Updated', prev, data.status, data.actor || 'Staff');
  return ok({ message: 'Complaint status updated', complaintId, ...data });
};

// §7 — Internal notes (visible to PM/SM/Admin/Director only).
export const addInternalNote = (complaintId, data) => {
  const now = new Date().toISOString();
  _applyToComplaint(complaintId, (c) => ({
    ...c,
    internalNotes: [...c.internalNotes, { at: now, author: data.author || 'Staff', text: data.text }],
  }));
  return ok({ message: 'Internal note added', complaintId });
};

// §7 — Customer-facing updates (visible to customer + assigned PM + SM).
export const addCustomerNote = (complaintId, data) => {
  const now = new Date().toISOString();
  _applyToComplaint(complaintId, (c) => ({
    ...c,
    customerNotes: [...c.customerNotes, { at: now, author: data.author || 'Staff', text: data.text }],
  }));
  return ok({ message: 'Customer update sent', complaintId });
};

// Backwards-compat shim: older callers used a single addComplaintNote.
// Routes to internal by default.
export const addComplaintNote = (complaintId, data) =>
  data?.audience === 'customer' ? addCustomerNote(complaintId, data) : addInternalNote(complaintId, data);

// Update sentiment tag (internal only).
export const updateSentiment = (complaintId, sentiment, actor) => {
  const now = new Date().toISOString();
  _applyToComplaint(complaintId, (c) => ({
    ...c,
    sentiment,
    timeline: [...c.timeline, { at: now, event: `Sentiment tagged: ${sentiment}`, status: c.status, actor: actor || 'Staff' }],
  }));
  return ok({ message: 'Sentiment tag updated', complaintId, sentiment });
};

// =====================================================================
//  ESCALATION HIERARCHY (§2, §3)
//    Customer Complaint → Portfolio Manager → Service Manager → Director
//  • Portfolio Manager escalates to the branch Service Manager.
//  • Service Manager escalates to the Director.
//  • Customers can NOT escalate directly.
//  Every escalation: audit entry + timeline + notification + reason +
//  timestamp.
// =====================================================================

// Who a complaint escalates TO, based on who is escalating.
export const escalationTargetForRole = (role) => {
  switch (role) {
    case 'portfolio_manager': return { level: 'service_manager', label: 'Service Manager' };
    case 'service_manager':   return { level: 'director',        label: 'Director' };
    default:                  return null; // customers/marketing cannot escalate
  }
};

// In-memory notification feed (consumed by NotificationContext / dashboards).
let ESCALATION_NOTIFICATIONS = [];
export const getEscalationNotifications = (forRole) =>
  ok(ESCALATION_NOTIFICATIONS.filter((n) => !forRole || n.toRole === forRole));

// Escalate to the next level in the hierarchy — reason is mandatory.
export const escalateComplaint = (complaintId, data) => {
  if (!data.reason) {
    const err = new Error('Escalation reason required');
    err.response = { status: 400, data: { message: 'Escalation reason is required' } };
    throw err;
  }
  const fromRole = data.fromRole || 'portfolio_manager';
  const target = escalationTargetForRole(fromRole);
  if (!target) {
    const err = new Error('Not permitted to escalate');
    err.response = { status: 403, data: { message: 'Customers cannot escalate complaints directly.' } };
    throw err;
  }
  const now = new Date().toISOString();
  const before = COMPLAINTS.find((c) => c.id === Number(complaintId));
  const prev = before?.status;
  const eventLabel = `Escalated to ${target.label}`;
  const c = _applyToComplaint(complaintId, (c) => ({
    ...c,
    status: 'escalated',
    escalation: {
      at: now,
      by: data.by || 'Staff',
      byRole: fromRole,
      toLevel: target.level,
      toLabel: target.label,
      reason: data.reason,
      // keep a full chain so multi-step escalations are auditable
      chain: [...((c.escalation && c.escalation.chain) || []), {
        at: now, by: data.by || 'Staff', fromRole, toLevel: target.level, reason: data.reason,
      }],
    },
    timeline: [...c.timeline, { at: now, event: eventLabel, status: 'escalated', actor: data.by || 'Staff' }],
  }));
  if (c) {
    logAudit(c, eventLabel, prev, 'escalated', data.by || 'Staff');
    ESCALATION_NOTIFICATIONS = [{
      id: Date.now(),
      complaintId: c.id, ticket: c.ticket, branch: c.branch,
      fromRole, toRole: target.level, toLabel: target.label,
      message: `${c.ticket} escalated to ${target.label} by ${data.by || 'Staff'}`,
      reason: data.reason, at: now, read: false,
    }, ...ESCALATION_NOTIFICATIONS];
  }
  return ok({ message: `Complaint escalated to ${target.label}`, complaintId, target });
};

// Mark resolved. Customer notes can be appended.
export const resolveComplaint = (complaintId, data) => {
  const now = new Date().toISOString();
  const before = COMPLAINTS.find((c) => c.id === Number(complaintId));
  const prev = before?.status;
  const c = _applyToComplaint(complaintId, (c) => ({
    ...c,
    status: 'resolved',
    resolvedAt: now,
    customerNotes: data.resolutionNotes
      ? [...c.customerNotes, { at: now, author: data.author || 'Staff', text: `Resolution: ${data.resolutionNotes}` }]
      : c.customerNotes,
    timeline: [...c.timeline, { at: now, event: 'Resolved', status: 'resolved', actor: data.author || 'Staff' }],
  }));
  if (c) logAudit(c, 'Resolved', prev, 'resolved', data.author || 'Staff');
  return ok({ message: 'Complaint resolved — customer notified', complaintId });
};

// §5 — Close requires root cause. Triggers post-closure satisfaction survey
// (the customer dashboard surfaces it when status === 'closed' and
// satisfaction === null).
export const closeComplaint = (complaintId, data) => {
  if (!data?.rootCause?.cause) {
    const err = new Error('Root cause required');
    err.response = { status: 400, data: { message: 'A root cause is required to close a complaint.' } };
    throw err;
  }
  const now = new Date().toISOString();
  const before = COMPLAINTS.find((c) => c.id === Number(complaintId));
  const prev = before?.status;
  const c = _applyToComplaint(complaintId, (c) => ({
    ...c,
    status: 'closed',
    closedAt: now,
    resolvedAt: c.resolvedAt || now,
    rootCause: {
      group: data.rootCause.group,
      cause: data.rootCause.cause,
      notes: data.rootCause.notes || '',
    },
    timeline: [...c.timeline, { at: now, event: 'Closed', status: 'closed', actor: data.author || 'Staff' }],
  }));
  if (c) logAudit(c, 'Closed', prev, 'closed', data.author || 'Staff');
  return ok({ message: 'Complaint closed', complaintId });
};

// §4 — Customer satisfaction survey (post-closure).
export const submitSatisfactionSurvey = (complaintId, data) => {
  const now = new Date().toISOString();
  _applyToComplaint(complaintId, (c) => ({
    ...c,
    satisfaction: {
      submittedAt: now,
      issueResolved: !!data.issueResolved,
      communicationSatisfactory: !!data.communicationSatisfactory,
      pmProfessional: !!data.pmProfessional,
      rating: Number(data.rating) || 0,
      comments: data.comments || '',
    },
  }));
  return ok({ message: 'Thank you for your feedback.', complaintId });
};

// =====================================================================
//  ACTIVE CLIENT ANALYTICS (§7) — New vs Existing
// =====================================================================

export const getActiveClientAnalytics = () => ok({
  totals: {
    newClients: 184,
    existingClients: 458,
    totalActive: 642,
  },
  newClientsTrend: [
    { month: 'Jan', count: 22 }, { month: 'Feb', count: 28 },
    { month: 'Mar', count: 31 }, { month: 'Apr', count: 33 },
    { month: 'May', count: 35 }, { month: 'Jun', count: 35 },
  ],
  existingClientsTrend: [
    { month: 'Jan', count: 410 }, { month: 'Feb', count: 422 },
    { month: 'Mar', count: 432 }, { month: 'Apr', count: 442 },
    { month: 'May', count: 451 }, { month: 'Jun', count: 458 },
  ],
  conversionRate: 41.2, // % of new clients converting to existing (i.e. taking a 2nd loan)
  retentionRate: 78.4,  // % of existing clients retained YoY
  byBranch: BRANCHES.map((b, i) => ({
    branch: b,
    newClients: [82, 38, 26, 22, 16][i],
    existingClients: [210, 100, 60, 50, 38][i],
  })),
});

// =====================================================================
//  COMPLAINT ANALYTICS (§18)
// =====================================================================

export const getComplaintAnalytics = () => {
  const byCategory = {};
  const byStage = {};
  const byPm = {};
  const byBranch = {};
  let escalated = 0;
  let resolved = 0;
  let totalResolutionHrs = 0;
  let resolvedCount = 0;
  let newClientComplaints = 0;
  let existingClientComplaints = 0;

  COMPLAINTS.forEach((c) => {
    byCategory[c.category] = (byCategory[c.category] || 0) + 1;
    byStage[c.journeyStage] = (byStage[c.journeyStage] || 0) + 1;
    if (c.assignedPmName) byPm[c.assignedPmName] = (byPm[c.assignedPmName] || 0) + 1;
    byBranch[c.branch] = (byBranch[c.branch] || 0) + 1;
    if (c.status === 'escalated' || c.escalation) escalated++;
    if (c.status === 'resolved' && c.resolvedAt) {
      resolved++;
      totalResolutionHrs += (new Date(c.resolvedAt) - new Date(c.createdAt)) / 3_600_000;
      resolvedCount++;
    }
    if (c.clientType === 'new') newClientComplaints++;
    if (c.clientType === 'existing') existingClientComplaints++;
  });

  return ok({
    total: COMPLAINTS.length,
    open: COMPLAINTS.filter((c) => OPEN_COMPLAINT_STATUSES.includes(c.status)).length,
    resolved,
    escalated,
    escalationRate: COMPLAINTS.length ? +(escalated / COMPLAINTS.length * 100).toFixed(1) : 0,
    avgResolutionHours: resolvedCount ? +(totalResolutionHrs / resolvedCount).toFixed(1) : 0,
    avgSatisfaction: 4.1, // mock CSAT for resolved complaints
    byCategory: Object.entries(byCategory).map(([category, count]) => ({ category, count })),
    byStage: Object.entries(byStage).map(([stage, count]) => ({ stage, count })),
    byPm: Object.entries(byPm).map(([pm, count]) => ({ pm, count })),
    byBranch: Object.entries(byBranch).map(([branch, count]) => ({ branch, count })),
    newClientComplaints,
    existingClientComplaints,
    queueStats: {
      currentlyOpen: COMPLAINTS.filter((c) => OPEN_COMPLAINT_STATUSES.includes(c.status)).length,
      avgWaitHours: 5.4,
      longestWaitHours: 32,
    },
  });
};

// =====================================================================
//  CUSTOMERS & STAFF
// =====================================================================

export const searchCustomers = (query) => ok([
  { id: 1, name: 'Stacey Nthoi',     whatsappNumber: '+26771234567', preferredBranch: 'Gaborone',    clientType: 'existing' },
  { id: 6, name: 'Boitumelo Rantao', whatsappNumber: '+26772345678', preferredBranch: 'Gaborone',    clientType: 'existing' },
  { id: 7, name: 'Mpho Kgosi',       whatsappNumber: '+26773456789', preferredBranch: 'Gaborone',    clientType: 'new' },
  { id: 8, name: 'Tshepo Molefe',    whatsappNumber: '+26774567890', preferredBranch: 'Francistown', clientType: 'new' },
].filter((c) => !query || c.name.toLowerCase().includes(String(query).toLowerCase())));

export const getUnassignedCustomers = () => ok([
  { id: 6, name: 'Boitumelo Rantao', whatsappNumber: '+26772345678', preferredBranch: 'Gaborone', clientType: 'existing', createdAt: '2026-06-12T09:00:00' },
  { id: 7, name: 'Mpho Kgosi',       whatsappNumber: '+26773456789', preferredBranch: 'Gaborone', clientType: 'new',      createdAt: '2026-06-13T15:30:00' },
  { id: 8, name: 'Tshepo Molefe',    whatsappNumber: '+26774567890', preferredBranch: 'Gaborone', clientType: 'new',      createdAt: '2026-06-14T11:10:00' },
]);

export const assignCustomer = (data) => ok({ message: 'Customer assigned successfully', ...data });
export const autoAssignCustomers = () => ok({ message: '3 customers assigned', count: 3 });

export const getPmWorkload = () => ok([
  { pmId: 2,  pmName: 'Mojaboswa',        assignedCustomers: 14, openComplaints: 3 },
  { pmId: 9,  pmName: 'Onkarabile Sello', assignedCustomers: 11, openComplaints: 5 },
  { pmId: 10, pmName: 'Gaone Tau',        assignedCustomers: 9,  openComplaints: 2 },
]);

export const getStaffPerformance = () => ok([
  { staffId: 2,  name: 'Mojaboswa',        avgRating: 4.5, totalInteractions: 120, feedbackCount: 88, resolvedComplaints: 22, openComplaints: 3 },
  { staffId: 9,  name: 'Onkarabile Sello', avgRating: 4.1, totalInteractions: 104, feedbackCount: 72, resolvedComplaints: 14, openComplaints: 5 },
  { staffId: 10, name: 'Gaone Tau',        avgRating: 3.8, totalInteractions: 88,  feedbackCount: 61, resolvedComplaints: 11, openComplaints: 4 },
]);

// =====================================================================
//  GENERAL ANALYTICS (branch / director / marketing) — complaint-centric
// =====================================================================

export const getBranchAnalytics = (branch) => ok({
  branch: branch || 'Gaborone',
  avgRatingThisWeek: 4.2,
  totalFeedbackThisMonth: 168,
  openComplaints: 7,
  resolvedThisMonth: 26,
  todayInteractions: 23,
  ratingTrend: [
    { week: 'W1', avgRating: 3.9, count: 40 }, { week: 'W2', avgRating: 4.1, count: 44 },
    { week: 'W3', avgRating: 4.0, count: 39 }, { week: 'W4', avgRating: 4.2, count: 45 },
  ],
  busiestDays: [
    { day: 'Mon', count: 38 }, { day: 'Tue', count: 31 }, { day: 'Wed', count: 29 },
    { day: 'Thu', count: 42 }, { day: 'Fri', count: 51 }, { day: 'Sat', count: 22 },
  ],
  serviceTypeDistribution: [
    { type: 'PO Financing', count: 60 },
    { type: 'Invoice Financing', count: 38 },
    { type: 'Business Loan', count: 27 },
    { type: 'General Enquiry', count: 18 },
  ],
});

export const getBranchComparison = () => ok(
  BRANCHES.map((b, i) => ({
    branch: b,
    avgRating: [4.2, 3.9, 4.4, 4.0, 3.7][i],
    totalInteractions: [168, 142, 96, 88, 74][i],
    openComplaints: [7, 11, 3, 6, 9][i],
    resolvedComplaints: [26, 18, 14, 9, 7][i],
    escalationRate: [4.5, 8.1, 2.2, 6.0, 9.5][i],
  }))
);

export const getReferralSources = () => ok({
  sources: [
    { source: 'Friend or Family Referral', count: 142 },
    { source: 'Facebook', count: 98 },
    { source: 'Google Search', count: 64 },
    { source: 'Walk-in', count: 71 },
    { source: 'CEDA Referral', count: 38 },
    { source: 'Existing Customer Referral', count: 54 },
    { source: 'Other: TikTok influencer', count: 12 },
    { source: 'Other: Church bulletin',   count: 6 },
  ],
  otherDetails: [
    { text: 'TikTok influencer', count: 12 },
    { text: 'Church bulletin',   count: 6 },
  ],
});

export const getLocationAnalytics = () => ok({
  locations: [
    { location: 'Gaborone',     count: 210 },
    { location: 'Mogoditshane', count: 88 },
    { location: 'Francistown',  count: 76 },
    { location: 'Maun',         count: 51 },
    { location: 'Tlokweng',     count: 44 },
    { location: 'Palapye',      count: 39 },
  ],
});

export const getCsatTrend = () => ok({
  trend: [
    { week: 'W1', avgRating: 3.8, count: 120 }, { week: 'W2', avgRating: 3.9, count: 134 },
    { week: 'W3', avgRating: 4.0, count: 128 }, { week: 'W4', avgRating: 4.1, count: 141 },
    { week: 'W5', avgRating: 4.0, count: 137 }, { week: 'W6', avgRating: 4.3, count: 149 },
  ],
});

export const getWordCloud = () => ok({
  words: [
    { word: 'friendly', count: 48 }, { word: 'fast', count: 41 }, { word: 'helpful', count: 39 },
    { word: 'waiting', count: 28 }, { word: 'professional', count: 25 }, { word: 'queue', count: 22 },
    { word: 'efficient', count: 20 }, { word: 'rude', count: 9 }, { word: 'patient', count: 18 },
    { word: 'slow', count: 14 }, { word: 'clean', count: 16 }, { word: 'knowledgeable', count: 13 },
    { word: 'welcoming', count: 12 }, { word: 'confusing', count: 8 }, { word: 'excellent', count: 30 },
  ],
});

export const getBranchDetail = (branch) => ok({
  branch,
  overview: {
    avgRating: 4.2, totalFeedback: 168, totalCustomers: 210,
    totalInteractions: 540, openComplaints: 12, resolvedComplaints: 64,
    escalationRate: 4.5,
  },
  portfolioManagers: [
    { pmId: 2,  pmName: 'Mojaboswa',        avgRating: 4.5, totalComplaints: 22, openComplaints: 3, resolvedComplaints: 19, resolutionRate: 86.4 },
    { pmId: 9,  pmName: 'Onkarabile Sello', avgRating: 4.1, totalComplaints: 18, openComplaints: 5, resolvedComplaints: 13, resolutionRate: 72.2 },
    { pmId: 10, pmName: 'Gaone Tau',        avgRating: 3.8, totalComplaints: 12, openComplaints: 4, resolvedComplaints: 8,  resolutionRate: 66.7 },
  ],
  ratingTrend: [
    { week: 'W1', avgRating: 3.9 }, { week: 'W2', avgRating: 4.1 },
    { week: 'W3', avgRating: 4.0 }, { week: 'W4', avgRating: 4.2 },
  ],
  serviceTypes: [
    { type: 'PO Financing', count: 60 }, { type: 'Invoice Financing', count: 38 },
    { type: 'Business Loan', count: 18 }, { type: 'General Enquiry', count: 27 },
  ],
  customerLocations: [
    { location: 'Gaborone', count: 120 }, { location: 'Mogoditshane', count: 48 },
    { location: 'Tlokweng', count: 26 }, { location: 'Other', count: 16 },
  ],
});

// =====================================================================
//  MARKETING
// =====================================================================

export const getMarketingSummary = () => ok({
  totalCustomers: 642,
  newThisWeek: 18,
  newThisMonth: 73,
  referralConversionRate: 64.2,
  acquisitionTrend: [
    { month: 'Jan', customers: 41 }, { month: 'Feb', customers: 52 },
    { month: 'Mar', customers: 48 }, { month: 'Apr', customers: 61 },
    { month: 'May', customers: 70 }, { month: 'Jun', customers: 73 },
  ],
  branchAcquisition: BRANCHES.map((b, i) => ({ branch: b, customers: [210, 142, 96, 88, 74][i] })),
});

export const getReferralTrends = () => ok({
  trend: [
    { month: 'Mar', 'Friend or Family': 30, 'Facebook': 22, 'Google': 12, 'Walk-in': 18 },
    { month: 'Apr', 'Friend or Family': 36, 'Facebook': 28, 'Google': 14, 'Walk-in': 20 },
    { month: 'May', 'Friend or Family': 42, 'Facebook': 33, 'Google': 16, 'Walk-in': 22 },
    { month: 'Jun', 'Friend or Family': 38, 'Facebook': 41, 'Google': 11, 'Walk-in': 24 },
  ],
  byBranch: BRANCHES.map((b, i) => ({
    branch: b,
    'Friend or Family': [60, 40, 28, 22, 18][i],
    'Facebook':         [55, 30, 20, 12, 9][i],
    'Walk-in':          [40, 25, 15, 18, 12][i],
  })),
});

export const getDemographics = () => ok({
  byAgeGroup: [
    { group: '18–24', count: 88 }, { group: '25–34', count: 214 },
    { group: '35–44', count: 168 }, { group: '45–54', count: 96 },
    { group: '55–64', count: 51 }, { group: '65+', count: 25 },
  ],
  birthdaysThisMonth: 37,
  birthdaysThisWeek: 9,
});

export const getReferralNetwork = () => ok({
  topReferrers: [
    { customerName: 'Refilwe Sento',    referrals: 8, converted: 5 },
    { customerName: 'Boitumelo Rantao', referrals: 6, converted: 4 },
    { customerName: 'Stacey Nthoi',     referrals: 4, converted: 2 },
  ],
  totalReferralCustomers: 124,
  conversionFromReferrals: 58.0,
});

// =====================================================================
//  ADMIN
// =====================================================================

let USERS = [
  { id: 2,  name: 'Mojaboswa',         email: 'pm@demo.com',        role: 'portfolio_manager', branch: 'Gaborone',    isActive: true,  createdAt: '2025-09-01T08:00:00' },
  { id: 3,  name: 'Janine Seabenyane', email: 'service@demo.com',   role: 'service_manager',   branch: 'Gaborone',    isActive: true,  createdAt: '2025-08-15T08:00:00' },
  { id: 4,  name: 'Opelo Motswagae',   email: 'director@demo.com',  role: 'director',          branch: 'Head Office', isActive: true,  createdAt: '2025-07-20T08:00:00' },
  { id: 9,  name: 'Onkarabile Sello',  email: 'osello@ticano.bw',   role: 'portfolio_manager', branch: 'Gaborone',    isActive: true,  createdAt: '2025-10-05T08:00:00' },
  { id: 12, name: 'Tebogo Nkosi',      email: 'tnkosi@ticano.bw',   role: 'portfolio_manager', branch: 'Maun',        isActive: false, createdAt: '2025-11-11T08:00:00' },
];
let NEXT_USER_ID = 100;

// Per-user activity log (§5 — View Activity / View Audit History).
let USER_ACTIVITY = {
  2:  [{ at: '2026-06-14T16:30:00', action: 'Resolved complaint TCN-0004' }, { at: '2026-06-12T09:30:00', action: 'Updated TCN-0001 to In Progress' }],
  3:  [{ at: '2026-06-14T09:30:00', action: 'Assigned TCN-0002 to Onkarabile Sello' }],
  9:  [{ at: '2026-06-13T11:00:00', action: 'Picked up TCN-0002' }],
};
const logUserActivity = (userId, action) => {
  USER_ACTIVITY[userId] = [{ at: new Date().toISOString(), action }, ...(USER_ACTIVITY[userId] || [])];
};

export const getUsers = (filters = {}) => {
  let rows = [...USERS];
  if (filters.role)   rows = rows.filter((u) => u.role === filters.role);
  if (filters.branch) rows = rows.filter((u) => u.branch === filters.branch);
  if (filters.status === 'active')   rows = rows.filter((u) => u.isActive);
  if (filters.status === 'disabled') rows = rows.filter((u) => !u.isActive);
  return ok(rows);
};

export const createUser = (data) => {
  const user = { id: NEXT_USER_ID++, isActive: true, createdAt: new Date().toISOString(), ...data };
  USERS = [user, ...USERS];
  logUserActivity(user.id, 'Account created');
  return ok({ message: 'User created', user });
};

export const updateUser = (id, data) => {
  USERS = USERS.map((u) => (u.id === Number(id) ? { ...u, ...data } : u));
  logUserActivity(Number(id), `Profile updated (${Object.keys(data).join(', ')})`);
  return ok({ message: 'User updated', user: USERS.find((u) => u.id === Number(id)) });
};

// §5 — Enable / Disable account.
export const setUserActive = (id, isActive) => {
  USERS = USERS.map((u) => (u.id === Number(id) ? { ...u, isActive } : u));
  logUserActivity(Number(id), isActive ? 'Account enabled' : 'Account disabled');
  return ok({ message: isActive ? 'User enabled' : 'User disabled', id, isActive });
};
export const deleteUser = (id) => setUserActive(id, false);

// §5 — Change role.
export const changeUserRole = (id, role) => {
  USERS = USERS.map((u) => (u.id === Number(id) ? { ...u, role } : u));
  logUserActivity(Number(id), `Role changed to ${role}`);
  return ok({ message: 'Role updated', id, role });
};

// §5 — Change branch.
export const changeUserBranch = (id, branch) => {
  USERS = USERS.map((u) => (u.id === Number(id) ? { ...u, branch } : u));
  logUserActivity(Number(id), `Branch changed to ${branch}`);
  return ok({ message: 'Branch updated', id, branch });
};

// §5 — View activity / audit history for a single employee.
export const getUserActivity = (id) => {
  const user = USERS.find((u) => u.id === Number(id));
  const complaintActivity = AUDIT_LOG.filter((a) => a.user === user?.name);
  return ok({
    activity: USER_ACTIVITY[Number(id)] || [],
    complaintAudit: complaintActivity,
  });
};

// =====================================================================
//  PASSWORD RESET (§6)
// =====================================================================
// Customers may self-reset via email verification.
export const requestCustomerPasswordReset = (email) => {
  if (!email) {
    const err = new Error('Email required');
    err.response = { status: 400, data: { message: 'Please enter the email on your account.' } };
    throw err;
  }
  return ok({
    message: `If an account exists for ${email}, a password-reset link has been emailed.`,
    method: 'email_verification',
    email,
  });
};

// Employees cannot self-reset. Admin resets and the system issues a temporary
// password (e.g. TCN-Temp-4582) that must be changed on next login.
let TEMP_PW_SEQ = 4582;
export const adminResetEmployeePassword = (id) => {
  const user = USERS.find((u) => u.id === Number(id));
  if (!user) return ok({ message: 'User not found' });
  const tempPassword = `TCN-Temp-${TEMP_PW_SEQ++}`;
  USERS = USERS.map((u) => (u.id === Number(id) ? { ...u, mustChangePassword: true } : u));
  logUserActivity(Number(id), 'Password reset by admin (temporary password issued)');
  return ok({
    message: `Temporary password generated for ${user.name}. They must change it on next login.`,
    tempPassword,
    mustChangePassword: true,
    id,
  });
};

export const getAuditLogs = () => ok([
  { id: 1, userId: 5, action: 'CREATE_USER',        details: 'Created user osello@ticano.bw',                         createdAt: '2026-06-14T10:11:00' },
  { id: 2, userId: 3, action: 'ASSIGN_COMPLAINT',   details: 'Complaint TCN-0002 assigned to Onkarabile Sello',       createdAt: '2026-06-14T09:30:00' },
  { id: 3, userId: 2, action: 'RESOLVE_COMPLAINT',  details: 'Complaint TCN-0004 resolved',                            createdAt: '2026-06-13T16:30:00' },
  { id: 4, userId: 5, action: 'UPDATE_CONFIG',      details: 'birthday_message_time = 08:00',                          createdAt: '2026-06-12T14:02:00' },
  { id: 5, userId: 2, action: 'ESCALATE_COMPLAINT', details: 'Complaint TCN-0003 escalated to Management',             createdAt: '2026-06-14T15:00:00' },
]);

export const getSystemHealth = () => ok({
  status: 'UP', timestamp: new Date().toISOString(),
  totalUsers: 13, totalCustomers: 642, database: 'CONNECTED',
});

// Mutable branch directory — each branch carries its full address, manager,
// phone, hours. Admin can edit any field via updateBranch().
let BRANCH_DIRECTORY = BRANCHES.map((b, i) => ({
  id: i + 1,
  name: b,
  isActive: true,
  address: {
    Gaborone:    'Plot 50369, Fairgrounds Office Park, Block A',
    Francistown: 'Blue Jacket Street, CBD',
    Maun:        'Mathiba I Road, near the airport',
    Palapye:     'Mall Road, opposite Choppies',
    Phikwe:      'Selebi-Phikwe Main Mall',
  }[b] || '',
  city: b,
  country: 'Botswana',
  phone: {
    Gaborone:    '+267 391 1234',
    Francistown: '+267 241 1234',
    Maun:        '+267 686 1234',
    Palapye:     '+267 492 1234',
    Phikwe:      '+267 261 1234',
  }[b] || '',
  email: `${b.toLowerCase()}@ticano.co.bw`,
  manager: {
    Gaborone: 'Janine Seabenyane', Francistown: 'Tebogo Sehemo',
    Maun: 'Lebogang Pule', Palapye: 'Tshepo Kgang', Phikwe: 'Boitumelo Modise',
  }[b] || '',
  openHours: 'Mon–Fri 08:00–17:00',
  notes: '',
}));

export const getBranches = () => ok([...BRANCH_DIRECTORY]);

// §4 — Admin can create a new branch.
let NEXT_BRANCH_ID = 100;
export const createBranch = (data) => {
  const branch = {
    id: NEXT_BRANCH_ID++,
    name: data.name,
    code: data.code || '',
    region: data.region || '',
    address: data.address || '',
    city: data.city || data.name,
    country: 'Botswana',
    phone: data.phone || '',
    email: data.email || '',
    manager: data.manager || '',
    isActive: data.status !== 'inactive',
    openHours: data.openHours || 'Mon–Fri 08:00–17:00',
    notes: data.notes || '',
  };
  BRANCH_DIRECTORY = [...BRANCH_DIRECTORY, branch];
  return ok({ message: 'Branch created', branch });
};

export const updateBranch = (id, data) => {
  BRANCH_DIRECTORY = BRANCH_DIRECTORY.map((b) => (b.id === Number(id) ? { ...b, ...data } : b));
  return ok({ message: 'Branch updated', branch: BRANCH_DIRECTORY.find((b) => b.id === Number(id)) });
};

export const getSystemConfig = () => ok([
  { id: 1, configKey: 'survey_delay_minutes',  configValue: '30',   description: 'Delay before survey link is sent' },
  { id: 2, configKey: 'low_rating_threshold',  configValue: '2',    description: 'Ratings at or below this trigger a follow-up' },
  { id: 3, configKey: 'birthday_message_time', configValue: '08:00', description: 'Daily birthday send time (CAT)' },
]);

export const updateSystemConfig = (data) => ok({ message: 'Config updated', ...data });
export const triggerBackup = () => ok({ message: 'Database backup started', backupId: 'bkp-' + Date.now() });

// =====================================================================
//  EXPORT
// =====================================================================

export const exportData = async (type, format) => {
  await delay();
  const blob = new Blob([`Mock ${format} export for ${type}\n`], { type: 'text/plain' });
  return { data: blob };
};

// =====================================================================
//  LEADS  (potential clients — kept; useful for marketing)
// =====================================================================

let LEADS = [
  { id: 1001, name: 'Kabo Otsile',     phone: '+26771000001', branch: 'Gaborone',    referralSource: 'Walk-in',                    product: 'Business Loan',     status: 'New',         addedBy: 'Mojaboswa',     addedAt: '2026-06-14T10:00:00', notes: 'Walked in asking about SME loans' },
  { id: 1002, name: 'Neo Bareki',      phone: '+26771000002', branch: 'Gaborone',    referralSource: 'Facebook',                   product: 'Vehicle Finance',   status: 'Contacted',   addedBy: 'Mojaboswa',     addedAt: '2026-06-13T13:20:00', notes: 'Responded to Facebook campaign' },
  { id: 1003, name: 'Tumelo Phiri',    phone: '+26771000003', branch: 'Francistown', referralSource: 'Friend or Family Referral',  product: 'Asset Finance',     status: 'Interested',  addedBy: 'Kefilwe Moyo',  addedAt: '2026-06-11T09:45:00', notes: 'Referred by existing customer' },
  { id: 1005, name: 'Refilwe Sento',   phone: '+26771000005', branch: 'Gaborone',    referralSource: 'Existing Customer Referral', product: 'PO Financing',      status: 'Converted',   addedBy: 'Mojaboswa',     addedAt: '2026-05-28T11:00:00', notes: 'Now a registered customer' },
  { id: 1006, name: 'Mompati Selepe',  phone: '+26771000006', branch: 'Palapye',     referralSource: 'Radio / Newspaper',          product: 'General Enquiry',   status: 'Lost',        addedBy: 'Tshepo Kgang',  addedAt: '2026-05-22T14:10:00', notes: 'Chose another provider' },
];

export const getLeads = () => ok([...LEADS]);
export const createLead = (data) => {
  const lead = { id: Date.now(), status: 'New', addedAt: new Date().toISOString(), ...data };
  LEADS = [lead, ...LEADS];
  return ok({ message: 'Potential client created', lead });
};
export const updateLeadStatus = (id, status) => {
  LEADS = LEADS.map((l) => (l.id === id ? { ...l, status } : l));
  return ok({ message: 'Lead status updated', id, status });
};
export const convertLead = (id) => {
  LEADS = LEADS.map((l) => (l.id === id ? { ...l, status: 'Converted' } : l));
  return ok({ message: 'Lead converted to customer', id });
};

export const getLeadFunnel = () => ok({
  funnel: [
    { stage: 'New', count: 320 },
    { stage: 'Contacted', count: 224 },
    { stage: 'Interested', count: 142 },
    { stage: 'Converted', count: 71 },
  ],
  byBranch: BRANCHES.map((b, i) => ({
    branch: b,
    leads: [150, 90, 48, 40, 30][i],
    converted: [65, 32, 18, 14, 9][i],
    conversionRate: [43.3, 35.6, 37.5, 35.0, 30.0][i],
  })),
  byPm: [
    { pm: 'Mojaboswa',        created: 120, converted: 48, rate: 40.0 },
    { pm: 'Onkarabile Sello', created: 64,  converted: 22, rate: 34.4 },
    { pm: 'Kefilwe Moyo',     created: 76,  converted: 28, rate: 36.8 },
  ],
});

// =====================================================================
//  WHATSAPP REVIEW LINKS
// =====================================================================

export const sendReviewLink = (data) => ok({ message: 'Review link sent via WhatsApp', sentAt: new Date().toISOString(), ...data });
export const getReviewRequests = () => ok([
  { id: 1, recipient: 'Mpho Kgosi',   phone: '+26773456789', type: 'customer', sentBy: 'Mojaboswa', sentAt: '2026-06-14T10:00:00', completed: true },
  { id: 2, recipient: 'Kabo Otsile',  phone: '+26771000001', type: 'lead',     sentBy: 'Mojaboswa', sentAt: '2026-06-14T11:30:00', completed: false },
]);

// =====================================================================
//  AUDIT LOG QUERY (§15)
// =====================================================================
export const getAuditTrail = (filters = {}) => {
  let rows = [...AUDIT_LOG];
  if (filters.complaintId) rows = rows.filter((r) => r.complaintId === Number(filters.complaintId));
  if (filters.user) rows = rows.filter((r) => r.user.toLowerCase().includes(String(filters.user).toLowerCase()));
  if (filters.action) rows = rows.filter((r) => r.action === filters.action);
  return ok(rows);
};

// =====================================================================
//  IMPROVEMENT FEEDBACK MODULE (§3)
//  Separate from complaints — suggestions / process improvements.
// =====================================================================
let IMPROVEMENT_FEEDBACK = [
  { id: 1, category: 'Staff Service',       text: 'Front-desk staff at Gaborone were friendly but slow during peak hours. A second cashier window would help.', author: 'Stacey Nthoi',   branch: 'Gaborone',    at: '2026-06-10T11:00:00' },
  { id: 2, category: 'Communication',       text: 'Could status updates also come via SMS not just WhatsApp? My data is sometimes off.',                            author: 'Anonymous',       branch: 'Francistown', at: '2026-06-12T14:20:00' },
  { id: 3, category: 'Process Improvement', text: 'The supplier verification step took longer than the loan approval itself. Could it run in parallel?',           author: 'Boitumelo Rantao', branch: 'Gaborone',   at: '2026-06-13T09:15:00' },
  { id: 4, category: 'System Issues',       text: 'The portal logged me out twice while uploading documents. Please add auto-save.',                                 author: 'Anonymous',       branch: 'Maun',        at: '2026-06-14T16:30:00' },
  { id: 5, category: 'Branch Experience',   text: 'Phikwe branch needs better signage — I struggled to find the right counter.',                                    author: 'Tshepo Phiri',    branch: 'Phikwe',      at: '2026-06-15T10:00:00' },
];
let NEXT_FEEDBACK_ID = 100;

export const submitImprovementFeedback = (data) => {
  const item = {
    id: NEXT_FEEDBACK_ID++,
    category: data.category,
    text: data.text,
    author: data.anonymous ? 'Anonymous' : (data.author || 'Customer'),
    branch: data.branch || null,
    at: new Date().toISOString(),
  };
  IMPROVEMENT_FEEDBACK = [item, ...IMPROVEMENT_FEEDBACK];
  return ok({ message: 'Thank you — your suggestion has been logged.', feedback: item });
};

export const getImprovementFeedback = (filters = {}) => {
  let rows = [...IMPROVEMENT_FEEDBACK];
  if (filters.branch)   rows = rows.filter((r) => r.branch === filters.branch);
  if (filters.category) rows = rows.filter((r) => r.category === filters.category);
  return ok(rows);
};

export const getImprovementFeedbackSummary = () => {
  const byCategory = {};
  IMPROVEMENT_FEEDBACK.forEach((f) => {
    byCategory[f.category] = (byCategory[f.category] || 0) + 1;
  });
  return ok({
    total: IMPROVEMENT_FEEDBACK.length,
    byCategory: Object.entries(byCategory).map(([category, count]) => ({ category, count })),
    recent: IMPROVEMENT_FEEDBACK.slice(0, 5),
  });
};

// =====================================================================
//  KNOWLEDGE BASE (§8)
// =====================================================================
let KB_ARTICLES = [
  { id: 1, category: 'Payment Issues',       title: 'Duplicate debit order — how to refund',           body: 'Step 1: Pull the debit schedule from accounts.\nStep 2: Verify duplication with bank statement.\nStep 3: Submit refund request via Form FN-12.\nStep 4: Customer is credited within 3 business days.', author: 'Admin', updatedAt: '2026-06-01T10:00:00', archived: false },
  { id: 2, category: 'Documentation Issues', title: 'Missing PO document — recovery workflow',         body: 'Ask customer for supplier name + quotation reference. Cross-check supplier portal. If still missing, request re-issue via supplier portal.', author: 'Admin', updatedAt: '2026-05-20T10:00:00', archived: false },
  { id: 3, category: 'Service Complaints',   title: 'Long callback wait — standard response',          body: 'Apologize, log the missed contact in Salesforce, schedule a same-day callback window, confirm via WhatsApp.', author: 'Admin', updatedAt: '2026-05-15T10:00:00', archived: false },
  { id: 4, category: 'Communication Issues', title: 'WhatsApp message not delivered — troubleshooting', body: 'Confirm customer phone is +267 format. Check WhatsApp Business log. If sent but not delivered, fall back to SMS via Twilio.', author: 'Admin', updatedAt: '2026-05-10T10:00:00', archived: false },
];
let NEXT_KB_ID = 100;

export const getKnowledgeBase = (filters = {}) => {
  let rows = KB_ARTICLES.filter((a) => !a.archived);
  if (filters.category) rows = rows.filter((a) => a.category === filters.category);
  if (filters.q) {
    const q = String(filters.q).toLowerCase();
    rows = rows.filter((a) => a.title.toLowerCase().includes(q) || a.body.toLowerCase().includes(q));
  }
  return ok(rows);
};

export const createKbArticle = (data) => {
  const article = { id: NEXT_KB_ID++, ...data, author: data.author || 'Admin', updatedAt: new Date().toISOString(), archived: false };
  KB_ARTICLES = [article, ...KB_ARTICLES];
  return ok({ message: 'Article created', article });
};

export const updateKbArticle = (id, data) => {
  KB_ARTICLES = KB_ARTICLES.map((a) => a.id === Number(id) ? { ...a, ...data, updatedAt: new Date().toISOString() } : a);
  return ok({ message: 'Article updated', id });
};

export const archiveKbArticle = (id) => {
  KB_ARTICLES = KB_ARTICLES.map((a) => a.id === Number(id) ? { ...a, archived: true } : a);
  return ok({ message: 'Article archived', id });
};

// =====================================================================
//  SMART ASSIGNMENT ENGINE (§6)
//  Recommend best PM based on workload, recent resolution speed, branch.
// =====================================================================
const PM_DIRECTORY = [
  { pmId: 2,  pmName: 'Mojaboswa',         branch: 'Gaborone',    avgResolutionDays: 3.1, satisfaction: 4.6, categoryStrengths: ['Payment issues', 'Customer support issues'] },
  { pmId: 9,  pmName: 'Onkarabile Sello',  branch: 'Gaborone',    avgResolutionDays: 4.2, satisfaction: 4.2, categoryStrengths: ['Difficulty contacting staff', 'Documentation issues'] },
  { pmId: 11, pmName: 'Kefilwe Moyo',      branch: 'Francistown', avgResolutionDays: 5.5, satisfaction: 4.0, categoryStrengths: ['Application delays', 'Missing feedback'] },
  { pmId: 12, pmName: 'Tshepo Kgang',      branch: 'Palapye',     avgResolutionDays: 3.8, satisfaction: 4.4, categoryStrengths: ['Follow-up service', 'Payment issues'] },
  { pmId: 13, pmName: 'Lebogang Pule',     branch: 'Maun',        avgResolutionDays: 4.0, satisfaction: 4.3, categoryStrengths: ['Documentation issues', 'Incorrect information'] },
];

export const recommendPm = (complaintId) => {
  const c = COMPLAINTS.find((x) => x.id === Number(complaintId));
  if (!c) return ok({ recommendations: [] });

  // Workload = currently open complaints assigned to this PM.
  const workload = PM_DIRECTORY.map((pm) => {
    const active = COMPLAINTS.filter((x) => x.assignedPmId === pm.pmId && OPEN_COMPLAINT_STATUSES.includes(x.status)).length;
    const branchMatch = pm.branch === c.branch ? 1 : 0;
    const categoryMatch = pm.categoryStrengths.includes(c.category) ? 1 : 0;
    // §16 — penalise (and flag) PMs at/over client capacity.
    const cap = PM_CAPACITY[pm.pmId];
    const atCapacity = cap ? cap.currentClients >= cap.maxClients : false;
    const capacityPenalty = atCapacity ? 1000 : (cap && cap.currentClients / cap.maxClients >= 0.9 ? 20 : 0);
    // Lower score = better. Workload dominates; ties broken by speed & satisfaction.
    const score = active * 10
      + pm.avgResolutionDays
      - (pm.satisfaction * 2)
      - (branchMatch * 8)
      - (categoryMatch * 4)
      + capacityPenalty;
    return { ...pm, activeComplaints: active, branchMatch: !!branchMatch, categoryMatch: !!categoryMatch, atCapacity, score: Number(score.toFixed(2)) };
  });
  workload.sort((a, b) => a.score - b.score);
  return ok({
    recommendations: workload.slice(0, 3),
    top: workload[0],
  });
};

// =====================================================================
//  COMPLAINT AGING DASHBOARD (§9)
// =====================================================================
const _daysOpen = (c) => {
  const start = new Date(c.createdAt).getTime();
  const end = c.closedAt ? new Date(c.closedAt).getTime() : Date.now();
  return Math.floor((end - start) / (1000 * 60 * 60 * 24));
};

export const getAgingDashboard = (filters = {}) => {
  let rows = COMPLAINTS.filter((c) => OPEN_COMPLAINT_STATUSES.includes(c.status));
  if (filters.branch) rows = rows.filter((c) => c.branch === filters.branch);

  const buckets = AGING_BUCKETS.map((b) => ({
    ...b,
    count: rows.filter((c) => {
      const d = _daysOpen(c);
      return d >= b.min && d <= b.max;
    }).length,
  }));

  const slaBreaches = rows.filter((c) => _daysOpen(c) > SLA_BREACH_DAYS);

  return ok({
    totalOpen: rows.length,
    buckets,
    slaBreaches: slaBreaches.length,
    slaBreachList: slaBreaches.map((c) => ({
      ticket: c.ticket, branch: c.branch, customer: c.customerName,
      assignedPmName: c.assignedPmName, daysOpen: _daysOpen(c), status: c.status, severity: c.severity, priority: c.priority,
    })),
  });
};

// =====================================================================
//  BRANCH HEALTH SCORE (§7, §10) — configurable weights, Director/Admin.
// =====================================================================
// §7 — weights are NOT hardcoded. Admin edits benchmark weightings; the
// total must always equal 100.
let HEALTH_WEIGHTS = {
  resolutionRate:    30,
  satisfactionScore: 30,
  slaCompliance:     20,
  escalationRate:    10,
  complaintVolume:   10,
};
export const HEALTH_WEIGHT_LABELS = {
  resolutionRate:    'Resolution Rate',
  satisfactionScore: 'Satisfaction Score',
  slaCompliance:     'SLA Compliance',
  escalationRate:    'Escalation Rate',
  complaintVolume:   'Complaint Volume',
};

export const getHealthWeights = () => ok({ ...HEALTH_WEIGHTS });
export const updateHealthWeights = (weights) => {
  const total = Object.values(weights).reduce((s, n) => s + Number(n || 0), 0);
  if (Math.round(total) !== 100) {
    const err = new Error('Weights must total 100%');
    err.response = { status: 400, data: { message: `Weights must total 100% (currently ${total}%).` } };
    throw err;
  }
  HEALTH_WEIGHTS = { ...HEALTH_WEIGHTS, ...Object.fromEntries(Object.entries(weights).map(([k, v]) => [k, Number(v)])) };
  return ok({ message: 'Branch Health Score weights updated', weights: { ...HEALTH_WEIGHTS } });
};

export const getBranchHealthScores = () => {
  const w = HEALTH_WEIGHTS;
  const data = BRANCHES.map((b) => {
    const branchComplaints = COMPLAINTS.filter((c) => c.branch === b);
    const total = branchComplaints.length || 1;
    const resolved = branchComplaints.filter((c) => c.status === 'resolved' || c.status === 'closed').length;
    const escalated = branchComplaints.filter((c) => c.status === 'escalated' || c.escalation).length;
    const slaBreaches = branchComplaints.filter((c) => OPEN_COMPLAINT_STATUSES.includes(c.status) && _daysOpen(c) > SLA_BREACH_DAYS).length;
    const surveys = branchComplaints.filter((c) => c.satisfaction).map((c) => c.satisfaction.rating);
    const avgCsat = surveys.length ? surveys.reduce((s, n) => s + n, 0) / surveys.length : 4.0;

    // Each component normalised to 0..1, then weighted by the configurable weight.
    const resolutionNorm  = resolved / total;
    const csatNorm        = avgCsat / 5;
    const slaNorm         = Math.max(0, 1 - slaBreaches / Math.max(total, 1));
    const escalationNorm  = 1 - escalated / total;          // fewer escalations = healthier
    const volumeNorm      = Math.max(0, 1 - branchComplaints.length / 60); // lighter load = healthier

    const score = Math.round(
      resolutionNorm * w.resolutionRate +
      csatNorm       * w.satisfactionScore +
      slaNorm        * w.slaCompliance +
      escalationNorm * w.escalationRate +
      volumeNorm     * w.complaintVolume
    );

    return {
      branch: b,
      score,
      grade: score >= 85 ? 'A' : score >= 75 ? 'B' : score >= 65 ? 'C' : score >= 55 ? 'D' : 'F',
      weights: { ...w },
      breakdown: {
        resolutionRate: Number((resolved  / total * 100).toFixed(1)),
        escalationRate: Number((escalated / total * 100).toFixed(1)),
        avgCsat: Number(avgCsat.toFixed(2)),
        slaBreaches,
        total: branchComplaints.length,
      },
    };
  });
  return ok(data);
};

// =====================================================================
//  DIRECTOR ACTION CENTRE (§11) — always-visible priorities.
// =====================================================================
export const getActionCentre = () => {
  const escalations = COMPLAINTS.filter((c) => c.status === 'escalated');
  const over30      = COMPLAINTS.filter((c) => OPEN_COMPLAINT_STATUSES.includes(c.status) && _daysOpen(c) > 30);
  const slaBreaches = COMPLAINTS.filter((c) => OPEN_COMPLAINT_STATUSES.includes(c.status) && _daysOpen(c) > SLA_BREACH_DAYS);
  const critical    = COMPLAINTS.filter((c) => c.severity === 'critical' && OPEN_COMPLAINT_STATUSES.includes(c.status));
  const highPriority = COMPLAINTS.filter((c) => (c.priority === 'urgent' || c.priority === 'high') && OPEN_COMPLAINT_STATUSES.includes(c.status));

  // Branches needing intervention = any with escalation rate > 15%
  const allBranchScores = BRANCHES.map((b) => {
    const items = COMPLAINTS.filter((c) => c.branch === b);
    const total = items.length || 1;
    const escalated = items.filter((c) => c.status === 'escalated').length;
    return { branch: b, escalationRate: escalated / total };
  });
  const flaggedBranches = allBranchScores.filter((b) => b.escalationRate > 0.15).map((b) => b.branch);

  const summarize = (list) => list.slice(0, 10).map((c) => ({
    id: c.id, ticket: c.ticket, branch: c.branch,
    customer: c.customerName, status: c.status,
    severity: c.severity, priority: c.priority,
    daysOpen: _daysOpen(c),
  }));

  return ok({
    escalations:        { count: escalations.length,   items: summarize(escalations) },
    over30Days:         { count: over30.length,        items: summarize(over30) },
    slaBreaches:        { count: slaBreaches.length,   items: summarize(slaBreaches) },
    criticalSeverity:   { count: critical.length,      items: summarize(critical) },
    highPriority:       { count: highPriority.length,  items: summarize(highPriority) },
    flaggedBranches,
  });
};

// =====================================================================
//  EXECUTIVE DASHBOARD (§12)
// =====================================================================
export const getExecutiveDashboard = () => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayMs = today.getTime();
  const thirtyDaysAgo = todayMs - 30 * 86400000;

  const created    = COMPLAINTS.filter((c) => new Date(c.createdAt).getTime() >= todayMs).length;
  const open       = COMPLAINTS.filter((c) => OPEN_COMPLAINT_STATUSES.includes(c.status)).length;
  const escalated  = COMPLAINTS.filter((c) => c.status === 'escalated').length;
  const slaBreaches = COMPLAINTS.filter((c) => OPEN_COMPLAINT_STATUSES.includes(c.status) && _daysOpen(c) > SLA_BREACH_DAYS).length;

  const monthCompl = COMPLAINTS.filter((c) => new Date(c.createdAt).getTime() >= thirtyDaysAgo);
  const monthResolved = monthCompl.filter((c) => c.status === 'resolved' || c.status === 'closed').length;
  const monthEscalated = monthCompl.filter((c) => c.status === 'escalated' || c.escalation).length;
  const monthCsat = COMPLAINTS.filter((c) => c.satisfaction).map((c) => c.satisfaction.rating);
  const avgCsat = monthCsat.length ? monthCsat.reduce((s, n) => s + n, 0) / monthCsat.length : 4.3;

  return ok({
    today: { created, open, escalated, slaBreaches },
    thisMonth: {
      satisfactionScore: Number(avgCsat.toFixed(2)),
      resolutionRate:    Number(((monthResolved  / Math.max(monthCompl.length, 1)) * 100).toFixed(1)),
      escalationRate:    Number(((monthEscalated / Math.max(monthCompl.length, 1)) * 100).toFixed(1)),
      trend: [
        { week: 'W1', complaints: 22, resolved: 18 },
        { week: 'W2', complaints: 28, resolved: 23 },
        { week: 'W3', complaints: 31, resolved: 27 },
        { week: 'W4', complaints: 24, resolved: 22 },
      ],
    },
    attentionRequired: {
      highRisk: COMPLAINTS.filter((c) => (c.severity === 'critical' || c.priority === 'urgent') && OPEN_COMPLAINT_STATUSES.includes(c.status)).length,
      overdue:  COMPLAINTS.filter((c) => OPEN_COMPLAINT_STATUSES.includes(c.status) && _daysOpen(c) > SLA_BREACH_DAYS).length,
      underperformingBranches: 1,
    },
  });
};

// =====================================================================
//  SMART INSIGHTS (§20)
// =====================================================================
export const getSmartInsights = () => {
  // Top recurring issues = category counts
  const catCounts = {};
  COMPLAINTS.forEach((c) => { catCounts[c.category] = (catCounts[c.category] || 0) + 1; });
  const topIssues = Object.entries(catCounts)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Common root causes (only from closed cases)
  const causeCounts = {};
  COMPLAINTS.filter((c) => c.rootCause).forEach((c) => {
    causeCounts[c.rootCause.cause] = (causeCounts[c.rootCause.cause] || 0) + 1;
  });
  const topCauses = Object.entries(causeCounts).map(([cause, count]) => ({ cause, count })).sort((a, b) => b.count - a.count);

  // Sentiment distribution
  const sentimentCounts = {};
  COMPLAINTS.forEach((c) => { sentimentCounts[c.sentiment] = (sentimentCounts[c.sentiment] || 0) + 1; });

  return ok({
    topIssues,
    topRootCauses: topCauses,
    sentimentDistribution: Object.entries(sentimentCounts).map(([sentiment, count]) => ({ sentiment, count })),
    branchTrends: BRANCHES.map((b, i) => ({
      branch: b,
      complaintsThisMonth: [42, 28, 18, 14, 9][i],
      complaintsLastMonth: [38, 30, 16, 12, 10][i],
      trend: [42, 28, 18, 14, 9][i] - [38, 30, 16, 12, 10][i],
    })),
  });
};

// =====================================================================
//  COMPLAINT HEAT MAP (§19)
// =====================================================================
export const getComplaintHeatMap = () => {
  return ok(BRANCHES.map((b, i) => ({
    branch: b,
    complaintCount: [42, 28, 18, 14, 9][i],
    escalated: [4, 5, 2, 1, 1][i],
    avgSeverityScore: [2.4, 2.8, 2.1, 1.9, 2.0][i], // 1=minor … 4=critical
  })));
};

// =====================================================================
//  GLOBAL SEARCH (§17)
// =====================================================================
export const globalSearch = (q) => {
  if (!q || q.length < 2) return ok({ complaints: [], leads: [], people: [] });
  const term = String(q).toLowerCase();

  const complaints = COMPLAINTS.filter((c) =>
    c.ticket.toLowerCase().includes(term) ||
    (c.customerName || '').toLowerCase().includes(term) ||
    (c.assignedPmName || '').toLowerCase().includes(term) ||
    (c.branch || '').toLowerCase().includes(term) ||
    (c.category || '').toLowerCase().includes(term) ||
    (c.status || '').toLowerCase().includes(term)
  ).slice(0, 10).map((c) => ({
    type: 'complaint',
    id: c.id, ticket: c.ticket, branch: c.branch,
    customer: c.customerName, status: c.status,
    assignedPmName: c.assignedPmName,
  }));

  const leads = LEADS.filter((l) =>
    (l.name || '').toLowerCase().includes(term) ||
    (l.phone || '').toLowerCase().includes(term) ||
    (l.branch || '').toLowerCase().includes(term)
  ).slice(0, 5).map((l) => ({ type: 'lead', ...l }));

  return ok({ complaints, leads, people: [] });
};

export default {
  login, registerCustomer, getProfile, updateProfile, optOut, getMyFeedback,
  submitRating, submitComplaint, getFeedbackForm, submitFeedback,
  searchCustomers, getUnassignedCustomers, assignCustomer, autoAssignCustomers, getPmWorkload, getStaffPerformance,
  getComplaints, getMyComplaints, getComplaintById, getQueuePosition,
  assignComplaint, reassignComplaint, updateComplaintStatus,
  addComplaintNote, addInternalNote, addCustomerNote, updateSentiment,
  escalateComplaint, resolveComplaint, closeComplaint, submitSatisfactionSurvey,
  getActiveClientAnalytics, getComplaintAnalytics,
  getBranchAnalytics, getBranchComparison, getReferralSources, getLocationAnalytics, getCsatTrend, getWordCloud,
  getBranchDetail, getMarketingSummary, getReferralTrends, getDemographics, getReferralNetwork,
  getUsers, createUser, updateUser, deleteUser, getAuditLogs, getSystemHealth, getBranches, updateBranch,
  getSystemConfig, updateSystemConfig, triggerBackup, exportData,
  getLeads, createLead, updateLeadStatus, convertLead, getLeadFunnel,
  sendReviewLink, getReviewRequests,
  // Service Intelligence Platform
  getAuditTrail,
  submitImprovementFeedback, getImprovementFeedback, getImprovementFeedbackSummary,
  getKnowledgeBase, createKbArticle, updateKbArticle, archiveKbArticle,
  recommendPm,
  getAgingDashboard,
  getBranchHealthScores,
  getActionCentre,
  getExecutiveDashboard,
  getSmartInsights,
  getComplaintHeatMap,
  globalSearch,
};

// =====================================================================
//  NEW FEATURES — Appointments, Reports, Announcements, Reassignment,
//  Client History, WhatsApp Templates, PM Scorecard
// =====================================================================

// --- Appointments / Callbacks ---
let APPOINTMENTS = [
  { id: 1, clientName: 'Stacey Nthoi', phone: '+26771234567', pmName: 'Mojaboswa', pmId: 2, branch: 'Gaborone', date: '2026-06-20', time: '10:00', reason: 'Loan account query', status: 'scheduled', createdAt: '2026-06-18T09:00:00' },
  { id: 2, clientName: 'Mpho Kgosi',   phone: '+26773456789', pmName: 'Mojaboswa', pmId: 2, branch: 'Gaborone', date: '2026-06-20', time: '14:00', reason: 'Follow up on complaint TCN-0002', status: 'scheduled', createdAt: '2026-06-18T11:00:00' },
  { id: 3, clientName: 'Refilwe Sento', phone: '+26774001001', pmName: 'Onkarabile Sello', pmId: 9, branch: 'Gaborone', date: '2026-06-19', time: '09:00', reason: 'Document verification', status: 'completed', createdAt: '2026-06-17T10:00:00' },
];
let NEXT_APPT_ID = 100;

export const getAppointments = (filters = {}) => {
  let rows = [...APPOINTMENTS];
  if (filters.pmId) rows = rows.filter(a => a.pmId === Number(filters.pmId));
  if (filters.branch) rows = rows.filter(a => a.branch === filters.branch);
  if (filters.status) rows = rows.filter(a => a.status === filters.status);
  return ok(rows);
};
export const createAppointment = (data) => {
  const appt = { id: NEXT_APPT_ID++, status: 'scheduled', createdAt: new Date().toISOString(), ...data };
  APPOINTMENTS = [appt, ...APPOINTMENTS];
  return ok({ message: 'Appointment booked', appointment: appt });
};
export const updateAppointmentStatus = (id, status) => {
  APPOINTMENTS = APPOINTMENTS.map(a => a.id === Number(id) ? { ...a, status } : a);
  return ok({ message: 'Appointment updated', id, status });
};
export const cancelAppointment = (id) => {
  APPOINTMENTS = APPOINTMENTS.map(a => a.id === Number(id) ? { ...a, status: 'cancelled' } : a);
  return ok({ message: 'Appointment cancelled', id });
};

// --- Director Announcements ---
let ANNOUNCEMENTS = [
  { id: 1, title: 'New SLA Policy Effective July 2026', body: 'As of 1 July 2026, all complaints must be resolved within 10 business days (down from 14). Please update your workflows accordingly.', author: 'Opelo Motswagae', role: 'director', targetRoles: ['portfolio_manager','service_manager','marketing','admin'], priority: 'high', createdAt: '2026-06-15T08:00:00', pinned: true },
  { id: 2, title: 'Q2 Performance Review — Friday 20 June', body: 'All branch service managers are required to submit their Q2 complaint resolution reports by Thursday COB. The Director will present a summary at the all-hands on Friday.', author: 'Opelo Motswagae', role: 'director', targetRoles: ['service_manager'], priority: 'normal', createdAt: '2026-06-14T12:00:00', pinned: false },
  { id: 3, title: 'System Maintenance — Sunday 22 June 02:00–04:00', body: 'The platform will be in maintenance mode for 2 hours. All data is backed up. No action needed from staff.', author: 'Thero Setlhare', role: 'admin', targetRoles: ['portfolio_manager','service_manager','director','marketing','admin'], priority: 'info', createdAt: '2026-06-13T16:00:00', pinned: false },
];
let NEXT_ANN_ID = 100;

export const getAnnouncements = (filters = {}) => {
  let rows = [...ANNOUNCEMENTS];
  if (filters.role) rows = rows.filter(a => !a.targetRoles || a.targetRoles.includes(filters.role));
  rows.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || new Date(b.createdAt) - new Date(a.createdAt));
  return ok(rows);
};
export const createAnnouncement = (data) => {
  const ann = { id: NEXT_ANN_ID++, createdAt: new Date().toISOString(), pinned: false, ...data };
  ANNOUNCEMENTS = [ann, ...ANNOUNCEMENTS];
  return ok({ message: 'Announcement published', announcement: ann });
};
export const deleteAnnouncement = (id) => {
  ANNOUNCEMENTS = ANNOUNCEMENTS.filter(a => a.id !== Number(id));
  return ok({ message: 'Announcement deleted', id });
};

// --- WhatsApp Templates ---
// Templates are role-specific — returned based on requesting role
const WA_TEMPLATES_BY_ROLE = {
  // Admin — internal/technical only
  admin: [
    { id: 101, name: 'System Maintenance Notice', key: 'maintenance', body: 'Hi [Name], the Ticano system will be under maintenance on [Date] from [Start] to [End]. Please save your work before this time. — Ticano IT Admin', variables: ['Name','Date','Start','End'], active: true, lastUpdated: '2026-06-01T10:00:00' },
    { id: 102, name: 'New User Account Created', key: 'new_user', body: 'Hi [Name], your Ticano system account has been created. Username: [Email]. Please log in and change your password immediately. — Ticano Admin', variables: ['Name','Email'], active: true, lastUpdated: '2026-05-20T10:00:00' },
    { id: 103, name: 'Password Reset Instructions', key: 'password_reset', body: 'Hi [Name], a password reset was requested for your Ticano account. If this was you, click [Link] to set a new password. If not, contact IT immediately.', variables: ['Name','Link'], active: true, lastUpdated: '2026-04-10T10:00:00' },
    { id: 104, name: 'Security Alert', key: 'security_alert', body: 'SECURITY ALERT: Unusual login activity detected on the Ticano system for [User] on [Date] at [Time]. Please review the audit trail and take action if needed.', variables: ['User','Date','Time'], active: true, lastUpdated: '2026-03-15T10:00:00' },
    { id: 105, name: 'Database Backup Confirmation', key: 'db_backup', body: 'Hi [Name], the scheduled database backup completed successfully on [Date] at [Time]. Backup size: [Size]. Next backup: [Next]. — Ticano System', variables: ['Name','Date','Time','Size','Next'], active: true, lastUpdated: '2026-02-28T10:00:00' },
    { id: 106, name: 'IT Support Response', key: 'it_support', body: 'Hi [Name], your IT support request [Ticket] has been received. Our team will respond within [SLA]. Reference: [Ticket]. — Ticano IT Team', variables: ['Name','Ticket','SLA'], active: true, lastUpdated: '2026-01-15T10:00:00' },
  ],
  // PM — client-facing only
  portfolio_manager: [
    { id: 201, name: 'Complaint Received', key: 'complaint_received', body: 'Hi [Name], your complaint has been received and assigned ticket number [Ticket]. I am [PM] and I will be handling your case. I will be in touch within 24 hours.', variables: ['Name','Ticket','PM'], active: true, lastUpdated: '2026-06-01T10:00:00' },
    { id: 202, name: 'Appointment Reminder', key: 'appointment_reminder', body: 'Hi [Name], this is a reminder of your appointment with me tomorrow at [Time] at our [Branch] branch. Reply CONFIRM to confirm or call me to reschedule.', variables: ['Name','Time','Branch'], active: true, lastUpdated: '2026-05-15T10:00:00' },
    { id: 203, name: 'Document Request', key: 'document_request', body: 'Hi [Name], to continue processing your [Product] application, I need the following documents: [Documents]. Please bring or send them at your earliest convenience. — [PM]', variables: ['Name','Product','Documents','PM'], active: true, lastUpdated: '2026-04-22T10:00:00' },
    { id: 204, name: 'Application Update', key: 'application_update', body: 'Hi [Name], I wanted to update you on your [Product] application. Current status: [Status]. Next step: [Next]. Feel free to reply if you have questions. — [PM]', variables: ['Name','Product','Status','Next','PM'], active: true, lastUpdated: '2026-03-10T10:00:00' },
    { id: 205, name: 'Follow-up Check-in', key: 'followup', body: 'Hi [Name], just checking in to see how everything is going with your Ticano account. Is there anything I can help you with? — [PM], your Portfolio Manager', variables: ['Name','PM'], active: true, lastUpdated: '2026-02-20T10:00:00' },
    { id: 206, name: 'Review Request', key: 'review_request', body: 'Hi [Name], thank you for allowing us to assist you. Your feedback means a lot to us! Please share your experience: [Link]. It only takes 2 minutes. — [PM]', variables: ['Name','Link','PM'], active: true, lastUpdated: '2026-01-15T10:00:00' },
    { id: 207, name: 'Birthday Greeting', key: 'birthday', body: 'Happy Birthday [Name]! 🎂 Wishing you a wonderful day. From your Portfolio Manager and the whole Ticano team. ticanogroup.co.bw', variables: ['Name'], active: true, lastUpdated: '2026-05-10T10:00:00' },
  ],
  // Service Manager — operational
  service_manager: [
    { id: 301, name: 'Escalation Notice to Client', key: 'escalation_client', body: 'Dear [Name], we sincerely apologise for the delay on your complaint [Ticket]. This has been escalated to our senior management and will be resolved within 2 business days. — Ticano [Branch]', variables: ['Name','Ticket','Branch'], active: true, lastUpdated: '2026-06-01T10:00:00' },
    { id: 302, name: 'Branch Update to Staff', key: 'branch_update', body: 'Team update: [Message]. Please acknowledge and ensure compliance by [Deadline]. Raise any concerns directly with me. — [Manager], Service Manager [Branch]', variables: ['Message','Deadline','Manager','Branch'], active: true, lastUpdated: '2026-05-20T10:00:00' },
    { id: 303, name: 'SLA Warning to PM', key: 'sla_warning', body: 'Urgent: Complaint [Ticket] for client [Name] is approaching its SLA deadline. Please update the status and provide a resolution plan by [Deadline]. — [Manager]', variables: ['Ticket','Name','Deadline','Manager'], active: true, lastUpdated: '2026-04-15T10:00:00' },
    { id: 304, name: 'Staff Performance Alert', key: 'staff_alert', body: 'Hi [PM], I wanted to discuss your current complaint load and performance metrics. Please schedule a brief call with me this week. — [Manager], Service Manager', variables: ['PM','Manager'], active: true, lastUpdated: '2026-03-08T10:00:00' },
    { id: 305, name: 'SLA Breach Notice', key: 'sla_breach', body: 'ALERT: Complaint [Ticket] has breached its 14-day SLA. Client: [Name]. This has been flagged to the Director. Immediate action required. — [Manager]', variables: ['Ticket','Name','Manager'], active: true, lastUpdated: '2026-02-10T10:00:00' },
  ],
  // Director — VIP client + internal executive
  director: [
    { id: 401, name: 'VIP Client Communication', key: 'vip_client', body: 'Dear [Name], as Director of Ticano Group, I personally want to assure you that your concern is being handled at the highest level. I will ensure [Commitment] by [Date]. — [Director]', variables: ['Name','Commitment','Date','Director'], active: true, lastUpdated: '2026-06-01T10:00:00' },
    { id: 402, name: 'Executive Escalation Response', key: 'exec_escalation', body: 'Dear [Name], I have personally reviewed your complaint [Ticket] and have assigned it to our most senior team. You will receive a resolution by [Date]. — [Director], Ticano Group', variables: ['Name','Ticket','Date','Director'], active: true, lastUpdated: '2026-05-15T10:00:00' },
    { id: 403, name: 'Branch Manager Directive', key: 'branch_directive', body: 'Hi [Manager], following my review of [Branch] performance, I need the following addressed by [Deadline]: [Action]. Please confirm receipt. — [Director]', variables: ['Manager','Branch','Deadline','Action','Director'], active: true, lastUpdated: '2026-04-20T10:00:00' },
    { id: 404, name: 'Policy Update Notice', key: 'policy_update', body: 'Team, effective [Date], the following policy update applies: [Policy]. Please ensure all staff are briefed. Questions to be directed to your Service Manager. — [Director]', variables: ['Date','Policy','Director'], active: true, lastUpdated: '2026-03-12T10:00:00' },
    { id: 405, name: 'Quarterly Review Invite', key: 'quarterly_review', body: 'Hi [Name], you are invited to the Q[Quarter] performance review on [Date] at [Time]. Location: [Venue]. Please confirm attendance. — [Director], Ticano Group', variables: ['Name','Quarter','Date','Time','Venue','Director'], active: true, lastUpdated: '2026-02-05T10:00:00' },
  ],
};

// Merge all for backward compat
let WA_TEMPLATES = [
  ...WA_TEMPLATES_BY_ROLE.admin,
  ...WA_TEMPLATES_BY_ROLE.portfolio_manager,
  ...WA_TEMPLATES_BY_ROLE.service_manager,
  ...WA_TEMPLATES_BY_ROLE.director,
];
let NEXT_TPL_ID = 100;

export const getWaTemplates = (role) => {
  if (role && WA_TEMPLATES_BY_ROLE[role]) return ok([...WA_TEMPLATES_BY_ROLE[role]]);
  return ok([...WA_TEMPLATES]);
};
export const createWaTemplate = (data) => {
  const tpl = { id: NEXT_TPL_ID++, lastUpdated: new Date().toISOString(), active: true, ...data };
  WA_TEMPLATES = [tpl, ...WA_TEMPLATES];
  return ok({ message: 'Template created', template: tpl });
};
export const updateWaTemplate = (id, data) => {
  WA_TEMPLATES = WA_TEMPLATES.map(t => t.id === Number(id) ? { ...t, ...data, lastUpdated: new Date().toISOString() } : t);
  return ok({ message: 'Template updated', id });
};
export const deleteWaTemplate = (id) => {
  WA_TEMPLATES = WA_TEMPLATES.filter(t => t.id !== Number(id));
  return ok({ message: 'Template deleted', id });
};

// --- Complaint Reassignment ---
export const reassignComplaintToNew = (complaintId, newPmId, newPmName, reason) => {
  const c = COMPLAINTS.find(x => x.id === Number(complaintId));
  if (!c) return ok({ message: 'Not found' });
  const prev = c.assignedPmName;
  COMPLAINTS = COMPLAINTS.map(x => x.id === Number(complaintId) ? {
    ...x, assignedPmId: newPmId, assignedPmName: newPmName,
    timeline: [...x.timeline, { at: new Date().toISOString(), event: `Reassigned from ${prev} to ${newPmName}`, status: x.status, actor: 'Service Manager' }],
    internalNotes: [...x.internalNotes, { at: new Date().toISOString(), author: 'Service Manager', text: `Reason for reassignment: ${reason}` }],
  } : x);
  return ok({ message: `Complaint reassigned to ${newPmName}`, complaintId });
};

// --- Client History for Staff ---
export const getClientHistory = (customerId) => ok({
  client: { id: 1, name: 'Stacey Nthoi', whatsappNumber: '+26771234567', email: 'stacey@example.com', clientType: 'existing', branch: 'Gaborone', assignedPmName: 'Mojaboswa', createdAt: '2025-11-02T09:14:00' },
  complaints: COMPLAINTS.filter(c => c.customerId === Number(customerId) || customerId == 1),
  ratings: [
    { id: 11, rating: 5, comment: 'Excellent service!', createdAt: '2026-06-01T10:20:00' },
    { id: 12, rating: 4, comment: 'Friendly staff.',    createdAt: '2026-05-18T14:05:00' },
    { id: 13, rating: 2, comment: 'Waited too long.',   createdAt: '2026-04-29T11:40:00' },
  ],
  avgRating: 3.7,
  totalComplaints: 2,
  openComplaints: 1,
});

// --- PM Scorecard (individual) ---
export const getPmScorecard = (pmId) => ok({
  pm: { id: pmId, name: 'Mojaboswa', branch: 'Gaborone', email: 'pm@demo.com' },
  stats: {
    totalComplaints: 22,
    openComplaints: 3,
    resolvedComplaints: 19,
    resolutionRate: 86.4,
    avgCloseTimeDays: 3.1,
    escalated: 1,
    escalationRate: 4.5,
    avgCsat: 4.5,
    totalRatings: 48,
  },
  weeklyTrend: [
    { week: 'W1', resolved: 4, escalated: 0 },
    { week: 'W2', resolved: 6, escalated: 1 },
    { week: 'W3', resolved: 5, escalated: 0 },
    { week: 'W4', resolved: 4, escalated: 0 },
  ],
  recentComplaints: COMPLAINTS.filter(c => c.assignedPmId === Number(pmId)).slice(0,5),
  rank: 1,
  rankTotal: 3,
});

// --- Report Generator ---
export const generateReport = (type, params) => ok({
  reportId: 'RPT-' + Date.now(),
  type, params,
  generatedAt: new Date().toISOString(),
  message: `${type} report generated successfully`,
  summary: {
    period: params.period || 'Last 30 days',
    branch: params.branch || 'All branches',
    totalComplaints: 24,
    resolved: 19,
    escalated: 2,
    avgCsat: 4.3,
    slaBreaches: 1,
    topIssue: 'Payment issues',
  }
});

// ---- Birthday Preferences ----
let BIRTHDAY_PREFS = {
  1: { enabled: false, channel: 'whatsapp', birthdayDate: '1995-03-15' },
};

export const getBirthdayPrefs = (userId) => ok(BIRTHDAY_PREFS[userId] || { enabled: false, channel: 'whatsapp', birthdayDate: '' });

export const saveBirthdayPrefs = (userId, prefs) => {
  BIRTHDAY_PREFS[userId] = { ...BIRTHDAY_PREFS[userId], ...prefs };
  return ok({ message: 'Birthday preferences saved', prefs: BIRTHDAY_PREFS[userId] });
};

export const simulateBirthdaySend = (userId) => {
  const prefs = BIRTHDAY_PREFS[userId];
  if (!prefs?.enabled) return ok({ sent: false, reason: 'Birthday messages not enabled' });
  return ok({
    sent: true,
    channel: prefs.channel,
    message: `Happy Birthday! 🎂 From your Portfolio Manager and the whole Ticano team. No one should be small forever — here's to another great year! ticanogroup.co.bw`,
    sentAt: new Date().toISOString(),
  });
};

// =====================================================================
//  V3 ADDITIONS
// =====================================================================

// ---------------------------------------------------------------------
//  §1 — PM ESCALATION RATE KPI
//  (PM Escalated Complaints ÷ Total Assigned Complaints) × 100
//  Visible to Service Manager, Admin, Director.
// ---------------------------------------------------------------------
const _pmRows = () => {
  const map = {};
  COMPLAINTS.forEach((c) => {
    if (!c.assignedPmName) return;
    const key = c.assignedPmId || c.assignedPmName;
    if (!map[key]) map[key] = { pmId: c.assignedPmId, pm: c.assignedPmName, branch: c.branch, assigned: 0, escalated: 0, resolved: 0, resolvedNoEscalation: 0 };
    map[key].assigned += 1;
    const wasEscalated = c.status === 'escalated' || !!c.escalation;
    if (wasEscalated) map[key].escalated += 1;
    if (c.status === 'resolved' || c.status === 'closed') {
      map[key].resolved += 1;
      if (!wasEscalated) map[key].resolvedNoEscalation += 1;
    }
  });
  return Object.values(map);
};

export const getPmEscalationRates = (filters = {}) => {
  let rows = _pmRows();
  if (filters.branch) rows = rows.filter((r) => r.branch === filters.branch);
  const withRate = rows.map((r) => ({
    ...r,
    escalationRate: r.assigned ? Number(((r.escalated / r.assigned) * 100).toFixed(1)) : 0,
  })).sort((a, b) => b.escalationRate - a.escalationRate);

  const totalAssigned = withRate.reduce((s, r) => s + r.assigned, 0);
  const totalEscalated = withRate.reduce((s, r) => s + r.escalated, 0);

  return ok({
    perPm: withRate,
    branchAverage: totalAssigned ? Number(((totalEscalated / totalAssigned) * 100).toFixed(1)) : 0,
    topPerformer: withRate.length ? withRate[withRate.length - 1] : null, // lowest rate
    bottomPerformer: withRate.length ? withRate[0] : null,                // highest rate
    // Period views (mock multipliers over the live monthly figure for trend display)
    monthly:   totalAssigned ? Number(((totalEscalated / totalAssigned) * 100).toFixed(1)) : 0,
    quarterly: totalAssigned ? Number(((totalEscalated / totalAssigned) * 100 * 0.92).toFixed(1)) : 0,
    annual:    totalAssigned ? Number(((totalEscalated / totalAssigned) * 100 * 0.88).toFixed(1)) : 0,
  });
};

// ---------------------------------------------------------------------
//  §19 — FIRST CONTACT RESOLUTION RATE (FCR)
//  (Complaints Resolved Without Escalation ÷ Total Complaints) × 100
//  Visible to Service Manager, Admin, Director.
// ---------------------------------------------------------------------
export const getFcrRates = (filters = {}) => {
  let pmRows = _pmRows();
  if (filters.branch) pmRows = pmRows.filter((r) => r.branch === filters.branch);

  const perPm = pmRows.map((r) => ({
    pm: r.pm, branch: r.branch,
    total: r.assigned,
    resolvedNoEscalation: r.resolvedNoEscalation,
    fcr: r.assigned ? Number(((r.resolvedNoEscalation / r.assigned) * 100).toFixed(1)) : 0,
  })).sort((a, b) => b.fcr - a.fcr);

  const byBranch = BRANCHES.map((b) => {
    const items = COMPLAINTS.filter((c) => c.branch === b);
    const total = items.length || 1;
    const noEsc = items.filter((c) => (c.status === 'resolved' || c.status === 'closed') && !(c.status === 'escalated' || c.escalation)).length;
    return { branch: b, total: items.length, resolvedNoEscalation: noEsc, fcr: Number(((noEsc / total) * 100).toFixed(1)) };
  });

  const total = COMPLAINTS.length || 1;
  const companyNoEsc = COMPLAINTS.filter((c) => (c.status === 'resolved' || c.status === 'closed') && !(c.status === 'escalated' || c.escalation)).length;

  return ok({
    perPm,
    byBranch,
    companyWide: Number(((companyNoEsc / total) * 100).toFixed(1)),
  });
};

// ---------------------------------------------------------------------
//  §8 — MONTHLY CSAT REPORTING (replaces weekly)
//  Current month, previous month, quarterly trend, annual trend.
//  Available to Service Managers, Admin, Director.
// ---------------------------------------------------------------------
export const getMonthlyCsat = (filters = {}) => {
  // Derive a current figure from live satisfaction surveys; surround with a
  // mock historical series for the trend views.
  const surveys = COMPLAINTS.filter((c) => c.satisfaction && (!filters.branch || c.branch === filters.branch))
    .map((c) => c.satisfaction.rating);
  const liveAvg = surveys.length ? Number((surveys.reduce((s, n) => s + n, 0) / surveys.length).toFixed(2)) : 4.2;

  const monthly = [
    { month: 'Jan', csat: 3.9, responses: 120 },
    { month: 'Feb', csat: 4.0, responses: 134 },
    { month: 'Mar', csat: 4.1, responses: 128 },
    { month: 'Apr', csat: 4.0, responses: 141 },
    { month: 'May', csat: 4.2, responses: 149 },
    { month: 'Jun', csat: liveAvg, responses: 156 },
  ];
  const quarterly = [
    { quarter: 'Q3 2025', csat: 3.8 }, { quarter: 'Q4 2025', csat: 3.9 },
    { quarter: 'Q1 2026', csat: 4.0 }, { quarter: 'Q2 2026', csat: Number(((4.0 + 4.2 + liveAvg) / 3).toFixed(2)) },
  ];
  const annual = [
    { year: '2023', csat: 3.6 }, { year: '2024', csat: 3.8 },
    { year: '2025', csat: 4.0 }, { year: '2026', csat: liveAvg },
  ];
  return ok({
    currentMonth: { label: 'June 2026', csat: liveAvg, responses: 156 },
    previousMonth: { label: 'May 2026', csat: 4.2, responses: 149 },
    quarterlyTrend: quarterly,
    annualTrend: annual,
    monthlyTrend: monthly,
  });
};

// ---------------------------------------------------------------------
//  §16 — CLIENT CAPACITY ALERTS
//  Each PM has a configurable client-capacity limit. Alerts fire to the
//  Service Manager + Admin when a PM hits capacity, and Smart Assignment
//  avoids overloaded PMs.
// ---------------------------------------------------------------------
let PM_CAPACITY = {
  2:  { pmId: 2,  pmName: 'Mojaboswa',        branch: 'Gaborone',    maxClients: 150, currentClients: 138 },
  9:  { pmId: 9,  pmName: 'Onkarabile Sello', branch: 'Gaborone',    maxClients: 150, currentClients: 150 },
  11: { pmId: 11, pmName: 'Kefilwe Moyo',     branch: 'Francistown', maxClients: 120, currentClients: 96  },
  12: { pmId: 12, pmName: 'Tshepo Kgang',     branch: 'Palapye',     maxClients: 120, currentClients: 71  },
  13: { pmId: 13, pmName: 'Lebogang Pule',    branch: 'Maun',        maxClients: 120, currentClients: 88  },
};

export const getPmCapacity = (filters = {}) => {
  let rows = Object.values(PM_CAPACITY);
  if (filters.branch) rows = rows.filter((r) => r.branch === filters.branch);
  const withStatus = rows.map((r) => {
    const utilisation = Math.round((r.currentClients / r.maxClients) * 100);
    const atCapacity = r.currentClients >= r.maxClients;
    const nearCapacity = !atCapacity && utilisation >= 90;
    return { ...r, utilisation, atCapacity, nearCapacity };
  });
  return ok({
    capacities: withStatus,
    alerts: withStatus.filter((r) => r.atCapacity).map((r) => ({
      pmName: r.pmName, branch: r.branch,
      message: `PM ${r.pmName} has reached the maximum client capacity.`,
      severity: 'high',
    })),
  });
};

export const setPmCapacity = (pmId, maxClients) => {
  if (PM_CAPACITY[pmId]) PM_CAPACITY[pmId] = { ...PM_CAPACITY[pmId], maxClients: Number(maxClients) };
  return ok({ message: 'Capacity limit updated', pmId, maxClients: Number(maxClients) });
};

// ---------------------------------------------------------------------
//  §15 — WEEKLY ANALYTICS REPORTS
//  Recipients: Director, Admin, Service Managers.
// ---------------------------------------------------------------------
export const getWeeklyReport = (filters = {}) => {
  const scope = filters.branch ? COMPLAINTS.filter((c) => c.branch === filters.branch) : COMPLAINTS;
  const byStatus = (s) => scope.filter((c) => c.status === s).length;
  const surveys = scope.filter((c) => c.satisfaction).map((c) => c.satisfaction.rating);
  const avgCsat = surveys.length ? Number((surveys.reduce((s, n) => s + n, 0) / surveys.length).toFixed(2)) : 4.2;
  let pmRows = _pmRows();
  if (filters.branch) pmRows = pmRows.filter((r) => r.branch === filters.branch);

  return ok({
    generatedAt: new Date().toISOString(),
    period: 'Week of 16–22 June 2026',
    scope: filters.branch || 'All branches',
    complaints: {
      new:       scope.filter((c) => c.status === 'created').length,
      open:      scope.filter((c) => OPEN_COMPLAINT_STATUSES.includes(c.status)).length,
      resolved:  byStatus('resolved'),
      closed:    byStatus('closed'),
      escalated: scope.filter((c) => c.status === 'escalated' || c.escalation).length,
    },
    satisfaction: { monthlyCsat: avgCsat, trend: 'improving' },
    performance: {
      pmRankings: pmRows.map((r) => ({
        pm: r.pm, resolved: r.resolved, escalated: r.escalated,
        escalationRate: r.assigned ? Number(((r.escalated / r.assigned) * 100).toFixed(1)) : 0,
      })).sort((a, b) => b.resolved - a.resolved),
      slaCompliancePct: 92.0,
    },
    branches: BRANCHES.map((b) => {
      const items = COMPLAINTS.filter((c) => c.branch === b);
      return { branch: b, complaints: items.length, escalated: items.filter((c) => c.escalation || c.status === 'escalated').length };
    }),
    delivery: ['Dashboard notification', 'Email report'],
  });
};

// ---------------------------------------------------------------------
//  §10 — REFERRAL NETWORK (referrer logging)
// ---------------------------------------------------------------------
let REFERRAL_LOG = [
  { referrer: 'Refilwe Sento',    referred: 'Mpho Kgosi',       at: '2026-06-10T10:00:00' },
  { referrer: 'Boitumelo Rantao', referred: 'Tshepo Molefe',    at: '2026-06-08T09:00:00' },
  { referrer: 'Refilwe Sento',    referred: 'Neo Bareki',       at: '2026-05-30T14:00:00' },
];
const logReferral = (referrer, referred) => {
  REFERRAL_LOG = [{ referrer, referred: referred || 'New customer', at: new Date().toISOString() }, ...REFERRAL_LOG];
};

export const getReferralLog = () => ok([...REFERRAL_LOG]);

export const getReferralNetworkDashboard = () => {
  const counts = {};
  REFERRAL_LOG.forEach((r) => { counts[r.referrer] = (counts[r.referrer] || 0) + 1; });
  const topReferrers = Object.entries(counts)
    .map(([referrer, referrals]) => ({ referrer, referrals }))
    .sort((a, b) => b.referrals - a.referrals);
  return ok({
    totalReferrals: REFERRAL_LOG.length,
    topReferrers,
    trend: [
      { month: 'Mar', referrals: 18 }, { month: 'Apr', referrals: 24 },
      { month: 'May', referrals: 31 }, { month: 'Jun', referrals: REFERRAL_LOG.length },
    ],
    growthPct: 22.4,
    recent: REFERRAL_LOG.slice(0, 10),
  });
};

// ---------------------------------------------------------------------
//  §13 — EXCEL/CSV IMPORT FOR POTENTIAL CLIENTS
//  Validates data, detects duplicates, imports valid records, returns a
//  summary. (Parsing of the spreadsheet happens client-side; this endpoint
//  receives an array of row objects.)
// ---------------------------------------------------------------------
export const importLeads = (rows = [], meta = {}) => {
  const summary = { received: rows.length, imported: 0, duplicates: 0, invalid: 0, errors: [] };
  const existingPhones = new Set(LEADS.map((l) => (l.phone || '').replace(/\s+/g, '')));
  const seenInBatch = new Set();
  const toAdd = [];

  rows.forEach((row, i) => {
    const firstName = (row.firstName || row['First Name'] || '').trim();
    const lastName  = (row.lastName  || row['Last Name']  || '').trim();
    const phone     = String(row.phone || row['Phone Number'] || '').trim();
    const email     = (row.email || row['Email'] || '').trim();
    const company   = (row.company || row['Company Name'] || '').trim();
    const notes     = (row.notes || row['Notes'] || '').trim();
    const name = `${firstName} ${lastName}`.trim();

    if (!name || !phone) {
      summary.invalid += 1;
      summary.errors.push(`Row ${i + 2}: missing required name or phone.`);
      return;
    }
    const normPhone = phone.replace(/\s+/g, '');
    if (existingPhones.has(normPhone) || seenInBatch.has(normPhone)) {
      summary.duplicates += 1;
      return;
    }
    seenInBatch.add(normPhone);
    toAdd.push({
      id: Date.now() + i,
      name, phone, email, company, notes,
      branch: meta.branch || row.branch || 'Gaborone',
      referralSource: 'System Import',
      product: 'General Enquiry',
      status: 'New',
      addedBy: meta.addedBy || 'Bulk Import',
      addedAt: new Date().toISOString(),
    });
  });

  LEADS = [...toAdd, ...LEADS];
  summary.imported = toAdd.length;
  return ok({ message: `Imported ${summary.imported} of ${summary.received} records`, summary, leads: [...LEADS] });
};
