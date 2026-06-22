import React, { useEffect, useState } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, ArrowUpCircle, Gauge, Smile, AlertTriangle, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, LoadingSpinner } from './UI';
import {
  getPmEscalationRates, getFcrRates, getMonthlyCsat, getPmCapacity, getWeeklyReport,
} from '../../services/api';

/**
 * Consolidated V3 performance KPIs.
 *   §1  PM Escalation Rate
 *   §19 First Contact Resolution Rate (FCR)
 *   §8  Monthly CSAT
 *   §16 PM Client Capacity alerts
 *   §15 Weekly analytics report
 *
 * Pass `branch` to scope every figure to a single branch (§9 — Service
 * Managers only see their own branch). Leave it null for the enterprise view
 * (Director / Admin).
 */
export default function PerformanceKpis({ branch = null, scopeLabel }) {
  const [esc, setEsc] = useState(null);
  const [fcr, setFcr] = useState(null);
  const [csat, setCsat] = useState(null);
  const [capacity, setCapacity] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const filters = branch ? { branch } : {};

  useEffect(() => {
    (async () => {
      try {
        const [e, f, c, cap] = await Promise.all([
          getPmEscalationRates(filters), getFcrRates(filters), getMonthlyCsat(filters), getPmCapacity(filters),
        ]);
        setEsc(e.data); setFcr(f.data); setCsat(c.data); setCapacity(cap.data);
      } catch {}
      finally { setLoading(false); }
    })();
  }, [branch]);

  const runWeekly = async () => {
    const { data } = await getWeeklyReport(filters);
    setReport(data);
    toast.success('Weekly report generated — also queued for email delivery');
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Headline KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard icon={ArrowUpCircle} tone="orange"
          label="PM Escalation Rate" value={`${esc?.branchAverage ?? 0}%`}
          sub={`${scopeLabel || (branch || 'All branches')} · monthly`} />
        <KpiCard icon={Gauge} tone="green"
          label="First Contact Resolution" value={`${fcr?.companyWide ?? 0}%`}
          sub="Resolved without escalation" />
        <KpiCard icon={Smile} tone="red"
          label="Monthly CSAT" value={(csat?.currentMonth?.csat ?? 0).toFixed(2)}
          sub={`${csat?.currentMonth?.label || ''} (prev ${csat?.previousMonth?.csat ?? '—'})`} />
      </div>

      {/* §8 Monthly CSAT trend */}
      <Card title="Monthly CSAT" subtitle="Current month, previous month, quarterly & annual trend">
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={csat?.monthlyTrend || []}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="month" fontSize={12} />
              <YAxis domain={[3, 5]} fontSize={12} />
              <Tooltip />
              <Line type="monotone" dataKey="csat" stroke="#CE313C" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
          {(csat?.quarterlyTrend || []).map((q) => (
            <div key={q.quarter} className="rounded-xl border border-gray-100 dark:border-gray-700 p-2 text-center">
              <p className="text-lg font-bold text-ticano-charcoal dark:text-white">{q.csat}</p>
              <p className="text-[10px] uppercase tracking-wide text-gray-400">{q.quarter}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* §1 PM escalation rate + §19 FCR per PM */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="PM Escalation Rate (§1)" subtitle="Escalated ÷ assigned complaints">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={esc?.perPm || []} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis type="number" unit="%" fontSize={11} />
                <YAxis type="category" dataKey="pm" width={110} fontSize={11} />
                <Tooltip />
                <Bar dataKey="escalationRate" fill="#f97316" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span className="flex items-center gap-1 text-green-600"><TrendingDown size={13} /> Best: {esc?.topPerformer?.pm || '—'} ({esc?.topPerformer?.escalationRate ?? '—'}%)</span>
            <span className="flex items-center gap-1 text-orange-600"><TrendingUp size={13} /> Watch: {esc?.bottomPerformer?.pm || '—'} ({esc?.bottomPerformer?.escalationRate ?? '—'}%)</span>
          </div>
        </Card>

        <Card title="First Contact Resolution (§19)" subtitle="Per PM — higher is better">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={fcr?.perPm || []} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis type="number" unit="%" fontSize={11} />
                <YAxis type="category" dataKey="pm" width={110} fontSize={11} />
                <Tooltip />
                <Bar dataKey="fcr" fill="#16a34a" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* §16 Capacity */}
      <Card title="PM Client Capacity (§16)" subtitle="Smart Assignment avoids PMs at capacity">
        {capacity?.alerts?.length > 0 && (
          <div className="mb-3 space-y-1.5">
            {capacity.alerts.map((a, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
                <AlertTriangle size={15} /> {a.message}
              </div>
            ))}
          </div>
        )}
        <div className="space-y-2">
          {(capacity?.capacities || []).map((c) => (
            <div key={c.pmId} className="flex items-center gap-3">
              <span className="w-36 text-sm text-gray-700 dark:text-gray-200 truncate">{c.pmName}</span>
              <div className="flex-1 h-3 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                <div className={`h-full ${c.atCapacity ? 'bg-red-500' : c.nearCapacity ? 'bg-amber-500' : 'bg-green-500'}`} style={{ width: `${Math.min(c.utilisation, 100)}%` }} />
              </div>
              <span className="text-xs text-gray-500 w-24 text-right">{c.currentClients}/{c.maxClients} ({c.utilisation}%)</span>
            </div>
          ))}
        </div>
      </Card>

      {/* §15 Weekly report */}
      <Card title="Weekly Analytics Report (§15)" subtitle="Dashboard notification + email delivery"
        actions={<button onClick={runWeekly} className="flex items-center gap-2 px-4 py-2 bg-ticano-red text-white rounded-lg text-sm font-medium hover:bg-ticano-red-dark"><FileText size={15} /> Generate</button>}>
        {!report ? (
          <p className="text-sm text-gray-500">Generate this week's report for {scopeLabel || (branch || 'all branches')}. It summarises complaints, CSAT, PM rankings, SLA compliance and branch health.</p>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-gray-400">{report.period} · {report.scope} · generated {new Date(report.generatedAt).toLocaleString()}</p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {Object.entries(report.complaints).map(([k, v]) => (
                <div key={k} className="rounded-xl border border-gray-100 dark:border-gray-700 p-2 text-center">
                  <p className="text-lg font-bold text-ticano-charcoal dark:text-white">{v}</p>
                  <p className="text-[10px] uppercase tracking-wide text-gray-400 capitalize">{k}</p>
                </div>
              ))}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              Monthly CSAT <strong>{report.satisfaction.monthlyCsat}</strong> · SLA compliance <strong>{report.performance.slaCompliancePct}%</strong>
            </div>
            <p className="text-xs text-green-600 flex items-center gap-1">✓ Delivered via: {report.delivery.join(', ')}</p>
          </div>
        )}
      </Card>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, sub, tone }) {
  const toneMap = {
    orange: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20',
    green: 'text-green-600 bg-green-50 dark:bg-green-900/20',
    red: 'text-ticano-red bg-ticano-red/10',
  };
  return (
    <div className="bg-white dark:bg-ticano-dark-card rounded-2xl shadow p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}</span>
        <span className={`p-1.5 rounded-lg ${toneMap[tone]}`}><Icon size={16} /></span>
      </div>
      <p className="text-2xl font-bold text-ticano-charcoal dark:text-white">{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
    </div>
  );
}
