-- Funciones auxiliares de prueba y permisos de rol (simulan los de Supabase)
\set ON_ERROR_STOP 1

create function t_assert(label text, cond boolean) returns void language plpgsql as $$
begin
  if cond is not true then raise exception 'FALLÓ: %', label; end if;
  raise notice 'ok - %', label;
end $$;

create function t_falla(label text, q text) returns void language plpgsql as $$
begin
  begin execute q;
  exception when others then
    raise notice 'ok (falla esperada) - %: %', label, sqlerrm; return;
  end;
  raise exception 'DEBIÓ FALLAR: %', label;
end $$;

grant usage on schema public, auth to authenticated, anon;
grant all on all tables in schema public to authenticated;
grant all on all sequences in schema public to authenticated;
grant execute on all functions in schema public to authenticated;
grant select on catalogo_publico to anon;
grant usage on schema storage to authenticated, anon;
grant select, insert on storage.objects to authenticated;
grant insert on storage.objects to anon;
grant select on storage.buckets to authenticated;
