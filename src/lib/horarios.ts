// Horario de la boutique para recoger pedidos (spec 06 · R-PED-09).
// Atiende de lunes a viernes; el fin de semana no hay recolección.
// El texto se puede cambiar sin tocar código con NEXT_PUBLIC_HORARIO_TIENDA.

export const HORARIO_TIENDA = {
  dias: "lunes a viernes",
  apertura: "9:00",
  cierre: "16:00",
} as const;

const PERSONALIZADO = (process.env.NEXT_PUBLIC_HORARIO_TIENDA ?? "").trim();

/** Texto del horario que ve la clienta al elegir "recoger en tienda". */
export function textoHorarioTienda(): string {
  if (PERSONALIZADO) return PERSONALIZADO;
  return `De ${HORARIO_TIENDA.dias}, de ${HORARIO_TIENDA.apertura} a ${HORARIO_TIENDA.cierre} h.`;
}
