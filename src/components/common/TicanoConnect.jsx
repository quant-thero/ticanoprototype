import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, MapPin, ExternalLink, Phone, Clock, ChevronRight } from 'lucide-react';
import { BRANCH_INFO, FAQS } from '../../utils/constants';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const TICANO_WEBSITE = 'https://ticanogroup.co.bw';

// ---- Role-specific quick replies ----
const QUICK_REPLIES = {
  customer: [
    'What is PO Financing?',
    'Find my nearest branch',
    'Check my complaint status',
    'How do I apply?',
    'What documents do I need?',
    'Visit Ticano website',
  ],
  portfolio_manager: [
    'How do I reassign a complaint?',
    'How do I send a review link?',
    'What is the SLA policy?',
    'How do I escalate a complaint?',
    'How do I log a new lead?',
    'Visit Ticano website',
  ],
  service_manager: [
    'Show me overdue complaints',
    'What is our branch CSAT?',
    'How do I approve an escalation?',
    'SLA breach procedure',
    'How do I manage staff performance?',
    'Visit Ticano website',
  ],
  director: [
    'Summarise branch performance',
    'Which branch has the most breaches?',
    'What is our overall CSAT?',
    'Show me escalation trends',
    'How does predictive analytics work?',
    'Visit Ticano website',
  ],
  admin: [
    'How do I add a new user?',
    'How do I enable maintenance mode?',
    'What does the audit trail show?',
    'How do I manage WhatsApp templates?',
    'How do I back up the database?',
    'Visit Ticano website',
  ],
  marketing: [
    'Show me lead conversion rates',
    'What is our referral source breakdown?',
    'How do I analyse client demographics?',
    'What is the CSAT trend?',
    'How do I generate a marketing report?',
    'Visit Ticano website',
  ],
};

// ---- Role-specific system prompts ----
const buildSystemPrompt = (user, complaints) => {
  const roleContext = {
    customer: `This user is a CLIENT. Be warm, patient, and supportive. Focus on:
- PO Financing and Invoice Discounting explanations
- How to apply, documents needed, eligibility
- Branch locations and finding the nearest branch
- Their complaint status (tickets: ${complaints?.map(c=>`${c.ticket} - ${c.status}`).join(', ') || 'none'})
- Directing them to ticanogroup.co.bw when relevant
- Always ask about their location to connect them to the nearest branch`,

    portfolio_manager: `This user is a PORTFOLIO MANAGER. Be professional and process-focused. Focus on:
- Complaint management procedures and best practices
- How to use the system features (reassign, escalate, review links)
- SLA policies and deadlines
- Client communication best practices
- Lead management and conversion`,

    service_manager: `This user is a SERVICE MANAGER. Be analytical and operational. Focus on:
- Branch performance overview
- Complaint escalation procedures
- Staff performance management
- SLA monitoring and breach prevention
- Reporting and analytics interpretation`,

    director: `This user is the DIRECTOR. Be strategic and executive-focused. Focus on:
- High-level branch performance summaries
- Escalation trends and risk assessment
- Predictive analytics interpretation
- Cross-branch comparisons
- Executive reporting and KPIs`,

    admin: `This user is the SYSTEM ADMINISTRATOR. Be technical and precise. Focus on:
- User management procedures
- System maintenance and configuration
- Audit trail interpretation
- WhatsApp template management
- Database backup and security
- Maintenance mode procedures`,

    marketing: `This user is in MARKETING. Be data-driven and insight-focused. Focus on:
- Lead funnel analysis and conversion rates
- Client demographics and segmentation
- Referral source breakdown
- CSAT trends and satisfaction analysis
- Campaign performance and reporting`,
  };

  return `You are TicanoConnect, the official AI assistant for Ticano Group — a Botswana-based financial services company specialising in Purchase Order (PO) Financing and Invoice Discounting.

The user logged in is: ${user?.name || 'a user'} (Role: ${user?.role || 'unknown'}, Branch: ${user?.branch || 'N/A'}).

${roleContext[user?.role] || roleContext.customer}

BRANCH INFORMATION:
${Object.entries(BRANCH_INFO).map(([name, b]) => `• ${name}: ${b.address} | ${b.phone} | ${b.hours}`).join('\n')}

FAQS YOU KNOW:
${FAQS.map(f => `Q: ${f.q}\nA: ${f.a}`).join('\n\n')}

YOUR RULES:
- Be concise — max 3 short paragraphs or use bullet points for lists
- Always sign off naturally, no need to repeat "TicanoConnect" every message
- When a user mentions a location/city, match to the nearest branch and give full details
- Offer ticanogroup.co.bw when relevant
- For client role: be warm and supportive. For staff roles: be professional and direct.
- If you don't know something, be honest and direct them to the right branch or website`;
};

// ---- Find nearest branch ----
const findBranch = (text) => {
  const lower = text.toLowerCase();
  for (const [name, info] of Object.entries(BRANCH_INFO)) {
    if (info.areas.some(a => lower.includes(a))) return { name, ...info };
  }
  return null;
};

const formatTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

// ---- Format message content ----
const formatContent = (text) => text
  .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  .replace(/\[([^\]]+)\]\(([^)]+)\)/g, `<a href="$2" target="_blank" rel="noopener noreferrer" style="color:#CE313C;text-decoration:underline;">$1</a>`)
  .split('\n').join('<br/>');

export default function TicanoConnect({ complaints = [] }) {
  const { user } = useAuth();
  const [open, setOpen]         = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [askingLoc, setAskingLoc] = useState(false);
  const messagesEnd = useRef(null);
  const inputRef    = useRef(null);

  const quickReplies = QUICK_REPLIES[user?.role] || QUICK_REPLIES.customer;

  // Greeting on open
  useEffect(() => {
    if (open && messages.length === 0) {
      const roleGreeting = {
        customer:         `Hi ${user?.name?.split(' ')[0] || 'there'}! 👋 I'm TicanoConnect, your Ticano assistant. I can help you with PO Financing questions, finding your nearest branch, or checking your complaint status. How can I help you today?`,
        portfolio_manager:`Hi ${user?.name?.split(' ')[0]}! 👋 I'm TicanoConnect. I can help you with complaint procedures, system features, SLA policies, and client management. What do you need?`,
        service_manager:  `Hi ${user?.name?.split(' ')[0]}! 👋 I'm TicanoConnect. I can help with branch operations, escalation procedures, staff management queries, and system features. What's on your mind?`,
        director:         `Good day, ${user?.name?.split(' ')[0]}. 👋 I'm TicanoConnect, your executive assistant. I can summarise branch performance, explain analytics, and answer strategic queries. How can I assist?`,
        admin:            `Hi ${user?.name?.split(' ')[0]}! 👋 I'm TicanoConnect. I can assist with system configuration, user management, audit trail queries, and maintenance procedures. What do you need?`,
        marketing:        `Hi ${user?.name?.split(' ')[0]}! 👋 I'm TicanoConnect. I can help with lead analytics, client demographics, CSAT trends, and marketing reporting. What are you looking for?`,
      };
      setMessages([{ id: Date.now(), role: 'assistant', content: roleGreeting[user?.role] || roleGreeting.customer, time: formatTime() }]);
    }
  }, [open]);

  useEffect(() => { messagesEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = async (text) => {
    const userText = (text || input).trim();
    if (!userText) return;
    setInput('');

    const userMsg = { id: Date.now(), role: 'user', content: userText, time: formatTime() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    // Location detection
    const locationTriggers = ['nearest branch', 'near me', 'my location', 'closest', 'find branch', 'where is', 'which branch'];
    const isLocQuery = locationTriggers.some(t => userText.toLowerCase().includes(t));

    if (isLocQuery || askingLoc) {
      const branch = findBranch(userText);
      if (branch) {
        const msg = {
          id: Date.now() + 1, role: 'assistant', time: formatTime(),
          content: `📍 Based on your location, here's your nearest Ticano branch:\n\n**${branch.name}**\n📌 ${branch.address}\n📞 ${branch.phone}\n🕐 ${branch.hours}\n📧 ${branch.email}\n\nYou can also visit us at [ticanogroup.co.bw](${TICANO_WEBSITE}). Anything else I can help with?`,
          branchCard: branch,
        };
        setMessages(prev => [...prev, msg]);
        setAskingLoc(false);
        setLoading(false);
        return;
      } else if (!askingLoc) {
        setMessages(prev => [...prev, {
          id: Date.now() + 1, role: 'assistant', time: formatTime(),
          content: `📍 Which city or area are you in? I'll find the nearest Ticano branch for you.\n\nWe have branches in: **Gaborone, Francistown, Maun, Palapye, and Selebi-Phikwe**.`,
        }]);
        setAskingLoc(true);
        setLoading(false);
        return;
      }
    }

    // Website request
    if (userText.toLowerCase().includes('website') || userText.toLowerCase().includes('ticanogroup.co.bw')) {
      setMessages(prev => [...prev, {
        id: Date.now() + 1, role: 'assistant', time: formatTime(),
        content: `🌐 Visit the official Ticano Group website:\n\n**[ticanogroup.co.bw](${TICANO_WEBSITE})**\n\nYou'll find information on all our services, branch locations, and how to get started with PO Financing or Invoice Discounting.`,
        websiteLink: true,
      }]);
      setLoading(false);
      return;
    }

    // FAQ local match
    const faqMatch = FAQS.find(f =>
      f.q.toLowerCase().split(' ').filter(w => w.length > 3).some(w => userText.toLowerCase().includes(w))
    );

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1000,
          system: buildSystemPrompt(user, complaints),
          messages: [
            ...messages.slice(-6).map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: userText },
          ],
        }),
      });
      const data = await response.json();
      const reply = data.content?.[0]?.text || (faqMatch ? faqMatch.a : `I'm having trouble connecting. Please try again or visit [ticanogroup.co.bw](${TICANO_WEBSITE}).`);
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', content: reply, time: formatTime() }]);
    } catch {
      const fallback = faqMatch ? faqMatch.a + `\n\nFor more info, visit [ticanogroup.co.bw](${TICANO_WEBSITE}).`
        : `I'm having trouble right now. Please visit [ticanogroup.co.bw](${TICANO_WEBSITE}) or call your nearest branch.`;
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', content: fallback, time: formatTime() }]);
    }
    setLoading(false);
  };

  if (!user) return null;

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-ticano-red text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-ticano-red-dark hover:scale-105 transition-all duration-200"
        title="Chat with TicanoConnect"
      >
        {open ? <X size={20} /> : <MessageCircle size={20} />}
        {!open && (
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white animate-pulse" />
        )}
      </button>

      {/* Chat window */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[370px] flex flex-col bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-scale-in" style={{maxHeight:'580px'}}>
          {/* Header */}
          <div className="bg-ticano-charcoal px-4 py-3.5 flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 bg-ticano-red rounded-full flex items-center justify-center shrink-0 animate-pulse-glow">
              <Bot size={17} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-white text-sm leading-tight">TicanoConnect</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <p className="text-gray-400 text-[10px]">AI Assistant · Always online</p>
              </div>
            </div>
            <a href={TICANO_WEBSITE} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white transition-colors p-1" title="Visit ticanogroup.co.bw">
              <ExternalLink size={13} />
            </a>
            <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-white transition-colors p-1">
              <X size={15} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 bg-gray-50" style={{minHeight:0}}>
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${msg.role === 'user' ? 'bg-ticano-charcoal' : 'bg-ticano-red'}`}>
                  {msg.role === 'user' ? <User size={11} className="text-white" /> : <Bot size={11} className="text-white" />}
                </div>
                <div className={`max-w-[80%] flex flex-col gap-0.5 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`px-3 py-2.5 rounded-2xl text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-ticano-charcoal text-white rounded-tr-sm'
                      : 'bg-white text-gray-700 border border-gray-100 shadow-sm rounded-tl-sm'
                  }`}>
                    <div dangerouslySetInnerHTML={{ __html: formatContent(msg.content) }} />
                    {msg.branchCard && (
                      <div className="mt-2 p-2.5 bg-ticano-red/8 rounded-xl border border-ticano-red/20">
                        <div className="flex items-center gap-1 text-ticano-red text-xs font-semibold mb-1.5"><MapPin size={11}/>{msg.branchCard.name}</div>
                        <p className="text-xs text-gray-600 flex items-center gap-1 mb-0.5"><Phone size={9}/>{msg.branchCard.phone}</p>
                        <p className="text-xs text-gray-600 flex items-center gap-1"><Clock size={9}/>{msg.branchCard.hours}</p>
                        <a href={TICANO_WEBSITE} target="_blank" rel="noopener noreferrer" className="mt-2 flex items-center gap-1 text-xs text-ticano-red hover:underline"><ExternalLink size={9}/>ticanogroup.co.bw</a>
                      </div>
                    )}
                    {msg.websiteLink && (
                      <a href={TICANO_WEBSITE} target="_blank" rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 bg-ticano-red text-white text-[10px] rounded-lg hover:bg-ticano-red-dark transition-colors font-medium">
                        <ExternalLink size={10}/> Open ticanogroup.co.bw
                      </a>
                    )}
                  </div>
                  <p className="text-[9px] text-gray-300 px-1">{msg.time}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full bg-ticano-red flex items-center justify-center shrink-0"><Bot size={11} className="text-white"/></div>
                <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-tl-sm px-3 py-2.5">
                  <div className="flex gap-1">{[0,1,2].map(i=><span key={i} className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{animationDelay:`${i*0.15}s`}}/>)}</div>
                </div>
              </div>
            )}
            <div ref={messagesEnd} />
          </div>

          {/* Quick replies */}
          {messages.length <= 1 && (
            <div className="px-3 py-2 border-t border-gray-100 bg-white shrink-0">
              <p className="text-[9px] text-gray-400 mb-1.5 font-semibold uppercase tracking-wide">Suggestions</p>
              <div className="flex flex-wrap gap-1.5">
                {quickReplies.slice(0, 4).map(q => (
                  <button key={q} onClick={() => sendMessage(q)}
                    className="text-[10px] px-2 py-1 rounded-full border border-gray-200 text-gray-500 hover:border-ticano-red hover:text-ticano-red transition-all duration-150 bg-gray-50">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="px-3 py-3 border-t border-gray-100 bg-white flex gap-2 shrink-0">
            <input
              ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="Ask TicanoConnect anything…"
              className="flex-1 text-xs border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-ticano-red transition-colors bg-gray-50"
            />
            <button onClick={() => sendMessage()} disabled={!input.trim() || loading}
              className="w-8 h-8 bg-ticano-red text-white rounded-xl flex items-center justify-center hover:bg-ticano-red-dark transition-colors disabled:opacity-40 shrink-0">
              <Send size={13} />
            </button>
          </div>

          {/* Footer */}
          <div className="px-3 pb-2 text-center shrink-0">
            <a href={TICANO_WEBSITE} target="_blank" rel="noopener noreferrer" className="text-[9px] text-gray-300 hover:text-ticano-red transition-colors inline-flex items-center gap-1">
              <ExternalLink size={8}/>ticanogroup.co.bw
            </a>
          </div>
        </div>
      )}
    </>
  );
}
