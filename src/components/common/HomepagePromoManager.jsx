import React, { useState, useEffect } from 'react';
import { Megaphone, Save, Monitor, Square, ArrowRight, X, Upload, Trash2, Plus, Edit2, Copy, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import {
  getHomepagePromos, createHomepagePromo, updateHomepagePromo,
  publishHomepagePromo, unpublishHomepagePromo, deleteHomepagePromo, duplicateHomepagePromo,
} from '../../services/supabaseApi';
import { useAuth } from '../../context/AuthContext';
import { Modal, EmptyState } from './UI';
import TestimonialsManager from './TestimonialsManager';
import toast from 'react-hot-toast';

const THEMES = [
  { key: 'red', label: 'Ticano Red', cls: 'bg-ticano-red text-white' },
  { key: 'charcoal', label: 'Charcoal', cls: 'bg-ticano-charcoal text-white' },
  { key: 'light', label: 'Light', cls: 'bg-amber-50 text-ticano-charcoal border border-amber-200' },
];

const BLANK = { mode: 'banner', title: '', message: '', ctaLabel: '', ctaLink: '', theme: 'red', image: null };

export default function HomepagePromoManager({ pendingReviewsCount = 0 }) {
  const { user } = useAuth();
  const [section, setSection] = useState('promos'); // 'promos' | 'reviews'
  const [promos, setPromos] = useState(null);
  const [editing, setEditing] = useState(null); // null = list view; object = editor view
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [loadError, setLoadError] = useState(null);

  const reload = () => {
    setLoadError(null);
    getHomepagePromos().then(({ data }) => setPromos(data)).catch((err) => setLoadError(err.message || 'Failed to load'));
  };
  useEffect(() => { reload(); }, []);

  const startCreate = () => setEditing({ ...BLANK });
  const startEdit = (promo) => setEditing({ ...promo });

  const handlePublish = async (promo) => {
    await publishHomepagePromo(promo.id, user?.name || 'Marketing');
    toast.success(`"${promo.title || 'Promotion'}" is now live on the homepage`);
    reload();
  };
  const handleUnpublish = async (promo) => {
    await unpublishHomepagePromo(promo.id, user?.name || 'Marketing');
    toast.success('Removed from the homepage');
    reload();
  };
  const handleDuplicate = async (promo) => {
    await duplicateHomepagePromo(promo.id, user?.name || 'Marketing');
    toast.success('Duplicated as a new draft');
    reload();
  };
  const confirmDelete = async () => {
    await deleteHomepagePromo(deleteTarget.id, user?.name || 'Marketing');
    toast.success('Promotion deleted');
    setDeleteTarget(null);
    reload();
  };

  if (loadError) {
    return (
      <div className="text-center py-10">
        <p className="text-sm font-semibold text-red-600 mb-1">Couldn't load promotions</p>
        <p className="text-xs text-gray-500 mb-4">{loadError}</p>
        <button onClick={reload} className="px-4 py-2 text-sm rounded-lg bg-ticano-red text-white hover:bg-ticano-red-dark">Retry</button>
      </div>
    );
  }

  if (promos === null) {
    return <div className="flex justify-center py-10"><div className="w-8 h-8 border-2 border-gray-200 border-t-ticano-red rounded-full animate-spin" /></div>;
  }

  if (editing) {
    return <PromoEditor promo={editing} onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />;
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setSection('promos')}
          className={`text-left p-4 rounded-2xl border transition-colors ${section === 'promos' ? 'border-ticano-red bg-red-50 dark:bg-red-900/10' : 'border-gray-100 dark:border-gray-700 bg-white dark:bg-ticano-dark-card hover:bg-gray-50 dark:hover:bg-gray-800'}`}
        >
          <Megaphone size={18} className={section === 'promos' ? 'text-ticano-red' : 'text-gray-400'} />
          <p className="font-semibold text-sm text-ticano-charcoal dark:text-white mt-2">Promotions</p>
          <p className="text-xs text-gray-500 mt-0.5">Homepage banners and pop-ups</p>
        </button>
        <button
          onClick={() => setSection('reviews')}
          className={`text-left p-4 rounded-2xl border transition-colors ${section === 'reviews' ? 'border-ticano-red bg-red-50 dark:bg-red-900/10' : 'border-gray-100 dark:border-gray-700 bg-white dark:bg-ticano-dark-card hover:bg-gray-50 dark:hover:bg-gray-800'}`}
        >
          <Eye size={18} className={section === 'reviews' ? 'text-ticano-red' : 'text-gray-400'} />
          <p className="font-semibold text-sm text-ticano-charcoal dark:text-white mt-2 flex items-center gap-1.5">
            Reviews
            {Boolean(pendingReviewsCount) && (
              <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-ticano-red text-white text-[10px] font-bold">{pendingReviewsCount > 9 ? '9+' : pendingReviewsCount}</span>
            )}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">5-star reviews shown on the homepage</p>
        </button>
      </div>

      {section === 'reviews' ? <TestimonialsManager /> : (
      <>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-bold text-ticano-charcoal dark:text-white flex items-center gap-2"><Megaphone size={18} /> Homepage Promotions</h3>
          <p className="text-sm text-gray-500 mt-0.5">Manage the banners and pop-ups shown on the public homepage. Only one can be live at a time.</p>
        </div>
        <button onClick={startCreate} className="flex items-center gap-2 px-4 py-2.5 bg-ticano-red text-white rounded-xl text-sm font-semibold hover:bg-ticano-red-dark transition-colors">
          <Plus size={15} /> New promotion
        </button>
      </div>

      {promos.length === 0 ? (
        <EmptyState title="No promotions yet" message="Create one to publish a banner or pop-up to the homepage." icon={Megaphone}
          action={<button onClick={startCreate} className="text-sm font-semibold text-ticano-red hover:underline">Create your first promotion</button>} />
      ) : (
        <div className="space-y-2.5">
          {promos.map((p) => (
            <div key={p.id} className="bg-white dark:bg-ticano-dark-card rounded-2xl border border-gray-100 dark:border-gray-700 p-4 flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                {p.image ? <img src={p.image} alt="" className="w-full h-full object-cover" /> : <Megaphone size={18} className="text-gray-300" />}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-sm text-ticano-charcoal dark:text-white truncate">{p.title || '(untitled)'}</p>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${p.enabled ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
                    {p.enabled ? 'Live' : 'Draft'}
                  </span>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-50 dark:bg-gray-800 text-gray-400 capitalize">{p.mode}</span>
                </div>
                <p className="text-xs text-gray-500 truncate mt-0.5">{p.message || 'No message set'}</p>
                <p className="text-[11px] text-gray-400 mt-1">Updated {new Date(p.updatedAt).toLocaleDateString('en-GB')} by {p.updatedBy}</p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {p.enabled ? (
                  <button onClick={() => handleUnpublish(p)} title="Take this off the homepage" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400"><EyeOff size={14} /> Unpublish</button>
                ) : (
                  <button onClick={() => handlePublish(p)} title="Make this live on the homepage" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-green-600 hover:bg-green-700"><Eye size={14} /> Publish</button>
                )}
                <button onClick={() => startEdit(p)} title="Edit" className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"><Edit2 size={15} /></button>
                <button onClick={() => handleDuplicate(p)} title="Duplicate" className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"><Copy size={15} /></button>
                <button onClick={() => setDeleteTarget(p)} title="Delete" className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete promotion?">
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Delete "{deleteTarget?.title || '(untitled)'}" permanently? This can't be undone.
          </p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">Cancel</button>
            <button onClick={confirmDelete} className="px-4 py-2 text-sm rounded-xl bg-red-600 text-white hover:bg-red-700">Delete</button>
          </div>
        </div>
      </Modal>
      </>
      )}
    </div>
  );
}

function PromoEditor({ promo, onCancel, onSaved }) {
  const { user } = useAuth();
  const [p, setP] = useState(promo);
  const [saving, setSaving] = useState(false);
  const isNew = !promo.id;

  const set = (patch) => setP((prev) => ({ ...prev, ...patch }));

  const onImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Please choose an image file');
    if (file.size > 3 * 1024 * 1024) return toast.error('Image must be under 3MB');
    const reader = new FileReader();
    reader.onload = () => set({ image: reader.result });
    reader.readAsDataURL(file);
  };
  const removeImage = () => set({ image: null });

  const save = async (publishAfterSave = false) => {
    if (!p.image && (!p.title.trim() || !p.message.trim())) return toast.error('Add a title and message, or upload a flyer image');
    setSaving(true);
    try {
      let savedId = p.id;
      if (isNew) {
        const { data } = await createHomepagePromo(p, user?.name || 'Marketing');
        savedId = data.promo.id;
        toast.success('Promotion created as a draft');
      } else {
        await updateHomepagePromo(p.id, p, user?.name || 'Marketing');
        toast.success('Promotion updated');
      }
      if (publishAfterSave) {
        await publishHomepagePromo(savedId, user?.name || 'Marketing');
        toast.success('Published, now live on the homepage');
      }
      onSaved();
    } catch (err) {
      toast.error(err.message || 'Could not save promotion');
    } finally {
      setSaving(false);
    }
  };

  const inp = 'w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-ticano-red';
  const themeCls = (THEMES.find((t) => t.key === p.theme) || THEMES[0]).cls;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={onCancel} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"><ArrowLeft size={16} /></button>
        <div>
          <h3 className="text-lg font-bold text-ticano-charcoal dark:text-white">{isNew ? 'New promotion' : 'Edit promotion'}</h3>
          <p className="text-sm text-gray-500">{isNew ? 'Save as a draft, or save and publish it live in one step.' : (p.enabled ? 'This promotion is currently live on the homepage.' : 'Still a draft, not visible on the homepage yet.')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white dark:bg-ticano-dark-card rounded-2xl border border-gray-100 dark:border-gray-700 p-5 space-y-3">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Display as</p>
            <div className="flex gap-2">
              <button onClick={() => set({ mode: 'banner' })} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm border ${p.mode === 'banner' ? 'bg-ticano-red text-white border-ticano-red' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300'}`}><Monitor size={14} /> Top banner</button>
              <button onClick={() => set({ mode: 'popup' })} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm border ${p.mode === 'popup' ? 'bg-ticano-red text-white border-ticano-red' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300'}`}><Square size={14} /> Pop-up</button>
              <button onClick={() => set({ mode: 'none' })} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm border ${p.mode === 'none' ? 'bg-ticano-red text-white border-ticano-red' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300'}`}><EyeOff size={14} /> None (flyer only)</button>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Flyer / picture (optional)</p>
            {p.image ? (
              <div className="relative w-full max-w-xs">
                <img src={p.image} alt="Promo flyer" className="w-full rounded-xl border border-gray-200 dark:border-gray-600 object-cover max-h-48" />
                <button onClick={removeImage} title="Remove image" className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-lg hover:bg-black/80"><Trash2 size={13} /></button>
              </div>
            ) : (
              <label className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-500 dark:text-gray-400 cursor-pointer hover:border-ticano-red hover:text-ticano-red transition-colors w-fit">
                <Upload size={15} /> Upload a photo or flyer
                <input type="file" accept="image/*" onChange={onImageChange} className="hidden" />
              </label>
            )}
            <p className="text-[11px] text-gray-400 mt-1">You can upload a ready-made flyer (e.g. a pop-up poster) instead of, or alongside, the title and message below.</p>
          </div>
          <div><label className="text-xs text-gray-500 mb-1 block">Title</label><input className={inp} value={p.title} onChange={(e) => set({ title: e.target.value })} placeholder="Promotion title" /></div>
          <div><label className="text-xs text-gray-500 mb-1 block">Message</label><textarea rows={3} className={inp + ' resize-none'} value={p.message} onChange={(e) => set({ message: e.target.value })} placeholder="Promotion message" /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="text-xs text-gray-500 mb-1 block">Button label</label><input className={inp} value={p.ctaLabel} onChange={(e) => set({ ctaLabel: e.target.value })} placeholder="Apply now" /></div>
            <div><label className="text-xs text-gray-500 mb-1 block">Button link</label><input className={inp} value={p.ctaLink} onChange={(e) => set({ ctaLink: e.target.value })} placeholder="/register or https://…" /></div>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Theme {p.mode === 'popup' && <span className="normal-case text-gray-400">(banner only)</span>}</p>
            <div className="flex gap-2">
              {THEMES.map((t) => (
                <button key={t.key} onClick={() => set({ theme: t.key })} className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${p.theme === t.key ? 'border-ticano-red ring-2 ring-ticano-red/30' : 'border-gray-200 dark:border-gray-600'} ${t.cls}`}>{t.label}</button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between pt-1">
            <button onClick={onCancel} className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">Cancel</button>
            <div className="flex items-center gap-2">
              <button onClick={() => save(false)} disabled={saving} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-60"><Save size={14} /> Save as draft</button>
              <button onClick={() => save(true)} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 disabled:opacity-60"><Eye size={14} /> {p.enabled ? 'Save (already live)' : 'Save & Publish'}</button>
            </div>
          </div>
        </div>

        {/* Live preview */}
        <div className="bg-white dark:bg-ticano-dark-card rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Preview {!p.enabled && <span className="normal-case text-amber-600">· not published</span>}</p>
          {p.mode === 'banner' ? (
            <div className={`rounded-xl px-4 py-2.5 flex items-center justify-center gap-3 text-center text-sm ${themeCls}`}>
              {p.image && <img src={p.image} alt="" className="w-7 h-7 rounded object-cover shrink-0" />}
              <span className="font-semibold">{p.title}</span>
              <span className="hidden sm:inline opacity-90">{p.message}</span>
              {p.ctaLabel && <span className="shrink-0 px-3 py-1 rounded-lg bg-white/20 font-semibold">{p.ctaLabel}</span>}
              <X size={14} className="opacity-70" />
            </div>
          ) : p.mode === 'none' ? (
            <div className="border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden max-w-sm mx-auto">
              {p.image ? (
                <img src={p.image} alt="Flyer" className="w-full max-h-64 object-cover" />
              ) : (
                <div className="p-10 text-center text-gray-400"><Megaphone size={22} className="mx-auto mb-2" /> Upload a flyer to store it here</div>
              )}
              {(p.title || p.message) && (
                <div className="p-4 text-center border-t border-gray-100 dark:border-gray-700">
                  {p.title && <h3 className="text-sm font-bold text-ticano-charcoal dark:text-white">{p.title}</h3>}
                  {p.message && <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">{p.message}</p>}
                </div>
              )}
            </div>
          ) : (
            <div className="border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden max-w-sm mx-auto">
              {p.image ? (
                <img src={p.image} alt="Promo flyer" className="w-full max-h-64 object-cover" />
              ) : <div className="bg-ticano-red h-2" />}
              <div className="p-6 text-center">
                {!p.image && <div className="w-12 h-12 rounded-2xl bg-ticano-red/10 text-ticano-red flex items-center justify-center mx-auto mb-3"><Megaphone size={22} /></div>}
                {p.title && <h3 className="text-xl font-bold text-ticano-charcoal dark:text-white mb-2">{p.title}</h3>}
                {p.message && <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-5">{p.message}</p>}
                {p.ctaLabel && <span className="inline-flex items-center gap-2 px-6 py-3 bg-ticano-red text-white rounded-xl font-bold">{p.ctaLabel} <ArrowRight size={16} /></span>}
              </div>
            </div>
          )}
          <p className="text-[11px] text-gray-400 mt-3">{p.mode === 'banner' ? 'Shown as a dismissible strip at the very top of the homepage.' : p.mode === 'none' ? "Stored here, but won't automatically appear on the homepage as a banner or pop-up, useful for keeping a flyer on file to link to elsewhere." : 'Shown as a pop-up shortly after the homepage loads. Visitors can dismiss it.'}</p>
        </div>
      </div>
    </div>
  );
}
