"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function BotonSalir({ claro = false }: { claro?: boolean }) {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await createClient().auth.signOut();
        router.replace("/login");
        router.refresh();
      }}
      className={`cursor-pointer whitespace-nowrap text-sm underline underline-offset-4 ${claro ? "text-marfil/70 hover:text-oro" : "text-neutral-600 hover:text-negro"}`}
    >
      Cerrar sesión
    </button>
  );
}
