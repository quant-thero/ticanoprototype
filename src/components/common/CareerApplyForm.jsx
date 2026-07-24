import React, { useState, useRef } from 'react';
import { Upload, Send, CheckCircle2, FileText, X } from 'lucide-react';
import { submitJobApplication } from '../../services/supabaseApi';
import toast from 'react-hot-toast';

const ACCEPTED = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const ACCEPT_ATTR = '.pdf.doc.docx';

export default function CareerApplyForm({ career }) {
  const [form, setForm] = useState({ applicantName: '', email: '', phone: '', coverNote: '' });
  const [cv, setCv] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const fileRef = useRef(null);

  const emailValid = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e).trim());

  const pickFile = (file) => {
    if (!file) return;
    const okType = ACCEPTED.includes(file.type) || /\.(pdf|docx?|)$/i.test(file.name);
    if (!okType) { toast.error('Please upload a PDF, DOC or DOCX file'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('CV must be under 5 MB'); return; }
    const reader = new FileReader();
    reader.onload = () => setCv({ name: file.name, type: file.type, size: file.size, dataUrl: reader.result });
    reader.onerror = () => toast.error('Could not read the file');
    reader.readAsDataURL(file);
  };

  const submit = async () => {
    if (!form.applicantName.trim()) return toast.error('Enter your full name');
    if (!emailValid(form.email)) return toast.error('Enter a valid email address');
    if (!cv) return toast.error('Please upload your CV (PDF, DOC or DOCX)');
    if (submitting || done) return; // guard against double-submit
    setSubmitting(true);
    try {
      await submitJobApplication({
        careerId: career.id, position: career.title,
        applicantName: form.applicantName.trim(), email: form.email.trim(), phone: form.phone.trim(),
        coverNote: form.coverNote.trim(),
        cvFileName: cv.name, cvType: cv.type, cvSize: cv.size, cvDataUrl: cv.dataUrl,
      });
      setDone(true);
      toast.success('Application submitted, our team will be in touch');
    } catch (err) {
      console.error('[CareerApplyForm] submission failed:', err);
      toast.error(err?.message || 'Could not submit your application, please try again');
    } finally {
      setSubmitting(false);
    }
  };

  const inp = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-ticano-red';

  if (done) return (
    <div className="bg-green-50 rounded-xl p-5 border border-green-200 text-center">
      <CheckCircle2 size={28} className="text-green-600 mx-auto mb-2" />
      <p className="font-semibold text-green-800 text-sm">Application received</p>
      <p className="text-xs text-green-700 mt-1">Thank you for applying for {career.title}. Our Service Manager will review your CV and get back to you.</p>
    </div>
  );

  return (
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3">
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Apply for this role</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input className={inp} placeholder="Full name" value={form.applicantName} onChange={(e) => setForm({ ...form, applicantName: e.target.value })} />
        <input className={inp} placeholder="Email address" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      </div>
      <input className={inp} placeholder="Phone number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
      <textarea className={inp + ' resize-none'} rows={3} placeholder="Cover note (optional)" value={form.coverNote} onChange={(e) => setForm({ ...form, coverNote: e.target.value })} />

      <input ref={fileRef} type="file" accept={ACCEPT_ATTR} className="hidden" onChange={(e) => pickFile(e.target.files?.[0])} />
      {!cv ? (
        <button onClick={() => fileRef.current?.click()} className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-xl py-3 text-sm text-gray-500 hover:border-ticano-red hover:text-ticano-red transition-colors">
          <Upload size={15} /> Upload CV (PDF, DOC, DOCX)
        </button>
      ) : (
        <div className="flex items-center justify-between gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2.5">
          <span className="flex items-center gap-2 text-sm text-gray-700 min-w-0"><FileText size={15} className="text-ticano-red shrink-0" /><span className="truncate">{cv.name}</span></span>
          <button onClick={() => setCv(null)} className="text-gray-400 hover:text-red-500 shrink-0"><X size={15} /></button>
        </div>
      )}

      <button onClick={submit} disabled={submitting} className="w-full flex items-center justify-center gap-2 py-2.5 bg-ticano-red text-white rounded-xl text-sm font-semibold hover:bg-ticano-red-dark transition-colors disabled:opacity-60">
        {submitting ? 'Submitting…' : <><Send size={14} /> Submit application</>}
      </button>
    </div>
  );
}
