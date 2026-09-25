import React, { useState } from 'react';
import { X, Lock, GraduationCap, AlertTriangle, CheckCircle2, Eye, EyeOff, ShieldAlert } from 'lucide-react';
import bcrypt from 'bcryptjs';

export function PromoteGradeModal({ isOpen, onClose, onConfirm, currentUser }) {
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const roleTitle = currentUser?.role || currentUser?.baseRole || 'Director';

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMessage('');

    // Strict Password Validation against currently logged-in user
    if (!passwordInput) {
      setErrorMessage('Por favor ingrese su contraseña para confirmar.');
      return;
    }

    const cleanPass = passwordInput.trim();
    const storedPass = currentUser?.password || '';
    
    let isPasswordValid = false;
    if (storedPass.startsWith('$2a$') || storedPass.startsWith('$2b$')) {
      isPasswordValid = bcrypt.compareSync(cleanPass, storedPass);
    } else {
      isPasswordValid = storedPass === cleanPass;
    }

    if (!isPasswordValid) {
      setErrorMessage(`Contraseña de ${roleTitle} incorrecta. Verifica tu contraseña e intenta nuevamente.`);
      return;
    }

    // Password valid -> execute promotion
    onConfirm();
    setPasswordInput('');
    setErrorMessage('');
    onClose();
  };

  const handleClose = () => {
    setPasswordInput('');
    setErrorMessage('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
      <div className="bg-white/95 dark:bg-[#1c1c1e]/95 backdrop-blur-xl border border-slate-200 dark:border-[#2c2c2e] rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden p-6 relative">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-white p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Title & Icon */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20 shadow-xs">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white font-outfit">
              Promoción Automática de Ciclo Escolar
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Confirmación administrativa de alta seguridad
            </p>
          </div>
        </div>

        {/* Warning Details Card */}
        <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 rounded-2xl p-4 mb-5 space-y-2.5 text-xs text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Consecuencias de ejecutar la promoción de grado:</span>
          </div>

          <ul className="space-y-1.5 pl-6 list-disc text-slate-700 dark:text-slate-300 font-medium">
            <li>
              <strong className="text-amber-700 dark:text-amber-400">Alumnos de 6° Grado:</strong> Saldrán graduados de la primaria y serán dados de baja de las listas activas.
            </li>
            <li>
              <strong className="text-amber-700 dark:text-amber-400">Alumnos de 1° a 5° Grado:</strong> Serán promovidos automáticamente al siguiente año escolar (1°➔2°, 2°➔3°, 3°➔4°, 4°➔5°, 5°➔6°).
            </li>
            <li>
              <strong className="text-amber-700 dark:text-amber-400">Reinicio de Asistencia:</strong> El registro de retardos y asistencia diaria se reiniciará a 0 para el nuevo ciclo.
            </li>
          </ul>
        </div>

        {/* Password Security Verification Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-black uppercase text-slate-600 dark:text-slate-300 mb-1.5">
              Confirmar con Contraseña de {roleTitle}:
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder={`Ingresa tu contraseña de ${roleTitle}...`}
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  setErrorMessage('');
                }}
                className="w-full pl-10 pr-10 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Error Feedback Box */}
          {errorMessage && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!passwordInput}
              className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-95 disabled:opacity-50 disabled:pointer-events-none text-white font-black text-xs flex items-center gap-2 shadow-md shadow-amber-600/20 transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirmar y Promover Ciclo</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
