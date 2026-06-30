import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { User, Star, MessageSquare, ToggleLeft, ToggleRight, UserCheck, ShieldAlert, Hash, History, Lightbulb, CheckCircle2, Calendar, MapPin } from 'lucide-react';
import Navbar from '../components/common/Navbar';
import { StarRating, LoadingSpinner, Card, EmptyState } from '../components/common/UI';
import ComplaintTracker from '../components/common/ComplaintTracker';
import ComplaintTimeline from '../components/common/ComplaintTimeline';
import ComplaintForm from '../components/common/ComplaintForm';
import ImprovementFeedbackForm from '../components/common/ImprovementFeedbackForm';
import SatisfactionSurveyForm from '../components/common/SatisfactionSurveyForm';
import { getProfile, getMyFeedback, getMyComplaints, submitRating, submitComplaint, optOut, clientIdFor } from '../services/api';
import ClientQuestionnaires from '../components/common/ClientQuestionnaires';
import OnboardingChecklist from '../components/common/OnboardingChecklist';
import AnnouncementBanner from '../components/common/AnnouncementBanner';
import BranchMap from '../components/common/BranchMap';

import { CLIENT_TYPE_LABEL, JOURNEY_STAGE_LABEL } from '../utils/constants';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import toast from 'react-hot-toast';

const HERO_GRADIENT = 'bg-gradient-to-br from-ticano-charcoal via-[#4a4647] to-ticano-charcoal';

const tabsForLang = (t) => [
  { id: 'overview', label: t('Overview'), icon: User },
  { id: 'feedback', label: t('Feedback'), icon: Star },
  { id: 'branches', label: t('Find a Branch'), icon: MapPin },
  { id: 'profile', label: t('My Profile'), icon: User },
];
// Internal (non-nav) views still reachable from within the Feedback section.
const INTERNAL_VIEWS = ['complaints', 'submit', 'improve'];

export default function ClientDashboard() {
  const { user } = useAuth();
  const { t } = useSettings();
  const TABS = tabsForLang(t);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchParams] = useSearchParams();
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && (TABS.some((x) => x.id === tab) || INTERNAL_VIEWS.includes(tab))) setActiveTab(tab);
  }, [searchParams]);
  const [profile, setProfile] = useState(null);
  const [feedback, setFeedback] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [openComplaint, setOpenComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

  const handleRatingSubmit = async () => {
    if (!rating) return toast.error('Please select a rating');
    setSubmitting(true);
    try {
      const { data } = await submitRating({ rating, comment });
      const entry = {
        id: data?.id || Date.now(),
        rating,
        comment: comment.trim(),
        createdAt: new Date().toISOString(),
        branch: profile?.preferredBranch || 'Gaborone',
      };
      setFeedback((prev) => [entry, ...prev]);
      toast.success('Thank you! Your feedback has been recorded.');
      setRating(0); setComment('');
    } catch { toast.error('Failed to submit rating'); }
    finally { setSubmitting(false); }
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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ticano-red"></div>
      </div>
    </div>
  );

  const openComplaintsCount = complaints.filter((c) => !['resolved', 'closed'].includes(c.status)).length;

  const rateExperience = ({ title = 'Rate your last experience', subtitle } = {}) => (
    <div>
      <h4 className="font-semibold text-ticano-charcoal dark:text-white mb-0.5">{title}</h4>
      {subtitle && <p className="text-sm text-gray-500 mb-3">{subtitle}</p>}
      <div className="flex gap-3 mb-3 mt-2">
        {[1, 2, 3, 4, 5].map((s) => (
          <button key={s} type="button" onClick={() => setRating(s)} className="text-3xl transition-transform hover:scale-110"
            style={{ color: s <= rating ? '#FFC107' : '#D1D5DB' }}>★</button>
        ))}
      </div>
      <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3}
        placeholder="Tell us about your experience (optional)…"
        className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 text-sm bg-white dark:bg-gray-800 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-ticano-red mb-3" />
      <button onClick={handleRatingSubmit} disabled={submitting}
        className="w-full sm:w-auto px-6 py-2.5 bg-ticano-red text-white rounded-xl font-medium text-sm hover:bg-ticano-red-dark transition-colors disabled:opacity-60">
        {submitting ? 'Submitting…' : 'Submit Feedback'}
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-ticano-bg-light dark:bg-ticano-dark-bg">
      <Navbar title="Client Dashboard" />
      <div className="max-w-4xl mx-auto px-4 py-6">
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

        {activeTab === 'overview' && (
          <div className="space-y-4">
            <OnboardingChecklist />
            <div className="space-y-4">
              {complaints.filter((c) => c.status === 'closed' && !c.satisfaction).map((c) => (
                <SatisfactionSurveyForm key={c.id} complaint={c} onSubmitted={() => reload()} />
              ))}
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

              {complaints[0] && (
                <Card title="Latest complaint" subtitle="Quick view of your most recent ticket">
                  <ComplaintTracker complaint={complaints[0]} />
                  <button onClick={() => { setActiveTab('complaints'); setOpenComplaint(complaints[0]); }}
                    className="mt-3 text-sm text-ticano-red hover:underline">View full details →</button>
                </Card>
              )}

              {!complaints[0] && (
                <Card>
                  <div className="text-center py-8">
                    <ShieldAlert size={48} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-600 dark:text-gray-400">No complaints yet</p>
                    <button onClick={() => setActiveTab('submit')} className="mt-3 px-5 py-2.5 bg-ticano-red text-white rounded-xl text-sm font-medium hover:bg-ticano-red-dark">
                      Submit a Complaint
                    </button>
                  </div>
                </Card>
              )}

              <Card title="Give us feedback" subtitle="How was your most recent experience with Ticano?"
                actions={<button onClick={() => setActiveTab('feedback')} className="text-xs text-ticano-red hover:underline">View feedback history →</button>}>
                {rateExperience({ title: 'Rate your last experience', subtitle: 'Your feedback is saved to your Feedback History.' })}
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'complaints' && !openComplaint && (
          <Card title="My Complaints" subtitle="Track tickets, statuses and queue positions"
            actions={<button onClick={() => setActiveTab('feedback')} className="text-xs text-ticano-red hover:underline">← Back to Feedback</button>}>
            {complaints.length === 0 ? (
              <div className="text-center py-8">
                <ShieldAlert size={48} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-600 dark:text-gray-400">You have not submitted any complaints.</p>
              </div>
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

        {activeTab === 'complaints' && openComplaint && (
          <Card title={`Complaint ${openComplaint.ticket}`} subtitle={JOURNEY_STAGE_LABEL[openComplaint.journeyStage] + ' · ' + openComplaint.category}
            actions={<button onClick={() => setOpenComplaint(null)} className="text-xs text-ticano-red hover:underline">← Back to all complaints</button>}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ComplaintTracker complaint={openComplaint} />
              <div>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 flex items-center gap-1.5"><History size={14}/> Case history</h4>
                <ComplaintTimeline status={openComplaint.status} timeline={openComplaint.timeline} escalation={openComplaint.escalation} />
              </div>
            </div>
          </Card>
        )}

        {activeTab === 'submit' && (
          <Card title="Submit a Complaint" subtitle="Tell us what went wrong — we will assign your case and get back to you"
            actions={<button onClick={() => setActiveTab('feedback')} className="text-xs text-ticano-red hover:underline">← Back to Feedback</button>}>
            <ComplaintForm
              onSubmit={handleComplaintSubmit}
              clientType={profile?.clientType || user?.clientType || 'new'}
              defaultBranch={profile?.preferredBranch || 'Gaborone'}
            />
          </Card>
        )}

        {activeTab === 'feedback' && (
          <div className="space-y-5">
            {/* Optional questionnaires — clients may complete or ignore */}
            <ClientQuestionnaires />

            {/* TOP: experience ratings, feedback submissions, suggestions, reviews */}
            <Card title="Rate your experience" subtitle="Tell us how we are doing — your rating is saved to your feedback history">
              {rateExperience({ title: 'Rate your last experience' })}
            </Card>

            <Card title="Your feedback & reviews" subtitle="Ratings and reviews you have shared with Ticano">
              {feedback.length === 0 ? (
                <div className="text-center py-8">
                  <Star size={48} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-600 dark:text-gray-400">No feedback submitted yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {feedback.map((f) => (
                    <div key={f.id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex gap-1">
                          {[1,2,3,4,5].map((s) => (
                            <span key={s} className={s <= f.rating ? 'text-yellow-400' : 'text-gray-300'}>★</span>
                          ))}
                        </div>
                        <span className="text-xs text-gray-400">{new Date(f.createdAt).toLocaleDateString()}</span>
                      </div>
                      {f.comment && <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{f.comment}</p>}
                      <p className="text-xs text-gray-400 mt-1">{f.branch}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card title="Suggestions" subtitle="Have an idea to help us improve? We would love to hear it">
              <ImprovementFeedbackForm
                author={profile?.name || user?.name}
                defaultBranch={profile?.preferredBranch}
                onSubmitted={() => reload()}
              />
            </Card>

            {/* BOTTOM: complaint entry point — opens the existing complaint workflow */}
            <div className="bg-white dark:bg-ticano-dark-card rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-ticano-red/10 text-ticano-red flex items-center justify-center shrink-0"><ShieldAlert size={19} /></div>
                <div className="flex-1">
                  <p className="font-semibold text-ticano-charcoal dark:text-white">Do you have a complaint?</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">If something went wrong, let us know and we will assign your case and follow it through to resolution.</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <button onClick={() => setActiveTab('submit')} className="px-4 py-2 bg-ticano-red text-white rounded-xl text-sm font-semibold hover:bg-ticano-red-dark transition-colors">
                      Submit a complaint
                    </button>
                    <button onClick={() => { setOpenComplaint(null); setActiveTab('complaints'); }} className="px-4 py-2 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      Track my complaints
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <Card title="My Profile">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
              {[
                { label: 'Client ID', value: clientIdFor(profile?.id || user?.userId || user?.id || 1) },
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