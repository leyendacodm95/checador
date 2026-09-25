export const initialStats = {
  totalAlumnos: 13,
  totalDocentes: 6,
  totalGrupos: 6,
  asistenciaHoy: '94%'
};

export const initialTeachers = {
  '1°-A': {
    nombre: 'Profesor Juan Pérez',
    telefono: '555-234-5678',
    email: 'juan.perez@escuela.edu.mx',
    cedula: '12893475',
    observaciones: 'Coordinadora de 1er Grado',
    retardosAcumulados: 5
  },
  '2°-A': {
    nombre: 'Profesor Carlos Santana',
    telefono: '555-456-7890',
    email: 'carlos.santana@escuela.edu.mx',
    cedula: '47382910',
    observaciones: '—',
    retardosAcumulados: 1
  },
  '3°-A': {
    nombre: 'Profesora Patricia Solís',
    telefono: '555-789-0123',
    email: 'patricia.solis@escuela.edu.mx',
    cedula: '38291047',
    observaciones: '—',
    retardosAcumulados: 0
  },
  '4°-A': {
    nombre: 'Profesor Gabriel Mendoza',
    telefono: '555-012-3456',
    email: 'gabriel.mendoza@escuela.edu.mx',
    cedula: '58493021',
    observaciones: '—',
    retardosAcumulados: 0
  },
  '5°-A': {
    nombre: 'Profesora Teresa Blanco',
    telefono: '555-345-6789',
    email: 'teresa.blanco@escuela.edu.mx',
    cedula: '47382019',
    observaciones: '—',
    retardosAcumulados: 0
  },
  '6°-A': {
    nombre: 'Profesor Ricardo Tamayo',
    telefono: '555-678-9012',
    email: 'ricardo.tamayo@escuela.edu.mx',
    cedula: '67483920',
    observaciones: '—',
    retardosAcumulados: 0
  }
};

export const initialStudents = [
  // 1° Grado
  {
    id: '1',
    nombre: 'María Pérez',
    grado: '1°',
    grupo: 'A',
    horaEntrada: '13:15',
    estado: 'PRESENTE',
    observaciones: '—',
    retardosAcumulados: 2,
    qrCode: 'STUDENT-MP-001'
  },
  {
    id: '2',
    nombre: 'Juan Gómez',
    grado: '1°',
    grupo: 'A',
    horaEntrada: '—',
    estado: 'AUSENTE',
    observaciones: 'Justificante médico',
    retardosAcumulados: 0,
    qrCode: 'STUDENT-JG-002'
  },
  {
    id: '3',
    nombre: 'Diego Fernández',
    grado: '1°',
    grupo: 'A',
    horaEntrada: '13:02',
    estado: 'PRESENTE',
    observaciones: '—',
    retardosAcumulados: 1,
    qrCode: 'STUDENT-DF-003'
  },

  // 2° Grado
  {
    id: '4',
    nombre: 'Ana Martínez',
    grado: '2°',
    grupo: 'A',
    horaEntrada: '13:30',
    estado: 'TARDÍO',
    observaciones: '—',
    retardosAcumulados: 4,
    qrCode: 'STUDENT-AM-004'
  },
  {
    id: '5',
    nombre: 'Carlos Ruiz',
    grado: '2°',
    grupo: 'A',
    horaEntrada: '13:10',
    estado: 'PRESENTE',
    observaciones: '—',
    retardosAcumulados: 3,
    qrCode: 'STUDENT-CR-005'
  },

  // 3° Grado
  {
    id: '6',
    nombre: 'Luis Rodríguez',
    grado: '3°',
    grupo: 'A',
    horaEntrada: '13:05',
    estado: 'PRESENTE',
    observaciones: '—',
    retardosAcumulados: 1,
    qrCode: 'STUDENT-LR-006'
  },
  {
    id: '7',
    nombre: 'Sofía López',
    grado: '3°',
    grupo: 'A',
    horaEntrada: '13:25',
    estado: 'TARDÍO',
    observaciones: 'Tráfico en vía principal',
    retardosAcumulados: 5,
    qrCode: 'STUDENT-SL-007'
  },

  // 4° Grado
  {
    id: '8',
    nombre: 'Valeria Cordero',
    grado: '4°',
    grupo: 'A',
    horaEntrada: '13:00',
    estado: 'PRESENTE',
    observaciones: '—',
    qrCode: 'STUDENT-VC-008'
  },
  {
    id: '9',
    nombre: 'Gabriel Soto',
    grado: '4°',
    grupo: 'A',
    horaEntrada: '13:12',
    estado: 'PRESENTE',
    observaciones: '—',
    qrCode: 'STUDENT-GS-009'
  },

  // 5° Grado
  {
    id: '10',
    nombre: 'Santiago Méndez',
    grado: '5°',
    grupo: 'A',
    horaEntrada: '13:03',
    estado: 'PRESENTE',
    observaciones: '—',
    qrCode: 'STUDENT-SM-010'
  },
  {
    id: '11',
    nombre: 'Camila Torres',
    grado: '5°',
    grupo: 'A',
    horaEntrada: '13:14',
    estado: 'PRESENTE',
    observaciones: '—',
    qrCode: 'STUDENT-CT-011'
  },

  // 6° Grado
  {
    id: '12',
    nombre: 'Mateo Ramírez',
    grado: '6°',
    grupo: 'A',
    horaEntrada: '12:58',
    estado: 'PRESENTE',
    observaciones: '—',
    qrCode: 'STUDENT-MR-012'
  },
  {
    id: '13',
    nombre: 'Isabella Vargas',
    grado: '6°',
    grupo: 'A',
    horaEntrada: '13:08',
    estado: 'PRESENTE',
    observaciones: '—',
    qrCode: 'STUDENT-IV-013'
  }
];

export const initialExpedienteDocs = [
  {
    id: 'doc-1',
    documento: 'Formación académica',
    estado: 'SUBIDO',
    fechaActualizacion: '2026-07-10',
    url: '#'
  },
  {
    id: 'doc-2',
    documento: 'Talón de cheque',
    estado: 'PENDIENTE',
    fechaActualizacion: '—',
    url: null
  },
  {
    id: 'doc-3',
    documento: 'Constancia fiscal',
    estado: 'SUBIDO',
    fechaActualizacion: '2026-06-15',
    url: '#'
  },
  {
    id: 'doc-4',
    documento: 'Comprobante de domicilio',
    estado: 'REVISAR',
    fechaActualizacion: '2026-07-20',
    url: '#'
  }
];
