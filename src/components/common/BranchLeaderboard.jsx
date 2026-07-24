import React, { useState, useEffect } from 'react';
import { Trophy, Star, Award, Medal } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getBranchHealthScores, getBranchComparison } from '../../services/supabaseApi';
import { LoadingSpinner, EmptyState } from './UI';

const RANK_ICON = {
  0: <Trophy size={18} className="text-yellow-500" />,
  1: <Medal size={18} className="text-gray-400" />,
  2: <Award size={18} className="text-amber-600" />,
};

const scoreColor = (score) => {
  if (score >= 85) return 'text-green-600 dark:text-green-400';
  if (score >= 70) return 'text-amber-500';
  return 'text-red-500';
};

const barColor = (score) => {
  if (score >= 85) return 'bg-green-500';
  if (score >= 70) return 'bg-amber-400';
  return 'bg-red-400';
};

export default function BranchLeaderboard() {
  const { user } = useAuth();
  // Director and Service Manager are both org-wide roles (this org has
  // one Service Manager overseeing every branch, not one per branch
  // see migration 022), both see the full cross-branch leaderboard.
  // Only Portfolio Manager, who genuinely belongs to one specific
  // branch, gets the simplified single-branch card below.
  const isOrgWide = user?.role === 'director' || user?.role === 'service_manager';
  const [view, setView] = useState('score');
  const [rows, setRows] = useState(null);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    Promise.all([getBranchHealthScores(), getBranchComparison()])
      .then(([{ data: health }, { data: comparison }]) => {
        const merged = health.map((h) => {
          const c = comparison.find((c) => c.branch === h.branch);
          const total = h.breakdown.total || 1;
          return {
            branch: h.branch,
            score: h.score,
            csat: h.breakdown.avgCsat,
            complaints: h.breakdown.total,
            resolved: Math.round((h.breakdown.resolutionRate / 100) * total),
            sla: Math.max(0, Math.round(100 - h.breakdown.escalationRate)),
            openComplaints: c?.openComplaints ?? 0,
          };
        });
        setRows(merged);
      })
      .catch((err) => { console.error('[BranchLeaderboard]', err); setLoadError(err.message || 'Failed to load'); });
  }, []);

  if (loadError) return <p className="text-xs text-red-500 p-4">Couldn't load branch performance data.</p>;
  if (!rows) return <LoadingSpinner />;
  if (rows.length === 0 || rows.every((r) => r.complaints === 0)) {
    return <EmptyState title="No branch activity yet" message="Branch performance will appear here once complaints start coming in." icon={Trophy} />;
  }

  // Non-directors only see their own branch card, no cross-branch comparison.
  if (!isOrgWide) {
    const myBranch = rows.find(b => b.branch === user?.branch) || rows[0];
    return (
      <div className="bg-white dark:bg-ticano-dark-card rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
        <p className="font-semibold text-gray-800 dark:text-white text-sm mb-4 flex items-center gap-2">
          <Trophy size={15} className="text-yellow-500" /> {myBranch.branch} Branch Performance
        </p>
        <div className="flex items-center gap-4 mb-4">
          <div className={`text-4xl font-bold ${scoreColor(myBranch.score)}`}>{myBranch.score}</div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Health Score</p>
          </div>
        </div>
        <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full mb-4">
          <div className={`h-full ${barColor(myBranch.score)} rounded-full transition-all duration-700`} style={{width:`${myBranch.score}%`}} />
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          {[['CSAT', myBranch.csat ? myBranch.csat+'/5' : '-'],['SLA Rate', myBranch.sla+'%'],['Resolved', myBranch.resolved+'/'+myBranch.complaints]].map(([l,v])=>(
            <div key={l} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-2.5">
              <p className="text-xs text-gray-400 mb-0.5">{l}</p>
              <p className="text-sm font-bold text-gray-800 dark:text-white">{v}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Director sees full leaderboard
  const sorted = [...rows].sort((a,b) =>
    view === 'score' ? b.score - a.score
    : view === 'csat' ? b.csat - a.csat
    : b.sla - a.sla
  );

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Trophy size={18} className="text-yellow-500" />
          <h3 className="font-bold text-gray-800 dark:text-white text-lg">Branch Leaderboard</h3>
        </div>
        <div className="flex gap-1">
          {[['score','Health Score'],['csat','CSAT'],['sla','SLA Rate']].map(([v,l])=>(
            <button key={v} onClick={()=>setView(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${view===v?'bg-ticano-charcoal text-white':'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {sorted.map((b, i) => (
          <div key={b.branch}
            className={`bg-white dark:bg-ticano-dark-card rounded-2xl border p-4 flex items-center gap-4 hover:-translate-y-0.5 transition-all duration-200 shadow-sm animate-fade-up ${
              i===0 ? 'border-yellow-200 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/10' : 'border-gray-100 dark:border-gray-700'
            }`}
            style={{animationDelay:`${i*0.07}s`}}>
            <div className="w-8 h-8 flex items-center justify-center shrink-0">
              {RANK_ICON[i] || <span className="text-sm font-bold text-gray-400">#{i+1}</span>}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-bold text-gray-800 dark:text-white text-sm">{b.branch}</p>
              </div>
              <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className={`h-full ${barColor(view==='score'?b.score:view==='csat'?b.csat*20:b.sla)} rounded-full transition-all duration-700`}
                  style={{width:`${view==='score'?b.score:view==='csat'?b.csat*20:b.sla}%`}} />
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className={`text-2xl font-bold ${scoreColor(view==='score'?b.score:view==='csat'?b.csat*20:b.sla)}`}>
                {view==='score' ? b.score : view==='csat' ? b.csat : b.sla}
                <span className="text-sm ml-0.5">{view==='csat'?'/5':'%'}</span>
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center shrink-0 w-28">
              {[['CSAT',(b.csat||0)+'/5'],['SLA',b.sla+'%']].map(([l,v])=>(
                <div key={l} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-1.5">
                  <p className="text-[9px] text-gray-400">{l}</p>
                  <p className="text-xs font-bold text-gray-700 dark:text-gray-200">{v}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-ticano-charcoal rounded-2xl p-4 text-white text-center">
        <p className="text-sm font-semibold mb-1">Branch of the Week</p>
        <p className="text-2xl font-bold text-yellow-400">{sorted[0]?.branch}</p>
        <p className="text-xs text-gray-400 mt-1">Health Score: {sorted[0]?.score}% · CSAT: {sorted[0]?.csat || '-'}/5</p>
      </div>
    </div>
  );
}
