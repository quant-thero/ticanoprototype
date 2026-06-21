# Ticano v2.0 — Redesign

This release transforms the previous "Ticano Care" customer-experience tool
into **Ticano**, a complaint-tracking and customer-service platform for a
Purchase Order Financing specialist.

## Brand
- Rebranded "Ticano Care" → **Ticano** across the product (login, header, footer,
  browser title, demo accounts, feedback form, etc.).
- Adopted the **official brand SVG** as the logo source (gray `#808686`, red `#CE313C`,
  charcoal `#373435`).
- New tagline: **Purchase Order Financing Specialists**.

## Login experience
- Replaced the centred logo-and-text with a polished **background image + frosted-glass
  card** layout (`/public/images/login-bg.svg`).
- The "Ticano" wordmark on the login screen is rendered from the actual SVG logo path,
  so the word styling matches the lockup exactly.
- New tagline displayed prominently above the form.

## Roles
- Renamed **Branch Manager → Service Manager** everywhere (role keys, demo accounts,
  routes, navigation, dashboards, notifications, audit logs).
- New role key `service_manager`; route `/service-manager`.

## Complaint-tracking system (new core workflow)
- Added a complaint ticket model with format **TCN-0001 / TCN-0002 …**.
- Complaints are tagged to a **customer journey stage**:
  - Before Applying
  - During Application
  - After Loan Disbursement
- Each stage offers its own category options:
  - Before Applying — Poor service · Information not provided · Delayed response · Difficulty contacting staff · Other
  - During Application — Application delays · Missing feedback · Staff conduct · Documentation issues · Other
  - After Loan Disbursement — Follow-up service · Payment issues · Customer support issues · Incorrect information · Other
- Statuses: Submitted → Assigned → Under Review → Customer Contacted → (Escalated) → Resolved.
- Customers see a **live queue position** ("You are number 3 in the queue") while
  their complaint is open.
- Every complaint is tagged as **New Client** or **Existing Client** (§6).

## Service Manager workflow
- Service Manager creates / assigns / reassigns complaints to PMs.
- Brand-new escalation workflow: PMs hit **Escalate to Management**, which
  - changes the complaint status to `escalated`,
  - notifies Service Manager + Director,
  - requires (and stores permanently) a written reason.

## Active client analytics
- New **New vs Existing** active-client analytics surface, available on
  Service Manager · Director · Marketing dashboards.
- Trend charts, branch breakdowns, conversion + retention metrics.

## Customer profile changes
- Removed **Omang** entirely from registration, profile, and analytics (§13).
- **Date of Birth is optional** and only collected when the user opts into
  birthday messages (§14). The DOB field is hidden until the toggle is on.
- Added **location sharing opt-in** with a clear checkbox; town/city is only
  collected when the user opts in (§16).

## Removed
- Application-tracking module (timelines, stages, document verification,
  approval/rejection flow, "Awaiting Pending Decision").
- Client transfers (cross-branch transfers, transfer-request approvals,
  case transfers between PMs as a separate flow).

## Visual upgrades
- New gradient hero banners on the client dashboard.
- Modern cards with icons in the complaint summary view.
- Background-image login page.
- Brand-color discipline: all new code uses `ticano-red` and `ticano-gray`;
  legacy `ticano-teal` classes now resolve to the brand red via Tailwind
  remap so old screens stay on-brand without breaking.

## Director / Leadership
- New **Leadership** tab on the Director dashboard featuring Opelo Motswagae
  (director portrait at `src/assets/images/director-portrait.svg`).
- Replace the SVG with a real JPEG at that path to use the actual photograph.

## Demo logins (updated)
| Role             | Email                  |
| ---------------- | ---------------------- |
| Client           | `client@demo.com`      |
| Portfolio Manager| `pm@demo.com`          |
| Service Manager  | `service@demo.com`     |
| Director         | `director@demo.com`    |
| Marketing        | `marketing@demo.com`   |
| Admin            | `admin@demo.com`       |
