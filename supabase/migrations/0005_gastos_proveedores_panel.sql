-- 0005 · Gastos, proveedores y panel de resumen (solo dueño)
--
-- FÓRMULA DE GANANCIA NETA (provisional, ver specs/open-questions.md):
--   ganancia neta = utilidad bruta − gastos (total con IVA)
-- Vive en UNA sola función: fn_ganancia_neta(). Si el dueño la calcula distinto,
-- se reemplaza solo esa función con una migración nueva.

-- ---------- PROVEEDORES ----------
create table if not exists proveedores (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null unique check (btrim(nombre) <> ''),
  contacto   text,
  notas      text,
  activo     boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- GASTOS ----------
create table if not exists gastos (
  id         uuid primary key default gen_random_uuid(),
  fecha      date not null default hoy_mx(),
  concepto   text not null check (btrim(concepto) <> ''),
  categoria  text not null default 'Otros',
  subtotal   numeric(10,2) not null check (subtotal >= 0),
  iva        numeric(10,2) not null default 0 check (iva >= 0),
  total      numeric(10,2) generated always as (subtotal + iva) stored,
  recurrente boolean not null default false,
  notas      text,
  usuario_id uuid references profiles(id) default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists gastos_fecha_idx on gastos (fecha desc);

alter table proveedores enable row level security;
alter table gastos      enable row level security;

drop policy if exists "dueño gestiona proveedores" on proveedores;
create policy "dueño gestiona proveedores" on proveedores
  for all using (es_dueno()) with check (es_dueno());

drop policy if exists "dueño gestiona gastos" on gastos;
create policy "dueño gestiona gastos" on gastos
  for all using (es_dueno()) with check (es_dueno());

-- ---------- FÓRMULA ----------
create or replace function fn_ganancia_neta(p_utilidad_bruta numeric, p_gastos_total numeric)
returns numeric language sql immutable as $$
  select coalesce(p_utilidad_bruta, 0) - coalesce(p_gastos_total, 0)
$$;

-- ---------- PANEL ----------
-- Todas las funciones exigen rol dueño. Las fechas se interpretan en hora de
-- Ciudad de México. Las ventas canceladas no cuentan.

create or replace function panel_resumen(p_desde date, p_hasta date)
returns table (
  num_ventas      int,
  piezas          int,
  ventas          numeric,
  costo_vendido   numeric,
  utilidad_bruta  numeric,
  inversion       numeric,
  gastos_subtotal numeric,
  gastos_iva      numeric,
  gastos_total    numeric,
  ganancia_neta   numeric
)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_n int; v_piezas int; v_ventas numeric; v_costo numeric; v_inv numeric;
  v_gs numeric; v_gi numeric; v_gt numeric;
begin
  if not es_dueno() then raise exception 'No autorizado'; end if;

  select count(*)::int, coalesce(sum(vt.total), 0) into v_n, v_ventas
  from ventas vt
  where vt.estado = 'completada'
    and (vt.created_at at time zone 'America/Mexico_City')::date between p_desde and p_hasta;

  select coalesce(sum(vi.cantidad), 0)::int,
         coalesce(sum(coalesce(vic.costo_unitario, 0) * vi.cantidad), 0)
    into v_piezas, v_costo
  from ventas vt
  join venta_items vi on vi.venta_id = vt.id
  left join venta_item_costos vic on vic.venta_item_id = vi.id
  where vt.estado = 'completada'
    and (vt.created_at at time zone 'America/Mexico_City')::date between p_desde and p_hasta;

  select coalesce(sum(ci.cantidad * ci.costo_unitario), 0) into v_inv
  from compra_items ci join compras co on co.id = ci.compra_id
  where co.fecha between p_desde and p_hasta;

  select coalesce(sum(g.subtotal), 0), coalesce(sum(g.iva), 0), coalesce(sum(g.total), 0)
    into v_gs, v_gi, v_gt
  from gastos g where g.fecha between p_desde and p_hasta;

  return query select v_n, v_piezas, v_ventas, v_costo, v_ventas - v_costo, v_inv,
                      v_gs, v_gi, v_gt, fn_ganancia_neta(v_ventas - v_costo, v_gt);
end $$;

-- Por categoría. Los gastos se reparten en proporción a las ventas de cada
-- categoría (provisional); si no hubo ventas en el periodo no se reparten.
create or replace function panel_por_categoria(p_desde date, p_hasta date)
returns table (
  categoria      text,
  piezas         int,
  ventas         numeric,
  costo          numeric,
  utilidad_bruta numeric,
  inversion      numeric,
  ganancia_neta  numeric
)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare v_gastos numeric;
begin
  if not es_dueno() then raise exception 'No autorizado'; end if;

  select coalesce(sum(g.total), 0) into v_gastos
  from gastos g where g.fecha between p_desde and p_hasta;

  return query
  with vs as (
    select c.id as cat_id, c.nombre as cat, vi.cantidad,
           (vi.precio_unitario * vi.cantidad - vi.descuento) as importe,
           coalesce(vic.costo_unitario, 0) * vi.cantidad as costo
    from ventas vt
    join venta_items vi on vi.venta_id = vt.id
    join variantes va   on va.id = vi.variante_id
    join productos p    on p.id = va.producto_id
    join categorias c   on c.id = p.categoria_id
    left join venta_item_costos vic on vic.venta_item_id = vi.id
    where vt.estado = 'completada'
      and (vt.created_at at time zone 'America/Mexico_City')::date between p_desde and p_hasta
  ),
  vcat as (
    select cat_id, cat, sum(cantidad)::int as piezas, sum(importe) as ventas, sum(costo) as costo
    from vs group by cat_id, cat
  ),
  icat as (
    select c.id as cat_id, c.nombre as cat, sum(ci.cantidad * ci.costo_unitario) as inv
    from compra_items ci
    join compras co   on co.id = ci.compra_id
    join variantes va on va.id = ci.variante_id
    join productos p  on p.id = va.producto_id
    join categorias c on c.id = p.categoria_id
    where co.fecha between p_desde and p_hasta
    group by c.id, c.nombre
  ),
  tot as (select coalesce(sum(vcat.ventas), 0) as t from vcat)
  select coalesce(vcat.cat, icat.cat),
         coalesce(vcat.piezas, 0),
         coalesce(vcat.ventas, 0),
         coalesce(vcat.costo, 0),
         coalesce(vcat.ventas, 0) - coalesce(vcat.costo, 0),
         coalesce(icat.inv, 0),
         fn_ganancia_neta(
           coalesce(vcat.ventas, 0) - coalesce(vcat.costo, 0),
           case when tot.t > 0 then round(v_gastos * coalesce(vcat.ventas, 0) / tot.t, 2) else 0 end)
  from vcat
  full join icat on icat.cat_id = vcat.cat_id
  cross join tot
  order by 1;
end $$;

create or replace function panel_ventas(
  p_desde      date,
  p_hasta      date,
  p_canal      canal_venta default null,
  p_vendedora  uuid        default null
)
returns table (
  venta_id  uuid,
  folio     bigint,
  fecha     timestamptz,
  vendedora text,
  canal     canal_venta,
  estado    estado_venta,
  piezas    int,
  total     numeric,
  costo     numeric,
  utilidad  numeric,
  metodos   text
)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
begin
  if not es_dueno() then raise exception 'No autorizado'; end if;

  return query
  select vt.id, vt.folio, vt.created_at, coalesce(pr.nombre, ''), vt.canal, vt.estado,
         coalesce(x.piezas, 0)::int, vt.total, coalesce(x.costo, 0), vt.total - coalesce(x.costo, 0),
         (select string_agg(distinct pg.metodo::text, ', ') from pagos pg where pg.venta_id = vt.id)
  from ventas vt
  left join profiles pr on pr.id = vt.vendedora_id
  left join lateral (
    select sum(vi.cantidad) as piezas,
           sum(coalesce(vic.costo_unitario, 0) * vi.cantidad) as costo
    from venta_items vi
    left join venta_item_costos vic on vic.venta_item_id = vi.id
    where vi.venta_id = vt.id
  ) x on true
  where (vt.created_at at time zone 'America/Mexico_City')::date between p_desde and p_hasta
    and (p_canal is null or vt.canal = p_canal)
    and (p_vendedora is null or vt.vendedora_id = p_vendedora)
  order by vt.created_at desc
  limit 1000;
end $$;

create or replace function panel_inventario()
returns table (variantes int, piezas int, valor_costo numeric, valor_precio numeric, sin_costo int)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
begin
  if not es_dueno() then raise exception 'No autorizado'; end if;

  return query
  select count(*)::int,
         coalesce(sum(v.stock), 0)::int,
         coalesce(sum(v.stock * coalesce(c.costo_promedio, 0)), 0),
         coalesce(sum(v.stock * v.precio), 0),
         (count(*) filter (where c.variante_id is null))::int
  from variantes v
  join productos p on p.id = v.producto_id
  left join costos_variante c on c.variante_id = v.id
  where p.activo and v.activo and v.stock > 0;
end $$;

create or replace function panel_stock_bajo(p_umbral int default 2)
returns table (
  variante_id uuid, producto_id uuid, nombre text, marca text, categoria text,
  opciones jsonb, stock int, precio numeric
)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
begin
  if not es_dueno() then raise exception 'No autorizado'; end if;

  return query
  select v.id, p.id, p.nombre, p.marca, c.nombre, v.opciones, v.stock, v.precio
  from variantes v
  join productos p  on p.id = v.producto_id
  join categorias c on c.id = p.categoria_id
  where p.activo and v.activo and v.stock <= p_umbral
  order by v.stock, p.nombre, v.opciones::text
  limit 200;
end $$;

-- Variantes con existencias que llevan más de p_dias en inventario sin venderse
create or replace function panel_sin_movimiento(p_dias int default 30)
returns table (
  variante_id uuid, producto_id uuid, nombre text, marca text,
  opciones jsonb, stock int, ultima_venta timestamptz
)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
begin
  if not es_dueno() then raise exception 'No autorizado'; end if;

  return query
  select v.id, p.id, p.nombre, p.marca, v.opciones, v.stock,
         (select max(m.created_at) from movimientos_inventario m
           where m.variante_id = v.id and m.tipo = 'venta')
  from variantes v
  join productos p on p.id = v.producto_id
  where p.activo and v.activo and v.stock > 0
    and v.created_at < now() - make_interval(days => p_dias)
    and not exists (
      select 1 from movimientos_inventario m
      where m.variante_id = v.id and m.tipo = 'venta'
        and m.created_at >= now() - make_interval(days => p_dias))
  order by 7 nulls first, p.nombre
  limit 200;
end $$;

create or replace function panel_mas_vendidos(p_desde date, p_hasta date, p_limit int default 10)
returns table (
  producto_id uuid, nombre text, marca text,
  piezas int, ventas numeric, utilidad numeric, margen_pct numeric
)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
begin
  if not es_dueno() then raise exception 'No autorizado'; end if;

  return query
  with x as (
    select p.id as pid, p.nombre as pnombre, p.marca as pmarca,
           sum(vi.cantidad)::int as piezas,
           sum(vi.precio_unitario * vi.cantidad - vi.descuento) as ventas,
           sum(vi.precio_unitario * vi.cantidad - vi.descuento
               - coalesce(vic.costo_unitario, 0) * vi.cantidad) as utilidad
    from ventas vt
    join venta_items vi on vi.venta_id = vt.id
    join variantes va   on va.id = vi.variante_id
    join productos p    on p.id = va.producto_id
    left join venta_item_costos vic on vic.venta_item_id = vi.id
    where vt.estado = 'completada'
      and (vt.created_at at time zone 'America/Mexico_City')::date between p_desde and p_hasta
    group by p.id, p.nombre, p.marca
  )
  select x.pid, x.pnombre, x.pmarca, x.piezas, x.ventas, x.utilidad,
         case when x.ventas > 0 then round(x.utilidad * 100 / x.ventas, 1) else 0 end
  from x
  order by x.piezas desc, x.ventas desc
  limit least(greatest(p_limit, 1), 100);
end $$;

notify pgrst, 'reload schema';
