import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { updatePassword, getMyProfile } from '../services/supabaseApi';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/common/Logo';
import toast from 'react-hot-toast';

export default function ResetPasswordPage() {
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const navigate = useNavigate();
  const { refreshSession } = useAuth();

  useEffect(() => {
    // Supabase's client automatically parses the recovery link's token from
    // the URL (detectSessionInUrl: true) and establishes a session before
    // this effect runs, we just need to check whether that succeeded.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(Boolean(session));
      setReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) setHasSession(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 8) return toast.error('Password must be at least 8 characters');
    if (password !== confirmPassword) return toast.error('Passwords do not match');

    setSaving(true);
    try {
      await updatePassword(password);
      await refreshSession(true);
      setDone(true);
      toast.success('Password updated');
      const { data: profile } = await getMyProfile();
      const routes = {
        customer: '/client', portfolio_manager: '/pm', service_manager: '/service-manager',
        director: '/director', marketing: '/marketing', admin: '/admin',
      };
      setTimeout(() => navigate(routes[profile?.role] || '/login'), 1200);
    } catch (err) {
      toast.error(err.message || 'Could not update password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b1020] px-4">
      <div className="w-full max-w-sm bg-white/[0.06] border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
        <div className="flex justify-center mb-5"><Logo withTagline className="items-center" taglineClassName="text-white/40 text-center" gray="#d1d5db" /></div>

        {!ready ? (
          <p className="text-center text-white/50 text-sm">Checking your reset link…</p>
        ) : !hasSession ? (
          <div className="text-center">
            <p className="text-white text-sm font-semibold mb-1">This reset link isn't valid or has expired.</p>
            <p className="text-white/50 text-xs mb-4">Request a new one from the sign-in page.</p>
            <button onClick={() => navigate('/login')} className="text-ticano-red text-sm font-semibold hover:underline">
              Back to sign in
            </button>
          </div>
        ) : done ? (
          <div className="text-center">
            <CheckCircle2 className="mx-auto text-emerald-400 mb-2" size={32} />
            <p className="text-white text-sm font-semibold">Password updated, signing you in…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-white text-sm font-semibold text-center mb-1">Set a new password</p>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="New password (min 8 characters)"
                className="w-full pl-9 pr-9 py-3 rounded-xl text-white text-sm placeholder:text-white/25 bg-white/[0.08] border border-white/15 focus:border-ticano-red/60 outline-none"
              />
              <button type="button" onClick={() => setShowPass((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30">
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type={showPass ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full pl-9 pr-3 py-3 rounded-xl text-white text-sm placeholder:text-white/25 bg-white/[0.08] border border-white/15 focus:border-ticano-red/60 outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 bg-ticano-red hover:bg-ticano-red-dark text-white rounded-xl font-semibold text-sm transition-colors disabled:opacity-60"
            >
              {saving ? 'Updating…' : 'Update password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
