import React from 'react';

export function StatCard({ label, value, color = 'blue' }) {
  const themes = {
    blue: {
      bg: 'bg-gradient-to-br from-indigo-50/40 to-slate-50/30 dark:from-slate-800/40 dark:to-slate-900/30',
      border: 'border-slate-200/80 dark:border-slate-800 border-t-4 border-t-indigo-500 dark:border-t-indigo-500',
      label: 'text-indigo-600 dark:text-indigo-400',
      badge: 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-100/50 dark:border-indigo-900/30',
    },
    green: {
      bg: 'bg-gradient-to-br from-emerald-50/40 to-slate-50/30 dark:from-slate-800/40 dark:to-slate-900/30',
      border: 'border-slate-200/80 dark:border-slate-800 border-t-4 border-t-emerald-500 dark:border-t-emerald-500',
      label: 'text-emerald-600 dark:text-emerald-400',
      badge: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-100/50 dark:border-emerald-900/30',
    },
    amber: {
      bg: 'bg-gradient-to-br from-amber-50/40 to-slate-50/30 dark:from-slate-800/40 dark:to-slate-900/30',
      border: 'border-slate-200/80 dark:border-slate-800 border-t-4 border-t-amber-500 dark:border-t-amber-500',
      label: 'text-amber-600 dark:text-amber-400',
      badge: 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-100/50 dark:border-amber-900/30',
    }
  };

  const t = themes[color] || themes.blue;

  return (
    <div
      className={`rounded-2xl p-5 border shadow-xs transition-all duration-200 hover:shadow-sm hover:-translate-y-0.5 ${t.bg} ${t.border}`}
    >
      <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg inline-block mb-3 font-outfit ${t.badge}`}>
        {label}
      </span>
      <div className="text-3xl font-extrabold font-outfit tracking-tight text-slate-800 dark:text-white leading-none">
        {value}
      </div>
    </div>
  );
}
