// Validaciones de cuentas y direcciones (spec 06). Puras, para usarse en formularios y pruebas.
export const ESTADOS_MX = [
  "Aguascalientes", "Baja California", "Baja California Sur", "Campeche", "Chiapas", "Chihuahua",
  "Ciudad de México", "Coahuila", "Colima", "Durango", "Estado de México", "Guanajuato", "Guerrero",
  "Hidalgo", "Jalisco", "Michoacán", "Morelos", "Nayarit", "Nuevo León", "Oaxaca", "Puebla",
  "Querétaro", "Quintana Roo", "San Luis Potosí", "Sinaloa", "Sonora", "Tabasco", "Tamaulipas",
  "Tlaxcala", "Veracruz", "Yucatán", "Zacatecas",
] as const;

/** Devuelve 10 dígitos o null. Acepta +52, 52, espacios, guiones y paréntesis. */
export function normalizarTelefono(s: string | null | undefined): string | null {
  const d = (s ?? "").replace(/\D/g, "");
  if (d.length === 10) return d;
  if (d.length === 12 && d.startsWith("52")) return d.slice(2);
  return null;
}

export function correoValido(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim());
}

export type DireccionForm = {
  alias: string; nombre: string; apellidos: string; telefono: string; calle: string; interior: string;
  colonia: string; ciudad: string; estado: string; cp: string; referencias: string; es_principal: boolean;
};

export const DIRECCION_VACIA: DireccionForm = {
  alias: "", nombre: "", apellidos: "", telefono: "", calle: "", interior: "", colonia: "",
  ciudad: "", estado: "", cp: "", referencias: "", es_principal: false,
};

export type ResultadoValidacion<T> = { ok: true; datos: T } | { ok: false; errores: Record<string, string> };

export function validarDireccion(d: DireccionForm): ResultadoValidacion<DireccionForm> {
  const errores: Record<string, string> = {};
  const t = (s: string) => s.trim();
  if (!t(d.nombre)) errores.nombre = "Escribe el nombre de quien recibe";
  const tel = normalizarTelefono(d.telefono);
  if (!tel) errores.telefono = "Escribe un teléfono de 10 dígitos";
  if (!t(d.calle)) errores.calle = "Escribe la calle y el número";
  if (!t(d.colonia)) errores.colonia = "Escribe la colonia";
  if (!t(d.ciudad)) errores.ciudad = "Escribe la ciudad o municipio";
  if (!(ESTADOS_MX as readonly string[]).includes(d.estado)) errores.estado = "Elige un estado";
  if (!/^\d{5}$/.test(t(d.cp))) errores.cp = "El código postal tiene 5 dígitos";
  if (Object.keys(errores).length > 0) return { ok: false, errores };
  return {
    ok: true,
    datos: {
      alias: t(d.alias), nombre: t(d.nombre), apellidos: t(d.apellidos), telefono: tel!, calle: t(d.calle),
      interior: t(d.interior), colonia: t(d.colonia), ciudad: t(d.ciudad), estado: d.estado, cp: t(d.cp),
      referencias: t(d.referencias), es_principal: d.es_principal,
    },
  };
}

export type RegistroForm = { nombre: string; apellidos: string; email: string; telefono: string; password: string; acepta_privacidad: boolean };

export function validarRegistro(f: RegistroForm): ResultadoValidacion<{ telefono: string }> {
  const errores: Record<string, string> = {};
  if (!f.nombre.trim()) errores.nombre = "Escribe tu nombre";
  if (!correoValido(f.email)) errores.email = "Escribe un correo válido";
  const tel = normalizarTelefono(f.telefono);
  if (!tel) errores.telefono = "Escribe un teléfono de 10 dígitos";
  if (f.password.length < 8) errores.password = "La contraseña debe tener al menos 8 caracteres";
  if (!f.acepta_privacidad) errores.acepta_privacidad = "Debes aceptar el aviso de privacidad";
  if (Object.keys(errores).length > 0) return { ok: false, errores };
  return { ok: true, datos: { telefono: tel! } };
}

/** Solo rutas internas (evita redirecciones a sitios externos). */
export function sanearNext(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\") || /[\r\n]/.test(next)) return null;
  return next;
}

/** "Reforma 100, Int. 4, Col. Juárez, CP 06600, Ciudad de México, Ciudad de México" */
export function formatearDireccion(d: { calle: string; interior?: string | null; colonia: string; ciudad: string; estado: string; cp: string }): string {
  return [d.calle, d.interior ? `Int. ${d.interior}` : null, `Col. ${d.colonia}`, `CP ${d.cp}`, d.ciudad, d.estado].filter(Boolean).join(", ");
}

/** Convierte textos vacíos en null para guardar en la base de datos. */
export function opcional(s: string): string | null {
  const t = s.trim();
  return t === "" ? null : t;
}
