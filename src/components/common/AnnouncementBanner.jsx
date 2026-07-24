import React, { useState, useEffect } from 'react';
import { Megaphone, X, Pin, ChevronDown, ChevronUp } from 'lucide-react';
import { getAnnouncements } from '../../services/supabaseApi';
import { useAuth } from '../../context/AuthContext';

export default function AnnouncementBanner() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [dismissed, setDismissed] = useState([]);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    getAnnouncements({ role: user?.role }).then(({ data }) => setAnnouncements(data)).catch(() => {});
  }, [user?.role]);

  const visible = announcements.filter(a => !dismissed.includes(a.id)).slice(0, 3);
  if (!visible.length) return null;

  const priorityStyle = {
    high: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-900 dark:text-red-100',
    normal: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100',
    info: 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200',
  };

  return (
    <div className="space-y-2 mb-4 animate-slide-down">
      {visible.map((ann, i) => (
        <div key={ann.id} className={`flex gap-3 px-4 py-3 rounded-xl border text-sm transition-all duration-300 ${priorityStyle[ann.priority] || priorityStyle.info}`}
          style={{ animationDelay: `${i * 0.08}s` }}>
          <div className="flex items-start gap-2 flex-1 min-w-0">
            {ann.pinned ? <Pin size={14} className="shrink-0 mt-0.5 opacity-70" /> : <Megaphone size={14} className="shrink-0 mt-0.5 opacity-70" />}
            <div className="min-w-0">
              <p className="font-semibold leading-tight">{ann.title}</p>
              {expanded === ann.id ? (
                <p className="text-xs mt-1 opacity-80 leading-relaxed">{ann.body}</p>
              ) : (
                <p className="text-xs mt-0.5 opacity-70 truncate">{ann.body}</p>
              )}
              <p className="text-[10px] opacity-50 mt-1">
                From {ann.author} · {new Date(ann.createdAt).toLocaleDateString()}
                {ann.endDate && <span className="ml-2 font-semibold opacity-90">· Deadline {new Date(ann.endDate).toLocaleDateString()}</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => setExpanded(expanded === ann.id ? null : ann.id)} className="p-1 opacity-60 hover:opacity-100 transition-opacity">
              {expanded === ann.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
            <button onClick={() => setDismissed(d => [...d, ann.id])} className="p-1 opacity-60 hover:opacity-100 transition-opacity">
              <X size={13} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
