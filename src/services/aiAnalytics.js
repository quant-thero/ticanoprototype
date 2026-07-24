// AI ANALYTICS NARRATIVE, used by Predictive Analytics & Smart Insights
// This does NOT let Groq invent numbers. The caller always passes real,
// already-computed data (from the mock API / real Supabase queries
// later); Groq's only job is to interpret and summarize those numbers
// in plain language. If a number isn't in the payload, the model is
// instructed not to state it.
import { groqChat, hasGroqKey } from './groqClient';

const SYSTEM_PROMPT = `You are a data analyst assistant embedded in Ticano Group's Director dashboard.
You will be given a JSON payload of REAL, already-computed statistics (complaint volumes, branch performance, sentiment, trends). Your job is to interpret them, not invent them.

Rules:
- Only reference figures that appear in the payload. Never state a number that isn't there.
- Write 3-5 short insight bullets, each 1-2 sentences, in plain business English.
- Prioritize the most actionable or concerning findings first (e.g. branches with rising escalation rates, recurring issue categories, declining CSAT).
- Where relevant, name the specific branch/category/figure so it's clear what the insight is based on.
- Assign each bullet a "severity": "critical" (needs attention now), "warning" (worth watching), "positive" (something going well), or "info" (neutral observation).
- Respond with ONLY compact JSON, no prose, no markdown fences, matching exactly:
{"insights":[{"severity":"critical|warning|positive|info","text":"..."}]}`;

/**
 * @param {string} label - short description of what this dataset is (for the model's context)
 * @param {object} dataset - real computed stats object/array
 * @returns {Promise<{ insights: Array<{severity:string, text:string}>, unavailable?: boolean, error?: boolean }>}
 */
export async function generateAnalyticsInsights(label, dataset) {
  if (!hasGroqKey()) {
    return { insights: [], unavailable: true };
  }

  try {
    const msg = await groqChat(
      [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Dataset: ${label}\n\n${JSON.stringify(dataset)}` },
      ],
      [],
      { temperature: 0.3, maxTokens: 500 }
    );

    const raw = (msg?.content || '{}').trim().replace(/^```json\s*|```$/g, '');
    const parsed = JSON.parse(raw);
    const insights = Array.isArray(parsed.insights)
      ? parsed.insights.filter((i) => i && typeof i.text === 'string')
      : [];
    return { insights };
  } catch {
    return { insights: [], error: true };
  }
}
