import React, { useState, useEffect, useRef } from 'react';
import { Shield, ShieldCheck, RefreshCw, Lock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function TwoFactorAuth({ userEmail, userName, onVerified }) {
  const [code, setCode]           = useState(['','','','','','']);
  const [generatedCode]           = useState(() => Math.floor(100000 + Math.random() * 900000).toString());
  const [loading, setLoading]     = useState(false);
  const [attempts, setAttempts]   = useState(0);
  const [countdown, setCountdown] = useState(30);
  const [showCode, setShowCode]   = useState(false);
  const inputRefs = useRef([]);

  useEffect(() => {
    const timer = setInterval(() => setCountdown(c => c > 0 ? c - 1 : 0), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleInput = (i, val) => {
    if (!/^\d*$/.test(val)) return;
    const newCode = [...code];
    newCode[i] = val.slice(-1);
    setCode(newCode);
    if (val && i < 5) inputRefs.current[i + 1]?.focus();
    if (newCode.every(c => c !== '')) {
      verifyCode(newCode.join(''));
    }
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !code[i] && i > 0) {
      inputRefs.current[i - 1]?.focus();
    }
  };

  const verifyCode = async (entered) => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    if (entered === generatedCode) {
      toast.success('Identity verified ✓');
      onVerified?.();
    } else {
      setAttempts(a => a + 1);
      setCode(['','','','','','']);
      inputRefs.current[0]?.focus();
      if (attempts >= 2) {
        toast.error('Too many attempts. Please log in again.');
      } else {
        toast.error(`Incorrect code. ${2 - attempts} attempt${attempts === 1 ? '' : 's'} remaining.`);
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white dark:bg-ticano-dark-card rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="bg-ticano-charcoal p-6 text-center">
          <div className="w-14 h-14 bg-ticano-red rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
            <Shield size={24} className="text-white"/>
          </div>
          <h2 className="text-white font-bold text-lg">Two-Factor Authentication</h2>
          <p className="text-gray-400 text-xs mt-1">Additional security for {userName}</p>
        </div>

        <div className="p-6">
          <div className="text-center mb-6">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              A 6-digit verification code has been sent to
            </p>
            <p className="font-semibold text-gray-800 dark:text-white mt-1">{userEmail}</p>
          </div>

          {/* Demo code display */}
          <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 mb-5">
            <div>
              <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold">Demo Mode — Your code:</p>
              <p className="font-mono font-bold text-lg text-blue-700 dark:text-blue-300 tracking-widest mt-0.5">
                {showCode ? generatedCode : '• • • • • •'}
              </p>
            </div>
            <button onClick={() => setShowCode(!showCode)} className="text-xs text-blue-500 hover:text-blue-700 font-medium px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg transition-colors">
              {showCode ? 'Hide' : 'Show'}
            </button>
          </div>

          {/* Code input */}
          <div className="flex gap-2 justify-center mb-4">
            {code.map((digit, i) => (
              <input
                key={i}
                ref={el => inputRefs.current[i] = el}
                type="text" inputMode="numeric" maxLength={1}
                value={digit}
                onChange={e => handleInput(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                disabled={loading}
                className={`w-10 h-12 text-center text-xl font-bold border-2 rounded-xl outline-none transition-all duration-150
                  ${digit ? 'border-ticano-red bg-ticano-red/5 text-ticano-charcoal dark:text-white' : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-400'}
                  focus:border-ticano-red focus:bg-ticano-red/5`}
              />
            ))}
          </div>

          {loading && (
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-3">
              <RefreshCw size={14} className="animate-spin text-ticano-red"/>
              Verifying…
            </div>
          )}

          {/* Resend */}
          <div className="flex items-center justify-between text-xs text-gray-400 mt-2">
            <span>{countdown > 0 ? `Resend code in ${countdown}s` : 'Code expired'}</span>
            <button
              disabled={countdown > 0}
              onClick={() => { setCountdown(30); setCode(['','','','','','']); toast.success('New code sent'); }}
              className="text-ticano-red font-medium disabled:opacity-40 hover:underline transition-opacity">
              Resend code
            </button>
          </div>

          {/* Countdown bar */}
          <div className="h-1 bg-gray-100 dark:bg-gray-700 rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-ticano-red rounded-full transition-all duration-1000" style={{ width:`${(countdown/30)*100}%` }}/>
          </div>

          <div className="mt-5 flex items-center gap-2 text-xs text-gray-400 justify-center">
            <Lock size={11}/>
            <span>This protects your Director / Admin account</span>
          </div>
        </div>
      </div>
    </div>
  );
}
