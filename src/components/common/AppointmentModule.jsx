import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, Phone, Plus, Check, X, Edit2, ChevronRight } from 'lucide-react';
import { getAppointments, createAppointment, updateAppointmentStatus, cancelAppointment } from '../../services/api';
import { Modal, Badge, EmptyState, LoadingSpinner } from './UI';
import { useAuth } from '../../context/AuthContext';
import { BRANCHES } from '../../utils/constants';
import toast from 'react-hot-toast';

const STATUS_STYLE = {
  scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  completed:  'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  cancelled:  'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
};

export default function AppointmentModule({ pmId, branch, canCreate = true }) {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [showForm, setShowForm]         = useState(false);
  const [filter, setFilter]             = useState('scheduled');
  const [form, setForm] = useState({ clientName:'', phone:'', date:'', time:'09:00', reason:'', branch: branch || user?.branch || 'Gaborone', pmName: user?.name || '' });

  const load = () => {
    setLoading(true);
    getAppointments({ pmId: pmId || user?.id }).then(({ data }) => { setAppointments(data); setLoading(false); });
  };
  useEffect(load, [pmId]);

  const filtered = appointments.filter(a => filter === 'all' || a.status === filter);

  const handleCreate = async () => {
    if (!form.clientName || !form.date) return toast.error('Client name and date are required');
    try {
      await createAppointment({ ...form, pmId: pmId || user?.id, pmName: form.pmName || user?.name });
      toast.success('Appointment booked and WhatsApp reminder scheduled');
      setShowForm(false);
      setForm({ clientName:'', phone:'', date:'', time:'09:00', reason:'', branch: branch || user?.branch || 'Gaborone', pmName: user?.name || '' });
      load();
    } catch { toast.error('Failed to book appointment'); }
  };

  const handleStatus = async (id, status) => {
    await updateAppointmentStatus(id, status);
    toast.success(status === 'completed' ? 'Marked as completed' : 'Status updated');
    load();
  };
  const handleCancel = async (id) => {
    await cancelAppointment(id);
    toast.success('Appointment cancelled');
    load();
  };

  const inp = 'w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-ticano-red';

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex gap-1">
          {['scheduled','completed','cancelled','all'].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all duration-200 ${filter === s ? 'bg-ticano-charcoal text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
              {s === 'all' ? 'All' : s}
            </button>
          ))}
        </div>
        {canCreate && (
          <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-4 py-2 bg-ticano-red text-white rounded-xl text-sm font-medium hover:bg-ticano-red-dark transition-all duration-200 shadow-sm hover:shadow-md">
            <Plus size={15} /> Book Appointment
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Calendar} title="No appointments" message={`No ${filter} appointments`} />
      ) : (
        <div className="space-y-3">
          {filtered.map((a, i) => (
            <div key={a.id} className="bg-white dark:bg-ticano-dark-card border border-gray-100 dark:border-gray-700 rounded-xl p-4 flex items-start justify-between gap-3 hover-lift animate-fade-up" style={{ animationDelay: `${i*0.06}s` }}>
              <div className="flex gap-3">
                <div className="w-10 h-10 bg-ticano-red/10 rounded-xl flex items-center justify-center shrink-0">
                  <Calendar size={18} className="text-ticano-red" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-gray-900 dark:text-white">{a.clientName}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1"><Calendar size={11}/>{a.date}</span>
                    <span className="flex items-center gap-1"><Clock size={11}/>{a.time}</span>
                    {a.phone && <span className="flex items-center gap-1"><Phone size={11}/>{a.phone}</span>}
                  </div>
                  {a.reason && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">"{a.reason}"</p>}
                  <p className="text-xs text-gray-400 mt-1">{a.pmName} · {a.branch}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[a.status]}`}>{a.status}</span>
                {a.status === 'scheduled' && (
                  <div className="flex gap-1">
                    <button onClick={() => handleStatus(a.id,'completed')} className="p-1.5 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600 hover:bg-green-200 transition-colors" title="Mark complete"><Check size={12}/></button>
                    <button onClick={() => handleCancel(a.id)} className="p-1.5 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 hover:bg-red-200 transition-colors" title="Cancel"><X size={12}/></button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Book Appointment" size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Client Name *</label><input className={inp} value={form.clientName} onChange={e => setForm({...form, clientName: e.target.value})} placeholder="Full name" /></div>
            <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">WhatsApp Number</label><input className={inp} value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="+267 7X XXX XXX" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Date *</label><input type="date" className={inp} value={form.date} onChange={e => setForm({...form, date: e.target.value})} min={new Date().toISOString().split('T')[0]} /></div>
            <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Time</label><input type="time" className={inp} value={form.time} onChange={e => setForm({...form, time: e.target.value})} /></div>
          </div>
          <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Branch</label>
            <select className={inp} value={form.branch} onChange={e => setForm({...form, branch: e.target.value})}>
              {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Purpose / Reason</label><textarea rows={3} className={inp + ' resize-none'} value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} placeholder="e.g. Loan application query, complaint follow-up…" /></div>
          <p className="text-xs text-gray-400">A WhatsApp reminder will be sent to the client automatically.</p>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 text-sm">Cancel</button>
            <button onClick={handleCreate} className="px-4 py-2 rounded-xl bg-ticano-red text-white text-sm font-semibold hover:bg-ticano-red-dark transition-colors">Book Appointment</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
