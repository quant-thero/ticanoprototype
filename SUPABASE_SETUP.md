# Connecting Ticano to Supabase

This project now ships with everything needed to move off the in-memory mock
(`src/services/api.js`) and onto a real Supabase backend. The app still runs on
the mock until you opt a module in, so nothing breaks before the database is ready.

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
It creates the tables, enums, generated IDs (`TIC-000001`, `TCN-0001`),
`updated_at` triggers, storage buckets, and — importantly — the Row Level
Security policies that enforce role/branch access in the database itself.

Then seed the five branches and the singleton config rows (see the "SEED NOTES"
section at the bottom of the schema).

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

(`sendReviewLink` stays on `../../services/api` until you implement it against
the `review_requests` table.)

Repeat the same pattern for the other modules: add their functions to
`supabaseApi.js` querying the matching schema tables, then flip the import.

## 5. Real authentication (when ready)

`supabaseApi.js` includes `signIn`, `signOut`, `getSession`, `onAuthChange`, and
`getMyProfile`. To go live, wire these into `src/context/AuthContext.jsx` in
place of the mock `login()`. A user's role and branch come from their
`profiles` row, which is created automatically on signup by the
`handle_new_user()` trigger in the schema.

## Files added

| File | Purpose |
|------|---------|
| `src/services/supabaseClient.js` | Supabase client singleton (reads env vars) |
| `src/services/supabaseApi.js` | Real data layer (leads + branches + auth example) |
| `supabase/schema.sql` | Full database schema + RLS + storage |
| `.env.local` | Local credentials (git-ignored) |
| `.env.example` | Committed template |
| `.gitignore` | Updated to exclude real env files |

## Note on scope

The client and env wiring are production-ready. The data layer is a scaffold:
Leads is fully implemented as the reference; the remaining modules follow the
same pattern but should be added and tested against your live database before
you rely on them. Always verify the RLS policies with real logins for each role.
