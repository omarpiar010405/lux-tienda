# 06 · Tienda en línea: marca, carrito, cuentas de clientes y pedidos

**Estado:** aprobada por el dueño del proyecto (15/oct/2026). Amplía `04-catalogo-publico.md` y mueve a alcance lo que estaba en `05-fuera-de-alcance.md` (carrito, directorio de clientes y checkout **sin pago en línea**).

## Problema
Las clientas llegan por Instagram y piden varios productos a la vez. Hoy el catálogo es de un solo producto por mensaje, sin identidad de marca, y no se guardan datos de contacto ni de entrega. La tienda debe verse como una boutique de lujo (negro, blanco y dorado), permitir armar un pedido con varios productos y conservar los datos de las clientas.

## Requisitos

### Marca y diseño
- **R-DIS-01** Paleta de marca: **negro, blanco y dorado**. Títulos en tipografía serif; texto en sans. Logotipo “LUX BOUTIQUE” como componente (no imagen). Nombre, lema y textos de marca se editan en `src/lib/marca.ts` y variables de entorno, sin tocar componentes.
- **R-DIS-02** Móvil primero, accesible: contraste suficiente (AA), foco visible, controles con etiqueta, objetivos táctiles ≥ 40 px.
- **R-DIS-03** El panel y el POS usan el encabezado de marca pero conservan su interfaz utilitaria.

### Inicio y tienda
- **R-HOME-01** El inicio muestra: barra de anuncio opcional, encabezado (logo, navegación, búsqueda, cuenta, carrito con contador), portada, **categorías disponibles** (solo las que tienen productos visibles con existencias, con foto), **productos populares** (hasta 8), cómo comprar y pie de página con WhatsApp e Instagram.
- **R-HOME-02** *Populares* = productos con más piezas vendidas en los últimos 90 días (solo ventas completadas), con existencias; si hay pocos con ventas, se completa con los más recientes. La vista pública **no expone cifras** de ventas, solo el orden (C-03).
- **R-HOME-03** `/tienda` lista todo el catálogo con filtros por categoría y sección, búsqueda y orden (populares, precio, nombre).
- **R-HOME-04** La página de producto muestra galería, variantes con disponibilidad, cantidad, **Agregar al carrito**, **Pedir por WhatsApp** y productos de la misma categoría.

### Carrito
- **R-CAR-01** El carrito funciona **sin cuenta** y se guarda en el navegador (`localStorage`). Es la única excepción a “no usar localStorage para datos del negocio”; no contiene precios, solo variante y cantidad.
- **R-CAR-02** Una variante repetida suma cantidad. Máximo por renglón: el menor entre las existencias y 20.
- **R-CAR-03** La página del carrito consulta siempre precios y existencias actuales; avisa si un producto ya no está disponible o si hay menos piezas de las pedidas; permite cambiar cantidad y quitar.
- **R-CAR-04** **Pedir todo por WhatsApp**: un solo mensaje con todos los renglones y el total estimado, sin necesidad de cuenta.
- **R-CAR-05** **Finalizar pedido** lleva al checkout (requiere cuenta).

### Cuentas de clientes
- **R-CLI-01** Registro con: nombre, apellidos, correo, teléfono (10 dígitos), contraseña (mínimo 8) y aceptación del aviso de privacidad; casilla opcional para recibir novedades.
- **R-CLI-02** Toda cuenta nueva nace con rol `cliente`, **sin ningún permiso del negocio**. El personal recibe su rol del dueño (C-09, ADR-011).
- **R-CLI-03** *Mi cuenta*: editar datos; libreta de **direcciones** (hasta 10, una principal) con formulario tipo Shopify: país (México, fijo), nombre, apellidos, teléfono, calle y número, interior (opcional), colonia, ciudad o municipio, estado, código postal (5 dígitos), referencias (opcional).
- **R-CLI-04** Los datos personales solo los ven el propio cliente y el dueño (C-16). La vendedora no.
- **R-CLI-05** Existe una página de **aviso de privacidad** (borrador que el dueño debe completar y revisar).
- **R-CLI-06** El dueño ve la lista de clientes (exportable a CSV) y puede dar acceso de vendedora a una cuenta registrada.

### Pedidos
- **R-PED-01** *Checkout*: entrega **a domicilio** (dirección guardada o nueva) o **recoger en tienda**; **método de pago** (ver R-PAY); notas opcionales; resumen. **No hay cobro en línea**: el pago se hace por transferencia o en la tienda.
- **R-PED-02** `crear_pedido` valida: sesión, cuenta activa, teléfono, carrito no vacío (máx. 30 renglones, 20 piezas por renglón, sin repetidos), productos visibles, existencias suficientes (sin reservarlas), y máximo 5 pedidos pendientes por cliente. Los precios los toma el servidor (C-05). Guarda una copia del contacto, la dirección y los renglones.
- **R-PED-03** Al crearse, el cliente ve el pedido con su número, las instrucciones de pago (configurables) y un botón de WhatsApp que **avisa a la boutique** con el número de pedido.
- **R-PED-04** El dueño ve los pedidos nuevos (con contador en el menú), su detalle con contacto y entrega, y puede escribir a la clienta por WhatsApp.
- **R-PED-05** *Confirmar pedido* (dueño): registra una **venta de canal web** con precios vigentes (descuenta existencias, guarda costo promedio, entra al panel). El método de pago por defecto es el que eligió la clienta; el dueño puede cambiarlo. Es atómico: si falta stock, no se confirma.
- **R-PED-06** Estados: `nuevo → confirmado → enviado → entregado`; en entrega por recoger, `confirmado → entregado`. Se puede **cancelar** solo un pedido `nuevo` o `confirmado`; cancelar uno confirmado cancela su venta y devuelve las piezas.
- **R-PED-07** El cliente ve el historial y el estado de sus pedidos.
- **R-PED-08** El costo de envío **no** lo calcula el sistema: se acuerda por WhatsApp. El total del pedido es solo el de los productos.
- **R-PED-09** Al elegir **recoger en tienda**, el checkout muestra el **horario de la boutique**: de **lunes a viernes, de 9:00 a 16:00 h** (no se atiende el fin de semana) y la dirección de la tienda. El texto del horario se cambia sin tocar código con `NEXT_PUBLIC_HORARIO_TIENDA` (`src/lib/horarios.ts`).

### Pago de pedidos y comprobantes
- **R-PAY-01** Al hacer el pedido la clienta **elige el método de pago**: *transferencia bancaria*, *efectivo al recoger* o *tarjeta al recoger*. El método queda guardado en el pedido.
- **R-PAY-02** **Envío a domicilio ⇒ solo transferencia** (se paga antes de enviar). Efectivo y tarjeta solo existen al **recoger en tienda**. La base de datos lo exige, no solo la pantalla (Q-13).
- **R-PAY-03** Con transferencia se muestran las instrucciones de pago (configurables) y la clienta puede **adjuntar su comprobante** al hacer el pedido o después, mientras el pedido siga *nuevo*.
- **R-PAY-04** *Formatos aceptados:* JPG, PNG, WEBP, HEIC/HEIF (fotos de iPhone) y **PDF**; máximo **10 MB** por archivo y **5 comprobantes** por pedido. Las fotos grandes se reducen automáticamente (si el navegador puede); los PDF y HEIC se suben tal cual.
- **R-PAY-05** Los comprobantes viven en un almacenamiento **privado** (`comprobantes`): solo los ve la clienta dueña del pedido y el dueño de la boutique, mediante enlaces temporales. Se registran solo mediante `adjuntar_comprobante` (C-04, C-16).
- **R-PAY-06** El dueño ve en cada pedido el método de pago y los comprobantes (miniaturas o enlace al PDF), con una marca en la lista (“Comprobante recibido” / “Falta comprobante”). Antes de confirmar un pedido por transferencia **sin comprobante**, el sistema pide confirmación. El sistema **no valida** el comprobante: lo revisa el dueño (Q-15).

## Criterios de aceptación
- **Dado** que alguien se registra, **entonces** su perfil tiene rol `cliente`, `es_staff()` es falso y no ve ventas, costos, compras, gastos ni puede llamar al POS o al panel.
- **Dado** un carrito con 2 playeras M y 1 perfume, **cuando** hace un pedido, **entonces** se crea con total = Σ precio × cantidad del servidor y las existencias **no** cambian.
- **Dado** un pedido con más piezas que las existencias, **entonces** se rechaza con el nombre del producto y lo que queda.
- **Dado** una dirección de otra cliente, **cuando** se intenta usar, **entonces** se rechaza.
- **Dado** un pedido nuevo, **cuando** el dueño lo confirma, **entonces** se crea una venta `web`, el stock baja, el pedido pasa a `confirmado` y enlaza la venta.
- **Dado** un pedido confirmado, **cuando** se cancela, **entonces** la venta se cancela y las piezas regresan.
- **Dado** un pedido `entregado`, **entonces** no se puede cancelar ni cambiar.
- **Dado** otra clienta, **entonces** no ve mis pedidos ni mis direcciones.
- **Dado** una dirección con código postal de 4 dígitos, **entonces** se rechaza.
- **Dado** el carrito guardado, **cuando** se recarga la página, **entonces** se conserva; **cuando** un producto se oculta, **entonces** el carrito lo marca como no disponible.

- **Dado** un pedido con envío a domicilio, **cuando** se elige efectivo o tarjeta, **entonces** se rechaza.
- **Dado** un pedido por transferencia, **cuando** la clienta sube un PDF o una foto de hasta 10 MB, **entonces** queda ligado al pedido y el dueño puede verlo.
- **Dado** un archivo de otro formato (por ejemplo .exe) o de más de 10 MB, **entonces** se rechaza.
- **Dado** otra clienta o una vendedora, **cuando** intenta ver o subir comprobantes de un pedido ajeno, **entonces** no puede.
- **Dado** un pedido pagado en efectivo al recoger, **cuando** el dueño lo confirma, **entonces** la venta queda con pago en efectivo.
- **Dado** un checkout, **cuando** se elige *recoger en tienda*, **entonces** se muestra el horario de la boutique (lunes a viernes de 9:00 a 16:00 h) y la dirección de la tienda.

## Fuera de alcance (de esta spec)
Cobro en línea con tarjeta, validación automática de comprobantes, cálculo de costo de envío, paqueterías y guías, cupones y descuentos, reseñas, lista de deseos, pedidos como invitado (sin cuenta), cambio o recuperación de contraseña personalizados (se usa el flujo de Supabase), facturación.

## Impacto técnico
Migraciones `0006` y `0007`: rol `cliente`, `es_staff()` solo para dueño y vendedora, `handle_new_user` crea perfil `cliente` y su ficha, tablas `clientes`, `direcciones`, `pedidos`, `pedido_items`, funciones `crear_pedido`, `confirmar_pedido`, `cambiar_estado_pedido`, `productos_populares`. Rutas `(tienda)/…`, `/admin/pedidos`, `/admin/clientes`.

## Implementado en
`supabase/migrations/0006…0007`, `src/lib/{marca,carrito,clientes,catalogo,horarios}.ts`, `src/components/tienda/*`, `src/app/(tienda)/*`, `src/app/admin/{pedidos,clientes}/`.

## Pruebas
`supabase/tests/30_tienda.sql`, `src/lib/{carrito,clientes,catalogo,horarios}.test.ts` y `npm run test:e2e` (navegador real con datos de ejemplo: carrito, filtros, validaciones, menú móvil, rutas privadas).
