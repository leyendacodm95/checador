import React, { useState } from 'react';
import { Eye, Upload, CheckCircle2, AlertCircle, FileCheck, X } from 'lucide-react';
import { initialExpedienteDocs } from '../../mock/data';

export function ExpedienteView() {
  const [docs, setDocs] = useState(initialExpedienteDocs);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [uploadingId, setUploadingId] = useState(null);

  const getBadgeStyle = (estado) => {
    switch (estado) {
      case 'SUBIDO':
        return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
      case 'PENDIENTE':
        return 'bg-rose-500/20 text-rose-400 border border-rose-500/30';
      case 'REVISAR':
        return 'bg-orange-500/20 text-orange-400 border border-orange-500/30';
      default:
        return 'bg-gray-700 text-gray-300';
    }
  };

  const handleSimulatedUpload = (id) => {
    setUploadingId(id);
    setTimeout(() => {
      setDocs(prev =>
        prev.map(d => (d.id === id ? { ...d, estado: 'SUBIDO', fechaActualizacion: new Date().toISOString().slice(0, 10) } : d))
      );
      setUploadingId(null);
    }, 1000);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">
          Mi Expediente
        </h1>
      </div>

      {/* Card Table Container */}
      <div className="bg-white dark:bg-[#182234] border border-gray-200/80 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden transition-colors duration-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 text-xs font-bold text-gray-500 dark:text-gray-400">
                <th className="py-4 px-6">Documento</th>
                <th className="py-4 px-6 text-center">Estado</th>
                <th className="py-4 px-6 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60 text-sm">
              {docs.map((doc) => (
                <tr
                  key={doc.id}
                  className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors"
                >
                  {/* Document Name */}
                  <td className="py-4 px-6 font-medium text-gray-900 dark:text-gray-100">
                    {doc.documento}
                  </td>

                  {/* Estado Badge */}
                  <td className="py-4 px-6 text-center">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-[11px] font-extrabold tracking-wide ${getBadgeStyle(
                        doc.estado
                      )}`}
                    >
                      {doc.estado}
                    </span>
                  </td>

                  {/* Actions Icons */}
                  <td className="py-4 px-6 text-center">
                    <div className="flex items-center justify-center gap-3">
                      {/* View Icon (only if SUBIDO or REVISAR) */}
                      {(doc.estado === 'SUBIDO' || doc.estado === 'REVISAR') && (
                        <button
                          onClick={() => setSelectedDoc(doc)}
                          title="Ver documento"
                          className="text-emerald-500 hover:text-emerald-400 p-1.5 rounded-lg hover:bg-emerald-500/10 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}

                      {/* Upload Icon */}
                      <button
                        onClick={() => handleSimulatedUpload(doc.id)}
                        disabled={uploadingId === doc.id}
                        title="Subir / Actualizar documento"
                        className="text-blue-500 hover:text-blue-400 p-1.5 rounded-lg hover:bg-blue-500/10 transition-colors disabled:opacity-50"
                      >
                        <Upload className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Document View Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#182234] rounded-2xl w-full max-w-lg border border-gray-200 dark:border-gray-700 shadow-2xl p-6 relative">
            <button
              onClick={() => setSelectedDoc(null)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              {selectedDoc.documento}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Estado actual: <span className="font-bold text-emerald-400">{selectedDoc.estado}</span>
            </p>
            <div className="w-full h-48 bg-gray-100 dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 flex flex-col items-center justify-center p-4 text-center">
              <FileCheck className="w-12 h-12 text-emerald-500 mb-2" />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                Documento validado digitalmente
              </span>
              <span className="text-xs text-gray-400 mt-1">
                Última actualización: {selectedDoc.fechaActualizacion}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
