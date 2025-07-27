import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Monitor, Check } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import type { Theme } from '../../hooks/useTheme';

const themes: { value: Theme; label: string; icon: React.ReactNode }[] = [
  { value: 'light', label: 'Light', icon: <Sun className="w-4 h-4" /> },
  { value: 'dark', label: 'Dark', icon: <Moon className="w-4 h-4" /> },
  { value: 'system', label: 'System', icon: <Monitor className="w-4 h-4" /> },
];

export function ThemeSwitcher() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get current theme icon
  const CurrentIcon = resolvedTheme === 'dark' ? Moon : Sun;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2.5 rounded-lg transition-all duration-200 hover:bg-opacity-10"
        style={{
          backgroundColor: isOpen ? 'rgb(var(--color-card) / 0.1)' : 'transparent',
          color: 'var(--color-text-muted)',
        }}
        aria-label="Toggle theme"
        aria-expanded={isOpen}
      >
        <CurrentIcon className="w-5 h-5 transition-transform duration-200" />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-36 rounded-lg shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200"
          style={{
            backgroundColor: 'var(--color-card)',
            border: '1px solid var(--color-border)',
          }}
        >
          <div className="py-1">
            {themes.map((themeOption) => (
              <button
                key={themeOption.value}
                onClick={() => {
                  setTheme(themeOption.value);
                  setIsOpen(false);
                }}
                className="w-full px-3 py-2 text-sm flex items-center gap-3 transition-all duration-150"
                style={{
                  color: theme === themeOption.value ? 'var(--color-accent-blue)' : 'var(--color-text)',
                  backgroundColor: theme === themeOption.value ? 'rgb(var(--color-accent-blue) / 0.1)' : 'transparent',
                }}
                onMouseEnter={(e) => {
                  if (theme !== themeOption.value) {
                    e.currentTarget.style.backgroundColor = 'rgb(var(--color-card) / 0.5)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (theme !== themeOption.value) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span className="flex-shrink-0">{themeOption.icon}</span>
                <span className="flex-1 text-left">{themeOption.label}</span>
                {theme === themeOption.value && (
                  <Check className="w-4 h-4 flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ThemeSwitcher;