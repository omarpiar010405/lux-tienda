-- Tienda en línea: cuentas de clientes, permisos, direcciones, pedidos y populares.
-- Se ejecuta después de 20_flujo_completo.sql (reutiliza sus productos y existencias).
\set ON_ERROR_STOP 1

select v.id as v_m from variantes v join productos p on p.id = v.producto_id
  where p.nombre = 'Playera Boss Negra' and v.opciones = '{"talla":"M"}' \gset
select v.id as v_perf from variantes v join productos p on p.id = v.producto_id
  where p.nombre = 'Le Labo Santal 33' and v.opciones = '{"ml":"100"}' \gset
select id as prod_playera from productos where nombre = 'Playera Boss Negra' \gset
select stock as stock_m from variantes where id = :'v_m' \gset
select stock as stock_perf from variantes where id = :'v_perf' \gset

-- ============ Registro: las cuentas nuevas son clientes SIN permisos ============
insert into auth.users (id, email, raw_user_meta_data) values
 ('33333333-3333-3333-3333-333333333333', 'ana@x.com',
  '{"nombre":"Ana","apellidos":"López","telefono":"+52 55 1234-5678","acepta_novedades":"true"}'),
 ('44444444-4444-4444-4444-444444444444', 'luis@x.com', '{"nombre":"Luis","telefono":"123"}'),
 ('55555555-5555-5555-5555-555555555555', 'ajena@x.com', '{}');

select t_assert('cuenta nueva nace con rol cliente',
  (select rol = 'cliente' from profiles where id = '33333333-3333-3333-3333-333333333333'));
select t_assert('ficha creada con teléfono normalizado',
  (select telefono = '5512345678' and acepta_novedades and apellidos = 'López' and email = 'ana@x.com'
   from clientes where id = '33333333-3333-3333-3333-333333333333'));
select t_assert('teléfono inválido queda vacío',
  (select telefono is null from clientes where id = '44444444-4444-4444-4444-444444444444'));
select t_assert('sin nombre en el registro se usa el correo',
  (select nombre = 'ajena' from clientes where id = '55555555-5555-5555-5555-555555555555'));

-- ============ Ana (cliente): no tiene ningún permiso del negocio ============
select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', false);
set role authenticated;

select t_assert('cliente no es personal', not es_staff() and not es_dueno());
select t_assert('cliente no ve costos', (select count(*) from costos_variante) = 0);
select t_assert('cliente no ve ventas', (select count(*) from ventas) = 0);
select t_assert('cliente no ve compras ni gastos', (select count(*) from compras) + (select count(*) from gastos) = 0);
select t_assert('cliente no ve proveedores ni cortes', (select count(*) from proveedores) + (select count(*) from cortes_caja) = 0);
select t_assert('cliente no ve productos internos (solo vista pública)', (select count(*) from variantes) = 0);
select t_falla('cliente no usa el POS', $q$select * from pos_buscar('playera')$q$);
select t_falla('cliente no abre caja', $q$select abrir_caja(0)$q$);
select t_falla('cliente no ve el panel', $q$select * from panel_resumen(hoy_mx(), hoy_mx())$q$);
select t_falla('cliente no registra ventas', format($q$select registrar_venta('mostrador','[{"variante_id":"%s","cantidad":1}]'::jsonb,'[{"metodo":"efectivo","monto":1}]'::jsonb)$q$, :'v_m'));
update profiles set rol = 'dueno' where id = auth.uid();
select t_assert('cliente no puede subirse el rol', (select rol = 'cliente' from profiles where id = auth.uid()));
select t_assert('cliente solo ve su ficha', (select count(*) from clientes) = 1);

update clientes set email = 'otro@x.com', nombre = 'Ana María' where id = auth.uid();
select t_assert('cliente edita su nombre pero no su correo',
  (select nombre = 'Ana María' and email = 'ana@x.com' from clientes where id = auth.uid()));
select t_falla('teléfono de 9 dígitos', $q$update clientes set telefono = '123456789' where id = auth.uid()$q$);

-- ----- direcciones -----
insert into direcciones (cliente_id, nombre, telefono, calle, colonia, ciudad, estado, cp)
values (auth.uid(), 'Ana', '5512345678', 'Av. Reforma 100', 'Juárez', 'Ciudad de México', 'Ciudad de México', '06600');
select t_assert('la primera dirección queda como principal', (select es_principal from direcciones where cliente_id = auth.uid()));
insert into direcciones (cliente_id, alias, nombre, telefono, calle, colonia, ciudad, estado, cp, es_principal)
values (auth.uid(), 'Trabajo', 'Ana', '5512345678', 'Insurgentes 200', 'Roma', 'Ciudad de México', 'Ciudad de México', '06700', true);
select t_assert('solo una dirección principal a la vez',
  (select count(*) = 1 and bool_and(alias = 'Trabajo') from direcciones where cliente_id = auth.uid() and es_principal));
select t_falla('código postal de 4 dígitos', $q$insert into direcciones (cliente_id, nombre, telefono, calle, colonia, ciudad, estado, cp)
  values (auth.uid(), 'Ana', '5512345678', 'Calle 1', 'Col', 'Cd', 'Edo', '1234')$q$);
select t_falla('dirección a nombre de otra cliente', $q$insert into direcciones (cliente_id, nombre, telefono, calle, colonia, ciudad, estado, cp)
  values ('44444444-4444-4444-4444-444444444444', 'X', '5512345678', 'Calle 1', 'Col', 'Cd', 'Edo', '12345')$q$);
select t_falla('más de 10 direcciones', $q$insert into direcciones (cliente_id, nombre, telefono, calle, colonia, ciudad, estado, cp)
  select auth.uid(), 'Ana', '5512345678', 'Calle ' || g, 'Col', 'Cd', 'Edo', '12345' from generate_series(1, 9) g$q$);
select t_assert('el intento fallido no dejó direcciones a medias', (select count(*) from direcciones where cliente_id = auth.uid()) = 2);
select id as dir_ana from direcciones where cliente_id = auth.uid() and es_principal \gset

-- ----- pedido -----
select (crear_pedido(
  jsonb_build_array(jsonb_build_object('variante_id', :'v_m', 'cantidad', 2),
                    jsonb_build_object('variante_id', :'v_perf', 'cantidad', 1)),
  'envio', :'dir_ana', 'Entregar por la tarde')->>'id') as ped1 \gset

select t_assert('pedido nuevo con total del servidor (2×520 + 900)',
  (select estado = 'nuevo' and total = 1940 and subtotal = 1940 and numero >= 1001 and notas = 'Entregar por la tarde'
   from pedidos where id = :'ped1'));
select t_assert('el pedido guarda copia de contacto y dirección',
  (select contacto_nombre = 'Ana María López' and contacto_telefono = '5512345678'
          and direccion->>'cp' = '06700' and direccion->>'calle' = 'Insurgentes 200' and not (direccion ? 'cliente_id')
   from pedidos where id = :'ped1'));
select t_assert('el pedido guarda 2 renglones con nombre y precio', (select count(*) = 2 and sum(precio_unitario * cantidad) = 1940 from pedido_items where pedido_id = :'ped1'));
select t_assert('la cliente ve su pedido y sus renglones', (select count(*) from pedidos) = 1 and (select count(*) from pedido_items) = 2);

select t_falla('más piezas que existencias', format($q$select crear_pedido('[{"variante_id":"%s","cantidad":20}]'::jsonb,'recoger')$q$, :'v_perf'));
select t_falla('envío sin dirección', format($q$select crear_pedido('[{"variante_id":"%s","cantidad":1}]'::jsonb,'envio')$q$, :'v_m'));
select t_falla('carrito vacío', $q$select crear_pedido('[]'::jsonb,'recoger')$q$);
select t_falla('cantidad cero', format($q$select crear_pedido('[{"variante_id":"%s","cantidad":0}]'::jsonb,'recoger')$q$, :'v_m'));
select t_falla('productos repetidos', format($q$select crear_pedido('[{"variante_id":"%1$s","cantidad":1},{"variante_id":"%1$s","cantidad":1}]'::jsonb,'recoger')$q$, :'v_m'));
select t_falla('producto inexistente', $q$select crear_pedido('[{"variante_id":"00000000-0000-0000-0000-000000000000","cantidad":1}]'::jsonb,'recoger')$q$);
select t_falla('pedido escribiendo directo en la tabla', $q$insert into pedidos (cliente_id, entrega, contacto_nombre, contacto_telefono) values (auth.uid(), 'recoger', 'x', '5512345678')$q$);
select t_falla('la cliente no confirma pedidos', format($q$select confirmar_pedido('%s')$q$, :'ped1'));
select t_falla('la cliente no cambia estados', format($q$select cambiar_estado_pedido('%s','entregado')$q$, :'ped1'));

select (crear_pedido(jsonb_build_array(jsonb_build_object('variante_id', :'v_m', 'cantidad', 1)), 'recoger')->>'id') as ped2 \gset
select (crear_pedido(jsonb_build_array(jsonb_build_object('variante_id', :'v_m', 'cantidad', 1)), 'recoger')->>'id') as ped3 \gset
select (crear_pedido(jsonb_build_array(jsonb_build_object('variante_id', :'v_m', 'cantidad', 1)), 'recoger')->>'id') as ped4 \gset
select t_assert('recoger en tienda no requiere dirección', (select direccion is null from pedidos where id = :'ped2'));
reset role;
select t_assert('pedir NO reserva existencias', (select stock = :stock_m from variantes where id = :'v_m'));

-- ============ Luis: sin teléfono, otra cliente ============
select set_config('request.jwt.claim.sub', '44444444-4444-4444-4444-444444444444', false);
set role authenticated;
select t_assert('Luis no ve pedidos ni direcciones de Ana',
  (select count(*) from pedidos) + (select count(*) from direcciones) + (select count(*) from pedido_items) = 0);
select t_falla('Luis no tiene teléfono', format($q$select crear_pedido('[{"variante_id":"%s","cantidad":1}]'::jsonb,'recoger')$q$, :'v_m'));
insert into direcciones (cliente_id, nombre, telefono, calle, colonia, ciudad, estado, cp)
values (auth.uid(), 'Luis', '5511112222', 'Calle Luis 1', 'Centro', 'Puebla', 'Puebla', '72000');
update clientes set telefono = '5511112222' where id = auth.uid();
select id as dir_luis from direcciones where cliente_id = auth.uid() \gset
reset role;

select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', false);
set role authenticated;
select t_falla('Ana no puede usar la dirección de Luis', format($q$select crear_pedido('[{"variante_id":"%s","cantidad":1}]'::jsonb,'envio','%s')$q$, :'v_m', :'dir_luis'));
reset role;

-- ============ Vendedora y anónimo: sin acceso a datos de clientes ============
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
set role authenticated;
select t_assert('la vendedora NO ve clientes ajenos, direcciones ni pedidos',
  (select count(*) from clientes) = 1 and (select id = auth.uid() from clientes)
  and (select count(*) from direcciones) + (select count(*) from pedidos) + (select count(*) from pedido_items) = 0);
select t_falla('la vendedora no confirma pedidos', format($q$select confirmar_pedido('%s')$q$, :'ped1'));
reset role;

set role anon;
select t_falla('anónimo no crea pedidos', format($q$select crear_pedido('[{"variante_id":"%s","cantidad":1}]'::jsonb,'recoger')$q$, :'v_m'));
reset role;

-- ============ Dueño: confirmar, estados y cancelaciones ============
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
set role authenticated;
select t_assert('el dueño ve clientes, direcciones y pedidos',
  (select count(*) from clientes) >= 4 and (select count(*) from direcciones) >= 3 and (select count(*) from pedidos) = 4);

select confirmar_pedido(:'ped1', 'transferencia') as folio1 \gset
select t_assert('confirmar crea venta web enlazada al pedido',
  (select p.estado = 'confirmado' and p.total = 1940 and v.canal = 'web' and v.total = 1940
          and v.estado = 'completada' and v.cliente = 'Ana María López' and v.notas like 'Pedido #%'
   from pedidos p join ventas v on v.id = p.venta_id where p.id = :'ped1'));
select t_assert('confirmar descuenta existencias', (select stock = :stock_m - 2 from variantes where id = :'v_m') and (select stock = :stock_perf - 1 from variantes where id = :'v_perf'));
select t_assert('la venta guarda costo por renglón (utilidad disponible)',
  (select count(*) = 2 from venta_item_costos c join venta_items i on i.id = c.venta_item_id join ventas v on v.id = i.venta_id where v.folio = :folio1));
select t_assert('el panel cuenta la venta web',
  (select count(*) = 1 from panel_ventas(hoy_mx(), hoy_mx(), 'web') where total = 1940 and utilidad > 0 and estado = 'completada'));
select t_falla('no se confirma dos veces', format($q$select confirmar_pedido('%s')$q$, :'ped1'));

select cambiar_estado_pedido(:'ped1', 'enviado');
select cambiar_estado_pedido(:'ped1', 'entregado');
select t_assert('estado entregado', (select estado = 'entregado' from pedidos where id = :'ped1'));
select t_falla('no se cancela un pedido entregado', format($q$select cambiar_estado_pedido('%s','cancelado')$q$, :'ped1'));
select t_falla('no se regresa a nuevo', format($q$select cambiar_estado_pedido('%s','nuevo')$q$, :'ped1'));

-- cancelar un pedido nuevo: no hay venta ni cambia el stock
select cambiar_estado_pedido(:'ped2', 'cancelado');
select t_assert('cancelar pedido nuevo', (select estado = 'cancelado' and venta_id is null from pedidos where id = :'ped2'));
select t_assert('cancelar pedido nuevo no toca existencias', (select stock = :stock_m - 2 from variantes where id = :'v_m'));
select t_falla('no se confirma un pedido cancelado', format($q$select confirmar_pedido('%s')$q$, :'ped2'));

-- recoger en tienda: confirmado → entregado (sin pasar por "enviado")
select confirmar_pedido(:'ped3', 'efectivo');
select t_falla('recoger no pasa por enviado', format($q$select cambiar_estado_pedido('%s','enviado')$q$, :'ped3'));
select cambiar_estado_pedido(:'ped3', 'entregado');
select t_assert('recoger: confirmado → entregado', (select estado = 'entregado' from pedidos where id = :'ped3'));

-- cancelar un pedido confirmado: cancela la venta y regresa las piezas
select confirmar_pedido(:'ped4', 'transferencia');
select t_assert('stock tras confirmar ped3 y ped4', (select stock = :stock_m - 4 from variantes where id = :'v_m'));
select cambiar_estado_pedido(:'ped4', 'cancelado');
select t_assert('cancelar confirmado cancela la venta', (select v.estado = 'cancelada' from pedidos p join ventas v on v.id = p.venta_id where p.id = :'ped4'));
select t_assert('cancelar confirmado devuelve las piezas', (select stock = :stock_m - 3 from variantes where id = :'v_m'));

-- promover y quitar acceso a personal
update profiles set rol = 'vendedora' where id = '44444444-4444-4444-4444-444444444444';
reset role;

select set_config('request.jwt.claim.sub', '44444444-4444-4444-4444-444444444444', false);
set role authenticated;
select t_assert('al promoverlo, Luis ya es personal y usa el POS', es_staff() and (select count(*) from pos_buscar('playera')) > 0);
select t_assert('Luis (vendedora) sigue sin ver datos de clientes', (select count(*) from clientes) = 1 and (select count(*) from pedidos) = 0);
reset role;

select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
set role authenticated;
update profiles set rol = 'cliente' where id = '44444444-4444-4444-4444-444444444444';
reset role;
select set_config('request.jwt.claim.sub', '44444444-4444-4444-4444-444444444444', false);
set role authenticated;
select t_assert('al quitarle el acceso, Luis deja de ser personal', not es_staff());
reset role;

-- ============ Límite de pedidos pendientes y cuenta desactivada ============
select set_config('test.v_perf', :'v_perf', false);
select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', false);
set role authenticated;
do $$ begin
  for i in 1..5 loop
    perform crear_pedido(jsonb_build_array(jsonb_build_object('variante_id', current_setting('test.v_perf'), 'cantidad', 1)), 'recoger');
  end loop;
end $$;
select t_falla('máximo 5 pedidos pendientes', format($q$select crear_pedido('[{"variante_id":"%s","cantidad":1}]'::jsonb,'recoger')$q$, :'v_m'));
reset role;

select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
set role authenticated;
update profiles set activo = false where id = '33333333-3333-3333-3333-333333333333';
reset role;
select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', false);
set role authenticated;
select t_falla('cuenta desactivada no puede pedir', format($q$select crear_pedido('[{"variante_id":"%s","cantidad":1}]'::jsonb,'recoger')$q$, :'v_m'));
reset role;
update profiles set activo = true where id = '33333333-3333-3333-3333-333333333333';

-- ============ Productos populares (público) ============
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
set role authenticated;
select crear_producto_con_compra((select id from categorias where nombre = 'Gorras'), 'Gorra sin stock', 300,
  '[{"opciones":{"color":"negro"},"cantidad":0}]'::jsonb) as prod_sin_stock \gset
reset role;

set role anon;
select t_assert('populares: el más vendido va primero', (select producto_id = :'prod_playera' from productos_populares(5) limit 1));
select t_assert('populares: no incluye productos sin existencias', not exists (select 1 from productos_populares(100) where producto_id = :'prod_sin_stock'));
select t_assert('populares respeta el límite', (select count(*) from productos_populares(1)) = 1);
select t_assert('populares solo devuelve ids (sin cifras)', (select count(*) from information_schema.columns where table_name = 'productos_populares') = 0);
reset role;

select 'TODAS LAS PRUEBAS DE LA TIENDA PASARON' as resultado;
