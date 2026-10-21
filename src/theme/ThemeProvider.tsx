import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { getItem, setItem } from '@/lib/kv';
import { themes, type Theme, type ThemeName } from './themes';

const STORAGE_KEY = 'tagebuch.theme';

type ThemeContextValue = {
  theme: Theme;
  setThemeName: (name: ThemeName) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [name, setName] = useState<ThemeName>('paper');

  useEffect(() => {
    getItem(STORAGE_KEY).then((stored) => {
      if (stored && stored in themes) setName(stored as ThemeName);
    });
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: themes[name],
      setThemeName: (next) => {
        setName(next);
        setItem(STORAGE_KEY, next);
      },
    }),
    [name],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
