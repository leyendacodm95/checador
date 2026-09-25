import React, { useState, useEffect } from 'react';
import { X, Save, Clock, AlertTriangle, FileText, CheckCircle2 } from 'lucide-react';

export function ObservationModal({ student, isOpen, onClose, onSave }) {
  const [estado, setEstado] = useState('PRESENTE');

  useEffect(() => {
    if (student) {
      const initialStatus = student.estado || 'PRESENTE';
      setEstado(initialStatus === 'TARDÍO' ? 'PRESENTE' : initialStatus);
    }
  }, [student]);

  if (!isOpen || !student) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...student,
      estado,
      observaciones: estado === 'AUSENTE' ? '—' : 'Falta justificada',
      horaEntrada: student.horaEntrada || '—'
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-[#182234] rounded-2xl w-full max-w-md border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden p-6 relative max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4 border-b border-gray-100 dark:border-gray-800 pb-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-black text-gray-900 dark:text-white">
              Justificar / Editar Asistencia
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Alumno: <strong className="text-blue-600 dark:text-blue-400">{student.nombre}</strong> ({student.grado} {student.grupo})
            </p>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Estado Selector */}
          <div>
            <label className="block text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-2">
              Estado de Asistencia
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setEstado('PRESENTE')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                  estado === 'PRESENTE'
                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-transparent'
                }`}
              >
                PRESENTE
              </button>
              <button
                type="button"
                onClick={() => setEstado('AUSENTE')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                  estado === 'AUSENTE'
                    ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-transparent'
                }`}
              >
                AUSENTE
              </button>
            </div>
          </div>

          <div className="p-3.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200/60 dark:border-blue-800/60 rounded-xl text-xs text-blue-800 dark:text-blue-300">
            {estado === 'PRESENTE' ? (
              <p>Se registrará como <strong>PRESENTE</strong> y la observación se establecerá automáticamente como <strong>Falta justificada</strong>.</p>
            ) : (
              <p>Se registrará como <strong>AUSENTE</strong> y se eliminarán las observaciones (si las había).</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>Guardar Justificación</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
