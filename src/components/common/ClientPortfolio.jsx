import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import {
  Users, Plus, Upload, Search, Phone, Mail, MessageCircle, MapPin, Star,
  TrendingUp, AlertTriangle, Calendar, X, FileSpreadsheet, CheckCircle2, Download, Edit2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, Modal, StatCard, EmptyState, ExportButton } from './UI';
import {
  getPortfolioClients, getPortfolioClient, createPortfolioClient, updatePortfolioClient,
  updatePortfolioClientContact, addAssistanceRecord, importPortfolioClients, getPortfolioInsights,
  CONTACT_METHODS, ASSISTANCE_STATUSES, INDUSTRIES,
} from '../../services/api';
import { BRANCHES } from '../../utils/constants';
import { useAuth } from '../../context/AuthContext';
import { formatDate } from '../../utils/format';

const FREQ_OPTIONS = [
  { value: '', label: 'Any frequency' },
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({ value: String(n), label: `Assisted ${n} time${n > 1 ? 's' : ''}` })),
  { value: '10+', label: 'Assisted 10+ times' },
];
const TIME_OPTIONS = [
  { value: 'all', label: 'All time' },
  { value: '365', label: 'Last 12 months' },
  { value: '180', label: 'Last 6 months' },
  { value: '90', label: 'Last 3 months' },
  { value: '30', label: 'Last month' },
];

const blankClient = (branch) => ({
  companyName: '', regNumber: '', contactPerson: '', phone: '', email: '',
  branch: branch || 'Gaborone', industry: 'Retail', preferredContactMethod: 'Phone', notes: '',
});
const blankAssistance = () => ({
  assistanceDate: new Date().toISOString().slice(0, 10), poNumber: '', buyerName: '', goodsDescription: '',
  poValue: '', amountFinanced: '', clientContribution: '', industry: '', fundingInstitution: '', branch: '',
  status: 'Funded', notes: '',
});

/**
 * Client Portfolio — CRM for PO financing relationships.
 * mode="pm": full CRUD, scoped to the logged-in Portfolio Manager's own clients.
 * mode="orgwide": read-only oversight for Service Manager / Director — all PMs, all branches.
 */
export default function ClientPortfolio({ mode = 'pm' }) {
  const { user } = useAuth();
  const editable = mode === 'pm';
  const [clients, setClients] = useState([]);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', timeRange: 'all', frequency: '', contactStatus: '', branch: 'All' });

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(blankClient(user?.branch));

  const [showImport, setShowImport] = useState(false);
  const [parsedRows, setParsedRows] = useState([]);
  const [parseError, setParseError] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [fileName, setFileName] = useState('');

  const [profile, setProfile] = useState(null); // 360 view
  const [returnProfileId, setReturnProfileId] = useState(null); // reopen 360 view after a sub-modal action
  const [showAssistance, setShowAssistance] = useState(false);
  const [aForm, setAForm] = useState(blankAssistance());
  const [showEditClient, setShowEditClient] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [showContact, setShowContact] = useState(false);
  const [contactForm, setContactForm] = useState(null);

  const load = () => {
    // PM mode: always scoped to the logged-in PM's own clients only.
    // Org-wide mode (Service Manager / Director): every PM, every branch.
    const scopeFilters = mode === 'pm' ? { pmId: user?.id ?? 2 } : { orgWide: true };
    getPortfolioClients({ ...filters, ...scopeFilters }).then(({ data }) => { setClients(data); setLoading(false); });
    getPortfolioInsights(scopeFilters).then(({ data }) => setInsights(data));
  };
  useEffect(load, [filters.timeRange, filters.frequency, filters.contactStatus, filters.branch]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [filters.search]);

  const openProfile = (id) => getPortfolioClient(id).then(({ data }) => setProfile(data));
  const refreshProfile = () => { if (profile) getPortfolioClient(profile.id).then(({ data }) => setProfile(data)); };
  // Returns to the 360 view (if one was open) once a sub-action modal is dismissed —
  // prevents two full-screen modals being open at once, which was blocking clicks.
  const returnToProfileIfAny = () => {
    if (returnProfileId) { openProfile(returnProfileId); setReturnProfileId(null); }
  };

  // ---- Add client ----
  const submitClient = () => {
    if (!form.companyName.trim()) return toast.error('Company name is required');
    createPortfolioClient(form, { id: user?.id, name: user?.name, branch: user?.branch }).then(() => {
      toast.success('Client added to portfolio');
      setShowAdd(false); setForm(blankClient(user?.branch)); load();
    });
  };

  // ---- Edit client ----
  const startEdit = (c) => { setEditForm({ ...c }); setShowEditClient(true); setReturnProfileId(profile?.id ?? null); setProfile(null); };
  const closeEdit = () => { setShowEditClient(false); setEditForm(null); returnToProfileIfAny(); };
  const submitEdit = () => {
    if (!editForm.companyName.trim()) return toast.error('Company name is required');
    updatePortfolioClient(editForm.id, editForm, user?.name).then(() => {
      toast.success('Client details updated');
      closeEdit(); load();
    });
  };

  // ---- Contact tracking ----
  const startContact = (c) => { setContactForm({ id: c.id, lastContactDate: c.lastContactDate || '', nextFollowUpDate: c.nextFollowUpDate || '', contactStatusNotes: c.contactStatusNotes || '', preferredContactMethod: c.preferredContactMethod || 'Phone' }); setShowContact(true); setReturnProfileId(profile?.id ?? null); setProfile(null); };
  const closeContact = () => { setShowContact(false); setContactForm(null); returnToProfileIfAny(); };
  const submitContact = () => {
    updatePortfolioClientContact(contactForm.id, contactForm, user?.name).then(() => {
      toast.success('Contact record updated');
      closeContact(); load();
    });
  };
  // One-click "I contacted this client today" — no need to open the full form.
  const markContactedToday = (id) => {
    const today = new Date().toISOString().slice(0, 10);
    updatePortfolioClientContact(id, { lastContactDate: today }, user?.name).then(() => {
      toast.success('Marked as contacted today');
      refreshProfile(); load();
    });
  };

  // ---- Assistance ----
  const startAssistance = (clientId, industry, branch) => { setAForm({ ...blankAssistance(), industry: industry || '', branch: branch || '' }); setShowAssistance({ clientId }); setReturnProfileId(profile?.id ?? null); setProfile(null); };
  const closeAssistance = () => { setShowAssistance(false); returnToProfileIfAny(); };
  const submitAssistance = () => {
    if (!showAssistance) return;
    if (!aForm.poNumber.trim()) return toast.error('Purchase Order number is required');
    addAssistanceRecord(showAssistance.clientId, aForm, user?.name).then(() => {
      toast.success('Assistance recorded');
      closeAssistance(); load();
    });
  };

  // ---- Excel import ----
  const FIELD_ALIASES = {
    company: 'companyName', 'company name': 'companyName', client: 'companyName', 'client name': 'companyName', name: 'companyName',
    regnumber: 'regNumber', 'reg number': 'regNumber', 'registration number': 'regNumber', 'company reg': 'regNumber',
    contact: 'contactPerson', 'contact person': 'contactPerson', 'contact name': 'contactPerson',
    phone: 'phone', 'phone number': 'phone', mobile: 'phone', cell: 'phone',
    email: 'email',
    branch: 'branch', office: 'branch',
    industry: 'industry', sector: 'industry',
    clientid: 'clientId', 'client id': 'clientId',
    notes: 'notes', note: 'notes',
  };
  const mapRow = (raw) => {
    const out = {};
    Object.entries(raw).forEach(([k, v]) => {
      const key = String(k).trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
      const field = FIELD_ALIASES[key] || FIELD_ALIASES[key.replace(/\s/g, '')];
      if (field) out[field] = typeof v === 'string' ? v.trim() : v;
    });
    return out;
  };
  const resetImport = () => { setParsedRows([]); setParseError(''); setImportResult(null); setFileName(''); };
  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name); setParseError(''); setImportResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target.result, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        if (!json.length) { setParseError('The file appears to be empty.'); setParsedRows([]); return; }
        const mapped = json.map(mapRow).filter((r) => r.companyName);
        if (!mapped.length) { setParseError('No usable rows found. Make sure your file has a Company Name column.'); setParsedRows([]); return; }
        setParsedRows(mapped);
      } catch {
        setParseError('Could not read this file. Please upload a valid .xlsx, .xls, or .csv file.');
        setParsedRows([]);
      }
    };
    reader.onerror = () => setParseError('Failed to read the file.');
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };
  const downloadTemplate = () => {
    const sample = [
      { 'Company Name': 'Mosweu Trading', 'Reg Number': 'BW00012345', 'Contact Person': 'Kabo Mosweu', 'Phone': '+26771000001', 'Email': 'kabo@mosweu.co.bw', 'Branch': 'Gaborone', 'Industry': 'Retail', 'Notes': '' },
    ];
    const ws = XLSX.utils.json_to_sheet(sample);
    ws['!cols'] = [{ wch: 20 }, { wch: 14 }, { wch: 18 }, { wch: 16 }, { wch: 22 }, { wch: 14 }, { wch: 14 }, { wch: 28 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Clients');
    XLSX.writeFile(wb, 'ticano_client_portfolio_template.xlsx');
  };
  const runImport = async () => {
    if (!parsedRows.length) return;
    setImporting(true);
    try {
      const { data } = await importPortfolioClients(parsedRows, { id: user?.id, name: user?.name, branch: user?.branch });
      setImportResult(data);
      toast.success(data.message);
      load();
    } catch { toast.error('Import failed. Please try again.'); }
    finally { setImporting(false); }
  };
  const closeImport = () => { setShowImport(false); resetImport(); };

  const inp = 'w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-ticano-red';
  const sel = 'border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-ticano-red';

  if (loading) return <div className="flex justify-center py-10"><div className="w-8 h-8 border-2 border-gray-200 border-t-ticano-red rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Not-contacted-in-3-months alert */}
      {editable && insights && insights.atRisk.length > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
          <AlertTriangle size={16} className="shrink-0" />
          <span>{insights.atRisk.length} client{insights.atRisk.length > 1 ? 's' : ''} of yours {insights.atRisk.length > 1 ? "haven't" : "hasn't"} been contacted in over 3 months.</span>
          <button onClick={() => setFilters((f) => ({ ...f, contactStatus: 'stale' }))} className="ml-auto text-xs font-semibold underline shrink-0">Review</button>
        </div>
      )}

      {/* Insight layer */}
      {insights && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Portfolio Clients" value={insights.totalClients} icon={Users} color="navy" />
          <StatCard title="Assistance Events" value={insights.totalAssistanceEvents} icon={CheckCircle2} color="red" />
          <StatCard title="Repeat Conversion" value={`${insights.repeatRate}%`} subtitle="clients assisted 2+ times" icon={TrendingUp} color="gold" />
          <StatCard title="At Risk" value={insights.atRisk.length} subtitle="not contacted in 3+ months" icon={AlertTriangle} color="white" />
        </div>
      )}

      {insights && (insights.topClients.length > 0 || insights.atRisk.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card title="Top clients by assistance frequency">
            {insights.topClients.length === 0 ? <p className="text-sm text-gray-400">No assistance recorded yet.</p> : (
              <div className="space-y-2">
                {insights.topClients.map((c) => (
                  <div key={c.clientId} className="flex items-center justify-between text-sm border-b border-gray-50 dark:border-gray-800 pb-2 last:border-0 last:pb-0">
                    <span className="text-gray-700 dark:text-gray-200 font-medium">{c.companyName} <span className="text-gray-400 font-normal">{c.clientId}</span></span>
                    <span className="flex items-center gap-1 text-amber-500 font-semibold"><Star size={13} className="fill-amber-400 text-amber-400" /> {c.assistanceCount}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
          <Card title="Clients at risk" subtitle="Not contacted in the last 3 months">
            {insights.atRisk.length === 0 ? <p className="text-sm text-gray-400">Everyone's up to date 🎯</p> : (
              <div className="space-y-2 max-h-52 overflow-y-auto">
                {insights.atRisk.slice(0, 8).map((c) => (
                  <div key={c.clientId} className="flex items-center justify-between text-sm border-b border-gray-50 dark:border-gray-800 pb-2 last:border-0 last:pb-0">
                    <span className="text-gray-700 dark:text-gray-200 font-medium">{c.companyName} <span className="text-gray-400 font-normal">{c.clientId}</span></span>
                    <span className="text-xs text-red-500">{c.lastContactDate ? `Last: ${formatDate(c.lastContactDate)}` : 'Never contacted'}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Client list */}
      <Card
        title="Client Portfolio"
        subtitle={editable ? 'Clients you have assisted with PO financing — track engagement and retention.' : 'Organisation-wide view of Portfolio Manager client relationships (read-only).'}
        actions={
          <div className="flex gap-2 flex-wrap">
            {editable && <button onClick={() => setShowImport(true)} className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"><Upload size={14} /> Import Excel</button>}
            <ExportButton rows={clients.map((c) => ({
              'Client ID': c.clientId, Company: c.companyName, 'Contact Person': c.contactPerson, Phone: c.phone, Email: c.email,
              Branch: c.branch, Industry: c.industry, 'Times Assisted': c.assistanceCount,
              'Last Contact': c.lastContactDate || '', 'Next Follow-up': c.nextFollowUpDate || '',
              ...(editable ? {} : { 'Portfolio Manager': c.pmName }),
            }))} filename="client_portfolio" />
            {editable && <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 bg-ticano-red text-white rounded-lg text-sm font-semibold hover:bg-ticano-red-dark"><Plus size={14} /> Add Client</button>}
          </div>
        }
      >
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} placeholder="Search company, contact, Client ID…" className={`${sel} w-full pl-8`} />
          </div>
          <select value={filters.timeRange} onChange={(e) => setFilters({ ...filters, timeRange: e.target.value })} className={sel}>
            {TIME_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={filters.frequency} onChange={(e) => setFilters({ ...filters, frequency: e.target.value })} className={sel}>
            {FREQ_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={filters.contactStatus} onChange={(e) => setFilters({ ...filters, contactStatus: e.target.value })} className={sel}>
            <option value="">Any contact status</option>
            <option value="recent">Contacted in last 3 months</option>
            <option value="stale">Not contacted in last 3 months</option>
          </select>
          {!editable && (
            <select value={filters.branch} onChange={(e) => setFilters({ ...filters, branch: e.target.value })} className={sel}>
              <option value="All">All Branches</option>
              {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          )}
        </div>

        {clients.length === 0 ? (
          <EmptyState title="No clients found" message="Try adjusting your filters, or add your first client." icon={Users} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  {['Client ID', 'Company', 'Contact', 'Branch', 'Assisted', 'Last Contact', ...(editable ? [] : ['PM']), ''].map((h) => (
                    <th key={h} className="text-left py-3 px-2 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr key={c.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="py-2.5 px-2 font-mono text-ticano-red font-semibold text-xs">{c.clientId}</td>
                    <td className="py-2.5 px-2 font-medium text-gray-800 dark:text-white">{c.companyName}</td>
                    <td className="py-2.5 px-2 text-gray-500 text-xs">{c.contactPerson}</td>
                    <td className="py-2.5 px-2 text-gray-500 text-xs">{c.branch}</td>
                    <td className="py-2.5 px-2"><span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600"><Star size={11} className="fill-amber-400 text-amber-400" />{c.assistanceCount}×</span></td>
                    <td className="py-2.5 px-2 text-xs">
                      {c.lastContactDate ? (
                        <span className={c.contactedRecently ? 'text-green-600' : 'text-red-500'}>{formatDate(c.lastContactDate)}</span>
                      ) : <span className="text-gray-400">Never</span>}
                    </td>
                    {!editable && <td className="py-2.5 px-2 text-gray-500 text-xs">{c.pmName}</td>}
                    <td className="py-2.5 px-2 text-right whitespace-nowrap">
                      {editable && !c.contactedRecently && (
                        <button onClick={() => markContactedToday(c.id)} className="text-xs text-green-600 font-semibold hover:underline mr-3">Mark contacted</button>
                      )}
                      <button onClick={() => openProfile(c.id)} className="text-xs text-ticano-red font-semibold hover:underline">View →</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add client modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Client to Portfolio" footer={
        <>
          <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300">Cancel</button>
          <button onClick={submitClient} className="px-4 py-2 text-sm rounded-lg bg-ticano-red text-white hover:bg-ticano-red-dark font-semibold">Save Client</button>
        </>
      }>
        <ClientFormFields form={form} setForm={setForm} inp={inp} />
      </Modal>

      {/* Edit client modal */}
      {editForm && (
        <Modal isOpen={showEditClient} onClose={closeEdit} title={`Edit ${editForm.companyName}`} footer={
          <>
            <button onClick={closeEdit} className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300">Cancel</button>
            <button onClick={submitEdit} className="px-4 py-2 text-sm rounded-lg bg-ticano-red text-white hover:bg-ticano-red-dark font-semibold">Save Changes</button>
          </>
        }>
          <p className="text-xs text-gray-400 mb-3">Client ID <span className="font-mono font-semibold text-ticano-red">{editForm.clientId}</span> is permanent and cannot be edited.</p>
          <ClientFormFields form={editForm} setForm={setEditForm} inp={inp} />
        </Modal>
      )}

      {/* Contact update modal */}
      {contactForm && (
        <Modal isOpen={showContact} onClose={closeContact} title="Update Contact Record" footer={
          <>
            <button onClick={closeContact} className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300">Cancel</button>
            <button onClick={submitContact} className="px-4 py-2 text-sm rounded-lg bg-ticano-red text-white hover:bg-ticano-red-dark font-semibold">Save</button>
          </>
        }>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Last Contact Date"><input type="date" className={inp} value={contactForm.lastContactDate || ''} onChange={(e) => setContactForm({ ...contactForm, lastContactDate: e.target.value })} /></Field>
            <Field label="Next Follow-up Date"><input type="date" className={inp} value={contactForm.nextFollowUpDate || ''} onChange={(e) => setContactForm({ ...contactForm, nextFollowUpDate: e.target.value })} /></Field>
            <Field label="Preferred Contact Method">
              <select className={inp} value={contactForm.preferredContactMethod} onChange={(e) => setContactForm({ ...contactForm, preferredContactMethod: e.target.value })}>
                {CONTACT_METHODS.map((m) => <option key={m}>{m}</option>)}
              </select>
            </Field>
            <div className="sm:col-span-2"><Field label="Contact Status Notes"><textarea rows={2} className={inp + ' resize-none'} value={contactForm.contactStatusNotes} onChange={(e) => setContactForm({ ...contactForm, contactStatusNotes: e.target.value })} /></Field></div>
          </div>
        </Modal>
      )}

      {/* Add assistance modal */}
      <Modal isOpen={!!showAssistance} onClose={closeAssistance} title="Log New Assistance" size="lg" footer={
        <>
          <button onClick={closeAssistance} className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300">Cancel</button>
          <button onClick={submitAssistance} className="px-4 py-2 text-sm rounded-lg bg-ticano-red text-white hover:bg-ticano-red-dark font-semibold">Save Assistance</button>
        </>
      }>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Assistance Date"><input type="date" className={inp} value={aForm.assistanceDate} onChange={(e) => setAForm({ ...aForm, assistanceDate: e.target.value })} /></Field>
          <Field label="Purchase Order Number *"><input className={inp} value={aForm.poNumber} onChange={(e) => setAForm({ ...aForm, poNumber: e.target.value })} placeholder="PO-12345" /></Field>
          <Field label="Buyer / End Customer"><input className={inp} value={aForm.buyerName} onChange={(e) => setAForm({ ...aForm, buyerName: e.target.value })} /></Field>
          <Field label="Industry / Sector">
            <select className={inp} value={aForm.industry} onChange={(e) => setAForm({ ...aForm, industry: e.target.value })}>
              <option value="">Select…</option>{INDUSTRIES.map((i) => <option key={i}>{i}</option>)}
            </select>
          </Field>
          <div className="sm:col-span-2"><Field label="Goods / Service Description"><textarea rows={2} className={inp + ' resize-none'} value={aForm.goodsDescription} onChange={(e) => setAForm({ ...aForm, goodsDescription: e.target.value })} /></Field></div>
          <Field label="Purchase Order Value (P)"><input type="number" className={inp} value={aForm.poValue} onChange={(e) => setAForm({ ...aForm, poValue: e.target.value })} /></Field>
          <Field label="Amount Financed (P)"><input type="number" className={inp} value={aForm.amountFinanced} onChange={(e) => setAForm({ ...aForm, amountFinanced: e.target.value })} /></Field>
          <Field label="Client Contribution (P)"><input type="number" className={inp} value={aForm.clientContribution} onChange={(e) => setAForm({ ...aForm, clientContribution: e.target.value })} /></Field>
          <Field label="Funding Institution / Investor"><input className={inp} value={aForm.fundingInstitution} onChange={(e) => setAForm({ ...aForm, fundingInstitution: e.target.value })} placeholder="Optional" /></Field>
          <Field label="Branch">
            <select className={inp} value={aForm.branch} onChange={(e) => setAForm({ ...aForm, branch: e.target.value })}>
              <option value="">Select…</option>{BRANCHES.map((b) => <option key={b}>{b}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select className={inp} value={aForm.status} onChange={(e) => setAForm({ ...aForm, status: e.target.value })}>
              {ASSISTANCE_STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <div className="sm:col-span-2"><Field label="Notes"><textarea rows={2} className={inp + ' resize-none'} value={aForm.notes} onChange={(e) => setAForm({ ...aForm, notes: e.target.value })} /></Field></div>
          <p className="sm:col-span-2 text-xs text-gray-400">Attachments (PO, invoice, contract, delivery docs) can be added once file storage is connected to a backend.</p>
        </div>
      </Modal>

      {/* Import Excel modal */}
      <Modal isOpen={showImport} onClose={closeImport} title="Import Clients from Excel" size="lg" footer={
        !importResult && (
          <>
            <button onClick={closeImport} className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300">Cancel</button>
            <button onClick={runImport} disabled={!parsedRows.length || importing} className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-ticano-red text-white hover:bg-ticano-red-dark font-semibold disabled:opacity-50">
              {importing ? 'Importing…' : `Import ${parsedRows.length || ''} row${parsedRows.length === 1 ? '' : 's'}`}
            </button>
          </>
        )
      }>
        {!importResult ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Upload an Excel (.xlsx, .xls) or CSV file of your clients. Required column: <b>Company Name</b>. Optional: Reg Number, Contact Person, Phone, Email, Branch, Industry, Notes. Existing clients are detected by Client ID, registration number, or phone/email and updated instead of duplicated.
            </p>
            <button onClick={downloadTemplate} className="flex items-center gap-2 text-sm font-medium text-ticano-red hover:underline"><Download size={15} /> Download template spreadsheet</button>
            <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 cursor-pointer hover:border-ticano-red transition-colors text-center">
              <FileSpreadsheet size={26} className="text-ticano-red" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{fileName || 'Choose a spreadsheet to upload'}</span>
              <span className="text-xs text-gray-400">.xlsx, .xls or .csv</span>
              <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} className="hidden" />
            </label>
            {parseError && <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg p-3"><AlertTriangle size={15} className="mt-0.5 shrink-0" /> {parseError}</div>}
            {parsedRows.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Preview · {parsedRows.length} row{parsedRows.length === 1 ? '' : 's'} detected</p>
                <div className="max-h-52 overflow-auto border border-gray-100 dark:border-gray-700 rounded-lg">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0"><tr>{['Company', 'Contact', 'Phone', 'Branch', 'Industry'].map((h) => <th key={h} className="text-left py-2 px-2 text-gray-500 font-medium">{h}</th>)}</tr></thead>
                    <tbody>
                      {parsedRows.slice(0, 50).map((r, i) => (
                        <tr key={i} className="border-t border-gray-100 dark:border-gray-800">
                          <td className="py-1.5 px-2 text-gray-800 dark:text-white">{r.companyName}</td>
                          <td className="py-1.5 px-2 text-gray-500">{r.contactPerson || '—'}</td>
                          <td className="py-1.5 px-2 text-gray-500">{r.phone || '—'}</td>
                          <td className="py-1.5 px-2 text-gray-500">{r.branch || 'Gaborone'}</td>
                          <td className="py-1.5 px-2 text-gray-500">{r.industry || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {parsedRows.length > 50 && <p className="text-xs text-gray-400 mt-1">Showing first 50 of {parsedRows.length} rows. All valid rows will be imported.</p>}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-300"><CheckCircle2 size={20} /> <span className="font-semibold">{importResult.message}</span></div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Received', value: importResult.summary.received },
                { label: 'New Clients', value: importResult.summary.newClients },
                { label: 'Updated', value: importResult.summary.updated },
                { label: 'Invalid', value: importResult.summary.invalid },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-gray-100 dark:border-gray-700 p-3 text-center">
                  <p className="text-xl font-bold text-gray-700 dark:text-gray-200">{s.value}</p>
                  <p className="text-[11px] text-gray-400">{s.label}</p>
                </div>
              ))}
            </div>
            {importResult.invalidRows?.length > 0 && (
              <div className="text-xs text-red-700 bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
                <p className="font-semibold mb-1">Skipped rows requiring manual review:</p>
                {importResult.invalidRows.slice(0, 8).map((d, i) => <span key={i} className="block">• Row {d.row}: {d.reason}</span>)}
              </div>
            )}
            <button onClick={closeImport} className="px-4 py-2 text-sm rounded-lg bg-ticano-red text-white hover:bg-ticano-red-dark font-semibold">Done</button>
          </div>
        )}
      </Modal>

      {/* Client 360 profile */}
      <Modal isOpen={!!profile} onClose={() => setProfile(null)} title={profile?.companyName || ''} size="xl">
        {profile && (
          <div className="space-y-5">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <p className="font-mono text-ticano-red font-semibold text-sm">{profile.clientId}</p>
                <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500">
                  {profile.contactPerson && <span className="flex items-center gap-1"><Users size={12} />{profile.contactPerson}</span>}
                  {profile.phone && <span className="flex items-center gap-1"><Phone size={12} />{profile.phone}</span>}
                  {profile.email && <span className="flex items-center gap-1"><Mail size={12} />{profile.email}</span>}
                  <span className="flex items-center gap-1"><MapPin size={12} />{profile.branch}</span>
                </div>
              </div>
              {editable && (
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => startEdit(profile)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"><Edit2 size={12} /> Edit</button>
                  <button onClick={() => markContactedToday(profile.id)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-green-300 dark:border-green-700 rounded-lg text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20"><CheckCircle2 size={12} /> Contacted Today</button>
                  <button onClick={() => startContact(profile)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"><MessageCircle size={12} /> Update Contact</button>
                  <button onClick={() => startAssistance(profile.id, profile.industry, profile.branch)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-ticano-red text-white rounded-lg font-semibold hover:bg-ticano-red-dark"><Plus size={12} /> Add Assistance</button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border border-gray-100 dark:border-gray-700 p-3 text-center"><p className="text-xl font-bold text-ticano-charcoal dark:text-white">{profile.assistanceCount}</p><p className="text-[11px] text-gray-400">Times Assisted</p></div>
              <div className="rounded-xl border border-gray-100 dark:border-gray-700 p-3 text-center"><p className={`text-sm font-bold ${profile.contactedRecently ? 'text-green-600' : 'text-red-500'}`}>{profile.contactedRecently ? 'Recent' : 'Overdue'}</p><p className="text-[11px] text-gray-400">Contact Status</p></div>
              <div className="rounded-xl border border-gray-100 dark:border-gray-700 p-3 text-center"><p className="text-sm font-bold text-ticano-charcoal dark:text-white">{profile.lastContactDate ? formatDate(profile.lastContactDate) : '—'}</p><p className="text-[11px] text-gray-400">Last Contact</p></div>
              <div className="rounded-xl border border-gray-100 dark:border-gray-700 p-3 text-center"><p className="text-sm font-bold text-ticano-charcoal dark:text-white">{profile.nextFollowUpDate ? formatDate(profile.nextFollowUpDate) : '—'}</p><p className="text-[11px] text-gray-400">Next Follow-up</p></div>
            </div>

            {profile.contactStatusNotes && (
              <div className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1">Contact Notes</span>{profile.contactStatusNotes}
              </div>
            )}
            {profile.notes && (
              <div className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1">Relationship Notes</span>{profile.notes}
              </div>
            )}

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5"><Calendar size={13} /> Assistance History (latest first)</p>
              {profile.history.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center border border-dashed border-gray-200 dark:border-gray-700 rounded-xl">No assistance recorded yet.</p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {profile.history.map((a) => (
                    <div key={a.id} className="border border-gray-100 dark:border-gray-700 rounded-xl p-3">
                      <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
                        <p className="font-semibold text-sm text-gray-800 dark:text-white">{a.poNumber || 'PO'} — {a.buyerName || 'Buyer not specified'}</p>
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                          a.status === 'Completed' ? 'bg-green-100 text-green-700' :
                          a.status === 'Funded' ? 'bg-blue-100 text-blue-700' :
                          a.status === 'Cancelled' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>{a.status}</span>
                      </div>
                      <p className="text-xs text-gray-500">{a.goodsDescription}</p>
                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                        <span>{formatDate(a.assistanceDate)}</span>
                        <span>PO Value: P{Number(a.poValue).toLocaleString()}</span>
                        <span>Financed: P{Number(a.amountFinanced).toLocaleString()}</span>
                        {a.clientContribution > 0 && <span>Contribution: P{Number(a.clientContribution).toLocaleString()}</span>}
                        {a.fundingInstitution && <span>{a.fundingInstitution}</span>}
                      </div>
                      {a.notes && <p className="text-xs text-gray-400 mt-1.5 italic">{a.notes}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function ClientFormFields({ form, setForm, inp }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="sm:col-span-2"><Field label="Company Name *"><input className={inp} value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} /></Field></div>
      <Field label="Registration Number"><input className={inp} value={form.regNumber} onChange={(e) => setForm({ ...form, regNumber: e.target.value })} /></Field>
      <Field label="Contact Person"><input className={inp} value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} /></Field>
      <Field label="Phone"><input className={inp} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+267…" /></Field>
      <Field label="Email"><input className={inp} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
      <Field label="Branch">
        <select className={inp} value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })}>{BRANCHES.map((b) => <option key={b}>{b}</option>)}</select>
      </Field>
      <Field label="Industry / Sector">
        <select className={inp} value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })}>{INDUSTRIES.map((i) => <option key={i}>{i}</option>)}</select>
      </Field>
      <Field label="Preferred Contact Method">
        <select className={inp} value={form.preferredContactMethod} onChange={(e) => setForm({ ...form, preferredContactMethod: e.target.value })}>{CONTACT_METHODS.map((m) => <option key={m}>{m}</option>)}</select>
      </Field>
      <div className="sm:col-span-2"><Field label="Relationship Notes"><textarea rows={2} className={inp + ' resize-none'} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field></div>
    </div>
  );
}
function Field({ label, children }) {
  return <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>{children}</div>;
}
