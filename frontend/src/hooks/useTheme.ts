import { useContext } from 'react';
import { ThemeContext, type Theme } from '../contexts/ThemeContext';

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export type { Theme };