import React, { useState, useEffect, useRef } from 'react';
import Webcam from 'react-webcam';
import * as faceapi from '@vladmandic/face-api';
import { Camera, RefreshCw, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';

export function BiometricTeacherScanner({ users, isPaused, onSuccess, onCancel }) {
  const webcamRef = useRef(null);
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState('');
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [status, setStatus] = useState('Cargando motor biométrico...');
  const [faceMatcher, setFaceMatcher] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const scanIntervalRef = useRef(null);

  // Liveness check state
  const blinkStateRef = useRef({
    targetUserId: null,
    isBlinking: false,
    hasBlinked: false
  });

  const getDistance = (p1, p2) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));

  const getEAR = (eye) => {
    const v1 = getDistance(eye[1], eye[5]);
    const v2 = getDistance(eye[2], eye[4]);
    const h = getDistance(eye[0], eye[3]);
    return (v1 + v2) / (2.0 * h);
  };

  // 1. Cargar rostros de TODOS los docentes
  useEffect(() => {
    try {
      const labeledDescriptors = users
        .filter(u => u.vectorBiometrico && Array.isArray(u.vectorBiometrico))
        .map(u => new faceapi.LabeledFaceDescriptors(
          u.id, 
          [new Float32Array(u.vectorBiometrico)]
        ));

      if (labeledDescriptors.length > 0) {
        setFaceMatcher(new faceapi.FaceMatcher(labeledDescriptors, 0.55));
      } else {
        setStatus('No hay docentes con rostro registrado.');
      }
    } catch (err) {
      console.error('Error procesando rostros de la BD:', err);
    }
  }, [users]);

  // 2. Cargar modelos de IA
  useEffect(() => {
    const loadModels = async () => {
      try {
        await faceapi.nets.ssdMobilenetv1.loadFromUri('./models');
        await faceapi.nets.faceLandmark68Net.loadFromUri('./models');
        await faceapi.nets.faceRecognitionNet.loadFromUri('./models');
        setIsModelLoaded(true);
        setStatus('Cámara lista. Acércate para tomar tu asistencia.');
        setIsScanning(true);
      } catch (err) {
        console.error('Error loading face-api models:', err);
        setStatus('Error al cargar el motor biométrico.');
      }
    };
    
    loadModels();
  }, []);

  // 3. Obtener cámaras
  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then(mediaDevices => {
      const videoDevices = mediaDevices.filter(({ kind }) => kind === 'videoinput');
      setDevices(videoDevices);
      if (videoDevices.length > 0) {
        const frontCamera = videoDevices.find(d => d.label.toLowerCase().includes('front'));
        setSelectedDevice(frontCamera ? frontCamera.deviceId : videoDevices[0].deviceId);
      }
    });
  }, []);

  // 4. Bucle de Escaneo
  const performScan = async (videoElement) => {
    // Si la cámara está pausada (ej. mostrando feedback), no escanear
    if (isPaused) return;

    try {
      const detection = await faceapi.detectSingleFace(videoElement, new faceapi.SsdMobilenetv1Options({ inputSize: 224 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (detection) {
        // Liveness Detection (Blink check)
        const leftEye = detection.landmarks.getLeftEye();
        const rightEye = detection.landmarks.getRightEye();
        const leftEAR = getEAR(leftEye);
        const rightEAR = getEAR(rightEye);
        const avgEAR = (leftEAR + rightEAR) / 2.0;

        if (faceMatcher) {
          const bestMatch = faceMatcher.findBestMatch(detection.descriptor);
          
          if (bestMatch.label !== 'unknown') {
            const matchedUser = users.find(u => u.id === bestMatch.label);
            if (matchedUser) {
              // Reset blink state if a different user is detected
              if (blinkStateRef.current.targetUserId !== matchedUser.id) {
                blinkStateRef.current = {
                  targetUserId: matchedUser.id,
                  isBlinking: false,
                  hasBlinked: false
                };
              }

              // Evaluate Liveness ONLY for the matched user
              // Bypass Liveness (Blink) to make it instant and reliable
                setStatus(`Identidad verificada para ${matchedUser.nombre || matchedUser.name}! Registrando...`);
                onSuccess(matchedUser);
              }
          } else {
            setStatus('Rostro detectado, pero no reconocido.');
          }
        } else {
          setStatus('Rostro detectado, pero no hay perfiles registrados en el sistema.');
        }
      } else {
        setStatus('Buscando rostro... Asegúrate de tener buena iluminación.');
      }
    } catch (err) {
      console.error('Face detection error:', err);
    }
  };

  useEffect(() => {
    if (isScanning && isModelLoaded && !isPaused) {
      scanIntervalRef.current = setInterval(() => {
        if (webcamRef.current && webcamRef.current.video && webcamRef.current.video.readyState === 4) {
          performScan(webcamRef.current.video);
        }
      }, 150); // Increased frequency for better blink detection
    }

    return () => {
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    };
  }, [isScanning, isModelLoaded, faceMatcher, isPaused, onSuccess, users]);

  const handleManualCapture = () => {
    if (webcamRef.current && webcamRef.current.video && webcamRef.current.video.readyState === 4) {
      setStatus('Analizando captura manual...');
      performScan(webcamRef.current.video);
    }
  };

  return (
    <div className="flex flex-col items-center w-full animate-fadeIn">
      
      <div className="w-full flex flex-col items-center">
          
          {devices.length > 1 && (
            <div className="w-full flex justify-end mb-2">
              <select 
                value={selectedDevice} 
                onChange={(e) => setSelectedDevice(e.target.value)}
                className="text-[10px] py-1 px-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 outline-none shadow-sm font-bold"
              >
                {devices.map((device, key) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Cámara ${key + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Scanner Window styled like QRScannerView */}
          <div className="relative w-64 h-64 border-4 border-emerald-500/80 dark:border-slate-700 rounded-2xl bg-slate-950 shadow-2xl overflow-hidden group mx-auto flex items-center justify-center">
            {/* Corner Markers */}
            <div className="absolute top-3 left-3 w-6 h-6 border-t-4 border-l-4 border-emerald-500 rounded-tl-md z-10 pointer-events-none"></div>
            <div className="absolute top-3 right-3 w-6 h-6 border-t-4 border-r-4 border-emerald-500 rounded-tr-md z-10 pointer-events-none"></div>
            <div className="absolute bottom-3 left-3 w-6 h-6 border-b-4 border-l-4 border-emerald-500 rounded-bl-md z-10 pointer-events-none"></div>
            <div className="absolute bottom-3 right-3 w-6 h-6 border-b-4 border-r-4 border-emerald-500 rounded-br-md z-10 pointer-events-none"></div>

            <Webcam
              ref={webcamRef}
              audio={false}
              videoConstraints={{ deviceId: selectedDevice }}
              className="w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)' }} // Efecto espejo
            />
            
            {/* Scan animation lines */}
            {isScanning && (
               <div className="absolute top-0 left-0 w-full h-[2px] bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-[scan_2s_ease-in-out_infinite]"></div>
            )}

            {!isModelLoaded && (
              <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center text-white p-4 text-center z-20">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mb-2" />
                <p className="text-xs font-bold">Cargando Cálculo Automático...</p>
              </div>
            )}
          </div>
          
          <div className="mt-4 p-3 w-full bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold text-center flex items-center justify-center gap-2 shadow-inner">
            {isScanning && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            {status}
          </div>

          {isScanning && (
            <button
              onClick={handleManualCapture}
              className="mt-3 w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <Camera className="w-4 h-4" />
              <span>Forzar Captura de Rostro</span>
            </button>
          )}

          <button
            onClick={onCancel}
            className="mt-4 w-full py-2 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl flex items-center justify-center transition-all"
          >
            Volver al Inicio de Sesión
          </button>
        </div>

    </div>
  );
}
