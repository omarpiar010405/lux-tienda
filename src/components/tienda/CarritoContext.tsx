"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  CLAVE_CARRITO, agregar as agregarLinea, cambiarCantidad, leerCarrito, quitar as quitarLinea, totalPiezas, type LineaCarrito,
} from "@/lib/carrito";

type Ctx = {
  lineas: LineaCarrito[];
  piezas: number;
  listo: boolean;
  aviso: string | null;
  agregar: (varianteId: string, cantidad?: number, tope?: number) => void;
  cambiar: (varianteId: string, cantidad: number, tope?: number) => void;
  quitar: (varianteId: string) => void;
  vaciar: () => void;
};

const Contexto = createContext<Ctx | null>(null);

export function CarritoProvider({ children }: { children: React.ReactNode }) {
  const [lineas, setLineas] = useState<LineaCarrito[]>([]);
  const [listo, setListo] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  // Leer lo guardado (solo en el navegador) y escuchar cambios de otras pestañas
  useEffect(() => {
    setLineas(leerCarrito(window.localStorage.getItem(CLAVE_CARRITO)));
    setListo(true);
    const alCambiar = (e: StorageEvent) => {
      if (e.key === CLAVE_CARRITO) setLineas(leerCarrito(e.newValue));
    };
    window.addEventListener("storage", alCambiar);
    return () => window.removeEventListener("storage", alCambiar);
  }, []);

  useEffect(() => {
    if (!listo) return;
    try {
      window.localStorage.setItem(CLAVE_CARRITO, JSON.stringify(lineas));
    } catch {
      /* modo privado o sin espacio: el carrito sigue funcionando en memoria */
    }
  }, [lineas, listo]);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 3500);
    return () => clearTimeout(t);
  }, [aviso]);

  const agregar = useCallback((id: string, cantidad = 1, tope?: number) => {
    setLineas((l) => agregarLinea(l, id, cantidad, tope));
    setAviso("Agregado a tu carrito");
  }, []);
  const cambiar = useCallback((id: string, cantidad: number, tope?: number) => setLineas((l) => cambiarCantidad(l, id, cantidad, tope)), []);
  const quitar = useCallback((id: string) => setLineas((l) => quitarLinea(l, id)), []);
  const vaciar = useCallback(() => setLineas([]), []);

  const valor = useMemo<Ctx>(
    () => ({ lineas, piezas: totalPiezas(lineas), listo, aviso, agregar, cambiar, quitar, vaciar }),
    [lineas, listo, aviso, agregar, cambiar, quitar, vaciar]
  );
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useCarrito(): Ctx {
  const c = useContext(Contexto);
  if (!c) throw new Error("useCarrito debe usarse dentro de CarritoProvider");
  return c;
}
