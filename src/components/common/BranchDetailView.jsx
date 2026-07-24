import React, { useState, useEffect } from 'react';
import { ArrowLeft, Star, Users, Activity, FolderOpen, CheckCircle, MessageSquare, ShieldAlert } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { StatCard, Card, LoadingSpinner, ExportButton, StarRating } from './UI';
import { getBranchDetail } from '../../services/supabaseApi';
import { formatPercent } from '../../utils/format';

const COLORS = ['#CE313C', '#808686', '#a6abab', '#373435', '#a8252f'];

export default function BranchDetailView({ branch, onBack, onSelectPm }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try { const { data } = await getBranchDetail(branch); setData(data); }
      catch {} finally { setLoading(false); }
    })();
  }, [branch]);

  if (loading || !data) return <LoadingSpinner label={`Loading ${branch}…`} />;

  const o = data.overview;

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-ticano-red hover:underline">
        <ArrowLeft size={16} /> Back to all branches
      </button>

      <div>
        <h2 className="text-2xl font-bold text-ticano-charcoal dark:text-white">{branch} Branch</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Complete branch performance overview</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Average Rating" value={o.avgRating.toFixed(1)} icon={Star} color="gold" />
        <StatCard title="Total Feedback" value={o.totalFeedback} icon={MessageSquare} color="navy" />
        <StatCard title="Total Customers" value={o.totalCustomers} icon={Users} color="teal" />
        <StatCard title="Total Interactions" value={o.totalInteractions} icon={Activity} color="white" />
        <StatCard title="Open Complaints" value={o.openComplaints} icon={ShieldAlert} color="red" />
        <StatCard title="Resolved Complaints" value={o.resolvedComplaints} icon={CheckCircle} color="white" />
        <StatCard title="Escalation Rate" value={formatPercent(o.escalationRate)} color="gold" />
      </div>

      <Card title="Portfolio Managers" subtitle="Click a PM to view detailed performance"
        actions={<ExportButton rows={data.portfolioManagers} filename={`${branch}_pms`} />}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                {['Name', 'Avg Rating', 'Total Complaints', 'Open', 'Resolved', 'Resolution Rate'].map((h) => (
                  <th key={h} className="text-left py-3 px-2 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.portfolioManagers.map((pm) => (
                <tr key={pm.pmId} onClick={() => onSelectPm?.(pm)}
                  className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                  <td className="py-3 px-2 font-medium text-ticano-charcoal dark:text-white">{pm.pmName}</td>
                  <td className="py-3 px-2"><StarRating rating={pm.avgRating} size="sm" /> <span className="text-gray-500">{pm.avgRating}</span></td>
                  <td className="py-3 px-2">{pm.totalComplaints}</td>
                  <td className="py-3 px-2">{pm.openComplaints}</td>
                  <td className="py-3 px-2">{pm.resolvedComplaints}</td>
                  <td className="py-3 px-2">{formatPercent(pm.resolutionRate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Rating Trend">
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data.ratingTrend}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="week" /><YAxis domain={[0, 5]} /><Tooltip />
              <Line type="monotone" dataKey="avgRating" stroke="#CE313C" strokeWidth={3} name="Avg Rating" />
            </LineChart>
          </ResponsiveContainer>
        </Card>
        <Card title="Service Type Distribution">
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={data.serviceTypes} dataKey="count" nameKey="type" cx="50%" cy="50%" outerRadius={90} label>
                {data.serviceTypes.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip /><Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>
        <Card title="Customer Locations" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.customerLocations}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="location" /><YAxis /><Tooltip />
              <Bar dataKey="count" fill="#808686" radius={[6, 6, 0, 0]} name="Customers" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
