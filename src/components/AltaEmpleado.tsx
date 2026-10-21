"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient as crearClienteAislado } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { contrasenaValida, generarContrasena } from "@/lib/contrasena";
import { correoValido } from "@/lib/clientes";
import { mensajeError } from "@/lib/errores";
import { btn, btnSec, card, input } from "@/lib/ui";
import { Aviso } from "./Kit";

/**
 * Alta de empleados SIN la clave service_role (ADR-016): la cuenta se crea con un cliente aislado
 * (sin sesión persistente, para no tocar la sesión del dueño) y luego el dueño le asigna el rol.
 */
export function AltaEmpleado() {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creada, setCreada] = useState<{ email: string; password: string; confirmar: boolean } | null>(null);
  const [copiado, setCopiado] = useState(false);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!nombre.trim()) return setError("Escribe el nombre del empleado.");
    if (!correoValido(email)) return setError("Escribe un correo válido.");
    if (!contrasenaValida(password)) return setError("La contraseña debe tener al menos 8 caracteres.");

    setCargando(true);
    const aislado = crearClienteAislado(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data, error: eAuth } = await aislado.auth.signUp({
      email: email.trim(), password, options: { data: { nombre: nombre.trim(), acepta_novedades: "false" } },
    });
    if (eAuth || !data.user) {
      setCargando(false);
      return setError(eAuth?.message.toLowerCase().includes("already") ? "Ese correo ya tiene una cuenta. Búscala en Clientes y dale acceso desde ahí." : mensajeError(eAuth));
    }
    if (data.user.identities && data.user.identities.length === 0) {
      setCargando(false);
      return setError("Ese correo ya tiene una cuenta. Búscala en Clientes y dale acceso desde ahí.");
    }

    // Con la sesión del dueño: asignar el rol de vendedora
    const { error: eRol } = await createClient().from("profiles").update({ rol: "vendedora", nombre: nombre.trim() }).eq("id", data.user.id);
    setCargando(false);
    if (eRol) return setError(`La cuenta se creó, pero no se pudo dar acceso (${mensajeError(eRol)}). Hazlo desde Clientes → “Dar acceso como vendedora”.`);

    setCreada({ email: email.trim(), password, confirmar: !data.session });
    setNombre(""); setEmail(""); setPassword("");
    router.refresh();
  }

  async function copiar() {
    if (!creada) return;
    await navigator.clipboard.writeText(`Correo: ${creada.email}\nContraseña: ${creada.password}`);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  if (!abierto && !creada) {
    return <button className={btn} onClick={() => setAbierto(true)}>+ Alta de empleado</button>;
  }

  if (creada) {
    return (
      <div className={`${card} max-w-xl space-y-3 p-5`}>
        <Aviso tipo="ok">Empleado dado de alta con acceso de vendedora.</Aviso>
        <div className="space-y-1 bg-neutral-50 p-4 font-mono text-sm">
          <p>Correo: <b>{creada.email}</b></p>
          <p>Contraseña temporal: <b>{creada.password}</b></p>
        </div>
        <p className="text-sm text-neutral-600">Entrégale estos datos. <b>No se vuelven a mostrar.</b> Pídele que cambie su contraseña en <i>Mi cuenta</i> al entrar.</p>
        {creada.confirmar && <Aviso tipo="info">En Supabase está activada la confirmación de correo: el empleado debe confirmar su correo antes de entrar (o desactiva esa opción en Authentication → Sign In / Providers → Email).</Aviso>}
        <div className="flex gap-2">
          <button className={btn} onClick={copiar}>{copiado ? "¡Copiado!" : "Copiar datos"}</button>
          <button className={btnSec} onClick={() => { setCreada(null); setAbierto(false); }}>Listo</button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={crear} className={`${card} max-w-xl space-y-4 p-5`} noValidate>
      <h2 className="font-semibold">Alta de empleado</h2>
      <label className="block text-sm text-neutral-600">Nombre
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} className={input} autoComplete="off" />
      </label>
      <label className="block text-sm text-neutral-600">Correo
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={input} autoComplete="off" />
      </label>
      <label className="block text-sm text-neutral-600">Contraseña temporal (mínimo 8 caracteres)
        <div className="flex gap-2">
          <input value={password} onChange={(e) => setPassword(e.target.value)} className={`${input} font-mono`} autoComplete="off" />
          <button type="button" className={btnSec} onClick={() => setPassword(generarContrasena())}>Generar</button>
        </div>
      </label>
      <p className="text-xs text-neutral-500">Tendrá acceso al punto de venta, a las existencias y a los precios. No verá costos, utilidades, compras, gastos ni datos de clientes.</p>
      {error && <Aviso>{error}</Aviso>}
      <div className="flex gap-2">
        <button className={btn} disabled={cargando}>{cargando ? "Creando…" : "Dar de alta"}</button>
        <button type="button" className={btnSec} onClick={() => setAbierto(false)}>Cancelar</button>
      </div>
    </form>
  );
}
