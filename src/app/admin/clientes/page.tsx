import { requireDueno } from "@/lib/auth";
import { fechaHora } from "@/lib/format";
import { normalizar } from "@/lib/importar";
import type { Rol } from "@/lib/types";
import { Aviso, TablaWrap } from "@/components/Kit";
import { AccionesCliente } from "@/components/AccionesCliente";
import { ExportarCSV } from "@/components/ExportarCSV";
import { btn, input, td, th } from "@/lib/ui";

export const metadata = { title: "Clientes" };

type Fila = { id: string; nombre: string; apellidos: string | null; email: string | null; telefono: string | null; acepta_novedades: boolean; created_at: string; pedidos: { count: number }[] };

export default async function Clientes({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { supabase } = await requireDueno();
  const sp = await searchParams;
  const [{ data }, { data: perfiles }] = await Promise.all([
    supabase.from("clientes").select("id, nombre, apellidos, email, telefono, acepta_novedades, created_at, pedidos(count)").order("created_at", { ascending: false }).limit(1000),
    supabase.from("profiles").select("id, rol, activo"),
  ]);
  const mapa = new Map((perfiles ?? []).map((p) => [p.id, p as { id: string; rol: Rol; activo: boolean }]));
  const q = normalizar(sp.q);
  const filas = ((data ?? []) as unknown as Fila[]).filter(
    (c) => !q || normalizar(`${c.nombre} ${c.apellidos ?? ""} ${c.email ?? ""} ${c.telefono ?? ""}`).includes(q)
  );

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Clientes ({filas.length})</h1>
        <ExportarCSV nombre="clientes" filas={[["Nombre", "Apellidos", "Correo", "Teléfono", "Acepta novedades", "Pedidos", "Registro"], ...filas.map((c) => [c.nombre, c.apellidos, c.email, c.telefono, c.acepta_novedades ? "Sí" : "No", c.pedidos?.[0]?.count ?? 0, c.created_at.slice(0, 10)])]} />
      </div>
      <Aviso tipo="info">Aquí aparecen todas las cuentas registradas. Para dar de alta a una vendedora: que se registre en la tienda (o créala en Supabase) y pulsa <b>Dar acceso como vendedora</b>. Estos datos son personales: úsalos solo para atender pedidos (aviso de privacidad).</Aviso>
      <form className="flex gap-2"><input name="q" defaultValue={sp.q} placeholder="Buscar por nombre, correo o teléfono…" className={`${input} max-w-sm`} /><button className={btn}>Buscar</button></form>
      <TablaWrap>
        <thead><tr><th className={th}>Nombre</th><th className={th}>Correo</th><th className={th}>Teléfono</th><th className={th}>Pedidos</th><th className={th}>Novedades</th><th className={th}>Registro</th><th className={th}>Tipo</th><th className={th}></th></tr></thead>
        <tbody className="divide-y">
          {filas.length === 0 && <tr><td className={td} colSpan={8}>No hay clientes.</td></tr>}
          {filas.map((c) => {
            const p = mapa.get(c.id);
            return (
              <tr key={c.id} className={p && !p.activo ? "opacity-50" : ""}>
                <td className={td}>{c.nombre} {c.apellidos ?? ""}</td><td className={td}>{c.email}</td><td className={td}>{c.telefono ?? "—"}</td>
                <td className={td}>{c.pedidos?.[0]?.count ?? 0}</td><td className={td}>{c.acepta_novedades ? "Sí" : "No"}</td><td className={td}>{fechaHora(c.created_at)}</td>
                <td className={td}>{p?.rol === "dueno" ? "Dueño" : p?.rol === "vendedora" ? "Vendedora" : "Cliente"}</td>
                <td className={`${td} whitespace-normal`}>{p && p.rol !== "dueno" && <AccionesCliente id={c.id} nombre={c.nombre || (c.email ?? "")} rol={p.rol} activo={p.activo} />}</td>
              </tr>
            );
          })}
        </tbody>
      </TablaWrap>
    </>
  );
}
