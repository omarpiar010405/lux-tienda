-- Pago de pedidos: método, comprobantes (formatos, límites, almacenamiento privado) y confirmación.
\set ON_ERROR_STOP 1

insert into auth.users (id, email, raw_user_meta_data) values
 ('66666666-6666-6666-6666-666666666666', 'marta@x.com', '{"nombre":"Marta","telefono":"5522223333"}'),
 ('77777777-7777-7777-7777-777777777777', 'pablo@x.com', '{"nombre":"Pablo","telefono":"5544445555"}');

-- Producto con existencias de sobra
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
set role authenticated;
select crear_producto_con_compra((select id from categorias where nombre = 'Playeras'), 'Playera Pagos', 100,
  '[{"opciones":{"talla":"M"},"cantidad":50,"costo_unitario":40}]'::jsonb) as prod_pagos \gset
reset role;
select id as v_pago from variantes where producto_id = :'prod_pagos' \gset

-- ============ Marta: método de pago ============
select set_config('request.jwt.claim.sub', '66666666-6666-6666-6666-666666666666', false);
set role authenticated;
insert into direcciones (cliente_id, nombre, telefono, calle, colonia, ciudad, estado, cp)
values (auth.uid(), 'Marta', '5522223333', 'Calle 5', 'Centro', 'Pachuca', 'Hidalgo', '42000');
select id as dir_marta from direcciones where cliente_id = auth.uid() \gset
select set_config('test.v_pago', :'v_pago', false);

-- envío sin indicar método ⇒ transferencia por defecto
select (crear_pedido(jsonb_build_array(jsonb_build_object('variante_id', :'v_pago', 'cantidad', 1)), 'envio', :'dir_marta')->>'id') as pe_t \gset
select t_assert('el método por defecto es transferencia', (select metodo_pago = 'transferencia' from pedidos where id = :'pe_t'));

select (crear_pedido(jsonb_build_array(jsonb_build_object('variante_id', :'v_pago', 'cantidad', 1)), 'recoger', null, null, 'efectivo')->>'id') as pe_e \gset
select (crear_pedido(jsonb_build_array(jsonb_build_object('variante_id', :'v_pago', 'cantidad', 1)), 'recoger', null, null, 'tarjeta')->>'id') as pe_c \gset
select t_assert('el pedido guarda el método elegido (efectivo y tarjeta al recoger)',
  (select count(*) = 2 from pedidos where id in (:'pe_e', :'pe_c') and metodo_pago in ('efectivo', 'tarjeta')));

select t_falla('envío a domicilio con efectivo', format($q$select crear_pedido('[{"variante_id":"%s","cantidad":1}]'::jsonb, 'envio', '%s', null, 'efectivo')$q$, :'v_pago', :'dir_marta'));
select t_falla('envío a domicilio con tarjeta', format($q$select crear_pedido('[{"variante_id":"%s","cantidad":1}]'::jsonb, 'envio', '%s', null, 'tarjeta')$q$, :'v_pago', :'dir_marta'));
select t_falla('método de pago nulo', format($q$select crear_pedido('[{"variante_id":"%s","cantidad":1}]'::jsonb, 'recoger', null, null, null)$q$, :'v_pago'));

-- ============ Marta: comprobantes ============
select auth.uid()::text as uid_marta \gset
-- subir al almacenamiento (simulado): solo a su carpeta y a un pedido suyo, nuevo y por transferencia
insert into storage.objects (bucket_id, name) values ('comprobantes', :'uid_marta' || '/' || :'pe_t' || '/recibo.jpg');
select t_assert('la clienta sube un archivo a la carpeta de su pedido', (select count(*) = 1 from storage.objects where bucket_id = 'comprobantes'));
select t_falla('subir a la carpeta de otra persona', format($q$insert into storage.objects (bucket_id, name) values ('comprobantes', '77777777-7777-7777-7777-777777777777/%s/x.jpg')$q$, :'pe_t'));
select t_falla('subir a un pedido que no existe', format($q$insert into storage.objects (bucket_id, name) values ('comprobantes', '%s/00000000-0000-0000-0000-000000000000/x.jpg')$q$, :'uid_marta'));
select t_falla('subir a un pedido pagado en efectivo', format($q$insert into storage.objects (bucket_id, name) values ('comprobantes', '%s/%s/x.jpg')$q$, :'uid_marta', :'pe_e'));

select adjuntar_comprobante(:'pe_t', :'uid_marta' || '/' || :'pe_t' || '/recibo.jpg', 'recibo.jpg', 'image/jpeg', 250000) as comp1 \gset
select t_assert('comprobante registrado en el pedido', (select count(*) = 1 from pedido_comprobantes where pedido_id = :'pe_t'));

select t_falla('formato no permitido (.exe)', format($q$select adjuntar_comprobante('%s', '%s/%s/virus.exe', 'virus.exe', 'application/x-msdownload', 1000)$q$, :'pe_t', :'uid_marta', :'pe_t'));
select t_falla('archivo mayor a 10 MB', format($q$select adjuntar_comprobante('%s', '%s/%s/recibo.jpg', 'recibo.jpg', 'image/jpeg', 10485761)$q$, :'pe_t', :'uid_marta', :'pe_t'));
select t_falla('archivo vacío', format($q$select adjuntar_comprobante('%s', '%s/%s/recibo.jpg', 'recibo.jpg', 'image/jpeg', 0)$q$, :'pe_t', :'uid_marta', :'pe_t'));
select t_falla('el mismo archivo no se registra dos veces', format($q$select adjuntar_comprobante('%s', '%s/%s/recibo.jpg', 'recibo.jpg', 'image/jpeg', 1000)$q$, :'pe_t', :'uid_marta', :'pe_t'));
select t_falla('ruta fuera de la carpeta del pedido', format($q$select adjuntar_comprobante('%s', '%s/otro/recibo.jpg', 'recibo.jpg', 'image/jpeg', 1000)$q$, :'pe_t', :'uid_marta'));
select t_falla('archivo que no se subió', format($q$select adjuntar_comprobante('%s', '%s/%s/fantasma.pdf', 'fantasma.pdf', 'application/pdf', 1000)$q$, :'pe_t', :'uid_marta', :'pe_t'));
select t_falla('pedido pagado en efectivo no lleva comprobante', format($q$select adjuntar_comprobante('%s', '%s/%s/x.jpg', 'x.jpg', 'image/jpeg', 1000)$q$, :'pe_e', :'uid_marta', :'pe_e'));
select t_falla('no se escribe directo en la tabla de comprobantes', format($q$insert into pedido_comprobantes (pedido_id, ruta, tipo_mime, tamano) values ('%s', 'x', 'image/jpeg', 10)$q$, :'pe_t'));

-- PDF y HEIC (iPhone) también valen; hasta 5 comprobantes
insert into storage.objects (bucket_id, name) values
  ('comprobantes', :'uid_marta' || '/' || :'pe_t' || '/spei.pdf'),
  ('comprobantes', :'uid_marta' || '/' || :'pe_t' || '/foto.heic'),
  ('comprobantes', :'uid_marta' || '/' || :'pe_t' || '/c4.png'),
  ('comprobantes', :'uid_marta' || '/' || :'pe_t' || '/c5.webp'),
  ('comprobantes', :'uid_marta' || '/' || :'pe_t' || '/c6.jpg');
select adjuntar_comprobante(:'pe_t', :'uid_marta' || '/' || :'pe_t' || '/spei.pdf',  'spei.pdf',  'application/pdf', 900000);
select adjuntar_comprobante(:'pe_t', :'uid_marta' || '/' || :'pe_t' || '/foto.heic', 'foto.heic', 'image/heic', 3000000);
select adjuntar_comprobante(:'pe_t', :'uid_marta' || '/' || :'pe_t' || '/c4.png',    'c4.png',    'image/png', 500000);
select adjuntar_comprobante(:'pe_t', :'uid_marta' || '/' || :'pe_t' || '/c5.webp',   'c5.webp',   'image/webp', 400000);
select t_assert('PDF, HEIC, PNG y WEBP aceptados (5 comprobantes)', (select count(*) = 5 from pedido_comprobantes where pedido_id = :'pe_t'));
select t_falla('máximo 5 comprobantes', format($q$select adjuntar_comprobante('%s', '%s/%s/c6.jpg', 'c6.jpg', 'image/jpeg', 1000)$q$, :'pe_t', :'uid_marta', :'pe_t'));
reset role;

-- ============ Pablo (otra clienta), vendedora y anónimo ============
select set_config('request.jwt.claim.sub', '77777777-7777-7777-7777-777777777777', false);
set role authenticated;
select t_assert('otra clienta no ve los archivos ni los comprobantes', (select count(*) from storage.objects) = 0 and (select count(*) from pedido_comprobantes) = 0);
select t_falla('otra clienta no adjunta a un pedido ajeno', format($q$select adjuntar_comprobante('%s', '66666666-6666-6666-6666-666666666666/%s/recibo.jpg', 'x.jpg', 'image/jpeg', 1000)$q$, :'pe_t', :'pe_t'));
select t_falla('otra clienta no sube a la carpeta de Marta', format($q$insert into storage.objects (bucket_id, name) values ('comprobantes', '66666666-6666-6666-6666-666666666666/%s/intruso.jpg')$q$, :'pe_t'));
reset role;

select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
set role authenticated;
select t_assert('la vendedora no ve comprobantes de clientes', (select count(*) from storage.objects) = 0 and (select count(*) from pedido_comprobantes) = 0);
reset role;

set role anon;
select t_falla('anónimo no sube archivos', format($q$insert into storage.objects (bucket_id, name) values ('comprobantes', 'x/%s/y.jpg')$q$, :'pe_t'));
reset role;

-- ============ Dueño: ve los comprobantes y confirma con el método del pedido ============
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
set role authenticated;
select t_assert('el dueño ve los 5 comprobantes y los archivos subidos (6)', (select count(*) from pedido_comprobantes) = 5 and (select count(*) from storage.objects where bucket_id = 'comprobantes') = 6);

select confirmar_pedido(:'pe_e') as f_e \gset
select t_assert('confirmar usa el método del pedido (efectivo)',
  (select p.metodo = 'efectivo' and p.monto = 100 from ventas v join pagos p on p.venta_id = v.id where v.folio = :f_e));
select confirmar_pedido(:'pe_c') as f_c \gset
select t_assert('confirmar usa el método del pedido (tarjeta)', (select p.metodo = 'tarjeta' from ventas v join pagos p on p.venta_id = v.id where v.folio = :f_c));
select confirmar_pedido(:'pe_t', 'efectivo') as f_t \gset
select t_assert('el dueño puede cambiar el método al confirmar', (select p.metodo = 'efectivo' from ventas v join pagos p on p.venta_id = v.id where v.folio = :f_t));
reset role;

-- Tras confirmar ya no se aceptan más comprobantes
select set_config('request.jwt.claim.sub', '66666666-6666-6666-6666-666666666666', false);
set role authenticated;
select t_falla('no se adjuntan comprobantes a un pedido confirmado', format($q$select adjuntar_comprobante('%s', '%s/%s/c6.jpg', 'c6.jpg', 'image/jpeg', 1000)$q$, :'pe_t', :'uid_marta', :'pe_t'));
select t_assert('la clienta sigue viendo sus propios comprobantes', (select count(*) from pedido_comprobantes) = 5);
reset role;

-- ============ Caja desactivada: se vende sin abrir caja ============
select t_assert('no hay caja abierta', (select count(*) from cortes_caja where cerrado_at is null) = 0);
select t_assert('las ventas de pedidos quedan sin corte de caja', (select count(*) = 3 and bool_and(corte_id is null) from ventas where notas like 'Pedido #%' and cliente like 'Marta%'));

select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
set role authenticated;
select registrar_venta('mostrador', jsonb_build_array(jsonb_build_object('variante_id', :'v_pago', 'cantidad', 2)),
  '[{"metodo":"efectivo","monto":200}]'::jsonb) as f_sin_caja \gset
select t_assert('la vendedora vende sin abrir caja', (select total = 200 and corte_id is null and estado = 'completada' from ventas where folio = :f_sin_caja));
reset role;

select 'TODAS LAS PRUEBAS DE PAGOS PASARON' as resultado;
