-- 0008 · Método de pago en pedidos y comprobantes de transferencia
-- (specs/06-tienda-en-linea.md · R-PAY-01…06)

-- ---------- MÉTODO DE PAGO ----------
alter table pedidos add column if not exists metodo_pago metodo_pago not null default 'transferencia';

-- ---------- COMPROBANTES ----------
create table if not exists pedido_comprobantes (
  id              uuid primary key default gen_random_uuid(),
  pedido_id       uuid not null references pedidos(id) on delete cascade,
  ruta            text not null unique,          -- <cliente>/<pedido>/<archivo> en el bucket "comprobantes"
  nombre_original text check (char_length(nombre_original) <= 200),
  tipo_mime       text not null,
  tamano          int  not null check (tamano > 0 and tamano <= 10485760),
  subido_por      uuid default auth.uid(),
  created_at      timestamptz not null default now()
);
create index if not exists pedido_comprobantes_pedido_idx on pedido_comprobantes (pedido_id);

alter table pedido_comprobantes enable row level security;
drop policy if exists "ver comprobantes propios o dueño" on pedido_comprobantes;
create policy "ver comprobantes propios o dueño" on pedido_comprobantes
  for select using (exists (
    select 1 from pedidos p where p.id = pedido_id and (p.cliente_id = auth.uid() or es_dueno())));

-- ---------- ALMACENAMIENTO PRIVADO ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('comprobantes', 'comprobantes', false, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- La clienta solo sube a <su id>/<pedido suyo, nuevo y por transferencia>/…
drop policy if exists "cliente sube comprobantes" on storage.objects;
create policy "cliente sube comprobantes" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'comprobantes'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (
      select 1 from public.pedidos p
      where p.id::text = (storage.foldername(name))[2]
        and p.cliente_id = auth.uid()
        and p.estado = 'nuevo'
        and p.metodo_pago = 'transferencia')
  );

-- Lee la dueña del archivo y el dueño de la boutique
drop policy if exists "ver comprobantes propios o dueño" on storage.objects;
create policy "ver comprobantes propios o dueño" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'comprobantes'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.es_dueno())
  );

-- ---------- FUNCIONES ----------

-- Crear pedido: ahora con método de pago. Envío a domicilio ⇒ solo transferencia (Q-13).
drop function if exists crear_pedido(jsonb, entrega_pedido, uuid, text);

create or replace function crear_pedido(
  p_items        jsonb,
  p_entrega      entrega_pedido,
  p_direccion_id uuid        default null,
  p_notas        text        default null,
  p_metodo       metodo_pago default 'transferencia'
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

  if p_metodo is null then raise exception 'Elige un método de pago'; end if;
  if p_entrega = 'envio' and p_metodo <> 'transferencia' then
    raise exception 'Para envíos a domicilio el pago es por transferencia';
  end if;

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

  insert into pedidos (cliente_id, entrega, metodo_pago, contacto_nombre, contacto_email, contacto_telefono, direccion, notas)
  values (
    v_uid, p_entrega, p_metodo, btrim(v_cli.nombre || ' ' || coalesce(v_cli.apellidos, '')),
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

-- Adjuntar un comprobante ya subido al bucket privado.
create or replace function adjuntar_comprobante(
  p_pedido_id uuid,
  p_ruta      text,
  p_nombre    text,
  p_mime      text,
  p_tamano    int
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid     uuid := auth.uid();
  v_p       pedidos%rowtype;
  v_prefijo text;
  v_id      uuid;
begin
  if v_uid is null then raise exception 'Inicia sesión'; end if;

  select * into v_p from pedidos where id = p_pedido_id and cliente_id = v_uid;
  if not found then raise exception 'Pedido no encontrado'; end if;
  if v_p.metodo_pago <> 'transferencia' then raise exception 'Este pedido no es por transferencia'; end if;
  if v_p.estado <> 'nuevo' then raise exception 'Ya no se pueden agregar comprobantes a este pedido'; end if;

  v_prefijo := v_uid::text || '/' || p_pedido_id::text || '/';
  if p_ruta is null or left(p_ruta, length(v_prefijo)) <> v_prefijo or length(p_ruta) = length(v_prefijo) then
    raise exception 'Ruta de archivo inválida';
  end if;
  if p_mime is null or p_mime not in ('image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf') then
    raise exception 'Formato no permitido (usa JPG, PNG, WEBP, HEIC o PDF)';
  end if;
  if p_tamano is null or p_tamano <= 0 then raise exception 'El archivo está vacío'; end if;
  if p_tamano > 10485760 then raise exception 'El archivo es demasiado grande (máximo 10 MB)'; end if;
  if (select count(*) from pedido_comprobantes where pedido_id = p_pedido_id) >= 5 then
    raise exception 'Máximo 5 comprobantes por pedido';
  end if;
  if not exists (select 1 from storage.objects where bucket_id = 'comprobantes' and name = p_ruta) then
    raise exception 'No se encontró el archivo subido; inténtalo de nuevo';
  end if;

  insert into pedido_comprobantes (pedido_id, ruta, nombre_original, tipo_mime, tamano)
  values (p_pedido_id, p_ruta, left(p_nombre, 200), p_mime, p_tamano)
  returning id into v_id;
  return v_id;
end $$;

-- Confirmar pedido: el método de pago por defecto es el que eligió la clienta.
drop function if exists confirmar_pedido(uuid, metodo_pago);

create or replace function confirmar_pedido(p_pedido_id uuid, p_metodo metodo_pago default null)
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
    jsonb_build_array(jsonb_build_object('metodo', coalesce(p_metodo, v_p.metodo_pago), 'monto', v_total)),
    v_p.contacto_nombre, 'Pedido #' || v_p.numero
  );
  select id into v_venta from ventas where folio = v_folio;

  update pedidos set estado = 'confirmado', venta_id = v_venta, total = v_total, updated_at = now()
  where id = v_p.id;
  return v_folio;
end $$;

notify pgrst, 'reload schema';
