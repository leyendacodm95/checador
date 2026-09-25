import React, { useState, useEffect } from 'react';
import { User, Key, Eye, EyeOff, Mail, Copy, Check, Lock, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import logoImg from '../../logo.png';
import { BiometricTeacherScanner } from '../biometrics/BiometricTeacherScanner';
import { CalendarioSepView } from '../calendario/CalendarioSepView';
import { db } from '../../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { addLogFirestore } from '../../lib/storageService';

const scanCooldownMap = new Map();

export const rolesInfo = [
  { id: 'Director', label: 'Director', subtitle: 'Administración', code: 'DIRECTOR-01', hasLimit: true, max: 1 },
  { id: 'Subdirector', label: 'Subdirector', subtitle: 'Académico', code: 'SUBDIRECTOR-01', hasLimit: true, max: 1 },
  { id: 'Docente Titular', label: 'Docente Titular', subtitle: 'Frente a Grupo (1º-6º)', code: 'DOCENTE-1A', hasLimit: false },
  { id: 'Educación Especial', label: 'Educación Especial', subtitle: 'U.S.A.E.R / Inclusión', code: 'USAER-01', hasLimit: false },
  { id: 'Intendente', label: 'Intendente', subtitle: 'Intendencia / Apoyo', code: 'INTENDENTE-01', hasLimit: false },
  { id: 'Educación Física', label: 'Educación Física', subtitle: 'Deporte / Activación', code: 'EDFISICA-01', hasLimit: false },
  { id: 'Psicología', label: 'Psicología', subtitle: 'Orientación Escolar', code: 'PSICO-01', hasLimit: false },
  { id: 'Docente Auxiliar', label: 'Docente Auxiliar', subtitle: '', code: 'AUXILIAR-01', hasLimit: false },
  { id: 'Servicio Social', label: 'Servicio Social', subtitle: 'Apoyo', code: 'SERVICIO-01', hasLimit: false },
  { id: 'Prácticas Profesionales', label: 'Prácticas Prof.', subtitle: 'Desarrollo', code: 'PRACTICAS-01', hasLimit: false }
];

export function LoginView() {
  const {
    login, registerUser, users,
    recoverPassword, verifyRecoveryIdentity, resetPassword
  } = useAuth();

  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'recovery' | 'verify' | 'new_password' | 'success' | 'biometric' | 'biometric_portal'
  const [biometricPortalUser, setBiometricPortalUser] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [biometricUsuario, setBiometricUsuario] = useState('');
  const [biometricFeedback, setBiometricFeedback] = useState(null);

  // Form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [savedUsernames, setSavedUsernames] = useState(() => {
    try {
      const saved = localStorage.getItem('checador_saved_usernames');
      // Migración temporal si el usuario usaba la versión de string
      const legacySaved = localStorage.getItem('checador_saved_username');
      if (legacySaved && !saved) {
        localStorage.removeItem('checador_saved_username');
        const legacyArray = [legacySaved];
        localStorage.setItem('checador_saved_usernames', JSON.stringify(legacyArray));
        return legacyArray;
      }
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [rememberUser, setRememberUser] = useState(() => {
    try {
      const saved = localStorage.getItem('checador_saved_usernames');
      const legacySaved = localStorage.getItem('checador_saved_username');
      return (saved && JSON.parse(saved).length > 0) || !!legacySaved;
    } catch {
      return false;
    }
  });
  const [showSavedUsers, setShowSavedUsers] = useState(false);
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regUser, setRegUser] = useState('');
  const [regPass, setRegPass] = useState('');
  const [regRole, setRegRole] = useState('Director'); // Director, Subdirector, Docente
  
  // Docente Titular / Generales specific states
  const [regGrado, setRegGrado] = useState('Sin Grupo');
  const [regGrupo, setRegGrupo] = useState('');

  // Custom Matrícula / QR Code states
  const [regMatricula, setRegMatricula] = useState('');
  const [isCustomMatricula, setIsCustomMatricula] = useState(false);

  // Recovery states
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [identityInput, setIdentityInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Temporary PIN state for Director & Subdirector registration
  const [tempDirectorPin, setTempDirectorPin] = useState('');
  const [tempSubPin, setTempSubPin] = useState('');
  const [copiedPin, setCopiedPin] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Check roles availability
  const hasDirector = users.some(u => ['director', 'directora'].includes((u.role || u.baseRole || '').toLowerCase().trim()));
  const hasSubdirector = users.some(u => ['subdirector', 'subdirectora'].includes((u.role || u.baseRole || '').toLowerCase().trim()));

  // Generate random 8-digit temporary PIN for Director if no Director exists
  useEffect(() => {
    if (!hasDirector && !tempDirectorPin) {
      const generatedPin = `${Math.floor(10000000 + Math.random() * 90000000)}`;
      setTempDirectorPin(generatedPin);
    }
  }, [hasDirector, tempDirectorPin]);

  // Generate random 8-digit temporary PIN for Subdirector if no Subdirector exists
  useEffect(() => {
    if (!hasSubdirector && !tempSubPin) {
      const generatedPin = `${Math.floor(10000000 + Math.random() * 90000000)}`;
      setTempSubPin(generatedPin);
    }
  }, [hasSubdirector, tempSubPin]);

  // Automatically select the highest available role on registration
  useEffect(() => {
    if (!hasDirector) {
      setRegRole('Director');
    } else if (!hasSubdirector) {
      setRegRole('Subdirector');
    } else {
      setRegRole('Docente');
    }
    setRegPass('');
  }, [hasDirector, hasSubdirector]);

  // Autocomplete Matrícula field based on Role unless customized manually
  useEffect(() => {
    if (!isCustomMatricula) {
      const currentRole = rolesInfo.find(r => r.id === regRole);
      if (currentRole) {
        setRegMatricula(currentRole.code);
      } else {
        setRegMatricula('TEACHER-1A');
      }
    }
  }, [regRole, isCustomMatricula]);

  const handleCopyAndPastePin = (pinToCopy) => {
    setRegPass(pinToCopy); // Auto-fill into password field
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(pinToCopy);
    }
    setCopiedPin(true);
    setTimeout(() => setCopiedPin(false), 2500);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    const res = await login(username, password);
    if (!res.success) {
      setError(res.error);
    } else {
      if (rememberUser && username) {
        try {
          const currentSaved = localStorage.getItem('checador_saved_usernames');
          let parsed = currentSaved ? JSON.parse(currentSaved) : [];
          const updated = [...new Set([username, ...parsed])];
          localStorage.setItem('checador_saved_usernames', JSON.stringify(updated));
        } catch (e) {
          localStorage.setItem('checador_saved_usernames', JSON.stringify([username]));
        }
      }
    }
  };

  const handleBiometricSuccess = async (targetUser) => {
    const timeStr = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    const now = Date.now();
    const lastScan = scanCooldownMap.get(targetUser.id);
    
    // Cooldown de 5 minutos
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

    const scannedPerson = {
      id: targetUser.id,
      nombre: targetUser.nombre || targetUser.name || targetUser.username || targetUser.displayName || 'Docente',
      grado: targetUser.role || 'Docente',
      grupo: targetUser.assignedGroup || 'Administrativo',
      qrCode: targetUser.matricula || `USER-${targetUser.id}`,
      tipoPersona: targetUser.role || 'Docente',
      retardosAcumulados: updatedRetardos
    };

    // Guardar log
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

    addLogFirestore(newLog);

    setBiometricFeedback({ type: 'success', message: `¡Acceso permitido: ${targetUser.nombre || targetUser.name}!` });
    setTimeout(() => setBiometricFeedback(null), 3000);
  };

  // Auto-revert portal to fixed camera after 5 seconds
  useEffect(() => {
    let timer;
    if (mode === 'biometric_portal') {
      timer = setTimeout(() => {
        setBiometricPortalUser(null);
        setMode('biometric');
      }, 5000);
    }
    return () => clearTimeout(timer);
  }, [mode]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    try {
      const res = await registerUser({
        name: regName,
        email: regEmail,
        username: regUser,
        password: regPass,
        matricula: regMatricula,
        role: regRole,
        tipoDocente: regRole,
        assignedGroup: (regRole !== 'Director' && regRole !== 'Subdirector' && regGrado !== 'Sin Grupo') ? `${regGrado}-${regGrupo}` : 'Sin Grupo',
      });

      if (res.success) {
        setSuccess(`¡Usuario registrado con éxito! Inicie sesión con el usuario "${regUser}".`);
        setRegName('');
        setRegEmail('');
        setRegUser('');
        setRegPass('');
        setRegMatricula('');
        setIsCustomMatricula(false);
        setMode('login');
      } else {
        setError(res.error);
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError('Ocurrió un error al intentar registrar el usuario. Intente nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestRecovery = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    const res = await recoverPassword(recoveryEmail);
    setLoading(false);

    if (res.success) {
      setMode('verify');
    } else {
      setError(res.error);
    }
  };

  const handleVerifyIdentity = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    const res = await verifyRecoveryIdentity(recoveryEmail, identityInput);
    setLoading(false);
    if (res.success) {
      setMode('new_password');
    } else {
      setError(res.error);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    const res = await resetPassword(recoveryEmail, newPassword);
    setLoading(false);

    if (res.success) {
      setRecoveryEmail('');
      setIdentityInput('');
      setNewPassword('');
      setConfirmPassword('');
      setMode('success');
    } else {
      setError(res.error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#e4e8f0] dark:bg-[#000000] p-4 font-sans select-none transition-colors duration-300">
      <div className={`w-full ${mode === 'biometric_portal' ? 'max-w-5xl' : 'max-w-md'} bg-[#f1f3f7] dark:bg-[#1c1c1e] rounded-3xl border border-slate-200 dark:border-[#2c2c2e] p-6 shadow-2xl relative overflow-hidden transition-all duration-300`}>

        {/* Branding header */}
        {mode !== 'biometric_portal' && (
          <div className="flex flex-col items-center text-center mb-6">
            <img
              src={logoImg}
              alt="Escudo Oficial"
              className="w-20 h-20 object-contain bg-white rounded-2xl p-1.5 shadow-md mb-3"
            />
            <h2 className="text-lg font-black font-outfit text-slate-800 dark:text-white leading-tight">
              Sor Juana Inés de la Cruz T.V
            </h2>
            <span className="text-[11px] text-blue-500 dark:text-blue-400 mt-0.5 block font-bold">CCT: 18DPR0087R</span>
            <p className="text-[10px] text-slate-400 dark:text-[#8e8e93] font-bold uppercase tracking-wider mt-1">
              Sistema de Acceso Escolar
            </p>
          </div>
        )}

        {/* Alert banners */}
        {error && (
          <div className="mb-4 bg-rose-500/10 border border-rose-500/25 text-rose-600 dark:text-rose-400 text-xs font-bold p-3 rounded-2xl flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-rose-500 rounded-full shrink-0 animate-ping"></span>
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="mb-4 bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-xs font-bold p-3 rounded-2xl flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shrink-0"></span>
            <span>{success}</span>
          </div>
        )}

        {/* MODE: LOGIN */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider pl-1">Usuario</label>
              <div className="relative">
                <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="ej. Juan_pérez"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onFocus={() => setShowSavedUsers(true)}
                  onBlur={() => setTimeout(() => setShowSavedUsers(false), 200)}
                  autoFocus
                  className="w-full pl-10 pr-4 py-2.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-[#2c2c2e] bg-white dark:bg-[#1c1c1e] text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
                {showSavedUsers && savedUsernames.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-[#2c2c2e] rounded-xl shadow-lg z-50 overflow-hidden">
                    {savedUsernames.map((u) => (
                      <div
                        key={u}
                        className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-[#2c2c2e] cursor-pointer"
                        onMouseDown={(e) => {
                          e.preventDefault(); // Prevents blur from firing
                          setUsername(u);
                          setShowSavedUsers(false);
                        }}
                      >
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{u}</span>
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSavedUsernames(prev => {
                              const updated = prev.filter(item => item !== u);
                              localStorage.setItem('checador_saved_usernames', JSON.stringify(updated));
                              if (updated.length === 0) setRememberUser(false);
                              return updated;
                            });
                          }}
                          className="text-slate-400 hover:text-red-500"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center px-1">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Contraseña</label>
                <button
                  type="button"
                  onClick={() => setMode('recovery')}
                  className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  ¿Olvidó su contraseña?
                </button>
              </div>
              <div className="relative">
                <Key className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Introduzca su contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-[#2c2c2e] bg-white dark:bg-[#1c1c1e] text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 px-1">
              <input
                type="checkbox"
                id="rememberUser"
                checked={rememberUser}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setRememberUser(checked);
                  if (!checked) {
                    setSavedUsernames([]);
                    localStorage.removeItem('checador_saved_usernames');
                  }
                }}
                className="w-3.5 h-3.5 text-blue-600 bg-white border-slate-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-slate-800 dark:bg-slate-700 dark:border-slate-600"
              />
              <label htmlFor="rememberUser" className="text-[11px] font-bold text-slate-500 dark:text-slate-400 cursor-pointer">
                Recordar usuario
              </label>
            </div>

            <button
              type="submit"
              className="w-full bg-[#2b66f6] hover:bg-blue-700 text-white font-extrabold py-3 px-4 rounded-xl text-xs tracking-wider uppercase transition-colors shadow-md mt-2"
            >
              Iniciar Sesión
            </button>

            <div className="text-center pt-3 border-t border-slate-200 dark:border-[#2c2c2e] mt-4">
              <span className="text-[11px] text-slate-450 dark:text-[#8e8e93]">¿Desea agregar un docente? </span>
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setSuccess('');
                  setMode('register');
                }}
                className="text-[11px] font-black text-blue-600 dark:text-blue-400 hover:underline"
              >
                Regístrese aquí
              </button>
            </div>
          </form>
        )}

        {/* Quick access to Student Portal */}
        {mode === 'login' && (
          <div className="mt-4 pt-3 border-t border-slate-200 dark:border-[#2c2c2e] text-center space-y-3">
            <div>
              <button
                type="button"
                onClick={() => {
                  login('alumno', '123');
                }}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-extrabold rounded-xl text-xs tracking-wider uppercase transition-all shadow-lg shadow-blue-600/20 active:scale-95"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg>
                Acceder al Portal de Alumnos
              </button>
              <p className="text-[10px] text-slate-400 dark:text-[#8e8e93] mt-2 font-medium">
                Acceso directo para ver credenciales y estado de asistencia
              </p>
            </div>
            
            <div className="pt-3 border-t border-slate-200 dark:border-[#2c2c2e]">
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setSuccess('');
                  setMode('biometric');
                }}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-extrabold rounded-xl text-xs tracking-wider uppercase transition-all shadow-lg shadow-blue-600/20 active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4" />
                Asistencia Docentes
              </button>
              <p className="text-[10px] text-slate-400 dark:text-[#8e8e93] mt-2 font-medium">
                Pase de asistencia facial automático
              </p>
            </div>
          </div>
        )}

        {/* MODE: BIOMETRIC ATTENDANCE (Fixed Camera) */}
        {mode === 'biometric' && (
          <div className="space-y-4">
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
              onSuccess={handleBiometricSuccess}
              onCancel={() => {
                setMode('login');
              }}
            />
          </div>
        )}
        
        {/* MODE: REGISTER */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-3.5">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider pl-1">Nombre Completo</label>
              <div className="relative">
                <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="ej. Juan Pérez"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-[#2c2c2e] bg-white dark:bg-[#1c1c1e] text-slate-800 dark:text-white focus:outline-none"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider pl-1">Correo Electrónico (Recuperación)</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  placeholder="ej. correo@escuela.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-[#2c2c2e] bg-white dark:bg-[#1c1c1e] text-slate-800 dark:text-white focus:outline-none"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider pl-1">Usuario</label>
                <input
                  type="text"
                  placeholder="ej. Juan_pérez"
                  autoComplete="off"
                  value={regUser}
                  onChange={(e) => setRegUser(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-[#2c2c2e] bg-white dark:bg-[#1c1c1e] text-slate-800 dark:text-white focus:outline-none"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider pl-1">Contraseña</label>
                <div className="relative">
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    placeholder="Contraseña"
                    autoComplete="new-password"
                    value={regPass}
                    onChange={(e) => setRegPass(e.target.value)}
                    className="w-full pl-3 pr-9 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-[#2c2c2e] bg-white dark:bg-[#1c1c1e] text-slate-800 dark:text-white focus:outline-none"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-white p-0.5"
                    title={showRegPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-1.5 mt-2">
              <div className="flex items-center justify-between px-1">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Rol / Cargo
                </label>
                <span className="text-[10px] font-extrabold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full border border-blue-200/50 dark:border-blue-800/50">
                  {regRole}
                </span>
              </div>
        
              {/* Cuadrícula de Roles interactiva */}
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1.5 border border-slate-200 dark:border-[#2c2c2e] rounded-2xl bg-white/60 dark:bg-[#151516]/60 custom-scrollbar">
                {rolesInfo.map((rItem) => {
                  const isSelected = regRole === rItem.id;
                  
                  // Lógica para deshabilitar si ya se alcanzó el límite
                  let isDisabled = false;
                  if (rItem.id === 'Director' && hasDirector) isDisabled = true;
                  if (rItem.id === 'Subdirector' && hasSubdirector) isDisabled = true;
                  
                  // Check existing users for limited roles like Ed Fisica (max 3), USAER (max 1), etc.
                  if (rItem.hasLimit && rItem.id !== 'Director' && rItem.id !== 'Subdirector') {
                    const currentCount = users.filter(u => u.role === rItem.id || u.baseRole === rItem.id).length;
                    if (currentCount >= rItem.max) isDisabled = true;
                  }

                  let btnClasses = 'p-2.5 rounded-xl text-left border transition-all flex flex-col justify-between relative text-xs ';
                  
                  if (isDisabled) {
                    btnClasses += 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400';
                  } else if (isSelected) {
                    btnClasses += 'bg-blue-600 dark:bg-[#2c2c2e] text-white border-blue-600 dark:border-[#4a4a4c] shadow-md dark:shadow-none ring-2 dark:ring-0 ring-blue-400/30';
                  } else {
                    btnClasses += 'bg-white dark:bg-[#1c1c1e] border-slate-200 dark:border-[#2c2c2e] text-slate-700 dark:text-slate-200 hover:border-blue-400 dark:hover:border-[#3a3a3c] cursor-pointer';
                  }

                  const titleColor = isSelected ? 'text-white' : 'text-slate-800 dark:text-white';
                  const subtitleColor = isSelected ? 'text-blue-100 dark:text-gray-400' : 'text-slate-400 dark:text-slate-500';

                  return (
                    <button
                      key={rItem.id}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => {
                        setRegRole(rItem.id);
                        setRegPass('');
                      }}
                      className={btnClasses}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className={`text-[11px] font-black leading-tight ${titleColor}`}>
                          {rItem.label}
                        </span>
                        {isSelected && (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        )}
                      </div>
                      <span className={`text-[9px] line-clamp-1 font-medium ${subtitleColor}`}>
                        {isDisabled ? 'Límite alcanzado' : rItem.subtitle}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selector de Grado y Grupo (Opcional para todos excepto Director/Subdirector) */}
            {regRole !== 'Director' && regRole !== 'Subdirector' && (
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider pl-1">Grado (Opcional)</label>
                  <select
                    value={regGrado}
                    onChange={(e) => {
                      setRegGrado(e.target.value);
                      if (e.target.value !== 'Sin Grupo' && regGrupo === '') {
                        setRegGrupo('A');
                      }
                    }}
                    className="w-full px-3 py-2.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-[#2c2c2e] bg-white dark:bg-[#1c1c1e] text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="Sin Grupo">(Sin Asignar)</option>
                    {['1°', '2°', '3°', '4°', '5°', '6°'].map(g => (
                      <option key={g} value={g}>{g} Grado</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider pl-1">Grupo (Opcional)</label>
                  <select
                    value={regGrupo}
                    onChange={(e) => setRegGrupo(e.target.value)}
                    disabled={regGrado === 'Sin Grupo'}
                    className={`w-full px-3 py-2.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-[#2c2c2e] bg-white dark:bg-[#1c1c1e] text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 ${regGrado === 'Sin Grupo' ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {regGrado === 'Sin Grupo' ? (
                      <option value="">(Ninguno)</option>
                    ) : (
                      <>
                        <option value="A">Grupo A</option>
                        <option value="B">Grupo B</option>
                      </>
                    )}
                  </select>
                </div>
              </div>
            )}

            <div className="space-y-1">
              <div className="flex justify-between items-center px-1">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Matrícula o QR ID</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    id="isCustomMatricula"
                    checked={isCustomMatricula}
                    onChange={(e) => {
                      setIsCustomMatricula(e.target.checked);
                      if (!e.target.checked) {
                        if (regRole === 'Director') setRegMatricula('DIRECTOR-01');
                        else if (regRole === 'Subdirector') setRegMatricula('SUBDIRECTOR-01');
                        else setRegMatricula('TEACHER-1A');
                      }
                    }}
                    className="w-3.5 h-3.5 text-blue-600 bg-white dark:bg-[#1c1c1e] border-slate-200 dark:border-[#2c2c2e] rounded focus:ring-blue-500"
                  />
                  <label htmlFor="isCustomMatricula" className="text-[10px] font-bold text-slate-500 dark:text-slate-400 cursor-pointer">Personalizar</label>
                </div>
              </div>
              <div className="relative">
                <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="ej. MAT-2023 o ID-QR-001"
                  value={regMatricula}
                  onChange={(e) => setRegMatricula(e.target.value)}
                  disabled={!isCustomMatricula}
                  className={`w-full pl-10 pr-4 py-2.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-[#2c2c2e] bg-white dark:bg-[#1c1c1e] text-slate-800 dark:text-white focus:outline-none ${!isCustomMatricula ? 'opacity-60 bg-slate-50 dark:bg-slate-900/40' : 'focus:ring-1 focus:ring-blue-500 focus:border-blue-500'}`}
                  required
                />
              </div>
            </div>

            {/* Temporary PIN banner for Director registration */}
            {!hasDirector && regRole === 'Director' && tempDirectorPin && (
              <div className="p-4 bg-amber-500/10 border-2 border-amber-500/40 rounded-2xl space-y-2.5 animate-fadeIn shadow-inner">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-amber-800 dark:text-amber-300 tracking-wider flex items-center gap-1.5">
                    📌 PIN Temporal para Director
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyAndPastePin(tempDirectorPin)}
                    className="px-2.5 py-1 text-[11px] font-extrabold rounded-lg bg-amber-500 hover:bg-amber-600 active:scale-95 text-white transition-all shadow-sm flex items-center gap-1 shrink-0"
                    title="Copiar PIN y colocarlo en el campo de contraseña"
                  >
                    {copiedPin ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedPin ? '¡PIN Copiado!' : 'Copiar y Usar PIN'}</span>
                  </button>
                </div>

                {/* Large formatted 8-digit PIN display */}
                <div className="flex items-center justify-center py-2 bg-amber-500/20 rounded-xl border border-amber-500/30">
                  <span className="text-2xl font-mono font-black text-amber-900 dark:text-amber-300 tracking-[0.2em] drop-shadow-sm select-all">
                    {tempDirectorPin}
                  </span>
                </div>

                <p className="text-[10.5px] text-amber-800 dark:text-amber-300/90 leading-tight font-medium">
                  Este es el PIN aleatorio de 8 dígitos asignado como contraseña temporal. Haz clic en <strong>"Copiar y Usar PIN"</strong> para colocarlo en el campo de contraseña.
                </p>
              </div>
            )}

            {/* Temporary PIN banner for Subdirector registration */}
            {!hasSubdirector && regRole === 'Subdirector' && tempSubPin && (
              <div className="p-4 bg-amber-500/10 border-2 border-amber-500/40 rounded-2xl space-y-2.5 animate-fadeIn shadow-inner">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-amber-800 dark:text-amber-300 tracking-wider flex items-center gap-1.5">
                    📌 PIN Temporal para Subdirector
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyAndPastePin(tempSubPin)}
                    className="px-2.5 py-1 text-[11px] font-extrabold rounded-lg bg-amber-500 hover:bg-amber-600 active:scale-95 text-white transition-all shadow-sm flex items-center gap-1 shrink-0"
                    title="Copiar PIN y colocarlo en el campo de contraseña"
                  >
                    {copiedPin ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedPin ? '¡PIN Copiado!' : 'Copiar y Usar PIN'}</span>
                  </button>
                </div>

                {/* Large formatted 8-digit PIN display */}
                <div className="flex items-center justify-center py-2 bg-amber-500/20 rounded-xl border border-amber-500/30">
                  <span className="text-2xl font-mono font-black text-amber-900 dark:text-amber-300 tracking-[0.2em] drop-shadow-sm select-all">
                    {tempSubPin}
                  </span>
                </div>

                <p className="text-[10.5px] text-amber-800 dark:text-amber-300/90 leading-tight font-medium">
                  Este es el PIN aleatorio de 8 dígitos asignado como contraseña temporal. Haz clic en <strong>"Copiar y Usar PIN"</strong> para colocarlo en el campo de contraseña.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#2b66f6] hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold py-3 px-4 rounded-xl text-xs tracking-wider uppercase transition-colors shadow-md mt-2 flex items-center justify-center gap-2"
            >
              {isSubmitting ? 'Registrando usuario...' : 'Registrarse'}
            </button>

            <button
              type="button"
              onClick={() => {
                setError('');
                setSuccess('');
                setMode('login');
              }}
              className="w-full text-center text-[11px] font-bold text-slate-500 hover:text-slate-700 dark:text-[#8e8e93] dark:hover:text-white mt-1.5"
            >
              Volver al Inicio de Sesión
            </button>
          </form>
        )}

        {/* MODE: RECOVERY */}
        {mode === 'recovery' && (
          <form onSubmit={handleRequestRecovery} className="space-y-4">
            <div className="text-center mb-2">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">Recuperar Contraseña</h3>
              <p className="text-[11px] text-slate-500 dark:text-[#8e8e93] mt-1 leading-relaxed">
                Paso 1: Ingrese su correo registrado.
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider pl-1">Correo Electrónico</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  placeholder="ej. correo@escuela.com"
                  value={recoveryEmail}
                  onChange={(e) => setRecoveryEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-[#2c2c2e] bg-white dark:bg-[#1c1c1e] text-slate-800 dark:text-white focus:outline-none"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#2b66f6] hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold py-3 px-4 rounded-xl text-xs tracking-wider uppercase transition-colors shadow-md mt-1 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              <span>Siguiente</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setError('');
                setSuccess('');
                setMode('login');
              }}
              className="w-full text-center text-[11px] font-bold text-slate-500 hover:text-slate-700 dark:text-[#8e8e93] dark:hover:text-white mt-1"
            >
              Volver al inicio
            </button>
          </form>
        )}

        {/* MODE: VERIFY IDENTITY */}
        {mode === 'verify' && (
          <form onSubmit={handleVerifyIdentity} className="space-y-4">
            <div className="text-center mb-2">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">Validar Identidad</h3>
              <p className="text-[11px] text-slate-500 dark:text-[#8e8e93] mt-1 leading-relaxed">
                Paso 2: Ingrese su Matrícula o ID de código QR configurado al registrarse.
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider pl-1">Matrícula o QR ID</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Matrícula o QR ID"
                  value={identityInput}
                  onChange={(e) => setIdentityInput(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-[#2c2c2e] bg-white dark:bg-[#1c1c1e] text-slate-800 dark:text-white focus:outline-none"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#2b66f6] hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold py-3 px-4 rounded-xl text-xs tracking-wider uppercase transition-colors shadow-md mt-1 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              <span>Validar Identidad</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setError('');
                setSuccess('');
                setMode('recovery');
              }}
              className="w-full text-center text-[11px] font-bold text-slate-500 hover:text-slate-700 dark:text-[#8e8e93] dark:hover:text-white mt-1"
            >
              Volver al paso anterior
            </button>
          </form>
        )}

        {/* MODE: NEW PASSWORD */}
        {mode === 'new_password' && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="text-center mb-2">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">Nueva Contraseña</h3>
              <p className="text-[11px] text-slate-500 dark:text-[#8e8e93] mt-1 leading-relaxed">
                Paso 3: Defina una nueva contraseña que cumpla con los requisitos de seguridad.
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider pl-1">Nueva Contraseña</label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="Mín. 8 caracteres, 1 Mayúscula"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-3 pr-9 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-[#2c2c2e] bg-white dark:bg-[#1c1c1e] text-slate-800 dark:text-white focus:outline-none"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-white p-0.5"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider pl-1">Confirmar Nueva Contraseña</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Repita la contraseña"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-3 pr-9 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-[#2c2c2e] bg-white dark:bg-[#1c1c1e] text-slate-800 dark:text-white focus:outline-none"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-white p-0.5"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#2b66f6] hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold py-3 px-4 rounded-xl text-xs tracking-wider uppercase transition-colors shadow-md mt-1 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              <span>Actualizar Contraseña</span>
            </button>
          </form>
        )}

        {/* MODE: SUCCESS */}
        {mode === 'success' && (
          <div className="text-center py-4 space-y-4">
            <div className="flex justify-center">
              <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">¡Contraseña Restablecida!</h3>
              <p className="text-[11.5px] text-slate-500 dark:text-[#8e8e93] mt-1.5 leading-relaxed">
                Su contraseña ha sido actualizada exitosamente.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setError('');
                setSuccess('');
                setMode('login');
              }}
              className="w-full bg-[#2b66f6] hover:bg-blue-700 text-white font-extrabold py-3 px-4 rounded-xl text-xs tracking-wider uppercase transition-colors shadow-md mt-2"
            >
              Iniciar Sesión
            </button>
          </div>
        )}

        {/* MODE: BIOMETRIC PORTAL (Teacher Success Portal) */}
        {mode === 'biometric_portal' && biometricPortalUser && (
          <div className="space-y-4 animate-fadeIn">
            {/* Minimalist Portal Header */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between text-center md:text-left gap-4">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
              
              <div className="flex flex-col md:flex-row items-center gap-4 relative z-10">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center border-2 border-white/30">
                  <CheckCircle2 className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-black font-outfit tracking-tight text-white mb-1">
                    ¡Bienvenido, {biometricPortalUser.nombre || biometricPortalUser.name}!
                  </h2>
                  <p className="text-sm font-semibold text-blue-100">
                    Tu asistencia ha sido registrada y validada correctamente.
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center bg-black/20 p-4 rounded-2xl relative z-10">
                <span className="text-[10px] uppercase font-black tracking-widest text-blue-200 mb-1">Hora de Entrada</span>
                <span className="text-3xl font-black font-mono tracking-tight text-white">
                  {new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>

            {/* Calendario */}
            <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-4 border border-slate-200 dark:border-[#2c2c2e] shadow-sm max-h-[60vh] overflow-y-auto custom-scrollbar">
               <CalendarioSepView />
            </div>

            {/* Logout / Volver button */}
            <button
              type="button"
              onClick={() => {
                setBiometricPortalUser(null);
                setBiometricUsuario('');
                setMode('login');
              }}
              className="w-full bg-rose-500 hover:bg-rose-600 text-white font-extrabold py-3.5 px-4 rounded-xl text-xs tracking-wider uppercase transition-colors shadow-md flex items-center justify-center gap-2 active:scale-95"
            >
              <span>Cerrar Sesión</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
