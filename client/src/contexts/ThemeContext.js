import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const ThemeContext = createContext({
  theme: 'dark',
  toggleTheme: () => {},
  setTheme: () => {}
});

const STORAGE_KEY = 'loe-theme-preference';

export const ThemeProvider = ({ children }) => {
  // Force dark mode only
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.theme = 'dark';
    }
    if (typeof window !== 'undefined') {
      try { window.localStorage.setItem(STORAGE_KEY, 'dark'); } catch {}
    }
  }, []);

  const toggleTheme = () => {
    // No-op: dark mode only
    setTheme('dark');
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.theme = 'dark';
    }
  };

  const value = useMemo(() => ({ theme, setTheme, toggleTheme }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);
