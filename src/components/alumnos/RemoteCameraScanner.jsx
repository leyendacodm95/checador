import React, { useState, useRef, useEffect } from 'react';
import { Camera, CheckCircle2, Loader2, RefreshCw, Zap, ZapOff, RotateCcw } from 'lucide-react';
import { db } from '../../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

export function RemoteCameraScanner({ sessionId }) {
  const [status, setStatus] = useState('initializing'); // initializing, active, capturing, success, error
  const [errorMessage, setErrorMessage] = useState('');
  const [isPortrait, setIsPortrait] = useState(true);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    setStatus('initializing');
    try {
      // Intentar primero con la cámara trasera
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      } catch (e) {
        // Fallback a cualquier cámara disponible
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      streamRef.current = stream;
      
      // Check for torch support
      const track = stream.getVideoTracks()[0];
      if (track.getCapabilities) {
        const capabilities = track.getCapabilities();
        setTorchSupported(!!capabilities.torch);
      }
      
      setStatus('active');
    } catch (err) {
      console.error("Error accediendo a la cámara", err);
      setErrorMessage("No se pudo acceder a la cámara. Verifica los permisos de tu navegador.");
      setStatus('error');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        // Apagar la linterna si está encendida antes de detener
        if (torchEnabled && track.applyConstraints) {
          track.applyConstraints({ advanced: [{ torch: false }] }).catch(e => console.log(e));
        }
        track.stop();
      });
      streamRef.current = null;
    }
  };

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    try {
      await track.applyConstraints({
        advanced: [{ torch: !torchEnabled }]
      });
      setTorchEnabled(!torchEnabled);
    } catch (e) {
      console.error("Error toggling torch", e);
    }
  };

  const captureImage = async () => {
    if (!videoRef.current || status !== 'active') return;
    
    setStatus('capturing');
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    
    // Obtener la imagen en base64 comprimida en jpeg
    const base64Data = canvas.toDataURL('image/jpeg', 0.8);
    
    stopCamera();
    
    try {
      // Subir a Firestore
      await setDoc(doc(db, 'remote_scans', sessionId), {
        image: base64Data,
        timestamp: new Date().toISOString()
      });
      setStatus('success');
    } catch (err) {
      console.error("Error subiendo la imagen", err);
      setErrorMessage("No se pudo enviar la foto. Verifica tu conexión a internet.");
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-[#182234] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 className="w-12 h-12" />
        </div>
        <h2 className="text-3xl font-black text-white mb-2">¡Foto enviada!</h2>
        <p className="text-gray-400 mb-8 max-w-xs">
          La imagen se ha transferido a tu computadora correctamente. Continúa el proceso en tu pantalla principal.
        </p>
        <p className="text-sm text-gray-500 font-bold">Ya puedes cerrar esta ventana.</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-[#182234] flex flex-col items-center justify-center p-6 text-center">
        <div className="p-4 bg-rose-500/20 text-rose-400 rounded-2xl mb-6">
          <p className="font-bold">{errorMessage}</p>
        </div>
        <button 
          onClick={startCamera}
          className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold flex items-center gap-2"
        >
          <RefreshCw className="w-5 h-5" /> Intentar de nuevo
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 h-[100dvh] w-full bg-black flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-gray-900/80 backdrop-blur-md text-white text-center border-b border-gray-800 shrink-0 z-10 relative">
        <h1 className="font-bold">Escanear Lista Remota</h1>
        <p className="text-xs text-gray-400 mt-1">Apunta a la hoja impresa y enfoca bien los nombres.</p>
      </div>
      
      {/* Viewfinder */}
      <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
        {status === 'initializing' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white z-20">
            <Loader2 className="w-10 h-10 animate-spin mb-4 text-indigo-500" />
            <p className="font-bold">Activando cámara...</p>
          </div>
        )}
        
        {status === 'capturing' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white z-20 bg-black/80 backdrop-blur-sm">
            <Loader2 className="w-12 h-12 animate-spin mb-4 text-emerald-500" />
            <p className="font-bold text-xl">Enviando a tu computadora...</p>
          </div>
        )}

        <video 
          ref={videoRef} 
          autoPlay 
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        
        {/* Guías de escaneo visuales (estéticas y adaptables a orientación) */}
        <div className={`absolute border-2 border-white/30 rounded-xl pointer-events-none transition-all duration-300 ${isPortrait ? 'inset-8' : 'inset-y-32 inset-x-4'}`}>
          <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-indigo-500 rounded-tl-xl -m-0.5" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-indigo-500 rounded-tr-xl -m-0.5" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-indigo-500 rounded-bl-xl -m-0.5" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-indigo-500 rounded-br-xl -m-0.5" />
        </div>
      </div>
      
      {/* Controls */}
      <div className="p-6 bg-gray-900 shrink-0 flex justify-between items-center px-12">
        <button
          onClick={() => setIsPortrait(!isPortrait)}
          disabled={status !== 'active'}
          className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center text-gray-300 active:bg-gray-700 transition-colors"
        >
          <RotateCcw className="w-6 h-6" />
        </button>
        
        <button
          onClick={captureImage}
          disabled={status !== 'active'}
          className={`w-20 h-20 rounded-full border-4 border-white flex items-center justify-center transition-transform active:scale-90 ${status === 'active' ? 'bg-indigo-600' : 'bg-gray-600'}`}
        >
          <Camera className="w-8 h-8 text-white" />
        </button>
        
        <button
          onClick={toggleTorch}
          disabled={!torchSupported || status !== 'active'}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${torchEnabled ? 'bg-yellow-500/20 text-yellow-500' : 'bg-gray-800 text-gray-300'} ${!torchSupported && 'opacity-30'}`}
        >
          {torchEnabled ? <Zap className="w-6 h-6" /> : <ZapOff className="w-6 h-6" />}
        </button>
      </div>
    </div>
  );
}
