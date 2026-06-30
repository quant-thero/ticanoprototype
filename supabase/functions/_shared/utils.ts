// =====================================================================
//  SHARED HELPERS for Edge Functions
//  CORS, a service-role admin client, and caller-identity verification.
// =====================================================================
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
// role from public.profiles. Returns null if not authenticated.
export async function getCaller(
  req: Request,
): Promise<{ id: string; role: string } | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;

  // A client scoped to the caller's JWT — getUser() validates the token.
  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
  );
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return null;

  const admin = adminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  return { id: user.id, role: profile?.role ?? 'customer' };
}
