import React, { useState, useEffect, useMemo } from 'react';
import { Mail, Send, CheckCircle, Eye, X, Clock, Search, User, Ticket } from 'lucide-react';
import { getClientDirectory, createFeedbackRequest } from '../../services/supabaseApi';
import toast from 'react-hot-toast';

const TEMPLATES = [
  { key: 'complaint_assigned', subject: 'Your Complaint Has Been Assigned, [Ticket]', body: `Dear [Name],\n\nThank you for contacting Ticano Group. Your complaint [Ticket] has been received and assigned to your Portfolio Manager, [PM], who will be in touch within 24 hours.\n\nYou can track your complaint status at any time by logging into the Ticano Client Portal.\n\nWe are committed to resolving your concern within 14 business days.\n\nWarm regards,\nTicano Group Service Team\nwww.ticanogroup.co.bw` },
  { key: 'complaint_resolved', subject: 'Your Complaint Has Been Resolved, [Ticket]', body: `Dear [Name],\n\nWe are pleased to inform you that your complaint [Ticket] has been successfully resolved.\n\nResolution summary: [Resolution]\n\nWe value your feedback. Please take a moment to rate your experience using the link below:\n[ReviewLink]\n\nThank you for your patience and for banking with Ticano Group.\n\nWarm regards,\nTicano Group Service Team\nwww.ticanogroup.co.bw` },
  { key: 'escalation_notice', subject: 'Complaint Escalation Notice, [Ticket]', body: `Dear [Name],\n\nWe want to inform you that your complaint [Ticket] has been escalated to our senior management team for priority resolution.\n\nWe sincerely apologise for any inconvenience caused and assure you this is now being handled with the highest priority.\n\nA senior team member will contact you within 2 business days.\n\nWarm regards,\nTicano Group Service Team\nwww.ticanogroup.co.bw` },
  { key: 'sla_breach_internal', subject: 'SLA Breach Alert, [Ticket], Action Required', body: `Dear [PM],\n\nThis is an automated alert to notify you that complaint [Ticket] assigned to you has exceeded the 14-day SLA resolution deadline.\n\nClient: [Name]\nTicket: [Ticket]\nDays overdue: [Days]\n\nPlease action this complaint immediately and update the status in the system.\n\nThis alert has been copied to your Service Manager.\n\nTicano Group, Automated Service Alert` },
];

export default function EmailNotifications({ branch }) {
  const [selected, setSelected] = useState(TEMPLATES[0]);
  const [recipient, setRecipient] = useState('');
  const [vars, setVars] = useState({ Name: '', Ticket: '', PM: '', Resolution: '', ReviewLink: '(a real feedback link is generated when you send)', Days: '2' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState([]);
  const [preview, setPreview] = useState(false);

  // ---- Intelligent recipient search ----
  const [clients, setClients] = useState([]);
  const [query, setQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedTicketId, setSelectedTicketId] = useState(null);

  useEffect(() => {
    getClientDirectory(branch ? { branch } : {}).then(({ data }) => setClients(data || [])).catch(() => {});
  }, [branch]);

  const q = query.trim().toLowerCase();
  const filteredClients = useMemo(() => clients.filter((c) =>
    !q || c.name.toLowerCase().includes(q) || String(c.id).includes(q) || (c.clientId || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q)
  ), [clients, q]);

  const clientTickets = selectedClient?.tickets || [];

  const selectClient = (c) => {
    setSelectedClient(c); setSelectedTicketId(null);
    setRecipient(c.email || '');
    setVars((prev) => ({ ...prev, Name: c.name, PM: c.assignedPmName || prev.PM }));
  };
  const selectTicket = (t) => {
    setSelectedTicketId(t.id);
    setVars((prev) => ({ ...prev, Ticket: t.ticket, PM: t.assignedPmName || prev.PM }));
  };
  const clearClient = () => { setSelectedClient(null); setSelectedTicketId(null); setQuery(''); setRecipient(''); setVars((prev) => ({ ...prev, Name: '', Ticket: '' })); };

  const buildBody = (tpl, varsOverride = vars) => {
    let s = tpl.subject; let b = tpl.body;
    Object.entries(varsOverride).forEach(([k, v]) => { s = s.replaceAll(`[${k}]`, v || `[${k}]`); b = b.replaceAll(`[${k}]`, v || `[${k}]`); });
    return { subject: s, body: b };
  };
  const { subject, body } = buildBody(selected);

  const emailValid = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e).trim());
  const handleSend = async () => {
    if (!recipient.trim()) return toast.error('Select a recipient first');
    if (!emailValid(recipient)) return toast.error('Enter a valid recipient email address');
    setSending(true);
    try {
      // If this template includes [ReviewLink], generate a real, one-time
      // feedback link now (not eagerly while editing, see the same
      // pattern in WhatsAppSimulator) and rebuild the message with it.
      let finalVars = vars;
      if (selected.body.includes('[ReviewLink]')) {
        const { data } = await createFeedbackRequest({
          interactionType: 'other', clientId: selectedClient?.id ?? null,
          clientName: vars.Name || recipient, clientPhone: null,
          interactionNote: vars.Ticket ? `Ticket ${vars.Ticket}` : 'Email template message',
        });
        finalVars = { ...vars, ReviewLink: data.link };
      }
      const { subject: finalSubject, body: finalBody } = buildBody(selected, finalVars);

      // mailto: opens the sender's own email client (Outlook, Gmail, etc.)
      // with the message ready, there's no transactional email service
      // connected here, so this is the honest equivalent of the wa.me
      // pattern used for WhatsApp: it takes the staff member's own final
      // click to actually send, same as any other email they write.
      window.location.href = `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(finalSubject)}&body=${encodeURIComponent(finalBody)}`;

      setSent((prev) => [{ id: Date.now(), to: recipient, subject: finalSubject, sentAt: new Date() }, ...prev]);
      toast.success(`Email client opened for ${recipient}, click Send to deliver it`);
    } catch (err) {
      toast.error(err?.message || 'Could not prepare this email');
    } finally {
      setSending(false);
    }
  };

  const inp = 'w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-ticano-red';

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Composer */}
        <div className="bg-white dark:bg-ticano-dark-card rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
          <h4 className="font-semibold text-ticano-charcoal dark:text-white mb-4 flex items-center gap-2">
            <Mail size={15} className="text-ticano-red" /> Email Composer
          </h4>

          {/* Client search */}
          <div className="mb-3">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Recipient</label>
            {!selectedClient ? (
              <>
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input value={query} onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by name, Client ID (TIC-…) or email…"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-ticano-red" />
                </div>
                {query && (
                  <div className="mt-2 space-y-1 max-h-44 overflow-y-auto border border-gray-100 dark:border-gray-700 rounded-xl p-1">
                    {filteredClients.length === 0 ? (
                      <p className="text-xs text-gray-400 p-2">No clients match “{query}”.</p>
                    ) : filteredClients.map((c) => (
                      <button key={c.id} onClick={() => selectClient(c)}
                        className="w-full flex items-center gap-2 p-2 rounded-lg text-left hover:bg-red-50 dark:hover:bg-red-900/20">
                        <span className="w-7 h-7 rounded-full bg-ticano-red/10 text-ticano-red flex items-center justify-center text-xs font-bold shrink-0">{c.name.charAt(0)}</span>
                        <span className="min-w-0">
                          <span className="block text-sm text-gray-800 dark:text-white truncate">{c.name}</span>
                          <span className="block text-[11px] text-gray-400 truncate">{c.email} · {c.clientId}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                <input value={recipient} onChange={(e) => setRecipient(e.target.value)} className={inp + ' mt-2'} placeholder="or type an email address…" />
              </>
            ) : (
              <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-ticano-red/30 bg-red-50 dark:bg-red-900/10">
                <div className="flex items-center gap-2 min-w-0">
                  <User size={15} className="text-ticano-red shrink-0" />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-gray-800 dark:text-white truncate">{selectedClient.name} <span className="text-[11px] text-gray-400 font-normal">{selectedClient.clientId}</span></span>
                    <span className="block text-[11px] text-gray-400 truncate">{recipient}</span>
                  </span>
                </div>
                <button onClick={clearClient} className="text-gray-400 hover:text-ticano-red shrink-0" title="Change recipient"><X size={15} /></button>
              </div>
            )}
          </div>

          {/* Client tickets */}
          {selectedClient && clientTickets.length > 0 && (
            <div className="mb-3">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Related ticket (auto-fills [Ticket] & [PM])</label>
              <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                {clientTickets.map((t) => (
                  <button key={t.id} onClick={() => selectTicket(t)}
                    className={`w-full text-left p-2 rounded-lg border transition-all ${selectedTicketId === t.id ? 'border-ticano-red bg-red-50 dark:bg-red-900/10' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}>
                    <div className="flex items-center gap-2">
                      <Ticket size={12} className="text-ticano-red shrink-0" />
                      <span className="font-mono text-xs font-bold text-ticano-red">{t.ticket}</span>
                      <span className="text-[10px] text-gray-400 truncate">{t.category}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mb-3">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Template</label>
            <select value={selected.key} onChange={(e) => setSelected(TEMPLATES.find((t) => t.key === e.target.value) || TEMPLATES[0])} className={inp}>
              {TEMPLATES.map((t) => <option key={t.key} value={t.key}>{t.subject.split(', ')[0].trim()}</option>)}
            </select>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-2">
            {['Name', 'Ticket', 'PM', 'Resolution'].map((v) => (
              <div key={v}>
                <label className="text-[10px] text-gray-400 block mb-0.5">[{v}]</label>
                <input value={vars[v] || ''} onChange={(e) => setVars({ ...vars, [v]: e.target.value })} className={inp} placeholder={v} />
              </div>
            ))}
          </div>

          <p className="text-[11px] text-gray-400 mb-2">Opens your email client with this message ready, you'll click Send there to deliver it.</p>
          <div className="flex gap-2">
            <button onClick={() => setPreview(true)} className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-xl text-sm hover:bg-gray-50 transition-colors">
              <Eye size={13} />Preview
            </button>
            <button onClick={handleSend} disabled={sending} className="flex-1 flex items-center justify-center gap-2 py-2 bg-ticano-red text-white rounded-xl text-sm font-semibold hover:bg-ticano-red-dark transition-colors disabled:opacity-60">
              {sending ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Opening…</> : <><Send size={13} />Send Email</>}
            </button>
          </div>
        </div>

        {/* Sent log */}
        <div className="bg-white dark:bg-ticano-dark-card rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
          <h4 className="font-semibold text-ticano-charcoal dark:text-white mb-4 flex items-center gap-2">
            <CheckCircle size={15} className="text-green-500" /> Opened in Email Client, this session
          </h4>
          {sent.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Mail size={28} className="text-gray-200 mb-2" />
              <p className="text-sm text-gray-400">No emails opened yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sent.map((s) => (
                <div key={s.id} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <CheckCircle size={14} className="text-green-500 mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800 dark:text-white truncate">{s.subject}</p>
                    <p className="text-xs text-gray-400 mt-0.5">To: {s.to}</p>
                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                      <Clock size={10} />{s.sentAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Preview modal */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setPreview(false)} />
          <div className="relative w-full max-w-xl bg-white dark:bg-ticano-dark-card rounded-2xl shadow-2xl animate-scale-in overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <p className="font-semibold text-ticano-charcoal dark:text-white">Email Preview</p>
              <button onClick={() => setPreview(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
            </div>
            <div className="p-5">
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700 space-y-1">
                  <p className="text-xs"><span className="text-gray-400">From:</span> <span className="text-gray-700 dark:text-gray-200">noreply@ticanogroup.co.bw</span></p>
                  <p className="text-xs"><span className="text-gray-400">To:</span> <span className="text-gray-700 dark:text-gray-200">{recipient || '-'}</span></p>
                  <p className="text-xs"><span className="text-gray-400">Subject:</span> <span className="text-gray-800 dark:text-white font-semibold">{subject}</span></p>
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100 dark:border-gray-700">
                    <div className="w-8 h-8 bg-ticano-red rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-xs">T</span>
                    </div>
                    <div>
                      <p className="font-bold text-ticano-charcoal dark:text-white text-sm">Ticano Group</p>
                      <p className="text-xs text-gray-400">Purchase Order Financing Specialists</p>
                    </div>
                  </div>
                  <pre className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap leading-relaxed font-sans">{body}</pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
