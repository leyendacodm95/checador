import React from 'react';
import { User, Menu } from 'lucide-react';
import { ThemeToggle } from '../../components/common/ThemeToggle';
import { useAuth } from '../../context/AuthContext';
import { DigitalClock } from '../common/DigitalClock';

export function Header({ onToggleSidebar }) {
  const { role, updateDisplayRoleTitle } = useAuth();

  const getBadgeStyle = (userRole) => {
    const r = userRole ? userRole.toLowerCase() : '';
    if (r.includes('director') || r.includes('subdirector')) {
      return 'bg-blue-50/80 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-900/50';
    }
    if (r.includes('docente') || r.includes('docenta') || r.includes('usaer')) {
      return 'bg-emerald-50/80 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-900/50';
    }
    return 'bg-violet-50/80 dark:bg-violet-950/30 text-violet-650 dark:text-violet-400 border border-violet-200/50 dark:border-violet-900/50';
  };

  const isStudent = role === 'Alumno' || role === 'Alumna';

  return (
    <header className="bg-white dark:bg-[#0f172a] border-b border-slate-100 dark:border-slate-800/80 px-2 md:px-6 py-2 flex items-center justify-between transition-colors duration-200 shadow-sm sticky top-0 z-40">
      
      {/* Left: Mobile trigger, Theme (Mobile) & App title */}
      <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
        <button
          onClick={onToggleSidebar}
          className="p-1.5 md:p-2 rounded-xl text-slate-600 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none border border-slate-200/60 dark:border-slate-700/50 flex items-center justify-center"
        >
          <Menu className="w-5 h-5 md:w-6 md:h-6" />
        </button>
        
        {/* Theme Toggle (Mobile) - Left of the clock */}
        <div className="md:hidden">
          <ThemeToggle />
        </div>

        <span className="text-xs font-bold tracking-wide text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/50 px-3.5 py-1.5 rounded-xl hidden xl:inline-block font-outfit">
          🏛️ Sistema Checador — Primaria Sor Juana Inés de la Cruz (CCT: 18DPR0087R)
        </span>
      </div>

      {/* Center: Digital Clock */}
      <div className="flex-1 flex justify-center min-w-0 px-1">
        <DigitalClock />
      </div>

      {/* Right Controls: Theme (Desktop) + Role Badge */}
      <div className="flex items-center justify-end gap-1.5 md:gap-3 flex-shrink-0">
        {/* Theme Toggle (Desktop) */}
        <div className="hidden md:block">
          <ThemeToggle />
        </div>

        {/* Role Title Selector Badge (Strictly scoped by base role) */}
        {(() => {
          const rLower = (role || '').toLowerCase().trim();
          const isDirector = rLower === 'director' || rLower === 'directora';
          const isSub = rLower === 'subdirector' || rLower === 'subdirectora';

          if (isDirector || isSub) {
            return (
              <button
                onClick={() => {
                  let nextTitle = role;
                  if (isDirector) {
                    nextTitle = rLower === 'director' ? 'Directora' : 'Director';
                  } else if (isSub) {
                    nextTitle = rLower === 'subdirector' ? 'Subdirectora' : 'Subdirector';
                  }
                  if (updateDisplayRoleTitle) updateDisplayRoleTitle(nextTitle);
                }}
                title={`Haz clic para alternar género (${isDirector ? 'Director ⇄ Directora' : 'Subdirector ⇄ Subdirectora'})`}
                className={`flex items-center gap-1 px-2 py-1.5 md:px-3.5 md:py-2 rounded-lg md:rounded-xl text-[10px] md:text-xs font-black transition-all duration-200 shadow-sm active:scale-95 cursor-pointer hover:opacity-90 ${getBadgeStyle(role)}`}
              >
                <User className="w-3 h-3 md:w-3.5 md:h-3.5 flex-shrink-0" />
                <span className="hidden sm:inline">Rol: </span>
                <span className="sm:hidden">Rol: </span>
                <span className="truncate max-w-[75px] sm:max-w-none">{role}</span>
              </button>
            );
          }

          return (
            <div className={`flex items-center gap-1 px-2 py-1.5 md:px-3.5 md:py-2 rounded-lg md:rounded-xl text-[10px] md:text-xs font-bold shadow-sm ${getBadgeStyle(role)}`}>
              <User className="w-3 h-3 md:w-3.5 md:h-3.5 flex-shrink-0" />
              <span className="truncate max-w-[75px] sm:max-w-none">{role}</span>
            </div>
          );
        })()}
      </div>
    </header>
  );
}
