-- 0002 · Fotos (Storage) y función inicial crear_producto.
-- crear_producto queda reemplazada por crear_producto_con_compra (0003) y se elimina en 0004.

create or replace function crear_producto(
  p_categoria   uuid,
  p_nombre      text,
  p_descripcion text,
  p_precio      numeric,
  p_fotos       text[],
  p_variantes   jsonb
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_prod  uuid;
  v_var   jsonb;
  v_id    uuid;
  v_stock int;
  i       int;
begin
  if not es_dueno() then raise exception 'Solo el dueño puede crear productos'; end if;
  if jsonb_array_length(p_variantes) = 0 then raise exception 'Agrega al menos una variante'; end if;

  insert into productos (categoria_id, nombre, descripcion)
  values (p_categoria, trim(p_nombre), nullif(trim(p_descripcion), ''))
  returning id into v_prod;

  for i in 1 .. coalesce(array_length(p_fotos, 1), 0) loop
    insert into producto_fotos (producto_id, url, orden) values (v_prod, p_fotos[i], i);
  end loop;

  for v_var in select * from jsonb_array_elements(p_variantes) loop
    insert into variantes (producto_id, opciones, precio, codigo_barras)
    values (
      v_prod, v_var->'opciones', p_precio,
      coalesce(nullif(v_var->>'codigo_barras', ''),
               'B' || lpad(nextval('seq_codigo_barras')::text, 8, '0'))
    )
    returning id into v_id;

    v_stock := coalesce((v_var->>'stock')::int, 0);
    if v_stock > 0 then
      insert into movimientos_inventario (variante_id, tipo, cantidad, nota)
      values (v_id, 'conteo_inicial', v_stock, 'Alta de producto');
    end if;
  end loop;

  return v_prod;
end $$;

-- Bucket público para fotos; solo el dueño sube o borra
insert into storage.buckets (id, name, public)
values ('productos', 'productos', true)
on conflict (id) do update set public = true;

drop policy if exists "dueño sube fotos" on storage.objects;
drop policy if exists "dueño borra fotos" on storage.objects;
create policy "dueño sube fotos" on storage.objects for insert
  with check (bucket_id = 'productos' and public.es_dueno());
create policy "dueño borra fotos" on storage.objects for delete
  using (bucket_id = 'productos' and public.es_dueno());

notify pgrst, 'reload schema';
