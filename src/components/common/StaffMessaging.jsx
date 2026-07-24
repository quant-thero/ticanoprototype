import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Plus, Send, Paperclip, Users, X, ArrowLeft, FileText, Download, Check, Search, UserPlus, UserMinus, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getMyConversations, getConversationMessages, sendStaffMessage, markConversationRead,
  startDirectConversation, createGroupConversation, getStaffDirectoryForMessaging,
  getStaffAttachmentSignedUrl, subscribeToTable, addGroupMember, removeGroupMember,
} from '../../services/supabaseApi';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import StaffProfileModal from './StaffProfileModal';

const ROLE_LABEL = { portfolio_manager: 'Portfolio Manager', service_manager: 'Service Manager', director: 'Director', marketing: 'Marketing', admin: 'Admin' };

export default function StaffMessaging() {
  const { user } = useAuth();
  const { reloadUnreadMessages } = useNotifications();
  const [conversations, setConversations] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [mobileShowThread, setMobileShowThread] = useState(false);
  const [search, setSearch] = useState('');

  const loadConversations = () => {
    getMyConversations().then(({ data }) => setConversations(data)).catch((err) => { console.error('[StaffMessaging]', err); toast.error('Could not load conversations'); setConversations([]); });
  };
  useEffect(loadConversations, []);

  useEffect(() => {
    const unsub = subscribeToTable('staff_messages', {}, loadConversations);
    return unsub;
  }, []);

  const openConversation = (id) => {
    setActiveId(id);
    setMobileShowThread(true);
    markConversationRead(id).then(() => { loadConversations(); reloadUnreadMessages(); }).catch(() => {});
  };

  // Clicking a "new message" toast (fired from anywhere in the app, not
  // just while this component is mounted) should land directly on that
  // conversation rather than just switching to the Messages tab blind.
  useEffect(() => {
    const handler = (e) => {
      const id = e.detail?.conversationId;
      if (id) openConversation(id);
    };
    window.addEventListener('ticano:open-messages', handler);
    return () => window.removeEventListener('ticano:open-messages', handler);
  }, []);

  const active = conversations?.find((c) => c.id === activeId);
  const filteredConversations = (conversations || []).filter((c) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return c.name?.toLowerCase().includes(q) || c.members?.some((m) => m.name?.toLowerCase().includes(q));
  });

  return (
    <div className="flex h-[calc(100vh-180px)] min-h-[500px] bg-white dark:bg-ticano-dark-card rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
      {/* Conversation list */}
      <div className={`w-full sm:w-72 shrink-0 border-r border-gray-100 dark:border-gray-700 flex flex-col ${mobileShowThread ? 'hidden sm:flex' : 'flex'}`}>
        <div className="p-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <h3 className="font-bold text-sm text-ticano-charcoal dark:text-white flex items-center gap-2"><MessageSquare size={16} /> Messages</h3>
          <button onClick={() => setShowNew(true)} className="p-1.5 text-ticano-red hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Plus size={16} /></button>
        </div>
        <div className="p-2.5 border-b border-gray-100 dark:border-gray-700">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations…"
              className="w-full pl-7 pr-2 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-ticano-red"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations === null ? (
            <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-gray-200 border-t-ticano-red rounded-full animate-spin" /></div>
          ) : filteredConversations.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8 px-4">{search.trim() ? 'No conversations match your search.' : 'No conversations yet. Click + to message a colleague.'}</p>
          ) : (
            filteredConversations.map((c) => (
              <button
                key={c.id}
                onClick={() => openConversation(c.id)}
                className={`w-full text-left px-3 py-3 border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${activeId === c.id ? 'bg-red-50 dark:bg-red-900/10' : ''}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-sm text-ticano-charcoal dark:text-white truncate flex items-center gap-1.5">
                    {c.type === 'group' && <Users size={12} className="text-gray-400 shrink-0" />}
                    {c.name}
                  </p>
                  {c.unread && <span className="w-2 h-2 rounded-full bg-ticano-red shrink-0" />}
                </div>
                {c.lastMessage && (
                  <p className="text-xs text-gray-400 truncate mt-0.5">
                    {c.lastMessage.senderName ? `${c.lastMessage.senderName}: ` : ''}{c.lastMessage.body || (c.lastMessage.hasAttachment ? ' Attachment' : '')}
                  </p>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Thread */}
      <div className={`flex-1 flex flex-col min-w-0 ${mobileShowThread ? 'flex' : 'hidden sm:flex'}`}>
        {active ? (
          <MessageThread conversation={active} currentUser={user} onBack={() => setMobileShowThread(false)} onSent={loadConversations} onMembersChanged={loadConversations} />
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm text-gray-400">Select a conversation, or start a new one.</div>
        )}
      </div>

      {showNew && (
        <NewConversationModal
          onClose={() => setShowNew(false)}
          onCreated={(id) => { setShowNew(false); loadConversations(); openConversation(id); }}
        />
      )}
    </div>
  );
}

function MessageThread({ conversation, currentUser, onBack, onSent, onMembersChanged }) {
  const [messages, setMessages] = useState(null);
  const [body, setBody] = useState('');
  const [attachment, setAttachment] = useState(null); // { dataUrl, name, type, size }
  const [sending, setSending] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [profilePerson, setProfilePerson] = useState(null);
  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);

  const load = () => {
    getConversationMessages(conversation.id).then(({ data }) => setMessages(data)).catch(() => toast.error('Could not load messages'));
  };
  useEffect(() => { setMessages(null); load(); }, [conversation.id]);

  useEffect(() => {
    const unsub = subscribeToTable('staff_messages', { conversation_id: conversation.id }, load);
    return unsub;
  }, [conversation.id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) return toast.error('Attachments must be under 10MB');
    const reader = new FileReader();
    reader.onloadend = () => setAttachment({ dataUrl: reader.result, name: file.name, type: file.type, size: file.size });
    reader.readAsDataURL(file);
  };

  const send = async () => {
    if (!body.trim() && !attachment) return;
    setSending(true);
    try {
      await sendStaffMessage(conversation.id, {
        body: body.trim() || null,
        attachmentDataUrl: attachment?.dataUrl, attachmentName: attachment?.name,
        attachmentType: attachment?.type, attachmentSize: attachment?.size,
      });
      setBody(''); setAttachment(null);
      load(); onSent?.();
    } catch (err) {
      toast.error(err?.message || 'Could not send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <div className="p-3 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
        <button onClick={onBack} className="sm:hidden p-1 text-gray-400"><ArrowLeft size={18} /></button>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-sm text-ticano-charcoal dark:text-white truncate flex items-center gap-1.5">
            {conversation.type === 'group' && <Users size={13} className="text-gray-400" />} {conversation.name}
          </p>
          {conversation.type === 'group' && (
            <p className="text-[11px] text-gray-400 truncate">
              {conversation.members.map((m, i) => (
                <React.Fragment key={m.id}>
                  {i > 0 && ', '}
                  <button onClick={() => setProfilePerson(m)} className="hover:text-ticano-red hover:underline">{m.name}</button>
                </React.Fragment>
              ))}
            </p>
          )}
        </div>
        {conversation.type === 'group' && (
          <button onClick={() => setShowMembers(true)} title="Manage members" className="p-1.5 text-gray-400 hover:text-ticano-red hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg shrink-0"><UserPlus size={16} /></button>
        )}
      </div>

      {showMembers && (
        <ManageMembersModal
          conversation={conversation}
          currentUser={currentUser}
          onClose={() => setShowMembers(false)}
          onChanged={() => { setShowMembers(false); onMembersChanged?.(); }}
        />
      )}

      {profilePerson && <StaffProfileModal person={profilePerson} onClose={() => setProfilePerson(null)} />}

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages === null ? (
          <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-gray-200 border-t-ticano-red rounded-full animate-spin" /></div>
        ) : messages.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-8">No messages yet, say hello.</p>
        ) : (
          messages.map((m) => {
            const mine = m.senderId === currentUser?.id;
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 ${mine ? 'bg-ticano-red text-white rounded-br-sm' : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-bl-sm'}`}>
                  {!mine && conversation.type === 'group' && (
                    <button onClick={() => setProfilePerson({ id: m.senderId, name: m.senderName })} className="text-[11px] font-semibold opacity-70 mb-0.5 hover:underline block">{m.senderName}</button>
                  )}
                  {m.body && <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p>}
                  {m.attachmentUrl && <AttachmentBubble message={m} mine={mine} />}
                  <p className={`text-[10px] mt-1 ${mine ? 'text-white/60' : 'text-gray-400'}`}>{new Date(m.createdAt).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-3 border-t border-gray-100 dark:border-gray-700">
        {attachment && (
          <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-xs">
            <FileText size={14} className="text-gray-400 shrink-0" />
            <span className="truncate flex-1">{attachment.name}</span>
            <button onClick={() => setAttachment(null)} className="text-gray-400 hover:text-red-500 shrink-0"><X size={13} /></button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <button onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-400 hover:text-ticano-red hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg shrink-0"><Paperclip size={17} /></button>
          <input ref={fileInputRef} type="file" onChange={onFile} className="hidden" />
          <input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Type a message…"
            className="flex-1 px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-ticano-red"
          />
          <button onClick={send} disabled={sending || (!body.trim() && !attachment)} className="p-2.5 bg-ticano-red text-white rounded-xl hover:bg-ticano-red-dark disabled:opacity-40 shrink-0"><Send size={16} /></button>
        </div>
      </div>
    </>
  );
}

function AttachmentBubble({ message, mine }) {
  const isImage = message.attachmentType?.startsWith('image/');
  const [downloading, setDownloading] = useState(false);
  const [thumbUrl, setThumbUrl] = useState(null);

  useEffect(() => {
    if (!isImage) return;
    getStaffAttachmentSignedUrl(message.attachmentUrl).then(({ data }) => setThumbUrl(data.url)).catch(() => {});
  }, [isImage, message.attachmentUrl]);

  const open = async () => {
    setDownloading(true);
    try {
      const { data } = await getStaffAttachmentSignedUrl(message.attachmentUrl);
      window.open(data.url, '_blank');
    } catch {
      toast.error('Could not open attachment');
    } finally {
      setDownloading(false);
    }
  };

  if (isImage) {
    return (
      <button onClick={open} disabled={downloading} className="block mt-1.5 rounded-lg overflow-hidden max-w-[220px]">
        {thumbUrl ? (
          <img src={thumbUrl} alt={message.attachmentName || 'Image'} className="w-full h-auto object-cover hover:opacity-90 transition-opacity" />
        ) : (
          <div className="w-full h-32 bg-black/10 dark:bg-white/10 flex items-center justify-center"><ImageIcon size={20} className="opacity-50" /></div>
        )}
      </button>
    );
  }

  return (
    <button onClick={open} disabled={downloading} className={`flex items-center gap-2 mt-1.5 px-2.5 py-2 rounded-lg text-xs w-full ${mine ? 'bg-white/15 hover:bg-white/25' : 'bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'}`}>
      <FileText size={14} className="shrink-0" />
      <span className="truncate flex-1 text-left">{message.attachmentName || 'Attachment'}</span>
      <Download size={12} className="shrink-0" />
    </button>
  );
}

function NewConversationModal({ onClose, onCreated }) {
  const [mode, setMode] = useState('direct'); // 'direct' | 'group'
  const [staff, setStaff] = useState(null);
  const [selected, setSelected] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [creating, setCreating] = useState(false);
  const [staffSearch, setStaffSearch] = useState('');

  useEffect(() => { getStaffDirectoryForMessaging().then(({ data }) => setStaff(data)).catch(() => setStaff([])); }, []);

  const filteredStaff = (staff || []).filter((s) => !staffSearch.trim() || s.name?.toLowerCase().includes(staffSearch.trim().toLowerCase()));

  const toggle = (id) => setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : (mode === 'direct' ? [id] : [...s, id]));

  const create = async () => {
    if (selected.length === 0) return toast.error(mode === 'direct' ? 'Choose someone to message' : 'Choose at least one person');
    if (mode === 'group' && !groupName.trim()) return toast.error('Give the group a name');
    setCreating(true);
    try {
      if (mode === 'direct') {
        const { data } = await startDirectConversation(selected[0]);
        onCreated(data.conversationId);
      } else {
        const { data } = await createGroupConversation(groupName.trim(), selected);
        onCreated(data.conversationId);
      }
    } catch (err) {
      toast.error(err?.message || 'Could not start conversation');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md max-h-[80vh] overflow-y-auto bg-white dark:bg-ticano-dark-card rounded-2xl shadow-2xl animate-scale-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-ticano-dark-card">
          <p className="font-semibold text-ticano-charcoal dark:text-white">New conversation</p>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex gap-2">
            <button onClick={() => { setMode('direct'); setSelected([]); }} className={`flex-1 py-2 rounded-xl text-sm font-semibold ${mode === 'direct' ? 'bg-ticano-red text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}>Direct message</button>
            <button onClick={() => { setMode('group'); setSelected([]); }} className={`flex-1 py-2 rounded-xl text-sm font-semibold ${mode === 'group' ? 'bg-ticano-red text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}>Group chat</button>
          </div>

          {mode === 'group' && (
            <input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Group name" className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-ticano-red" />
          )}

          <div>
            <p className="text-xs text-gray-500 mb-2">{mode === 'direct' ? 'Choose who to message' : 'Choose group members'}</p>
            <div className="relative mb-2">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={staffSearch} onChange={(e) => setStaffSearch(e.target.value)} placeholder="Search staff…"
                className="w-full pl-7 pr-2 py-2 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-ticano-red" />
            </div>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {staff === null ? (
                <div className="flex justify-center py-6"><div className="w-5 h-5 border-2 border-gray-200 border-t-ticano-red rounded-full animate-spin" /></div>
              ) : filteredStaff.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">{staffSearch.trim() ? 'No matching staff members.' : 'No other staff members found.'}</p>
              ) : filteredStaff.map((s) => (
                <button key={s.id} onClick={() => toggle(s.id)} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-colors ${selected.includes(s.id) ? 'bg-red-50 dark:bg-red-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-white">{s.name}</p>
                    <p className="text-[11px] text-gray-400">{ROLE_LABEL[s.role] || s.role}</p>
                  </div>
                  {selected.includes(s.id) && <Check size={16} className="text-ticano-red shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          <button onClick={create} disabled={creating} className="w-full py-2.5 bg-ticano-red text-white rounded-xl text-sm font-semibold hover:bg-ticano-red-dark disabled:opacity-60">
            {creating ? 'Starting…' : mode === 'direct' ? 'Start conversation' : 'Create group'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ManageMembersModal({ conversation, currentUser, onClose, onChanged }) {
  const [staff, setStaff] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [addSearch, setAddSearch] = useState('');

  useEffect(() => { getStaffDirectoryForMessaging().then(({ data }) => setStaff(data)).catch(() => setStaff([])); }, []);

  const memberIds = new Set(conversation.members.map((m) => m.id));
  const nonMembers = (staff || []).filter((s) => !memberIds.has(s.id) && (!addSearch.trim() || s.name?.toLowerCase().includes(addSearch.trim().toLowerCase())));

  const add = async (userId) => {
    setBusyId(userId);
    try {
      await addGroupMember(conversation.id, userId);
      toast.success('Added to group');
      onChanged();
    } catch (err) {
      toast.error(err?.message || 'Could not add member');
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (userId, name) => {
    if (!window.confirm(`Remove ${name} from this group?`)) return;
    setBusyId(userId);
    try {
      await removeGroupMember(conversation.id, userId);
      toast.success(`${name} removed from group`);
      onChanged();
    } catch (err) {
      toast.error(err?.message || 'Could not remove member');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md max-h-[80vh] overflow-y-auto bg-white dark:bg-ticano-dark-card rounded-2xl shadow-2xl animate-scale-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-ticano-dark-card">
          <p className="font-semibold text-ticano-charcoal dark:text-white">Manage members, {conversation.name}</p>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-5">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Current members ({conversation.members.length})</p>
            <div className="space-y-1">
              {conversation.members.map((m) => (
                <div key={m.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800">
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-white">{m.name}{m.id === currentUser?.id ? ' (you)' : ''}</p>
                    <p className="text-[11px] text-gray-400">{ROLE_LABEL[m.role] || m.role}</p>
                  </div>
                  <button onClick={() => remove(m.id, m.name)} disabled={busyId === m.id} title="Remove from group" className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg disabled:opacity-50">
                    <UserMinus size={15} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Add someone</p>
            <div className="relative mb-2">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={addSearch} onChange={(e) => setAddSearch(e.target.value)} placeholder="Search staff…"
                className="w-full pl-7 pr-2 py-2 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-ticano-red" />
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {staff === null ? (
                <div className="flex justify-center py-6"><div className="w-5 h-5 border-2 border-gray-200 border-t-ticano-red rounded-full animate-spin" /></div>
              ) : nonMembers.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">{addSearch.trim() ? 'No matching staff members.' : 'Everyone is already in this group.'}</p>
              ) : nonMembers.map((s) => (
                <div key={s.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800">
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-white">{s.name}</p>
                    <p className="text-[11px] text-gray-400">{ROLE_LABEL[s.role] || s.role}</p>
                  </div>
                  <button onClick={() => add(s.id)} disabled={busyId === s.id} title="Add to group" className="p-1.5 text-ticano-red hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg disabled:opacity-50">
                    <UserPlus size={15} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
