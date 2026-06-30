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
    'Interest Issues',
    'Customer support issues',
    'Incorrect information',
    'Other',
  ],
};

// Examples shown as helper text when "Interest Issues" is selected:
// interest disputes, interest calculation concerns, interest charge enquiries.
export const CATEGORY_HINTS = {
  'Interest Issues': 'e.g. interest disputes, interest calculation concerns, or interest charge enquiries',
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
    name: 'Gaborone Head Office',
    address: '5th Floor, Block C, Zambezi Towers, CBD, Gaborone',
    phone: '+267 318 1888',
    mobile: '+267 74 306 295',
    email: 'info@ticanogroup.co.bw',
    hours: 'Mon–Fri: 08:00–17:00, Sat: 09:00–12:00',
    lat: -24.6545,
    lng: 25.9086,
    areas: ['gaborone','gabs','cbd','broadhurst','tlokweng','mogoditshane','gabz'],
  },
  Francistown: {
    name: 'Francistown Branch',
    address: 'Blue Jacket Street, Francistown',
    phone: '+267 247 0685',
    mobile: '+267 73 434 064',
    email: 'francistown@ticanogroup.co.bw',
    hours: 'Mon–Fri: 08:00–17:00, Sat: 09:00–12:00',
    lat: -21.1667,
    lng: 27.5167,
    areas: ['francistown','monarch','tati','nyangabgwe'],
  },
  Maun: {
    name: 'Maun Branch',
    address: 'Ngami Centre, Maun',
    phone: '+267 686 0182',
    mobile: '+267 73 053 343',
    email: 'maun@ticanogroup.co.bw',
    hours: 'Mon–Fri: 08:00–16:30, Sat: 09:00–12:00',
    lat: -19.9833,
    lng: 23.4167,
    areas: ['maun','okavango','shorobe','matlapana'],
  },
  Palapye: {
    name: 'Palapye Branch',
    address: 'Palapye Mall, Palapye',
    phone: '+267 492 5077',
    mobile: '+267 73 589 338',
    email: 'palapye@ticanogroup.co.bw',
    hours: 'Mon–Fri: 08:00–17:00, Sat: 09:00–12:00',
    lat: -22.5500,
    lng: 27.1333,
    areas: ['palapye','serowe','lerala','mmadinare'],
  },
  Phikwe: {
    name: 'Selebi-Phikwe Branch',
    address: 'Botshabelo Mall, Selebi-Phikwe',
    phone: '+267 265 0038',
    mobile: '+267 73 475 757',
    email: 'phikwe@ticanogroup.co.bw',
    hours: 'Mon–Fri: 08:00–17:00, Sat: 09:00–12:00',
    lat: -21.9833,
    lng: 27.8333,
    areas: ['phikwe','selebi','selebi-phikwe','selibe','selebi phikwe'],
  },
};

// ---- Verified company profile (source: ticanogroup.co.bw + public records) ----
// Used to seed admin-editable public site content.
export const COMPANY_PROFILE = {
  legalName: 'Ticano Group (Pty) Ltd',
  tradingName: 'Ticano',
  founded: '2015',
  founder: 'Opelo C.T. Motswagae, Executive Director',
  regulator: 'Non-Bank Financial Institutions Regulatory Authority (NBFIRA)',
  endorsement: 'Economic Diversification Drive (EDD) endorsement — Ministry of Trade and Industry',
  tagline: 'No one should be small forever.',
  headOffice: '5th Floor, Block C, Zambezi Towers, CBD, Gaborone, Botswana',
  phone: '+267 318 1888',
  email: 'info@ticanogroup.co.bw',
  website: 'https://ticanogroup.co.bw',
  about:
    'Ticano Group is an enterprise development financial services firm registered in Botswana and regulated by NBFIRA. Established in 2015, Ticano provides unique and creative financial solutions for growing businesses, championing Purchase Order Financing and Invoice Discounting for the SME market. Credit decisions are based on the creditworthiness of the SME\u2019s buyer and the strength of the transaction itself, rather than relying solely on the SME\u2019s balance sheet.',
  services: [
    'Purchase Order Financing',
    'Invoice Discounting',
    'Contract Financing',
    'Asset Backed Funding',
    'SME Financial Advisory',
  ],
  fundingModel:
    'Ticano pays the SME\u2019s supplier so a confirmed order can be fulfilled, then recovers the cost plus an agreed margin once the SME\u2019s customer (often government, parastatals, or large corporates) pays. Typical cash conversion cycles range from 30 to 120 days, with a cap of 180 days for imported large-transaction goods.',
};

// Mission and Vision (mission is verbatim-attributable to Ticano; vision is
// editable by Admin from the Website Content panel).
export const COMPANY_MISSION =
  'To promote the growth of a sustainable small and growing business sector, and to empower SMEs to act as major employers and contributors to economic growth and social development in districts across Botswana. We focus on our clients\u2019 cash flow so they can focus on their core business — because no one should be small forever.';

export const COMPANY_VISION =
  'To be Botswana\u2019s most trusted partner in creative SME finance — bridging the funding gap so that every capable business can deliver on time, win bigger orders, and build a lasting, inclusive economy.';

// ---- FAQ Data for the public site ----
export const FAQS = [
  { q: "What is Purchase Order Financing?", a: "PO Financing is a short-term funding solution where Ticano pays your suppliers on your behalf when you have a confirmed purchase order from a creditworthy buyer. You repay Ticano once your client pays you — meaning you can fulfil orders without needing cash upfront." },
  { q: "What is Invoice Discounting?", a: "Invoice Discounting allows you to unlock cash tied up in unpaid invoices. Ticano advances you a percentage of your outstanding invoices immediately, so you do not have to wait for your clients to pay. You repay when they settle their invoice." },
  { q: "What is the difference between PO Financing and Invoice Discounting?", a: "PO Financing is used before you deliver goods — it pays your supplier so you can fulfil an order. Invoice Discounting is used after delivery — it unlocks cash from invoices you have already issued but have not been paid for yet. Both solve cash flow problems at different stages." },
  { q: "Who is eligible for PO Financing?", a: "Any registered Botswana business with a valid purchase order from a creditworthy buyer is eligible. You need to be registered with BURS, have a valid business bank account, and have a confirmed PO from an established buyer. Both new and established businesses can apply." },
  { q: "Who is eligible for Invoice Discounting?", a: "Businesses that issue invoices to established clients and have a track record of collections. You need a registered business, BURS clearance, and invoices from creditworthy clients." },
  { q: "What percentage of the PO or invoice value do you finance?", a: "Ticano finances up to 80% of the confirmed purchase order or invoice value. The exact percentage depends on your credit profile, the buyer's creditworthiness, and the nature of the transaction." },
  { q: "What are the interest rates?", a: "Interest rates are competitive and tailored to your business profile, the buyer's risk, and the transaction size. No amount is too big or too small for us. Contact your nearest branch or Portfolio Manager for a personalised quote." },
  { q: "How long does the approval process take?", a: "Standard approval takes 3 to 5 business days once all documents are submitted. Urgent applications may be processed in 24 to 48 hours subject to eligibility and document completeness." },
  { q: "How do I repay?", a: "Repayment is aligned with your buyer's payment terms. When your client pays for the goods or services, the funds are used to repay Ticano. You keep the profit margin after repayment." },
  { q: "What documents do I need to apply?", a: "You will need: (1) The confirmed purchase order or invoice, (2) Business registration certificate, (3) Last 6 months bank statements, (4) BURS tax clearance certificate, (5) Valid national ID or passport, (6) Proof of business address. Additional documents may be requested based on transaction size." },
  { q: "Can a new business apply?", a: "Yes — Ticano welcomes new businesses. You need a confirmed purchase order, business registration, BURS clearance, and valid ID. Our Portfolio Managers are experienced in helping new businesses structure their first application." },
  { q: "Do I need collateral?", a: "PO Financing and Invoice Discounting are generally asset-light — the purchase order or invoice itself acts as security. However, depending on the transaction size and risk profile, additional security may be discussed with your Portfolio Manager." },
  { q: "Can I apply for both domestic and international transactions?", a: "Yes. Ticano is innovative in our approach to both domestic and international transactions. We have experience financing cross-border deals and can structure solutions for import and export scenarios." },
  { q: "What is Ticano Group?", a: "Ticano Group is Botswana's champion for Purchase Order Financing and Invoice Discounting. We pride ourselves with expert trade finance knowledge, quick turnaround times, good interest rates, and our focus on helping SMEs grow. No one should be small forever — no amount is too big or too small for us." },
  { q: "What is your mission?", a: "Our mission is to promote the growth of a sustainable small and growing business sector, and to empower SMEs to act as major employers and contributors to economic growth and social development across Botswana. We focus on your cash flow so you can focus on your core business — because no one should be small forever." },
  { q: "When was Ticano founded and who regulates you?", a: "Ticano Group was established in 2015 by Executive Director Opelo C.T. Motswagae. We are an enterprise development financial services firm registered in Botswana and regulated by the Non-Bank Financial Institutions Regulatory Authority (NBFIRA), with an Economic Diversification Drive endorsement from the Ministry of Trade and Industry." },
  { q: "How do I contact Ticano head office?", a: "Our head office is on the 5th Floor, Block C, Zambezi Towers, CBD, Gaborone. You can call us on +267 318 1888, email info@ticanogroup.co.bw, or visit ticanogroup.co.bw." },
  { q: "Where are your branches?", a: "We have 5 branches across Botswana: Gaborone (CBD), Francistown (Blue Jacket Street), Maun (Ngami Centre), Palapye (Palapye Mall), and Selebi-Phikwe (Botshabelo Mall). You can also contact us via our website at ticanogroup.co.bw." },
  { q: "What is your website?", a: "Our official website is ticanogroup.co.bw. You can find full information on our services, branch locations, and how to get started there." },
  { q: "How do I submit a complaint?", a: "You can submit a complaint directly through the Client Portal under Submit a Complaint, visit any Ticano branch, call the branch directly, or email us. We acknowledge all complaints within 24 hours." },
  { q: "How do I check my complaint status?", a: "Log in to your Ticano Client Portal and go to My Complaints. You will see the full status, timeline, and updates on all your complaints in real time." },
  { q: "What is the SLA for complaints?", a: "Ticano commits to resolving all complaints within 14 business days. Escalated complaints are prioritised and handled within 5 business days. You will receive status updates throughout the process." },
  { q: "What if my complaint is not resolved in time?", a: "If your complaint is not resolved within 14 business days, it is automatically escalated to senior management. You will be notified and a senior team member will contact you within 2 business days." },
  { q: "How does PO Financing help SMEs grow?", a: "PO Financing is an effective short-term financing tool when you are short of cash to pay for goods or materials needed to fulfil a customer's order. Instead of turning down large orders because of cash constraints, Ticano bridges the gap so you can deliver and grow your client base." },
  { q: "Is there a minimum or maximum amount?", a: "No amount is too big or too small for us. Whether you have a small order or a large international deal, we have a solution. Our Portfolio Managers will work with you to structure the right financing for your needs." },
  { q: "What types of businesses do you work with?", a: "We work with businesses across all sectors including retail, manufacturing, construction, agriculture, services, and trade. As long as you have a confirmed purchase order or invoice from a creditworthy buyer, we can help." },
  { q: "How do I opt in to WhatsApp updates?", a: "Go to your profile in the Client Portal and toggle on WhatsApp notifications. You will receive real-time updates on your complaint status and important account updates directly on WhatsApp." },
  { q: "How do I update my contact details?", a: "Go to My Profile in the Client Portal to update your contact information, WhatsApp number, and communication preferences. Any changes take effect immediately." },
  { q: "How do I contact my Portfolio Manager?", a: "Your assigned Portfolio Manager's contact details are visible in the My Profile section of the Client Portal. You can also send them a message through the portal or call your branch directly." },
  { q: "One in three companies have not heard of invoice financing", a: "That is exactly why Ticano exists — to educate and empower businesses across Botswana. Many businesses are leaving growth opportunities on the table simply because they do not know these financial tools exist. We are changing that." },
];

