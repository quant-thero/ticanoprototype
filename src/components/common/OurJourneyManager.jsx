import React, { useState, useEffect } from 'react';
import { Clock, Briefcase, Users, Heart, Trophy, Image as ImageIcon, MapPin, Camera, Plus, Trash2, Eye, EyeOff, X, Upload, Edit2 } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getAllJourneyContent, createJourneyContent, updateJourneyContent, deleteJourneyContent, setJourneyContentEnabled,
  getJourneyBranches, updateBranchJourneyInfo, subscribeToTable,
} from '../../services/supabaseApi';
import { useAuth } from '../../context/AuthContext';
import { AnalyticsLauncher, AnalyticsBackBar } from './UI';
import { BRANCHES } from '../../utils/constants';
import TestimonialPhotosManager from './TestimonialPhotosManager';

const SECTIONS = [
  { id: 'timeline', label: 'Story Timeline', desc: 'The vertical milestones timeline', icon: Clock, fields: ['image', 'title', 'meta', 'description'], metaLabel: 'Date (e.g. "2015")' },
  { id: 'project', label: 'Projects Financed', desc: 'Real projects Ticano has funded', icon: Briefcase, fields: ['image', 'title', 'subtitle', 'description', 'meta', 'linkUrl'], subtitleLabel: 'Industry', metaLabel: 'Financing impact' },
  { id: 'team', label: 'Meet Our Management Team', desc: 'Staff photos and bios', icon: Users, fields: ['image', 'title', 'meta', 'subtitle', 'description'], titleLabel: 'Name', metaLabel: 'Position at Ticano (e.g. Portfolio Manager)', subtitleLabel: 'Branch (optional)', descriptionLabel: 'About' },
  { id: 'community', label: 'Community Impact', desc: 'CSR and outreach highlights', icon: Heart, fields: ['image', 'title', 'subtitle', 'description'], subtitleLabel: 'Category' },
  { id: 'milestone', label: 'Awards & Milestones', desc: 'Big numbers and stats', icon: Trophy, fields: ['title', 'description'], titleLabel: 'Big number (e.g. "500+")', descriptionLabel: 'Label (e.g. "Businesses Supported")' },
  { id: 'gallery', label: 'Image Gallery', desc: 'The filterable photo gallery', icon: ImageIcon, fields: ['image', 'subtitle', 'title'], subtitleLabel: 'Category (Projects/Team/Community/Branches/Events)', titleLabel: 'Caption (optional)' },
  { id: 'branch', label: 'Branch Journey', desc: 'Branch photos and history', icon: MapPin, fields: [] },
  { id: 'testimonials', label: 'Testimonials', desc: 'Customer and staff photo stories', icon: Camera, fields: [] },
];

const blank = { title: '', subtitle: '', description: '', meta: '', linkUrl: '', order: 0, enabled: true, imageDataUrl: null, extraImages: [] };

export default function OurJourneyManager() {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState(null);
  const sectionDef = SECTIONS.find((s) => s.id === activeSection);

  return (
    <div className="space-y-6 animate-fade-in">
      {!activeSection ? (
        <AnalyticsLauncher
          views={SECTIONS}
          onSelect={setActiveSection}
          title="Our Journey"
          subtitle="Manage every section of the public 'Our Journey' story page. Pick a section to open it."
        />
      ) : (
        <AnalyticsBackBar view={sectionDef} onBack={() => setActiveSection(null)} backLabel="Our Journey" />
      )}

      {activeSection === 'branch' ? (
        <BranchJourneyPanel />
      ) : activeSection === 'testimonials' ? (
        <TestimonialPhotosManager />
      ) : activeSection ? (
        <GenericSectionPanel sectionDef={sectionDef} user={user} />
      ) : null}
    </div>
  );
}

// Generic panel, handles timeline / project / team / community /
// milestone / gallery, since they all share the same underlying table
// and just show/hide different fields.
function GenericSectionPanel({ sectionDef, user }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(blank);
  const [preview, setPreview] = useState(null);

  const load = () => {
    setLoading(true);
    getAllJourneyContent(sectionDef.id).then(({ data }) => { setItems(data); setLoading(false); }).catch((err) => { console.error('[OurJourneyManager]', err); toast.error('Could not load this section'); setLoading(false); });
  };
  useEffect(load, [sectionDef.id]);
  useEffect(() => {
    const unsubscribe = subscribeToTable('journey_content', {}, load);
    return unsubscribe;
  }, [sectionDef.id]);

  const reset = () => { setForm(blank); setPreview(null); setEditingId(null); setShowForm(false); };
  const startCreate = () => { setForm({ ...blank, order: items.length }); setPreview(null); setEditingId(null); setShowForm(true); };
  const startEdit = (item) => {
    setForm({ title: item.title || '', subtitle: item.subtitle || '', description: item.description || '', meta: item.meta || '', linkUrl: item.linkUrl || '', order: item.order, enabled: item.enabled, imageDataUrl: null, extraImages: item.extraImages || [] });
    setPreview(item.imageUrl || null);
    setEditingId(item.id);
    setShowForm(true);
  };

  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Please choose an image file');
    if (file.size > 5 * 1024 * 1024) return toast.error('Image must be under 5MB');
    const reader = new FileReader();
    reader.onloadend = () => { setForm((f) => ({ ...f, imageDataUrl: reader.result })); setPreview(reader.result); };
    reader.readAsDataURL(file);
  };

  // Album, extra photos on the same entry (e.g. several shots from one
  // community event), shown as a stacked group on the public page and
  // opened together in a lightbox. Each file just appends its data URL;
  // the actual upload happens on save, same as the main photo.
  const onAlbumFiles = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const oversized = files.find((f) => f.size > 5 * 1024 * 1024);
    if (oversized) return toast.error(`"${oversized.name}" is over 5MB`);
    const nonImage = files.find((f) => !f.type.startsWith('image/'));
    if (nonImage) return toast.error(`"${nonImage.name}" isn't an image`);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => setForm((f) => ({ ...f, extraImages: [...f.extraImages, reader.result] }));
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };
  const removeAlbumImage = (idx) => setForm((f) => ({ ...f, extraImages: f.extraImages.filter((_, i) => i !== idx) }));

  const save = async () => {
    if (sectionDef.fields.includes('image') && !preview && !editingId) return toast.error('Please choose an image');
    if (!form.title?.trim() && sectionDef.id !== 'gallery') return toast.error(`${sectionDef.titleLabel || 'Title'} is required`);
    setSaving(true);
    try {
      const payload = { ...form, section: sectionDef.id, actor: user?.name };
      if (editingId) await updateJourneyContent(editingId, payload);
      else await createJourneyContent(payload);
      toast.success(editingId ? 'Updated' : 'Added');
      reset(); load();
    } catch (err) {
      toast.error(err?.message || 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  const toggle = (item) => setJourneyContentEnabled(item.id, !item.enabled).then(() => { toast.success(!item.enabled ? 'Shown' : 'Hidden'); load(); }).catch(() => toast.error('Could not update'));
  const remove = (id) => { if (!window.confirm('Remove this item?')) return; deleteJourneyContent(id).then(() => { toast.success('Removed'); load(); }).catch(() => toast.error('Could not remove')); };

  const inp = 'w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-ticano-red';

  if (loading) return <div className="flex justify-center py-10"><div className="w-8 h-8 border-2 border-gray-200 border-t-ticano-red rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={startCreate} className="flex items-center gap-2 px-4 py-2 bg-ticano-red text-white rounded-xl text-sm font-semibold hover:bg-ticano-red-dark"><Plus size={15} /> Add {sectionDef.label.replace(/s$/, '')}</button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-ticano-dark-card rounded-2xl border border-gray-100 dark:border-gray-700 p-5 space-y-3 animate-scale-in">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-gray-800 dark:text-white">{editingId ? 'Edit' : 'New'} {sectionDef.label.replace(/s$/, '')}</h4>
            <button onClick={reset} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
          </div>

          {sectionDef.fields.includes('image') && (
            <label className="block">
              <div className="border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-xl p-4 text-center cursor-pointer hover:border-ticano-red transition-colors">
                {preview ? <img src={preview} alt="Preview" className="w-32 h-32 object-cover rounded-xl mx-auto" /> : (
                  <div className="py-3 text-gray-400"><Upload size={22} className="mx-auto mb-1.5" /><p className="text-xs">Click to choose a photo</p></div>
                )}
              </div>
              <input type="file" accept="image/*" onChange={onFile} className="hidden" />
            </label>
          )}

          {sectionDef.fields.includes('image') && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1.5">Album, extra photos for this entry (optional)</p>
              <div className="flex flex-wrap gap-2">
                {form.extraImages.map((src, i) => (
                  <div key={i} className="relative w-16 h-16 shrink-0">
                    <img src={src} alt="" className="w-16 h-16 object-cover rounded-lg" />
                    <button type="button" onClick={() => removeAlbumImage(i)} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center shadow"><X size={11} /></button>
                  </div>
                ))}
                <label className="w-16 h-16 shrink-0 border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-lg flex items-center justify-center cursor-pointer hover:border-ticano-red text-gray-400 hover:text-ticano-red transition-colors">
                  <Plus size={18} />
                  <input type="file" accept="image/*" multiple onChange={onAlbumFiles} className="hidden" />
                </label>
              </div>
              {form.extraImages.length > 0 && <p className="text-[11px] text-gray-400 mt-1.5">Shown stacked with the main photo, click to open all {form.extraImages.length + 1} in a viewer.</p>}
            </div>
          )}

          {(sectionDef.fields.includes('title')) && (
            <input className={inp} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={sectionDef.titleLabel || 'Title'} />
          )}
          {sectionDef.fields.includes('subtitle') && (
            sectionDef.id === 'team' ? (
              <select className={inp} value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })}>
                <option value="">Branch (optional)</option>
                {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            ) : (
              <input className={inp} value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} placeholder={sectionDef.subtitleLabel || 'Subtitle'} />
            )
          )}
          {sectionDef.fields.includes('meta') && (
            <input className={inp} value={form.meta} onChange={(e) => setForm({ ...form, meta: e.target.value })} placeholder={sectionDef.metaLabel || 'Additional detail'} />
          )}
          {sectionDef.fields.includes('description') && (
            <textarea rows={3} className={inp + ' resize-none'} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder={sectionDef.descriptionLabel || 'Description'} />
          )}
          {sectionDef.fields.includes('linkUrl') && (
            <input className={inp} value={form.linkUrl} onChange={(e) => setForm({ ...form, linkUrl: e.target.value })} placeholder="Read full story link (optional)" />
          )}
          <div className="flex items-center gap-3">
            <label className="text-xs text-gray-500">Display order:</label>
            <input type="number" className={inp + ' w-24'} value={form.order} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={reset} className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300">Cancel</button>
            <button onClick={save} disabled={saving} className="px-4 py-2 rounded-xl bg-ticano-red text-white text-sm font-semibold hover:bg-ticano-red-dark disabled:opacity-60">{saving ? 'Saving…' : editingId ? 'Save changes' : 'Add'}</button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-10 text-center text-sm text-gray-400">Nothing here yet, add the first one above.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <div key={item.id} className={`bg-white dark:bg-ticano-dark-card rounded-xl border overflow-hidden ${item.enabled ? 'border-gray-100 dark:border-gray-700' : 'border-dashed border-gray-300 dark:border-gray-600 opacity-60'}`}>
              {item.imageUrl && <img src={item.imageUrl} alt={item.title} className="w-full h-32 object-cover" />}
              <div className="p-3">
                <p className="font-semibold text-sm text-gray-800 dark:text-white truncate">{item.title || item.subtitle || '-'}</p>
                {item.subtitle && item.title && <p className="text-xs text-gray-400 truncate">{item.subtitle}</p>}
                {item.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{item.description}</p>}
                <div className="flex items-center gap-1 mt-2">
                  <span className="text-[10px] text-gray-400 mr-auto">#{item.order}</span>
                  <button onClick={() => startEdit(item)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"><Edit2 size={13} /></button>
                  <button onClick={() => toggle(item)} className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg">{item.enabled ? <EyeOff size={13} /> : <Eye size={13} />}</button>
                  <button onClick={() => remove(item.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Trash2 size={13} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BranchJourneyPanel() {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ openingYear: '', description: '', imageDataUrl: null });
  const [preview, setPreview] = useState(null);

  const load = () => { getJourneyBranches().then(({ data }) => { setBranches(data); setLoading(false); }).catch(() => setLoading(false)); };
  useEffect(load, []);

  const startEdit = (b) => {
    setForm({ openingYear: b.openingYear || '', description: b.description || '', imageDataUrl: null });
    setPreview(b.photoUrl || null);
    setEditingId(b.id);
  };
  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => { setForm((f) => ({ ...f, imageDataUrl: reader.result })); setPreview(reader.result); };
    reader.readAsDataURL(file);
  };
  const save = async () => {
    setSaving(true);
    try {
      await updateBranchJourneyInfo(editingId, form);
      toast.success('Branch journey info updated');
      setEditingId(null); load();
    } catch (err) {
      toast.error(err?.message || 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  const inp = 'w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-ticano-red';

  if (loading) return <div className="flex justify-center py-10"><div className="w-8 h-8 border-2 border-gray-200 border-t-ticano-red rounded-full animate-spin" /></div>;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {branches.map((b) => (
        <div key={b.id} className="bg-white dark:bg-ticano-dark-card rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          {editingId === b.id ? (
            <div className="p-4 space-y-2.5">
              <label className="block">
                <div className="border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-xl p-3 text-center cursor-pointer hover:border-ticano-red transition-colors">
                  {preview ? <img src={preview} alt={b.name} className="w-full h-24 object-cover rounded-lg" /> : <div className="py-2 text-gray-400 text-xs"><Upload size={16} className="mx-auto mb-1" />Branch photo</div>}
                </div>
                <input type="file" accept="image/*" onChange={onFile} className="hidden" />
              </label>
              <input className={inp} value={form.openingYear} onChange={(e) => setForm({ ...form, openingYear: e.target.value })} placeholder="Opening year" />
              <textarea rows={2} className={inp + ' resize-none'} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Short description" />
              <div className="flex gap-2">
                <button onClick={() => setEditingId(null)} className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-xs text-gray-600 dark:text-gray-300">Cancel</button>
                <button onClick={save} disabled={saving} className="flex-1 px-3 py-1.5 rounded-lg bg-ticano-red text-white text-xs font-semibold disabled:opacity-60">{saving ? 'Saving…' : 'Save'}</button>
              </div>
            </div>
          ) : (
            <>
              {b.photoUrl && <img src={b.photoUrl} alt={b.name} className="w-full h-32 object-cover" />}
              <div className="p-4">
                <p className="font-semibold text-sm text-gray-800 dark:text-white">{b.name}</p>
                <p className="text-xs text-gray-400">{b.openingYear ? `Opened ${b.openingYear}` : 'Opening year not set'}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{b.description || 'No description yet'}</p>
                <button onClick={() => startEdit(b)} className="mt-2 flex items-center gap-1 text-xs text-ticano-red hover:text-ticano-red-dark font-semibold"><Edit2 size={12} /> Edit</button>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
