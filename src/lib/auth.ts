import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Perfil } from "./types";

export async function getSesion() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let perfil: Perfil | null = null;
  if (user) {
    const { data } = await supabase.from("profiles").select("id, nombre, rol, activo").eq("id", user.id).maybeSingle();
    perfil = (data as Perfil | null) ?? null;
  }
  return { supabase, user, perfil };
}

export function rutaInicial(perfil: Perfil | null): string {
  if (perfil?.rol === "dueno") return "/admin";
  if (perfil?.rol === "vendedora") return "/pos";
  return "/cuenta";
}

/** Cualquier usuario activo (dueño o vendedora). */
export async function requireStaff() {
  const s = await getSesion();
  if (!s.user) redirect("/login");
  if (!s.perfil || !s.perfil.activo) redirect("/login?error=inactivo");
  if (s.perfil.rol === "cliente") redirect("/cuenta"); // los clientes no son personal
  return { supabase: s.supabase, user: s.user, perfil: s.perfil };
}

/** Cualquier cuenta activa (cliente, vendedora o dueño). Si no hay sesión, va a /login y regresa a `next`. */
export async function requireCuenta(next: string) {
  const s = await getSesion();
  if (!s.user) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (!s.perfil || !s.perfil.activo) redirect("/login?error=inactivo");
  return { supabase: s.supabase, user: s.user, perfil: s.perfil };
}

/** Solo el dueño; la vendedora va al POS. */
export async function requireDueno() {
  const s = await requireStaff();
  if (s.perfil.rol !== "dueno") redirect("/pos");
  return s;
}
