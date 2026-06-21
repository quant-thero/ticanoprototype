import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Camera, LogOut, Moon, Sun, Save, KeyRound, Bell, ArrowLeft, X, Cake, MapPin } from 'lucide-react';
import Navbar from '../components/common/Navbar';
import { Card, Tabs } from '../components/common/UI';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { ROLE_LABELS } from '../utils/constants';

export default function ProfilePage({ navTitle = 'My Profile' }) {
  const { user, updateUser, logout } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [tab, setTab] = useState('profile');
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || (user?.role === 'customer' ? '' : `${user?.role}@demo.com`),
    mobile: user?.whatsappNumber || user?.mobile || '+267 71 234 567',
    address: user?.address || '',
    city: user?.city || user?.baseLocation || 'Gaborone',
    maritalStatus: user?.maritalStatus || '',
    gender: user?.gender || '',
    nationality: user?.nationality || 'Motswana',
    occupation: user?.occupation || '',
    emergencyName: user?.emergencyName || '',
    emergencyNumber: user?.emergencyNumber || '',
    branch: user?.branch || '',
    // §14 — DOB only collected if user opts into birthday messages
    birthdayMessagesOptIn: !!user?.birthdayMessagesOptIn,
    dob: user?.dob || user?.birthday || '',
    // §16 — location sharing opt-in
    locationSharingOptIn: user?.locationSharingOptIn !== false,
  });
  const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' });

  const handleLogout = () => { logout(); navigate('/login'); };
  const goBack = () => { if (window.history.length > 1) navigate(-1); else navigate('/'); };

  const saveProfile = () => {
    updateUser({
      name: form.name,
      email: form.email,
      whatsappNumber: form.mobile,
      mobile: form.mobile,
      address: form.address,
      city: form.locationSharingOptIn ? form.city : null,
      baseLocation: form.locationSharingOptIn ? form.city : null,
      maritalStatus: form.maritalStatus,
      gender: form.gender,
      nationality: form.nationality,
      occupation: form.occupation,
      emergencyName: form.emergencyName,
      emergencyNumber: form.emergencyNumber,
      birthdayMessagesOptIn: form.birthdayMessagesOptIn,
      birthday: form.birthdayMessagesOptIn ? form.dob : null,
      dob: form.birthdayMessagesOptIn ? form.dob : null,
      locationSharingOptIn: form.locationSharingOptIn,
    });
    toast.success('Profile updated');
  };

  const cancelEdit = () => {
    setForm({
      name: user?.name || '',
      email: user?.email || (user?.role === 'customer' ? '' : `${user?.role}@demo.com`),
      mobile: user?.whatsappNumber || user?.mobile || '+267 71 234 567',
      address: user?.address || '',
      city: user?.city || user?.baseLocation || 'Gaborone',
      maritalStatus: user?.maritalStatus || '',
      gender: user?.gender || '',
      nationality: user?.nationality || 'Motswana',
      occupation: user?.occupation || '',
      emergencyName: user?.emergencyName || '',
      emergencyNumber: user?.emergencyNumber || '',
      branch: user?.branch || '',
      birthdayMessagesOptIn: !!user?.birthdayMessagesOptIn,
      dob: user?.dob || user?.birthday || '',
      locationSharingOptIn: user?.locationSharingOptIn !== false,
    });
    toast('Changes discarded');
  };

  const changePassword = () => {
    if (!pwd.current || !pwd.next) return toast.error('Fill in all password fields');
    if (pwd.next.length < 6) return toast.error('New password must be at least 6 characters');
    if (pwd.next !== pwd.confirm) return toast.error('New passwords do not match');
    setPwd({ current: '', next: '', confirm: '' });
    toast.success('Password changed');
  };

  const onPickAvatar = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { updateUser({ avatar: reader.result }); toast.success('Profile picture updated'); };
    reader.readAsDataURL(file);
  };

  const togglePref = (key) => { updateUser({ [key]: !user?.[key] }); };

  const input = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-ticano-red';
  const labelCls = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

  return (
    <div className="min-h-screen bg-ticano-bg dark:bg-ticano-dark-bg">
      <Navbar title={navTitle} />
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header card */}
        <Card className="mb-6">
          <div className="flex items-center gap-5 flex-wrap">
            <div className="relative">
              {user?.avatar ? (
                <img src={user.avatar} alt="" className="w-20 h-20 rounded-full object-cover" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-ticano-red text-white flex items-center justify-center text-2xl font-bold">
                  {user?.name?.charAt(0)?.toUpperCase()}
                </div>
              )}
              <button onClick={() => fileRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-7 h-7 bg-ticano-charcoal text-white rounded-full flex items-center justify-center shadow hover:bg-black"
                aria-label="Change picture">
                <Camera size={14} />
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickAvatar} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-ticano-charcoal dark:text-white">{user?.name}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {ROLE_LABELS[user?.role]}{user?.branch ? ` · ${user.branch}` : ''}
              </p>
            </div>
            <button onClick={handleLogout} className="ml-auto px-4 py-2 text-sm bg-ticano-red text-white rounded-lg hover:bg-ticano-red-dark flex items-center gap-2">
              <LogOut size={15} /> Logout
            </button>
          </div>
        </Card>

        <Tabs
          tabs={[
            { id: 'profile', label: 'Profile', icon: Save },
            { id: 'password', label: 'Password', icon: KeyRound },
            { id: 'preferences', label: 'Preferences', icon: Bell },
          ]}
          active={tab}
          onChange={setTab}
        />

        {tab === 'profile' && (
          <Card title={user?.role === 'customer' ? 'Personal Information' : 'Staff Information'}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Full Name</label>
                <input className={input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>{user?.role === 'customer' ? 'Email Address' : 'Work Email'}</label>
                <input type="email" className={input} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>{user?.role === 'customer' ? 'Mobile Number' : 'Work Phone'}</label>
                <input className={input} value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
              </div>

              {/* Staff-only fields */}
              {user?.role !== 'customer' && (
                <>
                  <div>
                    <label className={labelCls}>Role</label>
                    <input className={`${input} bg-gray-50 dark:bg-gray-800`} value={ROLE_LABELS[user?.role] || ''} disabled />
                  </div>
                  <div>
                    <label className={labelCls}>Branch</label>
                    <input className={`${input} bg-gray-50 dark:bg-gray-800`} value={form.branch || '—'} disabled />
                  </div>
                  <div>
                    <label className={labelCls}>Staff ID</label>
                    <input className={`${input} bg-gray-50 dark:bg-gray-800`} value={user?.staffId || `TIC-${String(user?.id || 0).padStart(4, '0')}`} disabled />
                  </div>
                </>
              )}

              {/* Customer-only fields */}
              {user?.role === 'customer' && (
                <>
                  <div>
                    <label className={labelCls}>Marital Status</label>
                    <select className={input} value={form.maritalStatus} onChange={(e) => setForm({ ...form, maritalStatus: e.target.value })}>
                      <option value="">Select…</option>
                      <option>Single</option><option>Married</option><option>Divorced</option><option>Widowed</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Gender</label>
                    <select className={input} value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                      <option value="">Select…</option>
                      <option>Female</option><option>Male</option><option>Prefer not to say</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Nationality</label>
                    <input className={input} value={form.nationality} onChange={(e) => setForm({ ...form, nationality: e.target.value })} />
                  </div>
                  <div>
                    <label className={labelCls}>Occupation</label>
                    <input className={input} value={form.occupation} onChange={(e) => setForm({ ...form, occupation: e.target.value })} />
                  </div>
                  <div>
                    <label className={labelCls}>Emergency Contact Name</label>
                    <input className={input} value={form.emergencyName} onChange={(e) => setForm({ ...form, emergencyName: e.target.value })} />
                  </div>
                  <div>
                    <label className={labelCls}>Emergency Contact Number</label>
                    <input className={input} value={form.emergencyNumber} onChange={(e) => setForm({ ...form, emergencyNumber: e.target.value })} />
                  </div>
                </>
              )}
            </div>

            {/* §16 — Location sharing (customer only — staff location is their branch) */}
            {user?.role === 'customer' && (
            <div className="mt-6 rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-gray-50/60 dark:bg-gray-800/40">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={form.locationSharingOptIn}
                  onChange={(e) => setForm({ ...form, locationSharingOptIn: e.target.checked })}
                  className="mt-1 w-4 h-4 accent-[#CE313C]" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <MapPin size={15} className="text-ticano-red" />
                    <span className="text-sm font-medium text-gray-800 dark:text-white">Share my location</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Helps us connect you to the closest branch.</p>
                </div>
              </label>
              {form.locationSharingOptIn && (
                <div className="mt-3 pl-7 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Physical Address</label>
                    <input className={input} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Plot / street" />
                  </div>
                  <div>
                    <label className={labelCls}>City / Town / Village</label>
                    <input className={input} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                  </div>
                </div>
              )}
            </div>
            )}

            {/* §14 — Birthday messages opt-in (customer only) */}
            {user?.role === 'customer' && (
            <div className="mt-4 rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-gray-50/60 dark:bg-gray-800/40">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={form.birthdayMessagesOptIn}
                  onChange={(e) => setForm({ ...form, birthdayMessagesOptIn: e.target.checked })}
                  className="mt-1 w-4 h-4 accent-[#CE313C]" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Cake size={15} className="text-ticano-red" />
                    <span className="text-sm font-medium text-gray-800 dark:text-white">Receive Birthday Messages</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Date of birth is only stored if you opt in.</p>
                </div>
              </label>
              {form.birthdayMessagesOptIn && (
                <div className="mt-3 pl-7">
                  <label className={labelCls}>Date of Birth</label>
                  <input type="date" className={input} value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} />
                </div>
              )}
            </div>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              <button onClick={goBack} className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2">
                <ArrowLeft size={16} /> Back
              </button>
              <button onClick={saveProfile} className="px-4 py-2 bg-ticano-charcoal text-white rounded-lg hover:bg-black flex items-center gap-2">
                <Save size={16} /> Save Changes
              </button>
              <button onClick={cancelEdit} className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2">
                <X size={16} /> Cancel
              </button>
            </div>
          </Card>
        )}

        {tab === 'password' && (
          <Card title="Change Password">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>Current Password</label>
                <input type="password" className={input} value={pwd.current} onChange={(e) => setPwd({ ...pwd, current: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>New Password</label>
                <input type="password" className={input} value={pwd.next} onChange={(e) => setPwd({ ...pwd, next: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>Confirm New Password</label>
                <input type="password" className={input} value={pwd.confirm} onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })} />
              </div>
            </div>
            <div className="mt-5">
              <button onClick={changePassword} className="px-4 py-2 bg-ticano-charcoal text-white rounded-lg hover:bg-black flex items-center gap-2">
                <KeyRound size={16} /> Update Password
              </button>
            </div>
          </Card>
        )}

        {tab === 'preferences' && (
          <Card title="Preferences">
            <div className="space-y-4">
              <PrefRow label="Dark Mode" desc="Use a darker color theme across the app." checked={darkMode} onChange={toggleDarkMode} icon={darkMode ? Sun : Moon} />
              <PrefRow label="Email Notifications" desc="Receive important updates by email." checked={!!user?.notifyEmail} onChange={() => togglePref('notifyEmail')} icon={Bell} />
              <PrefRow label="WhatsApp Notifications" desc="Receive messages on WhatsApp." checked={!!user?.notifyWhatsApp} onChange={() => togglePref('notifyWhatsApp')} icon={Bell} />
              <PrefRow label="In-App Notifications" desc="Show notifications in the notification center." checked={!!user?.notifyInApp} onChange={() => togglePref('notifyInApp')} icon={Bell} />
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function PrefRow({ label, desc, checked, onChange, icon: Icon }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-3">
        {Icon && <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-ticano-charcoal dark:text-white"><Icon size={16} /></div>}
        <div>
          <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{label}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{desc}</p>
        </div>
      </div>
      <button onClick={onChange}
        className={`relative w-11 h-6 rounded-full transition-colors ${checked ? 'bg-ticano-red' : 'bg-gray-300 dark:bg-gray-600'}`}
        aria-pressed={checked}>
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${checked ? 'translate-x-5' : ''}`} />
      </button>
    </div>
  );
}
