import Link from "next/link";
import { requireCuenta } from "@/lib/auth";
import { ESTADOS_PEDIDO, fechaHora, mxn } from "@/lib/format";
import { t } from "@/lib/ui";

export const metadata = { title: "Mis pedidos" };

type Fila = { id: string; numero: number; estado: string; entrega: string; total: number; created_at: string };

export default async function MisPedidos() {
  const { supabase, user } = await requireCuenta("/cuenta/pedidos");
  const { data } = await supabase.from("pedidos").select("id, numero, estado, entrega, total, created_at").eq("cliente_id", user.id).order("created_at", { ascending: false });
  const pedidos = (data ?? []) as Fila[];

  if (pedidos.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="font-display text-2xl">Aún no tienes pedidos</p>
        <Link href="/tienda" className={`${t.btnNegro} mt-6`}>Ir a la tienda</Link>
      </div>
    );
  }
  return (
    <ul className="mx-auto max-w-3xl space-y-3">
      {pedidos.map((p) => (
        <li key={p.id}>
          <Link href={`/cuenta/pedidos/${p.id}`} className={`${t.tarjeta} flex flex-wrap items-center justify-between gap-3 p-5 transition-colors hover:border-oro`}>
            <div>
              <p className="font-display text-xl">Pedido #{p.numero}</p>
              <p className="text-sm text-neutral-600">{fechaHora(p.created_at)} · {p.entrega === "envio" ? "Envío a domicilio" : "Recoger en tienda"}</p>
            </div>
            <div className="text-right">
              <p className="font-medium">{mxn(Number(p.total))}</p>
              <span className={`mt-1 inline-block px-2.5 py-0.5 text-xs ${ESTADOS_PEDIDO[p.estado]?.estilo ?? ""}`}>{ESTADOS_PEDIDO[p.estado]?.etiqueta ?? p.estado}</span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
