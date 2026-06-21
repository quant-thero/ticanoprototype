import React, { useState, useEffect } from 'react';
import { UserPlus, Send, Search, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, Badge, Modal, EmptyState, ExportButton } from './UI';
import { getLeads, createLead, updateLeadStatus, convertLead, sendReviewLink } from '../../services/api';
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

  useEffect(() => { load(); }, []);
  const load = () => getLeads().then(({ data }) => setLeads(data)).catch(() => {});

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
