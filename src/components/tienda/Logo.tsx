import Link from "next/link";
import { MARCA } from "@/lib/marca";

/** Logotipo en texto: LUX + BOUTIQUE. `tono`: oro sobre fondo oscuro, negro sobre fondo claro. */
export function Logo({ tono = "oro", tamano = "md", enlace = true }: { tono?: "oro" | "negro" | "blanco"; tamano?: "sm" | "md" | "lg"; enlace?: boolean }) {
  const color = tono === "oro" ? "text-oro" : tono === "blanco" ? "text-marfil" : "text-negro";
  const linea = tono === "oro" ? "bg-oro/60" : tono === "blanco" ? "bg-marfil/50" : "bg-negro/40";
  const t = { sm: ["text-xl", "text-[0.5rem]"], md: ["text-3xl", "text-[0.6rem]"], lg: ["text-6xl", "text-xs"] }[tamano];
  const contenido = (
    <span className={`inline-flex flex-col items-center leading-none ${color}`}>
      <span className={`font-display ${t[0]} tracking-[0.32em] pl-[0.32em]`}>{MARCA.nombre}</span>
      <span className="flex items-center gap-2 mt-1.5">
        <span className={`h-px w-4 ${linea}`} />
        <span className={`${t[1]} tracking-[0.55em] pl-[0.55em]`}>{MARCA.subtitulo}</span>
        <span className={`h-px w-4 ${linea}`} />
      </span>
    </span>
  );
  return enlace ? (
    <Link href="/" aria-label={`${MARCA.nombre} ${MARCA.subtitulo}, inicio`}>{contenido}</Link>
  ) : contenido;
}
