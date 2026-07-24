import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Users, AlertTriangle, TrendingUp, Activity, UserCheck, Send, ShieldAlert, ArrowUpRightSquare, UserPlus2, Lightbulb, Clock, BookOpen, BarChart3, MapPin, Mail, Search, FileText } from 'lucide-react';
import WidgetBoundary from '../components/common/WidgetBoundary';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import Navbar from '../components/common/Navbar';
import { StatCard, Badge, LoadingSpinner, Card, EmptyState, AnalyticsLauncher, AnalyticsBackBar, TabBadge } from '../components/common/UI';
import LeadsModule from '../components/common/LeadsModule';
import ClientPortfolio from '../components/common/ClientPortfolio';
import StaffMessaging from '../components/common/StaffMessaging';
import SendFeedbackRequest from '../components/common/SendFeedbackRequest';
import ComplaintsModule from '../components/common/ComplaintsModule';
import KnowledgeBase from '../components/common/KnowledgeBase';
import AIInbox from '../components/ai/AIInbox';
import EscalationDetailModal from '../components/common/EscalationDetailModal';
import { getImprovementFeedback, getImprovementFeedbackSummary, getComplaints, getComplaintAnalytics, getActiveClientAnalytics, getStaffPerformance, getPmWorkload, getUnassignedCustomers, assignCustomer, autoAssignCustomers, getActivePms, subscribeToTable, getAssignedCustomers, getBranchChangeRequests, decideBranchChangeRequest, getQueueStats, getAgingDashboard } from '../services/supabaseApi';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import JobApplicationsModule from '../components/common/JobApplicationsModule';
import ReportsModule from '../components/common/ReportsModule';
import PDFReportGenerator from '../components/common/PDFReportGenerator';
import AdvancedCharts from '../components/common/AdvancedCharts';
import WhatsAppSimulator from '../components/common/WhatsAppSimulator';
import EmailNotifications from '../components/common/EmailNotifications';
import AnnouncementBanner from '../components/common/AnnouncementBanner';
import { formatPercent, formatDate, formatDateTime } from '../utils/format';
import { CLIENT_TYPE_LABEL, JOURNEY_STAGE_LABEL, complaintStatusLabel, OPEN_COMPLAINT_STATUSES, BRANCHES } from '../utils/constants';
import toast from 'react-hot-toast';

const TABS = ['Overview', 'Complaints', 'Clients', 'Knowledge & AI', 'Applications', 'Analytics', 'Communications', 'Messages'];
// Analytics views consolidated under the single "Analytics" tab.
const SM_ANALYTICS_VIEWS = [
  { id: 'Active Clients', label: 'Active Clients', desc: 'New vs existing client mix & retention', icon: UserPlus2, accent: 'red' },
  { id: 'Staff Performance', label: 'Staff Performance', desc: 'Ratings and workload across staff', icon: UserCheck, accent: 'navy' },
  { id: 'Complaint Analytics',label: 'Complaint Analytics',desc: 'Complaints by category, PM and stage', icon: ShieldAlert, accent: 'red' },
  { id: 'Charts', label: 'Advanced Charts', desc: 'Interactive charts across all branches', icon: BarChart3, accent: 'navy' },
  { id: 'Reports', label: 'Reports', desc: 'Generate and download branded PDF reports', icon: FileText, accent: 'navy' },
];
const SM_ANALYTICS_IDS = SM_ANALYTICS_VIEWS.map((v) => v.id);
// Related tools grouped into hubs (same pattern as Analytics above) so the
// top-level tab bar stays short and never needs horizontal scrolling.
const SM_COMPLAINTS_VIEWS = [
  { id: 'All Complaints', label: 'All Complaints', desc: 'Full workspace, assign, escalate, resolve', icon: ShieldAlert, accent: 'red' },
  { id: 'Aging', label: 'Aging', desc: 'Complaints open longest, sorted by age', icon: Clock, accent: 'navy' },
  { id: 'Escalations', label: 'Escalations', desc: 'Cases escalated by Portfolio Managers', icon: ArrowUpRightSquare, accent: 'red' },
  { id: 'Improvement Feedback', label: 'Improvement Feedback', desc: 'Suggestions submitted by clients', icon: Lightbulb, accent: 'gold' },
];
const SM_COMPLAINTS_IDS = SM_COMPLAINTS_VIEWS.map((v) => v.id);

const SM_CLIENTS_VIEWS = [
  { id: 'Leads', label: 'Potential Clients', desc: 'Prospects and enquiries in the pipeline', icon: Users, accent: 'navy' },
  { id: 'Client Portfolio', label: 'Client Portfolio', desc: 'Org-wide client relationship view', icon: UserCheck, accent: 'red' },
  { id: 'Unassigned', label: 'Unassigned', desc: 'Customers awaiting a Portfolio Manager', icon: UserPlus2, accent: 'gold' },
  { id: 'Assigned Clients', label: 'Assigned Clients', desc: 'Every client, grouped by branch and PM', icon: UserCheck, accent: 'navy' },
  { id: 'Branch Changes', label: 'Branch Changes', desc: 'Client requests to switch branch', icon: MapPin, accent: 'red' },
];
const SM_CLIENTS_IDS = SM_CLIENTS_VIEWS.map((v) => v.id);

const SM_KB_AI_VIEWS = [
  { id: 'Knowledge Base', label: 'Knowledge Base', desc: 'Internal articles and how-tos', icon: BookOpen, accent: 'navy' },
  { id: 'AI Inbox', label: 'AI Inbox', desc: 'AI-drafted responses awaiting review', icon: Activity, accent: 'red' },
];
const SM_KB_AI_IDS = SM_KB_AI_VIEWS.map((v) => v.id);

const SM_COMMS_VIEWS = [
  { id: 'WhatsApp', label: 'WhatsApp', desc: 'Send WhatsApp messages using templates', icon: Send, accent: 'red' },
  { id: 'Email', label: 'Email', desc: 'Send branded emails to clients', icon: Mail, accent: 'navy' },
];
const SM_COMMS_IDS = SM_COMMS_VIEWS.map((v) => v.id);

const RED = '#CE313C';
const GRAY = '#808686';
const COLORS = ['#CE313C', '#808686', '#a6abab', '#373435', '#a8252f'];

export default function ServiceManagerDashboard() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('Overview');
  const [subView, setSubView] = useState(null);

  // Unread notification badges on tabs, mirrors what the bell icon shows,
  // but right on the relevant tab/hub tile too. A badge clears the instant
  // that specific item is opened (drilled into for hubs, clicked for
  // standalone tabs); the parent tab's count is just the sum of its
  // children and disappears once every child has been opened.
  const { notifications, markRead, unreadMessageCount } = useNotifications();
  // Real notification tab values (set by DB triggers/other code) don't
  // always spell-match this dashboard's current tab ids one-for-one
  // e.g. complaint/escalation triggers send lowercase 'complaints'
  // (shared with the PM dashboard, whose own tab id IS 'complaints'),
  // which here means "the main Complaints workspace".
  const SM_TAB_ALIASES = { complaints: 'All Complaints' };
  const tabKeyOf = (n) => {
    const raw = (n.tab || '').split(':')[0];
    return SM_TAB_ALIASES[raw] || raw;
  };
  const unreadNotifs = notifications.filter((n) => !n.read);
  const badgeFor = (id) => unreadNotifs.filter((n) => tabKeyOf(n) === id || (id === 'Complaints' && tabKeyOf(n) === 'Complaints')).length;
  const countFor = (ids) => unreadNotifs.filter((n) => ids.includes(tabKeyOf(n))).length;
  const clearNotifsFor = (ids) => unreadNotifs.filter((n) => ids.includes(tabKeyOf(n))).forEach((n) => markRead(n.id));
  const SM_HUB_ID_SETS = { 'Complaints': SM_COMPLAINTS_IDS, 'Clients': SM_CLIENTS_IDS, 'Knowledge & AI': SM_KB_AI_IDS, 'Communications': SM_COMMS_IDS, 'Analytics': SM_ANALYTICS_IDS };
  const tabBadgeCount = (t) => (t === 'Messages' ? unreadMessageCount : SM_HUB_ID_SETS[t] ? countFor(SM_HUB_ID_SETS[t]) : badgeFor(t));

  // Deep-link support: ?tab=Complaints (from notifications) selects that tab,
  // and analytics targets (e.g. ?tab=Staff Performance) open the Analytics hub.
  useEffect(() => {
    const t = searchParams.get('tab');
    if (!t) return;
    if (t === 'Complaints' || t === 'complaints') { setActiveTab('Complaints'); setSubView('All Complaints'); }
    else if (SM_COMPLAINTS_IDS.includes(t)) { setActiveTab('Complaints'); setSubView(t); }
    else if (SM_CLIENTS_IDS.includes(t)) { setActiveTab('Clients'); setSubView(t); }
    else if (SM_KB_AI_IDS.includes(t)) { setActiveTab('Knowledge & AI'); setSubView(t); }
    else if (SM_COMMS_IDS.includes(t)) { setActiveTab('Communications'); setSubView(t); }
    else if (SM_ANALYTICS_IDS.includes(t)) { setActiveTab('Analytics'); setSubView(t); }
    else if (TABS.includes(t)) { setActiveTab(t); setSubView(null); }
  }, [searchParams]);
  const [unassigned, setUnassigned] = useState([]);
  const [assignedClients, setAssignedClients] = useState([]);
  const [assignedSearch, setAssignedSearch] = useState('');
  const [reassigningClientId, setReassigningClientId] = useState(null);
  const [unassignedBranchFilter, setUnassignedBranchFilter] = useState('All');
  const [assignedBranchFilter, setAssignedBranchFilter] = useState('All');
  const [staff, setStaff] = useState([]);
  const [workload, setWorkload] = useState([]);
  const [pmOptions, setPmOptions] = useState([]);
  const [pickedPm, setPickedPm] = useState({}); // { [customerId]: pmId }, manual PM choice per row
  const [loading, setLoading] = useState(true);
  const [loadErrors, setLoadErrors] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [activeClients, setActiveClients] = useState(null);
  const [complaintAnalytics, setComplaintAnalytics] = useState(null);
  const [showReviewSender, setShowReviewSender] = useState(false);
  const [selectedEscalation, setSelectedEscalation] = useState(null);

  useEffect(() => {
    (async () => {
      const results = await Promise.allSettled([
        getUnassignedCustomers(), getStaffPerformance(user?.branch), getPmWorkload(user?.branch),
        getComplaints(), getActiveClientAnalytics(), getComplaintAnalytics(), getActivePms(), getAssignedCustomers(),
      ]);
      const labels = ['getUnassignedCustomers', 'getStaffPerformance', 'getPmWorkload', 'getComplaints', 'getActiveClientAnalytics', 'getComplaintAnalytics', 'getActivePms', 'getAssignedCustomers'];
      const [u, s, w, c, ac, ca, pms, asc] = results;
      const failed = [];
      results.forEach((r, i) => {
        if (r.status === 'rejected') {
          const err = r.reason || {};
          // Postgres/PostgREST errors carry message/code/details/hint as
          // plain enumerable properties, pull them out explicitly so this
          // prints as readable text in the console (a bare object often
          // just prints as "Object" until manually expanded) and so
          // nothing gets lost if it's copied as plain text.
          const parts = [err.message, err.details, err.hint, err.code ? `code: ${err.code}` : null].filter(Boolean);
          const detail = parts.length ? parts.join(' | ') : JSON.stringify(err) || String(err);
          failed.push(`${labels[i]}: ${detail}`);
          console.error(`[ServiceManagerDashboard] ${labels[i]} failed: ${detail}`, err);
        }
      });
      setLoadErrors(failed);
      if (failed.length) toast.error(`Dashboard data failed to load:\n${failed.join('\n')}`, { duration: 15000 });

      if (u.status === 'fulfilled') setUnassigned(u.value.data || []);
      if (s.status === 'fulfilled') setStaff(s.value.data || []);
      if (w.status === 'fulfilled') setWorkload(w.value.data || []);
      if (c.status === 'fulfilled') setComplaints(c.value.data || []);
      if (ac.status === 'fulfilled') setActiveClients(ac.value.data);
      if (ca.status === 'fulfilled') setComplaintAnalytics(ca.value.data);
      if (pms.status === 'fulfilled') setPmOptions(pms.value.data || []);
      if (asc.status === 'fulfilled') setAssignedClients(asc.value.data || []);
      setLoading(false);
    })();
  }, [user?.branch]);

  const refreshUnassigned = () => {
    getUnassignedCustomers().then(({ data }) => setUnassigned(data || [])).catch(() => {});
    getPmWorkload(user?.branch).then(({ data }) => setWorkload(data || [])).catch(() => {});
    getAssignedCustomers().then(({ data }) => setAssignedClients(data || [])).catch(() => {});
  };

  // Live sync: the moment a client registers (or an existing customer's
  // assignment changes, from this tab or any other device/session), the
  // Unassigned list and PM workload update on their own, no manual
  // refresh needed. A toast surfaces new signups the instant they land.
  useEffect(() => {
    const unsubscribe = subscribeToTable('client_profiles', {}, (payload) => {
      if (payload.eventType === 'INSERT' && !payload.new?.assigned_pm_id) {
        toast('A new client just registered and needs a PM assignment.', { icon: '🆕' });
      }
      refreshUnassigned();
    });
    return unsubscribe;
  }, []);

  const handleAutoAssign = async () => {
    try {
      const { data } = await autoAssignCustomers();
      toast.success(data.message || 'Customers auto-assigned');
      setUnassigned([]);
      getAssignedCustomers().then(({ data }) => setAssignedClients(data || [])).catch(() => {});
      getPmWorkload(user?.branch).then(({ data }) => setWorkload(data || [])).catch(() => {});
    } catch { toast.error('Auto-assign failed'); }
  };

  // pmId is optional, leave it unset and the server picks the
  // least-loaded active PM in the client's preferred branch for you.
  const handleAssign = async (customerId) => {
    try {
      const pmId = pickedPm[customerId];
      await assignCustomer({ customerId, pmId: pmId || undefined });
      const pmName = pmId ? pmOptions.find((p) => p.id === Number(pmId))?.name : null;
      toast.success(pmName ? `Client assigned to ${pmName}` : 'Client assigned to the least-loaded PM');
      setUnassigned((p) => p.filter((c) => c.id !== customerId));
      getPmWorkload(user?.branch).then(({ data }) => setWorkload(data || [])).catch(() => {});
      getAssignedCustomers().then(({ data }) => setAssignedClients(data || [])).catch(() => {});
    } catch (err) { toast.error(err.message || 'Assignment failed'); }
  };

  // Separate from handleAssign (Unassigned tab), this is for a client who
  // ALREADY has a PM, being moved to a different one, from the Assigned
  // Clients list specifically.
  const handleReassign = async (customerId, pmId) => {
    if (!pmId) return;
    try {
      await assignCustomer({ customerId, pmId: Number(pmId) });
      const pmName = pmOptions.find((p) => p.id === Number(pmId))?.name;
      toast.success(pmName ? `Client reassigned to ${pmName}` : 'Client reassigned');
      setReassigningClientId(null);
      getAssignedCustomers().then(({ data }) => setAssignedClients(data || [])).catch(() => {});
      getPmWorkload(user?.branch).then(({ data }) => setWorkload(data || [])).catch(() => {});
    } catch (err) {
      toast.error(err.message || 'Could not reassign this client');
    }
  };

  if (loading) return <div className="min-h-screen bg-ticano-bg-light dark:bg-ticano-dark-bg"><Navbar title="Service Manager" /><LoadingSpinner /></div>;

  const openCount = complaints.filter((c) => OPEN_COMPLAINT_STATUSES.includes(c.status)).length;
  const escalations = complaints.filter((c) => c.escalation?.to === 'service_manager');
  const todayCount = complaints.filter((c) => c.createdAt && new Date(c.createdAt).toDateString() === new Date().toDateString()).length;

  // Merge new/existing trends into a single series for the chart
  const mixTrend = activeClients?.newClientsTrend?.map((row, i) => ({
    month: row.month,
    'New clients': row.count,
    'Existing clients': activeClients.existingClientsTrend[i]?.count || 0,
  })) || [];

  return (
    <div className="min-h-screen bg-ticano-bg-light dark:bg-ticano-dark-bg">
      <Navbar title="Service Manager, All Branches" />
      <div className="max-w-7xl mx-auto px-4 py-6">

        {loadErrors.length > 0 && (
          <div className="mb-4 p-4 rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
            <p className="text-sm font-semibold text-red-700 dark:text-red-300 mb-1">Some dashboard data failed to load, full details below (select and copy to report this):</p>
            <pre className="text-xs text-red-600 dark:text-red-400 whitespace-pre-wrap select-all font-mono">{loadErrors.join('\n')}</pre>
          </div>
        )}

        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h1 className="text-xl font-bold text-ticano-charcoal dark:text-white">All Branches</h1>
          <button onClick={() => setShowReviewSender(true)} className="flex items-center gap-2 px-4 py-2 bg-ticano-red text-white rounded-lg text-sm font-medium hover:bg-ticano-red-dark">
            <Send size={16} /> Send Feedback Request
          </button>
        </div>
        <SendFeedbackRequest open={showReviewSender} onClose={() => setShowReviewSender(false)} />

        <AnnouncementBanner />

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {TABS.map((t) => (
            <button key={t} onClick={() => { setActiveTab(t); setSubView(null); if (!SM_HUB_ID_SETS[t]) clearNotifsFor([t]); }}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors flex items-center
                ${activeTab === t ? 'bg-ticano-charcoal text-white' : 'bg-white dark:bg-ticano-dark-card text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
              {t}<TabBadge count={tabBadgeCount(t)} />
            </button>
          ))}
        </div>

        <WidgetBoundary label={subView ? `${activeTab}: ${subView}` : activeTab} resetKeys={`${activeTab}:${subView}`} key={`${activeTab}:${subView}`}>
        {/* ---------- ANALYTICS HUB ---------- */}
        {activeTab === 'Analytics' && !subView && (
          <AnalyticsLauncher
            views={SM_ANALYTICS_VIEWS}
            onSelect={(id) => { setSubView(id); clearNotifsFor([id]); }}
            badges={Object.fromEntries(SM_ANALYTICS_VIEWS.map((v) => [v.id, badgeFor(v.id)]))}
            subtitle="Branch and staff analytics, grouped in one place. Pick a view to explore."
          />
        )}
        {activeTab === 'Analytics' && subView && (
          <AnalyticsBackBar view={SM_ANALYTICS_VIEWS.find((v) => v.id === subView)} onBack={() => setSubView(null)} backLabel="All Analytics" />
        )}

        {/* ---------- COMPLAINTS HUB ---------- */}
        {activeTab === 'Complaints' && !subView && (
          <AnalyticsLauncher
            views={SM_COMPLAINTS_VIEWS}
            onSelect={(id) => { setSubView(id); clearNotifsFor([id]); }}
            badges={Object.fromEntries(SM_COMPLAINTS_VIEWS.map((v) => [v.id, badgeFor(v.id)]))}
            title="Complaints"
            subtitle="Complaint tools grouped in one place. Pick a view to open it."
          />
        )}
        {activeTab === 'Complaints' && subView && (
          <AnalyticsBackBar view={SM_COMPLAINTS_VIEWS.find((v) => v.id === subView)} onBack={() => setSubView(null)} backLabel="All Complaints" />
        )}

        {/* ---------- CLIENTS HUB ---------- */}
        {activeTab === 'Clients' && !subView && (
          <AnalyticsLauncher
            views={SM_CLIENTS_VIEWS}
            onSelect={(id) => { setSubView(id); clearNotifsFor([id]); }}
            badges={Object.fromEntries(SM_CLIENTS_VIEWS.map((v) => [v.id, badgeFor(v.id)]))}
            title="Clients"
            subtitle="Client and lead tools grouped in one place. Pick a view to open it."
          />
        )}
        {activeTab === 'Clients' && subView && (
          <AnalyticsBackBar view={SM_CLIENTS_VIEWS.find((v) => v.id === subView)} onBack={() => setSubView(null)} backLabel="All Clients" />
        )}

        {/* ---------- KNOWLEDGE & AI HUB ---------- */}
        {activeTab === 'Knowledge & AI' && !subView && (
          <AnalyticsLauncher
            views={SM_KB_AI_VIEWS}
            onSelect={(id) => { setSubView(id); clearNotifsFor([id]); }}
            badges={Object.fromEntries(SM_KB_AI_VIEWS.map((v) => [v.id, badgeFor(v.id)]))}
            title="Knowledge & AI"
            subtitle="Pick a view to open it."
          />
        )}
        {activeTab === 'Knowledge & AI' && subView && (
          <AnalyticsBackBar view={SM_KB_AI_VIEWS.find((v) => v.id === subView)} onBack={() => setSubView(null)} backLabel="Knowledge & AI" />
        )}

        {/* ---------- COMMS HUB ---------- */}
        {activeTab === 'Communications' && !subView && (
          <AnalyticsLauncher
            views={SM_COMMS_VIEWS}
            onSelect={(id) => { setSubView(id); clearNotifsFor([id]); }}
            badges={Object.fromEntries(SM_COMMS_VIEWS.map((v) => [v.id, badgeFor(v.id)]))}
            title="Communications"
            subtitle="Pick a channel to open it."
          />
        )}
        {activeTab === 'Communications' && subView && (
          <AnalyticsBackBar view={SM_COMMS_VIEWS.find((v) => v.id === subView)} onBack={() => setSubView(null)} backLabel="All Communications" />
        )}

        {/* ---------- OVERVIEW ---------- */}
        {activeTab === 'Overview' && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Today's Complaints" value={todayCount} icon={Activity} color="navy" />
              <StatCard title="Avg Rating" value={complaintAnalytics?.avgSatisfaction ? complaintAnalytics.avgSatisfaction.toFixed(1) : '-'} subtitle="out of 5.0" icon={TrendingUp} color="teal" />
              <StatCard title="Open Complaints" value={openCount} icon={ShieldAlert} color="red" />
              <StatCard title="Escalations" value={escalations.length} icon={ArrowUpRightSquare} color={escalations.length ? 'gold' : 'white'} />
            </div>

            <div className="mt-4"><QueueStatsCard /></div>

            {escalations.length > 0 && (
              <Card title="Active escalations" subtitle="Complaints requiring management decisions" className="mt-4">
                <div className="space-y-2">
                  {escalations.map((c) => (
                    <button key={c.id} onClick={() => setSelectedEscalation(c)}
                      className="w-full text-left flex items-center justify-between gap-3 p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700/30 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors cursor-pointer">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-orange-900 dark:text-orange-200">{c.ticket} · {c.customerName}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-300 truncate">{c.category} · {c.escalation?.reason}</p>
                      </div>
                      <span className="text-xs text-orange-700 dark:text-orange-300 shrink-0">{formatDateTime(c.escalation?.at)}</span>
                    </button>
                  ))}
                </div>
              </Card>
            )}

            {activeClients && (
              <Card title="Active client mix" subtitle="New vs existing clients across the branch" className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Stat label="New clients" value={activeClients.totals.newClients} />
                  <Stat label="Existing clients" value={activeClients.totals.existingClients} />
                  <Stat label="Total active" value={activeClients.totals.totalActive} />
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={mixTrend}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="month" /><YAxis /><Tooltip /><Legend />
                    <Line type="monotone" dataKey="New clients" stroke={RED} strokeWidth={2.5} />
                    <Line type="monotone" dataKey="Existing clients" stroke={GRAY} strokeWidth={2.5} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            )}
          </>
        )}

        {/* ---------- COMPLAINTS ---------- */}
        {activeTab === 'Complaints' && subView === 'All Complaints' && (
          <ComplaintsModule
            scope="all"
            currentUser={{ id: user?.id, name: user?.name, role: user?.role }}
            canAssign={true}
            canEscalate={true}
            canResolve={true}
            canClose={true}
            showInternalNotes={true}
            initialComplaintId={searchParams.get('complaintId')}
          />
        )}

        {/* ---------- AGING DASHBOARD (§9) ---------- */}
        {activeTab === 'Complaints' && subView === 'Aging' && <AgingTab />}

        {/* ---------- IMPROVEMENT FEEDBACK (§3) ---------- */}
        {activeTab === 'Complaints' && subView === 'Improvement Feedback' && <ImprovementFeedbackTab />}

        {/* ---------- KNOWLEDGE BASE (§8) ---------- */}
        {activeTab === 'Knowledge & AI' && subView === 'Knowledge Base' && <KnowledgeBase editable={false} currentUser={user} />}

        {activeTab === 'Knowledge & AI' && subView === 'AI Inbox' && <AIInbox currentUser={user} />}

        {/* ---------- ESCALATIONS ---------- */}
        {activeTab === 'Complaints' && subView === 'Escalations' && (
          <Card title="Escalations" subtitle="Complaints escalated by Portfolio Managers, Director also notified">
            {escalations.length === 0 ? (
              <EmptyState title="No escalations" message="No complaints have been escalated to management." icon={ArrowUpRightSquare} />
            ) : (
              <div className="space-y-3">
                {escalations.map((c) => (
                  <button key={c.id} onClick={() => setSelectedEscalation(c)}
                    className="w-full text-left border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:border-orange-300 hover:bg-orange-50/40 dark:hover:bg-orange-900/10 transition-colors cursor-pointer">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex-1 min-w-[200px]">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono font-bold text-ticano-red">{c.ticket}</span>
                          <span className="font-semibold text-ticano-charcoal dark:text-white">{c.customerName}</span>
                          <Badge status={c.severity} />
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{c.description}</p>
                        <div className="mt-2 p-2.5 rounded-lg bg-orange-50 dark:bg-orange-900/20 text-sm text-gray-700 dark:text-gray-200">
                          <p className="text-xs uppercase tracking-wide text-orange-700 dark:text-orange-300 mb-0.5">Reason for escalation</p>
                          {c.escalation?.reason}
                        </div>
                        <p className="text-xs text-gray-400 mt-2">Escalated by {c.escalation?.by} · {formatDateTime(c.escalation?.at)} · PM: {c.assignedPmName}</p>
                      </div>
                      <ArrowUpRightSquare size={16} className="text-orange-400 shrink-0 mt-1" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* ---------- ACTIVE CLIENTS ---------- */}
        {activeTab === 'Analytics' && subView === 'Active Clients' && activeClients && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="New Clients" value={activeClients.totals.newClients} icon={UserPlus2} color="red" />
              <StatCard title="Existing Clients" value={activeClients.totals.existingClients} icon={Users} color="navy" />
              <StatCard title="Conversion Rate" value={formatPercent(activeClients.conversionRate)} icon={TrendingUp} color="gold" />
              <StatCard title="Retention Rate" value={formatPercent(activeClients.retentionRate)} icon={UserCheck} color="teal" />
            </div>
            <Card title="New vs Existing trend">
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={mixTrend}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="month" /><YAxis /><Tooltip /><Legend />
                  <Line type="monotone" dataKey="New clients" stroke={RED} strokeWidth={2.5} />
                  <Line type="monotone" dataKey="Existing clients" stroke={GRAY} strokeWidth={2.5} />
                </LineChart>
              </ResponsiveContainer>
            </Card>
            {activeClients.byBranch && (
              <Card title="By branch">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={activeClients.byBranch}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="branch" /><YAxis /><Tooltip /><Legend />
                    <Bar dataKey="newClients" fill={RED} radius={[6, 6, 0, 0]} name="New clients" />
                    <Bar dataKey="existingClients" fill={GRAY} radius={[6, 6, 0, 0]} name="Existing clients" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            )}
          </div>
        )}

        {/* ---------- LEADS ---------- */}
        {activeTab === 'Clients' && subView === 'Leads' && <LeadsModule />}

        {activeTab === 'Clients' && subView === 'Client Portfolio' && <ClientPortfolio mode="orgwide" />}

        {activeTab === 'Messages' && <StaffMessaging />}

        {/* ---------- UNASSIGNED CUSTOMERS ---------- */}
        {activeTab === 'Clients' && subView === 'Unassigned' && (() => {
          const filteredUnassigned = unassignedBranchFilter === 'All' ? unassigned : unassigned.filter((c) => c.preferredBranch === unassignedBranchFilter);
          const filteredWorkload = unassignedBranchFilter === 'All' ? workload : workload.filter((pm) => pmOptions.find((p) => p.id === pm.pmId)?.branch === unassignedBranchFilter);
          return (
          <Card
            title={`Unassigned Customers (${filteredUnassigned.length})`}
            subtitle="Customers awaiting PM assignment"
            actions={
              <div className="flex items-center gap-2">
                <select value={unassignedBranchFilter} onChange={(e) => setUnassignedBranchFilter(e.target.value)}
                  className="text-xs border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-2 bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-ticano-red">
                  <option value="All">All Branches</option>
                  {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
                <button onClick={handleAutoAssign}
                  className="flex items-center gap-2 px-4 py-2 bg-ticano-red text-white rounded-xl text-sm font-medium hover:bg-ticano-red-dark">
                  <UserCheck size={16} /> Auto-Assign All
                </button>
              </div>
            }
          >
            {/* PM workload preview */}
            {filteredWorkload.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                {filteredWorkload.map((pm) => (
                  <div key={pm.pmId} className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                    <p className="text-sm font-medium text-gray-800 dark:text-white">{pm.pmName}</p>
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <span>{pm.assignedCustomers} clients</span>
                      <span>{pm.openComplaints} open</span>
                    </div>
                    <div className="mt-2 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-ticano-red" style={{ width: `${Math.min(100, (pm.assignedCustomers + pm.openComplaints) * 5)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {filteredUnassigned.length === 0 ? (
              <EmptyState title="All customers assigned" icon={Users} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      {['Name', 'WhatsApp', 'Branch', 'Client Type', 'Joined', 'Assign to', 'Actions'].map((h) => (
                        <th key={h} className="text-left py-3 px-2 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUnassigned.map((c) => (
                      <tr key={c.id} className="border-b border-gray-100 dark:border-gray-800">
                        <td className="py-3 px-2 font-medium text-gray-800 dark:text-white">{c.name}</td>
                        <td className="py-3 px-2 text-gray-500">{c.whatsappNumber}</td>
                        <td className="py-3 px-2 text-gray-500">{c.preferredBranch}</td>
                        <td className="py-3 px-2"><span className={`text-xs px-2 py-0.5 rounded-full ${c.clientType === 'new' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{CLIENT_TYPE_LABEL[c.clientType]}</span></td>
                        <td className="py-3 px-2 text-gray-400">{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '-'}</td>
                        <td className="py-3 px-2">
                          <select
                            value={pickedPm[c.id] || ''}
                            onChange={(e) => setPickedPm((p) => ({ ...p, [c.id]: e.target.value }))}
                            className="text-xs border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-ticano-red"
                          >
                            <option value="">Auto (least-loaded PM)</option>
                            {pmOptions.map((pm) => (
                              <option key={pm.id} value={pm.id}>
                                {pm.name}{pm.branch ? `, ${pm.branch}` : ''}{pm.branch === c.preferredBranch ? ' ★' : ''}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-3 px-2">
                          <button onClick={() => handleAssign(c.id)}
                            className="text-xs bg-ticano-red text-white px-3 py-1 rounded-lg hover:bg-ticano-red-dark">
                            Assign
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
          );
        })()}

        {activeTab === 'Clients' && subView === 'Assigned Clients' && (() => {
          const searchTerm = assignedSearch.trim().toLowerCase();
          const filtered = assignedClients
            .filter((c) => assignedBranchFilter === 'All' || c.preferredBranch === assignedBranchFilter)
            .filter((c) => !searchTerm || c.name?.toLowerCase().includes(searchTerm) || c.whatsappNumber?.toLowerCase().includes(searchTerm) || c.assignedPmName?.toLowerCase().includes(searchTerm));
          // Group by branch, then by PM within each branch.
          const byBranch = new Map();
          filtered.forEach((c) => {
            const branch = c.preferredBranch || 'Unassigned branch';
            if (!byBranch.has(branch)) byBranch.set(branch, new Map());
            const byPm = byBranch.get(branch);
            const pmKey = c.assignedPmName || 'Unknown PM';
            if (!byPm.has(pmKey)) byPm.set(pmKey, []);
            byPm.get(pmKey).push(c);
          });

          return (
          <Card
            title={`Assigned Clients (${filtered.length})`}
            subtitle="Every customer with a Portfolio Manager, grouped by branch then PM"
            actions={
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={assignedSearch}
                    onChange={(e) => setAssignedSearch(e.target.value)}
                    placeholder="Search name, WhatsApp, or PM…"
                    className="text-xs border border-gray-300 dark:border-gray-600 rounded-lg pl-7 pr-2 py-2 bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-ticano-red w-48"
                  />
                </div>
                <select value={assignedBranchFilter} onChange={(e) => setAssignedBranchFilter(e.target.value)}
                  className="text-xs border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-2 bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-ticano-red">
                  <option value="All">All Branches</option>
                  {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            }
          >
            {filtered.length === 0 ? (
              <EmptyState title="No assigned clients yet" message="Once customers are assigned a Portfolio Manager, they'll show up here grouped by branch and PM." icon={UserCheck} />
            ) : (
              <div className="space-y-6">
                {[...byBranch.entries()].map(([branch, byPm]) => (
                  <div key={branch}>
                    <h4 className="font-bold text-ticano-charcoal dark:text-white text-sm mb-3 flex items-center gap-2">
                      <MapPin size={14} className="text-ticano-red" /> {branch}
                      <span className="text-xs font-normal text-gray-400">({[...byPm.values()].reduce((sum, arr) => sum + arr.length, 0)} clients)</span>
                    </h4>
                    <div className="space-y-4 pl-1">
                      {[...byPm.entries()].map(([pmName, clients]) => (
                        <div key={pmName} className="border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden">
                          <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 flex items-center justify-between">
                            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{pmName}</p>
                            <span className="text-xs text-gray-400">{clients.length} client{clients.length !== 1 ? 's' : ''}</span>
                          </div>
                          <table className="w-full text-sm">
                            <tbody>
                              {clients.map((c) => (
                                <tr key={c.id} className="border-t border-gray-100 dark:border-gray-800">
                                  <td className="py-2.5 px-4 font-medium text-gray-800 dark:text-white">{c.name}</td>
                                  <td className="py-2.5 px-4 text-gray-500">{c.whatsappNumber}</td>
                                  <td className="py-2.5 px-4">
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${c.clientType === 'new' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                      {CLIENT_TYPE_LABEL[c.clientType]}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-4 text-gray-400 text-right">{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '-'}</td>
                                  <td className="py-2.5 px-4 text-right">
                                    {reassigningClientId === c.id ? (
                                      <select
                                        autoFocus
                                        defaultValue=""
                                        onChange={(e) => handleReassign(c.id, e.target.value)}
                                        onBlur={() => setReassigningClientId(null)}
                                        className="text-xs border border-ticano-red rounded-lg px-2 py-1.5 bg-white dark:bg-gray-800 dark:text-white focus:outline-none"
                                      >
                                        <option value="" disabled>Move to PM…</option>
                                        {pmOptions.filter((p) => p.name !== c.assignedPmName).map((p) => (
                                          <option key={p.id} value={p.id}>{p.name}{p.branch ? ` (${p.branch})` : ''}</option>
                                        ))}
                                      </select>
                                    ) : (
                                      <button onClick={() => setReassigningClientId(c.id)} className="text-xs font-semibold text-ticano-red hover:text-ticano-red-dark hover:underline">
                                        Change PM
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
          );
        })()}

        {activeTab === 'Clients' && subView === 'Branch Changes' && <BranchChangesTab />}

        {/* ---------- STAFF PERFORMANCE ---------- */}
        {activeTab === 'Analytics' && subView === 'Staff Performance' && (
          <Card title="Staff Performance" subtitle="All branches">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    {['Staff', 'Avg Rating', 'Interactions', 'Feedback', 'Resolved Complaints', 'Open Complaints'].map((h) => (
                      <th key={h} className="text-left py-3 px-2 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {staff.map((s) => (
                    <tr key={s.staffId} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-3 px-2 font-medium text-gray-800 dark:text-white">{s.name}</td>
                      <td className="py-3 px-2 text-gray-600 dark:text-gray-300">{s.avgRating}</td>
                      <td className="py-3 px-2 text-gray-600 dark:text-gray-300">{s.totalInteractions}</td>
                      <td className="py-3 px-2 text-gray-600 dark:text-gray-300">{s.feedbackCount}</td>
                      <td className="py-3 px-2 text-gray-600 dark:text-gray-300">{s.resolvedComplaints}</td>
                      <td className="py-3 px-2"><span className={s.openComplaints > 4 ? 'text-red-600 font-semibold' : 'text-gray-600 dark:text-gray-300'}>{s.openComplaints}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* ---------- ANALYTICS ---------- */}
        {activeTab === 'Analytics' && subView === 'Complaint Analytics' && complaintAnalytics && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Total Complaints" value={complaintAnalytics.total} color="navy" />
              <StatCard title="Open" value={complaintAnalytics.open} color="red" />
              <StatCard title="Escalation Rate" value={formatPercent(complaintAnalytics.escalationRate)} color="gold" />
              <StatCard title="Avg Resolution" value={`${complaintAnalytics.avgResolutionHours}h`} color="teal" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card title="By complaint category">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={complaintAnalytics.byCategory} layout="vertical" margin={{ left: 90 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis type="number" /><YAxis type="category" dataKey="category" width={130} tick={{ fontSize: 11 }} /><Tooltip />
                    <Bar dataKey="count" fill={RED} radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
              <Card title="By customer journey stage">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={complaintAnalytics.byStage.map((s) => ({ name: JOURNEY_STAGE_LABEL[s.stage] || s.stage, value: s.count }))}
                         cx="50%" cy="50%" outerRadius={90} dataKey="value" label>
                      {complaintAnalytics.byStage.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip /><Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
              <Card title="By Portfolio Manager">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={complaintAnalytics.byPm}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="pm" tick={{ fontSize: 10 }} /><YAxis /><Tooltip />
                    <Bar dataKey="count" fill={GRAY} radius={[6, 6, 0, 0]} name="Complaints" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
              <Card title="New vs Existing client complaints">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={[
                    { type: 'New', count: complaintAnalytics.newClientComplaints },
                    { type: 'Existing', count: complaintAnalytics.existingClientComplaints },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="type" /><YAxis /><Tooltip />
                    <Bar dataKey="count" fill={RED} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>
          </div>
        )}
        {activeTab === 'Applications' && (
          <div className="bg-white dark:bg-ticano-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <h3 className="font-bold text-ticano-charcoal dark:text-white text-lg mb-1">Job Applications</h3>
            <p className="text-sm text-gray-500 mb-4">Review CVs submitted via the Careers page and update application status</p>
            <JobApplicationsModule />
          </div>
        )}

        {activeTab === 'Analytics' && subView === 'Charts' && (
          <div className="bg-white dark:bg-ticano-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <h3 className="font-bold text-ticano-charcoal dark:text-white text-lg mb-1">Organisation Analytics</h3>
            <p className="text-sm text-gray-500 mb-5">Interactive charts across all branches</p>
            <AdvancedCharts />
          </div>
        )}

        {activeTab === 'Communications' && subView === 'WhatsApp' && (
          <div className="bg-white dark:bg-ticano-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <h3 className="font-bold text-ticano-charcoal dark:text-white text-lg mb-1">WhatsApp Messages</h3>
            <p className="text-sm text-gray-500 mb-5">Send WhatsApp messages using templates</p>
            <WhatsAppSimulator />
          </div>
        )}

        {activeTab === 'Communications' && subView === 'Email' && (
          <div className="bg-white dark:bg-ticano-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <h3 className="font-bold text-ticano-charcoal dark:text-white text-lg mb-1">Email Notifications</h3>
            <p className="text-sm text-gray-500 mb-5">Send branded emails to clients</p>
            <EmailNotifications />
          </div>
        )}

        {activeTab === 'Analytics' && subView === 'Reports' && (
          <div className="bg-white dark:bg-ticano-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <h3 className="font-bold text-ticano-charcoal dark:text-white text-lg mb-1">Reports</h3>
            <p className="text-sm text-gray-500 mb-5">Generate and download branded performance reports across all branches</p>
            <PDFReportGenerator allBranches availableTypes={['complaints_summary','branch_performance','sla_breach','staff_performance']} />
          </div>
        )}

        </WidgetBoundary>
      </div>

      {/* Escalation detail modal */}
      <EscalationDetailModal
        complaint={selectedEscalation}
        onClose={() => setSelectedEscalation(null)}
        currentUser={{ role: user?.role, name: user?.name }}
        onReturned={() => getComplaints().then(({ data }) => setComplaints(data || [])).catch(() => {})}
      />
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <p className="text-2xl font-bold text-ticano-charcoal dark:text-white">{value}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
    </div>
  );
}

// Aging Dashboard (§9)
function QueueStatsCard() {
  const [stats, setStats] = useState(null);
  const [loadError, setLoadError] = useState(null);

  const load = () => {
    getQueueStats()
      .then(({ data }) => { setStats(data); setLoadError(null); })
      .catch((err) => { console.error('[QueueStatsCard]', err); setLoadError(err?.message || 'Could not load queue stats'); });
  };
  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  const fmtWait = (mins) => {
    if (mins == null) return ', ';
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  if (loadError) return <Card title="Complaint Queue"><p className="text-sm text-red-500 text-center py-4">{loadError}</p></Card>;
  if (!stats) return <Card title="Complaint Queue"><LoadingSpinner /></Card>;

  return (
    <Card title="Complaint Queue" subtitle="Live, updates automatically as complaints are submitted, assigned, or resolved">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-gray-400">Total Waiting</p>
          <p className="text-2xl font-bold text-ticano-charcoal dark:text-white">{stats.totalWaiting}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-gray-400">Urgent</p>
          <p className="text-2xl font-bold text-red-600">{stats.byPriority.urgent}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-gray-400">High</p>
          <p className="text-2xl font-bold text-orange-600">{stats.byPriority.high}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-gray-400">Medium</p>
          <p className="text-2xl font-bold text-amber-600">{stats.byPriority.medium}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-gray-400">Low</p>
          <p className="text-2xl font-bold text-gray-500">{stats.byPriority.low}</p>
        </div>
      </div>
      {stats.longestWaiting && (
        <p className="text-xs text-gray-500 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          Longest waiting: <span className="font-semibold text-gray-700 dark:text-gray-300">{stats.longestWaiting.ticket}</span>, {fmtWait(stats.longestWaiting.minutes)}
        </p>
      )}
    </Card>
  );
}

function AgingTab() {
  const [data, setData] = useState(null);
  useEffect(() => { getAgingDashboard({}).then(({ data }) => setData(data)).catch(() => setData({ totalOpen: 0, buckets: [], slaBreaches: [] })); }, []);
  if (!data) return <LoadingSpinner />;

  const RISK_COLOR = { ok: 'bg-green-100 text-green-800', low: 'bg-blue-100 text-blue-800', medium: 'bg-yellow-100 text-yellow-800', high: 'bg-orange-100 text-orange-800', critical: 'bg-red-100 text-red-800' };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard title="Total Open" value={data.totalOpen} icon={Clock} color="navy" />
        <StatCard title="SLA Breaches" value={data.slaBreaches} icon={AlertTriangle} color="red" />
        <StatCard title="Buckets" value={data.buckets.length} subtitle="age categories" color="teal" />
      </div>

      <Card title="Complaint aging buckets" subtitle="Distribution of currently-open complaints by days open">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {data.buckets.map((b) => (
            <div key={b.key} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">{b.label}</p>
              <p className="text-3xl font-bold text-ticano-charcoal dark:text-white">{b.count}</p>
              <span className={`text-xs px-2 py-0.5 rounded mt-2 inline-block ${RISK_COLOR[b.slaRisk] || ''}`}>{b.slaRisk}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card title="SLA breaches" subtitle={`Complaints open more than 14 days (${data.slaBreachList.length})`}>
        {data.slaBreachList.length === 0 ? (
          <p className="text-sm text-gray-500">No SLA breaches.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-200 dark:border-gray-700">
                {['Ticket', 'Branch', 'Customer', 'PM', 'Days Open', 'Severity'].map((h) => (
                  <th key={h} className="text-left py-2 px-2 text-gray-500 text-xs uppercase">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {data.slaBreachList.map((c) => (
                  <tr key={c.ticket} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-2 px-2 font-mono text-ticano-red font-semibold">{c.ticket}</td>
                    <td className="py-2 px-2">{c.branch}</td>
                    <td className="py-2 px-2">{c.customer}</td>
                    <td className="py-2 px-2">{c.assignedPmName || '-'}</td>
                    <td className="py-2 px-2 font-semibold text-orange-700">{c.daysOpen}</td>
                    <td className="py-2 px-2"><Badge status={c.severity} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

// Improvement Feedback Dashboard (§3)
function BranchChangesTab() {
  const [requests, setRequests] = useState(null);
  const [deciding, setDeciding] = useState(null);
  const [note, setNote] = useState('');

  const load = () => {
    getBranchChangeRequests().then(({ data }) => setRequests(data)).catch((err) => { console.error('[BranchChangesTab]', err); setRequests([]); });
  };
  useEffect(load, []);

  // Live sync: a new request shows up the instant a client submits one.
  useEffect(() => {
    const unsubscribe = subscribeToTable('branch_change_requests', {}, load);
    return unsubscribe;
  }, []);

  if (!requests) return <LoadingSpinner />;

  const pending = requests.filter((r) => r.status === 'pending');
  const decided = requests.filter((r) => r.status !== 'pending');

  const decide = async (id, approve) => {
    try {
      const { data } = await decideBranchChangeRequest(id, approve, note.trim() || null);
      toast.success(data.message);
      setDeciding(null);
      setNote('');
      load();
    } catch (err) {
      toast.error(err?.message || 'Could not process this request');
    }
  };

  return (
    <div className="space-y-6">
      <Card title={`Pending Requests (${pending.length})`} subtitle="Clients asking to move their servicing branch">
        {pending.length === 0 ? (
          <EmptyState title="No pending requests" icon={MapPin} />
        ) : (
          <div className="space-y-3">
            {pending.map((r) => (
              <div key={r.id} className="border border-amber-200 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-900/10 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <p className="font-semibold text-gray-800 dark:text-white text-sm">{r.customerName}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">{r.currentBranch || '-'} → <span className="font-semibold">{r.requestedBranch}</span></p>
                    {r.reason && <p className="text-xs text-gray-500 mt-1 italic">"{r.reason}"</p>}
                    <p className="text-xs text-gray-400 mt-1">Requested {new Date(r.requestedAt).toLocaleDateString()}</p>
                  </div>
                  {deciding !== r.id ? (
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => setDeciding(r.id)} className="px-3 py-2 bg-ticano-red text-white rounded-lg text-xs font-semibold hover:bg-ticano-red-dark">Review</button>
                    </div>
                  ) : null}
                </div>
                {deciding === r.id && (
                  <div className="mt-3 pt-3 border-t border-amber-200 dark:border-amber-800 space-y-2">
                    <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note to the client…"
                      className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 dark:text-white resize-none" />
                    <div className="flex justify-end gap-2">
                      <button onClick={() => { setDeciding(null); setNote(''); }} className="px-3 py-1.5 text-xs rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700">Cancel</button>
                      <button onClick={() => decide(r.id, false)} className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-100 dark:bg-red-900/20">Reject</button>
                      <button onClick={() => decide(r.id, true)} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700">Approve</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="History" subtitle="Past branch change decisions">
        {decided.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No decisions made yet.</p>
        ) : (
          <div className="space-y-2">
            {decided.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 text-sm py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                <div>
                  <p className="text-gray-700 dark:text-gray-200">{r.customerName}: {r.currentBranch || '-'} → {r.requestedBranch}</p>
                  <p className="text-xs text-gray-400">{r.decidedBy} · {r.decidedAt ? new Date(r.decidedAt).toLocaleDateString() : ''}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold shrink-0 ${r.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                  {r.status === 'approved' ? 'Approved' : 'Rejected'}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function ImprovementFeedbackTab() {
  const [summary, setSummary] = useState(null);
  const [items, setItems] = useState([]);
  const load = () => {
    getImprovementFeedbackSummary().then(({ data }) => setSummary(data)).catch((err) => { console.error('[ImprovementFeedbackTab]', err); setSummary({ total: 0, byCategory: [], recent: [] }); });
    getImprovementFeedback({}).then(({ data }) => setItems(data)).catch(() => setItems([]));
  };
  useEffect(load, []);

  // Live sync: a new suggestion (see migration 015's notification
  // trigger) appears here the moment it's submitted, no refresh needed.
  useEffect(() => {
    const unsubscribe = subscribeToTable('improvement_feedback', {}, load);
    return unsubscribe;
  }, []);
  if (!summary) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard title="Total Suggestions" value={summary.total} icon={Lightbulb} color="gold" />
        <StatCard title="Categories" value={summary.byCategory.length} icon={Activity} color="navy" />
        <StatCard title="This Month" value={summary.recent.length} icon={TrendingUp} color="teal" />
      </div>

      <Card title="By category">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {summary.byCategory.map((c) => (
            <div key={c.category} className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 text-center border border-yellow-200 dark:border-yellow-700/30">
              <p className="text-xs text-yellow-800 dark:text-yellow-300 mb-1">{c.category}</p>
              <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-200">{c.count}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Recent suggestions" subtitle="Customer ideas, NOT routed to the complaint queue">
        <div className="space-y-3">
          {items.map((f) => (
            <div key={f.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">{f.category}</span>
                <span className="text-xs text-gray-400">{new Date(f.at).toLocaleDateString()}</span>
              </div>
              <p className="text-sm text-gray-800 dark:text-gray-200 mt-1">{f.text}</p>
              <p className="text-xs text-gray-500 mt-1">, {f.author}{f.branch ? ` · ${f.branch}` : ''}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
