import React, { useState } from 'react';
import { MapPin, Phone, Clock, Mail, ExternalLink, Navigation } from 'lucide-react';
import { BRANCH_INFO } from '../../utils/constants';

// SVG-based map of Botswana with branch markers (no API key needed)
const BOTSWANA_VIEWBOX = "0 0 400 500";

// Approximate pixel positions within the SVG for each branch
const MARKER_POSITIONS = {
  Gaborone:    { x: 175, y: 385 },
  Francistown: { x: 230, y: 190 },
  Maun:        { x: 80,  y: 185 },
  Palapye:     { x: 215, y: 280 },
  Phikwe:      { x: 255, y: 260 },
};

export default function BranchMap({ userLocation = null }) {
  const [selected, setSelected] = useState('Gaborone');
  const branch = BRANCH_INFO[selected];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* SVG Map */}
      <div className="bg-white dark:bg-ticano-dark-card rounded-2xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm">
        <p className="font-semibold text-ticano-charcoal dark:text-white text-sm mb-3 flex items-center gap-2">
          <MapPin size={15} className="text-ticano-red" /> Ticano Branch Locations — Botswana
        </p>
        <div className="relative w-full" style={{ paddingBottom: '125%' }}>
          <svg viewBox={BOTSWANA_VIEWBOX} className="absolute inset-0 w-full h-full" style={{ background: 'linear-gradient(135deg, #e8f4f8 0%, #d4e8f0 100%)' }}>
            {/* Botswana outline - simplified */}
            <path d="M 80 50 L 320 50 L 360 120 L 340 180 L 300 200 L 280 260 L 290 340 L 260 400 L 200 440 L 150 430 L 100 400 L 80 350 L 60 280 L 50 200 L 60 120 Z"
              fill="#f0f7ee" stroke="#94a3b8" strokeWidth="2" />
            {/* Grid lines */}
            {[100,150,200,250,300,350].map(y => <line key={y} x1="50" y1={y} x2="370" y2={y} stroke="#cbd5e1" strokeWidth="0.5" strokeDasharray="4,4"/>)}
            {[80,130,180,230,280,330].map(x => <line key={x} x1={x} y1="40" x2={x} y2="460" stroke="#cbd5e1" strokeWidth="0.5" strokeDasharray="4,4"/>)}
            {/* Branch markers */}
            {Object.entries(MARKER_POSITIONS).map(([name, pos]) => {
              const isSelected = selected === name;
              return (
                <g key={name} onClick={() => setSelected(name)} style={{ cursor: 'pointer' }}>
                  <circle cx={pos.x} cy={pos.y} r={isSelected ? 16 : 12}
                    fill={isSelected ? '#CE313C' : '#fff'}
                    stroke={isSelected ? '#CE313C' : '#94a3b8'}
                    strokeWidth={isSelected ? 0 : 2}
                    style={{ filter: isSelected ? 'drop-shadow(0 2px 8px rgba(206,49,60,0.4))' : 'none' }}
                  />
                  <text x={pos.x} y={pos.y + 1} textAnchor="middle" dominantBaseline="middle"
                    fontSize={isSelected ? 10 : 9} fontWeight="600"
                    fill={isSelected ? '#fff' : '#334155'}>
                    {name === 'Selebi-Phikwe' ? 'PW' : name.slice(0,2).toUpperCase()}
                  </text>
                  <text x={pos.x} y={pos.y + (isSelected ? 24 : 20)} textAnchor="middle"
                    fontSize="8" fill={isSelected ? '#CE313C' : '#64748b'} fontWeight={isSelected ? '700' : '400'}>
                    {name}
                  </text>
                </g>
              );
            })}
            {/* Legend */}
            <g>
              <circle cx="70" cy="460" r="5" fill="#CE313C"/>
              <text x="80" y="464" fontSize="8" fill="#64748b">Selected Branch</text>
              <circle cx="170" cy="460" r="5" fill="#fff" stroke="#94a3b8" strokeWidth="1.5"/>
              <text x="180" y="464" fontSize="8" fill="#64748b">Other Branches</text>
            </g>
          </svg>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {Object.keys(BRANCH_INFO).map(name => (
            <button key={name} onClick={() => setSelected(name)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-all duration-150 font-medium ${selected===name ? 'bg-ticano-red text-white border-ticano-red' : 'border-gray-200 text-gray-500 hover:border-ticano-red/50 dark:border-gray-600 dark:text-gray-400'}`}>
              {name}
            </button>
          ))}
        </div>
      </div>

      {/* Branch info card */}
      <div className="space-y-3">
        <div className="bg-white dark:bg-ticano-dark-card rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 bg-ticano-red rounded-xl flex items-center justify-center shrink-0">
              <MapPin size={18} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold text-ticano-charcoal dark:text-white">{branch.name}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{branch.address}</p>
            </div>
          </div>
          <div className="space-y-3">
            {[
              [Phone, 'Phone', branch.phone],
              [Clock, 'Hours', branch.hours],
              [Mail, 'Email', branch.email],
            ].map(([Icon, label, value]) => (
              <div key={label} className="flex items-center gap-3 text-sm">
                <Icon size={14} className="text-ticano-red shrink-0" />
                <span className="text-gray-500 dark:text-gray-400 w-10 shrink-0">{label}</span>
                <span className="text-gray-700 dark:text-gray-200 font-medium">{value}</span>
              </div>
            ))}
          </div>
          <a href="https://ticanogroup.co.bw" target="_blank" rel="noopener noreferrer"
            className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 bg-ticano-charcoal text-white rounded-xl text-sm font-medium hover:bg-black transition-colors">
            <ExternalLink size={13}/> Visit ticanogroup.co.bw
          </a>
        </div>

        {/* All branches quick list */}
        <div className="bg-white dark:bg-ticano-dark-card rounded-2xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">All Branches</p>
          <div className="space-y-2">
            {Object.entries(BRANCH_INFO).map(([name, b]) => (
              <button key={name} onClick={() => setSelected(name)}
                className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all duration-150 ${selected===name ? 'bg-ticano-red/8 border border-ticano-red/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                <Navigation size={13} className={selected===name ? 'text-ticano-red' : 'text-gray-400'} />
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium truncate ${selected===name ? 'text-ticano-red' : 'text-gray-700 dark:text-gray-200'}`}>{name}</p>
                  <p className="text-xs text-gray-400 truncate">{b.phone}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
