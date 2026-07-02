import React, { useState, useRef, useEffect } from 'react';
import DocumentUpload from './DocumentUpload';
import { Send, Lock, Info, Mic, MicOff } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  JOURNEY_STAGES, COMPLAINT_CATEGORIES, CATEGORY_HINTS,
  COMPLAINT_SEVERITY, COMPLAINT_PRIORITY,
} from '../../utils/constants';

/**
 * Customer-facing complaint submission form.
 *
 * Implements:
 *   §1  — sets status to 'created'
 *   §2  — anonymous toggle (strict privacy)
 *   §14 — severity AND priority captured independently
 *   §18 — no document upload field
 */
export default function ComplaintForm({ onSubmit, clientType = 'existing', defaultBranch = 'Gaborone' }) {
  const [form, setForm] = useState({
    journeyStage: 'before_applying',
    category: COMPLAINT_CATEGORIES.before_applying[0],
    severity: 'moderate',
    priority: 'medium',
    description: '',
    anonymous: false,
  });
  const [submitting, setSubmitting] = useState(false);

  // ---- Voice dictation (Web Speech API) ----
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const recognitionRef = useRef(null);
  const baseTextRef = useRef('');

  // ---- Voice audio recording (MediaRecorder) ----
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);   // object URL for local preview
  const [audioData, setAudioData] = useState(null); // base64 data URL persisted with the complaint
  const [recError, setRecError] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const mediaRecRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);

  const startRecording = async () => {
    setRecError('');
    if (!navigator.mediaDevices || typeof MediaRecorder === 'undefined') {
      setRecError('Audio recording isn’t supported in this browser. Try Chrome or Edge.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const rec = new MediaRecorder(stream);
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' });
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl(URL.createObjectURL(blob));
        const reader = new FileReader();
        reader.onloadend = () => setAudioData(reader.result); // base64 data URL
        reader.readAsDataURL(blob);
        stream.getTracks().forEach((t) => t.stop());
      };
      rec.start();
      mediaRecRef.current = rec;
      setRecording(true);
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } catch {
      setRecError('Microphone access was denied. Please allow microphone permission to record.');
    }
  };

  const stopRecording = () => {
    try { mediaRecRef.current?.stop(); } catch {}
    clearInterval(timerRef.current);
    setRecording(false);
  };

  const reRecord = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null); setAudioData(null); setElapsed(0); setRecError('');
  };

  useEffect(() => () => {
    clearInterval(timerRef.current);
    try { streamRef.current?.getTracks().forEach((t) => t.stop()); } catch {}
    if (audioUrl) URL.revokeObjectURL(audioUrl);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fmtTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  useEffect(() => {
    const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SR) { setVoiceSupported(false); return; }
    setVoiceSupported(true);
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-GB';

    rec.onresult = (e) => {
      let finalChunk = '';
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const transcript = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalChunk += transcript;
        else interim += transcript;
      }
      if (finalChunk) {
        baseTextRef.current = (baseTextRef.current ? baseTextRef.current + ' ' : '') + finalChunk.trim();
      }
      const composed = (baseTextRef.current + (interim ? ' ' + interim : '')).replace(/\s+/g, ' ').trim();
      setForm((p) => ({ ...p, description: composed }));
    };
    rec.onerror = (e) => {
      setListening(false);
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        toast.error('Microphone access denied. Please allow microphone permission.');
      } else if (e.error === 'no-speech') {
        toast('No speech detected — try again.');
      }
    };
    rec.onend = () => setListening(false);

    recognitionRef.current = rec;
    return () => { try { rec.abort(); } catch {} };
  }, []);

  const toggleDictation = () => {
    const rec = recognitionRef.current;
    if (!rec) return;
    if (listening) {
      rec.stop();
      setListening(false);
      return;
    }
    baseTextRef.current = form.description ? form.description.trim() : '';
    try {
      rec.start();
      setListening(true);
      toast('Listening… speak your complaint');
    } catch {
      // start() can throw if called too quickly after stop()
      setListening(false);
    }
  };

  const set = (k, v) => {
    if (k === 'journeyStage') {
      setForm((p) => ({ ...p, journeyStage: v, category: COMPLAINT_CATEGORIES[v][0] }));
    } else {
      setForm((p) => ({ ...p, [k]: v }));
    }
  };

  const handleSubmit = async () => {
    if (listening) { try { recognitionRef.current?.stop(); } catch {} setListening(false); }
    if (recording) stopRecording();
    if (!form.description.trim() && !audioData) return toast.error('Please describe your complaint, or record a voice note');
    setSubmitting(true);
    try {
      await onSubmit?.({ ...form, clientType, branch: defaultBranch, voiceNote: audioData });
      baseTextRef.current = '';
      reRecord();
      setForm({
        journeyStage: 'before_applying',
        category: COMPLAINT_CATEGORIES.before_applying[0],
        severity: 'moderate',
        priority: 'medium',
        description: '',
        anonymous: false,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const input = 'w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-ticano-red';
  const label = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={label}>When did this happen? *</label>
          <select value={form.journeyStage} onChange={(e) => set('journeyStage', e.target.value)} className={input}>
            {JOURNEY_STAGES.map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Category *</label>
          <select value={form.category} onChange={(e) => set('category', e.target.value)} className={input}>
            {COMPLAINT_CATEGORIES[form.journeyStage].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          {CATEGORY_HINTS[form.category] && (
            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1"><Info size={11} /> {CATEGORY_HINTS[form.category]}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={label}>Severity</label>
          <div className="flex flex-wrap gap-2">
            {COMPLAINT_SEVERITY.map((s) => (
              <button
                type="button" key={s.key}
                onClick={() => set('severity', s.key)}
                className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                  form.severity === s.key
                    ? 'bg-ticano-red text-white border-ticano-red'
                    : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-ticano-red'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className={label}>Priority</label>
          <div className="flex flex-wrap gap-2">
            {COMPLAINT_PRIORITY.map((p) => (
              <button
                type="button" key={p.key}
                onClick={() => set('priority', p.key)}
                className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                  form.priority === p.key
                    ? 'bg-ticano-charcoal text-white border-ticano-charcoal'
                    : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-ticano-charcoal'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className={`${label} mb-0`}>Describe your complaint *</label>
          {voiceSupported && (
            <button
              type="button"
              onClick={toggleDictation}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                listening
                  ? 'bg-ticano-red text-white border-ticano-red animate-pulse'
                  : 'border-ticano-red text-ticano-red hover:bg-ticano-red-light'
              }`}
              title={listening ? 'Stop recording' : 'Record your complaint with your voice'}
            >
              {listening ? <MicOff size={13} /> : <Mic size={13} />}
              {listening ? 'Stop recording' : 'Record with voice'}
            </button>
          )}
        </div>
        <textarea
          rows={4}
          value={form.description}
          onChange={(e) => { baseTextRef.current = e.target.value; set('description', e.target.value); }}
          placeholder="Type here, or tap “Record with voice” and speak — your words will appear here as you talk…"
          className={`${input} resize-none ${listening ? 'ring-2 ring-ticano-red' : ''}`}
        />
        {listening && (
          <p className="text-xs text-ticano-red mt-1 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-ticano-red animate-pulse" /> Recording… speak clearly. Tap “Stop recording” when you’re done.
          </p>
        )}
        {!voiceSupported && (
          <p className="text-xs text-gray-400 mt-1">Voice input isn’t supported in this browser — please type your complaint. (Try Chrome or Edge for voice.)</p>
        )}
      </div>

      {/* Voice note (audio recording) */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <p className="text-sm font-medium text-ticano-charcoal dark:text-white flex items-center gap-1.5"><Mic size={14} className="text-ticano-red" /> Record a voice note (optional)</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Prefer to talk it through? Record your complaint and we’ll attach the audio to your ticket.</p>
          </div>
          {!recording && !audioUrl && (
            <button type="button" onClick={startRecording} className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full border border-ticano-red text-ticano-red hover:bg-ticano-red-light">
              <Mic size={13} /> Start recording
            </button>
          )}
          {recording && (
            <button type="button" onClick={stopRecording} className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full bg-ticano-red text-white animate-pulse">
              <MicOff size={13} /> Stop · {fmtTime(elapsed)}
            </button>
          )}
        </div>

        {recording && (
          <p className="text-xs text-ticano-red mt-2 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-ticano-red animate-pulse" /> Recording… speak now.
          </p>
        )}

        {audioUrl && !recording && (
          <div className="mt-3 flex items-center gap-3 flex-wrap">
            <audio src={audioUrl} controls controlsList="nodownload noplaybackrate" onContextMenu={(e) => e.preventDefault()} className="h-9 max-w-full" />
            <button type="button" onClick={reRecord} className="text-xs font-medium text-gray-500 hover:text-ticano-red underline">Re-record</button>
            <span className="text-xs text-green-600 flex items-center gap-1"><Mic size={11} /> Voice note ready — it will be attached on submit.</span>
          </div>
        )}

        {recError && <p className="text-xs text-amber-600 mt-2">{recError}</p>}
      </div>

      {/* Anonymous toggle (§2) */}
      <label className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${form.anonymous ? 'border-ticano-charcoal bg-gray-50 dark:bg-gray-800' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}>
        <input
          type="checkbox"
          checked={form.anonymous}
          onChange={(e) => set('anonymous', e.target.checked)}
          className="mt-1"
        />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Lock size={14} className="text-ticano-charcoal dark:text-gray-300" />
            <span className="font-medium text-ticano-charcoal dark:text-white">Submit as anonymous</span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Your name, phone and email will NOT be stored. You will receive an anonymous ID (e.g. ANON-000123) to track this complaint. No one — not even an administrator — can recover your identity.
          </p>
        </div>
      </label>

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full flex items-center justify-center gap-2 py-3 bg-ticano-red text-white rounded-xl font-semibold text-sm hover:bg-ticano-red-dark transition-colors disabled:opacity-60"
      >
        <Send size={16} />
        {submitting ? 'Submitting…' : 'Submit Complaint'}
      </button>

      <p className="text-xs text-gray-400 text-center flex items-center justify-center gap-1">
        <Info size={12} /> Document uploads are not supported. Please describe everything in writing.
      </p>
    </div>
  );
}
