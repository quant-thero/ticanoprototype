# Ticano

A customer service and complaint-tracking platform for Ticano, a purchase order financing company in Botswana. Built with React and Vite.

Covers complaint intake, queue management, escalations, and analytics across the customer journey, from client dashboard through to director level reporting.

Developed by Thero Setlhare and Stacey Nthoi.

## Getting started

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

## Environment setup

Copy the example environment file and fill in your own values before running the app against a real backend:

```bash
cp .env.example .env.local
```

See [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for provisioning the database, running migrations, and configuring Supabase Auth. Account creation and sign-in go through Supabase Auth; there are no seeded or hardcoded accounts, create your own users through the Register page or the Admin dashboard once a project is connected.

## The Ask Ticano assistant

A floating chat widget is available on every page. It runs on Groq's OpenAI-compatible tool-calling API; the transport layer is thin enough to swap providers later without touching much else.

To enable it, paste a key into `VITE_GROQ_API_KEY` in `.env.local`. Keys are free at https://console.groq.com. Without a key, the widget still opens, it simply tells visitors it isn't configured yet instead of throwing an error.

Permissions follow the same `ACCESS_MATRIX` used everywhere else:

- A public visitor can ask about company info, services, branches, and FAQs. If they ask about anything personal it tells them to sign in rather than guessing at an answer.
- A client gets all of that plus their own complaint status, history, and profile. Never another client's.
- Portfolio Managers and Service Managers can search complaints, see the pending queue, and use the internal knowledge base, scoped to their own branch.
- Directors and Admins get all of that nationally, plus complaint analytics, branch performance, and executive summaries.

The pieces, if you're exploring the code:

- `src/services/aiTools.js` — the tool registry. Every database read the assistant is allowed to make, each one permission-checked before it runs. The model never writes its own queries; it only calls these.
- `src/services/groqClient.js` — a thin fetch wrapper around Groq's chat completions endpoint.
- `src/services/aiService.js` — the orchestration layer: a role-aware system prompt, the tool-calling loop, and a separate structured-extraction pass for the AI Inbox (summary, intent, category, urgency).
- `src/context/AIAssistantContext.jsx` — conversation state and open/close handling for the widget.
- `src/components/ai/TicanoAssistantWidget.jsx` — the widget itself.
- `src/components/ai/AIInbox.jsx` — the staff-facing conversation log, with search, assign, and mark-resolved. It's wired into the PM, Service Manager, Director, and Admin dashboards as an "AI Inbox" tab.

Conversations are logged through the existing mock API, the same `localStorage` pattern already used for homepage announcements and promos.

**Before this goes live:** the Groq key currently ships in the browser bundle since there's no backend yet. Move the call in `groqClient.js` behind a Supabase Edge Function before making this public. A pattern for that already exists in `supabase/functions/`, and no other file needs to change to make the swap.

## How a complaint moves through the system

1. A customer submits a complaint from the client dashboard.
2. It gets tagged to a customer journey stage: before applying, during application, or after loan disbursement.
3. A ticket number is generated (TCN-0001, TCN-0002, and so on).
4. The Service Manager assigns it to a Portfolio Manager.
5. The PM works the case and can escalate to management if needed.
6. The case gets resolved and the customer is notified.

Customers can see their live queue position while a complaint is open. Every complaint also gets tagged as coming from a new or existing client, which feeds the active client analytics on the Service Manager, Director, and Marketing dashboards.

## Brand

Gray is `#808686`, red is `#CE313C`, charcoal is `#373435`.

The logo SVG lives in `public/ticano-logo.svg` and is also embedded directly in `src/components/common/Logo.jsx`, so it renders crisply at any size. There's a `withWordmark` option if you need the full lockup.

## Project layout

`src/App.jsx` holds the routes.

Under `src/components/common/` are the shared building blocks: `Logo.jsx`, `Navbar.jsx`, `UI.jsx` (Card, Tabs, StatCard, Badge, and other primitives), `ComplaintTimeline.jsx`, `ComplaintTracker.jsx`, `ComplaintForm.jsx`, `ComplaintsModule.jsx`, `LeadsModule.jsx`, `BranchDetailView.jsx`, and `QuoteCalculator.jsx` (the PO/quote estimate widget; fields are "Loan Amount" and "PO Amount/Contract Amount", with rates configurable by Admin).

The assistant lives under `src/components/ai/`: `TicanoAssistantWidget.jsx` and `AIInbox.jsx`.

`src/context/` holds the Auth, Theme, Notification, and AI Assistant providers.

Under `src/pages/` there is one file per dashboard: `LoginPage.jsx`, `RegisterPage.jsx`, `ClientDashboard.jsx`, `PmDashboard.jsx`, `ServiceManagerDashboard.jsx`, `DirectorDashboard.jsx`, `MarketingDashboard.jsx`, `AdminDashboard.jsx`, `ProfilePage.jsx`, and `FeedbackFormPage.jsx`.

`src/services/` holds the mock API, the AI tool registry and orchestration, and the Groq transport.

`src/utils/` holds the domain constants, formatting helpers (Pula, dates, percentages), and the CSV/Excel exporter.

## Customising

Swap `src/assets/images/director-portrait.svg` for a real photo, keeping the same path. Do the same for `public/images/login-bg.svg`. Roles, complaint categories, and branches all live in `src/utils/constants.js`.

## Authors

Built by Thero Setlhare and Stacey Nthoi.
