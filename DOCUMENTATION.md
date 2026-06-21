# Ticano — System Documentation

**Version:** 3.1.0 (Service Intelligence Platform + Localization & Accessibility)
**Status:** UI prototype (mock backend)
**Tagline:** Purchase Order Financing Specialists — Service Intelligence & Case Management

---

## 1. System overview

Ticano is no longer just a complaint tracker — it is a **Service Intelligence Platform** that combines complaint lifecycle management, anonymous feedback, customer satisfaction analytics, root cause intelligence, staff performance scoring, branch health monitoring, and executive decision support. The system serves a Botswana-based Purchase Order (PO) Financing specialist and enforces strict role-based access, data privacy, and immutable audit logging.

The current build is a **front-end-only prototype**. All backend interactions are simulated by an in-memory mock API layer so the entire system can be demoed without server infrastructure. The architecture is deliberately structured so the mock layer can be swapped for a real REST backend without touching the UI.

### Core capabilities

**Complaint lifecycle**
- Eight-stage lifecycle: Created → Assigned → In Progress → Customer Contacted → Pending Customer → Escalated → Resolved → Closed
- Ticket-numbered tracking (`TCN-0001`, `TCN-0002`, …) and live queue position
- Independent severity (minor / moderate / major / critical) and priority (low / medium / high / urgent)
- Mandatory root cause on closure
- Escalation to management with mandatory reason
- Smart PM assignment recommendations (workload + branch fit + category strength + speed + CSAT)
- Immutable audit log of every state change
- Internal vs customer-facing notes — strictly separated

**Privacy & access**
- Anonymous complaint submission with un-recoverable identity (no name / phone / email persisted)
- Six roles with a per-row access matrix (own branch, other branches, national, internal-note visibility, identity masking)

**Voice of customer**
- Post-closure satisfaction survey (5-star + Yes/No on resolution, communication, professionalism, free-text)
- Separate "How can we improve?" suggestion module routed to Service Manager + Director (NOT the complaint queue)
- Tokenized review links for tagged CSAT capture

**Intelligence layer**
- Director Action Centre — landing dashboard surfacing escalations, 30-day-open cases, SLA breaches, critical severity, high priority, and flagged branches
- Branch Health Score (0–100, grade A–F) with weighted breakdown of resolution rate, escalation rate, CSAT, SLA compliance, volume
- Complaint Aging Dashboard with 0–3 / 4–7 / 8–14 / 15–30 / 30+ buckets and 14-day SLA threshold
- Smart Insights — top recurring issues, root-cause patterns, sentiment distribution, branch trends
- Complaint Heat Map by branch / region
- Sentiment tagging (positive / neutral / negative / urgent concern) — internal only
- Knowledge Base with PM-side copy-to-clipboard and Admin-side CRUD
- Global search across tickets, customers, PMs, branches, categories

**Operational**
- Active-client analytics (new vs existing client mix, retention, branch comparison)
- Staff performance dashboard with PM ranking
- Lead capture & conversion ("Potential Clients" pipeline)
- Botswana-localized formatting (Pula currency, +267 phone format, local branches)

---

## 2. Tech stack

### Runtime & framework

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Build tool | **Vite** | 5.4.11 | Dev server, HMR, production bundling |
| UI framework | **React** | 18.2.0 | Component model, hooks, concurrent rendering |
| Routing | **react-router-dom** | 6.21.0 | Client-side routing, protected routes |
| Language | **JavaScript (ESM)** + JSX | ES2022 | No TypeScript; pure JSX components |

### Styling & UI

| Library | Version | Purpose |
|---|---|---|
| **Tailwind CSS** | 3.4.17 | Utility-first styling with brand-token extensions |
| **PostCSS** | 8.4.49 | CSS pipeline |
| **Autoprefixer** | 10.4.20 | Vendor-prefix automation |
| **lucide-react** | 0.303.0 | Icon set (line icons) |
| **recharts** | 2.10.3 | Charts (bar, line, pie, radial) |

### UX & utility

| Library | Version | Purpose |
|---|---|---|
| **react-hot-toast** | 2.4.1 | Toast notifications |
| **date-fns** | 3.0.6 | Date formatting & arithmetic |
| **xlsx** (SheetJS) | 0.18.5 | CSV/Excel export from analytics tables |

### Development

| Plugin | Version |
|---|---|
| @vitejs/plugin-react | 4.3.4 |

No backend, no database, no auth provider, no test runner are part of the current build.

---

## 3. File structure

```
ticano/
├── index.html                      Vite entry HTML (loads /src/main.jsx)
├── package.json                    Dependencies & npm scripts
├── vite.config.js                  Vite config (port 3000, auto-open)
├── tailwind.config.js              Brand palette, dark mode, animations
├── postcss.config.js               Tailwind + Autoprefixer pipeline
├── README.md                       Quickstart for developers
├── CHANGES.md                      v2.0 changelog
├── DOCUMENTATION.md                This file
│
├── public/                         Served at site root, untransformed
│   ├── ticano-logo.svg             Favicon (SVG)
│   ├── ticano-logo.png             Favicon (PNG fallback)
│   └── images/
│       └── login-bg.svg            Login page background artwork
│
└── src/
    ├── main.jsx                    React 18 createRoot bootstrap
    ├── App.jsx                     Provider stack + route table
    ├── index.css                   Tailwind directives + component classes
    │
    ├── assets/                     Bundled assets (imported via JS)
    │   ├── ticano-logo.svg
    │   ├── ticano-logo.png
    │   └── images/
    │       └── director-portrait.svg   Leadership-page portrait
    │
    ├── context/                    React Context providers (global state)
    │   ├── AuthContext.jsx         User session, token, login/logout
    │   ├── ThemeContext.jsx        Dark-mode toggle + persistence
    │   └── NotificationContext.jsx Role-aware notification feed
    │
    ├── pages/                      Route-level components
    │   ├── LoginPage.jsx           Public — sign-in form
    │   ├── RegisterPage.jsx        Public — customer self-registration
    │   ├── FeedbackFormPage.jsx    Public — tokenized review link landing
    │   ├── ClientDashboard.jsx     Role: customer
    │   ├── PmDashboard.jsx         Role: portfolio_manager
    │   ├── ServiceManagerDashboard.jsx  Role: service_manager
    │   ├── DirectorDashboard.jsx   Role: director
    │   ├── MarketingDashboard.jsx  Role: marketing
    │   ├── AdminDashboard.jsx      Role: admin
    │   └── ProfilePage.jsx         Shared — profile & preferences
    │
    ├── components/
    │   └── common/                 Cross-dashboard reusable components
    │       ├── Logo.jsx                  Official brand SVG (mark + wordmark)
    │       ├── Navbar.jsx                Top nav, global search, notifications, role badge
    │       ├── GlobalSearch.jsx          §17 — search tickets/customers/PMs/branches
    │       ├── UI.jsx                    Tabs, Badge, Modal, EmptyState, etc.
    │       ├── ComplaintsModule.jsx      Full complaint workspace (list + detail)
    │       ├── ComplaintForm.jsx         Submission form (anonymous + severity + priority)
    │       ├── ComplaintTimeline.jsx     Vertical activity timeline
    │       ├── ComplaintTracker.jsx      Customer-facing status + queue card
    │       ├── ImprovementFeedbackForm.jsx   §3 — "How can we improve?" form
    │       ├── SatisfactionSurveyForm.jsx    §4 — Post-closure CSAT survey
    │       ├── KnowledgeBase.jsx         §8 — KB viewer / editor (perms by prop)
    │       ├── BranchDetailView.jsx      Per-branch analytics drill-down
    │       ├── LeadsModule.jsx           Potential-client (lead) pipeline
    │       └── ReviewLinkSender.jsx      WhatsApp review-link dispatch UI
    │
    ├── services/
    │   └── api.js                  Mock API layer (entire backend simulated)
    │
    └── utils/
        ├── constants.js            Enums, role labels, journey stages, branches
        ├── format.js               Pula currency, phone, date formatters
        └── exporter.js             CSV / Excel export (uses xlsx)
```

**Source size:** ~5,500 lines across 29 JS/JSX files.

---

## 4. Structural breakdown

### 4.1 Architectural layers

The application follows a conventional layered React architecture:

```
┌──────────────────────────────────────────────────────────┐
│  Presentation Layer (pages/ + components/common/)        │
│  Role-specific dashboards built from shared components   │
└──────────────────────────────────────────────────────────┘
                          ↑
┌──────────────────────────────────────────────────────────┐
│  State Layer (context/)                                  │
│  Auth, theme, and notifications via React Context        │
└──────────────────────────────────────────────────────────┘
                          ↑
┌──────────────────────────────────────────────────────────┐
│  Service Layer (services/api.js)                         │
│  Promise-based mock API — drop-in replacement target     │
└──────────────────────────────────────────────────────────┘
                          ↑
┌──────────────────────────────────────────────────────────┐
│  Domain Layer (utils/constants.js + utils/format.js)     │
│  Enums, business rules, formatting primitives            │
└──────────────────────────────────────────────────────────┘
```

The **service layer** is the seam where a real backend would plug in. Every function returns `Promise<{ data }>`, matching the shape an `axios`/`fetch` wrapper would return. Replacing `services/api.js` with real HTTP calls requires no changes to the UI.

### 4.2 Provider hierarchy

`App.jsx` composes context providers in this order:

```
<ThemeProvider>            ← outermost (dark-mode class on <html>)
  <AuthProvider>           ← user + token state
    <NotificationProvider> ← reads from useAuth() to seed by role
      <Router>
        <Toaster />
        <Routes>…</Routes>
      </Router>
```

`NotificationProvider` depends on `AuthProvider` (it reads the user's role to load role-specific notifications), which is why the order matters.

### 4.3 Routing & route protection

Routing is centralized in `App.jsx`. Three categories:

1. **Public routes** — `/login`, `/register`, `/feedback/:token`
2. **Role-gated routes** — wrapped in `<ProtectedRoute allowedRoles={[…]}>`. Checks `token` presence (redirects to `/login` if absent) and role membership (redirects to `/unauthorized` if mismatched).
3. **Smart redirect** — `/` resolves to the user's role-appropriate dashboard via `<DashboardRouter>`.

| Path | Role | Component |
|---|---|---|
| `/login` | public | LoginPage |
| `/register` | public | RegisterPage |
| `/feedback/:token` | public | FeedbackFormPage |
| `/client` | customer | ClientDashboard |
| `/pm` | portfolio_manager | PmDashboard |
| `/service-manager` | service_manager | ServiceManagerDashboard |
| `/director` | director | DirectorDashboard |
| `/marketing` | marketing | MarketingDashboard |
| `/admin` | admin | AdminDashboard |
| `/<role>/profile` | matching role | ProfilePage |
| `/unauthorized` | any | inline 403 view |

### 4.4 Component composition pattern

Dashboards are intentionally **thin**. They wire up data fetching and pass props into reusable modules. The same component renders different permission surfaces by prop:

```jsx
// In PmDashboard.jsx — only handles own cases, can escalate
<ComplaintsModule scope="mine" canEscalate />

// In ServiceManagerDashboard.jsx — full powers
<ComplaintsModule scope="all" canAssign canEscalate canResolve />
```

This permission-by-prop model keeps the complaint UI consistent across roles while letting each role expose only its sanctioned actions.

### 4.5 State management strategy

Three concerns, three contexts — nothing more elaborate:

- **AuthContext** — current user, token, and `login`/`logout`/`updateUser` actions. Persists to `localStorage` under the `ticano_token` and `ticano_user` keys so a page refresh keeps the session.
- **ThemeContext** — boolean `darkMode`, toggle action. Persists to `localStorage` and applies the `dark` class to `<html>`.
- **NotificationContext** — a list of notifications scoped to the current user's role. Includes `markRead`, `markAllRead`, `addNotification`, and a computed `unreadCount`.

All other state is **local to its dashboard** via `useState`/`useEffect`. There is no Redux/Zustand/Jotai — the app's scope doesn't justify a global store.

---

## 5. Domain model

### 5.1 Complaint lifecycle (§1)

The full 8-stage lifecycle, every transition recorded in both the timeline and the audit log:

```
created ─→ assigned ─→ in_progress ─→ customer_contacted ─→ pending_customer ─→ resolved ─→ closed
                                              │                                       ↑
                                              └───→ escalated ────────────────────────┘
```

`OPEN_COMPLAINT_STATUSES` = `['created', 'assigned', 'in_progress', 'customer_contacted', 'pending_customer', 'escalated']` — queue position and aging are computed from this set. `SLA_BREACH_DAYS = 14`.

### 5.2 Severity & priority (§14)

Two independent dimensions captured on every complaint:

| Field | Values |
|---|---|
| `severity` | minor / moderate / major / critical |
| `priority` | low / medium / high / urgent |

Severity measures impact; priority measures handling urgency. They are not derivable from each other and both must be set at submission.

### 5.3 Anonymous complaints (§2)

When a customer ticks "Submit as anonymous":

- `customerId` is set to `null`
- `customerName` becomes `ANON-XXXXXX` (auto-generated)
- `anonymous: true` is persisted
- No name, phone, or email is stored anywhere — identity recovery is impossible by design
- The lock icon (🔒) appears wherever the complaint is rendered, in every role's UI

The `ACCESS_MATRIX` in `constants.js` codifies the rule: `identityVisible: 'masked_anon'` for Admin/Director, meaning the anonymous ID is visible but no real identity exists to unmask.

### 5.4 Root cause taxonomy (§5)

Closing a complaint **requires** a root cause. The API layer enforces this — `closeComplaint()` throws a 400 if `rootCause.cause` is missing. The taxonomy:

| Group | Causes |
|---|---|
| Service Issues | Poor communication · Delayed response · No feedback to customer · Staff conduct |
| Process Issues | Approval delays · Missing documents · Workflow bottlenecks · Unclear policy |
| System Issues | Portal errors · Notification failures · Technical issues · Integration outage |

The selected cause feeds the Smart Insights dashboard's "top root causes" panel and the Branch Health score's failure-pattern analysis.

### 5.5 Internal vs customer notes (§7)

Every complaint carries two separate note streams:

- `internalNotes[]` — visible only to PM / Service Manager / Admin / Director. Tagged with the `Shield` icon, displayed in a bordered panel.
- `customerNotes[]` — visible to the customer plus the assigned PM and Service Manager. Tagged with the `MessageCircle` icon.

The split is enforced at the API layer through separate endpoints (`addInternalNote`, `addCustomerNote`). The legacy `addComplaintNote` exists as a backwards-compat shim that defaults to internal.

### 5.6 Sentiment tagging (§21)

Four tags — `positive`, `neutral`, `negative`, `urgent_concern` — set by staff for internal prioritization. Never visible to the customer. Feed the Smart Insights sentiment distribution.

### 5.7 Audit trail (§15)

`AUDIT_LOG` is an append-only array. Every `Created / Assigned / Updated / Escalated / Resolved / Closed` event writes an immutable entry with `{ user, timestamp, action, previousValue, newValue }`. No update or delete operation is exposed in the API.

Two views surface the log:
- Per-complaint: `History` button in the complaint detail header → `AuditTrailModal`
- Global: Admin → Audit Logs tab → searchable / filterable table

### 5.8 Improvement feedback (§3)

`IMPROVEMENT_FEEDBACK[]` is a completely separate store from `COMPLAINTS[]`. Customer suggestions submitted via "How can we improve your experience with Ticano?" do **not** enter the complaint queue. They route to:

- Service Manager → "Improvement Feedback" tab
- Director → Smart Insights (aggregate)
- Monthly reports

Categories: Staff Service · Process Improvement · Communication · System Issues · Branch Experience.

### 5.9 Satisfaction survey (§4)

Triggered automatically when a complaint reaches `status === 'closed'` and no `satisfaction` record exists. Three Yes/No questions (issue resolved, communication satisfactory, PM professional), a 1–5 star rating, optional free-text comments. Outputs feed:

- PM satisfaction score
- Branch satisfaction score
- System-wide Ticano Satisfaction Index
- Branch Health Score

### 5.10 Journey-stage taxonomy

Every complaint must be tagged with one of three stages, each with its own category list:

| Stage | Example categories |
|---|---|
| **Before Applying** | Information unclear, Long wait for callback, Pricing not transparent |
| **During Application** | Document upload failed, Approval delayed, Communication gaps |
| **After Disbursement** | Disbursement late, Statement incorrect, Repayment confusion |

The category dropdown in the complaint form **cascades** from the chosen stage.

### 5.11 Client classification

Every complaint carries `clientType ∈ {new, existing}`, and so does the customer profile. This drives the active-client mix analytics surfaced to Service Manager, Director, and Marketing.

### 5.12 Escalation contract

When a PM or Service Manager hits **Escalate to Management**:

1. A reason is **required** (the mock API throws 400 if absent)
2. The complaint's status becomes `escalated`
3. A structured `escalation = { at, by, reason }` is stored
4. An immutable entry is written to the audit log
5. Notifications fire to the Service Manager and Director
6. The complaint appears in the Director's Action Centre + Escalations tab

### 5.13 Roles & access matrix (§23)

```
ROLES = ['customer', 'portfolio_manager', 'service_manager', 'director', 'marketing', 'admin']
```

| Role | Own branch | Other branches | National | Identity | Internal notes |
|---|---|---|---|---|---|
| portfolio_manager | ✓ | ✗ | ✗ | visible | ✓ |
| service_manager | ✓ | ✗ | ✗ | visible | ✓ |
| admin | ✓ | ✓ | ✓ | masked if anon | ✓ |
| director | ✓ | ✓ | ✓ | masked if anon | ✓ |
| marketing | ✗ | ✗ | ✓ | hidden | ✗ |
| customer | ✗ | ✗ | ✗ | self only | ✗ |

Service Manager replaces the legacy "Branch Manager" role.

### 5.14 Demo accounts

Every email below logs in with **any password** in mock mode:

| Email | Name | Role |
|---|---|---|
| `client@demo.com` | Stacey Nthoi | customer |
| `pm@demo.com` | Mojaboswa | portfolio_manager |
| `service@demo.com` | Janine Seabenyane | service_manager |
| `director@demo.com` | Opelo Motswagae | director |
| `marketing@demo.com` | Katlego | marketing |
| `admin@demo.com` | Thero Setlhare | admin |

---

## 6. Dashboards by role

### Client (`ClientDashboard.jsx`)

Tabs: Overview · My Complaints · Submit a Complaint · **Improve Ticano** · Feedback History · My Profile.

Highlights:
- Closed complaints without a satisfaction record automatically render the `SatisfactionSurveyForm` at the top of the overview
- "Improve Ticano" tab hosts the separate `ImprovementFeedbackForm` (NOT routed to complaints)
- Complaint form supports anonymous submission with un-recoverable identity

### Portfolio Manager (`PmDashboard.jsx`)

Tabs: Overview · My Complaints · **Knowledge Base** · Potential Clients · Rating Analytics.

ComplaintsModule props: `scope="mine"`, `canEscalate`, `canResolve`, `showInternalNotes`. PMs see internal notes and can tag sentiment but cannot assign or close.

### Service Manager (`ServiceManagerDashboard.jsx`)

Tabs: Overview · Complaints · **Aging** · Escalations · **Improvement Feedback** · **Knowledge Base** · Active Clients · Leads · Unassigned · Staff Performance · Analytics.

ComplaintsModule props: `scope="all"`, `canAssign`, `canEscalate`, `canResolve`, `canClose`, `showInternalNotes` — the full operational console. The Aging tab calls `getAgingDashboard`, the Improvement Feedback tab calls `getImprovementFeedbackSummary` + `getImprovementFeedback`.

### Director (`DirectorDashboard.jsx`)

Tabs: **Action Centre** (landing) · Executive Summary · **Branch Health** · **Smart Insights** · **Heat Map** · Branch Comparison · Active Client Mix · Complaint Analytics · Escalations · Lead Conversion · Referral Network · Bulk Message.

- Action Centre (§11) — always-visible priorities: escalations, 30-day-open, SLA breaches, critical severity, high priority, flagged branches; clickable cards navigate to the relevant tab
- Branch Health (§10) — scorecard with grade A–F per branch
- Smart Insights (§20) — top issues, top root causes, sentiment distribution, branch trends
- Heat Map (§19) — geo scatter + table of branches by volume/severity/escalation

### Marketing (`MarketingDashboard.jsx`)

Tabs: Executive Summary · Client Mix · Lead Funnel · Referral Analytics · "Other" Analysis · Demographics · Satisfaction. Read-only analytical view; no identity access.

### Admin (`AdminDashboard.jsx`)

Tabs: Users · Branches · **Knowledge Base** (CRUD) · System Config · Database · **Audit Logs** · System Health.

- Knowledge Base CRUD with create/edit/archive
- Audit Logs tab queries the real complaint audit trail with search + action filter

---

## 7. Mock API layer (`services/api.js`)

A single file (~900 lines) holds the entire simulated backend. Conventions:

- Every function returns `Promise<{ data: T }>` (the `data` wrapper mirrors typical REST client shape).
- A `delay()` helper introduces 350ms latency so the UI's loading states actually show.
- Mutable state lives in module-scope arrays (`COMPLAINTS`, `LEADS`, `AUDIT_LOG`, `IMPROVEMENT_FEEDBACK`, `KB_ARTICLES`) so mock data persists across calls within a session — but resets on page refresh.
- Ticket numbers come from `formatTicket(seq)` → `TCN-0001`; anonymous IDs from `nextAnonId()` → `ANON-000001`.
- Error paths throw `Error` objects with a `.response.data.message` field, matching Axios's shape.

### Endpoint groups

**Auth & profile** — `login`, `registerCustomer`, `getProfile`, `updateProfile`, `optOut`

**Complaints (core)** — `getComplaints`, `getMyComplaints`, `getComplaintById`, `getQueuePosition`, `submitComplaint` (supports anonymous), `assignComplaint`, `reassignComplaint`, `updateComplaintStatus`, `escalateComplaint`, `resolveComplaint`, **`closeComplaint`** (requires root cause), **`submitSatisfactionSurvey`**

**Notes & sentiment** — **`addInternalNote`**, **`addCustomerNote`**, **`updateSentiment`**, `addComplaintNote` (backwards-compat shim)

**Audit** — **`getAuditTrail({ complaintId, user, action })`**

**Improvement feedback (separate from complaints)** — **`submitImprovementFeedback`**, **`getImprovementFeedback`**, **`getImprovementFeedbackSummary`**

**Knowledge base** — **`getKnowledgeBase`**, **`createKbArticle`**, **`updateKbArticle`**, **`archiveKbArticle`**

**Smart assignment** — **`recommendPm(complaintId)`** — scores PMs by `workload*10 + avgDays - satisfaction*2 - branchMatch*8 - categoryMatch*4`

**Operational intelligence**
- **`getAgingDashboard({ branch })`** — bucket counts + SLA breach list
- **`getBranchHealthScores()`** — weighted 0–100 score with grade A–F
- **`getActionCentre()`** — escalations, 30+ days, SLA breaches, critical, high priority, flagged branches
- **`getExecutiveDashboard()`** — today / this month / attention required
- **`getSmartInsights()`** — top issues, top root causes, sentiment distribution, branch trends
- **`getComplaintHeatMap()`** — per-branch volume + escalation + severity

**Cross-cutting** — **`globalSearch(q)`** — searches complaints + leads

**Legacy analytics** — `getActiveClientAnalytics`, `getComplaintAnalytics`, `getBranchAnalytics`, `getBranchComparison`, `getReferralSources`, `getLocationAnalytics`, `getCsatTrend`, `getWordCloud`, `getDemographics`, `getReferralNetwork`, `getStaffPerformance`

**Admin** — `getUsers`, `createUser`, `updateUser`, `deleteUser`, `getSystemHealth`, `getBranches`, `updateBranch`, `getSystemConfig`, `updateSystemConfig`, `triggerBackup`, `exportData`

**Leads** — `getLeads`, `createLead`, `updateLeadStatus`, `convertLead`, `getLeadFunnel`

**Review links** — `sendReviewLink`, `getReviewRequests`

To swap in a real backend, replace each function body with an HTTP call and keep the return shape identical. Bolded endpoints above are new in v3.0.

---

## 8. Branding & theming

### Brand palette (`tailwind.config.js`)

| Token | Hex | Use |
|---|---|---|
| `ticano-red` | `#CE313C` | Primary accent, CTA buttons |
| `ticano-red-dark` | `#a8252f` | Hover states |
| `ticano-red-light` | `#fce8ea` | Soft red backgrounds |
| `ticano-gray` | `#808686` | Logo gray, secondary accent |
| `ticano-charcoal` | `#373435` | Headings, dark surfaces |
| `ticano-bg` | `#F7F7F8` | Light background |
| `ticano-dark-bg` | `#1A1A1B` | Dark-mode background |
| `ticano-dark-card` | `#262627` | Dark-mode card surface |

Legacy tokens `ticano-navy` and `ticano-teal` are remapped to charcoal and red respectively so older classes keep working without rewrites.

### Logo system

`components/common/Logo.jsx` renders the official brand SVG. Two modes:

- **Mark only** — three swirling blades around negative space
- **Full lockup** (`withWordmark`) — mark + the custom "TICANO" wordmark with its tall N

Color and animation are prop-driven. Used in Navbar, login screen, feedback page, and the unauthorized view.

### Dark mode

Tailwind's class strategy (`darkMode: 'class'`). `ThemeContext` toggles a `dark` class on `<html>` and persists the preference.

---

## 9. Privacy & data-collection design

Five deliberate privacy patterns:

1. **No Omang** — Botswana national ID is never collected anywhere in the system.
2. **DOB is opt-in** — date of birth is only requested if the user opts into birthday messages.
3. **Location is opt-in** — `baseLocation` field appears only after the user enables location sharing.
4. **Anonymous complaints (§2)** — `anonymous: true` complaints store no name/phone/email; the customer becomes `ANON-XXXXXX` system-wide. The `ACCESS_MATRIX` in `constants.js` codifies that even administrators see only the anonymous ID. Identity recovery is impossible by design.
5. **Internal vs customer notes (§7)** — the API exposes separate `addInternalNote` and `addCustomerNote` endpoints. Staff notes never leak to the customer-facing complaint detail.

The profile page hides DOB and location fields when the corresponding opt-in is off, even if a stored value exists.

---

## 10. Build & run

### Local development

```bash
npm install
npm run dev      # Vite dev server on port 3000
```

### Production build

```bash
npm run build    # outputs to dist/
npm run preview  # serves dist/ for smoke-testing
```

### Project conventions

- ESM throughout (`"type": "module"` in package.json)
- JSX files use `.jsx`, plain JS uses `.js`
- No path aliases configured — all imports are relative
- No linter configured (room for future tooling)

---

## 11. Known boundaries of the prototype

This is a **UI prototype**. The following are out of scope for the current build and will require backend work to productionize:

- All data resets on page refresh (no persistence beyond `localStorage` for the auth session)
- No real authentication — any password is accepted
- No file uploads (the complaint form has no attachment field)
- No real WhatsApp/email integration (review links and bulk messages log to console)
- No multi-tenant isolation — branch filtering is presentational only
- No accessibility audit yet (semantic HTML and ARIA roles are present but not formally tested)
- No automated tests
