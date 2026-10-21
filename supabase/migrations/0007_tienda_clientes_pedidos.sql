-- 0007 · Tienda en línea: clientes, direcciones, pedidos y productos populares
-- (specs/06-tienda-en-linea.md)
--
-- ⚠ CORRECCIÓN DE SEGURIDAD (ADR-011): antes, toda cuenta nueva se creaba como
-- "vendedora". Ahora nace como "cliente" (sin ningún permiso del negocio) y
-- es_staff() solo es verdadero para dueño y vendedora. Las cuentas de personal
-- nuevas deben promoverse desde el panel (Clientes → Dar acceso como vendedora).

-- ---------- TIPOS ----------
do $$ begin
  create type estado_pedido as enum ('nuevo', 'confirmado', 'enviado', 'entregado', 'cancelado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type entrega_pedido as enum ('envio', 'recoger');
exception when duplicate_object then null; end $$;

-- ---------- PERMISOS: el cliente no es personal ----------
alter table profiles alter column rol set default 'cliente';

create or replace function es_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and activo and rol in ('dueno', 'vendedora')
  );
$$;

-- ---------- CLIENTES ----------
create table if not exists clientes (
  id               uuid primary key references auth.users(id) on delete cascade,
  nombre           text not null default '' check (char_length(nombre) <= 100),
  apellidos        text check (char_length(apellidos) <= 100),
  email            text,
  telefono         text check (telefono is null or telefono ~ '^[0-9]{10}$'),
  acepta_novedades boolean not null default false,
  created_at       timestamptz not null default now()
);

-- Teléfono de 10 dígitos (acepta +52, espacios y guiones); si no es válido, queda vacío
create or replace function normalizar_telefono(p text) returns text
language sql immutable as $$
  select case
    when length(d) = 10 then d
    when length(d) = 12 and left(d, 2) = '52' then right(d, 10)
    else null
  end
  from (select regexp_replace(coalesce(p, ''), '\D', '', 'g') as d) x
$$;

-- Todo usuario nuevo: perfil "cliente" + ficha de cliente
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  m        jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_nombre text  := left(btrim(coalesce(nullif(btrim(m->>'nombre'), ''), split_part(new.email, '@', 1))), 100);
begin
  insert into profiles (id, nombre, rol) values (new.id, coalesce(v_nombre, ''), 'cliente');
  insert into clientes (id, nombre, apellidos, email, telefono, acepta_novedades)
  values (
    new.id, coalesce(v_nombre, ''), left(nullif(btrim(m->>'apellidos'), ''), 100), new.email,
    normalizar_telefono(m->>'telefono'), coalesce(m->>'acepta_novedades' = 'true', false)
  );
  return new;
end $$;

-- Quien no es dueño no puede cambiar el correo registrado (lo usa el dueño para identificar cuentas)
create or replace function clientes_proteger() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.id := old.id;
  new.created_at := old.created_at;
  if not es_dueno() then new.email := old.email; end if;
  return new;
end $$;

drop trigger if exists trg_clientes_proteger on clientes;
create trigger trg_clientes_proteger before update on clientes
  for each row execute function clientes_proteger();

-- ---------- DIRECCIONES ----------
create table if not exists direcciones (
  id           uuid primary key default gen_random_uuid(),
  cliente_id   uuid not null references clientes(id) on delete cascade,
  alias        text check (char_length(alias) <= 40),
  nombre       text not null check (btrim(nombre) <> '' and char_length(nombre) <= 100),
  apellidos    text check (char_length(apellidos) <= 100),
  telefono     text not null check (telefono ~ '^[0-9]{10}$'),
  calle        text not null check (btrim(calle) <> '' and char_length(calle) <= 200),
  interior     text check (char_length(interior) <= 50),
  colonia      text not null check (btrim(colonia) <> '' and char_length(colonia) <= 100),
  ciudad       text not null check (btrim(ciudad) <> '' and char_length(ciudad) <= 100),
  estado       text not null check (btrim(estado) <> '' and char_length(estado) <= 60),
  cp           text not null check (cp ~ '^[0-9]{5}$'),
  referencias  text check (char_length(referencias) <= 300),
  es_principal boolean not null default false,
  created_at   timestamptz not null default now()
);
create index if not exists direcciones_cliente_idx on direcciones (cliente_id);

-- Máximo 10 direcciones; la primera es principal; solo una principal por cliente
create or replace function direcciones_reglas() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if (select count(*) from direcciones where cliente_id = new.cliente_id) >= 10 then
      raise exception 'Máximo 10 direcciones guardadas';
    end if;
    if not exists (select 1 from direcciones where cliente_id = new.cliente_id) then
      new.es_principal := true;
    end if;
  end if;
  if new.es_principal then
    update direcciones set es_principal = false where cliente_id = new.cliente_id and id <> new.id;
  end if;
  return new;
end $$;

drop trigger if exists trg_direcciones_reglas on direcciones;
create trigger trg_direcciones_reglas before insert or update on direcciones
  for each row execute function direcciones_reglas();

-- ---------- PEDIDOS ----------
create table if not exists pedidos (
  id                uuid primary key default gen_random_uuid(),
  numero            bigint generated always as identity (start with 1001) unique,
  cliente_id        uuid not null references clientes(id),
  estado            estado_pedido not null default 'nuevo',
  entrega           entrega_pedido not null,
  contacto_nombre   text not null,
  contacto_email    text,
  contacto_telefono text not null,
  direccion         jsonb,                       -- copia de la dirección (solo si entrega = envio)
  notas             text check (char_length(notas) <= 500),
  subtotal          numeric(10,2) not null default 0,
  total             numeric(10,2) not null default 0,
  venta_id          uuid references ventas(id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check ((entrega = 'envio') = (direccion is not null))
);
create index if not exists pedidos_cliente_idx on pedidos (cliente_id, created_at desc);
create index if not exists pedidos_estado_idx  on pedidos (estado, created_at desc);

create table if not exists pedido_items (
  id              uuid primary key default gen_random_uuid(),
  pedido_id       uuid not null references pedidos(id) on delete cascade,
  variante_id     uuid not null references variantes(id),
  cantidad        int not null check (cantidad between 1 and 20),
  precio_unitario numeric(10,2) not null,
  nombre          text not null,
  opciones        jsonb not null default '{}'
);
create index if not exists pedido_items_pedido_idx on pedido_items (pedido_id);

-- ---------- SEGURIDAD (RLS) ----------
alter table clientes     enable row level security;
alter table direcciones  enable row level security;
alter table pedidos      enable row level security;
alter table pedido_items enable row level security;

drop policy if exists "cliente ve su ficha, dueño todas" on clientes;
create policy "cliente ve su ficha, dueño todas" on clientes
  for select using (id = auth.uid() or es_dueno());
drop policy if exists "cliente edita su ficha" on clientes;
create policy "cliente edita su ficha" on clientes
  for update using (id = auth.uid()) with check (id = auth.uid());
drop policy if exists "dueño edita fichas" on clientes;
create policy "dueño edita fichas" on clientes
  for update using (es_dueno()) with check (es_dueno());

drop policy if exists "cliente gestiona sus direcciones" on direcciones;
create policy "cliente gestiona sus direcciones" on direcciones
  for all using (cliente_id = auth.uid()) with check (cliente_id = auth.uid());
drop policy if exists "dueño ve direcciones" on direcciones;
create policy "dueño ve direcciones" on direcciones
  for select using (es_dueno());

-- Pedidos: solo lectura directa; todo cambio pasa por funciones
drop policy if exists "ver pedidos propios o dueño" on pedidos;
create policy "ver pedidos propios o dueño" on pedidos
  for select using (cliente_id = auth.uid() or es_dueno());
drop policy if exists "ver items de pedidos propios o dueño" on pedido_items;
create policy "ver items de pedidos propios o dueño" on pedido_items
  for select using (exists (
    select 1 from pedidos p where p.id = pedido_id and (p.cliente_id = auth.uid() or es_dueno())));

-- Clientes que ya tenían cuenta antes de esta migración (personal): crear su ficha
insert into clientes (id, nombre, email)
select p.id, p.nombre, u.email from profiles p join auth.users u on u.id = p.id
on conflict (id) do nothing;

-- ---------- FUNCIONES ----------

-- Crear pedido (cliente con sesión). No reserva existencias.
-- p_items: [{"variante_id":"...","cantidad":2}]
create or replace function crear_pedido(
  p_items        jsonb,
  p_entrega      entrega_pedido,
  p_direccion_id uuid default null,
  p_notas        text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid      uuid := auth.uid();
  v_cli      clientes%rowtype;
  v_dir      direcciones%rowtype;
  v_snapshot jsonb := null;
  v_pedido   uuid;
  v_numero   bigint;
  v_item     jsonb;
  v_var      record;
  v_cant     int;
  v_total    numeric(10,2) := 0;
begin
  if v_uid is null then raise exception 'Inicia sesión para hacer un pedido'; end if;
  if not exists (select 1 from profiles where id = v_uid and activo) then
    raise exception 'Tu cuenta está desactivada';
  end if;

  select * into v_cli from clientes where id = v_uid;
  if not found then raise exception 'Completa los datos de tu cuenta'; end if;
  if v_cli.telefono is null then raise exception 'Falta tu teléfono: agrégalo en Mi cuenta'; end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Tu carrito está vacío';
  end if;
  if jsonb_array_length(p_items) > 30 then raise exception 'Máximo 30 productos distintos por pedido'; end if;
  if exists (select 1 from jsonb_array_elements(p_items) x where x->>'variante_id' is null) then
    raise exception 'Un producto de tu carrito no es válido';
  end if;
  if (select count(distinct x->>'variante_id') from jsonb_array_elements(p_items) x) <> jsonb_array_length(p_items) then
    raise exception 'Hay productos repetidos en el carrito';
  end if;
  if (select count(*) from pedidos where cliente_id = v_uid and estado = 'nuevo') >= 5 then
    raise exception 'Ya tienes 5 pedidos pendientes; espera a que se confirmen';
  end if;

  if p_entrega = 'envio' then
    select * into v_dir from direcciones where id = p_direccion_id and cliente_id = v_uid;
    if not found then raise exception 'Elige una dirección de envío'; end if;
    v_snapshot := to_jsonb(v_dir) - 'id' - 'cliente_id' - 'es_principal' - 'created_at';
  end if;

  insert into pedidos (cliente_id, entrega, contacto_nombre, contacto_email, contacto_telefono, direccion, notas)
  values (
    v_uid, p_entrega, btrim(v_cli.nombre || ' ' || coalesce(v_cli.apellidos, '')),
    v_cli.email, v_cli.telefono, v_snapshot, nullif(btrim(coalesce(p_notas, '')), '')
  )
  returning id, numero into v_pedido, v_numero;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_cant := (v_item->>'cantidad')::int;
    if v_cant is null or v_cant < 1 or v_cant > 20 then raise exception 'Cantidad inválida'; end if;

    select va.id, va.precio, va.stock, va.opciones, pr.nombre, pr.marca into v_var
    from variantes va join productos pr on pr.id = va.producto_id
    where va.id = (v_item->>'variante_id')::uuid and va.activo and pr.activo;
    if not found then raise exception 'Un producto de tu carrito ya no está disponible'; end if;

    if v_var.stock < v_cant then
      raise exception 'No hay suficientes existencias de % (quedan %)', v_var.nombre, v_var.stock;
    end if;

    insert into pedido_items (pedido_id, variante_id, cantidad, precio_unitario, nombre, opciones)
    values (v_pedido, v_var.id, v_cant, v_var.precio,
            v_var.nombre || coalesce(' ' || v_var.marca, ''), v_var.opciones);
    v_total := v_total + v_var.precio * v_cant;
  end loop;

  update pedidos set subtotal = v_total, total = v_total where id = v_pedido;
  return jsonb_build_object('id', v_pedido, 'numero', v_numero);
end $$;

-- Confirmar pedido (dueño): registra la venta canal web con precios vigentes.
create or replace function confirmar_pedido(p_pedido_id uuid, p_metodo metodo_pago default 'transferencia')
returns bigint
language plpgsql security definer set search_path = public as $$
declare
  v_p     pedidos%rowtype;
  v_items jsonb;
  v_total numeric(10,2);
  v_folio bigint;
  v_venta uuid;
begin
  if not es_dueno() then raise exception 'Solo el dueño puede confirmar pedidos'; end if;

  select * into v_p from pedidos where id = p_pedido_id for update;
  if not found then raise exception 'Pedido no encontrado'; end if;
  if v_p.estado <> 'nuevo' then raise exception 'Solo se pueden confirmar pedidos nuevos'; end if;

  select jsonb_agg(jsonb_build_object('variante_id', pi.variante_id, 'cantidad', pi.cantidad)),
         sum(va.precio * pi.cantidad)
    into v_items, v_total
  from pedido_items pi join variantes va on va.id = pi.variante_id
  where pi.pedido_id = v_p.id;

  v_folio := registrar_venta(
    'web', v_items,
    jsonb_build_array(jsonb_build_object('metodo', p_metodo, 'monto', v_total)),
    v_p.contacto_nombre, 'Pedido #' || v_p.numero
  );
  select id into v_venta from ventas where folio = v_folio;

  update pedidos set estado = 'confirmado', venta_id = v_venta, total = v_total, updated_at = now()
  where id = v_p.id;
  return v_folio;
end $$;

-- Cambiar estado (dueño): confirmado→enviado→entregado; recoger: confirmado→entregado;
-- cancelar solo nuevo/confirmado (si hay venta, se cancela y regresan las piezas).
create or replace function cambiar_estado_pedido(p_pedido_id uuid, p_estado estado_pedido)
returns void
language plpgsql security definer set search_path = public as $$
declare v_p pedidos%rowtype;
begin
  if not es_dueno() then raise exception 'Solo el dueño puede cambiar el estado'; end if;

  select * into v_p from pedidos where id = p_pedido_id for update;
  if not found then raise exception 'Pedido no encontrado'; end if;

  if v_p.estado = 'confirmado' and p_estado = 'enviado' and v_p.entrega = 'envio' then
    null;
  elsif v_p.estado = 'enviado' and p_estado = 'entregado' then
    null;
  elsif v_p.estado = 'confirmado' and p_estado = 'entregado' and v_p.entrega = 'recoger' then
    null;
  elsif v_p.estado in ('nuevo', 'confirmado') and p_estado = 'cancelado' then
    if v_p.venta_id is not null
       and exists (select 1 from ventas where id = v_p.venta_id and estado = 'completada') then
      perform cancelar_venta(v_p.venta_id);
    end if;
  else
    raise exception 'Cambio de estado no permitido (% → %)', v_p.estado, p_estado;
  end if;

  update pedidos set estado = p_estado, updated_at = now() where id = v_p.id;
end $$;

-- Productos populares (público): orden por piezas vendidas en 90 días, con existencias.
-- Solo devuelve ids en orden; nunca cifras de ventas.
create or replace function productos_populares(p_limit int default 8)
returns table (producto_id uuid)
language sql stable security definer set search_path = public as $$
  with disponibles as (
    select p.id, p.created_at
    from productos p
    where p.activo and exists (
      select 1 from variantes v where v.producto_id = p.id and v.activo and v.stock > 0)
  ),
  vendidos as (
    select va.producto_id as id, sum(vi.cantidad) as piezas
    from venta_items vi
    join ventas vt    on vt.id = vi.venta_id and vt.estado = 'completada'
                     and vt.created_at >= now() - interval '90 days'
    join variantes va on va.id = vi.variante_id
    group by va.producto_id
  )
  select d.id
  from disponibles d
  left join vendidos v on v.id = d.id
  order by coalesce(v.piezas, 0) desc, d.created_at desc
  limit least(greatest(p_limit, 1), 500)
$$;

notify pgrst, 'reload schema';
