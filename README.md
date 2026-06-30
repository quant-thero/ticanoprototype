# Ticano

> Purchase Order Financing Specialists — Customer service & complaint-tracking platform

A complete React + Vite UI for Ticano's customer service operations, focused on complaint
intake, queue management, escalations, and analytics across the customer journey.

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## Demo logins

Any password works in mock mode.

| Role             | Email                  | Notes                                            |
| ---------------- | ---------------------- | ------------------------------------------------ |
| Client           | client@demo.com        | Stacey Nthoi — existing client                   |
| Portfolio Manager| pm@demo.com            | Mojaboswa — handles assigned complaints          |
| Service Manager  | service@demo.com       | Janine Seabenyane — assigns and resolves         |
| Director         | director@demo.com      | Opelo Motswagae — escalations, analytics         |
| Marketing        | marketing@demo.com     | Katlego — client mix, referrals                  |
| Admin            | admin@demo.com         | Thero Setlhare — users, branches, config         |

## Domain model

The product is built around a **complaint ticket** flow:

1. A customer submits a complaint via the client dashboard.
2. The complaint is tagged to a **customer journey stage**:
   - Before Applying
   - During Application
   - After Loan Disbursement
3. A **ticket number** (`TCN-0001`, `TCN-0002`, …) is generated.
4. The Service Manager assigns the complaint to a Portfolio Manager.
5. The PM works the case, optionally **escalates to Management**.
6. The case is resolved and the customer is notified.

Customers see live **queue position** while their complaint is open.
Every complaint is tagged as coming from a **New** or **Existing** client,
driving the active-client analytics across Service Manager / Director /
Marketing dashboards.

## Brand

- Gray: `#808686`
- Red: `#CE313C`
- Charcoal: `#373435`

The Ticano logo SVG lives in `public/ticano-logo.svg` and is also embedded
directly into `src/components/common/Logo.jsx` so the brand mark renders
crisply at any size with the option of a `withWordmark` lockup.

## Project structure

```
src/
  App.jsx                       Routes
  assets/
    images/
      director-portrait.svg     Director placeholder image (replace with JPEG)
  components/common/
    Logo.jsx                    Official brand logo (mark + wordmark)
    Navbar.jsx
    UI.jsx                      Shared primitives (Card, Tabs, StatCard, Badge…)
    ComplaintTimeline.jsx       Vertical event log for a complaint
    ComplaintTracker.jsx        Customer-facing ticket card + queue position
    ComplaintForm.jsx           Submission form with journey-stage categories
    ComplaintsModule.jsx        Staff complaint workspace (assign, escalate, resolve)
    LeadsModule.jsx             Potential client capture
    ReviewLinkSender.jsx        WhatsApp review-link sender
    BranchDetailView.jsx        Branch drill-down
  context/                      Auth, Theme, Notification providers
  pages/
    LoginPage.jsx               Background image + brand lockup
    RegisterPage.jsx            No Omang; conditional DOB; location opt-in
    ClientDashboard.jsx         Complaint tracking + submission
    PmDashboard.jsx             Assigned complaints + ratings
    ServiceManagerDashboard.jsx Assign, escalate, resolve; analytics
    DirectorDashboard.jsx       Leadership view; complaint + active-client analytics
    MarketingDashboard.jsx      Client Mix, referrals, demographics
    AdminDashboard.jsx          Users, branches, config
    ProfilePage.jsx             Per-user preferences
    FeedbackFormPage.jsx        Public rating form
  services/api.js               Mock API (no backend required)
  utils/
    constants.js                Domain enums (journey stages, statuses, roles)
    format.js                   Pula / date / percent helpers
    exporter.js                 CSV / Excel export
```

## Customisation

- Replace `src/assets/images/director-portrait.svg` with a real JPEG (use the same path).
- Replace `public/images/login-bg.svg` with your own background image.
- Edit `src/utils/constants.js` to adjust roles, complaint categories, or branches.

