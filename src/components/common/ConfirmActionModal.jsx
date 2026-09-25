import React from 'react';
import { HelpCircle, X } from 'lucide-react';

export function ConfirmActionModal({ isOpen, title, message, onConfirm, onClose }) {
  if (!isOpen) return null;

  const handleConfirm = (e) => {
    e.stopPropagation();
    onConfirm();
    onClose();
  };

  const handleClose = (e) => {
    if (e) e.stopPropagation();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/65 backdrop-blur-md animate-fadeIn">
      <div className="bg-white dark:bg-[#182234] rounded-3xl w-full max-w-sm border border-gray-200 dark:border-gray-700/80 shadow-2xl overflow-hidden p-6 relative transition-all transform scale-100">
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 z-10 w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-900 dark:hover:text-white flex items-center justify-center transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center space-y-4 pt-2">
          <div className="w-14 h-14 rounded-2xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shadow-lg shadow-blue-500/20">
            <HelpCircle className="w-7 h-7" />
          </div>

          <div className="w-full">
            <h3 className="text-xl font-black text-gray-900 dark:text-white leading-tight">
              {title || 'Confirmar acción'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              {message || '¿Deseas continuar?'}
            </p>
          </div>

          <div className="flex items-center gap-3 w-full pt-4">
            <button
              onClick={handleClose}
              className="flex-1 py-3 px-4 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 py-3 px-4 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/30 transition"
            >
              Aceptar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
