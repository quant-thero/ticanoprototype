//  EDGE FUNCTION: admin-reset-password
//  In the app, employees cannot self-reset; an Admin resets their password
//  and issues a temporary one. That requires the Auth Admin API + the
//  service-role key — both server-side only. This function:
//    1. verifies the CALLER is an admin,
//    2. resets the target user's password to a generated temporary value,
//    3. writes a site_audit_log row.
//
//  POST body: { "userId": 42 }   -- the target's bigint app user id (users.id)
//  Returns:   { tempPassword } — show once to the admin, never store.
import { corsHeaders, json, adminClient, getCaller } from '../_shared/utils.ts';

function tempPassword(len = 12): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return [...bytes].map((b) => alphabet[b % alphabet.length]).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const caller = await getCaller(req);
  if (!caller) return json({ error: 'Not authenticated' }, 401);
  if (caller.role !== 'admin') return json({ error: 'Forbidden — admin only' }, 403);

  let body;
  try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
  const { userId } = body;
  if (!userId) return json({ error: 'userId is required' }, 400);
  if (userId === caller.id) return json({ error: 'Use the normal flow to change your own password' }, 400);

  const db = adminClient();

  // Confirm the target exists and is staff (clients self-reset via email).
  // `userId` is the bigint app id (users.id); we need their auth UUID
  // (auth_user_id) to call the Auth Admin API.
  const { data: target, error: tErr } = await db
    .from('users')
    .select('id, full_name, role, email, auth_user_id')
    .eq('id', userId)
    .single();
  if (tErr || !target) return json({ error: 'Target user not found' }, 404);
  if (target.role === 'customer') {
    return json({ error: 'Clients reset their own password via email' }, 400);
  }
  if (!target.auth_user_id) {
    return json({ error: 'This staff member has no linked auth account yet' }, 400);
  }

  const newPassword = tempPassword();
  const { error: updErr } = await db.auth.admin.updateUserById(target.auth_user_id, {
    password: newPassword,
  });
  if (updErr) return json({ error: updErr.message }, 500);

  await db.from('users').update({ must_change_password: true }).eq('id', target.id);

  // Audit the action (who reset whom, when).
  await db.from('site_audit_log').insert({
    area: 'auth.password_reset',
    field: 'password',
    previous_value: `user:${target.email}`,
    new_value: 'temporary password issued',
    changed_by: `admin#${caller.id}`,
  });

  // The admin must hand this to the employee out-of-band; it is never stored.
  return json({
    message: `Temporary password issued for ${target.full_name}`,
    tempPassword: newPassword,
  });
});
