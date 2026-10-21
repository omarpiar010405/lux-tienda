# Especificaciones (SDD)

Este proyecto se desarrolla **primero en papel y después en código**. Una spec describe *qué* y *por qué*; el código es solo una implementación de ella.

## Índice
| Documento | Contenido |
|---|---|
| [`constitution.md`](constitution.md) | Reglas que no se negocian (C-01…C-15) |
| [`00-contexto.md`](00-contexto.md) | Negocio, usuarios, alcance del MVP, glosario |
| [`01-catalogo-y-compras.md`](01-catalogo-y-compras.md) | Categorías, productos, variantes, compras, inventario, etiquetas, importación |
| [`02-punto-de-venta.md`](02-punto-de-venta.md) | POS, caja, tickets, cancelaciones |
| [`03-gastos-y-panel.md`](03-gastos-y-panel.md) | Gastos, proveedores, usuarios y panel de resumen (fórmulas) |
| [`04-catalogo-publico.md`](04-catalogo-publico.md) | Catálogo público, WhatsApp, PWA |
| [`06-tienda-en-linea.md`](06-tienda-en-linea.md) | Marca, inicio, carrito, cuentas de clientes y pedidos |
| [`05-fuera-de-alcance.md`](05-fuera-de-alcance.md) | Lo que **no** se construye (todavía) |
| [`data-model.md`](data-model.md) | Tablas, permisos (RLS) y contratos de las funciones SQL |
| [`decisions.md`](decisions.md) | Decisiones de arquitectura (ADR) |
| [`open-questions.md`](open-questions.md) | Dudas sin resolver y supuestos provisionales |
| [`tasks.md`](tasks.md) | Estado de implementación |
| [`proposals/`](proposals/) | Propuestas de cambio pendientes de aprobación |

## Flujo de trabajo para cualquier cambio
1. **Proponer.** Copia `_template/spec.md` a `proposals/AAAA-MM-DD-tema.md` y descríbelo: problema, requisitos con ID, criterios de aceptación (Dado / Cuando / Entonces), qué queda fuera.
2. **Aprobar.** El dueño del proyecto aprueba (o ajusta). Al aprobarse, el contenido pasa a la spec correspondiente y la propuesta se borra.
3. **Planear.** Define qué tablas, funciones y pantallas se tocan. Si hay SQL, será una migración nueva.
4. **Implementar** en pasos pequeños, cumpliendo los criterios de aceptación.
5. **Verificar.** `npm run verify` y, si hubo SQL, `npm run test:db`.
6. **Cerrar.** Actualiza `tasks.md` y la sección “Implementado en / Pruebas” de la spec.

## Cómo se escriben los requisitos
- Cada requisito tiene un ID estable (`R-POS-05`) que se cita en commits, pruebas y revisiones.
- Los criterios de aceptación son comprobables: una persona o una prueba puede decir “cumple” o “no cumple”.
- Lo que se decide por falta de información se registra en `open-questions.md` como **supuesto provisional**, no se esconde en el código.
