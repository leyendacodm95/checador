import React, { useState, useEffect } from 'react';
import { X, Save, AlertTriangle } from 'lucide-react';
import { calcularEdadCorte, validarCURP } from '../../lib/curpUtils';

export function EditStudentModal({ student, isOpen, onClose, onSave }) {
  const [nombre, setNombre] = useState('');
  const [grado, setGrado] = useState('1°');
  const [grupo, setGrupo] = useState('A');
  const [qrCode, setQrCode] = useState('');
  const [isCustomQr, setIsCustomQr] = useState(false);
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [curp, setCurp] = useState('');
  const [curpPorValidar, setCurpPorValidar] = useState(0);
  const [errorCurp, setErrorCurp] = useState('');

  const currentYear = new Date().getFullYear();

  useEffect(() => {
    if (student) {
      setNombre(student.nombre || '');
      setGrado(student.grado || '1°');
      setGrupo(student.grupo || 'A');
      setQrCode(student.qrCode || '');
      setIsCustomQr(student.isCustomQr || false);
      setFechaNacimiento(student.fecha_nacimiento || '');
      setCurp(student.curp || '');
      setCurpPorValidar(student.curp_por_validar === undefined ? (student.curp ? 0 : 0) : student.curp_por_validar);
    }
  }, [student]);

  if (!isOpen || !student) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanCurp = curp.trim().toUpperCase();
    if (cleanCurp && !validarCURP(cleanCurp)) {
      setErrorCurp('La CURP debe tener exactamente 18 caracteres en formato oficial.');
      return;
    }

    onSave({
      ...student,
      nombre: nombre.trim(),
      grado,
      grupo,
      qrCode: qrCode.trim(),
      isCustomQr,
      fecha_nacimiento: fechaNacimiento,
      curp: cleanCurp,
      edad_corte: calcularEdadCorte(fechaNacimiento, currentYear),
      curp_por_validar: curpPorValidar
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-[#182234] rounded-2xl w-full max-w-md border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden p-6 relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-black text-gray-900 dark:text-white mb-4">
          Editar Alumno
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nombre completo */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
              Nombre Completo del Alumno
            </label>
            <input
              type="text"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                Grado Escolar
              </label>
              <select
                value={grado}
                onChange={(e) => setGrado(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="1°">1° Grado</option>
                <option value="2°">2° Grado</option>
                <option value="3°">3° Grado</option>
                <option value="4°">4° Grado</option>
                <option value="5°">5° Grado</option>
                <option value="6°">6° Grado</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                Grupo
              </label>
              <select
                value={grupo}
                onChange={(e) => setGrupo(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="A">Grupo A</option>
                <option value="B">Grupo B</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                Fecha de Nacimiento
            </label>
            <input type="date" value={fechaNacimiento} required onChange={(e) => setFechaNacimiento(e.target.value)} 
                   className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-medium dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {fechaNacimiento && (() => {
            const edadCorte = calcularEdadCorte(fechaNacimiento, currentYear);
            return (
              <div className="p-3 bg-blue-50/60 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40 rounded-xl text-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-blue-700 dark:text-blue-300 font-bold">
                      <span>Fecha de corte: 1 de septiembre del año en curso</span>
                  </div>
                  <div className="text-gray-700 dark:text-gray-300 font-medium pt-0.5">
                      Edad al 1 de septiembre de {currentYear}: <span className="font-extrabold text-blue-600 dark:text-blue-400">{edadCorte} años</span>
                  </div>
              </div>
            );
          })()}

          <div className="space-y-2 mt-2 p-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-800/50">
              <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  CURP
              </label>
              <input type="text" maxLength={18} value={curp} 
                     onChange={(e) => {
                         setCurp(e.target.value.toUpperCase());
                         setErrorCurp('');
                         if(e.target.value.length === 18 && validarCURP(e.target.value)) setCurpPorValidar(0);
                     }}
                     className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-xl text-xs font-mono tracking-wider dark:text-white uppercase focus:outline-none focus:ring-2 focus:ring-blue-500" />
              
              {errorCurp && <p className="text-[10px] text-rose-500">{errorCurp}</p>}

              <div className={`mt-2 p-3 border rounded-xl transition-colors ${curpPorValidar === 0 && curp ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
                  <div className="flex items-center gap-2">
                      <input type="checkbox" id="curp-validada-edit" 
                             checked={curpPorValidar === 0 && curp} 
                             onChange={(e) => setCurpPorValidar(e.target.checked ? 0 : 1)} 
                             className="w-4 h-4 cursor-pointer text-emerald-600 rounded" />
                      <label htmlFor="curp-validada-edit" className={`text-xs font-bold cursor-pointer select-none ${curpPorValidar === 0 && curp ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                          {curpPorValidar === 0 && curp ? '✅ CURP validada oficialmente' : '⚠️ CURP pendiente de validación'}
                      </label>
                  </div>
              </div>
          </div>

          {/* Matrícula o ID QR personalizado */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-semibold text-gray-500 uppercase">
                Matrícula o Código QR
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  id="isCustomQr"
                  checked={isCustomQr}
                  onChange={(e) => {
                    setIsCustomQr(e.target.checked);
                    if (!e.target.checked && student) {
                      setQrCode(student.qrCode || '');
                    }
                  }}
                  className="w-3.5 h-3.5 text-blue-600 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded focus:ring-blue-500"
                />
                <label htmlFor="isCustomQr" className="text-[10px] font-bold text-gray-500 dark:text-gray-400 cursor-pointer">Personalizar</label>
              </div>
            </div>
            <input
              type="text"
              required
              disabled={!isCustomQr}
              value={qrCode}
              onChange={(e) => setQrCode(e.target.value)}
              className={`w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none ${!isCustomQr ? 'opacity-60 bg-gray-100 dark:bg-gray-900/40' : ''}`}
            />
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition"
            >
              <Save className="w-4 h-4" />
              Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
