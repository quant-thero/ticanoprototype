import React, { useState } from 'react';
import { Trophy, TrendingUp, TrendingDown, Minus, Star, Award, Medal } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const BRANCH_DATA = [
  { branch:'Gaborone',    score:88, csat:4.5, complaints:18, resolved:16, sla:94, trend:'+3', change:'up',   streak:4 },
  { branch:'Maun',        score:84, csat:4.3, complaints: 8, resolved: 7, sla:91, trend:'+1', change:'up',   streak:2 },
  { branch:'Phikwe',      score:76, csat:4.0, complaints: 4, resolved: 3, sla:82, trend:'-2', change:'down', streak:0 },
  { branch:'Francistown', score:72, csat:4.1, complaints:12, resolved: 9, sla:70, trend:'-5', change:'down', streak:0 },
  { branch:'Palapye',     score:65, csat:3.9, complaints: 6, resolved: 4, sla:65, trend:'+4', change:'up',   streak:1 },
];

const RANK_ICON = {
  0: <Trophy size={18} className="text-yellow-500" />,
  1: <Medal  size={18} className="text-gray-400"   />,
  2: <Award  size={18} className="text-amber-600"  />,
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
  const isDirector = user?.role === 'director';
  const [view, setView] = useState('score');

  // Non-directors only see their own branch card — no cross-branch comparison.
  if (!isDirector) {
    const myBranch = BRANCH_DATA.find(b => b.branch === user?.branch) || BRANCH_DATA[0];
    return (
      <div className="bg-white dark:bg-ticano-dark-card rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
        <p className="font-semibold text-gray-800 dark:text-white text-sm mb-4 flex items-center gap-2">
          <Trophy size={15} className="text-yellow-500" /> {myBranch.branch} Branch Performance
        </p>
        <div className="flex items-center gap-4 mb-4">
          <div className={`text-4xl font-black ${scoreColor(myBranch.score)}`}>{myBranch.score}</div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Health Score</p>
            <p className={`text-xs font-semibold mt-0.5 ${myBranch.change==='up'?'text-green-500':myBranch.change==='down'?'text-red-500':'text-gray-400'}`}>
              {myBranch.change==='up'?'↑':myBranch.change==='down'?'↓':'–'} {myBranch.trend} vs last week
            </p>
          </div>
        </div>
        <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full mb-4">
          <div className={`h-full ${barColor(myBranch.score)} rounded-full transition-all duration-700`} style={{width:`${myBranch.score}%`}} />
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          {[['CSAT', myBranch.csat+'/5'],['SLA Rate', myBranch.sla+'%'],['Resolved', myBranch.resolved+'/'+myBranch.complaints]].map(([l,v])=>(
            <div key={l} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-2.5">
              <p className="text-xs text-gray-400 mb-0.5">{l}</p>
              <p className="text-sm font-bold text-gray-800 dark:text-white">{v}</p>
            </div>
          ))}
        </div>
        {myBranch.streak > 0 && (
          <div className="mt-3 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-xl p-2.5">
            <Star size={12}/> {myBranch.streak}-week improvement streak! Keep it up.
          </div>
        )}
      </div>
    );
  }

  // Director sees full leaderboard
  const sorted = [...BRANCH_DATA].sort((a,b) =>
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
          <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full font-medium">Updated weekly</span>
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
              i===0 ? 'border-yellow-200 dark:border-yellow-700 bg-gradient-to-r from-yellow-50 to-white dark:from-yellow-900/10 dark:to-ticano-dark-card' : 'border-gray-100 dark:border-gray-700'
            }`}
            style={{animationDelay:`${i*0.07}s`}}>
            <div className="w-8 h-8 flex items-center justify-center shrink-0">
              {RANK_ICON[i] || <span className="text-sm font-bold text-gray-400">#{i+1}</span>}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-bold text-gray-800 dark:text-white text-sm">{b.branch}</p>
                {b.streak > 0 && <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-full font-medium">🔥 {b.streak}w streak</span>}
              </div>
              <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className={`h-full ${barColor(view==='score'?b.score:view==='csat'?b.csat*20:b.sla)} rounded-full transition-all duration-700`}
                  style={{width:`${view==='score'?b.score:view==='csat'?b.csat*20:b.sla}%`}} />
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className={`text-2xl font-black ${scoreColor(view==='score'?b.score:view==='csat'?b.csat*20:b.sla)}`}>
                {view==='score' ? b.score : view==='csat' ? b.csat : b.sla}
                <span className="text-sm ml-0.5">{view==='csat'?'/5':'%'}</span>
              </p>
              <p className={`text-xs font-medium ${b.change==='up'?'text-green-500':b.change==='down'?'text-red-400':'text-gray-400'}`}>
                {b.change==='up'?'↑':b.change==='down'?'↓':'–'} {b.trend}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center shrink-0 w-28">
              {[['CSAT',b.csat+'/5'],['SLA',b.sla+'%']].map(([l,v])=>(
                <div key={l} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-1.5">
                  <p className="text-[9px] text-gray-400">{l}</p>
                  <p className="text-xs font-bold text-gray-700 dark:text-gray-200">{v}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-gradient-to-r from-ticano-charcoal to-gray-800 rounded-2xl p-4 text-white text-center">
        <p className="text-sm font-semibold mb-1">🏆 Branch of the Week</p>
        <p className="text-2xl font-black text-yellow-400">{sorted[0]?.branch}</p>
        <p className="text-xs text-gray-400 mt-1">Health Score: {sorted[0]?.score}% · CSAT: {sorted[0]?.csat}/5</p>
      </div>
    </div>
  );
}
