import React, { useState, useEffect } from 'react';
import { CheckCircle2, Circle, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { getOnboardingDismissed, dismissOnboarding } from '../../services/supabaseApi';

export default function OnboardingChecklist({ profile, hasComplaints, hasFeedback }) {
  const [open, setOpen] = useState(true);
  const [dismissedSteps, setDismissedSteps] = useState({});
  const [permanentlyDismissed, setPermanentlyDismissed] = useState(null); // null = still checking

  useEffect(() => {
    getOnboardingDismissed().then(({ data }) => setPermanentlyDismissed(data)).catch(() => setPermanentlyDismissed(false));
  }, []);

  const steps = [
    { id: 'profile', label: 'Complete your profile', desc: 'Add your WhatsApp number and preferred branch', done: Boolean(profile?.whatsappNumber && profile?.preferredBranch) },
    { id: 'whatsapp', label: 'Opt in to WhatsApp updates', desc: 'Get real-time complaint and feedback notifications', done: profile?.locationSharingOptIn ?? false },
    { id: 'pm', label: 'Meet your Portfolio Manager', desc: profile?.assignedPmName ? `Your PM ${profile.assignedPmName} is assigned and ready to help` : 'A Portfolio Manager will be assigned to you shortly', done: Boolean(profile?.assignedPmName) },
    { id: 'complaint', label: 'Know how to submit a complaint', desc: 'Use "Submit a Complaint" tab anytime, we aim to respond within 24 hours', done: Boolean(hasComplaints) },
    { id: 'feedback', label: 'Share your first feedback', desc: 'Rate your experience to help us improve', done: Boolean(hasFeedback) },
  ].map((s) => (dismissedSteps[s.id] !== undefined ? { ...s, done: dismissedSteps[s.id] } : s));

  const done = steps.filter((s) => s.done).length;
  const pct = Math.round((done / steps.length) * 100);
  const allDone = done === steps.length;

  // Once every step reads as done, whether genuinely completed or
  // manually ticked, persist that permanently so it never comes back,
  // even if some underlying condition (e.g. WhatsApp number) later
  // changes back to "incomplete".
  useEffect(() => {
    if (allDone && permanentlyDismissed === false) {
      dismissOnboarding().catch(() => {});
      setPermanentlyDismissed(true);
    }
  }, [allDone, permanentlyDismissed]);

  if (permanentlyDismissed !== false) return null; // still loading, or already dismissed

  return (
    <div className="bg-ticano-charcoal rounded-2xl p-5 mb-5 text-white animate-fade-up shadow-xl">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sparkles size={18} className="text-ticano-red" />
          <div className="text-left">
            <p className="font-semibold text-sm">Getting started with Ticano</p>
            <p className="text-white/60 text-xs">{done} of {steps.length} steps completed</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-16 h-1.5 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-ticano-red rounded-full progress-animated" style={{width: `${pct}%`}} />
          </div>
          {open ? <ChevronUp size={16} className="text-white/60" /> : <ChevronDown size={16} className="text-white/60" />}
        </div>
      </button>
      {open && (
        <div className="mt-4 space-y-2 animate-fade-in">
          {steps.map((step, i) => (
            <div key={step.id} className={`flex items-start gap-3 p-3 rounded-xl transition-all duration-200 ${step.done ? 'opacity-60' : 'bg-white/8 hover:bg-white/12'}`}
              style={{ animationDelay: `${i*0.06}s` }}>
              <button onClick={() => setDismissedSteps((prev) => ({ ...prev, [step.id]: !step.done }))} className="mt-0.5 shrink-0">
                {step.done
                  ? <CheckCircle2 size={16} className="text-green-400" />
                  : <Circle size={16} className="text-white/40" />
                }
              </button>
              <div>
                <p className={`text-sm font-medium ${step.done ? 'line-through text-white/50' : 'text-white'}`}>{step.label}</p>
                <p className="text-xs text-white/50 mt-0.5">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
