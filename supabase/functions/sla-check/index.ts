//  EDGE FUNCTION: sla-check   (scheduled — runs daily via pg_cron)
//  Finds OPEN complaints older than the SLA window (14 days, per
//  SLA_BREACH_DAYS in the app) and, for each newly-breached one:
//    - writes an audit row (complaint_audit)
//    - notifies the assigned PM, their Service Manager, and the Director
//
//  This is invoked server-to-server by pg_cron (see schedule.sql), so it is
//  NOT gated by a user login. Instead it requires a shared CRON_SECRET in the
//  Authorization header to stop the public from triggering it.
import { corsHeaders, json, adminClient } from '../_shared/utils.ts';

const SLA_BREACH_DAYS = 14;
const OPEN_STATUSES = [
  'created', 'assigned', 'in_progress', 'customer_contacted', 'pending_customer', 'escalated',
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // Shared-secret gate (set CRON_SECRET via `supabase secrets set`).
  const secret = Deno.env.get('CRON_SECRET');
  if (secret && req.headers.get('Authorization') !== `Bearer ${secret}`) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const db = adminClient();
  const cutoff = new Date(Date.now() - SLA_BREACH_DAYS * 86400_000).toISOString();

  // Open complaints created before the cutoff = breached.
  const { data: breached, error } = await db
    .from('complaints')
    .select('id, ticket, branch_id, assigned_pm_id, created_at, status')
    .in('status', OPEN_STATUSES)
    .lt('created_at', cutoff);
  if (error) return json({ error: error.message }, 500);

  let flagged = 0;
  for (const c of breached ?? []) {
    // Skip if we already logged a breach for this complaint (idempotent).
    const { data: already } = await db
      .from('complaint_audit_log')
      .select('id')
      .eq('complaint_id', c.id)
      .eq('action', 'SLA Breach')
      .maybeSingle();
    if (already) continue;

    const days = Math.floor((Date.now() - new Date(c.created_at).getTime()) / 86400_000);

    await db.from('complaint_audit_log').insert({
      complaint_id: c.id, ticket: c.ticket, action: 'SLA Breach',
      previous_value: c.status, new_value: `open ${days} days`, performed_by: 'System (SLA monitor)',
    });

    // Notify the assigned PM (if any) + the branch Service Manager + Directors.
    // (bigint app user ids — users.id — not auth UUIDs; notifications.user_id
    // references users(id) directly.)
    const recipientIds = new Set<number>();
    if (c.assigned_pm_id) recipientIds.add(c.assigned_pm_id);

    const { data: managers } = await db
      .from('users')
      .select('id, role, branch_id')
      .or(`and(role.eq.service_manager,branch_id.eq.${c.branch_id}),role.eq.director`);
    (managers ?? []).forEach((m) => recipientIds.add(m.id));

    if (recipientIds.size) {
      await db.from('notifications').insert(
        [...recipientIds].map((uid) => ({
          user_id: uid,
          type: 'escalation',
          title: `SLA breach — ${c.ticket}`,
          body: `Complaint ${c.ticket} has been open ${days} days (SLA is ${SLA_BREACH_DAYS}).`,
          link_tab: 'Escalations',
        })),
      );
    }
    flagged++;
  }

  return json({ ranAt: new Date().toISOString(), checked: breached?.length ?? 0, flagged });
});
