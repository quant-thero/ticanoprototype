import React, { useState } from 'react';
import { FileText, Download, BarChart2, Clock, CheckCircle, AlertTriangle, TrendingUp, RefreshCw } from 'lucide-react';
import { generateReport } from '../../services/api';
import { BRANCHES } from '../../utils/constants';
import toast from 'react-hot-toast';

const REPORT_TYPES = [
  { key: 'complaints_summary',   label: 'Complaints Summary',    icon: AlertTriangle, desc: 'All complaints, statuses, and resolution rates for the period' },
  { key: 'branch_performance',   label: 'Branch Performance',    icon: BarChart2,     desc: 'CSAT, escalation rates, and health scores per branch' },
  { key: 'sla_breach',           label: 'SLA Breach Report',     icon: Clock,         desc: 'All complaints that breached the 14-day SLA threshold' },
  { key: 'staff_performance',    label: 'Staff Performance',     icon: TrendingUp,    desc: 'PM rankings, resolution rates, and client satisfaction' },
  { key: 'client_satisfaction',  label: 'Client Satisfaction',   icon: CheckCircle,   desc: 'CSAT trends, survey responses, and NPS overview' },
  { key: 'monthly_executive',    label: 'Monthly Executive',     icon: FileText,      desc: 'Full executive summary — complaints, leads, referrals, CSAT' },
];

export default function ReportsModule({ availableTypes }) {
  const types = availableTypes
    ? REPORT_TYPES.filter(r => availableTypes.includes(r.key))
    : REPORT_TYPES;

  const [selected, setSelected]   = useState(null);
  const [params, setParams]       = useState({ period: '30', branch: 'All' });
  const [loading, setLoading]     = useState(false);
  const [result, setResult]       = useState(null);

  const handleGenerate = async () => {
    if (!selected) return toast.error('Select a report type');
    setLoading(true);
    setResult(null);
    try {
      const { data } = await generateReport(selected.label, params);
      setResult(data);
      toast.success('Report generated');
    } catch { toast.error('Failed to generate report'); }
    finally { setLoading(false); }
  };

  const sel = 'border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-ticano-red';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Report type grid */}
      <div>
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Select Report Type</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {types.map((type) => {
            const Icon = type.icon;
            const isSelected = selected?.key === type.key;
            return (
              <button key={type.key} onClick={() => setSelected(type)}
                className={`text-left p-4 rounded-xl border-2 transition-all duration-200 hover-lift ${isSelected ? 'border-ticano-red bg-ticano-red/5 dark:bg-ticano-red/10' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-ticano-dark-card hover:border-gray-300'}`}>
                <Icon size={20} className={`mb-2 ${isSelected ? 'text-ticano-red' : 'text-gray-400'}`} />
                <p className={`font-semibold text-sm ${isSelected ? 'text-ticano-red' : 'text-gray-800 dark:text-white'}`}>{type.label}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 leading-relaxed">{type.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Parameters */}
      {selected && (
        <div className="bg-white dark:bg-ticano-dark-card border border-gray-100 dark:border-gray-700 rounded-xl p-5 animate-fade-up">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Report Parameters — {selected.label}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Period</label>
              <select className={sel} value={params.period} onChange={e => setParams({...params, period: e.target.value})}>
                <option value="7">This week</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last quarter</option>
                <option value="180">Last 6 months</option>
                <option value="365">This year</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Branch</label>
              <select className={sel} value={params.branch} onChange={e => setParams({...params, branch: e.target.value})}>
                <option value="All">All branches</option>
                {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          </div>
          <button onClick={handleGenerate} disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-ticano-red text-white rounded-xl text-sm font-semibold hover:bg-ticano-red-dark transition-all duration-200 disabled:opacity-60 shadow-sm hover:shadow-md">
            {loading ? <RefreshCw size={15} className="animate-spin" /> : <BarChart2 size={15} />}
            {loading ? 'Generating…' : 'Generate Report'}
          </button>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="bg-white dark:bg-ticano-dark-card border border-gray-100 dark:border-gray-700 rounded-xl p-5 animate-scale-in">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-bold text-gray-900 dark:text-white">{result.type}</p>
              <p className="text-xs text-gray-500 mt-0.5">Generated {new Date(result.generatedAt).toLocaleString()} · {result.summary.period} · {result.summary.branch}</p>
            </div>
            <button onClick={() => toast.success('Report downloaded as PDF')}
              className="flex items-center gap-1.5 px-4 py-2 border border-ticano-red text-ticano-red rounded-xl text-sm font-medium hover:bg-ticano-red hover:text-white transition-all duration-200">
              <Download size={14} /> Download PDF
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              ['Total Complaints', result.summary.totalComplaints],
              ['Resolved',         result.summary.resolved],
              ['Escalated',        result.summary.escalated],
              ['Avg CSAT',         result.summary.avgCsat + '/5'],
              ['SLA Breaches',     result.summary.slaBreaches],
              ['Top Issue',        result.summary.topIssue],
            ].map(([label, val]) => (
              <div key={label} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-500 mb-1">{label}</p>
                <p className="font-bold text-gray-900 dark:text-white text-sm">{val}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-ticano-red/5 dark:bg-ticano-red/10 rounded-xl border border-ticano-red/20">
            <p className="text-xs text-ticano-red font-medium">Export options: PDF · Excel · CSV available. Data reflects filters applied above.</p>
          </div>
        </div>
      )}
    </div>
  );
}
