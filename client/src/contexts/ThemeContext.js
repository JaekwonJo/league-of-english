import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const ThemeContext = createContext({
  theme: 'light',
  toggleTheme: () => {},
  setTheme: () => {}
});

const STORAGE_KEY = 'loe-theme-preference';

const getPreferredTheme = () => {
  if (typeof window === 'undefined') return 'light';
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
  } catch {}

  if (typeof window !== 'undefined' && window.matchMedia) {
    try {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch {}
  }

  return 'light';
};

const applyTheme = (theme) => {
  if (typeof document === 'undefined') return;
  if (theme === 'dark') {
    document.documentElement.dataset.theme = 'dark';
  } else {
    delete document.documentElement.dataset.theme;
  }
};

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(() => getPreferredTheme());

  useEffect(() => {
    applyTheme(theme);
    if (typeof window !== 'undefined') {
      try { window.localStorage.setItem(STORAGE_KEY, theme); } catch {}
    }
  }, [theme]);

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const setTheme = (value) => {
    const next = value === 'dark' ? 'dark' : 'light';
    setThemeState(next);
  };

  const value = useMemo(() => ({ theme, setTheme, toggleTheme }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);
