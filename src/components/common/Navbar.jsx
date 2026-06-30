import React, { useState, useRef, useEffect } from 'react';
import { Moon, Sun, LogOut, Bell, User, Check, Settings as SettingsIcon, Languages, Eye, Type, Megaphone, X, ChevronRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useNotifications } from '../../context/NotificationContext';
import { useSettings } from '../../context/SettingsContext';
import { useNavigate } from 'react-router-dom';
import { formatDateTime } from '../../utils/format';
import { ROLE_LABELS, ROLE_PROFILE_PATH } from '../../utils/constants';
import Logo from './Logo';
import GlobalSearch from './GlobalSearch';

function useOutside(ref, onClose) {
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [ref, onClose]);
}

const TYPE_ICON = { complaint: '📋', escalation: '🚨', feedback: '⭐', queue: '🔢', message: '💬', alert: '⚠️', referral: '🔗', report: '📊', campaign: '📣', system: '⚙️', lead: '👤', announcement: '📢' };
const TYPE_DOT  = { complaint: 'bg-blue-500', escalation: 'bg-red-500', feedback: 'bg-yellow-500', queue: 'bg-purple-500', message: 'bg-green-500', alert: 'bg-orange-500', referral: 'bg-indigo-500', report: 'bg-teal-500', system: 'bg-gray-500', lead: 'bg-cyan-500', announcement: 'bg-ticano-red' };
const ROLE_DASHBOARD = { customer: '/client', portfolio_manager: '/pm', service_manager: '/service-manager', director: '/director', marketing: '/marketing', admin: '/admin' };
// Default "overview" tab each dashboard lands on. Passing it as ?tab= resets
// the dashboard to its overview even when the dashboard is already mounted.
const ROLE_HOME_TAB = { customer: 'overview', portfolio_manager: 'overview', service_manager: 'Overview', director: 'Action Centre', marketing: 'Analytics', admin: 'User Management' };

export default function Navbar({ title }) {
  const { user, logout } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const { notifications, unreadCount, markAllRead, markRead, clearAll } = useNotifications();
  const { lang, setLang, highContrast, setHighContrast, largeText, setLargeText, t } = useSettings();
  const navigate = useNavigate();

  const [showNotif,    setShowNotif]    = useState(false);
  const [showProfile,  setShowProfile]  = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [prevCount,    setPrevCount]    = useState(0);

  const notifRef    = useRef(null);
  const profileRef  = useRef(null);
  const settingsRef = useRef(null);
  useOutside(notifRef,    () => setShowNotif(false));
  useOutside(profileRef,  () => setShowProfile(false));
  useOutside(settingsRef, () => setShowSettings(false));

  // Detect new notifications for badge animation
  const [badgeAnimate, setBadgeAnimate] = useState(false);
  useEffect(() => {
    if (unreadCount > prevCount) { setBadgeAnimate(true); setTimeout(() => setBadgeAnimate(false), 500); }
    setPrevCount(unreadCount);
  }, [unreadCount]);

  const handleLogout = () => { logout(); navigate('/login'); };
  const goProfile    = () => { setShowProfile(false); navigate(ROLE_PROFILE_PATH[user?.role] || '/'); };

  // Logo click returns the user to their own dashboard's overview tab
  // (not the public landing page). Falls back to '/' if role is unknown.
  const goHome = () => {
    const base = ROLE_DASHBOARD[user?.role];
    if (!base) return navigate('/');
    const tab = ROLE_HOME_TAB[user?.role];
    navigate(tab ? `${base}?tab=${encodeURIComponent(tab)}` : base);
  };

  // Clicking a notification marks it read and deep-links to the relevant
  // dashboard tab/item for the current role.
  const openNotification = (n) => {
    markRead(n.id);
    setShowNotif(false);
    const base = ROLE_DASHBOARD[user?.role];
    if (base && n.tab) {
      navigate(`${base}?tab=${encodeURIComponent(n.tab)}`);
    } else if (base) {
      navigate(base);
    }
  };

  const recent = notifications.slice(0, 8);

  return (
    <nav className="bg-white dark:bg-ticano-dark-card border-b border-gray-100 dark:border-gray-700/60 text-ticano-charcoal dark:text-white px-4 py-2.5 flex items-center justify-between shadow-sm sticky top-0 z-50 backdrop-blur-sm">
      <div className="flex items-center gap-3 min-w-0">
        <button onClick={goHome} className="flex items-center rounded-lg hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-ticano-red shrink-0" aria-label="Go to dashboard">
          <Logo size={30} withWordmark />
        </button>
        {title && (
          <>
            <span className="text-gray-200 dark:text-gray-600 hidden sm:block">|</span>
            <span className="text-sm text-gray-400 dark:text-gray-400 hidden sm:block truncate max-w-[180px]">{title}</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-1">
        {user?.role && user.role !== 'customer' && (
          <div className="hidden md:block w-56 lg:w-72 mr-1">
            <GlobalSearch />
          </div>
        )}

        {/* Dark mode */}
        <button onClick={toggleDarkMode} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 text-gray-500 dark:text-gray-300 hover:text-ticano-charcoal dark:hover:text-white" aria-label="Toggle dark mode">
          {darkMode ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        {/* Settings */}
        <div className="relative" ref={settingsRef}>
          <button onClick={() => setShowSettings(s => !s)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 text-gray-500 dark:text-gray-300">
            <SettingsIcon size={17} />
          </button>
          {showSettings && (
            <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-ticano-dark-card text-gray-800 dark:text-gray-100 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden animate-scale-in">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                <p className="font-semibold text-sm">{t('Settings')}</p>
              </div>
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2 text-xs uppercase tracking-wide text-gray-500"><Languages size={13} /> {t('Language')}</div>
                <div className="flex gap-2">
                  {[['en', t('English')], ['tn', t('Setswana')]].map(([code, label]) => (
                    <button key={code} onClick={() => setLang(code)} className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all duration-200 ${lang === code ? 'bg-ticano-red text-white border-ticano-red' : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>{label}</button>
                  ))}
                </div>
              </div>
              <div className="px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">{t('Accessibility')}</p>
                {[
                  [Eye, t('High Contrast'), highContrast, setHighContrast],
                  [Type, 'Large text',      largeText,    setLargeText],
                ].map(([Icon, label, checked, setter]) => (
                  <label key={label} className="flex items-center justify-between py-2 cursor-pointer">
                    <span className="flex items-center gap-2 text-sm"><Icon size={14} /> {label}</span>
                    <div className={`w-10 h-5 rounded-full transition-colors duration-200 ${checked ? 'bg-ticano-red' : 'bg-gray-200 dark:bg-gray-600'} relative`} onClick={() => setter(!checked)}>
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${checked ? 'translate-x-5' : ''}`} />
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button onClick={() => setShowNotif(s => !s)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 relative text-gray-500 dark:text-gray-300">
            <Bell size={17} />
            {unreadCount > 0 && (
              <span className={`absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-ticano-red rounded-full text-[10px] font-bold flex items-center justify-center text-white ${badgeAnimate ? 'notif-badge-new' : ''}`}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotif && (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-ticano-dark-card rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden animate-scale-in">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                <div>
                  <span className="font-semibold text-sm text-gray-900 dark:text-white">Notifications</span>
                  {unreadCount > 0 && <span className="ml-2 text-xs bg-ticano-red text-white rounded-full px-1.5 py-0.5">{unreadCount}</span>}
                </div>
                <div className="flex gap-2">
                  <button onClick={markAllRead} className="text-xs text-ticano-red hover:underline flex items-center gap-1"><Check size={11} /> All read</button>
                  <button onClick={clearAll} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"><X size={11} /> Clear</button>
                </div>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {recent.length === 0 && <p className="px-4 py-8 text-center text-sm text-gray-400">No notifications</p>}
                {recent.map((n, idx) => (
                  <button key={n.id} onClick={() => openNotification(n)}
                    className={`w-full text-left px-4 py-3 border-b border-gray-50 dark:border-gray-700/40 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors flex items-start gap-3 animate-slide-in-right ${!n.read ? 'bg-ticano-red/4' : ''}`}
                    style={{ animationDelay: `${idx * 0.04}s` }}
                  >
                    <span className="text-base shrink-0 mt-0.5">{TYPE_ICON[n.type] || '🔔'}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm truncate ${!n.read ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>{n.title}</p>
                        {!n.read && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${TYPE_DOT[n.type] || 'bg-ticano-red'}`} />}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{n.body}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{new Date(n.time).toLocaleString()}</p>
                    </div>
                  </button>
                ))}
              </div>
              {notifications.length > 8 && (
                <div className="px-4 py-2.5 border-t border-gray-100 dark:border-gray-700 text-center">
                  <button className="text-xs text-ticano-red hover:underline flex items-center gap-1 mx-auto">View all <ChevronRight size={11} /></button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Profile */}
        <div className="relative" ref={profileRef}>
          <button onClick={() => setShowProfile(s => !s)} className="flex items-center gap-2 text-sm p-1 pl-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200">
            <div className="hidden sm:block text-right">
              <div className="font-medium leading-tight text-sm text-ticano-charcoal dark:text-white">{user?.name?.split(' ')[0]}</div>
              <div className="text-gray-400 text-[10px] leading-tight">{ROLE_LABELS[user?.role]}</div>
            </div>
            {user?.avatar ? (
              <img src={user.avatar} alt="" className="w-8 h-8 rounded-full object-cover ring-2 ring-gray-100 dark:ring-gray-600" />
            ) : (
              <div className="w-8 h-8 bg-ticano-red text-white rounded-full flex items-center justify-center font-bold text-sm ring-2 ring-ticano-red/20">
                {user?.name?.charAt(0)?.toUpperCase()}
              </div>
            )}
          </button>

          {showProfile && (
            <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-ticano-dark-card rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden animate-scale-in">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                <p className="font-semibold text-sm text-gray-900 dark:text-white">{user?.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{ROLE_LABELS[user?.role]}{user?.branch ? ` · ${user.branch}` : ''}</p>
              </div>
              <button onClick={goProfile} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/40 flex items-center gap-2 transition-colors"><User size={14} /> My Profile</button>
              <button onClick={handleLogout} className="w-full text-left px-4 py-2.5 text-sm text-ticano-red hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 transition-colors"><LogOut size={14} /> Sign out</button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
