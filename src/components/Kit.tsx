import { card } from "@/lib/ui";

export function Tarjeta({ titulo, valor, nota, tono }: { titulo: string; valor: string; nota?: string; tono?: "bien" | "mal" }) {
  const color = tono === "mal" ? "text-red-600" : tono === "bien" ? "text-emerald-700" : "text-neutral-900";
  return (
    <div className={`${card} p-4`}>
      <p className="text-sm text-neutral-500">{titulo}</p>
      <p className={`text-2xl font-semibold mt-1 ${color}`}>{valor}</p>
      {nota && <p className="text-xs text-neutral-500 mt-1">{nota}</p>}
    </div>
  );
}

export function Seccion({ titulo, acciones, children }: { titulo: string; acciones?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="font-semibold">{titulo}</h2>
        {acciones}
      </div>
      {children}
    </section>
  );
}

export function Aviso({ tipo = "error", children }: { tipo?: "error" | "ok" | "info"; children: React.ReactNode }) {
  const estilos = {
    error: "bg-red-50 border-red-200 text-red-800",
    ok: "bg-emerald-50 border-emerald-200 text-emerald-800",
    info: "bg-amber-50 border-amber-200 text-amber-900",
  }[tipo];
  return <div className={`border rounded-lg px-3 py-2 text-sm ${estilos}`}>{children}</div>;
}

export function TablaWrap({ children }: { children: React.ReactNode }) {
  return <div className={`${card} overflow-x-auto`}><table className="w-full text-sm">{children}</table></div>;
}
