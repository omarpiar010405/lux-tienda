import Link from "next/link";
import { requireDueno } from "@/lib/auth";
import { SECCIONES, etiquetaSeccion, mxn } from "@/lib/format";
import { TablaWrap } from "@/components/Kit";
import { btn, btnSec, input, td, th } from "@/lib/ui";

export const metadata = { title: "Productos" };

type Fila = {
  id: string; nombre: string; marca: string | null; seccion: string; activo: boolean;
  categorias: { nombre: string } | { nombre: string }[] | null;
  variantes: { stock: number; precio: number; activo: boolean }[];
  producto_fotos: { url: string; orden: number }[];
};

export default async function Productos({ searchParams }: { searchParams: Promise<{ q?: string; categoria?: string; seccion?: string; bajo?: string; inactivos?: string }> }) {
  const { supabase } = await requireDueno();
  const sp = await searchParams;

  const [{ data: cats }, { data }] = await Promise.all([
    supabase.from("categorias").select("id, nombre").order("nombre"),
    (() => {
      let q = supabase
        .from("productos")
        .select("id, nombre, marca, seccion, activo, categorias(nombre), variantes(stock, precio, activo), producto_fotos(url, orden)")
        .order("created_at", { ascending: false })
        .limit(300);
      if (sp.q) q = q.ilike("nombre", `%${sp.q.replace(/[%_]/g, "")}%`);
      if (sp.categoria) q = q.eq("categoria_id", sp.categoria);
      if (sp.seccion) q = q.eq("seccion", sp.seccion);
      if (!sp.inactivos) q = q.eq("activo", true);
      return q;
    })(),
  ]);

  let filas = (data ?? []) as unknown as Fila[];
  if (sp.bajo) filas = filas.filter((f) => f.variantes.some((v) => v.stock <= 2));

  return (
    <>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-xl font-semibold">Productos</h1>
        <div className="flex gap-2">
          <Link href="/admin/compras/nueva" className={btnSec}>Compra a producto existente</Link>
          <Link href="/admin/productos/nuevo" className={btn}>+ Producto nuevo</Link>
        </div>
      </div>

      <form className="flex gap-2 flex-wrap items-end">
        <input name="q" defaultValue={sp.q} placeholder="Buscar por nombre..." className={`${input} max-w-60`} />
        <select name="categoria" defaultValue={sp.categoria ?? ""} className={`${input} max-w-48`}>
          <option value="">Todas las categorías</option>
          {(cats ?? []).map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <select name="seccion" defaultValue={sp.seccion ?? ""} className={`${input} max-w-40`}>
          <option value="">Todas las secciones</option>
          {SECCIONES.map((s) => <option key={s.valor} value={s.valor}>{s.etiqueta}</option>)}
        </select>
        <label className="text-sm flex items-center gap-1"><input type="checkbox" name="bajo" value="1" defaultChecked={!!sp.bajo} /> Stock bajo</label>
        <label className="text-sm flex items-center gap-1"><input type="checkbox" name="inactivos" value="1" defaultChecked={!!sp.inactivos} /> Incluir ocultos</label>
        <button className={btn}>Filtrar</button>
      </form>

      <TablaWrap>
        <thead><tr><th className={th}></th><th className={th}>Producto</th><th className={th}>Categoría</th><th className={th}>Sección</th><th className={th}>Precio</th><th className={th}>Piezas</th></tr></thead>
        <tbody className="divide-y">
          {filas.length === 0 && <tr><td className={td} colSpan={6}>No hay productos con esos filtros.</td></tr>}
          {filas.map((f) => {
            const foto = [...f.producto_fotos].sort((a, b) => a.orden - b.orden)[0];
            const stock = f.variantes.reduce((s, v) => s + v.stock, 0);
            const precios = f.variantes.map((v) => Number(v.precio));
            const cat = Array.isArray(f.categorias) ? f.categorias[0] : f.categorias;
            return (
              <tr key={f.id} className={f.activo ? "" : "opacity-50"}>
                <td className="px-3 py-2 w-14">
                  {foto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={foto.url} alt="" className="w-12 h-12 rounded-lg object-cover" />
                  ) : <div className="w-12 h-12 rounded-lg bg-neutral-100" />}
                </td>
                <td className={td}><Link href={`/admin/productos/${f.id}`} className="underline font-medium">{f.nombre}</Link>{f.marca ? <span className="text-neutral-500"> · {f.marca}</span> : null}{!f.activo && " (oculto)"}</td>
                <td className={td}>{cat?.nombre}</td><td className={td}>{etiquetaSeccion(f.seccion)}</td>
                <td className={td}>{precios.length ? (Math.min(...precios) === Math.max(...precios) ? mxn(precios[0]) : `${mxn(Math.min(...precios))}+`) : "—"}</td>
                <td className={`${td} ${stock === 0 ? "text-red-600" : ""}`}>{stock}</td>
              </tr>
            );
          })}
        </tbody>
      </TablaWrap>
    </>
  );
}
