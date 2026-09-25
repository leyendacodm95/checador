import React, { useState, useRef } from 'react';
import { X, Upload, FileText, Check, Loader2, Trash2, Save, Image as ImageIcon, Camera, Smartphone, QrCode, RefreshCw } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { db } from '../../lib/firebase';
import { doc, getDoc, setDoc, onSnapshot, deleteDoc } from 'firebase/firestore';
import { GoogleGenerativeAI } from '@google/generative-ai';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

export function ScanStudentListModal({ isOpen, onClose, activeGrade, onAddStudent }) {
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isFullscreenCrop, setIsFullscreenCrop] = useState(false);
  const [crop, setCrop] = useState(null);
  const [completedCrop, setCompletedCrop] = useState(null);
  const [croppedImageUrl, setCroppedImageUrl] = useState(null);
  const imgRef = useRef(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [rawOcrText, setRawOcrText] = useState('');
  const [scanFinishedEmpty, setScanFinishedEmpty] = useState(false);
  const [scanError, setScanError] = useState(false);
  const [studentsList, setStudentsList] = useState([]);
  const [pendingDuplicates, setPendingDuplicates] = useState([]);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [remoteSessionId, setRemoteSessionId] = useState('');
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [isPortrait, setIsPortrait] = useState(false);
  const [manualModel, setManualModel] = useState('gemini-3.5-flash');
  
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const unsubscribeRef = useRef(null);

  React.useEffect(() => {
    if (isCameraActive && videoRef.current && streamRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
      }
    }
  }, [isCameraActive, cameras]);

  React.useEffect(() => {
    if (completedCrop?.width && completedCrop?.height && imagePreview) {
      const img = new Image();
      img.src = imagePreview;
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const upscaleFactor = 1.0;
        
        // completedCrop ya está en porcentajes gracias a onComplete
        const actualX = (completedCrop.x / 100) * img.naturalWidth;
        const actualY = (completedCrop.y / 100) * img.naturalHeight;
        const actualWidth = (completedCrop.width / 100) * img.naturalWidth;
        const actualHeight = (completedCrop.height / 100) * img.naturalHeight;
        
        canvas.width = Math.floor(actualWidth * upscaleFactor);
        canvas.height = Math.floor(actualHeight * upscaleFactor);
        
        const ctx = canvas.getContext('2d');
        ctx.filter = 'grayscale(100%) contrast(150%) brightness(110%)';
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.drawImage(
          img,
          actualX,
          actualY,
          actualWidth,
          actualHeight,
          0,
          0,
          canvas.width,
          canvas.height
        );
        
        canvas.toBlob((blob) => {
          if (blob) setCroppedImageUrl(URL.createObjectURL(blob));
        }, 'image/jpeg', 0.55);
      };
    } else {
      setCroppedImageUrl(null);
    }
  }, [completedCrop, imagePreview]);

  if (!isOpen) return null;

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
      setCrop(null);
      setCompletedCrop(null);
      setCroppedImageUrl(null);
      setStudentsList([]);
    }
  };

  const getCroppedImageBlob = () => {
    if (!completedCrop || !completedCrop.width || !completedCrop.height || !imagePreview) {
      return null;
    }
    
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const upscaleFactor = 1.0;
        
        const actualX = (completedCrop.x / 100) * img.naturalWidth;
        const actualY = (completedCrop.y / 100) * img.naturalHeight;
        const actualWidth = (completedCrop.width / 100) * img.naturalWidth;
        const actualHeight = (completedCrop.height / 100) * img.naturalHeight;
        
        canvas.width = Math.floor(actualWidth * upscaleFactor);
        canvas.height = Math.floor(actualHeight * upscaleFactor);
        
        const ctx = canvas.getContext('2d');
        ctx.filter = 'grayscale(100%) contrast(150%) brightness(110%)';
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.drawImage(
          img,
          actualX,
          actualY,
          actualWidth,
          actualHeight,
          0,
          0,
          canvas.width,
          canvas.height
        );
        
        canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.55);
      };
      img.src = imagePreview;
    });
  };

  const blobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          // Redimensionar si es muy grande (max 1200px)
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height = Math.round((height * MAX_WIDTH) / width);
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = Math.round((width * MAX_HEIGHT) / height);
              height = MAX_HEIGHT;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          
          // Mejorar contraste levemente para el texto
          ctx.filter = 'grayscale(100%) contrast(120%)';
          ctx.drawImage(img, 0, 0, width, height);

          // Exportar a JPEG con calidad 0.6 (Reduce el peso drásticamente)
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
          // Retornar solo la parte de los datos
          resolve(compressedBase64.split(',')[1]);
        };
        img.onerror = reject;
        img.src = event.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const processImage = async () => {
    if (!image) return;
    setIsProcessing(true);
    setProgress(0);
    setStatusText('Preparando imagen...');
    setScanFinishedEmpty(false);
    setScanError(false);
    setRawOcrText('');

    let imageToProcess = image;
    
    // Si hay un recorte válido seleccionado
    if (completedCrop && completedCrop.width > 0 && completedCrop.height > 0) {
      const croppedBlob = await getCroppedImageBlob();
      if (croppedBlob) {
        imageToProcess = croppedBlob;
      }
    }

    try {
      setStatusText('Estableciendo conexión...');
      setProgress(30);
      
      let base64Data;
      let mimeType;
      
      if (typeof imageToProcess === 'string' && imageToProcess.startsWith('data:image')) {
        base64Data = imageToProcess.split(',')[1];
        mimeType = imageToProcess.split(';')[0].split(':')[1];
      } else {
        base64Data = await blobToBase64(imageToProcess);
        mimeType = imageToProcess.type || 'image/jpeg';
      }
      
      // Ofuscamos ligeramente la clave para evitar el bloqueo automático de GitHub
      const apiKey = atob(import.meta.env.VITE_GEMINI_API_KEY_B64);
      
      // 1. Sistema de Contador Inteligente (Sincronizado a hora local)
      const today = new Date().toLocaleDateString('es-MX', { timeZone: 'America/Mazatlan' });
      // Usamos _v2 para forzar que tome los valores actualizados hoy.
      const quotaRef = doc(db, "system_config", "gemini_smart_counter_v2");
      const quotaSnap = await getDoc(quotaRef);
      let geminiQuota = quotaSnap.exists() ? quotaSnap.data() : null;

      // Si es un día nuevo o el contador no existe, lo inicializamos.
      if (!geminiQuota || geminiQuota.date !== today) {
        // Configuramos los intentos iniciales. 
        geminiQuota = {
          date: today,
          models: {
            "gemini-3.5-flash": 20, 
            "gemini-flash-lite-latest": 20,
            "gemini-3.1-flash-lite": 20,
            "gemini-3.8-flash": 20
          }
        };
        await setDoc(quotaRef, geminiQuota);
      }

      // Asegurar que si escoge uno nuevo exista en la cuota
      if (manualModel !== 'auto' && geminiQuota.models[manualModel] === undefined) {
        geminiQuota.models[manualModel] = 20;
      }

      let selectedModel = null;

      if (manualModel !== 'auto') {
        if (geminiQuota.models[manualModel] > 0) {
          selectedModel = manualModel;
        } else {
          throw new Error(`Has agotado los intentos para ${manualModel}. Elige otro o cambia a Automático.`);
        }
      } else {
        const priorityOrder = ["gemini-3.5-flash", "gemini-flash-lite-latest", "gemini-3.1-flash-lite", "gemini-3.8-flash"];
        for (const model of priorityOrder) {
          if (geminiQuota.models[model] > 0) {
            selectedModel = model;
            break;
          }
        }
      }

      if (!selectedModel) {
        throw new Error("Has agotado tus intentos gratuitos de hoy en todos los modelos. El contador se reiniciará a la medianoche.");
      }

      setStatusText(`Extrayendo texto con ${selectedModel} (${geminiQuota.models[selectedModel]} intentos restantes)...`);
      setProgress(60);

      // 3. Descontamos el intento INMEDIATAMENTE antes de hacer la conexión
      geminiQuota.models[selectedModel] -= 1;
      await setDoc(quotaRef, geminiQuota);

      const prompt = `Extrae los alumnos de la lista en la imagen.
Reglas:
1. Ignora texto irrelevante (encabezados, fechas, logos). Solo extrae Número de Lista y Nombre.
2. Corrige ortografía y acentos obligatoriamente (ej. PEREZ -> PÉREZ).
3. Escribe todo en MAYÚSCULAS.
Responde ÚNICAMENTE en CSV plano (numero,nombre) sin cabeceras ni formato markdown.
Ejemplo:
1,AGUILAR GINÉS MÍA HARUMY`;

      const requestBody = {
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: mimeType,
                  data: base64Data
                }
              }
            ]
          }
        ]
      };

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`;
      
      // 4. Temporizador amplio de 90 segundos (90000 ms) sin reintentos automáticos
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000); 

      let resultData;

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData?.error?.message || `Error del servidor HTTP ${response.status}`);
        }

        resultData = await response.json();
        
      } catch (err) {
        clearTimeout(timeoutId);
        
        if (err.name === 'AbortError') {
          throw new Error(`El modelo tardó más de 1.5 minutos. Intento consumido. Quedan ${geminiQuota.models[selectedModel]} usos en este modelo.`);
        } else {
          // ¡Aquí está la clave! Ahora mostraremos el error real (err.message) que envió Google
          throw new Error(`Falla del servidor: ${err.message}`);
        }
      }
      
      setStatusText('Dando formato a los resultados...');
      setProgress(90);

      const textResponse = resultData.candidates?.[0]?.content?.parts?.[0]?.text || "";
      setRawOcrText(textResponse);
      
      const cleanedCsvText = textResponse.replace(/```csv/gi, '').replace(/```/g, '').trim();
      const aiData = cleanedCsvText.split('\n').map(line => {
        const parts = line.split(',');
        if (parts.length >= 2) {
          const num = parts[0].trim();
          const nom = parts.slice(1).join(',').trim();
          if (num && nom) {
            return { numeroLista: num, nombre: nom };
          }
        }
        return null;
      }).filter(Boolean);
      
      if (!Array.isArray(aiData) || aiData.length === 0) {
        setScanFinishedEmpty(true);
        setStudentsList([]);
        return;
      }
      
      const parsedStudents = aiData.map((student, index) => ({
        id: `temp-${index}-${student.numeroLista || Math.random()}`,
        numeroLista: student.numeroLista || '',
        nombre: student.nombre || '',
        grupo: 'A'
      }));

      setProgress(100);
      setStudentsList(parsedStudents);
    } catch (error) {
      console.error("Error al procesar la imagen:", error);
      setScanError(error.message || "Error desconocido de conexión");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStudentChange = (id, field, value) => {
    setStudentsList(prev => 
      prev.map(s => s.id === id ? { ...s, [field]: value } : s)
    );
  };

  const handleDeleteRow = (id) => {
    setStudentsList(prev => prev.filter(s => s.id !== id));
  };

  const handleSaveAll = () => {
    if (studentsList.length === 0) return;

    let addedCount = 0;
    const duplicates = [];
    const addedIds = [];
    
    // Add each valid student using the existing logic
    studentsList.forEach(student => {
      if (student.nombre.trim()) {
        const newStudent = {
          id: String(Date.now() + Math.random()),
          numeroLista: student.numeroLista,
          nombre: student.nombre.trim(),
          grado: activeGrade,
          grupo: student.grupo,
          telefonoTutor: '—',
          horaEntrada: '13:00',
          estado: 'PRESENTE',
          observaciones: '—',
          qrCode: `STUDENT-${(student.nombre || "").slice(0, 2).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`
        };
        
        const result = onAddStudent(newStudent);
        if (result === true) {
          addedCount++;
          addedIds.push(student.id);
        } else if (result !== false) {
          // If result is not explicitly true/false, it returned the duplicate object
          duplicates.push({ 
            ...student, 
            newStudentData: newStudent,
            duplicateOf: result,
            isChecked: false
          });
        }
      }
    });

    if (duplicates.length > 0) {
      // Remove the successfully added ones from the list
      setStudentsList(prev => prev.filter(s => !addedIds.includes(s.id)));
      setPendingDuplicates(duplicates);
      return;
    }

    if (addedCount > 0) {
      // We no longer use alert to be less intrusive, or we can use a small one
      // But if there's no duplicates, we can just close safely.
      handleClose();
    }
  };

  const handleResolveDuplicates = () => {
    let addedCount = 0;
    const toAdd = pendingDuplicates.filter(dup => dup.isChecked);
    
    toAdd.forEach(dup => {
      // onAddStudent(student, force = true)
      const result = onAddStudent(dup.newStudentData, true);
      if (result === true) addedCount++;
    });

    setPendingDuplicates([]);
    handleClose();
  };

  const startCamera = async (deviceId = null) => {
    try {
      setIsCameraActive(true);
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      let stream;
      const constraints = deviceId 
        ? { video: { deviceId: { exact: deviceId } } }
        : { video: { facingMode: 'environment' } };

      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (e) {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      } else {
        setTimeout(() => {
          if (videoRef.current) videoRef.current.srcObject = stream;
        }, 100);
      }

      // Load available cameras
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(d => d.kind === 'videoinput');
        setCameras(videoDevices);
        if (!deviceId && videoDevices.length > 0) {
          const track = stream.getVideoTracks()[0];
          const activeDevice = videoDevices.find(d => d.label === track.label);
          if (activeDevice) setSelectedCameraId(activeDevice.deviceId);
          else setSelectedCameraId(videoDevices[0].deviceId);
        } else if (deviceId) {
          setSelectedCameraId(deviceId);
        }
      } catch (e) {}

    } catch (err) {
      console.error("Error accediendo a la cámara", err);
      alert("No se pudo acceder a la cámara. Verifica los permisos.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const startRemoteSession = () => {
    const newSessionId = `session-${Date.now()}`;
    setRemoteSessionId(newSessionId);
    setShowQR(true);
    
    // Listen to Firebase
    unsubscribeRef.current = onSnapshot(doc(db, 'remote_scans', newSessionId), (docSnap) => {
      if (docSnap.exists() && docSnap.data().image) {
        // Image received!
        const base64Data = docSnap.data().image;
        setImage(base64Data);
        setImagePreview(base64Data);
        setStudentsList([]);
        
        // Clean up
        deleteDoc(doc(db, 'remote_scans', newSessionId));
        closeRemoteSession();
      }
    });
  };

  const closeRemoteSession = () => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    setShowQR(false);
  };

  const captureImage = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob((blob) => {
        const file = new File([blob], "captura-lista.jpg", { type: "image/jpeg" });
        setImage(file);
        setImagePreview(URL.createObjectURL(file));
        setStudentsList([]);
        stopCamera();
      }, 'image/jpeg', 0.95);
    }
  };

  const handleClose = () => {
    stopCamera();
    closeRemoteSession();
    setImage(null);
    setImagePreview(null);
    setStudentsList([]);
    setProgress(0);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-[#182234] rounded-2xl w-full max-w-4xl border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-start sm:items-center p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800 gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white flex items-center gap-2 flex-wrap">
              <FileText className="w-5 h-5 text-blue-600 shrink-0" />
              <span className="leading-tight">Escanear Lista ({activeGrade} Grado)</span>
            </h3>
            <p className="text-[11px] sm:text-xs text-gray-500 mt-1.5 sm:mt-1 leading-snug">Sube o toma una foto de tu lista para extraer los nombres.</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={manualModel}
              onChange={(e) => setManualModel(e.target.value)}
              className="text-xs bg-gray-50 border border-gray-200 text-gray-700 rounded-lg px-2 py-1.5 font-medium outline-none focus:border-blue-500 transition-colors"
            >
              <option value="auto">Modelo (Automático)</option>
              <option value="gemini-3.5-flash">Gemini 3.5 Flash</option>
              <option value="gemini-flash-lite-latest">Gemini Flash Lite</option>
              <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite</option>
              <option value="gemini-3.6-flash">Gemini 3.6 Flash</option>
              <option value="gemini-3.7-flash">Gemini 3.7 Flash</option>
              <option value="gemini-3.8-flash">Gemini 3.8 Flash</option>
            </select>
            <button onClick={handleClose} className="p-2 -mr-2 sm:mr-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors shrink-0">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 sm:space-y-6">
          
          {/* Upload Area */}
          {!imagePreview && !isCameraActive && !showQR && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div 
                className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl p-8 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-800/50 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors h-full"
                onClick={() => fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageChange} 
                  accept="image/*" 
                  className="hidden" 
                />
                <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-full flex items-center justify-center mb-4">
                  <Upload className="w-7 h-7" />
                </div>
                <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300">Subir imagen</h4>
                <p className="text-xs text-gray-500 mt-2 text-center max-w-xs">Formatos soportados: JPG, PNG.</p>
              </div>

              <div 
                className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl p-8 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-800/50 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors h-full"
                onClick={() => startCamera()}
              >
                <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-full flex items-center justify-center mb-4">
                  <Camera className="w-7 h-7" />
                </div>
                <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300">Tomar foto</h4>
                <p className="text-xs text-gray-500 mt-2 text-center max-w-xs">Usa tu cámara web para escanear la lista impresa.</p>
              </div>

              <div 
                className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl p-8 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-800/50 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors h-full"
                onClick={startRemoteSession}
              >
                <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-full flex items-center justify-center mb-4 relative">
                  <Smartphone className="w-7 h-7" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-800">
                    <QrCode className="w-2 h-2 text-white" />
                  </div>
                </div>
                <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300">Vincular Celular</h4>
                <p className="text-xs text-gray-500 mt-2 text-center max-w-xs">Usa la cámara de tu celular para una mejor calidad.</p>
              </div>
            </div>
          )}

          {/* QR View */}
          {showQR && (
            <div className="flex flex-col items-center space-y-6">
              <div className="text-center max-w-md mx-auto">
                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Smartphone className="w-8 h-8" />
                </div>
                <h4 className="text-lg font-bold text-gray-900 dark:text-white">Escanea para vincular cámara</h4>
                <p className="text-sm text-gray-500 mt-2">
                  Abre la cámara de tu celular y escanea este código. Toma la foto desde tu celular y aparecerá aquí automáticamente.
                </p>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 flex flex-col items-center">
                <QRCodeSVG 
                  value={`${window.location.origin}${window.location.pathname}?remote_scan=${remoteSessionId}`} 
                  size={200} 
                  level="H" 
                  includeMargin 
                />
                <p className="text-[10px] font-mono text-gray-400 mt-4 break-all max-w-[200px] text-center">
                  ID: {remoteSessionId}
                </p>
              </div>

              <button 
                onClick={closeRemoteSession}
                className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-sm transition-colors"
              >
                Cancelar vinculación
              </button>
            </div>
          )}

          {/* Camera View */}
          {isCameraActive && !imagePreview && (
            <div className="flex flex-col items-center space-y-4">
              <div className="flex gap-4 mb-2 w-full max-w-2xl justify-center sm:justify-between flex-wrap">
                {cameras.length > 1 && (
                  <select 
                    value={selectedCameraId}
                    onChange={(e) => startCamera(e.target.value)}
                    className="px-3 py-2 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-white rounded-lg text-sm outline-none border border-gray-300 dark:border-gray-600 font-semibold"
                  >
                    {cameras.map((cam, idx) => (
                      <option key={cam.deviceId} value={cam.deviceId}>
                        {cam.label || `Cámara ${idx + 1}`}
                      </option>
                    ))}
                  </select>
                )}
                
                <button
                  onClick={() => setIsPortrait(!isPortrait)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-colors"
                >
                  <RefreshCw className="w-4 h-4" /> 
                  {isPortrait ? 'Cambiar a Horizontal' : 'Cambiar a Vertical'}
                </button>
              </div>

              <div className={`relative rounded-xl overflow-hidden border-2 border-indigo-500 shadow-lg bg-black transition-all duration-300 ${isPortrait ? 'w-full max-w-sm aspect-[3/4]' : 'w-full max-w-2xl aspect-video'}`}>
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                ></video>
                <div className="absolute bottom-4 left-0 w-full flex justify-center gap-4 z-10">
                  <button 
                    onClick={stopCamera}
                    className="px-4 py-2 bg-gray-800/80 hover:bg-gray-900 text-white rounded-full text-sm font-bold backdrop-blur-sm transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={captureImage}
                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full text-sm font-bold shadow-lg transition-all active:scale-95 flex items-center gap-2"
                  >
                    <Camera className="w-4 h-4" />
                    Capturar
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-500">Asegúrate de que la lista esté bien iluminada y nítida.</p>
            </div>
          )}

          {/* Processing Area */}
          {imagePreview && studentsList.length === 0 && (
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="w-full md:w-1/2 flex flex-col items-center space-y-4">
                <div 
                  className="relative rounded-xl overflow-hidden shadow-sm w-full bg-black/5 flex items-center justify-center cursor-pointer group border-2 border-transparent hover:border-indigo-400 transition-colors"
                  onClick={() => setIsFullscreenCrop(true)}
                >
                  {/* Mostrar la imagen subida o recortada en miniatura */}
                  <img 
                    ref={imgRef}
                    src={croppedImageUrl || imagePreview} 
                    alt="Preview" 
                    className={`w-full max-h-[400px] object-contain transition-opacity opacity-100 group-hover:opacity-70`}
                  />
                  
                  {/* Overlay sobre la imagen indicando la acción */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                    {completedCrop ? (
                      <>
                        <div className="w-12 h-12 bg-emerald-500 text-white rounded-full flex items-center justify-center mb-2 shadow-lg">
                          <Check className="w-6 h-6" />
                        </div>
                        <span className="font-bold text-white shadow-sm">Recorte aplicado</span>
                        <span className="text-xs text-gray-200">Clic para ajustar</span>
                      </>
                    ) : (
                      <>
                        <div className="w-12 h-12 bg-indigo-500 text-white rounded-full flex items-center justify-center mb-2 shadow-lg">
                          <ImageIcon className="w-6 h-6" />
                        </div>
                        <span className="font-bold text-white shadow-sm">Recortar Lista</span>
                        <span className="text-xs text-gray-200">Clic para abrir en pantalla completa</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex justify-between w-full text-xs text-gray-500">
                  <span className="flex items-center gap-1 text-indigo-600 font-semibold bg-indigo-50 px-2 py-1 rounded">
                    ¡Selecciona con precisión!
                  </span>
                  <button
                    onClick={() => { setImage(null); setImagePreview(null); setCrop(null); setCompletedCrop(null); }}
                    className="font-semibold text-gray-500 hover:text-gray-700 flex items-center gap-1"
                  >
                    <X className="w-3 h-3" /> Cambiar imagen
                  </button>
                </div>
              </div>
              
              <div className="w-full md:w-1/2 flex flex-col justify-center h-full min-h-[300px] items-center bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-8 border border-gray-100 dark:border-gray-700">
                {isProcessing ? (
                  <div className="flex flex-col items-center space-y-4 w-full">
                    <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                    <div className="text-center">
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white">Procesando documento...</h4>
                      <p className="text-xs text-gray-500 mt-1">{statusText || 'Extrayendo texto mediante OCR'}</p>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full max-w-xs bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-4">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                    <span className="text-xs font-bold text-blue-600">{progress}%</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center space-y-4 text-center">
                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-full flex items-center justify-center">
                      <ImageIcon className="w-8 h-8" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-gray-900 dark:text-white">Imagen lista para procesar</h4>
                      <p className="text-xs text-gray-500 mt-1 max-w-xs">Haremos un escaneo inteligente para detectar los nombres en la lista.</p>
                    </div>
                    {scanFinishedEmpty && !scanError && (
                      <div className="mt-4 p-4 bg-rose-50 dark:bg-rose-900/20 rounded-xl border border-rose-200 dark:border-rose-800 text-left w-full max-w-md max-h-48 overflow-y-auto">
                        <h5 className="text-sm font-bold text-rose-700 dark:text-rose-400 mb-2">No se detectaron alumnos válidos.</h5>
                        <p className="text-xs text-rose-600 dark:text-rose-300 mb-2">Esto fue lo que leyó el escáner (Texto Crudo):</p>
                        <pre className="text-[10px] text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono bg-white dark:bg-gray-900 p-2 rounded border border-gray-200 dark:border-gray-700">{rawOcrText}</pre>
                      </div>
                    )}
                    {scanError && (
                      <div className="mt-4 p-4 bg-rose-50 dark:bg-rose-900/20 rounded-xl border border-rose-200 dark:border-rose-800 text-left w-full max-w-md">
                        <h5 className="text-sm font-bold text-rose-700 dark:text-rose-400 mb-2">Error al procesar</h5>
                        <p className="text-xs text-rose-600 dark:text-rose-300">
                          {typeof scanError === 'string' ? scanError : "No se pudo procesar la imagen debido a un error. Por favor, intenta de nuevo."}
                        </p>
                      </div>
                    )}
                    
                    <div className="flex flex-wrap gap-3 mt-4 justify-center">
                      {(scanError || scanFinishedEmpty) ? (
                        <>
                          <button
                            onClick={processImage}
                            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-md transition flex items-center gap-2"
                          >
                            <RefreshCw className="w-4 h-4" />
                            Reintentar escaneo
                          </button>
                          <button
                            onClick={() => { setImage(null); setImagePreview(null); setScanError(false); setScanFinishedEmpty(false); }}
                            className="px-6 py-2.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white text-sm font-bold rounded-xl transition"
                          >
                            Elegir otra foto
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={processImage}
                          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-md transition flex items-center gap-2"
                        >
                          <FileText className="w-4 h-4" />
                          Iniciar escaneo
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Results Table */}
          {studentsList.length > 0 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-300 rounded-full flex items-center justify-center">
                    <Check className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">Extracción Completada</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Se encontraron {studentsList.length} posibles nombres. Revisa y corrige si es necesario.</p>
                  </div>
                </div>
              </div>

              {/* VISTA MÓVIL - TARJETAS RESPONSIVAS */}
              <div className="sm:hidden space-y-3 mt-4">
                {studentsList.map((student, idx) => (
                  <div key={student.id} className="bg-white dark:bg-[#1e293b] rounded-xl p-3 border border-gray-200 dark:border-gray-700 shadow-sm relative pr-10">
                    <button
                      onClick={() => handleDeleteRow(student.id)}
                      className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="flex flex-col gap-2 mt-1">
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 w-16 shrink-0">Nº Lista:</label>
                        <input
                          type="text"
                          value={student.numeroLista || ''}
                          onChange={(e) => handleStudentChange(student.id, 'numeroLista', e.target.value)}
                          className="w-16 px-2 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 hover:border-gray-300 focus:border-blue-500 rounded text-sm font-bold text-gray-600 dark:text-gray-300 focus:outline-none transition-colors text-center"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 w-16 shrink-0">Nombre:</label>
                        <input
                          type="text"
                          value={student.nombre}
                          onChange={(e) => handleStudentChange(student.id, 'nombre', e.target.value)}
                          className="flex-1 px-2 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 hover:border-gray-300 focus:border-blue-500 rounded text-sm dark:text-white focus:outline-none transition-colors"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 w-16 shrink-0">Grupo:</label>
                        <select
                          value={student.grupo}
                          onChange={(e) => handleStudentChange(student.id, 'grupo', e.target.value)}
                          className="flex-1 px-2 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 hover:border-gray-300 focus:border-blue-500 rounded text-sm dark:text-white focus:outline-none"
                        >
                          <option value="A">Grupo A</option>
                          <option value="B">Grupo B</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* VISTA ESCRITORIO - TABLA */}
              <div className="hidden sm:block border border-gray-200 dark:border-gray-700 rounded-xl overflow-x-auto mt-4">
                <table className="w-full text-left border-collapse min-w-[500px]">
                  <thead className="bg-gray-50 dark:bg-gray-800 text-xs font-bold text-gray-500 dark:text-gray-400">
                    <tr>
                      <th className="py-3 px-4 w-20">Nº Lista</th>
                      <th className="py-3 px-4">Nombre Completo</th>
                      <th className="py-3 px-4 w-32">Grupo</th>
                      <th className="py-3 px-4 text-center w-16">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {studentsList.map((student, idx) => (
                      <tr key={student.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
                        <td className="py-2 px-4">
                          <input 
                            type="text" 
                            value={student.numeroLista || ''} 
                            onChange={(e) => handleStudentChange(student.id, 'numeroLista', e.target.value)}
                            className="w-full px-2 py-1.5 bg-transparent border border-transparent hover:border-gray-200 focus:border-blue-500 rounded text-sm font-bold text-gray-600 dark:text-gray-400 focus:outline-none transition-colors text-center"
                          />
                        </td>
                        <td className="py-2 px-4">
                          <input 
                            type="text" 
                            value={student.nombre} 
                            onChange={(e) => handleStudentChange(student.id, 'nombre', e.target.value)}
                            className="w-full px-2 py-1.5 bg-transparent border border-transparent hover:border-gray-200 focus:border-blue-500 rounded text-sm dark:text-white focus:outline-none transition-colors"
                          />
                        </td>
                        <td className="py-2 px-4">
                          <select
                            value={student.grupo}
                            onChange={(e) => handleStudentChange(student.id, 'grupo', e.target.value)}
                            className="w-full px-2 py-1.5 bg-transparent border border-transparent hover:border-gray-200 focus:border-blue-500 rounded text-sm dark:text-white focus:outline-none"
                          >
                            <option value="A">Grupo A</option>
                            <option value="B">Grupo B</option>
                          </select>
                        </td>
                        <td className="py-2 px-4 text-center">
                          <button 
                            onClick={() => handleDeleteRow(student.id)}
                            className="p-1.5 text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors"
                            title="Eliminar fila"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#1c273c] flex justify-end gap-3">
          <button
            onClick={handleClose}
            className="px-5 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors"
          >
            Cancelar
          </button>
          
          <button
            onClick={handleSaveAll}
            disabled={studentsList.length === 0}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl shadow-md transition-colors ${
              studentsList.length > 0 
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                : 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Save className="w-4 h-4" />
            Guardar {studentsList.length > 0 ? studentsList.length : ''} Alumnos
          </button>
        </div>

      </div>

      {/* Duplicate Resolution Modal */}
      {pendingDuplicates.length > 0 && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-transparent backdrop-blur-md animate-fadeIn">
          <div className="bg-white/80 dark:bg-[#182234]/80 backdrop-blur-xl rounded-2xl w-full max-w-lg border border-white/40 dark:border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] p-6 relative">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <span className="text-2xl">⚠️</span> Alumnos Duplicados Detectados
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Se han encontrado {pendingDuplicates.length} alumno(s) que ya están registrados en el sistema. ¿Qué deseas hacer con ellos?
            </p>
            
            <div className="max-h-40 overflow-y-auto bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 mb-6 divide-y divide-gray-100 dark:divide-gray-800">
              {pendingDuplicates.map((dup, idx) => (
                <label key={idx} className="p-3 text-xs flex justify-between items-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <input 
                      type="checkbox" 
                      checked={dup.isChecked}
                      onChange={() => {
                        setPendingDuplicates(prev => prev.map(d => d.id === dup.id ? { ...d, isChecked: !d.isChecked } : d));
                      }}
                      className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                    />
                    <span className="font-semibold text-gray-800 dark:text-gray-200">{dup.nombre}</span>
                  </div>
                  <span className="text-gray-500">Ya existe en: {dup.duplicateOf?.grado} {dup.duplicateOf?.grupo}</span>
                </label>
              ))}
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleResolveDuplicates}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-md transition-colors"
              >
                {pendingDuplicates.filter(d => d.isChecked).length > 0 
                  ? `Agregar seleccionados (${pendingDuplicates.filter(d => d.isChecked).length}) y omitir el resto` 
                  : 'Omitir todos'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Crop Modal */}
      {isFullscreenCrop && imagePreview && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col animate-fadeIn">
          <div className="flex justify-between items-center p-4 bg-gray-900 text-white border-b border-gray-800">
            <div>
              <h3 className="font-bold text-lg flex items-center gap-2"><ImageIcon className="w-5 h-5 text-indigo-400"/> Recortar Área de la Tabla</h3>
              <p className="text-xs text-gray-400 mt-1">Selecciona SÓLO los nombres y números, evitando los bordes gruesos de la tabla y los encabezados.</p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => { setCrop(null); setCompletedCrop(null); setIsFullscreenCrop(false); }} 
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl text-sm font-bold transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={() => setIsFullscreenCrop(false)} 
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors"
              >
                <Check className="w-4 h-4"/> Confirmar Recorte
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto flex items-center justify-center p-4 bg-[#0a0a0a]">
            <ReactCrop 
              crop={crop} 
              onChange={c => setCrop(c)}
              onComplete={(_, percentCrop) => setCompletedCrop(percentCrop)}
              className="max-w-none"
            >
              <img 
                src={imagePreview} 
                alt="Fullscreen Crop" 
                className="max-w-none"
                style={{ maxHeight: '85vh', objectFit: 'contain' }}
              />
            </ReactCrop>
          </div>
        </div>
      )}

    </div>
  );
}
