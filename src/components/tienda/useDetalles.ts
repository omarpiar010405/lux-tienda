"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { detalleOpciones } from "@/lib/format";
import type { LineaCarrito } from "@/lib/carrito";
import type { FilaCatalogo } from "@/lib/catalogo";

export type DetalleLinea = {
  varianteId: string;
  cantidad: number;
  existe: boolean; // false = el producto ya no está en el catálogo
  nombre: string;
  marca: string | null;
  detalle: string;
  precio: number;
  stock: number;
  foto: string | null;
  productoId: string | null;
};

/** Trae precios y existencias ACTUALES del catálogo público para las líneas del carrito (el carrito no guarda precios). */
export function useDetalles(lineas: LineaCarrito[], listo: boolean) {
  const [filas, setFilas] = useState<FilaCatalogo[] | null>(null);
  const ids = useMemo(() => lineas.map((l) => l.varianteId).sort().join(","), [lineas]);

  useEffect(() => {
    if (!listo) return;
    if (!ids) {
      setFilas([]);
      return;
    }
    let vivo = true;
    createClient()
      .from("catalogo_publico")
      .select("*")
      .in("variante_id", ids.split(","))
      .then(({ data }) => {
        if (vivo) setFilas((data ?? []) as FilaCatalogo[]);
      });
    return () => {
      vivo = false;
    };
  }, [ids, listo]);

  const detalles: DetalleLinea[] | null = useMemo(() => {
    if (!filas) return null;
    return lineas.map((l) => {
      const f = filas.find((x) => x.variante_id === l.varianteId);
      return {
        varianteId: l.varianteId,
        cantidad: l.cantidad,
        existe: !!f,
        nombre: f ? f.nombre : "Producto no disponible",
        marca: f?.marca ?? null,
        detalle: f ? detalleOpciones(f.opciones) : "",
        precio: f ? Number(f.precio) : 0,
        stock: f ? f.stock : 0,
        foto: f?.fotos?.[0] ?? null,
        productoId: f?.producto_id ?? null,
      };
    });
  }, [filas, lineas]);

  return { detalles, cargando: detalles === null };
}

export function problemaLinea(d: DetalleLinea): string | null {
  if (!d.existe) return "Este producto ya no está disponible.";
  if (d.stock <= 0) return "Agotado por ahora.";
  if (d.cantidad > d.stock) return `Solo quedan ${d.stock} pieza${d.stock === 1 ? "" : "s"}.`;
  return null;
}
