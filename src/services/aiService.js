// TICANO AI ASSISTANT, orchestration layer
// UI components (TicanoAssistantWidget, AIAssistantContext) call
// `converse()` here. This file owns: the system prompt per role/mode,
// the tool-calling loop against aiTools.js, and structured extraction
// for the staff AI Inbox. It does not know about Groq specifically
// that's isolated in groqClient.js so the transport can be swapped
// later without touching this logic.
import { groqChat, hasGroqKey } from './groqClient';
import { toolsForRole, runTool } from './aiTools';
import { logAiConversation } from './supabaseApi';
import { FAQS, COMPANY_PROFILE, COMPANY_MISSION, COMPANY_VISION, BRANCH_INFO } from '../utils/constants';

const MAX_TOOL_ROUNDS = 4;

// Baseline site knowledge, injected directly into the system prompt for
// every conversation (not fetched via a tool call). These are the exact
// same FAQ/company/branch facts published on the public website
// (ticanogroup.co.bw), baking them into the prompt means the assistant
// can answer common questions confidently on the first turn, rather than
// depending on the model choosing to call searchKnowledge. The
// searchKnowledge/getCompanyInfo/getBranchInfo tools remain available on
// top of this for anything not covered here, or if the knowledge base is
// extended later by an admin.
function buildSiteKnowledgeBlock() {
  const faqLines = FAQS.map((f) => `Q: ${f.q}\nA: ${f.a}`).join('\n\n');
  const branchLines = Object.entries(BRANCH_INFO)
    .map(([key, b]) => `- ${b.name}: ${b.address}. Phone ${b.phone} (mobile ${b.mobile}). ${b.hours}.`)
    .join('\n');

  return `--- TICANO WEBSITE CONTENT (source of truth, use this before saying you don't know) ---
About: ${COMPANY_PROFILE.about}
Founded: ${COMPANY_PROFILE.founded} by ${COMPANY_PROFILE.founder}. Regulated by ${COMPANY_PROFILE.regulator}.
Tagline: "${COMPANY_PROFILE.tagline}"
Head office: ${COMPANY_PROFILE.headOffice}, Phone ${COMPANY_PROFILE.phone}, Email ${COMPANY_PROFILE.email}, ${COMPANY_PROFILE.website}
Services: ${COMPANY_PROFILE.services.join(', ')}
Funding model: ${COMPANY_PROFILE.fundingModel}
Track record: ${COMPANY_PROFILE.businessesAssisted2025}
Why choose Ticano: ${COMPANY_PROFILE.whyChooseTicano.join(' · ')}
Mission: ${COMPANY_MISSION}
Vision: ${COMPANY_VISION}

Branches:
${branchLines}

Frequently asked questions:
${faqLines}
--- END WEBSITE CONTENT ---`;
}

const SITE_KNOWLEDGE_BLOCK = buildSiteKnowledgeBlock();

const ROLE_MODE_LABEL = {
  customer: 'Client',
  portfolio_manager: 'Portfolio Manager',
  service_manager: 'Service Manager',
  director: 'Director',
  admin: 'Administrator',
  marketing: 'Marketing',
};

function systemPromptFor(ctx) {
  const role = ctx?.role || null;
  const isStaff = ['portfolio_manager', 'service_manager', 'director', 'admin'].includes(role);

  const shared = `You are the Ticano AI Assistant, the official conversational interface for Ticano Group, a Botswana-based NBFIRA-regulated Purchase Order Financing and Invoice Discounting company.

Rules you must always follow:
- Prefer the WEBSITE CONTENT block below for any question about services, eligibility, rates, process, branches, or company facts, it is verified and current. Only fall back to a tool (searchKnowledge/getCompanyInfo/getBranchInfo) if the answer isn't in that block.
- For FAQ-style questions that can be answered from the WEBSITE CONTENT knowledge block, answer directly in a single response without asking clarifying questions unless the user's question is genuinely ambiguous.
- Never invent facts about a person's account, complaint, or the company. Only state things returned by a tool call, or content from the WEBSITE CONTENT block.
- If you don't have enough information to answer confidently, say so plainly and offer to have a staff member follow up, do not guess.
- Detect the language the person is writing in (English or Setswana) and reply in that same language, unless asked to switch.
- Be warm, concise, and professional. Keep replies short (2-5 sentences) unless the person asks for detail or a report.
- Format for readability: use **bold** for key terms, names, or numbers worth highlighting; use a bullet or numbered list (one item per line, starting with "-" or "1.") whenever you're giving more than two related items, steps, or options; keep paragraphs short. Avoid one long unbroken block of text.
- Never reveal information belonging to a different person or account than the one you are currently serving.

${SITE_KNOWLEDGE_BLOCK}`;

  if (!role) {
    return `${shared}

Current mode: PUBLIC VISITOR (not signed in).
You may only discuss public company information: services, eligibility, rates guidance, branches, business hours, how to register, how to submit a complaint, general FAQs.
You must NEVER access or claim to know any customer's personal data, complaint status, or account details.
If the visitor asks about "my" complaint, "my" account, or anything personal, politely ask them to sign in first, do not attempt to answer.
Example: "Please sign in to your account so I can securely look that up for you."`;
  }

  if (role === 'customer') {
    return `${shared}

Current mode: SIGNED-IN CLIENT.
You may answer questions about this client's OWN complaints, status, and profile using your tools, never anyone else's.
You may also answer general company questions.
If asked something outside your tools (e.g. detailed legal/credit decisions), say a Portfolio Manager or branch staff can help further.`;
  }

  if (isStaff) {
    return `${shared}

Current mode: STAFF, ${ROLE_MODE_LABEL[role] || role}.
You may search and summarize complaints, the internal knowledge base, and (for Service Manager/Director/Admin) portfolio and analytics data, all scoped automatically to what this staff member is permitted to see, you do not need to ask about permissions, the tools already enforce them.
Summarize data rather than dumping raw records unless the staff member asks for a full list.
If a tool returns a permission-denied result, tell the staff member plainly rather than working around it.`;
  }

  return `${shared}

Current mode: STAFF, ${ROLE_MODE_LABEL[role] || role}.
Answer using your available tools and general company knowledge only.`;
}

/**
 * Run one conversational turn, including any tool-calling rounds.
 * @param {Array} history - prior {role:'user'|'assistant', content} turns (no system msg)
 * @param {string} userText
 * @param {object} ctx - { role, userId, userName, branch }, role/userId null for public visitors
 * @returns {Promise<{ reply: string, history: Array, toolsUsed: string[] }>}
 */
export async function converse(history, userText, ctx = {}) {
  if (!hasGroqKey()) {
    return {
      reply: "The assistant isn't fully configured yet, an administrator needs to add a Groq API key (VITE_GROQ_API_KEY) before I can respond. In the meantime, please contact your branch directly.",
      history: [...history, { role: 'user', content: userText }],
      toolsUsed: [],
    };
  }

  const tools = toolsForRole(ctx.role || null);
  const messages = [
    { role: 'system', content: systemPromptFor(ctx) }, ...history,
    { role: 'user', content: userText },
  ];

  const toolsUsed = [];
  let rounds = 0;
  let assistantMsg;

  try {
    assistantMsg = await groqChat(messages, tools);

    while (assistantMsg?.tool_calls?.length && rounds < MAX_TOOL_ROUNDS) {
      rounds += 1;
      messages.push({ role: 'assistant', content: assistantMsg.content || null, tool_calls: assistantMsg.tool_calls });

      for (const call of assistantMsg.tool_calls) {
        let args = {};
        try { args = JSON.parse(call.function.arguments || '{}'); } catch { /* ignore malformed args */ }
        toolsUsed.push(call.function.name);
        const result = await runTool(call.function.name, args, ctx);
        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify(result),
        });
      }

      assistantMsg = await groqChat(messages, tools);
    }
  } catch (err) {
    const friendly = err.code === 'NO_API_KEY'
      ? "The assistant isn't fully configured yet, please contact staff directly."
      : "I'm having trouble reaching the assistant service right now. Please try again shortly, or contact your branch directly.";
    return { reply: friendly, history: [...history, { role: 'user', content: userText }], toolsUsed };
  }

  const replyText = assistantMsg?.content?.trim() || "I'm not sure how to answer that, would you like me to log this so a staff member can follow up?";

  const newHistory = [
    ...history,
    { role: 'user', content: userText },
    { role: 'assistant', content: replyText },
  ];

  return { reply: replyText, history: newHistory, toolsUsed };
}

/**
 * Lightweight structured-extraction pass over a conversation, used to
 * populate the staff AI Inbox (summary, intent, category, urgency,
 * extracted contact details). Runs a small, separate JSON-only call so
 * it never pollutes the visible conversation.
 */
export async function extractAndLog(history, ctx = {}, opts = {}) {
  if (!hasGroqKey() || history.length === 0) return null;

  const transcript = history.map((m) => `${m.role === 'user' ? 'Visitor' : 'Assistant'}: ${m.content}`).join('\n');

  const extractionPrompt = [
    { role: 'system', content: `Extract structured metadata from this Ticano AI Assistant conversation. Respond with ONLY a compact JSON object, no prose, matching exactly this shape:
{"summary":"one sentence staff-readable summary","intent":"short intent label e.g. 'complaint status request'","category":"short category e.g. 'Payment Issues' or 'General Enquiry'","urgency":"low|normal|high","name":"" ,"phone":"","email":"","location":""}
Leave a field as an empty string if not mentioned. Do not invent contact details.` },
    { role: 'user', content: transcript },
  ];

  try {
    const msg = await groqChat(extractionPrompt, [], { temperature: 0, maxTokens: 300 });
    let parsed;
    try {
      const jsonText = (msg?.content || '{}').trim().replace(/^```json\s*|```$/g, '');
      parsed = JSON.parse(jsonText);
    } catch {
      parsed = {};
    }

    const payload = {
      conversationId: opts.conversationId,
      visitorRole: ctx.role || 'public',
      userId: ctx.userId || null,
      userName: ctx.userName || parsed.name || 'Anonymous visitor',
      branch: ctx.branch || null,
      channel: 'web',
      language: opts.language || 'en',
      messages: history,
      summary: parsed.summary || '',
      intent: parsed.intent || '',
      category: parsed.category || '',
      urgency: ['low', 'normal', 'high'].includes(parsed.urgency) ? parsed.urgency : 'normal',
      extracted: { name: parsed.name || '', phone: parsed.phone || '', email: parsed.email || '', location: parsed.location || '' },
    };

    const { data } = await logAiConversation(payload);
    return data.conversation;
  } catch {
    return null;
  }
}
