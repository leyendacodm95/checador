import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ShieldCheck, Search, AlertCircle, FileText, Download, FileSpreadsheet, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import schoolLogo from '../../logo.png';

// Simple normalize utility for accent-insensitive comparisons
const normalizeStr = (str) => {
  if (!str) return '';
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
};

// Robust helper to load image as base64 for PDF & Excel using fetch & FileReader
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
    console.warn('Could not load base64 logo image:', e);
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

export function AlumnoPortalView({ students, logs = [] }) {
  const { role: userRole } = useAuth();
  const qrRef = React.useRef(null);

  // Load remembered student from localStorage
  const savedStudentId = localStorage.getItem('portal_alumno_id');
  const hasSavedStudent = savedStudentId && students.some(s => s.id === savedStudentId);

  const [selectedStudentId, setSelectedStudentId] = useState(
    hasSavedStudent ? savedStudentId : (students[0]?.id || '1')
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [searchError, setSearchError] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isRemembered, setIsRemembered] = useState(hasSavedStudent);
  const [generating, setGenerating] = useState(false);

  const currentStudent = students.find(s => s.id === selectedStudentId) || students[0];

  const handlePrintCredencialPDF = async () => {
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
      doc.text(currentStudent.nombre, 42.5, 35, { align: 'center' });

      doc.setTextColor(30, 58, 138);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.text(`GRADO: ${currentStudent.grado} — GRUPO "${currentStudent.grupo}"`, 42.5, 41, { align: 'center' });

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
      doc.text(`MATRÍCULA QR: ${currentStudent.qrCode}`, 42.5, 105, { align: 'center' });

      doc.setFontSize(5.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('Válido para Pase de Lista Escolar Automatizado', 42.5, 109, { align: 'center' });

      const filename = `Credencial_Estudiantil_${currentStudent.nombre.replace(/\s+/g, '_')}.pdf`;
      if (window.AndroidApp && window.AndroidApp.downloadBase64File) {
        const base64data = doc.output('datauristring');
        window.AndroidApp.downloadBase64File(base64data, filename, 'application/pdf');
      } else {
        doc.save(filename);
      }
    } catch (err) {
      console.error('Error al generar PDF de credencial estudiantil:', err);
    }
  };

  // Live filtered results (only when query has 2+ chars for privacy)
  const filteredStudents = searchQuery.trim().length >= 2
    ? students.filter(s =>
        normalizeStr(s.nombre).includes(normalizeStr(searchQuery)) ||
        normalizeStr(s.qrCode).includes(normalizeStr(searchQuery))
      )
    : [];

  const handleSelectStudent = (student) => {
    setSelectedStudentId(student.id);
    setSearchQuery(student.nombre);
    setShowSuggestions(false);
    setSearchError('');
    localStorage.setItem('portal_alumno_id', student.id);
    setIsRemembered(true);
  };

  const handleForgetStudent = () => {
    localStorage.removeItem('portal_alumno_id');
    setIsRemembered(false);
    setSearchQuery('');
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchError('');
    if (!searchQuery.trim()) return;

    if (filteredStudents.length > 0) {
      handleSelectStudent(filteredStudents[0]);
    } else {
      setSearchError('No se encontró ningún estudiante coincidente. Intente con el nombre completo o matrícula.');
    }
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    setSearchError('');
    setShowSuggestions(val.trim().length >= 2);
  };

  const isAdmin = userRole && ((userRole.toLowerCase().includes('director')) || (userRole.toLowerCase().includes('subdirector')));

  // Generate Weekly Data for current student using Exception-Based Logic
  const getWeeklyData = (student) => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 is Sun, 1 is Mon...
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

    const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
    return days.map((dayName, idx) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + idx);
      const dateStr = d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const simpleDateStr = d.toLocaleDateString('es-MX');
      
      let hora = '13:00';
      let estado = 'PRESENTE';
      let obs = '—';

      // Check if there is an exception in the logs
      // The log date could be in D/M/YYYY or DD/MM/YYYY format, we need to match it robustly
      const absenceLog = logs.find(l => {
        if (!l.fecha || String(l.student?.id || l.person?.id) !== String(student.id)) return false;
        
        let logDateStr = l.fecha;
        if (l.fecha.includes('-')) {
           const logD = new Date(l.fecha + 'T12:00:00');
           logDateStr = logD.toLocaleDateString('es-MX');
        } else {
           // Normalize slashes
           const parts = l.fecha.split('/');
           if (parts.length === 3) {
             const p0 = parseInt(parts[0], 10);
             const p1 = parseInt(parts[1], 10);
             const p2 = parseInt(parts[2], 10);
             const logD = p1 > 12 
               ? new Date(p2, p0 - 1, p1) 
               : new Date(p2, p1 - 1, p0);
             logDateStr = logD.toLocaleDateString('es-MX');
           }
        }
        
        return logDateStr === simpleDateStr;
      });

      if (absenceLog) {
        if (absenceLog.estado === 'TARDÍO' || (absenceLog.minutosRetraso && absenceLog.minutosRetraso > 0)) {
           hora = absenceLog.horaEntrada || absenceLog.hora || '13:00';
           estado = 'TARDÍO';
           obs = `Retardo de ${absenceLog.minutosRetraso || 0} min`;
        } else {
           hora = '—';
           estado = 'AUSENTE';
           obs = absenceLog.student?.observaciones || absenceLog.person?.observaciones || 'Falta registrada';
        }
      }

      // If the day is in the future, just return blank or expected
      if (d > today) {
        hora = '—';
        estado = 'PENDIENTE';
        obs = 'Día futuro';
      }

      return [dayName, dateStr, hora, estado, obs];
    });
  };

  // PDF Export Function
  const handleDownloadPDF = async () => {
    setGenerating(true);
    try {
      const doc = new jsPDF();
      const logoBase64 = await getBase64ImageFromUrl(schoolLogo);

      // Top Admin Header Bar
      doc.setFillColor(30, 58, 138); // #1E3A8A Dark Blue
      doc.rect(0, 0, 210, 36, 'F');

      if (logoBase64) {
        doc.addImage(logoBase64, 'PNG', 12, 5, 26, 26);
      }

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text('ESCUELA PRIMARIA Sor Juana Inés de la Cruz T.V', 42, 16);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('CCT: 18DPR0087R', 42, 21);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('Sistema de Control de Asistencia — Reporte Semanal para Padres de Familia', 42, 26);

      // Student Info Box
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`Alumno: ${currentStudent.nombre}`, 14, 46);

      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'normal');
      doc.text(`Grado y Grupo: ${currentStudent.grado} "${currentStudent.grupo}"`, 14, 53);
      doc.text(`Matrícula QR: ${currentStudent.qrCode}`, 120, 46);
      doc.text(`Fecha de Generación: ${new Date().toLocaleDateString('es-MX')}`, 120, 53);

      const weeklyRows = getWeeklyData(currentStudent);

      // Table Generation via autoTable
      autoTable(doc, {
        startY: 60,
        head: [['Día', 'Fecha', 'Hora de Entrada', 'Estado de Asistencia', 'Observaciones']],
        body: weeklyRows,
        theme: 'grid',
        headStyles: {
          fillColor: [30, 58, 138],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center',
          fontSize: 9.5
        },
        columnStyles: {
          0: { halign: 'center', fontStyle: 'bold', cellWidth: 28 },
          1: { halign: 'center', cellWidth: 32 },
          2: { halign: 'center', fontStyle: 'bold', cellWidth: 35 },
          3: { halign: 'center', fontStyle: 'bold', cellWidth: 40 },
          4: { halign: 'left', cellWidth: 'auto' }
        },
        didParseCell: function (data) {
          if (data.section === 'body' && data.column.index === 3) {
            const val = data.cell.raw;
            if (val === 'PRESENTE') data.cell.styles.textColor = [16, 185, 129];
            else if (val === 'TARDÍO') data.cell.styles.textColor = [245, 158, 11];
            else if (val === 'AUSENTE') data.cell.styles.textColor = [239, 68, 68];
          }
        }
      });

      const finalY = (doc.lastAutoTable && doc.lastAutoTable.finalY) || 120;

      // Signatures Box
      doc.setDrawColor(203, 213, 225);
      doc.line(25, finalY + 25, 85, finalY + 25);
      doc.line(125, finalY + 25, 185, finalY + 25);

      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text('Firma del Padre o Tutor', 55, finalY + 30, { align: 'center' });
      doc.text('Sello y Firma de la Dirección', 155, finalY + 30, { align: 'center' });

      const filename = `Reporte_Semanal_${currentStudent.nombre.replace(/\s+/g, '_')}.pdf`;
      if (window.AndroidApp && window.AndroidApp.downloadBase64File) {
        const base64data = doc.output('datauristring');
        window.AndroidApp.downloadBase64File(base64data, filename, 'application/pdf');
      } else {
        doc.save(filename);
      }
    } catch (err) {
      console.error('Error generando PDF semanal:', err);
      alert('Ocurrió un error generando el reporte PDF.');
    } finally {
      setGenerating(false);
    }
  };

  // Excel Export Function using exceljs
  const handleDownloadExcel = async () => {
    setGenerating(true);
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Reporte Semanal');

      // Set Column Widths
      worksheet.columns = [
        { key: 'dia', width: 16 },
        { key: 'fecha', width: 16 },
        { key: 'hora', width: 20 },
        { key: 'estado', width: 22 },
        { key: 'obs', width: 35 }
      ];

      // Insert Logo if available
      const logoBase64 = await getBase64ImageFromUrl(schoolLogo);
      if (logoBase64) {
        const imageId = workbook.addImage({
          base64: logoBase64,
          extension: 'png',
        });
        worksheet.addImage(imageId, {
          tl: { col: 0.1, row: 0.2 },
          ext: { width: 55, height: 55 }
        });
      }

      // Title Block
      worksheet.mergeCells('B2:E2');
      const titleCell = worksheet.getCell('B2');
      titleCell.value = 'ESCUELA PRIMARIA Sor Juana Inés de la Cruz T.V';
      titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: '1E3A8A' } };
      titleCell.alignment = { vertical: 'middle', horizontal: 'left' };

      worksheet.mergeCells('B3:E3');
      const cctCell = worksheet.getCell('B3');
      cctCell.value = 'CCT: 18DPR0087R';
      cctCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: '1E3A8A' } };
      cctCell.alignment = { vertical: 'middle', horizontal: 'left' };

      worksheet.mergeCells('B4:E4');
      const subtitleCell = worksheet.getCell('B4');
      subtitleCell.value = 'Reporte Semanal de Asistencia Escolar para Padres de Familia';
      subtitleCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: '475569' } };
      subtitleCell.alignment = { vertical: 'middle', horizontal: 'left' };

      // Blank rows
      worksheet.addRow([]);
      worksheet.addRow([]);

      // Student Info Section
      const r5 = worksheet.addRow(['Alumno:', currentStudent.nombre, '', 'Matrícula QR:', currentStudent.qrCode]);
      r5.getCell(1).font = { bold: true };
      r5.getCell(4).font = { bold: true };

      const r6 = worksheet.addRow(['Grado y Grupo:', `${currentStudent.grado} "${currentStudent.grupo}"`, '', 'Fecha Emisión:', new Date().toLocaleDateString('es-MX')]);
      r6.getCell(1).font = { bold: true };
      r6.getCell(4).font = { bold: true };

      worksheet.addRow([]);

      // Table Header Row
      const headerRow = worksheet.addRow(['Día', 'Fecha', 'Hora de Entrada', 'Estado de Asistencia', 'Observaciones']);
      headerRow.height = 24;
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: '1E3A8A' }
        };
        cell.font = { bold: true, color: { argb: 'FFFFFF' }, size: 10 };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'CBD5E1' } },
          left: { style: 'thin', color: { argb: 'CBD5E1' } },
          bottom: { style: 'thin', color: { argb: 'CBD5E1' } },
          right: { style: 'thin', color: { argb: 'CBD5E1' } }
        };
      });

      // Data Rows
      const weeklyRows = getWeeklyData(currentStudent);
      weeklyRows.forEach((rowData) => {
        const row = worksheet.addRow(rowData);
        row.height = 20;

        row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell(3).alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell(4).alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell(5).alignment = { vertical: 'middle', horizontal: 'left' };

        // Border styling for all cells in row
        row.eachCell((cell, colNumber) => {
          cell.border = {
            top: { style: 'thin', color: { argb: 'E2E8F0' } },
            left: { style: 'thin', color: { argb: 'E2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'E2E8F0' } },
            right: { style: 'thin', color: { argb: 'E2E8F0' } }
          };

          // Color highlight for attendance status
          if (colNumber === 4) {
            const estadoVal = cell.value;
            if (estadoVal === 'PRESENTE') {
              cell.font = { bold: true, color: { argb: '047857' } };
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D1FAE5' } };
            } else if (estadoVal === 'TARDÍO') {
              cell.font = { bold: true, color: { argb: 'B45309' } };
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEF3C7' } };
            } else if (estadoVal === 'AUSENTE') {
              cell.font = { bold: true, color: { argb: 'B91C1C' } };
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEE2E2' } };
            }
          }
        });
      });

      // Write Buffer & Trigger Download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const filename = `Reporte_Semanal_${currentStudent.nombre.replace(/\s+/g, '_')}.xlsx`;
      if (window.AndroidApp && window.AndroidApp.downloadBase64File) {
        const reader = new FileReader();
        reader.onloadend = () => window.AndroidApp.downloadBase64File(reader.result, filename, blob.type);
        reader.readAsDataURL(blob);
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
      }
    } catch (err) {
      console.error('Error generando Excel semanal:', err);
      alert('Ocurrió un error generando el reporte Excel.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn p-2 sm:p-4">
      {/* Title */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white font-outfit">
            Portal del Alumno
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-semibold">
            Credencial digital de estudiante y consulta de asistencias para padres de familia.
          </p>
        </div>

        {/* Student Switcher Dropdown (Admin only) */}
        {isAdmin && (
          <div className="bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-[#2c2c2e] p-2.5 rounded-xl shadow-xs w-full md:w-auto">
            <label className="text-[10px] font-black text-slate-450 dark:text-[#8e8e93] uppercase mr-2 block sm:inline">Simular Alumno:</label>
            <select
              value={selectedStudentId}
              onChange={(e) => {
                setSelectedStudentId(e.target.value);
                setSearchError('');
              }}
              className="w-full sm:w-auto bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-700 text-xs font-bold text-slate-750 dark:text-white rounded-lg p-1.5 focus:outline-none"
            >
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.nombre} ({s.grado} {s.grupo})</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Lookup search bar with live suggestions */}
      <div className="bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-[#2c2c2e] p-5 rounded-2xl shadow-xs">
        <h3 className="text-[11px] font-black text-slate-450 dark:text-[#8e8e93] uppercase tracking-wider block mb-2">
          Buscar Credencial (Nombre completo o Matrícula)
        </h3>

        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Ingrese su nombre completo o matrícula escolar..."
              value={searchQuery}
              onChange={handleInputChange}
              onFocus={() => searchQuery.trim().length >= 2 && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              className="w-full pl-9 pr-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-750 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2b66f6]"
            />
            <Search className="w-4 h-4 text-slate-450 absolute left-3 top-3" />

            {/* Live suggestions dropdown */}
            {showSuggestions && filteredStudents.length > 0 && (
              <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-[#2c2c2e] rounded-xl shadow-2xl max-h-52 overflow-y-auto">
                {filteredStudents.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelectStudent(s)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors text-left border-b border-slate-100 dark:border-slate-800 last:border-b-0"
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center justify-center border-2 border-blue-500/30 shrink-0">
                      {(s.nombre || "").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{s.nombre}</p>
                      <p className="text-[10px] text-slate-400 dark:text-[#8e8e93] font-semibold">
                        {s.grado} {s.grupo} — Matrícula: {s.qrCode}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* No results message */}
            {showSuggestions && searchQuery.trim().length >= 2 && filteredStudents.length === 0 && (
              <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-[#2c2c2e] rounded-xl shadow-2xl p-4 text-center">
                <p className="text-xs text-slate-400 dark:text-[#8e8e93] font-semibold">
                  No se encontraron alumnos con ese nombre o matrícula.
                </p>
              </div>
            )}
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 bg-[#2b66f6] hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition active:scale-95 whitespace-nowrap"
          >
            Buscar Credencial
          </button>
        </form>

        {searchError && (
          <div className="mt-3.5 bg-rose-500/10 border border-rose-500/25 text-rose-600 dark:text-rose-400 text-xs font-bold p-3 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{searchError}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Credencial Digital (Left 6 cols) */}
        <div className="md:col-span-6 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 text-white shadow-2xl relative overflow-hidden flex flex-col items-center text-center">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>

          <div className="w-full flex justify-between items-center mb-4 text-[10px] font-black tracking-wider text-blue-100 uppercase">
            <span>CREDENCIAL ESCOLAR DIGITAL</span>
            <span className="bg-white/20 px-2.5 py-0.5 rounded-full">CICLO 2025-2026</span>
          </div>

          <h2 className="text-3xl font-black font-outfit tracking-tight text-white mb-1 mt-2">{currentStudent.nombre}</h2>
          <p className="text-xs font-semibold text-blue-100 mb-5">
            Grado {currentStudent.grado} — Grupo "{currentStudent.grupo}"
          </p>

          <div ref={qrRef} className="bg-white p-5 rounded-2xl shadow-2xl my-4 border border-gray-150 flex flex-col items-center">
            <QRCodeSVG value={currentStudent.qrCode} size={210} level="H" includeMargin />
          </div>

          <span className="text-[11px] font-mono text-blue-200 tracking-wider font-bold mt-2 mb-3">
            MATRÍCULA ALUMNO: {currentStudent.qrCode}
          </span>

          <button
            onClick={handlePrintCredencialPDF}
            className="w-full mt-2 py-3 bg-white hover:bg-blue-50 text-blue-900 rounded-2xl text-xs font-black transition shadow-lg flex items-center justify-center gap-2 active:scale-95"
          >
            <Download className="w-4 h-4 text-blue-600" />
            <span>Descargar Credencial Estudiantil (PDF)</span>
          </button>
        </div>

        {/* Right 6 cols: Asistencia de Hoy + Reporte Semanal para Padres */}
        <div className="md:col-span-6 space-y-4">
          {/* Estatus de Asistencia (Solo Entrada) */}
          <div className="bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-[#2c2c2e] rounded-2xl p-6 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-450 dark:text-[#8e8e93] mb-4 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Estatus de Asistencia de Hoy</span>
            </h3>

            <div className={`p-4 rounded-xl border flex items-center justify-between ${currentStudent.estado === 'AUSENTE' ? 'bg-rose-500/10 border-rose-500/30' : 'bg-emerald-500/10 border-emerald-500/30'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full text-white flex items-center justify-center font-bold text-xs ${currentStudent.estado === 'AUSENTE' ? 'bg-rose-500' : 'bg-emerald-500'}`}>
                  {currentStudent.estado === 'AUSENTE' ? '🔴' : '🟢'}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-white">
                    {currentStudent.estado === 'AUSENTE' ? 'Falta / Inasistencia' : 'Registro de ENTRADA'}
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    {currentStudent.estado === 'AUSENTE' ? 'El alumno no se presentó' : 'Asistencia registrada'}
                  </p>
                </div>
              </div>
              <span className={`text-xs font-mono font-bold ${currentStudent.estado === 'AUSENTE' ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {currentStudent.estado === 'AUSENTE' ? 'AUSENTE' : (currentStudent.horaEntrada !== '—' ? currentStudent.horaEntrada : '13:00')}
              </span>
            </div>
          </div>

          {/* Section: Reporte Semanal para Padres de Familia */}
          <div className="bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-[#2c2c2e] rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-500" />
                  <span>Reporte Semanal para Padres</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Descarga la bitácora semanal oficial de asistencia para tutores.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                onClick={handleDownloadPDF}
                disabled={generating}
                className="flex items-center justify-center gap-2 p-3 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-md transition disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>Descargar PDF Semanal</span>
              </button>

              <button
                onClick={handleDownloadExcel}
                disabled={generating}
                className="flex items-center justify-center gap-2 p-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-md transition disabled:opacity-50"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Descargar Excel Semanal</span>
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-[#2c2c2e] rounded-2xl p-5 shadow-sm text-center space-y-3">
            <p className="text-[11px] text-slate-500 dark:text-[#8e8e93] font-semibold leading-relaxed">
              Muestra esta credencial en la pantalla del checador o escáner al ingresar al colegio.
            </p>
            {isRemembered && (
              <div className="flex items-center justify-center gap-2">
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Credencial guardada en este dispositivo
                </span>
                <button
                  onClick={handleForgetStudent}
                  className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline ml-1"
                >
                  Cambiar alumno
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
