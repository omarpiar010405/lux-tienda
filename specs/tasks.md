# Estado de implementación

`[x]` hecho y probado · `[~]` hecho, sin prueba automática (probar a mano) · `[ ]` pendiente

## Fase 1 · Catálogo y compras
- [x] R-CAT-01/02 Categorías con atributos (panel + iniciales)
- [x] R-CAT-03…07 Productos, variantes, códigos de barras editables
- [~] R-CAT-04 Compresión de fotos y subida a Storage (requiere navegador)
- [x] R-COM-01…04 Compras y costo promedio
- [x] R-COM-05 Lista de compras y CSV
- [x] R-INV-01 Ajuste de existencias con motivo
- [x] R-INV-02 Duplicar producto
- [~] R-ETQ-01 Etiquetas PDF con códigos de barras
- [x] R-IMP-01…04 Importación CSV (validación probada; carga contra Supabase: probar a mano)
- [x] R-PRV-01 Proveedores

## Fase 2 · Punto de venta
- [x] R-POS-01 Caja obligatoria
- [~] R-POS-02 Búsqueda, lector USB y cámara (la cámara requiere HTTPS o localhost)
- [x] R-POS-03…06 Carrito, canal, pagos, registro atómico
- [~] R-POS-07 Ticket por WhatsApp / copiar / imprimir
- [x] R-POS-08 Corte de caja
- [x] R-POS-09/10/11 Cancelación y permisos

## Fase 3 · Gastos y panel
- [x] R-GAS-01 Gastos
- [x] R-USR-01 Usuarios
- [x] R-PAN-01…06 Panel y fórmulas

## Fase 4 · Catálogo público
- [x] R-WEB-01…04 Catálogo y WhatsApp
- [~] R-WEB-05 PWA instalable

## Fase 5 (ampliada) · Tienda en línea (spec 06)
- [x] R-CLI-02 Rol `cliente` y corrección de permisos por defecto (`30_tienda.sql`)
- [~] R-DIS-01…03 Marca negro/blanco/dorado (revisada con capturas en escritorio y celular)
- [x] R-HOME-01…04 Inicio, tienda, producto (prueba en navegador: `npm run test:e2e`)
- [x] R-CAR-01…05 Carrito y pedido por WhatsApp (`carrito.test.ts` + prueba en navegador)
- [~] R-CLI-01,03,05 Registro, direcciones y aviso de privacidad (validaciones probadas; el alta real requiere Supabase)
- [x] R-CLI-04 Datos personales solo del cliente y el dueño (`30_tienda.sql`)
- [~] R-CLI-06 Clientes en el panel y “Dar acceso como vendedora”
- [x] R-PED-02,05,06 Crear, confirmar y cambiar estado de pedidos (`30_tienda.sql`)
- [~] R-PED-01,03,04,07,08 Pantallas de checkout, pedido, bandeja del dueño e historial
- [x] R-PED-09 Horario de la tienda al elegir "recoger en tienda" (`horarios.test.ts`)

## Mejoras de pedidos, personal y panel (spec 06 · R-PAY, R-USR-02, ADR-016/017)
- [x] R-PAY-01,02 Método de pago por pedido y regla envío ⇒ transferencia (`40_pagos.sql`)
- [x] R-PAY-04,05 Comprobantes: formatos, límites y almacenamiento privado (`40_pagos.sql`, `pagos.test.ts`)
- [~] R-PAY-03,06 Pantallas: elegir método, subir comprobante, verlos en el panel (lista del panel verificada en navegador; la subida real requiere Supabase)
- [~] R-USR-02 Alta de empleados desde el panel y cambio de contraseña
- [x] R-POS-01 Venta sin caja (caja desactivada por bandera)
- [x] Navegación lateral del panel del dueño (prueba en navegador: barra fija, grupos, enlace activo, contador, menú en celular, todos los enlaces visibles)

## Pendiente de confirmar con el dueño
- [ ] Q-01…Q-07 (ver `open-questions.md`)

## Siguiente (solo con spec aprobada)
Ver `05-fuera-de-alcance.md`.
