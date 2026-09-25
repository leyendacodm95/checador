import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  ShieldCheck, UserCheck, Shield, Mail, BadgeCheck, 
  Printer, Award, LayoutDashboard, Database, Calendar, Users, KeyRound, X, User, AlertTriangle, Eye, EyeOff 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import schoolLogo from '../../logo.png';
import jsPDF from 'jspdf';

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

export function DirectivoPortalView() {
  const { user, updateCredentials } = useAuth();
  const qrRef = React.useRef(null);

  // Security Change Password Modal state
  const [showModal, setShowModal] = useState(false);
  const [newUsername, setNewUsername] = useState(user?.username || '');
  const [newEmail, setNewEmail] = useState(user?.email || '');
  const [newPassword, setNewPassword] = useState('');
  const [showModalPassword, setShowModalPassword] = useState(false);
  const [cfgError, setCfgError] = useState('');
  const [cfgSuccess, setCfgSuccess] = useState('');

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

  const roleTitle = user?.role || user?.baseRole || 'Director General';
  const name = user?.name || user?.username || 'Director General';
  const email = user?.email || 'direccion@escuela.edu.mx';
  const isSubdirector = roleTitle.toLowerCase().includes('subdirector');

  const qrCodeStr = user?.matricula || (isSubdirector ? 'SUBDIRECTOR-01' : 'DIRECTOR-01');

  const handlePrintCredencial = async () => {
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [85, 120] });
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
      doc.text('Sor Juana Inés de la Cruz T.V (CCT: 18DPR0087R)', 26, 13);

      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      doc.text('CREDENCIAL OFICIAL DIRECTIVA', 26, 18);

      // Name & Role
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'bold');
      doc.text(name, 42.5, 33, { align: 'center' });

      doc.setTextColor(30, 58, 138);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(roleTitle.toUpperCase(), 42.5, 38, { align: 'center' });

      // Info Details
      doc.setTextColor(71, 85, 105);
      doc.setFontSize(7);
      doc.text(`Puesto: Dirección Escolar Primaria`, 12, 45);
      doc.text(`Correo: ${email}`, 12, 49);
      doc.text(`Estatus: Autorizado / Sesión Activa`, 12, 53);

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
      doc.text(`ID QR: ${qrCodeStr}`, 42.5, 109, { align: 'center' });

      doc.save(`Credencial_Directiva_${name.replace(/\s+/g, '_')}.pdf`);
    } catch (e) {
      console.error('Error al generar PDF directivo:', e);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-6 rounded-3xl text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-blue-300 font-extrabold text-xs uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Portal Directivo Institucional</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight font-outfit">
            Credencial Oficial — {roleTitle}
          </h1>
          <p className="text-xs text-blue-100/80 mt-1 max-w-xl font-medium">
            Credencial virtual oficial con código QR institucional para la identificación y acceso del personal directivo de la Escuela Primaria Sor Juana Inés de la Cruz (CCT: 18DPR0087R).
          </p>
        </div>

        <div className="relative z-10 bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/15 text-xs font-black text-white flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-400" />
          <span>Cargo: {roleTitle}</span>
        </div>
      </div>

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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Directivo Virtual Credencial Card (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 text-white shadow-2xl relative overflow-hidden flex flex-col items-center text-center print-qr-modal">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>

            <div className="w-full flex justify-between items-center mb-4 text-[10px] font-black tracking-wider text-blue-100 uppercase">
              <span>CREDENCIAL OFICIAL DIRECTIVA</span>
              <span className="bg-white/20 px-2.5 py-0.5 rounded-full">CICLO 2025-2026</span>
            </div>

            <h2 className="text-3xl font-black font-outfit tracking-tight text-white mb-1 mt-2">
              {name}
            </h2>
            <p className="text-xs font-semibold text-blue-100 mb-5">
              {roleTitle} — Dirección General Escolar
            </p>

            <div ref={qrRef} className="bg-white p-5 rounded-2xl shadow-2xl my-4 border border-gray-150 flex flex-col items-center">
              <QRCodeSVG value={qrCodeStr} size={210} level="H" includeMargin />
            </div>

            <span className="text-[11px] font-mono text-blue-200 tracking-wider font-bold mt-2 mb-3">
              ID INSTITUCIONAL: {qrCodeStr}
            </span>

            <button
              onClick={handlePrintCredencial}
              className="w-full mt-2 py-3 bg-white hover:bg-blue-50 text-blue-900 rounded-2xl text-xs font-black transition shadow-lg flex items-center justify-center gap-2 active:scale-95"
            >
              <Printer className="w-4 h-4 text-blue-600" />
              <span>Imprimir Credencial Directiva (PDF)</span>
            </button>

          </div>
        </div>
        {/* Right Column: Administrative Control Overview (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white dark:bg-[#182234] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-base font-black text-slate-900 dark:text-white font-outfit flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-500" />
              <span>Privilegios del Rol {roleTitle}</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {isSubdirector ? (
                <>
                  <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40">
                    <div className="flex items-center gap-2 font-extrabold text-xs text-blue-900 dark:text-blue-300 mb-1">
                      <LayoutDashboard className="w-4 h-4 text-blue-500" />
                      <span>Asistencia General</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                      Supervisión de los registros de asistencia de todos los alumnos de la institución.
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40">
                    <div className="flex items-center gap-2 font-extrabold text-xs text-indigo-900 dark:text-indigo-300 mb-1">
                      <Printer className="w-4 h-4 text-indigo-500" />
                      <span>Generación de Reportes</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                      Creación y exportación de reportes de inasistencias en formato PDF o Excel.
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40">
                    <div className="flex items-center gap-2 font-extrabold text-xs text-purple-900 dark:text-purple-300 mb-1">
                      <ShieldCheck className="w-4 h-4 text-purple-500" />
                      <span>Control y Justificaciones</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                      Modificación de estados de asistencia y captura de justificantes médicos o notas.
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
                    <div className="flex items-center gap-2 font-extrabold text-xs text-emerald-900 dark:text-emerald-300 mb-1">
                      <Calendar className="w-4 h-4 text-emerald-500" />
                      <span>Calendario SEP</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                      Consulta de días hábiles, suspensión de labores y CTE.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40">
                    <div className="flex items-center gap-2 font-extrabold text-xs text-blue-900 dark:text-blue-300 mb-1">
                      <LayoutDashboard className="w-4 h-4 text-blue-500" />
                      <span>Control Total KPI</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                      Monitoreo en tiempo real del total de alumnos presentes y ausentes por grupo.
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40">
                    <div className="flex items-center gap-2 font-extrabold text-xs text-indigo-900 dark:text-indigo-300 mb-1">
                      <Users className="w-4 h-4 text-indigo-500" />
                      <span>Reasignación Docente</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                      Cambio de profesores titulares por año y grupo mediante botones dinámicos con un clic.
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40">
                    <div className="flex items-center gap-2 font-extrabold text-xs text-purple-900 dark:text-purple-300 mb-1">
                      <Calendar className="w-4 h-4 text-purple-500" />
                      <span>Calendario SEP 185 Días</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                      Consulta y carga de documentos institucionales (PDF, imágenes, Excel, JSON).
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
                    <div className="flex items-center gap-2 font-extrabold text-xs text-emerald-900 dark:text-emerald-300 mb-1">
                      <Database className="w-4 h-4 text-emerald-500" />
                      <span>Respaldo y Auditoría</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                      Bitácora inmutable de bajas/graduaciones y respaldo acumulativo en archivos JSON.
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-sky-50/50 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/40">
                    <div className="flex items-center gap-2 font-extrabold text-xs text-sky-900 dark:text-sky-300 mb-1">
                      <Shield className="w-4 h-4 text-sky-500" />
                      <span>Configuración del Sistema</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                      Control maestro sobre los parámetros de la escuela, grados y parámetros de evaluación.
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40">
                    <div className="flex items-center gap-2 font-extrabold text-xs text-rose-900 dark:text-rose-300 mb-1">
                      <Award className="w-4 h-4 text-rose-500" />
                      <span>Administración de Personal</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                      Altas, bajas y gestión de contratos y perfiles del cuerpo docente y administrativo.
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40">
                    <div className="flex items-center gap-2 font-extrabold text-xs text-amber-900 dark:text-amber-300 mb-1">
                      <Printer className="w-4 h-4 text-amber-500" />
                      <span>Reportes Oficiales SEP</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                      Generación y firma electrónica de sábanas de asistencia para inspección escolar.
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900/40">
                    <div className="flex items-center gap-2 font-extrabold text-xs text-teal-900 dark:text-teal-300 mb-1">
                      <KeyRound className="w-4 h-4 text-teal-500" />
                      <span>Seguridad y Accesos</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                      Gestión de contraseñas, recuperación de cuentas y delegación de privilegios al Subdirector.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
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
                  placeholder="Ej. directivo"
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
    </div>
  );
}
