import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Users, AlertTriangle, TrendingUp, Activity, UserCheck, Send, ShieldAlert, ArrowUpRightSquare, UserPlus2, Lightbulb, Clock, BookOpen, BarChart3 } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import Navbar from '../components/common/Navbar';
import { StatCard, Badge, LoadingSpinner, Card, EmptyState, AnalyticsLauncher, AnalyticsBackBar } from '../components/common/UI';
import LeadsModule from '../components/common/LeadsModule';
import ReviewLinkSender from '../components/common/ReviewLinkSender';
import ComplaintsModule from '../components/common/ComplaintsModule';
import KnowledgeBase from '../components/common/KnowledgeBase';
import EscalationDetailModal from '../components/common/EscalationDetailModal';
import {
  getUnassignedCustomers, assignCustomer, autoAssignCustomers,
  getStaffPerformance, getPmWorkload, getComplaints, getActiveClientAnalytics, getComplaintAnalytics,
  getAgingDashboard, getImprovementFeedback, getImprovementFeedbackSummary,
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import JobApplicationsModule from '../components/common/JobApplicationsModule';
import ReportsModule from '../components/common/ReportsModule';
import PDFReportGenerator from '../components/common/PDFReportGenerator';
import AdvancedCharts from '../components/common/AdvancedCharts';
import WhatsAppSimulator from '../components/common/WhatsAppSimulator';
import BranchLeaderboard from '../components/common/BranchLeaderboard';
import EmailNotifications from '../components/common/EmailNotifications';
import AnnouncementBanner from '../components/common/AnnouncementBanner';
import { formatPercent, formatDate, formatDateTime } from '../utils/format';
import { CLIENT_TYPE_LABEL, JOURNEY_STAGE_LABEL, complaintStatusLabel, OPEN_COMPLAINT_STATUSES } from '../utils/constants';
import toast from 'react-hot-toast';

const TABS = ['Overview', 'Complaints', 'Aging', 'Escalations', 'Improvement Feedback', 'Knowledge Base', 'Leads', 'Applications', 'Unassigned', 'Analytics', 'Reports', 'WhatsApp', 'Email'];
// Analytics views consolidated under the single "Analytics" tab.
const SM_ANALYTICS_VIEWS = [
  { id: 'Active Clients',     label: 'Active Clients',     desc: 'New vs existing client mix & retention', icon: UserPlus2,   accent: 'red' },
  { id: 'Staff Performance',  label: 'Staff Performance',  desc: 'Ratings and workload across staff',      icon: UserCheck,   accent: 'navy' },
  { id: 'Complaint Analytics',label: 'Complaint Analytics',desc: 'Complaints by category, PM and stage',   icon: ShieldAlert, accent: 'red' },
  { id: 'Charts',             label: 'Advanced Charts',    desc: 'Interactive charts across all branches', icon: BarChart3,   accent: 'navy' },
];
const SM_ANALYTICS_IDS = SM_ANALYTICS_VIEWS.map((v) => v.id);
const RED = '#CE313C';
const GRAY = '#808686';
const COLORS = ['#CE313C', '#808686', '#a6abab', '#373435', '#a8252f'];

export default function ServiceManagerDashboard() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('Overview');
  const [analyticsView, setAnalyticsView] = useState(null);

  // Deep-link support: ?tab=Complaints (from notifications) selects that tab,
  // and analytics targets (e.g. ?tab=Staff Performance) open the Analytics hub.
  useEffect(() => {
    const t = searchParams.get('tab');
    if (!t) return;
    if (TABS.includes(t)) { setActiveTab(t); setAnalyticsView(null); }
    else if (SM_ANALYTICS_IDS.includes(t)) { setActiveTab('Analytics'); setAnalyticsView(t); }
  }, [searchParams]);
  const [unassigned, setUnassigned] = useState([]);
  const [staff, setStaff] = useState([]);
  const [workload, setWorkload] = useState([]);
  const [loading, setLoading] = useState(true);
  const [complaints, setComplaints] = useState([]);
  const [activeClients, setActiveClients] = useState(null);
  const [complaintAnalytics, setComplaintAnalytics] = useState(null);
  const [showReviewSender, setShowReviewSender] = useState(false);
  const [selectedEscalation, setSelectedEscalation] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [u, s, w, c, ac, ca] = await Promise.all([
          getUnassignedCustomers(), getStaffPerformance(), getPmWorkload(),
          getComplaints(), getActiveClientAnalytics(), getComplaintAnalytics(),
        ]);
        setUnassigned(u.data || []); setStaff(s.data || []); setWorkload(w.data || []);
        setComplaints(c.data || []);
        setActiveClients(ac.data); setComplaintAnalytics(ca.data);
      } catch {}
      finally { setLoading(false); }
    })();
  }, []);

  const handleAutoAssign = async () => {
    try {
      const { data } = await autoAssignCustomers();
      toast.success(data.message || 'Customers auto-assigned');
      setUnassigned([]);
    } catch { toast.error('Auto-assign failed'); }
  };

  const handleAssign = async (customerId) => {
    try {
      await assignCustomer({ customerId });
      toast.success('Customer assigned');
      setUnassigned((p) => p.filter((c) => c.id !== customerId));
    } catch { toast.error('Assignment failed'); }
  };

  if (loading) return <div className="min-h-screen bg-ticano-bg-light dark:bg-ticano-dark-bg"><Navbar title="Service Manager" /><LoadingSpinner /></div>;

  const openCount = complaints.filter((c) => OPEN_COMPLAINT_STATUSES.includes(c.status)).length;
  const escalations = complaints.filter((c) => c.status === 'escalated' || c.escalation);

  // Merge new/existing trends into a single series for the chart
  const mixTrend = activeClients?.newClientsTrend?.map((row, i) => ({
    month: row.month,
    'New clients': row.count,
    'Existing clients': activeClients.existingClientsTrend[i]?.count || 0,
  })) || [];

  return (
    <div className="min-h-screen bg-ticano-bg-light dark:bg-ticano-dark-bg">
      <Navbar title="Service Manager — All Branches" />
      <div className="max-w-7xl mx-auto px-4 py-6">

        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h1 className="text-xl font-bold text-ticano-charcoal dark:text-white">All Branches</h1>
          <button onClick={() => setShowReviewSender(true)} className="flex items-center gap-2 px-4 py-2 bg-ticano-red text-white rounded-lg text-sm font-medium hover:bg-ticano-red-dark">
            <Send size={16} /> Send Review Link
          </button>
        </div>
        <ReviewLinkSender open={showReviewSender} onClose={() => setShowReviewSender(false)} />

        <AnnouncementBanner />

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {TABS.map((t) => (
            <button key={t} onClick={() => { setActiveTab(t); setAnalyticsView(null); }}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors
                ${activeTab === t ? 'bg-ticano-charcoal text-white' : 'bg-white dark:bg-ticano-dark-card text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
              {t}
            </button>
          ))}
        </div>

        {/* ---------- ANALYTICS HUB ---------- */}
        {activeTab === 'Analytics' && !analyticsView && (
          <AnalyticsLauncher
            views={SM_ANALYTICS_VIEWS}
            onSelect={setAnalyticsView}
            subtitle="Branch and staff analytics, grouped in one place. Pick a view to explore."
          />
        )}
        {activeTab === 'Analytics' && analyticsView && (
          <AnalyticsBackBar view={SM_ANALYTICS_VIEWS.find((v) => v.id === analyticsView)} onBack={() => setAnalyticsView(null)} />
        )}

        {/* ---------- OVERVIEW ---------- */}
        {activeTab === 'Overview' && (
          <>
          <div className="mb-5"><BranchLeaderboard /></div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Today's Interactions" value="18" icon={Activity} color="navy" />
              <StatCard title="Avg Rating This Week" value="4.3" subtitle="out of 5.0" icon={TrendingUp} color="teal" />
              <StatCard title="Open Complaints" value={openCount} icon={ShieldAlert} color="red" />
              <StatCard title="Escalations" value={escalations.length} icon={ArrowUpRightSquare} color={escalations.length ? 'gold' : 'white'} />
            </div>

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
        {activeTab === 'Complaints' && (
          <ComplaintsModule
            scope="all"
            currentUser={{ id: user?.id, name: user?.name }}
            canAssign={true}
            canEscalate={true}
            canResolve={true}
            canClose={true}
            showInternalNotes={true}
          />
        )}

        {/* ---------- AGING DASHBOARD (§9) ---------- */}
        {activeTab === 'Aging' && <AgingTab />}

        {/* ---------- IMPROVEMENT FEEDBACK (§3) ---------- */}
        {activeTab === 'Improvement Feedback' && <ImprovementFeedbackTab />}

        {/* ---------- KNOWLEDGE BASE (§8) ---------- */}
        {activeTab === 'Knowledge Base' && <KnowledgeBase editable={false} currentUser={user} />}

        {/* ---------- ESCALATIONS ---------- */}
        {activeTab === 'Escalations' && (
          <Card title="Escalations" subtitle="Complaints escalated by Portfolio Managers — Director also notified">
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
        {activeTab === 'Analytics' && analyticsView === 'Active Clients' && activeClients && (
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
        {activeTab === 'Leads' && <LeadsModule />}

        {/* ---------- UNASSIGNED CUSTOMERS ---------- */}
        {activeTab === 'Unassigned' && (
          <Card
            title={`Unassigned Customers (${unassigned.length})`}
            subtitle="Customers awaiting PM assignment"
            actions={
              <button onClick={handleAutoAssign}
                className="flex items-center gap-2 px-4 py-2 bg-ticano-red text-white rounded-xl text-sm font-medium hover:bg-ticano-red-dark">
                <UserCheck size={16} /> Auto-Assign All
              </button>
            }
          >
            {/* PM workload preview */}
            {workload.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                {workload.map((pm) => (
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
            {unassigned.length === 0 ? (
              <EmptyState title="All customers assigned" icon={Users} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      {['Name', 'WhatsApp', 'Branch', 'Client Type', 'Joined', 'Actions'].map((h) => (
                        <th key={h} className="text-left py-3 px-2 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {unassigned.map((c) => (
                      <tr key={c.id} className="border-b border-gray-100 dark:border-gray-800">
                        <td className="py-3 px-2 font-medium text-gray-800 dark:text-white">{c.name}</td>
                        <td className="py-3 px-2 text-gray-500">{c.whatsappNumber}</td>
                        <td className="py-3 px-2 text-gray-500">{c.preferredBranch}</td>
                        <td className="py-3 px-2"><span className={`text-xs px-2 py-0.5 rounded-full ${c.clientType === 'new' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{CLIENT_TYPE_LABEL[c.clientType]}</span></td>
                        <td className="py-3 px-2 text-gray-400">{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '-'}</td>
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
        )}

        {/* ---------- STAFF PERFORMANCE ---------- */}
        {activeTab === 'Analytics' && analyticsView === 'Staff Performance' && (
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
        {activeTab === 'Analytics' && analyticsView === 'Complaint Analytics' && complaintAnalytics && (
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

        {activeTab === 'Analytics' && analyticsView === 'Charts' && (
          <div className="bg-white dark:bg-ticano-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <h3 className="font-bold text-ticano-charcoal dark:text-white text-lg mb-1">Organisation Analytics</h3>
            <p className="text-sm text-gray-500 mb-5">Interactive charts across all branches</p>
            <AdvancedCharts />
          </div>
        )}

        {activeTab === 'WhatsApp' && (
          <div className="bg-white dark:bg-ticano-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <h3 className="font-bold text-ticano-charcoal dark:text-white text-lg mb-1">WhatsApp Messages</h3>
            <p className="text-sm text-gray-500 mb-5">Send WhatsApp messages using templates</p>
            <WhatsAppSimulator />
          </div>
        )}

        {activeTab === 'Email' && (
          <div className="bg-white dark:bg-ticano-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <h3 className="font-bold text-ticano-charcoal dark:text-white text-lg mb-1">Email Notifications</h3>
            <p className="text-sm text-gray-500 mb-5">Send branded emails to clients</p>
            <EmailNotifications />
          </div>
        )}

        {activeTab === 'Reports' && (
          <div className="bg-white dark:bg-ticano-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <h3 className="font-bold text-ticano-charcoal dark:text-white text-lg mb-1">Reports</h3>
            <p className="text-sm text-gray-500 mb-5">Generate and download branded performance reports across all branches</p>
            <PDFReportGenerator allBranches availableTypes={['complaints_summary','branch_performance','sla_breach','staff_performance']} />
          </div>
        )}

      </div>

      {/* Escalation detail modal */}
      <EscalationDetailModal complaint={selectedEscalation} onClose={() => setSelectedEscalation(null)} />
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

// ---------------------------------------------------------------------
//  Aging Dashboard (§9)
// ---------------------------------------------------------------------
function AgingTab() {
  const [data, setData] = useState(null);
  useEffect(() => { getAgingDashboard({}).then(({ data }) => setData(data)); }, []);
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
                    <td className="py-2 px-2">{c.assignedPmName || '—'}</td>
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

// ---------------------------------------------------------------------
//  Improvement Feedback Dashboard (§3)
// ---------------------------------------------------------------------
function ImprovementFeedbackTab() {
  const [summary, setSummary] = useState(null);
  const [items, setItems] = useState([]);
  useEffect(() => {
    getImprovementFeedbackSummary().then(({ data }) => setSummary(data));
    getImprovementFeedback({}).then(({ data }) => setItems(data));
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

      <Card title="Recent suggestions" subtitle="Customer ideas — NOT routed to the complaint queue">
        <div className="space-y-3">
          {items.map((f) => (
            <div key={f.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">{f.category}</span>
                <span className="text-xs text-gray-400">{new Date(f.at).toLocaleDateString()}</span>
              </div>
              <p className="text-sm text-gray-800 dark:text-gray-200 mt-1">{f.text}</p>
              <p className="text-xs text-gray-500 mt-1">— {f.author}{f.branch ? ` · ${f.branch}` : ''}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
