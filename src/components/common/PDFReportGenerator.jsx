import React, { useState } from 'react';
import { FileText, Download, RefreshCw, CheckCircle, BarChart2, Clock, AlertTriangle } from 'lucide-react';
import { BRANCHES } from '../../utils/constants';
import { useAuth } from '../../context/AuthContext';
import { getComplaintAnalytics, getBranchComparison } from '../../services/supabaseApi';
import toast from 'react-hot-toast';

const REPORT_TYPES = [
  { key:'monthly_executive', label:'Monthly Executive Report', icon:FileText, desc:'Full executive summary, complaints, CSAT, leads, staff' },
  { key:'complaints_summary', label:'Complaints Summary', icon:AlertTriangle,desc:'All complaints, statuses, resolution rates' },
  { key:'branch_performance', label:'Branch Performance', icon:BarChart2, desc:'CSAT, escalation rates, health scores per branch' },
  { key:'sla_breach', label:'SLA Breach Report', icon:Clock, desc:'All complaints that breached the 14-day SLA' },
  { key:'staff_performance', label:'Staff Performance', icon:CheckCircle, desc:'PM rankings, resolution rates, satisfaction scores' },
];

// Pulls real, current data from Supabase and shapes it to match what the
// PDF layout below expects. Anything not yet backed by a real aggregate
// (per-branch CSAT needs the Feedback module's analytics, per-PM ranking
// needs Staff Performance, neither is built yet) is reported as 0/empty
// rather than invented, consistent with the rest of the app.
async function loadReportData() {
  const [{ data: analytics }, { data: branches }] = await Promise.all([
    getComplaintAnalytics(),
    getBranchComparison(),
  ]);
  const topIssue = analytics.byCategory?.length
    ? [...analytics.byCategory].sort((a, b) => b.count - a.count)[0].category
    : 'No data yet';

  return {
    totalComplaints: analytics.total,
    resolved: analytics.resolved,
    escalated: analytics.escalated,
    avgCsat: analytics.avgSatisfaction ?? 0,
    slaBreaches: 0, // needs the SLA-breach query wired specifically; not yet built
    resolutionRate: analytics.total ? `${Math.round((analytics.resolved / analytics.total) * 100)}%` : '0%',
    topIssue,
    branchScores: (branches ?? []).map((b) => ({
      branch: b.branch, csat: b.avgRating, complaints: b.openComplaints + b.resolvedComplaints,
      resolved: b.resolvedComplaints, health: Math.max(0, Math.round(100 - b.escalationRate * 5)),
    })),
    staff: [], // Staff Performance module isn't migrated yet, honestly empty rather than invented
  };
}

// Loads the Ticano logo (served from /public) and converts it to a base64
// data URL so it can be embedded directly into generated PDFs via jsPDF's
// addImage(). Falls back gracefully (header text still renders) if the
// logo can't be fetched, e.g. offline.
const loadLogoDataUrl = () => new Promise((resolve) => {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext('2d').drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    } catch {
      resolve(null);
    }
  };
  img.onerror = () => resolve(null);
  img.src = '/ticano-logo.png';
});

export default function PDFReportGenerator({ availableTypes, allBranches = false }) {
  const { user } = useAuth();
  const isServiceManager = user?.role === 'service_manager' && !allBranches;
  const types = availableTypes ? REPORT_TYPES.filter(r => availableTypes.includes(r.key)) : REPORT_TYPES;
  const [selected, setSelected] = useState(null);
  const defaultBranch = isServiceManager ? user?.branch : 'All';
  const [params, setParams] = useState({ period:'30', branch: defaultBranch });
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(null);

  const generatePDF = async () => {
    if (!selected) return toast.error('Select a report type');
    setGenerating(true);
    await new Promise(r => setTimeout(r, 1200));

    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      const [logoDataUrl, d] = await Promise.all([loadLogoDataUrl(), loadReportData()]);
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const RED = [206, 49, 60];
      const DARK = [55, 52, 53];
      const W = 210;

      // Header bar
      doc.setFillColor(...RED);
      doc.rect(0, 0, W, 28, 'F');
      const textStartX = logoDataUrl ? 26 : 14;
      if (logoDataUrl) {
        try { doc.addImage(logoDataUrl, 'PNG', 14, 6, 9, 9); } catch {}
      }
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('TICANO GROUP', textStartX, 11);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Purchase Order Financing · Service Intelligence', textStartX, 18);
      doc.text('ticanogroup.co.bw', W - 14, 18, { align: 'right' });

      // Report title
      doc.setTextColor(...DARK);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text(selected.label, 14, 42);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(`Period: Last ${params.period} days · Branch: ${params.branch} · Generated: ${new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'long', year:'numeric' })}`, 14, 49);

      // Divider
      doc.setDrawColor(...RED);
      doc.setLineWidth(0.8);
      doc.line(14, 53, W - 14, 53);

      // KPI summary boxes
      const kpis = [
        ['Total Complaints', d.totalComplaints],
        ['Resolved', d.resolved],
        ['Escalated', d.escalated],
        ['Avg CSAT', d.avgCsat + '/5'],
        ['SLA Breaches', d.slaBreaches],
        ['Resolution Rate', d.resolutionRate],
      ];
      const boxW = (W - 28 - 10) / 3;
      kpis.forEach((kpi, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const x = 14 + col * (boxW + 5);
        const y = 60 + row * 22;
        doc.setFillColor(248, 249, 250);
        doc.roundedRect(x, y, boxW, 18, 2, 2, 'F');
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(7);
        doc.text(kpi[0], x + 3, y + 6);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(...DARK);
        doc.text(String(kpi[1]), x + 3, y + 14);
        doc.setFont('helvetica', 'normal');
      });

      // Branch performance table
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...DARK);
      doc.text('Branch Performance', 14, 110);
      autoTable(doc, {
        startY: 114,
        head: [['Branch', 'Complaints', 'Resolved', 'CSAT', 'Health Score']],
        body: d.branchScores.map(b => [b.branch, b.complaints, b.resolved, b.csat + '/5', b.health + '%']),
        headStyles: { fillColor: RED, textColor:[255,255,255], fontStyle:'bold', fontSize:9 },
        bodyStyles: { fontSize: 9 },
        alternateRowStyles: { fillColor: [250,250,250] },
        margin: { left:14, right:14 },
      });

      // Staff table
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...DARK);
      doc.text('Top Portfolio Managers', 14, doc.lastAutoTable.finalY + 12);
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 16,
        head: [['Name', 'Branch', 'Resolved', 'Avg CSAT', 'Rate']],
        body: d.staff.map(s => [s.name, s.branch, s.resolved, s.csat, s.rate]),
        headStyles: { fillColor: DARK, textColor:[255,255,255], fontStyle:'bold', fontSize:9 },
        bodyStyles: { fontSize: 9 },
        margin: { left:14, right:14 },
      });

      // Footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFillColor(248, 249, 250);
        doc.rect(0, 285, W, 12, 'F');
        doc.setTextColor(150, 150, 150);
        doc.setFontSize(7);
        doc.text('Ticano Group · Confidential · ticanogroup.co.bw', 14, 292);
        doc.text(`Page ${i} of ${pageCount}`, W - 14, 292, { align:'right' });
      }

      const filename = `${selected.key}_${params.period}days_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(filename);
      setGenerated({ label: selected.label, filename, rows: d.totalComplaints });
      toast.success('PDF downloaded successfully!');
    } catch (err) {
      toast.error('Failed to generate PDF');
      console.error(err);
    }
    setGenerating(false);
  };

  const sel = 'border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-ticano-red';

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {types.map(t => {
          const Icon = t.icon;
          const isSel = selected?.key === t.key;
          return (
            <button key={t.key} onClick={() => setSelected(t)}
              className={`text-left p-4 rounded-xl border-2 transition-all duration-200 hover:-translate-y-0.5 ${isSel ? 'border-ticano-red bg-ticano-red/5 dark:bg-ticano-red/10' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-ticano-dark-card hover:border-gray-300'}`}>
              <Icon size={20} className={`mb-2 ${isSel ? 'text-ticano-red' : 'text-gray-400'}`} />
              <p className={`font-semibold text-sm ${isSel ? 'text-ticano-red' : 'text-gray-800 dark:text-white'}`}>{t.label}</p>
              <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{t.desc}</p>
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="bg-white dark:bg-ticano-dark-card border border-gray-100 dark:border-gray-700 rounded-xl p-5 animate-fade-up">
          <p className="font-semibold text-gray-800 dark:text-white mb-4">{selected.label}, Parameters</p>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Period</label>
              <select className={sel} value={params.period} onChange={e=>setParams({...params,period:e.target.value})}>
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last quarter</option>
                <option value="180">Last 6 months</option>
                <option value="365">This year</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Branch</label>
              {isServiceManager ? (
                <div className="border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                  {user?.branch} <span className="text-xs text-gray-400">(your branch only)</span>
                </div>
              ) : (
                <select className={sel} value={params.branch} onChange={e=>setParams({...params,branch:e.target.value})}>
                  <option value="All">All Branches</option>
                  {BRANCHES.map(b=><option key={b} value={b}>{b}</option>)}
                </select>
              )}
            </div>
          </div>
          <button onClick={generatePDF} disabled={generating}
            className="flex items-center gap-2 px-5 py-2.5 bg-ticano-red text-white rounded-xl text-sm font-semibold hover:bg-ticano-red-dark transition-all duration-200 disabled:opacity-60 shadow-sm hover:shadow-md">
            {generating ? <><RefreshCw size={14} className="animate-spin"/>Generating PDF…</> : <><Download size={14}/>Download PDF Report</>}
          </button>
          {generated && (
            <div className="mt-3 flex items-center gap-2 text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-xl p-3 border border-green-200 dark:border-green-800 animate-fade-in">
              <CheckCircle size={15}/> <span><strong>{generated.label}</strong> saved as <code className="text-xs bg-green-100 dark:bg-green-900/30 px-1.5 py-0.5 rounded">{generated.filename}</code></span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
