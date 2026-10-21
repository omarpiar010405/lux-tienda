import { redirect } from "next/navigation";
import { getSesion, rutaInicial } from "@/lib/auth";
import { sanearNext } from "@/lib/clientes";
import { LoginForm } from "@/components/LoginForm";

export const metadata = { title: "Iniciar sesión" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const sp = await searchParams;
  const next = sanearNext(sp.next);
  const { user, perfil } = await getSesion();
  if (user && perfil?.activo) redirect(next ?? rutaInicial(perfil));
  return <LoginForm next={next} aviso={sp.error === "inactivo" ? "Tu cuenta está desactivada. Escríbenos si necesitas ayuda." : null} />;
}
