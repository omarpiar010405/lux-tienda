# Decisiones de arquitectura (ADR)

Formato: contexto → decisión → consecuencias. Para cambiar una decisión se agrega una nueva con estado “reemplaza a ADR-00X”.

### ADR-001 · Costo promedio ponderado
**Contexto:** la misma prenda se compra a distinto costo en distintas fechas. **Decisión:** costo promedio por variante, recalculado en cada compra; cada renglón de venta guarda el costo del momento. **Consecuencias:** utilidad histórica estable; no hay seguimiento por lote (FIFO).

### ADR-002 · Precios con IVA incluido, sin facturar
**Decisión del dueño.** Las ventas no desglosan IVA ni generan CFDI. El IVA solo se registra en gastos. **Consecuencias:** facturación es una fase futura (05).

### ADR-003 · Costos en tablas aparte
**Contexto:** RLS protege filas, no columnas. **Decisión:** `costos_variante` y `venta_item_costos` son tablas separadas, legibles solo por el dueño. **Consecuencias:** las consultas del panel usan funciones `security definer` o uniones con esas tablas.

### ADR-004 · El color de la ropa va en el nombre; la talla es la variante
**Contexto:** el Excel agrupa colores y tallas en una sola celda. **Decisión:** categorías de ropa con atributo `talla`; el color en el nombre del producto (“Playera Boss Negra”), con “Duplicar producto” para agilizar. **Consecuencias:** se puede cambiar a `{talla,color}` sin tocar el esquema si el dueño lo pide.

### ADR-005 · Stack
Next.js 15 (App Router) + Supabase (Postgres, Auth, Storage) + Tailwind 4, como PWA. **Sin** `service_role` en la app; la seguridad es RLS + funciones. Dependencias de cliente: `@supabase/ssr`, `papaparse` (CSV), `jspdf` + `jsbarcode` (etiquetas), `@zxing/browser` (cámara). Pruebas con `vitest`.

### ADR-006 · Ganancia neta provisional en una sola función
**Decisión:** `fn_ganancia_neta()` concentra la fórmula (Q-01). Cambiarla es reemplazar una función, no tocar reportes.

### ADR-007 · Stock mediante bitácora
**Decisión:** `movimientos_inventario` + trigger. Cualquier cambio de existencias es auditable (quién, cuándo, por qué). Los ajustes exigen motivo.

### ADR-008 · Zona horaria de México
**Contexto:** Supabase corre en UTC; una venta a las 21:00 en México ya es “mañana” en UTC. **Decisión:** `hoy_mx()` y comparaciones `at time zone 'America/Mexico_City'`. La importación histórica fija las 12:00 a `-06:00` (México no usa horario de verano desde 2022).

### ADR-009 · Importación por CSV, no Excel
**Contexto:** el paquete `xlsx` de npm está desactualizado y con vulnerabilidades conocidas. **Decisión:** CSV con plantilla (cualquier hoja de cálculo lo exporta), con vista previa y validación por fila.

### ADR-010 · Pruebas de reglas de negocio en SQL
**Decisión:** las reglas críticas (stock, costos, permisos, caja, panel) se prueban contra PostgreSQL real con `supabase/tests/`, simulando `auth` y `storage` (`00_stubs.sql`). **Consecuencias:** se pueden correr sin un proyecto Supabase; no sustituyen probar contra el proyecto real.

### ADR-011 · Las cuentas nuevas nacen sin permisos (rol `cliente`)
**Contexto:** el disparador original creaba todo perfil nuevo como `vendedora`. Con el registro de clientes abierto (o incluso con el registro por defecto de Supabase), **cualquiera con la URL y la clave pública habría obtenido acceso de personal**. **Decisión:** nuevo valor `cliente` en `rol_usuario`; `handle_new_user` crea siempre `cliente`; `es_staff()` exige `dueno` o `vendedora`. El dueño promueve al personal desde el panel (Clientes → “Dar acceso como vendedora”). **Consecuencias:** las vendedoras ya existentes conservan su rol; las cuentas de personal nuevas deben promoverse.

### ADR-012 · Pedidos sin pago en línea y sin reservar existencias
**Decisión:** el cliente crea un *pedido* (copia de contacto, dirección y precios); el dueño lo **confirma** y entonces se registra la venta canal `web` con `registrar_venta`. Las existencias no se reservan al pedir. **Consecuencias:** posible sobreventa entre pedido y confirmación (la confirmación falla si falta stock); evita bloquear piezas por pedidos que nunca se pagan.

### ADR-013 · Carrito en el navegador
**Decisión:** el carrito vive en `localStorage` (solo variante y cantidad), sin tabla en la base de datos y sin cuenta. Los precios y existencias se consultan siempre al servidor. **Consecuencias:** el carrito no se sincroniza entre dispositivos.

### ADR-014 · Pedidos solo con cuenta
**Decisión:** para crear un pedido hace falta cuenta (evita pedidos anónimos de spam y asegura datos de contacto). Quien no quiera cuenta usa **Pedir todo por WhatsApp** (R-CAR-04). Pedidos como invitado: ver Q-08.

### ADR-015 · Sin fuentes externas
**Decisión:** tipografía con pilas del sistema (serif elegante para títulos). **Consecuencias:** sin dependencia de Google Fonts ni problemas de privacidad o red; se puede cambiar por una fuente propia con `next/font`.

### ADR-016 · Alta de empleados desde el panel, sin `service_role`
**Contexto:** crear cuentas con contraseña normalmente exige la clave `service_role`, que no debe estar en la aplicación (C-09). **Decisión:** el panel crea la cuenta con un **cliente de Supabase aislado** (sin sesión persistente) usando el registro público, y luego el dueño —con su propia sesión— cambia el rol a `vendedora` (la política de `profiles` solo se lo permite al dueño). La cuenta nueva nunca toca la sesión del dueño. **Consecuencias:** requiere que el registro público esté habilitado; si la confirmación de correo está activa, el empleado debe confirmarla; no se puede restablecer la contraseña de un empleado desde el panel (se cambia desde su Mi cuenta o en Supabase).

### ADR-017 · Caja opcional mediante una bandera
**Decisión del dueño:** por ahora no se abre caja para vender. `registrar_venta` ya aceptaba ventas sin caja; la bandera `NEXT_PUBLIC_USAR_CAJA` (apagada) oculta el módulo y quita la exigencia en el POS. **Consecuencias:** sin corte de caja no hay “efectivo esperado”; el módulo y sus pruebas se conservan para reactivarlo sin migraciones.

### ADR-018 · Método de pago por pedido y comprobantes en almacenamiento privado
**Decisión:** el pedido guarda el método elegido (`metodo_pago`); las reglas (envío ⇒ transferencia) se validan en `crear_pedido`. Los comprobantes se suben al bucket privado `comprobantes` bajo `<cliente>/<pedido>/<archivo>`; las políticas de almacenamiento permiten subir solo a la carpeta propia de un pedido propio y *nuevo*, y leer solo al dueño del archivo y al dueño de la boutique. El registro en base de datos pasa por `adjuntar_comprobante`, que valida pedido, formato, tamaño, límite y que el archivo exista.
