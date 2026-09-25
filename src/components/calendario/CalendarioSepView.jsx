import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, Download, FileSpreadsheet, CheckCircle2, Sun, Snowflake, GraduationCap, Upload, RotateCcw, FileText, Image as ImageIcon, Trash2, AlertTriangle, X } from 'lucide-react';
import schoolLogo from '../../logo.png';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { useAuth } from '../../context/AuthContext';
import { getCustomCalendarSuspensions, addCustomCalendarSuspension, removeCustomCalendarSuspension } from '../../lib/sepCalendarService';
import { db } from '../../lib/firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';

// Helper to load image as base64 for PDF & Excel
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

// Interactive Full-screen Image Viewer with Zoom and Pan
const FullScreenImageViewer = ({ src, alt, onClose }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const initialPinchDistance = useRef(null);
  const initialPinchScale = useRef(1);

  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e) => {
      e.preventDefault();
      setScale((prev) => Math.min(Math.max(1, prev - e.deltaY * 0.005), 5));
    };

    const getPinchDistance = (touches) => {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const handleTouchStart = (e) => {
      if (e.touches.length === 2) {
        initialPinchDistance.current = getPinchDistance(e.touches);
        initialPinchScale.current = scale;
      } else if (e.touches.length === 1 && scale > 1) {
        isDragging.current = true;
        dragStart.current = { x: e.touches[0].clientX - position.x, y: e.touches[0].clientY - position.y };
      }
    };

    const handleTouchMove = (e) => {
      e.preventDefault();
      if (e.touches.length === 2 && initialPinchDistance.current) {
        const distance = getPinchDistance(e.touches);
        const newScale = Math.min(Math.max(1, initialPinchScale.current * (distance / initialPinchDistance.current)), 5);
        setScale(newScale);
      } else if (e.touches.length === 1 && isDragging.current && scale > 1) {
        setPosition({
          x: e.touches[0].clientX - dragStart.current.x,
          y: e.touches[0].clientY - dragStart.current.y
        });
      }
    };

    const handleTouchEnd = () => {
      initialPinchDistance.current = null;
      isDragging.current = false;
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [scale, position]);

  const handleMouseDown = (e) => {
    if (scale > 1) {
      isDragging.current = true;
      dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging.current && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.current.x,
        y: e.clientY - dragStart.current.y
      });
    }
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center animate-fadeIn"
         onMouseDown={handleMouseDown}
         onMouseMove={handleMouseMove}
         onMouseUp={handleMouseUp}
         onMouseLeave={handleMouseUp}>
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 z-[10000] p-3 bg-gray-900/50 hover:bg-rose-600 rounded-full text-white transition-colors cursor-pointer pointer-events-auto"
      >
        <X className="w-6 h-6" />
      </button>
      <div 
        ref={containerRef}
        className="absolute inset-0 w-full h-full flex items-center justify-center overflow-hidden cursor-move touch-none"
      >
        <img
          src={src}
          alt={alt}
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transition: isDragging.current ? 'none' : 'transform 0.1s ease-out',
            willChange: 'transform',
            transformOrigin: 'center center'
          }}
          className="max-w-[95vw] max-h-[95vh] object-contain pointer-events-none select-none"
        />
      </div>
      <div className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-none z-[10000]">
        <span className="bg-black/80 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg">
          {scale === 1 ? 'Rueda o pellizca para hacer zoom' : `Zoom: ${Math.round(scale * 100)}%`}
        </span>
      </div>
    </div>,
    document.body
  );
};

// Official SEP Mexico Logo Badge Component
const SepLogo = () => (
  <div className="flex items-center gap-2 bg-gradient-to-r from-emerald-800 via-emerald-700 to-green-800 text-white px-3.5 py-1.5 rounded-xl shadow-xs">
    <div className="flex flex-col text-left">
      <span className="text-[10px] font-black tracking-widest uppercase opacity-90">GOBIERNO DE MÉXICO</span>
      <span className="text-xs font-black tracking-tight leading-none font-outfit">SEP — SECRETARÍA DE EDUCACIÓN PÚBLICA</span>
    </div>
  </div>
);

// Helper for category display name in Spanish
const getCategorySpanLabel = (type) => {
  switch (type) {
    case 'start':
      return 'INICIO DE CLASES';
    case 'end':
      return 'FIN DE CLASES';
    case 'holiday':
      return 'DÍA INHÁBIL';
    case 'vacation':
      return 'VACACIONES';
    case 'cte':
      return 'CONSEJO TÉCNICO ESCOLAR';
    default:
      return 'EVENTO';
  }
};

// 2026-2027 SEP Default Official Calendar Data
const SEP_DEFAULT_CALENDAR = {
  cycleName: 'Ciclo Escolar 2026 - 2027',
  totalDays: 185,
  startDate: '31 de Agosto de 2026',
  endDate: '9 de Julio de 2027',
  months: [
    {
      name: 'Agosto 2026',
      year: 2026,
      monthIndex: 7,
      daysInMonth: 31,
      startDayOffset: 6, // Sat
      highlights: [
        { day: 24, type: 'cte', label: 'Consejo Técnico Escolar (Fase Intensiva)' },
        { day: 25, type: 'cte', label: 'Consejo Técnico Escolar (Fase Intensiva)' },
        { day: 26, type: 'cte', label: 'Consejo Técnico Escolar (Fase Intensiva)' },
        { day: 27, type: 'cte', label: 'Consejo Técnico Escolar (Fase Intensiva)' },
        { day: 28, type: 'cte', label: 'Consejo Técnico Escolar (Fase Intensiva)' },
        { day: 31, type: 'start', label: 'Inicio Oficial de Clases (Ciclo Escolar 2026-2027)' }
      ]
    },
    {
      name: 'Septiembre 2026',
      year: 2026,
      monthIndex: 8,
      daysInMonth: 30,
      startDayOffset: 2, // Tue
      highlights: [
        { day: 16, type: 'holiday', label: 'Día de la Independencia de México' },
        { day: 25, type: 'cte', label: 'Consejo Técnico Escolar (CTE)' }
      ]
    },
    {
      name: 'Octubre 2026',
      year: 2026,
      monthIndex: 9,
      daysInMonth: 31,
      startDayOffset: 4, // Thu
      highlights: [
        { day: 30, type: 'cte', label: 'Consejo Técnico Escolar (CTE)' }
      ]
    },
    {
      name: 'Noviembre 2026',
      year: 2026,
      monthIndex: 10,
      daysInMonth: 30,
      startDayOffset: 0, // Sun
      highlights: [
        { day: 2, type: 'holiday', label: 'Día de Muertos' },
        { day: 16, type: 'holiday', label: 'Aniversario de la Revolución Mexicana' },
        { day: 27, type: 'cte', label: 'Consejo Técnico Escolar (CTE)' }
      ]
    },
    {
      name: 'Diciembre 2026',
      year: 2026,
      monthIndex: 11,
      daysInMonth: 31,
      startDayOffset: 2, // Tue
      highlights: [
        { day: 21, type: 'vacation', label: 'Inicio de Vacaciones de Invierno' },
        { day: 25, type: 'holiday', label: 'Navidad' }
      ]
    },
    {
      name: 'Enero 2027',
      year: 2027,
      monthIndex: 0,
      daysInMonth: 31,
      startDayOffset: 5, // Fri
      highlights: [
        { day: 1, type: 'holiday', label: 'Año Nuevo' },
        { day: 8, type: 'vacation', label: 'Fin de Vacaciones de Invierno' },
        { day: 11, type: 'start', label: 'Reinicio de Clases Regular' },
        { day: 29, type: 'cte', label: 'Consejo Técnico Escolar (CTE)' }
      ]
    },
    {
      name: 'Febrero 2027',
      year: 2027,
      monthIndex: 1,
      daysInMonth: 28,
      startDayOffset: 1, // Mon
      highlights: [
        { day: 1, type: 'holiday', label: 'Día de la Constitución Mexicana' },
        { day: 26, type: 'cte', label: 'Consejo Técnico Escolar (CTE)' }
      ]
    },
    {
      name: 'Marzo 2027',
      year: 2027,
      monthIndex: 2,
      daysInMonth: 31,
      startDayOffset: 1, // Mon
      highlights: [
        { day: 15, type: 'holiday', label: 'Natalicio de Benito Juárez' },
        { day: 22, type: 'vacation', label: 'Inicio de Vacaciones de Semana Santa' },
        { day: 26, type: 'cte', label: 'Consejo Técnico Escolar (CTE)' }
      ]
    },
    {
      name: 'Abril 2027',
      year: 2027,
      monthIndex: 3,
      daysInMonth: 30,
      startDayOffset: 4, // Thu
      highlights: [
        { day: 2, type: 'vacation', label: 'Fin de Vacaciones de Semana Santa' },
        { day: 5, type: 'start', label: 'Reinicio de Clases' },
        { day: 30, type: 'cte', label: 'Consejo Técnico Escolar (CTE)' }
      ]
    },
    {
      name: 'Mayo 2027',
      year: 2027,
      monthIndex: 4,
      daysInMonth: 31,
      startDayOffset: 6, // Sat
      highlights: [
        { day: 1, type: 'holiday', label: 'Día del Trabajo' },
        { day: 5, type: 'holiday', label: 'Batalla de Puebla' },
        { day: 15, type: 'holiday', label: 'Día del Maestro' },
        { day: 28, type: 'cte', label: 'Consejo Técnico Escolar (CTE)' }
      ]
    },
    {
      name: 'Junio 2027',
      year: 2027,
      monthIndex: 5,
      daysInMonth: 30,
      startDayOffset: 2, // Tue
      highlights: [
        { day: 25, type: 'cte', label: 'Consejo Técnico Escolar (CTE)' }
      ]
    },
    {
      name: 'Julio 2027',
      year: 2027,
      monthIndex: 6,
      daysInMonth: 31,
      startDayOffset: 4, // Thu
      highlights: [
        { day: 9, type: 'end', label: 'Fin Oficial de Clases (Ciclo Escolar 2026-2027)' },
        { day: 10, type: 'vacation', label: 'Inicio de Receso de Clases' }
      ]
    }
  ]
};

export function CalendarioSepView() {
  const { user } = useAuth();
  const [viewDate, setViewDate] = useState(() => new Date());
  const [activeTabMode, setActiveTabMode] = useState('grid'); // 'grid' or 'document'
  const [mobileDetailModal, setMobileDetailModal] = useState(null);
  const [isFullscreenImage, setIsFullscreenImage] = useState(false);

  useEffect(() => {
    let timer;
    if (mobileDetailModal) {
      timer = setTimeout(() => {
        setMobileDetailModal(null);
      }, 10000);
    }
    return () => clearTimeout(timer);
  }, [mobileDetailModal]);

  // Firestore Sync Effect
  useEffect(() => {
    const unsubCalendar = onSnapshot(doc(db, 'config', 'calendar'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data().calendarData;
        if (data) {
          setCalendarData(data);
          localStorage.setItem('checador_custom_calendar', JSON.stringify(data));
        } else {
          setCalendarData(SEP_DEFAULT_CALENDAR);
          localStorage.removeItem('checador_custom_calendar');
        }
      }
    });

    const unsubDoc = onSnapshot(doc(db, 'config', 'calendar_doc'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data().customDoc;
        if (data) {
          setCustomDoc(data);
          localStorage.setItem('checador_custom_calendar_doc', JSON.stringify(data));
        } else {
          setCustomDoc(null);
          localStorage.removeItem('checador_custom_calendar_doc');
        }
      }
    });

    const unsubSuspensions = onSnapshot(doc(db, 'config', 'calendar_suspensions'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data().suspensions;
        if (data) {
          setSuspensions(data);
          localStorage.setItem('checador_custom_calendar_suspensions', JSON.stringify(data));
        }
      }
    });

    return () => {
      unsubCalendar();
      unsubDoc();
      unsubSuspensions();
    };
  }, []);

  // Load custom structured calendar if available
  const [calendarData, setCalendarData] = useState(() => {
    try {
      const saved = localStorage.getItem('checador_custom_calendar');
      return saved ? JSON.parse(saved) : SEP_DEFAULT_CALENDAR;
    } catch (e) {
      return SEP_DEFAULT_CALENDAR;
    }
  });

  // Load custom scanned PDF / Image document if available
  const [customDoc, setCustomDoc] = useState(() => {
    try {
      const savedDoc = localStorage.getItem('checador_custom_calendar_doc');
      return savedDoc ? JSON.parse(savedDoc) : null;
    } catch (e) {
      return null;
    }
  });

  // Custom Calendar Suspensions State (Force Majeure / Contingency)
  const [suspensions, setSuspensions] = useState(() => getCustomCalendarSuspensions());
  const [showSuspensionModal, setShowSuspensionModal] = useState(false);
  const [suspensionDate, setSuspensionDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [suspensionReason, setSuspensionReason] = useState('');

  const rLower = (user?.role || user?.baseRole || '').toLowerCase().trim();
  const isDirectorOrSub = ['director', 'directora', 'subdirector', 'subdirectora'].includes(rLower);
  const isDirector = rLower === 'director' || rLower === 'directora';
  const getCurrentMonthData = () => {
    const targetYear = viewDate.getFullYear();
    const targetMonth = viewDate.getMonth();
    const existingMonth = calendarData.months.find(m => m.year === targetYear && m.monthIndex === targetMonth);
    if (existingMonth) return existingMonth;
    
    const firstDay = new Date(targetYear, targetMonth, 1);
    const lastDay = new Date(targetYear, targetMonth + 1, 0);
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    
    return {
      name: `${monthNames[targetMonth]} ${targetYear}`,
      year: targetYear,
      monthIndex: targetMonth,
      daysInMonth: lastDay.getDate(),
      startDayOffset: firstDay.getDay(),
      highlights: []
    };
  };

  const currentMonth = getCurrentMonthData();

  const handlePrevMonth = () => setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  const handleNextMonth = () => setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  
  const today = new Date();
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth();
  const todayDate = today.getDate();

  const handleAddSuspension = async (e) => {
    e.preventDefault();
    if (!suspensionDate || !suspensionReason.trim()) return;
    const updated = addCustomCalendarSuspension(suspensionDate, suspensionReason.trim());
    setSuspensions(updated);
    setSuspensionReason('');
    setShowSuspensionModal(false);
    
    try {
      await setDoc(doc(db, 'config', 'calendar_suspensions'), { suspensions: updated }, { merge: true });
    } catch(err) {
      console.error("Error saving suspension to Firestore", err);
    }
    
    alert(`🚨 Suspensión oficial por causa mayor registrada para la fecha ${suspensionDate}. Se omitirá la falta en el historial de los alumnos.`);
  };

  const handleRemoveSuspension = async (dateStr) => {
    if (window.confirm(`¿Deseas retirar la suspensión oficial para la fecha ${dateStr}?`)) {
      const updated = removeCustomCalendarSuspension(dateStr);
      setSuspensions(updated);
      try {
        await setDoc(doc(db, 'config', 'calendar_suspensions'), { suspensions: updated }, { merge: true });
      } catch(err) {
        console.error("Error removing suspension from Firestore", err);
      }
    }
  };

  const getDayHighlight = (monthData, dayNum) => {
    if (!monthData || !monthData.highlights) return null;
    return monthData.highlights.find(h => h.day === dayNum);
  };

  const getHighlightStyle = (type) => {
    switch (type) {
      case 'start':
      case 'end':
        return 'bg-blue-600 text-white font-extrabold shadow-sm';
      case 'holiday':
        return 'bg-rose-500 text-white font-extrabold shadow-sm';
      case 'vacation':
        return 'bg-emerald-500 text-white font-extrabold shadow-sm';
      case 'cte':
        return 'bg-purple-600 text-white font-extrabold shadow-sm';
      default:
        return '';
    }
  };

  // Smart Parser for Custom Calendar File (JSON, Excel, CSV, PDF, PNG, JPG)
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const fileNameLower = file.name.toLowerCase();

      // Case A: Image (PNG / JPG / JPEG) or PDF Document
      if (fileNameLower.endsWith('.pdf') || fileNameLower.endsWith('.png') || fileNameLower.endsWith('.jpg') || fileNameLower.endsWith('.jpeg')) {
        const reader = new FileReader();
        reader.onload = () => {
          const base64Data = reader.result;
          const docObj = {
            name: file.name,
            type: fileNameLower.endsWith('.pdf') ? 'pdf' : 'image',
            url: base64Data,
            uploadedAt: new Date().toLocaleDateString('es-MX')
          };

          setCustomDoc(docObj);
          localStorage.setItem('checador_custom_calendar_doc', JSON.stringify(docObj));
          setDoc(doc(db, 'config', 'calendar_doc'), { customDoc: docObj }, { merge: true }).catch(console.error);
          setActiveTabMode('document');
          alert(`📄 ¡Documento de Calendario (${file.name}) cargado y mostrado con éxito!`);
        };
        reader.readAsDataURL(file);
        return;
      }

      // Case B: Data File (JSON / XLSX / CSV)
      let importedCalendar = null;

      if (fileNameLower.endsWith('.json')) {
        const text = await file.text();
        const json = JSON.parse(text);
        if (json.months && Array.isArray(json.months)) {
          importedCalendar = json;
        } else if (Array.isArray(json)) {
          importedCalendar = JSON.parse(JSON.stringify(SEP_DEFAULT_CALENDAR));
          json.forEach(evt => {
            if (evt.mes && evt.dia && evt.descripcion) {
              const targetMonth = importedCalendar.months.find(m => m.name.toLowerCase().includes(evt.mes.toLowerCase()));
              if (targetMonth) {
                targetMonth.highlights.push({
                  day: Number(evt.dia),
                  type: (evt.tipo || 'holiday').toLowerCase(),
                  label: evt.descripcion
                });
              }
            }
          });
        }
      } else if (fileNameLower.endsWith('.xlsx') || fileNameLower.endsWith('.csv')) {
        const buffer = await file.arrayBuffer();
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);
        const worksheet = workbook.worksheets[0];

        importedCalendar = JSON.parse(JSON.stringify(SEP_DEFAULT_CALENDAR));
        importedCalendar.months.forEach(m => m.highlights = []);

        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber > 1) {
            const mesVal = String(row.getCell(1).value || '').trim();
            const diaVal = Number(row.getCell(2).value || 0);
            const descVal = String(row.getCell(3).value || '').trim();
            const tipoVal = String(row.getCell(4).value || 'holiday').toLowerCase().trim();

            if (mesVal && diaVal && descVal) {
              const targetMonth = importedCalendar.months.find(m => m.name.toLowerCase().includes(mesVal.toLowerCase()));
              if (targetMonth) {
                let mappedType = 'holiday';
                if (tipoVal.includes('inicio') || tipoVal.includes('fin') || tipoVal.includes('start') || tipoVal.includes('end')) mappedType = 'start';
                else if (tipoVal.includes('vacac') || tipoVal.includes('receso')) mappedType = 'vacation';
                else if (tipoVal.includes('consejo') || tipoVal.includes('cte')) mappedType = 'cte';

                targetMonth.highlights.push({
                  day: diaVal,
                  type: mappedType,
                  label: descVal
                });
              }
            }
          }
        });
      }

      if (importedCalendar) {
        setCalendarData(importedCalendar);
        localStorage.setItem('checador_custom_calendar', JSON.stringify(importedCalendar));
        setDoc(doc(db, 'config', 'calendar'), { calendarData: importedCalendar }, { merge: true }).catch(console.error);
        setActiveTabMode('grid');
        alert('📅 ¡Calendario Personalizado de Datos cargado con éxito!');
      } else {
        alert('⚠️ Formato de archivo no soportado. Sube un archivo PDF, Imagen (PNG/JPG), JSON o Excel.');
      }
    } catch (err) {
      console.error('Error al procesar archivo de calendario:', err);
      alert('⚠️ Error al leer el archivo. Intenta nuevamente.');
    }
  };

  // Delete Scanned Document Action
  const handleDeleteScannedDoc = async () => {
    if (window.confirm('¿Estás seguro de eliminar el documento escaneado/PDF cargado del sistema?')) {
      setCustomDoc(null);
      localStorage.removeItem('checador_custom_calendar_doc');
      await setDoc(doc(db, 'config', 'calendar_doc'), { customDoc: null }, { merge: true });
      setActiveTabMode('grid');
    }
  };

  // Reset to default SEP calendar
  const handleResetDefaultCalendar = async () => {
    if (window.confirm('¿Deseas restaurar el Calendario Escolar Oficial SEP por defecto y eliminar archivos personalizados?')) {
      setCalendarData(SEP_DEFAULT_CALENDAR);
      setCustomDoc(null);
      localStorage.removeItem('checador_custom_calendar');
      localStorage.removeItem('checador_custom_calendar_doc');
      await setDoc(doc(db, 'config', 'calendar'), { calendarData: null }, { merge: true });
      await setDoc(doc(db, 'config', 'calendar_doc'), { customDoc: null }, { merge: true });
      setActiveTabMode('grid');
    }
  };

  // Standardized PDF Export (Dark blue header #1E3A8A, logo.png, signatures)
  const handleExportPdf = async () => {
    const doc = new jsPDF();
    const logoBase64 = await getBase64ImageFromUrl(schoolLogo);

    doc.setFillColor(30, 58, 138);
    doc.rect(0, 0, 210, 26, 'F');

    if (logoBase64) {
      try { doc.addImage(logoBase64, 'PNG', 12, 3, 20, 20); } catch (e) { }
    }

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('ESCUELA PRIMARIA Sor Juana Inés de la Cruz T.V (CCT: 18DPR0087R)', 115, 12, { align: 'center' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('CALENDARIO ESCOLAR OFICIAL SEP DE EDUCACIÓN BÁSICA — 2026-2027', 115, 18, { align: 'center' });

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Ciclo Escolar: ${calendarData.cycleName}`, 14, 34);

    const rows = [];
    calendarData.months.forEach(m => {
      m.highlights.forEach(h => {
        rows.push([
          m.name,
          `${h.day} de ${m.name.split(' ')[0]}`,
          h.label,
          getCategorySpanLabel(h.type)
        ]);
      });
    });

    autoTable(doc, {
      startY: 40,
      head: [['Mes', 'Día', 'Descripción de Actividad / Suspensión Oficial', 'Categoría']],
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: [30, 58, 138], textColor: 255, fontSize: 9, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [248, 250, 252] }
    });

    const finalY = doc.lastAutoTable.finalY + 25;
    if (finalY < 260) {
      doc.setDrawColor(148, 163, 184);
      doc.line(30, finalY, 90, finalY);
      doc.line(120, finalY, 180, finalY);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text('FIRMA DEL DIRECTOR', 60, finalY + 6, { align: 'center' });
      doc.text('SELLO DE LA ESCUELA', 150, finalY + 6, { align: 'center' });
    }

    doc.save(`Calendario_Escolar_SEP_2026_2027.pdf`);
  };

  // Standardized Excel Export WITH EMBEDDED SCHOOL LOGO
  const handleExportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Calendario SEP');
    const logoBase64 = await getBase64ImageFromUrl(schoolLogo);

    // Embed School Logo Image into Excel Header
    if (logoBase64) {
      try {
        const imageId = workbook.addImage({
          base64: logoBase64,
          extension: 'png',
        });
        worksheet.addImage(imageId, {
          tl: { col: 0, row: 0 },
          ext: { width: 44, height: 44 }
        });
      } catch (e) {
        console.warn('Could not embed logo in Excel:', e);
      }
    }

    worksheet.mergeCells('A1:D1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = '   ESCUELA PRIMARIA Sor Juana Inés de la Cruz T.V (CCT: 18DPR0087R)';
    titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.mergeCells('A2:D2');
    const subCell = worksheet.getCell('A2');
    subCell.value = '   CALENDARIO ESCOLAR OFICIAL SEP DE EDUCACIÓN BÁSICA — 2026-2027';
    subCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
    subCell.alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.addRow([]);

    const headerRow = worksheet.addRow(['Mes', 'Día', 'Descripción de Actividad / Suspensión Oficial', 'Categoría']);
    headerRow.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    calendarData.months.forEach(m => {
      m.highlights.forEach(h => {
        worksheet.addRow([
          m.name,
          `${h.day} de ${m.name.split(' ')[0]}`,
          h.label,
          getCategorySpanLabel(h.type)
        ]);
      });
    });

    worksheet.columns.forEach((column) => {
      let maxLen = 15;
      column.eachCell({ includeEmpty: true }, (cell) => {
        const len = cell.value ? String(cell.value).length : 0;
        if (len > maxLen) maxLen = len;
      });
      column.width = maxLen + 4;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Calendario_Escolar_SEP_2026_2027.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner Header */}
      <div className="bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-[#2c2c2e] rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <img src={schoolLogo} alt="Logo Escuela" className="w-16 h-16 object-contain bg-white rounded-xl p-1 shadow-sm border border-slate-100" />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <SepLogo />
              <span className="bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-900/50 text-[10px] font-black px-2.5 py-0.5 rounded-lg uppercase">
                Oficial SEP
              </span>
            </div>
            <h1 className="text-xl font-black text-slate-800 dark:text-white font-outfit">
              Calendario Escolar SEP — {calendarData.cycleName}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Escuela Primaria Sor Juana Inés de la Cruz T.V (CCT: 18DPR0087R)
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center w-full sm:w-auto gap-2">
          {/* Force Majeure Suspension Button (Director / Subdirector) */}
          {isDirectorOrSub && (
            <button
              onClick={() => setShowSuspensionModal(true)}
              className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition"
              title="Registrar suspensión de clases por lluvias, clima o causa mayor"
            >
              <AlertTriangle className="w-4 h-4 text-amber-200" />
              <span>Suspensión Causa Mayor</span>
            </button>
          )}

          {/* Custom Calendar Upload Button (STRICTLY RESTRICTED TO DIRECTOR / DIRECTORA) */}
          {isDirector && (
            <label className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition cursor-pointer">
              <Upload className="w-4 h-4" />
              <span>Cargar Calendario (PDF/Imagen/Excel)</span>
              <input type="file" accept=".pdf,.png,.jpg,.jpeg,.json,.xlsx,.csv" onChange={handleFileUpload} className="hidden" />
            </label>
          )}

          {(localStorage.getItem('checador_custom_calendar') || localStorage.getItem('checador_custom_calendar_doc')) && isDirector && (
            <button
              onClick={handleResetDefaultCalendar}
              className="px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 transition"
              title="Restaurar Calendario SEP por Defecto"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restaurar Oficial</span>
            </button>
          )}

          <button
            onClick={handleExportPdf}
            className="px-4 py-2.5 rounded-xl bg-[#1E3A8A] hover:bg-blue-900 active:scale-95 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition"
          >
            <Download className="w-4 h-4" />
            <span>Descargar PDF</span>
          </button>
          <button
            onClick={handleExportExcel}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Descargar Excel</span>
          </button>
        </div>
      </div>

      {/* Mode View Switcher Tabs (if custom document uploaded) */}
      {customDoc && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-slate-100 dark:bg-slate-850 p-1.5 rounded-2xl max-w-md border border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setActiveTabMode('grid')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${activeTabMode === 'grid'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>Calendario Interactivo</span>
          </button>
          <button
            onClick={() => setActiveTabMode('document')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${activeTabMode === 'document'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
          >
            {customDoc.type === 'pdf' ? <FileText className="w-3.5 h-3.5" /> : <ImageIcon className="w-3.5 h-3.5" />}
            <span>Ver Calendario Escaneado/PDF</span>
          </button>
        </div>
      )}

      {/* VIEW MODE A: Custom Uploaded PDF or Image Document */}
      {customDoc && activeTabMode === 'document' && (
        <div className="bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-[#2c2c2e] rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold">
                {customDoc.type === 'pdf' ? <FileText className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
              </span>
              <div>
                <h3 className="text-sm font-black text-slate-800 dark:text-white font-outfit">
                  {customDoc.name}
                </h3>
                <span className="text-[10px] text-slate-400 font-medium">Cargado el {customDoc.uploadedAt}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center w-full sm:w-auto gap-2">
              <a
                href={customDoc.url}
                download={customDoc.name}
                className="px-3.5 py-2 sm:py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-center sm:justify-start gap-1.5 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Guardar Archivo</span>
              </a>

              {/* Delete Scanned Document Button (Director / Directora strictly) */}
              {isDirector && (
                <button
                  onClick={handleDeleteScannedDoc}
                  className="px-3.5 py-2 sm:py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs font-bold flex items-center justify-center sm:justify-start gap-1.5 transition"
                  title="Eliminar documento escaneado/PDF cargado"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Eliminar Documento</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex justify-center bg-slate-50 dark:bg-slate-900/60 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 min-h-[500px]">
            {customDoc.type === 'pdf' ? (
              <iframe
                src={customDoc.url}
                title="Calendario PDF Cargado"
                className="w-full h-[700px] rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm"
              />
            ) : (
              <>
                <img
                  src={customDoc.url}
                  alt="Calendario Escolar Escaneado / Imagen"
                  className="max-w-full max-h-[800px] object-contain rounded-xl border border-slate-200 dark:border-slate-700 shadow-md cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setIsFullscreenImage(true)}
                  title="Clic para ampliar y hacer zoom"
                />
                {isFullscreenImage && (
                  <FullScreenImageViewer
                    src={customDoc.url}
                    alt="Calendario Escolar Escaneado / Imagen"
                    onClose={() => setIsFullscreenImage(false)}
                  />
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* VIEW MODE B: Standard Grid & Summary Cards */}
      {(!customDoc || activeTabMode === 'grid') && (
        <>
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-[#2c2c2e] p-4 rounded-2xl shadow-xs">
              <div className="flex items-center gap-2.5 text-blue-600 dark:text-blue-400 mb-1">
                <GraduationCap className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-wider">Inicio de Clases</span>
              </div>
              <p className="text-sm font-extrabold text-slate-800 dark:text-white">{calendarData.startDate}</p>
            </div>

            <div className="bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-[#2c2c2e] p-4 rounded-2xl shadow-xs">
              <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400 mb-1">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-wider">Fin de Clases</span>
              </div>
              <p className="text-sm font-extrabold text-slate-800 dark:text-white">{calendarData.endDate}</p>
            </div>

            <div className="bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-[#2c2c2e] p-4 rounded-2xl shadow-xs">
              <div className="flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400 mb-1">
                <Snowflake className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-wider">Vacaciones Invierno</span>
              </div>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">21 Dic 2026 — 8 Ene 2027</p>
            </div>

            <div className="bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-[#2c2c2e] p-4 rounded-2xl shadow-xs">
              <div className="flex items-center gap-2.5 text-amber-600 dark:text-amber-400 mb-1">
                <Sun className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-wider">Semana Santa</span>
              </div>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">22 Mar 2027 — 2 Abr 2027</p>
            </div>
          </div>

          {/* Main Interactive Calendar Section */}
          <div className="bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-[#2c2c2e] rounded-2xl p-6 shadow-sm">
            {/* Month Navigation & Header */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between w-full sm:w-auto order-2 sm:order-1">
                <button onClick={handlePrevMonth} className="px-3 sm:px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold transition hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300">
                  &larr; <span className="hidden sm:inline">Mes Anterior</span>
                </button>
                <button onClick={handleNextMonth} className="px-3 sm:px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold transition hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 sm:hidden block">
                  <span className="hidden sm:inline">Mes Siguiente</span> &rarr;
                </button>
              </div>
              
              <div className="text-center order-1 sm:order-2 w-full sm:w-auto">
                <h2 className="text-lg sm:text-xl font-black text-slate-800 dark:text-white font-outfit leading-tight">
                  {currentMonth.name}
                </h2>
                <span className="text-[10px] sm:text-xs text-slate-400 font-semibold block mt-0.5">
                  {currentMonth.highlights.length} eventos señalados
                </span>
              </div>
              
              <button onClick={handleNextMonth} className="px-3 sm:px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold transition hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hidden sm:block order-3">
                <span className="hidden sm:inline">Mes Siguiente</span> &rarr;
              </button>
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold mb-2">
              {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => (
                <div key={d} className="py-2 text-slate-400 font-extrabold uppercase text-[10px]">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {/* Empty Days Offset */}
              {Array.from({ length: currentMonth.startDayOffset || 0 }).map((_, i) => (
                <div key={`offset-${i}`} className="h-12 rounded-xl bg-slate-50/50 dark:bg-slate-900/20" />
              ))}

              {/* Actual Days */}
              {Array.from({ length: currentMonth.daysInMonth || 30 }).map((_, i) => {
                const dayNum = i + 1;
                const highlight = getDayHighlight(currentMonth, dayNum);
                const isToday = currentMonth.year === todayYear && currentMonth.monthIndex === todayMonth && dayNum === todayDate;
                
                let highlightClass = highlight ? getHighlightStyle(highlight.type) : 'bg-slate-50 dark:bg-slate-850/50 text-slate-700 dark:text-slate-200 border border-slate-100 dark:border-slate-800/60';
                
                if (isToday && !highlight) {
                  highlightClass = 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500 shadow-md border-transparent';
                } else if (isToday && highlight) {
                  highlightClass += ' ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-[#1c1c1e]';
                }

                return (
                  <div
                    key={dayNum}
                    title={highlight ? `${dayNum} de ${currentMonth.name}: ${highlight.label}${isToday ? ' (Hoy)' : ''}` : `${dayNum} de ${currentMonth.name}${isToday ? ' (Hoy)' : ''}`}
                    onClick={() => {
                      if (highlight) {
                        setMobileDetailModal({
                          day: dayNum,
                          month: currentMonth.name,
                          label: highlight.label,
                          type: highlight.type
                        });
                      }
                    }}
                    className={`min-h-[3.5rem] h-full rounded-xl p-1 flex flex-col justify-start items-center gap-0.5 transition relative ${highlight ? 'cursor-pointer' : ''} ${highlightClass}`}
                  >
                    <span className="text-xs font-black">{dayNum}</span>
                    {highlight && (
                      <span className="hidden md:block text-[7px] sm:text-[8px] font-black leading-[1.1] sm:leading-none w-full text-center px-0.5 break-words">
                        {getCategorySpanLabel(highlight.type)}
                      </span>
                    )}
                    {isToday && !highlight && (
                      <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 mt-0.5 uppercase tracking-wider">Hoy</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Highlights Legend */}
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Simbología del Calendario SEP:</h4>
              <div className="flex flex-wrap items-center gap-4 text-xs font-bold">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-blue-600" />
                  <span className="text-slate-700 dark:text-slate-300">Inicio / Fin de Clases</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-emerald-500" />
                  <span className="text-slate-700 dark:text-slate-300">Periodo Vacacional SEP</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-rose-500" />
                  <span className="text-slate-700 dark:text-slate-300">Día Inhábil (Suspensión Oficial)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-purple-600" />
                  <span className="text-slate-700 dark:text-slate-300">Consejo Técnico Escolar (CTE)</span>
                </div>
              </div>
            </div>

            {/* Highlights List for Active Month */}
            {currentMonth.highlights.length > 0 && (
              <div className="mt-6 space-y-2">
                <h4 className="text-xs font-black text-slate-800 dark:text-white font-outfit uppercase">
                  Eventos señalados en {currentMonth.name}:
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {currentMonth.highlights.map(h => (
                    <div key={h.day} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850/60 border border-slate-100 dark:border-slate-800 text-xs flex items-center gap-2">
                      <span className="font-mono font-extrabold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-1 rounded-lg border border-blue-200/50">
                        Día {h.day}
                      </span>
                      <span className="font-semibold text-slate-700 dark:text-slate-200">{h.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Force Majeure / Contingency Suspension Modal */}
      {showSuspensionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-[#182234] rounded-2xl w-full max-w-md border border-gray-200 dark:border-gray-700 shadow-2xl p-6 relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-amber-500 font-extrabold text-sm font-outfit">
                <AlertTriangle className="w-5 h-5" />
                <span>Suspensión por Causa Mayor / Fuerza Mayor</span>
              </div>
              <button
                onClick={() => setShowSuspensionModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 mb-4 leading-relaxed font-medium">
              Registre la fecha y motivo de suspensión de labores por causa mayor (ej. contingencia climatológica, lluvias intensas, emergencias). El sistema <strong>omitirá automáticamente las faltas</strong> en los expedientes de todos los alumnos para esa fecha.
            </p>

            <form onSubmit={handleAddSuspension} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  Fecha de Suspensión Oficial
                </label>
                <input
                  type="date"
                  required
                  value={suspensionDate}
                  onChange={(e) => setSuspensionDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  Motivo o Causa de Suspensión
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Suspensión por lluvias intensas / Alerta Climatológica"
                  value={suspensionReason}
                  onChange={(e) => setSuspensionReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium dark:text-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSuspensionModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md"
                >
                  Registrar Suspensión Oficial
                </button>
              </div>
            </form>

            {/* List of Active Suspensions */}
            {suspensions.length > 0 && (
              <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Suspensiones Oficiales Registradas ({suspensions.length}):
                </h4>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {suspensions.map((s) => (
                    <div key={s.dateStr} className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-amber-700 dark:text-amber-400">{s.dateStr}</span>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300">{s.reason}</p>
                      </div>
                      <button
                        onClick={() => handleRemoveSuspension(s.dateStr)}
                        className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg transition"
                        title="Retirar suspensión"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile Day Detail Modal */}
      {mobileDetailModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
          onClick={() => setMobileDetailModal(null)}
        >
          <div
            className={`w-full max-w-sm rounded-3xl p-8 relative shadow-2xl ${getHighlightStyle(mobileDetailModal.type)} text-center animate-scaleIn`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setMobileDetailModal(null)}
              className="absolute right-4 top-4 opacity-70 hover:opacity-100 p-2 bg-black/10 rounded-full transition-all active:scale-95"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4 backdrop-blur-md shadow-inner">
              <span className="text-4xl font-black drop-shadow-sm">{mobileDetailModal.day}</span>
            </div>
            <h3 className="text-xl font-black mb-1 opacity-90">{mobileDetailModal.month}</h3>
            <p className="text-sm font-bold opacity-80 uppercase tracking-widest mb-4">
              {getCategorySpanLabel(mobileDetailModal.type)}
            </p>
            <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm">
              <p className="text-lg font-black leading-snug drop-shadow-sm">
                {mobileDetailModal.label}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
