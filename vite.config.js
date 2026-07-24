import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Pings Supabase from Node when the dev server boots and prints the result to
// the TERMINAL (the in-app test in supabaseClient.js logs to the browser
// console instead). Runs on `npm run dev` only.
function supabaseConnectionCheck(env) {
  return {
    name: 'ticano-supabase-check',
    apply: 'serve',
    configureServer() {
      const url = env.VITE_SUPABASE_URL
      const key = env.VITE_SUPABASE_ANON_KEY
      const tag = '\x1b[36m[supabase]\x1b[0m' // cyan label
      const line = (msg) => console.log(`\n ${msg}\n`)

      if (!url || !key || url.includes('YOUR-PROJECT-REF')) {
        line(`${tag} Not configured yet, fill in .env.local. Running on mock data for now.`)
        return
      }

      fetch(`${url}/rest/v1/branches?select=id&limit=1`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
      })
        .then((res) => {
          if (res.ok) {
            line(`${tag} Connected. URL, key, and database are all reachable.`)
          } else if (res.status === 404) {
            line(`${tag} Connected, but the schema isn't loaded yet (no "branches" table). Run supabase/schema.sql.`)
          } else if (res.status === 401) {
            line(`${tag} Invalid API key, double-check VITE_SUPABASE_ANON_KEY in .env.local.`)
          } else {
            line(`${tag} Reached Supabase but got HTTP ${res.status}.`)
          }
        })
        .catch((e) => line(`${tag} Connection failed, check VITE_SUPABASE_URL and your network. (${e.message})`))
    },
  }
}

// UI config. API calls are mocked unless a module is switched to supabaseApi.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), supabaseConnectionCheck(env)],
    server: {
      port: 3000,
      open: true,
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
    },
  }
})
