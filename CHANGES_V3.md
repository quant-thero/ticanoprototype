# Ticano v3.0 — Enhancement Spec Implementation

This release implements the V3 enhancement specification on top of the v2.0
codebase. The data layer (`src/services/api.js`) is a mock/in-memory layer, so
all new endpoints persist for the lifetime of the browser session.

> **Build note:** the bundled `node_modules` shipped with Windows-only native
> binaries (`@rollup/rollup-win32-*`, `@esbuild/win32-*`). On Linux/macOS run
> `npm install` (or delete `node_modules` + `package-lock.json` and reinstall)
> before `npm run dev` / `npm run build`. All source was validated by parsing
> every file and confirming every `services/api` import resolves to a real
> export.

---

## §1 — PM Escalation Rate KPI
`getPmEscalationRates({branch?})` → per-PM rate `(escalated ÷ assigned) × 100`,
branch average, top/bottom performers, and monthly/quarterly/annual views.
Surfaced in the new **Performance KPIs** tab (Director enterprise-wide; Service
Manager branch-scoped).

## §2 / §3 — Escalation hierarchy + working Escalate button
`escalateComplaint(id, {reason, by, fromRole})` now routes by role:
Portfolio Manager → **Service Manager**, Service Manager → **Director**;
customers are blocked. Every escalation writes a timeline entry, an audit log
entry, a notification (`getEscalationNotifications`), the reason and timestamp,
and keeps a full escalation `chain`. The Escalate button label and modal are
role-aware (e.g. "Escalate to Service Manager"). The PM and Service Manager
dashboards now pass `role` into the complaints module so the right target is
chosen.

## §4 — Branch management
`createBranch(...)` added; the Admin → Branch Management tab gains a **New
Branch** button with Name, Code, Region, Address, Contact, Email, Assigned
Service Manager and Status. Existing **edit** flow (`updateBranch`) verified
working.

## §5 — Employee account management
Users are now a mutable store. Admin → User Management gains **filters** (role /
branch / status) and a **Manage** modal with Edit details, Change Role, Change
Branch, Reset Password, Enable/Disable, and View Activity / Audit History
(`setUserActive`, `changeUserRole`, `changeUserBranch`, `adminResetEmployeePassword`,
`getUserActivity`, `updateUser`).

## §6 — Forgot Password
Login page has a **Forgot Password?** link → modal. Customers reset via email
verification (`requestCustomerPasswordReset`). Employees can't self-reset; Admin
issues a temporary password like `TCN-Temp-4582` (`adminResetEmployeePassword`)
that must be changed on next login.

## §7 — Configurable Branch Health Score weights
Weights are no longer hardcoded. New Admin → **Branch Health Score** tab with
sliders for Resolution Rate, Satisfaction, SLA Compliance, Escalation Rate and
Complaint Volume; saving validates the total **must equal 100%**
(`getHealthWeights` / `updateHealthWeights`). `getBranchHealthScores` recomputes
using the live weights.

## §8 — Monthly CSAT
`getMonthlyCsat({branch?})` returns current month, previous month, quarterly and
annual trends (weekly CSAT retired from the KPI view). Charted in the
Performance KPIs tab.

## §9 — Service Manager analytics restriction
The Service Manager Performance KPIs tab is scoped to `user.branch`; enterprise
figures remain Director/Admin only.

## §10 — Referral network
Optional **"Would you like to tell us who referred you?"** field appears on
registration when "Friend or Family Referral" is chosen. Referrers are logged
(`logReferral`) and surfaced via `getReferralNetworkDashboard` /
`getReferralLog` (top referrers, counts, trend, growth).

## §11 — Anonymous complaints removed
The "Submit as anonymous" toggle is removed from the complaint form; formal
complaints are always identifiable. (Anonymous remains available only in the
improvement-feedback module.)

## §12 — Lead conversion automation
On successful registration, a matching potential client (by phone/email) is
converted to **Converted** and removed from the active pipeline — no duplicates
(`registerCustomer` → returns `convertedLeadId`).

## §13 — Excel / CSV import for potential clients
Leads module gains an **Import** button + modal: upload XLSX/XLS/CSV (parsed
client-side with SheetJS), with a downloadable template. `importLeads(rows)`
validates required fields, detects duplicates by phone, imports valid rows and
returns a summary (received / imported / duplicates / invalid + row errors).

## §14 — Smart Assignment override
`assignComplaint` records whether the recommendation was followed and stores a
mandatory **override reason** (also written to internal notes + audit) when a
manager picks a different PM.

## §15 — Weekly analytics reports
`getWeeklyReport({branch?})` produces complaint counts, monthly CSAT, PM
rankings, SLA compliance and branch figures, with "Dashboard notification +
Email report" delivery. Generated from the Performance KPIs tab.

## §16 — Client capacity alerts
Per-PM capacity store with `getPmCapacity` / `setPmCapacity`. Alerts fire at
capacity ("PM Sarah has reached the maximum client capacity."), and Smart
Assignment (`recommendPm`) now penalises/avoids PMs at or near capacity.

## §17 — Feedback visibility
Improvement feedback is filterable by branch (`getImprovementFeedback({branch})`);
the Service Manager view is branch-scoped while Director/Admin see all.

## §18 — Setswana correction
"Welcome Back" now translates to **"Re go amogela gape"** (was "Boi gape").

## §19 — First Contact Resolution Rate (FCR)
`getFcrRates({branch?})` → per-PM, per-branch and company-wide
`(resolved without escalation ÷ total) × 100`. Charted in Performance KPIs.

## §20 / §21 — Branding & ticket prefix
Verified: no "Ticaano" / "Ticano Care" references remain; ticket prefix is
`TCN-` throughout.

---

## Addendum — Client "Rate Your Last Experience" + tab order
- **Rate Your Last Experience** card added to the **Overview** tab (fully
  functional rating + comment).
- Feedback submitted from **either** the Overview card or the Feedback History
  tab writes to a single shared state, so it appears immediately in both with no
  duplication.
- Navigation reordered to **Overview → Feedback History → Complaints → …**.

## Fixed along the way
- `Modal` now accepts both `isOpen` and `open`, plus an optional `footer` prop.
  This repaired three call sites that passed `open=`/`footer=` and therefore
  never rendered (Leads "New Lead" modal, Review-link sender, Director PM
  details modal).
