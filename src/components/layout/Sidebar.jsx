import React from 'react';
import { 
  LayoutDashboard, Users, QrCode, FileText, LogOut, 
  Database, UserCheck, ClipboardList, Shield, Calendar, Camera, Clock
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import schoolLogo from '../../logo.png';
import versionData from '../../../public/version.json';

export function Sidebar({ open, onClose }) {
  const { activeTab, setActiveTab, role, logout, user } = useAuth();

  const directorItems = [
    { label: 'Panel de control', icon: LayoutDashboard },
    { label: 'Asistencia Docentes', icon: Camera },
    { label: 'Portal Directivo', icon: UserCheck },
    { label: 'Horarios', icon: Clock },
    { label: 'Registros del Día', icon: ClipboardList },
    { label: 'Alumnos', icon: Users },
    { label: 'Docentes', icon: UserCheck },
    { label: 'Escáner QR', icon: QrCode },
    { label: 'Calendario SEP', icon: Calendar },
    { label: 'Historial', icon: FileText },
    { label: 'Respaldo', icon: Database },
  ];

  const docenteItems = [
    { label: 'Asistencia Docentes', icon: Camera },
    { label: 'Portal Docente', icon: UserCheck },
    { label: 'Alumnos', icon: Users },
    { label: 'Escáner QR', icon: QrCode },
    { label: 'Calendario SEP', icon: Calendar },
    { label: 'Historial', icon: FileText },
  ];

  const alumnoItems = [
    { label: 'Portal Alumno', icon: UserCheck },
    { label: 'Calendario SEP', icon: Calendar },
  ];

  const getMenuItems = () => {
    const baseRole = user?.baseRole || user?.role || role;
    const rBaseLower = (baseRole || '').toLowerCase().trim();
    const rLower = (role || '').toLowerCase().trim();
    const isBaseAdmin = ['director','directora','subdirector','subdirectora'].includes(rBaseLower);
    const isBaseDocente = ['docente','docenta','docente titular'].includes(rBaseLower);
    const isDirector = ['director', 'directora'].includes(rLower) || ['director', 'directora'].includes(rBaseLower);

    const personalItems = [
      { label: 'Asistencia Docentes', icon: Camera },
      { label: 'Portal Docente', icon: UserCheck },
      { label: 'Calendario SEP', icon: Calendar },
    ];

    let items = [];
    if (!isBaseAdmin && ['director','directora','subdirector','subdirectora'].includes(rLower)) {
      items = isBaseDocente ? docenteItems : alumnoItems;
    } else {
      if (isBaseAdmin || rLower === 'director' || rLower === 'directora' || rLower === 'subdirector' || rLower === 'subdirectora') {
        items = isBaseAdmin ? directorItems : docenteItems;
      } else if (['docente', 'docenta', 'docente titular', 'docente auxiliar', 'usaer', 'educación especial'].includes(rLower)) {
        items = docenteItems;
      } else if (['alumno', 'alumna'].includes(rLower)) {
        items = alumnoItems;
      } else {
        const hasAssignedGroup = user?.assignedGroup && !['Sin Grupo', 'Sin asignar', 'Ninguno', ''].includes(user?.assignedGroup);
        items = hasAssignedGroup ? docenteItems : personalItems; // Intendente, Psicología, etc.
      }
    }

    // Strictly hide "Respaldo" for Subdirector, Docentes, Alumnos
    if (!isDirector) {
      items = items.filter(item => item.label !== 'Respaldo');
    }

    return items;
  };

  const menuItems = getMenuItems();

  return (
    <>
      {/* Mobile Backdrop */}
      {open && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm transition-opacity"
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-[#2b66f6] dark:bg-[#0c101d] text-white flex flex-col transition-transform duration-300 ease-in-out border-r border-blue-700/30 dark:border-slate-800/80 ${
          open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex-1 flex flex-col overflow-y-auto">
          {/* Brand Logo Header (School Logo + Name) */}
          <div className="p-5 flex flex-col items-center border-b border-blue-500/20 dark:border-slate-800/80 text-center gap-3">
            <img 
              src={schoolLogo} 
              alt="Logo Sor Juana Inés de la Cruz T.V" 
              className="w-24 h-24 object-contain bg-white rounded-xl p-1 shadow-sm"
            />
            <div className="flex flex-col mt-1">
              <span className="font-outfit font-extrabold text-sm tracking-tight text-white leading-tight">
                Sor Juana Inés de la Cruz T.V
              </span>
              <span className="text-[10px] text-blue-200 font-bold uppercase tracking-wider mt-1 opacity-90">
                Escuela Primaria
              </span>
            </div>
          </div>

          {/* User Role Tag */}
          <div className="px-5 pt-4 pb-2">
            <div className="flex items-center gap-2 bg-white/10 dark:bg-slate-800/50 px-3 py-1.5 rounded-xl border border-white/5 dark:border-slate-700/50 text-[10px] uppercase font-bold tracking-wider">
              <Shield className="w-3.5 h-3.5 text-blue-200" />
              <span>Rol: <strong className="text-white">{role}</strong></span>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="p-4 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.label;

              return (
                <button
                  key={item.label}
                  onClick={() => {
                    setActiveTab(item.label);
                    if (onClose) onClose();
                  }}
                  className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 ${
                    isActive
                      ? 'bg-white/15 text-white shadow-sm font-extrabold scale-[1.01]'
                      : 'text-blue-100 md:hover:text-white md:hover:translate-x-0.5'
                  }`}
                >
                  <div className={`p-1.5 rounded-lg transition-all duration-150 ${
                    isActive
                      ? 'bg-white/10 text-white'
                      : 'bg-white/5 text-blue-200 md:group-hover:text-white'
                  }`}>
                    <Icon className="w-4 h-4 shrink-0" />
                  </div>
                  <span className="font-outfit">{item.label}</span>
                </button>
              );
            })}

            {/* Logout button placed directly below the last item in nav menu */}
            <div className="pt-3 mt-2 border-t border-white/10 dark:border-slate-800">
              <button
                onClick={logout}
                className="w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-red-200 md:hover:text-red-100 md:hover:bg-red-500/10 active:bg-red-500/10 transition-colors"
              >
                <div className="p-1.5 rounded-lg bg-red-500/15 text-red-300">
                  <LogOut className="w-4 h-4 shrink-0" />
                </div>
                <span className="font-outfit">Cerrar sesión</span>
              </button>
            </div>
            
            {/* Version Text (Only visible in Android App) */}
            {window.AndroidApp && (
              <div className="mt-6 text-center text-[10px] font-bold text-blue-200/50 uppercase tracking-widest">
                Checador V{versionData.versionName || "0.02"}
              </div>
            )}
          </nav>
        </div>
      </aside>
    </>
  );
}
