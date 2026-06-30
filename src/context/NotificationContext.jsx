import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

// Role-specific seed notifications — complaint-centric model.
// Each notification carries a `tab` so clicking it deep-links to the relevant
// item/section of that role's dashboard.
const SEEDS_BY_ROLE = {
  customer: [
    { id: 1, type: 'complaint', title: 'Complaint received',       body: 'Your complaint TCN-0001 has been received. Ticket assigned.',     time: '2026-06-11T10:01:00', read: false, tab: 'complaints' },
    { id: 2, type: 'complaint', title: 'Assigned to a PM',         body: 'Mojaboswa is now handling your complaint TCN-0001.',              time: '2026-06-11T14:00:00', read: false, tab: 'complaints' },
    { id: 3, type: 'queue',     title: 'Queue update',             body: 'You are number 3 in the queue. We will be with you shortly.',     time: '2026-06-11T16:00:00', read: false, tab: 'complaints' },
    { id: 4, type: 'message',   title: 'Message from your PM',     body: 'Hi Stacey, I have pulled the debit order schedule.',              time: '2026-06-12T10:15:00', read: true,  tab: 'complaints' },
    { id: 5, type: 'complaint', title: 'Complaint resolved',       body: 'Complaint TCN-0004 has been resolved. Thank you for your patience.', time: '2026-06-02T16:00:00', read: true,  tab: 'feedback' },
  ],
  portfolio_manager: [
    { id: 1, type: 'complaint',  title: 'New complaint assigned',   body: 'You have been assigned complaint TCN-0001 — Stacey Nthoi.',       time: '2026-06-11T14:00:00', read: false, tab: 'complaints' },
    { id: 2, type: 'complaint',  title: 'Reassigned complaint',     body: 'Complaint TCN-0002 reassigned to you for follow-up.',             time: '2026-06-13T11:00:00', read: false, tab: 'complaints' },
    { id: 3, type: 'escalation', title: 'Complaint escalated',      body: 'TCN-0003 escalated by you — awaiting management decision.',       time: '2026-06-14T15:00:00', read: false, tab: 'complaints' },
    { id: 4, type: 'message',    title: 'Client replied',           body: 'Stacey Nthoi replied to your message about the debit order.',     time: '2026-06-12T11:00:00', read: true,  tab: 'complaints' },
    { id: 5, type: 'lead',       title: 'Lead assigned',            body: 'New lead: Kabo Otsile (walk-in).',                                time: '2026-06-14T09:50:00', read: true,  tab: 'leads' },
  ],
  service_manager: [
    { id: 1, type: 'complaint',  title: 'New complaint submitted',  body: 'New complaint from Mpho Kgosi (TCN-0002) needs assignment.',      time: '2026-06-13T09:00:00', read: false, tab: 'Complaints' },
    { id: 2, type: 'escalation', title: 'Complaint escalated',      body: 'TCN-0003 escalated by Kefilwe Moyo — review required.',           time: '2026-06-14T15:00:00', read: false, tab: 'Escalations' },
    { id: 3, type: 'feedback',   title: 'Low rating received',      body: 'Gaone Modise left a 1-star rating.',                              time: '2026-06-16T07:00:00', read: false, tab: 'Staff Performance' },
    { id: 4, type: 'queue',      title: 'Queue alert',              body: '5 complaints currently in queue at Gaborone branch.',             time: '2026-06-15T13:20:00', read: true,  tab: 'Complaints' },
    { id: 5, type: 'alert',      title: 'PM performance alert',     body: 'Gaone Tau has 12 low ratings this month.',                        time: '2026-06-14T10:00:00', read: true,  tab: 'Staff Performance' },
  ],
  director: [
    { id: 1, type: 'escalation', title: 'Escalation to Management', body: 'TCN-0003 escalated by Francistown branch.',                       time: '2026-06-14T15:05:00', read: false, tab: 'Escalations' },
    { id: 2, type: 'complaint',  title: 'High-priority complaint',  body: 'Critical complaint logged at Francistown branch.',                time: '2026-06-15T17:00:00', read: false, tab: 'Complaint Analytics' },
    { id: 3, type: 'alert',      title: 'Branch performance drop',  body: 'Phikwe CSAT fell below 3.8 this week.',                           time: '2026-06-15T09:00:00', read: false, tab: 'Branch Health' },
    { id: 4, type: 'alert',      title: 'Escalation rate climbing', body: 'Escalation rate at Francistown reached 8.1%.',                    time: '2026-06-14T12:00:00', read: true,  tab: 'Branch Health' },
  ],
  marketing: [
    { id: 1, type: 'referral',  title: 'Referral trend change',   body: 'Social media referrals up 24% this week.',           time: '2026-06-16T08:30:00', read: false, tab: 'referrals' },
    { id: 2, type: 'report',    title: 'New vs Existing report',  body: 'Monthly active client breakdown is available.',      time: '2026-06-15T09:00:00', read: false, tab: 'Reports' },
    { id: 3, type: 'campaign',  title: 'Campaign performance',    body: 'Facebook campaign converted 18 new customers.',      time: '2026-06-14T14:00:00', read: true,  tab: 'summary' },
  ],
  admin: [
    { id: 1, type: 'system', title: 'Backup completed',      body: 'Nightly database backup finished successfully.',     time: '2026-06-16T02:00:00', read: false, tab: 'Database' },
    { id: 2, type: 'system', title: 'Integration warning',   body: 'WhatsApp API latency above threshold.',              time: '2026-06-15T22:15:00', read: false, tab: 'System Health' },
    { id: 3, type: 'system', title: 'System health',         body: 'All services operational. Uptime 99.98%.',           time: '2026-06-15T08:00:00', read: true,  tab: 'System Health' },
  ],
};

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    setNotifications(SEEDS_BY_ROLE[user?.role] || []);
  }, [user?.role]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);
  const markRead = useCallback((id) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);
  const addNotification = useCallback((notif) => {
    setNotifications((prev) => [{ id: Date.now(), time: new Date().toISOString(), read: false, ...notif }, ...prev]);
  }, []);
  const clearAll = useCallback(() => setNotifications([]), []);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAllRead, markRead, addNotification, clearAll }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
};
