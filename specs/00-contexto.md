# 00 · Contexto y alcance

## Negocio
Boutique física (LUX) que vende ropa (camisas, playeras, polos, suéteres, sudaderas, pantalones, chamarras, jerseys, conjuntos), gorras, fragancias y termos. Vende en mostrador y por redes sociales (Instagram, WhatsApp). Hoy lleva su control en hojas de cálculo (CONTROL LUX 2026: ventas, ropa hombre, ropa mujer, fragancias, termos y un resumen). Empezó a operar en septiembre de 2026.

## Usuarios
| Rol | Quién | Qué puede hacer |
|---|---|---|
| **Dueño** | El dueño de la boutique | Todo: productos, compras, costos, gastos, panel, usuarios, cancelaciones, ajustes. También puede vender. |
| **Vendedora** | Personal de mostrador | Vender, consultar existencias y precios, abrir/cerrar caja, ver sus propias ventas. No ve costos, utilidades, compras ni gastos. |
| **Público** | Clientas | Ver el catálogo y pedir por WhatsApp. Sin sesión. |

Dispositivos: laptop y teléfono (PWA instalable). Sin tablet por ahora.

## Objetivo del MVP
Reemplazar las hojas de cálculo con un sistema que: (1) mantenga **un solo inventario** entre mostrador, redes y catálogo; (2) registre compras, ventas y gastos; (3) calcule **inversión, utilidad bruta y ganancia neta** por venta y en total; (4) permita vender rápido con escáner o búsqueda; (5) publique un catálogo con existencias reales.

## Alcance
Fases 1–4 del plan (catálogo y compras, punto de venta, gastos y panel, catálogo público). Las fases 5 (checkout en línea y envíos) y 6 (offline y hardware) y todo lo de [`05-fuera-de-alcance.md`](05-fuera-de-alcance.md) **no** forman parte del MVP.

## Glosario
- **Producto:** un diseño o artículo (“Playera Premium cuello redondo negra”).
- **Variante:** combinación vendible de un producto (por ejemplo, talla M). Tiene su propio stock, código de barras, precio y costo promedio.
- **Atributos:** lo que distingue variantes dentro de una categoría (talla, color, ml, capacidad, equipo). Máximo 2 por categoría.
- **Compra:** entrada de mercancía con fecha, proveedor opcional, piezas y costo unitario.
- **Costo promedio:** costo ponderado de las piezas en existencia de una variante.
- **Utilidad bruta:** ventas − costo de lo vendido.
- **Ganancia neta:** utilidad bruta − gastos (provisional, ver Q-01).
- **Inversión:** lo gastado en compras en el periodo (se muestra aparte; no se resta de la ganancia neta).
- **Canal:** por dónde se concretó la venta (mostrador, Instagram, WhatsApp, Facebook, web, otro).
- **Corte de caja:** apertura (fondo) y cierre (efectivo contado contra esperado).
- **Folio:** número consecutivo de una venta.
