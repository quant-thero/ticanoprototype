import React, { useState, useEffect, useMemo } from 'react';
import { Send, CheckCheck, Phone, MoreVertical, Search, Smile, Paperclip, MessageCircle, Ticket, User, X, Hash } from 'lucide-react';
import { getClientDirectory, createFeedbackRequest } from '../../services/supabaseApi';
import { getWaTemplates } from '../../services/supabaseApi';
import { normalizeWhatsAppNumber } from '../../utils/constants';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const formatTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export default function WhatsAppSimulator({ clientName = 'Client', clientPhone = '', branch }) {
  const { user } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [selectedTpl, setSelectedTpl] = useState(null);
  const [variables, setVariables] = useState({});
  const [messages, setMessages] = useState([
    { id: 1, from: 'client', text: 'Hello, I wanted to follow up on my complaint. Any updates?', time: '09:14', read: true },
    { id: 2, from: 'pm', text: 'Hi Stacey! Thank you for reaching out. We are actively working on your complaint TCN-0002 and will have an update by end of day.', time: '09:18', read: true },
  ]);
  const [preview, setPreview] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState([]);

  // ---- Intelligent client search + record filtering ----
  const [clients, setClients] = useState([]);
  const [clientQuery, setClientQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedTicketId, setSelectedTicketId] = useState(null);

  useEffect(() => {
    getWaTemplates(user?.role).then(({ data }) => setTemplates(data)).catch(() => {});
  }, [user?.role]);

  useEffect(() => {
    getClientDirectory(branch ? { branch } : {}).then(({ data }) => setClients(data || [])).catch(() => {});
  }, [branch]);

  // Search matches name, Client ID (TIC-…) or phone, suggestions as you type.
  const q = clientQuery.trim().toLowerCase();
  const filteredClients = useMemo(() => clients.filter((c) =>
    !q ||
    c.name.toLowerCase().includes(q) ||
    String(c.id).includes(q) ||
    (c.clientId || '').toLowerCase().includes(q) ||
    (c.phone || '').toLowerCase().includes(q)
  ), [clients, q]);

  const clientTickets = selectedClient?.tickets || [];
  const selectedTicket = clientTickets.find((t) => t.id === selectedTicketId) || null;

  const activeName = selectedClient?.name || clientName;
  const activePhone = selectedClient?.phone || clientPhone;

  const buildPreview = (tpl, vars) => {
    if (!tpl) return '';
    let text = tpl.body;
    (tpl.variables || []).forEach((v) => { text = text.split(`[${v}]`).join(vars[v] || `[${v}]`); });
    return text;
  };

  useEffect(() => { setPreview(buildPreview(selectedTpl, variables)); }, [selectedTpl, variables]);

  // Map a client + selected ticket onto whatever variables the template
  // declares: client name, Client ID, ticket / complaint number, PM, branch.
  const autoVarsFor = (tpl, client, ticket) => {
    const out = {};
    const pm = ticket?.assignedPmName || client?.assignedPmName || user?.name || '';
    (tpl?.variables || []).forEach((v) => {
      switch (v) {
        case 'Name': if (client) out[v] = client.name; break;
        case 'Client ID':
        case 'ClientID': if (client) out[v] = client.clientId; break;
        case 'Ticket':
        case 'Complaint': if (ticket) out[v] = ticket.ticket || ticket.complaintNumber; break;
        case 'PM': out[v] = pm; break;
        case 'Manager':
        case 'Director': out[v] = user?.name || ''; break;
        case 'Branch': if (ticket?.branch || client?.branch) out[v] = ticket?.branch || client.branch; break;
        case 'Status': if (ticket?.status) out[v] = String(ticket.status).replace(/_/g, ' '); break;
        case 'Link': out[v] = '(a real feedback link is generated when you send)'; break;
        case 'Email': if (client?.email) out[v] = client.email; break;
        default: break;
      }
    });
    return out;
  };

  const refillVars = (tpl, client, ticket) => {
    const init = {};
    (tpl?.variables || []).forEach((v) => { init[v] = ''; });
    setVariables({ ...init, ...autoVarsFor(tpl, client, ticket) });
  };

  const handleSelectTpl = (tpl) => { setSelectedTpl(tpl); refillVars(tpl, selectedClient, selectedTicket); };
  const handleSelectClient = (c) => {
    setSelectedClient(c); setSelectedTicketId(null);
    if (selectedTpl) refillVars(selectedTpl, c, null);
  };
  const handleSelectTicket = (t) => {
    setSelectedTicketId(t.id);
    if (selectedTpl) setVariables((prev) => ({ ...prev, ...autoVarsFor(selectedTpl, selectedClient, t) }));
  };
  const clearClient = () => { setSelectedClient(null); setSelectedTicketId(null); setClientQuery(''); if (selectedTpl) refillVars(selectedTpl, null, null); };

  const handleSend = async () => {
    if (!selectedClient) return toast.error('Select a client first, search by name or Client ID');
    if (!preview.trim()) return toast.error('Select a template and fill variables');
    const waNumber = normalizeWhatsAppNumber(activePhone);
    if (!waNumber) return toast.error(`No WhatsApp number on file for ${activeName}, add one to their profile first`);

    setSending(true);
    try {
      // If this template includes a {Link} variable, generate a real,
      // one-time feedback link now (not eagerly while editing, a link
      // generated on every keystroke would mean a pile of unused, valid
      // links for one message actually sent) and substitute it into the
      // final text before anything goes to WhatsApp.
      let finalVars = variables;
      if (selectedTpl?.variables?.includes('Link')) {
        const { data } = await createFeedbackRequest({
          interactionType: 'other', clientId: selectedClient.id, clientName: activeName, clientPhone: activePhone,
          interactionNote: selectedTicket ? `Ticket ${selectedTicket.ticket || selectedTicket.complaintNumber}` : 'WhatsApp template message',
        });
        finalVars = { ...variables, Link: data.link };
      }
      const finalText = buildPreview(selectedTpl, finalVars);

      // wa.me opens a real WhatsApp Web/desktop chat, pre-filled with the
      // message, using whichever WhatsApp account is already logged in on
      // this device, that's the PM/Service Manager's own number, with no
      // extra config needed. It still takes one click inside WhatsApp
      // itself to actually send: that's a WhatsApp platform restriction,
      // not something a website is allowed to skip.
      window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(finalText)}`, '_blank', 'noopener,noreferrer');

      const newMsg = { id: Date.now(), from: 'pm', text: finalText, time: formatTime(), read: false };
      setMessages((prev) => [...prev, newMsg]);
      setSent((prev) => [...prev, { ...newMsg, template: selectedTpl?.name, sentAt: new Date().toISOString() }]);
      toast.success(`WhatsApp opened for ${activeName}, click Send inside WhatsApp to deliver it`);
      setSelectedTpl(null); setVariables({}); setPreview('');
    } catch (err) {
      toast.error(err?.message || 'Could not prepare this message');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Template composer */}
      <div className="bg-white dark:bg-ticano-dark-card rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
        <h4 className="font-semibold text-ticano-charcoal dark:text-white mb-4 flex items-center gap-2">
          <MessageCircle size={16} className="text-green-500" /> Compose Message
        </h4>

        {/* Client search */}
        <div className="mb-4">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">Client</label>
          {!selectedClient ? (
            <>
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={clientQuery} onChange={(e) => setClientQuery(e.target.value)}
                  placeholder="Search by name, Client ID (TIC-…) or phone…"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-400" />
              </div>
              {clientQuery && (
                <div className="mt-2 space-y-1 max-h-44 overflow-y-auto border border-gray-100 dark:border-gray-700 rounded-xl p-1">
                  {filteredClients.length === 0 ? (
                    <p className="text-xs text-gray-400 p-2">No clients match “{clientQuery}”.</p>
                  ) : filteredClients.map((c) => (
                    <button key={c.id} onClick={() => handleSelectClient(c)}
                      className="w-full flex items-center gap-2 p-2 rounded-lg text-left hover:bg-green-50 dark:hover:bg-green-900/20">
                      <span className="w-7 h-7 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold shrink-0">{c.name.charAt(0)}</span>
                      <span className="min-w-0">
                        <span className="block text-sm text-gray-800 dark:text-white truncate">{c.name}</span>
                        <span className="block text-[11px] text-gray-400">{c.clientId} · {c.branch} · {c.phone}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-green-300 bg-green-50 dark:bg-green-900/20">
              <div className="flex items-center gap-2 min-w-0">
                <User size={15} className="text-green-600 shrink-0" />
                <span className="text-sm font-medium text-gray-800 dark:text-white truncate">{selectedClient.name}</span>
                <span className="text-[11px] text-gray-400 shrink-0 flex items-center gap-1"><Hash size={11} />{selectedClient.clientId}</span>
              </div>
              <button onClick={clearClient} className="text-gray-400 hover:text-ticano-red shrink-0" title="Change client"><X size={15} /></button>
            </div>
          )}
        </div>

        {/* Client tickets, only the selected client's tickets */}
        {selectedClient && (
          <div className="mb-4">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">
              Tickets for {selectedClient.name.split(' ')[0]} {clientTickets.length > 0 && <span className="text-gray-400 normal-case">({clientTickets.length})</span>}
            </label>
            {clientTickets.length === 0 ? (
              <p className="text-xs text-gray-400">This client has no tickets on record.</p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {clientTickets.map((t) => (
                  <button key={t.id} onClick={() => handleSelectTicket(t)}
                    className={`w-full text-left p-2.5 rounded-xl border transition-all duration-150 ${selectedTicketId === t.id ? 'border-green-400 bg-green-50 dark:bg-green-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}>
                    <div className="flex items-center gap-2">
                      <Ticket size={13} className="text-ticano-red shrink-0" />
                      <span className="font-mono text-xs font-bold text-ticano-red">{t.ticket}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 capitalize">{String(t.status).replace(/_/g, ' ')}</span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-300 truncate mt-1">{t.category} · {t.description}</p>
                  </button>
                ))}
              </div>
            )}
            {selectedTicket && <p className="text-[11px] text-green-600 mt-2">Auto-filled ticket {selectedTicket.ticket}{selectedTicket.assignedPmName ? ` · PM ${selectedTicket.assignedPmName}` : ''} into the template variables.</p>}
          </div>
        )}

        {/* Template selector */}
        <div className="mb-4">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">Select Template</label>
          {templates.length === 0 ? (
            <p className="text-xs text-gray-400">No active templates available for your role.</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {templates.map((t) => (
                <button key={t.id} onClick={() => handleSelectTpl(t)}
                  className={`w-full text-left p-3 rounded-xl border transition-all duration-150 ${selectedTpl?.id === t.id ? 'border-green-400 bg-green-50 dark:bg-green-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-500'}`}>
                  <p className="font-medium text-sm text-gray-800 dark:text-white">{t.name}</p>
                  <p className="text-xs text-gray-400 truncate mt-0.5">{t.body}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Variable filling */}
        {selectedTpl && selectedTpl.variables?.length > 0 && (
          <div className="mb-4 space-y-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block">Fill Variables</label>
            {selectedTpl.variables.map((v) => (
              <div key={v}>
                <label className="text-xs text-gray-500 mb-0.5 block">[{v}]{variables[v] ? <span className="text-green-600 ml-1">• auto-filled</span> : null}</label>
                <input value={variables[v] || ''} onChange={(e) => setVariables({ ...variables, [v]: e.target.value })}
                  className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-400"
                  placeholder={`Enter ${v}…`} />
              </div>
            ))}
          </div>
        )}

        {/* Preview */}
        {preview && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
            <p className="text-xs font-semibold text-green-600 mb-1">Preview</p>
            <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">{preview}</p>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
          <span>To: {activeName} · {activePhone ? normalizeWhatsAppNumber(activePhone) : 'no number on file'}</span>
        </div>
        <p className="text-[11px] text-gray-400 mb-3">Opens WhatsApp with this chat and message ready, you'll click Send inside WhatsApp to deliver it.</p>
        <button onClick={handleSend} disabled={sending || !preview}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-50">
          {sending ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Opening WhatsApp…</> : <><Send size={14} />Send WhatsApp Message</>}
        </button>

        {/* Send log */}
        {sent.length > 0 && (
          <div className="mt-4 border-t border-gray-100 dark:border-gray-700 pt-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Opened in WhatsApp, this session</p>
            <div className="space-y-2">
              {sent.map((s) => (
                <div key={s.id} className="flex items-center gap-2 text-xs">
                  <CheckCheck size={12} className="text-green-500 shrink-0" />
                  <span className="text-gray-600 dark:text-gray-300 flex-1 truncate">{s.template} → {activeName}</span>
                  <span className="text-gray-400">{s.time}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* WhatsApp phone mockup */}
      <div className="flex justify-center">
        <div className="w-72 bg-gray-900 rounded-[2.5rem] p-2 shadow-2xl">
          <div className="bg-white rounded-[2rem] overflow-hidden" style={{ height: '560px' }}>
            <div className="bg-[#075E54] px-4 py-3 flex items-center gap-3">
              <div className="w-8 h-8 bg-green-300 rounded-full flex items-center justify-center text-green-900 font-bold text-sm">{activeName.charAt(0)}</div>
              <div className="flex-1">
                <p className="text-white font-semibold text-sm leading-tight">{activeName}</p>
                <p className="text-green-200 text-[10px]">online</p>
              </div>
              <div className="flex gap-3 text-white"><Phone size={15} /><MoreVertical size={15} /></div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ background: '#ECE5DD', height: 'calc(100% - 110px)' }}>
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.from === 'pm' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-xs shadow-sm ${m.from === 'pm' ? 'bg-[#DCF8C6] rounded-tr-sm' : 'bg-white rounded-tl-sm'}`}>
                    <p className="text-gray-800 leading-relaxed">{m.text}</p>
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <span className="text-[9px] text-gray-400">{m.time}</span>
                      {m.from === 'pm' && <CheckCheck size={11} className={m.read ? 'text-[#53bdeb]' : 'text-gray-400'} />}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-[#F0F0F0] px-2 py-1.5 flex items-center gap-2">
              <Smile size={20} className="text-gray-500" />
              <div className="flex-1 bg-white rounded-full px-3 py-1.5 text-xs text-gray-400">Type a message</div>
              <Paperclip size={18} className="text-gray-500" />
              <div className="w-8 h-8 bg-[#075E54] rounded-full flex items-center justify-center"><Send size={13} className="text-white" /></div>
            </div>
          </div>
          <div className="flex justify-center mt-2"><div className="w-24 h-1 bg-gray-600 rounded-full" /></div>
        </div>
      </div>
    </div>
  );
}
