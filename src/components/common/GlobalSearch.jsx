import React, { useEffect, useRef, useState } from 'react';
import { Search, X, Lock } from 'lucide-react';
import { globalSearch } from '../../services/api';
import { Badge } from './UI';
import { complaintStatusLabel } from '../../utils/constants';

/**
 * §17 — Global search.
 *
 * Search by ticket number, customer name, PM, branch, category, status.
 * Available across all dashboards via the Navbar.
 */
export default function GlobalSearch({ onPick }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState({ complaints: [], leads: [] });
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!q || q.length < 2) {
      setResults({ complaints: [], leads: [] });
      return;
    }
    let cancelled = false;
    globalSearch(q).then(({ data }) => {
      if (!cancelled) {
        setResults(data);
        setOpen(true);
      }
    });
    return () => { cancelled = true; };
  }, [q]);

  const total = results.complaints.length + results.leads.length;

  return (
    <div ref={wrapperRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => q.length >= 2 && setOpen(true)}
          placeholder="Search tickets, customers, PMs, branches…"
          className="pl-8 pr-8 py-2 w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-ticano-red"
        />
        {q && (
          <button onClick={() => { setQ(''); setOpen(false); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X size={14} />
          </button>
        )}
      </div>

      {open && q.length >= 2 && (
        <div className="absolute z-50 left-0 right-0 mt-2 bg-white dark:bg-ticano-dark-card border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl max-h-96 overflow-y-auto">
          {total === 0 ? (
            <p className="px-4 py-3 text-sm text-gray-500">No matches for "{q}"</p>
          ) : (
            <>
              {results.complaints.length > 0 && (
                <div>
                  <p className="px-4 pt-3 pb-1 text-xs uppercase tracking-wide text-gray-500">Complaints</p>
                  {results.complaints.map((c) => (
                    <button
                      key={`c-${c.id}`}
                      onClick={() => { onPick?.(c); setOpen(false); setQ(''); }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-between gap-2"
                    >
                      <div>
                        <div className="text-sm font-semibold text-ticano-red">{c.ticket}</div>
                        <div className="text-xs text-gray-500 flex items-center gap-1">
                          {c.customer && c.customer.startsWith('ANON-') && <Lock size={10} />}
                          {c.customer} · {c.branch}
                        </div>
                      </div>
                      <Badge status={c.status}>{complaintStatusLabel(c.status)}</Badge>
                    </button>
                  ))}
                </div>
              )}
              {results.leads.length > 0 && (
                <div>
                  <p className="px-4 pt-3 pb-1 text-xs uppercase tracking-wide text-gray-500">Leads</p>
                  {results.leads.map((l) => (
                    <div key={`l-${l.id}`} className="px-4 py-2 text-sm">
                      <div className="font-medium text-ticano-charcoal dark:text-white">{l.name}</div>
                      <div className="text-xs text-gray-500">{l.phone} · {l.branch}</div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
