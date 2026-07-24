import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Users, UserPlus, TrendingUp, MapPin, Cake, MessageSquare, UserPlus2, Plus, Trash2, Edit2, Eye, EyeOff, Calendar, Filter, Share2, Smile, BarChart3, FileText } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import Navbar from '../components/common/Navbar';
import { StatCard, Card, Tabs, ExportButton, LoadingSpinner, EmptyState, AnalyticsLauncher, AnalyticsBackBar } from '../components/common/UI';
import WidgetBoundary from '../components/common/WidgetBoundary';
import AdvancedCharts from '../components/common/AdvancedCharts';
import ReportsModule from '../components/common/ReportsModule';
import AnnouncementBanner from '../components/common/AnnouncementBanner';
import QuestionnairesManagement from '../components/common/QuestionnairesManagement';
import TenderBroadcasts from '../components/common/TenderBroadcasts';
import HomepagePromoManager from '../components/common/HomepagePromoManager';
import OurJourneyManager from '../components/common/OurJourneyManager';
import StaffMessaging from '../components/common/StaffMessaging';
import {
  getBlogPosts, createBlogPost, updateBlogPost, deleteBlogPost,
  getAllCareers, createCareer, updateCareer, setCareerActive, deleteCareer,
  getCsatTrend, getActiveClientAnalytics,
  getMarketingSummary, getReferralSources, getDemographics, getLocationAnalytics, getLeadFunnel,
  getWordCloud, getReferralTrends, getReferralNetwork,
  getPendingTestimonials, subscribeToTable,
} from '../services/supabaseApi';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { formatPercent } from '../utils/format';
import toast from 'react-hot-toast';

const COLORS = ['#CE313C', '#808686', '#a6abab', '#373435', '#a8252f', '#e0653b', '#7a7a7a'];
// Word-cloud palette: mid-tone hues that stay legible on BOTH the light card
// and the dark card (#262627), deliberately excludes near-background charcoal.
const WORD_CLOUD_COLORS = ['#CE313C', '#e0653b', '#d98a00', '#3b82f6', '#14b8a6', '#8b5cf6', '#9aa0a6'];
const RED = '#CE313C';
const GRAY = '#808686';

// Analytics views consolidated under the single "Analytics" tab.
const MKT_ANALYTICS_VIEWS = [
  { id: 'summary', label: 'Executive Summary', desc: 'Acquisition KPIs and growth trends', icon: TrendingUp, accent: 'navy' },
  { id: 'clientmix', label: 'Client Mix', desc: 'New vs existing clients & retention', icon: UserPlus2, accent: 'red' },
  { id: 'funnel', label: 'Lead Funnel', desc: 'Conversion from lead to customer', icon: Filter, accent: 'gold' },
  { id: 'referrals', label: 'Referral Analytics',desc: 'Where new customers come from', icon: Share2, accent: 'blue' },
  { id: 'other', label: '"Other" Analysis', desc: 'Custom free-text referral responses', icon: MessageSquare, accent: 'purple' },
  { id: 'demographics', label: 'Demographics', desc: 'Age, location and birthday insights', icon: Users, accent: 'teal' },
  { id: 'satisfaction', label: 'Satisfaction', desc: 'CSAT trend and feedback word cloud', icon: Smile, accent: 'gold' },
  { id: 'Advanced Charts', label: 'Advanced Charts', desc: 'Interactive marketing chart explorer', icon: BarChart3, accent: 'red' },
  { id: 'Reports', label: 'Reports', desc: 'Generate and download branded PDF reports', icon: FileText, accent: 'navy' },
];
const MKT_ANALYTICS_IDS = MKT_ANALYTICS_VIEWS.map((v) => v.id);

export default function MarketingDashboard() {
  const [tab, setTab] = useState('Analytics');
  const [analyticsView, setAnalyticsView] = useState(null);
  const [searchParams] = useSearchParams();
  const [pendingReviewsCount, setPendingReviewsCount] = useState(0);
  const { unreadMessageCount } = useNotifications();
  const MKT_TAB_IDS = ['Analytics', 'Blog', 'Careers', 'Questionnaires', 'Tenders', 'Homepage Promo', 'Our Journey', 'Messages'];
  useEffect(() => {
    const loadBadges = () => {
      getPendingTestimonials().then(({ data }) => setPendingReviewsCount(data.length)).catch(() => {});
    };
    loadBadges();
    const unsub2 = subscribeToTable('testimonials', {}, loadBadges);
    return () => { unsub2?.(); };
  }, []);
  useEffect(() => {
    const t = searchParams.get('tab');
    if (!t) return;
    if (MKT_TAB_IDS.includes(t)) { setTab(t); setAnalyticsView(null); }
    else if (MKT_ANALYTICS_IDS.includes(t)) { setTab('Analytics'); setAnalyticsView(t); }
  }, [searchParams]);
  const [loading, setLoading] = useState(true);
  const [loadErrors, setLoadErrors] = useState([]);
  const [summary, setSummary] = useState(null);
  const [referrals, setReferrals] = useState(null);
  const [refTrends, setRefTrends] = useState(null);
  const [demographics, setDemographics] = useState(null);
  const [locations, setLocations] = useState([]);
  const [csat, setCsat] = useState([]);
  const [words, setWords] = useState([]);
  const [funnel, setFunnel] = useState(null);
  const [network, setNetwork] = useState(null);
  const [activeClients, setActiveClients] = useState(null);

  useEffect(() => {
    (async () => {
      const results = await Promise.allSettled([
        getMarketingSummary(), getReferralSources(), getReferralTrends(),
        getDemographics(), getLocationAnalytics(), getCsatTrend(), getWordCloud(),
        getLeadFunnel(), getReferralNetwork(), getActiveClientAnalytics(),
      ]);
      const labels = ['getMarketingSummary', 'getReferralSources', 'getReferralTrends', 'getDemographics', 'getLocationAnalytics', 'getCsatTrend', 'getWordCloud', 'getLeadFunnel', 'getReferralNetwork', 'getActiveClientAnalytics'];
      const [s, r, rt, d, l, c, w, f, n, ac] = results;
      const failed = [];
      results.forEach((res, i) => {
        if (res.status === 'rejected') {
          const err = res.reason || {};
          const parts = [err.message, err.details, err.hint, err.code ? `code: ${err.code}` : null].filter(Boolean);
          const detail = parts.length ? parts.join(' | ') : JSON.stringify(err) || String(err);
          failed.push(`${labels[i]}: ${detail}`);
          console.error(`[MarketingDashboard] ${labels[i]} failed: ${detail}`, err);
        }
      });
      setLoadErrors(failed);
      if (failed.length) toast.error(`Dashboard data failed to load:\n${failed.join('\n')}`, { duration: 15000 });

      if (s.status === 'fulfilled') setSummary(s.value.data); else setSummary({ totalCustomers: 0, newThisWeek: 0, newThisMonth: 0, referralConversionRate: 0, acquisitionTrend: [], branchAcquisition: [] });
      if (r.status === 'fulfilled') setReferrals(r.value.data);
      if (rt.status === 'fulfilled') setRefTrends(rt.value.data);
      if (d.status === 'fulfilled') setDemographics(d.value.data);
      if (l.status === 'fulfilled') setLocations(l.value.data.locations);
      if (c.status === 'fulfilled') setCsat(c.value.data.trend);
      if (w.status === 'fulfilled') setWords(w.value.data.words);
      if (f.status === 'fulfilled') setFunnel(f.value.data);
      if (n.status === 'fulfilled') setNetwork(n.value.data);
      if (ac.status === 'fulfilled') setActiveClients(ac.value.data);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return <div className="min-h-screen bg-ticano-bg dark:bg-ticano-dark-bg"><Navbar title="Marketing" /><LoadingSpinner /></div>;
  }

  const otherDetails = referrals?.otherDetails || [];
  const mixTrend = activeClients?.newClientsTrend?.map((row, i) => ({
    month: row.month,
    'New clients': row.count,
    'Existing clients': activeClients.existingClientsTrend[i]?.count || 0,
  })) || [];

  return (
    <div className="min-h-screen bg-ticano-bg dark:bg-ticano-dark-bg">
      <Navbar title="Marketing" />
      <div className="max-w-7xl mx-auto px-4 py-6">
        {loadErrors.length > 0 && (
          <div className="mb-4 p-4 rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
            <p className="text-sm font-semibold text-red-700 dark:text-red-300 mb-1">Some dashboard data failed to load, full details below (select and copy to report this):</p>
            <pre className="text-xs text-red-600 dark:text-red-400 whitespace-pre-wrap select-all font-mono">{loadErrors.join('\n')}</pre>
          </div>
        )}
        <AnnouncementBanner />
        <Tabs
          tabs={[
            { id: 'Analytics', label: 'Analytics' },
            { id: 'Blog', label: 'Blog Posts' },
            { id: 'Careers', label: 'Careers' },
            { id: 'Questionnaires', label: 'Questionnaires' },
            { id: 'Tenders', label: 'Tender Broadcasts' },
            { id: 'Homepage Promo', label: 'Homepage Promo', badge: pendingReviewsCount },
            { id: 'Our Journey', label: 'Our Journey' },
            { id: 'Messages', label: 'Messages', badge: unreadMessageCount },
          ]}
          active={tab}
          onChange={(id) => { setTab(id); setAnalyticsView(null); }}
        />

        <WidgetBoundary label={analyticsView ? `${tab}: ${analyticsView}` : tab} resetKeys={`${tab}:${analyticsView}`} key={`${tab}:${analyticsView}`}>
        {/* ---------- ANALYTICS HUB ---------- */}
        {tab === 'Analytics' && !analyticsView && (
          <AnalyticsLauncher
            views={MKT_ANALYTICS_VIEWS}
            onSelect={setAnalyticsView}
            subtitle="Marketing insights, grouped in one place. Pick a view to explore."
          />
        )}
        {tab === 'Analytics' && analyticsView && (
          <AnalyticsBackBar view={MKT_ANALYTICS_VIEWS.find((v) => v.id === analyticsView)} onBack={() => setAnalyticsView(null)} backLabel="All Analytics" />
        )}

        {/* ---------- EXECUTIVE SUMMARY ---------- */}
        {tab === 'Analytics' && analyticsView === 'summary' && (
          summary.totalCustomers === 0 && summary.acquisitionTrend.length === 0 ? (
            <EmptyState title="No customer data yet" message="Acquisition trends will appear here once clients start signing up." icon={TrendingUp} />
          ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Total Customers" value={summary.totalCustomers} icon={Users} color="navy" />
              <StatCard title="New This Week" value={summary.newThisWeek} icon={UserPlus} color="teal" />
              <StatCard title="New This Month" value={summary.newThisMonth} icon={UserPlus} color="gold" />
              <StatCard title="Referral Conversion" value={formatPercent(summary.referralConversionRate)} icon={TrendingUp} color="red" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card title="Customer Acquisition Trend" actions={<ExportButton rows={summary.acquisitionTrend} filename="acquisition_trend" />}>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={summary.acquisitionTrend}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="month" /><YAxis /><Tooltip />
                    <Line type="monotone" dataKey="customers" stroke={RED} strokeWidth={3} name="New customers" />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
              <Card title="Branch Acquisition Comparison">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={summary.branchAcquisition}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="branch" /><YAxis /><Tooltip />
                    <Bar dataKey="customers" fill={GRAY} radius={[6, 6, 0, 0]} name="Customers" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>
          </div>
          )
        )}

        {/* ---------- CLIENT MIX (NEW) ---------- */}
        {tab === 'Analytics' && analyticsView === 'clientmix' && activeClients && (
          activeClients.totals.newClients === 0 && activeClients.totals.existingClients === 0 ? (
            <EmptyState title="No client data yet" message="New vs existing client trends will appear here once clients are recorded." icon={UserPlus2} />
          ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="New Clients" value={activeClients.totals.newClients} icon={UserPlus2} color="red" />
              <StatCard title="Existing Clients" value={activeClients.totals.existingClients} icon={Users} color="navy" />
              <StatCard title="Conversion Rate" value={formatPercent(activeClients.conversionRate)} icon={TrendingUp} color="gold" />
              <StatCard title="Retention Rate" value={formatPercent(activeClients.retentionRate)} color="teal" />
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
          )
        )}
        {tab === 'Analytics' && analyticsView === 'funnel' && funnel && (
          funnel.funnel.length === 0 ? (
            <EmptyState title="No lead data yet" message="Once leads start coming in, the conversion funnel will appear here." icon={Filter} />
          ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Total Leads" value={funnel.funnel[0].count} color="navy" />
              <StatCard title="Converted" value={funnel.funnel[funnel.funnel.length - 1].count} color="teal" />
              <StatCard title="Overall Conversion" value={formatPercent(funnel.funnel[funnel.funnel.length - 1].count / funnel.funnel[0].count * 100)} color="gold" />
              <StatCard title="Referral Customers" value={network?.totalReferralCustomers ?? '-'} color="white" />
            </div>
            <Card title="Conversion Funnel" subtitle="Lead → Contacted → Interested → Converted" actions={<ExportButton rows={funnel.funnel} filename="marketing_funnel" />}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={funnel.funnel} layout="vertical" margin={{ left: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis type="number" /><YAxis type="category" dataKey="stage" width={130} /><Tooltip />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]} name="Leads">
                    {funnel.funnel.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card title="Conversion by Branch">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={funnel.byBranch}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="branch" /><YAxis /><Tooltip /><Legend />
                    <Bar dataKey="leads" fill={GRAY} radius={[6, 6, 0, 0]} name="Leads" />
                    <Bar dataKey="converted" fill={RED} radius={[6, 6, 0, 0]} name="Converted" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
              <Card title="Conversion by PM">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={funnel.byPm}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="pm" tick={{ fontSize: 10 }} /><YAxis /><Tooltip />
                    <Bar dataKey="rate" fill={RED} radius={[6, 6, 0, 0]} name="Conversion %" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>
          </div>
          )
        )}

        {/* ---------- REFERRAL ANALYTICS ---------- */}
        {tab === 'Analytics' && analyticsView === 'referrals' && (
          referrals.sources.length === 0 ? (
            <EmptyState title="No referral data yet" message="Referral source breakdowns will appear here once leads start coming in." icon={Share2} />
          ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard title="Referral Customers" value={network?.totalReferralCustomers ?? 0} icon={Users} color="navy" />
              <StatCard title="Conversion from Referrals" value={formatPercent(network?.conversionFromReferrals ?? 0)} icon={TrendingUp} color="teal" />
              <StatCard title="Family/Friend Referrals" value={referrals.sources.find((s) => s.source === 'Friend or Family Referral')?.count ?? 0} icon={Share2} color="gold" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card title="Referral Source Distribution" actions={<ExportButton rows={referrals.sources} filename="referral_sources" />}>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={referrals.sources} dataKey="count" nameKey="source" cx="50%" cy="50%" outerRadius={100} label>
                      {referrals.sources.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip /><Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
              <Card title="Top Referral Channels" subtitle="Ranked by how many customers came through each">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={[...referrals.sources].sort((a, b) => b.count - a.count)} layout="vertical" margin={{ left: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis type="number" /><YAxis type="category" dataKey="source" width={140} tick={{ fontSize: 12 }} /><Tooltip />
                    <Bar dataKey="count" fill={COLORS[0]} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>
            <Card title="Named Referrers" subtitle="People new clients credited with referring them (Friend/Family signups)" actions={<ExportButton rows={network?.topReferrers || []} filename="named_referrers" />}>
              {!network?.topReferrers?.length ? (
                <p className="text-sm text-gray-400 text-center py-6">No named referrers yet, this fills in as new clients optionally name who referred them during signup.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        {['Name', 'Times Referred'].map((h) => <th key={h} className="text-left py-2 px-2 text-gray-500 text-xs uppercase">{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {network.topReferrers.map((r) => (
                        <tr key={r.name} className="border-b border-gray-100 dark:border-gray-800">
                          <td className="py-2.5 px-2 font-medium text-gray-800 dark:text-white">{r.name}</td>
                          <td className="py-2.5 px-2 text-gray-600 dark:text-gray-300">{r.referrals}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
            <Card title="Referral Trends Over Time">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={refTrends.trend}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="month" /><YAxis /><Tooltip /><Legend />
                  {Object.keys(refTrends.trend[0] || {}).filter((k) => k !== 'month').map((src, i) => (
                    <Line key={src} type="monotone" dataKey={src} stroke={COLORS[i % COLORS.length]} strokeWidth={2} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </Card>
            <Card title="Referral Source by Branch">
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={refTrends.byBranch}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="branch" /><YAxis /><Tooltip /><Legend />
                  {Object.keys(refTrends.byBranch.find((b) => Object.keys(b).length > 1) || {}).filter((k) => k !== 'branch').map((src, i) => (
                    <Bar key={src} dataKey={src} stackId="a" fill={COLORS[i % COLORS.length]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>
          )
        )}

        {/* ---------- "OTHER" ANALYSIS ---------- */}
        {tab === 'Analytics' && analyticsView === 'other' && (
          <Card title={'"Other" Referral Analysis'} subtitle="Custom responses customers typed in" actions={<ExportButton rows={otherDetails} filename="other_referrals" />}>
            {otherDetails.length === 0 ? <EmptyState title="No custom responses yet" icon={MessageSquare} /> : (
              <div className="space-y-4">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={otherDetails} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis type="number" /><YAxis type="category" dataKey="text" width={140} /><Tooltip />
                    <Bar dataKey="count" fill={RED} radius={[0, 6, 6, 0]} name="Mentions" />
                  </BarChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {otherDetails.map((o) => (
                    <div key={o.text} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                      <span className="text-sm text-gray-700 dark:text-gray-200">{o.text}</span>
                      <span className="text-sm font-bold text-ticano-charcoal dark:text-white">{o.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        )}

        {/* ---------- DEMOGRAPHICS ---------- */}
        {tab === 'Analytics' && analyticsView === 'demographics' && (
          summary.totalCustomers === 0 && locations.length === 0 ? (
            <EmptyState title="No demographic data yet" message="Age, location, and birthday insights will appear here once clients are recorded." icon={Users} />
          ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Birthdays This Week" value={demographics.birthdaysThisWeek} icon={Cake} color="gold" />
              <StatCard title="Birthdays This Month" value={demographics.birthdaysThisMonth} icon={Cake} color="teal" />
              <StatCard title="Locations Covered" value={locations.length} icon={MapPin} color="navy" />
              <StatCard title="Total Customers" value={summary.totalCustomers} icon={Users} color="red" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card title="Customers by Age Group">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={demographics.byAgeGroup}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="group" /><YAxis /><Tooltip />
                    <Bar dataKey="count" fill={RED} radius={[6, 6, 0, 0]} name="Customers" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
              <Card title="Customers by Location" actions={<ExportButton rows={locations} filename="customer_locations" />}>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={locations} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis type="number" /><YAxis type="category" dataKey="location" width={100} /><Tooltip />
                    <Bar dataKey="count" fill={GRAY} radius={[0, 6, 6, 0]} name="Customers" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>
          </div>
          )
        )}

        {/* ---------- SATISFACTION ---------- */}
        {tab === 'Analytics' && analyticsView === 'satisfaction' && (
          csat.length === 0 && words.length === 0 ? (
            <EmptyState title="No satisfaction data yet" message="CSAT trends and feedback word clouds will appear here once ratings come in." icon={Smile} />
          ) : (
          <div className="space-y-6">
            <Card title="CSAT Trend" actions={<ExportButton rows={csat} filename="csat_trend" />}>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={csat}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="week" /><YAxis domain={[0, 5]} /><Tooltip />
                  <Line type="monotone" dataKey="avgRating" stroke={RED} strokeWidth={3} name="Avg Rating" />
                </LineChart>
              </ResponsiveContainer>
            </Card>
            <Card title="Feedback Word Cloud" subtitle="Most-mentioned words in recent comments">
              <div className="flex flex-wrap gap-2 justify-center py-4">
                {words.map((w, i) => (
                  <span key={w.word} className="word-cloud-word"
                    style={{
                      fontSize: `${0.8 + (w.count / 50) * 2}rem`,
                      color: WORD_CLOUD_COLORS[i % WORD_CLOUD_COLORS.length],
                      fontWeight: w.count > 25 ? 700 : 500,
                    }}>
                    {w.word}
                  </span>
                ))}
              </div>
            </Card>
          </div>
          )
        )}

        {tab === 'Analytics' && analyticsView === 'Advanced Charts' && (
          <div className="bg-white dark:bg-ticano-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <h3 className="font-bold text-ticano-charcoal dark:text-white text-lg mb-1">Advanced Charts</h3>
            <p className="text-sm text-gray-500 mb-5">Interactive analytics for marketing insights, sample data for exploring chart types, not live figures</p>
            <AdvancedCharts />
          </div>
        )}

        {tab === 'Analytics' && analyticsView === 'Reports' && (
          <div className="bg-white dark:bg-ticano-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <h3 className="font-bold text-ticano-charcoal dark:text-white text-lg mb-1">Marketing Reports</h3>
            <p className="text-sm text-gray-500 mb-5">Generate lead, referral, and acquisition reports</p>
            <ReportsModule availableTypes={['client_satisfaction','monthly_executive']} />
          </div>
        )}


        {tab === 'Blog' && <BlogManagement />}
        {tab === 'Careers' && <CareersManagement />}
        {tab === 'Questionnaires' && <QuestionnairesManagement />}
        {tab === 'Tenders' && <TenderBroadcasts />}
        {tab === 'Homepage Promo' && <HomepagePromoManager pendingReviewsCount={pendingReviewsCount} />}
        {tab === 'Our Journey' && <OurJourneyManager />}
        {tab === 'Messages' && <StaffMessaging />}
        </WidgetBoundary>
      </div>
    </div>
  );
}

// ---- Blog Management, create / edit / publish / unpublish / schedule ----
const BLOG_CATS = ['News', 'Education', 'Announcement', 'Promotion', 'Update'];
const CAT_BADGE = { 'News': 'bg-blue-100 text-blue-700', 'Education': 'bg-green-100 text-green-700', 'Announcement': 'bg-amber-100 text-amber-700', 'Promotion': 'bg-pink-100 text-pink-700', 'Update': 'bg-purple-100 text-purple-700' };
const blankPost = { title: '', excerpt: '', content: '', category: 'News', pinned: false, status: 'published', scheduledFor: '' };

function BlogManagement() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(blankPost);
  const [saving, setSaving] = useState(false);

  const load = () => { getBlogPosts().then(({ data }) => { setPosts(data); setLoading(false); }).catch((err) => { console.error('[BlogManagement]', err); toast.error('Could not load blog posts'); setLoading(false); }); };
  useEffect(load, []);

  const resetForm = () => { setForm(blankPost); setEditingId(null); setShowForm(false); };
  const startCreate = () => { setForm(blankPost); setEditingId(null); setShowForm(true); };
  const startEdit = (p) => {
    setForm({ title: p.title, excerpt: p.excerpt, content: p.content || '', category: p.category, pinned: !!p.pinned, status: p.status || 'published', scheduledFor: p.scheduledFor || '' });
    setEditingId(p.id); setShowForm(true);
  };

  const save = async (status) => {
    if (!form.title || !form.excerpt) return toast.error('Title and excerpt required');
    setSaving(true);
    const payload = { ...form, status, author: user?.name || 'Marketing Team' };
    if (editingId) { await updateBlogPost(editingId, payload); toast.success('Post updated'); }
    else { await createBlogPost(payload); toast.success(status === 'draft' ? 'Draft saved' : 'Post published to homepage!'); }
    resetForm(); load(); setSaving(false);
  };

  const togglePublish = async (p) => {
    const next = (p.status || 'published') === 'published' ? 'draft' : 'published';
    await updateBlogPost(p.id, { status: next });
    toast.success(next === 'published' ? 'Published to homepage' : 'Unpublished');
    load();
  };
  const handleDelete = async (id) => {
    if (!window.confirm('Remove this post from the homepage?')) return;
    await deleteBlogPost(id); toast.success('Post removed'); load();
  };

  const inp = 'w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-ticano-red';
  const today = new Date();
  const isScheduled = (p) => p.scheduledFor && new Date(p.scheduledFor) > today;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-ticano-charcoal dark:text-white">Blog & Announcements</h3>
          <p className="text-sm text-gray-500 mt-0.5">Published posts appear live on the Ticano homepage. Drafts and scheduled posts stay hidden until ready.</p>
        </div>
        <button onClick={startCreate} className="flex items-center gap-2 px-4 py-2 bg-ticano-red text-white rounded-xl text-sm font-semibold hover:bg-ticano-red-dark transition-colors">
          <Plus size={15} /> New Post
        </button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-ticano-dark-card rounded-2xl border border-gray-100 dark:border-gray-700 p-5 animate-scale-in">
          <h4 className="font-bold text-gray-800 dark:text-white mb-4">{editingId ? 'Edit Post' : 'New Blog Post'}</h4>
          <div className="space-y-4">
            <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Title *</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inp} placeholder="e.g. Happy New Year from Ticano Group " /></div>
            <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Excerpt * (shown on homepage)</label>
              <textarea value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} className={inp + ' resize-none'} rows={2} placeholder="Short summary shown on the homepage card…" /></div>
            <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Full Content</label>
              <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} className={inp + ' resize-none'} rows={4} placeholder="Full article content…" /></div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Category</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inp}>
                  {BLOG_CATS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select></div>
              <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Schedule for (optional)</label>
                <input type="date" value={form.scheduledFor} onChange={(e) => setForm({ ...form, scheduledFor: e.target.value })} min={new Date().toISOString().split('T')[0]} className={inp} /></div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                  <input type="checkbox" checked={form.pinned} onChange={(e) => setForm({ ...form, pinned: e.target.checked })} className="accent-ticano-red w-4 h-4" />
                  Pin to top
                </label>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 justify-end">
              <button onClick={resetForm} className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300">Cancel</button>
              <button onClick={() => save('draft')} disabled={saving} className="px-4 py-2 rounded-xl border border-ticano-red text-ticano-red text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-900/10 disabled:opacity-60">Save as draft</button>
              <button onClick={() => save('published')} disabled={saving} className="px-4 py-2 rounded-xl bg-ticano-red text-white text-sm font-semibold hover:bg-ticano-red-dark disabled:opacity-60">
                {saving ? 'Saving…' : (editingId ? 'Save & publish' : 'Publish to Homepage')}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? <div className="flex justify-center py-10"><div className="w-8 h-8 border-2 border-gray-200 border-t-ticano-red rounded-full animate-spin" /></div>
        : posts.length === 0 ? <p className="text-center text-gray-400 py-10">No posts yet. Publish your first one!</p>
          : (
            <div className="space-y-3">
              {posts.map((post, i) => (
                <div key={post.id} className="bg-white dark:bg-ticano-dark-card rounded-xl border border-gray-100 dark:border-gray-700 p-4 flex items-start gap-4 hover:-translate-y-0.5 transition-all shadow-sm animate-fade-up" style={{ animationDelay: `${i * 0.06}s` }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-semibold text-gray-800 dark:text-white text-sm">{post.title}</p>
                      {post.pinned && <span className="text-xs bg-ticano-red/15 text-ticano-red px-2 py-0.5 rounded-full font-semibold">Pinned</span>}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${CAT_BADGE[post.category] || 'bg-gray-100 text-gray-600'}`}>{post.category}</span>
                      {(post.status || 'published') === 'published'
                        ? <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-green-100 text-green-700">Published</span>
                        : <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-amber-100 text-amber-700">Draft</span>}
                      {isScheduled(post) && <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-purple-100 text-purple-700">Scheduled {new Date(post.scheduledFor).toLocaleDateString()}</span>}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{post.excerpt}</p>
                    <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">{post.author} · {new Date(post.publishedAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => togglePublish(post)} title={(post.status || 'published') === 'published' ? 'Unpublish' : 'Publish'} className="p-2 text-gray-300 hover:text-ticano-charcoal dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                      {(post.status || 'published') === 'published' ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    <button onClick={() => startEdit(post)} title="Edit" className="p-2 text-gray-300 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"><Edit2 size={14} /></button>
                    <button onClick={() => handleDelete(post.id)} title="Delete" className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
    </div>
  );
}

// ---- Careers Management, create / edit / publish / unpublish / delete ----
const CAREER_TYPES = ['Full-time', 'Part-time', 'Internship', 'Voluntary'];
const CAREER_LOCATIONS = ['Gaborone', 'Francistown', 'Maun', 'Palapye', 'Phikwe'];
const TYPE_BADGE = { 'Full-time': 'bg-blue-100 text-blue-700', 'Internship': 'bg-purple-100 text-purple-700', 'Part-time': 'bg-green-100 text-green-700', 'Voluntary': 'bg-amber-100 text-amber-700' };
const blankJob = { title: '', type: 'Full-time', location: 'Gaborone', department: '', description: '', requirements: '', closingDate: '', closingTime: '17:00' };

// closingDate (date input) + closingTime (time input) combine into one ISO
// timestamp for storage/comparison, split back apart for editing.
const splitClosing = (iso) => {
  if (!iso) return { closingDate: '', closingTime: '17:00' };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { closingDate: '', closingTime: '17:00' };
  const pad = (n) => String(n).padStart(2, '0');
  return {
    closingDate: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    closingTime: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
};
const combineClosing = (date, time) => {
  if (!date) return null;
  return new Date(`${date}T${time || '17:00'}:00`).toISOString();
};

function CareersManagement() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(blankJob);

  const load = () => { getAllCareers().then(({ data }) => { setJobs(data); setLoading(false); }).catch((err) => { console.error('[CareersManagement]', err); toast.error('Could not load job listings'); setLoading(false); }); };
  useEffect(load, []);

  const resetForm = () => { setForm(blankJob); setEditingId(null); setShowForm(false); };
  const startCreate = () => { setForm(blankJob); setEditingId(null); setShowForm(true); };
  const startEdit = (j) => {
    setForm({ title: j.title, type: j.type, location: j.location, department: j.department || '', description: j.description || '', requirements: j.requirements || '', ...splitClosing(j.closingDate) });
    setEditingId(j.id); setShowForm(true);
  };

  const save = async () => {
    if (!form.title || !form.description || !form.closingDate) return toast.error('Title, description, and a closing date & time are required');
    setSaving(true);
    try {
      const payload = { ...form, closingDate: combineClosing(form.closingDate, form.closingTime), author: user?.name || 'Marketing Team' };
      if (editingId) { await updateCareer(editingId, payload); toast.success('Position updated'); }
      else { await createCareer(payload); toast.success('Position published to homepage!'); }
      resetForm(); load();
    } catch (err) {
      toast.error(err?.message || 'Could not save this position');
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async (j) => {
    await setCareerActive(j.id, !j.active);
    toast.success(j.active ? 'Position unpublished' : 'Position published');
    load();
  };
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this position permanently?')) return;
    await deleteCareer(id); toast.success('Position removed'); load();
  };

  const inp = 'w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-ticano-red';

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-ticano-charcoal dark:text-white">Careers & Opportunities</h3>
          <p className="text-sm text-gray-500 mt-0.5">Published positions appear live on the Ticano homepage. Unpublish to hide without deleting.</p>
        </div>
        <button onClick={startCreate} className="flex items-center gap-2 px-4 py-2 bg-ticano-red text-white rounded-xl text-sm font-semibold hover:bg-ticano-red-dark transition-colors">
          <Plus size={15} /> Post Position
        </button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-ticano-dark-card rounded-2xl border border-gray-100 dark:border-gray-700 p-5 animate-scale-in">
          <h4 className="font-bold text-gray-800 dark:text-white mb-4">{editingId ? 'Edit Position' : 'New Position'}</h4>
          <div className="space-y-4">
            <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Job Title *</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inp} placeholder="e.g. Portfolio Manager" /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Type</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={inp}>
                  {CAREER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select></div>
              <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Location</label>
                <select value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className={inp}>
                  {CAREER_LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
                </select></div>
              <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Closing Date *</label>
                <input type="date" value={form.closingDate} onChange={(e) => setForm({ ...form, closingDate: e.target.value })} min={new Date().toISOString().split('T')[0]} className={inp} /></div>
              <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Closing Time</label>
                <input type="time" value={form.closingTime} onChange={(e) => setForm({ ...form, closingTime: e.target.value })} className={inp} />
                <p className="text-[11px] text-gray-400 mt-1">Defaults to 5:00 PM (close of business).</p></div>
            </div>
            <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Department</label>
              <input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className={inp} placeholder="e.g. Client Services, Finance, IT" /></div>
            <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Job Description *</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inp + ' resize-none'} rows={3} placeholder="Describe the role and responsibilities…" /></div>
            <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Requirements</label>
              <textarea value={form.requirements} onChange={(e) => setForm({ ...form, requirements: e.target.value })} className={inp + ' resize-none'} rows={2} placeholder="Qualifications, experience, skills…" /></div>
            <div className="flex gap-2 justify-end">
              <button onClick={resetForm} className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300">Cancel</button>
              <button onClick={save} disabled={saving} className="px-4 py-2 rounded-xl bg-ticano-red text-white text-sm font-semibold hover:bg-ticano-red-dark disabled:opacity-60">
                {saving ? 'Saving…' : (editingId ? 'Save changes' : 'Publish to Homepage')}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? <div className="flex justify-center py-10"><div className="w-8 h-8 border-2 border-gray-200 border-t-ticano-red rounded-full animate-spin" /></div>
        : jobs.length === 0 ? <p className="text-center text-gray-400 py-10">No open positions yet.</p>
          : (
            <div className="space-y-3">
              {jobs.map((job, i) => (
                <div key={job.id} className="bg-white dark:bg-ticano-dark-card rounded-xl border border-gray-100 dark:border-gray-700 p-4 flex items-start gap-4 hover:-translate-y-0.5 transition-all shadow-sm animate-fade-up" style={{ animationDelay: `${i * 0.06}s` }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-semibold text-gray-800 dark:text-white text-sm">{job.title}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${TYPE_BADGE[job.type] || 'bg-gray-100 text-gray-600'}`}>{job.type}</span>
                      {job.isExpired
                        ? <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-red-100 text-red-600">Expired</span>
                        : job.active
                          ? <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-green-100 text-green-700">Published</span>
                          : <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-gray-200 text-gray-600">Unpublished</span>}
                    </div>
                    <p className="text-xs text-gray-400 mb-0.5 flex items-center gap-2 flex-wrap">
                      <span className="flex items-center gap-1"><MapPin size={10} />{job.location}</span>
                      <span>· {job.department}</span>
                      <span className="flex items-center gap-1">· <Calendar size={10} />Closes {new Date(job.closingDate).toLocaleString()}</span>
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{job.description}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => togglePublish(job)} title={job.active ? 'Unpublish' : 'Publish'} className="p-2 text-gray-300 hover:text-ticano-charcoal dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                      {job.active ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    <button onClick={() => startEdit(job)} title="Edit" className="p-2 text-gray-300 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"><Edit2 size={14} /></button>
                    <button onClick={() => handleDelete(job.id)} title="Delete" className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
    </div>
  );
}
