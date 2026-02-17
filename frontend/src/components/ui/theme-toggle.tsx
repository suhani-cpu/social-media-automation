'use client';

import { Moon, Sun } from 'lucide-react';
import { useEffect } from 'react';
import { useThemeStore } from '@/lib/store/themeStore';
import { Button } from './button';

export function ThemeToggle() {
  const { theme, toggleTheme, setTheme } = useThemeStore();

  // Initialize theme on mount
  useEffect(() => {
    const currentTheme = useThemeStore.getState().theme;
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(currentTheme);
  }, []);

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="relative h-10 w-10 rounded-full hover:bg-accent/50 transition-all"
      title={theme === 'light' ? 'Switch to dark mode 🌙' : 'Switch to light mode ☀️'}
    >
      {theme === 'light' ? (
        <Sun className="h-5 w-5 text-yellow-500 transition-all" />
      ) : (
        <Moon className="h-5 w-5 text-blue-400 transition-all" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}

export function ThemeToggleButton() {
  const { theme, toggleTheme } = useThemeStore();

  useEffect(() => {
    const currentTheme = useThemeStore.getState().theme;
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(currentTheme);
  }, []);

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleTheme}
      className="gap-2 hover-scale border-2"
    >
      {theme === 'light' ? (
        <>
          <Moon className="h-4 w-4 text-blue-500" />
          <span>Dark Mode 🌙</span>
        </>
      ) : (
        <>
          <Sun className="h-4 w-4 text-yellow-500" />
          <span>Light Mode ☀️</span>
        </>
      )}
    </Button>
  );
}
