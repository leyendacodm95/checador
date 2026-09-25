// Helper library for SEP Official School Calendar in Mexico
// Schedule: Monday to Friday 08:00 AM - 12:30 PM. Delay starts at 08:20 AM.

export const SCHOOL_SCHEDULE = {
  entryTime: '08:00',
  tardyThresholdTime: '08:20', // Delay starts at 08:20 AM
  exitTime: '12:30',
  tardyLimitMinutes: 8 * 60 + 20, // 500 minutes from midnight
};

// Local storage management for Director Custom Suspensions (Force Majeure / Emergency)
export function getCustomCalendarSuspensions() {
  try {
    const saved = localStorage.getItem('checador_custom_calendar_suspensions');
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    return [];
  }
}

export function addCustomCalendarSuspension(dateStr, reason) {
  const current = getCustomCalendarSuspensions();
  const updated = [
    ...current.filter(item => item.dateStr !== dateStr),
    { dateStr, reason: reason || 'Suspensión por Causa Mayor / Fuerza Mayor', timestamp: Date.now() }
  ];
  localStorage.setItem('checador_custom_calendar_suspensions', JSON.stringify(updated));
  return updated;
}

export function removeCustomCalendarSuspension(dateStr) {
  const current = getCustomCalendarSuspensions();
  const updated = current.filter(item => item.dateStr !== dateStr);
  localStorage.setItem('checador_custom_calendar_suspensions', JSON.stringify(updated));
  return updated;
}

// Check if a date is a valid SEP school day or a holiday/vacation in Mexico

export function getOfficialSepSuspensionsForYear(startYear) {
  const suspensions = [];
  const start = new Date(startYear, 7, 1); // Aug 1
  const end = new Date(startYear + 1, 6, 31); // Jul 31

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue; // Skip weekends

    const year = d.getFullYear();
    const month = d.getMonth();
    const day = d.getDate();

    let reason = null;

    // 1. Summer Vacation (Mid July - August 30)
    if ((month === 6 && day >= 16) || (month === 7 && day < 31)) {
      reason = 'Vacaciones de Fin de Ciclo Escolar (Verano SEP)';
    }
    // 2. Winter Vacation (Dec 19 - Jan 8)
    else if ((month === 11 && day >= 19) || (month === 0 && day <= 8)) {
      reason = 'Vacaciones de Invierno (SEP)';
    }
    // 3. Easter / Holy Week Vacation (Semana Santa - April)
    else if (month === 3 && day >= 6 && day <= 17) {
      reason = 'Vacaciones de Semana Santa (SEP)';
    }
    // 4. Mexican Official Holidays & SEP Suspensions
    else if (month === 0 && day === 1) reason = 'Año Nuevo (Feriado Oficial)';
    else if (month === 1 && day === 5) reason = 'Día de la Constitución Mexicana';
    else if (month === 2 && day === 21) reason = 'Natalicio de Benito Juárez';
    else if (month === 4 && day === 1) reason = 'Día del Trabajo (Feriado Oficial)';
    else if (month === 4 && day === 5) reason = 'Batalla de Puebla';
    else if (month === 4 && day === 15) reason = 'Día del Maestro (Suspensión SEP)';
    else if (month === 8 && day === 16) reason = 'Día de la Independencia de México';
    else if (month === 10 && day === 2) reason = 'Día de Muertos (Suspensión SEP)';
    else if (month === 10 && day === 20) reason = 'Aniversario de la Revolución Mexicana';
    else if (month === 11 && day === 25) reason = 'Navidad (Feriado Oficial)';
    // 5. CTE
    else {
      const isLastFriday = dayOfWeek === 5 && (day + 7 > new Date(year, month + 1, 0).getDate());
      if (isLastFriday && month !== 6 && month !== 7 && month !== 11) {
        reason = 'Consejo Técnico Escolar (CTE SEP)';
      }
    }

    if (reason) {
      const isoDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      suspensions.push({ dateStr: isoDateStr, reason, timestamp: Date.now() });
    }
  }
  return suspensions;
}

export function checkSepSchoolDay(dateInput = new Date()) {
  const date = new Date(dateInput);
  const dayOfWeek = date.getDay(); // 0 = Sun, 6 = Sat

  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return { isSchoolDay: false, reason: 'Fin de Semana (Sábado/Domingo)' };
  }

  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed (0 = Jan, 11 = Dec)
  const day = date.getDate();

  // Format YYYY-MM-DD for custom suspension checks
  const yyyy = year;
  const mm = String(month + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  const isoDateStr = `${yyyy}-${mm}-${dd}`;

  // 0. Director Custom Suspensions Check (Emergency / Force Majeure)
  const customSuspensions = getCustomCalendarSuspensions();
  const customMatch = customSuspensions.find(item => item.dateStr === isoDateStr);
  if (customMatch) {
    return { isSchoolDay: false, reason: `Suspensión Oficial por Causa Mayor (${customMatch.reason})` };
  }

  // 1. Summer Vacation (Mid July - August 30)
  // Official start of classes for 2026-2027 is August 31, 2026
  if ((month === 6 && day >= 16) || (month === 7 && day < 31)) {
    return { isSchoolDay: false, reason: 'Vacaciones de Fin de Ciclo Escolar (Verano SEP)' };
  }

  // 2. Winter Vacation (Dec 19 - Jan 8)
  if ((month === 11 && day >= 19) || (month === 0 && day <= 8)) {
    return { isSchoolDay: false, reason: 'Vacaciones de Invierno (SEP)' };
  }

  // 3. Easter / Holy Week Vacation (Semana Santa - April)
  if (month === 3 && day >= 6 && day <= 17) {
    return { isSchoolDay: false, reason: 'Vacaciones de Semana Santa (SEP)' };
  }

  // 4. Mexican Official Holidays & SEP Suspensions
  if (month === 0 && day === 1) return { isSchoolDay: false, reason: 'Año Nuevo (Feriado Oficial)' };
  if (month === 1 && day === 5) return { isSchoolDay: false, reason: 'Día de la Constitución Mexicana' };
  if (month === 2 && day === 21) return { isSchoolDay: false, reason: 'Natalicio de Benito Juárez' };
  if (month === 4 && day === 1) return { isSchoolDay: false, reason: 'Día del Trabajo (Feriado Oficial)' };
  if (month === 4 && day === 5) return { isSchoolDay: false, reason: 'Batalla de Puebla' };
  if (month === 4 && day === 15) return { isSchoolDay: false, reason: 'Día del Maestro (Suspensión SEP)' };
  if (month === 8 && day === 16) return { isSchoolDay: false, reason: 'Día de la Independencia de México' };
  if (month === 10 && day === 2) return { isSchoolDay: false, reason: 'Día de Muertos (Suspensión SEP)' };
  if (month === 10 && day === 20) return { isSchoolDay: false, reason: 'Aniversario de la Revolución Mexicana' };
  if (month === 11 && day === 25) return { isSchoolDay: false, reason: 'Navidad (Feriado Oficial)' };

  // 5. CTE (Consejo Técnico Escolar - Last Friday of every month)
  const isLastFriday = dayOfWeek === 5 && (day + 7 > new Date(year, month + 1, 0).getDate());
  if (isLastFriday && month !== 6 && month !== 7 && month !== 11) {
    return { isSchoolDay: false, reason: 'Consejo Técnico Escolar (CTE SEP)' };
  }

  return { isSchoolDay: true, reason: 'Día Hábil Escolar' };
}

// Calculate status and delay minutes starting from 8:20 AM
export function calculateAttendanceStatus(timeStr) {
  if (!timeStr || timeStr === '—') {
    return { estado: 'AUSENTE', minutosRetraso: 0 };
  }

  const [hours, minutes] = timeStr.split(':').map(Number);
  const currentTotalMin = (hours || 0) * 60 + (minutes || 0);

  // Threshold: 08:20 AM (500 minutes)
  const thresholdMin = 8 * 60 + 20;

  if (currentTotalMin >= thresholdMin) {
    const delayMinutes = currentTotalMin - thresholdMin;
    return {
      estado: 'TARDÍO',
      minutosRetraso: delayMinutes
    };
  }

  return {
    estado: 'PRESENTE',
    minutosRetraso: 0
  };
}
