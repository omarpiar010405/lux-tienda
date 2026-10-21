import Link from "next/link";
import { hoyMX, inicioMes, mesAnterior, sumarDias } from "@/lib/format";
import { btn, btnSec, input } from "@/lib/ui";

/** Selector de periodo por GET: ?desde=AAAA-MM-DD&hasta=AAAA-MM-DD (+ filtros extra ocultos). */
export function FiltroPeriodo({
  desde, hasta, base, extra, children,
}: {
  desde: string; hasta: string; base: string;
  extra?: Record<string, string | undefined>;
  children?: React.ReactNode;
}) {
  const hoy = hoyMX();
  const mp = mesAnterior(hoy);
  const rapido = [
    { t: "Hoy", d: hoy, h: hoy },
    { t: "Ayer", d: sumarDias(hoy, -1), h: sumarDias(hoy, -1) },
    { t: "7 días", d: sumarDias(hoy, -6), h: hoy },
    { t: "Este mes", d: inicioMes(hoy), h: hoy },
    { t: "Mes pasado", d: mp.desde, h: mp.hasta },
  ];
  const q = (d: string, h: string) => {
    const p = new URLSearchParams({ desde: d, hasta: h });
    Object.entries(extra ?? {}).forEach(([k, v]) => v && p.set(k, v));
    return `${base}?${p.toString()}`;
  };

  return (
    <div className="space-y-2 no-imprimir">
      <div className="flex gap-2 flex-wrap">
        {rapido.map((r) => (
          <Link key={r.t} href={q(r.d, r.h)} className={r.d === desde && r.h === hasta ? btn : btnSec}>
            {r.t}
          </Link>
        ))}
      </div>
      <form className="flex gap-2 flex-wrap items-end">
        <label className="text-sm text-neutral-600">Desde<input type="date" name="desde" defaultValue={desde} className={input} /></label>
        <label className="text-sm text-neutral-600">Hasta<input type="date" name="hasta" defaultValue={hasta} className={input} /></label>
        {children}
        <button className={btn}>Ver</button>
      </form>
    </div>
  );
}

export function fechaValida(s: string | undefined): string | null {
  return s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}
