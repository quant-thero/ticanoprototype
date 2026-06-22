import React, { useState, useEffect, useRef } from 'react';
import { UserPlus, Send, Search, ArrowRight, Upload, FileSpreadsheet, CheckCircle2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { Card, Badge, Modal, EmptyState, ExportButton } from './UI';
import { getLeads, createLead, updateLeadStatus, convertLead, sendReviewLink, importLeads } from '../../services/api';
import {
  REFERRAL_SOURCES, LEAD_STATUSES, LEAD_STATUS_BADGE, BRANCHES, INTERESTED_PRODUCTS,
} from '../../utils/constants';
import { formatDate } from '../../utils/format';

export default function LeadsModule({ branch }) {
  const [leads, setLeads] = useState([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(blankForm(branch));
  const [showImport, setShowImport] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => { load(); }, []);
  const load = () => getLeads().then(({ data }) => setLeads(data)).catch(() => {});

  // §13 — Bulk upload of potential clients from XLSX / XLS / CSV.
  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportSummary(null);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      if (!rows.length) { toast.error('No rows found in the file'); setImporting(false); return; }
      const { data } = await importLeads(rows, { branch: branch || 'Gaborone', addedBy: 'Bulk Import' });
      setImportSummary(data.summary);
      if (data.leads) setLeads(data.leads); else load();
      toast.success(data.message);
    } catch (err) {
      toast.error('Could not read that file. Please use XLSX, XLS or CSV.');
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      { 'First Name': 'Kabo', 'Last Name': 'Otsile', 'Phone Number': '+26771000099', 'Email': 'kabo@example.com', 'Company Name': 'Otsile Trading', 'Notes': 'Met at expo' },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Leads');
    XLSX.writeFile(wb, 'ticano_leads_template.xlsx');
  };

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
          <button onClick={() => { setShowImport(true); setImportSummary(null); }} className="flex items-center gap-2 px-4 py-2 border border-ticano-charcoal text-ticano-charcoal dark:text-white dark:border-gray-500 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800">
            <Upload size={16} /> Import
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

      {/* §13 — Bulk import modal */}
      <Modal isOpen={showImport} onClose={() => setShowImport(false)} title="Import Potential Clients" size="md">
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
          Upload a spreadsheet to add many leads at once. Accepted formats: <strong>XLSX, XLS, CSV</strong>.
        </p>
        <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700 p-3 mb-4">
          <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Required columns</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            First Name, Last Name, Phone Number, Email, Company Name, Notes. The system validates each row,
            skips duplicates (by phone), imports the valid records and shows a summary.
          </p>
          <button onClick={downloadTemplate} className="mt-2 text-xs text-ticano-red hover:underline flex items-center gap-1">
            <FileSpreadsheet size={13} /> Download template
          </button>
        </div>

        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} className="hidden" />
        <button onClick={() => fileRef.current?.click()} disabled={importing}
          className="w-full flex items-center justify-center gap-2 py-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-600 dark:text-gray-300 hover:border-ticano-red hover:text-ticano-red transition-colors disabled:opacity-60">
          <Upload size={18} /> {importing ? 'Importing…' : 'Choose a file to upload'}
        </button>

        {importSummary && (
          <div className="mt-4 space-y-2">
            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                ['Received', importSummary.received, 'text-gray-700 dark:text-gray-200'],
                ['Imported', importSummary.imported, 'text-green-600'],
                ['Duplicates', importSummary.duplicates, 'text-amber-600'],
                ['Invalid', importSummary.invalid, 'text-red-600'],
              ].map(([label, val, cls]) => (
                <div key={label} className="rounded-xl border border-gray-100 dark:border-gray-700 p-2">
                  <p className={`text-xl font-bold ${cls}`}>{val}</p>
                  <p className="text-[10px] uppercase tracking-wide text-gray-400">{label}</p>
                </div>
              ))}
            </div>
            {importSummary.imported > 0 && (
              <p className="text-xs text-green-700 dark:text-green-400 flex items-center gap-1"><CheckCircle2 size={13} /> Imported records are now in the list above.</p>
            )}
            {importSummary.errors?.length > 0 && (
              <div className="text-xs text-red-600 dark:text-red-400">
                <p className="flex items-center gap-1 font-medium"><AlertTriangle size={13} /> Skipped rows:</p>
                <ul className="list-disc list-inside mt-1 space-y-0.5">
                  {importSummary.errors.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
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
