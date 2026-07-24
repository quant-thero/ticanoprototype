import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Cake, MapPin, Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { signUp, subscribeTenderNotifications, INDUSTRIES } from '../services/supabaseApi';
import Logo from '../components/common/Logo';
import { BRANCHES, REFERRAL_SOURCES } from '../utils/constants';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: '', whatsappNumber: '', email: '', password: '', confirmPassword: '',
    baseLocation: '', preferredBranch: '', industry: '', referralSource: '', otherText: '', referredByName: '',
    // §14, DOB optional, only shown when user opts into birthday messages
    birthdayMessagesOptIn: false,
    birthday: '',
    // §16, location sharing opt-in
    locationSharingOptIn: true,
    // Tender opportunity alerts opt-in
    tenderNotificationsOptIn: false,
    // Prior loan history determines new vs existing client tagging
    hadPreviousLoan: null,
  });
  const [loading, setLoading] = useState(false);
  const { refreshSession } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // A friend opened this page via a Refer-a-Friend link (?ref=<name>)
  // pre-fill the referral fields so they don't have to fill it in
  // themselves. Still editable, and it's still the same referredByName
  // field the manual "Friend or Family Referral" flow already writes.
  const referredBy = searchParams.get('ref');
  useEffect(() => {
    if (referredBy && referredBy.trim()) {
      setForm((p) => ({ ...p, referralSource: 'Friend or Family Referral', referredByName: referredBy.trim() }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (key, value) => setForm(p => ({ ...p, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) return toast.error('Passwords do not match');
    if (!form.whatsappNumber.match(/^\+267\d{7,8}$/)) return toast.error('Invalid WhatsApp number. Format: +267XXXXXXXX');
    if (form.hadPreviousLoan === null) return toast.error('Please tell us if you have had a loan from Ticano before');
    if (!form.industry) return toast.error('Please select your industry');
    if (!form.referralSource) return toast.error('Please tell us how you heard about us');
    if (form.referralSource === 'Other' && !form.otherText.trim()) return toast.error('Please specify how you heard about us');
    if (form.birthdayMessagesOptIn && !form.birthday) return toast.error('Please provide your date of birth to receive birthday messages');
    if (form.tenderNotificationsOptIn && !form.email.trim()) return toast.error('Please provide your email address to receive tender alerts');

    const referralSource = form.referralSource === 'Other'
      ? `Other: ${form.otherText}`
      : form.referralSource;

    const clientType = form.hadPreviousLoan ? 'existing' : 'new';

    setLoading(true);
    try {
      const { data } = await signUp({
        name: form.name,
        whatsappNumber: form.whatsappNumber,
        email: form.email,
        password: form.password,
        baseLocation: form.locationSharingOptIn ? form.baseLocation : null,
        birthday: form.birthdayMessagesOptIn ? form.birthday : null,
        birthdayMessagesOptIn: form.birthdayMessagesOptIn,
        locationSharingOptIn: form.locationSharingOptIn,
        tenderNotificationsOptIn: form.tenderNotificationsOptIn,
        preferredBranch: form.preferredBranch,
        industry: form.industry,
        referralSource,
        referredByName: form.referralSource === 'Friend or Family Referral' ? form.referredByName.trim() || null : null,
        clientType,
      });

      if (data.pendingEmailConfirmation) {
        toast.success('Check your email to confirm your account, then sign in.');
        navigate('/login');
        return;
      }

      // Opt the client into the public tender-alerts list so they receive broadcasts.
      if (form.tenderNotificationsOptIn && form.email.trim()) {
        subscribeTenderNotifications({ email: form.email, phone: form.whatsappNumber }).catch(() => {});
      }

      await refreshSession(true);
      toast.success('Account created! Welcome to Ticano.');
      navigate('/client');
    } catch (err) {
      toast.error(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-ticano-red text-sm";
  const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

  return (
    <div className="min-h-screen bg-ticano-bg-light dark:bg-ticano-dark-bg flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <div className="inline-flex justify-center mb-3">
            <Logo size={40} animate="spin-in" withTagline className="items-center" taglineClassName="text-gray-500 dark:text-gray-400 text-center" />
          </div>
          <p className="text-sm mt-1 font-medium" style={{color:'#CE313C'}}>
            Re Spache sa <span style={{fontFamily:'Pacifico, cursive'}}>Bagwebi!</span>
          </p>
          <h1 className="text-xl font-bold text-ticano-charcoal dark:text-white mt-3">Create your account</h1>
        </div>

        <div className="bg-white dark:bg-ticano-dark-card rounded-2xl shadow-xl p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Full Name *</label>
                <input type="text" required value={form.name} onChange={e => set('name', e.target.value)}
                  placeholder="Your full name" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>WhatsApp Number *</label>
                <input type="tel" required value={form.whatsappNumber} onChange={e => set('whatsappNumber', e.target.value)}
                  placeholder="+267XXXXXXXX" className={inputClass} />
              </div>
            </div>

            <div>
              <label className={labelClass}>Email Address</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                placeholder="info@ticanogroup.co.bw" className={inputClass} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Password *</label>
                <input type="password" required value={form.password} onChange={e => set('password', e.target.value)}
                  placeholder="Min 8 characters" minLength={8} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Confirm Password *</label>
                <input type="password" required value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)}
                  placeholder="Repeat password" className={inputClass} />
              </div>
            </div>

            <div>
              <label className={labelClass}>Preferred Branch *</label>
              <select required value={form.preferredBranch} onChange={e => set('preferredBranch', e.target.value)}
                className={inputClass}>
                <option value="">Select a branch</option>
                {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>

            <div>
              <label className={labelClass}>Industry *</label>
              <select required value={form.industry} onChange={e => set('industry', e.target.value)}
                className={inputClass}>
                <option value="">Select your industry</option>
                {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>

            {/* §16, Location sharing preference */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-gray-50/60 dark:bg-gray-800/40">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.locationSharingOptIn}
                  onChange={e => set('locationSharingOptIn', e.target.checked)}
                  className="mt-1 w-4 h-4 accent-[#CE313C]"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <MapPin size={15} className="text-ticano-red" />
                    <span className="text-sm font-medium text-gray-800 dark:text-white">Share my location</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Helps us connect you to the closest branch and improve local services. You can opt out anytime.
                  </p>
                </div>
              </label>
              {form.locationSharingOptIn && (
                <div className="mt-3 pl-7">
                  <input
                    type="text" value={form.baseLocation} onChange={e => set('baseLocation', e.target.value)}
                    placeholder="Town / City (e.g. Mogoditshane)" className={inputClass} />
                </div>
              )}
            </div>

            {/* §14, Birthday messages opt-in (DOB only requested if opted in) */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-gray-50/60 dark:bg-gray-800/40">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.birthdayMessagesOptIn}
                  onChange={e => set('birthdayMessagesOptIn', e.target.checked)}
                  className="mt-1 w-4 h-4 accent-[#CE313C]"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Cake size={15} className="text-ticano-red" />
                    <span className="text-sm font-medium text-gray-800 dark:text-white">Receive Birthday Messages</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    We will send a friendly birthday greeting via WhatsApp. Date of birth is only collected if you opt in.
                  </p>
                </div>
              </label>
              {form.birthdayMessagesOptIn && (
                <div className="mt-3 pl-7">
                  <label className={labelClass}>Date of Birth *</label>
                  <input type="date" required={form.birthdayMessagesOptIn} value={form.birthday}
                    onChange={e => set('birthday', e.target.value)} className={inputClass} />
                </div>
              )}
            </div>

            {/* Tender opportunity alerts opt-in */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-gray-50/60 dark:bg-gray-800/40">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.tenderNotificationsOptIn}
                  onChange={e => set('tenderNotificationsOptIn', e.target.checked)}
                  className="mt-1 w-4 h-4 accent-[#CE313C]"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Bell size={15} className="text-ticano-red" />
                    <span className="text-sm font-medium text-gray-800 dark:text-white">Get tender opportunity alerts</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    We will email you whenever a new tender or purchase-order opportunity is published. You can opt out anytime.
                  </p>
                </div>
              </label>
            </div>

            <div>
              <label className={labelClass}>Have you had a loan from Ticano before? *</label>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => set('hadPreviousLoan', true)}
                  className={`px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                    form.hadPreviousLoan === true
                      ? 'border-ticano-red bg-ticano-red text-white'
                      : 'border-gray-300 dark:border-gray-600 hover:border-ticano-red text-gray-700 dark:text-gray-300'
                  }`}>
                  Yes, I'm an existing client
                </button>
                <button type="button" onClick={() => set('hadPreviousLoan', false)}
                  className={`px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                    form.hadPreviousLoan === false
                      ? 'border-ticano-red bg-ticano-red text-white'
                      : 'border-gray-300 dark:border-gray-600 hover:border-ticano-red text-gray-700 dark:text-gray-300'
                  }`}>
                  No, I'm new to Ticano
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                This helps us tailor your experience and direct your queries to the right team.
              </p>
            </div>

            {referredBy && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-400">
                You were referred by <strong>{referredBy}</strong>, we've filled that in below.
              </div>
            )}

            <div>
              <label className={labelClass}>How did you hear about us? *</label>
              <select required value={form.referralSource} onChange={e => set('referralSource', e.target.value)}
                className={inputClass}>
                <option value="">Select an option</option>
                {REFERRAL_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {form.referralSource === 'Other' && (
              <div>
                <label className={labelClass}>Please specify *</label>
                <input type="text" required value={form.otherText} onChange={e => set('otherText', e.target.value)}
                  placeholder="Tell us how you heard about Ticano" className={inputClass} />
              </div>
            )}

            {form.referralSource === 'Friend or Family Referral' && (
              <div>
                <label className={labelClass}>Who referred you? <span className="text-gray-400 font-normal">(optional)</span></label>
                <input type="text" value={form.referredByName} onChange={e => set('referredByName', e.target.value)}
                  placeholder="Their name" className={inputClass} />
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-3 bg-ticano-red hover:bg-ticano-red-dark text-white rounded-xl font-semibold transition-colors disabled:opacity-60 mt-2">
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-4">
            Already have an account?{' '}
            <Link to="/login" className="text-ticano-red font-semibold hover:underline">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
