import React from 'react';
import { X, Mail, Briefcase } from 'lucide-react';

const ROLE_LABEL = {
  portfolio_manager: 'Portfolio Manager',
  service_manager: 'Service Manager',
  director: 'Director',
  marketing: 'Marketing',
  admin: 'Admin',
  customer: 'Customer',
};

/**
 * §5, Click a team member's name or avatar anywhere on the platform to see
 * their photo, title, and profile details. Name/title/photo are shown above
 * the rest of the pop-up content, as requested.
 */
export default function StaffProfileModal({ person, onClose }) {
  if (!person) return null;
  const initials = (person.name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white dark:bg-ticano-dark-card rounded-2xl shadow-2xl animate-scale-in overflow-hidden">
        <button onClick={onClose} className="absolute right-3 top-3 text-white/80 hover:text-white z-10"><X size={18} /></button>

        {/* Header, photo/name/title, positioned above the rest of the content */}
        <div className="bg-ticano-charcoal px-6 pt-8 pb-6 text-center">
          {person.avatarUrl ? (
            <img src={person.avatarUrl} alt={person.name} className="w-20 h-20 rounded-full object-cover mx-auto mb-3 shadow-lg ring-4 ring-white/10" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-ticano-red text-white flex items-center justify-center text-2xl font-bold mx-auto mb-3 shadow-lg ring-4 ring-white/10">
              {initials}
            </div>
          )}
          <p className="font-bold text-white text-lg leading-tight">{person.name}</p>
          {(person.jobTitle || person.role) && (
            <p className="text-ticano-red text-sm font-semibold mt-0.5">{person.jobTitle || ROLE_LABEL[person.role] || person.role}</p>
          )}
        </div>

        {/* Additional profile data */}
        <div className="px-6 py-5 space-y-3">
          {person.role && (
            <div className="flex items-center gap-2.5 text-sm">
              <Briefcase size={15} className="text-gray-400 shrink-0" />
              <span className="text-gray-600 dark:text-gray-300">{ROLE_LABEL[person.role] || person.role}</span>
            </div>
          )}
          {person.email && (
            <div className="flex items-center gap-2.5 text-sm">
              <Mail size={15} className="text-gray-400 shrink-0" />
              <a href={`mailto:${person.email}`} className="text-gray-600 dark:text-gray-300 hover:text-ticano-red truncate">{person.email}</a>
            </div>
          )}
          {person.branch && (
            <div className="flex items-center gap-2.5 text-sm">
              <span className="w-[15px] text-center text-gray-400 shrink-0">📍</span>
              <span className="text-gray-600 dark:text-gray-300">{person.branch}</span>
            </div>
          )}
          {person.description && (
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed pt-1 border-t border-gray-100 dark:border-gray-700 mt-3">{person.description}</p>
          )}
          {!person.email && !person.branch && !person.description && (
            <p className="text-xs text-gray-400 text-center py-2">No additional profile details on file.</p>
          )}
        </div>
      </div>
    </div>
  );
}
