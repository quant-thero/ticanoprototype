import React, { useState, useEffect } from 'react';
import { Image as ImageIcon, Plus, Trash2, Eye, EyeOff, X, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { getAllTestimonialPhotos, createTestimonialPhoto, setTestimonialPhotoEnabled, deleteTestimonialPhoto, subscribeToTable } from '../../services/supabaseApi';
import { useAuth } from '../../context/AuthContext';

export default function TestimonialPhotosManager() {
  const { user } = useAuth();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', roleLabel: '', caption: '', imageDataUrl: null });
  const [preview, setPreview] = useState(null);

  const load = () => {
    getAllTestimonialPhotos().then(({ data }) => { setList(data); setLoading(false); }).catch((err) => { console.error('[TestimonialPhotosManager]', err); toast.error('Could not load testimonial photos'); setLoading(false); });
  };
  useEffect(load, []);

  useEffect(() => {
    const unsubscribe = subscribeToTable('testimonial_photos', {}, load);
    return unsubscribe;
  }, []);

  const reset = () => { setForm({ name: '', roleLabel: '', caption: '', imageDataUrl: null }); setPreview(null); setShowForm(false); };

  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Please choose an image file');
    if (file.size > 5 * 1024 * 1024) return toast.error('Image must be under 5MB');
    const reader = new FileReader();
    reader.onloadend = () => { setForm((f) => ({ ...f, imageDataUrl: reader.result })); setPreview(reader.result); };
    reader.readAsDataURL(file);
  };

  const save = async () => {
    if (!form.imageDataUrl) return toast.error('Please choose a photo');
    setSaving(true);
    try {
      await createTestimonialPhoto({ ...form, uploadedBy: user?.name || 'Marketing' });
      toast.success('Testimonial photo added');
      reset(); load();
    } catch (err) {
      toast.error(err?.message || 'Could not add this testimonial photo');
    } finally {
      setSaving(false);
    }
  };

  const toggle = (p) => { setTestimonialPhotoEnabled(p.id, !p.enabled).then(() => { toast.success(!p.enabled ? 'Shown on homepage' : 'Hidden from homepage'); load(); }).catch(() => toast.error('Could not update')); };
  const remove = (id) => { if (!window.confirm('Remove this testimonial photo?')) return; deleteTestimonialPhoto(id).then(() => { toast.success('Removed'); load(); }).catch(() => toast.error('Could not remove')); };

  const inp = 'w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-ticano-red';

  if (loading) return <div className="flex justify-center py-10"><div className="w-8 h-8 border-2 border-gray-200 border-t-ticano-red rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-bold text-ticano-charcoal dark:text-white flex items-center gap-2"><ImageIcon size={18} /> Testimonials</h3>
          <p className="text-sm text-gray-500 mt-0.5">Photos of customers and employees sharing their Ticano journey, shown in their own sliding carousel on the homepage.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-ticano-red text-white rounded-xl text-sm font-semibold hover:bg-ticano-red-dark transition-colors"><Plus size={15} /> Add Testimonial</button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-ticano-dark-card rounded-2xl border border-gray-100 dark:border-gray-700 p-5 animate-scale-in space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-gray-800 dark:text-white">New testimonial photo</h4>
            <button onClick={reset} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
          </div>

          <label className="block">
            <div className="border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-xl p-4 text-center cursor-pointer hover:border-ticano-red transition-colors">
              {preview ? (
                <img src={preview} alt="Preview" className="w-32 h-32 object-cover rounded-xl mx-auto" />
              ) : (
                <div className="py-4 text-gray-400"><Upload size={24} className="mx-auto mb-2" /><p className="text-xs">Click to choose a photo (under 5MB)</p></div>
              )}
            </div>
            <input type="file" accept="image/*" onChange={onFile} className="hidden" />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input className={inp} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name (optional, leave blank if it's on the photo)" />
            <input className={inp} value={form.roleLabel} onChange={(e) => setForm({ ...form, roleLabel: e.target.value })} placeholder="e.g. Client since 2022 (optional)" />
          </div>
          <textarea rows={3} className={inp + ' resize-none'} value={form.caption} onChange={(e) => setForm({ ...form, caption: e.target.value })} placeholder="Their story or a short quote (optional)…" />

          <div className="flex justify-end gap-2">
            <button onClick={reset} className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300">Cancel</button>
            <button onClick={save} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-ticano-red text-white text-sm font-semibold hover:bg-ticano-red-dark disabled:opacity-60">{saving ? 'Uploading…' : 'Add Testimonial'}</button>
          </div>
        </div>
      )}

      {list.length === 0 ? (
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-10 text-center text-sm text-gray-400">No testimonial photos yet, add the first one above.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {list.map((p) => (
            <div key={p.id} className={`bg-white dark:bg-ticano-dark-card rounded-xl border overflow-hidden ${p.enabled ? 'border-gray-100 dark:border-gray-700' : 'border-dashed border-gray-300 dark:border-gray-600 opacity-60'}`}>
              <img src={p.imageUrl} alt={p.name} className="w-full h-36 object-cover" />
              <div className="p-3">
                <p className="font-semibold text-sm text-gray-800 dark:text-white truncate">{p.name || <span className="italic text-gray-400 font-normal">Text on photo</span>}</p>
                {p.roleLabel && <p className="text-xs text-gray-400 truncate">{p.roleLabel}</p>}
                <div className="flex items-center gap-1 mt-2">
                  <button onClick={() => toggle(p)} title={p.enabled ? 'Hide' : 'Show'} className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg">{p.enabled ? <EyeOff size={13} /> : <Eye size={13} />}</button>
                  <button onClick={() => remove(p.id)} title="Remove" className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Trash2 size={13} /></button>
                  {p.enabled && <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold">Live</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
