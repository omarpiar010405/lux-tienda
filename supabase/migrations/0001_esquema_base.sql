-- =====================================================================
-- ESQUEMA BOUTIQUE (Supabase / PostgreSQL)
-- Pegar completo en: Supabase > SQL Editor > New query > Run
-- =====================================================================

-- ---------- 1. TIPOS ----------
create type rol_usuario      as enum ('dueno', 'vendedora');
create type canal_venta      as enum ('mostrador', 'instagram', 'whatsapp', 'facebook', 'otro');
create type metodo_pago      as enum ('efectivo', 'tarjeta', 'transferencia');
create type estado_venta     as enum ('completada', 'cancelada');
create type tipo_movimiento  as enum ('conteo_inicial', 'entrada', 'venta', 'devolucion', 'ajuste');

-- ---------- 2. USUARIOS Y ROLES ----------
create table profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  nombre     text not null default '',
  rol        rol_usuario not null default 'vendedora',
  activo     boolean not null default true,
  created_at timestamptz not null default now()
);

-- Crea el perfil automáticamente cuando se registra un usuario (rol vendedora por defecto)
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, nombre)
  values (new.id, coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1)));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Funciones auxiliares para las políticas de seguridad
create or replace function es_dueno() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and rol = 'dueno' and activo);
$$;

create or replace function es_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and activo);
$$;

-- ---------- 3. CATÁLOGO ----------
-- "opciones" define qué atributos tiene cada categoría (talla, color, ml...)
create table categorias (
  id       uuid primary key default gen_random_uuid(),
  nombre   text not null unique,
  opciones text[] not null default '{}'
);

create table productos (
  id           uuid primary key default gen_random_uuid(),
  categoria_id uuid not null references categorias(id),
  nombre       text not null,
  descripcion  text,
  activo       boolean not null default true,   -- false = oculto del catálogo
  created_at   timestamptz not null default now()
);
create index on productos (categoria_id);

create table producto_fotos (
  id          uuid primary key default gen_random_uuid(),
  producto_id uuid not null references productos(id) on delete cascade,
  url         text not null,                    -- ruta en Supabase Storage
  orden       int not null default 0
);
create index on producto_fotos (producto_id, orden);

-- Código de barras autogenerado; en perfumes se sobreescribe con el de fábrica
create sequence seq_codigo_barras start 1;

create table variantes (
  id            uuid primary key default gen_random_uuid(),
  producto_id   uuid not null references productos(id) on delete cascade,
  opciones      jsonb not null default '{}',    -- ej. {"talla":"M"} o {"ml":"100"}
  sku           text unique,
  codigo_barras text unique not null
                default ('B' || lpad(nextval('seq_codigo_barras')::text, 8, '0')),
  precio        numeric(10,2) not null check (precio >= 0),
  stock         int not null default 0 check (stock >= 0),  -- nunca negativo
  activo        boolean not null default true,
  created_at    timestamptz not null default now(),
  unique (producto_id, opciones)
);
create index on variantes (producto_id);

-- El costo va aparte para que solo el dueño pueda verlo
create table costos_variante (
  variante_id uuid primary key references variantes(id) on delete cascade,
  costo       numeric(10,2) not null check (costo >= 0)
);

-- ---------- 4. INVENTARIO (bitácora de movimientos) ----------
-- Cantidad con signo: + entra, - sale. El stock de variantes se actualiza solo.
create table movimientos_inventario (
  id          bigint generated always as identity primary key,
  variante_id uuid not null references variantes(id),
  tipo        tipo_movimiento not null,
  cantidad    int not null check (cantidad <> 0),
  referencia  uuid,                              -- id de la venta, si aplica
  nota        text,
  usuario_id  uuid references profiles(id) default auth.uid(),
  created_at  timestamptz not null default now()
);
create index on movimientos_inventario (variante_id, created_at desc);

create or replace function aplicar_movimiento() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update variantes set stock = stock + new.cantidad where id = new.variante_id;
  return new;  -- si el stock quedara negativo, el CHECK falla y se cancela todo
end $$;

create trigger trg_aplicar_movimiento
  after insert on movimientos_inventario
  for each row execute function aplicar_movimiento();

-- ---------- 5. VENTAS Y CAJA ----------
create table cortes_caja (
  id               uuid primary key default gen_random_uuid(),
  abierto_por      uuid not null references profiles(id) default auth.uid(),
  abierto_at       timestamptz not null default now(),
  fondo_inicial    numeric(10,2) not null default 0,
  cerrado_at       timestamptz,
  efectivo_contado numeric(10,2),
  notas            text
);
-- Solo puede haber una caja abierta a la vez
create unique index una_caja_abierta on cortes_caja ((true)) where cerrado_at is null;

create table ventas (
  id          uuid primary key default gen_random_uuid(),
  folio       bigint generated always as identity unique,
  vendedora_id uuid not null references profiles(id) default auth.uid(),
  corte_id    uuid references cortes_caja(id),
  canal       canal_venta not null default 'mostrador',
  cliente     text,
  notas       text,
  total       numeric(10,2) not null default 0,
  estado      estado_venta not null default 'completada',
  created_at  timestamptz not null default now()
);
create index on ventas (created_at desc);
create index on ventas (corte_id);

create table venta_items (
  id              uuid primary key default gen_random_uuid(),
  venta_id        uuid not null references ventas(id) on delete cascade,
  variante_id     uuid not null references variantes(id),
  cantidad        int not null check (cantidad > 0),
  precio_unitario numeric(10,2) not null,        -- precio al momento de la venta
  descuento       numeric(10,2) not null default 0 check (descuento >= 0)
);
create index on venta_items (venta_id);

create table pagos (
  id       uuid primary key default gen_random_uuid(),
  venta_id uuid not null references ventas(id) on delete cascade,
  metodo   metodo_pago not null,
  monto    numeric(10,2) not null check (monto > 0)
);
create index on pagos (venta_id);

-- ---------- 6. FUNCIONES DEL POS ----------

-- Registrar venta: todo ocurre en una sola transacción.
-- p_items: [{"variante_id":"...","cantidad":1,"descuento":0}]
-- p_pagos: [{"metodo":"efectivo","monto":500}]
-- El precio SIEMPRE se toma de la base de datos, no del navegador.
create or replace function registrar_venta(
  p_canal   canal_venta,
  p_items   jsonb,
  p_pagos   jsonb,
  p_cliente text default null,
  p_notas   text default null
) returns bigint
language plpgsql security definer set search_path = public as $$
declare
  v_venta_id uuid;
  v_folio    bigint;
  v_corte    uuid;
  v_total    numeric(10,2) := 0;
  v_pagado   numeric(10,2) := 0;
  v_item     jsonb;
  v_pago     jsonb;
  v_var      record;
  v_cant     int;
  v_desc     numeric(10,2);
begin
  if not es_staff() then raise exception 'No autorizado'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'La venta no tiene productos';
  end if;

  select id into v_corte from cortes_caja where cerrado_at is null limit 1;

  insert into ventas (canal, cliente, notas, corte_id)
  values (p_canal, p_cliente, p_notas, v_corte)
  returning id, folio into v_venta_id, v_folio;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_cant := (v_item->>'cantidad')::int;
    v_desc := coalesce((v_item->>'descuento')::numeric, 0);

    select id, precio, activo into v_var
    from variantes where id = (v_item->>'variante_id')::uuid for update;

    if not found or not v_var.activo then
      raise exception 'Producto no disponible';
    end if;

    insert into venta_items (venta_id, variante_id, cantidad, precio_unitario, descuento)
    values (v_venta_id, v_var.id, v_cant, v_var.precio, v_desc);

    -- Descuenta stock; si no alcanza, el CHECK falla y se revierte toda la venta
    insert into movimientos_inventario (variante_id, tipo, cantidad, referencia)
    values (v_var.id, 'venta', -v_cant, v_venta_id);

    v_total := v_total + (v_var.precio * v_cant) - v_desc;
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

-- Cancelar venta (solo dueño): regresa las piezas al inventario
create or replace function cancelar_venta(p_venta_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_item record;
begin
  if not es_dueno() then raise exception 'Solo el dueño puede cancelar ventas'; end if;
  if not exists (select 1 from ventas where id = p_venta_id and estado = 'completada') then
    raise exception 'Venta no encontrada o ya cancelada';
  end if;

  update ventas set estado = 'cancelada' where id = p_venta_id;

  for v_item in select variante_id, cantidad from venta_items where venta_id = p_venta_id loop
    insert into movimientos_inventario (variante_id, tipo, cantidad, referencia, nota)
    values (v_item.variante_id, 'devolucion', v_item.cantidad, p_venta_id, 'Venta cancelada');
  end loop;
end $$;

-- ---------- 7. CATÁLOGO PÚBLICO (lo que ve cualquiera, sin login) ----------
-- No expone costos ni datos internos.
create view catalogo_publico as
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
     from producto_fotos f where f.producto_id = p.id) as fotos
from variantes v
join productos p  on p.id = v.producto_id
join categorias c on c.id = p.categoria_id
where p.activo and v.activo;

grant select on catalogo_publico to anon, authenticated;

-- ---------- 8. SEGURIDAD (Row Level Security) ----------
alter table profiles               enable row level security;
alter table categorias             enable row level security;
alter table productos              enable row level security;
alter table producto_fotos         enable row level security;
alter table variantes              enable row level security;
alter table costos_variante        enable row level security;
alter table movimientos_inventario enable row level security;
alter table cortes_caja            enable row level security;
alter table ventas                 enable row level security;
alter table venta_items            enable row level security;
alter table pagos                  enable row level security;

-- Perfiles
create policy "ver perfil propio o dueño" on profiles for select
  using (id = auth.uid() or es_dueno());
create policy "dueño administra perfiles" on profiles for all
  using (es_dueno()) with check (es_dueno());

-- Catálogo: el personal lee, el dueño modifica
create policy "staff lee categorias" on categorias for select using (es_staff());
create policy "dueño edita categorias" on categorias for all using (es_dueno()) with check (es_dueno());

create policy "staff lee productos" on productos for select using (es_staff());
create policy "dueño edita productos" on productos for all using (es_dueno()) with check (es_dueno());

create policy "staff lee fotos" on producto_fotos for select using (es_staff());
create policy "dueño edita fotos" on producto_fotos for all using (es_dueno()) with check (es_dueno());

create policy "staff lee variantes" on variantes for select using (es_staff());
create policy "dueño edita variantes" on variantes for all using (es_dueno()) with check (es_dueno());

-- Costos: solo el dueño
create policy "solo dueño costos" on costos_variante for all
  using (es_dueno()) with check (es_dueno());

-- Inventario: el personal consulta, el dueño registra entradas/conteos/ajustes.
-- Las ventas lo escriben a través de registrar_venta().
create policy "staff lee movimientos" on movimientos_inventario for select using (es_staff());
create policy "dueño registra movimientos" on movimientos_inventario for insert
  with check (es_dueno() and tipo <> 'venta');

-- Ventas: la vendedora ve solo las suyas, el dueño ve todas.
-- No hay políticas de insert/update: solo se escriben vía funciones.
create policy "ver ventas" on ventas for select
  using (es_dueno() or vendedora_id = auth.uid());
create policy "ver items" on venta_items for select
  using (exists (select 1 from ventas v where v.id = venta_id
                 and (es_dueno() or v.vendedora_id = auth.uid())));
create policy "ver pagos" on pagos for select
  using (exists (select 1 from ventas v where v.id = venta_id
                 and (es_dueno() or v.vendedora_id = auth.uid())));

-- Caja: el personal puede abrir y cerrar
create policy "staff lee cortes" on cortes_caja for select using (es_staff());
create policy "staff abre caja" on cortes_caja for insert
  with check (es_staff() and abierto_por = auth.uid());
create policy "staff cierra caja" on cortes_caja for update
  using (es_staff()) with check (es_staff());

-- ---------- 9. DATOS INICIALES ----------
insert into categorias (nombre, opciones) values
  ('Camisas',  '{talla}'),
  ('Playeras', '{talla}'),
  ('Suéteres', '{talla}'),
  ('Gorras',   '{color}'),
  ('Perfumes', '{ml}');

-- =====================================================================
-- DESPUÉS DE EJECUTAR:
-- 1) Crea tu usuario en Authentication > Users.
-- 2) Hazlo dueño con:
--      update profiles set rol = 'dueno' where id = '<tu-uuid>';
-- 3) En Storage crea un bucket "productos" (público para lectura).
-- =====================================================================
