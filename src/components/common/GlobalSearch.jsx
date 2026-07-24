import React, { useEffect, useRef, useState } from 'react';
import { Search, X, Lock, MapPin } from 'lucide-react';
import { globalSearch } from '../../services/supabaseApi';
import { Badge } from './UI';
import { complaintStatusLabel } from '../../utils/constants';
import { useAuth } from '../../context/AuthContext';
import StaffProfileModal from './StaffProfileModal';

/**
 * §17, Global search.
 *
 * Search by ticket number, customer name, PM, branch, category, status.
 * Available across all dashboards via the Navbar. Results are scoped to
 * what's actually relevant for the searching user's role (see
 * globalSearch() in supabaseApi.js), a PM searching sees their own
 * cases, not a staff directory; Marketing sees leads and people, not
 * complaint detail; Service Manager/Director/Admin keep full org-wide
 * results.
 */
// Placeholder text and "what can I search here" hints, tailored to what
// each role's search actually returns (see globalSearch() in
// supabaseApi.js), a PM is never shown a hint about staff directory
// search, Director is never shown a hint about client/lead search.
const PLACEHOLDER_BY_ROLE = {
  portfolio_manager: 'Search your cases, leads, branches…',
  service_manager: 'Search complaints, clients, staff, branches…',
  director: 'Search complaints, staff, branches…',
  admin: 'Search complaints, clients, staff, branches…',
  marketing: 'Search leads, staff, branches…',
};
const HINTS_BY_ROLE = {
  portfolio_manager: ['Ticket number', 'Customer name', 'Lead name or company', 'Branch'],
  service_manager: ['Ticket number', 'Customer name', 'Branch', 'Staff name'],
  director: ['Ticket number', 'Branch', 'Staff name'],
  admin: ['Ticket number', 'Customer name', 'Staff name', 'Branch'],
  marketing: ['Lead name or company', 'Staff name', 'Branch'],
};

export default function GlobalSearch({ onPick }) {
  const { user } = useAuth();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState({ complaints: [], leads: [], people: [], branches: [] });
  const [profilePerson, setProfilePerson] = useState(null);
  const wrapperRef = useRef(null);
  const placeholder = PLACEHOLDER_BY_ROLE[user?.role] || 'Search…';
  const hints = HINTS_BY_ROLE[user?.role] || [];

  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!q || q.length < 2) {
      setResults({ complaints: [], leads: [], people: [], branches: [] });
      return;
    }
    let cancelled = false;
    globalSearch(q, user ? { role: user.role, id: user.id } : null).then(({ data }) => {
      if (!cancelled) {
        setResults(data);
        setOpen(true);
      }
    });
    return () => { cancelled = true; };
  }, [q, user]);

  const total = results.complaints.length + results.leads.length + (results.people?.length || 0) + (results.branches?.length || 0);

  return (
    <div ref={wrapperRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="pl-8 pr-8 py-2 w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-ticano-red"
        />
        {q && (
          <button onClick={() => { setQ(''); setOpen(false); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X size={14} />
          </button>
        )}
      </div>

      {open && q.length < 2 && hints.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-2 bg-white dark:bg-ticano-dark-card border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-3">
          <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">You can search by</p>
          <div className="flex flex-wrap gap-1.5">
            {hints.map((h) => (
              <span key={h} className="text-xs px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">{h}</span>
            ))}
          </div>
        </div>
      )}

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
              {results.branches?.length > 0 && (
                <div>
                  <p className="px-4 pt-3 pb-1 text-xs uppercase tracking-wide text-gray-500">Branches</p>
                  {results.branches.map((b) => (
                    <div key={`b-${b.id}`} className="px-4 py-2">
                      <div className="font-medium text-ticano-charcoal dark:text-white text-sm flex items-center gap-1.5"><MapPin size={12} className="text-ticano-red shrink-0" /> {b.name} Branch</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {b.address && <span>{b.address}{b.city ? `, ${b.city}` : ''}</span>}
                        {b.phone && <span>{b.address ? ' · ' : ''}{b.phone}</span>}
                      </div>
                      {b.managerName && <div className="text-xs text-gray-400 mt-0.5">Branch Manager: {b.managerName}</div>}
                    </div>
                  ))}
                </div>
              )}
              {results.people?.length > 0 && (
                <div>
                  <p className="px-4 pt-3 pb-1 text-xs uppercase tracking-wide text-gray-500">People</p>
                  {results.people.map((p) => (
                    <button
                      key={`p-${p.id}`}
                      onClick={() => { setProfilePerson(p); setOpen(false); }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <div className="font-medium text-ticano-charcoal dark:text-white text-sm">{p.name}</div>
                      <div className="text-xs text-gray-500">{p.role}{p.email ? ` · ${p.email}` : ''}</div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {profilePerson && <StaffProfileModal person={profilePerson} onClose={() => setProfilePerson(null)} />}
    </div>
  );
}
