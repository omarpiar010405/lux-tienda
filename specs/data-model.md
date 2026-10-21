# Modelo de datos, permisos y contratos

Fuente de verdad: `supabase/migrations/`. Este documento lo resume; si difiere de las migraciones, **gana la migración** y este documento se corrige.

## Enumeraciones
`rol_usuario` (dueno, vendedora, **cliente**) · `canal_venta` (mostrador, instagram, whatsapp, facebook, otro, web) · `metodo_pago` (efectivo, tarjeta, transferencia) · `estado_venta` (completada, cancelada) · `tipo_movimiento` (conteo_inicial, entrada, venta, devolucion, ajuste) · `seccion_producto` (hombre, mujer, unisex, na) · `estado_pedido` (nuevo, confirmado, enviado, entregado, cancelado) · `entrega_pedido` (envio, recoger)

## Tablas
| Tabla | Para qué | Notas |
|---|---|---|
| `profiles` | Usuarios y rol | Se crea sola al registrarse un usuario (rol vendedora) |
| `categorias` | Tipos de producto | `opciones text[]` = atributos de variante (1–2) |
| `productos` | Diseños/artículos | `marca`, `seccion`, `activo` |
| `producto_fotos` | Fotos | `url` pública en Storage (bucket `productos`) |
| `variantes` | Unidad vendible | Única por (producto, opciones); `stock` ≥ 0; `codigo_barras` único |
| `costos_variante` | Costo promedio | **Solo dueño** |
| `movimientos_inventario` | Bitácora de existencias | Cantidad con signo; un trigger actualiza `variantes.stock` |
| `compras`, `compra_items` | Entradas de mercancía con costo | **Solo dueño** |
| `ventas`, `venta_items`, `pagos` | Ventas | `folio` consecutivo; solo por función |
| `venta_item_costos` | Costo guardado por renglón | **Solo dueño** (lectura) |
| `cortes_caja` | Apertura y cierre de caja | Una sola abierta (índice único parcial) |
| `proveedores` | Catálogo simple | **Solo dueño** |
| `gastos` | Egresos | `total` generado = subtotal + iva; **solo dueño** |
| `clientes` | Ficha de la clienta (nombre, correo, teléfono, novedades) | Una por cuenta; la crea `handle_new_user`; **el cliente y el dueño** |
| `direcciones` | Libreta de direcciones (máx. 10, una principal) | **El cliente y el dueño** |
| `pedido_comprobantes` | Comprobantes de pago de un pedido (ruta en el bucket privado `comprobantes`) | Solo por `adjuntar_comprobante`; **el cliente (los suyos) y el dueño** |
| `pedidos`, `pedido_items` | Pedidos de la tienda con copia de contacto, dirección y precios | Solo por función; **el cliente (los suyos) y el dueño** |

Vista pública: `catalogo_publico` (productos y variantes visibles; sin costos).

## Permisos (RLS)
| Tabla | Dueño | Vendedora | Anónimo |
|---|---|---|---|
| profiles | todo | solo su fila | — |
| categorias, productos, producto_fotos, variantes | todo | lectura | — |
| costos_variante, compras, compra_items, proveedores, gastos | todo | **nada** | — |
| movimientos_inventario | lectura + insertar (≠ venta) | lectura | — |
| ventas, venta_items, pagos | lectura de todo | lectura de **las suyas** | — |
| venta_item_costos | lectura | **nada** | — |
| cortes_caja | lectura, abrir, cerrar | lectura, abrir, cerrar | — |
| catalogo_publico (vista) | lectura | lectura | **lectura** |
| clientes, direcciones | lectura de todos (dueño) | **nada** | — · el cliente: solo las suyas |
| pedidos, pedido_items | lectura de todos | **nada** | — · el cliente: solo los suyos |

El rol `cliente` **no** cuenta como personal: `es_staff()` solo es verdadero para `dueno` y `vendedora` activos.

Almacenamiento: bucket público `productos` (fotos; sube solo el dueño) y bucket privado `comprobantes` (sube la clienta a su carpeta; lee ella y el dueño).

Las escrituras de ventas, compras, costos y caja ocurren solo dentro de funciones `security definer`.

## Funciones (contratos)
| Función | Quién | Qué hace / reglas |
|---|---|---|
| `crear_producto_con_compra(p_categoria, p_nombre, p_precio, p_variantes, p_descripcion?, p_marca?, p_seccion?, p_fotos?, p_fecha?, p_proveedor?) → uuid` | dueño | Crea producto, fotos y variantes; si hay piezas, registra la compra. `p_variantes`: `[{opciones, cantidad, costo_unitario, precio?, codigo_barras?}]`. Con `cantidad > 0` el costo es obligatorio. |
| `registrar_compra(p_fecha, p_proveedor, p_notas, p_items) → uuid` | dueño | `p_items`: `[{variante_id, cantidad, costo_unitario, precio_venta?}]`. Recalcula costo promedio, suma stock (movimiento `entrada`). |
| `registrar_venta(p_canal, p_items, p_pagos, p_cliente?, p_notas?, p_fecha?) → bigint (folio)` | staff | `p_items`: `[{variante_id, cantidad, descuento?}]`; `p_pagos`: `[{metodo, monto}]` que sumen el total. Guarda costo por renglón y descuenta stock. `p_fecha`, `precio_unitario` y `costo_unitario` en renglones: **solo dueño** (importación histórica; sin caja). |
| `cancelar_venta(p_venta_id)` | dueño | Marca cancelada y devuelve piezas (movimiento `devolucion`). |
| `abrir_caja(p_fondo) → uuid` · `resumen_caja(p_corte_id?) → jsonb` · `cerrar_caja(p_efectivo_contado, p_notas?) → jsonb` | staff | Una sola caja abierta. `efectivo_esperado = fondo + pagos en efectivo`. |
| `pos_buscar(p_q, p_limit?)` | staff | Búsqueda por palabras o código de barras exacto; sin costos. |
| `panel_resumen`, `panel_por_categoria`, `panel_ventas`, `panel_inventario`, `panel_stock_bajo`, `panel_sin_movimiento`, `panel_mas_vendidos` | dueño | Ver `03-gastos-y-panel.md`. |
| `fn_ganancia_neta(utilidad_bruta, gastos_total)` | interna | **Única** definición de ganancia neta. |
| `crear_pedido(p_items, p_entrega, p_direccion_id?, p_notas?, p_metodo?) → jsonb {id, numero}` | cliente con sesión | `p_items`: `[{variante_id, cantidad}]`. Valida existencias (sin reservar), toma precios del servidor y guarda copia de contacto y dirección. `p_metodo` (por defecto transferencia): envío ⇒ solo transferencia. |
| `adjuntar_comprobante(p_pedido_id, p_ruta, p_nombre, p_mime, p_tamano) → uuid` | cliente con sesión | Solo pedidos propios, por transferencia y en estado *nuevo*; ruta `<cliente>/<pedido>/…`; JPG/PNG/WEBP/HEIC/PDF ≤ 10 MB; máx. 5; el archivo debe existir. |
| `confirmar_pedido(p_pedido_id, p_metodo?) → bigint (folio)` | dueño | Registra la venta canal `web` con `registrar_venta` y enlaza el pedido. Método por defecto: el del pedido. Atómica. |
| `cambiar_estado_pedido(p_pedido_id, p_estado)` | dueño | `confirmado→enviado→entregado`; `confirmado→entregado` si recoge; cancelar solo `nuevo`/`confirmado` (cancela la venta si existe). |
| `productos_populares(p_limit?) → producto_id[]` | público | Orden por piezas vendidas en 90 días, con existencias; sin cifras. |
| `hoy_mx()`, `nuevo_codigo_barras()`, `es_dueno()`, `es_staff()` | internas | Utilidades. |

## Migraciones
| Archivo | Contenido |
|---|---|
| `0001_esquema_base.sql` | Tablas base, trigger de stock, RLS, vista pública, funciones iniciales |
| `0002_storage_y_crear_producto.sql` | Bucket de fotos y políticas (+ función inicial, retirada en 0004) |
| `0003_compras_costos.sql` | Marca/sección, compras, costo promedio, costo por venta, canal web, categorías |
| `0004_pos_caja.sql` | `hoy_mx`, `pos_buscar`, caja; retira `crear_producto` |
| `0005_gastos_proveedores_panel.sql` | Gastos, proveedores, `fn_ganancia_neta`, funciones del panel |
| `0006_rol_cliente.sql` | Agrega el valor `cliente` al enum de roles (debe ir en su propia ejecución) |
| `0007_tienda_clientes_pedidos.sql` | Corrige permisos por defecto; clientes, direcciones, pedidos y sus funciones; `productos_populares` |
| `0008_pedidos_pago_comprobantes.sql` | Método de pago en pedidos, comprobantes y su bucket privado |
