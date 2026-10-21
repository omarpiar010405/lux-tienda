-- 0006 · Nuevo rol "cliente"
-- Debe ejecutarse SOLA (antes de 0007): PostgreSQL no permite usar un valor de
-- enum recién agregado dentro de la misma transacción.
alter type rol_usuario add value if not exists 'cliente';
