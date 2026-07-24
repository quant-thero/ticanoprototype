// TICANO AI ASSISTANT, TOOL REGISTRY
// The LLM never talks to the data layer directly and never generates
// queries. It can only call one of the named tools below, and every
// tool validates the caller's role/identity BEFORE returning anything.
// This mirrors the app's existing role model (see ACCESS_MATRIX in
// utils/constants.js) rather than inventing a parallel permission
// system.
import * as db from './supabaseApi';
import { FAQS, BRANCH_INFO, COMPANY_PROFILE, COMPANY_MISSION, COMPANY_VISION, ACCESS_MATRIX } from '../utils/constants';

const STAFF_ROLES = ['portfolio_manager', 'service_manager', 'director', 'admin'];
const MGMT_ROLES = ['director', 'admin'];

const denied = (reason = "That information isn't available for your account.") => ({ error: true, message: reason });

// Some staff (pm/service_manager) are branch-scoped; director/admin see nationally.
const branchScopeFor = (ctx) => {
  const access = ACCESS_MATRIX[ctx?.role];
  if (!access) return null;
  if (access.national) return null; // no restriction
  return ctx.branch || null;
};

// TOOL DEFINITIONS (OpenAI/Groq function-calling JSON schema)
// Each entry: { spec, roles, execute(args, ctx) }
// roles: null = available to everyone (incl. anonymous public visitors)
const TOOL_DEFS = [
  {
    roles: null,
    spec: {
      name: 'searchKnowledge',
      description: "Search Ticano's public FAQ/knowledge content (services, eligibility, rates, process, branches, complaints process, etc). Use this for any general company or product question.",
      parameters: {
        type: 'object',
        properties: { query: { type: 'string', description: 'Keywords to search for' } },
        required: ['query'],
      },
    },
    execute: async ({ query }) => {
      const q = String(query || '').toLowerCase();
      const hits = FAQS.filter((f) => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q)).slice(0, 5);
      return hits.length ? hits : { message: 'No direct FAQ match, answer generally if confident, otherwise offer to log an enquiry for staff.' };
    },
  },
  {
    roles: null,
    spec: {
      name: 'getCompanyInfo',
      description: 'Get verified information about Ticano Group: about/mission/vision, services offered, funding model, regulator, head office contact.',
      parameters: { type: 'object', properties: {} },
      required: [],
    },
    execute: async () => ({
      ...COMPANY_PROFILE,
      mission: COMPANY_MISSION,
      vision: COMPANY_VISION,
    }),
  },
  {
    roles: null,
    spec: {
      name: 'getBranchInfo',
      description: 'Get address, phone, and opening hours for a specific Ticano branch, or all branches if none specified.',
      parameters: {
        type: 'object',
        properties: { branch: { type: 'string', description: 'One of Gaborone, Francistown, Maun, Palapye, Phikwe. Omit to list all.' } },
      },
    },
    execute: async ({ branch } = {}) => {
      if (!branch) return BRANCH_INFO;
      const key = Object.keys(BRANCH_INFO).find((b) => b.toLowerCase() === String(branch).toLowerCase());
      return key ? BRANCH_INFO[key] : { message: `No branch matching "${branch}". Known branches: ${Object.keys(BRANCH_INFO).join(', ')}.` };
    },
  },

  // ---- CLIENT (authenticated customer) -------------------------------
  {
    roles: ['customer'],
    spec: {
      name: 'getMyComplaints',
      description: "Get the signed-in client's own complaints (ticket, status, category, dates). Never returns another client's data.",
      parameters: { type: 'object', properties: {} },
    },
    execute: async (_args, ctx) => {
      const { data } = await db.getMyComplaints(ctx.userId);
      return data.map((c) => ({ ticket: c.ticket, category: c.category, status: c.status, journeyStage: c.journeyStage, createdAt: c.createdAt, assignedPmName: c.assignedPmName }));
    },
  },
  {
    roles: ['customer'],
    spec: {
      name: 'getComplaintStatus',
      description: "Get full status/timeline detail for one of the signed-in client's own complaints by ticket number.",
      parameters: {
        type: 'object',
        properties: { ticket: { type: 'string', description: 'The complaint ticket number, e.g. TCN-0001' } },
        required: ['ticket'],
      },
    },
    execute: async ({ ticket }, ctx) => {
      const { data: complaint } = await db.getComplaintById(ticket);
      if (!complaint || complaint.customerId !== ctx.userId) return denied("I can't find that complaint on your account.");
      const { data: queue } = await db.getQueuePosition(complaint.id);
      return {
        ticket: complaint.ticket, status: complaint.status, category: complaint.category,
        journeyStage: complaint.journeyStage, assignedPmName: complaint.assignedPmName,
        createdAt: complaint.createdAt, queuePosition: queue.position, totalInQueue: queue.totalInQueue,
      };
    },
  },
  {
    roles: ['customer'],
    spec: {
      name: 'getMyProfile',
      description: "Get the signed-in client's own profile (assigned Portfolio Manager, preferred branch, contact preferences).",
      parameters: { type: 'object', properties: {} },
    },
    execute: async () => {
      const { data } = await db.getMyProfile();
      if (!data) return { message: 'Profile not found.' };
      const { name, assignedPmId, preferredBranch, clientType } = data;
      return { name, assignedPmId, preferredBranch, clientType };
    },
  },

  // ---- STAFF (pm / service_manager / director / admin) ---------------
  {
    roles: STAFF_ROLES,
    spec: {
      name: 'searchComplaints',
      description: "Search complaints. Portfolio Managers and Service Managers only see their own branch; Directors/Admins see nationally. Filter by status ('new','assigned','in_progress','escalated','resolved','closed') and/or a free-text query matched against category.",
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string', description: 'Complaint status to filter by' },
          category: { type: 'string', description: 'Complaint category keyword to filter by' },
        },
      },
    },
    execute: async ({ status, category } = {}, ctx) => {
      const scopeBranch = branchScopeFor(ctx);
      const { data } = await db.getComplaints({ status: status || undefined, branch: scopeBranch || undefined });
      let rows = data;
      if (category) rows = rows.filter((c) => c.category?.toLowerCase().includes(String(category).toLowerCase()));
      return rows.slice(0, 15).map((c) => ({ ticket: c.ticket, category: c.category, status: c.status, branch: c.branch, assignedPmName: c.assignedPmName, createdAt: c.createdAt }));
    },
  },
  {
    roles: STAFF_ROLES,
    spec: {
      name: 'getPendingComplaints',
      description: 'Get complaints that are still open/unresolved, scoped to the caller\u2019s branch (PM/Service Manager) or nationally (Director/Admin).',
      parameters: { type: 'object', properties: {} },
    },
    execute: async (_args, ctx) => {
      const scopeBranch = branchScopeFor(ctx);
      const { data } = await db.getComplaints({ branch: scopeBranch || undefined });
      const open = data.filter((c) => ['created', 'assigned', 'in_progress', 'customer_contacted', 'pending_customer', 'escalated'].includes(c.status));
      return open.slice(0, 15).map((c) => ({ ticket: c.ticket, category: c.category, status: c.status, branch: c.branch, createdAt: c.createdAt }));
    },
  },
  {
    roles: STAFF_ROLES,
    spec: {
      name: 'searchInternalKnowledge',
      description: 'Search the internal staff knowledge base (resolution playbooks for payment issues, documentation issues, service complaints, etc). Not for customer-facing answers.',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string' } },
        required: ['query'],
      },
    },
    execute: async ({ query }) => {
      const { data } = await db.getKnowledgeBase({ q: query });
      return data.slice(0, 5).map((a) => ({ title: a.title, category: a.category, body: a.body }));
    },
  },
  {
    roles: STAFF_ROLES,
    spec: {
      name: 'getPortfolioClientSummary',
      description: "Look up a Client Portfolio record by company name or client ID (e.g. TIC-000012).",
      parameters: {
        type: 'object',
        properties: { search: { type: 'string' } },
        required: ['search'],
      },
    },
    execute: async ({ search }, ctx) => {
      const scopeBranch = branchScopeFor(ctx);
      const { data } = await db.getPortfolioClients({ search, branch: scopeBranch || undefined, orgWide: !scopeBranch });
      if (!data.length) return { message: 'No matching client found in your portfolio scope.' };
      const c = data[0];
      return { companyName: c.companyName, clientId: c.clientId, branch: c.branch, industry: c.industry, assistanceCount: c.assistanceCount, contactedRecently: c.contactedRecently };
    },
  },
  {
    roles: ['service_manager', ...MGMT_ROLES],
    spec: {
      name: 'getStaffPerformanceSummary',
      description: 'Get Portfolio Manager workload and performance stats.',
      parameters: { type: 'object', properties: {} },
    },
    execute: async () => {
      const { data } = await db.getStaffPerformance();
      return data;
    },
  },

  // ---- DIRECTOR / ADMIN -----------------------------------------------
  {
    roles: MGMT_ROLES,
    spec: {
      name: 'getComplaintAnalyticsSummary',
      description: 'Get organisation-wide complaint analytics: totals, open/resolved/escalated counts, escalation rate, average resolution time, breakdown by category/branch.',
      parameters: { type: 'object', properties: {} },
    },
    execute: async () => {
      const { data } = await db.getComplaintAnalytics();
      return data;
    },
  },
  {
    roles: MGMT_ROLES,
    spec: {
      name: 'getBranchPerformance',
      description: 'Compare performance across all branches, or get detail for one branch.',
      parameters: {
        type: 'object',
        properties: { branch: { type: 'string', description: 'Optional, a specific branch name' } },
      },
    },
    execute: async ({ branch } = {}) => {
      const { data } = await db.getBranchComparison();
      if (branch) {
        const match = data.find((b) => b.branch.toLowerCase() === String(branch).toLowerCase());
        return match || { message: `No data for branch "${branch}".` };
      }
      return data;
    },
  },
  {
    roles: MGMT_ROLES,
    spec: {
      name: 'getExecutiveSummary',
      description: 'Get the current executive dashboard summary and smart insights/trends for a management report.',
      parameters: { type: 'object', properties: {} },
    },
    execute: async () => {
      const [exec, insights] = await Promise.all([db.getExecutiveDashboard(), db.getSmartInsights()]);
      return { executive: exec.data, insights: insights.data };
    },
  },
];

// PUBLIC API
// Returns the Groq/OpenAI-style tool specs available to a given role.
export function toolsForRole(role) {
  return TOOL_DEFS
    .filter((t) => t.roles === null || t.roles.includes(role))
    .map((t) => ({ type: 'function', function: t.spec }));
}

// Executes a named tool call, re-checking role permission (defense in depth
//, the model should never be offered a tool it can't use, but we never
// trust the model's own claim about what it was offered).
export async function runTool(name, args, ctx) {
  const tool = TOOL_DEFS.find((t) => t.spec.name === name);
  if (!tool) return denied(`Unknown tool "${name}".`);
  if (tool.roles !== null && !tool.roles.includes(ctx?.role)) {
    return denied('This request requires a different account type. Please sign in with the appropriate account.');
  }
  try {
    return await tool.execute(args || {}, ctx || {});
  } catch (err) {
    return denied('Something went wrong retrieving that information. A staff member can help instead.');
  }
}

export const AI_TOOL_NAMES = TOOL_DEFS.map((t) => t.spec.name);
