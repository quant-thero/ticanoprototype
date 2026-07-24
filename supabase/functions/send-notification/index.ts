//  EDGE FUNCTION: send-notification
//  One place that owns OUTBOUND messaging — because it needs API keys that
//  must never reach the browser. Used by: tender broadcasts, customer-facing
//  complaint updates, review-link requests, announcements.
//
//  Channels (pluggable):
//   - email    → Resend (https://resend.com)   [RESEND_API_KEY, EMAIL_FROM]
//   - whatsapp → Meta WhatsApp Cloud API        [WA_TOKEN, WA_PHONE_ID]
//   - inapp    → inserts a row into public.notifications
//
//  POST body:
//   {
//     "channels": ["email","whatsapp","inapp"],
//     "to": { "email": "...", "phone": "+267...", "userId": 42 },
//     "subject": "Complaint TCN-0007 update",
//     "message": "Your complaint has been resolved.",
//     "link": "/client/complaints/..."   // optional, for in-app
//   }
//  Auth: requires a logged-in STAFF caller (customers can't send).
import { corsHeaders, json, adminClient, getCaller } from '../_shared/utils.ts';

const STAFF = ['portfolio_manager', 'service_manager', 'director', 'marketing', 'admin'];

async function sendEmail(to: string, subject: string, message: string) {
  const key = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('EMAIL_FROM') ?? 'Ticano <noreply@ticanogroup.co.bw>';
  if (!key) return { ok: false, skipped: 'RESEND_API_KEY not set' };

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject, text: message }),
  });
  return { ok: res.ok, status: res.status, body: await res.text() };
}

async function sendWhatsApp(toPhone: string, message: string) {
  const token = Deno.env.get('WA_TOKEN');
  const phoneId = Deno.env.get('WA_PHONE_ID');
  if (!token || !phoneId) return { ok: false, skipped: 'WhatsApp secrets not set' };

  const res = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: toPhone.replace(/\D/g, ''),
      type: 'text',
      text: { body: message },
    }),
  });
  return { ok: res.ok, status: res.status, body: await res.text() };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const caller = await getCaller(req);
  if (!caller || !STAFF.includes(caller.role)) {
    return json({ error: 'Forbidden — staff only' }, 403);
  }

  let payload;
  try { payload = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

  const { channels = ['inapp'], to = {}, subject = '', message = '', link = null } = payload;
  if (!message) return json({ error: 'message is required' }, 400);

  const results: Record<string, unknown> = {};

  if (channels.includes('email') && to.email) {
    results.email = await sendEmail(to.email, subject || 'Ticano Group', message);
  }
  if (channels.includes('whatsapp') && to.phone) {
    results.whatsapp = await sendWhatsApp(to.phone, message);
  }
  if (channels.includes('inapp') && to.userId) {
    const { error } = await adminClient().from('notifications').insert({
      user_id: to.userId, type: payload.type || 'system', title: subject || 'Notification', body: message, link_tab: link,
    });
    results.inapp = { ok: !error, error: error?.message };
  }

  return json({ sent: true, by: caller.id, results });
});
