import React, { useState, useEffect } from 'react';
import { Users, UserPlus, TrendingUp, MapPin, Cake, MessageSquare, UserPlus2 } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import Navbar from '../components/common/Navbar';
import { StatCard, Card, Tabs, ExportButton, LoadingSpinner, EmptyState } from '../components/common/UI';
import {
  getMarketingSummary, getReferralSources, getReferralTrends,
  getDemographics, getLocationAnalytics, getCsatTrend, getWordCloud,
  getLeadFunnel, getReferralNetwork, getActiveClientAnalytics,
} from '../services/api';
import { formatPercent } from '../utils/format';

const COLORS = ['#CE313C', '#808686', '#a6abab', '#373435', '#a8252f', '#e0653b', '#7a7a7a'];
const RED = '#CE313C';
const GRAY = '#808686';

export default function MarketingDashboard() {
  const [tab, setTab] = useState('summary');
  const [loading, setLoading] = useState(true);
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
      try {
        const [s, r, rt, d, l, c, w, f, n, ac] = await Promise.all([
          getMarketingSummary(), getReferralSources(), getReferralTrends(),
          getDemographics(), getLocationAnalytics(), getCsatTrend(), getWordCloud(),
          getLeadFunnel(), getReferralNetwork(), getActiveClientAnalytics(),
        ]);
        setSummary(s.data); setReferrals(r.data); setRefTrends(rt.data);
        setDemographics(d.data); setLocations(l.data.locations); setCsat(c.data.trend); setWords(w.data.words);
        setFunnel(f.data); setNetwork(n.data); setActiveClients(ac.data);
      } catch {} finally { setLoading(false); }
    })();
  }, []);

  if (loading || !summary) {
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
        <Tabs
          tabs={[
            { id: 'summary',      label: 'Executive Summary' },
            { id: 'clientmix',    label: 'Client Mix' },
            { id: 'funnel',       label: 'Lead Funnel' },
            { id: 'referrals',    label: 'Referral Analytics' },
            { id: 'other',        label: '"Other" Analysis' },
            { id: 'demographics', label: 'Demographics' },
            { id: 'satisfaction',    label: 'Satisfaction' },
            { id: 'Advanced Charts', label: 'Advanced Charts' },
            { id: 'Reports',         label: 'Reports' },
          ]}
          active={tab}
          onChange={setTab}
        />

        {/* ---------- EXECUTIVE SUMMARY ---------- */}
        {tab === 'summary' && (
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
        )}

        {/* ---------- CLIENT MIX (NEW) ---------- */}
        {tab === 'clientmix' && activeClients && (
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
        )}

        {/* ---------- LEAD FUNNEL ---------- */}
        {tab === 'funnel' && funnel && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Total Leads" value={funnel.funnel[0].count} color="navy" />
              <StatCard title="Converted" value={funnel.funnel[funnel.funnel.length - 1].count} color="teal" />
              <StatCard title="Overall Conversion" value={formatPercent(funnel.funnel[funnel.funnel.length - 1].count / funnel.funnel[0].count * 100)} color="gold" />
              <StatCard title="Referral Customers" value={network?.totalReferralCustomers ?? '—'} color="white" />
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
        )}

        {/* ---------- REFERRAL ANALYTICS ---------- */}
        {tab === 'referrals' && (
          <div className="space-y-6">
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
              <Card title="Referral Trends Over Time">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={refTrends.trend}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="month" /><YAxis /><Tooltip /><Legend />
                    <Line type="monotone" dataKey="Friend or Family" stroke={RED} strokeWidth={2} />
                    <Line type="monotone" dataKey="Facebook" stroke={GRAY} strokeWidth={2} />
                    <Line type="monotone" dataKey="Google" stroke="#FFC107" strokeWidth={2} />
                    <Line type="monotone" dataKey="Walk-in" stroke="#373435" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            </div>
            <Card title="Referral Source by Branch">
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={refTrends.byBranch}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="branch" /><YAxis /><Tooltip /><Legend />
                  <Bar dataKey="Friend or Family" stackId="a" fill={RED} />
                  <Bar dataKey="Facebook" stackId="a" fill={GRAY} />
                  <Bar dataKey="Walk-in" stackId="a" fill="#FFC107" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>
        )}

        {/* ---------- "OTHER" ANALYSIS ---------- */}
        {tab === 'other' && (
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
        {tab === 'demographics' && (
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
        )}

        {/* ---------- SATISFACTION ---------- */}
        {tab === 'satisfaction' && (
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
                      color: COLORS[i % COLORS.length],
                      fontWeight: w.count > 25 ? 700 : 500,
                    }}>
                    {w.word}
                  </span>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>

        {tab === 'Advanced Charts' && (
          <div className="bg-white dark:bg-ticano-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <h3 className="font-bold text-ticano-charcoal dark:text-white text-lg mb-1">Advanced Charts</h3>
            <p className="text-sm text-gray-500 mb-5">Interactive analytics for marketing insights</p>
            <AdvancedCharts />
          </div>
        )}

        {tab === 'Reports' && (
          <div className="bg-white dark:bg-ticano-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <h3 className="font-bold text-ticano-charcoal dark:text-white text-lg mb-1">Marketing Reports</h3>
            <p className="text-sm text-gray-500 mb-5">Generate lead, referral, and acquisition reports</p>
            <ReportsModule availableTypes={['client_satisfaction','monthly_executive']} />
          </div>
        )}

    </div>
  );
}
