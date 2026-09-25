import React, { useState, useEffect, useRef } from 'react';
import Webcam from 'react-webcam';
import * as faceapi from '@vladmandic/face-api';
import { X, Camera, ShieldCheck, Loader2, RefreshCw } from 'lucide-react';

export function BiometricEnrollmentModal({ isOpen, onClose, onEnroll, userName }) {
  const webcamRef = useRef(null);
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState('');
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [status, setStatus] = useState('Cargando modelos...');
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setIsModelLoaded(false);
      setStatus('Cargando modelos...');
      return;
    }

    const loadModels = async () => {
      try {
        await faceapi.nets.ssdMobilenetv1.loadFromUri('/models');
        await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
        await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
        setIsModelLoaded(true);
        setStatus('Cámara lista. Ubica tu rostro en el centro.');
      } catch (err) {
        console.error('Error loading face-api models:', err);
        setStatus('Error al cargar el motor biométrico.');
      }
    };
    loadModels();
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      navigator.mediaDevices.enumerateDevices().then(mediaDevices => {
        const videoDevices = mediaDevices.filter(({ kind }) => kind === 'videoinput');
        setDevices(videoDevices);
        if (videoDevices.length > 0) {
          const frontCamera = videoDevices.find(d => d.label.toLowerCase().includes('front'));
          setSelectedDevice(frontCamera ? frontCamera.deviceId : videoDevices[0].deviceId);
        }
      });
    }
  }, [isOpen]);

  const handleCapture = async () => {
    if (!webcamRef.current || !isModelLoaded) return;
    setIsCapturing(true);
    setStatus('Analizando rostro...');

    const video = webcamRef.current.video;
    
    try {
      const detection = await faceapi.detectSingleFace(video, new faceapi.SsdMobilenetv1Options({ inputSize: 224 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (detection) {
        setStatus('¡Rostro capturado con éxito!');
        // Array.from to convert Float32Array to normal array for Firebase
        const descriptorArray = Array.from(detection.descriptor);
        
        setTimeout(() => {
          onEnroll(descriptorArray);
        }, 1000);
      } else {
        setStatus('No se detectó un rostro claro. Acércate a la cámara.');
        setIsCapturing(false);
      }
    } catch (err) {
      console.error('Face detection error:', err);
      setStatus('Error al analizar el rostro.');
      setIsCapturing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-[#1c1c1e] rounded-3xl w-full max-w-md border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden flex flex-col relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 z-10 p-1"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-gray-900 dark:text-white font-outfit leading-tight">
                Registro Biométrico
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                Crea tu perfil facial seguro para {userName}
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 flex flex-col items-center">
          
          <div className="w-full mb-3 flex items-center justify-between px-1">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Cámara</span>
            {devices.length > 1 && (
              <select 
                value={selectedDevice} 
                onChange={(e) => setSelectedDevice(e.target.value)}
                className="text-[10px] py-1 px-2 border border-slate-200 dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 outline-none font-bold"
              >
                {devices.map((device, key) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Cámara ${key + 1}`}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="relative w-full rounded-2xl overflow-hidden bg-black flex items-center justify-center min-h-[250px] shadow-inner">
            <Webcam
              ref={webcamRef}
              audio={false}
              videoConstraints={{ deviceId: selectedDevice }}
              className="w-full object-cover"
              style={{ transform: 'scaleX(-1)' }} // Efecto espejo
            />

            {/* Overlay */}
            <div className="absolute inset-0 border-[4px] border-indigo-500/30 m-4 rounded-xl pointer-events-none flex items-center justify-center">
               <div className="w-32 h-40 border-2 border-dashed border-white/50 rounded-[40%]"></div>
            </div>

            {!isModelLoaded && (
              <div className="absolute inset-0 bg-slate-900/80 flex flex-col items-center justify-center text-white p-4 text-center">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-2" />
                <p className="text-xs font-bold">Cargando Inteligencia Artificial...</p>
              </div>
            )}

            {isCapturing && status.includes('Analizando') && (
              <div className="absolute inset-0 bg-slate-900/60 flex flex-col items-center justify-center text-white p-4 text-center backdrop-blur-sm">
                <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mb-2" />
                <p className="text-xs font-bold">{status}</p>
              </div>
            )}
            
            {status.includes('éxito') && (
              <div className="absolute inset-0 bg-emerald-500/90 flex flex-col items-center justify-center text-white p-4 text-center animate-fadeIn">
                <ShieldCheck className="w-12 h-12 mb-2 animate-bounce" />
                <p className="text-sm font-black uppercase tracking-wider">Rostro Registrado</p>
              </div>
            )}
          </div>

          <p className="text-[11px] text-center text-slate-500 dark:text-slate-400 mt-4 px-2">
            {status}
          </p>

          <button
            onClick={handleCapture}
            disabled={!isModelLoaded || isCapturing || status.includes('éxito')}
            className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white font-extrabold py-3.5 px-4 rounded-xl text-xs tracking-wider uppercase transition-colors shadow-md flex items-center justify-center gap-2 active:scale-95"
          >
            <Camera className="w-4 h-4" />
            <span>Capturar Rostro</span>
          </button>
        </div>
      </div>
    </div>
  );
}
