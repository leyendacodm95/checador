/**
 * Utilidades para CURP y cálculo de edad al corte de 1 de Septiembre
 */

export const CURP_REGEX = /^[A-Z]{4}[0-9]{6}[HM][A-Z]{5}[0-9A-Z]{2}$/;

/**
 * Valida si una cadena cumple con la estructura oficial de 18 caracteres de CURP.
 */
export const validarCURP = (curp) => {
  if (!curp) return false;
  return CURP_REGEX.test(curp.trim().toUpperCase());
};

/**
 * Calcula la edad del alumno al 1 de septiembre del año actual (o año especificado).
 * $corte = new DateTime(date('Y').'-09-01');
 * $edad_corte = $corte->diff(new DateTime($fecha_nacimiento))->y;
 */
export const calcularEdadCorte = (fechaNacimientoStr, anioCorte = new Date().getFullYear()) => {
  if (!fechaNacimientoStr) return null;
  
  const corte = new Date(anioCorte, 8, 1); // Mes 8 es Septiembre (0-indexed)
  const nacimiento = new Date(fechaNacimientoStr + 'T00:00:00');
  
  if (isNaN(nacimiento.getTime())) return null;
  
  let edad = corte.getFullYear() - nacimiento.getFullYear();
  const mesDiff = corte.getMonth() - nacimiento.getMonth();
  
  if (mesDiff < 0 || (mesDiff === 0 && corte.getDate() < nacimiento.getDate())) {
    edad--;
  }
  
  return edad;
};

/**
 * Normaliza cadenas quitando acentos y convirtiendo a mayúsculas.
 */
const normalizar = (str) => {
  if (!str) return '';
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z\s]/g, "");
};

/**
 * Obtiene la primera vocal interna de una palabra (excluyendo la primera letra).
 */
const getPrimeraVocalInterna = (palabra) => {
  if (!palabra || palabra.length <= 1) return 'X';
  const sub = palabra.substring(1);
  const match = sub.match(/[AEIOU]/);
  return match ? match[0] : 'X';
};

/**
 * Obtiene la primera consonante interna de una palabra (excluyendo la primera letra).
 */
const getPrimeraConsonanteInterna = (palabra) => {
  if (!palabra || palabra.length <= 1) return 'X';
  const sub = palabra.substring(1);
  const match = sub.match(/[BCDFGHJKLMNÑPQRSTVWXYZ]/);
  if (!match) return 'X';
  return match[0] === 'Ñ' ? 'X' : match[0];
};

/**
 * Generador Tentativo de CURP con IA (idea pendiente de aprobación).
 * Genera una CURP sugerida a partir del nombre completo, fecha de nacimiento, sexo y entidad.
 */
export const sugerirCurpIA = ({ nombreCompleto, fechaNacimiento, sexo = 'H', estado = 'NT' }) => {
  if (!nombreCompleto || !fechaNacimiento) {
    return { curp: '', error: 'Se requiere nombre completo y fecha de nacimiento.' };
  }

  const partes = normalizar(nombreCompleto).trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return { curp: '', error: 'Nombre no válido' };

  let primerNombre = partes[0];
  let primerApellido = '';
  let segundoApellido = '';

  // Nombres comunes como MARIA o JOSE si hay segundo nombre
  if ((primerNombre === 'MARIA' || primerNombre === 'JOSE') && partes.length > 3) {
    primerNombre = partes[1];
    primerApellido = partes[2];
    segundoApellido = partes[3] || '';
  } else if (partes.length >= 3) {
    primerNombre = partes[0];
    primerApellido = partes[1];
    segundoApellido = partes[2];
  } else if (partes.length === 2) {
    primerNombre = partes[0];
    primerApellido = partes[1];
    segundoApellido = '';
  } else {
    primerNombre = partes[0];
    primerApellido = 'X';
    segundoApellido = 'X';
  }

  // 1. Letras iniciales (4 caracteres)
  const l1 = primerApellido.charAt(0) || 'X';
  const l2 = getPrimeraVocalInterna(primerApellido);
  const l3 = segundoApellido ? segundoApellido.charAt(0) : 'X';
  const l4 = primerNombre.charAt(0) || 'X';

  // Filtro de palabras inconvenientes
  let pos1_4 = `${l1}${l2}${l3}${l4}`;
  const palabrasInconvenientes = ['BACA','BAKA','BUEI','BUEY','CACA','CACO','CAGA','CAGO','CAKA','CAKO','COGE','COGI','COJA','COJE','COJI','COJO','CULO','FETO','GUEY','JOTO','KACA','KACO','KAGA','KAGO','KOGE','KOJO','KULO','MAME','MAMO','MEAR','MEON','MOCO','MOKO','MULA','MULO','NACA','NACO','PEDA','PEDO','PENE','PIPI','PUCO','PULA','RATON','ROBA','ROBO','RUIN','SENI','TETA','VACA','VAGA','VAGO','VUEI','VUEY','WUEI','WUEY'];
  if (palabrasInconvenientes.includes(pos1_4)) {
    pos1_4 = `${l1}X${l3}${l4}`;
  }

  // 2. Fecha de nacimiento YYMMDD (6 caracteres)
  const f = new Date(fechaNacimiento + 'T00:00:00');
  const yy = String(f.getFullYear()).slice(-2);
  const mm = String(f.getMonth() + 1).padStart(2, '0');
  const dd = String(f.getDate()).padStart(2, '0');
  const pos5_10 = `${yy}${mm}${dd}`;

  // 3. Sexo (1 caracter): H / M
  const pos11 = (sexo || 'H').toUpperCase() === 'M' ? 'M' : 'H';

  // 4. Entidad Federativa (2 caracteres): Default 'NT' (Nayarit)
  const pos12_13 = (estado || 'NT').toUpperCase().substring(0, 2);

  // 5. Consonantes internas (3 caracteres)
  const c1 = getPrimeraConsonanteInterna(primerApellido);
  const c2 = getPrimeraConsonanteInterna(segundoApellido);
  const c3 = getPrimeraConsonanteInterna(primerNombre);
  const pos14_16 = `${c1}${c2}${c3}`;

  // 6. Homoclave tentativa (2 caracteres): 'A1'
  const pos17_18 = 'A1';

  const curpTentativa = `${pos1_4}${pos5_10}${pos11}${pos12_13}${pos14_16}${pos17_18}`;

  return {
    curp: curpTentativa,
    curp_por_validar: 1,
    success: true
  };
};
