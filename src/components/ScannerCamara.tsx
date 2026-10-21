"use client";

import { useEffect, useRef, useState } from "react";
import type { IScannerControls } from "@zxing/browser";

/** Lee códigos de barras con la cámara (funciona en Android, iPhone y laptop). */
export function ScannerCamara({ onCodigo, onCerrar }: { onCodigo: (codigo: string) => void; onCerrar: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const callback = useRef(onCodigo);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    callback.current = onCodigo;
  }, [onCodigo]);

  useEffect(() => {
    let controles: IScannerControls | undefined;
    let activo = true;
    let ultimo = { texto: "", t: 0 };

    (async () => {
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const lector = new BrowserMultiFormatReader();
        controles = await lector.decodeFromVideoDevice(undefined, video.current!, (resultado) => {
          if (!resultado || !activo) return;
          const texto = resultado.getText();
          const ahora = Date.now();
          if (texto === ultimo.texto && ahora - ultimo.t < 2000) return; // evita lecturas repetidas
          ultimo = { texto, t: ahora };
          callback.current(texto);
        });
      } catch {
        setError("No se pudo abrir la cámara. Revisa los permisos del navegador.");
      }
    })();

    return () => {
      activo = false;
      controles?.stop();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center p-4 gap-3">
      <video ref={video} className="w-full max-w-md rounded-xl bg-black" muted playsInline />
      {error ? <p className="text-white text-sm">{error}</p> : <p className="text-white text-sm">Apunta al código de barras</p>}
      <button onClick={onCerrar} className="rounded-lg bg-white px-5 py-2 text-sm font-medium cursor-pointer">Cerrar cámara</button>
    </div>
  );
}
