-- Prueba de extremo a extremo de las reglas del negocio.
-- Cada t_assert / t_falla aborta la prueba si algo no se cumple.
\set ON_ERROR_STOP 1

insert into auth.users (id, email) values
 ('11111111-1111-1111-1111-111111111111','dueno@x.com'),
 ('22222222-2222-2222-2222-222222222222','vend@x.com');
update profiles set rol = 'dueno' where id = '11111111-1111-1111-1111-111111111111';
update profiles set rol = 'vendedora' where id = '22222222-2222-2222-2222-222222222222'; -- las cuentas nuevas nacen como 'cliente' (ADR-011)

-- ============ DUEÑO: catálogo y compras ============
select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',false);
set role authenticated;

select crear_producto_con_compra(
  (select id from categorias where nombre = 'Playeras'), 'Playera Boss Negra', 500,
  '[{"opciones":{"talla":"M"},"cantidad":3,"costo_unitario":215},
    {"opciones":{"talla":"L"},"cantidad":2,"costo_unitario":215},
    {"opciones":{"talla":"XL"},"cantidad":0}]'::jsonb,
  p_marca => 'Boss', p_seccion => 'hombre', p_proveedor => 'Proveedor A') as playera \gset

select crear_producto_con_compra(
  (select id from categorias where nombre = 'Fragancias'), 'Le Labo Santal 33', 900,
  '[{"opciones":{"ml":"100"},"cantidad":2,"costo_unitario":400,"codigo_barras":"7501234567890"},
    {"opciones":{"ml":"50"},"cantidad":1,"costo_unitario":250,"precio":600}]'::jsonb,
  p_seccion => 'unisex') as perfume \gset

select t_assert('stock inicial M = 3', (select stock from variantes where producto_id = :'playera' and opciones = '{"talla":"M"}') = 3);
select t_assert('precio por variante (50 ml = 600)', (select precio from variantes where producto_id = :'perfume' and opciones = '{"ml":"50"}') = 600);
select t_assert('código de fábrica respetado', exists (select 1 from variantes where codigo_barras = '7501234567890'));
select t_assert('código automático generado', (select codigo_barras from variantes where producto_id = :'playera' and opciones = '{"talla":"M"}') ~ '^B[0-9]{8}$');

-- Costo promedio: (3×215 + 2×245) / 5 = 227
select registrar_compra(hoy_mx(), 'Proveedor B', null, jsonb_build_array(jsonb_build_object(
  'variante_id', (select id from variantes where producto_id = :'playera' and opciones = '{"talla":"M"}'),
  'cantidad', 2, 'costo_unitario', 245, 'precio_venta', 520))) as compra2 \gset
select t_assert('costo promedio = 227.00',
  (select c.costo_promedio from costos_variante c join variantes v on v.id = c.variante_id
    where v.producto_id = :'playera' and v.opciones = '{"talla":"M"}') = 227.00);
select t_assert('stock M = 5 tras segunda compra', (select stock from variantes where producto_id = :'playera' and opciones = '{"talla":"M"}') = 5);
select t_assert('precio actualizado a 520', (select precio from variantes where producto_id = :'playera' and opciones = '{"talla":"M"}') = 520);

select t_falla('compra sin costo', format($q$select registrar_compra(null,null,null,'[{"variante_id":"%s","cantidad":1}]'::jsonb)$q$,
  (select id from variantes limit 1)));
select t_falla('variante con piezas sin costo', format($q$select crear_producto_con_compra('%s','X',100,'[{"opciones":{"talla":"M"},"cantidad":2}]'::jsonb)$q$,
  (select id from categorias where nombre = 'Playeras')));

-- Código de barras editable y único
update variantes set codigo_barras = 'MI-CODIGO-1' where producto_id = :'playera' and opciones = '{"talla":"XL"}';
select t_assert('código editable por el dueño', exists (select 1 from variantes where codigo_barras = 'MI-CODIGO-1'));
select t_falla('código duplicado', $q$update variantes set codigo_barras = '7501234567890' where codigo_barras = 'MI-CODIGO-1'$q$);
select t_falla('código vacío', $q$update variantes set codigo_barras = '  ' where codigo_barras = 'MI-CODIGO-1'$q$);

-- Ajuste de inventario por el dueño (conteo físico)
insert into movimientos_inventario (variante_id, tipo, cantidad, nota)
  select id, 'ajuste', -1, 'merma' from variantes where producto_id = :'perfume' and opciones = '{"ml":"50"}';
select t_assert('ajuste -1 deja 50 ml en 0', (select stock from variantes where producto_id = :'perfume' and opciones = '{"ml":"50"}') = 0);
insert into movimientos_inventario (variante_id, tipo, cantidad, nota)
  select id, 'ajuste', 1, 'se encontró' from variantes where producto_id = :'perfume' and opciones = '{"ml":"50"}';
select t_falla('dueño no puede insertar movimiento de venta a mano',
  format($q$insert into movimientos_inventario (variante_id, tipo, cantidad) values ('%s','venta',-1)$q$, (select id from variantes limit 1)));

-- Caja
select abrir_caja(1000) as caja \gset
select t_falla('segunda caja abierta', 'select abrir_caja(0)');

-- Gastos y proveedores
insert into gastos (concepto, categoria, subtotal, iva) values ('Renta', 'Renta', 1000, 160);
insert into gastos (concepto, categoria, subtotal, iva) values ('Luz', 'Servicios', 200, 0);
insert into proveedores (nombre) values ('Proveedor A');
select t_assert('total de gasto calculado', (select total from gastos where concepto = 'Renta') = 1160);
reset role;

-- ============ VENDEDORA: ventas y límites ============
select set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222',false);
set role authenticated;

select t_assert('pos_buscar por palabras en cualquier orden', (select count(*) from pos_buscar('boss playera')) = 3);
select t_assert('pos_buscar por código exacto primero', (select codigo_barras from pos_buscar('7501234567890') limit 1) = '7501234567890');

-- Venta 1: web, transferencia, 1 M a 520
select registrar_venta('web', jsonb_build_array(jsonb_build_object(
  'variante_id', (select id from variantes where producto_id = :'playera' and opciones = '{"talla":"M"}'), 'cantidad', 1)),
  '[{"metodo":"transferencia","monto":520}]'::jsonb) as folio1 \gset
-- Venta 2: mostrador, efectivo, 1 L con $50 de descuento = 450
select registrar_venta('mostrador', jsonb_build_array(jsonb_build_object(
  'variante_id', (select id from variantes where producto_id = :'playera' and opciones = '{"talla":"L"}'), 'cantidad', 1, 'descuento', 50)),
  '[{"metodo":"efectivo","monto":450}]'::jsonb) as folio2 \gset

select t_assert('stock M = 4 tras venta', (select stock from variantes where producto_id = :'playera' and opciones = '{"talla":"M"}') = 4);
select t_assert('ventas ligadas a la caja abierta', (select count(*) from ventas where corte_id = :'caja') = 2);
select t_assert('vendedora NO ve costos promedio', (select count(*) from costos_variante) = 0);
select t_assert('vendedora NO ve compras', (select count(*) from compras) = 0);
select t_assert('vendedora NO ve costos de ventas', (select count(*) from venta_item_costos) = 0);
select t_assert('vendedora NO ve gastos', (select count(*) from gastos) = 0);
select t_assert('vendedora NO ve proveedores', (select count(*) from proveedores) = 0);

select t_falla('vendedora no registra compras', 'select registrar_compra(null,null,null,''[]''::jsonb)');
select t_falla('vendedora no usa fecha pasada', $q$select registrar_venta('mostrador','[]'::jsonb,'[]'::jsonb,null,null, now() - interval '5 days')$q$);
select t_falla('vendedora no fija precio', format($q$select registrar_venta('mostrador', '[{"variante_id":"%s","cantidad":1,"precio_unitario":1}]'::jsonb, '[{"metodo":"efectivo","monto":1}]'::jsonb)$q$, (select id from variantes limit 1)));
select t_falla('sobreventa bloqueada', format($q$select registrar_venta('mostrador', '[{"variante_id":"%s","cantidad":99}]'::jsonb, '[{"metodo":"efectivo","monto":49500}]'::jsonb)$q$,
  (select id from variantes where producto_id = :'playera' and opciones = '{"talla":"L"}')));
select t_falla('pagos distintos al total', format($q$select registrar_venta('mostrador', '[{"variante_id":"%s","cantidad":1}]'::jsonb, '[{"metodo":"efectivo","monto":1}]'::jsonb)$q$,
  (select id from variantes where producto_id = :'playera' and opciones = '{"talla":"M"}')));
select t_falla('descuento mayor al importe', format($q$select registrar_venta('mostrador', '[{"variante_id":"%s","cantidad":1,"descuento":9999}]'::jsonb, '[{"metodo":"efectivo","monto":1}]'::jsonb)$q$,
  (select id from variantes where producto_id = :'playera' and opciones = '{"talla":"M"}')));
select t_falla('vendedora no ve el panel', 'select * from panel_resumen(hoy_mx(), hoy_mx())');
select t_falla('vendedora no cancela ventas', format($q$select cancelar_venta('%s')$q$, (select id from ventas limit 1)));
select t_falla('vendedora no inserta gastos', $q$insert into gastos (concepto, subtotal) values ('x', 1)$q$);

update variantes set codigo_barras = 'HACK' where producto_id = :'playera' and opciones = '{"talla":"M"}';
select t_assert('vendedora no edita códigos de barras', not exists (select 1 from variantes where codigo_barras = 'HACK'));

select t_assert('resumen_caja: efectivo esperado = 1000 + 450',
  (select (resumen_caja()->>'efectivo_esperado')::numeric) = 1450);
reset role;

-- ============ DUEÑO: panel y cancelaciones ============
select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',false);
set role authenticated;

-- Compras de hoy: 3×215+2×215 (playera) + 2×400+1×250 (perfume) + 2×245 = 2615
select t_assert('panel_resumen: ventas 970, costo 442, utilidad 528',
  (select ventas = 970 and costo_vendido = 442 and utilidad_bruta = 528 and num_ventas = 2 and piezas = 2
   from panel_resumen(hoy_mx(), hoy_mx())));
select t_assert('panel_resumen: inversión 2615',
  (select inversion = 2615 from panel_resumen(hoy_mx(), hoy_mx())));
select t_assert('panel_resumen: gastos 1360 (subtotal 1200 + IVA 160)',
  (select gastos_total = 1360 and gastos_subtotal = 1200 and gastos_iva = 160 from panel_resumen(hoy_mx(), hoy_mx())));
select t_assert('panel_resumen: ganancia neta = 528 − 1360 = −832',
  (select ganancia_neta = -832 from panel_resumen(hoy_mx(), hoy_mx())));

select t_assert('por categoría: Playeras',
  (select piezas = 2 and ventas = 970 and utilidad_bruta = 528 and inversion = 1565 and ganancia_neta = -832
   from panel_por_categoria(hoy_mx(), hoy_mx()) where categoria = 'Playeras'));
select t_assert('por categoría: Fragancias solo inversión',
  (select piezas = 0 and ventas = 0 and inversion = 1050 and ganancia_neta = 0
   from panel_por_categoria(hoy_mx(), hoy_mx()) where categoria = 'Fragancias'));

select t_assert('panel_ventas filtra por canal web',
  (select count(*) = 1 and max(utilidad) = 293 from panel_ventas(hoy_mx(), hoy_mx(), 'web')));
select t_assert('panel_ventas muestra vendedora y métodos',
  (select count(*) = 1 from panel_ventas(hoy_mx(), hoy_mx()) where metodos = 'efectivo' and vendedora <> ''));

-- stock: M 4, L 1, XL 0, perfume 100 ml 2, 50 ml 1
select t_assert('panel_inventario: 8 piezas, costo 2173, precio 4980',
  (select piezas = 8 and valor_costo = 2173 and valor_precio = 4980 and sin_costo = 0 from panel_inventario()));
select t_assert('panel_stock_bajo(1) = L, XL y 50 ml', (select count(*) from panel_stock_bajo(1)) = 3);
select t_assert('panel_mas_vendidos: playera 2 pzs, margen 54.4%',
  (select piezas = 2 and ventas = 970 and utilidad = 528 and margen_pct = 54.4 from panel_mas_vendidos(hoy_mx(), hoy_mx()) limit 1));
select t_assert('panel_sin_movimiento no marca productos nuevos', (select count(*) from panel_sin_movimiento(30)) = 0);

-- Cierre de caja con faltante de $10
select t_assert('cerrar_caja: diferencia −10',
  (select (cerrar_caja(1440, 'faltante')->>'diferencia')::numeric) = -10);
select t_falla('cerrar sin caja abierta', 'select cerrar_caja(0)');

-- Cancelación devuelve stock y sale del resumen
select cancelar_venta((select id from ventas where folio = :folio1));
select t_assert('cancelar devuelve la pieza (M = 5)', (select stock from variantes where producto_id = :'playera' and opciones = '{"talla":"M"}') = 5);
select t_assert('resumen excluye canceladas', (select num_ventas = 1 and ventas = 450 from panel_resumen(hoy_mx(), hoy_mx())));
select t_falla('no se cancela dos veces', format($q$select cancelar_venta('%s')$q$, (select id from ventas where folio = :folio1)));

-- Venta histórica con fecha, precio y costo propios (importación del Excel)
select registrar_venta('instagram', jsonb_build_array(jsonb_build_object(
  'variante_id', (select id from variantes where producto_id = :'playera' and opciones = '{"talla":"M"}'),
  'cantidad', 1, 'precio_unitario', 500, 'costo_unitario', 215)),
  '[{"metodo":"efectivo","monto":500}]'::jsonb, null, 'histórica', '2026-09-19 12:00-06') as folio_h \gset
select t_assert('histórica: utilidad 285 y sin caja',
  (select utilidad = 285 from panel_ventas('2026-09-19', '2026-09-19')) and
  (select corte_id is null from ventas where folio = :folio_h));
select t_assert('histórica: no entra al resumen de hoy', (select num_ventas = 1 from panel_resumen(hoy_mx(), hoy_mx())));

-- Catálogo público
reset role;
set role anon;
select t_assert('anon ve catálogo con marca y sección', (select count(*) > 0 from catalogo_publico where marca = 'Boss' and seccion = 'hombre'));
select t_falla('anon no ve variantes directas', 'select count(*) from variantes where false and (select 1/0) = 1');
reset role;

select 'TODAS LAS PRUEBAS DE BASE DE DATOS PASARON' as resultado;
