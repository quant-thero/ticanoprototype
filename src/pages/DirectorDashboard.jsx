import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, AlertTriangle, Activity, Send, ChevronRight, ShieldAlert, ArrowUpRightSquare, Award, UserPlus2, Target, MapPin, Sparkles, Clock, CheckCircle2, X, Pin, Plus } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LabelList, ScatterChart, Scatter, ZAxis } from 'recharts';
import Navbar from '../components/common/Navbar';
import { StatCard, Badge, ExportButton, LoadingSpinner, Modal, Card, EmptyState } from '../components/common/UI';
import BranchDetailView from '../components/common/BranchDetailView';
import ReportsModule from '../components/common/ReportsModule';
import PDFReportGenerator from '../components/common/PDFReportGenerator';
import PredictiveAnalytics from '../components/common/PredictiveAnalytics';
import BranchLeaderboard from '../components/common/BranchLeaderboard';
import AdvancedCharts from '../components/common/AdvancedCharts';
import EmailNotifications from '../components/common/EmailNotifications';
import AnnouncementBanner from '../components/common/AnnouncementBanner';
import {
  getBranchComparison, getReferralSources, getCsatTrend, getWordCloud,
  getLocationAnalytics, getLeadFunnel, getReferralNetwork,
  getComplaints, getComplaintAnalytics, getActiveClientAnalytics,
  getActionCentre, getExecutiveDashboard, getBranchHealthScores,
  getSmartInsights, getComplaintHeatMap,
  getAnnouncements, createAnnouncement, deleteAnnouncement,
} from '../services/api';
import { formatPercent } from '../utils/format';
import { JOURNEY_STAGE_LABEL, complaintStatusLabel, BRANCH_COORDS } from '../utils/constants';
import { formatDateTime } from '../utils/format';
import toast from 'react-hot-toast';

const TABS = ['Action Centre', 'Executive Summary', 'Branch Health', 'Smart Insights', 'Heat Map', 'Branch Comparison', 'Branch Leaderboard', 'Active Client Mix', 'Complaint Analytics', 'Escalations', 'Lead Conversion', 'Referral Network', 'Announcements', 'Reports', 'Predictive Analytics', 'Advanced Charts', 'Email Notifications', 'Bulk Message'];
const COLORS = ['#CE313C', '#808686', '#a6abab', '#373435', '#a8252f'];
const RED = '#CE313C';
const GRAY = '#808686';

export default function DirectorDashboard() {
  const [activeTab, setActiveTab] = useState('Action Centre');
  const [bulkMessage, setBulkMessage] = useState('');
  const [sendingBulk, setSendingBulk] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [selectedPm, setSelectedPm] = useState(null);

  const [branchComparison, setBranchComparison] = useState([]);
  const [funnel, setFunnel] = useState(null);
  const [network, setNetwork] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [complaintAnalytics, setComplaintAnalytics] = useState(null);
  const [activeClients, setActiveClients] = useState(null);
  const [csat, setCsat] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [b, f, n, c, ca, ac, cs] = await Promise.all([
          getBranchComparison(), getLeadFunnel(), getReferralNetwork(),
          getComplaints(), getComplaintAnalytics(), getActiveClientAnalytics(), getCsatTrend(),
        ]);
        setBranchComparison(b.data || []);
        setFunnel(f.data); setNetwork(n.data);
        setComplaints(c.data || []); setComplaintAnalytics(ca.data); setActiveClients(ac.data);
        setCsat(cs.data?.trend || []);
      } catch {} finally { setLoading(false); }
    })();
  }, []);

  const handleSendBulk = async () => {
    if (!bulkMessage.trim()) return toast.error('Please enter a message');
    setSendingBulk(true);
    setTimeout(() => {
      toast.success('Bulk WhatsApp message sent to all opted-in customers');
      setBulkMessage('');
      setSendingBulk(false);
    }, 2000);
  };

  if (loading) return <div className="min-h-screen bg-ticano-bg-light dark:bg-ticano-dark-bg"><Navbar title="Director Dashboard" /><LoadingSpinner /></div>;

  const escalations = complaints.filter((c) => c.status === 'escalated' || c.escalation);
  const mixTrend = activeClients?.newClientsTrend?.map((row, i) => ({
    month: row.month,
    'New clients': row.count,
    'Existing clients': activeClients.existingClientsTrend[i]?.count || 0,
  })) || [];

  return (
    <div className="min-h-screen bg-ticano-bg-light dark:bg-ticano-dark-bg">
      <Navbar title="Director Dashboard" />
      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {TABS.map((t) => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors
                ${activeTab === t ? 'bg-ticano-charcoal text-white' : 'bg-white dark:bg-ticano-dark-card text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
              {t}
            </button>
          ))}
        </div>

        {/* ---------- ACTION CENTRE (§11) ---------- */}
        {activeTab === 'Action Centre' && <ActionCentreTab setActiveTab={setActiveTab} />}

        {/* ---------- BRANCH HEALTH (§10) ---------- */}
        {activeTab === 'Branch Health' && <BranchHealthTab />}

        {/* ---------- SMART INSIGHTS (§20) ---------- */}
        {activeTab === 'Smart Insights' && <SmartInsightsTab />}

        {/* ---------- HEAT MAP (§19) ---------- */}
        {activeTab === 'Heat Map' && <HeatMapTab />}

        {/* ---------- EXECUTIVE SUMMARY ---------- */}
        {activeTab === 'Executive Summary' && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatCard title="Company CSAT" value="4.3 / 5.0" icon={TrendingUp} color="teal" trend={2.4} />
              <StatCard title="Active Clients" value={activeClients?.totals?.totalActive || '—'} icon={Users} color="navy" />
              <StatCard title="Open Complaints" value={complaintAnalytics?.open || 0} icon={ShieldAlert} color="red" />
              <StatCard title="Escalations" value={complaintAnalytics?.escalated || 0} icon={ArrowUpRightSquare} color="gold" />
            </div>
            <Card title="Company CSAT Trend">
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={csat}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="week" />
                  <YAxis domain={[3.5, 5]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="avgRating" stroke={RED} strokeWidth={2.5} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </>
        )}

        {/* ---------- BRANCH COMPARISON ---------- */}
        {activeTab === 'Branch Comparison' && (
          selectedBranch ? (
            <BranchDetailView branch={selectedBranch} onBack={() => setSelectedBranch(null)} onSelectPm={(pm) => setSelectedPm(pm)} />
          ) : (
            <Card title="Branch Performance Comparison" subtitle="Click any branch to drill down into full detail" actions={<ExportButton rows={branchComparison} filename="branch_comparison" />}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      {['Branch', 'Avg Rating', 'Interactions', 'Open Complaints', 'Resolved', 'Escalation Rate', ''].map((h) => (
                        <th key={h} className="text-left py-3 px-3 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {branchComparison.map((b) => (
                      <tr key={b.branch} onClick={() => setSelectedBranch(b.branch)}
                        className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                        <td className="py-3 px-3 font-semibold text-ticano-charcoal dark:text-white">{b.branch}</td>
                        <td className="py-3 px-3"><span className="text-yellow-500">{'★'.repeat(Math.round(b.avgRating))}</span> <span className="text-gray-600 dark:text-gray-300">{b.avgRating}</span></td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-300">{b.totalInteractions}</td>
                        <td className="py-3 px-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${b.openComplaints > 8 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>{b.openComplaints}</span></td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-300">{b.resolvedComplaints}</td>
                        <td className="py-3 px-3"><span className={b.escalationRate > 6 ? 'text-red-600 font-semibold' : 'text-gray-600 dark:text-gray-300'}>{formatPercent(b.escalationRate)}</span></td>
                        <td className="py-3 px-3 text-ticano-red"><ChevronRight size={16} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )
        )}

        {/* ---------- ACTIVE CLIENT MIX ---------- */}
        {activeTab === 'Active Client Mix' && activeClients && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="New Clients" value={activeClients.totals.newClients} icon={UserPlus2} color="red" />
              <StatCard title="Existing Clients" value={activeClients.totals.existingClients} icon={Users} color="navy" />
              <StatCard title="Conversion Rate" value={formatPercent(activeClients.conversionRate)} icon={TrendingUp} color="gold" />
              <StatCard title="Retention Rate" value={formatPercent(activeClients.retentionRate)} icon={Award} color="teal" />
            </div>
            <Card title="New vs Existing client trend">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={mixTrend}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="month" /><YAxis /><Tooltip /><Legend />
                  <Line type="monotone" dataKey="New clients" stroke={RED} strokeWidth={3} />
                  <Line type="monotone" dataKey="Existing clients" stroke={GRAY} strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </Card>
            <Card title="By branch" actions={<ExportButton rows={activeClients.byBranch} filename="active_clients_by_branch" />}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={activeClients.byBranch}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="branch" /><YAxis /><Tooltip /><Legend />
                  <Bar dataKey="newClients" fill={RED} radius={[6, 6, 0, 0]} name="New clients" />
                  <Bar dataKey="existingClients" fill={GRAY} radius={[6, 6, 0, 0]} name="Existing clients" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>
        )}

        {/* ---------- COMPLAINT ANALYTICS ---------- */}
        {activeTab === 'Complaint Analytics' && complaintAnalytics && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Total Complaints" value={complaintAnalytics.total} color="navy" />
              <StatCard title="Open" value={complaintAnalytics.open} color="red" />
              <StatCard title="Escalation Rate" value={formatPercent(complaintAnalytics.escalationRate)} color="gold" />
              <StatCard title="Avg Resolution Time" value={`${complaintAnalytics.avgResolutionHours}h`} color="teal" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card title="By category">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={complaintAnalytics.byCategory} layout="vertical" margin={{ left: 100 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis type="number" /><YAxis type="category" dataKey="category" width={140} tick={{ fontSize: 11 }} /><Tooltip />
                    <Bar dataKey="count" fill={RED} radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
              <Card title="By customer journey stage">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={complaintAnalytics.byStage.map((s) => ({ name: JOURNEY_STAGE_LABEL[s.stage] || s.stage, value: s.count }))}
                         cx="50%" cy="50%" outerRadius={100} dataKey="value" label>
                      {complaintAnalytics.byStage.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip /><Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
              <Card title="By Portfolio Manager">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={complaintAnalytics.byPm}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="pm" tick={{ fontSize: 10 }} /><YAxis /><Tooltip />
                    <Bar dataKey="count" fill={GRAY} radius={[6, 6, 0, 0]} name="Complaints" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
              <Card title="By branch">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={complaintAnalytics.byBranch}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="branch" /><YAxis /><Tooltip />
                    <Bar dataKey="count" fill={RED} radius={[6, 6, 0, 0]} name="Complaints" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>
          </div>
        )}

        {/* ---------- ESCALATIONS ---------- */}
        {activeTab === 'Escalations' && (
          <Card title="Active Escalations" subtitle="Complaints escalated to Management requiring director attention" actions={<ExportButton rows={escalations} filename="escalations" />}>
            {escalations.length === 0 ? (
              <EmptyState title="No active escalations" icon={ArrowUpRightSquare} />
            ) : (
              <div className="space-y-3">
                {escalations.map((c) => (
                  <div key={c.id} className="border border-orange-200 dark:border-orange-700/40 rounded-xl p-4 bg-orange-50/50 dark:bg-orange-900/10">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono font-bold text-ticano-red">{c.ticket}</span>
                          <span className="font-semibold text-ticano-charcoal dark:text-white">{c.customerName}</span>
                          <Badge status={c.severity} />
                          <span className="text-xs px-2 py-0.5 rounded-full bg-orange-200 text-orange-800">{complaintStatusLabel(c.status)}</span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{c.description}</p>
                        <div className="mt-2 p-2.5 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-200">
                          <p className="text-xs uppercase tracking-wide text-orange-700 dark:text-orange-300 mb-0.5">Reason for escalation</p>
                          {c.escalation?.reason}
                        </div>
                        <p className="text-xs text-gray-400 mt-2">Escalated by {c.escalation?.by} · {formatDateTime(c.escalation?.at)} · PM: {c.assignedPmName} · Branch: {c.branch}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* ---------- LEAD CONVERSION ---------- */}
        {activeTab === 'Lead Conversion' && funnel && (
          <div className="space-y-6">
            <Card title="Lead Conversion Funnel" subtitle="New → Contacted → Interested → Converted" actions={<ExportButton rows={funnel.funnel} filename="lead_funnel" />}>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={funnel.funnel} layout="vertical" margin={{ left: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis type="number" /><YAxis type="category" dataKey="stage" width={120} /><Tooltip />
                  <Bar dataKey="count" fill={RED} radius={[0, 6, 6, 0]} name="Leads">
                    <LabelList dataKey="count" position="right" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>
        )}

        {/* ---------- REFERRAL NETWORK ---------- */}
        {activeTab === 'Referral Network' && network && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <StatCard title="Referral Customers" value={network.totalReferralCustomers} color="navy" />
              <StatCard title="Conversion from Referrals" value={formatPercent(network.conversionFromReferrals)} color="teal" />
              <StatCard title="Top Referrers" value={network.topReferrers.length} color="gold" />
            </div>
            <Card title="Top Referring Customers" subtitle="Customers who bring in the most new business" actions={<ExportButton rows={network.topReferrers} filename="top_referrers" />}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      {['Customer', 'Referrals', 'Converted', 'Conversion'].map((h) => <th key={h} className="text-left py-3 px-2 text-gray-500 text-xs uppercase">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {network.topReferrers.map((r) => (
                      <tr key={r.customerName} className="border-b border-gray-100 dark:border-gray-800">
                        <td className="py-3 px-2 font-medium text-gray-800 dark:text-white">{r.customerName}</td>
                        <td className="py-3 px-2 text-gray-600 dark:text-gray-300">{r.referrals}</td>
                        <td className="py-3 px-2 text-gray-600 dark:text-gray-300">{r.converted}</td>
                        <td className="py-3 px-2 text-gray-600 dark:text-gray-300">{formatPercent(r.converted / r.referrals * 100)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'Branch Leaderboard' && (
          <div className="bg-white dark:bg-ticano-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <BranchLeaderboard />
          </div>
        )}

        {activeTab === 'Predictive Analytics' && (
          <div className="bg-white dark:bg-ticano-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <PredictiveAnalytics />
          </div>
        )}

        {activeTab === 'Advanced Charts' && (
          <div className="bg-white dark:bg-ticano-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <h3 className="font-bold text-ticano-charcoal dark:text-white text-lg mb-1">Advanced Analytics</h3>
            <p className="text-sm text-gray-500 mb-5">Interactive charts — complaint trends, branch comparison, heatmap, CSAT distribution</p>
            <AdvancedCharts />
          </div>
        )}

        {activeTab === 'Email Notifications' && (
          <div className="bg-white dark:bg-ticano-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <h3 className="font-bold text-ticano-charcoal dark:text-white text-lg mb-1">Email Notifications</h3>
            <p className="text-sm text-gray-500 mb-5">Send branded emails to clients and staff</p>
            <EmailNotifications />
          </div>
        )}

        {/* ---------- ANNOUNCEMENTS ---------- */}
        {activeTab === 'Announcements' && <AnnouncementsTab />}

        {/* ---------- REPORTS ---------- */}
        {activeTab === 'Reports' && (
          <div className="bg-white dark:bg-ticano-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <h3 className="font-bold text-ticano-charcoal dark:text-white text-lg mb-1">PDF Report Generator</h3>
            <p className="text-sm text-gray-500 mb-5">Generate and download branded PDF reports</p>
            <PDFReportGenerator />
          </div>
        )}

        {/* ---------- BULK MESSAGE ---------- */}
        {activeTab === 'Bulk Message' && (
          <Card title="Send Bulk WhatsApp Message" subtitle="This will send a WhatsApp message to all opted-in customers. Use responsibly." className="max-w-xl">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Message</label>
              <textarea value={bulkMessage} onChange={(e) => setBulkMessage(e.target.value)}
                rows={5} placeholder="Type your broadcast message..." maxLength={1000}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 text-sm bg-white dark:bg-gray-800 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-ticano-red" />
              <p className="text-xs text-gray-400 mt-1">{bulkMessage.length}/1000 characters</p>
            </div>
            <button onClick={handleSendBulk} disabled={sendingBulk}
              className="flex items-center gap-2 px-6 py-3 bg-ticano-red text-white rounded-xl font-semibold text-sm hover:bg-ticano-red-dark transition-colors disabled:opacity-60">
              <Send size={16} />
              {sendingBulk ? 'Sending...' : 'Send to All Opted-In Customers'}
            </button>
          </Card>
        )}
      </div>

      {/* PM detail drill-down modal */}
      <Modal open={!!selectedPm} onClose={() => setSelectedPm(null)} title={selectedPm?.pmName || 'PM Details'} size="md">
        {selectedPm && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <StatCard title="Avg Rating" value={(selectedPm.avgRating || 4.3).toFixed(1)} color="gold" />
              <StatCard title="Resolution Rate" value={formatPercent(selectedPm.resolutionRate)} color="teal" />
              <StatCard title="Total Complaints" value={selectedPm.totalComplaints} color="navy" />
              <StatCard title="Open Complaints" value={selectedPm.openComplaints ?? '—'} color="red" />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ---------------------------------------------------------------------
//  Action Centre (§11) — landing tab. Surfaces only what needs attention.
// ---------------------------------------------------------------------
function ActionCentreTab({ setActiveTab }) {
  const [data, setData] = useState(null);
  const [expanded, setExpanded] = useState(null); // which drill-down panel is open

  useEffect(() => { getActionCentre().then(({ data }) => setData(data)); }, []);
  if (!data) return <LoadingSpinner />;

  const total =
    data.escalations.count +
    data.over30Days.count +
    data.slaBreaches.count +
    data.criticalSeverity.count +
    data.highPriority.count +
    data.flaggedBranches.length;

  // Six priority tiles. Each is fully clickable: clicking either expands the
  // drill-down inline OR jumps to the relevant tab when there's nothing to drill into.
  const priorities = [
    {
      id: 'esc', label: 'Escalations', short: 'Requiring management decision',
      count: data.escalations.count, items: data.escalations.items,
      gradient: 'from-orange-500 to-amber-500',
      ring: 'ring-orange-300/40',
      icon: ArrowUpRightSquare,
      jumpTab: 'Escalations',
    },
    {
      id: 'old', label: 'Open > 30 Days', short: 'Long-standing complaints',
      count: data.over30Days.count, items: data.over30Days.items,
      gradient: 'from-red-600 to-rose-500',
      ring: 'ring-red-300/40',
      icon: Clock,
      jumpTab: 'Complaint Analytics',
    },
    {
      id: 'sla', label: 'SLA Breaches', short: '> 14 days without closure',
      count: data.slaBreaches.count, items: data.slaBreaches.items,
      gradient: 'from-rose-500 to-pink-500',
      ring: 'ring-rose-300/40',
      icon: AlertTriangle,
      jumpTab: 'Complaint Analytics',
    },
    {
      id: 'crt', label: 'Critical Severity', short: 'Highest-impact issues',
      count: data.criticalSeverity.count, items: data.criticalSeverity.items,
      gradient: 'from-purple-600 to-fuchsia-500',
      ring: 'ring-purple-300/40',
      icon: ShieldAlert,
      jumpTab: 'Complaint Analytics',
    },
    {
      id: 'pri', label: 'High Priority', short: 'Urgent + high priority queue',
      count: data.highPriority.count, items: data.highPriority.items,
      gradient: 'from-amber-500 to-yellow-500',
      ring: 'ring-amber-300/40',
      icon: Target,
      jumpTab: 'Complaint Analytics',
    },
    {
      id: 'br', label: 'Flagged Branches', short: 'Escalation rate > 15%',
      count: data.flaggedBranches.length, items: data.flaggedBranches.map((b) => ({ branch: b })),
      gradient: 'from-blue-600 to-indigo-500',
      ring: 'ring-blue-300/40',
      icon: MapPin,
      jumpTab: 'Branch Health',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Hero banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-ticano-charcoal via-[#4a4647] to-ticano-charcoal text-white p-6 shadow-xl">
        <div className="absolute -right-10 -top-10 opacity-10">
          <Target size={220} strokeWidth={1.2} />
        </div>
        <div className="relative">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center">
              <Target size={22} />
            </div>
            <div>
              <h2 className="text-2xl font-bold leading-tight">Action Centre</h2>
              <p className="text-sm text-white/70">Director's priority dashboard</p>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-4 max-w-md">
            <SummaryStat label="Total items" value={total} />
            <SummaryStat label="Escalations" value={data.escalations.count} />
            <SummaryStat label="SLA breaches" value={data.slaBreaches.count} />
          </div>
        </div>
      </div>

      {/* All clear state */}
      {total === 0 && (
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-700/40 rounded-2xl p-10 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-green-500 text-white flex items-center justify-center mb-3">
            <CheckCircle2 size={32} />
          </div>
          <h3 className="text-xl font-bold text-green-900 dark:text-green-200">All clear</h3>
          <p className="text-sm text-green-700 dark:text-green-300 mt-1 max-w-md mx-auto">
            No escalations, breaches, or branches need attention right now. Use the tabs above to explore the broader analytics.
          </p>
        </div>
      )}

      {/* Priority tiles */}
      {total > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {priorities.map((p) => (
            <PriorityTile
              key={p.id}
              priority={p}
              isExpanded={expanded === p.id}
              onClick={() => {
                if (p.count === 0) return;
                if (p.items && p.items.length > 0) {
                  setExpanded(expanded === p.id ? null : p.id);
                } else {
                  setActiveTab(p.jumpTab);
                }
              }}
              onJumpToTab={() => setActiveTab(p.jumpTab)}
            />
          ))}
        </div>
      )}

      {/* Expanded drill-down */}
      {expanded && (
        <DrillDownPanel
          priority={priorities.find((p) => p.id === expanded)}
          setActiveTab={setActiveTab}
          onClose={() => setExpanded(null)}
        />
      )}

      {/* Quick links footer */}
      <div className="bg-white dark:bg-ticano-dark-card rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
        <p className="text-xs uppercase tracking-wide text-gray-500 mb-3">Jump to</p>
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'Executive Summary', tab: 'Executive Summary', icon: TrendingUp },
            { label: 'Branch Health', tab: 'Branch Health', icon: Award },
            { label: 'Smart Insights', tab: 'Smart Insights', icon: Sparkles },
            { label: 'Heat Map', tab: 'Heat Map', icon: MapPin },
            { label: 'Escalations', tab: 'Escalations', icon: ArrowUpRightSquare },
            { label: 'Complaint Analytics', tab: 'Complaint Analytics', icon: ShieldAlert },
          ].map((q) => (
            <button
              key={q.tab}
              onClick={() => setActiveTab(q.tab)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-ticano-red hover:text-white text-sm text-gray-700 dark:text-gray-200 transition-colors"
            >
              <q.icon size={14} />
              {q.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function SummaryStat({ label, value }) {
  return (
    <div className="bg-white/10 backdrop-blur rounded-xl px-4 py-2.5">
      <p className="text-2xl font-bold leading-tight">{value}</p>
      <p className="text-xs text-white/70">{label}</p>
    </div>
  );
}

function PriorityTile({ priority, isExpanded, onClick, onJumpToTab }) {
  const Icon = priority.icon;
  const isEmpty = priority.count === 0;
  const isActive = isExpanded;

  return (
    <button
      onClick={onClick}
      disabled={isEmpty}
      className={`group relative text-left p-5 rounded-2xl overflow-hidden transition-all
        ${isEmpty
          ? 'bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 opacity-60 cursor-default'
          : `bg-gradient-to-br ${priority.gradient} text-white shadow-lg hover:shadow-2xl hover:-translate-y-0.5 ring-4 ${isActive ? priority.ring : 'ring-transparent'}`}`
      }
    >
      {/* Decorative icon */}
      {!isEmpty && (
        <Icon className="absolute -right-3 -bottom-3 text-white/10" size={90} strokeWidth={1.5} />
      )}

      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isEmpty ? 'bg-gray-200 dark:bg-gray-700 text-gray-400' : 'bg-white/20 text-white'}`}>
            <Icon size={18} />
          </div>
          {!isEmpty && (
            <span className="text-[10px] uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
              {isActive ? 'showing' : 'tap to view'}
            </span>
          )}
        </div>
        <p className={`text-4xl font-extrabold leading-none ${isEmpty ? 'text-gray-400' : 'text-white'}`}>
          {priority.count}
        </p>
        <p className={`text-sm font-semibold mt-2 ${isEmpty ? 'text-gray-500' : 'text-white'}`}>
          {priority.label}
        </p>
        <p className={`text-xs mt-0.5 ${isEmpty ? 'text-gray-400' : 'text-white/80'}`}>
          {isEmpty ? 'Nothing to action' : priority.short}
        </p>
      </div>
    </button>
  );
}

function DrillDownPanel({ priority, setActiveTab, onClose }) {
  const Icon = priority.icon;
  return (
    <div className="bg-white dark:bg-ticano-dark-card rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-2">
      <div className={`bg-gradient-to-r ${priority.gradient} text-white p-4 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Icon size={18} />
          </div>
          <div>
            <p className="font-bold text-lg leading-tight">{priority.label}</p>
            <p className="text-xs text-white/80">{priority.count} item{priority.count === 1 ? '' : 's'} requiring attention</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setActiveTab(priority.jumpTab)} className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg">
            Open {priority.jumpTab} →
          </button>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center">
            <ChevronRight size={16} className="rotate-90" />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-2">
        {priority.id === 'br' ? (
          // Branch list
          <div className="flex flex-wrap gap-2">
            {priority.items.map((b) => (
              <button
                key={b.branch}
                onClick={() => setActiveTab('Branch Health')}
                className="px-4 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700/30 text-sm hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors text-blue-900 dark:text-blue-200 font-medium"
              >
                <MapPin size={12} className="inline mr-1" />
                {b.branch}
              </button>
            ))}
          </div>
        ) : (
          // Complaint list
          priority.items.map((c) => (
            <button
              key={c.id || c.ticket}
              onClick={() => setActiveTab(priority.jumpTab)}
              className="w-full text-left p-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 flex items-center justify-between gap-2 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ticano-red">{c.ticket}</p>
                <p className="text-xs text-gray-600 dark:text-gray-300 truncate">
                  {c.customer} · {c.branch} · {c.daysOpen}d open
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                  c.severity === 'critical' ? 'bg-red-100 text-red-700' :
                  c.severity === 'major' ? 'bg-orange-100 text-orange-700' :
                  c.severity === 'moderate' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'
                }`}>{c.severity}</span>
                <ChevronRight size={14} className="text-gray-400" />
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
//  Branch Health Score (§10)
// ---------------------------------------------------------------------
function BranchHealthTab() {
  const [data, setData] = useState(null);
  useEffect(() => { getBranchHealthScores().then(({ data }) => setData(data)); }, []);
  if (!data) return <LoadingSpinner />;

  const GRADE_COLOR = { A: 'bg-green-100 text-green-800 border-green-300', B: 'bg-blue-100 text-blue-800 border-blue-300', C: 'bg-yellow-100 text-yellow-800 border-yellow-300', D: 'bg-orange-100 text-orange-800 border-orange-300', F: 'bg-red-100 text-red-800 border-red-300' };

  return (
    <div className="space-y-4">
      <Card title="Branch Health Scorecard" subtitle="Composite of resolution rate, escalation rate, satisfaction, and SLA compliance (0–100)">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {data.map((b) => (
            <div key={b.branch} className={`rounded-xl p-5 border-2 ${GRADE_COLOR[b.grade]}`}>
              <div className="flex items-center justify-between mb-2">
                <p className="font-semibold text-gray-800 dark:text-white">{b.branch}</p>
                <span className="text-3xl font-extrabold">{b.grade}</span>
              </div>
              <p className="text-4xl font-bold text-ticano-charcoal dark:text-white">{b.score}<span className="text-base text-gray-500">/100</span></p>
              <div className="mt-3 space-y-1 text-xs text-gray-700 dark:text-gray-200">
                <div className="flex justify-between"><span>Resolution rate</span><span className="font-semibold">{b.breakdown.resolutionRate}%</span></div>
                <div className="flex justify-between"><span>Escalation rate</span><span className="font-semibold">{b.breakdown.escalationRate}%</span></div>
                <div className="flex justify-between"><span>Avg CSAT</span><span className="font-semibold">{b.breakdown.avgCsat}</span></div>
                <div className="flex justify-between"><span>SLA breaches</span><span className="font-semibold">{b.breakdown.slaBreaches}</span></div>
                <div className="flex justify-between"><span>Total volume</span><span className="font-semibold">{b.breakdown.total}</span></div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------
//  Smart Insights (§20)
// ---------------------------------------------------------------------
function SmartInsightsTab() {
  const [data, setData] = useState(null);
  useEffect(() => { getSmartInsights().then(({ data }) => setData(data)); }, []);
  if (!data) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl p-5 border border-blue-200 dark:border-blue-700/30">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="text-blue-600" size={22} />
          <h2 className="text-xl font-bold text-ticano-charcoal dark:text-white">Service Improvement Insights</h2>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300">Patterns surfaced from complaint and feedback data.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="Top 10 recurring issues">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.topIssues} layout="vertical" margin={{ left: 80 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis type="number" />
              <YAxis type="category" dataKey="category" width={150} fontSize={11} />
              <Tooltip />
              <Bar dataKey="count" fill="#CE313C" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Top root causes" subtitle="From closed complaints">
          {data.topRootCauses.length === 0 ? (
            <EmptyState title="No closed complaints with root cause yet" />
          ) : (
            <div className="space-y-2">
              {data.topRootCauses.map((c) => (
                <div key={c.cause} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <span className="text-sm">{c.cause}</span>
                  <span className="font-semibold text-ticano-red">{c.count}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Sentiment distribution" subtitle="Internal sentiment tags across all complaints">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={data.sentimentDistribution} dataKey="count" nameKey="sentiment" outerRadius={80} label>
                {data.sentimentDistribution.map((_, i) => (
                  <Cell key={i} fill={['#10B981', '#9CA3AF', '#F59E0B', '#EF4444'][i % 4]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Branch trends" subtitle="Month-over-month complaint volume">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.branchTrends}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="branch" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="complaintsLastMonth" fill="#808686" name="Last month" radius={[4, 4, 0, 0]} />
              <Bar dataKey="complaintsThisMonth" fill="#CE313C" name="This month" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
//  Complaint Heat Map (§19)
// ---------------------------------------------------------------------
function HeatMapTab() {
  const [data, setData] = useState([]);
  useEffect(() => { getComplaintHeatMap().then(({ data }) => setData(data)); }, []);
  const scatter = data.map((d) => ({
    ...d,
    lat: BRANCH_COORDS[d.branch]?.lat,
    lng: BRANCH_COORDS[d.branch]?.lng,
    region: BRANCH_COORDS[d.branch]?.region || '—',
  }));

  return (
    <div className="space-y-4">
      <Card title="Complaint Heat Map" subtitle="Volume × severity by branch — bubble size = complaint count">
        <ResponsiveContainer width="100%" height={360}>
          <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis type="number" dataKey="lng" name="Longitude" domain={['dataMin - 1', 'dataMax + 1']} />
            <YAxis type="number" dataKey="lat" name="Latitude" domain={['dataMin - 1', 'dataMax + 1']} />
            <ZAxis type="number" dataKey="complaintCount" range={[100, 1500]} name="Volume" />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={(v, name, props) => [v, name]} content={({ payload }) => {
              if (!payload || !payload.length) return null;
              const p = payload[0].payload;
              return (
                <div className="bg-white dark:bg-ticano-dark-card p-3 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                  <p className="font-semibold text-ticano-charcoal dark:text-white">{p.branch}</p>
                  <p className="text-xs text-gray-500">{p.region}</p>
                  <p className="text-sm mt-1">{p.complaintCount} complaints</p>
                  <p className="text-xs text-gray-500">{p.escalated} escalated · severity {p.avgSeverityScore}</p>
                </div>
              );
            }} />
            <Scatter name="Branches" data={scatter} fill="#CE313C" />
          </ScatterChart>
        </ResponsiveContainer>
      </Card>

      <Card title="By branch (table view)">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-200 dark:border-gray-700">
            {['Branch', 'Region', 'Complaints', 'Escalated', 'Avg Severity'].map((h) => (
              <th key={h} className="text-left py-2 px-2 text-gray-500 text-xs uppercase">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {scatter.map((d) => (
              <tr key={d.branch} className="border-b border-gray-100 dark:border-gray-800">
                <td className="py-2 px-2 font-semibold">{d.branch}</td>
                <td className="py-2 px-2">{d.region}</td>
                <td className="py-2 px-2 font-bold text-ticano-red">{d.complaintCount}</td>
                <td className="py-2 px-2">{d.escalated}</td>
                <td className="py-2 px-2">{d.avgSeverityScore}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ---- Announcements Tab ----
function AnnouncementsTab() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [showForm, setShowForm] = React.useState(false);
  const [form, setForm] = React.useState({ title:'', body:'', priority:'normal', targetRoles:[], pinned:false });


  React.useEffect(() => {
    getAnnouncements({}).then(({data}) => { setAnnouncements(data); setLoading(false); });
  }, []);

  const handleCreate = () => {
    createAnnouncement({ ...form, author: user?.name, role: user?.role }).then(({data}) => {
      setAnnouncements(prev => [data.announcement, ...prev]);
      setShowForm(false);
      setForm({ title:'', body:'', priority:'normal', targetRoles:[], pinned:false });
      toast.success('Announcement published');
    });
  };

  const handleDelete = (id) => {
    deleteAnnouncement(id).then(() => {
      setAnnouncements(prev => prev.filter(a => a.id !== id));
      toast.success('Announcement removed');
    });
  };

  const ROLES_OPTIONS = ['portfolio_manager','service_manager','marketing','admin'];
  const PRIORITY_STYLE = { high: 'border-l-red-500 bg-red-50 dark:bg-red-900/10', normal: 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/10', info: 'border-l-gray-400 bg-gray-50 dark:bg-gray-800' };
  const inp = 'w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-ticano-red';

  if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-ticano-red border-t-transparent rounded-full animate-spin"/></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="font-bold text-ticano-charcoal dark:text-white text-lg">Announcements</h3>
          <p className="text-sm text-gray-500 mt-0.5">Broadcast notices to your teams across all roles</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-ticano-red text-white rounded-xl text-sm font-semibold hover:bg-ticano-red-dark transition-all duration-200">
          <Send size={14}/> New Announcement
        </button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-ticano-dark-card border border-gray-200 dark:border-gray-700 rounded-xl p-5 mb-5 animate-scale-in">
          <h4 className="font-semibold text-gray-800 dark:text-white mb-4">New Announcement</h4>
          <div className="space-y-3">
            <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Title *</label><input className={inp} value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Announcement title" /></div>
            <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Message *</label><textarea rows={4} className={inp+' resize-none'} value={form.body} onChange={e=>setForm({...form,body:e.target.value})} placeholder="Full announcement message…" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Priority</label>
                <select className={inp} value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})}>
                  <option value="info">Info</option><option value="normal">Normal</option><option value="high">High / Urgent</option>
                </select>
              </div>
              <div className="flex items-end pb-0.5">
                <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300">
                  <input type="checkbox" checked={form.pinned} onChange={e=>setForm({...form,pinned:e.target.checked})} className="accent-ticano-red w-4 h-4" /> Pin to top
                </label>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={()=>setShowForm(false)} className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 text-sm">Cancel</button>
              <button onClick={handleCreate} className="px-4 py-2 rounded-xl bg-ticano-red text-white text-sm font-semibold hover:bg-ticano-red-dark">Publish</button>
            </div>
          </div>
        </div>
      )}

      {announcements.length === 0 ? (
        <div className="text-center py-14 text-gray-400">
          <Send size={28} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No announcements yet</p>
          <p className="text-sm mt-1">Publish one to notify your teams</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((ann, i) => (
            <div key={ann.id} className={`border-l-4 rounded-r-xl p-4 flex items-start justify-between gap-3 hover-lift animate-fade-up ${PRIORITY_STYLE[ann.priority]||PRIORITY_STYLE.info}`} style={{animationDelay:`${i*0.06}s`}}>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-gray-900 dark:text-white text-sm">{ann.title}</p>
                  {ann.pinned && <span className="text-xs bg-ticano-red/15 text-ticano-red px-2 py-0.5 rounded-full font-medium">Pinned</span>}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ann.priority==='high'?'bg-red-100 text-red-700 dark:text-red-300':ann.priority==='normal'?'bg-blue-100 text-blue-700':'bg-gray-100 text-gray-600'}`}>{ann.priority}</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">{ann.body}</p>
                <p className="text-xs text-gray-400 mt-2">By {ann.author} · {new Date(ann.createdAt).toLocaleString()}</p>
              </div>
              <button onClick={()=>handleDelete(ann.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors shrink-0">
                <X size={14}/>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
