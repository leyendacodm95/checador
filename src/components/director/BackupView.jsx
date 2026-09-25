import React, { useState } from 'react';
import { Download, Upload, AlertTriangle, CheckCircle2, Database, FolderCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export function BackupView({ students = [], teachers = {}, logs = [], deletions = [], onRestoreDB }) {
  const [importedStatus, setImportedStatus] = useState(null);
  const { users } = useAuth();

  const exportJSON = () => {
    const backupData = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      escuela: 'ESCUELA PRIMARIA Sor Juana Inés de la Cruz T.V',
      students,
      teachers,
      logs,
      deletions,
      users,
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `respaldo_completo_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportJSON = (e) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], 'UTF-8');
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target.result);
          if (parsed.students || parsed.teachers || parsed.logs) {
            onRestoreDB(parsed);
            setImportedStatus({ success: true, message: 'Base de datos y registros restaurados correctamente.' });
          } else {
            setImportedStatus({ success: false, message: 'El archivo no contiene un formato de respaldo válido.' });
          }
        } catch (err) {
          setImportedStatus({ success: false, message: 'Error al procesar el archivo JSON.' });
        }
      };
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white font-outfit">
          Respaldo y Restauración del Sistema
        </h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold mt-1">
          Exporta toda la base de datos de la escuela para respaldarla o restaura información desde un archivo `.json`.
        </p>
      </div>


      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Export JSON */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-6 flex flex-col justify-between shadow-xs">
          <div>
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center mb-3 shadow-md">
              <Download className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1 font-outfit">
              1. Exportar Respaldo Completo
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
              Genera y descarga un archivo `.json` que incluye la lista completa de alumnos, docentes titulares por salón, registros de asistencia y bitácora.
            </p>
          </div>

          <button
            onClick={exportJSON}
            className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold rounded-xl text-xs shadow-md transition"
          >
            <Download className="w-4 h-4" />
            <span>Descargar Respaldo Completo (.json)</span>
          </button>
        </div>

        {/* Import JSON */}
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 flex flex-col justify-between shadow-xs">
          <div>
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center mb-3 shadow-md">
              <Upload className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1 font-outfit">
              2. Restaurar / Cargar Archivo JSON
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Selecciona cualquier archivo `.json` de la carpeta <strong>Datos Checador Primaria</strong> para cargar y autocompletar la base de datos de manera automática.
            </p>
            <input
              type="file"
              accept=".json"
              onChange={handleImportJSON}
              className="block w-full text-xs text-gray-500 border border-gray-200 dark:border-gray-700 rounded-xl p-2 bg-white dark:bg-gray-800 mb-4 cursor-pointer"
            />
          </div>

          {importedStatus && (
            <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
              importedStatus.success ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
            }`}>
              {importedStatus.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              <span>{importedStatus.message}</span>
            </div>
          )}
        </div>
      </div>

      {/* Warning Alert */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center gap-3 text-amber-600 dark:text-amber-400 text-xs">
        <AlertTriangle className="w-5 h-5 shrink-0 text-amber-500" />
        <span>
          <strong>Nota de Autocompletado:</strong> Al subir tu archivo `.json`, los alumnos, docentes, asistencias y bitácora se autocompletarán instantáneamente en todos los paneles de la aplicación y se sincronizarán localmente y en la nube.
        </span>
      </div>
    </div>
  );
}
