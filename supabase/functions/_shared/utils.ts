//  SHARED HELPERS for Edge Functions
//  CORS, a service-role admin client, and caller-identity verification.
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // tighten to your domain in production
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically into
// the Edge runtime. The service-role client BYPASSES Row Level Security — use
// it only inside trusted server code, never expose it to the browser.
export function adminClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );
}

// Resolve the calling user from their Authorization header, then look up their
// role from public.users (linked via auth_user_id — see
// supabase/migrations/001_auth_link_and_rls.sql). Returns null if not
// authenticated.
export async function getCaller(
  req: Request,
): Promise<{ authId: string; id: number; role: string; branchId: number | null } | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;

  // Use the API key the client actually sent (apikey header) rather than
  // Deno.env.get('SUPABASE_ANON_KEY') — that env var can be stale/mismatched
  // for projects using the newer sb_publishable_/sb_secret_ key format,
  // which silently breaks token validation (getUser() returns no user
  // instead of throwing, so the failure is easy to miss).
  const clientKey = req.headers.get('apikey') || Deno.env.get('SUPABASE_ANON_KEY')!;

  // A client scoped to the caller's JWT — getUser() validates the token.
  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    clientKey,
    { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
  );
  const { data: { user }, error } = await userClient.auth.getUser();
  if (error || !user) {
    console.error('[getCaller] auth.getUser() failed:', error?.message);
    return null;
  }

  const admin = adminClient();
  const { data: appUser, error: dbError } = await admin
    .from('users')
    .select('id, role, branch_id')
    .eq('auth_user_id', user.id)
    .single();

  if (dbError || !appUser) {
    console.error('[getCaller] no matching users row for auth_user_id:', user.id, dbError?.message);
    return null;
  }
  return { authId: user.id, id: appUser.id, role: appUser.role, branchId: appUser.branch_id };
}
