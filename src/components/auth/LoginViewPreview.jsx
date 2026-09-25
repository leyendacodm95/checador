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

export function LoginViewPreview() {
  const {
    login, registerUser, users,
    recoverPassword, verifyRecoveryIdentity, resetPassword
  } = useAuth();

  const [mode, setMode] = useState('register'); // Iniciamos en register para la vista previa
  const [biometricPortalUser, setBiometricPortalUser] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [biometricUsuario, setBiometricUsuario] = useState('');
  const [biometricFeedback, setBiometricFeedback] = useState(null);

  // Form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [savedUsernames, setSavedUsernames] = useState([]);
  const [rememberUser, setRememberUser] = useState(false);
  const [showSavedUsers, setShowSavedUsers] = useState(false);
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regUser, setRegUser] = useState('');
  const [regPass, setRegPass] = useState('');
  const [regRole, setRegRole] = useState('Director'); 

  // Custom Matrícula / QR Code states
  const [regMatricula, setRegMatricula] = useState('DIRECTOR-01');
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
  const [copiedPin, setCopiedPin] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Check roles availability (Simulated for preview)
  const hasDirector = false;
  const hasSubdirector = false;

  const rolesInfo = [
    { id: 'Director', label: 'Director', subtitle: 'Administración', code: 'DIRECTOR-01', hasLimit: true, max: 1 },
    { id: 'Subdirector', label: 'Subdirector', subtitle: 'Académico', code: 'SUBDIRECTOR-01', hasLimit: true, max: 1 },
    { id: 'Docente Titular', label: 'Docente Titular', subtitle: 'Frente a Grupo (1º-6º)', code: 'DOCENTE-1A', hasLimit: false },
    { id: 'Educación Especial', label: 'Educación Especial', subtitle: 'U.S.A.E.R / Inclusión', code: 'USAER-01', hasLimit: true, max: 1 },
    { id: 'Intendente', label: 'Intendente', subtitle: 'Intendencia / Apoyo', code: 'INTENDENTE-01', hasLimit: true, max: 1 },
    { id: 'Educación Física', label: 'Educación Física', subtitle: 'Deporte / Activación', code: 'EDFISICA-01', hasLimit: true, max: 3 },
    { id: 'Psicología', label: 'Psicología', subtitle: 'Orientación Escolar', code: 'PSICO-01', hasLimit: true, max: 1 },
    { id: 'Docente Auxiliar', label: 'Docente Auxiliar', subtitle: 'Practicante o Pasante', code: 'AUXILIAR-01', hasLimit: false },
    { id: 'Servicio Social', label: 'Servicio Social', subtitle: 'Apoyo', code: 'SERVICIO-01', hasLimit: false },
    { id: 'Prácticas Profesionales', label: 'Prácticas Prof.', subtitle: 'Desarrollo', code: 'PRACTICAS-01', hasLimit: false }
  ];

  useEffect(() => {
    if (!tempDirectorPin) {
      const generatedPin = \`\${Math.floor(10000000 + Math.random() * 90000000)}\`;
      setTempDirectorPin(generatedPin);
    }
  }, [tempDirectorPin, regRole]);

  const handleCopyAndPastePin = (pinToCopy) => {
    setRegPass(pinToCopy); 
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(pinToCopy);
    }
    setCopiedPin(true);
    setTimeout(() => setCopiedPin(false), 2500);
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#e4e8f0] dark:bg-[#000000] p-4 font-sans select-none transition-colors duration-300">
      <div className={\`w-full \${mode === 'biometric_portal' ? 'max-w-5xl' : 'max-w-md'} bg-[#f1f3f7] dark:bg-[#1c1c1e] rounded-3xl border border-slate-200 dark:border-[#2c2c2e] p-6 shadow-2xl relative overflow-hidden transition-all duration-300\`}>

        {/* Branding header */}
        {mode !== 'biometric_portal' && mode !== 'register' && (
          <div className="flex flex-col items-center text-center mb-6">
            <img src={logoImg} alt="Escudo Oficial" className="w-20 h-20 object-contain bg-white rounded-2xl p-1.5 shadow-md mb-3" />
            <h2 className="text-lg font-black font-outfit text-slate-800 dark:text-white leading-tight">
              Sor Juana Inés de la Cruz T.V
            </h2>
            <p className="text-[10px] text-slate-400 dark:text-[#8e8e93] font-bold uppercase tracking-wider mt-1">
              Sistema de Acceso Escolar
            </p>
          </div>
        )}

        {/* MODE: REGISTER PREVIEW */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-3.5">
            <div className="text-center mb-4 border-b border-slate-200 dark:border-[#2c2c2e] pb-2">
              <h3 className="text-lg font-black font-outfit text-blue-600 dark:text-blue-400">VISTA PREVIA REGISTRO</h3>
              <p className="text-[10px] text-slate-500 dark:text-[#8e8e93]">Componente React Modificado</p>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider pl-1">Nombre Completo</label>
              <div className="relative">
                <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input type="text" placeholder="ej. Juan Pérez" value={regName} onChange={(e) => setRegName(e.target.value)} className="w-full pl-10 pr-4 py-2.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-[#2c2c2e] bg-white dark:bg-[#1c1c1e] text-slate-800 dark:text-white focus:outline-none" required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider pl-1">Correo (Opcional)</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input type="email" placeholder="correo@escuela.com" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} className="w-full pl-10 pr-4 py-2.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-[#2c2c2e] bg-white dark:bg-[#1c1c1e] text-slate-800 dark:text-white focus:outline-none" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider pl-1">Contraseña</label>
                <div className="relative">
                  <input type={showRegPassword ? 'text' : 'password'} placeholder="Contraseña" value={regPass} onChange={(e) => setRegPass(e.target.value)} className="w-full pl-3 pr-9 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-[#2c2c2e] bg-white dark:bg-[#1c1c1e] text-slate-800 dark:text-white focus:outline-none" required />
                  <button type="button" onClick={() => setShowRegPassword(!showRegPassword)} className="absolute right-2.5 top-2.5 text-slate-400 p-0.5">
                    {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <hr className="border-slate-200 dark:border-[#2c2c2e] my-2" />

            {/* SELECCIÓN DE ROLES INTERACTIVA */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Rol / Cargo del Docente o Personal
                </label>
                <span className="text-[10px] font-extrabold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full border border-blue-200/50 dark:border-blue-800/50">
                  {regRole}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1.5 border border-slate-200 dark:border-[#2c2c2e] rounded-2xl bg-white/60 dark:bg-[#151516]/60 custom-scrollbar">
                {rolesInfo.map((rItem) => {
                  const isSelected = regRole === rItem.id;
                  const isDisabled = false; // Aquí iría la lógica de verificación de Firebase

                  return (
                    <button
                      key={rItem.id}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => {
                        setRegRole(rItem.id);
                        setRegPass('');
                        if (!isCustomMatricula) {
                           setRegMatricula(rItem.code);
                        }
                      }}
                      className={\`p-2.5 rounded-xl text-left border transition-all flex flex-col justify-between relative text-xs \${
                        isDisabled
                          ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400'
                          : isSelected
                            ? 'bg-blue-600 dark:bg-[#2c2c2e] text-white border-blue-600 dark:border-[#4a4a4c] shadow-md dark:shadow-none shadow-blue-500/20 ring-2 dark:ring-0 ring-blue-400/30'
                            : 'bg-white dark:bg-[#1c1c1e] border-slate-200 dark:border-[#2c2c2e] text-slate-700 dark:text-slate-200 hover:border-blue-400 dark:hover:border-[#3a3a3c]'
                      }\`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className={\`text-[11px] font-black leading-tight \${isSelected ? 'text-white' : 'text-slate-800 dark:text-white'}\`}>
                          {rItem.label}
                        </span>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white shrink-0" />}
                      </div>
                      <span className={\`text-[9px] line-clamp-1 font-medium \${isSelected ? 'text-blue-100 dark:text-gray-400' : 'text-slate-400 dark:text-slate-500'}\`}>
                        {isDisabled ? 'Límite alcanzado' : rItem.subtitle}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

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
                        const currentRole = rolesInfo.find(r => r.id === regRole);
                        if (currentRole) setRegMatricula(currentRole.code);
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
                  className={\`w-full pl-10 pr-4 py-2.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-[#2c2c2e] bg-white dark:bg-[#1c1c1e] text-slate-800 dark:text-white focus:outline-none \${!isCustomMatricula ? 'opacity-60 bg-slate-50 dark:bg-slate-900/40' : 'focus:ring-1 focus:ring-blue-500 focus:border-blue-500'}\`}
                  required
                />
              </div>
            </div>

            {/* Temporary PIN banner */}
            {(regRole === 'Director' || regRole === 'Subdirector') && (
              <div className="p-4 bg-amber-500/10 dark:bg-[#2a2414] border-2 border-amber-500/40 dark:border-[#4a3a1a] rounded-2xl space-y-2.5 animate-fadeIn shadow-inner mt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-amber-800 dark:text-[#d4a34b] tracking-wider flex items-center gap-1.5">
                    📌 PIN Temporal para {regRole.toUpperCase()}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyAndPastePin(tempDirectorPin)}
                    className="px-2.5 py-1 text-[11px] font-extrabold rounded-lg bg-amber-500 dark:bg-[#d4a34b] dark:text-black hover:bg-amber-600 active:scale-95 text-white transition-all shadow-sm flex items-center gap-1 shrink-0"
                    title="Copiar PIN y colocarlo en el campo de contraseña"
                  >
                    {copiedPin ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedPin ? '¡PIN Copiado!' : 'Copiar y Usar PIN'}</span>
                  </button>
                </div>

                <div className="flex items-center justify-center py-2 bg-amber-500/20 dark:bg-[#3a301a] rounded-xl border border-amber-500/30 dark:border-transparent">
                  <span className="text-2xl font-mono font-black text-amber-900 dark:text-[#facc15] tracking-[0.3em] drop-shadow-sm select-all">
                    {tempDirectorPin}
                  </span>
                </div>

                <p className="text-[10.5px] text-amber-800 dark:text-[#a89b7d] leading-tight font-medium">
                  Este es el PIN aleatorio de 8 dígitos asignado como contraseña temporal. Haz clic en <strong>"Copiar y Usar PIN"</strong> para colocarlo en el campo de contraseña.
                </p>
              </div>
            )}

            <button type="submit" disabled={isSubmitting} className="w-full bg-[#2b66f6] hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold py-3 px-4 rounded-xl text-xs tracking-wider uppercase transition-colors shadow-md mt-2 flex items-center justify-center gap-2">
              Registrarse (Vista Previa)
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
