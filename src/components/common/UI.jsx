import React, { useState, useEffect, useRef } from 'react';
import { Inbox, AlertTriangle, X, ChevronDown } from 'lucide-react';
import { exportRows } from '../../utils/exporter';

// Animated number counter
function AnimatedNumber({ value }) {
  const [display, setDisplay] = useState(0);
  const numVal = parseFloat(String(value).replace(/[^0-9.]/g, '')) || 0;
  useEffect(() => {
    let start = 0;
    const duration = 600;
    const step = numVal / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= numVal) { setDisplay(numVal); clearInterval(timer); }
      else setDisplay(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [numVal]);
  const prefix = String(value).match(/^[^0-9]*/)?.[0] || '';
  const suffix = String(value).replace(/^[^0-9]*[\d.]+/, '');
  return <>{prefix}{display}{suffix}</>;
}

// StatCard
export function StatCard({ title, value, subtitle, icon: Icon, color = 'navy', trend, onClick }) {
  const colorMap = {
    navy:  'bg-ticano-charcoal text-white',
    teal:  'bg-ticano-red text-white',
    red:   'bg-ticano-red text-white',
    gold:  'bg-amber-500 text-gray-900',
    green: 'bg-emerald-600 text-white',
    white: 'bg-white dark:bg-ticano-dark-card text-ticano-text-dark dark:text-white border border-gray-200 dark:border-gray-700',
  };
  return (
    <div
      onClick={onClick}
      className={`rounded-xl p-5 shadow-sm hover-lift ${colorMap[color]} ${onClick ? 'cursor-pointer animate-pulse-glow' : ''}`}
    >
      <div className="flex justify-between items-start">
        <div className="min-w-0">
          <p className="text-sm opacity-75 mb-1">{title}</p>
          <p className="text-2xl font-bold truncate stat-value">
            {typeof value === 'number' ? <AnimatedNumber value={value} /> : value}
          </p>
          {subtitle && <p className="text-xs opacity-60 mt-1">{subtitle}</p>}
          {trend !== undefined && trend !== null && (
            <p className={`text-xs mt-1.5 font-medium ${trend >= 0 ? 'text-green-300' : 'text-red-300'}`}>
              {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}% vs last period
            </p>
          )}
        </div>
        {Icon && <div className="opacity-60 shrink-0 animate-float"><Icon size={28} /></div>}
      </div>
    </div>
  );
}

// StarRating
export function StarRating({ rating, size = 'md' }) {
  const sizes = { sm: 'text-sm', md: 'text-lg', lg: 'text-2xl' };
  return (
    <span className={sizes[size]} aria-label={`${rating} out of 5 stars`}>
      {[1,2,3,4,5].map((star) => (
        <span key={star} className="transition-colors duration-200" style={{ color: star <= Math.round(rating) ? '#FFC107' : '#D1D5DB' }}>★</span>
      ))}
    </span>
  );
}

// Badge
export function Badge({ status }) {
  const map = {
    open:               'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    in_progress:        'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
    resolved:           'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    closed:             'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    high:               'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    medium:             'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
    low:                'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    critical:           'bg-red-200 text-red-900 dark:bg-red-900 dark:text-red-100 font-semibold',
    assigned:           'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300',
    escalated:          'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
    submitted:          'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    pending:            'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    pending_customer:   'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    customer_contacted: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
    created:            'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize transition-colors ${map[status] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>
      {status?.replace(/_/g, ' ')}
    </span>
  );
}

// Card
export function Card({ title, subtitle, actions, children, className = '', animate = false }) {
  return (
    <div className={`bg-white dark:bg-ticano-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 ${animate ? 'animate-fade-up' : ''} ${className}`}>
      {(title || actions) && (
        <div className="flex items-start justify-between mb-4 gap-3 flex-wrap">
          <div>
            {title && <h3 className="text-lg font-semibold text-ticano-charcoal dark:text-white">{title}</h3>}
            {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

// SearchFilters
export function SearchFilters({ onFilter, showSearch=true, showDate=true, showBranch=false, showRating=false, showStatus=false, showPriority=false }) {
  const branches = ['All','Gaborone','Francistown','Maun','Palapye','Phikwe'];
  const sel = 'border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-ticano-dark-card dark:text-white focus:outline-none focus:ring-2 focus:ring-ticano-red transition-all duration-200';
  return (
    <div className="flex flex-wrap gap-3 mb-4 animate-fade-in">
      {showSearch && <input type="text" placeholder="Search…" onChange={e=>onFilter?.('search',e.target.value)} className={`${sel} flex-1 min-w-[160px]`} />}
      {showDate && <select onChange={e=>onFilter?.('dateRange',e.target.value)} className={sel}><option value="30">Last 30 days</option><option value="7">This week</option><option value="1">Today</option><option value="90">Last 90 days</option><option value="365">This year</option></select>}
      {showBranch && <select onChange={e=>onFilter?.('branch',e.target.value)} className={sel}>{branches.map(b=><option key={b} value={b}>{b}</option>)}</select>}
      {showRating && <select onChange={e=>onFilter?.('rating',e.target.value)} className={sel}><option value="">All Ratings</option>{[5,4,3,2,1].map(r=><option key={r} value={r}>{r} Stars</option>)}</select>}
      {showStatus && <select onChange={e=>onFilter?.('status',e.target.value)} className={sel}><option value="">All Status</option><option value="open">Open</option><option value="in_progress">In Progress</option><option value="resolved">Resolved</option><option value="closed">Closed</option></select>}
      {showPriority && <select onChange={e=>onFilter?.('priority',e.target.value)} className={sel}><option value="">All Priority</option><option value="urgent">Urgent</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select>}
    </div>
  );
}

// ExportButton
export function ExportButton({ rows, filename='export', onExport }) {
  const handle = (format) => { if (onExport) return onExport(format); exportRows(rows||[], filename, format); };
  return (
    <div className="flex gap-2">
      <button onClick={()=>handle('csv')} className="px-3 py-1.5 text-sm border border-ticano-red text-ticano-red rounded-lg hover:bg-ticano-red hover:text-white transition-all duration-200 font-medium">CSV</button>
      <button onClick={()=>handle('excel')} className="px-3 py-1.5 text-sm border border-ticano-charcoal text-ticano-charcoal dark:text-white dark:border-white rounded-lg hover:bg-ticano-charcoal hover:text-white transition-all duration-200 font-medium">Excel</button>
    </div>
  );
}

// LoadingSpinner
export function LoadingSpinner({ label = 'Loading…' }) {
  return (
    <div className="flex flex-col justify-center items-center py-16 gap-4">
      <div className="relative w-12 h-12">
        <div className="w-12 h-12 border-4 border-gray-100 dark:border-gray-700 rounded-full" />
        <div className="absolute inset-0 w-12 h-12 border-4 border-transparent border-t-ticano-red rounded-full animate-spin" />
      </div>
      <p className="text-sm text-gray-400 dark:text-gray-500 animate-pulse">{label}</p>
    </div>
  );
}

// SkeletonCard
export function SkeletonCard({ rows = 3 }) {
  return (
    <div className="bg-white dark:bg-ticano-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
      <div className="skeleton h-5 w-1/3 rounded mb-4" />
      {Array.from({length: rows}).map((_,i) => (
        <div key={i} className="skeleton h-4 rounded mb-3" style={{width: `${70+i*10}%`, animationDelay: `${i*0.1}s`}} />
      ))}
    </div>
  );
}

// EmptyState
export function EmptyState({ title='Nothing here yet', message='There is no data to display.', icon: Icon=Inbox, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center animate-fade-in">
      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mb-4">
        <Icon size={28} className="text-gray-400 dark:text-gray-500" />
      </div>
      <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">{title}</p>
      <p className="text-sm text-gray-400 dark:text-gray-500 max-w-xs">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// Modal — with animation
export function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  const sizeMap = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl', full: 'max-w-6xl' };
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className={`relative w-full ${sizeMap[size]} bg-white dark:bg-ticano-dark-card rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 max-h-[90vh] overflow-y-auto animate-scale-in`}>
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-ticano-dark-card z-10">
            <h3 className="font-bold text-gray-900 dark:text-white">{title}</h3>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500">
              <X size={18} />
            </button>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// Tabs — animated active indicator
export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="flex gap-1 mb-6 overflow-x-auto pb-1 scrollbar-hide">
      {tabs.map((tab) => {
        const id = typeof tab === 'string' ? tab : tab.id;
        const label = typeof tab === 'string' ? tab : tab.label;
        const Icon = tab.icon;
        const isActive = active === id;
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 ${
              isActive
                ? 'bg-ticano-charcoal text-white shadow-md scale-[1.02]'
                : 'bg-white dark:bg-ticano-dark-card text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:scale-[1.01]'
            }`}
          >
            {Icon && <Icon size={14} />}
            {label}
          </button>
        );
      })}
    </div>
  );
}

// ProgressBar
export function ProgressBar({ value, max = 100, color = 'red', label, showPercent = true }) {
  const pct = Math.min(100, (value / max) * 100);
  const colors = { red: 'bg-ticano-red', green: 'bg-emerald-500', blue: 'bg-blue-500', amber: 'bg-amber-500', gray: 'bg-gray-400' };
  return (
    <div>
      {(label || showPercent) && (
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          {label && <span>{label}</span>}
          {showPercent && <span className="font-semibold text-gray-700 dark:text-gray-300">{Math.round(pct)}%</span>}
        </div>
      )}
      <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${colors[color] || colors.red} rounded-full progress-animated transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// Accordion
export function Accordion({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm font-medium text-gray-800 dark:text-white"
      >
        {title}
        <ChevronDown size={16} className={`text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="p-4 animate-fade-in">{children}</div>}
    </div>
  );
}

// AlertBanner
export function AlertBanner({ type = 'info', message, onDismiss }) {
  const styles = {
    info:    'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200',
    warning: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200',
    error:   'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200',
    success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200',
  };
  return (
    <div className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-sm animate-slide-down ${styles[type]}`}>
      <div className="flex items-center gap-2"><AlertTriangle size={15} /><span>{message}</span></div>
      {onDismiss && <button onClick={onDismiss} className="shrink-0 opacity-60 hover:opacity-100"><X size={14} /></button>}
    </div>
  );
}

// KPI tile — for director/manager dashboards
export function KpiTile({ label, value, sub, color, icon: Icon, pulse }) {
  const colors = {
    red:   'border-l-ticano-red bg-red-50 dark:bg-red-900/10',
    amber: 'border-l-amber-500 bg-amber-50 dark:bg-amber-900/10',
    green: 'border-l-emerald-500 bg-emerald-50 dark:bg-emerald-900/10',
    blue:  'border-l-blue-500 bg-blue-50 dark:bg-blue-900/10',
    gray:  'border-l-gray-400 bg-gray-50 dark:bg-gray-800',
  };
  return (
    <div className={`border-l-4 rounded-r-xl p-4 hover-lift ${colors[color] || colors.gray} ${pulse ? 'animate-pulse-glow' : ''}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</span>
        {Icon && <Icon size={16} className="text-gray-400" />}
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white stat-value">
        {typeof value === 'number' ? <AnimatedNumber value={value} /> : value}
      </p>
      {sub && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}
