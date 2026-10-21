-- 0004 · Punto de venta y caja
--   · hoy_mx(): fecha de hoy en hora de Ciudad de México (el servidor está en UTC)
--   · registrar_compra usa hoy_mx() (corrige compras de noche con fecha de mañana)
--   · pos_buscar: búsqueda por nombre, marca, talla o código de barras (sin costos)
--   · abrir_caja / cerrar_caja / resumen_caja
--   · elimina la función antigua crear_producto

drop function if exists crear_producto(uuid, text, text, numeric, text[], jsonb);

create or replace function hoy_mx() returns date
language sql stable as $$ select (now() at time zone 'America/Mexico_City')::date $$;

alter table compras alter column fecha set default hoy_mx();

-- registrar_compra: misma lógica de 0003, pero con la fecha de México por defecto
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
  values (coalesce(p_fecha, hoy_mx()), nullif(trim(p_proveedor), ''), nullif(trim(p_notas), ''))
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

    v_prom := null;
    select costo_promedio into v_prom from costos_variante where variante_id = v_var.id;

    if v_prom is null or v_var.stock = 0 then
      v_nuevo := v_costo;
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

-- Búsqueda del POS. Todas las palabras deben aparecer en nombre, marca, categoría
-- o atributos. Un código de barras exacto sale primero. No devuelve costos.
create or replace function pos_buscar(p_q text, p_limit int default 20)
returns table (
  variante_id   uuid,
  producto_id   uuid,
  nombre        text,
  marca         text,
  categoria     text,
  opciones      jsonb,
  precio        numeric,
  stock         int,
  codigo_barras text,
  foto          text
)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_q text := lower(btrim(coalesce(p_q, '')));
begin
  if not es_staff() then raise exception 'No autorizado'; end if;
  if v_q = '' then return; end if;

  return query
  select v.id, p.id, p.nombre, p.marca, c.nombre, v.opciones, v.precio, v.stock, v.codigo_barras,
         (select f.url from producto_fotos f where f.producto_id = p.id order by f.orden limit 1)
  from variantes v
  join productos p  on p.id = v.producto_id
  join categorias c on c.id = p.categoria_id
  where p.activo and v.activo
    and (
      lower(v.codigo_barras) = v_q
      or not exists (
        select 1 from unnest(string_to_array(v_q, ' ')) as w
        where w <> ''
          and strpos(lower(p.nombre || ' ' || coalesce(p.marca, '') || ' ' || c.nombre || ' '
                           || coalesce(v.sku, '') || ' ' || v.opciones::text), w) = 0
      )
    )
  order by (lower(v.codigo_barras) = v_q) desc, p.nombre, v.opciones::text
  limit least(greatest(p_limit, 1), 50);
end $$;

-- Abrir caja (solo una a la vez)
create or replace function abrir_caja(p_fondo numeric default 0) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not es_staff() then raise exception 'No autorizado'; end if;
  if p_fondo is null or p_fondo < 0 then raise exception 'Fondo inicial inválido'; end if;
  begin
    insert into cortes_caja (fondo_inicial) values (p_fondo) returning id into v_id;
  exception when unique_violation then
    raise exception 'Ya hay una caja abierta';
  end;
  return v_id;
end $$;

-- Resumen de una caja (por defecto, la abierta). Devuelve null si no hay.
-- efectivo_esperado = fondo inicial + pagos en efectivo de ventas completadas
create or replace function resumen_caja(p_corte_id uuid default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_c   record;
  v_ef  numeric; v_tar numeric; v_tra numeric;
  v_n   int;     v_tot numeric;
begin
  if not es_staff() then raise exception 'No autorizado'; end if;

  if p_corte_id is null then
    select * into v_c from cortes_caja where cerrado_at is null limit 1;
  else
    select * into v_c from cortes_caja where id = p_corte_id;
  end if;
  if not found then return null; end if;

  select coalesce(sum(pg.monto) filter (where pg.metodo = 'efectivo'), 0),
         coalesce(sum(pg.monto) filter (where pg.metodo = 'tarjeta'), 0),
         coalesce(sum(pg.monto) filter (where pg.metodo = 'transferencia'), 0)
    into v_ef, v_tar, v_tra
  from pagos pg join ventas vt on vt.id = pg.venta_id
  where vt.corte_id = v_c.id and vt.estado = 'completada';

  select count(*)::int, coalesce(sum(total), 0) into v_n, v_tot
  from ventas where corte_id = v_c.id and estado = 'completada';

  return jsonb_build_object(
    'id', v_c.id, 'abierto_at', v_c.abierto_at, 'cerrado_at', v_c.cerrado_at,
    'fondo_inicial', v_c.fondo_inicial, 'efectivo_contado', v_c.efectivo_contado,
    'notas', v_c.notas, 'num_ventas', v_n, 'total_ventas', v_tot,
    'efectivo', v_ef, 'tarjeta', v_tar, 'transferencia', v_tra,
    'efectivo_esperado', v_c.fondo_inicial + v_ef,
    'diferencia', case when v_c.efectivo_contado is null then null
                       else v_c.efectivo_contado - (v_c.fondo_inicial + v_ef) end
  );
end $$;

-- Cerrar la caja abierta con el efectivo contado
create or replace function cerrar_caja(p_efectivo_contado numeric, p_notas text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not es_staff() then raise exception 'No autorizado'; end if;
  if p_efectivo_contado is null or p_efectivo_contado < 0 then
    raise exception 'Efectivo contado inválido';
  end if;

  update cortes_caja
     set cerrado_at = now(), efectivo_contado = p_efectivo_contado, notas = nullif(trim(p_notas), '')
   where cerrado_at is null
  returning id into v_id;

  if v_id is null then raise exception 'No hay caja abierta'; end if;
  return resumen_caja(v_id);
end $$;

notify pgrst, 'reload schema';
