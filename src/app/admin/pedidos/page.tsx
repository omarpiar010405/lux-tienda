import Link from "next/link";
import { requireDueno } from "@/lib/auth";
import { ESTADOS_PEDIDO, fechaHora, mxn } from "@/lib/format";
import { etiquetaPago } from "@/lib/pagos";
import { TablaWrap } from "@/components/Kit";
import { btn, btnSec, td, th } from "@/lib/ui";

export const metadata = { title: "Pedidos" };

type Fila = { id: string; numero: number; estado: string; entrega: string; metodo_pago: string; pedido_comprobantes: { count: number }[]; total: number; contacto_nombre: string; contacto_telefono: string; created_at: string };

export default async function Pedidos({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const { supabase } = await requireDueno();
  const sp = await searchParams;
  const filtro = sp.estado && ESTADOS_PEDIDO[sp.estado] ? sp.estado : null;

  let q = supabase.from("pedidos").select("id, numero, estado, entrega, metodo_pago, pedido_comprobantes(count), total, contacto_nombre, contacto_telefono, created_at").order("created_at", { ascending: false }).limit(300);
  if (filtro) q = q.eq("estado", filtro);
  const { data } = await q;
  const filas = (data ?? []) as Fila[];

  return (
    <>
      <h1 className="text-xl font-semibold">Pedidos de la tienda</h1>
      <div className="flex flex-wrap gap-2">
        <Link href="/admin/pedidos" className={!filtro ? btn : btnSec}>Todos</Link>
        {Object.entries(ESTADOS_PEDIDO).map(([k, v]) => (
          <Link key={k} href={`/admin/pedidos?estado=${k}`} className={filtro === k ? btn : btnSec}>{v.etiqueta}</Link>
        ))}
      </div>
      <TablaWrap>
        <thead><tr><th className={th}>Pedido</th><th className={th}>Fecha</th><th className={th}>Cliente</th><th className={th}>Entrega</th><th className={th}>Pago</th><th className={th}>Total</th><th className={th}>Estado</th></tr></thead>
        <tbody className="divide-y">
          {filas.length === 0 && <tr><td className={td} colSpan={7}>No hay pedidos{filtro ? " con ese estado" : ""}.</td></tr>}
          {filas.map((p) => (
            <tr key={p.id}>
              <td className={td}><Link href={`/admin/pedidos/${p.id}`} className="font-medium underline">#{p.numero}</Link></td>
              <td className={td}>{fechaHora(p.created_at)}</td>
              <td className={td}>{p.contacto_nombre} <span className="text-neutral-500">{p.contacto_telefono}</span></td>
              <td className={td}>{p.entrega === "envio" ? "Envío" : "Recoger"}</td>
              <td className={td}>
                {etiquetaPago(p.metodo_pago).replace(" bancaria", "").replace(" al recoger", "")}
                {p.metodo_pago === "transferencia" && (
                  (p.pedido_comprobantes?.[0]?.count ?? 0) > 0
                    ? <span className="ml-2 bg-emerald-100 px-1.5 py-0.5 text-xs text-emerald-900">Comprobante</span>
                    : p.estado === "nuevo" && <span className="ml-2 bg-amber-100 px-1.5 py-0.5 text-xs text-amber-900">Sin comprobante</span>
                )}
              </td>
              <td className={td}>{mxn(Number(p.total))}</td>
              <td className={td}><span className={`px-2 py-0.5 text-xs ${ESTADOS_PEDIDO[p.estado].estilo}`}>{ESTADOS_PEDIDO[p.estado].etiqueta}</span></td>
            </tr>
          ))}
        </tbody>
      </TablaWrap>
    </>
  );
}
