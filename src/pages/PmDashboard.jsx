import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ShieldAlert, TrendingUp, CheckCircle, Star, Clock, Send, Plus, ThumbsUp, ThumbsDown, MessageSquare, Activity, BookOpen, Users, UserCheck, Minus } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import Navbar from '../components/common/Navbar';
import {
  StatCard, Badge, SearchFilters, ExportButton, LoadingSpinner, EmptyState, Card, Tabs, StarRating, AnalyticsLauncher, AnalyticsBackBar, TabBadge,
} from '../components/common/UI';
import ComplaintsModule from '../components/common/ComplaintsModule';
import SendFeedbackRequest from '../components/common/SendFeedbackRequest';
import PotentialClients from '../components/common/PotentialClients';
import WidgetBoundary from '../components/common/WidgetBoundary';
import KnowledgeBase from '../components/common/KnowledgeBase';
import AIInbox from '../components/ai/AIInbox';
import ClientPortfolio from '../components/common/ClientPortfolio';
import StaffMessaging from '../components/common/StaffMessaging';
import { searchCustomers } from '../services/supabaseApi';
import { createLead } from '../services/supabaseApi';
import { getComplaints, getPmRatingStats, subscribeToTable, getQueueOverview } from '../services/supabaseApi';
import AnnouncementBanner from '../components/common/AnnouncementBanner';
import WhatsAppSimulator from '../components/common/WhatsAppSimulator';
import EmailNotifications from '../components/common/EmailNotifications';
import { OPEN_COMPLAINT_STATUSES, complaintStatusLabel } from '../utils/constants';
import { formatPercent, formatDate } from '../utils/format';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import toast from 'react-hot-toast';

const RED = '#CE313C';
const GRAY = '#808686';

export default function PmDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState('overview');
  const [searchParams] = useSearchParams();
  const PM_TAB_IDS = ['overview', 'cases', 'clients', 'kb-ai', 'ratings', 'whatsapp', 'email', 'messages'];
  const [subView, setSubView] = useState(null);

  // Related tools grouped into hubs so the tab bar stays short.
  const PM_CASES_VIEWS = [
    { id: 'complaints', label: 'My Complaints', desc: 'Complaints assigned to you', icon: ShieldAlert, accent: 'red' },
    { id: 'queue', label: 'Queue', desc: 'Your live customer queue', icon: Clock, accent: 'navy' },
  ];
  const PM_CLIENTS_VIEWS = [
    { id: 'potential', label: 'Potential Clients', desc: 'Prospects and customers not yet in your portfolio', icon: UserCheck, accent: 'gold' },
    { id: 'portfolio', label: 'Client Portfolio', desc: 'Your client relationship view', icon: UserCheck, accent: 'red' },
  ];
  const PM_KB_AI_VIEWS = [
    { id: 'kb', label: 'Knowledge Base', desc: 'Internal articles and how-tos', icon: BookOpen, accent: 'navy' },
    { id: 'ai-inbox', label: 'AI Inbox', desc: 'AI-drafted responses awaiting review', icon: Activity, accent: 'red' },
  ];
  const PM_HUB_MAP = { complaints: 'cases', queue: 'cases', leads: 'clients', potential: 'clients', portfolio: 'clients', kb: 'kb-ai', 'ai-inbox': 'kb-ai' };

  const { notifications, markRead, unreadMessageCount } = useNotifications();
  // Defensive alias, the lead-assignment DB function sends 'Leads'
  // (capitalized); this dashboard's own tab id is lowercase 'leads'.
  const PM_TAB_ALIASES = { Leads: 'potential', leads: 'potential' };
  const tabKeyOf = (n) => {
    const raw = (n.tab || '').split(':')[0];
    return PM_TAB_ALIASES[raw] || raw;
  };
  const unreadNotifs = notifications.filter((n) => !n.read);
  const badgeFor = (id) => unreadNotifs.filter((n) => tabKeyOf(n) === id).length;
  const countFor = (ids) => unreadNotifs.filter((n) => ids.includes(tabKeyOf(n))).length;
  const clearNotifsFor = (ids) => unreadNotifs.filter((n) => ids.includes(tabKeyOf(n))).forEach((n) => markRead(n.id));
  const PM_HUB_ID_SETS = { cases: PM_CASES_VIEWS.map((v) => v.id), clients: PM_CLIENTS_VIEWS.map((v) => v.id), 'kb-ai': PM_KB_AI_VIEWS.map((v) => v.id) };
  const tabBadgeCount = (id) => (PM_HUB_ID_SETS[id] ? countFor(PM_HUB_ID_SETS[id]) : badgeFor(id));
  useEffect(() => {
    const t = searchParams.get('tab');
    if (!t) return;
    const tRaw = PM_TAB_ALIASES[t] || t;
    if (PM_HUB_MAP[tRaw]) { setTab(PM_HUB_MAP[tRaw]); setSubView(tRaw); }
    else if (PM_TAB_IDS.includes(tRaw)) { setTab(tRaw); setSubView(null); }
  }, [searchParams]);
  const [loading, setLoading] = useState(true);
  const [myComplaints, setMyComplaints] = useState([]);
  const [ratingStats, setRatingStats] = useState({ avgRating: 0, totalRatings: 0, positiveCount: 0, neutralCount: 0, negativeCount: 0, trend: [] });
  const [showReviewSender, setShowReviewSender] = useState(false);

  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    (async () => {
      try {
        const [{ data }, { data: ratings }] = await Promise.all([
          getComplaints({ assignedPmId: user.id }),
          getPmRatingStats(user.id),
        ]);
        setMyComplaints(data || []);
        setRatingStats(ratings);
      } catch {} finally { setLoading(false); }
    })();
  }, [user?.id]);

  // Live sync: a complaint newly routed to this PM (see migration 015's
  // auto-assignment trigger), an escalation, or a status change updates
  // the "My Workspace" overview stats instantly, without needing to open
  // the Complaints tab first.
  useEffect(() => {
    if (!user?.id) return;
    const reload = () => getComplaints({ assignedPmId: user.id }).then(({ data }) => setMyComplaints(data || [])).catch(() => {});
    const unsubComplaints = subscribeToTable('complaints', {}, reload);
    const unsubEscalations = subscribeToTable('complaint_escalations', {}, reload);
    return () => { unsubComplaints(); unsubEscalations(); };
  }, [user?.id]);

  if (loading) {
    return <div className="min-h-screen bg-ticano-bg dark:bg-ticano-dark-bg"><Navbar title="Portfolio Manager" /><LoadingSpinner /></div>;
  }

  const openCount = myComplaints.filter((c) => OPEN_COMPLAINT_STATUSES.includes(c.status)).length;
  const escalatedCount = myComplaints.filter((c) => c.status === 'escalated').length;
  const resolvedCount = myComplaints.filter((c) => c.status === 'resolved').length;

  return (
    <div className="min-h-screen bg-ticano-bg dark:bg-ticano-dark-bg">
      <Navbar title="Portfolio Manager" />
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h1 className="text-xl font-bold text-ticano-charcoal dark:text-white">My Workspace</h1>
          <button onClick={() => setShowReviewSender(true)} className="flex items-center gap-2 px-4 py-2 bg-ticano-red text-white rounded-lg text-sm font-medium hover:bg-ticano-red-dark">
            <Send size={16} /> Send Feedback Request
          </button>
        </div>

        <AnnouncementBanner />
        <Tabs
          tabs={[
            { id: 'overview', label: 'Overview', badge: tabBadgeCount('overview') },
            { id: 'cases', label: 'My Cases', badge: tabBadgeCount('cases') },
            { id: 'clients', label: 'Clients', badge: tabBadgeCount('clients') },
            { id: 'kb-ai', label: 'Knowledge & AI', badge: tabBadgeCount('kb-ai') },
            { id: 'messages', label: 'Messages', badge: unreadMessageCount },
            { id: 'ratings', label: 'Rating Analytics', badge: tabBadgeCount('ratings') },
            { id: 'whatsapp', label: 'WhatsApp', badge: tabBadgeCount('whatsapp') },
            { id: 'email', label: 'Email', badge: tabBadgeCount('email') },
          ]}
          active={tab}
          onChange={(t) => { setTab(t); setSubView(null); if (!PM_HUB_ID_SETS[t]) clearNotifsFor([t]); }}
        />

        <SendFeedbackRequest open={showReviewSender} onClose={() => setShowReviewSender(false)} />

        <WidgetBoundary label={subView ? `${tab}: ${subView}` : tab} resetKeys={`${tab}:${subView}`} key={`${tab}:${subView}`}>

        {/* ---------- MY CASES HUB ---------- */}
        {tab === 'cases' && !subView && (
          <AnalyticsLauncher views={PM_CASES_VIEWS} onSelect={(id) => { setSubView(id); clearNotifsFor([id]); }} title="My Cases" subtitle="Pick a view to open it." badges={Object.fromEntries(PM_CASES_VIEWS.map((v) => [v.id, badgeFor(v.id)]))} />
        )}
        {tab === 'cases' && subView && (
          <AnalyticsBackBar view={PM_CASES_VIEWS.find((v) => v.id === subView)} onBack={() => setSubView(null)} backLabel="All Cases" />
        )}

        {/* ---------- CLIENTS HUB ---------- */}
        {tab === 'clients' && !subView && (
          <AnalyticsLauncher views={PM_CLIENTS_VIEWS} onSelect={(id) => { setSubView(id); clearNotifsFor([id]); }} title="Clients" subtitle="Pick a view to open it." badges={Object.fromEntries(PM_CLIENTS_VIEWS.map((v) => [v.id, badgeFor(v.id)]))} />
        )}
        {tab === 'clients' && subView && (
          <AnalyticsBackBar view={PM_CLIENTS_VIEWS.find((v) => v.id === subView)} onBack={() => setSubView(null)} backLabel="All Clients" />
        )}

        {/* ---------- KNOWLEDGE & AI HUB ---------- */}
        {tab === 'kb-ai' && !subView && (
          <AnalyticsLauncher views={PM_KB_AI_VIEWS} onSelect={(id) => { setSubView(id); clearNotifsFor([id]); }} title="Knowledge & AI" subtitle="Pick a view to open it." badges={Object.fromEntries(PM_KB_AI_VIEWS.map((v) => [v.id, badgeFor(v.id)]))} />
        )}
        {tab === 'kb-ai' && subView && (
          <AnalyticsBackBar view={PM_KB_AI_VIEWS.find((v) => v.id === subView)} onBack={() => setSubView(null)} backLabel="Knowledge & AI" />
        )}

        {tab === 'whatsapp' && (
          <div className="bg-white dark:bg-ticano-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <h3 className="font-bold text-ticano-charcoal dark:text-white text-lg mb-4">WhatsApp Messaging</h3>
            <WhatsAppSimulator />
          </div>
        )}

        {tab === 'email' && (
          <div className="bg-white dark:bg-ticano-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <h3 className="font-bold text-ticano-charcoal dark:text-white text-lg mb-4">Email Notifications</h3>
            <EmailNotifications />
          </div>
        )}

        {/* ---------- OVERVIEW ---------- */}
        {tab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Open Complaints" value={openCount} icon={ShieldAlert} color="red" />
              <StatCard title="Escalated" value={escalatedCount} icon={TrendingUp} color="gold" />
              <StatCard title="Resolved" value={resolvedCount} icon={CheckCircle} color="teal" />
              <StatCard title="Avg Customer Rating" value={ratingStats.totalRatings ? ratingStats.avgRating.toFixed(1) : '-'} subtitle={`out of 5.0 · ${ratingStats.totalRatings} review${ratingStats.totalRatings === 1 ? '' : 's'}`} icon={Star} color="navy" />
            </div>

            {/* Recent activity */}
            <Card title="Recent assigned complaints" subtitle="Newest assignments first">
              {myComplaints.length === 0 ? (
                <EmptyState title="No complaints assigned" icon={ShieldAlert} />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        {['Ticket', 'Customer', 'Category', 'Severity', 'Status', 'Created'].map((h) => (
                          <th key={h} className="text-left py-3 px-2 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {myComplaints.slice(0, 5).map((c) => (
                        <tr key={c.id} className="border-b border-gray-100 dark:border-gray-800">
                          <td className="py-3 px-2 font-mono text-ticano-red font-semibold">{c.ticket}</td>
                          <td className="py-3 px-2 font-medium text-gray-800 dark:text-white">{c.customerName}</td>
                          <td className="py-3 px-2 text-gray-500">{c.category}</td>
                          <td className="py-3 px-2"><Badge status={c.severity} /></td>
                          <td className="py-3 px-2 text-gray-600 dark:text-gray-300">{complaintStatusLabel(c.status)}</td>
                          <td className="py-3 px-2 text-gray-400 text-xs">{formatDate(c.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <button onClick={() => setTab('complaints')} className="mt-4 text-sm text-ticano-red hover:underline">
                Open the complaints workspace →
              </button>
            </Card>
          </div>
        )}

        {/* ---------- COMPLAINTS ---------- */}
        {tab === 'cases' && subView === 'complaints' && (
          <ComplaintsModule
            scope="mine"
            currentUser={{ id: user?.id, name: user?.name, role: user?.role }}
            canAssign={false}
            canEscalate={true}
            canResolve={true}
            showInternalNotes={true}
            initialComplaintId={searchParams.get('complaintId')}
          />
        )}

        {tab === 'cases' && subView === 'queue' && <PmQueueTab />}

        {/* ---------- KNOWLEDGE BASE (§8) ---------- */}
        {tab === 'kb-ai' && subView === 'kb' && (
          <KnowledgeBase editable={false} currentUser={user} />
        )}

        {/* ---------- AI INBOX ---------- */}
        {tab === 'kb-ai' && subView === 'ai-inbox' && <AIInbox currentUser={user} />}

        {/* ---------- LEADS ---------- */}
        {tab === 'clients' && subView === 'potential' && <PotentialClients />}

        {/* ---------- CLIENT PORTFOLIO (PM CRM) ---------- */}
        {tab === 'clients' && subView === 'portfolio' && <ClientPortfolio mode="pm" />}

        {tab === 'messages' && <StaffMessaging />}

        {/* ---------- RATING ANALYTICS ---------- */}
        {tab === 'ratings' && (
          ratingStats.totalRatings === 0 ? (
            <EmptyState title="No ratings yet" message="Customer satisfaction ratings will appear here once clients complete the survey after a closed complaint." icon={Star} />
          ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <StatCard title="Average Rating" value={ratingStats.avgRating.toFixed(1)} icon={Star} color="gold" />
              <StatCard title="Total Reviews" value={ratingStats.totalRatings} icon={MessageSquare} color="navy" />
              <StatCard title="Positive" value={ratingStats.positiveCount} subtitle="4-5 stars" icon={ThumbsUp} color="teal" />
              <StatCard title="Neutral" value={ratingStats.neutralCount} subtitle="3 stars" icon={Minus} color="gold" />
              <StatCard title="Negative" value={ratingStats.negativeCount} subtitle="1-2 stars" icon={ThumbsDown} color="red" />
              <StatCard title="Satisfaction" value={formatPercent(ratingStats.totalRatings ? (ratingStats.positiveCount / ratingStats.totalRatings) * 100 : 0)} color="navy" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card title="Rating Trend">
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={ratingStats.trend}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="month" /><YAxis domain={[0, 5]} />
                    <Tooltip />
                    <Line type="monotone" dataKey="avgRating" stroke={RED} strokeWidth={3} name="Avg Rating" />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
              <Card title="Positive vs Neutral vs Negative">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={[{ name: 'Ratings', Positive: ratingStats.positiveCount, Neutral: ratingStats.neutralCount, Negative: ratingStats.negativeCount }]}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="name" /><YAxis />
                    <Tooltip /><Legend />
                    <Bar dataKey="Positive" fill={RED} radius={[6, 6, 0, 0]} />
                    <Bar dataKey="Neutral" fill="#D4A017" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="Negative" fill={GRAY} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>
          </div>
          )
        )}
        </WidgetBoundary>
      </div>
    </div>
  );
}

// ---- Queue Tab, system-wide queue order, so a PM can see where their
// assigned complaints rank relative to everything else waiting. ----
function PmQueueTab() {
  const [rows, setRows] = useState(null);
  const [loadError, setLoadError] = useState(null);

  const load = () => {
    getQueueOverview()
      .then(({ data }) => { setRows(data); setLoadError(null); })
      .catch((err) => { console.error('[PmQueueTab]', err); setLoadError(err?.message || 'Could not load the queue'); });
  };
  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  const fmtWait = (mins) => {
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    return `${h}h ${mins % 60}m`;
  };

  const PRIORITY_STYLE = {
    urgent: 'bg-red-100 text-red-700', high: 'bg-orange-100 text-orange-700',
    medium: 'bg-amber-100 text-amber-700', low: 'bg-gray-100 text-gray-600',
  };

  if (loadError) return <Card title="Queue"><p className="text-sm text-red-500 text-center py-6">{loadError}</p></Card>;
  if (!rows) return <LoadingSpinner />;

  return (
    <Card title="My Queue" subtitle="Your own clients waiting, ordered by priority then submission time, updates automatically">
      {rows.length === 0 ? (
        <EmptyState title="No clients waiting on you right now" icon={Clock} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                {['#', 'Ticket', 'Customer', 'Priority', 'Waiting', 'Branch'].map((h) => (
                  <th key={h} className="text-left py-2 px-2 text-gray-500 text-xs uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.complaintId} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-2.5 px-2 font-bold text-gray-800 dark:text-white">#{r.position}</td>
                  <td className="py-2.5 px-2 font-mono text-xs text-gray-600 dark:text-gray-300">{r.ticket}</td>
                  <td className="py-2.5 px-2 text-gray-700 dark:text-gray-200">{r.customerName}</td>
                  <td className="py-2.5 px-2"><span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold capitalize ${PRIORITY_STYLE[r.priority] || PRIORITY_STYLE.low}`}>{r.priority}</span></td>
                  <td className="py-2.5 px-2 text-gray-500">{fmtWait(r.waitingMinutes)}</td>
                  <td className="py-2.5 px-2 text-gray-500">{r.branch || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
