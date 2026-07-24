import React, { useState, useEffect } from 'react';
import { Cake, MessageCircle, Mail, Check, Send, Gift } from 'lucide-react';
import { getBirthdayPrefs, saveBirthdayPrefs, simulateBirthdaySend } from '../../services/supabaseApi';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function BirthdayPreferences() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState({ enabled: false, channel: 'whatsapp', birthdayDate: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [simulated, setSimulated] = useState(null);

  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    getBirthdayPrefs(user.id)
      .then(({ data }) => { setPrefs(data); setLoading(false); })
      .catch((err) => { console.error('[BirthdayPreferences]', err); toast.error('Could not load birthday preferences'); setLoading(false); });
  }, [user?.id]);

  const save = async () => {
    setSaving(true);
    try {
      await saveBirthdayPrefs(user?.id, prefs);
      toast.success('Birthday preferences saved');
    } catch (err) {
      console.error('[BirthdayPreferences] save failed:', err);
      toast.error(err?.message || 'Could not save birthday preferences');
    } finally {
      setSaving(false);
    }
  };

  const simulate = async () => {
    const { data } = await simulateBirthdaySend(user?.id);
    if (data.preview) {
      setSimulated(data);
      toast.success(`Preview ready, this is what would be sent via ${data.channel}`);
    } else {
      toast.error(data.reason || 'Enable birthday messages first');
    }
  };

  if (loading) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-4 bg-pink-50 dark:bg-pink-900/20 rounded-2xl border border-pink-200 dark:border-pink-800">
        <Cake size={22} className="text-pink-500 shrink-0" />
        <div className="flex-1">
          <p className="font-semibold text-gray-800 dark:text-white text-sm">Birthday Greetings</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Opt in to receive a personalised birthday message from your Portfolio Manager on your birthday.
          </p>
        </div>
        {/* Toggle */}
        <div
          className={`w-12 h-6 rounded-full transition-colors duration-200 relative cursor-pointer shrink-0 ${prefs.enabled ? 'bg-pink-500' : 'bg-gray-200 dark:bg-gray-600'}`}
          onClick={() => setPrefs(p => ({ ...p, enabled: !p.enabled }))}>
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${prefs.enabled ? 'translate-x-6' : ''}`} />
        </div>
      </div>

      {prefs.enabled && (
        <div className="space-y-4 animate-fade-up">
          {/* Birthday date */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1">
              <Gift size={11}/> Your Birthday
            </label>
            <input type="date" value={prefs.birthdayDate} onChange={e => setPrefs(p => ({...p, birthdayDate: e.target.value}))}
              className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-400 transition-all" />
            <p className="text-xs text-gray-400 mt-1">The year is not used, only the day and month matter.</p>
          </div>

          {/* Channel preference */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Send via</label>
            <div className="flex gap-3">
              {[
                ['whatsapp', MessageCircle, 'WhatsApp', 'green'],
                ['email', Mail, 'Email', 'blue'],
                ['both', Check, 'Both', 'purple'],
              ].map(([val, Icon, label, color]) => (
                <button key={val} onClick={() => setPrefs(p => ({...p, channel: val}))}
                  className={`flex-1 flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-150 ${
                    prefs.channel === val
                      ? `border-${color === 'green' ? 'green' : color === 'blue' ? 'blue' : 'purple'}-400 bg-${color === 'green' ? 'green' : color === 'blue' ? 'blue' : 'purple'}-50 dark:bg-${color === 'green' ? 'green' : color === 'blue' ? 'blue' : 'purple'}-900/20`
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                  }`}>
                  <Icon size={16} className={prefs.channel === val ? 'text-pink-500' : 'text-gray-400'} />
                  <span className={`text-xs font-medium ${prefs.channel === val ? 'text-gray-800 dark:text-white' : 'text-gray-400'}`}>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Message Preview</p>
            <div className="bg-white dark:bg-gray-700 rounded-xl p-3 border border-gray-100 dark:border-gray-600">
              <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
                Happy Birthday, <strong>{user?.name?.split(' ')[0]}!</strong> From your Portfolio Manager and the whole Ticano team. No one should be small forever, here's to another great year! <span className="text-ticano-red">ticanogroup.co.bw</span>
              </p>
            </div>
            <p className="text-xs text-gray-400 mt-2">This message is sent automatically on your birthday via {prefs.channel === 'both' ? 'WhatsApp and Email' : prefs.channel}.</p>
          </div>

          {/* Simulate */}
          <button onClick={simulate}
            className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-pink-300 dark:border-pink-700 text-pink-500 rounded-xl text-sm font-medium hover:bg-pink-50 dark:hover:bg-pink-900/20 transition-colors">
            <Send size={13}/> Preview birthday message now
          </button>

          {simulated && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800 animate-fade-up">
              <p className="text-xs font-semibold text-green-600 dark:text-green-400 flex items-center gap-1 mb-2"><Check size={12}/>Message would be sent via {simulated.channel}</p>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">"{simulated.message}"</p>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end">
        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-ticano-charcoal text-white rounded-xl text-sm font-semibold hover:bg-black transition-colors disabled:opacity-60">
          {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <Check size={14}/>}
          Save Preferences
        </button>
      </div>
    </div>
  );
}
