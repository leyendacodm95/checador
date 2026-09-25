import React, { useState, useEffect } from 'react';
import { Search, QrCode, UserPlus, Edit3, UserCheck, Trash2, Camera, GraduationCap, FileText, AlertTriangle, X } from 'lucide-react';
import { StudentQRModal } from './StudentQRModal';
import { EditStudentModal } from './EditStudentModal';
import { EditTeacherModal } from './EditTeacherModal';
import { ProfileModal } from '../common/ProfileModal';
import { ObservationModal } from '../dashboard/ObservationModal';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';
import { PromoteGradeModal } from './PromoteGradeModal';
import { ScanStudentListModal } from './ScanStudentListModal';
import { useAuth } from '../../context/AuthContext';
import bcrypt from 'bcryptjs';
import { calcularEdadCorte, validarCURP, sugerirCurpIA } from '../../lib/curpUtils';

export function AlumnosView({ students = [], teachers = {}, onAddStudent, onUpdateStudent, onDeleteStudent, onUpdateTeacher, onPromoteGradeCycle }) {
  const { user, users } = useAuth();
  const [activeGrade, setActiveGrade] = useState('1°');

  useEffect(() => {
    if (user?.assignedGroup && user.assignedGroup !== 'Ninguno' && user.assignedGroup !== 'Sin Grupo') {
      const grade = user.assignedGroup.split('-')[0];
      if (['1°', '2°', '3°', '4°', '5°', '6°'].includes(grade)) {
        setActiveGrade(grade);
      }
    }
  }, [user]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudentQR, setSelectedStudentQR] = useState(null);
  const [editingStudent, setEditingStudent] = useState(null);
  const [justifyingStudent, setJustifyingStudent] = useState(null);
  const [deletingStudent, setDeletingStudent] = useState(null);
  const [editingTeacherGroup, setEditingTeacherGroup] = useState(null);
  const [selectedProfile, setSelectedProfile] = useState(null);

  // Group Security Authorization state
  const [authPendingAction, setAuthPendingAction] = useState(null);
  const [authPasswordInput, setAuthPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');

  // Create Student State
  const [showAddModal, setShowAddModal] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
  const [newNombre, setNewNombre] = useState('');
  const [newGrupo, setNewGrupo] = useState('A');
  const [newTelefono, setNewTelefono] = useState('');
  const [showPromoteModal, setShowPromoteModal] = useState(false);

  const [newFechaNacimiento, setNewFechaNacimiento] = useState('');
  const [newCurp, setNewCurp] = useState('');
  const [newCurpPorValidar, setNewCurpPorValidar] = useState(0);
  const [newSexo, setNewSexo] = useState('H');
  const [errorCurpAdd, setErrorCurpAdd] = useState('');
  const currentYear = new Date().getFullYear();

  const handleSugerirCurpAdd = () => {
    if (!newNombre.trim() || !newFechaNacimiento) {
      alert('Por favor ingrese el nombre del alumno y la fecha de nacimiento para el cálculo automático.');
      return;
    }
    const res = sugerirCurpIA({
      nombreCompleto: newNombre,
      fechaNacimiento: newFechaNacimiento,
      sexo: newSexo,
      estado: 'NT'
    });

    if (res.success) {
      setNewCurp(res.curp);
      setNewCurpPorValidar(1);
      setErrorCurpAdd('');
    } else {
      alert(res.error || 'No se pudo generar el cálculo automático.');
    }
  };

  const resetAddForm = () => {
    setNewNombre('');
    setNewFechaNacimiento('');
    setNewCurp('');
    setNewCurpPorValidar(0);
    setNewSexo('H');
    setErrorCurpAdd('');
  };

  const userRoleLower = (user?.role || user?.baseRole || '').toLowerCase().trim();
  const isDirectorOrSub = ['director', 'directora', 'subdirector', 'subdirectora'].includes(userRoleLower);
  const isDirector = ['director', 'directora'].includes(userRoleLower);

  const handleRequestGroupAction = (actionType, targetGrade, targetGroup = 'A') => {
    const targetGroupKey = `${targetGrade}-${targetGroup}`;
    const userGroupKey = user?.assignedGroup || Object.entries(teachers || {}).find(([k, v]) => {
      const name = typeof v === 'object' ? v.nombre : v;
      return name && user?.name && name.toLowerCase().includes(user.name.toLowerCase());
    })?.[0] || '1°-A';

    const isOwner = userGroupKey === targetGroupKey;

    if (isDirectorOrSub || isOwner) {
      if (actionType === 'scan') setShowScanModal(true);
      else if (actionType === 'add') setShowAddModal(true);
    } else {
      setAuthPendingAction({ actionType, targetGroupKey });
      setAuthPasswordInput('');
      setAuthError('');
    }
  };

  const handleRequestStudentAction = (actionType, s) => {
    const targetGroupKey = `${s.grado}-${s.grupo}`;
    const userGroupKey = user?.assignedGroup || Object.entries(teachers || {}).find(([k, v]) => {
      const name = typeof v === 'object' ? v.nombre : v;
      return name && user?.name && name.toLowerCase().includes(user.name.toLowerCase());
    })?.[0] || '1°-A';

    const isOwner = userGroupKey === targetGroupKey;

    if (isDirectorOrSub || isOwner) {
      if (actionType === 'edit') setEditingStudent(s);
      else if (actionType === 'justify') setJustifyingStudent(s);
      else if (actionType === 'delete') setDeletingStudent(s);
    } else {
      setAuthPendingAction({ actionType, student: s, targetGroupKey });
      setAuthPasswordInput('');
      setAuthError('');
    }
  };

  const handleVerifyGroupAuth = (e) => {
    e.preventDefault();
    setAuthError('');
    if (!authPendingAction) return;

    const { actionType, student, targetGroupKey } = authPendingAction;

    const targetUser = users.find(u => u.assignedGroup === targetGroupKey);
    const targetTeacherVal = teachers[targetGroupKey];
    const targetTeacherName = typeof targetTeacherVal === 'object' ? targetTeacherVal.nombre : (targetTeacherVal || 'Docente Titular');

    const validPasswords = [
      targetUser?.password,
      typeof targetTeacherVal === 'object' ? targetTeacherVal?.password : null,
      users.find(u => ['director','directora','subdirector','subdirectora'].includes((u.role || u.baseRole || '').toLowerCase().trim()))?.password
    ].filter(Boolean);

    const cleanPass = authPasswordInput.trim();
    let isValid = false;
    
    for (const storedPass of validPasswords) {
      if (storedPass.startsWith('$2a$') || storedPass.startsWith('$2b$')) {
        if (bcrypt.compareSync(cleanPass, storedPass)) {
          isValid = true;
          break;
        }
      } else {
        if (storedPass === cleanPass) {
          isValid = true;
          break;
        }
      }
    }

    if (isValid) {
      if (actionType === 'edit') setEditingStudent(student);
      else if (actionType === 'justify') setJustifyingStudent(student);
      else if (actionType === 'delete') setDeletingStudent(student);
      else if (actionType === 'scan') setShowScanModal(true);
      else if (actionType === 'add') setShowAddModal(true);
      setAuthPendingAction(null);
      setAuthPasswordInput('');
    } else {
      setAuthError(`🔒 Contraseña incorrecta. Se requiere la contraseña del docente a cargo del Grupo ${targetGroupKey} (${targetTeacherName}) para autorizar cambios.`);
    }
  };

  const grades = ['1°', '2°', '3°', '4°', '5°', '6°'];
  const groupsList = ['A', 'B'];

  const normalizeStr = (str) => {
    if (!str) return '';
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  };

  // Filter students by active grade tab and search term
  const gradeStudents = students.filter(s => s.grado === activeGrade);
  const filteredStudents = gradeStudents.filter(s =>
    normalizeStr(s.nombre).includes(normalizeStr(searchTerm))
  );

  const handleCreateStudent = (e) => {
    e.preventDefault();
    if (!newNombre.trim()) return;

    if (!newFechaNacimiento) {
      alert('La Fecha de Nacimiento es un campo obligatorio.');
      return;
    }

    const cleanCurp = newCurp.trim().toUpperCase();
    if (cleanCurp && !validarCURP(cleanCurp)) {
      setErrorCurpAdd('La CURP debe tener exactamente 18 caracteres en formato oficial.');
      return;
    }

    const edad_corte = calcularEdadCorte(newFechaNacimiento, currentYear);

    const newStudent = {
      id: String(Date.now()),
      nombre: newNombre.trim(),
      grado: activeGrade,
      grupo: newGrupo,
      fecha_nacimiento: newFechaNacimiento,
      curp: cleanCurp,
      edad_corte: edad_corte,
      curp_por_validar: newCurpPorValidar,
      horaEntrada: '13:00',
      estado: 'PRESENTE',
      observaciones: '—',
      qrCode: `STUDENT-${newNombre.slice(0, 2).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`
    };

    const result = onAddStudent(newStudent);
    if (result === true) {
      resetAddForm();
      setShowAddModal(false);
    } else if (result !== false) {
      // Es un duplicado
      alert(`⚠️ ¡Atención! El alumno/a "${newStudent.nombre}" ya está registrado/a en el grupo ${result.grado} ${result.grupo}.`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Title & Add Student Action */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="w-full sm:w-auto">
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-gray-900 dark:text-white leading-tight">
            Gestión de Alumnos y Grupos
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
            Clasificación por año escolar (1° a 6° Grado), asignación de docentes a cargo y edición de perfil.
          </p>
        </div>

        <div className="flex flex-col xs:flex-row sm:flex-wrap w-full sm:w-auto items-stretch sm:items-center gap-2">
          {isDirectorOrSub && onPromoteGradeCycle && (
            <button
              onClick={() => setShowPromoteModal(true)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-emerald-500/20 transition-all w-full sm:w-auto"
              title="Gradúa a los alumnos de 6° y promueve automáticamente los alumnos de 1° a 5° al siguiente grado"
            >
              <GraduationCap className="w-4 h-4 shrink-0" />
              <span className="truncate">Promoción Fin de Ciclo</span>
            </button>
          )}

          <div className="grid grid-cols-2 sm:flex gap-2 w-full sm:w-auto">
            <button
              onClick={() => handleRequestGroupAction('scan', activeGrade)}
              className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-[11px] sm:text-sm font-semibold rounded-xl shadow-md shadow-indigo-500/20 transition-all"
            >
              <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="truncate">Escanear Lista</span>
            </button>

            <button
              onClick={() => handleRequestGroupAction('add', activeGrade)}
              className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-[11px] sm:text-sm font-semibold rounded-xl shadow-md shadow-blue-500/20 transition-all"
            >
              <UserPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="truncate">Agregar Alumno</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grade Tabs (1° Grado to 6° Grado) */}
      <div className="bg-white dark:bg-[#182234] p-2 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex items-center gap-1.5 overflow-x-auto">
        {grades.map((grade) => {
          const isActive = activeGrade === grade;
          const count = students.filter(s => s.grado === grade).length;

          return (
            <button
              key={grade}
              onClick={() => setActiveGrade(grade)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>{grade} Grado</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                isActive ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <input
          type="text"
          placeholder={`Buscar en ${activeGrade} Grado por nombre...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-[#182234] border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white shadow-sm"
        />
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
      </div>

      {/* Group Sections (Grupo A, Grupo B, Grupo C) */}
      <div className="space-y-6">
        {groupsList.map((grupoLetter) => {
          const groupKey = `${activeGrade}-${grupoLetter}`;
          const rawTeacher = teachers[groupKey];
          const teacherName = typeof rawTeacher === 'object' ? rawTeacher.nombre : (rawTeacher || 'Sin docente asignado');
          const teacherFoto = typeof rawTeacher === 'object' ? rawTeacher.foto : '';
          const groupStudents = filteredStudents.filter(s => s.grupo === grupoLetter);

          const teacherDataForModal = typeof rawTeacher === 'object'
            ? { ...rawTeacher, key: groupKey }
            : { nombre: teacherName, key: groupKey };

          return (
            <div
              key={grupoLetter}
              className="bg-white dark:bg-[#182234] border border-gray-200/80 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden"
            >
              {/* Group Header with Teacher Info & Photo */}
              <div className="p-4 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span
                    onClick={() => setSelectedProfile({ data: teacherDataForModal, type: 'docente' })}
                    title="Haz clic para ver perfil del docente"
                    className="w-10 h-10 rounded-xl bg-blue-600 text-white font-black text-lg flex items-center justify-center shadow-md cursor-pointer hover:scale-105 transition-transform"
                  >
                    {grupoLetter}
                  </span>
                  <div>
                    <h3 className="text-base font-extrabold text-gray-900 dark:text-white">
                      Grupo {activeGrade} "{grupoLetter}"
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Docente a cargo: <strong>{teacherName}</strong></span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setEditingTeacherGroup({ key: groupKey, teacher: rawTeacher })}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 text-xs font-bold transition"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Editar Docente</span>
                </button>
              </div>

              {/* VISTA MÓVIL - TARJETAS RESPONSIVAS */}
              <div className="sm:hidden p-3 space-y-3 bg-gray-50/50 dark:bg-transparent">
                {groupStudents.length > 0 ? (
                  groupStudents.map((s) => (
                  <div key={s.id} className="bg-white dark:bg-[#1e293b] rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm transition hover:shadow-md mb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex gap-3">
                        <div
                          onClick={() => setSelectedProfile({ data: s, type: 'alumno' })}
                          className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-500 font-bold flex items-center justify-center text-lg shrink-0 cursor-pointer"
                        >
                          {(s.nombre || "??").slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span
                            onClick={() => setSelectedProfile({ data: s, type: 'alumno' })}
                            className="font-bold text-[15px] text-slate-900 dark:text-white cursor-pointer hover:text-blue-600 hover:underline"
                          >
                            {s.nombre}
                          </span>
                          <span className="text-slate-500 dark:text-slate-400 text-[11px] mt-1">
                            {s.grado} {s.grupo} • {s.horaEntrada || '13:00'}
                          </span>
                          <span className="text-slate-400 dark:text-slate-500 text-[10px] font-mono mt-0.5">
                            {s.qrCode}
                          </span>
                        </div>
                      </div>
                      <span className={`shrink-0 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        s.estado === 'PRESENTE' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                      }`}>
                        {s.estado}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-1 min-[360px]:gap-2 w-full mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/50">
                      <div className="flex gap-1 min-[360px]:gap-2 shrink-0">
                        <button
                          onClick={() => onUpdateStudent?.({ ...s, estado: 'PRESENTE' })}
                          className={`w-10 h-10 rounded-xl font-black text-sm flex items-center justify-center transition active:scale-95 ${
                            s.estado === 'PRESENTE' 
                              ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' 
                              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                          }`}
                        >
                          P
                        </button>
                        <button
                          onClick={() => onUpdateStudent?.({ ...s, estado: 'AUSENTE' })}
                          className={`w-10 h-10 rounded-xl font-black text-sm flex items-center justify-center transition active:scale-95 ${
                            s.estado === 'AUSENTE' 
                              ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20' 
                              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20'
                          }`}
                        >
                          A
                        </button>
                      </div>

                      <div className="flex gap-1 min-[360px]:gap-2 shrink-0">
                        <button
                          onClick={() => handleRequestStudentAction('justify', s)}
                          title="Justificar Inasistencia"
                          className="w-10 h-10 rounded-xl text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition flex items-center justify-center bg-amber-500/10"
                        >
                          <FileText size={18} />
                        </button>

                        <button
                          onClick={() => handleRequestStudentAction('edit', s)}
                          title="Editar alumno"
                          className="w-10 h-10 rounded-xl text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition flex items-center justify-center bg-blue-500/10"
                        >
                          <Edit3 size={18} />
                        </button>

                        <button
                          onClick={() => setSelectedStudentQR(s)}
                          title="Ver Código QR"
                          className="w-10 h-10 rounded-xl text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition flex items-center justify-center bg-emerald-500/10"
                        >
                          <QrCode size={18} />
                        </button>

                        {isDirector && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRequestStudentAction('delete', s);
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
                ))
                ) : (
                  <p className="text-center text-xs text-gray-400 py-6">
                    No hay alumnos registrados en el Grupo {grupoLetter} de {activeGrade} Grado.
                  </p>
                )}
              </div>

              {/* VISTA ESCRITORIO - TABLA */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800 text-xs font-bold text-gray-500 dark:text-gray-400">
                      <th className="py-3.5 px-6">Alumno</th>
                      <th className="py-3.5 px-6">Matrícula QR</th>
                      <th className="py-3.5 px-6 text-center">Estado Pase Lista</th>
                      <th className="py-3.5 px-6 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60 text-sm">
                    {groupStudents.length > 0 ? (
                      groupStudents.map((s) => (
                        <tr key={s.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition">
                          {/* Alumno Info */}
                          <td className="py-3.5 px-6 font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                            <div
                              onClick={() => setSelectedProfile({ data: s, type: 'alumno' })}
                              title="Haz clic para ver perfil"
                              className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-500 font-bold flex items-center justify-center text-xs cursor-pointer hover:scale-105 transition-transform"
                            >
                              {(s.nombre || "??").slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <span
                                onClick={() => setSelectedProfile({ data: s, type: 'alumno' })}
                                className="cursor-pointer hover:text-blue-600 hover:underline"
                              >
                                {s.nombre}
                              </span>
                              {(s.retardosAcumulados || 0) >= 5 && (
                                <span
                                  onClick={() => setSelectedProfile({ data: s, type: 'alumno' })}
                                  title="Ha acumulado 5 o más retardos. Pasar con docente."
                                  className="ml-2 px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-[10px] font-black cursor-pointer inline-flex items-center gap-1"
                                >
                                  🚨 Cita Docente ({s.retardosAcumulados})
                                </span>
                              )}
                              <span className="block text-[11px] text-gray-400 font-normal">
                                {s.grado} {s.grupo}
                              </span>
                            </div>
                          </td>

                          {/* Matrícula QR */}
                          <td className="py-3.5 px-6 font-mono text-xs text-gray-500 dark:text-gray-400">
                            {s.qrCode}
                          </td>

                          {/* Estado */}
                          <td className="py-3.5 px-6 text-center">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                              s.estado === 'PRESENTE' ? 'bg-emerald-500/15 text-emerald-500' : 'bg-rose-500/15 text-rose-500'
                            }`}>
                              {s.estado}
                            </span>
                          </td>

                          {/* Action Buttons */}
                          <td className="py-3.5 px-6 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {/* Justificar Retardo / Observación */}
                              <button
                                onClick={() => handleRequestStudentAction('justify', s)}
                                title="Justificar retardo o agregar observación"
                                className="p-1.5 rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition flex items-center gap-1 text-xs font-bold"
                              >
                                <FileText className="w-4 h-4" />
                              </button>

                              {/* Edit Profile */}
                              <button
                                onClick={() => handleRequestStudentAction('edit', s)}
                                title="Editar nombre de alumno"
                                className="p-1.5 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>

                              {/* View QR Code */}
                              <button
                                onClick={() => setSelectedStudentQR(s)}
                                title="Ver código QR del alumno"
                                className="p-1.5 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition"
                              >
                                <QrCode className="w-4 h-4" />
                              </button>

                              {/* Dar de baja Student (Director/a only) */}
                              {onDeleteStudent && isDirector && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRequestStudentAction('delete', s);
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
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" className="py-6 text-center text-gray-400 text-xs">
                          No hay alumnos registrados en el Grupo {grupoLetter} de {activeGrade} Grado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>

      {/* QR Modal */}
      <StudentQRModal
        student={selectedStudentQR}
        isOpen={!!selectedStudentQR}
        onClose={() => setSelectedStudentQR(null)}
      />

      {/* Edit Student Modal (Name, Photo Upload, Photo Delete) */}
      <EditStudentModal
        student={editingStudent}
        isOpen={!!editingStudent}
        onClose={() => setEditingStudent(null)}
        onSave={onUpdateStudent}
      />

      {/* Edit Teacher Modal */}
      {editingTeacherGroup && (
        <EditTeacherModal
          gradeGroupKey={editingTeacherGroup.key}
          currentTeacher={editingTeacherGroup.teacher}
          isOpen={!!editingTeacherGroup}
          onClose={() => setEditingTeacherGroup(null)}
          onSave={onUpdateTeacher}
        />
      )}

      {/* Scan Student List Modal */}
      <ScanStudentListModal
        isOpen={showScanModal}
        onClose={() => setShowScanModal(false)}
        activeGrade={activeGrade}
        onAddStudent={onAddStudent}
      />

      {/* Add Student Modal */}
      {showAddModal && (() => {
        const edadCorteAdd = calcularEdadCorte(newFechaNacimiento, currentYear);
        const esFueraDeRangoAdd = edadCorteAdd !== null && (edadCorteAdd < 5 || edadCorteAdd > 13);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white dark:bg-[#182234] rounded-2xl w-full max-w-lg border border-gray-200 dark:border-gray-700 shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => {
                  resetAddForm();
                  setShowAddModal(false);
                }}
                className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-lg font-black text-gray-900 dark:text-white mb-4">
                Registrar Nuevo Alumno en {activeGrade} Grado
              </h3>

              <form onSubmit={handleCreateStudent} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                    Nombres y Apellidos del Alumno <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newNombre}
                    onChange={(e) => setNewNombre(e.target.value)}
                    placeholder="Ej. Mateo Ramírez"
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Grupo</label>
                  <select
                    value={newGrupo}
                    onChange={(e) => setNewGrupo(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="A">Grupo A</option>
                    <option value="B">Grupo B</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                      Fecha de Nacimiento <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={newFechaNacimiento}
                      onChange={(e) => setNewFechaNacimiento(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                      Sexo (para CURP)
                    </label>
                    <select
                      value={newSexo}
                      onChange={(e) => setNewSexo(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="H">Hombre (H)</option>
                      <option value="M">Mujer (M)</option>
                    </select>
                  </div>
                </div>

                <div className="p-3 bg-blue-50/60 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40 rounded-xl text-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-blue-700 dark:text-blue-300 font-bold">
                    <span>Fecha de corte: 1 de septiembre del año en curso</span>
                  </div>
                  {edadCorteAdd !== null && !isNaN(edadCorteAdd) && (
                    <div className="text-gray-700 dark:text-gray-300 font-semibold pt-0.5">
                      Edad al 1 de septiembre de {currentYear}: <span className="font-extrabold text-blue-600 dark:text-blue-400">{edadCorteAdd} años</span>
                    </div>
                  )}
                </div>

                {esFueraDeRangoAdd && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2 animate-fadeIn">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <strong>⚠️ Alerta de Edad al Corte:</strong> La edad calculada al 1 de septiembre ({edadCorteAdd} años) está fuera del rango estándar de primaria (5 a 13 años).
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-gray-500 uppercase">
                    CURP (18 caracteres)
                  </label>
                  <input
                    type="text"
                    maxLength={18}
                    placeholder="Ej. PEMM200315MNTRRR01"
                    value={newCurp}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      setNewCurp(val);
                      setErrorCurpAdd('');
                      // Asumimos que si escribe manualmente y es de 18 caracteres, queda validada
                      if(val.length === 18 && validarCURP(val)) {
                         setNewCurpPorValidar(0);
                      }
                    }}
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-mono tracking-wider dark:text-white uppercase focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  
                  {newCurpPorValidar === 1 && (
                    <div className="mt-2 p-3 border rounded-xl bg-amber-500/10 border-amber-500/30 transition-colors">
                        <div className="flex items-center gap-2">
                            <input type="checkbox" id="curp-validada" 
                                   checked={false}
                                   onChange={(e) => { if(e.target.checked) setNewCurpPorValidar(0); }} 
                                   className="w-4 h-4 cursor-pointer text-emerald-600 bg-white border-gray-300 rounded focus:ring-emerald-500" />
                            <label htmlFor="curp-validada" className="text-xs font-bold text-amber-600 dark:text-amber-400 cursor-pointer select-none">
                                ⚠️ CURP pendiente de validación
                            </label>
                        </div>
                    </div>
                  )}
                  {newCurp && newCurpPorValidar === 0 && validarCURP(newCurp) && (
                    <div className="mt-2 p-3 border rounded-xl bg-emerald-500/10 border-emerald-500/30 transition-colors">
                        <div className="flex items-center gap-2">
                            <input type="checkbox" checked={true} readOnly className="w-4 h-4 cursor-pointer text-emerald-600 bg-white border-gray-300 rounded focus:ring-emerald-500" />
                            <label className="text-xs font-bold text-emerald-600 dark:text-emerald-400 cursor-pointer select-none">
                                ✅ CURP validada oficialmente
                            </label>
                        </div>
                    </div>
                  )}

                  {errorCurpAdd && (
                    <p className="text-[11px] font-bold text-rose-500 dark:text-rose-400">{errorCurpAdd}</p>
                  )}

                  <button
                    type="button"
                    onClick={handleSugerirCurpAdd}
                    className="w-full flex items-center justify-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-[11px] font-bold rounded-xl shadow-md transition"
                  >
                    <span>Cálculo Automático de CURP</span>
                  </button>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      resetAddForm();
                      setShowAddModal(false);
                    }}
                    className="px-4 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition"
                  >
                    Guardar Alumno
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}
      {/* Profile Modal (Large Photo & Information Box) */}
      <ProfileModal
        data={selectedProfile?.data}
        type={selectedProfile?.type}
        isOpen={!!selectedProfile}
        onClose={() => setSelectedProfile(null)}
      />

      {/* Observation / Justificación Modal */}
      <ObservationModal
        student={justifyingStudent}
        isOpen={!!justifyingStudent}
        onClose={() => setJustifyingStudent(null)}
        onSave={onUpdateStudent}
      />

      {/* Confirm Delete Student Modal */}
      <ConfirmDeleteModal
        isOpen={!!deletingStudent}
        title="¿Dar de baja a Alumno?"
        message={`¿Estás seguro de dar de baja a ${deletingStudent?.nombre} del sistema? Esta acción no se puede deshacer.`}
        onConfirm={(reason) => {
          if (deletingStudent) onDeleteStudent(deletingStudent.id, reason);
        }}
        onClose={() => setDeletingStudent(null)}
      />

      {/* Promote Grade Security Confirmation Modal */}
      <PromoteGradeModal
        isOpen={showPromoteModal}
        onClose={() => setShowPromoteModal(false)}
        onConfirm={onPromoteGradeCycle}
        currentUser={user}
      />

      {/* Group Security Authorization Modal for Inter-Teacher Modification */}
      {authPendingAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-[#182234] rounded-2xl w-full max-w-md border border-gray-200 dark:border-gray-700 shadow-2xl p-6 relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white font-outfit">
                  Autorización del Grupo {authPendingAction.targetGroupKey}
                </h3>
                <p className="text-xs text-slate-400">
                  Verificación de Seguridad Inter-Docente
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 mb-4 leading-relaxed font-medium">
              {authPendingAction.student ? (
                <>Estás intentando {authPendingAction.actionType === 'delete' ? 'eliminar' : 'modificar'} al alumno/a <strong>{authPendingAction.student.nombre}</strong> del <strong>Grupo {authPendingAction.targetGroupKey}</strong>. Para continuar, ingrese la contraseña del docente titular a cargo de este grupo.</>
              ) : (
                <>Estás intentando {authPendingAction.actionType === 'scan' ? 'escanear una lista para' : 'agregar un alumno a'}l <strong>Grupo {authPendingAction.targetGroupKey}</strong>. Para continuar, ingrese la contraseña del docente titular a cargo de este grupo.</>
              )}
            </p>

            <form onSubmit={handleVerifyGroupAuth} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  Contraseña del Docente ({authPendingAction.targetGroupKey}):
                </label>
                <input
                  type="password"
                  required
                  autoFocus
                  placeholder="Ingrese contraseña de autorización..."
                  value={authPasswordInput}
                  onChange={(e) => setAuthPasswordInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {authError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 leading-snug">
                  {authError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAuthPendingAction(null);
                    setAuthPasswordInput('');
                    setAuthError('');
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md"
                >
                  Autorizar Acción
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
