// SUPABASE CLIENT (singleton)
// Reads credentials from .env.local via Vite's import.meta.env.
// Only variables prefixed with VITE_ are exposed to the browser.
// Remember to RESTART `npm run dev` after editing .env.local.
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// True only when real values are present (not the placeholder template).
export const isSupabaseConfigured = Boolean(
  url && anonKey && !url.includes('YOUR-PROJECT-REF')
);

if (!isSupabaseConfigured) {
  // Don't throw, the app still runs on the mock layer. Just warn loudly.
  // eslint-disable-next-line no-console
  console.warn(
    '[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are missing or still ' +
    'set to the placeholder. Real Supabase calls will fail until you fill in ' +
    '.env.local and restart the dev server. The app continues on the mock API.'
  );
}

export const supabase = createClient(
  isSupabaseConfigured ? url : 'https://placeholder.supabase.co',
  isSupabaseConfigured ? anonKey : 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

// Dev-only connection test. Logs the result to the browser console on
// startup. Unlike a bare getSession() check (which reads local storage and
// can't detect a wrong URL/key), this makes a real round-trip to the API.
export async function testSupabaseConnection() {
  if (!isSupabaseConfigured) {
    console.warn('[supabase] Not configured, fill in .env.local and restart. Skipping connection test.');
    return;
  }
  // 1) Is the auth endpoint reachable? (validates the client is well-formed)
  const { error: authErr } = await supabase.auth.getSession();
  if (authErr) {
    console.error('[supabase] Auth endpoint error:', authErr.message);
    return;
  }
  // 2) Is the database actually reachable? A head/count query on `branches`
  // is RLS-safe (branches are public-readable) and needs no rows to exist.
  const { error: dbErr } = await supabase
    .from('branches')
    .select('id', { head: true, count: 'exact' });

  if (!dbErr) {
    console.log('[supabase] Connected, URL, key, and database all reachable.');
  } else if (dbErr.code === '42P01') {
    console.warn('[supabase] Connected, but the schema isn\'t loaded yet (no "branches" table). Run supabase/schema.sql in the SQL editor.');
  } else if ((dbErr.message || '').toLowerCase().includes('api key')) {
    console.error('[supabase] Invalid API key, check VITE_SUPABASE_ANON_KEY in .env.local.');
  } else {
    console.error('[supabase] Reached Supabase but got an error:', dbErr.message, `(code ${dbErr.code ?? 'n/a'})`);
  }
}

// Run automatically during local development only.
if (import.meta.env.DEV) {
  testSupabaseConnection();
}

export default supabase;
