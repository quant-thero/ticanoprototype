import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Mic, Loader2, AlertCircle } from 'lucide-react';
import { getVoiceNoteSignedUrl } from '../../services/supabaseApi';

const fmtTime = (s) => {
  if (!Number.isFinite(s)) return '0:00';
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
};

/**
 * Streaming-only voice complaint player. Never downloads or exposes a
 * permanent URL, fetches a fresh 5-minute signed URL each time playback
 * starts. If the current user isn't allowed to hear this recording
 * (enforced by storage RLS, not just hidden in the UI), the signed URL
 * request itself fails and that's shown directly rather than silently
 * failing.
 */
export default function VoiceNotePlayer({ voiceNotePath, duration, uploadedAt }) {
  const [url, setUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration || 0);
  const audioRef = useRef(null);
  const pendingPlayRef = useRef(false);

  useEffect(() => () => { audioRef.current?.pause(); }, []);

  // Fires once the <audio> element actually has the freshly-fetched src
  // (the DOM updates after this effect runs, guaranteed by React,
  // whereas a setTimeout race after setUrl() is not), this is what
  // actually starts playback, rather than trying to play immediately
  // after requesting a URL that the element hasn't received yet.
  useEffect(() => {
    if (url && pendingPlayRef.current && audioRef.current) {
      pendingPlayRef.current = false;
      audioRef.current.play().catch((err) => {
        console.error('[VoiceNotePlayer] playback failed:', err);
        setError('Playback failed, please try again');
        setPlaying(false);
      });
    }
  }, [url]);

  const ensureUrl = async () => {
    if (url) return url;
    setLoading(true);
    setError(null);
    try {
      const { data } = await getVoiceNoteSignedUrl(voiceNotePath);
      setUrl(data.url);
      return data.url;
    } catch (err) {
      console.error('[VoiceNotePlayer] could not get signed URL:', err);
      setError(err?.message || 'You do not have permission to listen to this recording');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const togglePlay = async () => {
    if (playing) {
      audioRef.current?.pause();
      setPlaying(false);
      return;
    }
    setPlaying(true);
    if (url) {
      // Already have a valid signed URL and the element already has it
      // play directly, no need to route through the effect.
      audioRef.current?.play().catch((err) => {
        console.error('[VoiceNotePlayer] playback failed:', err);
        setError('Playback failed, please try again');
        setPlaying(false);
      });
      return;
    }
    pendingPlayRef.current = true;
    const resolvedUrl = await ensureUrl();
    if (!resolvedUrl) {
      pendingPlayRef.current = false;
      setPlaying(false);
    }
    // If resolvedUrl came back, the effect above handles starting
    // playback once the <audio> element has genuinely received it.
  };

  const seek = (e) => {
    if (!audioRef.current || !totalDuration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    audioRef.current.currentTime = pct * totalDuration;
  };

  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2.5">
        <AlertCircle size={15} /> {error}
      </div>
    );
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
      <div className="flex items-center gap-3">
        <button
          onClick={togglePlay}
          disabled={loading}
          className="w-9 h-9 shrink-0 rounded-full bg-ticano-red text-white flex items-center justify-center hover:bg-ticano-red-dark disabled:opacity-60"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : playing ? <Pause size={15} /> : <Play size={15} className="ml-0.5" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-1">
            <Mic size={11} /> Voice complaint
            {uploadedAt && <span>· recorded {new Date(uploadedAt).toLocaleString()}</span>}
          </div>
          <div onClick={seek} className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full cursor-pointer relative overflow-hidden">
            <div className="h-full bg-ticano-red rounded-full" style={{ width: totalDuration ? `${(progress / totalDuration) * 100}%` : '0%' }} />
          </div>
        </div>

        <span className="text-xs text-gray-400 tabular-nums shrink-0">{fmtTime(progress)} / {fmtTime(totalDuration)}</span>
      </div>

      {/* controlsList/onContextMenu are the practical browser-level
          deterrents against downloading, there's no fully bulletproof
          way to prevent saving audio a browser has decoded, but this
          removes the obvious save/download affordances. Real protection
          is the signed URL expiring in 5 minutes and RLS gating who can
          ever request one in the first place. */}
      {url && (
        <audio
          ref={audioRef}
          src={url}
          controlsList="nodownload noplaybackrate"
          onContextMenu={(e) => e.preventDefault()}
          onTimeUpdate={(e) => setProgress(e.target.currentTime)}
          onLoadedMetadata={(e) => { if (Number.isFinite(e.target.duration)) setTotalDuration(e.target.duration); }}
          onEnded={() => { setPlaying(false); setProgress(0); }}
          className="hidden"
        />
      )}
    </div>
  );
}
