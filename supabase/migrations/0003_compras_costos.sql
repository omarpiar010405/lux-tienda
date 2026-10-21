-- =====================================================================
-- MIGRACIÓN FASE 1 (v2)  ·  Correr DESPUÉS de boutique_schema.sql
-- Se puede ejecutar de una vez en Supabase > SQL Editor.
-- No borra datos: agrega columnas, tablas y funciones nuevas.
--
-- Qué agrega:
--   · Marca y sección (hombre/mujer/unisex) en productos
--   · Canal de venta "web"
--   · Compras con costo, y costo promedio por variante
--   · Costo guardado en cada renglón de venta (para la utilidad)
--   · Código de barras autogenerado, editable por el dueño
--   · Categorías de la boutique (Fragancias, Termos, Jerseys...)
--
-- Se deja fuera a propósito (se agrega solo si el dueño lo quiere):
--   gastos, panel de resumen, proveedores como catálogo, apartados.
-- =====================================================================

-- ---------- 1. TIPOS ----------
alter type canal_venta add value if not exists 'web';

do $$ begin
  create type seccion_producto as enum ('hombre', 'mujer', 'unisex', 'na');
exception when duplicate_object then null;
end $$;

-- ---------- 2. PRODUCTOS: marca y sección ----------
alter table productos add column if not exists marca   text;
alter table productos add column if not exists seccion seccion_producto not null default 'na';
create index if not exists productos_seccion_idx on productos (seccion);

-- ---------- 3. CÓDIGO DE BARRAS ----------
-- Autogenerado (B00000001...). Si el dueño pone uno manual que coincida,
-- el generador salta al siguiente libre.
create or replace function nuevo_codigo_barras() returns text
language plpgsql security definer set search_path = public as $$
declare v text;
begin
  loop
    v := 'B' || lpad(nextval('seq_codigo_barras')::text, 8, '0');
    exit when not exists (select 1 from variantes where codigo_barras = v);
  end loop;
  return v;
end $$;

alter table variantes alter column codigo_barras set default nuevo_codigo_barras();

alter table variantes drop constraint if exists codigo_barras_valido;
alter table variantes add constraint codigo_barras_valido
  check (codigo_barras = btrim(codigo_barras) and codigo_barras <> '');

-- ---------- 4. COSTO PROMEDIO POR VARIANTE (solo dueño) ----------
do $$ begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'costos_variante'
               and column_name = 'costo') then
    alter table costos_variante rename column costo to costo_promedio;
  end if;
end $$;

-- ---------- 5. COMPRAS (solo dueño) ----------
create table if not exists compras (
  id         uuid primary key default gen_random_uuid(),
  fecha      date not null default current_date,
  proveedor  text,
  notas      text,
  usuario_id uuid references profiles(id) default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists compras_fecha_idx on compras (fecha desc);

create table if not exists compra_items (
  id             uuid primary key default gen_random_uuid(),
  compra_id      uuid not null references compras(id) on delete cascade,
  variante_id    uuid not null references variantes(id),
  cantidad       int not null check (cantidad > 0),
  costo_unitario numeric(10,2) not null check (costo_unitario >= 0)
);
create index if not exists compra_items_compra_idx   on compra_items (compra_id);
create index if not exists compra_items_variante_idx on compra_items (variante_id);

-- ---------- 6. COSTO GUARDADO POR VENTA (solo dueño) ----------
-- Va en tabla aparte para que la vendedora no vea costos al consultar sus ventas.
create table if not exists venta_item_costos (
  venta_item_id  uuid primary key references venta_items(id) on delete cascade,
  costo_unitario numeric(10,2) not null check (costo_unitario >= 0)
);

-- ---------- 7. SEGURIDAD ----------
alter table compras           enable row level security;
alter table compra_items      enable row level security;
alter table venta_item_costos enable row level security;

drop policy if exists "dueño gestiona compras" on compras;
create policy "dueño gestiona compras" on compras
  for all using (es_dueno()) with check (es_dueno());

drop policy if exists "dueño gestiona compra_items" on compra_items;
create policy "dueño gestiona compra_items" on compra_items
  for all using (es_dueno()) with check (es_dueno());

drop policy if exists "dueño ve costos de ventas" on venta_item_costos;
create policy "dueño ve costos de ventas" on venta_item_costos
  for select using (es_dueno());

-- ---------- 8. FUNCIONES ----------

-- 8.1 Registrar una compra de variantes que YA existen.
-- p_items: [{"variante_id":"...","cantidad":3,"costo_unitario":215,"precio_venta":500}]
--   (precio_venta es opcional: si viene, actualiza el precio de la variante)
-- Costo promedio nuevo = (stock × promedio actual + piezas × costo) ÷ (stock + piezas)
create or replace function registrar_compra(
  p_fecha     date,
  p_proveedor text,
  p_notas     text,
  p_items     jsonb
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_compra uuid;
  v_item   jsonb;
  v_var    record;
  v_cant   int;
  v_costo  numeric(10,2);
  v_precio numeric(10,2);
  v_prom   numeric(10,2);
  v_nuevo  numeric(10,2);
begin
  if not es_dueno() then raise exception 'Solo el dueño puede registrar compras'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'La compra no tiene productos';
  end if;

  insert into compras (fecha, proveedor, notas)
  values (coalesce(p_fecha, current_date), nullif(trim(p_proveedor), ''), nullif(trim(p_notas), ''))
  returning id into v_compra;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_cant   := (v_item->>'cantidad')::int;
    v_costo  := (v_item->>'costo_unitario')::numeric;
    v_precio := nullif(v_item->>'precio_venta', '')::numeric;

    if v_cant is null or v_cant <= 0 then raise exception 'Cantidad inválida'; end if;
    if v_costo is null or v_costo < 0 then raise exception 'Falta el costo de compra'; end if;

    select id, stock into v_var
    from variantes where id = (v_item->>'variante_id')::uuid for update;
    if not found then raise exception 'Variante no encontrada'; end if;

    -- El promedio se calcula con el stock ANTES de sumar esta compra
    v_prom := null;
    select costo_promedio into v_prom from costos_variante where variante_id = v_var.id;

    if v_prom is null or v_var.stock = 0 then
      v_nuevo := v_costo;  -- sin historial o sin existencias: queda el costo nuevo
    else
      v_nuevo := round((v_var.stock * v_prom + v_cant * v_costo) / (v_var.stock + v_cant), 2);
    end if;

    insert into costos_variante (variante_id, costo_promedio)
    values (v_var.id, v_nuevo)
    on conflict (variante_id) do update set costo_promedio = excluded.costo_promedio;

    insert into compra_items (compra_id, variante_id, cantidad, costo_unitario)
    values (v_compra, v_var.id, v_cant, v_costo);

    insert into movimientos_inventario (variante_id, tipo, cantidad, referencia, nota)
    values (v_var.id, 'entrada', v_cant, v_compra, 'Compra');

    if v_precio is not null then
      update variantes set precio = v_precio where id = v_var.id;
    end if;
  end loop;

  return v_compra;
end $$;

-- 8.2 Crear un producto nuevo con sus variantes y, si hay piezas, su compra.
-- p_variantes: [{"opciones":{"talla":"M"},"cantidad":3,"costo_unitario":215,
--                "precio":500,"codigo_barras":""}]
--   · "precio" es opcional (si falta se usa p_precio)
--   · "codigo_barras" vacío = se genera solo
--   · con cantidad > 0 el costo_unitario es obligatorio
create or replace function crear_producto_con_compra(
  p_categoria   uuid,
  p_nombre      text,
  p_precio      numeric,
  p_variantes   jsonb,
  p_descripcion text             default null,
  p_marca       text             default null,
  p_seccion     seccion_producto default 'na',
  p_fotos       text[]           default '{}',
  p_fecha       date             default null,
  p_proveedor   text             default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_prod   uuid;
  v_var    jsonb;
  v_id     uuid;
  v_cant   int;
  v_costo  numeric(10,2);
  v_items  jsonb := '[]'::jsonb;
  i        int;
begin
  if not es_dueno() then raise exception 'Solo el dueño puede crear productos'; end if;
  if jsonb_typeof(p_variantes) <> 'array' or jsonb_array_length(p_variantes) = 0 then
    raise exception 'Agrega al menos una variante';
  end if;
  if p_precio is null or p_precio <= 0 then raise exception 'El precio debe ser mayor a 0'; end if;

  insert into productos (categoria_id, nombre, descripcion, marca, seccion)
  values (p_categoria, trim(p_nombre), nullif(trim(p_descripcion), ''),
          nullif(trim(p_marca), ''), coalesce(p_seccion, 'na'))
  returning id into v_prod;

  for i in 1 .. coalesce(array_length(p_fotos, 1), 0) loop
    insert into producto_fotos (producto_id, url, orden) values (v_prod, p_fotos[i], i);
  end loop;

  for v_var in select * from jsonb_array_elements(p_variantes) loop
    v_cant  := coalesce((v_var->>'cantidad')::int, 0);
    v_costo := (v_var->>'costo_unitario')::numeric;
    if v_cant > 0 and v_costo is null then
      raise exception 'Falta el costo de compra de una variante con piezas';
    end if;

    insert into variantes (producto_id, opciones, precio, codigo_barras)
    values (
      v_prod,
      v_var->'opciones',
      coalesce(nullif(v_var->>'precio', '')::numeric, p_precio),
      coalesce(nullif(btrim(v_var->>'codigo_barras'), ''), nuevo_codigo_barras())
    )
    returning id into v_id;

    if v_cant > 0 then
      v_items := v_items || jsonb_build_array(jsonb_build_object(
        'variante_id', v_id, 'cantidad', v_cant, 'costo_unitario', v_costo));
    end if;
  end loop;

  if jsonb_array_length(v_items) > 0 then
    perform registrar_compra(p_fecha, p_proveedor, null, v_items);
  end if;

  return v_prod;
end $$;

-- 8.3 Registrar venta (reemplaza la versión anterior).
-- Ahora guarda el costo promedio del momento en cada renglón.
-- p_fecha (solo dueño) permite cargar ventas históricas del Excel; en ese caso
-- cada renglón puede traer "precio_unitario" y "costo_unitario" propios.
-- p_items: [{"variante_id":"...","cantidad":1,"descuento":0}]
-- p_pagos: [{"metodo":"efectivo","monto":500}]
drop function if exists registrar_venta(canal_venta, jsonb, jsonb, text, text);

create or replace function registrar_venta(
  p_canal   canal_venta,
  p_items   jsonb,
  p_pagos   jsonb,
  p_cliente text        default null,
  p_notas   text        default null,
  p_fecha   timestamptz default null
) returns bigint
language plpgsql security definer set search_path = public as $$
declare
  v_venta_id uuid;
  v_folio    bigint;
  v_corte    uuid;
  v_fecha    timestamptz := coalesce(p_fecha, now());
  v_total    numeric(10,2) := 0;
  v_pagado   numeric(10,2) := 0;
  v_item     jsonb;
  v_pago     jsonb;
  v_var      record;
  v_item_id  uuid;
  v_cant     int;
  v_desc     numeric(10,2);
  v_precio   numeric(10,2);
  v_costo    numeric(10,2);
begin
  if not es_staff() then raise exception 'No autorizado'; end if;
  if p_fecha is not null and not es_dueno() then
    raise exception 'Solo el dueño puede registrar ventas con fecha pasada';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'La venta no tiene productos';
  end if;
  if jsonb_typeof(p_pagos) <> 'array' or jsonb_array_length(p_pagos) = 0 then
    raise exception 'Falta el pago';
  end if;

  -- Las ventas del día entran a la caja abierta; las históricas no
  if p_fecha is null then
    select id into v_corte from cortes_caja where cerrado_at is null limit 1;
  end if;

  insert into ventas (canal, cliente, notas, corte_id, created_at)
  values (p_canal, p_cliente, p_notas, v_corte, v_fecha)
  returning id, folio into v_venta_id, v_folio;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_cant := (v_item->>'cantidad')::int;
    v_desc := coalesce((v_item->>'descuento')::numeric, 0);
    if v_cant is null or v_cant <= 0 then raise exception 'Cantidad inválida'; end if;

    if p_fecha is null and (v_item ? 'precio_unitario' or v_item ? 'costo_unitario') then
      raise exception 'Solo las ventas históricas pueden fijar precio o costo';
    end if;

    select id, precio, activo into v_var
    from variantes where id = (v_item->>'variante_id')::uuid for update;
    if not found or not v_var.activo then raise exception 'Producto no disponible'; end if;

    v_precio := coalesce((v_item->>'precio_unitario')::numeric, v_var.precio);

    v_costo := null;
    select costo_promedio into v_costo from costos_variante where variante_id = v_var.id;
    -- Si la variante nunca tuvo compra registrada el costo queda en 0 (no bloquea la venta)
    v_costo := coalesce((v_item->>'costo_unitario')::numeric, v_costo, 0);

    if v_desc > v_precio * v_cant then raise exception 'El descuento es mayor al importe'; end if;

    insert into venta_items (venta_id, variante_id, cantidad, precio_unitario, descuento)
    values (v_venta_id, v_var.id, v_cant, v_precio, v_desc)
    returning id into v_item_id;

    insert into venta_item_costos (venta_item_id, costo_unitario) values (v_item_id, v_costo);

    -- Descuenta stock; si no alcanza, el CHECK falla y se revierte toda la venta
    insert into movimientos_inventario (variante_id, tipo, cantidad, referencia, created_at)
    values (v_var.id, 'venta', -v_cant, v_venta_id, v_fecha);

    v_total := v_total + (v_precio * v_cant) - v_desc;
  end loop;

  for v_pago in select * from jsonb_array_elements(p_pagos) loop
    insert into pagos (venta_id, metodo, monto)
    values (v_venta_id, (v_pago->>'metodo')::metodo_pago, (v_pago->>'monto')::numeric);
    v_pagado := v_pagado + (v_pago->>'monto')::numeric;
  end loop;

  if v_pagado <> v_total then
    raise exception 'Los pagos (%) no coinciden con el total (%)', v_pagado, v_total;
  end if;

  update ventas set total = v_total where id = v_venta_id;
  return v_folio;
end $$;

-- ---------- 9. CATÁLOGO PÚBLICO: agrega marca y sección ----------
create or replace view catalogo_publico as
select
  v.id            as variante_id,
  p.id            as producto_id,
  p.nombre,
  p.descripcion,
  c.nombre        as categoria,
  v.opciones,
  v.precio,
  v.stock,
  (v.stock > 0)   as disponible,
  (select coalesce(array_agg(f.url order by f.orden), '{}')
     from producto_fotos f where f.producto_id = p.id) as fotos,
  p.marca,
  p.seccion
from variantes v
join productos p  on p.id = v.producto_id
join categorias c on c.id = p.categoria_id
where p.activo and v.activo;

-- ---------- 10. CATEGORÍAS ----------
-- "opciones" = atributos de las variantes. El color de la ropa va en el nombre
-- del producto (ej. "Playera Boss Negra"); se puede cambiar editando el arreglo.
update categorias set nombre = 'Fragancias'
where nombre = 'Perfumes'
  and not exists (select 1 from categorias where nombre = 'Fragancias');

insert into categorias (nombre, opciones) values
  ('Camisas',                '{talla}'),
  ('Playeras',               '{talla}'),
  ('Polos',                  '{talla}'),
  ('Suéteres',               '{talla}'),
  ('Sudaderas',              '{talla}'),
  ('Chamarras y rompevientos','{talla}'),
  ('Chalecos',               '{talla}'),
  ('Conjuntos',              '{talla}'),
  ('Pantalones',             '{talla}'),
  ('Jerseys',                '{talla,equipo}'),
  ('Gorras',                 '{color}'),
  ('Fragancias',             '{ml}'),
  ('Termos',                 '{capacidad,color}')
on conflict (nombre) do update set opciones = excluded.opciones;

-- =====================================================================
-- LISTO. El formulario anterior sigue funcionando con crear_producto();
-- el nuevo formulario usará crear_producto_con_compra() y registrar_compra().
-- =====================================================================
