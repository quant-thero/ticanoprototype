import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Lock, User, ArrowRight, ChevronRight } from 'lucide-react';
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

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword]     = useState('');
  const [showPass, setShowPass]     = useState(false);
  const [loading, setLoading]       = useState(false);
  const [showDemos, setShowDemos]   = useState(false);
  const [show2FA, setShow2FA]       = useState(false);
  const [pendingUser, setPendingUser] = useState(null);
  const [mounted, setMounted]       = useState(false);
  const { login: authLogin }        = useAuth();
  const navigate                    = useNavigate();

  useEffect(() => { setMounted(true); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier || !password) return toast.error('Please fill in all fields');
    setLoading(true);
    try {
      const { data } = await login(identifier, password);
      // 2FA for ALL users
      setPendingUser(data);
      setShow2FA(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handle2FAVerified = () => {
    if (!pendingUser) return;
    authLogin(
      { id: pendingUser.userId, name: pendingUser.name, role: pendingUser.role, branch: pendingUser.branch, clientType: pendingUser.clientType },
      pendingUser.token
    );
    const routes = {
      customer: '/client', portfolio_manager: '/pm', service_manager: '/service-manager',
      director: '/director', marketing: '/marketing', admin: '/admin',
    };
    navigate(routes[pendingUser.role] || '/');
  };

  const fill = (email) => { setIdentifier(email); setPassword('demo123'); setShowDemos(false); };

  if (show2FA && pendingUser) {
    return <TwoFactorAuth userEmail={identifier} userName={pendingUser.name} onVerified={handle2FAVerified} />;
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#0f172a] relative overflow-hidden">
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-ticano-red/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-ticano-red/10 rounded-full blur-3xl animate-pulse" style={{animationDelay:'1s'}} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white/3 rounded-full blur-3xl" />
        {/* Grid lines */}
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '50px 50px',
        }} />
      </div>

      {/* ===== LEFT PANEL — Branding ===== */}
      <div className="relative z-10 flex flex-col justify-between lg:w-[52%] p-8 lg:p-14">
        {/* Logo */}
        <div className={`transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-ticano-red rounded-xl flex items-center justify-center shadow-lg shadow-ticano-red/30">
              <Logo size={22} />
            </div>
            <div>
              <p className="text-white font-bold text-lg leading-tight">Ticano Group</p>
              <p className="text-white/40 text-xs">Service Intelligence Platform</p>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col justify-center py-8">
          {/* Tagline badge */}
          <div className={`inline-flex items-center gap-2 bg-ticano-red/15 border border-ticano-red/30 rounded-full px-4 py-1.5 mb-6 w-fit transition-all duration-700 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-ticano-red animate-pulse" />
            <span className="text-ticano-red text-xs font-semibold tracking-wide">Botswana's #1 Trade Finance Platform</span>
          </div>

          {/* Big headline */}
          <div className={`transition-all duration-700 delay-150 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <h1 className="text-4xl lg:text-5xl font-black text-white leading-[1.1] mb-6">
              As Your Business<br />
              <span className="text-ticano-red">Grows,</span> We Deliver<br />
              The Funds.
            </h1>
          </div>

          {/* Body text */}
          <div className={`transition-all duration-700 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <p className="text-white/60 text-sm leading-relaxed max-w-md mb-6">
              Ticano is a champion for Purchase Order Financing and Invoice Discounting in Botswana. 
              We are innovative in our founding approach for both your domestic and international transactions. 
              We pride ourselves with expert trade finance knowledge, quick turnaround times, good interest rates 
              and in our focus to help the SME grow.
            </p>
            <p className="text-white/40 text-sm leading-relaxed max-w-md mb-8 italic border-l-2 border-ticano-red/40 pl-4">
              "No one should be small forever. No amount is too big or too small for us."
            </p>
          </div>

          {/* Stat — awareness */}
          <div className={`transition-all duration-700 delay-250 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 max-w-md mb-8">
              <p className="text-3xl font-black text-white mb-1">1 in 3</p>
              <p className="text-white/50 text-sm">Companies haven't heard of invoice financing and purchase order financing — we're changing that.</p>
            </div>
          </div>

          {/* Stats row */}
          <div className={`flex gap-8 transition-all duration-700 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            {[['642+','Active clients'],['5','Branch locations'],['99.8%','Uptime']].map(([val,lbl]) => (
              <div key={lbl}>
                <p className="text-xl font-black text-white">{val}</p>
                <p className="text-white/40 text-xs mt-0.5">{lbl}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="text-white/20 text-xs">© {new Date().getFullYear()} Ticano Group · ticanogroup.co.bw</p>
      </div>

      {/* ===== RIGHT PANEL — Login Form ===== */}
      <div className="relative z-10 flex items-center justify-center lg:w-[48%] p-6 lg:p-12">
        <div className={`w-full max-w-md transition-all duration-700 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>

          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl px-5 py-3">
              <div className="w-8 h-8 bg-ticano-red rounded-lg flex items-center justify-center">
                <Logo size={18} />
              </div>
              <div className="text-left">
                <p className="text-white font-bold text-sm">Ticano Group</p>
                <p className="text-white/40 text-xs">Trade Finance Platform</p>
              </div>
            </div>
            {/* Mobile tagline */}
            <div className="mt-5 px-2">
              <h2 className="text-white text-xl font-bold leading-snug mb-2">As Your Business Grows,<br/>We Deliver The Funds.</h2>
              <p className="text-white/50 text-xs leading-relaxed">Botswana's champion for PO Financing & Invoice Discounting.</p>
            </div>
          </div>

          {/* Card */}
          <div className="bg-white/[0.07] backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-1">Welcome back</h2>
            <p className="text-white/40 text-sm mb-6">Sign in to your workspace</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">Email or WhatsApp</label>
                <div className="relative">
                  <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                  <input
                    type="text" value={identifier} onChange={e => setIdentifier(e.target.value)}
                    placeholder="email@company.com"
                    className="w-full pl-9 pr-4 py-3 bg-white/10 border border-white/15 rounded-xl text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-ticano-red/60 focus:bg-white/15 transition-all duration-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">Password</label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                  <input
                    type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-9 pr-10 py-3 bg-white/10 border border-white/15 rounded-xl text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-ticano-red/60 focus:bg-white/15 transition-all duration-200"
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                    {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="group w-full flex items-center justify-center gap-2 py-3.5 bg-ticano-red hover:bg-ticano-red-dark text-white rounded-xl font-semibold text-sm transition-all duration-200 shadow-lg shadow-ticano-red/30 hover:shadow-ticano-red/50 disabled:opacity-60 mt-2">
                {loading
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <><span>Sign In</span><ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" /></>
                }
              </button>
            </form>

            {/* Demo accounts */}
            <div className="mt-5">
              <button onClick={() => setShowDemos(!showDemos)}
                className="w-full text-center text-xs text-white/30 hover:text-white/60 transition-colors py-1.5">
                {showDemos ? '▲ Hide demo accounts' : '▼ Try a demo account'}
              </button>
              {showDemos && (
                <div className="mt-2 space-y-1 animate-fade-in">
                  {DEMO_ACCOUNTS.map(([email, label, desc]) => (
                    <button key={email} onClick={() => fill(email)}
                      className="w-full flex items-center justify-between text-xs px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/8 hover:border-ticano-red/30 text-white/70 transition-all duration-150 group">
                      <div className="text-left">
                        <p className="font-semibold text-white/90">{label}</p>
                        <p className="text-white/40 text-[10px]">{desc}</p>
                      </div>
                      <ChevronRight size={12} className="text-white/30 group-hover:text-ticano-red transition-colors" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-5 pt-4 border-t border-white/10 text-center">
              <p className="text-white/30 text-sm">
                New customer?{' '}
                <Link to="/register" className="text-ticano-red hover:text-white font-semibold transition-colors">Create account</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
