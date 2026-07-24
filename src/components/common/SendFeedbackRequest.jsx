import React, { useState, useEffect } from 'react';
import { Search, Send, MessageCircle, UserPlus, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal, Badge } from './UI';
import { useAuth } from '../../context/AuthContext';
import { searchCustomers, createFeedbackRequest, getLeads, getMyFeedbackRequests } from '../../services/supabaseApi';
import { LEAD_STATUS_BADGE, normalizeWhatsAppNumber } from '../../utils/constants';

const INTERACTION_TYPES = [
  { value: 'complaint', label: 'Complaint Resolution' },
  { value: 'walk_in', label: 'Branch Visit / Walk-in' },
  { value: 'enquiry', label: 'Enquiry' },
  { value: 'consultation', label: 'Consultation' },
  { value: 'phone_call', label: 'Phone Call' },
  { value: 'application', label: 'Application' },
  { value: 'follow_up', label: 'Follow-up' },
  { value: 'other', label: 'Other' },
];

/**
 * Modal that lets staff search existing customers, pick a lead, or enter
 * a walk-in's details, then generates a real one-time-use feedback link
 * for that specific interaction and opens WhatsApp Click-to-Chat with it
 * pre-filled, no WhatsApp Business API needed, no typing required.
 *
 * Replaces the old complaint-only "Send Review" flow: works for any kind
 * of staff-customer interaction (see INTERACTION_TYPES), and the link
 * this generates is tied to the interaction, the client, the staff member
 * who sent it, their branch and role, and when it was sent, not just a
 * bare PM+branch pair with no record until someone happened to respond.
 */
export default function SendFeedbackRequest({ open, onClose, defaultInteractionType = 'other', defaultInteractionId = null, defaultInteractionNote = '' }) {
  const { user } = useAuth();
  const [view, setView] = useState('send'); // 'send' | 'history'
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('customers');
  const [leads, setLeads] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [interactionType, setInteractionType] = useState(defaultInteractionType);
  const [sending, setSending] = useState(null); // id of the row currently sending, for a per-row spinner
  const [walkIn, setWalkIn] = useState({ name: '', phone: '' });
  const [history, setHistory] = useState(null);

  useEffect(() => {
    if (!open) return;
    setInteractionType(defaultInteractionType);
    setView('send');
    getLeads().then(({ data }) => setLeads(data)).catch(() => {});
  }, [open, defaultInteractionType]);

  useEffect(() => {
    if (view !== 'history') return;
    setHistory(null);
    getMyFeedbackRequests().then(({ data }) => setHistory(data)).catch(() => setHistory([]));
  }, [view]);

  useEffect(() => {
    if (tab !== 'customers' || query.length < 2) { setCustomers([]); return; }
    searchCustomers(query).then(({ data }) => setCustomers(data?.customers || data || [])).catch(() => {});
  }, [query, tab]);

  const send = async (recipient, phone, clientId, rowKey) => {
    const digits = normalizeWhatsAppNumber(phone);
    if (!digits) return toast.error(`No valid WhatsApp number for ${recipient}`);
    setSending(rowKey);
    try {
      const { data } = await createFeedbackRequest({
        interactionType, interactionId: defaultInteractionId, interactionNote: defaultInteractionNote,
        clientId: clientId ?? null, clientName: recipient, clientPhone: phone,
      });
      const message = `Hi ${recipient}, thank you for choosing Ticano! We'd love to hear about your experience. Please take a moment to rate us: ${data.link}`;
      window.open(`https://wa.me/${digits}?text=${encodeURIComponent(message)}`, '_blank');
      toast.success(`Feedback request sent to ${recipient} via WhatsApp`);
    } catch (err) {
      toast.error(err?.message || 'Could not generate feedback link');
    } finally {
      setSending(null);
    }
  };

  const sendWalkIn = () => {
    if (!walkIn.name.trim()) return toast.error('Enter the client\u2019s name');
    if (!walkIn.phone.trim()) return toast.error('Enter a WhatsApp number');
    send(walkIn.name.trim(), walkIn.phone.trim(), null, 'walkin');
  };

  const filteredLeads = leads.filter(
    (l) => l.name.toLowerCase().includes(query.toLowerCase()) || l.phone.includes(query)
  );

  const inp = 'w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-ticano-red';

  return (
    <Modal open={open} onClose={onClose} title="Send Feedback Request" size="md">
      <div className="flex gap-1 mb-4 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
        {[['send', 'New Request'], ['history', 'History']].map(([id, label]) => (
          <button key={id} onClick={() => setView(id)}
            className={`flex-1 py-1.5 text-sm rounded-md transition-colors ${view === id ? 'bg-white dark:bg-gray-700 shadow-sm font-medium text-ticano-charcoal dark:text-white' : 'text-gray-500'}`}>
            {label}
          </button>
        ))}
      </div>

      {view === 'history' ? (
        <FeedbackHistory history={history} />
      ) : (
      <>
      {/* Interaction type, determines how this link is categorized and
          rolls up in reporting; also shown to the customer on the form. */}
      <div className="mb-4">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">What was this interaction?</label>
        <div className="relative">
          <select value={interactionType} onChange={(e) => setInteractionType(e.target.value)} className={inp + ' appearance-none pr-8'}>
            {INTERACTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      <div className="flex gap-1 mb-4 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
        {[['customers', 'Existing Customers'], ['leads', 'Potential Clients'], ['walkin', 'Walk-in / Other']].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 py-1.5 text-xs sm:text-sm rounded-md transition-colors ${
              tab === id ? 'bg-white dark:bg-gray-700 shadow-sm font-medium text-ticano-charcoal dark:text-white' : 'text-gray-500'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab !== 'walkin' && (
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tab === 'customers' ? 'Search by name or phone…' : 'Search leads…'}
            className="w-full pl-9 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-ticano-red"
          />
        </div>
      )}

      {tab === 'walkin' && (
        <div className="space-y-3 mb-4">
          <p className="text-xs text-gray-500">For a walk-in, phone enquiry, or anyone not yet in the system, enter their details directly.</p>
          <input className={inp} value={walkIn.name} onChange={(e) => setWalkIn({ ...walkIn, name: e.target.value })} placeholder="Client name" />
          <input className={inp} value={walkIn.phone} onChange={(e) => setWalkIn({ ...walkIn, phone: e.target.value })} placeholder="WhatsApp number (e.g. 71234567)" />
          <button onClick={sendWalkIn} disabled={sending === 'walkin'} className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-ticano-red text-white rounded-lg text-sm font-semibold hover:bg-ticano-red-dark disabled:opacity-60">
            <Send size={14} /> {sending === 'walkin' ? 'Generating link…' : 'Send via WhatsApp'}
          </button>
        </div>
      )}

      {tab !== 'walkin' && (
        <div className="max-h-72 overflow-y-auto space-y-2">
          {tab === 'customers' && customers.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6">Type a name or phone number to search customers.</p>
          )}
          {tab === 'customers' && customers.map((c) => (
            <Row key={c.id} name={c.name} phone={c.whatsappNumber || c.phone} sending={sending === c.id} onSend={() => send(c.name, c.whatsappNumber || c.phone, c.id, c.id)} />
          ))}

          {tab === 'leads' && filteredLeads.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6">No matching potential clients.</p>
          )}
          {tab === 'leads' && filteredLeads.map((l) => (
            <Row
              key={l.id}
              name={l.name}
              phone={l.phone}
              sending={sending === `lead-${l.id}`}
              badge={<Badge status={LEAD_STATUS_BADGE[l.status]} />}
              onSend={() => send(l.name, l.phone, null, `lead-${l.id}`)}
            />
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400 mt-4 flex items-center gap-1.5">
        <MessageCircle size={13} /> Opens WhatsApp with a ready-to-send message and a one-time feedback link, nothing to type.
      </p>
      </>
      )}
    </Modal>
  );
}

function FeedbackHistory({ history }) {
  const STATUS_STYLE = {
    sent: 'bg-blue-100 text-blue-700', completed: 'bg-green-100 text-green-700', expired: 'bg-gray-200 text-gray-600',
  };
  if (history === null) return <div className="py-10 flex justify-center"><div className="w-6 h-6 border-2 border-gray-200 border-t-ticano-red rounded-full animate-spin" /></div>;
  if (history.length === 0) return <p className="text-sm text-gray-400 text-center py-10">No feedback requests sent yet.</p>;
  return (
    <div className="max-h-96 overflow-y-auto space-y-2">
      {history.map((h) => (
        <div key={h.id} className="p-3 rounded-lg border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-gray-800 dark:text-white truncate">{h.clientName}</p>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${STATUS_STYLE[h.status] || 'bg-gray-100 text-gray-600'}`}>{h.status}</span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{INTERACTION_TYPES.find((t) => t.value === h.interactionType)?.label || h.interactionType} · {new Date(h.sentAt).toLocaleDateString()}</p>
          {h.status === 'completed' && h.rating && (
            <p className="text-xs text-amber-500 mt-1">{'★'.repeat(h.rating)}{'☆'.repeat(5 - h.rating)} {h.comment && <span className="text-gray-500 dark:text-gray-400 italic">, "{h.comment}"</span>}</p>
          )}
        </div>
      ))}
    </div>
  );
}

function Row({ name, phone, badge, onSend, sending }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
      <div>
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-gray-800 dark:text-white">{name}</p>
          {badge}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">{phone}</p>
      </div>
      <button onClick={onSend} disabled={sending} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-ticano-red text-white rounded-lg hover:bg-ticano-red-dark disabled:opacity-60">
        <Send size={13} /> {sending ? 'Sending…' : 'Send Link'}
      </button>
    </div>
  );
}
