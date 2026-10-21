import { redirect } from "next/navigation";
import { getSesion, rutaInicial } from "@/lib/auth";
import { sanearNext } from "@/lib/clientes";
import { RegistroForm } from "@/components/tienda/RegistroForm";

export const metadata = { title: "Crear cuenta" };

export default async function RegistroPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const sp = await searchParams;
  const next = sanearNext(sp.next);
  const { user, perfil } = await getSesion();
  if (user && perfil?.activo) redirect(next ?? rutaInicial(perfil));
  return <RegistroForm next={next} />;
}
