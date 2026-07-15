import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    // 1. Check if they saved a preference previously
    if (localStorage.theme) return localStorage.theme;
    // 2. Otherwise, match their OS preference
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    // 3. Fallback
    return 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    // Remove old classes and add the current theme class to the <html> tag
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    // Save to localStorage
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
