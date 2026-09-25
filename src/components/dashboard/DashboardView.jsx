import React, { useState } from 'react';
import { StatCard } from './StatCard';
import { AttendanceTable } from './AttendanceTable';
import { Calendar, RefreshCw, KeyRound, X, Save, ShieldCheck, Mail, User, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export function DashboardView({ stats, students, onUpdateStudent, onDeleteStudent, onResetMonthlyRetardos }) {
  const { user, updateCredentials } = useAuth();
  const currentMonthName = new Date().toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
  const formattedMonth = currentMonthName.charAt(0).toUpperCase() + currentMonthName.slice(1);

  const isDirectorOrSub = ['director', 'directora', 'subdirector', 'subdirectora'].includes((user?.baseRole || user?.role || '').toLowerCase().trim());
  const showTempPinAlert = isDirectorOrSub && !!user?.isTemporary;

  // Security Change Password Modal state
  const [showModal, setShowModal] = useState(false);
  const [newUsername, setNewUsername] = useState(user?.username || '');
  const [newEmail, setNewEmail] = useState(user?.email || '');
  const [newPassword, setNewPassword] = useState(''); // Always start blank - NEVER show current password!
  const [showModalPassword, setShowModalPassword] = useState(false);
  const [cfgError, setCfgError] = useState('');
  const [cfgSuccess, setCfgSuccess] = useState('');

  const handleOpenModal = () => {
    setNewUsername(user?.username || '');
    setNewEmail(user?.email || '');
    setNewPassword('');
    setShowModalPassword(false);
    setCfgError('');
    setCfgSuccess('');
    setShowModal(true);
  };

  const handleUpdateCredentialsSubmit = async (e) => {
    e.preventDefault();
    setCfgError('');
    setCfgSuccess('');

    if (!newPassword.trim()) {
      setCfgError('Por favor ingresa la nueva contraseña.');
      return;
    }

    const res = await updateCredentials(newUsername, newPassword, newEmail);
    if (res.success) {
      setCfgSuccess('¡Contraseña y credenciales actualizadas correctamente!');
      setTimeout(() => {
        setShowModal(false);
        setCfgSuccess('');
        setNewPassword('');
      }, 1400);
    } else {
      setCfgError(res.error || 'Error al actualizar credenciales.');
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Yellow Security Alert for Temporary PIN / Password */}
      {showTempPinAlert && (
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-300">
                ⚠️ Contraseña Temporal Detectada
              </h4>
              <p className="text-xs font-medium text-amber-700 dark:text-amber-300/90 mt-0.5">
                Se recomienda cambiar la contraseña asignada por una contraseña personalizada por motivos de seguridad.
              </p>
            </div>
          </div>
          <button
            onClick={handleOpenModal}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-amber-500/20 shrink-0"
          >
            Cambiar Contraseña
          </button>
        </div>
      )}

      {/* Title & Action Buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white font-outfit">
            Panel de Control
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 flex items-center gap-1.5 font-semibold">
            <Calendar className="w-3.5 h-3.5 text-indigo-500" />
            Mes en curso: <strong className="font-extrabold text-indigo-650 dark:text-indigo-400">{formattedMonth}</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Cambiar Contraseña Button (Director/Subdirector only) */}
          {( (user?.role || user?.baseRole || '').toLowerCase().includes('director') || (user?.role || user?.baseRole || '').toLowerCase().includes('subdirector') ) && (
            <button
              onClick={handleOpenModal}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20 flex items-center gap-2"
              title="Cambiar contraseña, correo y nombre de usuario"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Cambiar Contraseña</span>
            </button>
          )}
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="ALUMNOS" value={stats.totalAlumnos} color="blue" />
        <StatCard label="DOCENTES" value={stats.totalDocentes} color="green" />
        <StatCard label="GRUPOS" value={stats.totalGrupos} color="blue" />
        <StatCard label="ASISTENCIA HOY" value={stats.asistenciaHoy} color="green" />
      </div>

      {/* Attendance Table */}
      <AttendanceTable students={students} onUpdateStudent={onUpdateStudent} onDeleteStudent={onDeleteStudent} />

      {/* Modal: Cambiar Contraseña y Credenciales */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl w-full max-w-md border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden p-6 relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 mb-5 border-b border-gray-100 dark:border-gray-800 pb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-gray-900 dark:text-white font-outfit">
                  Cambiar Contraseña
                </h3>
                <p className="text-xs text-gray-400">
                  Actualiza tu usuario, correo electrónico y nueva contraseña de acceso.
                </p>
              </div>
            </div>

            <form onSubmit={handleUpdateCredentialsSubmit} className="space-y-4">
              {cfgError && (
                <div className="text-xs text-rose-600 dark:text-rose-400 font-bold bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">
                  {cfgError}
                </div>
              )}
              {cfgSuccess && (
                <div className="text-xs text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
                  {cfgSuccess}
                </div>
              )}

              {/* Nombre de Usuario */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-blue-500" />
                  <span>Nombre de Usuario</span>
                </label>
                <input
                  type="text"
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="Ej. director"
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Correo Electrónico */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1 flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Correo Electrónico de Recuperación</span>
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="ejemplo@escuela.edu.mx"
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Nueva Contraseña */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1 flex items-center gap-1">
                  <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                  <span>Nueva Contraseña</span>
                </label>
                <div className="relative">
                  <input
                    type={showModalPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Escribe la nueva contraseña segura..."
                    className="w-full pl-3.5 pr-10 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-mono dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowModalPassword(!showModalPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 dark:hover:text-white p-0.5"
                    title={showModalPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showModalPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-gray-400 mt-1 font-semibold">
                  * Por tu seguridad la contraseña actual no se muestra. Mínimo 8 caracteres y 1 mayúscula.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition active:scale-95"
                >
                  <Save className="w-4 h-4" />
                  <span>Guardar Cambios</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
