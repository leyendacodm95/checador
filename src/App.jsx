import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/layout/Layout';
import { DashboardView } from './components/dashboard/DashboardView';
import { AlumnosView } from './components/alumnos/AlumnosView';
import { QRScannerView } from './components/qr/QRScannerView';
import { ExpedienteView } from './components/expediente/ExpedienteView';
import { ReportesView } from './components/reportes/ReportesView';
import { GroupedAttendanceView } from './components/director/GroupedAttendanceView';
import { DocentesView } from './components/director/DocentesView';
import { AlumnoPortalView } from './components/alumno/AlumnoPortalView';
import { DocentePortalView } from './components/docente/DocentePortalView';
import { DirectivoPortalView } from './components/director/DirectivoPortalView';
import { RemoteCameraScanner } from './components/alumnos/RemoteCameraScanner';
import { BackupView } from './components/director/BackupView';
import { CalendarioSepView } from './components/calendario/CalendarioSepView';
import { LoginView } from './components/auth/LoginView';
import { AsignacionHorariosView } from './components/director/AsignacionHorariosView';
import { BiometricTeacherScanner } from './components/biometrics/BiometricTeacherScanner';
import { initialStats, initialStudents, initialTeachers } from './mock/data';
import { saveLocalIndexedDB, getLocalIndexedDB, syncFirestoreCollection, deleteFirestoreDoc, saveStudentFirestore, saveTeacherFirestore, addLogFirestore, saveDeletionFirestore } from './lib/storageService';
import { db } from './lib/firebase';
import { collection, onSnapshot, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { calculateAttendanceStatus, checkSepSchoolDay } from './lib/sepCalendarService';
import { UpdateAlert } from './components/update/UpdateAlert';

const scanCooldownMap = new Map();

export default function App() {
  // Manejar el caso de acceso desde el celular para escanear
  const searchParams = new URLSearchParams(window.location.search);
  const remoteScanSessionId = searchParams.get('remote_scan');
  if (remoteScanSessionId) {
    return <RemoteCameraScanner sessionId={remoteScanSessionId} />;
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <MainAppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

function MainAppContent() {
  const { activeTab, setActiveTab, user } = useAuth();
  const [stats, setStats] = useState(initialStats);
  
  // Renderiza UpdateAlert globalmente
  const updateAlertComponent = <UpdateAlert />;

  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState({});
  const [logs, setLogs] = useState([]);
  const [deletions, setDeletions] = useState([]);

  const [users, setUsers] = useState([]);
  const [biometricFeedback, setBiometricFeedback] = useState(null);

  // Real-time bidirectional listener for Firestore alumnos collection
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'alumnos'), (snap) => {
      const remoteStudents = [];
      snap.forEach(docSnap => {
        if (docSnap.data()) {
          remoteStudents.push({ id: docSnap.id, ...docSnap.data() });
        }
      });
      // Always set state from Firestore as source of truth
      setStudents(remoteStudents);
    }, err => console.warn('Firestore alumnos snapshot listener error:', err));
    return () => unsub();
  }, []);

  // Derived teachers from 'usuarios' collection
  useEffect(() => {
    const derivedTeachers = {};
    users.forEach(u => {
      // SOLO LOS TITULARES DEBEN OCUPAR EL SLOT PRINCIPAL DEL GRUPO
      if (u.tipoDocente === 'Titular' && u.assignedGroup && u.assignedGroup !== 'Ninguno' && u.assignedGroup !== 'Sin Grupo') {
        derivedTeachers[u.assignedGroup] = {
          id: u.id,
          nombre: u.nombre || u.name || u.username || u.displayName || u.Nombre || u.Name || 'Docente Sin Nombre',
          foto: u.foto || '',
          email: u.email || '—',
          grado: u.role || 'Docente',
          grupo: u.assignedGroup,
          qrCode: u.matricula || `DOCENTE-${u.assignedGroup.replace('°-', '')}`,
          matricula: u.matricula,
          estado: u.estado || 'PRESENTE',
          horaEntrada: u.horaEntrada || '13:00',
          minutosRetraso: u.minutosRetraso || 0,
          retardosAcumulados: u.retardosAcumulados || 0
        };
      }
    });
    setTeachers(derivedTeachers);
  }, [users]);

  // Listener for 'usuarios' (Directors, Subdirectors, Admin, Auxiliars)
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'usuarios'), (snap) => {
      const remoteUsers = [];
      snap.forEach(docSnap => {
        remoteUsers.push({ id: docSnap.id, ...docSnap.data() });
      });
      setUsers(remoteUsers);
    }, err => console.warn('Firestore usuarios snapshot listener error:', err));
    return () => unsub();
  }, []);

  // One-time Migration to Afternoon Times
  useEffect(() => {
    const runMigration = async () => {
      const isMigrated = localStorage.getItem('checador_migrated_pm_times');
      if (!isMigrated) {
        console.log('Running PM Times Migration...');
        try {
          // Migrate students in Firestore
          const snapshot = await getDocs(collection(db, 'alumnos'));
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.horaEntrada && data.horaEntrada.startsWith('08:')) {
              const newTime = data.horaEntrada.replace('08:', '13:');
              setDoc(doc(db, 'alumnos', docSnap.id), { horaEntrada: newTime }, { merge: true });
            } else if (data.horaEntrada && data.horaEntrada.startsWith('07:')) {
              const newTime = data.horaEntrada.replace('07:', '12:');
              setDoc(doc(db, 'alumnos', docSnap.id), { horaEntrada: newTime }, { merge: true });
            }
          });

          // Migrate users/teachers in Firestore
          const uSnapshot = await getDocs(collection(db, 'usuarios'));
          uSnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.horaEntrada && data.horaEntrada.startsWith('08:')) {
              const newTime = data.horaEntrada.replace('08:', '13:');
              setDoc(doc(db, 'usuarios', docSnap.id), { horaEntrada: newTime }, { merge: true });
            } else if (data.horaEntrada && data.horaEntrada.startsWith('07:')) {
              const newTime = data.horaEntrada.replace('07:', '12:');
              setDoc(doc(db, 'usuarios', docSnap.id), { horaEntrada: newTime }, { merge: true });
            }
          });
        } catch (e) {
          console.log('Firestore migration skip or error (normal if no internet):', e);
        }

        // Migrate local logs
        setLogs(prev => {
          let modified = false;
          const newLogs = prev.map(log => {
            if (log.hora && log.hora.startsWith('08:')) { modified = true; return { ...log, hora: log.hora.replace('08:', '13:') }; }
            if (log.hora && log.hora.startsWith('07:')) { modified = true; return { ...log, hora: log.hora.replace('07:', '12:') }; }
            return log;
          });
          if (modified) {
            localStorage.setItem('checador_logs', JSON.stringify(newLogs));
          }
          return newLogs;
        });

        // Migrate local students fallback
        try {
          let localStudentsStr = localStorage.getItem('checador_students');
          if (localStudentsStr) {
              let lStudents = JSON.parse(localStudentsStr);
              lStudents = lStudents.map(s => {
                  if(s.horaEntrada && s.horaEntrada.startsWith('08:')) return {...s, horaEntrada: s.horaEntrada.replace('08:', '13:')};
                  if(s.horaEntrada && s.horaEntrada.startsWith('07:')) return {...s, horaEntrada: s.horaEntrada.replace('07:', '12:')};
                  return s;
              });
              localStorage.setItem('checador_students', JSON.stringify(lStudents));
          }
        } catch (e) {}

        localStorage.setItem('checador_migrated_pm_times', 'true');
        console.log('Migration completed!');
      }
    };
    runMigration();
  }, []);

  // Daily Reset Logic
  useEffect(() => {
    const checkAndRunDailyReset = async () => {
      const todayDateStr = new Date().toLocaleDateString('es-MX');
      const lastResetDateStr = localStorage.getItem('checador_last_daily_reset');

      if (lastResetDateStr !== todayDateStr) {
        console.log(`Running daily reset for: ${todayDateStr}`);
        try {
          const snapshot = await getDocs(collection(db, 'alumnos'));
          const batchPromises = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.estado !== 'PRESENTE' || data.horaEntrada !== '13:00' || (data.observaciones && data.observaciones !== '—')) {
              batchPromises.push(setDoc(doc(db, 'alumnos', docSnap.id), { estado: 'PRESENTE', horaEntrada: '13:00', observaciones: '—' }, { merge: true }));
            }
          });

          // Reset users/teachers in Firestore
          const uSnapshot = await getDocs(collection(db, 'usuarios'));
          uSnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.estado !== 'PRESENTE' || data.horaEntrada !== '13:00' || data.minutosRetraso !== 0 || (data.observaciones && data.observaciones !== '—')) {
              batchPromises.push(setDoc(doc(db, 'usuarios', docSnap.id), { estado: 'PRESENTE', horaEntrada: '13:00', minutosRetraso: 0, observaciones: '—' }, { merge: true }));
            }
          });

          await Promise.all(batchPromises);
          
          localStorage.setItem('checador_last_daily_reset', todayDateStr);
          console.log('Daily reset completed successfully.');
        } catch (e) {
          console.log('Daily reset failed (probably offline), will try again later:', e);
        }
      }
    };

    // Only run if user is logged in to avoid unauthorized Firestore calls
    if (user) {
       checkAndRunDailyReset();
       // Check every 1 hour in case the app is left open overnight
       const interval = setInterval(checkAndRunDailyReset, 1000 * 60 * 60);
       return () => clearInterval(interval);
    }
  }, [user]);

  // Real-time listener for 'asistencias' collection
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'asistencias'), (snap) => {
      const remoteLogs = [];
      snap.forEach(docSnap => {
        if (docSnap.data()) {
          remoteLogs.push({ ...docSnap.data(), id: docSnap.id });
        }
      });
      // Sort by date/time descending or keep as is, GroupedAttendanceView handles it
      setLogs(remoteLogs);
    }, err => console.warn('Firestore logs snapshot listener error:', err));
    return () => unsub();
  }, []);



  const handleDeleteLogs = async (logIds) => {
    try {
      const logsToDelete = logs.filter(log => logIds.includes(log.id));
      setLogs(prev => prev.filter(log => !logIds.includes(log.id)));
      
      for (const logId of logIds) {
        if (logId) {
           await deleteDoc(doc(db, 'asistencias', logId));
        }
      }

      // Reset student/teacher state if it was today's log
      const today = new Date().toLocaleDateString('es-MX');
      const batchPromises = [];
      const processedIds = new Set();

      logsToDelete.forEach(log => {
        if (log.fecha === today) {
          const person = log.person || log.student;
          if (person && !processedIds.has(person.id)) {
            processedIds.add(person.id);
            if (log.tipoPersona === 'Docente' || (log.person && log.person.role)) {
              batchPromises.push(setDoc(doc(db, 'usuarios', String(person.id)), { estado: 'PRESENTE', horaEntrada: '13:00', minutosRetraso: 0, observaciones: '—' }, { merge: true }));
            } else {
              batchPromises.push(setDoc(doc(db, 'alumnos', String(person.id)), { estado: 'PRESENTE', horaEntrada: '13:00', observaciones: '—' }, { merge: true }));
            }
          }
        }
      });
      await Promise.all(batchPromises);
    } catch (err) {
      console.error('Error deleting logs:', err);
    }
  };

  const handleUpdateStudent = (updatedStudent) => {
    const oldStudent = students.find(s => s.id === updatedStudent.id);

    if (oldStudent) {
      const isEstadoChanged = oldStudent.estado !== updatedStudent.estado;
      const isJustificado = oldStudent.observaciones !== updatedStudent.observaciones && updatedStudent.observaciones && updatedStudent.observaciones.trim() !== '' && updatedStudent.observaciones !== '—';

      if (isEstadoChanged || isJustificado) {
        let actionType = 'Modificación';
        
        // Sincronización estricta de estados y observaciones
        if (updatedStudent.estado === 'AUSENTE' && oldStudent.estado === 'PRESENTE') {
          actionType = 'Falta Manual';
          if (!isJustificado && updatedStudent.observaciones === oldStudent.observaciones) {
            updatedStudent.observaciones = '—';
          }
        } else if (updatedStudent.estado === 'PRESENTE' && oldStudent.estado === 'AUSENTE') {
          if (!isJustificado && updatedStudent.observaciones === oldStudent.observaciones) {
            updatedStudent.observaciones = 'Falta justificada';
          }
          actionType = 'Falta Justificada';
        } else if (isJustificado) {
           actionType = 'Falta Justificada';
        } else if (isEstadoChanged) {
           actionType = updatedStudent.estado === 'AUSENTE' ? 'Falta Manual' : 'Asistencia / Justificado';
        }

        const today = new Date().toLocaleDateString('es-MX');
        
        // Find ALL non-Entrada logs for this student today to clean up conflicts
        const idsToDelete = logs.filter(log => 
            log.fecha === today && 
            (log.tipoPersona === 'Alumno' || log.student) && 
            String(log.person?.id || log.student?.id) === String(updatedStudent.id) &&
            log.tipo !== 'Entrada' && log.tipo !== 'Salida'
        ).map(l => l.id);

        if (idsToDelete.length > 0) {
          handleDeleteLogs(idsToDelete);
        }

        const timeStr = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
        
        // Always create a new log so the student STAYS in "Registros del Día"
        const newLog = {
          id: `${updatedStudent.id}_${new Date().getTime()}`,
          student: updatedStudent,
          person: updatedStudent,
          tipoPersona: 'Alumno',
          hora: timeStr,
          fecha: today,
          tipo: actionType,
          minutosRetraso: 0,
          nota: updatedStudent.observaciones !== '—' ? updatedStudent.observaciones : '',
          autor: user?.name || user?.username || 'Usuario'
        };
        
        setLogs(prev => [newLog, ...prev]);
        addLogFirestore(newLog);
      }
    }

    setStudents(prev =>
      prev.map(s => (s.id === updatedStudent.id ? updatedStudent : s))
    );
    saveStudentFirestore(updatedStudent);
  };

  const handleUpdateTeacher = (gradeGroupKey, newTeacherName) => {
    setTeachers(prev => {
      const updated = {
        ...prev,
        [gradeGroupKey]: newTeacherName,
      };
      saveTeacherFirestore(gradeGroupKey, newTeacherName);
      return updated;
    });
  };

  const handleAddStudent = (newStudent, force = false) => {
    if (!force) {
      const normalize = (str) => (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
      const duplicate = students.find(s => normalize(s.nombre) === normalize(newStudent.nombre));
      if (duplicate) {
        return duplicate; // Devuelve el objeto duplicado para manejarlo en la UI
      }
    }

    setStudents(prev => [newStudent, ...prev]);
    setStats(prev => ({
      ...prev,
      totalAlumnos: prev.totalAlumnos + 1,
    }));
    saveStudentFirestore(newStudent);
    return true;
  };

  const handlePromoteGradeCycle = () => {
    let graduatedCount = 0;
    const now = new Date().toLocaleDateString('es-MX');
    const newDeletions = [];

    const updatedStudents = students
      .map(student => {
        if (student.grado === '6°') {
          graduatedCount++;
          newDeletions.push({
            id: String(Date.now() + Math.random()),
            fecha: now,
            alumnoNombre: student.nombre,
            gradoGrupo: `${student.grado} ${student.grupo}`,
            motivo: 'Graduación de Primaria - Fin de Ciclo Escolar',
            usuarioResposable: user?.name || user?.username || 'Director'
          });
          return null;
        }

        let nextGrade = student.grado;
        if (student.grado === '1°') nextGrade = '2°';
        else if (student.grado === '2°') nextGrade = '3°';
        else if (student.grado === '3°') nextGrade = '4°';
        else if (student.grado === '4°') nextGrade = '5°';
        else if (student.grado === '5°') nextGrade = '6°';

        return {
          ...student,
          grado: nextGrade,
          horaEntrada: '13:00',
          estado: 'PRESENTE',
          retardosAcumulados: 0
        };
      })
      .filter(Boolean);

    setStudents(updatedStudents);
    if (newDeletions.length > 0) {
      setDeletions(prev => [...newDeletions, ...prev]);
      newDeletions.forEach(d => saveDeletionFirestore(d));
    }
    // Sincronizar masivamente alumnos al promoverse todo el ciclo escolar
    syncFirestoreCollection('alumnos', updatedStudents);

    alert(`🎓 ¡Promoción de Ciclo Escolar Ejecutada con Éxito!\n\n- Se graduaron ${graduatedCount} alumnos de 6° Grado.\n- Los demás alumnos de 1° a 5° Grado pasaron automáticamente al siguiente año escolar.`);
  };

  const handleScanAttendance = (personId, timeStr, tipoEvento = 'Entrada', tipoPersona = 'Alumno') => {
    // Todos tienen asistencia por defecto (PRESENTE a las 13:00).
    // Escanear el QR ahora significa registrar una Falta/Ausencia.
    let delayMinutes = 0;
    const nuevoEstado = 'AUSENTE';

    let scannedPerson = null;

    if (tipoPersona === 'Alumno') {
      // Find student by ID or by custom qrCode/matricula
      const student = students.find(s => 
        String(s.id) === String(personId) || 
        (s.qrCode && s.qrCode.toLowerCase().trim() === String(personId).toLowerCase().trim())
      );
      if (!student) return;

      const updatedRetardos = (delayMinutes > 0 && tipoEvento === 'Entrada')
        ? (student.retardosAcumulados || 0) + 1
        : (student.retardosAcumulados || 0);

      const updatedStudent = {
        ...student,
        estado: nuevoEstado || student.estado,
        horaEntrada: timeStr,
        minutosRetraso: delayMinutes > 0 ? delayMinutes : (student.minutosRetraso || 0),
        retardosAcumulados: updatedRetardos,
      };

      scannedPerson = {
        ...updatedStudent,
        tipoPersona: 'Alumno',
      };

      setStudents(prev =>
        prev.map(s => s.id === student.id ? updatedStudent : s)
      );

      // Write surgically to Firestore
      saveStudentFirestore(updatedStudent);
    } else {
      // Docentes, Directores, Subdirectores, Auxiliares (todos en Colección usuarios)
      const u = users.find(x => String(x.id) === String(personId) || (x.matricula && x.matricula.toLowerCase() === String(personId).toLowerCase()));
      if (u) {
        const uRoleLower = (u.role || '').toLowerCase();
        const hasFlexibleSchedule = uRoleLower.includes('director') || 
                                    uRoleLower.includes('usaer') || 
                                    uRoleLower.includes('educación especial') || 
                                    uRoleLower.includes('educación física');
                                    
        const finalDelayMinutes = hasFlexibleSchedule ? 0 : delayMinutes;
        const finalEstado = hasFlexibleSchedule ? 'PRESENTE' : (nuevoEstado || 'PRESENTE');

        delayMinutes = finalDelayMinutes; // Update it for the log!

        const updatedUserRetardos = (finalDelayMinutes > 0 && tipoEvento === 'Entrada')
          ? ((u.retardosAcumulados || 0) + 1)
          : (u.retardosAcumulados || 0);

        const updatedUser = {
          ...u,
          estado: finalEstado,
          horaEntrada: timeStr,
          minutosRetraso: finalDelayMinutes > 0 ? finalDelayMinutes : (u.minutosRetraso || 0),
          retardosAcumulados: updatedUserRetardos
        };

        scannedPerson = {
          id: u.id,
          nombre: u.nombre || u.name || u.username || u.displayName || u.Nombre || u.Name || 'Docente Sin Nombre',
          grado: u.role || 'Docente',
          grupo: u.assignedGroup || 'Administrativo',
          qrCode: u.matricula || `USER-${u.id}`,
          tipoPersona: u.role || 'Docente',
          retardosAcumulados: updatedUserRetardos
        };

        // Guardar directamente en la colección usuarios en Firebase
        setDoc(doc(db, 'usuarios', u.id), {
          estado: updatedUser.estado,
          horaEntrada: updatedUser.horaEntrada,
          minutosRetraso: updatedUser.minutosRetraso,
          retardosAcumulados: updatedUser.retardosAcumulados
        }, { merge: true }).catch(err => console.error("Error updating user attendance:", err));
      }
    }

    if (scannedPerson) {
      const newLog = {
        id: `${scannedPerson.id || scannedPerson.nombre}_${new Date().getTime()}`,
        student: scannedPerson, // for backwards compatibility
        person: scannedPerson,
        tipoPersona: scannedPerson.tipoPersona,
        hora: timeStr,
        fecha: new Date().toLocaleDateString('es-MX'),
        tipo: tipoEvento,
        minutosRetraso: delayMinutes,
      };

      // We don't need to manually update state if we are listening to Firestore, 
      // but doing it for immediate UI feedback is fine.
      setLogs(prev => {
        if (prev.some(l => l.id === newLog.id)) return prev;
        return [newLog, ...prev];
      });

      // Write surgically to Firestore
      addLogFirestore(newLog);
    }
  };

  const handleAppBiometricSuccess = async (targetUser) => {
    const timeStr = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    const now = Date.now();
    const lastScan = scanCooldownMap.get(targetUser.id);
    
    // Cooldown de 5 minutos (300,000 ms) para no spamear la base de datos
    if (lastScan && now - lastScan < 300000) {
      setBiometricFeedback({ type: 'success', message: `¡Acceso permitido: ${targetUser.nombre || targetUser.name}! (Ya registrada)` });
      setTimeout(() => setBiometricFeedback(null), 3000);
      return;
    }
    
    scanCooldownMap.set(targetUser.id, now);
    
    // Asumir PRESENTE
    const updatedRetardos = targetUser.retardosAcumulados || 0;
    
    // Update en Firestore colección usuarios
    await setDoc(doc(db, 'usuarios', targetUser.id), {
      estado: 'PRESENTE',
      horaEntrada: timeStr,
      minutosRetraso: 0,
      retardosAcumulados: updatedRetardos
    }, { merge: true });

    // Guardar log
    const scannedPerson = {
      id: targetUser.id,
      nombre: targetUser.nombre || targetUser.name || targetUser.username || targetUser.displayName || 'Docente',
      grado: targetUser.role || 'Docente',
      grupo: targetUser.assignedGroup || 'Administrativo',
      qrCode: targetUser.matricula || `USER-${targetUser.id}`,
      tipoPersona: targetUser.role || 'Docente',
      retardosAcumulados: updatedRetardos
    };

    const newLog = {
      id: `${scannedPerson.id || scannedPerson.nombre}_${new Date().getTime()}`,
      student: scannedPerson, // For backward compatibility
      person: scannedPerson,
      tipoPersona: scannedPerson.tipoPersona,
      hora: timeStr,
      fecha: new Date().toLocaleDateString('es-MX'),
      tipo: 'Entrada',
      minutosRetraso: 0,
    };

    setLogs(prev => {
      if (prev.some(l => l.id === newLog.id)) return prev;
      return [newLog, ...prev];
    });

    addLogFirestore(newLog);

    setBiometricFeedback({ type: 'success', message: `¡Acceso permitido: ${targetUser.nombre || targetUser.name}!` });
    setTimeout(() => setBiometricFeedback(null), 3000);
  };

  const handleClearLogs = async () => {
    try {
      const allIds = logs.map(l => l.id);
      setLogs([]); // optimistic clear
      for (const logId of allIds) {
        if (logId) {
          await deleteDoc(doc(db, 'asistencias', logId));
        }
      }
    } catch (err) {
      console.error('Error clearing logs from DB:', err);
    }
  };


  const handleDeleteOldLogs = async (months) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar todas las asistencias con más de ${months} mes(es) de antigüedad de Firebase? Esto no se puede deshacer.`)) return;
    
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - months);
    
    const logsToDelete = logs.filter(log => {
      if (!log.fecha) return false;
      let logDate;
      if (log.fecha.includes('-')) {
        logDate = new Date(log.fecha + 'T12:00:00');
      } else {
        const parts = log.fecha.split('/');
        if (parts.length === 3) {
          const p0 = parseInt(parts[0], 10);
          const p1 = parseInt(parts[1], 10);
          const p2 = parseInt(parts[2], 10);
          logDate = p1 > 12 
            ? new Date(p2, p0 - 1, p1) 
            : new Date(p2, p1 - 1, p0);
        } else {
           return false;
        }
      }
      return logDate < cutoffDate;
    });

    if (logsToDelete.length === 0) {
      alert(`No se encontraron registros con más de ${months} mes(es) de antigüedad.`);
      return;
    }

    try {
      let deletedCount = 0;
      for (const log of logsToDelete) {
        if (log.id) {
           await deleteDoc(doc(db, 'asistencias', log.id));
           deletedCount++;
        }
      }
      alert(`Limpieza completada. Se eliminaron ${deletedCount} registros antiguos de la nube.`);
    } catch (err) {
      console.error("Error borrando logs:", err);
      alert("Hubo un error al intentar eliminar algunos registros.");
    }
  };

  const handleRestoreDB = (backupData) => {
    // 1. Accumulative Student Merge (avoid duplicates by ID)
    if (Array.isArray(backupData.students)) {
      setStudents(prev => {
        const map = new Map();
        prev.forEach(s => map.set(String(s.id), s));
        backupData.students.forEach(s => map.set(String(s.id), s));
        return Array.from(map.values());
      });
    }

    // 2. Accumulative Teacher Merge (combine group keys)
    if (backupData.teachers && typeof backupData.teachers === 'object') {
      setTeachers(prev => ({
        ...prev,
        ...backupData.teachers
      }));
    }

    // 3. Accumulative Logs / Attendance Merge (combine uniquely by student + fecha + hora)
    if (Array.isArray(backupData.logs)) {
      setLogs(prev => {
        const logKeys = new Set(prev.map(l => `${l.student?.id || l.student?.nombre}-${l.fecha}-${l.hora}`));
        const newLogs = backupData.logs.filter(l => !logKeys.has(`${l.student?.id || l.student?.nombre}-${l.fecha}-${l.hora}`));
        return [...newLogs, ...prev];
      });
    }

    // 4. Accumulative Deletions Audit Merge
    if (Array.isArray(backupData.deletions)) {
      setDeletions(prev => {
        const delIds = new Set(prev.map(d => d.id));
        const newDels = backupData.deletions.filter(d => !delIds.has(d.id));
        return [...newDels, ...prev];
      });
    }
  };

  const handleDeleteStudent = (studentId, reason) => {
    const student = students.find(s => s.id === studentId);
    if (student) {
      const newDeletion = {
        id: String(Date.now()),
        tipoPersona: 'Alumno',
        nombre: student.nombre,
        detalle: `${student.grado} ${student.grupo}`,
        motivo: reason,
        fecha: new Date().toLocaleDateString('es-MX'),
        hora: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
      };
      setDeletions(prev => [newDeletion, ...prev]);

      // Write surgically to Firestore
      saveDeletionFirestore(newDeletion);

      // Delete from Firestore cloud database
      deleteFirestoreDoc('alumnos', studentId);

      setStudents(prev => prev.filter(s => s.id !== studentId));
      setStats(prev => ({
        ...prev,
        totalAlumnos: Math.max(0, prev.totalAlumnos - 1),
      }));

      alert(`Alumno "${student.nombre}" fue dado de baja correctamente del sistema.\nMotivo registrado: "${reason}"`);
    }
  };

  const handleDeleteTeacher = (gradeGroupKey, reason) => {
    const teacherVal = teachers[gradeGroupKey];
    const teacherName = typeof teacherVal === 'object' ? teacherVal.nombre : (teacherVal || 'Docente');
    
    const newDeletion = {
      id: String(Date.now()),
      tipoPersona: 'Docente',
      nombre: teacherName,
      detalle: `Grupo ${gradeGroupKey}`,
      motivo: reason,
      fecha: new Date().toLocaleDateString('es-MX'),
      hora: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
    };
    setDeletions(prev => [newDeletion, ...prev]);

    // Write surgically to Firestore
    saveDeletionFirestore(newDeletion);

    // Delete from Firestore cloud database
    deleteFirestoreDoc('docentes', gradeGroupKey);

    // Clear assignedGroup for any user account assigned to this classroom
    const clearUserGroup = async () => {
      try {
        const snap = await getDocs(collection(db, 'usuarios'));
        snap.forEach(async (d) => {
          const userData = d.data();
          if (userData && userData.assignedGroup === gradeGroupKey) {
            if (userData.tipoDocente === 'Titular') {
              await deleteDoc(doc(db, 'usuarios', d.id));
            } else {
              await setDoc(doc(db, 'usuarios', d.id), { assignedGroup: '' }, { merge: true });
            }
          }
        });
      } catch (err) {
        console.warn('Error clearing user assignedGroup on delete:', err);
      }
    };
    clearUserGroup();

    setTeachers(prev => {
      const copy = { ...prev };
      delete copy[gradeGroupKey];
      return copy;
    });

    alert(`Docente "${teacherName}" del Grupo ${gradeGroupKey} fue dado de baja de su cargo.\nMotivo registrado: "${reason}"`);
  };

  const handleDeleteHistoryItem = (deletionId) => {
    setDeletions(prev => prev.filter(d => d.id !== deletionId));
    deleteFirestoreDoc('eliminaciones', deletionId);
  };

  const handleResetMonthlyRetardos = () => {
    setStudents(prev => prev.map(s => ({ ...s, retardosAcumulados: 0 })));
    setTeachers(prev => {
      const updated = {};
      Object.keys(prev).forEach(key => {
        const val = prev[key];
        if (typeof val === 'object') {
          updated[key] = { ...val, retardosAcumulados: 0 };
        } else {
          updated[key] = { nombre: val, retardosAcumulados: 0 };
        }
      });
      return updated;
    });
  };

  if (!user) {
    return <LoginView />;
  }

  const baseRole = user?.baseRole || user?.role;
  const rLower = (baseRole || '').toLowerCase().trim();
  const isBaseAdmin = ['director','directora','subdirector','subdirectora'].includes(rLower);
  const isBaseDocente = ['docente','docenta'].includes(rLower);

  return (
    <Layout>
      {isBaseAdmin && (activeTab === 'Panel de control' || activeTab === 'Asistencia') && (
        <DashboardView
          stats={{
            ...stats,
            totalDocentes: Object.keys(teachers).length,
            totalAlumnos: students.length,
          }}
          students={students}
          teachers={teachers}
          logs={logs}
          onUpdateStudent={handleUpdateStudent}
          onDeleteStudent={handleDeleteStudent}
        />
      )}

      {isBaseAdmin && (activeTab === 'Registros del Día' || activeTab === 'Asistencia General') && (
        <GroupedAttendanceView
          students={students}
          teachers={teachers}
          logs={logs}
          users={users}
          onClearLogs={handleClearLogs}
          onDeleteLogs={handleDeleteLogs}
          onDeleteOldLogs={handleDeleteOldLogs}
        />
      )}

      {activeTab === 'Alumnos' && (
        <AlumnosView
          students={students}
          teachers={teachers}
          onAddStudent={handleAddStudent}
          onUpdateStudent={handleUpdateStudent}
          onDeleteStudent={handleDeleteStudent}
          onUpdateTeacher={handleUpdateTeacher}
          onPromoteGradeCycle={handlePromoteGradeCycle}
        />
      )}

      {isBaseAdmin && activeTab === 'Docentes' && (
        <DocentesView
          teachers={teachers}
          onUpdateTeacher={handleUpdateTeacher}
          onDeleteTeacher={handleDeleteTeacher}
        />
      )}

      {isBaseAdmin && activeTab === 'Horarios' && (
        <AsignacionHorariosView />
      )}

      {activeTab === 'Escáner QR' && (
        <QRScannerView
          students={students}
          teachers={teachers}
          users={users}
          onScanAttendance={handleScanAttendance}
        />
      )}

      {activeTab === 'Asistencia Docentes' && (
        <div className="p-4 md:p-6 max-w-lg mx-auto space-y-4 animate-fadeIn">
          <div className="text-center mb-2">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">Asistencia Docentes</h3>
            <p className="text-[11px] text-slate-500 dark:text-[#8e8e93] mt-1 leading-relaxed">
              Párate frente a la cámara. El reconocimiento es automático.
            </p>
          </div>

          {biometricFeedback && (
            <div className={`mb-4 border text-xs font-bold p-3 rounded-2xl flex items-center gap-2 ${biometricFeedback.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/10 border-amber-500/25 text-amber-600 dark:text-amber-400'}`}>
              <span>{biometricFeedback.message}</span>
            </div>
          )}

          <BiometricTeacherScanner
            users={users}
            isPaused={!!biometricFeedback}
            onSuccess={handleAppBiometricSuccess}
            onCancel={() => setActiveTab(isBaseAdmin ? 'Panel de control' : 'Portal Docente')}
          />
        </div>
      )}

      {activeTab === 'Calendario SEP' && <CalendarioSepView />}

      {activeTab === 'Historial' && (
        <ReportesView
          students={students}
          teachers={teachers}
          logs={logs}
          deletions={deletions}
          onDeleteHistoryItem={handleDeleteHistoryItem}
        />
      )}

      {activeTab === 'Portal Alumno' && <AlumnoPortalView students={students} logs={logs} />}

      {activeTab === 'Portal Docente' && (
        <DocentePortalView 
          teachers={teachers} 
          students={students} 
          onUpdateStudent={handleUpdateStudent}
        />
      )}

      {isBaseAdmin && activeTab === 'Portal Directivo' && (
        <DirectivoPortalView />
      )}

      {isBaseAdmin && activeTab === 'Respaldo' && (
        <BackupView
          students={students}
          teachers={teachers}
          logs={logs}
          deletions={deletions}
          onRestoreDB={handleRestoreDB}
        />
      )}
      
      {updateAlertComponent}
    </Layout>
  );
}


