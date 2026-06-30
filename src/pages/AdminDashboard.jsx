import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Users, GitBranch, Settings, Database, FileText, Activity, Plus, Trash2, Edit2, TrendingUp, BookOpen, MapPin, Phone, Mail, Clock, X, Save, MessageSquare, Send, Globe, Link2, Facebook, Linkedin, Youtube, Instagram, Target, KeyRound, Copy, CheckCircle2, Twitter, MessageCircle, Eye, EyeOff, History, UploadCloud, AlertTriangle } from 'lucide-react';
import Navbar from '../components/common/Navbar';
import { Badge, SearchFilters, ExportButton, LoadingSpinner, Modal } from '../components/common/UI';
import KnowledgeBase from '../components/common/KnowledgeBase';
import { getUsers, createUser, updateUser, deleteUser, adminResetUserPassword, triggerBackup, getAuditTrail, getBranches, createBranch, updateBranch, getWaTemplates, getAllWaTemplates, createWaTemplate, updateWaTemplate, deleteWaTemplate, setWaTemplateActive, WA_TEMPLATE_ROLES, getSiteSettings, updateSiteSettings, getSiteAudit } from '../services/api';
import { useNotifications } from '../context/NotificationContext';
import BranchLocationPicker from '../components/common/BranchLocationPicker';
import AnnouncementBanner from '../components/common/AnnouncementBanner';
import MaintenancePanel from '../components/common/MaintenancePanel';
import { ROLES, BRANCHES, ROLE_LABELS } from '../utils/constants';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const TABS = ['User Management', 'Branch Management', 'Landing Page Management', 'Knowledge Base', 'WhatsApp Templates', 'Maintenance', 'System Config', 'Database', 'Audit Logs', 'System Health'];
const STAFF_ROLES = ['portfolio_manager', 'service_manager', 'director', 'marketing', 'admin'];

export default function AdminDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('User Management');
  const [searchParams] = useSearchParams();
  useEffect(() => {
    const t = searchParams.get('tab');
    if (t && TABS.includes(t)) setActiveTab(t);
  }, [searchParams]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUserForm, setShowUserForm] = useState(false);
  const [userForm, setUserForm] = useState({ name: '', email: '', password: '', role: 'portfolio_manager', branch: '' });
  const [editingUser, setEditingUser] = useState(null);
  const DEFAULT_BIRTHDAY_TEMPLATE = 'Happy Birthday [Name]! Ticano wishes you a wonderful day.';
  const [birthdayTemplate, setBirthdayTemplate] = useState(DEFAULT_BIRTHDAY_TEMPLATE);
  const [birthdayDraft, setBirthdayDraft] = useState(DEFAULT_BIRTHDAY_TEMPLATE);
  const [editingBirthday, setEditingBirthday] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const usersRes = await getUsers();
        setUsers(Array.isArray(usersRes.data) ? usersRes.data : (usersRes.data?.users || []));
      } catch {}
      finally { setLoading(false); }
    })();
  }, []);

  const handleCreateUser = async () => {
    try {
      const { data } = await createUser(userForm);
      toast.success('User created successfully');
      setUsers((p) => [...p, data]);
      setShowUserForm(false);
      setUserForm({ name: '', email: '', password: '', role: 'portfolio_manager', branch: '' });
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to create user'); }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await deleteUser(id);
      setUsers((p) => p.filter((u) => u.id !== id));
      toast.success('User deleted');
    } catch { toast.error('Failed to delete user'); }
  };

  const handleBackup = async () => {
    try {
      await triggerBackup();
      toast.success('Database backup initiated successfully');
    } catch { toast.error('Backup failed'); }
  };

  const inputCls = "w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-ticano-red";

  if (loading) return <div className="min-h-screen bg-ticano-bg-light dark:bg-ticano-dark-bg"><Navbar title="Admin" /><LoadingSpinner /></div>;

  return (
    <div className="min-h-screen bg-ticano-bg-light dark:bg-ticano-dark-bg">
      <Navbar title="System Administration" />
      <div className="max-w-7xl mx-auto px-4 py-6">

        <AnnouncementBanner />

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {TABS.map((t) => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors
                ${activeTab === t ? 'bg-ticano-charcoal text-white' : 'bg-white dark:bg-ticano-dark-card text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
              {t}
            </button>
          ))}
        </div>

        {/* User Management */}
        {activeTab === 'User Management' && (
          <div className="bg-white dark:bg-ticano-dark-card rounded-2xl shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-ticano-charcoal dark:text-white text-lg">User Management</h3>
              <div className="flex gap-2">
                <ExportButton onExport={(fmt) => toast.success(`Exporting ${fmt.toUpperCase()}...`)} />
                <button onClick={() => setShowUserForm(!showUserForm)}
                  className="flex items-center gap-2 px-4 py-2 bg-ticano-red text-white rounded-xl text-sm font-medium hover:bg-ticano-red-dark">
                  <Plus size={16} /> Add User
                </button>
              </div>
            </div>

            {showUserForm && (
              <div className="bg-ticano-bg-light dark:bg-gray-800 rounded-xl p-5 mb-5 border border-gray-200 dark:border-gray-700">
                <h4 className="font-semibold text-gray-800 dark:text-white mb-4">Add New User</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Full Name *</label>
                    <input type="text" value={userForm.name} onChange={(e) => setUserForm((p) => ({ ...p, name: e.target.value }))} placeholder="Full name" className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Email *</label>
                    <input type="email" value={userForm.email} onChange={(e) => setUserForm((p) => ({ ...p, email: e.target.value }))} placeholder="email@ticano.bw" className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Password *</label>
                    <input type="password" value={userForm.password} onChange={(e) => setUserForm((p) => ({ ...p, password: e.target.value }))} placeholder="Min 8 characters" className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Role *</label>
                    <select value={userForm.role} onChange={(e) => setUserForm((p) => ({ ...p, role: e.target.value }))} className={inputCls}>
                      {STAFF_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                    </select>
                  </div>
                  {['portfolio_manager', 'service_manager'].includes(userForm.role) && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Branch *</label>
                      <select value={userForm.branch} onChange={(e) => setUserForm((p) => ({ ...p, branch: e.target.value }))} className={inputCls}>
                        <option value="">Select branch</option>
                        {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={handleCreateUser} className="px-5 py-2 bg-ticano-red text-white rounded-lg text-sm font-medium hover:bg-ticano-red-dark">Create User</button>
                  <button onClick={() => setShowUserForm(false)} className="px-5 py-2 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800">Cancel</button>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    {['Name', 'Email', 'Role', 'Branch', 'Status', 'Created', 'Actions'].map((h) => (
                      <th key={h} className="text-left py-3 px-2 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr><td colSpan={7} className="py-8 text-center text-gray-400">No users found.</td></tr>
                  ) : users.map((u) => (
                    <tr key={u.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="py-3 px-2 font-medium text-gray-800 dark:text-white">{u.name}</td>
                      <td className="py-3 px-2 text-gray-500">{u.email}</td>
                      <td className="py-3 px-2"><span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 capitalize">{ROLE_LABELS[u.role] || u.role}</span></td>
                      <td className="py-3 px-2 text-gray-500">{u.branch || '-'}</td>
                      <td className="py-3 px-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {u.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-gray-400 text-xs">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-'}</td>
                      <td className="py-3 px-2">
                        <div className="flex gap-2">
                          <button onClick={() => setEditingUser(u)} title="Edit employee" className="text-ticano-red hover:text-ticano-red-dark"><Edit2 size={14} /></button>
                          <button onClick={() => handleDeleteUser(u.id)} title="Deactivate" className="text-ticano-red hover:text-red-700"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Branch Management */}
        {activeTab === 'Branch Management' && <BranchManagementTab />}

        {activeTab === 'Landing Page Management' && <LandingPageManagementTab />}
        {/* Knowledge Base (§8) — Admin has CRUD */}
        {activeTab === 'Knowledge Base' && (
          <KnowledgeBase editable={true} currentUser={user} />
        )}

        {activeTab === 'Maintenance' && (
          <div className="bg-white dark:bg-ticano-dark-card rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <h3 className="font-bold text-ticano-charcoal dark:text-white text-lg mb-1">Maintenance Mode</h3>
            <p className="text-sm text-gray-500 mb-5">Control system-wide maintenance. All users will be notified.</p>
            <MaintenancePanel />
          </div>
        )}

        {/* System Config */}
        {activeTab === 'System Config' && (
          <div className="bg-white dark:bg-ticano-dark-card rounded-2xl shadow p-6 max-w-2xl">
            <h3 className="font-bold text-ticano-charcoal dark:text-white text-lg mb-5">System Configuration</h3>
            <div className="space-y-4">
              {[
                { key: 'WhatsApp Provider', val: 'Infobip', type: 'select', opts: ['Infobip', 'Twilio'] },
                { key: 'Low Rating Threshold', val: '2 stars', type: 'select', opts: ['1 star', '2 stars'] },
                { key: 'Feedback Link Expiry', val: '48 hours', type: 'select', opts: ['24 hours', '48 hours', '72 hours'] },
                { key: 'Birthday Message Time', val: '08:00 CAT', type: 'text' },
                { key: 'Weekly Report Time', val: 'Monday 08:00 CAT', type: 'text' },
                { key: 'Max PM Clients', val: '50', type: 'number' },
              ].map((cfg) => (
                <div key={cfg.key} className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-3">
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-white">{cfg.key}</p>
                    <p className="text-xs text-gray-400">{cfg.val}</p>
                  </div>
                  <button className="text-xs text-ticano-red hover:underline px-3 py-1 border border-ticano-red rounded-lg">Edit</button>
                </div>
              ))}
            </div>
            <button className="mt-6 px-6 py-2.5 bg-ticano-red text-white rounded-xl text-sm font-medium hover:bg-ticano-red-dark">Save Configuration</button>

            {/* Birthday Message Template */}
            <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-6">
              <h3 className="font-bold text-ticano-charcoal dark:text-white text-lg mb-1">Birthday Message Template</h3>
              <p className="text-xs text-gray-400 mb-4">Use <code className="px-1 bg-gray-100 dark:bg-gray-700 rounded">[Name]</code> as a placeholder for the recipient's name.</p>
              {!editingBirthday ? (
                <>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-sm text-gray-800 dark:text-gray-100">
                    {birthdayTemplate}
                  </div>
                  <div className="mt-3 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 p-4">
                    <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Preview</p>
                    <p className="text-sm text-gray-800 dark:text-gray-100">
                      {birthdayTemplate.replace(/\[Name\]/g, 'Stacey Nthoi')}
                    </p>
                  </div>
                  <button onClick={() => { setBirthdayDraft(birthdayTemplate); setEditingBirthday(true); }}
                    className="mt-4 px-4 py-2 text-sm border border-ticano-red text-ticano-red rounded-lg hover:bg-ticano-red hover:text-white transition-colors">
                    Edit Template
                  </button>
                </>
              ) : (
                <>
                  <textarea className={inputCls + ' h-24 resize-none'} value={birthdayDraft} onChange={(e) => setBirthdayDraft(e.target.value)} />
                  <div className="mt-3 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 p-4">
                    <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Live Preview</p>
                    <p className="text-sm text-gray-800 dark:text-gray-100">{(birthdayDraft || '').replace(/\[Name\]/g, 'Stacey Nthoi')}</p>
                  </div>
                  <div className="mt-4 flex gap-3">
                    <button onClick={() => {
                        if (!birthdayDraft.trim()) return toast.error('Template cannot be empty');
                        setBirthdayTemplate(birthdayDraft.trim());
                        setEditingBirthday(false);
                        toast.success('Birthday message template updated');
                      }}
                      className="px-4 py-2 text-sm bg-ticano-charcoal text-white rounded-lg hover:bg-black">Save Changes</button>
                    <button onClick={() => { setBirthdayDraft(birthdayTemplate); setEditingBirthday(false); }}
                      className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">Cancel</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Database */}
        {activeTab === 'Database' && (
          <div className="bg-white dark:bg-ticano-dark-card rounded-2xl shadow p-6 max-w-xl">
            <h3 className="font-bold text-ticano-charcoal dark:text-white text-lg mb-4">Database Management</h3>
            <div className="space-y-4">
              <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl">
                <h4 className="font-semibold text-gray-800 dark:text-white mb-1">Manual Backup</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Create an immediate database backup</p>
                <button onClick={handleBackup} className="flex items-center gap-2 px-5 py-2.5 bg-ticano-charcoal text-white rounded-xl text-sm font-medium hover:bg-black">
                  <Database size={16} /> Backup Now
                </button>
              </div>
              <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl">
                <h4 className="font-semibold text-gray-800 dark:text-white mb-1">Scheduled Backups</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Current schedule: Daily at 02:00 CAT</p>
                <button className="text-xs text-ticano-red hover:underline">Modify Schedule</button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'WhatsApp Templates' && <WaTemplatesTab />}

        {/* Audit Logs (§15) — immutable complaint audit trail */}
        {activeTab === 'Audit Logs' && <AuditLogsTab />}

        {/* System Health */}
        {activeTab === 'System Health' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { label: 'API Status', value: 'Operational', status: 'good', icon: Activity },
              { label: 'Database', value: 'Connected', status: 'good', icon: Database },
              { label: 'WhatsApp API', value: 'Connected', status: 'good', icon: Settings },
              { label: 'Email Service', value: 'Operational', status: 'good', icon: FileText },
              { label: 'Scheduler', value: 'Running', status: 'good', icon: Activity },
              { label: 'Uptime', value: '99.8%', status: 'good', icon: TrendingUp },
            ].map(({ label, value, status, icon: Icon }) => (
              <div key={label} className="bg-white dark:bg-ticano-dark-card rounded-2xl shadow p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}</span>
                  <Icon size={18} className="text-gray-400" />
                </div>
                <p className="font-bold text-gray-800 dark:text-white">{value}</p>
                <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${status === 'good' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {status === 'good' ? '● Healthy' : '● Issue'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Employee modal */}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSaved={(updated) => { setUsers((p) => p.map((u) => (u.id === updated.id ? { ...u, ...updated } : u))); }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
//  Audit Logs (§15) — immutable, queryable complaint audit trail
// ---------------------------------------------------------------------
function AuditLogsTab() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  useEffect(() => {
    getAuditTrail({}).then(({ data }) => {
      setRows(data);
      setLoading(false);
    });
  }, []);

  const filtered = rows.filter((r) => {
    if (actionFilter !== 'all' && r.action !== actionFilter) return false;
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      r.ticket.toLowerCase().includes(term) ||
      r.user.toLowerCase().includes(term) ||
      r.action.toLowerCase().includes(term)
    );
  });

  const ACTIONS = ['all', 'Created', 'Assigned', 'Updated', 'Escalated', 'Resolved', 'Closed'];

  if (loading) return <LoadingSpinner />;

  return (
    <div className="bg-white dark:bg-ticano-dark-card rounded-2xl shadow p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h3 className="font-bold text-ticano-charcoal dark:text-white text-lg">Complaint Audit Log</h3>
          <p className="text-xs text-gray-500">Immutable record of every state change. {rows.length} entries.</p>
        </div>
        <ExportButton onExport={(fmt) => toast.success(`Exporting ${fmt.toUpperCase()}...`)} />
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search ticket, user, action…"
          className="flex-1 min-w-[200px] px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
        />
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
        >
          {ACTIONS.map((a) => <option key={a} value={a}>{a === 'all' ? 'All actions' : a}</option>)}
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              {['Timestamp', 'Ticket', 'User', 'Action', 'Previous', 'New'].map((h) => (
                <th key={h} className="text-left py-3 px-2 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="py-8 text-center text-gray-400">No entries match the current filters</td></tr>
            ) : filtered.map((r) => (
              <tr key={r.id} className="border-b border-gray-100 dark:border-gray-800">
                <td className="py-2 px-2 text-xs text-gray-500">{new Date(r.at).toLocaleString()}</td>
                <td className="py-2 px-2 font-mono text-ticano-red font-semibold">{r.ticket}</td>
                <td className="py-2 px-2">{r.user}</td>
                <td className="py-2 px-2"><span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">{r.action}</span></td>
                <td className="py-2 px-2 text-xs text-gray-500 font-mono">{r.previousValue || '—'}</td>
                <td className="py-2 px-2 text-xs font-mono">{r.newValue || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
//  Edit Employee — update details + admin password reset (temp password)
// ---------------------------------------------------------------------
function EditUserModal({ user, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: user.name || '',
    role: user.role || 'portfolio_manager',
    branch: user.branch || '',
    isActive: user.isActive !== false,
  });
  const [saving, setSaving] = useState(false);
  const [temp, setTemp] = useState(null);
  const [resetting, setResetting] = useState(false);
  const [copied, setCopied] = useState(false);

  const inp = 'w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-ticano-red';
  const lbl = 'block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1';

  const save = async () => {
    setSaving(true);
    try {
      await updateUser(user.id, form);
      toast.success('Employee details updated');
      onSaved?.({ id: user.id, ...form });
      onClose();
    } catch {
      toast.error('Could not update employee');
    } finally {
      setSaving(false);
    }
  };

  const resetPassword = async () => {
    setResetting(true);
    setCopied(false);
    try {
      const { data } = await adminResetUserPassword(user.id);
      setTemp(data.tempPassword);
      toast.success('Temporary password generated');
    } catch {
      toast.error('Could not reset password');
    } finally {
      setResetting(false);
    }
  };

  const copyTemp = async () => {
    try { await navigator.clipboard.writeText(temp); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  };

  return (
    <Modal open onClose={onClose} title={`Edit Employee — ${user.name}`} size="md"
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300">Cancel</button>
          <button onClick={save} disabled={saving} className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-ticano-red text-white hover:bg-ticano-red-dark disabled:opacity-60">
            <Save size={14} /> {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Full Name</label>
            <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className={inp} />
          </div>
          <div>
            <label className={lbl}>Email</label>
            <input value={user.email} disabled className={`${inp} opacity-60 cursor-not-allowed`} />
          </div>
          <div>
            <label className={lbl}>Role</label>
            <select value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))} className={inp}>
              {STAFF_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r] || r}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Branch</label>
            <select value={form.branch} onChange={(e) => setForm((p) => ({ ...p, branch: e.target.value }))} className={inp}>
              <option value="">— None —</option>
              {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
              <option value="Head Office">Head Office</option>
            </select>
          </div>
        </div>

        <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 cursor-pointer">
          <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))} />
          <div>
            <p className="text-sm font-medium text-gray-800 dark:text-white">Account active</p>
            <p className="text-xs text-gray-500">Disabled accounts cannot sign in.</p>
          </div>
        </label>

        {/* Password reset */}
        <div className="rounded-xl border border-amber-200 dark:border-amber-700/40 bg-amber-50/60 dark:bg-amber-900/10 p-4">
          <div className="flex items-center gap-2 mb-2">
            <KeyRound size={16} className="text-amber-600" />
            <h4 className="font-semibold text-amber-900 dark:text-amber-200 text-sm">Password Reset</h4>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-300 mb-3">
            Employees cannot reset their own passwords. Generate a temporary password and share it securely — the employee will be required to change it on next login.
          </p>

          {!temp ? (
            <button onClick={resetPassword} disabled={resetting}
              className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-ticano-charcoal text-white hover:bg-black disabled:opacity-60">
              <KeyRound size={14} /> {resetting ? 'Generating…' : 'Reset Password'}
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-gray-500 dark:text-gray-400">Temporary password (must be changed on next login):</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 font-mono text-sm font-bold text-ticano-charcoal dark:text-white bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 tracking-wide">{temp}</code>
                <button onClick={copyTemp} className="flex items-center gap-1 px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                  {copied ? <><CheckCircle2 size={13} className="text-green-600" /> Copied</> : <><Copy size={13} /> Copy</>}
                </button>
              </div>
              <button onClick={resetPassword} disabled={resetting} className="text-xs text-ticano-red hover:underline">Generate a different one</button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------
//  Website Content — admin-editable landing-page content
//  (contact details, social links, mission/vision, legal documents)
// ---------------------------------------------------------------------
function LandingPageManagementTab() {
  const { user } = useAuth();
  const [s, setS] = useState(null);
  const [audit, setAudit] = useState([]);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(null);

  const load = () => {
    getSiteSettings().then(({ data }) => setS(data)).catch(() => {});
    getSiteAudit().then(({ data }) => setAudit(data)).catch(() => {});
  };
  useEffect(load, []);

  if (!s) return <LoadingSpinner />;

  const setField = (k, v) => setS((p) => ({ ...p, [k]: v }));
  const setSocial = (k, patch) => setS((p) => ({ ...p, social: { ...p.social, [k]: { ...p.social[k], ...patch } } }));
  const setLegalDraft = (k, v) => setS((p) => ({ ...p, legal: { ...p.legal, [k]: { ...p.legal[k], draft: v } } }));
  const setBranchPhone = (i, v) => setS((p) => ({ ...p, branchContacts: p.branchContacts.map((b, idx) => idx === i ? { ...b, phone: v, placeholder: /X/i.test(v) } : b) }));
  const setHome = (k, v) => setS((p) => ({ ...p, homepage: { ...p.homepage, [k]: v } }));
  const setLogin = (k, v) => setS((p) => ({ ...p, loginPage: { ...p.loginPage, [k]: v } }));
  const svcList = () => s.homepage?.services || [];
  const setSvc = (i, k, v) => setS((p) => ({ ...p, homepage: { ...p.homepage, services: (p.homepage?.services || []).map((sv, idx) => idx === i ? { ...sv, [k]: v } : sv) } }));
  const addSvc = () => setS((p) => ({ ...p, homepage: { ...p.homepage, services: [...(p.homepage?.services || []), { title: 'New service', desc: '', highlight: '', long: '' }] } }));
  const removeSvc = (i) => setS((p) => ({ ...p, homepage: { ...p.homepage, services: (p.homepage?.services || []).filter((_, idx) => idx !== i) } }));

  const inp = 'w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-ticano-red';
  const lbl = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';
  const section = 'text-xs uppercase tracking-wide text-gray-400 font-semibold mb-3';
  const card = 'bg-white dark:bg-ticano-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6';

  const isValidUrl = (u) => !u || /^https?:\/\/.+/i.test(u.trim());

  const SOCIAL_DEFS = [
    { key: 'facebook',  label: 'Facebook',    icon: Facebook },
    { key: 'instagram', label: 'Instagram',   icon: Instagram },
    { key: 'linkedin',  label: 'LinkedIn',    icon: Linkedin },
    { key: 'twitter',   label: 'X (Twitter)', icon: Twitter },
    { key: 'whatsapp',  label: 'WhatsApp',    icon: MessageCircle },
    { key: 'youtube',   label: 'YouTube',     icon: Youtube },
  ];
  const LEGAL_DEFS = [
    { key: 'privacy', label: 'Privacy Policy' },
    { key: 'terms', label: 'Terms of Service' },
    { key: 'cookie', label: 'Cookie Policy' },
  ];

  const persist = async (patch, successMsg) => {
    setSaving(true);
    try {
      const { data } = await updateSiteSettings(patch, user?.name || 'Admin');
      setS(data.settings);
      getSiteAudit().then(({ data: a }) => setAudit(a));
      toast.success(successMsg);
    } catch {
      toast.error('Could not save changes');
    } finally {
      setSaving(false);
    }
  };

  const saveSocial = () => {
    const bad = SOCIAL_DEFS.find((d) => !isValidUrl(s.social[d.key]?.url));
    if (bad) return toast.error(`${bad.label} URL must start with http:// or https://`);
    persist({ social: s.social }, 'Social links updated — live on the landing page');
  };
  const saveContact = () => persist({ contactEmail: s.contactEmail, contactPhone: s.contactPhone, mission: s.mission, vision: s.vision }, 'Contact & company info updated');
  const saveHomepage = () => persist({ homepage: s.homepage }, 'Homepage content updated — live on the public site');
  const saveLogin = () => persist({ loginPage: s.loginPage }, 'Login page content updated');
  const saveServices = () => persist({ homepage: { services: svcList() } }, 'Services updated — live on the homepage');
  const saveBranches = () => persist({ branchContacts: s.branchContacts }, 'Footer branch numbers updated');
  const saveDraft = (key, label) => persist({ legal: { [key]: { draft: s.legal[key]?.draft ?? '' } } }, `${label} draft saved`);
  const publishLegal = (key, label) => {
    const draft = s.legal[key]?.draft ?? '';
    if (!draft.trim()) return toast.error(`${label} cannot be empty`);
    persist({ legal: { [key]: { draft, published: draft } } }, `${label} published`);
  };

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Globe size={18} className="text-ticano-red" />
          <h3 className="font-bold text-ticano-charcoal dark:text-white text-lg">Landing Page Management</h3>
        </div>
        <p className="text-sm text-gray-500">Manage public website content — social links, footer contacts, company info, and legal documents. Changes go live immediately and are recorded in the audit trail.</p>
      </div>

      <div className={card}>
        <p className={section}>Social Media Links</p>
        <div className="space-y-3">
          {SOCIAL_DEFS.map(({ key, label, icon: Icon }) => {
            const sm = s.social[key] || { url: '', enabled: false };
            const valid = isValidUrl(sm.url);
            return (
              <div key={key} className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
                <div className="flex items-center gap-2 w-32 shrink-0">
                  <Icon size={16} className="text-gray-500" /><span className="text-sm text-gray-700 dark:text-gray-200">{label}</span>
                </div>
                <div className="flex-1 min-w-[180px]">
                  <input value={sm.url || ''} onChange={(e) => setSocial(key, { url: e.target.value })} placeholder="https://…"
                    className={`${inp} ${!valid ? 'border-red-400 focus:ring-red-400' : ''}`} />
                  {!valid && <p className="text-[11px] text-red-500 mt-0.5">Must start with http:// or https://</p>}
                </div>
                <button type="button" onClick={() => sm.url ? window.open(sm.url, '_blank', 'noopener') : toast('Add a URL first', { icon: 'ℹ️' })}
                  className="p-2 text-gray-400 hover:text-ticano-red" title="Preview link"><Eye size={15} /></button>
                <button type="button" onClick={() => setSocial(key, { enabled: !sm.enabled })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 ${sm.enabled ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-700'}`}>
                  {sm.enabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>
            );
          })}
        </div>
        <div className="flex justify-end mt-4">
          <button onClick={saveSocial} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 bg-ticano-red text-white rounded-xl text-sm font-semibold hover:bg-ticano-red-dark disabled:opacity-60"><Save size={15} /> Save social links</button>
        </div>
      </div>

      <div className={card}>
        <p className={section}>Footer Branch Contact Numbers</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {s.branchContacts.map((b, i) => (
            <div key={b.name}>
              <label className={lbl}>{b.name} {b.placeholder && <span className="text-[10px] text-amber-600">(placeholder)</span>}</label>
              <input value={b.phone} onChange={(e) => setBranchPhone(i, e.target.value)} placeholder="+267 XXX XXX XXX" className={inp} />
            </div>
          ))}
        </div>
        <div className="flex justify-end mt-4">
          <button onClick={saveBranches} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 bg-ticano-red text-white rounded-xl text-sm font-semibold hover:bg-ticano-red-dark disabled:opacity-60"><Save size={15} /> Save branch numbers</button>
        </div>
      </div>

      <div className={card}>
        <p className={section}>Contact & Company Info</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div><label className={lbl}><Mail size={12} className="inline mr-1" />Public Email</label><input value={s.contactEmail} onChange={(e) => setField('contactEmail', e.target.value)} className={inp} /></div>
          <div><label className={lbl}><Phone size={12} className="inline mr-1" />Public Phone</label><input value={s.contactPhone} onChange={(e) => setField('contactPhone', e.target.value)} className={inp} /></div>
        </div>
        <div className="space-y-4">
          <div><label className={lbl}><Target size={12} className="inline mr-1" />Mission</label><textarea rows={3} value={s.mission} onChange={(e) => setField('mission', e.target.value)} className={`${inp} resize-none`} /></div>
          <div><label className={lbl}>Vision</label><textarea rows={3} value={s.vision} onChange={(e) => setField('vision', e.target.value)} className={`${inp} resize-none`} /></div>
        </div>
        <div className="flex justify-end mt-4">
          <button onClick={saveContact} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 bg-ticano-red text-white rounded-xl text-sm font-semibold hover:bg-ticano-red-dark disabled:opacity-60"><Save size={15} /> Save company info</button>
        </div>
      </div>

      <div className={card}>
        <p className={section}>Homepage Hero & Headline</p>
        <div className="space-y-3">
          <div><label className={lbl}>Hero badge</label><input value={s.homepage?.heroBadge || ''} onChange={(e) => setHome('heroBadge', e.target.value)} className={inp} /></div>
          <div><label className={lbl}>Hero title</label><textarea rows={2} value={s.homepage?.heroTitle || ''} onChange={(e) => setHome('heroTitle', e.target.value)} className={`${inp} resize-none`} /></div>
          <div><label className={lbl}>Hero subtitle</label><textarea rows={2} value={s.homepage?.heroSubtitle || ''} onChange={(e) => setHome('heroSubtitle', e.target.value)} className={`${inp} resize-none`} /></div>
          <div><label className={lbl}>Hero quote</label><input value={s.homepage?.heroQuote || ''} onChange={(e) => setHome('heroQuote', e.target.value)} className={inp} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Primary button</label><input value={s.homepage?.ctaPrimary || ''} onChange={(e) => setHome('ctaPrimary', e.target.value)} className={inp} /></div>
            <div><label className={lbl}>Secondary button</label><input value={s.homepage?.ctaSecondary || ''} onChange={(e) => setHome('ctaSecondary', e.target.value)} className={inp} /></div>
          </div>
          <div><label className={lbl}>About-section heading</label><input value={s.homepage?.aboutHeading || ''} onChange={(e) => setHome('aboutHeading', e.target.value)} className={inp} /></div>
          <p className={section + ' mt-2'}>Headline Statistics</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[1, 2, 3].map((n) => (
              <React.Fragment key={n}>
                <div><label className={lbl}>Stat {n} value</label><input value={s.homepage?.[`stat${n}Value`] || ''} onChange={(e) => setHome(`stat${n}Value`, e.target.value)} className={inp} /></div>
                <div className="sm:col-span-2"><label className={lbl}>Stat {n} label</label><input value={s.homepage?.[`stat${n}Label`] || ''} onChange={(e) => setHome(`stat${n}Label`, e.target.value)} className={inp} /></div>
              </React.Fragment>
            ))}
          </div>
        </div>
        <div className="flex justify-end mt-4">
          <button onClick={saveHomepage} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 bg-ticano-red text-white rounded-xl text-sm font-semibold hover:bg-ticano-red-dark disabled:opacity-60"><Save size={15} /> Save homepage content</button>
        </div>
      </div>

      <div className={card}>
        <div className="flex items-center justify-between mb-3">
          <p className={section + ' mb-0'}>Homepage Services</p>
          <button onClick={addSvc} className="text-sm text-ticano-red font-medium hover:underline">+ Add service</button>
        </div>
        <div className="space-y-4">
          {svcList().map((sv, i) => (
            <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-400">Service {i + 1}</span>
                <button onClick={() => removeSvc(i)} className="text-gray-300 hover:text-red-500" title="Remove"><Trash2 size={14} /></button>
              </div>
              <input value={sv.title || ''} onChange={(e) => setSvc(i, 'title', e.target.value)} placeholder="Service title" className={inp} />
              <input value={sv.highlight || ''} onChange={(e) => setSvc(i, 'highlight', e.target.value)} placeholder="Highlight badge (e.g. Up to 80% of PO value)" className={inp} />
              <textarea rows={2} value={sv.desc || ''} onChange={(e) => setSvc(i, 'desc', e.target.value)} placeholder="Short description (shown on the card)" className={`${inp} resize-none`} />
              <textarea rows={3} value={sv.long || ''} onChange={(e) => setSvc(i, 'long', e.target.value)} placeholder="Full description (shown in the detail pop-up)" className={`${inp} resize-none`} />
            </div>
          ))}
          {svcList().length === 0 && <p className="text-sm text-gray-400">No services configured — the homepage will show the built-in defaults.</p>}
        </div>
        <div className="flex justify-end mt-4">
          <button onClick={saveServices} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 bg-ticano-red text-white rounded-xl text-sm font-semibold hover:bg-ticano-red-dark disabled:opacity-60"><Save size={15} /> Save services</button>
        </div>
      </div>

      <div className={card}>
        <p className={section}>Login Page Content</p>
        <div className="space-y-3">
          <div><label className={lbl}>Brand subtitle</label><input value={s.loginPage?.brandSubtitle || ''} onChange={(e) => setLogin('brandSubtitle', e.target.value)} className={inp} /></div>
          <div><label className={lbl}>Hero title</label><textarea rows={2} value={s.loginPage?.heroTitle || ''} onChange={(e) => setLogin('heroTitle', e.target.value)} className={`${inp} resize-none`} /></div>
          <div><label className={lbl}>Hero subtitle</label><textarea rows={2} value={s.loginPage?.heroSubtitle || ''} onChange={(e) => setLogin('heroSubtitle', e.target.value)} className={`${inp} resize-none`} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Welcome title</label><input value={s.loginPage?.welcomeTitle || ''} onChange={(e) => setLogin('welcomeTitle', e.target.value)} className={inp} /></div>
            <div><label className={lbl}>Welcome subtitle</label><input value={s.loginPage?.welcomeSubtitle || ''} onChange={(e) => setLogin('welcomeSubtitle', e.target.value)} className={inp} /></div>
          </div>
        </div>
        <div className="flex justify-end mt-4">
          <button onClick={saveLogin} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 bg-ticano-red text-white rounded-xl text-sm font-semibold hover:bg-ticano-red-dark disabled:opacity-60"><Save size={15} /> Save login page</button>
        </div>
      </div>

      <div className={card}>
        <p className={section}><FileText size={12} className="inline mr-1" />Legal Documents</p>
        <div className="space-y-6">
          {LEGAL_DEFS.map(({ key, label }) => {
            const doc = s.legal[key] || { draft: '', published: '', revisions: [] };
            const dirty = doc.draft !== doc.published;
            return (
              <div key={key} className="border border-gray-100 dark:border-gray-700 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-ticano-charcoal dark:text-white text-sm">{label}</h4>
                    {dirty
                      ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Unpublished changes</span>
                      : <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700">Published</span>}
                    {doc.revisions?.length > 0 && <span className="text-[10px] text-gray-400 flex items-center gap-1"><History size={10} />{doc.revisions.length} revision{doc.revisions.length === 1 ? '' : 's'}</span>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setPreview({ title: label + ' (draft)', body: doc.draft })} className="text-xs flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300"><Eye size={12} /> Preview</button>
                    <button onClick={() => saveDraft(key, label)} disabled={saving} className="text-xs flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300"><Save size={12} /> Save draft</button>
                    <button onClick={() => publishLegal(key, label)} disabled={saving || !dirty} className="text-xs flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-ticano-red text-white disabled:opacity-50"><UploadCloud size={12} /> Publish</button>
                  </div>
                </div>
                <textarea rows={5} value={doc.draft} onChange={(e) => setLegalDraft(key, e.target.value)} className={`${inp} resize-none`} />
                <p className="text-[11px] text-gray-400 mt-1">The public {label} page shows the last <b>published</b> version. Editing here updates the draft until you publish.</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className={card}>
        <p className={section}><History size={12} className="inline mr-1" />Change Audit Trail</p>
        {audit.length === 0 ? (
          <p className="text-sm text-gray-400">No content changes recorded yet.</p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {audit.map((a) => (
              <div key={a.id} className="text-xs border border-gray-100 dark:border-gray-700 rounded-lg p-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-ticano-charcoal dark:text-white">{a.section}</span>
                  <span className="text-gray-400">{new Date(a.at).toLocaleString('en-GB')}</span>
                </div>
                <p className="text-gray-500 mt-0.5">By {a.user}</p>
                <details className="mt-1">
                  <summary className="cursor-pointer text-ticano-red">View change</summary>
                  <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div><p className="text-gray-400 mb-0.5">Previous</p><p className="text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 rounded p-1.5 break-words max-h-24 overflow-y-auto">{a.previousValue || '—'}</p></div>
                    <div><p className="text-gray-400 mb-0.5">New</p><p className="text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 rounded p-1.5 break-words max-h-24 overflow-y-auto">{a.newValue || '—'}</p></div>
                  </div>
                </details>
              </div>
            ))}
          </div>
        )}
      </div>

      {preview && (
        <Modal open onClose={() => setPreview(null)} title={preview.title} size="md">
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line">{preview.body || 'Nothing to preview yet.'}</p>
        </Modal>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
//  Branch Management — list + editable detail modal
// ---------------------------------------------------------------------
function BranchManagementTab() {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const { addNotification } = useNotifications();

  const load = () => {
    setLoading(true);
    getBranches().then(({ data }) => {
      setBranches(data);
      setLoading(false);
    });
  };

  useEffect(load, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="bg-white dark:bg-ticano-dark-card rounded-2xl shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-ticano-charcoal dark:text-white text-lg">Branch Management</h3>
          <p className="text-xs text-gray-500">{branches.length} branches · click a card to edit details</p>
        </div>
        <button onClick={() => setCreating(true)} className="flex items-center gap-2 px-4 py-2 bg-ticano-red text-white rounded-lg text-sm font-medium hover:bg-ticano-red-dark">
          <Plus size={16} /> New Branch
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {branches.map((b) => (
          <button
            key={b.id}
            onClick={() => setEditing(b)}
            className="text-left border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:border-ticano-red hover:shadow-md transition-all"
          >
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-semibold text-gray-800 dark:text-white">{b.name}</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
                  <MapPin size={11} /> {b.city}, {b.country}
                </p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${b.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {b.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="mt-3 space-y-1 text-xs text-gray-600 dark:text-gray-300">
              <p className="flex items-center gap-1"><Phone size={11} /> {b.phone}</p>
              <p className="flex items-center gap-1"><Mail size={11} /> {b.email}</p>
              <p className="flex items-center gap-1"><Clock size={11} /> {b.openHours}</p>
              <p className="text-gray-500">Manager: <span className="text-gray-800 dark:text-white">{b.manager || '—'}</span></p>
            </div>
            <span className="mt-3 inline-flex items-center gap-1 text-xs text-ticano-red font-medium">
              <Edit2 size={11} /> Edit details
            </span>
          </button>
        ))}
      </div>

      <BranchEditModal
        branch={editing}
        onClose={() => setEditing(null)}
        onSaved={() => { setEditing(null); load(); }}
      />

      <BranchCreateModal
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(b) => {
          setCreating(false);
          load();
          addNotification({ type: 'branch', title: 'New branch added', body: `${b.name} is now live in the directory, on the map, and in branch search.`, to: 'Branch Management' });
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------
//  Create Branch — full details + map location (Option A: place on map,
//  Option B: geocode from address). Appears immediately in Find Branch,
//  listings, and branch search.
// ---------------------------------------------------------------------
function BranchCreateModal({ open, onClose, onCreated }) {
  const blank = { name: '', address: '', city: '', country: 'Botswana', region: '', phone: '', email: '', manager: '', openHours: 'Mon–Fri 08:00–17:00, Sat 09:00–12:00', notes: '', isActive: true, lat: null, lng: null };
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) setForm(blank); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const input = 'w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-ticano-red';
  const label = 'text-xs uppercase tracking-wide text-gray-500';

  const save = async () => {
    if (!form.name.trim()) return toast.error('Branch name is required');
    if (!form.city.trim()) return toast.error('City is required');
    if (typeof form.lat !== 'number' || typeof form.lng !== 'number') return toast.error('Set the branch location on the map');
    setSaving(true);
    try {
      const { data } = await createBranch(form);
      toast.success(`${data.branch.name} created`);
      onCreated?.(data.branch);
    } catch {
      toast.error('Could not create branch');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Create New Branch" size="lg"
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm flex items-center gap-1"><X size={14} /> Cancel</button>
          <button onClick={save} disabled={saving} className="px-4 py-2 rounded-lg bg-ticano-red text-white text-sm hover:bg-ticano-red-dark flex items-center gap-1 disabled:opacity-60"><Save size={14} /> {saving ? 'Creating…' : 'Create Branch'}</button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div><label className={label}>Branch name *</label><input className={input} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Kasane Branch" /></div>
          <div><label className={label}>City *</label><input className={input} value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="Kasane" /></div>
        </div>
        <div><label className={label}>Physical address</label><input className={input} value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Plot, street, area…" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={label}>Region</label><input className={input} value={form.region} onChange={(e) => set('region', e.target.value)} placeholder="e.g. Chobe" /></div>
          <div><label className={label}>Branch phone</label><input className={input} value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+267 …" /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={label}>Branch email</label><input type="email" className={input} value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="branch@ticano.co.bw" /></div>
          <div><label className={label}>Branch manager</label><input className={input} value={form.manager} onChange={(e) => set('manager', e.target.value)} /></div>
        </div>
        <div><label className={label}>Opening hours</label><input className={input} value={form.openHours} onChange={(e) => set('openHours', e.target.value)} /></div>

        <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
          <label className={`${label} block mb-2`}>Branch location (used for the map) *</label>
          <BranchLocationPicker lat={form.lat} lng={form.lng} address={form.address || form.city}
            onChange={({ lat, lng }) => setForm((p) => ({ ...p, lat, lng }))} />
        </div>

        <label className="flex items-center gap-2 text-sm cursor-pointer pt-1">
          <input type="checkbox" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} className="w-4 h-4 accent-ticano-red" />
          <span className="text-gray-700 dark:text-gray-200">Branch is active and accepting customers</span>
        </label>
      </div>
    </Modal>
  );
}

function BranchEditModal({ branch, onClose, onSaved }) {
  const [form, setForm] = useState({});

  useEffect(() => {
    if (branch) {
      setForm({
        name: branch.name || '',
        address: branch.address || '',
        city: branch.city || '',
        country: branch.country || 'Botswana',
        phone: branch.phone || '',
        email: branch.email || '',
        manager: branch.manager || '',
        openHours: branch.openHours || '',
        notes: branch.notes || '',
        isActive: branch.isActive !== false,
        lat: typeof branch.lat === 'number' ? branch.lat : null,
        lng: typeof branch.lng === 'number' ? branch.lng : null,
      });
    }
  }, [branch]);

  const save = () => {
    if (!form.name?.trim()) return toast.error('Branch name is required');
    if (!form.city?.trim()) return toast.error('City is required');
    updateBranch(branch.id, form).then(({ data }) => {
      toast.success(`${data.branch.name} updated`);
      onSaved();
    });
  };

  if (!branch) return null;

  const input = 'w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-ticano-red';
  const label = 'text-xs uppercase tracking-wide text-gray-500';

  return (
    <Modal isOpen={!!branch} onClose={onClose} title={`Edit Branch — ${branch.name}`}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Branch name</label>
            <input className={input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className={label}>City</label>
            <input className={input} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </div>
        </div>

        <div>
          <label className={label}>Physical address</label>
          <input className={input} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Plot, street, area…" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Country</label>
            <input className={input} value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
          </div>
          <div>
            <label className={label}>Branch phone</label>
            <input className={input} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+267 …" />
          </div>
        </div>

        <div>
          <label className={label}>Branch email</label>
          <input type="email" className={input} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Branch manager</label>
            <input className={input} value={form.manager} onChange={(e) => setForm({ ...form, manager: e.target.value })} />
          </div>
          <div>
            <label className={label}>Opening hours</label>
            <input className={input} value={form.openHours} onChange={(e) => setForm({ ...form, openHours: e.target.value })} placeholder="Mon–Fri 08:00–17:00, Sat 09:00–12:00" />
          </div>
        </div>

        <div>
          <label className={label}>Notes</label>
          <textarea rows={2} className={`${input} resize-none`} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Any extra info about this branch…" />
        </div>

        <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
          <label className={`${label} block mb-2`}>Branch location (used for the map)</label>
          <BranchLocationPicker lat={form.lat} lng={form.lng} address={form.address || form.city}
            onChange={({ lat, lng }) => setForm((f) => ({ ...f, lat, lng }))} />
        </div>

        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            className="w-4 h-4 accent-ticano-red"
          />
          <span className="text-gray-700 dark:text-gray-200">Branch is active and accepting customers</span>
        </label>
      </div>

      <div className="flex justify-end gap-2 mt-5">
        <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm flex items-center gap-1">
          <X size={14} /> Cancel
        </button>
        <button onClick={save} className="px-4 py-2 rounded-lg bg-ticano-red text-white text-sm hover:bg-ticano-red-dark flex items-center gap-1">
          <Save size={14} /> Save Changes
        </button>
      </div>
    </Modal>
  );
}

// ---- WhatsApp Templates Tab ----
const WA_ROLE_LABEL = { portfolio_manager: 'Portfolio Manager', service_manager: 'Service Manager', director: 'Director', admin: 'Admin' };

function WaTemplatesTab() {
  const [templates, setTemplates] = React.useState([]);
  const [loading, setLoading]     = React.useState(true);
  const [showForm, setShowForm]   = React.useState(false);
  const [editing, setEditing]     = React.useState(null);
  const [roleFilter, setRoleFilter] = React.useState('all');
  const [form, setForm]           = React.useState({ name:'', key:'', body:'', variables:[], role:'portfolio_manager', active:true });

  // Admin sees ALL templates, including ones taken offline.
  const load = () => {
    getAllWaTemplates().then(({data}) => { setTemplates(data); setLoading(false); });
  };
  React.useEffect(load, []);

  const blank = { name:'', key:'', body:'', variables:[], role:'portfolio_manager', active:true };

  const handleSave = async () => {
    if (!form.name || !form.body) return toast.error('Name and message body required');
    try {
      if (editing) {
        await updateWaTemplate(editing.id, form);
        toast.success('Template updated — changes are live immediately');
      } else {
        await createWaTemplate(form);
        toast.success('Template created');
      }
      setShowForm(false); setEditing(null);
      setForm(blank);
      load();
    } catch { toast.error('Failed to save template'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this template permanently?')) return;
    await deleteWaTemplate(id);
    toast.success('Template deleted');
    load();
  };

  // Take offline (hidden from end users, kept in storage) or reactivate.
  const toggleActive = async (t) => {
    await setWaTemplateActive(t.id, !t.active);
    toast.success(t.active ? 'Template taken offline — hidden from users' : 'Template reactivated — now available to users');
    load();
  };

  const startEdit = (t) => {
    setEditing(t);
    setForm({ name: t.name, key: t.key, body: t.body, variables: t.variables||[], role: t.role||'portfolio_manager', active: t.active !== false });
    setShowForm(true);
  };

  const inp = 'w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-ticano-red';

  if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-ticano-red border-t-transparent rounded-full animate-spin"/></div>;

  const visible = roleFilter === 'all' ? templates : templates.filter((t) => t.role === roleFilter);
  const activeCount = templates.filter((t) => t.active !== false).length;
  const offlineCount = templates.length - activeCount;

  return (
    <div className="bg-white dark:bg-ticano-dark-card rounded-2xl shadow p-6">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h3 className="font-bold text-ticano-charcoal dark:text-white text-lg">WhatsApp Message Templates</h3>
          <p className="text-xs text-gray-500 mt-0.5">{activeCount} active · {offlineCount} offline · Offline templates stay stored but are hidden from end users · Use [Variable] syntax</p>
        </div>
        <button onClick={()=>{setEditing(null);setForm(blank);setShowForm(!showForm);}}
          className="flex items-center gap-2 px-4 py-2 bg-ticano-red text-white rounded-xl text-sm font-medium hover:bg-ticano-red-dark transition-all duration-200">
          <Plus size={15}/> New Template
        </button>
      </div>

      {/* Role filter */}
      <div className="flex flex-wrap gap-2 mb-5">
        <button onClick={() => setRoleFilter('all')} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${roleFilter === 'all' ? 'bg-ticano-charcoal text-white border-ticano-charcoal' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300'}`}>All Roles</button>
        {WA_TEMPLATE_ROLES.map((r) => (
          <button key={r} onClick={() => setRoleFilter(r)} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${roleFilter === r ? 'bg-ticano-charcoal text-white border-ticano-charcoal' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300'}`}>{WA_ROLE_LABEL[r]}</button>
        ))}
      </div>

      {showForm && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-5 mb-5 border border-gray-200 dark:border-gray-700 animate-scale-in">
          <h4 className="font-semibold text-gray-800 dark:text-white mb-4">{editing ? 'Edit Template' : 'New Template'}</h4>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Template Name</label><input className={inp} value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="e.g. Complaint Acknowledgement" /></div>
              <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Key (slug)</label><input className={inp} value={form.key} onChange={e=>setForm({...form,key:e.target.value})} placeholder="e.g. complaint_ack" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Available to role</label>
                <select className={inp} value={form.role} onChange={e=>setForm({...form,role:e.target.value})}>
                  {WA_TEMPLATE_ROLES.map((r) => <option key={r} value={r}>{WA_ROLE_LABEL[r]}</option>)}
                </select>
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300">
                  <input type="checkbox" checked={form.active} onChange={(e)=>setForm({...form,active:e.target.checked})} className="accent-ticano-red w-4 h-4" />
                  Active (visible to users)
                </label>
              </div>
            </div>
            <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Message Body</label>
              <textarea rows={4} className={inp+' resize-none'} value={form.body} onChange={e=>setForm({...form,body:e.target.value})} placeholder="Hi [Name], your complaint [Ticket] has been received…" />
              <p className="text-xs text-gray-400 mt-1">Use [VariableName] for placeholders — variables are auto-detected. e.g. [Name], [Ticket], [Link]</p>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={()=>{setShowForm(false);setEditing(null);}} className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 text-sm">Cancel</button>
              <button onClick={handleSave} className="px-4 py-2 rounded-xl bg-ticano-red text-white text-sm font-semibold hover:bg-ticano-red-dark">Save Template</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {visible.map((t, i) => (
          <div key={t.id} className={`border rounded-xl p-4 hover-lift animate-fade-up group transition-opacity ${t.active === false ? 'border-dashed border-gray-300 dark:border-gray-600 opacity-70 bg-gray-50/50 dark:bg-gray-800/40' : 'border-gray-200 dark:border-gray-700'}`} style={{animationDelay:`${i*0.06}s`}}>
            <div className="flex items-start justify-between mb-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-sm text-gray-900 dark:text-white">{t.name}</p>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500">{WA_ROLE_LABEL[t.role] || t.role}</span>
                  {t.active === false
                    ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-200 text-gray-600 font-semibold">Offline</span>
                    : <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold">Active</span>}
                </div>
                <p className="text-[10px] text-gray-400 font-mono mt-0.5">{t.key}</p>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button onClick={()=>toggleActive(t)} title={t.active === false ? 'Reactivate' : 'Take offline'} className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 hover:bg-amber-100 hover:text-amber-600 transition-colors">
                  {t.active === false ? <Eye size={12}/> : <EyeOff size={12}/>}
                </button>
                <button onClick={()=>startEdit(t)} className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 hover:bg-blue-100 hover:text-blue-600 transition-colors"><Edit2 size={12}/></button>
                <button onClick={()=>handleDelete(t.id)} className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 hover:bg-red-100 hover:text-red-600 transition-colors"><Trash2 size={12}/></button>
              </div>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">{t.body}</p>
            {t.variables?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3">
                {t.variables.map(v => <span key={v} className="text-[10px] bg-ticano-red/10 text-ticano-red px-2 py-0.5 rounded-full font-mono">[{v}]</span>)}
              </div>
            )}
            <p className="text-[10px] text-gray-400 mt-2">Updated {new Date(t.lastUpdated).toLocaleDateString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
