import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Clock, Save, User, CalendarX2, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { getCustomCalendarSuspensions, addCustomCalendarSuspension, removeCustomCalendarSuspension, getOfficialSepSuspensionsForYear } from '../../lib/sepCalendarService';

const DEFAULT_HORARIO = {
  Lunes: { entrada: '13:00', salida: '18:00' },
  Martes: { entrada: '13:00', salida: '18:00' },
  Miércoles: { entrada: '13:00', salida: '18:00' },
  Jueves: { entrada: '13:00', salida: '18:00' },
  Viernes: { entrada: '13:00', salida: '18:00' }
};

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

export function AsignacionHorariosView() {
  const { users } = useAuth();
  
  // Filtrar solo docentes
  const docentes = useMemo(() => {
    return users.filter(u => {
      const role = (u.role || u.baseRole || '').toLowerCase();
      return role === 'docente' || role === 'docenta';
    });
  }, [users]);

  const [selectedDocente, setSelectedDocente] = useState(null);
  const [horario, setHorario] = useState(DEFAULT_HORARIO);
  const [diasInhabiles, setDiasInhabiles] = useState([]);
  const [nuevoDiaInhabil, setNuevoDiaInhabil] = useState('');
  const [motivoInhabil, setMotivoInhabil] = useState('');
  const [saving, setSaving] = useState(false);

  // Cargar configuración de días inhábiles y precargar calendario SEP si está vacío
  useEffect(() => {
    const current = getCustomCalendarSuspensions();
    const hasPreloadedFlag = localStorage.getItem('checador_sep_preloaded_2026');
    
    if (current.length === 0 && !hasPreloadedFlag) {
      const official = getOfficialSepSuspensionsForYear(2026);
      localStorage.setItem('checador_custom_calendar_suspensions', JSON.stringify(official));
      localStorage.setItem('checador_sep_preloaded_2026', 'true');
      setDiasInhabiles(official);
    } else {
      setDiasInhabiles(current);
    }
  }, []);

  const handleSelectDocente = (d) => {
    setSelectedDocente(d);
    setHorario(d.horario || DEFAULT_HORARIO);
  };

  const handleHorarioChange = (dia, tipo, valor) => {
    setHorario(prev => ({
      ...prev,
      [dia]: {
        ...prev[dia],
        [tipo]: valor
      }
    }));
  };

  const handleSaveHorario = async () => {
    if (!selectedDocente) return;
    setSaving(true);
    try {
      const docenteId = selectedDocente.username || selectedDocente.uid || selectedDocente.id;
      if (!docenteId) {
        throw new Error('No se pudo identificar el ID del docente seleccionado.');
      }
      
      // Limpiar posibles undefined
      const cleanHorario = JSON.parse(JSON.stringify(horario));

      const userRef = doc(db, 'usuarios', docenteId);
      await setDoc(userRef, { horario: cleanHorario }, { merge: true });
      alert('Horario guardado correctamente.');
    } catch (error) {
      console.error('Error detallado al guardar horario:', error);
      alert(`Error al guardar el horario: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleAddDiaInhabil = () => {
    if (!nuevoDiaInhabil) return;
    const updated = addCustomCalendarSuspension(nuevoDiaInhabil, motivoInhabil);
    setDiasInhabiles(updated);
    setNuevoDiaInhabil('');
    setMotivoInhabil('');
  };

  const handleRemoveDiaInhabil = (fecha) => {
    const updated = removeCustomCalendarSuspension(fecha);
    setDiasInhabiles(updated);
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fadeIn">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-blue-100 dark:bg-blue-900/40 rounded-xl">
          <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-outfit font-bold text-slate-800 dark:text-white">
            Asignación de Horarios y Calendario
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Gestiona los horarios de entrada/salida de los docentes y los días inhábiles.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Columna Izquierda: Lista de Docentes */}
        <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-800">
          <h2 className="text-sm font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <User className="w-4 h-4" /> Seleccionar Docente
          </h2>
          <div className="space-y-2 overflow-y-auto max-h-[500px] pr-2">
            {docentes.map(d => (
              <button
                key={d.id}
                onClick={() => handleSelectDocente(d)}
                className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all flex items-center gap-3
                  ${selectedDocente?.id === d.id 
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50 border' 
                    : 'bg-slate-50 dark:bg-slate-800/50 border-transparent border hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
              >
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold shrink-0">
                  {(d.name || d.username || 'D').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-slate-800 dark:text-white truncate">{d.name || d.username}</p>
                    {d.horario ? (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 rounded-md whitespace-nowrap">
                        Guardado
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 rounded-md whitespace-nowrap">
                        Por defecto
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 truncate uppercase">{d.assignedGroup || 'Sin Grupo'}</p>
                </div>
              </button>
            ))}
            {docentes.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-4">No hay docentes registrados.</p>
            )}
          </div>
        </div>

        {/* Columna Central: Horarios */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-800">
            <h2 className="text-sm font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4" /> 
              {selectedDocente ? `Horario de ${selectedDocente.name || selectedDocente.username}` : 'Horario Semanal'}
            </h2>

            {!selectedDocente ? (
              <div className="h-64 flex items-center justify-center text-sm text-slate-500 dark:text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                Selecciona un docente para asignar su horario.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {DIAS.map(dia => (
                    <div key={dia} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/50">
                      <div className="font-bold text-sm text-slate-700 dark:text-slate-300 mb-3">{dia}</div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Entrada</label>
                          <input 
                            type="time" 
                            value={horario[dia]?.entrada || '13:00'}
                            onChange={(e) => handleHorarioChange(dia, 'entrada', e.target.value)}
                            className="w-full bg-white dark:bg-[#1c1c1e] border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Salida</label>
                          <input 
                            type="time" 
                            value={horario[dia]?.salida || '18:00'}
                            onChange={(e) => handleHorarioChange(dia, 'salida', e.target.value)}
                            className="w-full bg-white dark:bg-[#1c1c1e] border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-800">
                  <button
                    onClick={handleSaveHorario}
                    disabled={saving}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? 'Guardando...' : 'Guardar Horario'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Días Inhábiles */}
          <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-800">
            <h2 className="text-sm font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <CalendarX2 className="w-4 h-4" /> Días Inhábiles (Festivos / Suspensión)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Estos días se omitirán automáticamente en el cálculo de inasistencias. (Los fines de semana se omiten por defecto).
            </p>

            <div className="flex flex-wrap gap-3 mb-6 items-end">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Fecha</label>
                <input 
                  type="date" 
                  value={nuevoDiaInhabil}
                  onChange={(e) => setNuevoDiaInhabil(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Motivo (Opcional)</label>
                <input 
                  type="text" 
                  placeholder="Ej. Consejo Técnico, Festivo..."
                  value={motivoInhabil}
                  onChange={(e) => setMotivoInhabil(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <button
                onClick={handleAddDiaInhabil}
                className="bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 dark:hover:bg-slate-600 text-white px-4 py-2.5 rounded-lg font-bold text-sm transition-colors whitespace-nowrap h-[38px]"
              >
                Agregar
              </button>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {diasInhabiles.map(d => (
                <div key={d.dateStr} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700/50">
                  <div>
                    <span className="font-bold text-sm text-slate-700 dark:text-slate-300">
                      {new Date(d.dateStr + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                    <span className="ml-3 text-xs text-slate-500">{d.reason}</span>
                  </div>
                  <button
                    onClick={() => handleRemoveDiaInhabil(d.dateStr)}
                    className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {diasInhabiles.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-4">No hay días inhábiles registrados.</p>
              )}
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
