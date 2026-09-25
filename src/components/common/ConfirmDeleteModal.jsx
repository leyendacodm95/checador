import React, { useState } from 'react';
import { Trash2, X } from 'lucide-react';

export function ConfirmDeleteModal({ isOpen, title, message, onConfirm, onClose }) {
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  const handleConfirm = (e) => {
    e.stopPropagation();
    if (!reason.trim()) return;
    onConfirm(reason);
    setReason('');
    onClose();
  };

  const handleClose = (e) => {
    if (e) e.stopPropagation();
    setReason('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-md animate-fadeIn">
      <div className="bg-white dark:bg-[#182234] rounded-3xl w-full max-w-md border border-gray-200 dark:border-gray-700/80 shadow-2xl overflow-hidden p-6 relative transition-all transform scale-100">
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 z-10 w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-900 dark:hover:text-white flex items-center justify-center transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold shadow-lg shadow-rose-500/20">
            <Trash2 className="w-7 h-7" />
          </div>

          <div className="w-full">
            <h3 className="text-xl font-black text-gray-900 dark:text-white">
              {title || '¿Dar de baja registro?'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {message || 'Esta acción no se puede deshacer. ¿Deseas continuar?'}
            </p>
          </div>

          <div className="w-full text-left space-y-1.5">
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Motivo de la baja <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej. Cambio de escuela, egresado, baja voluntaria, etc."
              className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/80 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 focus:outline-none dark:text-white placeholder-gray-400"
            />
          </div>

          <div className="flex items-center gap-3 w-full pt-2">
            <button
              onClick={handleClose}
              className="flex-1 py-3 px-4 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={!reason.trim()}
              className="flex-1 py-3 px-4 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-rose-600/30 transition"
            >
              Sí, Dar de baja
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
