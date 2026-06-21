import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Lock, User, ArrowRight, Sparkles, Shield, TrendingUp, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { login } from '../services/api';
import Logo from '../components/common/Logo';
import TwoFactorAuth from '../components/common/TwoFactorAuth';
import toast from 'react-hot-toast';

const DEMO_ACCOUNTS = [
  ['client@demo.com',    'Client',            'Access your complaints & feedback'],
  ['pm@demo.com',        'Portfolio Manager', 'Manage your client cases'],
  ['service@demo.com',   'Service Manager',   'Branch oversight & staff'],
  ['director@demo.com',  'Director',          'Executive intelligence view'],
  ['marketing@demo.com', 'Marketing',         'Analytics & lead insights'],
  ['admin@demo.com',     'Administrator',     'System configuration'],
];

const FEATURES = [
  { icon: Shield,     label: 'Complaint Management',  desc: '8-stage lifecycle tracking' },
  { icon: TrendingUp, label: 'Branch Intelligence',   desc: 'Real-time health scores' },
  { icon: Users,      label: 'Multi-Role Platform',   desc: '6 specialised dashboards' },
  { icon: Sparkles,   label: 'Smart Insights',        desc: 'AI-powered root cause analysis' },
];

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword]     = useState('');
  const [showPass, setShowPass]      = useState(false);
  const [loading, setLoading]        = useState(false);
  const [showDemos, setShowDemos]    = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [mounted, setMounted]        = useState(false);
  const [show2FA, setShow2FA]         = useState(false);
  const [pendingUser, setPendingUser] = useState(null);
  const { login: authLogin }         = useAuth();
  const navigate                     = useNavigate();

  useEffect(() => { setMounted(true); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier || !password) return toast.error('Please fill in all fields');
    setLoading(true);
    try {
      const { data } = await login(identifier, password);
      if (data.role === 'director' || data.role === 'admin') {
        setPendingUser(data);
        setShow2FA(true);
        setLoading(false);
        return;
      }
      authLogin({ id: data.userId, name: data.name, role: data.role, branch: data.branch, clientType: data.clientType }, data.token);
      const routes = { customer: '/client', portfolio_manager: '/pm', service_manager: '/service-manager', director: '/director', marketing: '/marketing', admin: '/admin' };
      navigate(routes[data.role] || '/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handle2FAVerified = () => {
    if (!pendingUser) return;
    authLogin({ id: pendingUser.userId, name: pendingUser.name, role: pendingUser.role, branch: pendingUser.branch }, pendingUser.token);
    const routes = { director: '/director', admin: '/admin' };
    navigate(routes[pendingUser.role] || '/');
  };

  const fill = (email) => { setIdentifier(email); setPassword('demo123'); setShowDemos(false); };

  if (show2FA && pendingUser) {
    return <TwoFactorAuth userEmail={identifier} userName={pendingUser.name} onVerified={handle2FAVerified} />;
  }

  return (
    <div className="min-h-screen login-bg flex relative overflow-hidden">
      {/* Animated background orbs */}
      <div className="login-orb login-orb-1" />
      <div className="login-orb login-orb-2" />
      <div className="login-orb login-orb-3" />
      <div className="login-grid" />

      {/* Left panel — branding (hidden on mobile) */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 relative z-10">
        <div>
          <div className={`transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-white/80 text-xs font-medium tracking-wide">Service Intelligence Platform</span>
            </div>
            <h1 className="text-5xl font-bold text-white leading-tight mb-4">
              Smarter service.<br />
              <span className="text-ticano-red">Every interaction.</span>
            </h1>
            <p className="text-white/60 text-lg leading-relaxed max-w-md">
              Ticano's unified platform gives every team the intelligence they need — from first contact to resolution.
            </p>
          </div>

          {/* Feature pills */}
          <div className="mt-12 grid grid-cols-2 gap-3">
            {FEATURES.map(({ icon: Icon, label, desc }, i) => (
              <div
                key={label}
                className="bg-white/8 backdrop-blur-sm border border-white/12 rounded-xl p-4 hover:bg-white/12 transition-all duration-300 hover:-translate-y-0.5"
                style={{ animationDelay: `${i * 0.1}s`, animation: mounted ? `fade-up 0.5s ease-out ${i * 0.1}s both` : 'none' }}
              >
                <Icon size={20} className="text-ticano-red mb-2" />
                <p className="text-white text-sm font-semibold">{label}</p>
                <p className="text-white/50 text-xs mt-0.5">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Stats row */}
        <div
          className="flex gap-8"
          style={{ animation: mounted ? 'fade-up 0.5s ease-out 0.4s both' : 'none' }}
        >
          {[['642+', 'Active clients'], ['5', 'Branch locations'], ['99.8%', 'Uptime']].map(([val, lbl]) => (
            <div key={lbl}>
              <p className="text-2xl font-bold text-white">{val}</p>
              <p className="text-white/50 text-xs mt-0.5">{lbl}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative z-10">
        {/* Mobile logo */}
        <div className="lg:hidden text-center mb-8">
          <div className="inline-flex justify-center bg-white/10 backdrop-blur-sm rounded-2xl px-6 py-4 border border-white/20">
            <Logo size={44} animate="spin-in" withWordmark />
          </div>
        </div>

        <div
          className="w-full max-w-md"
          style={{ animation: mounted ? 'fade-up 0.5s ease-out 0.1s both' : 'none' }}
        >
          {/* Desktop logo */}
          <div className="hidden lg:flex items-center gap-3 mb-8">
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-2.5">
              <Logo size={28} animate="spin-in" />
            </div>
            <div>
              <p className="text-white font-bold text-lg leading-tight">Ticano</p>
              <p className="text-white/50 text-xs">Purchase Order Financing</p>
            </div>
          </div>

          <div className="glass-card rounded-2xl shadow-2xl p-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Welcome back</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Sign in to your workspace</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email field */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                  Email or WhatsApp
                </label>
                <div className={`relative transition-all duration-200 ${focusedField === 'id' ? 'scale-[1.01]' : ''}`}>
                  <User className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors duration-200 ${focusedField === 'id' ? 'text-ticano-red' : 'text-gray-400'}`} size={16} />
                  <input
                    type="text"
                    value={identifier}
                    onChange={e => setIdentifier(e.target.value)}
                    onFocus={() => setFocusedField('id')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="email@company.com"
                    className="w-full pl-9 pr-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-ticano-red transition-all duration-200"
                  />
                </div>
              </div>

              {/* Password field */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className={`relative transition-all duration-200 ${focusedField === 'pw' ? 'scale-[1.01]' : ''}`}>
                  <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors duration-200 ${focusedField === 'pw' ? 'text-ticano-red' : 'text-gray-400'}`} size={16} />
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onFocus={() => setFocusedField('pw')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Enter password"
                    className="w-full pl-9 pr-12 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-ticano-red transition-all duration-200"
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading}
                className="group w-full py-3.5 bg-ticano-red hover:bg-ticano-red-dark text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-ticano-red/30 hover:shadow-xl disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform duration-200" />
                  </>
                )}
              </button>
            </form>

            {/* Demo accounts toggle */}
            <div className="mt-5">
              <button
                onClick={() => setShowDemos(!showDemos)}
                className="w-full text-center text-xs text-gray-500 dark:text-gray-400 hover:text-ticano-red transition-colors flex items-center justify-center gap-1.5 py-2"
              >
                <Sparkles size={12} />
                {showDemos ? 'Hide demo accounts' : 'Try a demo account'}
              </button>

              {showDemos && (
                <div className="mt-2 space-y-1 animate-slide-down">
                  {DEMO_ACCOUNTS.map(([email, label, desc]) => (
                    <button
                      key={email}
                      type="button"
                      onClick={() => fill(email)}
                      className="w-full flex items-center justify-between text-xs px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-ticano-red/8 dark:hover:bg-ticano-red/10 hover:border-ticano-red/30 border border-transparent text-gray-700 dark:text-gray-300 transition-all duration-150 group"
                    >
                      <div className="text-left">
                        <span className="font-semibold text-gray-800 dark:text-white block">{label}</span>
                        <span className="text-gray-400 text-[10px]">{desc}</span>
                      </div>
                      <ArrowRight size={12} className="text-gray-300 group-hover:text-ticano-red group-hover:translate-x-0.5 transition-all duration-150" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-700 text-center">
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                New customer?{' '}
                <Link to="/register" className="text-ticano-red font-semibold hover:underline">
                  Create account
                </Link>
              </p>
            </div>
          </div>

          <p className="text-center text-xs text-white/40 mt-6">
            © {new Date().getFullYear()} Ticano Group. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
