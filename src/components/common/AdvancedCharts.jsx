import React, { useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area,
  ScatterChart, Scatter, ZAxis, Legend, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, FunnelChart, Funnel, LabelList,
} from 'recharts';
import { BarChart2, TrendingUp, PieChart as PieIcon, Activity } from 'lucide-react';

const RED   = '#CE313C';
const DARK  = '#373435';
const GRAY  = '#808686';
const COLORS = ['#CE313C','#2563eb','#10b981','#f59e0b','#8b5cf6'];

// --- Data sets ---
const COMPLAINT_TREND = [
  { month:'Jan', open:12, resolved:10, escalated:2 },
  { month:'Feb', open:15, resolved:13, escalated:3 },
  { month:'Mar', open:11, resolved:10, escalated:1 },
  { month:'Apr', open:18, resolved:14, escalated:4 },
  { month:'May', open:14, resolved:13, escalated:2 },
  { month:'Jun', open:16, resolved:15, escalated:1 },
];

const BRANCH_BAR = [
  { branch:'Gaborone',    csat:4.5, complaints:18, health:88 },
  { branch:'Francistown', csat:4.1, complaints:12, health:72 },
  { branch:'Maun',        csat:4.3, complaints: 8, health:84 },
  { branch:'Palapye',     csat:3.9, complaints: 6, health:65 },
  { branch:'Phikwe',      csat:4.0, complaints: 4, health:76 },
];

const CATEGORY_PIE = [
  { name:'Payment Issues',     value:28 },
  { name:'Staff Conduct',      value:20 },
  { name:'Application Delays', value:18 },
  { name:'Poor Service',       value:16 },
  { name:'Documentation',      value:12 },
  { name:'Other',              value: 6 },
];

const HEATMAP_DATA = [
  { day:'Mon', '8am':3, '10am':5, '12pm':4, '2pm':6, '4pm':3 },
  { day:'Tue', '8am':2, '10am':7, '12pm':5, '2pm':4, '4pm':2 },
  { day:'Wed', '8am':4, '10am':6, '12pm':8, '2pm':5, '4pm':3 },
  { day:'Thu', '8am':3, '10am':5, '12pm':6, '2pm':7, '4pm':4 },
  { day:'Fri', '8am':5, '10am':8, '12pm':7, '2pm':5, '4pm':2 },
];

const CSAT_DIST = [
  { stars:'⭐ 1', count:3 }, { stars:'⭐⭐ 2', count:5 },
  { stars:'⭐⭐⭐ 3', count:12 }, { stars:'⭐⭐⭐⭐ 4', count:18 },
  { stars:'⭐⭐⭐⭐⭐ 5', count:29 },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-semibold text-gray-700 dark:text-gray-200 mb-1">{label}</p>
      {payload.map((p,i) => (
        <p key={i} style={{color:p.color}} className="font-medium">{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

const HEATMAP_COLS = ['8am','10am','12pm','2pm','4pm'];
const maxVal = Math.max(...HEATMAP_DATA.flatMap(d => HEATMAP_COLS.map(c => d[c] || 0)));

export default function AdvancedCharts({ type = 'all', singleBranch = false }) {
  const ALL_CHARTS = [
    { id:'trend',    icon:TrendingUp, label:'Complaint Trends'    },
    { id:'branch',   icon:BarChart2,  label:'Branch Comparison'   },
    { id:'category', icon:PieIcon,    label:'Issue Breakdown'     },
    { id:'heatmap',  icon:Activity,   label:'Volume Heatmap'      },
    { id:'csat',     icon:BarChart2,  label:'CSAT Distribution'   },
  ];
  // Service Managers only see their own branch — no cross-branch comparison.
  const CHARTS = singleBranch ? ALL_CHARTS.filter((c) => c.id !== 'branch') : ALL_CHARTS;

  const [activeChart, setActiveChart] = useState(CHARTS[0].id);

  return (
    <div className="space-y-4">
      {/* Chart tabs */}
      <div className="flex gap-2 flex-wrap">
        {CHARTS.map(c => {
          const Icon = c.icon;
          return (
            <button key={c.id} onClick={() => setActiveChart(c.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-150 ${activeChart===c.id ? 'bg-ticano-charcoal text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
              <Icon size={12}/>{c.label}
            </button>
          );
        })}
      </div>

      {/* Complaint Trend */}
      {activeChart === 'trend' && (
        <div className="bg-white dark:bg-ticano-dark-card rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm animate-scale-in">
          <p className="font-semibold text-gray-800 dark:text-white mb-4">Complaint Trend — Last 6 Months</p>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={COMPLAINT_TREND}>
              <defs>
                {[['openGrad',RED],['resolvedGrad','#10b981'],['escalatedGrad','#f59e0b']].map(([id,color]) => (
                  <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={color} stopOpacity={0.15}/>
                    <stop offset="95%" stopColor={color} stopOpacity={0}/>
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
              <XAxis dataKey="month" tick={{fontSize:11}} tickLine={false}/>
              <YAxis tick={{fontSize:11}} tickLine={false}/>
              <Tooltip content={<CustomTooltip/>}/>
              <Legend wrapperStyle={{fontSize:'11px'}}/>
              <Area type="monotone" dataKey="open"      name="Open"      stroke={RED}      strokeWidth={2} fill="url(#openGrad)"/>
              <Area type="monotone" dataKey="resolved"  name="Resolved"  stroke="#10b981" strokeWidth={2} fill="url(#resolvedGrad)"/>
              <Area type="monotone" dataKey="escalated" name="Escalated" stroke="#f59e0b" strokeWidth={2} fill="url(#escalatedGrad)"/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Branch comparison */}
      {activeChart === 'branch' && (
        <div className="bg-white dark:bg-ticano-dark-card rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm animate-scale-in">
          <p className="font-semibold text-gray-800 dark:text-white mb-4">Branch Comparison — CSAT & Health Score</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={BRANCH_BAR} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false}/>
              <XAxis dataKey="branch" tick={{fontSize:10}} tickLine={false}/>
              <YAxis yAxisId="left"  tick={{fontSize:10}} tickLine={false} domain={[0,100]}/>
              <YAxis yAxisId="right" orientation="right" tick={{fontSize:10}} tickLine={false} domain={[0,5]}/>
              <Tooltip content={<CustomTooltip/>}/>
              <Legend wrapperStyle={{fontSize:'11px'}}/>
              <Bar yAxisId="left"  dataKey="health" name="Health Score" fill={DARK}  radius={[4,4,0,0]}/>
              <Bar yAxisId="right" dataKey="csat"   name="CSAT"         fill={RED}   radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Category pie */}
      {activeChart === 'category' && (
        <div className="bg-white dark:bg-ticano-dark-card rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm animate-scale-in">
          <p className="font-semibold text-gray-800 dark:text-white mb-4">Issue Category Breakdown</p>
          <div className="flex flex-col lg:flex-row items-center gap-6">
            <ResponsiveContainer width={260} height={260}>
              <PieChart>
                <Pie data={CATEGORY_PIE} cx="50%" cy="50%" innerRadius={60} outerRadius={110}
                  paddingAngle={3} dataKey="value">
                  {CATEGORY_PIE.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
                </Pie>
                <Tooltip contentStyle={{borderRadius:'10px', border:'1px solid #e5e7eb', fontSize:'12px'}}/>
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 flex-1">
              {CATEGORY_PIE.map((cat, i) => (
                <div key={cat.name} className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{background:COLORS[i%COLORS.length]}}/>
                  <span className="flex-1 text-gray-600 dark:text-gray-300">{cat.name}</span>
                  <span className="font-bold text-gray-800 dark:text-white">{cat.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Heatmap */}
      {activeChart === 'heatmap' && (
        <div className="bg-white dark:bg-ticano-dark-card rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm animate-scale-in">
          <p className="font-semibold text-gray-800 dark:text-white mb-4">Complaint Volume Heatmap — by Day & Time</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="text-left text-gray-400 font-normal pb-2 pr-3 w-12">Day</th>
                  {HEATMAP_COLS.map(c => <th key={c} className="text-center text-gray-400 font-normal pb-2 px-1">{c}</th>)}
                </tr>
              </thead>
              <tbody>
                {HEATMAP_DATA.map(row => (
                  <tr key={row.day}>
                    <td className="text-gray-500 dark:text-gray-400 font-medium py-1 pr-3">{row.day}</td>
                    {HEATMAP_COLS.map(col => {
                      const val = row[col] || 0;
                      const intensity = val / maxVal;
                      return (
                        <td key={col} className="px-1 py-1">
                          <div className="w-full h-9 rounded-lg flex items-center justify-center text-xs font-bold transition-all duration-200 hover:scale-105 cursor-default"
                            style={{
                              background: `rgba(206,49,60,${0.1 + intensity * 0.8})`,
                              color: intensity > 0.5 ? 'white' : '#CE313C',
                            }}
                            title={`${row.day} ${col}: ${val} complaints`}>
                            {val}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400 mt-3">Darker = more complaints. Peak: Wednesday midday.</p>
        </div>
      )}

      {/* CSAT Distribution */}
      {activeChart === 'csat' && (
        <div className="bg-white dark:bg-ticano-dark-card rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm animate-scale-in">
          <p className="font-semibold text-gray-800 dark:text-white mb-4">CSAT Score Distribution</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={CSAT_DIST} barSize={40}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false}/>
              <XAxis dataKey="stars" tick={{fontSize:10}} tickLine={false}/>
              <YAxis tick={{fontSize:10}} tickLine={false}/>
              <Tooltip content={<CustomTooltip/>}/>
              <Bar dataKey="count" name="Responses" radius={[6,6,0,0]}>
                {CSAT_DIST.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-3 grid grid-cols-3 gap-3">
            {[['Avg Score','4.2 / 5','text-ticano-red'],['Total Responses','67','text-gray-700 dark:text-white'],['5-Star Rate','43%','text-green-600']].map(([l,v,c])=>(
              <div key={l} className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <p className={`text-lg font-black ${c}`}>{v}</p>
                <p className="text-xs text-gray-400 mt-0.5">{l}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
