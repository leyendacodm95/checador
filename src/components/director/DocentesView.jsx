import React, { useState } from 'react';
import { Search, UserCheck, Edit3, GraduationCap, CheckCircle2, Phone, Mail, Eye, X, Trash2, QrCode, UserPlus } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { EditTeacherModal } from '../alumnos/EditTeacherModal';
import { ProfileModal } from '../common/ProfileModal';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';
import { ConfirmActionModal } from '../common/ConfirmActionModal';
import { TeacherQRModal } from './TeacherQRModal';
import { useAuth } from '../../context/AuthContext';

export function DocentesView({ teachers, onUpdateTeacher, onDeleteTeacher }) {
  const { user, users, deleteUserAccount, updateUserGroupAndType, registerUser, updateUserLocally } = useAuth();
  const isDirector = ['director', 'directora'].includes((user?.baseRole || user?.role || '').toLowerCase().trim());
  const subdirectorUser = users.find(u => ['subdirector', 'subdirectora'].includes((u.role || u.baseRole || '').toLowerCase().trim()));

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('TODOS');
  const [editingTeacherGroup, setEditingTeacherGroup] = useState(null);
  const [viewingTeacher, setViewingTeacher] = useState(null);
  const [deletingTeacher, setDeletingTeacher] = useState(null);
  const [deletingSubdirector, setDeletingSubdirector] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [selectedTeacherQR, setSelectedTeacherQR] = useState(null);
  const [successCredentials, setSuccessCredentials] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newNombre, setNewNombre] = useState('');
  const [newGrado, setNewGrado] = useState('1°');
  const [newGrupo, setNewGrupo] = useState('A');
  const [newTelefono, setNewTelefono] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newMatricula, setNewMatricula] = useState('');
  const [newCedula, setNewCedula] = useState('');
  const [newObservaciones, setNewObservaciones] = useState('');
  const [newRama, setNewRama] = useState('');

  // Reassign / Change Teacher state (100% Button Driven, zero typing)
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [selectedSourceKey, setSelectedSourceKey] = useState('1°-A');
  const [selectedTeacherToMove, setSelectedTeacherToMove] = useState(null);
  const [newTipoDocente, setNewTipoDocente] = useState('Titular');

  const executeTeacherMove = (sourceKey, targetKey) => {
    if (!sourceKey || !targetKey || sourceKey === targetKey) return;

    const sourceTeacher = teachers[sourceKey];
    const targetTeacher = teachers[targetKey];

    // Swap or Move teacher objects directly without re-typing
    onUpdateTeacher(targetKey, sourceTeacher || { nombre: 'Sin docente asignado', observaciones: '—' });
    onUpdateTeacher(sourceKey, targetTeacher || { nombre: 'Sin docente asignado', observaciones: '—' });

    setShowReassignModal(false);
  };

  const handleCreateTeacher = async (e) => {
    e.preventDefault();
    if (!newNombre.trim()) return;

    const normalize = (str) => (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    const isDuplicate = Object.values(teachers || {}).some(t => {
      if (!t) return false;
      const teacherName = typeof t === 'object' ? t.nombre : t;
      if (!teacherName || normalize(teacherName) === normalize('Sin docente asignado')) return false;
      return normalize(teacherName) === normalize(newNombre);
    });

    if (isDuplicate) {
      alert(`⚠️ ¡Atención! Ya existe un docente registrado con el nombre "${newNombre.trim()}".`);
      return;
    }

    const gradeGroupKey = newGrado === 'Ninguno' ? 'Ninguno' : `${newGrado}-${newGrupo}`;
    
    let baseUsername = newEmail.trim() 
      ? newEmail.split('@')[0].toLowerCase().trim().replace(/[^a-z0-9]/g, '') 
      : normalize(newNombre).replace(/[^a-z]/g, '');
    
    if (!baseUsername) baseUsername = 'docente';

    let generatedUsername = baseUsername;
    let counter = 1;
    while (users.some(u => (u.username || '').toLowerCase().trim() === generatedUsername)) {
      generatedUsername = `${baseUsername}${counter}`;
      counter++;
    }
    
    const defaultPassword = 'Docente123!';
    const generatedMatricula = newMatricula.trim() || `TEACHER-${generatedUsername.toUpperCase()}`;

    // 1. Register User Account
    const regResult = await registerUser({
      username: generatedUsername,
      password: defaultPassword,
      name: newNombre.trim(),
      email: newEmail.trim() || `${generatedUsername}@escuela.com`,
      telefono: newTelefono.trim() || '—',
      cedula: newCedula.trim() || '—',
      matricula: generatedMatricula,
      assignedGroup: gradeGroupKey,
      tipoDocente: newTipoDocente,
      rama: newRama.trim(),
      role: 'Docente'
    });

    if (!regResult.success) {
      alert(`⚠️ Error al registrar cuenta de docente: ${regResult.error}`);
      return;
    }

    // 2. Auto-unassign existing titular if replacing
    if (newTipoDocente === 'Titular') {
      const existingTitular = (users || []).find(u => 
        u.assignedGroup === gradeGroupKey && 
        u.tipoDocente === 'Titular'
      );
      if (existingTitular && existingTitular.username !== generatedUsername) {
        await updateUserGroupAndType(existingTitular.username, '', '');
        if (updateUserLocally) {
          updateUserLocally(existingTitular.username, { assignedGroup: '', tipoDocente: '' });
        }
      }

      const newTeacher = {
        nombre: newNombre.trim(),
        foto: '',
        telefono: newTelefono.trim() || '—',
        email: newEmail.trim() || `${generatedUsername}@escuela.com`,
        cedula: newCedula.trim() || '—',
        observaciones: newObservaciones.trim() || 'Docente Titular',
        matricula: generatedMatricula,
        retardosAcumulados: 0
      };
      onUpdateTeacher(gradeGroupKey, newTeacher);
    }
    
    setNewNombre('');
    setNewGrado('1°');
    setNewGrupo('A');
    setNewTelefono('');
    setNewEmail('');
    setNewMatricula('');
    setNewCedula('');
    setNewObservaciones('');
    setNewTipoDocente('Titular');
    setNewRama('');
    setShowAddModal(false);

    setSuccessCredentials({
      username: generatedUsername,
      password: defaultPassword
    });
  };

  const handleRemoveTeacher = async (item) => {
    if (!item) return;
    setPendingAction({
      message: `¿Quitar al docente ${item.nombre} de este salón? Pasará a la lista de docentes sin asignar.`,
      action: async () => {
        if (item.tipoDocente === 'Titular') {
          onUpdateTeacher(item.key, { nombre: 'Sin docente asignado', observaciones: '—' });
        }
        if (item.username) {
          await updateUserGroupAndType(item.username, '', '');
        }
      }
    });
  };

  const handleSaveTeacherEdit = async (gradeGroupKey, teacherData) => {
    // Solo actualizar el slot local si el docente es Titular
    if (teacherData.tipoDocente === 'Titular') {
      onUpdateTeacher(gradeGroupKey, teacherData);
    }

    // 2. Find and update the user account corresponding to this classroom teacher
    let targetUserId = teacherData.username || teacherData.id;
    
    // Prevenir actualizar al usuario incorrecto si hay referencias cruzadas (ej. Titular a Auxiliar)
    if (targetUserId) {
      const existingUserMatch = (users || []).find(u => u.username === targetUserId || u.id === targetUserId);
      if (existingUserMatch && teacherData.tipoDocente && existingUserMatch.tipoDocente !== teacherData.tipoDocente) {
        targetUserId = null; // El usuario apuntado ya no tiene el rol esperado.
      }
    }

    if (!targetUserId) {
      // Find the existing user by checking the exact object that was passed
      const existingUser = (users || []).find(u => 
        u.assignedGroup === gradeGroupKey && 
        u.tipoDocente === teacherData.tipoDocente &&
        (u.nombre === teacherData.nombre || u.username === teacherData.username)
      ) || (users || []).find(u => 
        u.assignedGroup === gradeGroupKey && u.tipoDocente === (teacherData.tipoDocente || 'Titular')
      );
      if (existingUser) targetUserId = existingUser.username || existingUser.id;
    }

    if (targetUserId) {
      try {
        const userDocRef = doc(db, 'usuarios', targetUserId);
        const newData = {
          nombre: teacherData.nombre,
          name: teacherData.nombre,
          Nombre: teacherData.nombre,
          email: teacherData.email,
          telefono: teacherData.telefono,
          cedula: teacherData.cedula,
          matricula: teacherData.matricula
        };
        await setDoc(userDocRef, newData, { merge: true });
        
        // Update locally for instant UI feedback (like the Alumnos panel)
        if (updateUserLocally) {
          updateUserLocally(targetUserId, newData);
        }
      } catch (err) {
        console.error('Error crítico al actualizar el usuario en Firebase:', err);
        alert('No se pudo guardar en la base de datos. Revisa la consola.');
      }
    } else {
      // Create a brand new user account if they don't exist in usuarios!
      const baseUsername = teacherData.nombre ? teacherData.nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]/g, '') : 'docente';
      let generatedUsername = baseUsername || 'docente';
      let counter = 1;
      while ((users || []).some(u => (u.username || '').toLowerCase().trim() === generatedUsername)) {
        generatedUsername = `${baseUsername}${counter}`;
        counter++;
      }
      
      const generatedMatricula = teacherData.matricula || `TEACHER-${generatedUsername.toUpperCase()}`;
      const defaultPassword = 'Docente123!';

      await registerUser({
        username: generatedUsername,
        password: defaultPassword,
        name: teacherData.nombre,
        email: teacherData.email || `${generatedUsername}@escuela.com`,
        telefono: teacherData.telefono || '—',
        cedula: teacherData.cedula || '—',
        matricula: generatedMatricula,
        assignedGroup: gradeGroupKey,
        tipoDocente: teacherData.tipoDocente || 'Titular',
        role: 'Docente'
      });
    }
  };

  const grades = ['TODOS', '1°', '2°', '3°', '4°', '5°', '6°'];

  // Helper to extract teacher object or normalize string
  const getTeacherData = (val) => {
    if (!val) {
      return { nombre: 'Sin docente asignado', telefono: '—', email: '—', cedula: '—', observaciones: '—' };
    }
    if (typeof val === 'string') {
      return { nombre: val, telefono: '—', email: '—', cedula: '—', observaciones: '—' };
    }
    return {
      id: val.id,
      nombre: val.nombre || '',
      telefono: val.telefono || '—',
      email: val.email || '—',
      cedula: val.cedula || '—',
      observaciones: val.observaciones || '—',
      retardosAcumulados: val.retardosAcumulados || 0
    };
  };

  const ALLOWED_GROUPS = [
    '1°-A', '1°-B',
    '2°-A', '2°-B',
    '3°-A', '3°-B',
    '4°-A', '4°-B',
    '5°-A', '5°-B',
    '6°-A', '6°-B'
  ];

  // 1. Get the 12 titular teachers assigned to classrooms
  const titularList = ALLOWED_GROUPS.map((key) => {
    const teacherVal = (teachers || {})[key];
    const parts = key.split('-');
    const grado = parts[0] || '';
    const grupo = parts[1] || 'A';
    const teacherData = getTeacherData(teacherVal);

    return {
      key,
      grado,
      grupo,
      teacherVal,
      qrCode: teacherData.matricula || `TEACHER-${key.replace('°-', '')}`,
      isUserAccount: false,
      tipoDocente: 'Titular',
      ...teacherData,
    };
  });

  // 2. Get registered teacher accounts that are assigned to a group
  const userTeachersAssigned = (users || [])
    .filter(u => 
      !['director', 'directora', 'alumno', 'alumna'].includes((u.role || u.baseRole || '').toLowerCase().trim()) &&
      u.assignedGroup && u.assignedGroup !== 'Ninguno' && u.assignedGroup !== '' && u.assignedGroup !== 'Sin Grupo'
    )
    .map(u => ({
      key: u.assignedGroup,
      grado: u.assignedGroup.split('-')[0] || '',
      grupo: u.assignedGroup.split('-')[1] || 'A',
      nombre: u.nombre || u.name || u.username || u.displayName || u.Nombre || u.Name || 'Sin Nombre',
      username: u.username,
      email: u.email,
      telefono: u.telefono || '—',
      cedula: u.cedula || '—',
      observaciones: u.tipoDocente === 'Titular' ? `Docente Titular de ${u.assignedGroup}` : (u.tipoDocente === 'USAER' || u.role === 'USAER' ? `U.S.A.E.R de ${u.assignedGroup}` : `Docente Auxiliar de ${u.assignedGroup}`),
      retardosAcumulados: u.retardosAcumulados || 0,
      qrCode: u.matricula || `TEACHER-${u.username.toUpperCase()}`,
      isUserAccount: true,
      tipoDocente: u.tipoDocente || 'Auxiliar',
      teacherVal: u
    }));

  const teacherListUnsorted = [...titularList];
  const duplicateTitulares = [];
  userTeachersAssigned.forEach(ut => {
    if (ut.tipoDocente === 'Titular') {
      const idx = teacherListUnsorted.findIndex(t => t.key === ut.key);
      if (idx !== -1) {
        const intendedName = ((teachers || {})[ut.key]?.nombre || '').toLowerCase().trim();
        const utName = (ut.nombre || ut.name || '').toLowerCase().trim();
        const isExplicitlyEmpty = intendedName === 'sin docente asignado';

        if (utName === intendedName && utName !== '') {
          // Absolute priority: This user matches the exact intended name in the slot!
          if (teacherListUnsorted[idx].isUserAccount && teacherListUnsorted[idx].username !== ut.username) {
            // Kick the impostor to duplicates
            duplicateTitulares.push({ ...teacherListUnsorted[idx], tipoDocente: 'Fantasma/Desincronizado (Dar de baja)' });
          }
          teacherListUnsorted[idx] = ut;
        } else {
          // Name doesn't perfectly match intended slot name
          if (!teacherListUnsorted[idx].isUserAccount && !isExplicitlyEmpty) {
            // No one is sitting here yet, and it's not explicitly emptied. Let them sit temporarily.
            // If the real owner comes along later in the loop, this user will be kicked.
            teacherListUnsorted[idx] = ut;
          } else {
            // The slot is either taken by a real user account, or it was explicitly emptied.
            // Send this mismatched user to duplicates.
            duplicateTitulares.push({ ...ut, tipoDocente: 'Fantasma/Desincronizado (Dar de baja)' });
          }
        }
      }
    } else {
      const isAlreadyInList = teacherListUnsorted.some(t => t.username === ut.username && t.username);
      if (!isAlreadyInList) {
        teacherListUnsorted.push(ut);
      }
    }
  });

  const auxiliarListUnsorted = [
    ...userTeachersAssigned.filter(ut => ut.tipoDocente !== 'Titular'),
    ...duplicateTitulares
  ];

  const teacherList = teacherListUnsorted.sort((a, b) => {
    if (a.key !== b.key) {
      return a.key.localeCompare(b.key);
    }
    if (a.tipoDocente === 'Titular' && b.tipoDocente !== 'Titular') return -1;
    if (a.tipoDocente !== 'Titular' && b.tipoDocente === 'Titular') return 1;
    return 0;
  });

  const normalizeStr = (str) => {
    if (!str) return '';
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  };

  // Filter list
  const filteredTeachers = teacherList.filter((item) => {
    const matchesSearch =
      normalizeStr(item.nombre).includes(normalizeStr(searchTerm)) ||
      normalizeStr(item.key).includes(normalizeStr(searchTerm)) ||
      item.telefono.includes(searchTerm) ||
      normalizeStr(item.email).includes(normalizeStr(searchTerm));

    const matchesGrade = selectedGrade === 'TODOS' || item.grado === selectedGrade;
    return matchesSearch && matchesGrade;
  });

  const unassignedTeachers = (users || [])
    .filter(u => 
      !['director', 'directora', 'alumno', 'alumna'].includes((u.role || u.baseRole || '').toLowerCase().trim()) &&
      (!u.assignedGroup || u.assignedGroup === 'Ninguno' || u.assignedGroup === '' || u.assignedGroup === 'Sin Grupo')
    )
    .map(u => ({
      key: 'Sin asignar',
      grado: '—',
      grupo: '—',
      nombre: u.name,
      username: u.username,
      email: u.email,
      telefono: u.telefono || '—',
      cedula: u.cedula || '—',
      observaciones: 'Docente registrado sin salón de clase',
      retardosAcumulados: u.retardosAcumulados || 0,
      qrCode: u.matricula || `TEACHER-${u.username.toUpperCase()}`,
      isUserAccount: true,
      tipoDocente: u.tipoDocente || 'Auxiliar',
      teacherVal: u
    }));

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">
            Gestión y Expediente de Docentes
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Consulta la lista completa de docentes titulares, sus fotografías y números de contacto.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isDirector && (
            <button
              onClick={() => setShowReassignModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 transition-all"
            >
              <Edit3 className="w-4 h-4" />
              <span>Cambiar Docente Titular</span>
            </button>
          )}
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-500/20 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>Agregar Docente</span>
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#182234] p-5 rounded-2xl border border-gray-200/80 dark:border-gray-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Total Docentes
            </span>
            <div className="text-2xl font-black text-gray-900 dark:text-white mt-0.5">
              {teacherList.length}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#182234] p-5 rounded-2xl border border-gray-200/80 dark:border-gray-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Grupos Asignados
            </span>
            <div className="text-2xl font-black text-gray-900 dark:text-white mt-0.5">
              {teacherList.length} / {teacherList.length}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#182234] p-5 rounded-2xl border border-gray-200/80 dark:border-gray-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Cobertura
            </span>
            <div className="text-2xl font-black text-gray-900 dark:text-white mt-0.5">
              100%
            </div>
          </div>
        </div>
      </div>

      {/* Grade Filters & Search */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Grade Tabs */}
        <div className="bg-white dark:bg-[#182234] p-1.5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex items-center gap-1 overflow-x-auto">
          {grades.map((grade) => {
            const isActive = selectedGrade === grade;
            return (
              <button
                key={grade}
                onClick={() => setSelectedGrade(grade)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {grade === 'TODOS' ? 'Todos los Grados' : `${grade} Grado`}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative max-w-md w-full md:w-80">
          <input
            type="text"
            placeholder="Buscar por nombre, teléfono o correo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-[#182234] border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white shadow-sm"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
        </div>
      </div>

      {/* Subdirector Section (Director Portal only) */}
      {subdirectorUser && (
        <div className="bg-white dark:bg-[#182234] rounded-2xl border border-gray-200/80 dark:border-gray-800 shadow-sm p-5 transition-colors duration-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-lg shadow-inner">
                {subdirectorUser.name?.charAt(0) || 'S'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-gray-900 dark:text-white font-outfit">
                    {subdirectorUser.name}
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                    Subdirector / Subdirectora
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {subdirectorUser.email} • Usuario: @{subdirectorUser.username}
                </p>
              </div>
            </div>

            {/* Dar de baja Subdirector (Director/a only) */}
            {isDirector && (
              <button
                onClick={() => setDeletingSubdirector(subdirectorUser)}
                className="w-10 h-10 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 transition-all flex flex-col items-center justify-center gap-[2px] leading-none shrink-0"
              >
                <span className="text-[9px] font-black uppercase tracking-tight">Dar de</span>
                <span className="text-[9px] font-black uppercase tracking-tight">baja</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Docentes Asignados Table */}
      <div className="bg-white dark:bg-[#182234] rounded-2xl border border-gray-200/80 dark:border-gray-800 shadow-sm overflow-hidden transition-colors duration-200">
        <div className="p-5 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-base font-black text-gray-900 dark:text-white font-outfit">
            Docentes Asignados
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Docentes titulares y auxiliares asignados actualmente a cada salón de clases.
          </p>
        </div>

        {/* VISTA MÓVIL - TARJETAS RESPONSIVAS */}
        <div className="sm:hidden p-3 space-y-3 bg-gray-50/50 dark:bg-transparent">
          {filteredTeachers.length > 0 ? (
            filteredTeachers.map((item) => (
              <div key={`${item.key}-${item.username || item.nombre}`} className="bg-white dark:bg-[#1e293b] rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm transition hover:shadow-md">
                <div className="flex items-start justify-between">
                  <div className="flex gap-3">
                    <div
                      onClick={() => setSelectedProfile({ data: item, type: 'docente' })}
                      className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center justify-center text-lg shrink-0 cursor-pointer"
                    >
                      {(item.nombre || "").replace(/Profesora\.|Profesor\.|Profesora|Profesor|Profra\.|Prof\./gi, '').trim().slice(0, 2).toUpperCase() || 'DC'}
                    </div>
                    <div className="flex flex-col">
                      <span
                        onClick={() => setSelectedProfile({ data: item, type: 'docente' })}
                        className="font-bold text-[15px] text-slate-900 dark:text-white cursor-pointer hover:text-emerald-500 hover:underline"
                      >
                        {item.nombre}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400 text-[11px] mt-1">
                        Grupo {item.key} • {item.telefono}
                      </span>
                      <span className="text-slate-400 dark:text-slate-500 text-[10px] font-mono mt-0.5">
                        {item.email}
                      </span>
                      {(item.retardosAcumulados || 0) >= 5 && (
                        <span className="mt-1 px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-[9px] font-black inline-flex items-center gap-1 w-max">
                          🚨 Notificar a Director ({item.retardosAcumulados})
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`shrink-0 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    item.tipoDocente === 'Titular' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                  }`}>
                    {item.tipoDocente || 'Auxiliar'}
                  </span>
                </div>

                <div className="flex items-center justify-end mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/50">
                  <div className="flex gap-2 flex-wrap justify-end">
                    <button
                      onClick={() => setViewingTeacher(item)}
                      title="Ver ficha completa del docente"
                      className="w-10 h-10 rounded-xl text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition flex items-center justify-center bg-blue-500/10"
                    >
                      <Eye size={18} />
                    </button>

                    <button
                      onClick={() => setSelectedTeacherQR(item)}
                      title="Ver código QR del docente"
                      className="w-10 h-10 rounded-xl text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition flex items-center justify-center bg-emerald-500/10"
                    >
                      <QrCode size={18} />
                    </button>

                    <button
                      onClick={() => setEditingTeacherGroup({ key: item.key, teacher: item.teacherVal })}
                      className="w-10 h-10 rounded-xl text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition flex items-center justify-center bg-amber-500/10"
                    >
                      <Edit3 size={18} />
                    </button>

                    {isDirector && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (item.isUserAccount) setDeletingUser(item.teacherVal);
                          else setDeletingTeacher(item);
                        }}
                        title="Dar de baja docente de este grupo"
                        className="w-10 h-10 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 transition-all flex flex-col items-center justify-center gap-[2px] leading-none shrink-0"
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
              No se encontraron docentes con los criterios seleccionados.
            </p>
          )}
        </div>

        {/* VISTA ESCRITORIO - TABLA */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 text-xs font-bold text-gray-500 dark:text-gray-400">
                <th className="py-4 px-6">Docente</th>
                <th className="py-4 px-6 text-center">Grado y Grupo</th>
                <th className="py-4 px-6">Contacto (Teléfono / Email)</th>
                <th className="py-4 px-6 text-center">Retardos</th>
                <th className="py-4 px-6 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60 text-sm">
              {filteredTeachers.length > 0 ? (
                filteredTeachers.map((item) => (
                  <tr
                    key={`${item.key}-${item.username || item.nombre}`}
                    className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors"
                  >
                    {/* Docente Name, Avatar & Role Badge */}
                    <td className="py-4 px-6 font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                      <div
                        onClick={() => setSelectedProfile({ data: item, type: 'docente' })}
                        title="Haz clic para ver perfil del docente"
                        className="w-11 h-11 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold text-sm flex items-center justify-center border border-emerald-500/20 shadow-sm cursor-pointer hover:scale-105 transition-transform"
                      >
                        {item.nombre
                          .replace(/Profesora\.|Profesor\.|Profesora|Profesor|Profra\.|Prof\./gi, '')
                          .trim()
                          .slice(0, 2)
                          .toUpperCase() || 'DC'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            onClick={() => setSelectedProfile({ data: item, type: 'docente' })}
                            className="block text-sm font-bold text-gray-900 dark:text-white cursor-pointer hover:text-emerald-500 hover:underline"
                          >
                            {item.nombre}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                            item.tipoDocente === 'Titular' 
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-405 border border-emerald-500/20' 
                              : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                          }`}>
                            {item.tipoDocente || 'Auxiliar'}
                          </span>
                        </div>
                        <span className="text-xs text-gray-400 font-normal">
                          Cédula: {item.cedula}
                        </span>
                      </div>
                    </td>

                    {/* Grupo Badge */}
                    <td className="py-4 px-6 text-center">
                      <span className="inline-block px-3 py-1 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/50 text-xs font-black tracking-wide">
                        {item.key}
                      </span>
                    </td>

                    {/* Contact Info */}
                    <td className="py-4 px-6">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300 font-medium">
                          <Phone className="w-3.5 h-3.5 text-emerald-500" />
                          <span>{item.telefono}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                          <Mail className="w-3.5 h-3.5 text-blue-400" />
                          <span>{item.email}</span>
                        </div>
                      </div>
                    </td>

                    {/* Retardos Acumulados Column */}
                    <td className="py-4 px-6 text-center">
                      {(item.retardosAcumulados || 0) >= 5 ? (
                        <span
                          onClick={() => setSelectedProfile({ data: item, type: 'docente' })}
                          title="5 o más retardos. Deberá notificar los motivos al director."
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-xs font-black cursor-pointer animate-pulse"
                        >
                          🚨 Notificar a Director ({item.retardosAcumulados})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-extrabold">
                          {item.retardosAcumulados || 0} retardos
                        </span>
                      )}
                    </td>

                    {/* Acciones */}
                    <td className="py-4 px-6 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {/* View Quick Details */}
                        <button
                          onClick={() => setViewingTeacher(item)}
                          title="Ver ficha completa del docente"
                          className="p-2 rounded-xl text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* View QR Code */}
                        <button
                          onClick={() => setSelectedTeacherQR(item)}
                          title="Ver código QR del docente"
                          className="p-2 rounded-xl text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>

                          <>
                            {/* Edit Teacher Modal Trigger */}
                            <button
                              onClick={() =>
                                setEditingTeacherGroup({
                                  key: item.key,
                                  teacher: item.teacherVal,
                                })
                              }
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold transition-all active:scale-95"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Editar Datos</span>
                            </button>

                            {/* Dar de baja (delete account or clear roster slot) */}
                            {isDirector && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (item.isUserAccount) {
                                    setDeletingUser(item.teacherVal);
                                  } else {
                                    setDeletingTeacher(item);
                                  }
                                }}
                                title="Dar de baja docente de este grupo"
                                className="w-10 h-10 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 transition-all flex flex-col items-center justify-center gap-[2px] leading-none shrink-0"
                              >
                                <span className="text-[9px] font-black uppercase tracking-tight">Dar de</span>
                                <span className="text-[9px] font-black uppercase tracking-tight">baja</span>
                              </button>
                            )}
                          </>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-gray-400 dark:text-gray-500">
                    No se encontraron docentes con los criterios seleccionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Docentes sin Asignar Table */}
      <div className="bg-white dark:bg-[#182234] rounded-2xl border border-gray-200/80 dark:border-gray-800 shadow-sm overflow-hidden transition-colors duration-200">
        <div className="p-5 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-base font-black text-gray-900 dark:text-white font-outfit">
            Docentes sin Asignar
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Cuentas de docentes registrados que aún no tienen un salón de clases asignado.
          </p>
        </div>

        {/* VISTA MÓVIL - TARJETAS RESPONSIVAS */}
        <div className="sm:hidden p-3 space-y-3 bg-gray-50/50 dark:bg-transparent">
          {unassignedTeachers.length > 0 ? (
            unassignedTeachers.map((item) => (
              <div key={item.username} className="bg-white dark:bg-[#1e293b] rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm transition hover:shadow-md">
                <div className="flex items-start justify-between">
                  <div className="flex gap-3">
                    <div
                      onClick={() => setSelectedProfile({ data: item, type: 'docente' })}
                      className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center justify-center text-lg shrink-0 cursor-pointer"
                    >
                      {(item.nombre || "").replace(/Profesora\.|Profesor\.|Profesora|Profesor|Profra\.|Prof\./gi, '').trim().slice(0, 2).toUpperCase() || 'DC'}
                    </div>
                    <div className="flex flex-col">
                      <span
                        onClick={() => setSelectedProfile({ data: item, type: 'docente' })}
                        className="font-bold text-[15px] text-slate-900 dark:text-white cursor-pointer hover:text-emerald-500 hover:underline"
                      >
                        {item.nombre}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400 text-[11px] mt-1">
                        Sin Asignar • {item.telefono}
                      </span>
                      <span className="text-slate-400 dark:text-slate-500 text-[10px] font-mono mt-0.5">
                        {item.email}
                      </span>
                    </div>
                  </div>
                  <span className={`shrink-0 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400`}>
                    Sin Asignar
                  </span>
                </div>

                <div className="flex items-center justify-end mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/50">
                  <div className="flex gap-2 flex-wrap justify-end">
                    <button
                      onClick={() => setViewingTeacher(item)}
                      title="Ver ficha completa del docente"
                      className="w-10 h-10 rounded-xl text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition flex items-center justify-center bg-blue-500/10"
                    >
                      <Eye size={18} />
                    </button>

                    <button
                      onClick={() => setSelectedTeacherQR(item)}
                      title="Ver código QR del docente"
                      className="w-10 h-10 rounded-xl text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition flex items-center justify-center bg-emerald-500/10"
                    >
                      <QrCode size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-xs text-gray-400 py-6">
              No hay docentes sin asignar.
            </p>
          )}
        </div>

        {/* VISTA ESCRITORIO - TABLA */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 text-xs font-bold text-gray-500 dark:text-gray-400">
                <th className="py-4 px-6">Docente</th>
                <th className="py-4 px-6 text-center">Grado y Grupo</th>
                <th className="py-4 px-6">Contacto (Teléfono / Email)</th>
                <th className="py-4 px-6 text-center">Retardos</th>
                <th className="py-4 px-6 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60 text-sm">
              {unassignedTeachers.length > 0 ? (
                unassignedTeachers.map((item) => (
                  <tr
                    key={item.username}
                    className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors"
                  >
                    {/* Docente Name, Avatar & Role Badge */}
                    <td className="py-4 px-6 font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                      <div
                        onClick={() => setSelectedProfile({ data: item, type: 'docente' })}
                        title="Haz clic para ver perfil del docente"
                        className="w-11 h-11 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold text-sm flex items-center justify-center border border-emerald-500/20 shadow-sm cursor-pointer hover:scale-105 transition-transform"
                      >
                        {item.nombre
                          .replace(/Profesora\.|Profesor\.|Profesora|Profesor|Profra\.|Prof\./gi, '')
                          .trim()
                          .slice(0, 2)
                          .toUpperCase() || 'DC'}
                      </div>
                      <div>
                        <span
                          onClick={() => setSelectedProfile({ data: item, type: 'docente' })}
                          className="block text-sm font-bold text-gray-900 dark:text-white cursor-pointer hover:text-emerald-500 hover:underline"
                        >
                          {item.nombre}
                        </span>
                        <span className="text-xs text-gray-400 font-normal">
                          Cédula: {item.cedula}
                        </span>
                      </div>
                    </td>

                    {/* Grupo Badge */}
                    <td className="py-4 px-6 text-center">
                      <span className="inline-block px-3 py-1 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-200/40 text-xs font-black tracking-wide">
                        Sin Asignar
                      </span>
                    </td>

                    {/* Contact Info */}
                    <td className="py-4 px-6">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300 font-medium">
                          <Phone className="w-3.5 h-3.5 text-emerald-500" />
                          <span>{item.telefono}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                          <Mail className="w-3.5 h-3.5 text-blue-400" />
                          <span>{item.email}</span>
                        </div>
                      </div>
                    </td>

                    {/* Retardos Column */}
                    <td className="py-4 px-6 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-extrabold">
                        {item.retardosAcumulados || 0} retardos
                      </span>
                    </td>

                    {/* Acciones */}
                    <td className="py-4 px-6 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {/* View Quick Details */}
                        <button
                          onClick={() => setViewingTeacher(item)}
                          title="Ver ficha completa del docente"
                          className="p-2 rounded-xl text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* View QR Code */}
                        <button
                          onClick={() => setSelectedTeacherQR(item)}
                          title="Ver código QR del docente"
                          className="p-2 rounded-xl text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>

                        {/* Edit Teacher Modal Trigger */}
                        <button
                          onClick={() =>
                            setEditingTeacherGroup({
                              key: item.key,
                              teacher: item.teacherVal,
                            })
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold transition-all active:scale-95"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Editar Datos</span>
                        </button>

                        {/* Dar de baja (delete account) */}
                        {isDirector && (
                          <button
                            onClick={() => setDeletingUser(item.teacherVal)}
                            title="Eliminar cuenta de acceso del docente"
                            className="w-10 h-10 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 transition-all flex flex-col items-center justify-center gap-[2px] leading-none shrink-0"
                          >
                            <span className="text-[9px] font-black uppercase tracking-tight">Dar de</span>
                            <span className="text-[9px] font-black uppercase tracking-tight">baja</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="py-6 text-center text-gray-400 dark:text-gray-500">
                    No hay docentes registrados sin salón asignado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Teacher Modal */}
      {editingTeacherGroup && (
        <EditTeacherModal
          gradeGroupKey={editingTeacherGroup.key}
          currentTeacher={editingTeacherGroup.teacher}
          isOpen={!!editingTeacherGroup}
          onClose={() => setEditingTeacherGroup(null)}
          onSave={handleSaveTeacherEdit}
        />
      )}

      {/* View Teacher Details Modal */}
      {viewingTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-[#182234] rounded-2xl w-full max-w-md border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden p-6 relative">
            <button
              onClick={() => setViewingTeacher(null)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center text-center pb-4 border-b border-gray-100 dark:border-gray-800">
              <div className="w-24 h-24 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-black text-2xl flex items-center justify-center border-2 border-emerald-400 shadow-md mb-3">
                {(viewingTeacher.nombre || "").replace(/Profesora\.|Profesor\.|Profesora|Profesor|Profra\.|Prof\./gi, '').trim().slice(0, 2).toUpperCase()}
              </div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white">
                {viewingTeacher.nombre}
              </h3>
              <p className="text-xs text-blue-600 dark:text-blue-400 font-bold mt-0.5">
                Docente Titular - Grupo {viewingTeacher.key}
              </p>
            </div>

            <div className="py-4 space-y-3 text-sm">
              <div className="flex justify-between items-center py-1 border-b border-gray-50 dark:border-gray-800">
                <span className="text-gray-400 text-xs font-semibold uppercase">Teléfono:</span>
                <span className="font-bold text-gray-800 dark:text-gray-200">{viewingTeacher.telefono}</span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-gray-50 dark:border-gray-800">
                <span className="text-gray-400 text-xs font-semibold uppercase">Retardos Acumulados:</span>
                <span className={`px-2.5 py-0.5 rounded-full font-black text-xs ${
                  (viewingTeacher.retardosAcumulados || 0) >= 5
                    ? 'bg-rose-500 text-white'
                    : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                }`}>
                  {viewingTeacher.retardosAcumulados || 0} días
                </span>
              </div>

              {(viewingTeacher.retardosAcumulados || 0) >= 5 && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 rounded-xl text-xs text-rose-700 dark:text-rose-300 font-medium flex flex-col gap-1">
                  <span className="font-black uppercase tracking-wider text-[11px] text-rose-600 dark:text-rose-400">
                    🚨 AVISO DE NOTIFICACIÓN A DIRECCIÓN
                  </span>
                  <span>El/La docente ha acumulado <strong>{viewingTeacher.retardosAcumulados} registros tardíos</strong>. Deberá notificar los motivos al director a la brevedad.</span>
                </div>
              )}

              <div className="flex justify-between items-center py-1 border-b border-gray-50 dark:border-gray-800">
                <span className="text-gray-400 text-xs font-semibold uppercase">Correo:</span>
                <span className="font-bold text-gray-800 dark:text-gray-200 text-xs">{viewingTeacher.email}</span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-gray-50 dark:border-gray-800">
                <span className="text-gray-400 text-xs font-semibold uppercase">Cédula Profesional:</span>
                <span className="font-mono text-gray-800 dark:text-gray-200 text-xs">{viewingTeacher.cedula}</span>
              </div>

              {(viewingTeacher.tipoDocente === 'Practicante' || viewingTeacher.tipoDocente === 'Servicio Social') && viewingTeacher.teacherVal?.rama && (
                <div className="flex justify-between items-center py-1 border-b border-gray-50 dark:border-gray-800">
                  <span className="text-gray-400 text-xs font-semibold uppercase">Rama:</span>
                  <span className="font-bold text-gray-800 dark:text-gray-200 text-xs">{viewingTeacher.teacherVal.rama}</span>
                </div>
              )}

              <div className="pt-1">
                <span className="text-gray-400 text-xs font-semibold uppercase block mb-1">Observaciones:</span>
                <p className="text-xs text-gray-600 dark:text-gray-300 italic bg-gray-50 dark:bg-gray-800/50 p-2.5 rounded-xl border border-gray-100 dark:border-gray-700">
                  {viewingTeacher.observaciones || 'Sin observaciones'}
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => {
                  setEditingTeacherGroup({
                    key: viewingTeacher.key,
                    teacher: viewingTeacher.teacherVal,
                  });
                  setViewingTeacher(null);
                }}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2"
              >
                <Edit3 className="w-4 h-4" />
                <span>Editar este Docente</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Modal (Large Photo & Information Box) */}
      <ProfileModal
        data={selectedProfile?.data}
        type={selectedProfile?.type}
        isOpen={!!selectedProfile}
        onClose={() => setSelectedProfile(null)}
      />

      {/* Confirm Delete Teacher Modal */}

      <ConfirmActionModal
        isOpen={!!pendingAction}
        title="Confirmar asignación"
        message={pendingAction?.message}
        onConfirm={() => {
          if (pendingAction?.action) pendingAction.action();
        }}
        onClose={() => setPendingAction(null)}
      />

      <ConfirmDeleteModal
        isOpen={!!deletingTeacher}
        title="¿Dar de baja a Docente?"
        message={`¿Estás seguro de dar de baja al docente asignado al Grupo ${deletingTeacher?.key}?`}
        onConfirm={(reason) => {
          if (deletingTeacher) onDeleteTeacher(deletingTeacher.key, reason);
        }}
        onClose={() => setDeletingTeacher(null)}
      />

      {/* Confirm Delete Subdirector Modal */}

      <ConfirmActionModal
        isOpen={!!pendingAction}
        title="Confirmar asignación"
        message={pendingAction?.message}
        onConfirm={() => {
          if (pendingAction?.action) pendingAction.action();
        }}
        onClose={() => setPendingAction(null)}
      />

      <ConfirmDeleteModal
        isOpen={!!deletingSubdirector}
        title="¿Dar de baja a Subdirector?"
        message={`¿Estás seguro de dar de baja a ${deletingSubdirector?.name} del sistema?`}
        onConfirm={async (reason) => {
          if (deletingSubdirector) {
            await deleteUserAccount(deletingSubdirector.username);
            setDeletingSubdirector(null);
          }
        }}
        onClose={() => setDeletingSubdirector(null)}
      />

      {/* Confirm Delete User Docente Modal */}

      <ConfirmActionModal
        isOpen={!!pendingAction}
        title="Confirmar asignación"
        message={pendingAction?.message}
        onConfirm={() => {
          if (pendingAction?.action) pendingAction.action();
        }}
        onClose={() => setPendingAction(null)}
      />

      <ConfirmDeleteModal
        isOpen={!!deletingUser}
        title="¿Dar de baja Cuenta de Docente?"
        message={`¿Estás seguro de eliminar permanentemente la cuenta de acceso de ${deletingUser?.name}?`}
        onConfirm={async () => {
          if (deletingUser) {
            if (deletingUser.tipoDocente === 'Titular' && deletingUser.assignedGroup && deletingUser.assignedGroup !== 'Ninguno' && deletingUser.assignedGroup !== 'Sin Grupo') {
              onUpdateTeacher(deletingUser.assignedGroup, { nombre: 'Sin docente asignado', observaciones: '—' });
            }
            await deleteUserAccount(deletingUser.username);
            setDeletingUser(null);
          }
        }}
        onClose={() => setDeletingUser(null)}
      />

      {/* Teacher QR Modal */}
      <TeacherQRModal
        teacher={selectedTeacherQR}
        isOpen={!!selectedTeacherQR}
        onClose={() => setSelectedTeacherQR(null)}
      />

      {/* Add Teacher Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-[#182234] rounded-2xl w-full max-w-lg border border-gray-200 dark:border-gray-700 shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-emerald-500" />
              <span>Registrar Nuevo Docente</span>
            </h3>
            
            <form onSubmit={handleCreateTeacher} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Nombre Completo</label>
                <input
                  type="text"
                  required
                  value={newNombre}
                  onChange={(e) => setNewNombre(e.target.value)}
                  placeholder="Ej. Profesor Juan Pérez"
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Tipo de Personal</label>
                <select
                  value={newTipoDocente}
                  onChange={(e) => {
                    setNewTipoDocente(e.target.value);
                    if (e.target.value !== 'Practicante' && e.target.value !== 'Servicio Social' && e.target.value !== 'Docente Auxiliar') {
                      setNewRama('');
                    }
                  }}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                >
                  <option value="Titular">Docente Titular (Plantilla del Grupo)</option>
                  <option value="Docente Auxiliar">Docente Auxiliar</option>
                  <option value="Educación Especial">Educación Especial (U.S.A.E.R)</option>
                  <option value="Educación Física">Educación Física</option>
                  <option value="Psicología">Psicología</option>
                  <option value="Intendente">Intendente</option>
                  <option value="Practicante">Prácticas Profesionales</option>
                  <option value="Servicio Social">Servicio Social</option>
                </select>
              </div>

              {(newTipoDocente === 'Practicante' || newTipoDocente === 'Servicio Social') && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Rama (Opcional)</label>
                  <input
                    type="text"
                    value={newRama}
                    onChange={(e) => setNewRama(e.target.value)}
                    placeholder="Ej. Psicología, Ing. Sistemas, etc."
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Grado</label>
                  <select
                    value={newGrado}
                    onChange={(e) => setNewGrado(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="Ninguno">Sin Grupo (Ninguno)</option>
                    <option value="1°">1° Grado</option>
                    <option value="2°">2° Grado</option>
                    <option value="3°">3° Grado</option>
                    <option value="4°">4° Grado</option>
                    <option value="5°">5° Grado</option>
                    <option value="6°">6° Grado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Grupo</label>
                  <select
                    value={newGrupo}
                    onChange={(e) => setNewGrupo(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    disabled={newGrado === 'Ninguno'}
                  >
                    {newGrado === 'Ninguno' ? (
                      <option value="Ninguno">Ninguno</option>
                    ) : (
                      <>
                        <option value="A">Grupo A</option>
                        <option value="B">Grupo B</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Teléfono</label>
                  <input
                    type="tel"
                    value={newTelefono}
                    onChange={(e) => setNewTelefono(e.target.value)}
                    placeholder="Ej. 555-123-4567"
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Cédula Profesional</label>
                  <input
                    type="text"
                    value={newCedula}
                    onChange={(e) => setNewCedula(e.target.value)}
                    placeholder="Ej. 12893475"
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="ejemplo@escuela.edu.mx"
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Matrícula / ID QR</label>
                  <input
                    type="text"
                    value={newMatricula}
                    onChange={(e) => setNewMatricula(e.target.value)}
                    placeholder="Ej. DOCENTE-1A"
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Observaciones</label>
                <textarea
                  rows="2"
                  value={newObservaciones}
                  onChange={(e) => setNewObservaciones(e.target.value)}
                  placeholder="Observaciones o notas adicionales..."
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition"
                >
                  Registrar Docente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Cambiar / Reasignar Docente Titular (100% Clics & Botones, Sin Recaptura) */}
      {showReassignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-[#182234] rounded-2xl w-full max-w-xl border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden p-6 relative max-h-[90vh] overflow-y-auto space-y-5">
            <button
              onClick={() => {
                setShowReassignModal(false);
                setSelectedTeacherToMove(null);
              }}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 border-b border-gray-100 dark:border-gray-800 pb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">
                <Edit3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-gray-900 dark:text-white font-outfit">
                  Asignar o Cambiar Docente
                </h3>
                <p className="text-xs text-gray-400">
                  Selecciona al docente a reasignar y haz clic en el salón y cargo correspondiente.
                </p>
              </div>
            </div>

            {/* PASO 1: Seleccionar Docente */}
            <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-1">
              <label className="block text-xs font-extrabold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                1. Selecciona el Docente (Haz clic):
              </label>

              {/* Docentes Titulares */}
              {teacherList.filter(t => t.tipoDocente === 'Titular').length > 0 && (
                <div>
                  <h4 className="text-[11px] font-black uppercase text-emerald-600 dark:text-emerald-450 mb-1.5">
                    Docentes Titulares Asignados
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {teacherList.filter(t => t.tipoDocente === 'Titular').map((t) => {
                      const isSelected = selectedTeacherToMove?.nombre === t.nombre && selectedTeacherToMove?.key === t.key;
                      return (
                        <button
                          key={`${t.key}-${t.nombre}`}
                          type="button"
                          onClick={() => setSelectedTeacherToMove(t)}
                          className={`p-2.5 rounded-xl text-left border transition-all flex items-center justify-between text-xs ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                              : 'bg-gray-50 dark:bg-gray-800/80 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white hover:bg-blue-50 dark:hover:bg-blue-900/30'
                          }`}
                        >
                          <div className="truncate pr-2">
                            <span className={`text-[10px] font-black block ${isSelected ? 'text-white' : 'text-blue-500'}`}>
                              Grupo {t.key}
                            </span>
                            <span className="font-bold truncate block">{t.nombre}</span>
                          </div>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-white shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Docentes Auxiliares */}
              {teacherList.filter(t => t.tipoDocente !== 'Titular').length > 0 && (
                <div>
                  <h4 className="text-[11px] font-black uppercase text-blue-600 dark:text-blue-405 mb-1.5">
                    Docentes Aux/Prac Asignados
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {teacherList.filter(t => t.tipoDocente !== 'Titular').map((t) => {
                      const isSelected = selectedTeacherToMove?.nombre === t.nombre && selectedTeacherToMove?.key === t.key;
                      return (
                        <button
                          key={`${t.key}-${t.nombre}`}
                          type="button"
                          onClick={() => setSelectedTeacherToMove(t)}
                          className={`p-2.5 rounded-xl text-left border transition-all flex items-center justify-between text-xs ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                              : 'bg-gray-50 dark:bg-gray-800/80 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white hover:bg-blue-50 dark:hover:bg-blue-900/30'
                          }`}
                        >
                          <div className="truncate pr-2">
                            <span className={`text-[10px] font-black block ${isSelected ? 'text-white' : 'text-blue-500'}`}>
                              Grupo {t.key} ({t.tipoDocente})
                            </span>
                            <span className="font-bold truncate block">{t.nombre}</span>
                          </div>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-white shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Docentes sin Asignar */}
              {unassignedTeachers.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-black uppercase text-amber-600 dark:text-amber-450 mb-1.5">
                    Docentes sin Salón Asignado
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {unassignedTeachers.map((t) => {
                      const isSelected = selectedTeacherToMove?.username === t.username;
                      return (
                        <button
                          key={t.username}
                          type="button"
                          onClick={() => setSelectedTeacherToMove(t)}
                          className={`p-2.5 rounded-xl text-left border transition-all flex items-center justify-between text-xs ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                              : 'bg-gray-50 dark:bg-gray-800/80 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white hover:bg-blue-50 dark:hover:bg-blue-900/30'
                          }`}
                        >
                          <div className="truncate pr-2">
                            <span className={`text-[10px] font-black block ${isSelected ? 'text-white' : 'text-amber-500'}`}>
                              Sin Asignar
                            </span>
                            <span className="font-bold truncate block">{t.nombre}</span>
                          </div>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-white shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* PASO 2: Seleccionar Destino */}
            <div className="pt-3 border-t border-gray-100 dark:border-gray-800 space-y-3">
              <label className="block text-xs font-extrabold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                2. Selecciona el Salón y Cargo:
              </label>

              {/* Botón para desasignar si el docente ya tiene salón */}
              {selectedTeacherToMove && selectedTeacherToMove.key !== 'Sin asignar' && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-800/50 mb-4">
                  <div>
                    <span className="font-black text-rose-900 dark:text-rose-100 text-sm block">Quitar del Salón Actual</span>
                    <span className="text-[10px] text-rose-700 dark:text-rose-300">Regresará a "Docentes sin Asignar"</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPendingAction({
                        message: `¿Estás seguro de quitar la asignación de ${selectedTeacherToMove.nombre}?`,
                        action: async () => {
                          try {
                            if (selectedTeacherToMove.tipoDocente === 'Titular') {
                              onUpdateTeacher(selectedTeacherToMove.key, { nombre: 'Sin docente asignado', observaciones: '—' });
                            }
                            if (selectedTeacherToMove.username) {
                              await updateUserGroupAndType(selectedTeacherToMove.username, '', '');
                            }
                            setShowReassignModal(false);
                            setSelectedTeacherToMove(null);
                          } catch (err) {
                            alert('Error al quitar asignación: ' + err.message);
                          }
                        }
                      });
                    }}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-black text-xs transition-all active:scale-95 shadow-sm"
                  >
                    Quitar Asignación
                  </button>
                </div>
              )}

              <div className="space-y-2">
                {ALLOWED_GROUPS.map((targetGrpKey) => {
                  return (
                    <div key={targetGrpKey} className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 text-xs">
                      <span className="font-black text-gray-900 dark:text-white text-sm shrink-0 w-12">{targetGrpKey}</span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={!selectedTeacherToMove}
                          onClick={() => {
                            if (!selectedTeacherToMove) return;
                            setPendingAction({
                              message: `¿Asignar a ${selectedTeacherToMove.nombre} como Titular en el salón ${targetGrpKey}?`,
                              action: async () => {
                                try {
                                  const currentTitularUser = (users || []).find(u => 
                                    u.assignedGroup === targetGrpKey && u.tipoDocente === 'Titular' &&
                                    ['docente', 'docenta', 'usaer'].includes((u.role || u.baseRole || '').toLowerCase().trim())
                                  );
                                  if (currentTitularUser && currentTitularUser.username !== selectedTeacherToMove.username) {
                                    await updateUserGroupAndType(currentTitularUser.username, '', '');
                                  }

                                  if (selectedTeacherToMove.tipoDocente === 'Titular' && selectedTeacherToMove.key && selectedTeacherToMove.key !== 'Sin asignar') {
                                    onUpdateTeacher(selectedTeacherToMove.key, { nombre: 'Sin docente asignado', observaciones: '—' });
                                  }

                                  onUpdateTeacher(targetGrpKey, {
                                    nombre: selectedTeacherToMove.nombre,
                                    email: selectedTeacherToMove.email || '',
                                    matricula: selectedTeacherToMove.qrCode || '',
                                    observaciones: `Docente Titular de ${targetGrpKey}`,
                                    retardosAcumulados: selectedTeacherToMove.retardosAcumulados || 0
                                  });

                                  if (selectedTeacherToMove.username) {
                                    await updateUserGroupAndType(selectedTeacherToMove.username, targetGrpKey, 'Titular');
                                  }

                                  setShowReassignModal(false);
                                  setSelectedTeacherToMove(null);
                                } catch (err) {
                                  console.error('Error in Asignar Titular:', err);
                                  alert('Error al asignar docente: ' + err.message);
                                }
                              }
                            });
                          }}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-black transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Asignar Titular
                        </button>
                        {['USAER', 'Auxiliar', 'Practicante', 'Servicio Social'].map(targetType => (
                          <button
                            key={targetType}
                            type="button"
                            disabled={!selectedTeacherToMove}
                            onClick={async () => {
                              if (!selectedTeacherToMove) return;
                              if (window.confirm(`¿Asignar a ${selectedTeacherToMove.nombre} como ${targetType} en el salón ${targetGrpKey}?`)) {
                                try {
                                  // 1. If moving from a Titular position, clear the old classroom's display
                                  if (selectedTeacherToMove.tipoDocente === 'Titular' && selectedTeacherToMove.key && selectedTeacherToMove.key !== 'Sin asignar') {
                                    onUpdateTeacher(selectedTeacherToMove.key, { nombre: 'Sin docente asignado', observaciones: '—' });
                                  }

                                  // 2. Update user account
                                  if (selectedTeacherToMove.username) {
                                    await updateUserGroupAndType(selectedTeacherToMove.username, targetGrpKey, targetType);
                                  } else {
                                    alert(`⚠️ Este docente es un registro estático. Para asignarlo como ${targetType}, debe tener una cuenta de usuario registrada en el sistema.`);
                                  }

                                  setShowReassignModal(false);
                                  setSelectedTeacherToMove(null);
                                } catch (err) {
                                  console.error(`Error in Asignar ${targetType}:`, err);
                                  alert('Error al asignar docente: ' + err.message);
                                }
                              }
                            }}
                            className="px-2 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-[10px] sm:text-xs transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                          >
                            {targetType === 'USAER' ? 'U.S.A.E.R' : targetType === 'Servicio Social' ? 'Serv. Social' : targetType}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowReassignModal(false);
                  setSelectedTeacherToMove(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Credentials Modal */}
      {successCredentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-[#182234] rounded-2xl w-full max-w-sm border border-emerald-500/30 shadow-2xl overflow-hidden p-6 relative">
            <div className="flex flex-col items-center text-center pb-4 border-b border-gray-100 dark:border-gray-800">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">
                ¡Docente Registrado!
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                La cuenta ha sido creada exitosamente. Entrega estas credenciales al docente para que inicie sesión:
              </p>
            </div>
            
            <div className="py-5 space-y-4">
              <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl border border-gray-200 dark:border-gray-700">
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Nombre de Usuario</p>
                <p className="text-lg font-black text-blue-600 dark:text-blue-400 tracking-wide font-mono select-all">
                  {successCredentials.username}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl border border-gray-200 dark:border-gray-700">
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Contraseña Temporal</p>
                <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 tracking-wide font-mono select-all">
                  {successCredentials.password}
                </p>
              </div>
            </div>

            <button
              onClick={() => setSuccessCredentials(null)}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md transition-all active:scale-95"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
