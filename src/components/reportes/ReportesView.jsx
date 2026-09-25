import React, { useState } from 'react';
import { FileText, Download, BarChart2, Calendar, ClipboardList, Trash2, FileSpreadsheet } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import schoolLogo from '../../logo.png';

// Helper to load image as base64 for PDF & Excel using fetch & FileReader
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

import { useAuth } from '../../context/AuthContext';
import bcrypt from 'bcryptjs';

export function ReportesView({ students, teachers, logs = [], deletions = [], onDeleteHistoryItem }) {
  const { user, users } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState('asistencia');
  const [generating, setGenerating] = useState(null);

  // Auth for Deletion
  const [authPendingDelete, setAuthPendingDelete] = useState(null);
  const [authPasswordInput, setAuthPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');

  const rLower = (user?.baseRole || user?.role || '').toLowerCase().trim();
  const isDocente = ['docente', 'docenta', 'usaer'].includes(rLower);
  const docenteGroup = user?.assignedGroup || '1°-A';

  // Filter students: if Docente, restrict strictly to their assigned group
  const filteredStudents = isDocente
    ? students.filter(s => {
        const studentGroup = `${s.grado}-${s.grupo}`.replace(/\s+/g, '');
        const targetGroup = docenteGroup.replace(/\s+/g, '');
        return studentGroup === targetGroup || s.grado === docenteGroup.split('°')[0];
      })
    : students;

  // Compile justifications dynamically
  const studentJustifications = filteredStudents
    .filter(s => s.observaciones && s.observaciones !== '—' && s.observaciones.trim() !== '')
    .map(s => ({
      fecha: new Date().toLocaleDateString('es-MX'),
      tipoPersona: 'Alumno',
      nombre: s.nombre,
      detalle: `${s.grado} ${s.grupo}`,
      observacion: s.observaciones
    }));

  const teacherJustifications = Object.entries(teachers || {}).map(([key, val]) => {
    const teacherName = typeof val === 'object' ? val.nombre : (val || 'Docente');
    const obs = typeof val === 'object' ? val.observaciones : '';
    return {
      fecha: new Date().toLocaleDateString('es-MX'),
      tipoPersona: 'Docente',
      nombre: teacherName,
      detalle: `Grupo ${key}`,
      observacion: obs,
      groupKey: key
    };
  }).filter(t => {
    if (!t.observacion || t.observacion === '—' || t.observacion.trim() === '') return false;
    if (isDocente) {
      return t.groupKey.replace(/\s+/g, '') === docenteGroup.replace(/\s+/g, '');
    }
    return true;
  });

  const allJustifications = [...studentJustifications, ...teacherJustifications];

  const handleVerifyDeleteAuth = (e) => {
    e.preventDefault();
    setAuthError('');

    // Require Director credentials
    const directorUser = users.find(u => ['director', 'directora'].includes((u.role || u.baseRole || '').toLowerCase().trim()));
    if (!directorUser) {
      setAuthError('❌ Error Crítico: No se encontró la cuenta del Director en el sistema.');
      return;
    }

    const isValid = bcrypt.compareSync(authPasswordInput, directorUser.passwordHash || directorUser.password);

    if (isValid) {
      if (authPendingDelete && onDeleteHistoryItem) {
        onDeleteHistoryItem(authPendingDelete.id);
      }
      setAuthPendingDelete(null);
      setAuthPasswordInput('');
    } else {
      setAuthError('🔒 Contraseña incorrecta. Se requiere la contraseña del Director.');
    }
  };

  // 1. Generate Advanced 3-Month Attendance PDF using Exception-Based Logic
  const generateTrimestralPDF = async (reportType) => {
    setGenerating(`pdf-${reportType}`);
    try {
      const doc = new jsPDF();
      const logoBase64 = await getBase64ImageFromUrl(schoolLogo);

      // Header Bar
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
      doc.text(`Sistema Checador — Reporte Trimestral de Asistencia por Excepción`, 42, 26);

      // Determine date range (Last 90 days)
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 90);

      // Calculate school days (Mon-Fri)
      let schoolDays = 0;
      let d = new Date(startDate);
      while (d <= endDate) {
        if (d.getDay() !== 0 && d.getDay() !== 6) schoolDays++;
        d.setDate(d.getDate() + 1);
      }

      const isTeacherReport = reportType === 'docentes_grupo';
      const targetGroupText = isTeacherReport ? 'Plantilla Docente' : (isDocente ? `Grupo ${docenteGroup}` : 'Todos los Grupos');

      doc.setTextColor(30, 41, 59);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`Alcance: ${targetGroupText}`, 14, 46);
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Periodo: ${startDate.toLocaleDateString('es-MX')} al ${endDate.toLocaleDateString('es-MX')} (${schoolDays} días hábiles)`, 14, 51);

      // Build data
      let tableRows = [];
      
      if (isTeacherReport) {
         const teacherList = Object.values(teachers || {});
         teacherList.forEach(t => {
           // Count absences in the logs for this teacher within the date range
           let absences = 0;
           logs.forEach(log => {
             if (log.tipoPersona !== 'Alumno' && (String(log.person?.id) === String(t.id) || String(log.person?.qrCode) === String(t.matricula))) {
               const logDate = new Date(log.fecha.includes('-') ? log.fecha + 'T12:00:00' : log.fecha.split('/').reverse().join('-') + 'T12:00:00');
               if (logDate >= startDate && logDate <= endDate && (log.estado === 'AUSENTE' || !log.estado)) {
                 absences++;
               }
             }
           });
           
           const asistencias = Math.max(0, schoolDays - absences);
           const percentage = ((asistencias / schoolDays) * 100).toFixed(1);
           
           tableRows.push([
             t.nombre || t.username || 'Docente',
             t.grupo || 'N/A',
             schoolDays.toString(),
             asistencias.toString(),
             absences.toString(),
             `${percentage}%`
           ]);
         });
      } else {
         filteredStudents.forEach(s => {
           let absences = 0;
           logs.forEach(log => {
             if ((log.tipoPersona === 'Alumno' || log.student) && String(log.student?.id || log.person?.id) === String(s.id)) {
               const logDate = new Date(log.fecha.includes('-') ? log.fecha + 'T12:00:00' : log.fecha.split('/').reverse().join('-') + 'T12:00:00');
               if (logDate >= startDate && logDate <= endDate && (log.estado === 'AUSENTE' || !log.estado)) {
                 absences++;
               }
             }
           });
           
           const asistencias = Math.max(0, schoolDays - absences);
           const percentage = ((asistencias / schoolDays) * 100).toFixed(1);
           
           tableRows.push([
             s.nombre,
             `${s.grado}-${s.grupo}`,
             schoolDays.toString(),
             asistencias.toString(),
             absences.toString(),
             `${percentage}%`
           ]);
         });
      }

      autoTable(doc, {
        startY: 57,
        head: [['Nombre Completo', isTeacherReport ? 'Asignación' : 'Grupo', 'Días Totales', 'Asistencias (Excepción)', 'Faltas', 'Porcentaje']],
        body: tableRows,
        theme: 'grid',
        headStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center', fontSize: 9 },
        columnStyles: {
          0: { halign: 'left', cellWidth: 70 },
          1: { halign: 'center', cellWidth: 25 },
          2: { halign: 'center', cellWidth: 22 },
          3: { halign: 'center', fontStyle: 'bold', cellWidth: 35, textColor: [16, 185, 129] },
          4: { halign: 'center', fontStyle: 'bold', cellWidth: 20, textColor: [239, 68, 68] },
          5: { halign: 'center', fontStyle: 'bold', cellWidth: 'auto' }
        }
      });

      const finalY = (doc.lastAutoTable && doc.lastAutoTable.finalY) || 120;
      doc.setDrawColor(203, 213, 225);
      doc.line(25, finalY + 25, 85, finalY + 25);
      doc.line(125, finalY + 25, 185, finalY + 25);

      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text('Firma del Responsable', 55, finalY + 30, { align: 'center' });
      doc.text('Sello y Firma de la Dirección', 155, finalY + 30, { align: 'center' });

      // Add page numbers
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text(`Hoja ${i}/${pageCount}`, doc.internal.pageSize.width - 15, doc.internal.pageSize.height - 10, { align: 'right' });
      }

      doc.save(`Reporte_Trimestral_${reportType}_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (e) {
      console.error('Error generando PDF Trimestral:', e);
      alert('Error al generar PDF Trimestral.');
    } finally {
      setGenerating(null);
    }
  };

  // 1b. Legacy Generate Attendance PDF (Weekly / Monthly) using autoTable with logo & admin header
  const generateAttendancePDF = async (type) => {
    setGenerating(`pdf-${type}`);
    try {
      const doc = new jsPDF();
      const logoBase64 = await getBase64ImageFromUrl(schoolLogo);

      // Header Bar
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
      doc.text(`Sistema Checador — Reporte de Asistencia ${type.toUpperCase()}`, 42, 26);

      doc.setTextColor(30, 41, 59);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      const presentes = filteredStudents.filter(s => s.estado !== 'AUSENTE').length;
      const ausentes = filteredStudents.filter(s => s.estado === 'AUSENTE').length;
      doc.text(`Resumen: Total (${filteredStudents.length})  |  Presentes (${presentes})  |  Ausentes (${ausentes})`, 14, 46);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Fecha de Emisión: ${new Date().toLocaleDateString('es-MX')}`, 130, 46);

      const tableRows = filteredStudents.map(s => [
        s.nombre,
        s.grado,
        s.grupo,
        s.qrCode,
        s.horaEntrada || '—',
        s.estado === 'TARDÍO' ? 'PRESENTE' : s.estado,
        s.observaciones || '—'
      ]);

      autoTable(doc, {
        startY: 55,
        head: [['Nombre Completo', 'Grado', 'Grupo', 'Matrícula QR', 'Hora de escaneo QR', 'Estado', 'Observaciones']],
        body: tableRows,
        theme: 'grid',
        headStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center', fontSize: 9 },
        columnStyles: {
          0: { halign: 'left', cellWidth: 42 },
          1: { halign: 'center', cellWidth: 16 },
          2: { halign: 'center', cellWidth: 16 },
          3: { halign: 'center', cellWidth: 30 },
          4: { halign: 'center', fontStyle: 'bold', cellWidth: 24 },
          5: { halign: 'center', fontStyle: 'bold', cellWidth: 22 },
          6: { halign: 'left', cellWidth: 'auto' }
        },
        didParseCell: function (data) {
          if (data.section === 'body' && data.column.index === 5) {
            const val = data.cell.raw;
            if (val === 'PRESENTE' || val === 'TARDÍO') data.cell.styles.textColor = [16, 185, 129];
            else if (val === 'AUSENTE') data.cell.styles.textColor = [239, 68, 68];
          }
        }
      });

      const finalY = (doc.lastAutoTable && doc.lastAutoTable.finalY) || 120;
      doc.setDrawColor(203, 213, 225);
      doc.line(25, finalY + 25, 85, finalY + 25);
      doc.line(125, finalY + 25, 185, finalY + 25);

      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text('Firma del Responsable', 55, finalY + 30, { align: 'center' });
      doc.text('Sello y Firma de la Dirección', 155, finalY + 30, { align: 'center' });

      // Agregar números de página
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text(`Hoja ${i}/${pageCount}`, doc.internal.pageSize.width - 15, doc.internal.pageSize.height - 10, { align: 'right' });
      }

      doc.save(`Reporte_Asistencia_${type}_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (e) {
      console.error('Error generando PDF asistencia:', e);
      alert('Error al generar PDF de asistencias.');
    } finally {
      setGenerating(null);
    }
  };

  // 2. Generate Attendance Excel (Weekly / Monthly) using ExcelJS with logo & admin formatting
  const generateAttendanceExcel = async (type) => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Asistencias');

      worksheet.columns = [
        { key: 'nombre', width: 28 },
        { key: 'grado', width: 12 },
        { key: 'grupo', width: 12 },
        { key: 'qr', width: 22 },
        { key: 'entrada', width: 18 },
        { key: 'estado', width: 18 },
        { key: 'obs', width: 35 }
      ];

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
      worksheet.mergeCells('B2:G2');
      const titleCell = worksheet.getCell('B2');
      titleCell.value = 'ESCUELA PRIMARIA Sor Juana Inés de la Cruz T.V';
      titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: '1E3A8A' } };
      titleCell.alignment = { vertical: 'middle', horizontal: 'left' };

      worksheet.mergeCells('B3:G3');
      const cctCell = worksheet.getCell('B3');
      cctCell.value = 'CCT: 18DPR0087R';
      cctCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: '1E3A8A' } };
      cctCell.alignment = { vertical: 'middle', horizontal: 'left' };

      worksheet.mergeCells('B4:G4');
      const subtitleCell = worksheet.getCell('B4');
      subtitleCell.value = `Reporte de Asistencias (${type.toUpperCase()})`;
      subtitleCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: '475569' } };
      subtitleCell.alignment = { vertical: 'middle', horizontal: 'left' };

      worksheet.addRow([]);
      worksheet.addRow([]);

      const infoRow = worksheet.addRow(['Fecha de Emisión:', new Date().toLocaleDateString('es-MX'), '', 'Total Registrados:', filteredStudents.length]);
      infoRow.getCell(1).font = { bold: true };
      infoRow.getCell(4).font = { bold: true };

      worksheet.addRow([]);

      const headerRow = worksheet.addRow(['Nombre Completo', 'Grado', 'Grupo', 'Matrícula QR', 'Hora de escaneo QR', 'Estado', 'Justificante / Observación']);
      headerRow.height = 24;
      headerRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E3A8A' } };
        cell.font = { bold: true, color: { argb: 'FFFFFF' }, size: 10 };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'CBD5E1' } },
          left: { style: 'thin', color: { argb: 'CBD5E1' } },
          bottom: { style: 'thin', color: { argb: 'CBD5E1' } },
          right: { style: 'thin', color: { argb: 'CBD5E1' } }
        };
      });

      filteredStudents.forEach(s => {
        const row = worksheet.addRow([
          s.nombre,
          s.grado,
          s.grupo,
          s.qrCode,
          s.horaEntrada || '—',
          s.estado === 'TARDÍO' ? 'PRESENTE' : s.estado,
          s.observaciones || '—'
        ]);
        row.height = 20;

        row.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
        row.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell(3).alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell(4).alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell(5).alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell(6).alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell(7).alignment = { vertical: 'middle', horizontal: 'left' };

        row.eachCell((cell, colNumber) => {
          cell.border = {
            top: { style: 'thin', color: { argb: 'E2E8F0' } },
            left: { style: 'thin', color: { argb: 'E2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'E2E8F0' } },
            right: { style: 'thin', color: { argb: 'E2E8F0' } }
          };

          if (colNumber === 6) {
            const estadoVal = cell.value;
            if (estadoVal === 'PRESENTE' || estadoVal === 'TARDÍO') {
              cell.font = { bold: true, color: { argb: '047857' } };
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D1FAE5' } };
            } else if (estadoVal === 'AUSENTE') {
              cell.font = { bold: true, color: { argb: 'B91C1C' } };
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEE2E2' } };
            }
          }
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Reporte_Asistencia_${type}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
    } catch (e) {
      console.error('Error generando Excel:', e);
      alert('Error al generar archivo Excel.');
    }
  };

  // 3. Generate Justifications PDF
  const generateJustificantesPDF = async () => {
    setGenerating('pdf-justificantes');
    try {
      const doc = new jsPDF();
      const logoBase64 = await getBase64ImageFromUrl(schoolLogo);

      doc.setFillColor(30, 58, 138);
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
      doc.text('Sistema Checador — Bitácora Histórica de Justificantes y Observaciones', 42, 26);

      doc.setTextColor(30, 41, 59);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`Total Registros de Justificantes: ${allJustifications.length}`, 14, 46);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Fecha de Emisión: ${new Date().toLocaleDateString('es-MX')}`, 130, 46);

      const tableRows = allJustifications.map(j => [
        j.fecha,
        j.tipoPersona,
        j.nombre,
        j.detalle,
        j.observacion
      ]);

      autoTable(doc, {
        startY: 55,
        head: [['Fecha', 'Tipo Persona', 'Nombre Completo', 'Grado / Aula', 'Justificación / Observación']],
        body: tableRows,
        theme: 'grid',
        headStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center', fontSize: 9 },
        columnStyles: {
          0: { halign: 'center', cellWidth: 24 },
          1: { halign: 'center', cellWidth: 24 },
          2: { halign: 'left', cellWidth: 45 },
          3: { halign: 'center', cellWidth: 26 },
          4: { halign: 'left', cellWidth: 'auto' }
        }
      });

      const finalY = (doc.lastAutoTable && doc.lastAutoTable.finalY) || 120;
      doc.setDrawColor(203, 213, 225);
      doc.line(25, finalY + 25, 85, finalY + 25);
      doc.line(125, finalY + 25, 185, finalY + 25);

      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text('Firma del Responsable', 55, finalY + 30, { align: 'center' });
      doc.text('Sello y Firma de la Dirección', 155, finalY + 30, { align: 'center' });

      doc.save(`Reporte_Justificantes_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (e) {
      console.error('Error generando PDF justificantes:', e);
      alert('Error al generar PDF de justificantes.');
    } finally {
      setGenerating(null);
    }
  };

  // 4. Generate Justifications Excel using ExcelJS
  const generateJustificantesExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Justificantes');

      worksheet.columns = [
        { key: 'fecha', width: 16 },
        { key: 'tipo', width: 16 },
        { key: 'nombre', width: 28 },
        { key: 'detalle', width: 18 },
        { key: 'observacion', width: 40 }
      ];

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
      const subtitleCell = worksheet.getCell('B3');
      subtitleCell.value = 'Bitácora Histórica de Justificantes y Observaciones Activas';
      subtitleCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: '475569' } };
      subtitleCell.alignment = { vertical: 'middle', horizontal: 'left' };

      worksheet.addRow([]);
      worksheet.addRow([]);

      const infoRow = worksheet.addRow(['Fecha de Emisión:', new Date().toLocaleDateString('es-MX'), '', 'Total Registros:', allJustifications.length]);
      infoRow.getCell(1).font = { bold: true };
      infoRow.getCell(4).font = { bold: true };

      worksheet.addRow([]);

      const headerRow = worksheet.addRow(['Fecha Registro', 'Tipo Persona', 'Nombre Completo', 'Grado/Grupo/Aula', 'Justificación / Observación']);
      headerRow.height = 24;
      headerRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E3A8A' } };
        cell.font = { bold: true, color: { argb: 'FFFFFF' }, size: 10 };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'CBD5E1' } },
          left: { style: 'thin', color: { argb: 'CBD5E1' } },
          bottom: { style: 'thin', color: { argb: 'CBD5E1' } },
          right: { style: 'thin', color: { argb: 'CBD5E1' } }
        };
      });

      allJustifications.forEach(j => {
        const row = worksheet.addRow([
          j.fecha,
          j.tipoPersona,
          j.nombre,
          j.detalle,
          j.observacion
        ]);
        row.height = 20;

        row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell(3).alignment = { vertical: 'middle', horizontal: 'left' };
        row.getCell(4).alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell(5).alignment = { vertical: 'middle', horizontal: 'left' };

        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin', color: { argb: 'E2E8F0' } },
            left: { style: 'thin', color: { argb: 'E2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'E2E8F0' } },
            right: { style: 'thin', color: { argb: 'E2E8F0' } }
          };
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Reporte_Justificantes_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
    } catch (e) {
      console.error('Error generando Excel justificantes:', e);
      alert('Error al generar archivo Excel.');
    }
  };

  // 5. Generate Deletions PDF
  const generateEliminacionesPDF = async () => {
    setGenerating('pdf-eliminaciones');
    try {
      const doc = new jsPDF();
      const logoBase64 = await getBase64ImageFromUrl(schoolLogo);

      doc.setFillColor(30, 58, 138);
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
      doc.text('Sistema Checador — Bitácora Histórica de Eliminaciones del Sistema', 42, 26);

      doc.setTextColor(30, 41, 59);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`Total Eliminaciones Registradas: ${deletions.length}`, 14, 46);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Fecha de Emisión: ${new Date().toLocaleDateString('es-MX')}`, 130, 46);

      const tableRows = deletions.map(d => [
        `${d.fecha} ${d.hora}`,
        d.tipoPersona,
        d.nombre,
        d.detalle,
        d.motivo
      ]);

      autoTable(doc, {
        startY: 55,
        head: [['Fecha / Hora', 'Tipo Persona', 'Nombre del Registro', 'Grado/Grupo', 'Motivo de Eliminación']],
        body: tableRows,
        theme: 'grid',
        headStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center', fontSize: 9 },
        columnStyles: {
          0: { halign: 'center', cellWidth: 32 },
          1: { halign: 'center', cellWidth: 24 },
          2: { halign: 'left', cellWidth: 45 },
          3: { halign: 'center', cellWidth: 26 },
          4: { halign: 'left', cellWidth: 'auto' }
        }
      });

      const finalY = (doc.lastAutoTable && doc.lastAutoTable.finalY) || 120;
      doc.setDrawColor(203, 213, 225);
      doc.line(25, finalY + 25, 85, finalY + 25);
      doc.line(125, finalY + 25, 185, finalY + 25);

      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text('Firma del Responsable', 55, finalY + 30, { align: 'center' });
      doc.text('Sello y Firma de la Dirección', 155, finalY + 30, { align: 'center' });

      doc.save(`Reporte_Eliminaciones_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (e) {
      console.error('Error generando PDF eliminaciones:', e);
      alert('Error al generar PDF de eliminaciones.');
    } finally {
      setGenerating(null);
    }
  };

  // 6. Generate Deletions Excel using ExcelJS
  const generateEliminacionesExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Eliminaciones');

      worksheet.columns = [
        { key: 'fecha', width: 14 },
        { key: 'hora', width: 14 },
        { key: 'tipo', width: 16 },
        { key: 'nombre', width: 28 },
        { key: 'detalle', width: 18 },
        { key: 'motivo', width: 35 }
      ];

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
      worksheet.mergeCells('B2:F2');
      const titleCell = worksheet.getCell('B2');
      titleCell.value = 'ESCUELA PRIMARIA Sor Juana Inés de la Cruz T.V';
      titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: '1E3A8A' } };
      titleCell.alignment = { vertical: 'middle', horizontal: 'left' };

      worksheet.mergeCells('B3:F3');
      const subtitleCell = worksheet.getCell('B3');
      subtitleCell.value = 'Bitácora Histórica de Registros Eliminados del Sistema';
      subtitleCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: '475569' } };
      subtitleCell.alignment = { vertical: 'middle', horizontal: 'left' };

      worksheet.addRow([]);
      worksheet.addRow([]);

      const infoRow = worksheet.addRow(['Fecha de Emisión:', new Date().toLocaleDateString('es-MX'), '', 'Total Registros:', deletions.length]);
      infoRow.getCell(1).font = { bold: true };
      infoRow.getCell(4).font = { bold: true };

      worksheet.addRow([]);

      const headerRow = worksheet.addRow(['Fecha', 'Hora', 'Tipo Persona', 'Nombre Completo', 'Grado/Grupo', 'Motivo de Eliminación']);
      headerRow.height = 24;
      headerRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E3A8A' } };
        cell.font = { bold: true, color: { argb: 'FFFFFF' }, size: 10 };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'CBD5E1' } },
          left: { style: 'thin', color: { argb: 'CBD5E1' } },
          bottom: { style: 'thin', color: { argb: 'CBD5E1' } },
          right: { style: 'thin', color: { argb: 'CBD5E1' } }
        };
      });

      deletions.forEach(d => {
        const row = worksheet.addRow([
          d.fecha,
          d.hora,
          d.tipoPersona,
          d.nombre,
          d.detalle,
          d.motivo
        ]);
        row.height = 20;

        row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell(3).alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell(4).alignment = { vertical: 'middle', horizontal: 'left' };
        row.getCell(5).alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell(6).alignment = { vertical: 'middle', horizontal: 'left' };

        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin', color: { argb: 'E2E8F0' } },
            left: { style: 'thin', color: { argb: 'E2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'E2E8F0' } },
            right: { style: 'thin', color: { argb: 'E2E8F0' } }
          };
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Reporte_Eliminaciones_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
    } catch (e) {
      console.error('Error generando Excel eliminaciones:', e);
      alert('Error al generar archivo Excel.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white mb-1 font-outfit">
            Reportes y Bitácora del Sistema
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold">
            Descarga de reportes periódicos de asistencia, bitácora de justificantes y registro de eliminaciones.
          </p>
        </div>
      </div>

      {/* Banner de filtro para Docentes */}
      {isDocente && (
        <div className="bg-blue-500/10 border border-blue-500/30 text-blue-900 dark:text-blue-300 px-4 py-3 rounded-2xl flex items-center gap-2 text-xs font-bold animate-fadeIn">
          <span>📌 Vista Docente: Los reportes trimestrales y justificantes están filtrados exclusivamente para tu grupo asignado ({docenteGroup}).</span>
        </div>
      )}

      {/* Subtabs Header */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 border-b border-gray-200 dark:border-gray-800 pb-3">
        <button
          onClick={() => setActiveSubTab('asistencia')}
          className={`flex items-center justify-center sm:justify-start gap-2 px-4 py-2 text-xs font-bold rounded-xl transition ${
            activeSubTab === 'asistencia'
              ? 'bg-[#2b66f6] text-white shadow-xs'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 bg-gray-50 dark:bg-gray-900/50 sm:bg-transparent sm:dark:bg-transparent'
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          <span>Reportes de Asistencia</span>
        </button>

        <button
          onClick={() => setActiveSubTab('justificantes')}
          className={`flex items-center justify-center sm:justify-start gap-2 px-4 py-2 text-xs font-bold rounded-xl transition ${
            activeSubTab === 'justificantes'
              ? 'bg-[#2b66f6] text-white shadow-xs'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 bg-gray-50 dark:bg-gray-900/50 sm:bg-transparent sm:dark:bg-transparent'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Justificantes Activos ({allJustifications.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('eliminaciones')}
          className={`flex items-center justify-center sm:justify-start gap-2 px-4 py-2 text-xs font-bold rounded-xl transition ${
            activeSubTab === 'eliminaciones'
              ? 'bg-[#2b66f6] text-white shadow-xs'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 bg-gray-50 dark:bg-gray-900/50 sm:bg-transparent sm:dark:bg-transparent'
          }`}
        >
          <Trash2 className="w-4 h-4" />
          <span>Historial de Eliminaciones ({deletions.length})</span>
        </button>
      </div>

      {/* SUBTAB 1: ASISTENCIAS (3 MESES) */}
      {activeSubTab === 'asistencia' && (
        <div className="bg-white dark:bg-[#1c1c1e] border border-gray-200 dark:border-[#2c2c2e] p-6 rounded-2xl shadow-xs space-y-6 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-500/10 text-blue-600 rounded-xl">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-gray-900 dark:text-white font-outfit">Reportes Trimestrales (3 Meses)</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Generación de reportes estadísticos basados en el algoritmo de Asistencia por Excepción.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Reporte de Alumnos */}
            <div className="space-y-4 p-4 border border-gray-100 dark:border-gray-800 rounded-xl bg-gray-50/50 dark:bg-gray-900/30">
              <h4 className="font-bold text-sm text-gray-800 dark:text-gray-200">Reportes de Alumnos</h4>
              
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => generateTrimestralPDF('alumnos_grupo')}
                  disabled={generating === 'pdf-alumnos_grupo'}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>Reporte Consolidado del Grupo (PDF)</span>
                </button>
              </div>
            </div>

            {/* Reporte de Docentes (Solo Admin) */}
            {(!isDocente || rLower === 'director' || rLower === 'directora' || rLower === 'subdirector' || rLower === 'subdirectora') && (
              <div className="space-y-4 p-4 border border-gray-100 dark:border-gray-800 rounded-xl bg-gray-50/50 dark:bg-gray-900/30">
                <h4 className="font-bold text-sm text-gray-800 dark:text-gray-200">Reportes de Docentes</h4>
                
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => generateTrimestralPDF('docentes_grupo')}
                    disabled={generating === 'pdf-docentes_grupo'}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition disabled:opacity-50"
                  >
                    <Download className="w-4 h-4" />
                    <span>Reporte Consolidado Docentes (PDF)</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 2: JUSTIFICANTES */}
      {activeSubTab === 'justificantes' && (
        <div className="bg-white dark:bg-[#1c1c1e] border border-gray-200 dark:border-[#2c2c2e] p-6 rounded-2xl shadow-xs space-y-6 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-4">
            <div>
              <h3 className="font-extrabold text-base text-gray-900 dark:text-white font-outfit">Bitácora de Justificantes y Observaciones</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Consolidado de observaciones especiales y justificaciones médicas/familiares activas.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-2">
              <button
                onClick={generateJustificantesPDF}
                disabled={generating === 'pdf-justificantes'}
                className="flex items-center justify-center sm:justify-start gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>Exportar PDF</span>
              </button>
              <button
                onClick={generateJustificantesExcel}
                className="flex items-center justify-center sm:justify-start gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Exportar Excel</span>
              </button>
            </div>
          </div>

          {/* VISTA MÓVIL - TARJETAS */}
          <div className="block sm:hidden flex flex-col gap-3">
            {allJustifications.length === 0 ? (
              <div className="text-center text-xs text-gray-400 py-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                No hay justificantes u observaciones registradas en este momento.
              </div>
            ) : (
              allJustifications.map((j, idx) => (
                <div key={idx} className="bg-gray-50 dark:bg-gray-800/40 p-4 rounded-xl border border-gray-100 dark:border-gray-700 space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-gray-900 dark:text-white">{j.nombre}</span>
                    <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                      j.tipoPersona === 'Docente'
                        ? 'bg-emerald-500/10 text-emerald-600'
                        : 'bg-indigo-500/10 text-indigo-600'
                    }`}>
                      {j.tipoPersona}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-300">
                    <span className="font-semibold text-gray-500">Fecha:</span> <span className="font-mono">{j.fecha}</span>
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-300">
                    <span className="font-semibold text-gray-500">Grupo / Aula:</span> {j.detalle}
                  </div>
                  <div className="text-xs text-gray-700 dark:text-gray-200 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <span className="font-semibold text-gray-500 block mb-1">Justificación / Observación:</span>
                    {j.observacion}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* VISTA ESCRITORIO - TABLA */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 text-[10px] uppercase font-bold text-gray-400 bg-gray-50 dark:bg-gray-900">
                  <th className="py-3 px-4">Fecha</th>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">Nombre</th>
                  <th className="py-3 px-4">Grupo / Aula</th>
                  <th className="py-3 px-4">Justificación / Observación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {allJustifications.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-gray-400 font-semibold">
                      No hay justificantes u observaciones registradas en este momento.
                    </td>
                  </tr>
                ) : (
                  allJustifications.map((j, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="py-3 px-4 font-mono text-gray-500">{j.fecha}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                          j.tipoPersona === 'Docente'
                            ? 'bg-emerald-500/10 text-emerald-600'
                            : 'bg-indigo-500/10 text-indigo-600'
                        }`}>
                          {j.tipoPersona}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-gray-900 dark:text-white">{j.nombre}</td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-300">{j.detalle}</td>
                      <td className="py-3 px-4 font-semibold text-gray-700 dark:text-gray-200">{j.observacion}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 3: ELIMINACIONES */}
      {activeSubTab === 'eliminaciones' && (
        <div className="bg-white dark:bg-[#1c1c1e] border border-gray-200 dark:border-[#2c2c2e] p-6 rounded-2xl shadow-xs space-y-6 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-4">
            <div>
              <h3 className="font-extrabold text-base text-gray-900 dark:text-white font-outfit">Bitácora de Registros Eliminados</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Historial de auditoría con la fecha, hora y motivo de eliminación de cuentas de alumnos o docentes.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-2">
              <button
                onClick={generateEliminacionesPDF}
                disabled={generating === 'pdf-eliminaciones'}
                className="flex items-center justify-center sm:justify-start gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>Exportar PDF</span>
              </button>
              <button
                onClick={generateEliminacionesExcel}
                className="flex items-center justify-center sm:justify-start gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Exportar Excel</span>
              </button>
            </div>
          </div>

          {/* VISTA MÓVIL - TARJETAS */}
          <div className="block sm:hidden flex flex-col gap-3">
            {deletions.length === 0 ? (
              <div className="text-center text-xs text-gray-400 py-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                No hay registros eliminados en el historial de esta sesión.
              </div>
            ) : (
              deletions.map((d) => (
                <div key={d.id} className="bg-gray-50 dark:bg-gray-800/40 p-4 rounded-xl border border-gray-100 dark:border-gray-700 space-y-2 relative">
                  <div className="flex justify-between items-start pr-8">
                    <span className="font-bold text-gray-900 dark:text-white">{d.nombre}</span>
                    <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                      d.tipoPersona === 'Docente'
                        ? 'bg-amber-500/10 text-amber-600'
                        : 'bg-rose-500/10 text-rose-600'
                    }`}>
                      {d.tipoPersona}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-300">
                    <span className="font-semibold text-gray-500">Fecha / Hora:</span> <span className="font-mono">{d.fecha} {d.hora}</span>
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-300">
                    <span className="font-semibold text-gray-500">Grado/Grupo:</span> {d.detalle}
                  </div>
                  <div className="text-xs text-rose-600 dark:text-rose-400 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 font-semibold">
                    <span className="text-gray-500 block mb-1">Motivo:</span>
                    {d.motivo}
                  </div>
                  {onDeleteHistoryItem && (
                    <button
                      onClick={() => setAuthPendingDelete(d)}
                      className="absolute top-3 right-3 p-1.5 text-gray-400 hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-900/30 rounded-lg transition-colors"
                      title="Eliminar registro"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* VISTA ESCRITORIO - TABLA */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 text-[10px] uppercase font-bold text-gray-400 bg-gray-50 dark:bg-gray-900">
                  <th className="py-3 px-4">Fecha / Hora</th>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">Nombre del Registro</th>
                  <th className="py-3 px-4">Grado/Grupo</th>
                  <th className="py-3 px-4">Motivo de Eliminación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {deletions.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-gray-400 font-semibold">
                      No hay registros eliminados en el historial de esta sesión.
                    </td>
                  </tr>
                ) : (
                  deletions.map((d) => (
                    <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="py-3 px-4 font-mono text-gray-500">{d.fecha} {d.hora}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                          d.tipoPersona === 'Docente'
                            ? 'bg-amber-500/10 text-amber-600'
                            : 'bg-rose-500/10 text-rose-600'
                        }`}>
                          {d.tipoPersona}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-gray-900 dark:text-white">{d.nombre}</td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-300">{d.detalle}</td>
                      <td className="py-3 px-4 font-semibold text-rose-600 dark:text-rose-400">{d.motivo}</td>
                      {onDeleteHistoryItem && (
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setAuthPendingDelete(d)}
                            className="p-1.5 text-gray-400 hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-900/30 rounded-lg transition-colors"
                            title="Eliminar registro"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Auth Modal for Deletion */}
      {authPendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#182234] rounded-2xl w-full max-w-md border border-rose-500 shadow-[0_0_40px_rgba(244,63,94,0.3)] p-6 relative">
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 bg-rose-500 rounded-full flex items-center justify-center shadow-lg border-4 border-white dark:border-[#182234]">
              <Trash2 className="w-6 h-6 text-white" />
            </div>
            
            <div className="text-center mt-6 mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Eliminar Registro de Historial</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Estás a punto de eliminar permanentemente el registro de baja de <strong className="text-rose-600">{authPendingDelete.nombre}</strong>.
              </p>
              <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl text-amber-800 dark:text-amber-400 text-xs font-medium border border-amber-200 dark:border-amber-800/50">
                ⚠️ Esta acción eliminará el registro de la bitácora auditable y no se puede deshacer. Se requiere autorización del Director.
              </div>
            </div>

            <form onSubmit={handleVerifyDeleteAuth} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                  Contraseña del Director
                </label>
                <input
                  type="password"
                  required
                  autoFocus
                  value={authPasswordInput}
                  onChange={(e) => setAuthPasswordInput(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium dark:text-white"
                />
              </div>

              {authError && (
                <div className="text-rose-500 text-xs font-medium text-center bg-rose-50 dark:bg-rose-500/10 py-2 rounded-lg">
                  {authError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAuthPendingDelete(null);
                    setAuthError('');
                    setAuthPasswordInput('');
                  }}
                  className="px-4 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md"
                >
                  Confirmar Eliminación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
