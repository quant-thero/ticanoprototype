import React, { createContext, useContext, useState, useEffect } from 'react';

// Setswana translations for common UI strings. Falls back to English if a
// key is missing. NOTE: translations are intended for production review by
// a native speaker — they're conservative, simple, and based on widely
// accepted Setswana usage.
const TRANSLATIONS = {
  en: {},
  tn: {
    // Greetings
    'Welcome back': 'Re go amogela gape',
    'Welcome Back': 'Re go amogela gape',
    'Welcome to Ticano': 'O amogetswe kwa Ticano',
    'Hello': 'Dumela',
    'Good morning': 'Dumela',

    // Navigation tabs (Client Dashboard)
    'Overview': 'Kakaretso',
    'My Complaints': 'Dingongorego tsa me',
    'Submit a Complaint': 'Romela Ngongorego',
    'Improve Ticano': 'Tokafatsa Ticano',
    'Feedback History': 'Histori ya Maikutlo',
    'My Profile': 'Profaele ya me',

    // Common buttons
    'Submit': 'Romela',
    'Cancel': 'Khansela',
    'Save': 'Boloka',
    'Back': 'Morago',
    'Next': 'Tla pele',
    'Close': 'Tswala',
    'Edit': 'Fetola',
    'Delete': 'Phimola',
    'Search': 'Batla',
    'Filter': 'Tlhopha',
    'View': 'Lebelela',
    'Send': 'Romela',
    'Update': 'Ntšhafatsa',
    'Confirm': 'Tlhomamisa',
    'Yes': 'Ee',
    'No': 'Nnyaa',
    'Loading...': 'Go a laisiwa...',
    'Submitting...': 'Go a romelwa...',

    // Complaint UI
    'Ticket': 'Tekete',
    'Status': 'Maemo',
    'Category': 'Karolo',
    'Branch': 'Lekala',
    'Customer': 'Moreki',
    'Description': 'Tlhaloso',
    'Severity': 'Botho',
    'Priority': 'Botlhokwa',
    'Created': 'E thakgotse',
    'Assigned': 'E abetswe',
    'In Progress': 'E ya pele',
    'Resolved': 'E rarabolotswe',
    'Closed': 'E tswetswe',
    'Open Complaints': 'Dingongorego tse di Bulegileng',
    'Total Complaints': 'Palogotlhe ya Dingongorego',
    'No complaints yet': 'Ga go na dingongorego',
    'Your Portfolio Manager': 'Motsamaisi wa Lenaneo la gago',

    // Forms
    'Full Name': 'Leina le le Tletseng',
    'Email': 'Imeile',
    'Phone Number': 'Nomoro ya Mogala',
    'Password': 'Sephiri',

    // Settings
    'Settings': 'Diteseledi',
    'Language': 'Puo',
    'English': 'Sekgowa',
    'Setswana': 'Setswana',
    'High Contrast': 'Bofarologo jo Bogolo',
    'Dark Mode': 'Mokgwa o o Lefifi',
    'Accessibility': 'Tshegetso',

    // Tagline
    'Purchase Order Financing Specialists': 'Bothakga jwa Tshegetso ya Madi a Ditolamente',

    // Hero / banner
    'How did we do?': 'Re dirile jang?',
    'Help us improve by sharing your experience.': 'Re thuse go tokafatsa ka go arolelana boitemogelo jwa gago.',
    'How can we improve your experience with Ticano?': 'Re ka tokafatsa boitemogelo jwa gago jang le Ticano?',
    'Feedback shared': 'Maikutlo a abeditswe',
    'Tell us what went wrong': 'Re bolelele se se fositseng',
    'Latest complaint': 'Ngongorego ya bofelo',
    'Quick view of your most recent ticket': 'Tebelelo e potlana ya tekete ya gago ya bofelo',
  },
};

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('ticano_lang') || 'en');
  const [highContrast, setHighContrast] = useState(() => localStorage.getItem('ticano_high_contrast') === '1');
  const [largeText, setLargeText] = useState(() => localStorage.getItem('ticano_large_text') === '1');

  useEffect(() => {
    localStorage.setItem('ticano_lang', lang);
    document.documentElement.lang = lang === 'tn' ? 'tn' : 'en';
  }, [lang]);

  useEffect(() => {
    localStorage.setItem('ticano_high_contrast', highContrast ? '1' : '0');
    if (highContrast) document.documentElement.classList.add('high-contrast');
    else document.documentElement.classList.remove('high-contrast');
  }, [highContrast]);

  useEffect(() => {
    localStorage.setItem('ticano_large_text', largeText ? '1' : '0');
    if (largeText) document.documentElement.classList.add('large-text');
    else document.documentElement.classList.remove('large-text');
  }, [largeText]);

  // Translate a key, falling back to the key itself if missing.
  const t = (key) => {
    if (lang === 'en') return key;
    return TRANSLATIONS[lang]?.[key] || key;
  };

  return (
    <SettingsContext.Provider value={{
      lang, setLang,
      highContrast, setHighContrast,
      largeText, setLargeText,
      t,
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);
