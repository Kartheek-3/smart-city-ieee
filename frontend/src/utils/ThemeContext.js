import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    try { localStorage.setItem('sc_theme', 'light'); } catch {}
    document.documentElement.setAttribute('data-theme', 'light');
  }, [dark]);

  return (
    <ThemeContext.Provider value={{ dark: false, setDark, toggle: () => {} }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
