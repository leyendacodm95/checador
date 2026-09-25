import React, { useState, useEffect } from 'react';
import { X, Save, UserCheck, Phone, Mail, FileText, BadgeCheck } from 'lucide-react';

export function EditTeacherModal({ gradeGroupKey, currentTeacher, isOpen, onClose, onSave }) {
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [cedula, setCedula] = useState('');
  const [matricula, setMatricula] = useState('');
  const [isCustomMatricula, setIsCustomMatricula] = useState(false);
  const [observaciones, setObservaciones] = useState('');

  useEffect(() => {
    if (currentTeacher) {
      if (typeof currentTeacher === 'object') {
        setNombre(currentTeacher.nombre || currentTeacher.name || currentTeacher.username || currentTeacher.displayName || currentTeacher.Nombre || currentTeacher.Name || '');
        setTelefono(currentTeacher.telefono || '');
        setEmail(currentTeacher.email || '');
        setCedula(currentTeacher.cedula || '');
        setMatricula(currentTeacher.matricula || `TEACHER-${gradeGroupKey.replace('°-', '')}`);
        setIsCustomMatricula(currentTeacher.isCustomMatricula || false);
        setObservaciones(currentTeacher.observaciones || '');
      } else {
        setNombre(currentTeacher || '');
        setTelefono('');
        setEmail('');
        setCedula('');
        setMatricula(`TEACHER-${gradeGroupKey.replace('°-', '')}`);
        setIsCustomMatricula(false);
        setObservaciones('');
      }
    }
  }, [currentTeacher, gradeGroupKey]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!nombre.trim()) return;

    const teacherData = {
      ... (typeof currentTeacher === 'object' ? currentTeacher : {}),
      nombre: nombre.trim(),
      telefono: telefono.trim() || '—',
      email: email.trim() || '—',
      cedula: cedula.trim() || '—',
      matricula: matricula.trim() || `TEACHER-${gradeGroupKey.replace('°-', '')}`,
      isCustomMatricula,
      observaciones: observaciones.trim() || '—',
    };

    onSave(gradeGroupKey, teacherData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-[#182234] rounded-2xl w-full max-w-lg border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden p-6 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5 border-b border-gray-100 dark:border-gray-800 pb-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-black text-gray-900 dark:text-white">
              Editar Datos del Docente ({gradeGroupKey})
            </h3>
            <p className="text-xs text-gray-400">
              Actualiza la información institucional del profesor titular.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Form Fields Grid */}
          <div className="space-y-3.5">
            {/* Nombre Completo */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                Nombre Completo del Docente
              </label>
              <input
                type="text"
                required
                placeholder="Ej. Profesora Elena Morales"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            {/* Teléfono & Cédula */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Número de Teléfono</span>
                </label>
                <input
                  type="tel"
                  placeholder="Ej. 555-123-4567"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1 flex items-center gap-1">
                  <BadgeCheck className="w-3.5 h-3.5 text-purple-500" />
                  <span>Cédula Profesional</span>
                </label>
                <input
                  type="text"
                  placeholder="Ej. 12893475"
                  value={cedula}
                  onChange={(e) => setCedula(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1 flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-blue-500" />
                <span>Correo Electrónico</span>
              </label>
              <input
                type="email"
                placeholder="ejemplo@escuela.edu.mx"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            {/* Matrícula / QR ID */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-blue-500" />
                  <span>Matrícula o QR ID</span>
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    id="isCustomMatricula"
                    checked={isCustomMatricula}
                    onChange={(e) => {
                      setIsCustomMatricula(e.target.checked);
                      if (!e.target.checked && currentTeacher) {
                        setMatricula(currentTeacher.matricula || `TEACHER-${gradeGroupKey.replace('°-', '')}`);
                      }
                    }}
                    className="w-3.5 h-3.5 text-emerald-600 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded focus:ring-emerald-500"
                  />
                  <label htmlFor="isCustomMatricula" className="text-[10px] font-bold text-gray-500 dark:text-gray-400 cursor-pointer">Personalizar</label>
                </div>
              </div>
              <input
                type="text"
                required
                disabled={!isCustomMatricula}
                value={matricula}
                onChange={(e) => setMatricula(e.target.value)}
                className={`w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none ${!isCustomMatricula ? 'opacity-60 bg-gray-100 dark:bg-gray-900/40' : ''}`}
              />
            </div>

            {/* Observaciones */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-amber-500" />
                <span>Observaciones / Notas</span>
              </label>
              <textarea
                rows="2"
                placeholder="Observaciones administrativas o de horario..."
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>Guardar Datos del Docente</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
