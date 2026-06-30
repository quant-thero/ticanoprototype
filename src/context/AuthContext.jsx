import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('ticano_token'));

  useEffect(() => {
    const stored = localStorage.getItem('ticano_user');
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch {}
    }
  }, []);

  const login = (userData, authToken) => {
    // Apply sensible preference defaults
    const withDefaults = {
      avatar: null,
      notifyEmail: true,
      notifyWhatsApp: true,
      notifyInApp: true,
      ...userData,
    };
    setUser(withDefaults);
    setToken(authToken);
    localStorage.setItem('ticano_token', authToken);
    localStorage.setItem('ticano_user', JSON.stringify(withDefaults));
  };

  // Update profile fields/preferences locally (UI-only mock).
  const updateUser = (patch) => {
    setUser((prev) => {
      const next = { ...prev, ...patch };
      localStorage.setItem('ticano_user', JSON.stringify(next));
      return next;
    });
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('ticano_token');
    localStorage.removeItem('ticano_user');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
