import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark'; // The actual theme used after resolving system preference
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Get theme from localStorage or default to 'system'
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem('theme') as Theme;
    return savedTheme || 'system';
  });

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  // Function to set theme and save to localStorage
  const handleSetTheme = (newTheme: Theme) => {
    console.log('🔄 Theme change requested:', newTheme);
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    console.log('💾 Theme saved to localStorage:', newTheme);
  };

  // Effect to handle system theme changes and apply theme to document
  useEffect(() => {
    const updateTheme = () => {
      const root = window.document.documentElement;
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

      // Determine which theme to use
      const themeToApply = theme === 'system' ? systemTheme : theme;
      console.log('🎨 Theme resolution:', { theme, systemTheme, themeToApply });
      setResolvedTheme(themeToApply as 'light' | 'dark');

      // Apply or remove dark class based on theme
      if (themeToApply === 'dark') {
        console.log('🌙 Applying dark mode to HTML root element');
        root.classList.add('dark');
        console.log('✅ Dark class added. Current classes:', root.className);
        // Force remove any light mode styles
        document.body.style.backgroundColor = '';
        document.body.style.color = '';
      } else {
        console.log('☀️ Removing dark mode from HTML root element');
        root.classList.remove('dark');
        console.log('✅ Dark class removed. Current classes:', root.className);
        // Force remove any dark mode styles
        document.body.style.backgroundColor = '';
        document.body.style.color = '';
        // Force light mode styles
        document.body.style.backgroundColor = '#f9fafb';
        document.body.style.color = '#111827';
      }
    };

    // Set up listeners for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', updateTheme);

    // Initial theme setup
    updateTheme();

    // Cleanup
    return () => {
      mediaQuery.removeEventListener('change', updateTheme);
    };
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme: handleSetTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};