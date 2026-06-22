import React, { useState, useEffect } from 'react';
import { Users, GitBranch, Settings, Database, FileText, Activity, Plus, Trash2, Edit2, TrendingUp, BookOpen, MapPin, Phone, Mail, Clock, X, Save, MessageSquare, Send } from 'lucide-react';
import Navbar from '../components/common/Navbar';
import { Badge, SearchFilters, ExportButton, LoadingSpinner, Modal } from '../components/common/UI';
import KnowledgeBase from '../components/common/KnowledgeBase';
import { getUsers, createUser, deleteUser, triggerBackup, getAuditTrail, getBranches, updateBranch, getWaTemplates, createWaTemplate, updateWaTemplate, deleteWaTemplate } from '../services/api';
import AnnouncementBanner from '../components/common/AnnouncementBanner';
import MaintenancePanel from '../components/common/MaintenancePanel';
import { ROLES, BRANCHES, ROLE_LABELS } from '../utils/constants';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const TABS = ['User Management', 'Branch Management', 'Knowledge Base', 'WhatsApp Templates', 'Maintenance', 'System Config', 'Database', 'Audit Logs', 'System Health'];
const STAFF_ROLES = ['portfolio_manager', 'service_manager', 'director', 'marketing', 'admin'];

export default function AdminDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('User Management');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUserForm, setShowUserForm] = useState(false);
  const [userForm, setUserForm] = useState({ name: '', email: '', password: '', role: 'portfolio_manager', branch: '' });
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
                          <button className="text-ticano-red hover:text-ticano-red-dark"><Edit2 size={14} /></button>
                          <button onClick={() => handleDeleteUser(u.id)} className="text-ticano-red hover:text-red-700"><Trash2 size={14} /></button>
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
//  Branch Management — list + editable detail modal
// ---------------------------------------------------------------------
function BranchManagementTab() {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);

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
    </div>
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
            <input className={input} value={form.openHours} onChange={(e) => setForm({ ...form, openHours: e.target.value })} placeholder="Mon–Fri 08:00–17:00" />
          </div>
        </div>

        <div>
          <label className={label}>Notes</label>
          <textarea rows={2} className={`${input} resize-none`} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Any extra info about this branch…" />
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
function WaTemplatesTab() {
  const [templates, setTemplates] = React.useState([]);
  const [loading, setLoading]     = React.useState(true);
  const [showForm, setShowForm]   = React.useState(false);
  const [editing, setEditing]     = React.useState(null);
  const [form, setForm]           = React.useState({ name:'', key:'', body:'', variables:[] });

  const load = () => {
    getWaTemplates().then(({data}) => { setTemplates(data); setLoading(false); });
  };
  React.useEffect(load, []);

  const handleSave = async () => {
    if (!form.name || !form.body) return toast.error('Name and message body required');
    try {
      if (editing) {
        await updateWaTemplate(editing.id, form);
        toast.success('Template updated');
      } else {
        await createWaTemplate(form);
        toast.success('Template created');
      }
      setShowForm(false); setEditing(null);
      setForm({ name:'', key:'', body:'', variables:[] });
      load();
    } catch { toast.error('Failed to save template'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this template?')) return;
    await deleteWaTemplate(id);
    toast.success('Template deleted');
    load();
  };

  const startEdit = (t) => {
    setEditing(t);
    setForm({ name: t.name, key: t.key, body: t.body, variables: t.variables||[] });
    setShowForm(true);
  };

  const inp = 'w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-ticano-red';

  if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-ticano-red border-t-transparent rounded-full animate-spin"/></div>;

  return (
    <div className="bg-white dark:bg-ticano-dark-card rounded-2xl shadow p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="font-bold text-ticano-charcoal dark:text-white text-lg">WhatsApp Message Templates</h3>
          <p className="text-xs text-gray-500 mt-0.5">{templates.length} templates · Use [Variable] syntax for dynamic content</p>
        </div>
        <button onClick={()=>{setEditing(null);setForm({name:'',key:'',body:'',variables:[]});setShowForm(!showForm);}}
          className="flex items-center gap-2 px-4 py-2 bg-ticano-red text-white rounded-xl text-sm font-medium hover:bg-ticano-red-dark transition-all duration-200">
          <Plus size={15}/> New Template
        </button>
      </div>

      {showForm && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-5 mb-5 border border-gray-200 dark:border-gray-700 animate-scale-in">
          <h4 className="font-semibold text-gray-800 dark:text-white mb-4">{editing ? 'Edit Template' : 'New Template'}</h4>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Template Name</label><input className={inp} value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="e.g. Birthday Greeting" /></div>
              <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Key (slug)</label><input className={inp} value={form.key} onChange={e=>setForm({...form,key:e.target.value})} placeholder="e.g. birthday_greeting" /></div>
            </div>
            <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Message Body</label>
              <textarea rows={4} className={inp+' resize-none'} value={form.body} onChange={e=>setForm({...form,body:e.target.value})} placeholder="Hi [Name], your complaint [Ticket] has been received…" />
              <p className="text-xs text-gray-400 mt-1">Use [VariableName] for placeholders. e.g. [Name], [Ticket], [Link]</p>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={()=>{setShowForm(false);setEditing(null);}} className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 text-sm">Cancel</button>
              <button onClick={handleSave} className="px-4 py-2 rounded-xl bg-ticano-red text-white text-sm font-semibold hover:bg-ticano-red-dark">Save Template</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {templates.map((t, i) => (
          <div key={t.id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover-lift animate-fade-up group" style={{animationDelay:`${i*0.06}s`}}>
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-semibold text-sm text-gray-900 dark:text-white">{t.name}</p>
                <p className="text-[10px] text-gray-400 font-mono">{t.key}</p>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
