// Clases reutilizables (Tailwind). text-base evita el zoom automático en iPhone.
export const input = "w-full border border-neutral-300 rounded-lg px-3 py-2 bg-white text-base";
export const btn = "inline-flex items-center justify-center rounded-lg bg-black text-white px-4 py-2 text-sm font-medium disabled:opacity-50 cursor-pointer";
export const btnSec = "inline-flex items-center justify-center rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium disabled:opacity-50 cursor-pointer";
export const btnPeligro = "inline-flex items-center justify-center rounded-lg border border-red-300 bg-white text-red-700 px-4 py-2 text-sm font-medium disabled:opacity-50 cursor-pointer";
export const card = "bg-white rounded-xl border border-neutral-200";
export const etiqueta = "text-sm text-neutral-600";
export const th = "text-left font-medium text-neutral-500 px-3 py-2 whitespace-nowrap";
export const td = "px-3 py-2 whitespace-nowrap";

// Estilos de la tienda pública (marca negro / marfil / dorado)
export const t = {
  input: "w-full border border-neutral-300 bg-white px-3 py-3 text-base focus:border-oro rounded-none",
  etiqueta: "block text-xs uppercase tracking-[0.15em] text-neutral-600 mb-1.5",
  btnOro: "inline-flex items-center justify-center bg-oro px-7 py-3.5 text-xs font-semibold uppercase tracking-[0.2em] text-negro transition hover:bg-oro-claro disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer",
  btnNegro: "inline-flex items-center justify-center bg-negro px-7 py-3.5 text-xs font-semibold uppercase tracking-[0.2em] text-marfil transition hover:bg-carbon disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer",
  btnLinea: "inline-flex items-center justify-center border border-negro px-7 py-3.5 text-xs font-semibold uppercase tracking-[0.2em] text-negro transition hover:bg-negro hover:text-marfil disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer",
  btnLineaClaro: "inline-flex items-center justify-center border border-marfil/70 px-7 py-3.5 text-xs font-semibold uppercase tracking-[0.2em] text-marfil transition hover:bg-marfil hover:text-negro cursor-pointer",
  tarjeta: "bg-white border border-neutral-200",
  contenedor: "mx-auto max-w-7xl px-4",
};
