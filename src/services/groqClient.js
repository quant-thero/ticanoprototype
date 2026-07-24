// GROQ CLIENT, thin wrapper around Groq's OpenAI-compatible
// /chat/completions endpoint, used for the Ticano AI Assistant.
// NOTE ON SECURITY: this calls Groq directly from the browser using
// VITE_GROQ_API_KEY, which means the key ships in the client bundle.
// That's acceptable for now (mock-data dev stage, per Stacey's call to
// use Groq "for now") but it is NOT safe for production, before going
// live, move this call behind a Supabase Edge Function (there's already
// a scaffold pattern for this in supabase/functions/) so the key never
// reaches the browser. Swapping the transport later shouldn't require
// touching aiService.js, only this file.

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = import.meta.env.VITE_GROQ_MODEL || 'openai/gpt-oss-120b';

export function hasGroqKey() {
  return Boolean(import.meta.env.VITE_GROQ_API_KEY);
}

/**
 * @param {Array} messages - OpenAI-style message array
 * @param {Array} tools - OpenAI-style tool specs (optional)
 * @param {object} opts - { temperature, maxTokens }
 */
export async function groqChat(messages, tools = [], opts = {}) {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey) {
    const err = new Error('Missing VITE_GROQ_API_KEY');
    err.code = 'NO_API_KEY';
    throw err;
  }

  const body = {
    model: opts.model || DEFAULT_MODEL,
    messages,
    temperature: opts.temperature ?? 0.4,
    max_tokens: opts.maxTokens ?? 800,
  };
  if (tools.length) {
    body.tools = tools;
    body.tool_choice = 'auto';
  }

  const res = await fetch(GROQ_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(`Groq request failed (${res.status}): ${text}`);
    err.code = 'GROQ_ERROR';
    err.status = res.status;
    throw err;
  }

  const data = await res.json();
  return data.choices?.[0]?.message;
}
