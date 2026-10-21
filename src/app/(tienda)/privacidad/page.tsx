import { MARCA } from "@/lib/marca";
import { t } from "@/lib/ui";
import { Aviso } from "@/components/Kit";
import { Titulo } from "@/components/tienda/Titulo";

export const metadata = { title: "Aviso de privacidad" };

// BORRADOR (spec 06 · Q-10): el dueño debe completar los datos del responsable y revisarlo con un profesional.
export default function Privacidad() {
  const responsable = process.env.NEXT_PUBLIC_RESPONSABLE_PRIVACIDAD ?? "[NOMBRE O RAZÓN SOCIAL DEL RESPONSABLE]";
  const domicilio = process.env.NEXT_PUBLIC_DOMICILIO_PRIVACIDAD ?? "[DOMICILIO DEL RESPONSABLE]";
  const contacto = process.env.NEXT_PUBLIC_CORREO_PRIVACIDAD ?? "[CORREO DE CONTACTO]";
  return (
    <div className={`${t.contenedor} max-w-3xl py-12`}>
      <Titulo>Aviso de privacidad</Titulo>
      <div className="mb-8"><Aviso tipo="info">Borrador pendiente de revisión: completa los datos del responsable y valídalo con un profesional antes de publicar la tienda.</Aviso></div>
      <div className="space-y-5 leading-relaxed text-neutral-800 [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-2xl">
        <p><b>{responsable}</b>, con domicilio en {domicilio}, es responsable del tratamiento de tus datos personales en {MARCA.nombre} {MARCA.subtitulo}.</p>
        <h2>Datos que recabamos</h2>
        <p>Nombre, correo electrónico, teléfono, direcciones de entrega, historial de pedidos y, si lo autorizas, tu preferencia de recibir novedades.</p>
        <h2>Para qué los usamos</h2>
        <p>Para crear y administrar tu cuenta, procesar y entregar tus pedidos, comunicarnos contigo sobre ellos (por WhatsApp, teléfono o correo) y, solo si lo aceptaste, enviarte novedades y ofertas.</p>
        <h2>Con quién los compartimos</h2>
        <p>No vendemos tus datos. Solo se comparten con proveedores necesarios para operar la tienda (como el servicio de alojamiento y las paqueterías para entregar tu pedido).</p>
        <h2>Tus derechos</h2>
        <p>Puedes acceder, rectificar, cancelar u oponerte al tratamiento de tus datos (derechos ARCO), y revocar tu consentimiento, escribiendo a {contacto}. Puedes editar tus datos y direcciones desde <b>Mi cuenta</b>.</p>
        <h2>Cambios al aviso</h2>
        <p>Cualquier cambio se publicará en esta página.</p>
      </div>
    </div>
  );
}
