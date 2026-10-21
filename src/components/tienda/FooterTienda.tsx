import Link from "next/link";
import { MARCA } from "@/lib/marca";
import { urlWhatsApp } from "@/lib/catalogo";
import { IconoInstagram, IconoWhatsApp } from "./Iconos";
import { Logo } from "./Logo";

export function FooterTienda() {
  const enlace = "transition-colors hover:text-oro";
  return (
    <footer className="bg-negro text-marfil/80">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo tono="oro" />
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-marfil/60">{MARCA.lema}. Atención personalizada por WhatsApp.</p>
          <div className="mt-5 flex gap-4">
            {MARCA.whatsapp && (
              <a href={urlWhatsApp(MARCA.whatsapp, "Hola, quisiera más información.")} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className={enlace}><IconoWhatsApp className="h-6 w-6" /></a>
            )}
            {MARCA.instagram && (
              <a href={MARCA.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className={enlace}><IconoInstagram className="h-6 w-6" /></a>
            )}
          </div>
        </div>
        <div>
          <h3 className="mb-4 text-xs uppercase tracking-[0.3em] text-oro">Tienda</h3>
          <ul className="space-y-2 text-sm">
            <li><Link href="/tienda" className={enlace}>Todo el catálogo</Link></li>
            <li><Link href="/tienda?seccion=mujer" className={enlace}>Mujer</Link></li>
            <li><Link href="/tienda?seccion=hombre" className={enlace}>Hombre</Link></li>
            <li><Link href="/tienda?categoria=Fragancias" className={enlace}>Fragancias</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="mb-4 text-xs uppercase tracking-[0.3em] text-oro">Mi cuenta</h3>
          <ul className="space-y-2 text-sm">
            <li><Link href="/cuenta" className={enlace}>Mis datos</Link></li>
            <li><Link href="/cuenta/pedidos" className={enlace}>Mis pedidos</Link></li>
            <li><Link href="/carrito" className={enlace}>Carrito</Link></li>
            {MARCA.direccionTienda && <li className="pt-2 text-marfil/60">{MARCA.direccionTienda}</li>}
          </ul>
        </div>
      </div>
      <div className="border-t border-marfil/10 px-4 py-5 text-center text-xs text-marfil/50">
        © {new Date().getFullYear()} {MARCA.nombre} {MARCA.subtitulo} ·{" "}
        <Link href="/privacidad" className={enlace}>Aviso de privacidad</Link> ·{" "}
        <Link href="/login" className={enlace}>Acceso del personal</Link>
      </div>
    </footer>
  );
}
