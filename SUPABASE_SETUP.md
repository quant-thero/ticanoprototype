# Connecting Ticano to Supabase

This project now ships with everything needed to move off the in-memory mock
(`src/services/api.js`) and onto a real Supabase backend. The app still runs on
the mock until you opt a module in, so nothing breaks before the database is ready.

## Current status (read this first)

`supabase/schema.sql` defines the full table structure — 41 tables covering
identity, complaints, leads, the Client Portfolio (PM CRM), questionnaires,
marketing content, and a merged system-wide audit log — grounded directly in
what `src/services/api.js` currently does.

Two things are **not** in the schema yet, on purpose, because they depend on a
decision only you can make:

1. **Auth approach.** The schema's `users` table is a self-contained identity
   table with its own `password_hash` column — it does **not** assume Supabase
   Auth. If you'd rather use Supabase Auth (recommended for production — you get
   password resets, magic links, and RLS's `auth.uid()` for free), add an
   `auth_user_id UUID REFERENCES auth.users(id)` column to `users` and create a
   `handle_new_user()` trigger to populate it on signup. If you keep the custom
   table as-is, you'll handle password hashing/verification yourself (e.g. in a
   Supabase Edge Function, never client-side).
2. **Row Level Security (RLS).** No RLS policies are defined yet. Once the auth
   approach above is settled, add policies mirroring the app's role scopes — a
   Portfolio Manager sees only their own complaints and portfolio clients, a
   Service Manager only their branch, Director/Admin see everything, a customer
   sees only their own records.

`supabase/schema.sql.previous_project_version` is kept for reference — it was
an earlier version of this schema built around Supabase Auth with RLS and
storage buckets already wired in. If you'd prefer that approach instead of the
custom-`users`-table design above, it's a better starting point; just note it
predates the Client Portfolio module, the merged system audit log, and a few
other fields added since.

## 1. Install dependencies

A new dependency (`@supabase/supabase-js`) was added to `package.json`:

```bash
npm install
```

## 2. Set your environment variables

Copy the template and fill in your project values:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

- `VITE_SUPABASE_URL` — your project URL, e.g. `https://abcdxyz.supabase.co`
  (Supabase Dashboard → Project Settings → Data API → Project URL).
- `VITE_SUPABASE_ANON_KEY` — your **publishable** key (already filled in if you
  used the generated `.env.local`).

`.env.local` is git-ignored. `.env.example` is the only env file committed to
GitHub. **Restart `npm run dev` after editing `.env.local`** — Vite only reads
env files at startup.

> Never put the Supabase **service_role** (secret) key in a `VITE_` variable or
> any committed file. It bypasses Row Level Security and is server-side only.

## 3. Create the database

In the Supabase Dashboard → SQL Editor, paste and run `supabase/schema.sql`.
It creates the tables, enums, generated IDs (`TIC-000001`, `TCN-0001`), and
`updated_at` triggers. It does **not** yet create RLS policies or storage
buckets — see "Current status" above before going live with real data.

Then seed the five branches and lookup tables (already included near the
bottom of the schema as `INSERT` statements) and any singleton config rows
(`site_settings`, `homepage_announcements`, `homepage_promos`) your app needs
on first load.

## 4. Switch a module from mock to real

The Supabase data layer lives in `src/services/supabaseApi.js` and mirrors the
mock's function names and return shapes (`{ data }`), so switching a module is a
one-line import change. Leads is provided as a complete worked example.

In `src/components/common/LeadsModule.jsx`, change:

```js
import { getLeads, createLead, importLeads, updateLeadStatus, convertLead } from '../../services/api';
```

to:

```js
import { getLeads, createLead, importLeads, updateLeadStatus, convertLead } from '../../services/supabaseApi';
```

Repeat the same pattern for the other modules: add their functions to
`supabaseApi.js` querying the matching schema tables, then flip the import.
Given how many modules the mock covers (complaints, client portfolio,
questionnaires, marketing content, and more), plan to do this incrementally,
module by module, testing each against your live database before moving on —
not as a single all-at-once rewrite.

## 5. Real authentication (when ready)

`supabaseApi.js` includes `signIn`, `signOut`, `getSession`, `onAuthChange`, and
`getMyProfile` as a starting point for Supabase Auth. These assume you've taken
the Supabase Auth path from "Current status" above (a `profiles`-style table
keyed by `auth.uid()`) rather than the schema's default self-contained `users`
table — adjust to match whichever approach you choose.

## Files added

| File | Purpose |
|------|---------|
| `src/services/supabaseClient.js` | Supabase client singleton (reads env vars) |
| `src/services/supabaseApi.js` | Real data layer (leads + branches + auth example) |
| `supabase/schema.sql` | Full database schema (41 tables) — no RLS/storage yet |
| `supabase/schema.sql.previous_project_version` | Earlier Supabase-Auth-based schema, kept for reference |
| `.env.local` | Local credentials (git-ignored) |
| `.env.example` | Committed template |
| `.gitignore` | Updated to exclude real env files |

## Note on scope

The client and env wiring are ready to use. The data layer is a scaffold:
Leads is fully implemented as the reference; the remaining modules follow the
same pattern but should be added and tested against your live database before
you rely on them. Decide on the auth approach and add RLS policies before
storing any real client data.

