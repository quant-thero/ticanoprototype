import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { MessageSquare } from 'lucide-react';
import { useAuth } from './AuthContext';
import { getMyNotifications, markNotificationRead as markReadApi, markAllNotificationsRead as markAllReadApi, clearAllNotifications, createNotification, subscribeToTable, getUnreadMessageCount, getMyConversationIds, getStaffDirectoryForMessaging } from '../services/supabaseApi';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { user, token } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const myConversationIds = useRef(new Set());
  const staffNames = useRef(new Map());

  const reload = useCallback(() => {
    if (!token || !user) { setNotifications([]); return; }
    getMyNotifications().then(({ data }) => setNotifications(data)).catch(() => setNotifications([]));
  }, [token, user]);

  useEffect(() => { reload(); }, [reload]);

  const reloadUnreadMessages = useCallback(() => {
    if (!token || !user) { setUnreadMessageCount(0); return; }
    getUnreadMessageCount().then(({ data }) => setUnreadMessageCount(data)).catch(() => {});
  }, [token, user]);

  useEffect(() => { reloadUnreadMessages(); }, [reloadUnreadMessages]);

  // Keep a running set of "conversations I'm in" so an incoming realtime
  // message event (which has no way to filter on membership server-side)
  // can be checked client-side against something real, rather than
  // trusting every INSERT on this table blindly.
  useEffect(() => {
    if (!token || !user) { myConversationIds.current = new Set(); return; }
    getMyConversationIds().then(({ data }) => { myConversationIds.current = new Set(data); }).catch(() => {});
    getStaffDirectoryForMessaging().then(({ data }) => { staffNames.current = new Map(data.map((s) => [s.id, s.name])); }).catch(() => {});
  }, [token, user?.id]);

  // Toast + badge for a new staff message, separate from the general
  // notifications channel above, since messages have their own read-
  // state (last_read_at per conversation) rather than a notifications row.
  useEffect(() => {
    if (!token || !user) return;
    const unsubscribe = subscribeToTable(
      'staff_messages',
      { event: 'INSERT' },
      (payload) => {
        const row = payload.new;
        if (!row || row.sender_id === user.id) return;
        if (!myConversationIds.current.has(row.conversation_id)) return;

        setUnreadMessageCount((c) => c + 1);
        const senderName = staffNames.current.get(row.sender_id) || 'Someone';
        toast.custom(
          (t) => (
            <div
              onClick={() => { toast.dismiss(t.id); window.dispatchEvent(new CustomEvent('ticano:open-messages', { detail: { conversationId: row.conversation_id } })); }}
              className={`flex items-start gap-2.5 bg-white dark:bg-ticano-dark-card border border-gray-100 dark:border-gray-700 shadow-lg rounded-xl px-4 py-3 cursor-pointer max-w-sm ${t.visible ? 'animate-fade-in' : 'opacity-0'}`}
            >
              <MessageSquare size={16} className="text-ticano-red shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ticano-charcoal dark:text-white">{senderName}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{row.body || (row.attachment_name ? `Sent an attachment: ${row.attachment_name}` : 'Sent a message')}</p>
              </div>
            </div>
          ),
          { duration: 5000 },
        );
      },
    );
    return unsubscribe;
  }, [token, user?.id]);

  // Live push: without this, a notification another user's action creates
  // (e.g. a PM escalating a complaint to a Service Manager) only shows up
  // the next time this tab reloads/logs back in. The realtime channel
  // below streams new `notifications` rows the moment they're inserted,
  // filtered to rows aimed at this person (their user id) or their role.
  useEffect(() => {
    if (!token || !user) return;
    const unsubscribe = subscribeToTable(
      'notifications',
      { event: 'INSERT' },
      (payload) => {
        const row = payload.new;
        if (!row) return;
        const forMe = row.user_id === user.id || row.audience_role === user.role;
        if (!forMe) return;
        setNotifications((prev) => {
          if (prev.some((n) => n.id === row.id)) return prev;
          return [{
            id: row.id,
            type: row.type,
            title: row.title,
            body: row.body,
            tab: row.link_tab,
            read: row.is_read,
            time: row.created_at,
          }, ...prev];
        });
      },
    );
    return unsubscribe;
  }, [token, user?.id, user?.role]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    markAllReadApi().catch(() => {});
  }, []);

  const markRead = useCallback((id) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    markReadApi(id).catch(() => {});
  }, []);

  // Optimistically show a notification immediately, and persist it for real
  // so it survives a refresh and (if role-addressed) reaches other people
  // in that role too.
  const addNotification = useCallback((notif) => {
    setNotifications((prev) => [{ id: Date.now(), time: new Date().toISOString(), read: false, ...notif }, ...prev]);
    createNotification({
      userId: notif.userId, audienceRole: notif.audienceRole || (notif.userId ? null : user?.role),
      type: notif.type, title: notif.title, body: notif.body, tab: notif.tab,
    }).catch(() => {});
  }, [user?.role]);

  const clearAll = useCallback(() => {
    setNotifications([]);
    clearAllNotifications().catch(() => {});
  }, []);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAllRead, markRead, addNotification, clearAll, reload, unreadMessageCount, reloadUnreadMessages }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
};
