"use client";

import { useState } from "react";
import { ticketTexto } from "@/lib/ticket";
import { urlWhatsApp } from "@/lib/catalogo";
import type { TicketData } from "@/lib/types";
import { btn, btnSec } from "@/lib/ui";

export function TicketView({ ticket, tienda }: { ticket: TicketData; tienda: string }) {
  const texto = ticketTexto(ticket, tienda);
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    await navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <div className="space-y-3">
      <pre className="bg-white border border-neutral-200 rounded-xl p-4 text-sm whitespace-pre-wrap font-mono">{texto}</pre>
      <div className="flex gap-2 flex-wrap no-imprimir">
        <a className={btn} href={urlWhatsApp(undefined, texto)} target="_blank" rel="noopener noreferrer">Enviar por WhatsApp</a>
        <button className={btnSec} onClick={copiar}>{copiado ? "¡Copiado!" : "Copiar texto"}</button>
        <button className={btnSec} onClick={() => window.print()}>Imprimir</button>
      </div>
    </div>
  );
}
