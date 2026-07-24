// Creates a staff login (Portfolio Manager, Service Manager, Director,
// Marketing or Admin). Admin only. Customers sign themselves up through
// the normal register flow, RLS blocks that path from creating any other
// role.
//
// POST body:
//   {
//     "name": "Jane Doe",
//     "email": "jane@ticanogroup.co.bw",
//     "password": "TempPass123!",
//     "role": "portfolio_manager" | "service_manager" | "director" | "marketing" | "admin",
//     "branch": "Gaborone",   // required for Portfolio Manager and Service Manager
//     "jobTitle": "Portfolio Manager"   // optional
//   }
// Returns: { userId, name, email, role, branch }
import { corsHeaders, json, adminClient, getCaller } from '../_shared/utils.ts';

const STAFF_ROLES = ['portfolio_manager', 'service_manager', 'director', 'marketing', 'admin'];
const BRANCH_REQUIRED_ROLES = ['portfolio_manager', 'service_manager'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const caller = await getCaller(req);
  if (!caller) return json({ error: 'Not authenticated' }, 401);
  if (caller.role !== 'admin') return json({ error: 'Forbidden — admin only' }, 403);

  let body;
  try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
  const { name, email, password, role, branch, jobTitle } = body;

  if (!name?.trim()) return json({ error: 'Name is required' }, 400);
  if (!email?.trim()) return json({ error: 'Email is required' }, 400);
  if (!password || password.length < 8) return json({ error: 'Password must be at least 8 characters' }, 400);
  if (!STAFF_ROLES.includes(role)) return json({ error: `Role must be one of: ${STAFF_ROLES.join(', ')}` }, 400);
  if (BRANCH_REQUIRED_ROLES.includes(role) && !branch) {
    return json({ error: 'Branch is required for Portfolio Manager / Service Manager accounts' }, 400);
  }
  // Director, Marketing and Admin are org-wide, no branch of their own,
  // so drop whatever branch value came in for them rather than trusting it.
  const effectiveBranch = BRANCH_REQUIRED_ROLES.includes(role) ? branch : null;

  const db = adminClient();

  // Resolve branch name -> id, if given.
  let branchId = null;
  if (effectiveBranch) {
    const { data: branchRow } = await db.from('branches').select('id').eq('name', effectiveBranch).maybeSingle();
    if (!branchRow) return json({ error: `Unknown branch "${effectiveBranch}"` }, 400);
    branchId = branchRow.id;
  }

  // 1. Create the Auth account. email_confirm skips the confirmation
  //    email since an admin is vouching for this address directly.
  const { data: authData, error: authError } = await db.auth.admin.createUser({
    email, password, email_confirm: true,
  });
  if (authError) return json({ error: authError.message }, 400);

  // 2. Create the linked `users` row.
  const { data: appUser, error: userError } = await db
    .from('users')
    .insert({
      auth_user_id: authData.user.id,
      full_name: name,
      email,
      role,
      branch_id: branchId,
      must_change_password: true,
    })
    .select('id, full_name, email, role')
    .single();

  if (userError) {
    // Don't leave an orphaned auth account behind if the users insert fails.
    await db.auth.admin.deleteUser(authData.user.id);
    return json({ error: userError.message }, 500);
  }

  // 3. Create the staff profile.
  const { error: staffError } = await db.from('staff_profiles').insert({
    user_id: appUser.id,
    job_title: jobTitle || null,
  });
  if (staffError) return json({ error: staffError.message }, 500);

  await db.from('site_audit_log').insert({
    area: 'admin.create_staff',
    field: 'role',
    new_value: `${email} (${role})`,
    changed_by: `admin#${caller.id}`,
  });

  return json({
    message: `${role.replace('_', ' ')} account created for ${name}`,
    userId: appUser.id, name: appUser.full_name, email: appUser.email, role: appUser.role, branch: effectiveBranch,
  });
});
