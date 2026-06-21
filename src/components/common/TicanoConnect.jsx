import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, MapPin, ExternalLink, Phone, Clock, ChevronDown } from 'lucide-react';
import { BRANCH_INFO, FAQS } from '../../utils/constants';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const TICANO_WEBSITE = 'https://ticanogroup.co.bw';

// ---- System prompt for TicanoConnect ----
const buildSystemPrompt = (user, complaints) => `
You are TicanoConnect, the official AI assistant for Ticano Group — a Botswana-based financial services company specialising in Purchase Order (PO) Financing. 

The user currently logged in is: ${user?.name || 'a visitor'} (Role: ${user?.role || 'guest'}).

${complaints?.length > 0 ? `Their active complaints: ${complaints.map(c => `#${c.ticketNumber} - "${c.category}" (${c.status})`).join(', ')}` : ''}

BRANCH INFORMATION:
${Object.entries(BRANCH_INFO).map(([name, b]) => `• ${name}: ${b.address} | ${b.phone} | ${b.hours}`).join('\n')}

FAQS YOU KNOW:
${FAQS.map(f => `Q: ${f.q}\nA: ${f.a}`).join('\n\n')}

YOUR BEHAVIOUR:
- Be warm, professional, and concise. Always sign off as TicanoConnect.
- When a user mentions a location or city, match it to the nearest branch and give full details.
- Always offer to share the Ticano website: ${TICANO_WEBSITE}
- If asked about complaint status, refer to their active complaints listed above.
- For staff roles (director, service_manager, portfolio_manager, admin, marketing), be more analytical and data-focused.
- For clients (customer), be warm, patient, and supportive.
- If you don't know something, say so honestly and direct them to the nearest branch or the website.
- Keep responses concise — max 3 short paragraphs. Use bullet points for lists.
- Always end with a helpful follow-up question or offer.
`;

// ---- Find nearest branch from location string ----
const findBranch = (locationText) => {
  const lower = locationText.toLowerCase();
  for (const [name, info] of Object.entries(BRANCH_INFO)) {
    if (info.areas.some(area => lower.includes(area))) return { name, ...info };
  }
  return null;
};

// ---- Quick reply suggestions ----
const QUICK_REPLIES_CLIENT = [
  'What is PO Financing?',
  'How do I apply?',
  'Check my complaint status',
  'Find my nearest branch',
  'Visit Ticano website',
  'Documents I need',
];

const QUICK_REPLIES_STAFF = [
  'Summarise today\'s escalations',
  'Which branch has most complaints?',
  'What is our current CSAT?',
  'How do I reassign a complaint?',
  'Visit Ticano website',
];

export default function TicanoConnect({ complaints = [] }) {
  const { user } = useAuth();
  const [open, setOpen]           = useState(false);
  const [messages, setMessages]   = useState([]);
  const [input, setInput]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [askingLocation, setAskingLocation] = useState(false);
  const messagesEnd = useRef(null);
  const inputRef    = useRef(null);

  const isClient = user?.role === 'customer';
  const quickReplies = isClient ? QUICK_REPLIES_CLIENT : QUICK_REPLIES_STAFF;

  // Greeting on open
  useEffect(() => {
    if (open && messages.length === 0) {
      const greeting = {
        id: Date.now(),
        role: 'assistant',
        content: `👋 Hi ${user?.name?.split(' ')[0] || 'there'}! I'm **TicanoConnect**, your Ticano Group assistant.\n\nI can help you with:\n• PO Financing questions & FAQs\n• Finding your nearest branch\n• Complaint status updates\n• Ticano services information\n\nHow can I help you today?`,
        time: new Date(),
      };
      setMessages([greeting]);
    }
  }, [open]);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text) => {
    const userText = (text || input).trim();
    if (!userText) return;
    setInput('');

    // Check for location intent
    const locationTriggers = ['nearest branch', 'near me', 'my location', 'closest branch', 'where is', 'find branch'];
    const isLocationQuery = locationTriggers.some(t => userText.toLowerCase().includes(t));

    const userMsg = { id: Date.now(), role: 'user', content: userText, time: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    // Handle location detection
    if (isLocationQuery || askingLocation) {
      const branch = findBranch(userText);
      if (branch) {
        const branchMsg = {
          id: Date.now() + 1,
          role: 'assistant',
          content: `📍 Great! Based on your location, here's your nearest Ticano branch:\n\n**${branch.name}**\n📌 ${branch.address}\n📞 ${branch.phone}\n🕐 ${branch.hours}\n📧 ${branch.email}\n\nWould you like me to help you with anything else, or would you like to visit our website at [ticanogroup.co.bw](${TICANO_WEBSITE})?`,
          time: new Date(),
          branchCard: branch,
        };
        setMessages(prev => [...prev, branchMsg]);
        setAskingLocation(false);
        setLoading(false);
        return;
      } else if (!askingLocation) {
        const askMsg = {
          id: Date.now() + 1,
          role: 'assistant',
          content: `📍 I'd love to help you find your nearest branch! Which city or area are you in? (e.g. Gaborone, Francistown, Maun, Palapye, or Phikwe)`,
          time: new Date(),
        };
        setMessages(prev => [...prev, askMsg]);
        setAskingLocation(true);
        setLoading(false);
        return;
      }
    }

    // Website link request
    if (userText.toLowerCase().includes('website') || userText.toLowerCase().includes('ticanogroup')) {
      const webMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        content: `🌐 You can visit the official Ticano Group website here:\n\n**[ticanogroup.co.bw](${TICANO_WEBSITE})**\n\nYou'll find information on all our services, branch locations, and how to get started with PO Financing.\n\nIs there anything else I can help you with?`,
        time: new Date(),
        websiteLink: true,
      };
      setMessages(prev => [...prev, webMsg]);
      setLoading(false);
      return;
    }

    // Check FAQ matches first (fast, no API call needed)
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
            ...messages.filter(m => m.role !== 'assistant' || messages.indexOf(m) > 0).map(m => ({
              role: m.role,
              content: m.content,
            })),
            { role: 'user', content: userText },
          ],
        }),
      });
      const data = await response.json();
      const reply = data.content?.[0]?.text || "I'm having trouble connecting right now. Please try again or visit ticanogroup.co.bw for assistance.";
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', content: reply, time: new Date() }]);
    } catch {
      // Fallback to FAQ or generic response
      const fallback = faqMatch
        ? faqMatch.a + `\n\nFor more information, visit [ticanogroup.co.bw](${TICANO_WEBSITE}).`
        : `I'm having trouble connecting right now. For immediate assistance, please visit [ticanogroup.co.bw](${TICANO_WEBSITE}) or call your nearest branch.`;
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', content: fallback, time: new Date() }]);
    }
    setLoading(false);
  };

  const formatContent = (text) => {
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, `<a href="$2" target="_blank" rel="noopener noreferrer" class="text-ticano-red underline hover:opacity-80">$1</a>`)
      .replace(/•/g, '•')
      .split('\n').map((line, i) => `<span key="${i}">${line}</span>`).join('<br/>');
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-ticano-red text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-ticano-red-dark transition-all duration-200 hover:scale-105"
        title="Chat with TicanoConnect"
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
        {!open && messages.length === 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse" />
        )}
      </button>

      {/* Chat window */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[370px] max-h-[580px] flex flex-col bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-scale-in">
          {/* Header */}
          <div className="bg-ticano-charcoal text-white px-4 py-3.5 flex items-center gap-3">
            <div className="w-9 h-9 bg-ticano-red rounded-full flex items-center justify-center shrink-0">
              <Bot size={18} />
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm leading-tight">TicanoConnect</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <p className="text-xs text-gray-300">AI Assistant · Online</p>
              </div>
            </div>
            <a href={TICANO_WEBSITE} target="_blank" rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition-colors p-1" title="Visit Ticano website">
              <ExternalLink size={14} />
            </a>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white transition-colors p-1">
              <X size={16} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50" style={{ maxHeight: '380px' }}>
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${msg.role === 'user' ? 'bg-ticano-charcoal' : 'bg-ticano-red'}`}>
                  {msg.role === 'user' ? <User size={13} className="text-white" /> : <Bot size={13} className="text-white" />}
                </div>
                <div className={`max-w-[78%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                  <div className={`px-3 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-ticano-charcoal text-white rounded-tr-sm'
                      : 'bg-white text-gray-800 border border-gray-100 shadow-sm rounded-tl-sm'
                  }`}>
                    <div dangerouslySetInnerHTML={{ __html: formatContent(msg.content) }} />
                    {/* Branch card */}
                    {msg.branchCard && (
                      <div className="mt-2 p-2.5 bg-ticano-red/8 rounded-xl border border-ticano-red/20">
                        <div className="flex items-center gap-1.5 text-ticano-red mb-1"><MapPin size={12}/><span className="text-xs font-semibold">{msg.branchCard.name}</span></div>
                        <div className="space-y-0.5 text-xs text-gray-600">
                          <div className="flex items-center gap-1"><Phone size={10}/>{msg.branchCard.phone}</div>
                          <div className="flex items-center gap-1"><Clock size={10}/>{msg.branchCard.hours}</div>
                        </div>
                        <a href={TICANO_WEBSITE} target="_blank" rel="noopener noreferrer"
                          className="mt-2 flex items-center gap-1 text-xs text-ticano-red hover:underline">
                          <ExternalLink size={10}/>Visit ticanogroup.co.bw
                        </a>
                      </div>
                    )}
                    {msg.websiteLink && (
                      <a href={TICANO_WEBSITE} target="_blank" rel="noopener noreferrer"
                        className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-ticano-red text-white text-xs rounded-lg hover:bg-ticano-red-dark transition-colors w-fit">
                        <ExternalLink size={11}/>Open ticanogroup.co.bw
                      </a>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-400 px-1">{msg.time?.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-full bg-ticano-red flex items-center justify-center shrink-0"><Bot size={13} className="text-white"/></div>
                <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="flex gap-1">
                    {[0,1,2].map(i => <span key={i} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay:`${i*0.15}s`}} />)}
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEnd} />
          </div>

          {/* Quick replies */}
          {messages.length <= 1 && (
            <div className="px-3 py-2 border-t border-gray-100 bg-white">
              <p className="text-[10px] text-gray-400 mb-1.5 font-medium uppercase tracking-wide">Suggestions</p>
              <div className="flex flex-wrap gap-1.5">
                {quickReplies.slice(0,4).map(q => (
                  <button key={q} onClick={() => sendMessage(q)}
                    className="text-xs px-2.5 py-1 rounded-full border border-gray-200 text-gray-600 hover:border-ticano-red hover:text-ticano-red transition-all duration-150 bg-gray-50">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="px-3 py-3 border-t border-gray-100 bg-white flex gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="Ask TicanoConnect anything…"
              className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-ticano-red transition-colors bg-gray-50"
            />
            <button onClick={() => sendMessage()} disabled={!input.trim() || loading}
              className="w-9 h-9 bg-ticano-red text-white rounded-xl flex items-center justify-center hover:bg-ticano-red-dark transition-colors disabled:opacity-40 shrink-0">
              <Send size={14} />
            </button>
          </div>

          {/* Footer */}
          <div className="px-4 pb-2 text-center">
            <a href={TICANO_WEBSITE} target="_blank" rel="noopener noreferrer" className="text-[10px] text-gray-400 hover:text-ticano-red transition-colors flex items-center justify-center gap-1">
              <ExternalLink size={9}/>ticanogroup.co.bw
            </a>
          </div>
        </div>
      )}
    </>
  );
}
