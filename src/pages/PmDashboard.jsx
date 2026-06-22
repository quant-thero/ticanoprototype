import React, { useState, useEffect } from 'react';
import { ShieldAlert, TrendingUp, CheckCircle, Star, Clock, Send, Plus, ThumbsUp, ThumbsDown, MessageSquare } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import Navbar from '../components/common/Navbar';
import {
  StatCard, Badge, SearchFilters, ExportButton, LoadingSpinner, EmptyState, Card, Tabs, StarRating,
} from '../components/common/UI';
import ComplaintsModule from '../components/common/ComplaintsModule';
import ReviewLinkSender from '../components/common/ReviewLinkSender';
import LeadsModule from '../components/common/LeadsModule';
import KnowledgeBase from '../components/common/KnowledgeBase';
import { getComplaints, createLead, searchCustomers, getAppointments } from '../services/api';
import AppointmentModule from '../components/common/AppointmentModule';
import AnnouncementBanner from '../components/common/AnnouncementBanner';
import WhatsAppSimulator from '../components/common/WhatsAppSimulator';
import EmailNotifications from '../components/common/EmailNotifications';
import { OPEN_COMPLAINT_STATUSES, complaintStatusLabel } from '../utils/constants';
import { formatPercent, formatDate } from '../utils/format';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const RED = '#CE313C';
const GRAY = '#808686';

// Local rating analytics seed (was previously in api.js)
const RATING_TREND = [
  { month: 'Feb', avgRating: 4.1 }, { month: 'Mar', avgRating: 4.2 },
  { month: 'Apr', avgRating: 4.3 }, { month: 'May', avgRating: 4.3 }, { month: 'Jun', avgRating: 4.5 },
];

export default function PmDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [myComplaints, setMyComplaints] = useState([]);
  const [showReviewSender, setShowReviewSender] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await getComplaints({ assignedPmId: user?.id || 2 });
        setMyComplaints(data || []);
      } catch {} finally { setLoading(false); }
    })();
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
            <Send size={16} /> Send Review Link
          </button>
        </div>

        <AnnouncementBanner />
        <Tabs
          tabs={[
            { id: 'overview',   label: 'Overview' },
            { id: 'complaints', label: 'My Complaints' },
            { id: 'kb',         label: 'Knowledge Base' },
            { id: 'leads',      label: 'Potential Clients' },
            { id: 'ratings',    label: 'Rating Analytics' },
            { id: 'appointments', label: 'Appointments' },
            { id: 'whatsapp', label: 'WhatsApp' },
            { id: 'email', label: 'Email' },
          ]}
          active={tab}
          onChange={setTab}
        />

        <ReviewLinkSender open={showReviewSender} onClose={() => setShowReviewSender(false)} />

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

        {tab === 'appointments' && (
          <div className="bg-white dark:bg-ticano-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <h3 className="font-bold text-ticano-charcoal dark:text-white text-lg mb-4">My Appointments</h3>
            <AppointmentModule pmId={user?.id} branch={user?.branch} canCreate={true} />
          </div>
        )}

        {/* ---------- OVERVIEW ---------- */}
        {tab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Open Complaints" value={openCount} icon={ShieldAlert} color="red" />
              <StatCard title="Escalated" value={escalatedCount} icon={TrendingUp} color="gold" />
              <StatCard title="Resolved" value={resolvedCount} icon={CheckCircle} color="teal" />
              <StatCard title="Avg Customer Rating" value="4.5" subtitle="out of 5.0" icon={Star} color="navy" />
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
        {tab === 'complaints' && (
          <ComplaintsModule
            scope="mine"
            currentUser={{ id: user?.id || 2, name: user?.name || 'Mojaboswa', role: 'portfolio_manager', branch: user?.branch }}
            canAssign={false}
            canEscalate={true}
            canResolve={true}
            showInternalNotes={true}
          />
        )}

        {/* ---------- KNOWLEDGE BASE (§8) ---------- */}
        {tab === 'kb' && (
          <KnowledgeBase editable={false} currentUser={user} />
        )}

        {/* ---------- LEADS ---------- */}
        {tab === 'leads' && <LeadsModule branch={user?.branch} />}

        {/* ---------- RATING ANALYTICS ---------- */}
        {tab === 'ratings' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Average Rating" value="4.5" icon={Star} color="gold" />
              <StatCard title="Positive Ratings" value="142" subtitle="4–5 stars" icon={ThumbsUp} color="teal" />
              <StatCard title="Negative Ratings" value="18" subtitle="1–2 stars" icon={ThumbsDown} color="red" />
              <StatCard title="Satisfaction" value={formatPercent(142/(142+18)*100)} color="navy" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card title="Rating Trend">
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={RATING_TREND}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="month" /><YAxis domain={[0, 5]} />
                    <Tooltip />
                    <Line type="monotone" dataKey="avgRating" stroke={RED} strokeWidth={3} name="Avg Rating" />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
              <Card title="Positive vs Negative">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={[{ name: 'Ratings', Positive: 142, Negative: 18 }]}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="name" /><YAxis />
                    <Tooltip /><Legend />
                    <Bar dataKey="Positive" fill={RED} radius={[6, 6, 0, 0]} />
                    <Bar dataKey="Negative" fill={GRAY} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
