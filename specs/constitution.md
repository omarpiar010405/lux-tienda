# Constitución del proyecto

Reglas que **no se negocian**. Cada una tiene un ID para citarla en código, revisiones y propuestas. Cambiarlas requiere decisión explícita del dueño del proyecto y una entrada en `decisions.md`.

| ID | Regla |
|---|---|
| **C-01** | **Inventario único.** Mostrador, redes y catálogo público descuentan de la misma existencia. No hay inventarios paralelos. |
| **C-02** | **El stock solo cambia por movimientos.** Todo cambio de existencias es una fila en `movimientos_inventario` (con tipo, cantidad con signo, usuario y fecha). `variantes.stock` se actualiza por trigger y **nunca puede ser negativo** (restricción CHECK). |
| **C-03** | **Costos y utilidades son solo del dueño.** Viven en tablas aparte (`costos_variante`, `venta_item_costos`, `compras`, `compra_items`, `gastos`) protegidas por RLS, y en funciones `panel_*` que exigen rol dueño. La vendedora no puede verlos por ningún camino (interfaz, consulta directa o función). |
| **C-04** | **Operaciones críticas solo por funciones SQL.** Vender, comprar, crear producto con compra, cancelar, abrir y cerrar caja ocurren dentro de una función atómica (`security definer`) que valida rol y reglas. La app no hace `insert` directo en esas tablas. |
| **C-05** | **El servidor manda.** Precios, costos, totales y folios los calcula la base de datos. El navegador solo envía intenciones (qué variante, cuántas, cómo pagó). |
| **C-06** | **Dinero.** MXN, `numeric(10,2)`. Los precios de venta **incluyen IVA**; no se factura ni se desglosa IVA en ventas (ADR-002). El IVA solo aparece en gastos. |
| **C-07** | **Costo promedio ponderado.** Cada compra recalcula el costo promedio de la variante; cada renglón de venta guarda el costo vigente en ese momento, de modo que la utilidad histórica no cambia (ADR-001). |
| **C-08** | **Zona horaria del negocio:** `America/Mexico_City`. Fechas de negocio con `hoy_mx()` (SQL) y `hoyMX()` (TS); los periodos del panel se interpretan en esa zona. |
| **C-09** | **Seguridad por capas.** RLS siempre activo. El cliente usa solo la clave pública; `service_role` nunca sale de Supabase. El rol se valida en el servidor (layouts) y en la base de datos, nunca solo en la interfaz. **Toda cuenta nueva nace sin permisos** (rol `cliente`); el personal recibe su rol del dueño (ADR-011). |
| **C-10** | **MVP.** Se construye únicamente lo especificado. Lo demás vive en `05-fuera-de-alcance.md` hasta que el dueño apruebe su spec. |
| **C-11** | **Migraciones inmutables y ordenadas.** Una migración aplicada no se edita; se agrega otra. Toda migración pasa `npm run test:db`. |
| **C-12** | **Idioma.** Interfaz y mensajes de error en español (es-MX). Los nombres del dominio siguen el esquema. |
| **C-13** | **Simplicidad.** Código aburrido y legible; dependencias mínimas; sin abstracciones “por si acaso”. |
| **C-14** | **Spec y prueba viajan con el cambio.** Si cambia el comportamiento, cambian en el mismo commit su spec y su prueba. |
| **C-15** | **Honestidad con los datos.** Nunca se inventan ni se “adivinan” datos del negocio (por ejemplo, el reparto de tallas al importar). Si falta información, se pregunta o se marca como pendiente. |
| **C-16** | **Datos personales.** Los datos de clientes (nombre, correo, teléfono, direcciones, pedidos) solo los ven el propio cliente y el dueño. Se piden únicamente los necesarios para vender y entregar, con aviso de privacidad. |
