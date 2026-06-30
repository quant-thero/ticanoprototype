# Ticano Edge Functions

The pieces that can't live in the browser because they need secrets, bypass
Row Level Security, or run on a schedule. Three functions:

| Function | Why it's server-side | Trigger |
|----------|----------------------|---------|
| `send-notification` | Holds email/WhatsApp API keys | Called from the app (staff only) |
| `sla-check` | Bulk DB scan + notifications | `pg_cron`, daily |
| `admin-reset-password` | Uses Auth Admin API + service_role | Called from the app (admin only) |

Shared code (CORS, the service-role client, caller verification) is in
`_shared/utils.ts`.

## 1. Set secrets

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are
injected automatically. You set the rest:

```bash
supabase secrets set RESEND_API_KEY=re_xxx
supabase secrets set EMAIL_FROM="Ticano <noreply@ticanogroup.co.bw>"
supabase secrets set WA_TOKEN=EAAG...            # Meta WhatsApp Cloud API
supabase secrets set WA_PHONE_ID=1234567890
supabase secrets set CRON_SECRET=$(openssl rand -hex 24)
```

> The email/WhatsApp providers are pluggable. `send-notification` uses Resend
> and the Meta WhatsApp Cloud API as concrete examples; swap the two `fetch`
> calls for SendGrid / Twilio / etc. if you prefer. If a provider's secret is
> unset, that channel is skipped (it won't crash).

## 2. Deploy

```bash
supabase functions deploy send-notification
supabase functions deploy sla-check
supabase functions deploy admin-reset-password
```

## 3. Schedule the cron job

Deploy `sla-check` first, then run `schedule.sql` in the SQL editor (edit the
`<PROJECT-REF>` and `<YOUR_CRON_SECRET>` placeholders first).

## 4. Call from the app

```js
import { supabase } from './services/supabaseClient';

// send a customer update via WhatsApp + in-app
await supabase.functions.invoke('send-notification', {
  body: {
    channels: ['whatsapp', 'inapp'],
    to: { phone: '+26771234567', userId: clientProfileId },
    subject: 'Complaint TCN-0007 update',
    message: 'Your complaint has been resolved. Thank you for your patience.',
    link: '/client/complaints/abc',
  },
});

// admin resets an employee password
const { data } = await supabase.functions.invoke('admin-reset-password', {
  body: { userId: targetUserId },
});
// data.tempPassword — show once, hand to the employee, never store.
```

`supabase.functions.invoke` automatically attaches the logged-in user's JWT,
which is how the functions verify the caller's role.

## Note on scope

These are working sketches against the schema, not hardened production code.
Before going live you'd want: input validation on every field, rate limiting
on `send-notification`, retry/queue handling for failed sends (a delivery log
table), tightening `Access-Control-Allow-Origin` to your domain, and tests for
each role path. `sla-check` is written to be idempotent (it won't double-flag a
complaint), but verify that against your data before trusting the cron.
