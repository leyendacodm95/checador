import React, { useState } from 'react';
import { Search, Calendar, Edit3, ChevronLeft, ChevronRight, ChevronDown, Trash2, QrCode, FileText } from 'lucide-react';
import { ObservationModal } from './ObservationModal';
import { ProfileModal } from '../common/ProfileModal';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';
import { StudentQRModal } from '../alumnos/StudentQRModal';
import { EditStudentModal } from '../alumnos/EditStudentModal';
import { useAuth } from '../../context/AuthContext';

export function AttendanceTable({ students, onUpdateStudent, onDeleteStudent }) {
  const { user } = useAuth();
  const isDirector = ['director', 'directora'].includes((user?.baseRole || user?.role || '').toLowerCase().trim());

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrado, setSelectedGrado] = useState('');
  const [selectedGrupo, setSelectedGrupo] = useState('');
  const [selectedDate, setSelectedDate] = useState('2026-07-23');
  const [editingStudent, setEditingStudent] = useState(null);
  const [fullEditingStudent, setFullEditingStudent] = useState(null);
  const [selectedStudentQR, setSelectedStudentQR] = useState(null);
  const [deletingStudent, setDeletingStudent] = useState(null);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Filtering logic
  const filteredStudents = students.filter(student => {
    const matchesName = (student.nombre || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGrado = selectedGrado === '' || student.grado === selectedGrado;
    const matchesGrupo = selectedGrupo === '' || student.grupo === selectedGrupo;
    return matchesName && matchesGrado && matchesGrupo;
  });

  const getBadgeStyle = (estado) => {
    switch (estado) {
      case 'PRESENTE':
      case 'TARDÍO':
        return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30';
      case 'AUSENTE':
        return 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  // Dynamic Pagination logic
  const ITEMS_PER_PAGE = 7;
  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
  const paginatedStudents = filteredStudents.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden mt-6 transition-colors duration-200">
      {/* Top Filter Bar */}
      <div className="p-4 md:p-6 border-b border-slate-200/80 dark:border-slate-850/60 grid grid-cols-1 md:grid-cols-12 gap-3 items-center bg-slate-50/50 dark:bg-slate-900/30">
        {/* Search Input */}
        <div className="md:col-span-5 relative">
          <input
            type="text"
            placeholder="Buscar alumno..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none dark:text-white placeholder-slate-400 transition-all"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
        </div>

        {/* Filters Group */}
        <div className="md:col-span-7 flex flex-wrap md:flex-nowrap items-center gap-2.5 justify-end">
          {/* Grado Select */}
          <div className="relative min-w-[100px]">
            <select
              value={selectedGrado}
              onChange={(e) => {
                setSelectedGrado(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full appearance-none pl-4 pr-8 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none cursor-pointer transition-all"
            >
              <option value="">Grado</option>
              <option value="1°">1°</option>
              <option value="2°">2°</option>
              <option value="3°">3°</option>
              <option value="4°">4°</option>
              <option value="5°">5°</option>
              <option value="6°">6°</option>
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3.5 pointer-events-none" />
          </div>

          {/* Grupo Select */}
          <div className="relative min-w-[100px]">
            <select
              value={selectedGrupo}
              onChange={(e) => {
                setSelectedGrupo(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full appearance-none pl-4 pr-8 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none cursor-pointer transition-all"
            >
              <option value="">Grupo</option>
              <option value="A">A</option>
              <option value="B">B</option>
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3.5 pointer-events-none" />
          </div>

          {/* Date Picker */}
          <div className="relative min-w-[140px]">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full pl-4 pr-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none cursor-pointer transition-all"
            />
          </div>
        </div>
      </div>

      {/* VISTA MÓVIL - TARJETAS RESPONSIVAS */}
      <div className="sm:hidden p-3 space-y-3 bg-slate-50/50 dark:bg-transparent">
        {paginatedStudents.length > 0 ? (
          paginatedStudents.map((student) => {
            const normalizedState = student.estado === 'TARDÍO' ? 'PRESENTE' : student.estado;
            const isLate = false;
            let ringColor = 'ring-2 ring-slate-100 dark:ring-slate-750';
            if (normalizedState === 'PRESENTE') ringColor = 'ring-2 ring-emerald-400 dark:ring-emerald-500';
            else if (normalizedState === 'AUSENTE') ringColor = 'ring-2 ring-rose-400 dark:ring-rose-500';

            return (
              <div key={student.id} className="bg-white dark:bg-[#1e293b] rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm transition hover:shadow-md mb-3">
                <div className="flex items-start justify-between">
                  <div className="flex gap-3">
                    <div
                      onClick={() => setSelectedProfile({ data: student, type: 'alumno' })}
                      className={`w-12 h-12 rounded-full bg-blue-500/10 text-blue-500 font-bold flex items-center justify-center text-lg shrink-0 cursor-pointer ${ringColor}`}
                    >
                      {(student.nombre || "").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex flex-col">
                      <span
                        onClick={() => setSelectedProfile({ data: student, type: 'alumno' })}
                        className="font-bold text-[15px] text-slate-900 dark:text-white cursor-pointer hover:text-blue-600 hover:underline"
                      >
                        {student.nombre}
                      </span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                          {student.grado} {student.grupo} • {student.horaEntrada || '13:00'}
                        </span>
                        {(student.retardosAcumulados || 0) >= 5 && (
                          <span
                            onClick={() => setSelectedProfile({ data: student, type: 'alumno' })}
                            className="px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-[9px] font-black cursor-pointer inline-flex items-center gap-1 shadow-sm"
                          >
                            🚨 Cita ({student.retardosAcumulados})
                          </span>
                        )}
                      </div>
                      <span className="text-slate-400 dark:text-slate-500 text-[10px] font-mono mt-0.5">
                        {student.qrCode}
                      </span>
                    </div>
                  </div>
                  <span className={`shrink-0 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getBadgeStyle(normalizedState)}`}>
                    {normalizedState}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-1 min-[360px]:gap-2 w-full mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/50">
                  <div className="flex gap-1 min-[360px]:gap-2 shrink-0">
                    <button
                      onClick={() => onUpdateStudent?.({ ...student, estado: 'PRESENTE' })}
                      className={`w-10 h-10 rounded-xl font-black text-sm flex items-center justify-center transition active:scale-95 ${
                        normalizedState === 'PRESENTE' 
                          ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' 
                          : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                      }`}
                    >
                      P
                    </button>
                    <button
                      onClick={() => onUpdateStudent?.({ ...student, estado: 'AUSENTE' })}
                      className={`w-10 h-10 rounded-xl font-black text-sm flex items-center justify-center transition active:scale-95 ${
                        normalizedState === 'AUSENTE' 
                          ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20' 
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20'
                      }`}
                    >
                      A
                    </button>
                  </div>

                  <div className="flex gap-1 min-[360px]:gap-2 shrink-0">
                    <button
                      onClick={() => setEditingStudent(student)}
                      title="Justificar retardo / Editar observación"
                      className="w-10 h-10 rounded-xl text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition flex items-center justify-center bg-amber-500/10"
                    >
                      <FileText size={18} />
                    </button>
                    
                    <button
                      onClick={() => setFullEditingStudent(student)}
                      title="Editar alumno"
                      className="w-10 h-10 rounded-xl text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition flex items-center justify-center bg-blue-500/10"
                    >
                      <Edit3 size={18} />
                    </button>

                    <button
                      onClick={() => setSelectedStudentQR(student)}
                      title="Ver Código QR"
                      className="w-10 h-10 rounded-xl text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition flex items-center justify-center bg-emerald-500/10"
                    >
                      <QrCode size={18} />
                    </button>

                    {onDeleteStudent && isDirector && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingStudent(student);
                        }}
                        title="Dar de baja alumno del sistema"
                        className="w-10 h-10 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 transition-all flex flex-col items-center justify-center gap-[2px] leading-none"
                      >
                        <span className="text-[9px] font-black uppercase tracking-tight">Dar de</span>
                        <span className="text-[9px] font-black uppercase tracking-tight">baja</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-center text-xs text-slate-450 dark:text-slate-400 font-semibold py-6">
            No se encontraron alumnos con los filtros seleccionados.
          </p>
        )}
      </div>

      {/* Table Content */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-900/30">
              <th className="py-4 px-6 font-outfit">Alumno</th>
              <th className="py-4 px-6 font-outfit">Hora de escaneo QR</th>
              <th className="py-4 px-6 text-center font-outfit">Estado</th>
              <th className="py-4 px-6 font-outfit">Observaciones / Justificante</th>
              <th className="py-4 px-6 text-center font-outfit">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
            {paginatedStudents.length > 0 ? (
              paginatedStudents.map((student) => {
                const normalizedState = student.estado === 'TARDÍO' ? 'PRESENTE' : student.estado;
                const isLate = false;

                let ringColor = 'ring-2 ring-slate-100 dark:ring-slate-750';
                if (normalizedState === 'PRESENTE') ringColor = 'ring-2 ring-emerald-400 dark:ring-emerald-500';
                else if (normalizedState === 'AUSENTE') ringColor = 'ring-2 ring-rose-400 dark:ring-rose-500';

                return (
                  <tr
                    key={student.id}
                    className="hover:bg-slate-50/30 dark:hover:bg-slate-800/20 transition-colors"
                  >
                    {/* Alumno Name & Avatar */}
                    <td className="py-4 px-6 font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                      <div
                        onClick={() => setSelectedProfile({ data: student, type: 'alumno' })}
                        title="Haz clic para ver perfil del alumno"
                        className={`w-9 h-9 rounded-full bg-blue-500/10 text-blue-500 font-bold flex items-center justify-center text-xs cursor-pointer hover:scale-110 transition-all ${ringColor}`}
                      >
                        {(student.nombre || "").slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <span
                          onClick={() => setSelectedProfile({ data: student, type: 'alumno' })}
                          className="cursor-pointer hover:text-[#2b66f6] dark:hover:text-blue-400 hover:underline font-outfit"
                        >
                          {student.nombre}
                        </span>
                        <span className="text-xs text-gray-400 ml-2 font-normal">
                          ({student.grado} {student.grupo})
                        </span>
                        {(student.retardosAcumulados || 0) >= 5 && (
                          <span
                            onClick={() => setSelectedProfile({ data: student, type: 'alumno' })}
                            title="Ha acumulado 5 o más retardos. Pasar con docente."
                            className="ml-2 px-2 py-0.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-[9px] font-black cursor-pointer inline-flex items-center gap-1 shadow-sm"
                          >
                            🚨 Cita Docente ({student.retardosAcumulados})
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Hora de escaneo QR */}
                    <td className="py-4 px-6 font-mono text-xs">
                      {isLate ? (
                        <span className="text-rose-600 dark:text-rose-400 font-extrabold flex items-center gap-1.5">
                          <span>{student.horaEntrada}</span>
                          <span className="text-[9px] font-sans font-black bg-rose-500/10 px-1.5 py-0.5 rounded-md border border-rose-500/20">
                            Tarde
                          </span>
                        </span>
                      ) : (
                        <span className="text-gray-600 dark:text-gray-300 font-bold">
                          {student.horaEntrada}
                        </span>
                      )}
                    </td>

                    {/* Estado Pill Badge */}
                    <td className="py-4 px-6 text-center">
                      <span
                        className={`inline-block px-3 py-1 rounded-xl text-[10px] font-black tracking-wider ${getBadgeStyle(
                          normalizedState
                        )}`}
                      >
                        {normalizedState}
                      </span>
                    </td>

                    {/* Observaciones */}
                    <td className="py-4 px-6 text-gray-600 dark:text-gray-300 text-xs">
                      {student.observaciones && student.observaciones !== '—' ? (
                        <span className="px-2.5 py-1 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200/50 dark:border-sky-800 text-sky-700 dark:text-sky-300 font-extrabold inline-block shadow-sm">
                          {student.observaciones}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic">—</span>
                      )}
                    </td>

                    {/* Action Icon */}
                    <td className="py-4 px-6 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setEditingStudent(student)}
                          title="Justificar retardo / Editar observación"
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl text-[11px] font-black text-[#2b66f6] dark:text-blue-300 bg-blue-50/80 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all duration-300 bouncy-hover-sm shadow-sm border border-blue-200/40 dark:border-blue-900/35"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Justificar</span>
                        </button>
                        
                        <button
                          onClick={() => setFullEditingStudent(student)}
                          title="Editar alumno"
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl text-[11px] font-black text-amber-600 dark:text-amber-300 bg-amber-50/80 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-all duration-300 shadow-sm border border-amber-200/40"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Editar</span>
                        </button>

                        <button
                          onClick={() => setSelectedStudentQR(student)}
                          title="Ver QR"
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl text-[11px] font-black text-emerald-600 dark:text-emerald-300 bg-emerald-50/80 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-all duration-300 shadow-sm border border-emerald-200/40"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                        </button>

                        {/* Dar de baja Student (Director/a only) */}
                        {onDeleteStudent && isDirector && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingStudent(student);
                            }}
                            title="Dar de baja alumno del sistema"
                            className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold transition-all active:scale-95 flex items-center gap-1"
                          >
                            <span>Dar de baja</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="5" className="py-8 text-center text-gray-400 dark:text-gray-500 font-bold italic">
                  No se encontraron alumnos con los filtros seleccionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Dynamic Functional Pagination Footer */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/20 dark:bg-slate-900/10 flex items-center justify-between text-xs font-bold text-slate-500">
          <span className="text-[11px] text-slate-400">
            Mostrando página <strong>{safeCurrentPage}</strong> de <strong>{totalPages}</strong> ({filteredStudents.length} alumnos totales)
          </span>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safeCurrentPage === 1}
              className="px-3.5 py-1.5 rounded-xl border border-slate-250 dark:border-slate-700 text-slate-750 dark:text-slate-350 hover:bg-slate-100/35 dark:hover:bg-slate-800/30 disabled:opacity-30 transition font-bold"
            >
              Anterior
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`w-8 h-8 rounded-xl font-bold flex items-center justify-center transition ${
                  safeCurrentPage === pageNum
                    ? 'bg-[#2b66f6] text-white shadow-xs'
                    : 'border border-slate-250 dark:border-slate-700 text-slate-750 dark:text-slate-350 hover:bg-slate-100/35 dark:hover:bg-slate-800/30'
                }`}
              >
                {pageNum}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safeCurrentPage === totalPages}
              className="px-3.5 py-1.5 rounded-xl border border-slate-250 dark:border-slate-700 text-slate-750 dark:text-slate-350 hover:bg-slate-100/35 dark:hover:bg-slate-800/30 disabled:opacity-30 transition font-bold"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {/* Observation Modal */}
      <ObservationModal
        student={editingStudent}
        isOpen={!!editingStudent}
        onClose={() => setEditingStudent(null)}
        onSave={onUpdateStudent}
      />

      {/* Profile Modal (Large Photo & Information Box) */}
      <ProfileModal
        data={selectedProfile?.data}
        type={selectedProfile?.type}
        isOpen={!!selectedProfile}
        onClose={() => setSelectedProfile(null)}
      />

      <EditStudentModal
        student={fullEditingStudent}
        isOpen={!!fullEditingStudent}
        onClose={() => setFullEditingStudent(null)}
        onSave={(id, data) => onUpdateStudent?.(id, data)}
      />

      <StudentQRModal
        student={selectedStudentQR}
        isOpen={!!selectedStudentQR}
        onClose={() => setSelectedStudentQR(null)}
        onSave={(id, data) => onUpdateStudent?.(id, data)}
      />

      {/* Confirm Delete Student Modal */}
      <ConfirmDeleteModal
        isOpen={!!deletingStudent}
        title="¿Dar de baja a Alumno?"
        message={`¿Estás seguro de dar de baja a ${deletingStudent?.nombre} del sistema?`}
        onConfirm={(reason) => {
          if (deletingStudent) onDeleteStudent(deletingStudent.id, reason);
        }}
        onClose={() => setDeletingStudent(null)}
      />
    </div>
  );
}
