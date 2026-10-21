# AGENTS.md · Reglas para cualquier IA (y persona) que trabaje en este repositorio

Este proyecto sigue **Desarrollo Guiado por Especificaciones (SDD)**. La fuente de verdad son los documentos de `specs/`, no tu intuición ni lo que “suele hacerse”. Es un **MVP**: se construye solo lo que está especificado.

## Orden de autoridad (si dos cosas chocan, gana la de arriba)
1. `specs/constitution.md` — reglas que no se negocian.
2. `specs/0X-*.md` — la spec de la funcionalidad.
3. `specs/data-model.md` y `specs/decisions.md`.
4. Migraciones SQL (`supabase/migrations/`).
5. El código.

## Antes de escribir código
1. Lee la constitución y la spec de lo que vas a tocar (`specs/README.md` tiene el índice).
2. Si lo que te piden **contradice** la constitución o una spec: **detente y avisa**. No lo “arregles” por tu cuenta.
3. Si lo que te piden **no está en ninguna spec**: no lo implementes todavía. Escribe una propuesta en `specs/proposals/AAAA-MM-DD-tema.md` (plantilla en `specs/_template/spec.md`) y espera aprobación del dueño del proyecto.
4. Si algo es ambiguo, revisa `specs/open-questions.md`. Si no está ahí, pregunta; no adivines.

## Prohibido (sin excepciones)
- **Editar migraciones ya existentes** (`0001`…`0005`). Cualquier cambio de base de datos es una migración **nueva y numerada** (`0006_…`).
- Usar la clave `service_role` (ni siquiera “solo para crear empleados”: ver ADR-016), o poner claves/secretos en el código, el repo o variables `NEXT_PUBLIC_*` que no sean la clave pública.
- Mostrar costos, costo promedio, utilidades, compras o gastos a la vendedora (C-03).
- Dar un rol de personal (`dueno`/`vendedora`) por defecto a una cuenta nueva, o exponer datos de clientes a quien no sea el propio cliente o el dueño (C-09, C-16).
- Modificar `variantes.stock` directamente. El stock solo cambia insertando en `movimientos_inventario`, normalmente a través de las funciones (C-02).
- Insertar ventas, compras, pedidos o cortes de caja con `insert` directo desde la app: solo mediante las funciones `registrar_venta`, `registrar_compra`, `crear_producto_con_compra`, `cancelar_venta`, `abrir_caja`, `cerrar_caja`, `crear_pedido`, `adjuntar_comprobante`, `confirmar_pedido`, `cambiar_estado_pedido` (C-04).
- Desactivar RLS o “resolver” un error de permisos con una política abierta. Un error de permisos casi siempre significa que el código está mal.
- Calcular ganancia neta en otro lugar que no sea `fn_ganancia_neta()` (SQL) y documentarla en `specs/03-gastos-y-panel.md`.
- Usar `new Date()` para decidir “hoy” del negocio: usa `hoyMX()` (TS) o `hoy_mx()` (SQL) (C-08).
- Implementar cualquier cosa de `specs/05-fuera-de-alcance.md`.
- Agregar dependencias nuevas sin registrar el motivo en `specs/decisions.md`.
- Borrar, saltar o debilitar una prueba para que “pase”. Si una prueba falla, el código o la spec está mal: arréglalo o repórtalo.
- Usar `any`, desactivar reglas de ESLint o `@ts-ignore` para silenciar errores.
- Inventar tablas, columnas o funciones: consulta `specs/data-model.md`.

## Obligatorio
- Todo cambio de comportamiento actualiza **su spec y su prueba en el mismo cambio** (C-14).
- Todo cambio en SQL pasa `npm run test:db`. Todo cambio en la app pasa `npm run verify`.
- Mensajes e interfaz en **español (es-MX)**; nombres del dominio como en el esquema (`variantes`, `costo_promedio`, `canal`…).
- Dinero en MXN con `numeric(10,2)` en SQL; formatear con `mxn()`.
- Mantén los cambios pequeños y enfocados. No refactorices lo que no te pidieron.

## Comandos
| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run check` | Tipos + lint + pruebas unitarias |
| `npm run build` | Compilar para producción |
| `npm run verify` | `check` + `build` (**debe pasar antes de entregar**) |
| `npm run test:e2e` | Prueba la tienda en un navegador real con datos de ejemplo (requiere `pip install playwright pillow` y `playwright install chromium`) |
| `npm run test:db` | Aplica todas las migraciones en una base temporal y corre `supabase/tests/` (requiere PostgreSQL local y `psql`) |

## Next.js 15 (errores típicos de IAs)
- `params` y `searchParams` son **Promesas**: `await params`. `cookies()` también es asíncrona.
- Páginas y layouts son Server Components; usa `"use client"` solo cuando haga falta (estado, eventos, APIs del navegador).
- El control de rol se hace en layouts con `requireDueno()` / `requireStaff()` (`src/lib/auth.ts`) **y** en RLS. Nunca solo en la interfaz.
- No uses `localStorage` para datos del negocio. **Única excepción:** el carrito del cliente (spec 06, ADR-013).

## Mapa del repositorio
- `specs/` — especificaciones (qué y por qué). **Empieza aquí.**
- `supabase/migrations/` — esquema y funciones (inmutables, numeradas).
- `supabase/tests/` — pruebas SQL de reglas de negocio.
- `src/lib/` — lógica pura (cálculos, importación, formato) con pruebas `*.test.ts`.
- `src/app/admin/` (dueño) · `src/app/pos/` (dueño y vendedora) · `src/app/(tienda)/` (tienda pública, cuentas y pedidos de clientes).
- `src/components/` — componentes de cliente.

## Cuando termines
Resume qué cambiaste, qué spec/prueba actualizaste, y cualquier duda que quedó abierta (añádela a `specs/open-questions.md`).
