import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  UserCheck, Shield, Phone, Mail, BadgeCheck, FileText, 
  Printer, Users, CheckCircle2, AlertTriangle, Clock, GraduationCap, Download, KeyRound, X, ShieldCheck, User, Eye, EyeOff, QrCode, Camera 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import schoolLogo from '../../logo.png';
import jsPDF from 'jspdf';
import { ObservationModal } from '../dashboard/ObservationModal';
import { StudentQRModal } from '../alumnos/StudentQRModal';
import { BiometricEnrollmentModal } from '../biometrics/BiometricEnrollmentModal';
import { db } from '../../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

// Helper to load logo as Base64 for PDF export
const getBase64ImageFromUrl = async (imgUrl) => {
  try {
    const res = await fetch(imgUrl);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    return null;
  }
};

// Helper to convert QR SVG to PNG Data URL
const getQrDataUrl = (svgElement) => {
  return new Promise((resolve) => {
    try {
      if (!svgElement) { resolve(null); return; }
      const xml = new XMLSerializer().serializeToString(svgElement);
      const svg64 = btoa(unescape(encodeURIComponent(xml)));
      const image64 = 'data:image/svg+xml;base64,' + svg64;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 400;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, 400, 400);
        ctx.drawImage(img, 0, 0, 400, 400);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => resolve(null);
      img.src = image64;
    } catch (e) {
      resolve(null);
    }
  });
};

export function DocentePortalView({ teachers, students, onUpdateStudent }) {
  const { user, updateCredentials } = useAuth();
  const qrRef = React.useRef(null);

  const formatTime12h = (time24) => {
    if (!time24) return '--:--';
    const [h, m] = time24.split(':');
    const hours = parseInt(h, 10);
    const suffix = hours >= 12 ? 'p. m.' : 'a. m.';
    const h12 = hours % 12 || 12;
    return `${h12.toString().padStart(2, '0')}:${m} ${suffix}`;
  };

  // Security Change Password Modal state
  const [showModal, setShowModal] = useState(false);
  const [newUsername, setNewUsername] = useState(user?.username || '');
  const [newEmail, setNewEmail] = useState(user?.email || '');
  const [newPassword, setNewPassword] = useState('');
  const [showModalPassword, setShowModalPassword] = useState(false);
  const [cfgError, setCfgError] = useState('');
  const [cfgSuccess, setCfgSuccess] = useState('');
  const [justifyingStudent, setJustifyingStudent] = useState(null);
  const [selectedStudentQR, setSelectedStudentQR] = useState(null);
  
  // Biometrics
  const [showEnrollmentModal, setShowEnrollmentModal] = useState(false);

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

  const handleEnrollBiometrics = async (descriptor) => {
    try {
      const docId = user?.id || (user?.username ? user.username.toLowerCase().trim() : null);
      if (docId) {
        await setDoc(doc(db, 'usuarios', docId), {
          vectorBiometrico: descriptor
        }, { merge: true });
        alert('¡Rostro biométrico registrado y guardado con éxito!');
        setShowEnrollmentModal(false);
      } else {
        alert('Error: No se encontró el ID del usuario para guardar el rostro.');
      }
    } catch (err) {
      console.error('Error saving biometrics:', err);
      alert('Hubo un error al guardar tu perfil facial.');
    }
  };

  const isAdmin = ['Director','Directora','Subdirector','Subdirectora'].includes(user?.role || user?.baseRole);

  const activeTeacher = {
    key: user?.assignedGroup && user.assignedGroup !== 'Ninguno' && user.assignedGroup !== 'Sin Grupo' ? user.assignedGroup : 'Sin Grupo',
    grado: user?.assignedGroup ? user.assignedGroup.split('-')[0] : '—',
    grupo: user?.assignedGroup ? user.assignedGroup.split('-')[1] || 'A' : '—',
    nombre: user?.name || 'Docente',
    telefono: user?.telefono || '—',
    email: user?.email || '—',
    cedula: user?.cedula || '—',
    observaciones: user?.tipoDocente === 'Titular' 
        ? `Docente Titular de ${user?.assignedGroup || 'Sin Grupo'}` 
        : `Docente Auxiliar de ${user?.assignedGroup || 'Sin Grupo'}`,
    retardosAcumulados: user?.retardosAcumulados || 0,
    qrCode: user?.matricula || `DOCENTE-1A`,
    tipoDocente: user?.tipoDocente || 'Auxiliar',
    horario: user?.horario || null
  };

  // Filter students belonging to the active teacher's assigned group
  const assignedStudents = students.filter(s => 
    activeTeacher.key !== 'Sin Grupo' && (
      `${s.grado}-${s.grupo}` === activeTeacher.key ||
      (s.grado === activeTeacher.grado && s.grupo === activeTeacher.grupo)
    )
  );

  const presentCount = assignedStudents.filter(s => s.estado !== 'AUSENTE').length;
  const absentCount = assignedStudents.filter(s => s.estado === 'AUSENTE').length;

  const handlePrintCredencial = async () => {
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [85, 120] }); // Standard ID Card aspect ratio
      const logoBase64 = await getBase64ImageFromUrl(schoolLogo);

      const svgEl = qrRef.current ? qrRef.current.querySelector('svg') : null;
      const qrDataUrl = await getQrDataUrl(svgEl);

      // Card Background Header
      doc.setFillColor(30, 58, 138); // #1E3A8A Dark Blue
      doc.rect(0, 0, 85, 26, 'F');

      if (logoBase64) {
        doc.addImage(logoBase64, 'PNG', 5, 3.5, 18, 18);
      }

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('ESCUELA PRIMARIA', 26, 9);
      doc.text('Sor Juana Inés de la Cruz T.V', 26, 13);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      doc.text('CCT: 18DPR0087R', 26, 17);

      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      doc.text('CREDENCIAL DOCENTE DIGITAL', 26, 21);

      // Teacher Name & Role
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'bold');
      doc.text(activeTeacher.nombre, 42.5, 33, { align: 'center' });

      doc.setTextColor(16, 185, 129); // Emerald
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(`DOCENTE ${activeTeacher.tipoDocente.toUpperCase()} — GRUPO ${activeTeacher.key}`, 42.5, 38, { align: 'center' });

      // Info Details
      doc.setTextColor(71, 85, 105);
      doc.setFontSize(7);
      doc.text(`Cédula Profesional: ${activeTeacher.cedula}`, 12, 45);
      doc.text(`Correo: ${activeTeacher.email}`, 12, 49);
      doc.text(`Teléfono: ${activeTeacher.telefono}`, 12, 53);

      // QR Code Image
      if (qrDataUrl) {
        doc.addImage(qrDataUrl, 'PNG', 20, 56, 45, 45);
      }

      // Bottom Bar
      doc.setFillColor(241, 245, 249);
      doc.rect(5, 104, 75, 10, 'F');
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 116, 139);
      doc.text(`ID QR: ${activeTeacher.qrCode}`, 42.5, 109, { align: 'center' });

      doc.save(`Credencial_Docente_${activeTeacher.nombre.replace(/\s+/g, '_')}.pdf`);
    } catch (e) {
      console.error('Error al generar PDF de docente:', e);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Yellow Security Alert for Temporary PIN / Password */}
      {user?.isTemporary && (
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

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 p-6 rounded-3xl text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-emerald-300 font-extrabold text-xs uppercase tracking-wider mb-1">
            <UserCheck className="w-4 h-4" />
            <span>Portal del Personal Docente</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight font-outfit">
            Bienvenido/a, {activeTeacher.nombre}
          </h1>
          <p className="text-xs text-emerald-100/80 mt-1 max-w-xl font-medium">
            Has iniciado sesión como <strong>{['Titular', 'Docente Titular', 'Auxiliar', 'Docente Auxiliar'].includes(activeTeacher.tipoDocente || activeTeacher.role) ? `Docente ${activeTeacher.tipoDocente || activeTeacher.role}` : (activeTeacher.tipoDocente || activeTeacher.role)}</strong>. 
            Accede a tu credencial digital con código QR y consulta en tiempo real los alumnos a tu cargo{activeTeacher.key !== 'Sin Grupo' && activeTeacher.key !== 'Sin asignar' ? ` en el Grupo ${activeTeacher.key}` : ''}.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-2">
          {/* Registrar Rostro Biométrico Button */}
          <button
            onClick={() => setShowEnrollmentModal(true)}
            className="px-3.5 py-2 rounded-2xl bg-indigo-500/20 hover:bg-indigo-500/30 text-white text-xs font-bold transition-all border border-indigo-500/30 flex items-center gap-2 shadow-sm active:scale-95"
            title="Registrar rostro para asistencia"
          >
            <Camera className="w-4 h-4 text-indigo-300" />
            <span>Registrar Rostro</span>
          </button>
          
          {/* Cambiar Contraseña Button */}
          <button
            onClick={handleOpenModal}
            className="px-3.5 py-2 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all border border-white/15 flex items-center gap-2 shadow-sm active:scale-95"
            title="Cambiar contraseña y datos de acceso"
          >
            <KeyRound className="w-4 h-4 text-emerald-300" />
            <span>Cambiar Contraseña</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Virtual Credencial Card (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 text-white shadow-2xl relative overflow-hidden flex flex-col items-center text-center print-qr-modal">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>

            <div className="w-full flex justify-between items-center mb-4 text-[10px] font-black tracking-wider text-blue-100 uppercase">
              <span>CREDENCIAL DOCENTE DIGITAL</span>
              <span className="bg-white/20 px-2.5 py-0.5 rounded-full">CICLO 2025-2026</span>
            </div>

            <h2 className="text-3xl font-black font-outfit tracking-tight text-white mb-1 mt-2">
              {activeTeacher.nombre}
            </h2>
            <p className="text-xs font-semibold text-blue-100 mb-5">
              {['Titular', 'Docente Titular', 'Auxiliar', 'Docente Auxiliar'].includes(activeTeacher.tipoDocente || activeTeacher.role) ? `Docente ${activeTeacher.tipoDocente || activeTeacher.role}` : (activeTeacher.tipoDocente || activeTeacher.role)} 
              {activeTeacher.key !== 'Sin Grupo' && activeTeacher.key !== 'Sin asignar' ? ` — Grupo ${activeTeacher.key}` : ''}
            </p>

            <div ref={qrRef} className="bg-white p-5 rounded-2xl shadow-2xl my-4 border border-gray-150 flex flex-col items-center">
              {activeTeacher.qrCode ? (
                <QRCodeSVG value={activeTeacher.qrCode} size={210} level="H" includeMargin />
              ) : (
                <div className="w-[210px] h-[210px] flex items-center justify-center bg-gray-50 border border-gray-200 rounded-xl">
                  <QrCode className="w-16 h-16 text-gray-300" />
                </div>
              )}
            </div>

            <span className="text-[11px] font-mono text-blue-200 tracking-wider font-bold mt-2 mb-3">
              ID DOCENTE: {activeTeacher.qrCode}
            </span>

            <button
              onClick={handlePrintCredencial}
              className="w-full mt-2 py-3 bg-white hover:bg-blue-50 text-blue-900 rounded-2xl text-xs font-black transition shadow-lg flex items-center justify-center gap-2 active:scale-95"
            >
              <Printer className="w-4 h-4 text-blue-600" />
              <span>Descargar Credencial Docente (PDF)</span>
            </button>
          </div>

          {/* Horario Asignado */}
          {activeTeacher.horario && (
            <div className="bg-white dark:bg-[#182234] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
              <h3 className="text-base font-black text-slate-900 dark:text-white font-outfit flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-indigo-500" />
                <span>Horario Asignado</span>
              </h3>
              <div className="space-y-2">
                {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'].map(dia => (
                  activeTeacher.horario[dia] && (
                    <div key={dia} className="flex justify-between items-center p-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                      <span className="font-bold text-sm text-slate-700 dark:text-slate-300">{dia}</span>
                      <div className="flex gap-3 text-xs font-mono text-slate-500">
                        <span>ENT: {formatTime12h(activeTeacher.horario[dia].entrada)}</span>
                        <span>SAL: {formatTime12h(activeTeacher.horario[dia].salida)}</span>
                      </div>
                    </div>
                  )
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-7 space-y-6">
          {activeTeacher.key !== 'Sin Grupo' && activeTeacher.key !== 'Sin asignar' ? (
            <>
              {/* Quick Attendance Summary Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white dark:bg-[#182234] border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
                  <div className="flex items-center justify-between text-emerald-500 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Presentes</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <span className="text-2xl font-black text-slate-900 dark:text-white font-outfit">{presentCount}</span>
                </div>

                <div className="bg-white dark:bg-[#182234] border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
                  <div className="flex items-center justify-between text-rose-500 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Ausentes</span>
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <span className="text-2xl font-black text-slate-900 dark:text-white font-outfit">{absentCount}</span>
                </div>
              </div>

          {/* Assigned Students List */}
          <div className="bg-white dark:bg-[#182234] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white font-outfit flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-500" />
                  <span>Alumnos a Cargo (Grupo {activeTeacher.key})</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Total de {assignedStudents.length} estudiantes inscritos en tu grupo asignado.
                </p>
              </div>
            </div>

            {assignedStudents.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-400">
                No hay alumnos registrados en este grupo actualmente.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                {/* VISTA MÓVIL - TARJETAS RESPONSIVAS */}
                <div className="sm:hidden space-y-3">
                  {assignedStudents.map((student) => (
                    <div key={student.id} className="bg-white dark:bg-[#1e293b] rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm transition hover:shadow-md mb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex gap-3">
                        <div
                          className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center text-lg shrink-0 cursor-pointer"
                        >
                          {(student.nombre || "").slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span
                            className="font-bold text-[15px] text-slate-900 dark:text-white"
                          >
                            {student.nombre}
                          </span>
                          <span className="text-slate-500 dark:text-slate-400 text-[11px] mt-1">
                            {student.grado} {student.grupo} • {student.horaEntrada || '13:00'}
                          </span>
                          <span className="text-slate-400 dark:text-slate-500 text-[10px] font-mono mt-0.5">
                            {student.qrCode}
                          </span>
                        </div>
                      </div>
                      <span className={`shrink-0 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        student.estado === 'PRESENTE' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                      }`}>
                        {student.estado}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-1 min-[360px]:gap-2 w-full mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/50">
                      <div className="flex gap-1 min-[360px]:gap-2 shrink-0">
                        <button
                          onClick={() => onUpdateStudent?.(student.id, { ...student, estado: 'PRESENTE' })}
                          className={`w-10 h-10 rounded-xl font-black text-sm flex items-center justify-center transition active:scale-95 ${
                            student.estado === 'PRESENTE' 
                              ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' 
                              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                          }`}
                        >
                          P
                        </button>
                        <button
                          onClick={() => onUpdateStudent?.(student.id, { ...student, estado: 'AUSENTE' })}
                          className={`w-10 h-10 rounded-xl font-black text-sm flex items-center justify-center transition active:scale-95 ${
                            student.estado === 'AUSENTE' 
                              ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20' 
                              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20'
                          }`}
                        >
                          A
                        </button>
                      </div>

                      <div className="flex gap-1 min-[360px]:gap-2 shrink-0">
                        <button
                          onClick={() => setJustifyingStudent(student)}
                          title="Justificar Inasistencia"
                          className="w-10 h-10 rounded-xl text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition flex items-center justify-center bg-amber-500/10"
                        >
                          <FileText size={18} />
                        </button>

                        <button
                          onClick={() => setSelectedStudentQR(student)}
                          title="Ver Código QR"
                          className="w-10 h-10 rounded-xl text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition flex items-center justify-center bg-emerald-500/10"
                        >
                          <QrCode size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                  ))}
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
                      {assignedStudents.map((student) => (
                        <tr key={student.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition">
                          <td className="py-3.5 px-6 font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-500 font-bold flex items-center justify-center text-xs">
                              {(student.nombre || "").slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <span>{student.nombre}</span>
                              <span className="block text-[11px] text-gray-400 font-normal">
                                {student.grado} {student.grupo} • {student.horaEntrada || '13:00'}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-6 font-mono text-xs text-gray-500 dark:text-gray-400">
                            {student.qrCode}
                          </td>
                          <td className="py-3.5 px-6 text-center">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                              student.estado === 'PRESENTE' ? 'bg-emerald-500/15 text-emerald-500' : 'bg-rose-500/15 text-rose-500'
                            }`}>
                              {student.estado}
                            </span>
                          </td>
                          <td className="py-3.5 px-6 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => onUpdateStudent?.(student.id, { ...student, estado: 'PRESENTE' })}
                                className={`w-8 h-8 rounded-lg font-black text-xs flex items-center justify-center transition active:scale-95 ${
                                  student.estado === 'PRESENTE' 
                                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' 
                                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                                }`}
                              >
                                P
                              </button>
                              <button
                                onClick={() => onUpdateStudent?.(student.id, { ...student, estado: 'AUSENTE' })}
                                className={`w-8 h-8 rounded-lg font-black text-xs flex items-center justify-center transition active:scale-95 ${
                                  student.estado === 'AUSENTE' 
                                    ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20' 
                                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20'
                                }`}
                              >
                                A
                              </button>
                              <button
                                onClick={() => setJustifyingStudent(student)}
                                title="Justificar Inasistencia"
                                className="p-1.5 rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition flex items-center gap-1 text-xs font-bold"
                              >
                                <FileText className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setSelectedStudentQR(student)}
                                title="Ver código QR del alumno"
                                className="p-1.5 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition"
                              >
                                <QrCode className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="bg-white dark:bg-[#182234] border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm flex flex-col items-center justify-center text-center h-full min-h-[300px]">
          <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-5">
            <Shield className="w-10 h-10 text-blue-500" />
          </div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white font-outfit mb-2">
            Personal Administrativo / Apoyo
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
            Actualmente no tienes un grupo de alumnos asignado a tu cargo. Tu credencial digital y registro de asistencia funcionan correctamente.
          </p>
        </div>
      )}
    </div>
      </div>

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
                  placeholder="Ej. docente"
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Correo Electrónico */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1 flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-blue-500" />
                  <span>Correo de Recuperación</span>
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
                  <KeyRound className="w-3.5 h-3.5 text-blue-500" />
                  <span>Nueva Contraseña</span>
                </label>
                <div className="relative">
                  <input
                    type={showModalPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Ingresa tu nueva contraseña..."
                    className="w-full pl-3.5 pr-10 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
              </div>

              {/* Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 transition flex items-center justify-center gap-2"
                >
                  <span>Guardar Cambios</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Observation / Justificación Modal */}
      <ObservationModal
        student={justifyingStudent}
        isOpen={!!justifyingStudent}
        onClose={() => setJustifyingStudent(null)}
        onSave={onUpdateStudent}
      />

      {/* QR Modal */}
      <StudentQRModal
        student={selectedStudentQR}
        isOpen={!!selectedStudentQR}
        onClose={() => setSelectedStudentQR(null)}
      />

      {/* Biometric Enrollment Modal */}
      <BiometricEnrollmentModal
        isOpen={showEnrollmentModal}
        onClose={() => setShowEnrollmentModal(false)}
        onEnroll={handleEnrollBiometrics}
        userName={activeTeacher.nombre}
      />
    </div>
  );
}
