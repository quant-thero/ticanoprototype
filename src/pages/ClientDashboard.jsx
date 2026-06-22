import React, { useState, useEffect } from 'react';
import { User, Star, MessageSquare, ToggleLeft, ToggleRight, UserCheck, ShieldAlert, Hash, History, Lightbulb, CheckCircle2, Calendar, MapPin, Cake } from 'lucide-react';
import Navbar from '../components/common/Navbar';
import { StarRating, LoadingSpinner, Card, EmptyState } from '../components/common/UI';
import ComplaintTracker from '../components/common/ComplaintTracker';
import ComplaintTimeline from '../components/common/ComplaintTimeline';
import ComplaintForm from '../components/common/ComplaintForm';
import ImprovementFeedbackForm from '../components/common/ImprovementFeedbackForm';
import SatisfactionSurveyForm from '../components/common/SatisfactionSurveyForm';
import { getProfile, getMyFeedback, getMyComplaints, submitRating, submitComplaint, optOut } from '../services/api';
import AppointmentModule from '../components/common/AppointmentModule';
import OnboardingChecklist from '../components/common/OnboardingChecklist';
import BirthdayPreferences from '../components/common/BirthdayPreferences';
import AnnouncementBanner from '../components/common/AnnouncementBanner';
import BranchMap from '../components/common/BranchMap';
import DocumentUpload from '../components/common/DocumentUpload';
import SLACountdown from '../components/common/SLACountdown';

import { CLIENT_TYPE_LABEL, JOURNEY_STAGE_LABEL } from '../utils/constants';
import { formatDateTime } from '../utils/format';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import toast from 'react-hot-toast';

// Hero banner background — referenced by Tailwind utility classes
const HERO_GRADIENT = 'bg-gradient-to-br from-ticano-charcoal via-[#4a4647] to-ticano-charcoal';

const tabsForLang = (t) => [
  { id: 'overview',   label: t('Overview'),           icon: User },
  { id: 'feedback',   label: t('Feedback History'),   icon: Star },
  { id: 'complaints', label: t('My Complaints'),      icon: ShieldAlert },
  { id: 'submit',     label: t('Submit a Complaint'), icon: MessageSquare },
  { id: 'improve',    label: t('Improve Ticano'),     icon: Lightbulb },
  { id: 'appointments', label: t('Appointments'),        icon: Calendar },
  { id: 'branches',     label: t('Find a Branch'),      icon: MapPin },
  { id: 'birthday',   label: t('Birthday Messages'),  icon: Cake },
  { id: 'profile',    label: t('My Profile'),         icon: User },
];

export default function ClientDashboard() {
  const { user } = useAuth();
  const { t } = useSettings();
  const TABS = tabsForLang(t);
  const [activeTab, setActiveTab] = useState('overview');
  const [profile, setProfile] = useState(null);
  const [feedback, setFeedback] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [openComplaint, setOpenComplaint] = useState(null);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    const [p, f, c] = await Promise.all([getProfile(), getMyFeedback(), getMyComplaints(1)]);
    setProfile(p.data);
    setFeedback(Array.isArray(f.data) ? f.data : (f.data?.feedback || []));
    setComplaints(c.data || []);
  };

  useEffect(() => {
    (async () => {
      try { await reload(); } catch {}
      finally { setLoading(false); }
    })();
  }, []);

  const handleOptOut = async () => {
    try {
      await optOut();
      setProfile((p) => ({ ...p, optedOut: !p.optedOut }));
      toast.success(profile?.optedOut ? 'You have opted back in to WhatsApp messages' : 'You have opted out of WhatsApp messages');
    } catch { toast.error('Failed to update preference'); }
  };

  // Addendum §1/§2 — a single submit path shared by the Overview "Rate Your
  // Last Experience" card and the Feedback History tab. Both write to the same
  // `feedback` state, so a rating submitted in one place appears immediately in
  // the other with no duplication.
  const handleRatingSubmit = async ({ rating, comment }) => {
    if (!rating) { toast.error('Please select a rating'); return false; }
    try {
      await submitRating({ rating, comment });
      const entry = {
        id: `local-${Date.now()}`,
        rating,
        comment,
        createdAt: new Date().toISOString(),
        branch: profile?.preferredBranch || user?.branch || 'Gaborone',
      };
      setFeedback((prev) => [entry, ...prev]);
      toast.success('Thank you! Your feedback has been recorded.');
      return true;
    } catch {
      toast.error('Failed to submit rating');
      return false;
    }
  };

  const handleComplaintSubmit = async (form) => {
    try {
      const { data } = await submitComplaint({
        customerId: profile?.id || 1,
        customerName: profile?.name || user?.name,
        clientType: profile?.clientType || user?.clientType || 'new',
        branch: profile?.preferredBranch || 'Gaborone',
        ...form,
      });
      toast.success(`Complaint submitted — your ticket number is ${data.complaint.ticket}`);
      await reload();
      setActiveTab('complaints');
    } catch { toast.error('Failed to submit complaint'); }
  };

  if (loading) return (
    <div className="min-h-screen bg-ticano-bg-light dark:bg-ticano-dark-bg">
      <Navbar title="Client Dashboard" />
      <LoadingSpinner />
    </div>
  );

  const openComplaintsCount = complaints.filter((c) => !['resolved', 'closed'].includes(c.status)).length;

  return (
    <div className="min-h-screen bg-ticano-bg-light dark:bg-ticano-dark-bg">
      <Navbar title="Client Dashboard" />

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* §17 Hero banner — modern, professional */}
        <div className={`${HERO_GRADIENT} text-white rounded-2xl p-6 mb-6 shadow-lg relative overflow-hidden`}>
          <div className="absolute -right-12 -bottom-12 opacity-10">
            <ShieldAlert size={220} strokeWidth={1} />
          </div>
          <div className="relative">
            <h2 className="text-xl sm:text-2xl font-bold">{t('Welcome back')}, {user?.name}</h2>
            <p className="text-white/80 text-sm mt-1">
              {profile?.preferredBranch ? `${profile.preferredBranch} branch` : 'Ticano Group'} ·
              {' '}{CLIENT_TYPE_LABEL[profile?.clientType] || 'Client'}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Stat label={t('Open Complaints')} value={openComplaintsCount} />
              <Stat label={t('Total Complaints')} value={complaints.length} />
              <Stat label={t('Feedback shared')} value={feedback.length} />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {TABS.map((tab) => (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id); setOpenComplaint(null); }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors
                ${activeTab === tab.id
                  ? 'bg-ticano-charcoal text-white shadow'
                  : 'bg-white dark:bg-ticano-dark-card text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
              <tab.icon size={15} />
              {tab.label}
            </button>
          ))}
        </div>

        <AnnouncementBanner />

      {/* ---------- OVERVIEW ---------- */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
          <OnboardingChecklist />
          <div className="space-y-4">
            {/* Post-closure satisfaction survey (§4) */}
            {complaints.filter((c) => c.status === 'closed' && !c.satisfaction).map((c) => (
              <SatisfactionSurveyForm key={c.id} complaint={c} onSubmitted={() => reload()} />
            ))}

            {/* Assigned PM card */}
            <div className="bg-white dark:bg-ticano-dark-card rounded-2xl shadow p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-ticano-red text-white flex items-center justify-center font-bold text-lg">
                {profile?.assignedPmName?.charAt(0) || 'M'}
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500 dark:text-gray-400">Your Portfolio Manager</p>
                <p className="font-semibold text-ticano-charcoal dark:text-white">{profile?.assignedPmName || 'Mojaboswa'}</p>
                <p className="text-xs text-gray-400">{profile?.preferredBranch || 'Gaborone'} branch</p>
              </div>
              <UserCheck className="text-ticano-red" size={22} />
            </div>

            {/* Addendum §1 — Rate Your Last Experience (syncs to Feedback History) */}
            <Card title="Rate Your Last Experience" subtitle="Your rating is saved to your Feedback History">
              <RateExperience onSubmit={handleRatingSubmit} compact />
            </Card>

            {/* Most recent complaint */}
            {complaints[0] && (
              <Card title="Latest complaint" subtitle="Quick view of your most recent ticket">
                <ComplaintTracker complaint={complaints[0]} />
                <button onClick={() => { setActiveTab('complaints'); setOpenComplaint(complaints[0]); }}
                  className="mt-3 text-sm text-ticano-red hover:underline">View full details →</button>
              </Card>
            )}

            {!complaints[0] && (
              <Card>
                <EmptyState title="No complaints yet" message="If something goes wrong, raise a complaint and we'll handle it end-to-end." icon={ShieldAlert} />
                <div className="text-center">
                  <button onClick={() => setActiveTab('submit')} className="mt-2 px-5 py-2.5 bg-ticano-red text-white rounded-xl text-sm font-medium hover:bg-ticano-red-dark">
                    Submit a Complaint
                  </button>
                </div>
              </Card>
            )}
          </div>
        )}

        </div>)}

        {/* ---------- MY COMPLAINTS ---------- */}

        {activeTab === 'complaints' && !openComplaint && (
          <Card title="My Complaints" subtitle="Track tickets, statuses and queue positions">
            {complaints.length === 0 ? (
              <EmptyState title="No complaints" message="You have not submitted any complaints." icon={ShieldAlert} />
            ) : (
              <div className="space-y-3">
                {complaints.map((c) => (
                  <button key={c.id} onClick={() => setOpenComplaint(c)} className="w-full text-left">
                    <ComplaintTracker complaint={c} compact />
                  </button>
                ))}
              </div>
            )}
          </Card>
        )}

        )}

        {activeTab === 'complaints' && openComplaint && (
          <Card title={`Complaint ${openComplaint.ticket}`} subtitle={JOURNEY_STAGE_LABEL[openComplaint.journeyStage] + ' · ' + openComplaint.category}
            actions={<button onClick={() => setOpenComplaint(null)} className="text-xs text-ticano-red hover:underline">← Back to all complaints</button>}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ComplaintTracker complaint={openComplaint} />
              <div>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 flex items-center gap-1.5"><History size={14}/> Case history</h4>
                <ComplaintTimeline status={openComplaint.status} timeline={openComplaint.timeline} escalation={openComplaint.escalation} />
              </div>
            </div>
          </Card>
        )}

        {/* ---------- SUBMIT ---------- */}
        {activeTab === 'submit' && (
          <Card title="Submit a Complaint" subtitle="Tell us what went wrong — we will assign your case and get back to you">
            <ComplaintForm
              onSubmit={handleComplaintSubmit}
              clientType={profile?.clientType || user?.clientType || 'new'}
              defaultBranch={profile?.preferredBranch || 'Gaborone'}
            />
          </Card>
        )}

        {/* ---------- IMPROVE TICANO (§3) ---------- */}
        {activeTab === 'improve' && (
          <ImprovementFeedbackForm
            author={profile?.name || user?.name}
            defaultBranch={profile?.preferredBranch}
            onSubmitted={() => setActiveTab('overview')}
          />
        )}

        {/* ---------- FEEDBACK HISTORY ---------- */}
        {activeTab === 'feedback' && (
          <Card title="Feedback History">
            {feedback.length === 0 ? (
              <EmptyState title="No feedback submitted yet" />
            ) : (
              <div className="space-y-3">
                {feedback.map((f) => (
                  <div key={f.id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-1">
                      <StarRating rating={f.rating} size="sm" />
                      <span className="text-xs text-gray-400">{new Date(f.createdAt).toLocaleDateString()}</span>
                    </div>
                    {f.comment && <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{f.comment}</p>}
                    <p className="text-xs text-gray-400 mt-1">{f.branch}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Rate experience — shares state with the Overview card */}
            <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-700">
              <h4 className="font-semibold text-ticano-charcoal dark:text-white mb-3">Rate your last experience</h4>
              <RateExperience onSubmit={handleRatingSubmit} compact />
            </div>
          </Card>
        )}

        {/* ---------- PROFILE ---------- */}
        {activeTab === 'profile' && (
          <Card title="My Profile">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
              {[
                { label: 'Full Name', value: profile?.name },
                { label: 'WhatsApp Number', value: profile?.whatsappNumber },
                { label: 'Email', value: profile?.email || '—' },
                { label: 'Preferred Branch', value: profile?.preferredBranch },
                { label: 'Client Type', value: CLIENT_TYPE_LABEL[profile?.clientType] || '—' },
                { label: 'Member Since', value: profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : '' },
                profile?.locationSharingOptIn ? { label: 'Town / City', value: profile?.baseLocation || 'Not set' } : null,
                profile?.birthdayMessagesOptIn ? { label: 'Date of Birth', value: profile?.birthday || 'Not set' } : null,
              ].filter(Boolean).map((field) => (
                <div key={field.label}>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{field.label}</p>
                  <p className="font-medium text-gray-800 dark:text-white">{field.value || '-'}</p>
                </div>
              ))}
            </div>

            {/* WhatsApp Opt-out Toggle */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
              <div>
                <p className="font-medium text-gray-800 dark:text-white text-sm">WhatsApp Messages</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Receive survey links and updates</p>
              </div>
              <button onClick={handleOptOut} className="flex items-center gap-2 text-sm">
                {profile?.optedOut
                  ? <><ToggleLeft size={32} className="text-gray-400" /><span className="text-gray-500">Off</span></>
                  : <><ToggleRight size={32} className="text-ticano-red" /><span className="text-ticano-red font-medium">On</span></>}
              </button>
            </div>
          </Card>
        )}

        {activeTab === 'appointments' && (
          <div className="bg-white dark:bg-ticano-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <h3 className="font-bold text-ticano-charcoal dark:text-white text-lg mb-1">My Appointments</h3>
            <p className="text-sm text-gray-500 mb-5">Book a callback or in-branch meeting with your Portfolio Manager</p>
            <AppointmentModule canCreate={true} />
          </div>
        )}


        {activeTab === 'birthday' && (
          <div className="bg-white dark:bg-ticano-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <h3 className="font-bold text-ticano-charcoal dark:text-white text-lg mb-1">Birthday Messages</h3>
            <p className="text-sm text-gray-500 mb-5">Opt in to receive a birthday greeting from your Portfolio Manager and the Ticano team.</p>
            <BirthdayPreferences />
          </div>
        )}

        {activeTab === 'branches' && (
          <div className="bg-white dark:bg-ticano-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <h3 className="font-bold text-ticano-charcoal dark:text-white text-lg mb-1">Find a Branch</h3>
            <p className="text-sm text-gray-500 mb-5">All Ticano Group branches across Botswana</p>
            <BranchMap />
          </div>
        )}


      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-white/10 backdrop-blur rounded-xl px-4 py-2.5">
      <p className="text-2xl font-bold leading-tight">{value}</p>
      <p className="text-xs text-white/70">{label}</p>
    </div>
  );
}

// Addendum §1 — "Rate Your Last Experience". Self-contained widget with its
// own local state; on success it clears and calls onSubmit (which syncs the
// shared feedback list used by both the Overview and Feedback History tabs).
function RateExperience({ onSubmit, compact = false }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    const okResult = await onSubmit({ rating, comment });
    setSubmitting(false);
    if (okResult) { setRating(0); setComment(''); }
  };

  return (
    <div>
      {!compact && <h4 className="font-semibold text-ticano-charcoal dark:text-white mb-1">Rate Your Last Experience</h4>}
      {!compact && <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">How was your most recent interaction with Ticano?</p>}
      <div className="flex gap-3 mb-3">
        {[1, 2, 3, 4, 5].map((s) => (
          <button key={s} type="button" onClick={() => setRating(s)} aria-label={`${s} star${s > 1 ? 's' : ''}`}
            className="text-3xl transition-transform hover:scale-110"
            style={{ color: s <= rating ? '#FFC107' : '#D1D5DB' }}>★</button>
        ))}
      </div>
      <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3}
        placeholder="Additional comments (optional)…"
        className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 text-sm bg-white dark:bg-gray-800 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-ticano-red mb-3" />
      <button onClick={submit} disabled={submitting || !rating}
        className="w-full sm:w-auto px-6 py-2.5 bg-ticano-red text-white rounded-xl font-medium text-sm hover:bg-ticano-red-dark transition-colors disabled:opacity-60">
        {submitting ? 'Submitting…' : 'Submit Rating'}
      </button>
    </div>
  );
}
