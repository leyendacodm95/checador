import React, { useState, useEffect, useRef } from 'react';
import { QrCode, CheckCircle2, Zap, AlertTriangle, Users, UserCheck, Clock, Camera, X, Video } from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

export function QRScannerView({ students, users = [], onScanAttendance }) {
  const evento = 'Entrada';
  const [activeTab, setActiveTab] = useState('Alumnos'); // 'Alumnos' or 'Docentes'
  const [lastScanned, setLastScanned] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState('');
  const [countdown, setCountdown] = useState(30);

  // Refs para mantener valores actualizados sin reinicializar el escáner
  const studentsRef = useRef(students);
  const usersRef = useRef(users);
  const processingRef = useRef(false);
  const html5QrCodeRef = useRef(null);

  useEffect(() => {
    studentsRef.current = students;
    usersRef.current = users;
  }, [students, users]);

  // Cargar lista de cámaras disponibles al montar
  useEffect(() => {
    Html5Qrcode.getCameras()
      .then(devices => {
        if (devices && devices.length > 0) {
          // Intentar priorizar la cámara trasera por su nombre
          let sortedDevices = [...devices].sort((a, b) => {
            const aIsBack = a.label.toLowerCase().includes('back') || a.label.toLowerCase().includes('trasera') || a.label.toLowerCase().includes('environment');
            const bIsBack = b.label.toLowerCase().includes('back') || b.label.toLowerCase().includes('trasera') || b.label.toLowerCase().includes('environment');
            if (aIsBack && !bIsBack) return -1;
            if (!aIsBack && bIsBack) return 1;
            return 0;
          });

          // Si no se pudo determinar por el nombre, y hay más de una, invertimos asumiendo que la última es la trasera
          if (devices.length > 1 && sortedDevices[0].id === devices[0].id && !sortedDevices[0].label.toLowerCase().includes('back')) {
            sortedDevices = [...devices].reverse();
          }

          setCameras(sortedDevices);
          setSelectedCamera(sortedDevices[0].id);
        }
      })
      .catch(err => {
        console.error("Error obteniendo cámaras", err);
        setFeedback({
          type: 'warning',
          message: '❌ No se encontraron cámaras o no hay permisos.',
        });
      });

    return () => {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().then(() => {
          html5QrCodeRef.current.clear();
        }).catch(e => console.log(e));
      }
    };
  }, []);

  // Manejo de la cámara manual con Html5Qrcode (sin UI por defecto)
  useEffect(() => {
    if (cameraActive && selectedCamera) {
      const startScanner = async () => {
        try {
          if (!html5QrCodeRef.current) {
            html5QrCodeRef.current = new Html5Qrcode("qr-reader");
          } else if (html5QrCodeRef.current.isScanning) {
            await html5QrCodeRef.current.stop();
          }

          await html5QrCodeRef.current.start(
            selectedCamera,
            {
              fps: 10,
              qrbox: { width: 250, height: 250 },
              formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
            },
            (decodedText) => {
              if (!processingRef.current) {
                handleRealScan(decodedText);
              }
            },
            (errorMessage) => {
              // Errores menores de lectura se ignoran
            }
          );
        } catch (err) {
          console.error("Error iniciando cámara:", err);
          setCameraActive(false);
          setFeedback({
            type: 'warning',
            message: '❌ Error al iniciar la cámara. Verifica los permisos.',
          });
        }
      };

      startScanner();
    } else {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(e => console.error("Error deteniendo cámara", e));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraActive, selectedCamera]);

  // Modal Auto-dismiss and Enter key handler
  useEffect(() => {
    let timeoutId;
    let intervalId;
    
    if (feedback || lastScanned) {
      setCountdown(30);
      
      intervalId = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(intervalId);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      timeoutId = setTimeout(() => {
        setFeedback(null);
        setLastScanned(null);
      }, 30000);

      const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
          setFeedback(null);
          setLastScanned(null);
        }
      };
      window.addEventListener('keydown', handleKeyDown);

      return () => {
        clearTimeout(timeoutId);
        clearInterval(intervalId);
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [feedback, lastScanned]);

  const getUserList = (usersArr) => {
    return (usersArr || []).map(u => {
      const hasGroup = u.assignedGroup && u.assignedGroup !== 'Ninguno' && u.assignedGroup !== 'Sin Grupo';
      return {
        id: u.id,
        nombre: u.nombre || u.name || u.username || 'Docente Sin Nombre',
        grado: u.role || 'Docente',
        grupo: u.assignedGroup || 'Administrativo',
        qrCode: u.matricula || (hasGroup ? `DOCENTE-${u.assignedGroup.replace('°-', '')}` : `USER-${u.id}`),
        matricula: u.matricula,
        username: u.username
      };
    });
  };

  const handleRealScan = (decodedText) => {
    processingRef.current = true;
    let foundPerson = null;
    let personType = '';
    const query = String(decodedText).toLowerCase().trim();

    // Opcional: Intentar parsear el código si es un objeto JSON (Ej. {"nombre":"...", "rol":"..."})
    let jsonQuery = null;
    try {
      jsonQuery = JSON.parse(decodedText);
    } catch(e) {}

    const nameToMatch = jsonQuery?.nombre ? String(jsonQuery.nombre).toLowerCase().trim() : query;
    const idToMatch = jsonQuery?.id ? String(jsonQuery.id).toLowerCase().trim() : query;

    // Función auxiliar para buscar con alta flexibilidad pero evitando falsos positivos
    const isMatch = (person) => {
      const pQr = (person.qrCode || '').toLowerCase().trim();
      const pId = String(person.id || '').toLowerCase().trim();
      const pName = (person.nombre || '').toLowerCase().trim();
      const pMat = (person.matricula || '').toLowerCase().trim();
      const pUsername = String(person.username || '').toLowerCase().trim();
      const pGrado = String(person.grado || '').toLowerCase().trim();

      // Solo aplicar coincidencia de rol difusa a roles administrativos únicos (evita que el grado "1" de un alumno coincida con "DOCENTE-1A")
      const isUniqueRole = ['director', 'directora', 'subdirector', 'subdirectora'].includes(pGrado);
      const roleMatch = isUniqueRole && (
        query === pGrado || 
        query.startsWith(pGrado + '-')
      );

      // Requerir al menos 4 caracteres para hacer un .includes() y evitar que "1" coincida con "DOCENTE-1A"
      const safeSub = (str) => str.length > 3;

      return (
        roleMatch ||
        (pQr && pQr === query) ||
        (pMat && pMat === query) ||
        (pId && pId === idToMatch) ||
        (pUsername && pUsername === nameToMatch) ||
        (pName && (pName === nameToMatch || (safeSub(pName) && nameToMatch.includes(pName)) || (safeSub(nameToMatch) && pName.includes(nameToMatch))))
      );
    };

    // Buscar en alumnos primero
    const studentMatch = studentsRef.current.find(isMatch);
    if (studentMatch) {
      foundPerson = studentMatch;
      personType = 'Alumno';
    } else {
      // Buscar en colección de usuarios (Directores, Subdirectores, Docentes Titulares/Auxiliares)
      const allUsers = getUserList(usersRef.current);
      const userMatch = allUsers.find(isMatch);
      if (userMatch) {
        foundPerson = userMatch;
        personType = userMatch.grado;
      }
    }

    // Si aún no lo encuentra y es un JSON válido con nombre, lo registra dinámicamente
    if (!foundPerson && jsonQuery && jsonQuery.nombre) {
       foundPerson = {
         id: jsonQuery.id || String(Date.now()),
         nombre: jsonQuery.nombre,
         grado: jsonQuery.rol || jsonQuery.grado || 'Invitado',
         grupo: jsonQuery.grupo || 'Externo',
         qrCode: decodedText
       };
       personType = jsonQuery.rol || jsonQuery.tipoPersona || 'Invitado';
    }

    if (foundPerson) {
      handleSimulatedScan(foundPerson, personType);
    } else {
      setFeedback({
        type: 'warning',
        message: `❌ Código no reconocido: ${decodedText.slice(0, 20)}${decodedText.length > 20 ? '...' : ''}`,
      });
      setTimeout(() => { processingRef.current = false; }, 2000);
    }
  };

  const handleSimulatedScan = (person, type) => {
    // Validar si ya registró falta (evitar doble escaneo)
    if (person.estado === 'AUSENTE') {
      setFeedback({
        type: 'warning',
        message: `⚠️ El ${type.toLowerCase()} ${person.nombre} ya tiene registrada una falta.`,
      });
      setTimeout(() => { processingRef.current = false; }, 3000);
      return;
    }

    setScanning(true);
    setFeedback(null);

    setTimeout(() => {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      
      const eventoReal = 'Falta'; // Se guarda como falta en BD aunque la variable diga 'Entrada'

      setLastScanned({
        nombre: person.nombre,
        horaStr: timeStr,
        delayMin: 0,
        evento: eventoReal,
        type: type
      });

      onScanAttendance(person.id, timeStr, eventoReal, type);
      
      setScanning(false);

      setFeedback({
        type: 'success', // Usamos success para abrir el modal genérico, pero con diseño neutro
        message: `Falta o ausencia registrada para ${person.nombre}.`,
      });

      setTimeout(() => { processingRef.current = false; }, 2000);
    }, 800);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header & Event Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-850 dark:text-white font-outfit">
            Escáner Checador QR
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-semibold">
            ⚡ Pase de lista automático para alumnos y docentes de la Primaria Sor Juana Inés de la Cruz.
          </p>
        </div>

        {/* Mode indicator */}
        <div className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-4 py-2 rounded-xl border border-emerald-500/20 text-xs font-bold flex items-center gap-1.5 shadow-sm">
          <span>🟢 Registro de Entrada</span>
        </div>
      </div>

      <div className="w-full max-w-4xl mx-auto">
        {/* Scanner Window (Centrado) */}
        <div className="w-full bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center relative overflow-hidden min-h-[460px]">
          
          {/* Controles de Cámara (Toggles y Selectores) */}
          <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            {/* Toggle Switch para Cámara */}
            <div className="flex items-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={cameraActive}
                  onChange={(e) => setCameraActive(e.target.checked)}
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                <span className="ml-3 text-sm font-bold text-slate-700 dark:text-slate-300">
                  {cameraActive ? 'Cámara Encendida' : 'Cámara Apagada'}
                </span>
              </label>
            </div>

            {/* Selector de Cámaras */}
            <div className="flex items-center gap-2 w-full sm:w-auto flex-1 max-w-[250px]">
              <Video className="w-4 h-4 text-slate-500" />
              <select 
                className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2 font-medium shadow-sm outline-none transition-all"
                value={selectedCamera}
                onChange={(e) => setSelectedCamera(e.target.value)}
                disabled={cameras.length === 0}
              >
                {cameras.length === 0 && <option value="">Buscando cámaras...</option>}
                {cameras.map(cam => (
                  <option key={cam.id} value={cam.id}>
                    {cam.label || `Cámara ${cam.id.slice(0, 5)}...`}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {/* Animated Scanning Frame or Real Camera View */}
          {!cameraActive ? (
            <div className="relative w-64 h-64 border-4 border-indigo-500/80 dark:border-slate-700 rounded-2xl bg-slate-950 shadow-2xl overflow-hidden group mx-auto">
              {/* Corner Markers (Desvinculados del flex) */}
              <div className="absolute top-3 left-3 w-6 h-6 border-t-4 border-l-4 border-indigo-500 rounded-tl-md z-10"></div>
              <div className="absolute top-3 right-3 w-6 h-6 border-t-4 border-r-4 border-indigo-500 rounded-tr-md z-10"></div>
              <div className="absolute bottom-3 left-3 w-6 h-6 border-b-4 border-l-4 border-indigo-500 rounded-bl-md z-10"></div>
              <div className="absolute bottom-3 right-3 w-6 h-6 border-b-4 border-r-4 border-indigo-500 rounded-br-md z-10"></div>
              
              {/* Laser Line Animation */}
              <div className="scan-line z-20 opacity-50 group-hover:opacity-100"></div>

              {/* Contenedor central (Icono) */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <QrCode className={`w-24 h-24 transition-all duration-300 text-slate-700`} />
              </div>

              {/* Botón en la parte inferior */}
              <div className="absolute bottom-6 w-full flex justify-center z-30">
                <button 
                  onClick={() => setCameraActive(true)}
                  className="bg-indigo-600/80 hover:bg-indigo-600/95 backdrop-blur-sm text-white font-bold py-2 px-5 rounded-xl flex items-center gap-2 shadow-lg transition-all active:scale-95 text-sm"
                >
                  <Camera className="w-4 h-4" />
                  Iniciar Cámara
                </button>
              </div>
            </div>
          ) : (
            <div className="relative w-full max-w-lg mx-auto rounded-2xl overflow-hidden shadow-2xl border-4 border-indigo-500/50 bg-slate-900 flex justify-center items-center">
              {/* Contenedor del video generado por Html5Qrcode. Usamos !important para anular estilos en línea rígidos */}
              <div 
                id="qr-reader" 
                className="w-full h-full [&>video]:!w-full [&>video]:!h-full [&>video]:!object-cover [&>video]:rounded-xl"
                style={{ width: '100%', minHeight: '300px' }}
              ></div>
            </div>
          )}

          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-6 text-center">
            {cameraActive
              ? '🎥 Apunta el código QR a la cámara para el pase de lista'
              : scanning
                ? '🎥 Procesando lectura...'
                : '🎥 Usa el interruptor o presiona el botón para encender la cámara'}
          </p>
        </div>
      </div>

      {/* Overlay Modal (Feedback & Last Scanned) */}
      {(feedback || lastScanned) && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fadeIn"
          onClick={() => { setFeedback(null); setLastScanned(null); }}
        >
          <div 
            className="relative w-full max-w-md p-8 rounded-[2rem] border shadow-2xl flex flex-col items-center text-center transform transition-all scale-in-center bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => { setFeedback(null); setLastScanned(null); }} 
              className="absolute top-5 right-5 p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-full transition-colors text-slate-500 dark:text-slate-400 active:scale-90"
            >
              <X className="w-5 h-5" />
            </button>

            {feedback?.type === 'warning' ? (
              <div className="w-24 h-24 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-6 shadow-inner ring-4 ring-slate-50 dark:ring-slate-600">
                <AlertTriangle className="w-12 h-12 text-slate-600 dark:text-slate-300" />
              </div>
            ) : (
              <div className="w-24 h-24 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-6 shadow-inner ring-4 ring-slate-50 dark:ring-slate-600">
                <UserCheck className="w-12 h-12 text-slate-600 dark:text-slate-300" />
              </div>
            )}

            <h2 className="text-3xl font-black mb-3 font-outfit tracking-tight">
              {feedback?.type === 'warning' ? 'Aviso' : 'Registro de Falta'}
            </h2>
            
            <p className="text-base font-semibold text-slate-700 dark:text-slate-300 leading-relaxed mb-8 max-w-xs mx-auto">
              {feedback?.message || (lastScanned && `Se ha registrado la falta de ${lastScanned.nombre}`)}
            </p>

            {lastScanned && (
              <div className="w-full bg-slate-50 dark:bg-slate-900 rounded-2xl p-4 mb-6 text-left border border-slate-200 dark:border-slate-800 shadow-inner">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[11px] font-black tracking-wider uppercase text-slate-400">Nombre</span>
                  <span className="text-[11px] font-black tracking-wider uppercase text-slate-400">Hora</span>
                </div>
                <div className="flex justify-between items-end">
                  <div className="flex flex-col">
                    <span className="font-bold text-lg text-slate-900 dark:text-white">{lastScanned.nombre}</span>
                    <span className="text-xs font-medium text-slate-500">{lastScanned.type} • {lastScanned.evento}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="font-black text-xl text-slate-900 dark:text-white">{lastScanned.horaStr}</span>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => { setFeedback(null); setLastScanned(null); }}
              className="w-full py-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <span>Continuar (Enter)</span>
            </button>
            
            <span className="text-slate-400 dark:text-slate-500 text-[10px] font-bold tracking-widest uppercase mt-4">
              Cerrando en {countdown}s
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
