# 02 · Punto de venta, caja y tickets

## Requisitos
- **R-POS-01** **La caja es opcional y por ahora está desactivada** (ADR-017): se puede vender sin abrir caja. Las ventas quedan sin corte asociado. El módulo (abrir, cerrar, efectivo esperado) se conserva y se activa con `NEXT_PUBLIC_USAR_CAJA=true`; con la bandera activa vuelve a exigirse caja abierta, que es única a la vez.
- **R-POS-02** *Búsqueda*: por nombre, marca, categoría, atributos o código de barras; las palabras pueden ir en cualquier orden. Un código exacto se agrega solo al carrito. Funciona con lector USB (teclado), con la cámara del teléfono o laptop, y escribiendo.
- **R-POS-03** *Carrito*: cantidades limitadas a las existencias; descuento en pesos por renglón (no mayor al importe).
- **R-POS-04** *Canal* de venta obligatorio (mostrador por defecto) y cliente opcional.
- **R-POS-05** *Pagos*: efectivo, tarjeta o transferencia; pago dividido permitido. La suma de pagos debe igualar el total. En efectivo, “Recibido” muestra el cambio (solo informativo).
- **R-POS-06** *Registro atómico*: la venta, sus renglones, los pagos, el costo del momento y el descuento de existencias ocurren en una sola operación. Si falta stock, no se registra nada.
- **R-POS-07** *Ticket digital*: texto con folio, fecha, renglones, descuentos, total y pagos, que se puede enviar por WhatsApp, copiar o imprimir.
- **R-POS-08** *Corte de caja* (solo con la caja activada): muestra fondo, ventas por método de pago, **efectivo esperado = fondo + pagos en efectivo de ventas completadas**, y al cerrar compara contra el efectivo contado (diferencia).
- **R-POS-09** *Cancelación*: solo el dueño; devuelve las piezas al inventario y excluye la venta de resúmenes y del corte.
- **R-POS-10** La vendedora ve solo sus ventas; el dueño ve todas. La vendedora nunca ve costos ni utilidades.
- **R-POS-11** La base de datos toma el precio y el costo; el navegador no puede fijarlos (salvo importación histórica del dueño).

## Criterios de aceptación
- **Dado** una variante con 1 pieza, **cuando** dos personas intentan venderla, **entonces** solo una venta se completa y la otra falla con “No hay existencias suficientes”.
- **Dado** un total de $450, **cuando** los pagos suman $400, **entonces** la venta se rechaza.
- **Dado** fondo $1,000 y ventas en efectivo por $450, **entonces** el efectivo esperado es $1,450; **si** se cuentan $1,440, la diferencia es −$10.
- **Dado** una vendedora, **cuando** intenta cancelar una venta, fijar un precio o registrar una venta con fecha pasada, **entonces** la operación falla.
- **Dado** una venta cancelada, **entonces** las piezas regresan y el resumen del periodo no la cuenta.
- **Dado** que la caja está desactivada, **cuando** se vende, **entonces** la venta se registra sin caja y no se pide fondo inicial.
- **Dado** la caja activada y sin caja abierta, **entonces** el POS ofrece abrirla y no permite cobrar.

## Implementado en
`supabase/migrations/0003`(registrar_venta), `0004` (caja, pos_buscar), `src/components/{Pos,ScannerCamara,TicketView,AbrirCaja,CierreCaja,BotonCancelarVenta}.tsx`, `src/lib/ticket.ts`, `src/app/pos/`, `src/app/admin/ventas/`.

## Pruebas
`supabase/tests/10_flujo_completo.sql` (venta, sobreventa, pagos, caja, cancelación, permisos, histórica).
