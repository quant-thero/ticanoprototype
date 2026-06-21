// =====================================================================
//  Shared domain constants — Ticano Service Intelligence Platform
// =====================================================================

// --- Customer journey stages ---
export const JOURNEY_STAGES = [
  { key: 'before_applying',    label: 'Before Applying' },
  { key: 'during_application', label: 'During Application' },
  { key: 'after_disbursement', label: 'After Loan Disbursement' },
];

export const JOURNEY_STAGE_LABEL = {
  before_applying: 'Before Applying',
  during_application: 'During Application',
  after_disbursement: 'After Loan Disbursement',
};

// --- Complaint categories grouped by journey stage ---
export const COMPLAINT_CATEGORIES = {
  before_applying: [
    'Poor service',
    'Information not provided',
    'Delayed response',
    'Difficulty contacting staff',
    'Other',
  ],
  during_application: [
    'Application delays',
    'Missing feedback',
    'Staff conduct',
    'Documentation issues',
    'Other',
  ],
  after_disbursement: [
    'Follow-up service',
    'Payment issues',
    'Customer support issues',
    'Incorrect information',
    'Other',
  ],
};

// ---------------------------------------------------------------------
// COMPLAINT LIFECYCLE  (§1)
// Created → Assigned → In Progress → Customer Contacted →
// Pending Customer → Escalated → Resolved → Closed
// ---------------------------------------------------------------------
export const COMPLAINT_STATUSES = [
  { key: 'created',          label: 'Created' },
  { key: 'assigned',         label: 'Assigned' },
  { key: 'in_progress',      label: 'In Progress' },
  { key: 'customer_contacted', label: 'Customer Contacted' },
  { key: 'pending_customer', label: 'Pending Customer' },
  { key: 'escalated',        label: 'Escalated' },
  { key: 'resolved',         label: 'Resolved' },
  { key: 'closed',           label: 'Closed' },
];

export const complaintStatusLabel = (key) =>
  COMPLAINT_STATUSES.find((s) => s.key === key)?.label || key;

// All non-terminal statuses (used for queue position and aging)
export const OPEN_COMPLAINT_STATUSES = [
  'created', 'assigned', 'in_progress', 'customer_contacted', 'pending_customer', 'escalated',
];

// Status-to-badge-tone map (consumed by UI.Badge)
export const STATUS_TONE = {
  created: 'open',
  assigned: 'in_progress',
  in_progress: 'in_progress',
  customer_contacted: 'in_progress',
  pending_customer: 'pending',
  escalated: 'escalated',
  resolved: 'resolved',
  closed: 'closed',
};

// ---------------------------------------------------------------------
// SEVERITY & PRIORITY (§14)
// Independent — both must be set on every complaint.
// ---------------------------------------------------------------------
export const COMPLAINT_SEVERITY = [
  { key: 'minor',    label: 'Minor' },
  { key: 'moderate', label: 'Moderate' },
  { key: 'major',    label: 'Major' },
  { key: 'critical', label: 'Critical' },
];

export const COMPLAINT_PRIORITY = [
  { key: 'low',    label: 'Low' },
  { key: 'medium', label: 'Medium' },
  { key: 'high',   label: 'High' },
  { key: 'urgent', label: 'Urgent' },
];

// ---------------------------------------------------------------------
// ROOT CAUSE TAXONOMY (§5) — required on closure
// ---------------------------------------------------------------------
export const ROOT_CAUSE_GROUPS = [
  {
    group: 'Service Issues',
    causes: [
      'Poor communication',
      'Delayed response',
      'No feedback to customer',
      'Staff conduct',
    ],
  },
  {
    group: 'Process Issues',
    causes: [
      'Approval delays',
      'Missing documents',
      'Workflow bottlenecks',
      'Unclear policy',
    ],
  },
  {
    group: 'System Issues',
    causes: [
      'Portal errors',
      'Notification failures',
      'Technical issues',
      'Integration outage',
    ],
  },
];

// Flat list (for filters)
export const ROOT_CAUSES = ROOT_CAUSE_GROUPS.flatMap((g) => g.causes);

// ---------------------------------------------------------------------
// SENTIMENT TAGS (§21) — internal only
// ---------------------------------------------------------------------
export const SENTIMENT_TAGS = [
  { key: 'positive',       label: 'Positive',       tone: 'resolved' },
  { key: 'neutral',        label: 'Neutral',        tone: 'open' },
  { key: 'negative',       label: 'Negative',       tone: 'in_progress' },
  { key: 'urgent_concern', label: 'Urgent Concern', tone: 'escalated' },
];

export const SENTIMENT_LABEL = Object.fromEntries(
  SENTIMENT_TAGS.map((s) => [s.key, s.label])
);

// ---------------------------------------------------------------------
// IMPROVEMENT FEEDBACK MODULE (§3)
// Separate from complaints — suggestions / process improvements.
// ---------------------------------------------------------------------
export const IMPROVEMENT_CATEGORIES = [
  'Staff Service',
  'Process Improvement',
  'Communication',
  'System Issues',
  'Branch Experience',
];

// ---------------------------------------------------------------------
// KNOWLEDGE BASE (§8)
// ---------------------------------------------------------------------
export const KB_CATEGORIES = [
  'Payment Issues',
  'Documentation Issues',
  'Service Complaints',
  'Communication Issues',
];

// ---------------------------------------------------------------------
// COMPLAINT AGING BUCKETS (§9)
// ---------------------------------------------------------------------
export const AGING_BUCKETS = [
  { key: '0-3',   label: '0–3 days',   min: 0,  max: 3,        slaRisk: 'ok' },
  { key: '4-7',   label: '4–7 days',   min: 4,  max: 7,        slaRisk: 'low' },
  { key: '8-14',  label: '8–14 days',  min: 8,  max: 14,       slaRisk: 'medium' },
  { key: '15-30', label: '15–30 days', min: 15, max: 30,       slaRisk: 'high' },
  { key: '30+',   label: '30+ days',   min: 31, max: Infinity, slaRisk: 'critical' },
];

// Service-level agreement: a case open longer than this is a breach.
export const SLA_BREACH_DAYS = 14;

// --- Client classification ---
export const CLIENT_TYPES = [
  { key: 'new',      label: 'New Client' },
  { key: 'existing', label: 'Existing Client' },
];

export const CLIENT_TYPE_LABEL = {
  new: 'New Client',
  existing: 'Existing Client',
};

// --- Ticket numbering ---
export const TICKET_PREFIX = 'TCN';
export function formatTicket(num) {
  return `${TICKET_PREFIX}-${String(num).padStart(4, '0')}`;
}

// Anonymous ID format: ANON-XXXXXX
export function formatAnonymousId(num) {
  return `ANON-${String(num).padStart(6, '0')}`;
}

// --- Roles ---
export const ROLES = ['customer', 'portfolio_manager', 'service_manager', 'director', 'marketing', 'admin'];

export const ROLE_LABELS = {
  customer: 'Client',
  portfolio_manager: 'Portfolio Manager',
  service_manager: 'Service Manager',
  director: 'Director',
  marketing: 'Marketing',
  admin: 'Administrator',
};

export const ROLE_PROFILE_PATH = {
  customer: '/client/profile',
  portfolio_manager: '/pm/profile',
  service_manager: '/service-manager/profile',
  director: '/director/profile',
  marketing: '/marketing/profile',
  admin: '/admin/profile',
};

// ---------------------------------------------------------------------
// ROLE-BASED DATA ACCESS (§23)
// ---------------------------------------------------------------------
export const ACCESS_MATRIX = {
  portfolio_manager: { ownBranch: true,  otherBranches: false, national: false, identityVisible: true,            canSeeInternalNotes: true,  canEditAuditLog: false },
  service_manager:   { ownBranch: true,  otherBranches: false, national: false, identityVisible: true,            canSeeInternalNotes: true,  canEditAuditLog: false },
  admin:             { ownBranch: true,  otherBranches: true,  national: true,  identityVisible: 'masked_anon',   canSeeInternalNotes: true,  canEditAuditLog: false },
  director:          { ownBranch: true,  otherBranches: true,  national: true,  identityVisible: 'masked_anon',   canSeeInternalNotes: true,  canEditAuditLog: false },
  marketing:         { ownBranch: false, otherBranches: false, national: true,  identityVisible: false,           canSeeInternalNotes: false, canEditAuditLog: false },
  customer:          { ownBranch: false, otherBranches: false, national: false, identityVisible: false,           canSeeInternalNotes: false, canEditAuditLog: false },
};

// --- Referral sources ---
export const REFERRAL_SOURCES = [
  'Facebook',
  'WhatsApp',
  'Google Search',
  'Friend or Family Referral',
  'Walk-in',
  'Radio / Newspaper',
  'CEDA Referral',
  'Business Partner Referral',
  'Existing Customer Referral',
  'Other',
];

export const REFERRAL_RECORDED_BY = ['Self Registration', 'Portfolio Manager', 'Service Manager', 'System Import'];

// --- Lead lifecycle ---
export const LEAD_STATUSES = ['New', 'Contacted', 'Interested', 'Converted', 'Lost'];

export const LEAD_STATUS_BADGE = {
  New: 'open',
  Contacted: 'in_progress',
  Interested: 'in_progress',
  Converted: 'resolved',
  Lost: 'closed',
};

export const BRANCHES = ['Gaborone', 'Francistown', 'Maun', 'Palapye', 'Phikwe'];

// Approximate latitude/longitude for the heat map (§19)
export const BRANCH_COORDS = {
  Gaborone:    { lat: -24.6282, lng: 25.9231, region: 'South East' },
  Francistown: { lat: -21.1670, lng: 27.5128, region: 'North East' },
  Maun:        { lat: -19.9833, lng: 23.4167, region: 'North West' },
  Palapye:     { lat: -22.5500, lng: 27.1333, region: 'Central' },
  Phikwe:      { lat: -22.0167, lng: 27.8333, region: 'Central' },
};

export const INTERESTED_PRODUCTS = [
  'PO Financing',
  'Invoice Financing',
  'Business Loan',
  'Asset Finance',
  'Vehicle Finance',
  'Insurance',
  'General Enquiry',
];

// ---- Branch details with coordinates ----
export const BRANCH_INFO = {
  Gaborone: {
    name: 'Gaborone Branch',
    address: 'Plot 54361, CBD, Gaborone',
    phone: '+267 395 1234',
    email: 'gaborone@ticanogroup.co.bw',
    hours: 'Mon–Fri: 08:00–17:00',
    lat: -24.6545,
    lng: 25.9086,
    areas: ['gaborone','gabs','cbd','broadhurst','tlokweng','mogoditshane','gabz'],
  },
  Francistown: {
    name: 'Francistown Branch',
    address: 'Blue Jacket Street, Francistown',
    phone: '+267 241 5678',
    email: 'francistown@ticanogroup.co.bw',
    hours: 'Mon–Fri: 08:00–17:00',
    lat: -21.1667,
    lng: 27.5167,
    areas: ['francistown','francistown','monarch','tati','nyangabgwe'],
  },
  Maun: {
    name: 'Maun Branch',
    address: 'Ngami Centre, Maun',
    phone: '+267 686 9012',
    email: 'maun@ticanogroup.co.bw',
    hours: 'Mon–Fri: 08:00–16:30',
    lat: -19.9833,
    lng: 23.4167,
    areas: ['maun','maun','okavango','shorobe','matlapana'],
  },
  Palapye: {
    name: 'Palapye Branch',
    address: 'Palapye Mall, Palapye',
    phone: '+267 492 3456',
    email: 'palapye@ticanogroup.co.bw',
    hours: 'Mon–Fri: 08:00–17:00',
    lat: -22.5500,
    lng: 27.1333,
    areas: ['palapye','serowe','lerala','mmadinare'],
  },
  Phikwe: {
    name: 'Selebi-Phikwe Branch',
    address: 'Botshabelo Mall, Selebi-Phikwe',
    phone: '+267 261 7890',
    email: 'phikwe@ticanogroup.co.bw',
    hours: 'Mon–Fri: 08:00–17:00',
    lat: -21.9833,
    lng: 27.8333,
    areas: ['phikwe','selebi','selebi-phikwe','selibe','selebi phikwe'],
  },
};

// ---- FAQ Data for TicanoConnect ----
export const FAQS = [
  { q: 'What is Purchase Order (PO) Financing?', a: 'PO Financing is a short-term funding solution where Ticano pays your suppliers on your behalf when you have a confirmed purchase order. You repay Ticano once your client pays you.' },
  { q: 'Who is eligible for PO Financing?', a: 'Any registered Botswana business with a valid purchase order from a creditworthy buyer. You need to be registered with BURS and have a valid business account.' },
  { q: 'What documents do I need to apply?', a: 'You need: a valid purchase order, your business registration certificate, last 6 months bank statements, BURS tax clearance certificate, and a valid ID.' },
  { q: 'How long does the approval process take?', a: 'Once all documents are submitted, approval takes 3–5 business days. Urgent applications can be processed in 24–48 hours subject to eligibility.' },
  { q: 'What percentage of the PO value do you finance?', a: 'Ticano finances up to 80% of the confirmed purchase order value, depending on your credit profile and the buyer\'s creditworthiness.' },
  { q: 'What are the interest rates?', a: 'Interest rates are competitive and tailored to your business profile. Contact your nearest branch or your Portfolio Manager for a personalised quote.' },
  { q: 'How do I repay?', a: 'Repayment happens when your client (the buyer) pays for the goods or services. The repayment is structured around your payment terms with the buyer.' },
  { q: 'Can a new business apply?', a: 'Yes — we welcome new businesses. You\'ll need a confirmed purchase order, business registration, and valid ID. A Portfolio Manager will guide you through the process.' },
  { q: 'How do I submit a complaint?', a: 'You can submit a complaint directly through this platform under "Submit a Complaint", visit any branch, call our head office, or email us. We respond within 24 hours.' },
  { q: 'How do I check my complaint status?', a: 'Log in and go to "My Complaints" — you\'ll see the full status and timeline of all your complaints in real time.' },
  { q: 'What is the SLA for complaints?', a: 'Ticano commits to resolving all complaints within 14 business days. Escalated complaints are prioritised and handled within 5 business days.' },
  { q: 'How do I contact Ticano?', a: 'Visit any of our 5 branches, call the branch directly, or visit ticanogroup.co.bw for full contact details. You can also reach us via WhatsApp on the numbers listed per branch.' },
  { q: 'Where are your branches?', a: 'We have 5 branches: Gaborone (CBD), Francistown (Blue Jacket St), Maun (Ngami Centre), Palapye (Palapye Mall), and Selebi-Phikwe (Botshabelo Mall).' },
  { q: 'What is Ticano Group?', a: 'Ticano Group is a Botswana-based financial services company specialising in Purchase Order Financing, helping SMEs and businesses access funding against confirmed purchase orders.' },
];

