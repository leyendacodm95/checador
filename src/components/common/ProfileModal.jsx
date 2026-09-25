import React from 'react';
import { X, Phone, Droplet, Mail, BadgeCheck, Clock, FileText, QrCode, UserCheck, GraduationCap, CheckCircle2 } from 'lucide-react';

export function ProfileModal({ data, type, isOpen, onClose }) {
  if (!isOpen || !data) return null;

  const isDocente = type === 'docente';

  // Normalize data for Student or Teacher
  const nombre = data.nombre || 'Sin nombre';
  const foto = data.foto || '';
  const grupo = data.grupo || data.key || '—';
  const grado = data.grado || '—';
  const estado = data.estado || '—';
  const horaEntrada = data.horaEntrada || '—';
  const observaciones = data.observaciones || '—';

  // Teacher specific fields
  const telefono = data.telefono || '—';
  const email = data.email || '—';
  const cedula = data.cedula || '—';
  const qrCode = data.qrCode || `STUDENT-${(nombre || "").slice(0, 2).toUpperCase()}-000`;

  const currentMonthName = new Date().toLocaleDateString('es-MX', { month: 'long' });
  const formattedMonth = currentMonthName.charAt(0).toUpperCase() + currentMonthName.slice(1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-md animate-fadeIn">
      <div className="bg-white dark:bg-[#182234] rounded-3xl w-full max-w-md border border-gray-200 dark:border-gray-700/80 shadow-2xl overflow-hidden relative transition-all transform scale-100">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-900 dark:hover:text-white flex items-center justify-center transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Banner */}
        <div className={`h-24 w-full bg-gradient-to-r ${
          isDocente ? 'from-emerald-600 via-teal-600 to-emerald-700' : 'from-blue-600 via-indigo-600 to-blue-700'
        } relative`} />

        {/* Profile Avatar */}
        <div className="flex flex-col items-center text-center px-6 -mt-14 pb-4">
          <div className="relative mb-3">
            <div className={`w-32 h-32 rounded-full font-black text-3xl flex items-center justify-center border-4 border-white dark:border-[#182234] shadow-2xl ${
              isDocente
                ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                : 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
            }`}>
              {nombre.replace(/Profesora\.|Profesor\.|Profesora|Profesor|Profra\.|Prof\./gi, '').trim().slice(0, 2).toUpperCase()}
            </div>

            <span className={`absolute bottom-1 right-1 p-2 rounded-full text-white shadow-lg ${
              isDocente ? 'bg-emerald-600' : 'bg-blue-600'
            }`}>
              {isDocente ? <UserCheck className="w-4 h-4" /> : <GraduationCap className="w-4 h-4" />}
            </span>
          </div>

          <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
            {nombre}
          </h3>

          <div className="flex items-center gap-2 mt-1">
            <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
              isDocente
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                : 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30'
            }`}>
              {isDocente ? `Docente Titular — ${grupo}` : `${grado} Grado "${grupo}"`}
            </span>
          </div>
        </div>

        {/* Detailed Information Box */}
        <div className="px-6 pb-6 space-y-3.5 text-sm border-t border-gray-100 dark:border-gray-800/80 pt-4">
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-gray-400">
            Ficha de Información
          </h4>

          {isDocente ? (
            /* Teacher Details */
            <div className="space-y-2.5">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-emerald-500" />
                  Teléfono
                </span>
                <span className="font-bold text-gray-900 dark:text-white">{telefono}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-blue-500" />
                  Correo
                </span>
                <span className="font-bold text-gray-900 dark:text-white text-xs truncate max-w-[180px]">{email}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                  <BadgeCheck className="w-4 h-4 text-purple-500" />
                  Cédula Profesional
                </span>
                <span className="font-mono font-bold text-gray-900 dark:text-white text-xs">{cedula}</span>
              </div>

              {/* Retardos eliminados según indicaciones */}
            </div>
          ) : (
            /* Student Details */
            <div className="space-y-2.5">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-blue-500" />
                  Matrícula QR
                </span>
                <span className="font-mono font-bold text-gray-900 dark:text-white text-xs">{qrCode}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Estado Pase Lista
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase ${
                  estado === 'PRESENTE'
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                }`}>
                  {estado}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-500" />
                  Hora de escaneo QR
                </span>
                <span className="font-mono font-bold text-gray-900 dark:text-white text-xs">{horaEntrada}</span>
              </div>

              {/* Retardos estudiantiles eliminados según indicaciones */}
            </div>
          )}

          {/* Observaciones */}
          <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
            <span className="text-xs font-semibold text-gray-400 uppercase block mb-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-gray-400" />
              Observaciones
            </span>
            <p className="text-xs text-gray-600 dark:text-gray-300 italic">
              {observaciones || 'Sin observaciones registradas'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
