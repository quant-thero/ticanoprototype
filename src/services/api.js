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
  COMPANY_PROFILE,
  COMPANY_MISSION,
  COMPANY_VISION,
  BRANCH_COORDS,
} from '../utils/constants';

const delay = (ms = 350) => new Promise((res) => setTimeout(res, ms));
const ok = async (data, ms) => { await delay(ms); return { data }; };
const clone = (o) => JSON.parse(JSON.stringify(o));

// ---------------------------------------------------------------------
//  SITE SETTINGS — admin-editable public landing-page content
//  (contact details, social links, mission/vision, legal documents)
// ---------------------------------------------------------------------
const legalDoc = (content) => ({ published: content, draft: content, revisions: [], updatedAt: '2026-01-01T00:00:00' });

let SITE_SETTINGS = {
  contactEmail: COMPANY_PROFILE.email,
  contactPhone: COMPANY_PROFILE.phone,
  mission: COMPANY_MISSION,
  vision: COMPANY_VISION,
  // Each social platform: { url, enabled }. Disabled or url-less platforms are
  // hidden on the public site.
  social: {
    facebook:  { url: 'https://www.facebook.com/ticanosmefinance', enabled: true },
    instagram: { url: '', enabled: false },
    linkedin:  { url: 'https://bw.linkedin.com/company/ticano-sme-finance', enabled: true },
    twitter:   { url: '', enabled: false },
    whatsapp:  { url: 'https://wa.me/26731818888', enabled: true },
    youtube:   { url: '', enabled: false },
    tiktok:    { url: 'https://www.tiktok.com/tag/ticanogroup', enabled: true },
  },
  // Footer branch contact numbers — admin editable.
  branchContacts: [
    { name: 'Gaborone',      phone: '+267 77 416 877',   placeholder: false },
    { name: 'Francistown',   phone: '+267 77 342 979',   placeholder: false },
    { name: 'Maun',          phone: '+267 71 000 003',   placeholder: false },
    { name: 'Selebi-Phikwe', phone: '+267 73 884 215',   placeholder: false },
    { name: 'Palapye',       phone: '+267 75 209 463',   placeholder: false },
  ],
  // Editable homepage copy (Admin → Landing Page Management). The public
  // homepage reads these, falling back to built-in defaults if blank.
  homepage: {
    heroBadge: "Botswana's #1 Trade Finance Platform",
    heroTitle: 'As Your Business Grows, We Deliver The Funds.',
    heroSubtitle: "Ticano is Botswana's champion for Purchase Order Financing and Invoice Discounting — helping SMEs access the capital they need to fulfil orders and grow.",
    heroQuote: 'No one should be small forever. No amount is too big or too small for us.',
    ctaPrimary: 'Get Started',
    ctaSecondary: 'Our Services',
    stat1Value: '642+', stat1Label: 'Active clients',
    stat2Value: '5',    stat2Label: 'Branch locations',
    stat3Value: '99.8%', stat3Label: 'Uptime',
    aboutHeading: 'The Ticano Difference',
    // Editable service cards (title/desc/highlight/long). Icons and feature
    // bullets come from built-in defaults, matched by position.
    services: [
      { title: 'Purchase Order Financing', desc: 'We pay your suppliers so you can fulfil confirmed orders — without waiting for your own cash. Ideal for businesses with large orders and limited working capital.', highlight: 'Up to 80% of PO value', long: 'Purchase Order Financing lets you accept and deliver on large confirmed orders even when you don\u2019t have the upfront cash to pay suppliers. Ticano settles your supplier directly so production or delivery can begin, then recovers the amount plus an agreed margin once your customer pays. Because we look at the strength of the order and the creditworthiness of your buyer — not just your balance sheet — growing SMEs qualify where traditional lenders say no.' },
      { title: 'Invoice Discounting', desc: 'Unlock cash tied up in unpaid invoices immediately. Stop waiting 30, 60, or 90 days for clients to pay. Get your money when you need it.', highlight: 'Fast access to capital', long: 'Invoice Discounting turns your unpaid invoices into immediate working capital. Instead of waiting 30, 60 or 90 days for your customers to settle, Ticano advances you a large portion of the invoice value now, and you receive the balance (less our fee) once the invoice is paid. It keeps your cash flow steady so you can take on the next job without delay.' },
      { title: 'Contract Financing', desc: 'Funding to help you deliver on confirmed contracts with government, parastatals, and large corporates — so cash flow never stands between you and a signed deal.', highlight: 'Deliver with confidence', long: 'Contract Financing supports businesses that have won contracts with government, parastatals, or large corporates but need capital to execute them. We structure funding around the contract\u2019s milestones and payment terms so you can mobilise, deliver, and grow your track record with confidence.' },
      { title: 'SME Advisory', desc: 'Our experienced Portfolio Managers provide personalised trade finance advice, helping your business structure deals, understand risks, and scale confidently.', highlight: 'Expert guidance', long: 'Beyond funding, Ticano\u2019s Portfolio Managers work with you to structure deals, understand risk, and plan for growth. Whether you\u2019re pricing a tender, negotiating supplier terms, or planning expansion, you get practical, Botswana-focused advice from a team that understands the SME journey.' },
    ],
  },
  // Editable login-page copy (Admin → Landing Page Management).
  loginPage: {
    brandSubtitle: 'Service Intelligence Platform',
    heroTitle: 'As Your Business Grows, We Deliver The Funds.',
    heroSubtitle: "Botswana's champion for Purchase Order Financing & Invoice Discounting.",
    welcomeTitle: 'Welcome back',
    welcomeSubtitle: 'Sign in to your workspace',
  },
  legal: {
    privacy: legalDoc('Ticano Group respects your privacy. We collect only the personal information necessary to assess and service your financing applications, and we process it in line with Botswana data-protection requirements and NBFIRA regulation. We never sell your data. You may request access to, or correction of, your information by contacting info@ticanogroup.co.bw.'),
    terms: legalDoc('These Terms of Service govern your use of the Ticano platform. Financing products such as Purchase Order Financing and Invoice Discounting are subject to eligibility assessment, documentation, and approval. Approved facilities are governed by the signed facility agreement. Ticano Group (Pty) Ltd is regulated by NBFIRA.'),
    cookie: legalDoc('This website uses cookies to keep you signed in, remember your preferences, and understand how the site is used so we can improve it. Essential cookies are always on; non-essential cookies are used only with your consent. You can manage cookies in your browser settings at any time.'),
  },
};

// Audit trail for landing-page content changes (§6).
let SITE_AUDIT = [];
let NEXT_SITE_AUDIT = 1;
const logSiteAudit = (section, previousValue, newValue, user) => {
  SITE_AUDIT.unshift({
    id: NEXT_SITE_AUDIT++,
    section,
    user: user || 'Admin',
    at: new Date().toISOString(),
    previousValue: typeof previousValue === 'string' ? previousValue : JSON.stringify(previousValue),
    newValue: typeof newValue === 'string' ? newValue : JSON.stringify(newValue),
  });
};

export const getSiteAudit = () => ok([...SITE_AUDIT]);

export const getSiteSettings = () => ok(clone(SITE_SETTINGS));

// =====================================================================
//  HOMEPAGE ANNOUNCEMENT (Director) + HOMEPAGE PROMO (Marketing)
//  Two independently-managed homepage widgets:
//   - The Director can publish a single announcement strip to the homepage.
//   - Marketing can publish a promotional banner OR pop-up to the homepage.
// =====================================================================
let HOMEPAGE_ANNOUNCEMENT = {
  enabled: true,
  text: 'Ticano now finances imported large-transaction goods up to 180-day cycles — talk to your branch today.',
  link: '',
  updatedBy: 'Director',
  updatedAt: '2026-06-01T09:00:00',
};
export const getHomepageAnnouncement = () => ok(clone(HOMEPAGE_ANNOUNCEMENT));
export const setHomepageAnnouncement = (data, user = 'Director') => {
  HOMEPAGE_ANNOUNCEMENT = { ...HOMEPAGE_ANNOUNCEMENT, ...data, updatedBy: user, updatedAt: new Date().toISOString() };
  return ok({ message: 'Homepage announcement updated', announcement: clone(HOMEPAGE_ANNOUNCEMENT) });
};

let HOMEPAGE_PROMO = {
  enabled: false,
  mode: 'banner', // 'banner' (top strip) | 'popup' (modal on load)
  title: 'Apply before month-end',
  message: 'Get your Purchase Order financed in as little as 24 hours. Limited-time fast-track applications now open.',
  ctaLabel: 'Apply now',
  ctaLink: '/register',
  theme: 'red', // 'red' | 'charcoal' | 'light'
  updatedBy: 'Marketing',
  updatedAt: '2026-06-01T09:00:00',
};
export const getHomepagePromo = () => ok(clone(HOMEPAGE_PROMO));
export const setHomepagePromo = (data, user = 'Marketing') => {
  HOMEPAGE_PROMO = { ...HOMEPAGE_PROMO, ...data, updatedBy: user, updatedAt: new Date().toISOString() };
  return ok({ message: 'Homepage promotion updated', promo: clone(HOMEPAGE_PROMO) });
};

export const updateSiteSettings = (patch = {}, user = 'Admin') => {
  const prev = clone(SITE_SETTINGS);

  // Merge legal docs: pushing a revision whenever published content changes.
  let legal = SITE_SETTINGS.legal;
  if (patch.legal) {
    legal = { ...SITE_SETTINGS.legal };
    Object.entries(patch.legal).forEach(([key, doc]) => {
      const current = SITE_SETTINGS.legal[key] || legalDoc('');
      const next = { ...current, ...doc };
      // If publishing new content, archive the old published version.
      if (doc.published !== undefined && doc.published !== current.published) {
        next.revisions = [{ content: current.published, at: current.updatedAt, by: user }, ...(current.revisions || [])].slice(0, 20);
        next.updatedAt = new Date().toISOString();
        logSiteAudit(`Legal: ${key}`, current.published, doc.published, user);
      }
      legal[key] = next;
    });
  }

  // Merge social per-platform.
  let social = SITE_SETTINGS.social;
  if (patch.social) {
    social = { ...SITE_SETTINGS.social };
    Object.entries(patch.social).forEach(([k, v]) => {
      social[k] = { ...(SITE_SETTINGS.social[k] || { url: '', enabled: false }), ...v };
    });
    logSiteAudit('Social links', prev.social, social, user);
  }

  if (patch.branchContacts) logSiteAudit('Branch contacts', prev.branchContacts, patch.branchContacts, user);
  if (patch.homepage) logSiteAudit('Homepage content', JSON.stringify(prev.homepage), JSON.stringify({ ...prev.homepage, ...patch.homepage }), user);
  if (patch.loginPage) logSiteAudit('Login page content', JSON.stringify(prev.loginPage), JSON.stringify({ ...prev.loginPage, ...patch.loginPage }), user);
  ['contactEmail', 'contactPhone', 'mission', 'vision'].forEach((f) => {
    if (patch[f] !== undefined && patch[f] !== SITE_SETTINGS[f]) logSiteAudit(f, SITE_SETTINGS[f], patch[f], user);
  });

  SITE_SETTINGS = {
    ...SITE_SETTINGS,
    ...patch,
    social,
    legal,
    branchContacts: patch.branchContacts || SITE_SETTINGS.branchContacts,
    homepage: patch.homepage ? { ...SITE_SETTINGS.homepage, ...patch.homepage } : SITE_SETTINGS.homepage,
    loginPage: patch.loginPage ? { ...SITE_SETTINGS.loginPage, ...patch.loginPage } : SITE_SETTINGS.loginPage,
  };
  return ok({ message: 'Landing page content updated', settings: clone(SITE_SETTINGS) });
};

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

export const registerCustomer = (data) =>
  ok({ token: 'mock-jwt-token.newuser', userId: 99, name: data?.name || 'New Customer', role: 'customer', branch: data?.preferredBranch || 'Gaborone', clientType: 'new' });

// ---- Password reset ----
// Self-service reset is for CLIENTS only. Employees cannot self-reset — their
// passwords are reset by an Admin, who issues a temporary password.
const STAFF_ROLE_KEYS = ['portfolio_manager', 'service_manager', 'director', 'marketing', 'admin'];

export const requestPasswordReset = async (email) => {
  await delay();
  const key = String(email || '').trim().toLowerCase();
  if (!key || !key.includes('@')) {
    const err = new Error('Invalid email');
    err.response = { status: 400, data: { message: 'Please enter a valid email address.' } };
    throw err;
  }
  const known = DEMO_USERS[key];
  // A known staff account, or an internal @ticano address, is staff → blocked.
  const isStaff = (known && STAFF_ROLE_KEYS.includes(known.role)) || /@ticano(group)?\.(bw|co\.bw)$/.test(key);
  if (isStaff) {
    const err = new Error('Staff cannot self-reset');
    err.response = { status: 403, data: { code: 'STAFF_NO_SELF_RESET', message: 'Employee passwords cannot be reset here. Please ask your Administrator to reset your password.' } };
    throw err;
  }
  // Customer self-reset — email verification link (simulated)
  return ok({ message: 'If an account exists for that email, a password reset link has been sent.', email: key, channel: 'email' });
};

// Admin-initiated reset for an employee. Generates a temporary password the
// employee must change on next login.
export const adminResetUserPassword = (id) => {
  const temp = `TCN-Temp-${Math.floor(1000 + Math.random() * 9000)}`;
  return ok({ message: 'Temporary password generated', id, tempPassword: temp, mustChangeOnNextLogin: true });
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
    voiceNote: data.voiceNote || null,
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
  const c = _applyToComplaint(complaintId, (c) => ({
    ...c,
    assignedPmId: data.pmId,
    assignedPmName: data.pmName,
    status: 'assigned',
    timeline: [...c.timeline, { at: now, event: `Assigned to ${data.pmName}`, status: 'assigned', actor: data.assignedBy || 'Service Manager' }],
  }));
  if (c) logAudit(c, 'Assigned', prevStatus, 'assigned', data.assignedBy || 'Service Manager');
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

// Escalate to management — reason is mandatory.
export const escalateComplaint = (complaintId, data) => {
  if (!data.reason) {
    const err = new Error('Escalation reason required');
    err.response = { status: 400, data: { message: 'Escalation reason is required' } };
    throw err;
  }
  const now = new Date().toISOString();
  const before = COMPLAINTS.find((c) => c.id === Number(complaintId));
  const prev = before?.status;
  const c = _applyToComplaint(complaintId, (c) => ({
    ...c,
    status: 'escalated',
    escalation: { at: now, by: data.by || 'PM', reason: data.reason },
    timeline: [...c.timeline, { at: now, event: 'Escalated to Management', status: 'escalated', actor: data.by || 'PM' }],
  }));
  if (c) logAudit(c, 'Escalated', prev, 'escalated', data.by || 'PM');
  return ok({ message: 'Complaint escalated', complaintId });
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

export const getUsers = () => ok([
  { id: 2,  name: 'Mojaboswa',         email: 'pm@demo.com',        role: 'portfolio_manager', branch: 'Gaborone',    isActive: true,  createdAt: '2025-09-01T08:00:00' },
  { id: 3,  name: 'Janine Seabenyane', email: 'service@demo.com',   role: 'service_manager',   branch: 'Gaborone',    isActive: true,  createdAt: '2025-08-15T08:00:00' },
  { id: 4,  name: 'Opelo Motswagae',   email: 'director@demo.com',  role: 'director',          branch: 'Head Office', isActive: true,  createdAt: '2025-07-20T08:00:00' },
  { id: 9,  name: 'Onkarabile Sello',  email: 'osello@ticano.bw',   role: 'portfolio_manager', branch: 'Gaborone',    isActive: true,  createdAt: '2025-10-05T08:00:00' },
  { id: 12, name: 'Tebogo Nkosi',      email: 'tnkosi@ticano.bw',   role: 'portfolio_manager', branch: 'Maun',        isActive: false, createdAt: '2025-11-11T08:00:00' },
]);

export const createUser = (data) => ok({ message: 'User created', id: 100, ...data });
export const updateUser = (id, data) => ok({ message: 'User updated', id, ...data });
export const deleteUser = (id) => ok({ message: 'User deactivated', id });

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
  openHours: 'Mon–Fri 08:00–17:00, Sat 09:00–12:00',
  notes: '',
  lat: BRANCH_COORDS[b]?.lat ?? null,
  lng: BRANCH_COORDS[b]?.lng ?? null,
  region: BRANCH_COORDS[b]?.region || '',
}));

export const getBranches = () => ok([...BRANCH_DIRECTORY]);

// Active branches that have map coordinates — the single source the map,
// listings and search all read from.
export const getMapBranches = () =>
  ok(BRANCH_DIRECTORY.filter((b) => b.isActive && typeof b.lat === 'number' && typeof b.lng === 'number').map((b) => ({ ...b })));

export const createBranch = (data = {}) => {
  const id = Math.max(0, ...BRANCH_DIRECTORY.map((b) => b.id)) + 1;
  const branch = {
    id,
    name: (data.name || '').trim() || `Branch ${id}`,
    isActive: data.isActive !== false,
    address: data.address || '',
    city: data.city || data.name || '',
    country: data.country || 'Botswana',
    phone: data.phone || '',
    email: data.email || `${(data.name || 'branch').toLowerCase().replace(/\s+/g, '')}@ticano.co.bw`,
    manager: data.manager || '',
    openHours: data.openHours || 'Mon–Fri 08:00–17:00, Sat 09:00–12:00',
    notes: data.notes || '',
    region: data.region || '',
    lat: typeof data.lat === 'number' ? data.lat : (data.lat ? Number(data.lat) : null),
    lng: typeof data.lng === 'number' ? data.lng : (data.lng ? Number(data.lng) : null),
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
// Bulk import of leads from a parsed spreadsheet (Excel/CSV).
// Validates required fields, de-duplicates against existing + within-batch by
// phone (digits only) and name, and imports only the valid, unique rows.
export const importLeads = (rows = [], addedBy = 'Import') => {
  const norm = (s) => String(s ?? '').trim();
  const digits = (s) => norm(s).replace(/\D/g, '');
  const existingPhones = new Set(LEADS.map((l) => digits(l.phone)).filter(Boolean));
  const seenPhones = new Set();

  const imported = [];
  const duplicates = [];
  const invalid = [];

  rows.forEach((raw, i) => {
    const name = norm(raw.name);
    const phone = norm(raw.phone);
    const phoneKey = digits(phone);

    if (!name || !phone) {
      invalid.push({ row: i + 1, reason: 'Missing name or phone', data: raw });
      return;
    }
    if (phoneKey && (existingPhones.has(phoneKey) || seenPhones.has(phoneKey))) {
      duplicates.push({ row: i + 1, name, phone });
      return;
    }
    if (phoneKey) seenPhones.add(phoneKey);

    const lead = {
      id: Date.now() + i,
      name,
      phone,
      branch: norm(raw.branch) || 'Gaborone',
      product: norm(raw.product) || 'General Enquiry',
      referralSource: norm(raw.referralSource) || 'Spreadsheet Import',
      notes: norm(raw.notes),
      status: 'New',
      addedBy,
      addedAt: new Date().toISOString(),
    };
    imported.push(lead);
  });

  if (imported.length) LEADS = [...imported, ...LEADS];

  return ok({
    message: `${imported.length} potential client(s) imported`,
    summary: {
      received: rows.length,
      imported: imported.length,
      duplicates: duplicates.length,
      invalid: invalid.length,
    },
    importedLeads: imported,
    duplicates,
    invalid,
  });
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
    // Lower score = better. Workload dominates; ties broken by speed & satisfaction.
    const score = active * 10
      + pm.avgResolutionDays
      - (pm.satisfaction * 2)
      - (branchMatch * 8)
      - (categoryMatch * 4);
    return { ...pm, activeComplaints: active, branchMatch: !!branchMatch, categoryMatch: !!categoryMatch, score: Number(score.toFixed(2)) };
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
//  BRANCH HEALTH SCORE (§10) — Director only.
// =====================================================================
//   Resolution rate (40) + Escalation inverse (15) + Satisfaction (25) +
//   SLA compliance (15) + Volume balance (5)  = 100
export const getBranchHealthScores = () => {
  const data = BRANCHES.map((b) => {
    const branchComplaints = COMPLAINTS.filter((c) => c.branch === b);
    const total = branchComplaints.length || 1;
    const resolved = branchComplaints.filter((c) => c.status === 'resolved' || c.status === 'closed').length;
    const escalated = branchComplaints.filter((c) => c.status === 'escalated' || c.escalation).length;
    const slaBreaches = branchComplaints.filter((c) => OPEN_COMPLAINT_STATUSES.includes(c.status) && _daysOpen(c) > SLA_BREACH_DAYS).length;
    const surveys = branchComplaints.filter((c) => c.satisfaction).map((c) => c.satisfaction.rating);
    const avgCsat = surveys.length ? surveys.reduce((s, n) => s + n, 0) / surveys.length : 4.0;

    const resolutionPart  = (resolved  / total) * 40;
    const escalationPart  = (1 - escalated / total) * 15;
    const csatPart        = (avgCsat / 5) * 25;
    const slaPart         = Math.max(0, (1 - slaBreaches / Math.max(total, 1))) * 15;
    const volumePart      = 5; // simplified — full impl would normalize by population
    const score = Math.round(resolutionPart + escalationPart + csatPart + slaPart + volumePart);

    return {
      branch: b,
      score,
      grade: score >= 85 ? 'A' : score >= 75 ? 'B' : score >= 65 ? 'C' : score >= 55 ? 'D' : 'F',
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
//  NEW FEATURES — Reports, Announcements, Reassignment,
//  Client History, WhatsApp Templates, PM Scorecard
// =====================================================================

// =====================================================================
//  CLIENT IDENTIFICATION SYSTEM
//  Every client carries a unique, permanent, system-wide Client ID in the
//  format TIC-000001. Used in profiles, search, reports, WhatsApp/email
//  templates and notifications.
// =====================================================================
export const clientIdFor = (id) => `TIC-${String(Number(id)).padStart(6, '0')}`;

// =====================================================================
//  UNIFIED CLIENT DIRECTORY — single source for WhatsApp + Email search.
//  Joins the customer master list with their complaints so the messaging
//  modules can intelligently auto-populate template variables
//  (client name, Client ID, ticket / complaint number, PM).
// =====================================================================
const CLIENT_MASTER = [
  { id: 1, name: 'Stacey Nthoi',     email: 'stacey.nthoi@example.com',     phone: '+26771234567', branch: 'Gaborone',    clientType: 'existing', industry: 'Retail',        assignedPmName: 'Mojaboswa' },
  { id: 6, name: 'Boitumelo Rantao', email: 'boitumelo.rantao@example.com', phone: '+26772345678', branch: 'Gaborone',    clientType: 'existing', industry: 'Construction',  assignedPmName: 'Mojaboswa' },
  { id: 7, name: 'Mpho Kgosi',       email: 'mpho.kgosi@example.com',       phone: '+26773456789', branch: 'Gaborone',    clientType: 'new',      industry: 'Agriculture',   assignedPmName: 'Onkarabile Sello' },
  { id: 8, name: 'Tshepo Molefe',    email: 'tshepo.molefe@example.com',    phone: '+26774567890', branch: 'Francistown', clientType: 'new',      industry: 'Logistics',     assignedPmName: 'Kefilwe Moyo' },
];

export const getClientDirectory = (filters = {}) => {
  let rows = CLIENT_MASTER.map((c) => {
    const tickets = COMPLAINTS
      .filter((k) => k.customerId === c.id)
      .map((k) => ({
        id: k.id, ticket: k.ticket, complaintNumber: k.ticket,
        status: k.status, category: k.category, description: k.description,
        assignedPmName: k.assignedPmName, branch: k.branch,
      }));
    return { ...c, clientId: clientIdFor(c.id), tickets };
  });
  if (filters.branch) rows = rows.filter((c) => c.branch === filters.branch);
  if (filters.clientType) rows = rows.filter((c) => c.clientType === filters.clientType);
  if (filters.industry) rows = rows.filter((c) => c.industry === filters.industry);
  return ok(rows);
};

// Distinct industries (for marketing broadcast recipient filtering).
export const getClientIndustries = () => ok([...new Set(CLIENT_MASTER.map((c) => c.industry))].sort());

// =====================================================================
//  MARKETING — CLIENT QUESTIONNAIRES / SURVEYS
//  Marketing creates optional questionnaires; clients may complete or
//  ignore them. Marketing sees responses, completion rates and summaries.
// =====================================================================
let QUESTIONNAIRES = [
  {
    id: 1, title: 'Client Satisfaction Survey 2026', status: 'published',
    description: 'Help us serve you better — a few quick questions about your experience with Ticano.',
    createdAt: '2026-06-10T09:00:00', author: 'Marketing Team',
    questions: [
      { id: 'q1', type: 'rating', text: 'How would you rate your overall experience with Ticano?' },
      { id: 'q2', type: 'choice', text: 'Which service do you use most?', options: ['PO Financing', 'Invoice Discounting', 'Both'] },
      { id: 'q3', type: 'text', text: 'What could we do to improve our service?' },
    ],
  },
  {
    id: 2, title: 'Digital Experience Feedback', status: 'draft',
    description: 'Tell us about your experience using the Ticano client portal.',
    createdAt: '2026-06-15T11:00:00', author: 'Marketing Team',
    questions: [
      { id: 'q1', type: 'rating', text: 'How easy is the portal to use?' },
      { id: 'q2', type: 'text', text: 'Which feature would you like to see added?' },
    ],
  },
];
let NEXT_QN_ID = 100;
let QN_RESPONSES = [
  { id: 1, questionnaireId: 1, clientId: clientIdFor(1), clientName: 'Stacey Nthoi', submittedAt: '2026-06-12T14:00:00', answers: { q1: 5, q2: 'PO Financing', q3: 'Faster turnaround on applications.' } },
  { id: 2, questionnaireId: 1, clientId: clientIdFor(6), clientName: 'Boitumelo Rantao', submittedAt: '2026-06-13T10:30:00', answers: { q1: 4, q2: 'Both', q3: 'More branches in the north.' } },
];
let NEXT_QNR_ID = 100;

const questionnaireIsLive = (q) => q.status === 'published';

// Management view (Marketing) — all questionnaires incl. drafts.
export const getQuestionnaires = () => ok([...QUESTIONNAIRES].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
// Client view — published only.
export const getPublishedQuestionnaires = () => ok(QUESTIONNAIRES.filter(questionnaireIsLive));
export const createQuestionnaire = (data) => {
  const q = { id: NEXT_QN_ID++, status: 'draft', createdAt: new Date().toISOString(), questions: [], ...data };
  QUESTIONNAIRES = [q, ...QUESTIONNAIRES];
  return ok({ message: 'Questionnaire created', questionnaire: q });
};
export const updateQuestionnaire = (id, data) => {
  QUESTIONNAIRES = QUESTIONNAIRES.map((q) => q.id === Number(id) ? { ...q, ...data } : q);
  return ok({ message: 'Questionnaire updated', questionnaire: QUESTIONNAIRES.find((q) => q.id === Number(id)) });
};
export const setQuestionnaireStatus = (id, status) => {
  QUESTIONNAIRES = QUESTIONNAIRES.map((q) => q.id === Number(id) ? { ...q, status } : q);
  return ok({ message: status === 'published' ? 'Questionnaire published' : 'Questionnaire unpublished', id, status });
};
export const deleteQuestionnaire = (id) => {
  QUESTIONNAIRES = QUESTIONNAIRES.filter((q) => q.id !== Number(id));
  QN_RESPONSES = QN_RESPONSES.filter((r) => r.questionnaireId !== Number(id));
  return ok({ message: 'Questionnaire deleted', id });
};
export const submitQuestionnaireResponse = (questionnaireId, payload) => {
  const resp = { id: NEXT_QNR_ID++, questionnaireId: Number(questionnaireId), submittedAt: new Date().toISOString(), ...payload };
  QN_RESPONSES = [resp, ...QN_RESPONSES];
  return ok({ message: 'Thank you for your feedback!', response: resp });
};
export const getQuestionnaireResponses = (questionnaireId) =>
  ok(QN_RESPONSES.filter((r) => r.questionnaireId === Number(questionnaireId)));
// Analytics: response count, completion rate, per-question summary stats.
export const getQuestionnaireAnalytics = (questionnaireId) => {
  const q = QUESTIONNAIRES.find((x) => x.id === Number(questionnaireId));
  const responses = QN_RESPONSES.filter((r) => r.questionnaireId === Number(questionnaireId));
  const totalClients = CLIENT_MASTER.length;
  const perQuestion = (q?.questions || []).map((qq) => {
    const vals = responses.map((r) => r.answers?.[qq.id]).filter((v) => v !== undefined && v !== '');
    if (qq.type === 'rating') {
      const nums = vals.map(Number).filter((n) => !isNaN(n));
      const avg = nums.length ? (nums.reduce((a, b) => a + b, 0) / nums.length) : 0;
      return { question: qq.text, type: qq.type, average: Math.round(avg * 10) / 10, count: nums.length };
    }
    if (qq.type === 'choice') {
      const dist = {};
      (qq.options || []).forEach((o) => { dist[o] = 0; });
      vals.forEach((v) => { dist[v] = (dist[v] || 0) + 1; });
      return { question: qq.text, type: qq.type, distribution: dist, count: vals.length };
    }
    return { question: qq.text, type: qq.type, answers: vals, count: vals.length };
  });
  return ok({
    questionnaireId: Number(questionnaireId),
    responseCount: responses.length,
    completionRate: totalClients ? Math.round((responses.length / totalClients) * 100) : 0,
    perQuestion,
  });
};

// =====================================================================
//  MARKETING — TENDER BROADCASTS
//  Create tender/opportunity announcements and broadcast to filtered
//  recipients via dashboard notifications, email and/or WhatsApp.
//  History is stored and searchable.
// =====================================================================
let TENDER_BROADCASTS = [
  {
    id: 1, title: 'Government PPE Supply Tender — Closing 30 June',
    body: 'A new procurement opportunity for PPE supply has been published by the Ministry of Health. Ticano can finance your purchase order. Contact your PM to apply.',
    channels: ['dashboard', 'email'], filters: { branch: 'All', clientType: 'All', industry: 'All', status: 'All' },
    recipientCount: 4, sentAt: '2026-06-14T10:00:00', sentBy: 'Marketing Team',
  },
];
let NEXT_TENDER_ID = 100;

const filterRecipients = (filters = {}) => CLIENT_MASTER.filter((c) =>
  (!filters.branch || filters.branch === 'All' || c.branch === filters.branch) &&
  (!filters.clientType || filters.clientType === 'All' || c.clientType === filters.clientType) &&
  (!filters.industry || filters.industry === 'All' || c.industry === filters.industry) &&
  (!filters.status || filters.status === 'All')
);
// Preview how many clients a given filter set would reach.
export const previewTenderRecipients = (filters = {}) => {
  const recipients = filterRecipients(filters).map((c) => ({ id: c.id, clientId: clientIdFor(c.id), name: c.name, branch: c.branch, industry: c.industry, clientType: c.clientType, email: c.email, phone: c.phone }));
  return ok({ count: recipients.length, recipients });
};
export const getTenderBroadcasts = (query = '') => {
  const q = String(query).trim().toLowerCase();
  let rows = [...TENDER_BROADCASTS].sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));
  if (q) rows = rows.filter((t) => t.title.toLowerCase().includes(q) || t.body.toLowerCase().includes(q));
  return ok(rows);
};
export const createTenderBroadcast = (data) => {
  const recipients = filterRecipients(data.filters || {});
  const broadcast = {
    id: NEXT_TENDER_ID++, sentAt: new Date().toISOString(),
    channels: data.channels || ['dashboard'], filters: data.filters || {},
    recipientCount: recipients.length, ...data,
  };
  TENDER_BROADCASTS = [broadcast, ...TENDER_BROADCASTS];
  return ok({ message: `Tender broadcast sent to ${recipients.length} client(s)`, broadcast, recipients: recipients.map((c) => clientIdFor(c.id)) });
};
export const deleteTenderBroadcast = (id) => {
  TENDER_BROADCASTS = TENDER_BROADCASTS.filter((t) => t.id !== Number(id));
  return ok({ message: 'Broadcast removed', id });
};
// Public tenders for the landing page (most recent published opportunities).
export const getPublicTenders = () => ok([...TENDER_BROADCASTS]
  .sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt))
  .map((t) => ({ id: t.id, title: t.title, body: t.body, publishedAt: t.sentAt })));

// ---------------------------------------------------------------------
//  TENDER NOTIFICATION SUBSCRIPTIONS (public opt-in)
//  Visitors and clients can opt in from the login page to be notified of
//  new tender/opportunity broadcasts. Stored here; Marketing can later
//  fold these contacts into a broadcast list.
// ---------------------------------------------------------------------
let TENDER_SUBSCRIBERS = [];
let NEXT_SUBSCRIBER_ID = 1;

export const subscribeTenderNotifications = async ({ email, phone } = {}) => {
  await delay();
  const clean = String(email || '').trim().toLowerCase();
  if (!clean || !clean.includes('@') || !clean.includes('.')) {
    const err = new Error('Invalid email');
    err.response = { status: 400, data: { message: 'Please enter a valid email address.' } };
    throw err;
  }
  const existing = TENDER_SUBSCRIBERS.find((s) => s.email === clean);
  if (existing) {
    if (phone && !existing.phone) existing.phone = String(phone).trim();
    return { data: { message: "You're already on the tender alerts list — we'll keep you posted.", alreadySubscribed: true, subscriber: existing } };
  }
  const subscriber = { id: NEXT_SUBSCRIBER_ID++, email: clean, phone: phone ? String(phone).trim() : '', subscribedAt: new Date().toISOString() };
  TENDER_SUBSCRIBERS = [subscriber, ...TENDER_SUBSCRIBERS];
  return { data: { message: "You're subscribed! We'll email you whenever a new tender opportunity is published.", subscriber } };
};

export const getTenderSubscribers = () => ok([...TENDER_SUBSCRIBERS]);

export const unsubscribeTenderNotifications = (email) => {
  const clean = String(email || '').trim().toLowerCase();
  TENDER_SUBSCRIBERS = TENDER_SUBSCRIBERS.filter((s) => s.email !== clean);
  return ok({ message: 'You have been unsubscribed from tender alerts.' });
};

// =====================================================================
//  CAREERS — JOB APPLICATIONS & CV MANAGEMENT
//  Applicants apply via the landing page (CV upload). Applications are
//  routed to the Service Manager for review and status updates.
// =====================================================================
export const APPLICATION_STATUSES = ['New', 'Under Review', 'Shortlisted', 'Rejected', 'Hired'];
let JOB_APPLICATIONS = [
  {
    id: 1, careerId: 1, position: 'Portfolio Manager', applicantName: 'Kabo Otsile',
    email: 'kabo.otsile@example.com', phone: '+26772223334', coverNote: 'I have 5 years experience in SME lending.',
    cvFileName: 'Kabo_Otsile_CV.pdf', cvType: 'application/pdf', cvSize: 248000, cvDataUrl: '',
    status: 'New', appliedAt: '2026-06-16T08:30:00',
  },
];
let NEXT_APP_ID = 100;

export const submitJobApplication = (data) => {
  const app = { id: NEXT_APP_ID++, status: 'New', appliedAt: new Date().toISOString(), ...data };
  JOB_APPLICATIONS = [app, ...JOB_APPLICATIONS];
  return ok({ message: 'Application submitted successfully', application: { ...app, cvDataUrl: undefined } });
};
export const getJobApplications = (filters = {}) => {
  let rows = [...JOB_APPLICATIONS].sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt));
  if (filters.status && filters.status !== 'All') rows = rows.filter((a) => a.status === filters.status);
  if (filters.careerId) rows = rows.filter((a) => a.careerId === Number(filters.careerId));
  return ok(rows);
};
// Full record incl. CV data URL (for opening / downloading the CV).
export const getJobApplication = (id) => ok(JOB_APPLICATIONS.find((a) => a.id === Number(id)) || null);
export const updateApplicationStatus = (id, status) => {
  JOB_APPLICATIONS = JOB_APPLICATIONS.map((a) => a.id === Number(id) ? { ...a, status } : a);
  return ok({ message: `Application marked ${status}`, id, status });
};

// --- Director Announcements ---
// Each announcement supports: audience targeting (targetRoles), a draft /
// published status, and an optional active window (startDate → endDate).
let ANNOUNCEMENTS = [
  { id: 1, title: 'New SLA Policy Effective July 2026', body: 'As of 1 July 2026, all complaints must be resolved within 10 business days (down from 14). Please update your workflows accordingly.', author: 'Opelo Motswagae', role: 'director', targetRoles: ['portfolio_manager','service_manager','marketing','admin'], priority: 'high', status: 'published', startDate: '2026-06-15', endDate: '2026-07-15', createdAt: '2026-06-15T08:00:00', pinned: true },
  { id: 2, title: 'Q2 Performance Review — Friday 20 June', body: 'All branch service managers are required to submit their Q2 complaint resolution reports by Thursday COB. The Director will present a summary at the all-hands on Friday.', author: 'Opelo Motswagae', role: 'director', targetRoles: ['service_manager'], priority: 'normal', status: 'published', startDate: '', endDate: '2026-06-20', createdAt: '2026-06-14T12:00:00', pinned: false },
  { id: 3, title: 'System Maintenance — Sunday 22 June 02:00–04:00', body: 'The platform will be in maintenance mode for 2 hours. All data is backed up. No action needed from staff.', author: 'Thero Setlhare', role: 'admin', targetRoles: ['portfolio_manager','service_manager','director','marketing','admin'], priority: 'info', status: 'published', startDate: '', endDate: '', createdAt: '2026-06-13T16:00:00', pinned: false },
];
let NEXT_ANN_ID = 100;

// Is an announcement live right now (published + inside its active window)?
const announcementIsLive = (a) => {
  if (a.status && a.status !== 'published') return false;
  const today = new Date().toISOString().slice(0, 10);
  if (a.startDate && today < a.startDate) return false;
  if (a.endDate && today > a.endDate) return false;
  return true;
};

export const getAnnouncements = (filters = {}) => {
  let rows = [...ANNOUNCEMENTS];
  // Role-facing views (employee dashboards) only see live, targeted notices.
  if (filters.role) {
    rows = rows.filter((a) => announcementIsLive(a) && (!a.targetRoles || a.targetRoles.length === 0 || a.targetRoles.includes(filters.role)));
  }
  rows.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || new Date(b.createdAt) - new Date(a.createdAt));
  return ok(rows);
};
export const createAnnouncement = (data) => {
  const ann = {
    id: NEXT_ANN_ID++,
    createdAt: new Date().toISOString(),
    pinned: false,
    status: 'published',
    targetRoles: [],
    startDate: '',
    endDate: '',
    priority: 'normal',
    ...data,
  };
  ANNOUNCEMENTS = [ann, ...ANNOUNCEMENTS];
  return ok({ message: ann.status === 'draft' ? 'Draft saved' : 'Announcement published', announcement: ann });
};
export const updateAnnouncement = (id, data) => {
  ANNOUNCEMENTS = ANNOUNCEMENTS.map((a) => a.id === Number(id) ? { ...a, ...data } : a);
  const announcement = ANNOUNCEMENTS.find((a) => a.id === Number(id));
  return ok({ message: 'Announcement updated', id, announcement });
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
    { id: 203, name: 'Document Request', key: 'document_request', body: 'Hi [Name], to continue processing your [Product] application, I need the following documents: [Documents]. Please bring or send them at your earliest convenience. — [PM]', variables: ['Name','Product','Documents','PM'], active: true, lastUpdated: '2026-04-22T10:00:00' },
    { id: 204, name: 'Application Update', key: 'application_update', body: 'Hi [Name], I wanted to update you on your [Product] application. Current status: [Status]. Next step: [Next]. Feel free to reply if you have questions. — [PM]', variables: ['Name','Product','Status','Next','PM'], active: true, lastUpdated: '2026-03-10T10:00:00' },
    { id: 205, name: 'Follow-up Check-in', key: 'followup', body: 'Hi [Name], just checking in to see how everything is going with your Ticano account. Is there anything I can help you with? — [PM], your Portfolio Manager', variables: ['Name','PM'], active: true, lastUpdated: '2026-02-20T10:00:00' },
    { id: 206, name: 'Review Request', key: 'review_request', body: 'Hi [Name], thank you for allowing us to assist you. Your feedback means a lot to us! Please share your experience: [Link]. It only takes 2 minutes. — [PM]', variables: ['Name','Link','PM'], active: true, lastUpdated: '2026-01-15T10:00:00' },
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

// Single mutable source of truth: every template carries a `role` (which
// dashboard it belongs to) and an `active` flag. Offline (active:false)
// templates remain stored but are hidden from end users.
let WA_TEMPLATES = Object.entries(WA_TEMPLATES_BY_ROLE).flatMap(([role, list]) =>
  list.map((t) => ({ ...t, role, active: t.active !== false }))
);
let NEXT_TPL_ID = 500;

// Roles offered to the admin when assigning a template to a dashboard.
export const WA_TEMPLATE_ROLES = ['portfolio_manager', 'service_manager', 'director', 'admin'];

// Derive [Variable] placeholders straight from the message body so admins
// never have to maintain the variable list by hand.
const deriveWaVariables = (body = '') => {
  const found = [];
  const re = /\[([A-Za-z0-9 _]+)\]/g;
  let m;
  while ((m = re.exec(body))) { if (!found.includes(m[1])) found.push(m[1]); }
  return found;
};

// End users (PM/SM/Director/Admin composing messages) only ever see ACTIVE
// templates scoped to their role. Calling without a role returns the full
// store (active + offline) for the admin management screen.
export const getWaTemplates = (role) => {
  if (role) return ok(WA_TEMPLATES.filter((t) => t.role === role && t.active !== false));
  return ok([...WA_TEMPLATES]);
};
// Admin management view — always returns everything, including offline.
export const getAllWaTemplates = () => ok([...WA_TEMPLATES]);

export const createWaTemplate = (data) => {
  const variables = data.variables?.length ? data.variables : deriveWaVariables(data.body);
  const tpl = {
    id: NEXT_TPL_ID++,
    role: data.role || 'portfolio_manager',
    active: data.active !== false,
    lastUpdated: new Date().toISOString(),
    ...data,
    variables,
  };
  WA_TEMPLATES = [tpl, ...WA_TEMPLATES];
  return ok({ message: 'Template created', template: tpl });
};
export const updateWaTemplate = (id, data) => {
  const patch = { ...data };
  if (data.body !== undefined && (!data.variables || !data.variables.length)) {
    patch.variables = deriveWaVariables(data.body);
  }
  WA_TEMPLATES = WA_TEMPLATES.map((t) => t.id === Number(id) ? { ...t, ...patch, lastUpdated: new Date().toISOString() } : t);
  const template = WA_TEMPLATES.find((t) => t.id === Number(id));
  return ok({ message: 'Template updated', id, template });
};
// Take a template offline (hidden from users, kept in storage) or reactivate it.
export const setWaTemplateActive = (id, active) => {
  WA_TEMPLATES = WA_TEMPLATES.map((t) => t.id === Number(id) ? { ...t, active, lastUpdated: new Date().toISOString() } : t);
  return ok({ message: active ? 'Template reactivated' : 'Template taken offline', id, active });
};
export const deleteWaTemplate = (id) => {
  WA_TEMPLATES = WA_TEMPLATES.filter((t) => t.id !== Number(id));
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
//  HOMEPAGE — Blog Posts, Careers, Public Data
// =====================================================================

let BLOG_POSTS = [
  {
    id: 1,
    title: 'Ticano Celebrates 5 Years of Empowering Botswana SMEs',
    excerpt: 'Five years ago, we started with a simple belief — no business should be held back by cash flow. Today, we have helped over 642 businesses across Botswana access the funding they need to grow.',
    content: 'Five years ago, we started with a simple belief — no business should be held back by cash flow. Today, we have helped over 642 businesses across Botswana access the funding they need to grow. From small traders in Maun to large suppliers in Gaborone, we have been proud to deliver the funds as your business grows.',
    category: 'News',
    author: 'Marketing Team',
    publishedAt: '2026-06-10T08:00:00',
    image: null,
    pinned: true,
  },
  {
    id: 2,
    title: 'Understanding Purchase Order Financing — A Guide for SMEs',
    excerpt: 'Many businesses miss out on large orders simply because they lack the cash to pay suppliers upfront. PO Financing solves this. Here is everything you need to know.',
    content: 'Many businesses miss out on large orders simply because they lack the cash to pay suppliers upfront. PO Financing solves this. Here is everything you need to know about how it works, who qualifies, and how to apply.',
    category: 'Education',
    author: 'Marketing Team',
    publishedAt: '2026-05-28T09:00:00',
    image: null,
    pinned: false,
  },
  {
    id: 3,
    title: 'Happy New Year from Ticano Group 🎉',
    excerpt: 'As we enter a new year, we want to thank every client, partner, and team member who made 2025 exceptional. Here is to bigger orders, faster approvals, and more growth in 2026!',
    content: 'As we enter a new year, we want to thank every client, partner, and team member who made 2025 exceptional. Here is to bigger orders, faster approvals, and more growth in 2026! No one should be small forever.',
    category: 'Announcement',
    author: 'Director',
    publishedAt: '2026-01-01T07:00:00',
    image: null,
    pinned: false,
  },
];
let NEXT_BLOG_ID = 100;

// Is a post live on the public homepage? Published, and not scheduled for the future.
const blogIsLive = (p) => {
  if ((p.status || 'published') !== 'published') return false;
  if (p.scheduledFor && new Date(p.scheduledFor) > new Date()) return false;
  return true;
};

// Management view (Marketing dashboard) — every post, including drafts & scheduled.
export const getBlogPosts = () => ok([...BLOG_POSTS]
  .map((p) => ({ status: 'published', ...p }))
  .sort((a,b) => (b.pinned?1:0)-(a.pinned?1:0) || new Date(b.publishedAt)-new Date(a.publishedAt)));

// Public view (landing page) — only live posts.
export const getPublicBlogPosts = () => ok([...BLOG_POSTS]
  .filter(blogIsLive)
  .sort((a,b) => (b.pinned?1:0)-(a.pinned?1:0) || new Date(b.publishedAt)-new Date(a.publishedAt)));

export const createBlogPost = (data) => {
  const post = { id: NEXT_BLOG_ID++, publishedAt: new Date().toISOString(), pinned: false, status: 'published', scheduledFor: '', ...data };
  BLOG_POSTS = [post, ...BLOG_POSTS];
  return ok({ message: post.status === 'draft' ? 'Draft saved' : 'Post published', post });
};
export const deleteBlogPost = (id) => {
  BLOG_POSTS = BLOG_POSTS.filter(p => p.id !== Number(id));
  return ok({ message: 'Post removed', id });
};
export const updateBlogPost = (id, data) => {
  BLOG_POSTS = BLOG_POSTS.map(p => p.id === Number(id) ? { ...p, ...data } : p);
  const post = BLOG_POSTS.find(p => p.id === Number(id));
  return ok({ message: 'Post updated', id, post });
};

// ---- Careers ----
let CAREERS = [
  {
    id: 1,
    title: 'Portfolio Manager',
    type: 'Full-time',
    location: 'Gaborone',
    department: 'Client Services',
    description: 'We are looking for an experienced Portfolio Manager to join our Gaborone branch. You will be responsible for managing a portfolio of SME clients, processing PO financing applications, and ensuring excellent client satisfaction.',
    requirements: 'Degree in Finance, Business, or related field. Minimum 2 years experience in financial services. Strong communication and analytical skills.',
    closingDate: '2026-07-31',
    publishedAt: '2026-06-01T08:00:00',
    active: true,
  },
  {
    id: 2,
    title: 'Graduate Intern — Finance',
    type: 'Internship',
    location: 'Gaborone',
    department: 'Finance',
    description: 'An exciting internship opportunity for recent finance graduates. You will gain hands-on experience in trade finance, client management, and financial analysis under the guidance of our senior team.',
    requirements: 'Recent graduate with a degree in Finance, Accounting, or Economics. Eager to learn and grow in the financial services sector.',
    closingDate: '2026-07-15',
    publishedAt: '2026-06-05T08:00:00',
    active: true,
  },
  {
    id: 3,
    title: 'Marketing & Communications Officer',
    type: 'Full-time',
    location: 'Gaborone',
    department: 'Marketing',
    description: 'Join our marketing team to drive brand awareness, manage social media, and develop campaigns that educate SMEs about PO Financing and Invoice Discounting across Botswana.',
    requirements: 'Degree in Marketing, Communications, or related field. Experience with digital marketing and social media management. Creative and detail-oriented.',
    closingDate: '2026-07-20',
    publishedAt: '2026-06-08T08:00:00',
    active: true,
  },
];
let NEXT_CAREER_ID = 100;

// Public view (landing page) — only published (active) positions.
export const getCareers = () => ok([...CAREERS].filter(c => c.active).sort((a,b) => new Date(b.publishedAt)-new Date(a.publishedAt)));
// Management view (Marketing dashboard) — every position, including unpublished.
export const getAllCareers = () => ok([...CAREERS].sort((a,b) => new Date(b.publishedAt)-new Date(a.publishedAt)));
export const createCareer = (data) => {
  const career = { id: NEXT_CAREER_ID++, publishedAt: new Date().toISOString(), active: true, ...data };
  CAREERS = [career, ...CAREERS];
  return ok({ message: 'Position published', career });
};
export const updateCareer = (id, data) => {
  CAREERS = CAREERS.map(c => c.id === Number(id) ? { ...c, ...data } : c);
  const career = CAREERS.find(c => c.id === Number(id));
  return ok({ message: 'Position updated', id, career });
};
// Publish / unpublish toggles visibility on the public site without deleting.
export const setCareerActive = (id, active) => {
  CAREERS = CAREERS.map(c => c.id === Number(id) ? { ...c, active } : c);
  return ok({ message: active ? 'Position published' : 'Position unpublished', id, active });
};
export const deleteCareer = (id) => {
  CAREERS = CAREERS.filter(c => c.id !== Number(id));
  return ok({ message: 'Position removed', id });
};

// ---- Testimonials (Marketing-managed; shown on the public homepage) ----
let TESTIMONIALS = [
  { id:1, name:'Kabo Mosweu',    company:'Mosweu Trading',    rating:5, comment:'Ticano helped me fulfil a P500,000 government order I would have had to turn down. The process was fast and the team was incredibly supportive.', branch:'Gaborone',    enabled:true },
  { id:2, name:'Lesego Tshiamo', company:'TshamaCon Builders', rating:5, comment:'I was sceptical at first but Ticano delivered. Within 4 days my supplier was paid and I could complete my construction project on time.', branch:'Francistown', enabled:true },
  { id:3, name:'Mpho Segokgo',   company:'Fresh Produce Ltd',  rating:5, comment:'As a small business, we always struggled with cash flow during peak season. Ticano changed everything. Professional, fast, and fair rates.', branch:'Maun',        enabled:true },
  { id:4, name:'Refilwe Dube',   company:'Dube Distributors',  rating:5, comment:'The Portfolio Manager was exceptional. Always available, always professional. We have now completed 3 successful PO financing deals with Ticano.', branch:'Palapye', enabled:true },
  { id:5, name:'Onkabetse Tau',  company:'Tau Civil Works',    rating:5, comment:'No amount is too small, they said — and they meant it. They financed our first order of P80,000 and we have grown 5x since then.', branch:'Phikwe',           enabled:true },
];
let NEXT_TESTIMONIAL_ID = 100;

// Public homepage — only enabled testimonials.
export const getPublicTestimonials = () => ok(TESTIMONIALS.filter((t) => t.enabled));
// Management view (Marketing) — all testimonials.
export const getAllTestimonials = () => ok([...TESTIMONIALS]);
export const createTestimonial = (data) => {
  const t = { id: NEXT_TESTIMONIAL_ID++, rating: 5, enabled: true, branch: 'Gaborone', ...data };
  TESTIMONIALS = [t, ...TESTIMONIALS];
  return ok({ message: 'Testimonial added', testimonial: t });
};
export const updateTestimonial = (id, data) => {
  TESTIMONIALS = TESTIMONIALS.map((t) => t.id === Number(id) ? { ...t, ...data } : t);
  return ok({ message: 'Testimonial updated', id });
};
export const deleteTestimonial = (id) => {
  TESTIMONIALS = TESTIMONIALS.filter((t) => t.id !== Number(id));
  return ok({ message: 'Testimonial removed', id });
};
export const setTestimonialEnabled = (id, enabled) => {
  TESTIMONIALS = TESTIMONIALS.map((t) => t.id === Number(id) ? { ...t, enabled } : t);
  return ok({ message: enabled ? 'Testimonial shown on homepage' : 'Testimonial hidden', id, enabled });
};
