import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, LogIn, Home } from 'lucide-react';
import Logo from './Logo';
import { useAuth } from '../../context/AuthContext';

export default function SessionExpiredScreen({ reason }) {
  const navigate = useNavigate();
  const { dismissSessionExpired } = useAuth();

  const goTo = (path) => {
    dismissSessionExpired();
    navigate(path, { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-ticano-bg dark:bg-ticano-dark-bg px-4">
      <div className="max-w-sm w-full bg-white dark:bg-ticano-dark-card rounded-2xl shadow-lg p-7 text-center">
        <div className="flex justify-center mb-4"><Logo size={28} withTagline className="items-center" taglineClassName="text-gray-400 text-center" /></div>
        <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center mb-4">
          <Clock size={26} className="text-amber-500" />
        </div>
        <h1 className="text-lg font-bold text-ticano-charcoal dark:text-white mb-1.5">Your session has timed out</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          {reason === 'idle'
            ? "You've been signed out after being idle for a while, to keep your account secure. Please sign in again to continue."
            : 'For your security, you need to sign in again to continue.'}
        </p>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => goTo('/login')}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-ticano-red text-white text-sm font-semibold hover:bg-ticano-red-dark transition-colors"
          >
            <LogIn size={15} /> Sign in again
          </button>
          <button
            onClick={() => goTo('/')}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Home size={15} /> Return to homepage
          </button>
        </div>
      </div>
    </div>
  );
}
