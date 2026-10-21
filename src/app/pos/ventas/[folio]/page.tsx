import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { obtenerTicket } from "@/lib/ticket";
import { TicketView } from "@/components/TicketView";

export default async function TicketPage({ params }: { params: Promise<{ folio: string }> }) {
  const { folio } = await params;
  const n = Number(folio);
  if (!Number.isInteger(n)) notFound();
  const { supabase } = await requireStaff();
  const ticket = await obtenerTicket(supabase, n);
  if (!ticket) notFound();

  return (
    <div className="max-w-md mx-auto space-y-3">
      <Link href="/pos/ventas" className="text-sm underline text-neutral-600 no-imprimir">← Ventas de hoy</Link>
      <TicketView ticket={ticket} tienda={process.env.NEXT_PUBLIC_NOMBRE_TIENDA ?? "LUX"} />
    </div>
  );
}
