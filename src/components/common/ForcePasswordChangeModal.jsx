import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { completeForcedPasswordChange } from '../../services/supabaseApi';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

// Only ever prompt on pages that already assume a signed-in dashboard
// context, never on the public site, even if a signed-in session happens
// to be sitting in the browser (e.g. someone signed in, then navigated
// back to the homepage just to look around).
const PUBLIC_PATHS = ['/', '/login', '/register', '/reset-password', '/feedback'];

export default function ForcePasswordChangeModal() {
  const { user, updateUser } = useAuth();
  const location = useLocation();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [saving, setSaving] = useState(false);

  const isPublicPath = PUBLIC_PATHS.includes(location.pathname) || location.pathname.startsWith('/feedback/');
  if (!user?.mustChangePassword || isPublicPath) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 8) return toast.error('Password must be at least 8 characters');
    if (password !== confirmPassword) return toast.error('Passwords do not match');

    setSaving(true);
    try {
      await completeForcedPasswordChange(password);
      updateUser({ mustChangePassword: false });
      toast.success('Password set, welcome to Ticano');
    } catch (err) {
      toast.error(err.message || 'Could not update password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white dark:bg-ticano-dark-card rounded-2xl p-6 shadow-2xl">
        <div className="w-12 h-12 rounded-2xl bg-ticano-red/10 text-ticano-red flex items-center justify-center mx-auto mb-4">
          <ShieldCheck size={24} />
        </div>
        <h2 className="text-center font-bold text-ticano-charcoal dark:text-white mb-1">Set your password</h2>
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-5">
          For security, choose your own password before continuing, you were signed in with a temporary one issued by an administrator.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password (min 8 characters)"
              className="w-full pl-9 pr-9 py-2.5 rounded-xl text-sm bg-ticano-bg dark:bg-ticano-dark-bg border border-transparent focus:border-ticano-red/40 outline-none text-ticano-charcoal dark:text-gray-100"
            />
            <button type="button" onClick={() => setShowPass((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          <div className="relative">
            <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type={showPass ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm bg-ticano-bg dark:bg-ticano-dark-bg border border-transparent focus:border-ticano-red/40 outline-none text-ticano-charcoal dark:text-gray-100"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 bg-ticano-red hover:bg-ticano-red-dark text-white rounded-xl font-semibold text-sm transition-colors disabled:opacity-60"
          >
            {saving ? 'Setting password…' : 'Set password & continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
