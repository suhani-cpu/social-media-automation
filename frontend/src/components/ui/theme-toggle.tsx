'use client';

import { useEffect } from 'react';
import { useThemeStore } from '@/lib/store/themeStore';

export function ThemeToggle() {
  const { theme: _theme } = useThemeStore();

  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add('dark');
  }, []);

  return null;
}

export function ThemeToggleButton() {
  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add('dark');
  }, []);

  return null;
}
