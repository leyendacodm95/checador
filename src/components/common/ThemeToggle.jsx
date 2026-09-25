import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      className="p-1.5 md:p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-200/60 dark:hover:border-slate-700/50 flex items-center justify-center"
    >
      {theme === 'dark' ? (
        <Sun className="w-5 h-5 md:w-6 md:h-6 text-amber-500 animate-pulse" />
      ) : (
        <Moon className="w-5 h-5 md:w-6 md:h-6 text-slate-600" />
      )}
    </button>
  );
}
