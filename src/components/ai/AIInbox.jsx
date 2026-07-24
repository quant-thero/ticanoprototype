import React, { useEffect, useState } from 'react';
import { Bot, Search, CircleAlert, Clock, CheckCircle2, User } from 'lucide-react';
import toast from 'react-hot-toast';
import FormattedMessage from './FormattedMessage';
import {
  getAiConversations, getAiConversation, markAiConversationRead,
  updateAiConversationStatus, assignAiConversation,
} from '../../services/supabaseApi';
import { Modal, EmptyState, LoadingSpinner } from '../common/UI';

const STATUS_STYLE = {
  open: 'bg-amber-50 text-amber-700 border-amber-200',
  in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
  resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};
const URGENCY_STYLE = {
  high: 'bg-ticano-red-light text-ticano-red',
  normal: 'bg-gray-100 text-gray-600',
  low: 'bg-gray-50 text-gray-400',
};

export default function AIInbox({ currentUser }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [selected, setSelected] = useState(null);

  const load = () => {
    setLoading(true);
    getAiConversations({ q: q || undefined, status: status === 'all' ? undefined : status })
      .then(({ data }) => setRows(data))
      .catch((err) => { console.error('[AIInbox]', err); toast.error('Could not load conversations'); })
      .finally(() => setLoading(false));
  };

  useEffect(load, [q, status]);

  const openConversation = (id) => {
    getAiConversation(id).then(({ data }) => {
      setSelected(data);
      if (data?.unread) {
        markAiConversationRead(id).then(load);
      }
    });
  };

  const handleAssign = (id) => {
    assignAiConversation(id, currentUser?.id, currentUser?.name || 'Staff').then(() => {
      toast.success('Assigned to you');
      load();
      if (selected?.id === id) openConversation(id);
    });
  };

  const handleStatus = (id, newStatus) => {
    updateAiConversationStatus(id, newStatus, currentUser?.name || 'Staff').then(() => {
      toast.success(`Marked ${newStatus.replace('_', ' ')}`);
      load();
      if (selected?.id === id) openConversation(id);
    });
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-9 h-9 rounded-xl bg-ticano-charcoal flex items-center justify-center text-white">
          <Bot size={18} />
        </div>
        <div>
          <h3 className="font-semibold text-ticano-charcoal dark:text-white">AI Inbox</h3>
          <p className="text-xs text-gray-500">Conversations started with the Ticano AI Assistant</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by summary, intent\u2026"
            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-ticano-dark-card"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="text-sm rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-ticano-dark-card px-3 py-2"
        >
          <option value="all">All statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In progress</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      {loading ? (
        <LoadingSpinner label="Loading conversations\u2026" />
      ) : rows.length === 0 ? (
        <EmptyState title="No AI conversations yet" message="Conversations started via the Ticano Assistant widget will appear here." icon={Bot} />
      ) : (
        <div className="space-y-2">
          {rows.map((c) => (
            <button
              key={c.id}
              onClick={() => openConversation(c.id)}
              className="w-full text-left rounded-xl border border-gray-100 dark:border-white/10 bg-white dark:bg-ticano-dark-card px-4 py-3 hover:border-ticano-red/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5 min-w-0">
                  {c.unread && <span className="mt-1.5 w-2 h-2 rounded-full bg-ticano-red shrink-0" />}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ticano-charcoal dark:text-white truncate">{c.label}</p>
                    <p className="text-xs text-gray-500 truncate">{c.summary || c.intent || 'No summary yet'}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_STYLE[c.status]}`}>{c.status.replace('_', ' ')}</span>
                  {c.urgency === 'high' && (
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${URGENCY_STYLE.high}`}>
                      <CircleAlert size={11} /> urgent
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-400">
                {c.category && <span>{c.category}</span>}
                {c.assignedTo && <span className="flex items-center gap-1"><User size={11} /> {c.assignedTo}</span>}
                <span className="flex items-center gap-1"><Clock size={11} /> {new Date(c.updatedAt).toLocaleString()}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={selected?.label || 'Conversation'} size="lg">
        {selected && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${STATUS_STYLE[selected.status]}`}>{selected.status.replace('_', ' ')}</span>
              {selected.category && <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">{selected.category}</span>}
              {selected.urgency === 'high' && <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${URGENCY_STYLE.high}`}>Urgent</span>}
            </div>

            {selected.summary && (
              <div className="bg-ticano-bg dark:bg-ticano-dark-bg rounded-xl p-3 text-sm text-ticano-charcoal dark:text-gray-200">
                <p className="font-semibold text-xs uppercase tracking-wide text-gray-400 mb-1">Summary</p>
                {selected.summary}
              </div>
            )}

            <div className="max-h-64 overflow-y-auto space-y-2 border border-gray-100 dark:border-white/10 rounded-xl p-3">
              {selected.messages.map((m, i) => (
                <div key={i} className={`text-sm ${m.role === 'user' ? 'text-ticano-charcoal dark:text-white' : 'text-gray-500'}`}>
                  <span className="font-semibold">{m.role === 'user' ? 'Visitor: ' : 'Assistant: '}</span>
                  {m.role === 'user' ? m.content : <FormattedMessage text={m.content} />}
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <button onClick={() => handleAssign(selected.id)} className="text-xs font-semibold px-3 py-1.5 rounded-full bg-ticano-charcoal text-white hover:opacity-90">
                Assign to me
              </button>
              {selected.status !== 'in_progress' && (
                <button onClick={() => handleStatus(selected.id, 'in_progress')} className="text-xs font-semibold px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100">
                  Mark in progress
                </button>
              )}
              {selected.status !== 'resolved' && (
                <button onClick={() => handleStatus(selected.id, 'resolved')} className="text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100 flex items-center gap-1">
                  <CheckCircle2 size={13} /> Mark resolved
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
