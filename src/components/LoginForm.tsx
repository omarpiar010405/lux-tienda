"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { sanearNext } from "@/lib/clientes";
import { t } from "@/lib/ui";
import { Aviso } from "./Kit";

export function LoginForm({ aviso, next }: { aviso: string | null; next: string | null }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(aviso);
  const [cargando, setCargando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError(null);

    const supabase = createClient();
    const { error: errAuth } = await supabase.auth.signInWithPassword({ email, password });
    if (errAuth) {
      setError(errAuth.message.toLowerCase().includes("confirm") ? "Confirma tu correo para entrar (revisa tu bandeja)." : "Correo o contraseña incorrectos");
      setCargando(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    const { data: perfil } = await supabase.from("profiles").select("rol, activo").eq("id", user!.id).single();

    if (!perfil?.activo) {
      await supabase.auth.signOut();
      setError("Tu cuenta está desactivada. Escríbenos si necesitas ayuda.");
      setCargando(false);
      return;
    }
    const inicio = perfil.rol === "dueno" ? "/admin" : perfil.rol === "vendedora" ? "/pos" : "/cuenta";
    router.replace(sanearNext(next) ?? inicio);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <form onSubmit={entrar} className="space-y-5 border-t-2 border-oro bg-white p-8 shadow-sm">
        <div className="text-center">
          <h1 className="font-display text-3xl">Iniciar sesión</h1>
          <p className="mt-1 text-sm text-neutral-600">Accede a tu cuenta para ver tus pedidos y comprar más rápido.</p>
        </div>
        <div>
          <label htmlFor="email" className={t.etiqueta}>Correo</label>
          <input id="email" type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className={t.input} />
        </div>
        <div>
          <label htmlFor="password" className={t.etiqueta}>Contraseña</label>
          <input id="password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={t.input} />
        </div>
        {error && <Aviso>{error}</Aviso>}
        <button disabled={cargando} className={`${t.btnNegro} w-full`}>{cargando ? "Entrando…" : "Entrar"}</button>
        <p className="text-center text-sm text-neutral-600">
          ¿Primera vez?{" "}
          <Link href={next ? `/registro?next=${encodeURIComponent(next)}` : "/registro"} className="text-negro underline underline-offset-4">Crea tu cuenta</Link>
        </p>
      </form>
    </div>
  );
}
