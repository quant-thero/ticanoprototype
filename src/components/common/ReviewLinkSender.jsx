import React, { useState, useEffect } from 'react';
import { Search, Send, MessageCircle, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal, Badge } from './UI';
import { getLeads, sendReviewLink, searchCustomers } from '../../services/api';
import { LEAD_STATUS_BADGE } from '../../utils/constants';

/**
 * Modal that lets staff search existing customers or leads and send a
 * WhatsApp review/experience link. UI-test only (simulated send).
 */
export default function ReviewLinkSender({ open, onClose }) {
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('customers');
  const [leads, setLeads] = useState([]);
  const [customers, setCustomers] = useState([]);

  useEffect(() => {
    if (!open) return;
    getLeads().then(({ data }) => setLeads(data)).catch(() => {});
  }, [open]);

  useEffect(() => {
    if (tab !== 'customers' || query.length < 2) { setCustomers([]); return; }
    searchCustomers(query).then(({ data }) => setCustomers(data?.customers || data || [])).catch(() => {});
  }, [query, tab]);

  const send = (recipient, phone, type) => {
    sendReviewLink({ recipient, phone, type }).then(() => {
      toast.success(`Review link sent to ${recipient}`);
    });
  };

  const filteredLeads = leads.filter(
    (l) => l.name.toLowerCase().includes(query.toLowerCase()) || l.phone.includes(query)
  );

  return (
    <Modal open={open} onClose={onClose} title="Send Review Link" size="md">
      <div className="flex gap-1 mb-4 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
        {[['customers', 'Existing Customers'], ['leads', 'Potential Clients']].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 py-1.5 text-sm rounded-md transition-colors ${
              tab === id ? 'bg-white dark:bg-gray-700 shadow-sm font-medium text-ticano-charcoal dark:text-white' : 'text-gray-500'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={tab === 'customers' ? 'Search by name or phone…' : 'Search leads…'}
          className="w-full pl-9 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-ticano-red"
        />
      </div>

      <div className="max-h-72 overflow-y-auto space-y-2">
        {tab === 'customers' && customers.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-6">Type a name or phone number to search customers.</p>
        )}
        {tab === 'customers' && customers.map((c) => (
          <Row key={c.id} name={c.name} phone={c.whatsappNumber || c.phone} onSend={() => send(c.name, c.whatsappNumber || c.phone, 'customer')} />
        ))}

        {tab === 'leads' && filteredLeads.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-6">No matching potential clients.</p>
        )}
        {tab === 'leads' && filteredLeads.map((l) => (
          <Row
            key={l.id}
            name={l.name}
            phone={l.phone}
            badge={<Badge status={LEAD_STATUS_BADGE[l.status]} />}
            onSend={() => send(l.name, l.phone, 'lead')}
          />
        ))}
      </div>

      <p className="text-xs text-gray-400 mt-4 flex items-center gap-1.5">
        <MessageCircle size={13} /> Sends a WhatsApp survey: "Thank you for visiting Ticano Group. Please rate your experience."
      </p>
    </Modal>
  );
}

function Row({ name, phone, badge, onSend }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
      <div>
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-gray-800 dark:text-white">{name}</p>
          {badge}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">{phone}</p>
      </div>
      <button onClick={onSend} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-ticano-red text-white rounded-lg hover:bg-ticano-red-dark">
        <Send size={13} /> Send Link
      </button>
    </div>
  );
}
