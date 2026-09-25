import React, { useState, useEffect } from 'react';

export function UpdateAlert() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateData, setUpdateData] = useState(null);

  useEffect(() => {
    const checkForUpdates = async () => {
      try {
        if (!window.AndroidApp) {
          console.log("No estamos en la app de Android");
          return;
        }

        const currentVersion = window.AndroidApp.getAppVersionCode();
        
        // Revisar qué versión descartó y cuándo
        const dismissedDataStr = localStorage.getItem('updateAlertDismissed');
        let dismissedData = { date: null, versionCode: 0 };
        
        if (dismissedDataStr) {
          dismissedData = JSON.parse(dismissedDataStr);
        }
        
        const today = new Date().toDateString();
        
        // URL de tu archivo version.json alojado en GitHub Pages
        const versionUrl = "https://leyendacodm95.github.io/checador/version.json";
        const response = await fetch(`${versionUrl}?t=${new Date().getTime()}`);
        
        if (response.ok) {
          const data = await response.json();
          if (data.versionCode > currentVersion) {
            // Si ya se avisó hoy, PERO de esta MISMA versión, no mostramos
            if (dismissedData.date === today && dismissedData.versionCode === data.versionCode) {
              return;
            }
            setUpdateData(data);
            setUpdateAvailable(true);
          }
        }
      } catch (error) {
        console.error("Error al buscar actualizaciones:", error);
      }
    };

    checkForUpdates();
  }, []);

  const handleUpdate = () => {
    if (updateData && updateData.apkUrl && window.AndroidApp) {
      window.AndroidApp.updateApp(updateData.apkUrl);
      setUpdateAvailable(false);
    }
  };

  const handleRemindLater = () => {
    localStorage.setItem('updateAlertDismissed', JSON.stringify({
      date: new Date().toDateString(),
      versionCode: updateData.versionCode
    }));
    setUpdateAvailable(false);
  };

  if (!updateAvailable) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full text-center animate-in fade-in zoom-in duration-300">
        <div className="flex justify-center mb-4">
          <img src="logo.png" alt="Logo Checador" className="h-20 w-auto object-contain" />
        </div>
        
        <h2 className="text-2xl font-bold text-gray-800 mb-2">¡Nueva Versión Disponible!</h2>
        
        <p className="text-gray-600 mb-6">
          {updateData.message || "Hay una nueva versión con mejoras y correcciones. Te recomendamos actualizar para disfrutar de la mejor experiencia."}
        </p>
        
        <div className="flex flex-col gap-3">
          <button 
            onClick={handleUpdate}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors"
          >
            Actualizar Ahora
          </button>
          
          <button 
            onClick={handleRemindLater}
            className="w-full py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl font-medium transition-colors"
          >
            Recordarme mañana
          </button>
        </div>
      </div>
    </div>
  );
}
