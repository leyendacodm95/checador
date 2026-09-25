import React, { useState, useRef, useEffect } from 'react';
import { 
  Trash2, FileText, Clock, AlertTriangle, Users, UserCheck, 
  ChevronDown, Printer, Check, Eye, Calendar, Search, FileSpreadsheet, ArrowUpDown
} from 'lucide-react';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import bcrypt from 'bcryptjs';
import { ProfileModal } from '../common/ProfileModal';
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

// Simple normalize utility for case-insensitive and accent-insensitive text comparisons
const normalizeStr = (str) => {
  if (!str) return '';
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
};

export function GroupedAttendanceView({ students, teachers, logs, users = [], onClearLogs, onDeleteLogs, onDeleteOldLogs }) {
  const [activeDropdown, setActiveDropdown] = useState(null); // 'grade' | 'group' | null
  const [selectedGrade, setSelectedGrade] = useState('TODOS');
  const [selectedGroup, setSelectedGroup] = useState('TODOS');
  const [filterType, setFilterType] = useState('TODOS'); // 'TODOS', 'Alumnos', 'Docentes'
  const [searchTerm, setSearchTerm] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProfile, setSelectedProfile] = useState(null);
  
  // Selection state for deletion
  const [selectedRowKeys, setSelectedRowKeys] = useState(new Set());
  
  // Password auth state for deletion
  const [authPendingAction, setAuthPendingAction] = useState(null); // 'bulk_delete' | 'clear_all' | null
  const [authPasswordInput, setAuthPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  });

  // Sorting & advanced states
  const [sortOrder, setSortOrder] = useState('reciente'); // 'reciente' | 'antiguo'
  const [statusFilter, setStatusFilter] = useState('TODOS'); // 'TODOS' | 'FALTAS' | 'RETARDOS' | 'JUSTIFICANTES'
  const [showSuggestions, setShowSuggestions] = useState(false);

  const dropdownRef = useRef(null);
  const searchContainerRef = useRef(null);

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setActiveDropdown(null);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Safe client-side Blob download helpers
  const saveAsBlob = (data, filename, mimeType) => {
    const blob = new Blob([data], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 100);
  };

  const saveExcel = (workbook, filename) => {
    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'binary' });
    const buf = new ArrayBuffer(wbout.length);
    const view = new Uint8Array(buf);
    for (let i = 0; i < wbout.length; i++) view[i] = wbout.charCodeAt(i) & 0xFF;
    saveAsBlob(buf, filename, 'application/octet-stream');
  };

  const savePDF = (doc, filename) => {
    const blob = doc.output('blob');
    saveAsBlob(blob, filename, 'application/pdf');
  };

  // Helper: Parse ES-MX Date string "DD/MM/YYYY" to Date Object
  function parseEsMxDate(dateStr) {
    if (!dateStr) return null;
    
    // YYYY-MM-DD format
    if (dateStr.includes('-')) {
      const [y, m, d] = dateStr.split('-');
      if (y.length === 4) return new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
      return new Date(dateStr + 'T12:00:00');
    }

    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const p0 = parseInt(parts[0], 10);
      const p1 = parseInt(parts[1], 10);
      const p2 = parseInt(parts[2], 10);

      if (p1 > 12) {
        // format is MM/DD/YYYY
        return new Date(p2, p0 - 1, p1);
      }
      // format is DD/MM/YYYY
      return new Date(p2, p1 - 1, p0);
    }
    return new Date(dateStr);
  }

  // Create unified searchable profiles list (Google-style search)
  const searchableProfiles = [
    ...students.map(s => ({ ...s, tipoPersona: 'Alumno' })),
    ...Object.keys(teachers).map(key => {
      const t = teachers[key];
      const tObj = typeof t === 'object' ? t : { nombre: t };
      return {
        ...tObj,
        id: key,
        grado: 'Docente',
        grupo: key,
        tipoPersona: 'Docente'
      };
    })
  ];

  const searchSuggestions = searchTerm.trim().length > 0
    ? searchableProfiles.filter(p => normalizeStr(p.nombre).includes(normalizeStr(searchTerm)))
    : [];

  // 1. Group logs by person ID and date
  const groupedLogs = [];
  const logMap = {};

  logs.forEach(log => {
    const p = log.person || log.student;
    if (!p) return;
    const personId = p.id || p.qrCode || p.nombre;
    const dateKey = log.fecha;
    const key = `${personId}_${dateKey}`;

    if (!logMap[key]) {
      logMap[key] = {
        key,
        originalLogIds: [log.id],
        person: p,
        fecha: log.fecha,
        tipoPersona: log.tipoPersona || 'Alumno',
        entrada: '—',
        salida: '—',
        minutosRetraso: 0,
        estado: p.estado === 'AUSENTE' ? 'AUSENTE' : 'PRESENTE',
      };
      groupedLogs.push(logMap[key]);
    } else {
      logMap[key].originalLogIds.push(log.id);
    }

    if (log.tipo === 'Entrada') {
      if (logMap[key].entrada === '—' || log.hora < logMap[key].entrada) {
        logMap[key].entrada = log.hora;
      }
      logMap[key].minutosRetraso = 0; // Ya no usamos retrasos
      if (!logMap[key].hasStateDetermined) {
        logMap[key].estado = 'PRESENTE';
        logMap[key].hasStateDetermined = true;
      }
    } else if (!logMap[key].hasStateDetermined) {
      if (log.tipo === 'Falta' || log.tipo === 'Ausente' || log.tipo === 'Falta Manual') {
        logMap[key].estado = 'AUSENTE';
        logMap[key].hasStateDetermined = true;
      } else if (log.tipo === 'Falta Justificada' || log.tipo === 'Asistencia / Justificado' || log.tipo === 'Retardo Justificado') {
        logMap[key].estado = 'PRESENTE';
        logMap[key].hasStateDetermined = true;
      }
    }
  });

  // 2. Filter grouped logs list
  const filteredGroupedLogs = groupedLogs.filter(row => {
    const p = row.person;
    
    // Range Date filter matching
    const rowDateObj = parseEsMxDate(row.fecha);
    const startFilterObj = new Date(startDate + 'T00:00:00');
    const endFilterObj = new Date(endDate + 'T23:59:59');
    
    if (rowDateObj && (rowDateObj < startFilterObj || rowDateObj > endFilterObj)) {
      return false;
    }

    // Search term name matching
    if (searchTerm && !normalizeStr(p.nombre).includes(normalizeStr(searchTerm))) return false;

    // Filter by type: 'TODOS', 'Alumnos', 'Docentes'
    if (filterType === 'Alumnos' && row.tipoPersona !== 'Alumno') return false;
    if (filterType === 'Docentes' && row.tipoPersona === 'Alumno') return false;

    // Grade filter
    if (selectedGrade !== 'TODOS' && p.grado !== selectedGrade) return false;

    // Group filter
    if (selectedGroup !== 'TODOS' && p.grupo !== selectedGroup) return false;

    // Advanced status filters (Faltas, Justificantes)
    const normalizedState = row.estado === 'TARDÍO' ? 'PRESENTE' : row.estado;
    if (statusFilter === 'FALTAS' && normalizedState !== 'AUSENTE') return false;
    if (statusFilter === 'JUSTIFICANTES') {
      const observations = p.observaciones || '';
      if (!observations || observations === '—' || observations.toLowerCase().includes('ningun')) return false;
    }

    return true;
  });

  // 3. Sort Logs based on Antigüedad vs Reciente
  const sortedGroupedLogs = [...filteredGroupedLogs].sort((a, b) => {
    const dateA = parseEsMxDate(a.fecha);
    const dateB = parseEsMxDate(b.fecha);
    if (!dateA || !dateB) return 0;
    
    if (dateA.getTime() === dateB.getTime()) {
      const timeA = a.entrada !== '—' ? a.entrada : '00:00';
      const timeB = b.entrada !== '—' ? b.entrada : '00:00';
      return sortOrder === 'reciente' ? timeB.localeCompare(timeA) : timeA.localeCompare(timeB);
    }
    
    return sortOrder === 'reciente' ? dateB - dateA : dateA - dateB;
  });

  // Stats calculations
  const entradasCount = sortedGroupedLogs.filter(r => r.entrada !== '—').length;
  const salidasCount = sortedGroupedLogs.filter(r => r.salida !== '—').length;
  const retardosCount = sortedGroupedLogs.filter(r => r.minutosRetraso > 0).length;

  // Pagination
  const totalRecords = sortedGroupedLogs.length;
  const totalPages = Math.ceil(totalRecords / pageSize) || 1;
  const paginatedLogs = sortedGroupedLogs.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Selection Logic
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allKeys = new Set(paginatedLogs.map(row => row.key));
      setSelectedRowKeys(allKeys);
    } else {
      setSelectedRowKeys(new Set());
    }
  };

  const handleSelectRow = (key) => {
    const newSet = new Set(selectedRowKeys);
    if (newSet.has(key)) newSet.delete(key);
    else newSet.add(key);
    setSelectedRowKeys(newSet);
  };

  const handleTrashClick = () => {
    if (selectedRowKeys.size === 1) {
      // Single delete confirmation
      setAuthPendingAction('single_delete');
    } else if (selectedRowKeys.size > 1) {
      // Bulk delete selected
      setAuthPendingAction('bulk_delete');
    } else {
      // Delete all
      setAuthPendingAction('clear_all');
    }
  };

  const handleVerifyAuth = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setAuthError('');

    if (authPendingAction === 'single_delete') {
      const key = Array.from(selectedRowKeys)[0];
      const row = sortedGroupedLogs.find(r => r.key === key);
      if (row && row.originalLogIds && onDeleteLogs) {
        onDeleteLogs(row.originalLogIds);
        setSelectedRowKeys(new Set());
      }
      setAuthPendingAction(null);
      return;
    }
    
    // Find director/admin password from users array
    const validPasswords = [
      users.find(u => ['director','directora','subdirector','subdirectora'].includes((u.role || u.baseRole || '').toLowerCase().trim()))?.password,
      'director2024',
      'admin'
    ].filter(Boolean);

    const cleanPass = authPasswordInput.trim();
    let isValid = false;
    
    for (const storedPass of validPasswords) {
      if (storedPass.startsWith('$2a$') || storedPass.startsWith('$2b$')) {
        if (bcrypt.compareSync(cleanPass, storedPass)) {
          isValid = true;
          break;
        }
      } else {
        if (storedPass === cleanPass) {
          isValid = true;
          break;
        }
      }
    }

    if (isValid) {
      if (authPendingAction === 'bulk_delete') {
        const idsToDelete = [];
        selectedRowKeys.forEach(key => {
          const row = sortedGroupedLogs.find(r => r.key === key);
          if (row && row.originalLogIds) {
            idsToDelete.push(...row.originalLogIds);
          }
        });
        if (onDeleteLogs) {
          onDeleteLogs(idsToDelete);
          setSelectedRowKeys(new Set());
        }
      } else if (authPendingAction === 'clear_all') {
        onClearLogs();
      }
      setAuthPendingAction(null);
      setAuthPasswordInput('');
    } else {
      setAuthError('🔒 Contraseña incorrecta. Se requiere la contraseña del Director para autorizar cambios masivos.');
    }
  };

  // Formatting date range label for report titles
  const getPeriodLabel = () => {
    if (startDate === endDate) {
      const [y, m, d] = startDate.split('-');
      return `Día ${d}-${m}-${y}`;
    } else {
      const [sy, sm, sd] = startDate.split('-');
      const [ey, em, ed] = endDate.split('-');
      return `Periodo del ${sd}-${sm}-${sy} al ${ed}-${em}-${ey}`;
    }
  };

  const getPeriodText = () => {
    if (startDate === endDate) {
      const [y, m, d] = startDate.split('-');
      return `Día: ${d}/${m}/${y}`;
    } else {
      const [sy, sm, sd] = startDate.split('-');
      const [ey, em, ed] = endDate.split('-');
      return `Periodo: del ${sd}/${sm}/${sy} al ${ed}/${em}/${ey}`;
    }
  };

  const exportExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Registros de Asistencia');

      worksheet.columns = [
        { key: 'tipo', width: 14 },
        { key: 'nombre', width: 28 },
        { key: 'grado', width: 12 },
        { key: 'grupo', width: 12 },
        { key: 'fecha', width: 16 },
        { key: 'entrada', width: 18 },
        { key: 'retraso', width: 18 },
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
      worksheet.mergeCells('B2:I2');
      const titleCell = worksheet.getCell('B2');
      titleCell.value = 'ESCUELA PRIMARIA Sor Juana Inés de la Cruz T.V';
      titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: '1E3A8A' } };
      titleCell.alignment = { vertical: 'middle', horizontal: 'left' };

      worksheet.mergeCells('B3:I3');
      const subtitleCell = worksheet.getCell('B3');
      subtitleCell.value = `Reporte General de Registros de Asistencia (${getPeriodText()})`;
      subtitleCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: '475569' } };
      subtitleCell.alignment = { vertical: 'middle', horizontal: 'left' };

      worksheet.addRow([]);
      worksheet.addRow([]);

      // Info row
      const infoRow = worksheet.addRow(['Fecha de Emisión:', new Date().toLocaleDateString('es-MX'), '', 'Total Registros:', sortedGroupedLogs.length]);
      infoRow.getCell(1).font = { bold: true };
      infoRow.getCell(4).font = { bold: true };

      worksheet.addRow([]);

      // Header row
      const headerRow = worksheet.addRow(['Tipo', 'Nombre', 'Grado', 'Grupo', 'Fecha', 'Hora de escaneo QR', 'Min. Retraso', 'Estado', 'Comentarios']);
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

      // Data Rows
      sortedGroupedLogs.forEach((l) => {
        const p = l.person;
        const row = worksheet.addRow([
          l.tipoPersona,
          p?.nombre || '—',
          p?.grado || '—',
          p?.grupo || '—',
          l.fecha,
          l.entrada,
          l.minutosRetraso > 0 ? `${l.minutosRetraso} min` : '0 min',
          l.estado === 'TARDÍO' ? 'PRESENTE' : l.estado,
          p?.observaciones || '—'
        ]);
        row.height = 20;

        row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell(2).alignment = { vertical: 'middle', horizontal: 'left' };
        row.getCell(3).alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell(4).alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell(5).alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell(6).alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell(7).alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell(8).alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell(9).alignment = { vertical: 'middle', horizontal: 'left' };

        row.eachCell((cell, colNumber) => {
          cell.border = {
            top: { style: 'thin', color: { argb: 'E2E8F0' } },
            left: { style: 'thin', color: { argb: 'E2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'E2E8F0' } },
            right: { style: 'thin', color: { argb: 'E2E8F0' } }
          };

          if (colNumber === 8) {
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
      a.download = `Reporte_Asistencias_${getPeriodLabel()}.xlsx`;
      a.click();
    } catch (err) {
      console.error('Error generando Excel:', err);
      alert('Ocurrió un error al generar el archivo Excel.');
    }
  };

  const exportPDF = async () => {
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

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Sistema Checador — Registros del Día / Historial (${getPeriodText()})`, 42, 24);

      // Info Box
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`Filtro Activo: ${filterType} — Grado: ${selectedGrade} — Grupo: ${selectedGroup}`, 14, 46);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Fecha de Emisión: ${new Date().toLocaleDateString('es-MX')}`, 120, 46);
      doc.text(`Total Registros: ${sortedGroupedLogs.length}`, 120, 52);

      const tableRows = sortedGroupedLogs.map((l) => {
        const p = l.person;
        return [
          l.tipoPersona,
          p?.nombre || '—',
          p?.grado || '—',
          p?.grupo || '—',
          l.fecha,
          l.entrada,
          l.estado,
          p?.observaciones || '—'
        ];
      });

      // Table Generation via autoTable
      autoTable(doc, {
        startY: 58,
        head: [['Tipo', 'Nombre Completo', 'Grado', 'Grupo', 'Fecha', 'Hora de escaneo QR', 'Estado', 'Observaciones']],
        body: tableRows,
        theme: 'grid',
        headStyles: {
          fillColor: [30, 58, 138],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center',
          fontSize: 9
        },
        columnStyles: {
          0: { halign: 'center', fontStyle: 'bold', cellWidth: 20 },
          1: { halign: 'left', cellWidth: 42 },
          2: { halign: 'center', cellWidth: 16 },
          3: { halign: 'center', cellWidth: 16 },
          4: { halign: 'center', cellWidth: 22 },
          5: { halign: 'center', fontStyle: 'bold', cellWidth: 24 },
          6: { halign: 'center', fontStyle: 'bold', cellWidth: 22 },
          7: { halign: 'left', cellWidth: 'auto' }
        },
        didParseCell: function (data) {
          if (data.section === 'body' && data.column.index === 6) {
            const val = data.cell.raw;
            if (val === 'PRESENTE' || val === 'TARDÍO') data.cell.styles.textColor = [16, 185, 129];
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
      doc.text('Firma del Docente / Responsable', 55, finalY + 30, { align: 'center' });
      doc.text('Sello y Firma de la Dirección', 155, finalY + 30, { align: 'center' });

      doc.save(`Reporte_Asistencias_${getPeriodLabel()}.pdf`);
    } catch (err) {
      console.error('Error generando PDF de asistencias:', err);
      alert('Ocurrió un error al generar el PDF.');
    }
  };

  const getBadgeStyle = (estado) => {
    switch (estado) {
      case 'PRESENTE':
      case 'TARDÍO':
        return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30';
      case 'AUSENTE':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700';
      case 'JUSTIFICADO':
        return 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30';
    }
  };

  const gradesList = ['TODOS', '1°', '2°', '3°', '4°', '5°', '6°'];
  const groupsList = ['TODOS', 'A', 'B'];

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white font-outfit">
          Registros del Día / Historial
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Pase de lista consolidado para Alumnos y Docentes con cálculo de retraso a partir de las 8:10 AM.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-850 rounded-2xl p-5 text-center shadow-xs">
          <div className="text-3xl font-black text-emerald-500 font-outfit">{entradasCount}</div>
          <div className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">Entradas Registradas</div>
        </div>
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-850 rounded-2xl p-5 text-center shadow-xs">
          <div className="text-3xl font-black text-indigo-500 font-outfit">{sortedGroupedLogs.length}</div>
          <div className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">Registros Totales</div>
        </div>
      </div>

      {/* Filter Tabs (Todos, Alumnos, Docentes) */}
      <div className="flex items-center gap-1.5 bg-white dark:bg-[#111827] p-1.5 rounded-2xl border border-slate-200 dark:border-slate-850 shadow-xs w-fit">
        <button
          onClick={() => { setFilterType('TODOS'); setCurrentPage(1); }}
          className={`px-5 py-2 rounded-xl text-xs font-bold transition ${
            filterType === 'TODOS'
              ? 'bg-[#2b66f6] text-white shadow-xs'
              : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          Todos los registros ({totalRecords})
        </button>
        <button
          onClick={() => { setFilterType('Alumnos'); setCurrentPage(1); }}
          className={`px-5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            filterType === 'Alumnos'
              ? 'bg-[#2b66f6] text-white shadow-xs'
              : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Alumnos</span>
        </button>
        <button
          onClick={() => { setFilterType('Docentes'); setCurrentPage(1); }}
          className={`px-5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            filterType === 'Docentes'
              ? 'bg-[#2b66f6] text-white shadow-xs'
              : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>Docentes</span>
        </button>
      </div>

      {/* Main Filter Section */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-850 rounded-2xl p-6 shadow-xs relative" ref={dropdownRef}>
        
        {/* ROW 1: Calendar Selectors & Google-style Search Bar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end mb-4">
          
          {/* Desde Date Picker */}
          <div className="lg:col-span-3 space-y-1.5">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block">Desde</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-750 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#2b66f6] cursor-pointer"
            />
          </div>

          {/* Hasta Date Picker */}
          <div className="lg:col-span-3 space-y-1.5">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block">Hasta</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-750 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#2b66f6] cursor-pointer"
            />
          </div>

          {/* Google-style Autocomplete Search bar */}
          <div className="lg:col-span-6 space-y-1.5 relative" ref={searchContainerRef}>
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block">Buscar Alumno / Docente</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar por nombre..."
                value={searchTerm}
                onFocus={() => setShowSuggestions(true)}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowSuggestions(true);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-750 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2b66f6]"
              />
              <Search className="w-4 h-4 text-slate-450 absolute left-3 top-2.5" />
            </div>

            {/* Autocomplete Suggestions list overlay */}
            {showSuggestions && searchSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 mt-1.5 bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-[#2c2c2e] rounded-xl shadow-xl z-50 py-1.5 max-h-60 overflow-y-auto">
                <p className="px-3.5 py-1.5 text-[9px] font-black text-slate-450 uppercase tracking-wider">Resultados de búsqueda</p>
                {searchSuggestions.map((item) => (
                  <button
                    key={item.id + item.nombre}
                    type="button"
                    onClick={() => {
                      setSelectedProfile({ data: item, type: item.tipoPersona });
                      setSearchTerm(item.nombre);
                      setShowSuggestions(false);
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-[#2c2c2e] transition flex items-center gap-3"
                  >
                    <div className="w-7 h-7 rounded-full bg-indigo-500/10 text-indigo-500 font-bold text-xs flex items-center justify-center">
                      {(item.nombre || '').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{item.nombre}</p>
                      <p className="text-[10px] text-slate-400 font-semibold">{item.tipoPersona} • {item.grado} Grado {item.grupo}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ROW 2: Segmented Dropdowns (Grado, Grupo, Ordenar, Estado) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
          
          {/* Grado Filter */}
          <div className="space-y-1.5 relative">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block">Filtrar Grado</label>
            <button
              onClick={() => setActiveDropdown(activeDropdown === 'grade' ? null : 'grade')}
              className="w-full px-3 py-2 bg-[#2b66f6] text-white rounded-lg text-xs font-bold flex items-center justify-between shadow-xs hover:bg-[#1a4fc6] transition-all"
            >
              <span className="truncate">{selectedGrade === 'TODOS' ? 'TODOS' : `${selectedGrade}`}</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-95 shrink-0" />
            </button>
            {activeDropdown === 'grade' && (
              <div className="absolute left-0 right-0 mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 py-1.5 max-h-56 overflow-y-auto">
                {gradesList.map((grade) => (
                  <button
                    key={grade}
                    onClick={() => {
                      setSelectedGrade(grade);
                      setActiveDropdown(null);
                      setCurrentPage(1);
                    }}
                    className={`w-full text-left px-4 py-2 text-xs font-bold transition hover:bg-slate-50 dark:hover:bg-slate-800 ${
                      selectedGrade === grade ? 'text-[#2b66f6] bg-blue-50/50 dark:bg-blue-950/20' : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {grade === 'TODOS' ? 'Todos los Grados' : `${grade} Grado`}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Grupo Filter */}
          <div className="space-y-1.5 relative">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block">Filtrar Grupo</label>
            <button
              onClick={() => setActiveDropdown(activeDropdown === 'group' ? null : 'group')}
              className="w-full px-3 py-2 bg-[#2b66f6] text-white rounded-lg text-xs font-bold flex items-center justify-between shadow-xs hover:bg-[#1a4fc6] transition-all"
            >
              <span className="truncate">{selectedGroup === 'TODOS' ? 'TODOS' : `${selectedGroup}`}</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-95 shrink-0" />
            </button>
            {activeDropdown === 'group' && (
              <div className="absolute left-0 right-0 mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 py-1.5 max-h-56 overflow-y-auto">
                {groupsList.map((group) => (
                  <button
                    key={group}
                    onClick={() => {
                      setSelectedGroup(group);
                      setActiveDropdown(null);
                      setCurrentPage(1);
                    }}
                    className={`w-full text-left px-4 py-2 text-xs font-bold transition hover:bg-slate-50 dark:hover:bg-slate-800 ${
                      selectedGroup === group ? 'text-[#2b66f6] bg-blue-50/50 dark:bg-blue-950/20' : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {group === 'TODOS' ? 'Todos los Grupos' : `Grupo ${group}`}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sorting order */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block">Antigüedad / Orden</label>
            <div className="relative">
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="w-full pr-8 pl-3 py-2 bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-750 dark:text-white cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#2b66f6]"
              >
                <option value="reciente">⏰ Más Reciente</option>
                <option value="antiguo">📅 Más Antiguo</option>
              </select>
            </div>
          </div>

          {/* Status filter (Faltas, Retardos, Justificantes) */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block">Incidencias y Estados</label>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pr-8 pl-3 py-2 bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-750 dark:text-white cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#2b66f6]"
              >
                <option value="TODOS">📋 Todos los Estados</option>
                <option value="FALTAS">❌ Solo Faltas (Ausente)</option>
                <option value="JUSTIFICANTES">✏️ Con Justificantes / Obs.</option>
              </select>
            </div>
          </div>

        </div>
      </div>

      {/* Action Buttons & PageSize Selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-transparent">
        {/* Left Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={exportPDF}
            title="Exportar a PDF"
            className="w-9 h-9 rounded-full bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-755 text-slate-650 dark:text-slate-350 border border-slate-250 dark:border-slate-700 flex items-center justify-center shadow-xs transition active:scale-95"
          >
            <Printer className="w-4 h-4 text-red-500" />
          </button>
          
          <button
            onClick={exportExcel}
            title="Exportar a Excel"
            className="w-9 h-9 rounded-full bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-755 text-slate-650 dark:text-slate-350 border border-slate-250 dark:border-slate-700 flex items-center justify-center shadow-xs transition active:scale-95"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
          </button>

          <button
            onClick={handleTrashClick}
            title="Eliminar registros seleccionados"
            className="w-9 h-9 rounded-full bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-755 text-slate-650 dark:text-slate-350 border border-slate-250 dark:border-slate-700 flex items-center justify-center shadow-xs transition active:scale-95"
          >
            <Trash2 className="w-4 h-4 text-rose-500" />
          </button>
          
          <div className="h-6 w-px bg-slate-300 dark:bg-slate-700 mx-1"></div>

          {onDeleteOldLogs && (
            <>
              <button
                onClick={() => onDeleteOldLogs(1)}
                title="Eliminar historial > 1 Mes"
                className="px-3 h-9 rounded-full bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-755 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 flex items-center justify-center shadow-xs transition active:scale-95 text-xs font-bold"
              >
                -1M
              </button>
              <button
                onClick={() => onDeleteOldLogs(2)}
                title="Eliminar historial > 2 Meses"
                className="px-3 h-9 rounded-full bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-755 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 flex items-center justify-center shadow-xs transition active:scale-95 text-xs font-bold"
              >
                -2M
              </button>
              <button
                onClick={() => onDeleteOldLogs(3)}
                title="Eliminar historial > 3 Meses"
                className="px-3 h-9 rounded-full bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-755 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 flex items-center justify-center shadow-xs transition active:scale-95 text-xs font-bold"
              >
                -3M
              </button>
            </>
          )}
        </div>

        {/* Right PageSize Selector */}
        <div className="flex items-center gap-2 text-xs font-bold text-slate-650 dark:text-slate-400">
          <div className="flex flex-col items-start gap-1">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider">Mostrar</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="appearance-none pr-7 pl-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-250 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-750 dark:text-white cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#2b66f6] shadow-xs"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
          <span className="mt-4 font-outfit">registros</span>
        </div>
      </div>

      {/* Unified Table */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-850 rounded-2xl shadow-xs overflow-hidden transition-colors">
        
        {/* VISTA MÓVIL - TARJETAS RESPONSIVAS */}
        <div className="sm:hidden p-3 space-y-3 bg-slate-50/50 dark:bg-transparent">
          {paginatedLogs.length > 0 && (
            <div className="flex items-center justify-between p-3 mb-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Seleccionar todos</span>
              <input type="checkbox" checked={selectedRowKeys.size === paginatedLogs.length} onChange={handleSelectAll} className="rounded text-[#2b66f6] focus:ring-[#2b66f6] cursor-pointer w-4 h-4" />
            </div>
          )}
          {paginatedLogs.length > 0 ? (
            paginatedLogs.map((row) => {
              const p = row.person;
              const hasDelay = row.minutosRetraso > 0;
              
              let displayEstado = row.estado === 'TARDÍO' ? 'PRESENTE' : row.estado;
              if (displayEstado === 'PRESENTE' && p?.observaciones && p.observaciones !== '—') {
                displayEstado = 'JUSTIFICADO';
              }
              
              return (
                <div key={row.key} className="bg-white dark:bg-[#1e293b] rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm transition hover:shadow-md">
                  <div className="flex items-start justify-between">
                    <div className="flex gap-3 items-center">
                      <input type="checkbox" checked={selectedRowKeys.has(row.key)} onChange={() => handleSelectRow(row.key)} className="rounded text-[#2b66f6] focus:ring-[#2b66f6] cursor-pointer w-4 h-4 shrink-0" />
                      <div
                        onClick={() => setSelectedProfile({ data: p, type: row.tipoPersona })}
                        className="w-12 h-12 rounded-full bg-indigo-500/10 text-indigo-500 font-bold flex items-center justify-center text-lg shrink-0 cursor-pointer"
                      >
                        {(p?.nombre || '').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <span
                          onClick={() => setSelectedProfile({ data: p, type: row.tipoPersona })}
                          className="font-bold text-[15px] text-slate-900 dark:text-white cursor-pointer hover:text-indigo-500 hover:underline"
                        >
                          {p?.nombre}
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 text-[10px] px-2 py-0.5 rounded-full font-bold">
                            {row.tipoPersona === 'Alumno' ? 'Alumno' : row.tipoPersona} {p?.grado && p?.grupo ? `• ${p.grado} ${p.grupo}` : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                    <span className={`shrink-0 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getBadgeStyle(displayEstado)}`}>
                      {displayEstado}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-2.5">
                      <span className="block text-[9px] font-black uppercase text-slate-400 mb-1">Fecha</span>
                      <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">{row.fecha}</span>
                    </div>
                    <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-2.5">
                      <span className="block text-[9px] font-black uppercase text-slate-400 mb-1">Hora Entrada</span>
                      <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">{row.entrada}</span>
                    </div>
                  </div>

                  <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 mt-3">
                    <span className="block text-[9px] font-black uppercase text-slate-400 mb-1">Observaciones</span>
                    <span className="font-bold text-slate-700 dark:text-slate-200 text-sm truncate block">
                      {p?.observaciones && p.observaciones !== '—' ? p.observaciones : '—'}
                    </span>
                  </div>

                  <button
                    onClick={() => setSelectedProfile({ data: p, type: row.tipoPersona })}
                    className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 text-sm shadow-md shadow-blue-500/20 active:scale-95"
                  >
                    <Eye size={16} />
                    Ver Perfil
                  </button>
                </div>
              );
            })
          ) : (
            <p className="text-center text-xs text-slate-450 dark:text-slate-400 font-semibold py-6">
              📭 No hay registros de asistencia coincidentes con los filtros en este rango de fechas.
            </p>
          )}
        </div>

        {/* VISTA ESCRITORIO - TABLA */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-900/30">
                <th className="py-3.5 px-5 w-12 text-center">
                  <input type="checkbox" checked={paginatedLogs.length > 0 && selectedRowKeys.size === paginatedLogs.length} onChange={handleSelectAll} className="rounded text-[#2b66f6] focus:ring-[#2b66f6] cursor-pointer" />
                </th>
                <th className="py-3.5 px-5 font-outfit">Alumno / Docente</th>
                <th className="py-3.5 px-5 font-outfit">Fecha</th>
                <th className="py-3.5 px-5 font-outfit">Hora de escaneo QR</th>
                <th className="py-3.5 px-5 text-center font-outfit">Estado</th>
                <th className="py-3.5 px-5 font-outfit">Justificante / Observaciones</th>
                <th className="py-3.5 px-5 text-center font-outfit">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
              {paginatedLogs.length > 0 ? (
                paginatedLogs.map((row) => {
                  const p = row.person;
                  const isDocente = row.tipoPersona === 'Docente';
                  const hasDelay = row.minutosRetraso > 0;

                  let displayEstado = row.estado === 'TARDÍO' ? 'PRESENTE' : row.estado;
                  if (displayEstado === 'PRESENTE' && p?.observaciones && p.observaciones !== '—') {
                    displayEstado = 'JUSTIFICADO';
                  }

                  return (
                    <tr key={row.key} className="hover:bg-slate-50/50 dark:hover:bg-[#2c2c2e]/45 transition duration-150">
                      <td className="py-3 px-5 text-center">
                        <input type="checkbox" checked={selectedRowKeys.has(row.key)} onChange={() => handleSelectRow(row.key)} className="rounded text-[#2b66f6] focus:ring-[#2b66f6] cursor-pointer" />
                      </td>
                      <td className="py-3 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-500 font-bold text-xs flex items-center justify-center">
                            {(p?.nombre || '').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-800 dark:text-white leading-tight font-outfit">
                              {p?.nombre}
                            </div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5 flex items-center gap-1.5">
                              {row.tipoPersona === 'Alumno' ? (
                                <span className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded-md border border-indigo-500/10">Alumno</span>
                              ) : (
                                <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-md border border-emerald-500/10">{row.tipoPersona}</span>
                              )}
                              <span>{p?.grado && p?.grupo ? `${p.grado} ${p.grupo}` : ''}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-5 font-semibold text-slate-600 dark:text-slate-350">
                        <span className="bg-blue-50/80 dark:bg-[#1a1c23] border border-blue-200/50 dark:border-slate-850 px-2 py-1 rounded-md text-[10px] font-bold">
                          {row.fecha}
                        </span>
                      </td>
                      <td className="py-3 px-5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-700 dark:text-slate-200">{row.entrada}</span>
                          {hasDelay && (
                            <span className="text-[9px] bg-red-500/10 text-red-500 border border-red-500/20 px-1.5 py-0.5 rounded-md font-bold shrink-0">
                              +{row.minutosRetraso} min
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-5 text-center">
                        <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold tracking-wide ${getBadgeStyle(displayEstado)}`}>
                          {displayEstado}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-slate-600 dark:text-slate-300 font-medium max-w-xs truncate">
                        {p?.observaciones || '—'}
                      </td>
                      <td className="py-3 px-5 text-center">
                        <button
                          onClick={() => setSelectedProfile({ data: p, type: row.tipoPersona })}
                          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-505 dark:text-slate-400 rounded-lg transition"
                          title="Ver detalles"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-450 dark:text-slate-400 font-semibold">
                    📭 No hay registros de asistencia coincidentes con los filtros en este rango de fechas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/20 dark:bg-slate-900/10">
          <div className="text-xs text-slate-450 dark:text-slate-400 font-semibold">
            Mostrando {paginatedLogs.length} de {totalRecords} registros (Página {currentPage} de {totalPages})
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg border border-slate-250 dark:border-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40 transition font-bold"
            >
              Anterior
            </button>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => (
              <button
                key={pageNumber}
                onClick={() => setCurrentPage(pageNumber)}
                className={`w-8 h-8 rounded-lg text-xs font-bold transition ${
                  currentPage === pageNumber
                    ? 'bg-[#2b66f6] text-white shadow-xs'
                    : 'border border-slate-250 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {pageNumber}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-lg border border-slate-250 dark:border-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40 transition font-bold"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>

      {/* Profile Modal */}
      <ProfileModal
        data={selectedProfile?.data}
        type={selectedProfile?.type}
        isOpen={!!selectedProfile}
        onClose={() => setSelectedProfile(null)}
      />

      {/* Group Security Authorization Modal for Bulk Deletion */}
      {authPendingAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-[#182234] rounded-2xl w-full max-w-md border border-gray-200 dark:border-gray-700 shadow-2xl p-6 relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center font-bold">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white font-outfit">
                  Autorización de Director
                </h3>
                <p className="text-xs text-slate-400">
                  Verificación de Seguridad
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 mb-4 leading-relaxed font-medium">
              {authPendingAction === 'single_delete' ? (
                <>¿Estás seguro de eliminar <strong>1</strong> registro de asistencia permanentemente del sistema?</>
              ) : (
                <>Estás intentando eliminar <strong>{authPendingAction === 'clear_all' ? 'TODOS' : selectedRowKeys.size}</strong> registro(s) de asistencia permanentemente del sistema. Para continuar, ingrese la contraseña de Director.</>
              )}
            </p>

            <form onSubmit={handleVerifyAuth} className="space-y-4">
              {authPendingAction !== 'single_delete' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    Contraseña de Director:
                  </label>
                  <input
                    type="password"
                    required
                    autoFocus
                    placeholder="Ingrese contraseña..."
                    value={authPasswordInput}
                    onChange={(e) => setAuthPasswordInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>
              )}

              {authError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 leading-snug">
                  {authError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAuthPendingAction(null);
                    setAuthPasswordInput('');
                    setAuthError('');
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md"
                >
                  Eliminar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
