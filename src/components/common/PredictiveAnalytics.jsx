import React, { useState } from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, Brain, Target, Calendar, Zap } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend,
  AreaChart, Area,
} from 'recharts';

const BRANCH_FORECASTS = [
  { branch:'Gaborone',    current:18, forecast:21, slaRisk:12, trend:'+16%', risk:'medium', score:78, color:'#2563eb' },
  { branch:'Francistown', current:12, forecast:17, slaRisk:35, trend:'+42%', risk:'high',   score:55, color:'#ef4444' },
  { branch:'Maun',        current: 8, forecast: 9, slaRisk: 8, trend:'+13%', risk:'low',    score:84, color:'#10b981' },
  { branch:'Palapye',     current: 6, forecast:10, slaRisk:28, trend:'+67%', risk:'high',   score:61, color:'#f59e0b' },
  { branch:'Phikwe',      current: 4, forecast: 5, slaRisk:10, trend:'+25%', risk:'low',    score:79, color:'#8b5cf6' },
];

const TREND_DATA = [
  { week:'W1', Gaborone:14, Francistown: 9, Maun:6, Palapye:4, Phikwe:3 },
  { week:'W2', Gaborone:16, Francistown:10, Maun:7, Palapye:5, Phikwe:3 },
  { week:'W3', Gaborone:18, Francistown:12, Maun:8, Palapye:6, Phikwe:4 },
  { week:'W4 (forecast)', Gaborone:21, Francistown:17, Maun:9, Palapye:10, Phikwe:5 },
];

const RADAR_DATA = [
  { metric:'CSAT',           Gaborone:90, Francistown:72, Maun:84 },
  { metric:'Resolution Rate', Gaborone:85, Francistown:68, Maun:82 },
  { metric:'SLA Compliance', Gaborone:88, Francistown:55, Maun:90 },
  { metric:'Response Time',  Gaborone:82, Francistown:60, Maun:78 },
  { metric:'Staff Score',    Gaborone:91, Francistown:70, Maun:85 },
];

const CSAT_TREND = [
  { month:'Jan', score:4.1 }, { month:'Feb', score:4.0 }, { month:'Mar', score:4.2 },
  { month:'Apr', score:3.9 }, { month:'May', score:4.3 }, { month:'Jun', score:4.2 },
  { month:'Jul (fcst)', score:4.4 }, { month:'Aug (fcst)', score:4.5 },
];

const RISK_COLORS = { high:'text-red-600 bg-red-50 border-red-200', medium:'text-amber-600 bg-amber-50 border-amber-200', low:'text-green-600 bg-green-50 border-green-200' };
const RISK_ICONS  = { high:AlertTriangle, medium:TrendingUp, low:TrendingDown };

export default function PredictiveAnalytics() {
  const [view, setView] = useState('overview');
  const highRisk = BRANCH_FORECASTS.filter(b => b.risk === 'high');

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Brain size={18} className="text-ticano-red"/>
          <h3 className="font-bold text-ticano-charcoal dark:text-white text-lg">Predictive Analytics</h3>
          <span className="text-xs bg-ticano-red/10 text-ticano-red px-2 py-0.5 rounded-full font-medium">AI-powered</span>
        </div>
        <div className="flex gap-1">
          {['overview','trends','radar'].map(v => (
            <button key={v} onClick={()=>setView(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${view===v?'bg-ticano-charcoal text-white':'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* High risk alerts */}
      {highRisk.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {highRisk.map(b => (
            <div key={b.branch} className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 animate-fade-up">
              <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5"/>
              <div>
                <p className="font-semibold text-red-700 dark:text-red-300 text-sm">{b.branch} — High Risk</p>
                <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                  Forecast: <strong>{b.forecast}</strong> complaints next week ({b.trend}) · SLA breach risk: <strong>{b.slaRisk}%</strong>
                </p>
                <p className="text-xs text-red-500 dark:text-red-400 mt-1">Recommendation: Increase staffing or escalate proactively</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Overview — branch forecast cards */}
      {view === 'overview' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {BRANCH_FORECASTS.map((b, i) => {
              const Icon = RISK_ICONS[b.risk];
              return (
                <div key={b.branch} className="bg-white dark:bg-ticano-dark-card rounded-xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm hover:-translate-y-0.5 transition-all duration-200 animate-fade-up"
                  style={{animationDelay:`${i*0.07}s`}}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-semibold text-gray-800 dark:text-white text-sm">{b.branch}</p>
                    <span className={`badge border text-xs ${RISK_COLORS[b.risk]}`}>
                      <Icon size={10}/> {b.risk} risk
                    </span>
                  </div>
                  <div className="flex items-end justify-between mb-3">
                    <div>
                      <p className="text-2xl font-black" style={{color:b.color}}>{b.forecast}</p>
                      <p className="text-xs text-gray-400">forecast next week</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-700 dark:text-gray-300">{b.current}</p>
                      <p className="text-xs text-gray-400">this week</p>
                    </div>
                  </div>
                  {/* Health bar */}
                  <div>
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>Health score</span>
                      <span className="font-semibold" style={{color:b.color}}>{b.score}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{width:`${b.score}%`, background:b.color}}/>
                    </div>
                  </div>
                  <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                    <AlertTriangle size={10}/> SLA breach risk: {b.slaRisk}%
                  </p>
                </div>
              );
            })}
          </div>

          {/* CSAT Forecast */}
          <div className="bg-white dark:bg-ticano-dark-card rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
            <p className="font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
              <Target size={15} className="text-ticano-red"/> CSAT Trend & Forecast
            </p>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={CSAT_TREND}>
                <defs>
                  <linearGradient id="csatGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#CE313C" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#CE313C" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                <XAxis dataKey="month" tick={{fontSize:10}} tickLine={false}/>
                <YAxis domain={[3.5,5]} tick={{fontSize:10}} tickLine={false}/>
                <Tooltip contentStyle={{borderRadius:'10px', border:'1px solid #e5e7eb', fontSize:'12px'}}/>
                <Area type="monotone" dataKey="score" stroke="#CE313C" strokeWidth={2} fill="url(#csatGrad)"
                  strokeDasharray={(d, i) => d.month?.includes('fcst') ? '5,5' : '0'}/>
              </AreaChart>
            </ResponsiveContainer>
            <p className="text-xs text-gray-400 mt-2">Dashed line = AI forecast based on complaint resolution trends</p>
          </div>
        </>
      )}

      {/* Trends view */}
      {view === 'trends' && (
        <div className="bg-white dark:bg-ticano-dark-card rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
          <p className="font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <Calendar size={15} className="text-ticano-red"/> Weekly Complaint Volume — All Branches
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={TREND_DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
              <XAxis dataKey="week" tick={{fontSize:10}} tickLine={false}/>
              <YAxis tick={{fontSize:10}} tickLine={false}/>
              <Tooltip contentStyle={{borderRadius:'10px', border:'1px solid #e5e7eb', fontSize:'12px'}}/>
              <Legend wrapperStyle={{fontSize:'11px'}}/>
              {BRANCH_FORECASTS.map(b => (
                <Line key={b.branch} type="monotone" dataKey={b.branch} stroke={b.color} strokeWidth={2}
                  dot={{r:4}} activeDot={{r:6}}
                  strokeDasharray={b.branch === 'Gaborone' ? '0' : undefined}/>
              ))}
            </LineChart>
          </ResponsiveContainer>
          <p className="text-xs text-gray-400 mt-2">Week 4 values are AI forecasts based on current velocity</p>
        </div>
      )}

      {/* Radar view */}
      {view === 'radar' && (
        <div className="bg-white dark:bg-ticano-dark-card rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
          <p className="font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <Zap size={15} className="text-ticano-red"/> Branch Capability Radar — Top 3 Branches
          </p>
          <ResponsiveContainer width="100%" height={320}>
            <RadarChart data={RADAR_DATA}>
              <PolarGrid stroke="#e5e7eb"/>
              <PolarAngleAxis dataKey="metric" tick={{fontSize:10}}/>
              <PolarRadiusAxis angle={30} domain={[0,100]} tick={{fontSize:9}}/>
              <Radar name="Gaborone"    dataKey="Gaborone"    stroke="#2563eb" fill="#2563eb" fillOpacity={0.15}/>
              <Radar name="Francistown" dataKey="Francistown" stroke="#ef4444" fill="#ef4444" fillOpacity={0.1}/>
              <Radar name="Maun"        dataKey="Maun"        stroke="#10b981" fill="#10b981" fillOpacity={0.1}/>
              <Legend wrapperStyle={{fontSize:'11px'}}/>
              <Tooltip contentStyle={{borderRadius:'10px', border:'1px solid #e5e7eb', fontSize:'12px'}}/>
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* AI Insights */}
      <div className="bg-gradient-to-br from-ticano-charcoal to-gray-800 rounded-2xl p-5 text-white">
        <div className="flex items-center gap-2 mb-4">
          <Brain size={16} className="text-ticano-red"/>
          <p className="font-bold text-sm">AI Insights — Generated now</p>
        </div>
        <div className="space-y-3">
          {[
            { icon:'🔴', text:'Francistown is trending +42% in complaint volume. At this rate, SLA breaches will increase to 35% by end of month without intervention.' },
            { icon:'🟡', text:'Palapye shows a 67% week-on-week complaint surge. Recommend proactive PM capacity review before Friday.' },
            { icon:'🟢', text:'Gaborone maintains the highest health score (88%) and is projected to achieve 4.5 CSAT by August.' },
            { icon:'💡', text:'Overall network CSAT is projected to reach 4.5/5 by August if current resolution rates are maintained across all branches.' },
          ].map((insight, i) => (
            <div key={i} className="flex items-start gap-3 p-3 bg-white/8 rounded-xl animate-fade-up" style={{animationDelay:`${i*0.08}s`}}>
              <span className="text-base shrink-0">{insight.icon}</span>
              <p className="text-sm text-gray-200 leading-relaxed">{insight.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
