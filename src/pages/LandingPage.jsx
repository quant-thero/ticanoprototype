import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronRight, MapPin, Phone, Mail, MessageCircle, Facebook, Linkedin, Youtube,
  ArrowRight, CheckCircle, Users, Clock, TrendingUp, Shield, Zap, Star,
  ChevronDown, ChevronUp, X, Briefcase, BookOpen, Megaphone, Globe, Award, Target,
  Building2, ExternalLink, Menu, Calendar, Tag, Instagram, Twitter,
  Languages, Type, Moon, Sun, FileText,
} from 'lucide-react';
import { getPublicTestimonials, getPublicBlogPosts, getCareers, getSiteSettings, getPublicTenders, getHomepageAnnouncement, getHomepagePromo } from '../services/api';
import CareerApplyForm from '../components/common/CareerApplyForm';
import { useSettings } from '../context/SettingsContext';
import { useTheme } from '../context/ThemeContext';
import { BRANCH_INFO, COMPANY_PROFILE } from '../utils/constants';
import Logo from '../components/common/Logo';

const BRANCH_WHATSAPP = {
  Gaborone:    '+26774306295',
  Francistown: '+26773434064',
  Maun:        '+26773053343',
  Palapye:     '+26773589338',
  Phikwe:      '+26773475757',
};

// TikTok SVG icon (not in lucide-react)
function TikTokIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V9a8.16 8.16 0 004.77 1.52V7.07a4.85 4.85 0 01-1-.38z"/>
    </svg>
  );
}

function DisplayMenu({ variant = 'desktop', darkMode, toggleDarkMode }) {
  const { lang, setLang, largeText, setLargeText } = useSettings();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  if (variant === 'mobile') {
    return (
      <div className="border-t border-gray-100 dark:border-gray-700 mt-2 pt-3">
        <p className="px-3 text-xs uppercase tracking-wide text-gray-400 mb-2">Display</p>
        <div className="flex gap-2 px-3 mb-2">
          {[['en', 'English'], ['tn', 'Setswana']].map(([code, label]) => (
            <button key={code} onClick={() => setLang(code)} className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${lang === code ? 'bg-ticano-red text-white border-ticano-red' : 'border-gray-200 text-gray-600 dark:border-gray-600 dark:text-gray-300'}`}>{label}</button>
          ))}
        </div>
        <button onClick={() => setLargeText(!largeText)} className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg">
          <span className="flex items-center gap-2"><Type size={15} /> Large Text</span>
          <span className={`w-9 h-5 rounded-full transition-colors relative ${largeText ? 'bg-ticano-red' : 'bg-gray-300'}`}>
            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${largeText ? 'left-4' : 'left-0.5'}`} />
          </span>
        </button>
        <button onClick={toggleDarkMode} className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg">
          <span className="flex items-center gap-2">{darkMode ? <Sun size={15}/> : <Moon size={15}/>} {darkMode ? 'Light Mode' : 'Dark Mode'}</span>
          <span className={`w-9 h-5 rounded-full transition-colors relative ${darkMode ? 'bg-ticano-red' : 'bg-gray-300'}`}>
            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${darkMode ? 'left-4' : 'left-0.5'}`} />
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} title="Display settings"
        className="p-2 text-gray-500 dark:text-gray-400 hover:text-ticano-red hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
        <Globe size={18} />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-60 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 p-4 z-50 animate-scale-in">
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5"><Languages size={13} /> Language</p>
          <div className="flex gap-2 mb-4">
            {[['en', 'English'], ['tn', 'Setswana']].map(([code, label]) => (
              <button key={code} onClick={() => { setLang(code); setOpen(false); }} className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all duration-200 ${lang === code ? 'bg-ticano-red text-white border-ticano-red' : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300'}`}>{label}</button>
            ))}
          </div>
          <div className="border-t border-gray-100 dark:border-gray-700 pt-3 space-y-1">
            <button onClick={() => setLargeText(!largeText)} className="w-full flex items-center justify-between px-2 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors">
              <span className="flex items-center gap-2"><Type size={15} /> Large Text</span>
              <span className={`w-9 h-5 rounded-full transition-colors relative ${largeText ? 'bg-ticano-red' : 'bg-gray-200 dark:bg-gray-600'}`}>
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${largeText ? 'left-4' : 'left-0.5'}`} />
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


function DarkModeToggle({ darkMode, toggleDarkMode }) {
  return (
    <button
      onClick={toggleDarkMode}
      title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      className={`relative p-2 rounded-xl transition-all duration-300 group
        ${darkMode
          ? 'bg-yellow-400/15 text-yellow-300 hover:bg-yellow-400/25'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
        }`}
    >
      <div className="relative w-5 h-5 flex items-center justify-center overflow-hidden">
        <Sun
          size={18}
          className={`absolute transition-all duration-500 ${darkMode ? 'rotate-0 opacity-100 scale-100' : 'rotate-90 opacity-0 scale-75'}`}
        />
        <Moon
          size={18}
          className={`absolute transition-all duration-500 ${darkMode ? '-rotate-90 opacity-0 scale-75' : 'rotate-0 opacity-100 scale-100'}`}
        />
      </div>
    </button>
  );
}

function Counter({ target, suffix = '' }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        let start = 0;
        const step = target / 60;
        const timer = setInterval(() => {
          start += step;
          if (start >= target) { setCount(target); clearInterval(timer); }
          else setCount(Math.floor(start));
        }, 16);
      }
    }, { threshold: 0.5 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);
  return <span ref={ref}>{count}{suffix}</span>;
}

function TestimonialSlider({ testimonials }) {
  const [offset, setOffset] = useState(0);
  const cardW = 320 + 16;
  useEffect(() => {
    const interval = setInterval(() => {
      setOffset(prev => {
        const max = testimonials.length * cardW;
        return (prev + 1) % max;
      });
    }, 30);
    return () => clearInterval(interval);
  }, [testimonials.length]);

  const doubled = [...testimonials, ...testimonials];
  return (
    <div className="overflow-hidden relative">
      <div className="flex gap-4 transition-none" style={{ transform: `translateX(-${offset}px)`, width: `${doubled.length * cardW}px` }}>
        {doubled.map((t, i) => (
          <div key={i} className="flex-shrink-0 w-80 bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-md">
            <div className="flex gap-1 mb-3">
              {[1,2,3,4,5].map(s => <Star key={s} size={14} fill="#FFC107" color="#FFC107" />)}
            </div>
            <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed mb-4 italic">"{t.comment}"</p>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-ticano-red rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
                {t.name.charAt(0)}
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white text-sm">{t.name}</p>
                <p className="text-xs text-gray-400">{t.company} · {t.branch}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-gray-50 dark:from-gray-900 to-transparent pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-gray-50 dark:from-gray-900 to-transparent pointer-events-none" />
    </div>
  );
}

function WhatsAppPicker({ onClose }) {
  const openWA = (branch) => {
    const number = BRANCH_WHATSAPP[branch].replace(/\D/g, '');
    window.open(`https://wa.me/${number}?text=Hi%20Ticano%20${branch}%20branch%2C%20I%20would%20like%20to%20enquire%20about%20your%20services.`, '_blank');
    onClose();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-5 animate-scale-in">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
              <MessageCircle size={16} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-gray-900 dark:text-white text-sm">WhatsApp Us</p>
              <p className="text-xs text-gray-400">Choose your nearest branch</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1"><X size={16} /></button>
        </div>
        <div className="space-y-2">
          {Object.keys(BRANCH_INFO).map(branch => (
            <button key={branch} onClick={() => openWA(branch)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-700 hover:bg-green-50 dark:hover:bg-green-900/30 border border-gray-100 dark:border-gray-600 hover:border-green-200 transition-all duration-150 group">
              <div className="flex items-center gap-3">
                <MapPin size={14} className="text-ticano-red" />
                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-800 dark:text-white group-hover:text-green-700 dark:group-hover:text-green-400">{branch}</p>
                  <p className="text-xs text-gray-400">{BRANCH_INFO[branch].address}</p>
                </div>
              </div>
              <MessageCircle size={14} className="text-gray-300 group-hover:text-green-500 transition-colors" />
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400 text-center mt-3">We typically reply within 1 business hour</p>
      </div>
    </div>
  );
}

// Animated social icon with brand colors
function SocialIcon({ s }) {
  const [clicked, setClicked] = useState(false);
  const [hovered, setHovered] = useState(false);

  const BRAND_COLORS = {
    facebook:  { bg: '#1877F2', shadow: 'rgba(24,119,242,0.5)'  },
    instagram: { bg: 'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)', shadow: 'rgba(220,39,67,0.5)' },
    linkedin:  { bg: '#0A66C2', shadow: 'rgba(10,102,194,0.5)'  },
    twitter:   { bg: '#1DA1F2', shadow: 'rgba(29,161,242,0.5)'  },
    whatsapp:  { bg: '#25D366', shadow: 'rgba(37,211,102,0.5)'  },
    youtube:   { bg: '#FF0000', shadow: 'rgba(255,0,0,0.5)'     },
    tiktok:    { bg: '#010101', shadow: 'rgba(105,201,208,0.5)' },
  };

  const brand = BRAND_COLORS[s.key] || { bg: '#CE313C', shadow: 'rgba(206,49,60,0.5)' };
  const Icon = s.icon;

  const handleClick = () => {
    setClicked(true);
    setTimeout(() => setClicked(false), 600);
  };

  const iconStyle = hovered || clicked ? {
    background: brand.bg,
    boxShadow: `0 0 18px 4px ${brand.shadow}`,
    transform: clicked ? 'scale(1.25) rotate(8deg)' : 'scale(1.15) rotate(-3deg)',
    transition: 'all 0.25s cubic-bezier(.34,1.56,.64,1)',
    color: '#fff',
  } : {
    transition: 'all 0.25s ease',
  };

  return (
    <a
      href={s.url}
      target="_blank"
      rel="noopener noreferrer"
      title={s.label}
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800"
      style={iconStyle}
    >
      {s.key === 'tiktok' ? <TikTokIcon size={16} /> : <Icon size={16} />}
    </a>
  );
}

// Animated social icon for contact/footer (dark bg version)
function SocialIconDark({ s }) {
  const [clicked, setClicked] = useState(false);
  const [hovered, setHovered] = useState(false);

  const BRAND_COLORS = {
    facebook:  { bg: '#1877F2', shadow: 'rgba(24,119,242,0.6)'  },
    instagram: { bg: 'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)', shadow: 'rgba(220,39,67,0.6)' },
    linkedin:  { bg: '#0A66C2', shadow: 'rgba(10,102,194,0.6)'  },
    twitter:   { bg: '#1DA1F2', shadow: 'rgba(29,161,242,0.6)'  },
    whatsapp:  { bg: '#25D366', shadow: 'rgba(37,211,102,0.6)'  },
    youtube:   { bg: '#FF0000', shadow: 'rgba(255,0,0,0.6)'     },
    tiktok:    { bg: '#010101', shadow: 'rgba(105,201,208,0.6)' },
  };

  const brand = BRAND_COLORS[s.key] || { bg: '#CE313C', shadow: 'rgba(206,49,60,0.6)' };
  const Icon = s.icon;

  const handleClick = () => {
    setClicked(true);
    setTimeout(() => setClicked(false), 600);
  };

  const iconStyle = hovered || clicked ? {
    background: brand.bg,
    boxShadow: `0 0 22px 6px ${brand.shadow}`,
    transform: clicked ? 'scale(1.3) rotate(10deg)' : 'scale(1.18) rotate(-4deg)',
    transition: 'all 0.25s cubic-bezier(.34,1.56,.64,1)',
    color: '#fff',
    borderColor: 'transparent',
  } : {
    transition: 'all 0.25s ease',
  };

  return (
    <a
      href={s.url}
      target="_blank"
      rel="noopener noreferrer"
      title={s.label}
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="w-11 h-11 bg-white/10 border border-white/15 rounded-xl flex items-center justify-center text-white/50"
      style={iconStyle}
    >
      {s.key === 'tiktok' ? <TikTokIcon size={18} /> : <Icon size={18} />}
    </a>
  );
}

const VALUES_CONFIG = [
  { icon: Shield,     title: 'Client First',  desc: 'Every decision we make starts with our clients. Your growth is our success. We are not just a finance company - we are your partner.',           color: 'from-blue-500 to-blue-700',      glow: 'rgba(59,130,246,0.35)',   iconBg: 'bg-blue-500' },
  { icon: Shield,     title: 'Integrity',     desc: 'We operate with full transparency. No hidden fees, no surprises. What we promise, we deliver - every single time.',                             color: 'from-emerald-500 to-emerald-700', glow: 'rgba(16,185,129,0.35)',  iconBg: 'bg-emerald-500' },
  { icon: Zap,        title: 'Innovation',    desc: 'We are constantly reimagining how trade finance works in Botswana - making it faster, simpler, and more accessible for every business.',        color: 'from-amber-500 to-orange-600',    glow: 'rgba(245,158,11,0.35)',  iconBg: 'bg-amber-500' },
  { icon: Users,      title: 'Inclusivity',   desc: 'From a P10,000 order to a P10,000,000 deal - no amount is too big or too small. Every business deserves a chance to grow.',                    color: 'from-purple-500 to-purple-700',   glow: 'rgba(168,85,247,0.35)',  iconBg: 'bg-purple-500' },
  { icon: Target,     title: 'Excellence',    desc: 'We hold ourselves to the highest standards in service delivery, compliance, and client satisfaction. Good is never good enough for us.',         color: 'from-ticano-red to-red-700',      glow: 'rgba(206,49,60,0.35)',   iconBg: 'bg-ticano-red' },
  { icon: TrendingUp, title: 'Growth',        desc: 'We believe in the potential of every SME in Botswana. Our mission is to be the fuel that powers your next level.',                               color: 'from-teal-500 to-cyan-600',       glow: 'rgba(20,184,166,0.35)',  iconBg: 'bg-teal-500' },
];

const REQUIRED_DOCUMENTS = [
  { icon: FileText, title: 'Purchase Order',                    desc: 'A confirmed purchase order from your customer, detailing the order value and delivery terms.' },
  { icon: FileText, title: 'Supplier Quotations',               desc: 'Quotations from your supplier showing the cost of goods, materials or services needed to fulfil the order.' },
  { icon: FileText, title: 'Valid Tax Clearance Certificate',   desc: 'Current BURS tax clearance certificate confirming your business is in good standing with BURS.' },
  { icon: FileText, title: 'Bank Confirmation Letter',          desc: 'Letter from your bank confirming your account details and current standing.' },
  { icon: FileText, title: 'Certified Copy of Director\'s ID', desc: 'Certified copy of the national ID or passport for each company director.' },
  { icon: FileText, title: 'Director\'s ITC Report',           desc: 'Credit report from ITC confirming the creditworthiness of the director(s).' },
  { icon: FileText, title: 'CIPA / Business Registration',      desc: 'Company registration documents from CIPA confirming the business is registered and active.' },
];

const PO_CYCLE_STEPS = [
  { step: 1, title: 'Ticano Pays Supplier',      desc: 'Ticano pays the supplier on behalf of the client.',                                                                                     icon: Briefcase,  color: 'from-blue-500 to-blue-700' },
  { step: 2, title: 'Supplier Delivers',      desc: 'Supplier ships products to client or order to customer.',                                                                                     icon: Shield,     color: 'from-ticano-red to-red-700' },
  { step: 3, title: 'Client Delivers',           desc: 'The SME or client delivers the final product.',                                                                                          icon: TrendingUp, color: 'from-emerald-500 to-emerald-700' },
  { step: 4, title: 'Ticano Receives Payment',   desc: 'Ticano receives payment from the government or the SME\'s customer, is reimbursed for the costs of funding, and the balance is sent as profit earned.', icon: Target, color: 'from-amber-500 to-orange-600' },
];

function ScrollFAB() {
  const [atTop, setAtTop] = useState(true);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const scrolled = window.scrollY;
      setAtTop(scrolled < 200);
      setVisible(scrolled > 80);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleClick = () => {
    if (atTop) {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <button
      onClick={handleClick}
      title={atTop ? 'Scroll to bottom' : 'Back to top'}
      className={`fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 group
        bg-white/10 backdrop-blur-md border border-white/20 hover:border-ticano-red/60 hover:bg-ticano-red text-white/60 hover:text-white
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}
      style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.25)' }}
    >
      <span className={`transition-transform duration-300 ${atTop ? '' : 'rotate-180'}`}>
        <ChevronDown size={20} />
      </span>
    </button>
  );
}

export default function LandingPage() {
  const [testimonials, setTestimonials] = useState([]);
  const [blogs, setBlogs] = useState([]);
  const [careers, setCareers] = useState([]);
  const [tenders, setTenders] = useState([]);
  const [showWA, setShowWA] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [selectedCareer, setSelectedCareer] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [site, setSite] = useState(null);
  const [legalDoc, setLegalDoc] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [announcement, setAnnouncement] = useState(null);
  const [annDismissed, setAnnDismissed] = useState(false);
  const [promo, setPromo] = useState(null);
  const [showPromoPopup, setShowPromoPopup] = useState(false);
  const [promoBannerDismissed, setPromoBannerDismissed] = useState(false);
  const barsRef = useRef(null);
  const [barsH, setBarsH] = useState(0);

  const { darkMode, toggleDarkMode } = useTheme();
  const { t } = useSettings();

  useEffect(() => {
    setMounted(true);
    getPublicTestimonials().then(({ data }) => setTestimonials(data));
    getPublicBlogPosts().then(({ data }) => setBlogs(data));
    getCareers().then(({ data }) => setCareers(data));
    getPublicTenders().then(({ data }) => setTenders(data));
    getSiteSettings().then(({ data }) => setSite(data)).catch(() => {});
    getHomepageAnnouncement().then(({ data }) => setAnnouncement(data)).catch(() => {});
    getHomepagePromo().then(({ data }) => { setPromo(data); if (data?.enabled && data?.mode === 'popup') setTimeout(() => setShowPromoPopup(true), 1200); }).catch(() => {});
  }, []);

  const hp = site?.homepage || {};
  const hpVal = (k, fallback) => (hp[k] && String(hp[k]).trim() ? hp[k] : fallback);

  const social = site?.social || {};
  const contactEmail = site?.contactEmail || COMPANY_PROFILE.email;
  const isValidUrl = (u) => typeof u === 'string' && /^https?:\/\/.+/i.test(u.trim());
  const SOCIAL_DEFS = [
    { key: 'facebook',  icon: Facebook,       label: 'Facebook',    color: 'hover:text-blue-500'  },
    { key: 'instagram', icon: Instagram,      label: 'Instagram',   color: 'hover:text-pink-400'  },
    { key: 'linkedin',  icon: Linkedin,       label: 'LinkedIn',    color: 'hover:text-blue-400'  },
    { key: 'twitter',   icon: Twitter,        label: 'X (Twitter)', color: 'hover:text-sky-400'   },
    { key: 'whatsapp',  icon: MessageCircle,  label: 'WhatsApp',    color: 'hover:text-green-400' },
    { key: 'youtube',   icon: Youtube,        label: 'YouTube',     color: 'hover:text-red-400'   },
    { key: 'tiktok',    icon: null,           label: 'TikTok',      color: 'hover:text-cyan-400'  },
  ];
  const SOCIAL_LINKS = SOCIAL_DEFS
    .map((d) => ({ ...d, url: social[d.key]?.url, enabled: social[d.key]?.enabled }))
    .filter((s) => s.enabled && isValidUrl(s.url));

  const legalPublished = (key) => site?.legal?.[key]?.published || '';
  const openLegal = (title, key) => setLegalDoc({ title, body: legalPublished(key) });
  const scrollTo = (id) => { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); setMobileMenu(false); };

  const annOn = announcement?.enabled && !annDismissed;
  const promoBannerOn = promo?.enabled && promo?.mode === 'banner' && !promoBannerDismissed;
  useEffect(() => { setBarsH(barsRef.current ? barsRef.current.offsetHeight : 0); }, [annOn, promoBannerOn]);
  const PROMO_THEME = { red: 'bg-ticano-red text-white', charcoal: 'bg-ticano-charcoal text-white', light: 'bg-amber-50 text-ticano-charcoal border-b border-amber-200' };

  const NAV = [
    { label: t('About'),      id: 'about'     },
    { label: t('Services'),   id: 'services'  },
    { label: t('Documents'),  id: 'documents' },
    { label: t('Funding'),    id: 'funding'   },
    { label: t('Branches'),   id: 'branches'  },
    { label: t('Blog'),       id: 'blog'      },
    { label: t('Careers'),    id: 'careers'   },
    { label: t('Tenders'),    id: 'tenders'   },
    { label: t('Contact'),    id: 'contact'   },
  ];

  const DEFAULT_SERVICES = [
    { icon: Briefcase, title: 'Purchase Order Financing',
      desc: 'Funding to help businesses fulfil confirmed purchase orders and contracts by covering the cost of goods, materials and supplies — without needing cash upfront.',
      highlight: 'No minimum or maximum amount',
      long: 'Purchase Order Financing lets you accept and deliver on large confirmed orders even when you do not have the upfront cash to pay suppliers. Ticano pays your supplier directly so production or delivery can begin immediately, then recovers the amount plus an agreed margin once your customer pays. Because we assess the creditworthiness of your buyer — not just your balance sheet — growing SMEs qualify where traditional lenders say no.',
      features: ['Suppliers paid directly by Ticano', 'Based on your buyer\'s creditworthiness', 'Finance domestic and international purchases', 'No minimum or maximum financing limit'] },
    { icon: TrendingUp, title: 'Invoice Discounting',
      desc: 'Immediate access to cash by advancing funds against approved invoices — so you do not have to wait for payment from the procuring entity.',
      highlight: 'Fast access to capital',
      long: 'Invoice Discounting turns your unpaid invoices into immediate working capital. Instead of waiting 30, 60 or 90 days for your customers to settle, Ticano advances you a substantial portion of the invoice value now, and you receive the balance (less our fee) once the invoice is paid. It keeps your cash flow steady so you can take on the next job without delay.',
      features: ['Advance against approved invoices', 'Improves day-to-day cash flow', 'Scales as your sales grow', 'No minimum or maximum limit'] },
    { icon: Briefcase, title: 'Contract Financing',
      desc: 'Working capital financing that enables contractors to execute awarded contracts without cash flow constraints — so you can deliver every project with confidence.',
      highlight: 'Deliver with confidence',
      long: 'Contract Financing supports businesses that have won contracts with government, parastatals, or large corporates but need capital to execute them. We structure funding around the contract\'s milestones and payment terms so you can mobilise, deliver, and grow your track record with confidence.',
      features: ['Structured around contract milestones', 'Ideal for government & corporate contracts', 'Mobilisation and execution funding', 'Build a stronger delivery track record'] },
    { icon: Users, title: 'SME Advisory',
      desc: 'Our experienced Portfolio Managers provide personalised, relationship-focused advice — helping your business structure deals, understand risks, and scale confidently.',
      highlight: 'Expert guidance',
      long: 'Beyond funding, Ticano\'s Portfolio Managers work with you to structure deals, understand risk, and plan for growth. Whether you\'re pricing a tender, negotiating supplier terms, or planning expansion, you get practical, Botswana-focused advice from a team that understands the SME journey.',
      features: ['Dedicated Portfolio Manager', 'Deal structuring & risk guidance', 'Tender and pricing support', 'Growth and scaling strategy'] },
  ];
  const SERVICE_ICONS = [Briefcase, TrendingUp, Briefcase, Users];
  const editedServices = hp.services;
  const SERVICES = (Array.isArray(editedServices) && editedServices.length)
    ? editedServices.map((sv, i) => ({
        icon: DEFAULT_SERVICES[i]?.icon || SERVICE_ICONS[i % SERVICE_ICONS.length] || Briefcase,
        features: DEFAULT_SERVICES[i]?.features || [],
        ...sv,
      }))
    : DEFAULT_SERVICES;

  const TYPE_BADGE = { 'Full-time':'bg-blue-100 text-blue-700', 'Internship':'bg-purple-100 text-purple-700', 'Part-time':'bg-green-100 text-green-700', 'Voluntary':'bg-amber-100 text-amber-700' };
  const CAT_BADGE  = { 'News':'bg-blue-100 text-blue-700', 'Education':'bg-green-100 text-green-700', 'Announcement':'bg-amber-100 text-amber-700' };

  const dm = darkMode;

  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 ${dm ? 'dark bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
      {/* Top bars */}
      <div ref={barsRef} className="fixed top-0 left-0 right-0 z-50">
        {annOn && (
          <div className="bg-ticano-charcoal text-white text-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-center gap-3 text-center">
              <Megaphone size={15} className="text-ticano-red shrink-0" />
              <span className="leading-snug">
                {announcement.text}
                {announcement.link ? <a href={announcement.link} className="underline ml-2 font-semibold">Learn more</a> : null}
              </span>
              <button onClick={() => setAnnDismissed(true)} className="absolute right-4 text-white/60 hover:text-white" aria-label="Dismiss"><X size={15} /></button>
            </div>
          </div>
        )}
        {promoBannerOn && (
          <div className={PROMO_THEME[promo.theme] || PROMO_THEME.red}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-center gap-3 text-center text-sm relative">
              <span className="font-semibold">{promo.title}</span>
              <span className="hidden sm:inline opacity-90">{promo.message}</span>
              {promo.ctaLabel && (
                promo.ctaLink?.startsWith('/')
                  ? <Link to={promo.ctaLink} className="shrink-0 px-3 py-1 rounded-lg bg-white/20 hover:bg-white/30 font-semibold">{promo.ctaLabel}</Link>
                  : <a href={promo.ctaLink} className="shrink-0 px-3 py-1 rounded-lg bg-white/20 hover:bg-white/30 font-semibold">{promo.ctaLabel}</a>
              )}
              <button onClick={() => setPromoBannerDismissed(true)} className="absolute right-4 opacity-70 hover:opacity-100" aria-label="Dismiss"><X size={15} /></button>
            </div>
          </div>
        )}
      </div>

      {/* NAVBAR */}
      <nav style={{ top: barsH }} className={`fixed left-0 right-0 z-40 backdrop-blur-md border-b shadow-sm transition-colors duration-300
        ${dm ? 'bg-gray-900/90 border-gray-700' : 'bg-white/90 border-gray-100'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shadow-sm border ${dm ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
              <Logo size={22} />
            </div>
            <div>
              <p className={`font-black text-sm leading-tight ${dm ? 'text-white' : 'text-ticano-charcoal'}`}>Ticano Group</p>
              <p className="text-gray-400 text-[9px] leading-tight">Purchase Order Financing Specialists</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-1">
            {NAV.map(n => (
              <button key={n.id} onClick={() => scrollTo(n.id)}
                className={`px-3 py-2 text-sm font-medium transition-colors rounded-lg hover:bg-red-50 hover:text-ticano-red dark:hover:bg-red-900/20 ${dm ? 'text-gray-300' : 'text-gray-600'}`}>
                {n.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {/* Dark mode toggle */}
            <DarkModeToggle darkMode={dm} toggleDarkMode={toggleDarkMode} />
            <Link to="/login" className="hidden sm:flex items-center gap-1.5 px-4 py-2 bg-ticano-red text-white rounded-xl text-sm font-semibold hover:bg-ticano-red-dark transition-all shadow-sm hover:shadow-md">
              Sign In <ArrowRight size={13} />
            </Link>
            <div className="hidden md:block">
              <DisplayMenu variant="desktop" darkMode={dm} toggleDarkMode={toggleDarkMode} />
            </div>
            <button onClick={() => setMobileMenu(!mobileMenu)} className={`md:hidden p-2 ${dm ? 'text-gray-300' : 'text-gray-500'} hover:text-gray-700`}>
              <Menu size={20} />
            </button>
          </div>
        </div>

        {mobileMenu && (
          <div className={`md:hidden border-t px-4 py-3 space-y-1 animate-slide-down ${dm ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-100'}`}>
            {NAV.map(n => (
              <button key={n.id} onClick={() => scrollTo(n.id)}
                className={`w-full text-left px-3 py-2.5 text-sm font-medium hover:text-ticano-red hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors ${dm ? 'text-gray-300' : 'text-gray-600'}`}>
                {n.label}
              </button>
            ))}
            <Link to="/login" className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-ticano-red text-white rounded-xl text-sm font-semibold mt-2">
              Sign In <ArrowRight size={13} />
            </Link>
            <DisplayMenu variant="mobile" darkMode={dm} toggleDarkMode={toggleDarkMode} />
          </div>
        )}
      </nav>

      {/* HERO */}
      <section className="relative min-h-screen flex items-center pt-16 overflow-hidden" style={{ marginTop: barsH, background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)' }}>
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-ticano-red/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-ticano-red/10 rounded-full blur-3xl animate-pulse" style={{animationDelay:'1.5s'}} />
        <div className="absolute inset-0" style={{backgroundImage:'linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px)',backgroundSize:'60px 60px'}} />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className={`transition-all duration-700 ${mounted?'opacity-100 translate-y-0':'opacity-0 translate-y-8'}`}>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-[1.05] mb-4">
                {hpVal('heroTitle', 'As Your Business Grows, We Deliver The Funds.')}
              </h1>
              {/* Slogan */}
              <p className="text-base mb-5" style={{color:'#CE313C'}}>
                Re Spache sa <span style={{fontFamily:'Pacifico, cursive'}}>Bangwebi!</span>
              </p>
              <p className="text-white/60 text-lg leading-relaxed mb-4 max-w-lg">
                {hpVal('heroSubtitle', "Ticano helps businesses across Botswana access the funding they need to fulfil contracts, purchase goods and services, and maintain healthy cash flow — so you can deliver on time and grow with confidence.")}
              </p>
              <p className="text-white/40 text-sm italic border-l-2 border-ticano-red/40 pl-4 mb-8 max-w-md">
                "{hpVal('heroQuote', 'No one should be small forever. No amount is too big or too small for us.')}"
              </p>
              <div className="flex flex-wrap gap-3">
                <Link to="/register" className="flex items-center gap-2 px-6 py-3.5 bg-ticano-red text-white rounded-xl font-bold hover:bg-ticano-red-dark transition-all shadow-lg shadow-ticano-red/30 hover:shadow-ticano-red/50">
                  {hpVal('ctaPrimary', 'Get Started')} <ArrowRight size={16} />
                </Link>
                <button onClick={() => scrollTo('services')} className="flex items-center gap-2 px-6 py-3.5 bg-white/10 text-white rounded-xl font-semibold border border-white/20 hover:bg-white/20 transition-all backdrop-blur-sm">
                  {hpVal('ctaSecondary', 'Our Services')} <ChevronDown size={16} />
                </button>
              </div>
              <div className="flex gap-8 mt-10 pt-8 border-t border-white/10">
                {[
                  [hpVal('stat1Value','2,000+'), hpVal('stat1Label','Businesses funded in 2025')],
                  [hpVal('stat2Value','5'),      hpVal('stat2Label','Branch locations')],
                  [hpVal('stat3Value','24hrs'),  hpVal('stat3Label','Typical turnaround time')],
                ].map(([val,lbl])=>(
                  <div key={lbl}>
                    <p className="text-2xl font-black text-white">{val}</p>
                    <p className="text-white/40 text-xs mt-0.5">{lbl}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className={`transition-all duration-700 delay-200 ${mounted?'opacity-100 translate-y-0':'opacity-0 translate-y-8'}`}>
              <div className="bg-white/8 backdrop-blur-xl border border-white/15 rounded-3xl p-8">
                <p className="text-white/60 text-xs uppercase tracking-widest font-semibold mb-2">Did you know?</p>
                <p className="text-4xl font-black text-white mb-2">2,000+</p>
                <p className="text-white/70 text-sm mb-6 leading-relaxed">Businesses across Botswana were successfully assisted by Ticano in 2025 alone. No amount is too big or too small — we have a solution for every business.</p>
                <div className="space-y-3">
                  {[
                    ['Fulfil large orders without upfront cash'],
                    ['Fast response — funding within 24 hours of receiving documents'],
                    ['Rates from 6.5% to 8.5% — competitive and transparent'],
                    ['Finance local AND international supplier purchases'],
                  ].map(([t])=>(
                    <div key={t} className="flex items-center gap-3">
                      <CheckCircle size={15} className="text-green-400 shrink-0" />
                      <p className="text-white/70 text-sm">{t}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-6 pt-5 border-t border-white/10">
                  <p className="text-white/40 text-xs mb-3">Trusted by businesses in</p>
                  <div className="flex flex-wrap gap-2">
                    {['Gaborone','Francistown','Maun','Palapye','Phikwe'].map(b=>(
                      <span key={b} className="text-xs bg-white/10 text-white/60 px-2.5 py-1 rounded-full">{b}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <button onClick={() => scrollTo('about')} className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/40 hover:text-white/70 transition-colors animate-bounce">
          <ChevronDown size={24} />
        </button>
      </section>

      {/* ABOUT SECTION */}
      <section id="about" className={`py-20 transition-colors duration-300 ${dm ? 'bg-gray-900' : 'bg-white'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-ticano-red font-semibold text-sm uppercase tracking-widest mb-3">About Our Company</p>
              <h2 className={`text-3xl sm:text-4xl font-black leading-tight mb-6 ${dm ? 'text-white' : 'text-ticano-charcoal'}`}>
                Ticano Group
              </h2>
              <p className={`leading-relaxed mb-4 ${dm ? 'text-gray-300' : 'text-gray-600'}`}>
                Ticano is a Botswana-based financing company specialising in purchase order financing, contract financing and invoice discounting. We help businesses access the funding they need to fulfil contracts, purchase goods and services, and maintain healthy cash flow while waiting for customer payments.
              </p>
              <p className={`leading-relaxed mb-4 ${dm ? 'text-gray-300' : 'text-gray-600'}`}>
                Our commitment is to provide fast, flexible and reliable financing solutions that enable businesses across Botswana to deliver projects on time and grow with confidence. Credit decisions are based upon the creditworthiness of the SME's buyer and the strengths of the transactions themselves — not strictly on the balance sheet of the SME.
              </p>
              <p className={`leading-relaxed mb-6 ${dm ? 'text-gray-300' : 'text-gray-600'}`}>
                We are regulated by the <strong className={dm ? 'text-white' : 'text-ticano-charcoal'}>Non-Banking Financial Institutions Regulatory Authority (NBFIRA)</strong>, and hold Economic Diversification Drive accreditation from the Ministry of Trade and Industry.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link to="/register" className="flex items-center gap-1.5 px-5 py-2.5 bg-ticano-red text-white rounded-xl text-sm font-semibold hover:bg-ticano-red-dark transition-all shadow-sm">
                  Open Account <ArrowRight size={13} />
                </Link>
                <button onClick={() => scrollTo('contact')} className={`flex items-center gap-1.5 px-5 py-2.5 border rounded-xl text-sm font-semibold transition-all ${dm ? 'border-gray-600 text-gray-300 hover:bg-gray-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  Contact Us
                </button>
              </div>
            </div>
            <div id="director" className={`rounded-3xl border p-8 shadow-md transition-colors ${dm ? 'bg-gray-800 border-gray-700' : 'bg-gradient-to-br from-gray-50 to-white border-gray-100'}`}>
              <div className="flex items-start gap-5 mb-5">
                <div className="w-20 h-20 bg-ticano-charcoal rounded-2xl flex items-center justify-center text-white text-2xl font-black shrink-0 shadow-lg">O</div>
                <div>
                  <p className={`font-black text-lg leading-tight ${dm ? 'text-white' : 'text-ticano-charcoal'}`}>Opelo Motswagae</p>
                  <p className="text-ticano-red text-sm font-semibold">Director & Founder</p>
                  <p className="text-gray-400 text-xs mt-1">Ticano Group · Gaborone, Botswana</p>
                </div>
              </div>
              <p className={`text-sm leading-relaxed mb-4 italic ${dm ? 'text-gray-300' : 'text-gray-600'}`}>
                "We started Ticano because we saw too many brilliant Botswana businesses fail - not because of poor products or bad management, but because they could not access the working capital they needed. We exist to change that reality."
              </p>
              <div className="grid grid-cols-3 gap-3 text-center">
                {[['2015','Founded'],['2,000+','Businesses in 2025'],['5','Branches']].map(([v,l])=>(
                  <div key={l} className={`rounded-xl p-3 border shadow-sm ${dm ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-100'}`}>
                    <p className="font-black text-ticano-red text-lg">{v}</p>
                    <p className="text-xs text-gray-400 mt-0.5 leading-tight">{l}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MISSION & VISION */}
      <section className={`py-16 transition-colors duration-300 ${dm ? 'bg-gray-800' : 'bg-gray-50'}`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className={`rounded-3xl p-8 border shadow-sm ${dm ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-100'}`}>
              <div className="w-12 h-12 bg-ticano-red/10 rounded-2xl flex items-center justify-center mb-5">
                <Target size={24} className="text-ticano-red" />
              </div>
              <h3 className={`text-xl font-black mb-3 ${dm ? 'text-white' : 'text-ticano-charcoal'}`}>Our Mission</h3>
              <p className={`leading-relaxed text-sm ${dm ? 'text-gray-300' : 'text-gray-600'}`}>{site?.mission || COMPANY_PROFILE.about}</p>
            </div>
            <div className="bg-ticano-charcoal rounded-3xl p-8 shadow-sm">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-5">
                <TrendingUp size={24} className="text-ticano-red" />
              </div>
              <h3 className="text-xl font-black text-white mb-3">Our Vision</h3>
              <p className="text-white/70 leading-relaxed text-sm">{site?.vision || COMPANY_PROFILE.tagline}</p>
            </div>
          </div>
        </div>
      </section>

      {/* PO FUNDING CYCLE */}
      <section id="funding" className={`py-20 transition-colors duration-300 ${dm ? 'bg-gray-900' : 'bg-white'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-ticano-red font-semibold text-sm uppercase tracking-widest mb-3">How It Works</p>
            <h2 className={`text-3xl sm:text-4xl font-black mb-4 ${dm ? 'text-white' : 'text-ticano-charcoal'}`}>Purchase Order Funding Cycle</h2>
            <p className={`max-w-xl mx-auto text-sm ${dm ? 'text-gray-400' : 'text-gray-500'}`}>From purchase order to profit - here's how Ticano makes it happen.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
            {/* connector line */}
            <div className="hidden lg:block absolute top-14 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-blue-500 via-ticano-red via-emerald-500 to-amber-500 opacity-30 z-0" />
            {PO_CYCLE_STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={step.step} className={`relative z-10 group rounded-2xl p-6 border text-center transition-all duration-300 hover:-translate-y-2 hover:shadow-xl animate-fade-up
                  ${dm ? 'bg-gray-800 border-gray-700 hover:border-gray-500' : 'bg-white border-gray-100 hover:border-gray-300'}`}
                  style={{animationDelay:`${i*0.1}s`}}>
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <Icon size={24} className="text-white" />
                  </div>
                  <div className="w-7 h-7 rounded-full bg-ticano-red text-white text-xs font-black flex items-center justify-center mx-auto mb-3 shadow">
                    {step.step}
                  </div>
                  <h3 className={`font-bold mb-2 ${dm ? 'text-white' : 'text-ticano-charcoal'}`}>{step.title}</h3>
                  <p className={`text-sm leading-relaxed ${dm ? 'text-gray-400' : 'text-gray-500'}`}>{step.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* THE TICANO DIFFERENCE */}
      <section className="py-20 bg-ticano-charcoal relative overflow-hidden">
        <div className="absolute inset-0" style={{backgroundImage:'linear-gradient(rgba(255,255,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.03) 1px,transparent 1px)',backgroundSize:'40px 40px'}} />
        <div className="absolute top-0 right-0 w-96 h-96 bg-ticano-red/10 rounded-full blur-3xl" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-ticano-red font-semibold text-sm uppercase tracking-widest mb-3">Why Choose Us</p>
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">{hpVal('aboutHeading', 'The Ticano Difference')}</h2>
            <p className="text-white/50 max-w-xl mx-auto text-sm leading-relaxed">We are not just another finance company. We are your growth partner - built specifically for the realities of doing business in Botswana.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon:Clock,       title:'Fast Response Times',      desc:'We aim to assist clients within 24 hours of receiving all required documentation. We know time is money — and we do not waste yours.' },
              { icon:Shield,      title:'No Minimum or Maximum',    desc:'We do not have a minimum or maximum financing limit. Each application is assessed individually to ensure the project remains viable and allows you to earn a reasonable profit.' },
              { icon:Award,       title:'Competitive Rates',        desc:'Our financing rates range from 6.5% to 8.5%, depending on the amount requested and the nature of the transaction. Transparent pricing, always.' },
              { icon:Users,       title:'Dedicated Portfolio Manager', desc:'Every client gets a personal Portfolio Manager who knows your business. Personalised, relationship-focused customer service — not a call centre.' },
              { icon:Globe,       title:'International Financing',  desc:'We can finance international quotations and purchases, allowing businesses to source goods and equipment from suppliers outside Botswana.' },
              { icon:TrendingUp,  title:'Flexible Structures',      desc:'Flexible financing structures tailored to each client\'s needs. We have extensive experience in purchase order, contract and project financing.' },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:border-white/25 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg animate-fade-up" style={{animationDelay:`${i*0.08}s`}}>
                  <div className="w-10 h-10 bg-ticano-red/20 rounded-xl flex items-center justify-center mb-4">
                    <Icon size={18} className="text-ticano-red" />
                  </div>
                  <h3 className="font-bold text-white mb-2">{item.title}</h3>
                  <p className="text-white/50 text-sm leading-relaxed">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" className={`py-20 transition-colors duration-300 ${dm ? 'bg-gray-800' : 'bg-gray-50'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-ticano-red font-semibold text-sm uppercase tracking-widest mb-3">What We Offer</p>
            <h2 className={`text-3xl sm:text-4xl font-black mb-4 ${dm ? 'text-white' : 'text-ticano-charcoal'}`}>Our Services</h2>
            <p className={`max-w-xl mx-auto text-sm leading-relaxed ${dm ? 'text-gray-400' : 'text-gray-500'}`}>Flexible, fast, and fair trade finance solutions designed for the Botswana market.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {SERVICES.map((s, i) => {
              const Icon = s.icon;
              return (
                <button key={s.title} onClick={() => setSelectedService(s)}
                  className={`group text-left w-full rounded-2xl p-6 border shadow-sm hover:shadow-lg hover:border-ticano-red/30 transition-all duration-300 hover:-translate-y-1 animate-fade-up focus:outline-none focus:ring-2 focus:ring-ticano-red/40
                    ${dm ? 'bg-gray-700 border-gray-600 hover:bg-gray-600' : 'bg-white border-gray-100'}`}
                  style={{animationDelay:`${i*0.08}s`}}>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-ticano-red/10 group-hover:bg-ticano-red/20 rounded-xl flex items-center justify-center shrink-0 transition-colors">
                      <Icon size={22} className="text-ticano-red" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <h3 className={`font-bold ${dm ? 'text-white' : 'text-ticano-charcoal'}`}>{s.title}</h3>
                        <span className="text-xs bg-ticano-red/10 text-ticano-red px-2 py-0.5 rounded-full font-medium">{s.highlight}</span>
                      </div>
                      <p className={`text-sm leading-relaxed ${dm ? 'text-gray-300' : 'text-gray-500'}`}>{s.desc}</p>
                      <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-ticano-red opacity-80 group-hover:opacity-100 group-hover:gap-2 transition-all">
                        Learn more <ArrowRight size={13} />
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* REQUIRED DOCUMENTS */}
      <section id="documents" className={`py-20 transition-colors duration-300 ${dm ? 'bg-gray-900' : 'bg-white'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-ticano-red font-semibold text-sm uppercase tracking-widest mb-3">Get Funded</p>
            <h2 className={`text-3xl sm:text-4xl font-black mb-4 ${dm ? 'text-white' : 'text-ticano-charcoal'}`}>Required Documents</h2>
            <p className={`max-w-xl mx-auto text-sm ${dm ? 'text-gray-400' : 'text-gray-500'}`}>
              To apply for funding with Ticano, please prepare the following documents. Having these ready speeds up your approval.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {REQUIRED_DOCUMENTS.map((doc, i) => (
              <div key={doc.title}
                className={`group relative rounded-2xl p-6 border transition-all duration-300 hover:-translate-y-2 hover:shadow-xl cursor-default animate-fade-up
                  ${dm
                    ? 'bg-gray-800 border-gray-700 hover:border-ticano-red/50 hover:bg-gray-750'
                    : 'bg-white border-gray-100 hover:border-ticano-red/30 hover:bg-red-50/30'
                  }`}
                style={{animationDelay:`${i*0.07}s`}}>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-all duration-300 group-hover:scale-110
                  bg-gradient-to-br from-ticano-red/20 to-ticano-red/5 group-hover:from-ticano-red group-hover:to-ticano-red/80`}>
                  <FileText size={22} className="text-ticano-red group-hover:text-white transition-colors duration-300" />
                </div>
                <div className="w-6 h-6 rounded-full bg-ticano-red/10 text-ticano-red text-xs font-black flex items-center justify-center mb-3 group-hover:bg-ticano-red group-hover:text-white transition-colors">
                  {i+1}
                </div>
                <h3 className={`font-bold text-sm mb-2 leading-snug ${dm ? 'text-white' : 'text-ticano-charcoal'}`}>{doc.title}</h3>
                <p className={`text-xs leading-relaxed ${dm ? 'text-gray-400' : 'text-gray-500'}`}>{doc.desc}</p>
                {/* hover glow */}
                <div className="absolute inset-0 rounded-2xl bg-ticano-red/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link to="/register" className="inline-flex items-center gap-2 px-8 py-3.5 bg-ticano-red text-white rounded-xl font-bold hover:bg-ticano-red-dark transition-all shadow-lg shadow-ticano-red/30 hover:shadow-ticano-red/50">
              Get Started <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* OUR VALUES */}
      <section className={`py-20 transition-colors duration-300 ${dm ? 'bg-gray-800' : 'bg-gray-50'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-ticano-red font-semibold text-sm uppercase tracking-widest mb-3">What We Stand For</p>
            <h2 className={`text-3xl sm:text-4xl font-black mb-4 ${dm ? 'text-white' : 'text-ticano-charcoal'}`}>Our Values</h2>
            <p className={`max-w-xl mx-auto text-sm ${dm ? 'text-gray-400' : 'text-gray-500'}`}>Every decision at Ticano is guided by these core principles.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {VALUES_CONFIG.map((v, i) => {
              const Icon = v.icon;
              return (
                <div key={v.title}
                  className={`group relative p-6 rounded-2xl border overflow-hidden transition-all duration-300 hover:-translate-y-2 cursor-default animate-fade-up
                    ${dm ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-100'}`}
                  style={{
                    animationDelay:`${i*0.08}s`,
                    '--glow': v.glow,
                  }}>
                  {/* hover overlay */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${v.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300 pointer-events-none`} />
                  <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${v.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg
                    ${dm ? 'bg-gray-600' : 'bg-gray-100'} group-hover:${v.iconBg}`}
                    style={{
                      boxShadow: 'none',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = v.iconBg.replace('bg-',''); e.currentTarget.style.boxShadow = `0 8px 20px ${v.glow}`; }}
                    onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.boxShadow = ''; }}
                  >
                    <Icon size={20} className={`transition-colors duration-300 ${dm ? 'text-gray-300' : 'text-gray-500'} group-hover:text-white`} />
                  </div>
                  <h3 className={`font-bold mb-2 ${dm ? 'text-white' : 'text-ticano-charcoal'}`}>{v.title}</h3>
                  <p className={`text-sm leading-relaxed ${dm ? 'text-gray-300' : 'text-gray-500'}`}>{v.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className={`py-20 overflow-hidden transition-colors duration-300 ${dm ? 'bg-gray-900' : 'bg-white'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-10">
          <div className="text-center">
            <p className="text-ticano-red font-semibold text-sm uppercase tracking-widest mb-3">Client Stories</p>
            <h2 className={`text-3xl sm:text-4xl font-black mb-4 ${dm ? 'text-white' : 'text-ticano-charcoal'}`}>What Our Clients Say</h2>
            <div className="flex gap-1 justify-center mb-2">
              {[1,2,3,4,5].map(s=><Star key={s} size={18} fill="#FFC107" color="#FFC107"/>)}
            </div>
            <p className={`text-sm ${dm ? 'text-gray-400' : 'text-gray-500'}`}>5-star rated by businesses across Botswana</p>
          </div>
        </div>
        {testimonials.length > 0 && <TestimonialSlider testimonials={testimonials} />}
      </section>

      {/* BRANCHES */}
      <section id="branches" className={`py-20 transition-colors duration-300 ${dm ? 'bg-gray-800' : 'bg-gray-50'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-ticano-red font-semibold text-sm uppercase tracking-widest mb-3">Find Us</p>
            <h2 className={`text-3xl sm:text-4xl font-black mb-4 ${dm ? 'text-white' : 'text-ticano-charcoal'}`}>Our Branches</h2>
            <p className={`max-w-xl mx-auto text-sm ${dm ? 'text-gray-400' : 'text-gray-500'}`}>We have 5 branches across Botswana - walk in or get in touch today.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Object.entries(BRANCH_INFO).map(([name, b], i) => (
              <div key={name}
                className={`group relative rounded-2xl border shadow-sm overflow-hidden p-5 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl animate-fade-up
                  ${dm
                    ? 'bg-gray-700 border-gray-600 hover:border-ticano-red/60'
                    : 'bg-white border-gray-100 hover:border-ticano-red/40'
                  }`}
                style={{animationDelay:`${i*0.08}s`}}>
                {/* top accent bar */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-ticano-red to-red-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                {/* bg glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-ticano-red/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-ticano-red rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-ticano-red/40 transition-all duration-300">
                      <Building2 size={20} className="text-white" />
                    </div>
                    <div>
                      <p className={`font-bold ${dm ? 'text-white' : 'text-ticano-charcoal'}`}>{name}</p>
                      <p className="text-xs text-gray-400">{b.address}</p>
                    </div>
                  </div>
                  <div className={`space-y-2 text-sm mb-4 ${dm ? 'text-gray-300' : 'text-gray-500'}`}>
                    <div className="flex items-center gap-2"><Phone size={13} className="text-ticano-red/60 shrink-0"/>Tel: {b.phone}</div>
                    {b.mobile && <div className="flex items-center gap-2"><Phone size={13} className="text-ticano-red/60 shrink-0"/>Mobile: {b.mobile}</div>}
                    <div className="flex items-center gap-2"><Mail  size={13} className="text-ticano-red/60 shrink-0"/>{b.email}</div>
                    <div className="flex items-center gap-2"><Clock size={13} className="text-ticano-red/60 shrink-0"/>{b.hours}</div>
                  </div>
                  <button onClick={() => setShowWA(true)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-green-500/10 hover:bg-green-500 text-green-600 hover:text-white rounded-xl text-xs font-semibold border border-green-300/50 hover:border-green-500 transition-all duration-300 group/wa">
                    <MessageCircle size={13} className="group-hover/wa:scale-110 transition-transform"/> WhatsApp this branch
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* NEWS & UPDATES */}
      <section id="blog" className={`py-20 transition-colors duration-300 ${dm ? 'bg-gray-900' : 'bg-white'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-ticano-red font-semibold text-sm uppercase tracking-widest mb-3">Stay Informed</p>
            <h2 className={`text-3xl sm:text-4xl font-black mb-4 ${dm ? 'text-white' : 'text-ticano-charcoal'}`}>News & Updates</h2>
            <p className={`max-w-xl mx-auto text-sm ${dm ? 'text-gray-400' : 'text-gray-500'}`}>The latest news, announcements, and educational content from Ticano Group.</p>
          </div>
          {blogs.length === 0 ? (
            <p className={`text-center ${dm ? 'text-gray-500' : 'text-gray-400'}`}>No posts yet. Check back soon.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {blogs.map((post, i) => (
                <div key={post.id}
                  className={`group rounded-2xl border shadow-sm overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:shadow-xl animate-fade-up
                    ${dm ? 'bg-gray-800 border-gray-700 hover:border-ticano-red/50' : 'bg-white border-gray-100 hover:border-ticano-red/30'}`}
                  style={{animationDelay:`${i*0.08}s`}}>
                  <div className="h-36 bg-gradient-to-br from-ticano-charcoal to-gray-800 flex items-center justify-center relative overflow-hidden">
                    <BookOpen size={32} className="text-white/20 group-hover:scale-125 group-hover:text-white/30 transition-all duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-br from-ticano-red/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    {post.pinned && <span className="absolute top-3 left-3 text-xs bg-ticano-red text-white px-2 py-0.5 rounded-full font-semibold">Pinned</span>}
                    <span className={`absolute top-3 right-3 text-xs px-2 py-0.5 rounded-full font-semibold ${CAT_BADGE[post.category]||'bg-gray-100 text-gray-600'}`}>{post.category}</span>
                  </div>
                  <div className="p-5">
                    <p className={`font-bold mb-2 leading-snug line-clamp-2 ${dm ? 'text-white' : 'text-ticano-charcoal'}`}>{post.title}</p>
                    <p className={`text-sm leading-relaxed line-clamp-3 ${dm ? 'text-gray-300' : 'text-gray-500'}`}>{post.excerpt}</p>
                    <div className={`flex items-center justify-between mt-4 pt-3 border-t ${dm ? 'border-gray-700' : 'border-gray-50'}`}>
                      <p className="text-xs text-gray-400">{post.author}</p>
                      <p className="text-xs text-gray-400 flex items-center gap-1"><Calendar size={10}/>{new Date(post.publishedAt).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CAREERS */}
      <section id="careers" className={`py-20 transition-colors duration-300 ${dm ? 'bg-gray-800' : 'bg-gray-50'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-ticano-red font-semibold text-sm uppercase tracking-widest mb-3">Join Our Team</p>
            <h2 className={`text-3xl sm:text-4xl font-black mb-4 ${dm ? 'text-white' : 'text-ticano-charcoal'}`}>Careers at Ticano</h2>
            <p className={`max-w-xl mx-auto text-sm ${dm ? 'text-gray-400' : 'text-gray-500'}`}>We are always looking for talented, passionate people to join our mission of empowering Botswana's businesses.</p>
          </div>
          {careers.length === 0 ? (
            <div className="text-center py-10">
              <Briefcase size={32} className={`mx-auto mb-3 ${dm ? 'text-gray-600' : 'text-gray-200'}`} />
              <p className={dm ? 'text-gray-500' : 'text-gray-400'}>No open positions at the moment. Check back soon.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {careers.map((job, i) => (
                <div key={job.id}
                  className={`group rounded-2xl border shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg p-5 animate-fade-up
                    ${dm ? 'bg-gray-700 border-gray-600 hover:border-ticano-red/50' : 'bg-white border-gray-100 hover:border-ticano-red/30'}`}
                  style={{animationDelay:`${i*0.08}s`}}>
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <h3 className={`font-bold ${dm ? 'text-white' : 'text-ticano-charcoal'}`}>{job.title}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${TYPE_BADGE[job.type]||'bg-gray-100 text-gray-600'}`}>{job.type}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-400 mb-3 flex-wrap">
                        <span className="flex items-center gap-1"><MapPin size={10}/>{job.location}</span>
                        <span className="flex items-center gap-1"><Briefcase size={10}/>{job.department}</span>
                        <span className="flex items-center gap-1"><Calendar size={10}/>Closes {new Date(job.closingDate).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</span>
                      </div>
                      <p className={`text-sm leading-relaxed line-clamp-2 ${dm ? 'text-gray-300' : 'text-gray-500'}`}>{job.description}</p>
                    </div>
                    <button onClick={() => setSelectedCareer(job)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-ticano-red text-white rounded-xl text-sm font-semibold hover:bg-ticano-red-dark transition-all hover:shadow-md hover:shadow-ticano-red/30 shrink-0">
                      View Role <ChevronRight size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* TENDERS */}
      <section id="tenders" className={`py-20 transition-colors duration-300 ${dm ? 'bg-gray-900' : 'bg-white'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-ticano-red font-semibold text-sm uppercase tracking-widest mb-3">Opportunities</p>
            <h2 className={`text-3xl sm:text-4xl font-black mb-4 ${dm ? 'text-white' : 'text-ticano-charcoal'}`}>Tenders & Business Opportunities</h2>
            <p className={`max-w-xl mx-auto text-sm ${dm ? 'text-gray-400' : 'text-gray-500'}`}>Procurement and tender opportunities we can help you finance. Talk to a Portfolio Manager to apply.</p>
          </div>
          {tenders.length === 0 ? (
            <div className="text-center py-10">
              <p className={dm ? 'text-gray-500' : 'text-gray-400'}>No open tenders at the moment. Check back soon.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tenders.map((t, i) => (
                <div key={t.id}
                  className={`group rounded-2xl border shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg p-5 animate-fade-up
                    ${dm ? 'bg-gray-800 border-gray-700 hover:border-ticano-red/40' : 'bg-white border-gray-100 hover:border-ticano-red/30'}`}
                  style={{animationDelay:`${i*0.08}s`}}>
                  <h3 className={`font-bold mb-2 ${dm ? 'text-white' : 'text-ticano-charcoal'}`}>{t.title}</h3>
                  <p className={`text-sm leading-relaxed mb-3 ${dm ? 'text-gray-300' : 'text-gray-500'}`}>{t.body}</p>
                  <p className="text-xs text-gray-400">Published {new Date(t.publishedAt).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="py-20 bg-ticano-charcoal relative overflow-hidden">
        <div className="absolute inset-0" style={{backgroundImage:'linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px)',backgroundSize:'40px 40px'}} />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-ticano-red font-semibold text-sm uppercase tracking-widest mb-3">Get In Touch</p>
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">Contact Us</h2>
            <p className="text-white/50 max-w-xl mx-auto text-sm">Ready to grow your business? Our team is here to help.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-12">
            {[
              { icon:Phone,         title:'Call Us',      desc:'+267 318 1888 (Gaborone HQ)',              action:'See all branch numbers below' },
              { icon:Mail,          title:'Email Us',     desc:contactEmail,                               action:'We respond within 24 hours' },
              { icon:MessageCircle, title:'WhatsApp Us',  desc:'Click the green button on this page',      action:'Typically reply within 1 business hour' },
            ].map(item => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center hover:bg-white/10 hover:border-white/25 transition-all duration-300 hover:-translate-y-1">
                  <div className="w-12 h-12 bg-ticano-red/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Icon size={20} className="text-ticano-red" />
                  </div>
                  <h3 className="font-bold text-white mb-1">{item.title}</h3>
                  <p className="text-white/60 text-sm mb-1">{item.desc}</p>
                  <p className="text-white/30 text-xs">{item.action}</p>
                </div>
              );
            })}
          </div>
          {SOCIAL_LINKS.length > 0 && (
            <div className="text-center">
              <p className="text-white/40 text-sm mb-5">Follow us on social media</p>
              <div className="flex justify-center gap-3 flex-wrap">
                {SOCIAL_LINKS.map(s => (
                  <SocialIconDark key={s.key} s={s} />
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* FOOTER */}
      <footer className={`text-white/50 py-14 transition-colors duration-300 ${dm ? 'bg-gray-950' : 'bg-black'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                  <Logo size={20} />
                </div>
                <p className="font-black text-white text-sm">Ticano Group</p>
              </div>
              <p className="text-xs leading-relaxed mb-4">Botswana's champion for Purchase Order Financing and Invoice Discounting. No one should be small forever.</p>
              <div className="flex gap-2 flex-wrap">
                {SOCIAL_LINKS.length === 0 ? (
                  <span className="text-[10px] text-white/30">Social links coming soon</span>
                ) : SOCIAL_LINKS.map((s) => {
                  const Icon = s.icon;
                  return (
                    <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer" title={s.label}
                      className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors">
                      {s.key === 'tiktok' ? <TikTokIcon size={14} /> : <Icon size={14} className="text-white/40" />}
                    </a>
                  );
                })}
              </div>
            </div>
            <div>
              <p className="text-white font-semibold text-sm mb-4">Quick Links</p>
              <div className="space-y-2">
                {['About','Services','Branches','Blog','Careers','Contact'].map(l=>(
                  <button key={l} onClick={() => scrollTo(l.toLowerCase())} className="block text-xs hover:text-white transition-colors">{l}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-white font-semibold text-sm mb-4">Services</p>
              <div className="space-y-2 text-xs">
                {['PO Financing','Invoice Discounting','Contract Financing','SME Advisory'].map(s=><p key={s}>{s}</p>)}
              </div>
            </div>
            <div>
              <p className="text-white font-semibold text-sm mb-4">Contact</p>
              <div className="space-y-2 text-xs">
                <p className="flex items-center gap-1.5"><Mail size={11}/>{contactEmail}</p>
                <p className="flex items-center gap-1.5"><Phone size={11}/>{site?.contactPhone || COMPANY_PROFILE.phone}</p>
                <p className="flex items-center gap-1.5"><MapPin size={11}/>{(site?.branchContacts?.length || 5)} branches across Botswana</p>
                <div className="pt-2 space-y-1">
                  {(site?.branchContacts || []).map((b)=>(
                    <p key={b.name} className="text-[10px] flex items-center gap-1.5">
                      <span>{b.name}: {b.phone}</span>
                      {b.placeholder && <span className="text-[8px] uppercase tracking-wide text-amber-400/80 border border-amber-400/30 rounded px-1">to update</span>}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Footer bottom - centered */}
          <div className="border-t border-white/10 pt-6 flex flex-col items-center gap-3 text-center">
            <p className="text-xs">© 2026 Ticano Group. All rights reserved.</p>
            <div className="flex gap-5 text-xs flex-wrap justify-center">
              <button onClick={() => openLegal('Privacy Policy', 'privacy')} className="hover:text-white transition-colors">Privacy Policy</button>
              <button onClick={() => openLegal('Terms of Service', 'terms')} className="hover:text-white transition-colors">Terms of Service</button>
              <button onClick={() => openLegal('Cookie Policy', 'cookie')} className="hover:text-white transition-colors">Cookie Policy</button>
            </div>
          </div>
        </div>
      </footer>

      {/* WhatsApp FAB */}
      <button onClick={() => setShowWA(true)}
        className="fixed bottom-6 left-6 z-50 w-14 h-14 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-2xl flex items-center justify-center transition-all duration-200 hover:scale-105"
        title="WhatsApp Ticano">
        <MessageCircle size={24} />
        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-white rounded-full border-2 border-green-500 animate-pulse" />
      </button>

      {/* Scroll navigation FAB */}
      <ScrollFAB />

      {showWA && <WhatsAppPicker onClose={() => setShowWA(false)} />}

      {/* Service detail modal */}
      {selectedService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedService(null)} />
          <div className={`relative rounded-2xl shadow-2xl w-full max-w-lg p-7 animate-scale-in max-h-[88vh] overflow-y-auto ${dm ? 'bg-gray-800' : 'bg-white'}`}>
            <button onClick={() => setSelectedService(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={18}/></button>
            <div className="w-12 h-12 bg-ticano-red/10 rounded-xl flex items-center justify-center mb-4">
              <selectedService.icon size={24} className="text-ticano-red" />
            </div>
            <div className="flex items-center gap-2 mb-2 flex-wrap pr-8">
              <h3 className={`text-xl font-black ${dm ? 'text-white' : 'text-ticano-charcoal'}`}>{selectedService.title}</h3>
              <span className="text-xs bg-ticano-red/10 text-ticano-red px-2 py-0.5 rounded-full font-medium">{selectedService.highlight}</span>
            </div>
            <p className={`text-sm leading-relaxed mb-5 ${dm ? 'text-gray-300' : 'text-gray-600'}`}>{selectedService.long}</p>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">What you get</p>
            <ul className="space-y-2 mb-6">
              {selectedService.features.map((f) => (
                <li key={f} className={`flex items-start gap-2 text-sm ${dm ? 'text-gray-300' : 'text-gray-700'}`}>
                  <ChevronRight size={15} className="text-ticano-red mt-0.5 shrink-0" /> {f}
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <Link to="/login" className="flex-1 text-center py-2.5 bg-ticano-red text-white rounded-xl text-sm font-semibold hover:bg-ticano-red-dark transition-colors">Get started</Link>
              <button onClick={() => { setSelectedService(null); scrollTo('contact'); }} className={`flex-1 py-2.5 border rounded-xl text-sm font-semibold transition-colors ${dm ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>Talk to us</button>
            </div>
          </div>
        </div>
      )}

      {legalDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setLegalDoc(null)} />
          <div className={`relative rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-scale-in max-h-[85vh] overflow-y-auto ${dm ? 'bg-gray-800' : 'bg-white'}`}>
            <button onClick={() => setLegalDoc(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={18}/></button>
            <h3 className={`font-black text-lg mb-3 pr-8 ${dm ? 'text-white' : 'text-ticano-charcoal'}`}>{legalDoc.title}</h3>
            <p className={`text-sm leading-relaxed whitespace-pre-line ${dm ? 'text-gray-300' : 'text-gray-600'}`}>
              {legalDoc.body || 'This document has not been published yet. Please check back soon or contact us at ' + contactEmail + '.'}
            </p>
            <p className="text-[11px] text-gray-400 mt-5">Ticano Group (Pty) Ltd · Regulated by NBFIRA</p>
          </div>
        </div>
      )}

      {selectedCareer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedCareer(null)} />
          <div className={`relative rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-scale-in max-h-[90vh] overflow-y-auto ${dm ? 'bg-gray-800' : 'bg-white'}`}>
            <button onClick={() => setSelectedCareer(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={18}/></button>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className={`font-black text-lg ${dm ? 'text-white' : 'text-ticano-charcoal'}`}>{selectedCareer.title}</h3>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${TYPE_BADGE[selectedCareer.type]||'bg-gray-100 text-gray-600'}`}>{selectedCareer.type}</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-400 mb-5 flex-wrap">
              <span className="flex items-center gap-1"><MapPin size={10}/>{selectedCareer.location}</span>
              <span className="flex items-center gap-1"><Briefcase size={10}/>{selectedCareer.department}</span>
              <span className="flex items-center gap-1"><Calendar size={10}/>Closes {new Date(selectedCareer.closingDate).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</span>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">About the Role</p>
                <p className={`text-sm leading-relaxed ${dm ? 'text-gray-300' : 'text-gray-600'}`}>{selectedCareer.description}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Requirements</p>
                <p className={`text-sm leading-relaxed ${dm ? 'text-gray-300' : 'text-gray-600'}`}>{selectedCareer.requirements}</p>
              </div>
              <CareerApplyForm career={selectedCareer} />
            </div>
          </div>
        </div>
      )}

      {/* Promo popup */}
      {promo?.enabled && promo?.mode === 'popup' && showPromoPopup && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowPromoPopup(false)} />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
            <div className="bg-ticano-red h-2" />
            <button onClick={() => setShowPromoPopup(false)} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"><X size={18} /></button>
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-ticano-red/10 text-ticano-red flex items-center justify-center mx-auto mb-3"><Megaphone size={22} /></div>
              <h3 className="text-xl font-black text-ticano-charcoal mb-2">{promo.title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed mb-5">{promo.message}</p>
              {promo.ctaLabel && (
                promo.ctaLink?.startsWith('/')
                  ? <Link to={promo.ctaLink} onClick={() => setShowPromoPopup(false)} className="inline-flex items-center gap-2 px-6 py-3 bg-ticano-red text-white rounded-xl font-bold hover:bg-ticano-red-dark transition-all">{promo.ctaLabel} <ArrowRight size={16} /></Link>
                  : <a href={promo.ctaLink} className="inline-flex items-center gap-2 px-6 py-3 bg-ticano-red text-white rounded-xl font-bold hover:bg-ticano-red-dark transition-all">{promo.ctaLabel} <ArrowRight size={16} /></a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
