import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Eye, EyeOff, Lock, User, ArrowRight, ChevronRight, Mail, X, ShieldCheck,
  Bell, BellRing, Check, UserPlus, LogIn, Cake, MapPin, Building2, CheckCircle2, ArrowLeft,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  login, requestPasswordReset, getSiteSettings, subscribeTenderNotifications, registerCustomer,
} from '../services/api';
import { BRANCHES, REFERRAL_SOURCES } from '../utils/constants';
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

// Shared field styling for the dark glass theme.
const fieldBase =
  'w-full py-3 rounded-xl text-white text-sm placeholder:text-white/25 focus:outline-none ' +
  'bg-white/[0.08] border border-white/15 hover:border-white/25 focus:border-ticano-red/60 ' +
  'focus:bg-white/[0.12] transition-all duration-200';

export default function LoginPage() {
  // ----- shared / sign-in state -----
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword]     = useState('');
  const [showPass, setShowPass]     = useState(false);
  const [loading, setLoading]       = useState(false);
  const [showDemos, setShowDemos]   = useState(false);
  const [show2FA, setShow2FA]       = useState(false);
  const [pendingUser, setPendingUser] = useState(null);
  const [mounted, setMounted]       = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotResult, setForgotResult] = useState(null);
  const [lp, setLp] = useState({});
  const [activePanel, setActivePanel] = useState('login'); // 'login' | 'register'

  // ----- tender opt-in (no login needed) -----
  const [showTender, setShowTender] = useState(false);
  const [tenderEmail, setTenderEmail] = useState('');
  const [tenderOptIn, setTenderOptIn] = useState(false);
  const [tenderLoading, setTenderLoading] = useState(false);
  const [tenderDone, setTenderDone] = useState(null);

  // ----- inline create-account state -----
  const [reg, setReg] = useState({
    name: '', whatsappNumber: '', email: '', password: '', confirmPassword: '',
    baseLocation: '', preferredBranch: '', referralSource: '', otherText: '',
    birthdayMessagesOptIn: false, birthday: '',
    locationSharingOptIn: true, tenderNotificationsOptIn: false, hadPreviousLoan: null,
  });
  const setR = (k, v) => setReg((p) => ({ ...p, [k]: v }));
  const [regLoading, setRegLoading] = useState(false);
  const [regShowPass, setRegShowPass] = useState(false);

  const { login: authLogin } = useAuth();
  const navigate = useNavigate();
  const isLogin = activePanel === 'login';

  useEffect(() => {
    setMounted(true);
    getSiteSettings().then(({ data }) => setLp(data?.loginPage || {})).catch(() => {});
  }, []);
  const lpVal = (k, fallback) => (lp[k] && String(lp[k]).trim() ? lp[k] : fallback);

  // ----- height-morphing slide between the two panels -----
  const loginRef = useRef(null);
  const registerRef = useRef(null);
  const [panelHeight, setPanelHeight] = useState('auto');
  useLayoutEffect(() => {
    const el = isLogin ? loginRef.current : registerRef.current;
    if (!el) return;
    const update = () => setPanelHeight(el.offsetHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isLogin]);

  // ----- handlers -----
  const toggleTender = () => {
    setShowTender((v) => !v);
    if (!showTender && !tenderEmail) setTenderEmail(identifier.includes('@') ? identifier : '');
  };

  const handleTenderSubscribe = async () => {
    if (!tenderOptIn) return toast.error('Please tick the box to opt in first');
    if (!tenderEmail.trim()) return toast.error('Please enter your email address');
    setTenderLoading(true);
    try {
      const { data } = await subscribeTenderNotifications({ email: tenderEmail });
      setTenderDone(data.message);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setTenderLoading(false);
    }
  };

  const openForgot = () => { setForgotEmail(identifier); setForgotResult(null); setShowForgot(true); };
  const closeForgot = () => { setShowForgot(false); setForgotResult(null); setForgotEmail(''); };

  const handleForgotSubmit = async () => {
    if (!forgotEmail.trim()) return toast.error('Please enter your email address');
    setForgotLoading(true);
    setForgotResult(null);
    try {
      const { data } = await requestPasswordReset(forgotEmail);
      setForgotResult({ type: 'sent', message: data.message });
    } catch (err) {
      if (err.response?.data?.code === 'STAFF_NO_SELF_RESET') {
        setForgotResult({ type: 'staff', message: err.response.data.message });
      } else {
        toast.error(err.response?.data?.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setForgotLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier || !password) return toast.error('Please fill in all fields');
    setLoading(true);
    try {
      const { data } = await login(identifier, password);
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
      pendingUser.token,
    );
    const routes = {
      customer: '/client', portfolio_manager: '/pm', service_manager: '/service-manager',
      director: '/director', marketing: '/marketing', admin: '/admin',
    };
    navigate(routes[pendingUser.role] || '/');
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (reg.password !== reg.confirmPassword) return toast.error('Passwords do not match');
    if (!reg.whatsappNumber.match(/^\+267\d{7,8}$/)) return toast.error('Invalid WhatsApp number. Format: +267XXXXXXXX');
    if (reg.hadPreviousLoan === null) return toast.error('Please tell us if you have had a loan from Ticano before');
    if (!reg.referralSource) return toast.error('Please tell us how you heard about us');
    if (reg.referralSource === 'Other' && !reg.otherText.trim()) return toast.error('Please specify how you heard about us');
    if (reg.birthdayMessagesOptIn && !reg.birthday) return toast.error('Please provide your date of birth to receive birthday messages');
    if (reg.tenderNotificationsOptIn && !reg.email.trim()) return toast.error('Please provide your email address to receive tender alerts');

    const referralSource = reg.referralSource === 'Other' ? `Other: ${reg.otherText}` : reg.referralSource;
    const clientType = reg.hadPreviousLoan ? 'existing' : 'new';

    setRegLoading(true);
    try {
      const { data } = await registerCustomer({
        name: reg.name,
        whatsappNumber: reg.whatsappNumber,
        email: reg.email,
        password: reg.password,
        baseLocation: reg.locationSharingOptIn ? reg.baseLocation : null,
        birthday: reg.birthdayMessagesOptIn ? reg.birthday : null,
        birthdayMessagesOptIn: reg.birthdayMessagesOptIn,
        locationSharingOptIn: reg.locationSharingOptIn,
        tenderNotificationsOptIn: reg.tenderNotificationsOptIn,
        preferredBranch: reg.preferredBranch,
        referralSource,
        clientType,
      });
      if (reg.tenderNotificationsOptIn && reg.email.trim()) {
        subscribeTenderNotifications({ email: reg.email, phone: reg.whatsappNumber }).catch(() => {});
      }
      authLogin({ id: data.userId, name: data.name, role: 'customer', clientType }, data.token);
      toast.success('Account created! Welcome to Ticano.');
      navigate('/client');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setRegLoading(false);
    }
  };

  const fill = (email) => { setIdentifier(email); setPassword('demo123'); setShowDemos(false); };

  if (show2FA && pendingUser) {
    return <TwoFactorAuth userEmail={identifier} userName={pendingUser.name} onVerified={handle2FAVerified} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0b1020] relative overflow-hidden">
      {/* ===== Ambient background — calm, premium, no scattered orbs ===== */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(60rem 60rem at 12% 8%, rgba(206,49,60,0.18), transparent 60%),' +
              'radial-gradient(55rem 55rem at 92% 100%, rgba(37,99,235,0.14), transparent 55%)',
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.6]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.022) 1px, transparent 1px),' +
              'linear-gradient(90deg, rgba(255,255,255,0.022) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
            maskImage: 'radial-gradient(80% 80% at 50% 30%, #000 40%, transparent 100%)',
          }}
        />
        <div className="absolute -top-48 left-1/2 -translate-x-1/2 w-[820px] h-[420px] bg-ticano-red/10 blur-[130px] rounded-full animate-pulse motion-reduce:animate-none" style={{ animationDuration: '6s' }} />
      </div>

      <div className="relative z-10 flex flex-col lg:flex-row flex-1">
        {/* ===== LEFT — Brand ===== */}
        <div className="flex flex-col lg:w-[48%] px-7 pt-8 pb-2 lg:px-16 lg:py-14">
          <div className={`transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'} motion-reduce:transition-none motion-reduce:translate-y-0`}>
            <Link to="/" className="inline-flex items-center gap-1.5 text-white/50 hover:text-white text-xs font-medium mb-6 transition-colors">
              <ArrowLeft size={13} /> Back to homepage
            </Link>
            <div className="flex items-center gap-3 mb-10 lg:mb-14">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-xl shadow-black/30 ring-1 ring-black/5">
                <Logo size={26} />
              </div>
              <div>
                <p className="text-white font-bold text-lg leading-tight">Ticano Group</p>
                <p className="text-white/45 text-xs tracking-wide">{lpVal('brandSubtitle', 'Purchase Order Financing Specialists')}</p>
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            <div className={`transition-all duration-700 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'} motion-reduce:transition-none motion-reduce:translate-y-0`}>
              <h1 className="text-4xl lg:text-5xl xl:text-[3.5rem] font-black text-white leading-[1.04] tracking-tight mb-4 max-w-xl">
                {lpVal('heroTitle', 'As your business grows, we deliver the funds.')}
              </h1>

              {/* Signature: brand slogan */}
              <p className="text-lg mb-6 font-medium" style={{ color: '#CE313C' }}>
                Re Spache sa <span style={{ fontFamily: 'Pacifico, cursive', fontSize: '1.15em' }}>Bangwebi!</span>
              </p>

              <p className="text-white/55 text-base leading-relaxed max-w-md mb-10">
                {lpVal('heroSubtitle', "Botswana's champion for Purchase Order Financing and Invoice Discounting — helping SMEs access the capital they need to fulfil orders and grow with confidence.")}
              </p>

              {/* Trust markers (verifiable, not vanity metrics) */}
              <div className="flex flex-wrap items-stretch gap-x-7 gap-y-4 mb-8">
                {[
                  { val: 'Est. 2015', label: 'Trusted since' },
                  { val: 'NBFIRA', label: 'Regulated' },
                  { val: '5', label: 'Branches nationwide' },
                ].map(({ val, label }) => (
                  <div key={label} className="pr-7 border-r border-white/10 last:border-r-0 last:pr-0">
                    <p className="text-xl font-black text-white leading-none">{val}</p>
                    <p className="text-white/40 text-xs mt-1.5">{label}</p>
                  </div>
                ))}
              </div>

              <div className="w-14 h-1 bg-ticano-red/70 rounded-full" />
            </div>
          </div>

          <p className="hidden lg:block text-white/25 text-xs mt-10">
            © {new Date().getFullYear()} Ticano Group · Gaborone, Botswana
          </p>
        </div>

        {/* ===== RIGHT — Auth card ===== */}
        <div className="flex items-start lg:items-center justify-center lg:w-[52%] px-5 pb-10 pt-2 lg:p-12">
          <div className={`w-full max-w-md transition-all duration-700 delay-150 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} motion-reduce:transition-none motion-reduce:translate-y-0`}>

            {/* Tab switcher with sliding indicator */}
            <div className="relative flex bg-white/[0.06] border border-white/10 rounded-2xl p-1.5 mb-5">
              <div
                className="absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-ticano-red rounded-xl shadow-lg shadow-ticano-red/30 transition-[left] duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none"
                style={{ left: isLogin ? '6px' : 'calc(50%)' }}
              />
              <button
                onClick={() => setActivePanel('login')}
                className="relative z-10 flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-xl transition-colors duration-300 focus-visible:outline-none"
                style={{ color: isLogin ? '#fff' : 'rgba(255,255,255,0.45)' }}
              >
                <LogIn size={14} /> Sign In
              </button>
              <button
                onClick={() => setActivePanel('register')}
                className="relative z-10 flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-xl transition-colors duration-300 focus-visible:outline-none"
                style={{ color: !isLogin ? '#fff' : 'rgba(255,255,255,0.45)' }}
              >
                <UserPlus size={14} /> Create Account
              </button>
            </div>

            {/* Height-morphing cross-slide container */}
            <div
              className="relative transition-[height] duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none"
              style={{ height: panelHeight }}
            >
              {/* ---------- SIGN IN ---------- */}
              <div
                ref={loginRef}
                aria-hidden={!isLogin}
                className={`absolute inset-x-0 top-0 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none
                  ${isLogin ? 'opacity-100 translate-x-0 pointer-events-auto' : 'opacity-0 -translate-x-8 pointer-events-none'}`}
              >
                <div className="bg-white/[0.07] backdrop-blur-xl border border-white/10 rounded-2xl p-7 sm:p-8 shadow-2xl">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-ticano-red/15 rounded-xl flex items-center justify-center">
                      <LogIn size={18} className="text-ticano-red" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white">{lpVal('welcomeTitle', 'Welcome back')}</h2>
                      <p className="text-white/40 text-xs">{lpVal('welcomeSubtitle', 'Sign in to your workspace')}</p>
                    </div>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">Email or WhatsApp</label>
                      <div className="relative">
                        <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-white/30" />
                        <input
                          type="text" value={identifier} onChange={(e) => setIdentifier(e.target.value)}
                          placeholder="email@company.com" autoComplete="username"
                          className={`${fieldBase} pl-9 pr-4`}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">Password</label>
                      <div className="relative">
                        <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-white/30" />
                        <input
                          type={showPass ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter your password" autoComplete="current-password"
                          className={`${fieldBase} pl-9 pr-10`}
                        />
                        <button type="button" onClick={() => setShowPass(!showPass)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors">
                          {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                      <div className="flex justify-end mt-1.5">
                        <button type="button" onClick={openForgot} className="text-xs text-white/40 hover:text-ticano-red transition-colors">
                          Forgot password?
                        </button>
                      </div>
                    </div>

                    <button type="submit" disabled={loading}
                      className="group w-full flex items-center justify-center gap-2 py-3.5 bg-ticano-red hover:bg-ticano-red-dark text-white rounded-xl font-semibold text-sm transition-all duration-200 shadow-lg shadow-ticano-red/30 hover:shadow-ticano-red/50 hover:scale-[1.02] active:scale-[0.98] motion-reduce:hover:scale-100 disabled:opacity-60 mt-1">
                      {loading
                        ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        : <><span>Sign In</span><ArrowRight size={14} className="group-hover:translate-x-1 transition-transform duration-200 motion-reduce:transition-none" /></>}
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
                            className="w-full flex items-center justify-between text-xs px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-ticano-red/30 text-white/70 transition-all duration-150 group">
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

                  {/* Tender opt-in */}
                  <div className="mt-5 pt-4 border-t border-white/10">
                    <button onClick={toggleTender} className="w-full flex items-center justify-between gap-2 text-left group">
                      <span className="flex items-center gap-2 text-sm text-white/70 group-hover:text-white transition-colors">
                        <Bell size={15} className="text-ticano-red" /> Get tender opportunity alerts
                      </span>
                      <ChevronRight size={15} className={`text-white/40 transition-transform duration-200 ${showTender ? 'rotate-90' : ''}`} />
                    </button>
                    {showTender && (
                      <div className="mt-3 animate-fade-in">
                        {!tenderDone ? (
                          <div className="rounded-xl bg-white/[0.06] border border-white/10 p-4 space-y-3">
                            <p className="text-xs text-white/50 leading-relaxed">
                              Be the first to know when a new tender or purchase-order opportunity is published. No account needed — just opt in with your email.
                            </p>
                            <div className="relative">
                              <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                              <input
                                type="email" value={tenderEmail} onChange={(e) => setTenderEmail(e.target.value)}
                                placeholder="email@company.com"
                                onKeyDown={(e) => e.key === 'Enter' && handleTenderSubscribe()}
                                className={`${fieldBase} pl-9 pr-4 py-2.5`}
                              />
                            </div>
                            <label className="flex items-start gap-2.5 cursor-pointer select-none">
                              <input type="checkbox" checked={tenderOptIn} onChange={(e) => setTenderOptIn(e.target.checked)}
                                className="accent-ticano-red w-4 h-4 mt-0.5 shrink-0" />
                              <span className="text-xs text-white/60 leading-relaxed">
                                Yes, notify me about new tender opportunities from Ticano Group.
                              </span>
                            </label>
                            <button onClick={handleTenderSubscribe} disabled={tenderLoading || !tenderOptIn}
                              className="w-full flex items-center justify-center gap-2 py-2.5 bg-ticano-red hover:bg-ticano-red-dark text-white rounded-xl font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                              {tenderLoading
                                ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                : <><BellRing size={14} /> Notify me</>}
                            </button>
                          </div>
                        ) : (
                          <div className="rounded-xl bg-green-500/10 border border-green-500/30 p-4 flex items-start gap-3 animate-scale-in">
                            <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                              <Check size={16} className="text-green-400" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-white">You&apos;re on the list</p>
                              <p className="text-xs text-white/55 mt-0.5">{tenderDone}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ---------- CREATE ACCOUNT ---------- */}
              <div
                ref={registerRef}
                aria-hidden={isLogin}
                className={`absolute inset-x-0 top-0 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none
                  ${!isLogin ? 'opacity-100 translate-x-0 pointer-events-auto' : 'opacity-0 translate-x-8 pointer-events-none'}`}
              >
                <div className="bg-white/[0.07] backdrop-blur-xl border border-white/10 rounded-2xl p-7 sm:p-8 shadow-2xl">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-ticano-red/15 rounded-xl flex items-center justify-center">
                      <UserPlus size={18} className="text-ticano-red" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white">Create your account</h2>
                      <p className="text-white/40 text-xs">Open a free Ticano client account</p>
                    </div>
                  </div>

                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">Full name *</label>
                        <input type="text" required value={reg.name} onChange={(e) => setR('name', e.target.value)}
                          placeholder="Your full name" className={`${fieldBase} px-4`} />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">WhatsApp *</label>
                        <input type="tel" required value={reg.whatsappNumber} onChange={(e) => setR('whatsappNumber', e.target.value)}
                          placeholder="+267XXXXXXXX" className={`${fieldBase} px-4`} />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">Email address</label>
                      <div className="relative">
                        <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-white/30" />
                        <input type="email" value={reg.email} onChange={(e) => setR('email', e.target.value)}
                          placeholder="you@example.com" className={`${fieldBase} pl-9 pr-4`} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">Password *</label>
                        <div className="relative">
                          <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-white/30" />
                          <input type={regShowPass ? 'text' : 'password'} required minLength={8}
                            value={reg.password} onChange={(e) => setR('password', e.target.value)}
                            placeholder="Min 8 characters" className={`${fieldBase} pl-9 pr-10`} />
                          <button type="button" onClick={() => setRegShowPass(!regShowPass)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors">
                            {regShowPass ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">Confirm *</label>
                        <input type="password" required value={reg.confirmPassword} onChange={(e) => setR('confirmPassword', e.target.value)}
                          placeholder="Repeat password" className={`${fieldBase} px-4`} />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">Preferred branch *</label>
                      <div className="relative">
                        <Building2 size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-white/30" />
                        <select required value={reg.preferredBranch} onChange={(e) => setR('preferredBranch', e.target.value)}
                          className={`${fieldBase} pl-9 pr-4 appearance-none [&>option]:text-gray-900`}>
                          <option value="">Select a branch</option>
                          {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* Prior-client toggle */}
                    <div>
                      <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">Have you had a loan from Ticano before? *</label>
                      <div className="grid grid-cols-2 gap-2.5">
                        <button type="button" onClick={() => setR('hadPreviousLoan', true)}
                          className={`px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all ${reg.hadPreviousLoan === true ? 'border-ticano-red bg-ticano-red text-white' : 'border-white/15 text-white/60 hover:border-white/30'}`}>
                          Yes, existing client
                        </button>
                        <button type="button" onClick={() => setR('hadPreviousLoan', false)}
                          className={`px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all ${reg.hadPreviousLoan === false ? 'border-ticano-red bg-ticano-red text-white' : 'border-white/15 text-white/60 hover:border-white/30'}`}>
                          No, I&apos;m new
                        </button>
                      </div>
                    </div>

                    {/* Opt-ins */}
                    <div className="space-y-2.5">
                      <label className="flex items-start gap-3 cursor-pointer rounded-xl border border-white/10 bg-white/[0.04] p-3">
                        <input type="checkbox" checked={reg.locationSharingOptIn} onChange={(e) => setR('locationSharingOptIn', e.target.checked)}
                          className="mt-0.5 w-4 h-4 accent-ticano-red shrink-0" />
                        <span className="text-xs text-white/65 leading-relaxed">
                          <span className="inline-flex items-center gap-1.5 font-medium text-white/85"><MapPin size={13} className="text-ticano-red" /> Share my location</span>
                          <br />Connects you to the nearest branch. Opt out anytime.
                        </span>
                      </label>
                      {reg.locationSharingOptIn && (
                        <input type="text" value={reg.baseLocation} onChange={(e) => setR('baseLocation', e.target.value)}
                          placeholder="Town / City (e.g. Mogoditshane)" className={`${fieldBase} px-4 animate-fade-in`} />
                      )}

                      <label className="flex items-start gap-3 cursor-pointer rounded-xl border border-white/10 bg-white/[0.04] p-3">
                        <input type="checkbox" checked={reg.birthdayMessagesOptIn} onChange={(e) => setR('birthdayMessagesOptIn', e.target.checked)}
                          className="mt-0.5 w-4 h-4 accent-ticano-red shrink-0" />
                        <span className="text-xs text-white/65 leading-relaxed">
                          <span className="inline-flex items-center gap-1.5 font-medium text-white/85"><Cake size={13} className="text-ticano-red" /> Receive birthday messages</span>
                          <br />A friendly WhatsApp greeting. Date of birth only collected if you opt in.
                        </span>
                      </label>
                      {reg.birthdayMessagesOptIn && (
                        <input type="date" required value={reg.birthday} onChange={(e) => setR('birthday', e.target.value)}
                          className={`${fieldBase} px-4 animate-fade-in [color-scheme:dark]`} />
                      )}

                      <label className="flex items-start gap-3 cursor-pointer rounded-xl border border-white/10 bg-white/[0.04] p-3">
                        <input type="checkbox" checked={reg.tenderNotificationsOptIn} onChange={(e) => setR('tenderNotificationsOptIn', e.target.checked)}
                          className="mt-0.5 w-4 h-4 accent-ticano-red shrink-0" />
                        <span className="text-xs text-white/65 leading-relaxed">
                          <span className="inline-flex items-center gap-1.5 font-medium text-white/85"><Bell size={13} className="text-ticano-red" /> Get tender opportunity alerts</span>
                          <br />Email me when a new tender or purchase order is published.
                        </span>
                      </label>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">How did you hear about us? *</label>
                      <select required value={reg.referralSource} onChange={(e) => setR('referralSource', e.target.value)}
                        className={`${fieldBase} px-4 appearance-none [&>option]:text-gray-900`}>
                        <option value="">Select an option</option>
                        {REFERRAL_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    {reg.referralSource === 'Other' && (
                      <input type="text" required value={reg.otherText} onChange={(e) => setR('otherText', e.target.value)}
                        placeholder="Tell us how you heard about Ticano" className={`${fieldBase} px-4 animate-fade-in`} />
                    )}

                    <button type="submit" disabled={regLoading}
                      className="group w-full flex items-center justify-center gap-2 py-3.5 bg-ticano-red hover:bg-ticano-red-dark text-white rounded-xl font-semibold text-sm transition-all duration-200 shadow-lg shadow-ticano-red/30 hover:shadow-ticano-red/50 hover:scale-[1.02] active:scale-[0.98] motion-reduce:hover:scale-100 disabled:opacity-60 mt-1">
                      {regLoading
                        ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        : <><CheckCircle2 size={15} /> Create account</>}
                    </button>
                  </form>

                  <button onClick={() => setActivePanel('login')}
                    className="mt-4 w-full text-center text-xs text-white/40 hover:text-white/70 transition-colors flex items-center justify-center gap-1.5">
                    <LogIn size={13} /> Already have an account? Sign in
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* mobile footer */}
      <div className="relative z-10 text-center py-4 border-t border-white/5 lg:hidden">
        <p className="text-white/20 text-xs">© {new Date().getFullYear()} Ticano Group · ticanogroup.co.bw</p>
      </div>

      {/* ===== FORGOT PASSWORD MODAL ===== */}
      {showForgot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeForgot} />
          <div className="relative w-full max-w-md bg-[#111827] border border-white/10 rounded-2xl shadow-2xl p-7 animate-scale-in">
            <button onClick={closeForgot} className="absolute top-4 right-4 text-white/30 hover:text-white/70 transition-colors"><X size={18} /></button>

            {!forgotResult && (
              <>
                <div className="w-11 h-11 bg-ticano-red/15 rounded-xl flex items-center justify-center mb-4">
                  <Lock size={20} className="text-ticano-red" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">Reset your password</h3>
                <p className="text-white/50 text-sm mb-5">
                  Enter the email linked to your client account and we&apos;ll send you a reset link.
                  <br />
                  <span className="text-white/35 text-xs">Staff accounts are reset by an Administrator.</span>
                </p>
                <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">Email address</label>
                <div className="relative mb-5">
                  <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                  <input
                    type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="email@company.com"
                    onKeyDown={(e) => e.key === 'Enter' && handleForgotSubmit()}
                    className={`${fieldBase} pl-9 pr-4`}
                  />
                </div>
                <button onClick={handleForgotSubmit} disabled={forgotLoading}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-ticano-red hover:bg-ticano-red-dark text-white rounded-xl font-semibold text-sm transition-all disabled:opacity-60">
                  {forgotLoading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Send reset link'}
                </button>
              </>
            )}

            {forgotResult?.type === 'sent' && (
              <div className="text-center py-2">
                <div className="w-12 h-12 bg-green-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck size={24} className="text-green-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Check your email</h3>
                <p className="text-white/50 text-sm mb-6">{forgotResult.message}</p>
                <button onClick={closeForgot} className="w-full py-3 bg-white/10 hover:bg-white/15 text-white rounded-xl font-semibold text-sm transition-all">Back to sign in</button>
              </div>
            )}

            {forgotResult?.type === 'staff' && (
              <div className="text-center py-2">
                <div className="w-12 h-12 bg-amber-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock size={22} className="text-amber-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Contact your Administrator</h3>
                <p className="text-white/50 text-sm mb-6">{forgotResult.message}</p>
                <button onClick={closeForgot} className="w-full py-3 bg-white/10 hover:bg-white/15 text-white rounded-xl font-semibold text-sm transition-all">Back to sign in</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
