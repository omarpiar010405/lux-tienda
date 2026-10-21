import Link from "next/link";
import { requireDueno } from "@/lib/auth";
import { detalleOpciones, fechaCorta, hoyMX, inicioMes, mxn } from "@/lib/format";
import type { Opciones } from "@/lib/types";
import { Seccion } from "@/components/Kit";
import { ExportarCSV } from "@/components/ExportarCSV";
import { FiltroPeriodo, fechaValida } from "@/components/FiltroPeriodo";
import { btn, card } from "@/lib/ui";

export const metadata = { title: "Compras" };

type Uno<T> = T | T[] | null;
const uno = <T,>(x: Uno<T>): T | null => (Array.isArray(x) ? (x[0] ?? null) : x);

type Compra = {
  id: string; fecha: string; proveedor: string | null; notas: string | null;
  compra_items: { cantidad: number; costo_unitario: number; variantes: Uno<{ opciones: Opciones; productos: Uno<{ id: string; nombre: string }> }> }[];
};

export default async function Compras({ searchParams }: { searchParams: Promise<{ desde?: string; hasta?: string }> }) {
  const { supabase } = await requireDueno();
  const sp = await searchParams;
  const hoy = hoyMX();
  const desde = fechaValida(sp.desde) ?? inicioMes(hoy);
  const hasta = fechaValida(sp.hasta) ?? hoy;

  const { data } = await supabase
    .from("compras")
    .select("id, fecha, proveedor, notas, compra_items(cantidad, costo_unitario, variantes(opciones, productos(id, nombre)))")
    .gte("fecha", desde).lte("fecha", hasta)
    .order("fecha", { ascending: false }).order("created_at", { ascending: false });
  const compras = (data ?? []) as unknown as Compra[];

  const resumen = compras.map((c) => ({
    ...c,
    piezas: c.compra_items.reduce((s, i) => s + i.cantidad, 0),
    inversion: c.compra_items.reduce((s, i) => s + i.cantidad * Number(i.costo_unitario), 0),
  }));
  const total = resumen.reduce((s, c) => s + c.inversion, 0);

  const csv = [["Fecha", "Proveedor", "Producto", "Variante", "Piezas", "Costo c/u", "Inversión"],
    ...compras.flatMap((c) => c.compra_items.map((i) => {
      const v = uno(i.variantes);
      return [c.fecha, c.proveedor, uno(v?.productos ?? null)?.nombre ?? "", detalleOpciones(v?.opciones), i.cantidad, i.costo_unitario, i.cantidad * Number(i.costo_unitario)];
    }))];

  return (
    <>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-xl font-semibold">Compras</h1>
        <Link href="/admin/compras/nueva" className={btn}>+ Registrar compra</Link>
      </div>
      <FiltroPeriodo desde={desde} hasta={hasta} base="/admin/compras" />

      <Seccion titulo={`${resumen.length} compras · inversión ${mxn(total)}`} acciones={<ExportarCSV nombre={`compras_${desde}_${hasta}`} filas={csv} />}>
        {resumen.length === 0 && <p className="text-sm text-neutral-500">Sin compras en el periodo.</p>}
        <div className="space-y-2">
          {resumen.map((c) => (
            <details key={c.id} className={`${card} p-3`}>
              <summary className="cursor-pointer flex justify-between gap-2 flex-wrap">
                <span>{fechaCorta(c.fecha)} · {c.proveedor ?? "Sin proveedor"} · {c.piezas} pzas</span>
                <span className="font-medium">{mxn(c.inversion)}</span>
              </summary>
              <ul className="mt-2 text-sm space-y-1">
                {c.compra_items.map((i, k) => {
                  const v = uno(i.variantes);
                  const p = uno(v?.productos ?? null);
                  return (
                    <li key={k} className="flex justify-between gap-2">
                      <span>{i.cantidad} × {p ? <Link href={`/admin/productos/${p.id}`} className="underline">{p.nombre}</Link> : "Producto"} <span className="text-neutral-500">{detalleOpciones(v?.opciones)}</span></span>
                      <span>{mxn(Number(i.costo_unitario))} c/u</span>
                    </li>
                  );
                })}
              </ul>
              {c.notas && <p className="text-sm text-neutral-500 mt-2">Nota: {c.notas}</p>}
            </details>
          ))}
        </div>
      </Seccion>
    </>
  );
}
