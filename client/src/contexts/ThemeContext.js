import React, { createContext, useContext, useEffect, useMemo } from 'react';

const ThemeContext = createContext({
  theme: 'dark',
  toggleTheme: () => {},
  setTheme: () => {}
});

const applyTheme = (theme) => {
  if (typeof document === 'undefined') return;
  if (theme === 'dark') {
    document.documentElement.dataset.theme = 'dark';
  } else {
    delete document.documentElement.dataset.theme;
  }
};

export const ThemeProvider = ({ children }) => {
  useEffect(() => {
    applyTheme('dark');
  }, []);

  const toggleTheme = () => {};
  const setTheme = () => {};

  const value = useMemo(() => ({ theme: 'dark', setTheme, toggleTheme }), []);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);
