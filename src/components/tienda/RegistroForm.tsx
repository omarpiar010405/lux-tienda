"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { sanearNext, validarRegistro } from "@/lib/clientes";
import { mensajeError } from "@/lib/errores";
import { t } from "@/lib/ui";
import { Aviso } from "@/components/Kit";

export function RegistroForm({ next }: { next: string | null }) {
  const router = useRouter();
  const [f, setF] = useState({ nombre: "", apellidos: "", email: "", telefono: "", password: "", acepta_privacidad: false, novedades: false });
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [revisarCorreo, setRevisarCorreo] = useState(false);

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const r = validarRegistro(f);
    if (!r.ok) return setErrores(r.errores);
    setErrores({});
    setCargando(true);

    const { data, error: eAuth } = await createClient().auth.signUp({
      email: f.email.trim(),
      password: f.password,
      options: {
        data: { nombre: f.nombre.trim(), apellidos: f.apellidos.trim(), telefono: r.datos.telefono, acepta_novedades: f.novedades ? "true" : "false" },
        emailRedirectTo: `${window.location.origin}/login${next ? `?next=${encodeURIComponent(next)}` : ""}`,
      },
    });
    setCargando(false);
    if (eAuth) return setError(eAuth.message.toLowerCase().includes("already") ? "Ese correo ya tiene una cuenta. Inicia sesión." : mensajeError(eAuth));

    if (data.session) {
      router.replace(sanearNext(next) ?? "/cuenta");
      router.refresh();
    } else {
      setRevisarCorreo(true);
    }
  }

  if (revisarCorreo) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="border-t-2 border-oro bg-white p-8">
          <h1 className="font-display text-3xl">Revisa tu correo</h1>
          <p className="mt-3 text-neutral-700">Te enviamos un enlace a <b>{f.email}</b> para confirmar tu cuenta. Después podrás iniciar sesión.</p>
          <Link href="/login" className={`${t.btnNegro} mt-6`}>Ir a iniciar sesión</Link>
        </div>
      </div>
    );
  }

  const campo = (id: keyof typeof f, etiqueta: string, tipo = "text", auto?: string) => (
    <div>
      <label htmlFor={id} className={t.etiqueta}>{etiqueta}</label>
      <input id={id} type={tipo} autoComplete={auto} value={String(f[id])} onChange={(e) => set(id, e.target.value as never)} className={t.input} aria-invalid={!!errores[id]} aria-describedby={errores[id] ? `${id}-err` : undefined} />
      {errores[id] && <p id={`${id}-err`} className="mt-1 text-sm text-red-700">{errores[id]}</p>}
    </div>
  );

  return (
    <div className="mx-auto max-w-lg px-4 py-14">
      <form onSubmit={enviar} noValidate className="space-y-5 border-t-2 border-oro bg-white p-8 shadow-sm">
        <div className="text-center">
          <h1 className="font-display text-3xl">Crear cuenta</h1>
          <p className="mt-1 text-sm text-neutral-600">Guarda tus datos y direcciones para comprar más rápido.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          {campo("nombre", "Nombre", "text", "given-name")}
          {campo("apellidos", "Apellidos", "text", "family-name")}
        </div>
        {campo("email", "Correo electrónico", "email", "email")}
        {campo("telefono", "Teléfono / WhatsApp (10 dígitos)", "tel", "tel")}
        {campo("password", "Contraseña (mínimo 8 caracteres)", "password", "new-password")}

        <div className="space-y-3 text-sm">
          <label className="flex items-start gap-2">
            <input type="checkbox" checked={f.acepta_privacidad} onChange={(e) => set("acepta_privacidad", e.target.checked)} className="mt-1" />
            <span>He leído y acepto el <Link href="/privacidad" target="_blank" className="underline underline-offset-4">aviso de privacidad</Link>.</span>
          </label>
          {errores.acepta_privacidad && <p className="text-red-700">{errores.acepta_privacidad}</p>}
          <label className="flex items-start gap-2 text-neutral-700">
            <input type="checkbox" checked={f.novedades} onChange={(e) => set("novedades", e.target.checked)} className="mt-1" />
            <span>Quiero recibir novedades y ofertas (opcional).</span>
          </label>
        </div>

        {error && <Aviso>{error}</Aviso>}
        <button disabled={cargando} className={`${t.btnOro} w-full`}>{cargando ? "Creando cuenta…" : "Crear cuenta"}</button>
        <p className="text-center text-sm text-neutral-600">
          ¿Ya tienes cuenta? <Link href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"} className="text-negro underline underline-offset-4">Inicia sesión</Link>
        </p>
      </form>
    </div>
  );
}
