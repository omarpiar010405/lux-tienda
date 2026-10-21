# 03 · Gastos, usuarios y panel de resumen

## Requisitos

### Gastos y usuarios
- **R-GAS-01** El dueño registra gastos con fecha, concepto, categoría, subtotal, IVA y total (= subtotal + IVA, calculado por la base de datos), y puede marcarlos como recurrentes. Puede borrarlos (no hay edición en el MVP). Un botón calcula el IVA al 16 %.
- **R-USR-02** El dueño **da de alta empleados desde el panel** (Personal → Alta de empleado): nombre, correo y contraseña temporal (con generador). La cuenta nace y queda con rol *vendedora* y acceso inmediato; el sistema muestra las credenciales para entregarlas. No usa la clave `service_role` (ADR-016). Cualquier usuario puede **cambiar su propia contraseña** en Mi cuenta.
- **R-USR-01** El dueño lista usuarios, cambia su rol (dueño/vendedora) y los activa o desactiva. No puede cambiar su propio rol ni desactivarse. Las cuentas creadas en Supabase o en la tienda nacen como cliente (ADR-011) y se pueden promover desde Clientes.

### Panel de resumen (solo dueño)
- **R-PAN-01** Periodos: hoy, ayer, 7 días, este mes, mes pasado o rango. Las fechas se interpretan en hora de México (C-08). Las ventas canceladas no cuentan.
- **R-PAN-02** Indicadores: ventas, número de ventas, piezas, costo de lo vendido, utilidad bruta, margen, inversión en compras, gastos (subtotal, IVA, total) y ganancia neta.
- **R-PAN-03** Tabla por categoría (piezas, ventas, costo, utilidad bruta, inversión, ganancia neta) y tabla de egresos, ambas exportables a CSV.
- **R-PAN-04** Inventario: valor a costo y a precio de venta, piezas, variantes sin costo.
- **R-PAN-05** Listas: stock bajo (≤ 2 piezas), sin ventas en 30 días, más vendidos del periodo con utilidad y margen.
- **R-PAN-06** Ventas: lista por periodo con filtros de canal y vendedora; detalle por venta con costo y utilidad por renglón.

### Fórmulas (fuente única: SQL)
```
ventas          = suma de venta.total (completadas)
costo_vendido   = Σ costo_guardado × piezas
utilidad_bruta  = ventas − costo_vendido
inversion       = Σ piezas × costo_unitario de las compras del periodo   (se muestra aparte)
gastos_total    = Σ (subtotal + IVA) de los gastos del periodo
ganancia_neta   = fn_ganancia_neta(utilidad_bruta, gastos_total)
                = utilidad_bruta − gastos_total            ← PROVISIONAL (Q-01)
por categoría:  ganancia_neta_c = utilidad_bruta_c − gastos_total × (ventas_c ÷ ventas_totales)   ← PROVISIONAL (Q-02)
```
Si el dueño calcula la ganancia neta de otra forma, **solo** se reemplaza `fn_ganancia_neta()` con una migración nueva y se actualiza este documento y su prueba.

## Criterios de aceptación
- **Dado** ventas por $970 con costo $442 y gastos de $1,360, **entonces** utilidad bruta = $528 y ganancia neta = −$832.
- **Dado** compras por $2,615 en el periodo, **entonces** la inversión muestra $2,615 y **no** modifica la ganancia neta.
- **Dado** una venta cancelada, **entonces** desaparece de ventas, utilidad y piezas del periodo.
- **Dado** una vendedora, **cuando** llama a cualquier función `panel_*` o consulta `gastos`, **entonces** falla o no ve filas.
- **Dado** una venta a las 21:00 hora de México, **entonces** cuenta en ese día (no en el siguiente por UTC).

## Implementado en
`supabase/migrations/0005`, `src/app/admin/{page,ventas,gastos,usuarios}`, `src/components/{GastosAdmin,UsuariosAdmin,FiltroPeriodo}.tsx`.

## Pruebas
`supabase/tests/10_flujo_completo.sql` (todas las cifras de arriba).
