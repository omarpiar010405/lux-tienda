/** Encabezado de sección con detalle dorado. */
export function Titulo({ children, sub, alinear = "centro", tono = "claro" }: { children: React.ReactNode; sub?: string; alinear?: "centro" | "izquierda"; tono?: "claro" | "oscuro" }) {
  const centro = alinear === "centro";
  return (
    <div className={`${centro ? "text-center" : ""} mb-8`}>
      <h2 className={`font-display text-3xl md:text-4xl ${tono === "oscuro" ? "text-marfil" : "text-negro"}`}>{children}</h2>
      <div className={`flex items-center gap-2 mt-3 ${centro ? "justify-center" : ""}`} aria-hidden>
        <span className="h-px w-10 bg-oro" />
        <span className="w-1.5 h-1.5 rotate-45 bg-oro" />
        <span className="h-px w-10 bg-oro" />
      </div>
      {sub && <p className={`mt-3 text-sm ${tono === "oscuro" ? "text-marfil/70" : "text-neutral-600"}`}>{sub}</p>}
    </div>
  );
}
