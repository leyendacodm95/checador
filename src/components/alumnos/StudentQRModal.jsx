import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Printer, UserCheck, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import schoolLogo from '../../logo.png';

// Helper to load logo as base64 for jsPDF
const getBase64ImageFromUrl = async (imgUrl) => {
  try {
    const res = await fetch(imgUrl);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    return null;
  }
};

// Convert SVG QR Element to PNG Data URL cleanly for PDF insertion
const getQrDataUrl = (svgElement) => {
  return new Promise((resolve) => {
    try {
      if (!svgElement) {
        resolve(null);
        return;
      }
      const xml = new XMLSerializer().serializeToString(svgElement);
      const svg64 = btoa(unescape(encodeURIComponent(xml)));
      const image64 = 'data:image/svg+xml;base64,' + svg64;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 400;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, 400, 400);
        ctx.drawImage(img, 0, 0, 400, 400);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => resolve(null);
      img.src = image64;
    } catch (e) {
      resolve(null);
    }
  });
};

export function StudentQRModal({ student, isOpen, onClose }) {
  const qrRef = useRef(null);

  if (!isOpen || !student) return null;

  const handlePrintPDF = async () => {
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [85, 120] });
      const logoBase64 = await getBase64ImageFromUrl(schoolLogo);
      
      const svgEl = qrRef.current ? qrRef.current.querySelector('svg') : null;
      const qrDataUrl = await getQrDataUrl(svgEl);

      // Top Header Bar (#1E3A8A Dark Blue)
      doc.setFillColor(30, 58, 138);
      doc.rect(0, 0, 85, 26, 'F');

      if (logoBase64) {
        doc.addImage(logoBase64, 'PNG', 5, 3.5, 18, 18);
      }

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('ESCUELA PRIMARIA', 26, 9);
      doc.text('Sor Juana Inés de la Cruz T.V', 26, 13);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      doc.text('CCT: 18DPR0087R', 26, 17);

      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      doc.text('CREDENCIAL ESTUDIANTIL DIGITAL', 26, 21);

      // Student Name & Grade
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(student.nombre, 42.5, 35, { align: 'center' });

      doc.setTextColor(30, 58, 138);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.text(`GRADO: ${student.grado} — GRUPO "${student.grupo}"`, 42.5, 41, { align: 'center' });

      // QR Code Image
      if (qrDataUrl) {
        doc.addImage(qrDataUrl, 'PNG', 17.5, 46, 50, 50);
      }

      // ID QR Footer Bar
      doc.setFillColor(241, 245, 249);
      doc.rect(5, 100, 75, 12, 'F');
      
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(51, 65, 85);
      doc.text(`MATRÍCULA QR: ${student.qrCode}`, 42.5, 105, { align: 'center' });

      doc.setFontSize(5.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('Válido para Pase de Lista Escolar Automatizado', 42.5, 109, { align: 'center' });

      doc.save(`Credencial_Estudiantil_${student.nombre.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error('Error al generar PDF de credencial estudiantil:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-[#182234] rounded-2xl w-full max-w-sm border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden p-6 relative text-center">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-black text-xl flex items-center justify-center border-2 border-blue-500 mb-3 shadow-md">
            {(student.nombre || "").slice(0, 2).toUpperCase()}
          </div>
          <h3 className="text-lg font-extrabold text-gray-900 dark:text-white font-outfit">
            {student.nombre}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 font-semibold">
            {student.grado} - Grupo "{student.grupo}"
          </p>

          <div ref={qrRef} className="bg-white p-4 rounded-xl shadow-inner border border-gray-200 mb-4">
            <QRCodeSVG value={student.qrCode} size={180} level="H" includeMargin />
          </div>

          <span className="text-[11px] font-mono text-gray-400 dark:text-gray-400 mb-5 font-bold">
            ID QR: {student.qrCode}
          </span>

          <div className="flex items-center gap-2 w-full">
            <button
              onClick={handlePrintPDF}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-blue-500/20"
            >
              <Download className="w-4 h-4" />
              Imprimir PDF
            </button>
            <button
              onClick={onClose}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl text-xs font-bold transition"
            >
              <UserCheck className="w-4 h-4" />
              Aceptar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
