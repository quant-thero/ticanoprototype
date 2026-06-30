import React, { useState, useEffect } from 'react';
import { FileText, Download, Eye, Mail, Phone, Briefcase, Clock, Filter, Send } from 'lucide-react';
import { getJobApplications, getJobApplication, updateApplicationStatus, APPLICATION_STATUSES } from '../../services/api';
import toast from 'react-hot-toast';

const STATUS_STYLE = {
  'New': 'bg-blue-100 text-blue-700',
  'Under Review': 'bg-amber-100 text-amber-700',
  'Shortlisted': 'bg-purple-100 text-purple-700',
  'Rejected': 'bg-gray-200 text-gray-600',
  'Hired': 'bg-green-100 text-green-700',
};

const TICANO_EMAIL = 'info@ticanogroup.co.bw';

// Email templates for applicants who are considered/hired
const EMAIL_TEMPLATES = [
  {
    id: 'shortlisted',
    label: 'Shortlisted for Interview',
    subject: (name, position) => `Re: Your Application for ${position} – Next Steps`,
    body: (name, position) => `Dear ${name},

Thank you for taking the time to apply for the ${position} position at Ticano Group.

We are pleased to inform you that your application has been reviewed and you have been shortlisted for an interview. Our team was impressed by your profile and would like to explore the opportunity further.

We will be in touch shortly to arrange a convenient time for an interview. Please keep an eye on your email for further communication.

Should you have any questions in the meantime, please do not hesitate to reach out to us.

We look forward to speaking with you.

Kind regards,
Ticano Group Human Resources
info@ticanogroup.co.bw
www.ticanogroup.co.bw`,
  },
  {
    id: 'interview_invite',
    label: 'Interview Invitation',
    subject: (name, position) => `Interview Invitation – ${position} at Ticano Group`,
    body: (name, position) => `Dear ${name},

We are excited to invite you for an interview for the ${position} position at Ticano Group.

Please confirm your availability at your earliest convenience so we can schedule a suitable time. The interview will be conducted at our offices or via video call, depending on your location.

Kindly bring the following to your interview:
• A copy of your CV
• Certified copies of your academic certificates
• A valid national ID or passport
• Any other relevant supporting documents

We look forward to meeting you and learning more about how your skills align with our team's goals.

Kind regards,
Ticano Group Human Resources
info@ticanogroup.co.bw
www.ticanogroup.co.bw`,
  },
  {
    id: 'under_review',
    label: 'Application Under Review',
    subject: (name, position) => `Your Application for ${position} – Update`,
    body: (name, position) => `Dear ${name},

Thank you for your interest in the ${position} position at Ticano Group.

We would like to let you know that your application is currently under review. Our team is carefully considering all applications received and will be in touch with you regarding the outcome.

We appreciate your patience during this process and will endeavour to provide feedback as soon as possible.

If you have any questions, please feel free to reach out to us at the contact below.

Kind regards,
Ticano Group Human Resources
info@ticanogroup.co.bw
www.ticanogroup.co.bw`,
  },
  {
    id: 'offer',
    label: 'Job Offer / Hired',
    subject: (name, position) => `Job Offer – ${position} at Ticano Group`,
    body: (name, position) => `Dear ${name},

On behalf of Ticano Group, we are delighted to inform you that following a thorough review of your application and interview for the ${position} position, we would like to offer you this role.

We believe your skills and experience make you an excellent fit for our team, and we are excited about the contribution you will make to Ticano Group.

A formal offer letter with detailed terms and conditions of employment will be sent to you separately. Please review it carefully and do not hesitate to contact us if you have any questions.

We hope you will accept this offer and look forward to welcoming you to the Ticano family!

Kind regards,
Ticano Group Human Resources
info@ticanogroup.co.bw
www.ticanogroup.co.bw`,
  },
];

// Respond modal component
function RespondModal({ application, onClose }) {
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  const selectTemplate = (tpl) => {
    setSelectedTemplate(tpl.id);
    setSubject(tpl.subject(application.applicantName, application.position));
    setBody(tpl.body(application.applicantName, application.position));
  };

  const openGmail = () => {
    if (!subject || !body) return toast.error('Please select a template first');
    const params = new URLSearchParams({
      to: application.email,
      from: TICANO_EMAIL,
      su: subject,
      body: body,
    });
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(application.email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}&from=${encodeURIComponent(TICANO_EMAIL)}`;
    window.open(gmailUrl, '_blank');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white dark:bg-ticano-dark-card rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-ticano-charcoal px-6 py-4 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-white font-bold text-base">Respond to Applicant</h3>
            <p className="text-white/60 text-xs mt-0.5">
              To: <span className="text-white/80">{application.applicantName}</span>
              {' '}·{' '}
              <span className="text-white/60">{application.email}</span>
            </p>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white transition-colors text-xl font-light">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          {/* Template selection */}
          <div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Select a response template:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {EMAIL_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => selectTemplate(tpl)}
                  className={`text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                    selectedTemplate === tpl.id
                      ? 'border-ticano-red bg-ticano-red/5 text-ticano-red dark:bg-ticano-red/10'
                      : 'border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-ticano-red/40 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {tpl.label}
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          {selectedTemplate && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-ticano-red"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                  Message Preview
                  <span className="ml-2 text-gray-400 normal-case font-normal">(you can edit this in Gmail)</span>
                </label>
                <textarea
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  rows={10}
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-ticano-red font-mono resize-none"
                />
              </div>
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl px-4 py-3">
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  <strong>Note:</strong> Clicking "Open in Gmail" will open Google Mail with this email pre-filled.
                  The email will be sent from <strong>{TICANO_EMAIL}</strong> to <strong>{application.email}</strong>.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="border-t border-gray-100 dark:border-gray-700 px-6 py-4 flex items-center justify-end gap-3 shrink-0 bg-gray-50 dark:bg-gray-800/50">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-sm font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 transition-all">
            Cancel
          </button>
          <button
            onClick={openGmail}
            disabled={!selectedTemplate}
            className="flex items-center gap-2 px-5 py-2.5 bg-ticano-red hover:bg-ticano-red-dark text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
          >
            <Send size={14} /> Open in Gmail
          </button>
        </div>
      </div>
    </div>
  );
}

export default function JobApplicationsModule() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [active, setActive] = useState(null);
  const [respondApp, setRespondApp] = useState(null);

  const load = () => {
    setLoading(true);
    getJobApplications(statusFilter === 'All' ? {} : { status: statusFilter })
      .then(({ data }) => { setApps(data); setLoading(false); });
  };
  useEffect(load, [statusFilter]);

  const changeStatus = async (id, status) => {
    await updateApplicationStatus(id, status);
    toast.success(`Application marked ${status}`);
    setApps((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    setActive((a) => (a && a.id === id ? { ...a, status } : a));
  };

  const openCv = async (appId) => {
    const { data } = await getJobApplication(appId);
    if (!data?.cvDataUrl) return toast.error('CV file is not available for this demo record');
    const w = window.open();
    if (w) w.document.write(`<iframe src="${data.cvDataUrl}" style="width:100%;height:100%;border:0" title="CV"></iframe>`);
  };

  const downloadCv = async (appId) => {
    const { data } = await getJobApplication(appId);
    if (!data?.cvDataUrl) return toast.error('CV file is not available for this demo record');
    const link = document.createElement('a');
    link.href = data.cvDataUrl;
    link.download = data.cvFileName || 'cv';
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  if (loading) return <div className="flex justify-center py-10"><div className="w-8 h-8 border-2 border-gray-200 border-t-ticano-red rounded-full animate-spin" /></div>;

  return (
    <div>
      {/* Status filter */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Filter size={14} className="text-gray-400" />
        {['All', ...APPLICATION_STATUSES].map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${statusFilter === s ? 'bg-ticano-charcoal text-white border-ticano-charcoal' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300'}`}>
            {s}
          </button>
        ))}
      </div>

      {apps.length === 0 ? (
        <p className="text-center text-gray-400 py-10">No applications{statusFilter !== 'All' ? ` marked "${statusFilter}"` : ''} yet.</p>
      ) : (
        <div className="space-y-3">
          {apps.map((a) => (
            <div key={a.id} className="border border-gray-100 dark:border-gray-700 rounded-xl p-4 bg-white dark:bg-ticano-dark-card">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-800 dark:text-white text-sm">{a.applicantName}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_STYLE[a.status] || 'bg-gray-100 text-gray-600'}`}>{a.status}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1"><Briefcase size={11} /> {a.position}</p>
                  <p className="text-xs text-gray-400 mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                    <span className="flex items-center gap-1"><Mail size={10} />{a.email}</span>
                    <span className="flex items-center gap-1"><Phone size={10} />{a.phone}</span>
                    <span className="flex items-center gap-1"><Clock size={10} />{new Date(a.appliedAt).toLocaleDateString()}</span>
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                  <button onClick={() => setActive(active?.id === a.id ? null : a)} className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <Eye size={12} /> Review
                  </button>
                  <button onClick={() => openCv(a.id)} title="Open CV" className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <FileText size={12} /> CV
                  </button>
                  <button onClick={() => downloadCv(a.id)} title="Download CV" className="p-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <Download size={12} />
                  </button>
                  {/* Respond button - not shown for rejected applicants */}
                  {a.status !== 'Rejected' && (
                    <button
                      onClick={() => setRespondApp(a)}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg bg-ticano-red text-white hover:bg-ticano-red-dark transition-colors font-semibold"
                      title="Send response email via Gmail"
                    >
                      <Mail size={12} /> Respond
                    </button>
                  )}
                </div>
              </div>

              {active?.id === a.id && (
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                  {a.coverNote && <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 italic">"{a.coverNote}"</p>}
                  <p className="text-xs text-gray-400 mb-2">CV file: <span className="font-mono text-gray-600 dark:text-gray-300">{a.cvFileName}</span></p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs text-gray-500 mr-1">Set status:</span>
                    {APPLICATION_STATUSES.map((s) => (
                      <button key={s} onClick={() => changeStatus(a.id, s)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${a.status === s ? STATUS_STYLE[s] : 'bg-gray-50 dark:bg-gray-800 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Respond modal */}
      {respondApp && (
        <RespondModal application={respondApp} onClose={() => setRespondApp(null)} />
      )}
    </div>
  );
}
