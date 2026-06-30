import React, { useState, useEffect } from 'react';
import { UserPlus, Send, Search, ArrowRight, Upload, FileSpreadsheet, Download, CheckCircle2, AlertTriangle, Copy } from 'lucide-react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { Card, Badge, Modal, EmptyState, ExportButton } from './UI';
import { getLeads, createLead, importLeads, updateLeadStatus, convertLead, sendReviewLink } from '../../services/api';
import {
  REFERRAL_SOURCES, LEAD_STATUSES, LEAD_STATUS_BADGE, BRANCHES, INTERESTED_PRODUCTS,
} from '../../utils/constants';
import { useAuth } from '../../context/AuthContext';
import { formatDate } from '../../utils/format';

export default function LeadsModule({ branch }) {
  const { user } = useAuth();
  const [leads, setLeads] = useState([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(blankForm(branch));

  // ---- Bulk Excel/CSV import ----
  const [showImport, setShowImport] = useState(false);
  const [parsedRows, setParsedRows] = useState([]);
  const [parseError, setParseError] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [fileName, setFileName] = useState('');

  useEffect(() => { load(); }, []);
  const load = () => getLeads().then(({ data }) => setLeads(data)).catch(() => {});

  // Header aliases → internal field. Mirrors the manual "New Lead" form.
  const FIELD_ALIASES = {
    name: 'name', 'full name': 'name', fullname: 'name', client: 'name', 'client name': 'name',
    phone: 'phone', 'phone number': 'phone', mobile: 'phone', cell: 'phone', contact: 'phone',
    branch: 'branch', office: 'branch',
    product: 'product', 'interested product': 'product', interest: 'product',
    referralsource: 'referralSource', 'referral source': 'referralSource', referral: 'referralSource', 'how did you hear about us': 'referralSource', source: 'referralSource',
    notes: 'notes', note: 'notes', comment: 'notes', comments: 'notes',
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
    setFileName(file.name);
    setParseError('');
    setImportResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target.result, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        if (!json.length) { setParseError('The file appears to be empty.'); setParsedRows([]); return; }
        const mapped = json.map(mapRow).filter((r) => r.name || r.phone);
        if (!mapped.length) {
          setParseError('No usable rows found. Make sure your file has Name and Phone Number columns.');
          setParsedRows([]);
          return;
        }
        setParsedRows(mapped);
      } catch {
        setParseError('Could not read this file. Please upload a valid .xlsx, .xls, or .csv file.');
        setParsedRows([]);
      }
    };
    reader.onerror = () => setParseError('Failed to read the file.');
    reader.readAsArrayBuffer(file);
    e.target.value = ''; // allow re-selecting the same file
  };

  const downloadTemplate = () => {
    const sample = [
      { 'Full Name': 'Kabo Otsile', 'Phone Number': '+26771000000', 'Branch': 'Gaborone', 'Interested Product': 'PO Financing', 'Referral Source': 'Walk-in', 'Notes': 'Asked about supplier financing' },
      { 'Full Name': 'Neo Bareki', 'Phone Number': '+26772000000', 'Branch': 'Francistown', 'Interested Product': 'Invoice Discounting', 'Referral Source': 'Facebook', 'Notes': '' },
    ];
    const ws = XLSX.utils.json_to_sheet(sample);
    ws['!cols'] = [{ wch: 20 }, { wch: 16 }, { wch: 14 }, { wch: 20 }, { wch: 18 }, { wch: 30 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Leads');
    XLSX.writeFile(wb, 'ticano_potential_clients_template.xlsx');
  };

  const runImport = async () => {
    if (!parsedRows.length) return;
    setImporting(true);
    try {
      const { data } = await importLeads(parsedRows, user?.name || 'Import');
      setImportResult(data);
      toast.success(data.message);
      load();
    } catch {
      toast.error('Import failed. Please try again.');
    } finally {
      setImporting(false);
    }
  };

  const closeImport = () => { setShowImport(false); resetImport(); };

  const submit = () => {
    if (!form.name || !form.phone) return toast.error('Name and phone number are required');
    if (!form.referralSource) return toast.error('Referral source is required');
    if (form.referralSource === 'Other' && !form.referralOther.trim()) return toast.error('Please specify the referral source');
    const payload = { ...form, referralSource: form.referralSource === 'Other' ? `Other: ${form.referralOther}` : form.referralSource };
    createLead(payload).then(() => {
      toast.success('Potential client captured');
      setShowForm(false);
      setForm(blankForm(branch));
      load();
    });
  };

  const changeStatus = (id, status) => {
    updateLeadStatus(id, status).then(() => { toast.success(`Status updated to "${status}"`); load(); });
  };
  const doConvert = (id, name) => {
    convertLead(id).then(() => { toast.success(`${name} converted to customer`); load(); });
  };
  const sendLink = (l) => {
    sendReviewLink({ recipient: l.name, phone: l.phone, type: 'lead' }).then(() => toast.success(`Experience survey sent to ${l.name}`));
  };

  const filtered = leads.filter((l) => {
    const q = query.toLowerCase();
    const matchQ = !q || l.name.toLowerCase().includes(q) || l.phone.includes(query);
    const matchS = !statusFilter || l.status === statusFilter;
    return matchQ && matchS;
  });

  const sel = 'border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-ticano-red';

  return (
    <Card
      title="Potential Clients"
      subtitle="Capture walk-ins and enquiries before they register"
      actions={
        <div className="flex gap-2">
          <ExportButton rows={leads} filename="potential_clients" />
          <button onClick={() => { resetImport(); setShowImport(true); }} className="flex items-center gap-2 px-4 py-2 border border-ticano-red text-ticano-red rounded-lg text-sm font-medium hover:bg-ticano-red-light">
            <Upload size={16} /> Import Excel
          </button>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-ticano-red text-white rounded-lg text-sm font-medium hover:bg-ticano-red-dark">
            <UserPlus size={16} /> New Lead
          </button>
        </div>
      }
    >
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search leads…" className={`${sel} w-full pl-9`} />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={sel}>
          <option value="">All Statuses</option>
          {LEAD_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No potential clients" message="Capture a walk-in or enquiry to start tracking leads." icon={UserPlus} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                {['Name', 'Phone', 'Branch', 'Referral', 'Product', 'Added', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="text-left py-3 px-2 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="py-3 px-2 font-medium text-gray-800 dark:text-white">{l.name}</td>
                  <td className="py-3 px-2 text-gray-500">{l.phone}</td>
                  <td className="py-3 px-2 text-gray-500">{l.branch}</td>
                  <td className="py-3 px-2 text-gray-500">{l.referralSource}</td>
                  <td className="py-3 px-2 text-gray-500">{l.product}</td>
                  <td className="py-3 px-2 text-gray-400">{formatDate(l.addedAt)}</td>
                  <td className="py-3 px-2">
                    <select
                      value={l.status}
                      onChange={(e) => changeStatus(l.id, e.target.value)}
                      disabled={l.status === 'Converted'}
                      className="text-xs border border-gray-200 dark:border-gray-600 rounded-md px-1.5 py-1 bg-white dark:bg-gray-800 dark:text-white disabled:opacity-60"
                    >
                      {LEAD_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      <button onClick={() => sendLink(l)} title="Send review link" className="p-1.5 rounded-md text-ticano-red hover:bg-ticano-red-light">
                        <Send size={14} />
                      </button>
                      {l.status !== 'Converted' && (
                        <button onClick={() => doConvert(l.id, l.name)} title="Convert to customer" className="flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-ticano-charcoal text-white hover:bg-black">
                          Convert <ArrowRight size={12} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Bulk Excel/CSV import modal */}
      <Modal
        open={showImport}
        onClose={closeImport}
        title="Import Potential Clients"
        footer={
          importResult ? (
            <button onClick={closeImport} className="px-4 py-2 text-sm rounded-lg bg-ticano-red text-white hover:bg-ticano-red-dark">Done</button>
          ) : (
            <>
              <button onClick={closeImport} className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300">Cancel</button>
              <button
                onClick={runImport}
                disabled={!parsedRows.length || importing}
                className="px-4 py-2 text-sm rounded-lg bg-ticano-red text-white hover:bg-ticano-red-dark disabled:opacity-50"
              >
                {importing ? 'Importing…' : `Import ${parsedRows.length || ''} lead${parsedRows.length === 1 ? '' : 's'}`}
              </button>
            </>
          )
        }
      >
        {!importResult ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Upload an Excel (.xlsx, .xls) or CSV file with the same details as the New Lead form. Required columns: <b>Full Name</b> and <b>Phone Number</b>. Optional: Branch, Interested Product, Referral Source, Notes.
            </p>

            <button onClick={downloadTemplate} className="flex items-center gap-2 text-sm font-medium text-ticano-red hover:underline">
              <Download size={15} /> Download template spreadsheet
            </button>

            <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 cursor-pointer hover:border-ticano-red transition-colors text-center">
              <FileSpreadsheet size={26} className="text-ticano-red" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{fileName || 'Choose a spreadsheet to upload'}</span>
              <span className="text-xs text-gray-400">.xlsx, .xls or .csv</span>
              <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} className="hidden" />
            </label>

            {parseError && (
              <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
                <AlertTriangle size={15} className="mt-0.5 shrink-0" /> {parseError}
              </div>
            )}

            {parsedRows.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Preview · {parsedRows.length} row{parsedRows.length === 1 ? '' : 's'} detected</p>
                <div className="max-h-52 overflow-auto border border-gray-100 dark:border-gray-700 rounded-lg">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                      <tr>
                        {['Name', 'Phone', 'Branch', 'Product', 'Referral', 'Notes'].map((h) => (
                          <th key={h} className="text-left py-2 px-2 text-gray-500 font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {parsedRows.slice(0, 50).map((r, i) => (
                        <tr key={i} className="border-t border-gray-100 dark:border-gray-800">
                          <td className="py-1.5 px-2 text-gray-800 dark:text-white">{r.name || <span className="text-red-500">— missing —</span>}</td>
                          <td className="py-1.5 px-2 text-gray-500">{r.phone || <span className="text-red-500">— missing —</span>}</td>
                          <td className="py-1.5 px-2 text-gray-500">{r.branch || 'Gaborone'}</td>
                          <td className="py-1.5 px-2 text-gray-500">{r.product || 'General Enquiry'}</td>
                          <td className="py-1.5 px-2 text-gray-500">{r.referralSource || 'Spreadsheet Import'}</td>
                          <td className="py-1.5 px-2 text-gray-400 truncate max-w-[140px]">{r.notes}</td>
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
            <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
              <CheckCircle2 size={20} /> <span className="font-semibold">{importResult.message}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Received', value: importResult.summary.received, icon: FileSpreadsheet, tone: 'text-gray-700 dark:text-gray-200' },
                { label: 'Imported', value: importResult.summary.imported, icon: CheckCircle2, tone: 'text-green-600' },
                { label: 'Duplicates', value: importResult.summary.duplicates, icon: Copy, tone: 'text-amber-600' },
                { label: 'Invalid', value: importResult.summary.invalid, icon: AlertTriangle, tone: 'text-red-600' },
              ].map((s) => {
                const Icon = s.icon;
                return (
                  <div key={s.label} className="rounded-xl border border-gray-100 dark:border-gray-700 p-3 text-center">
                    <Icon size={16} className={`mx-auto mb-1 ${s.tone}`} />
                    <p className={`text-xl font-bold ${s.tone}`}>{s.value}</p>
                    <p className="text-[11px] text-gray-400">{s.label}</p>
                  </div>
                );
              })}
            </div>
            {importResult.duplicates?.length > 0 && (
              <div className="text-xs text-amber-700 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
                <p className="font-semibold mb-1">Skipped duplicates (already in the list):</p>
                {importResult.duplicates.slice(0, 8).map((d, i) => <span key={i} className="block">• {d.name} ({d.phone})</span>)}
                {importResult.duplicates.length > 8 && <span className="block text-amber-600">…and {importResult.duplicates.length - 8} more</span>}
              </div>
            )}
            {importResult.invalid?.length > 0 && (
              <div className="text-xs text-red-700 bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
                <p className="font-semibold mb-1">Skipped invalid rows (missing name or phone):</p>
                {importResult.invalid.slice(0, 8).map((d, i) => <span key={i} className="block">• Row {d.row}: {d.reason}</span>)}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* New lead modal */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title="New Potential Client"
        footer={
          <>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300">Cancel</button>
            <button onClick={submit} className="px-4 py-2 text-sm rounded-lg bg-ticano-red text-white hover:bg-ticano-red-dark">Save Lead</button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Full Name *"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={`${sel} w-full`} /></Field>
          <Field label="Phone Number *"><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+267…" className={`${sel} w-full`} /></Field>
          <Field label="Branch">
            <select value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })} className={`${sel} w-full`}>
              {BRANCHES.map((b) => <option key={b}>{b}</option>)}
            </select>
          </Field>
          <Field label="Interested Product">
            <select value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })} className={`${sel} w-full`}>
              {INTERESTED_PRODUCTS.map((p) => <option key={p}>{p}</option>)}
            </select>
          </Field>
          <Field label="How did you hear about us? *">
            <select value={form.referralSource} onChange={(e) => setForm({ ...form, referralSource: e.target.value })} className={`${sel} w-full`}>
              <option value="">Select source</option>
              {REFERRAL_SOURCES.map((r) => <option key={r}>{r}</option>)}
            </select>
          </Field>
          {form.referralSource === 'Other' && (
            <Field label="Specify *"><input value={form.referralOther} onChange={(e) => setForm({ ...form, referralOther: e.target.value })} className={`${sel} w-full`} /></Field>
          )}
          <div className="sm:col-span-2">
            <Field label="Notes"><textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={`${sel} w-full resize-none`} /></Field>
          </div>
        </div>
      </Modal>
    </Card>
  );
}

function blankForm(branch) {
  return { name: '', phone: '', branch: branch || 'Gaborone', product: 'General Enquiry', referralSource: '', referralOther: '', notes: '' };
}
function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      {children}
    </div>
  );
}
