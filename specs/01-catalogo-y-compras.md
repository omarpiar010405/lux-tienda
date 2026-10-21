# 01 · Catálogo, compras e inventario

## Requisitos

### Categorías
- **R-CAT-01** El dueño crea, renombra y borra (si no tiene productos) categorías desde el panel. Cada categoría define de 1 a 2 atributos de variante. Los atributos no se editan después de creada la categoría.
- **R-CAT-02** Categorías iniciales: Camisas, Playeras, Polos, Suéteres, Sudaderas, Chamarras y rompevientos, Chalecos, Conjuntos, Pantalones (talla); Jerseys (talla + equipo); Gorras (color); Fragancias (ml); Termos (capacidad + color).

### Productos y variantes
- **R-CAT-03** Un producto tiene categoría, sección (hombre/mujer/unisex/no aplica), marca opcional, nombre, descripción opcional, fotos y estado visible/oculto. La categoría no se cambia.
- **R-CAT-04** Las fotos se reducen automáticamente (máx. 1600 px, JPEG) antes de subirse. Si el alta falla, las fotos subidas se eliminan.
- **R-CAT-05** Una variante es única por producto según sus atributos. Tiene precio propio, existencias, código de barras y estado visible/oculto.
- **R-CAT-06** Código de barras: se genera automático (`B` + 8 dígitos) al crear la variante. **El dueño puede editarlo** (por ejemplo, para usar el de fábrica de un perfume). Debe ser único y no puede estar vacío ni tener espacios en los extremos. La vendedora no puede editarlo.
- **R-CAT-07** El color de la ropa se escribe en el nombre del producto; la talla es la variante (ADR-004).

### Compras e inventario
- **R-COM-01** *Registrar compra*: fecha (por defecto, hoy en México), proveedor opcional, notas, y renglones con variante, piezas (> 0) y costo unitario (≥ 0). Puede actualizar el precio de venta.
- **R-COM-02** *Costo promedio ponderado*: nuevo = (existencias × promedio actual + piezas × costo) ÷ (existencias + piezas). Si no hay existencias o no hay historial, el costo promedio es el de la compra.
- **R-COM-03** *Producto nuevo + compra* en una sola operación atómica. Variantes con 0 piezas se crean sin costo.
- **R-COM-04** Una compra a producto existente puede agregar variantes que aún no existen.
- **R-COM-05** Las compras se listan por periodo, con detalle por renglón y exportación a CSV.
- **R-INV-01** *Ajuste de existencias*: el dueño indica la existencia real y un **motivo obligatorio**; se registra un movimiento de tipo `ajuste` con la diferencia.
- **R-INV-02** *Duplicar producto*: copia categoría, sección, marca, descripción, precio y variantes (con 0 piezas); no copia nombre ni fotos.
- **R-INV-03** Una variante sin compra registrada puede venderse; su costo queda en 0 y se marca “sin costo” (supuesto Q-04).

### Etiquetas
- **R-ETQ-01** El dueño genera un PDF de etiquetas con nombre, variante, precio y código de barras (Code 128), en hoja Carta de 3 × 10 (formato Avery 5160), con copias por variante (por defecto, las existencias) y posición inicial para reutilizar hojas usadas.

### Importación desde Excel (CSV)
- **R-IMP-01** *Compras*: se sube un CSV con la plantilla; la app muestra vista previa con errores por fila (fecha, categoría, atributos, piezas, costo, precio, duplicados) y solo importa tras confirmar. Acepta fechas `dd/mm/aaaa` y números en formato `1,234.50` o `1.234,50`.
- **R-IMP-02** *Ventas históricas*: cada fila crea una venta con su fecha, precio y costo propios, sin ligarla a la caja abierta. Requiere que el producto y la variante existan.
- **R-IMP-03** El archivo original nunca se modifica. La app advierte que importar dos veces duplica piezas.
- **R-IMP-04** La importación no adivina datos (C-15): una fila representa **una variante**; las filas con tallas agrupadas o sin desglose se corrigen antes.
- **R-PRV-01** Catálogo simple de proveedores (nombre, contacto, activo); sirve de sugerencia al registrar compras. El nombre se guarda como texto en la compra.

## Criterios de aceptación
- **Dado** 3 piezas a $215 y se compran 2 a $245, **cuando** se registra la compra, **entonces** el costo promedio es $227.00 y las existencias son 5.
- **Dado** una variante con 0 existencias, **cuando** se compran 4 a $300, **entonces** el costo promedio es $300.
- **Dado** un código de barras ya usado, **cuando** el dueño lo asigna a otra variante, **entonces** se rechaza con un mensaje claro.
- **Dado** una vendedora, **cuando** consulta `costos_variante`, `compras` o intenta `registrar_compra`, **entonces** no ve filas y la función falla.
- **Dado** un ajuste sin motivo, **entonces** no se aplica.
- **Dado** un CSV con una categoría inexistente, **cuando** se carga, **entonces** esa fila se marca con error y no se importa salvo que se elija “solo válidas” y aun así queda excluida.

## Implementado en
`supabase/migrations/0003…0004`, `src/lib/{calculos,importar,imagen,etiquetasPdf}.ts`, `src/components/{FormularioProducto,FormularioCompra,EditorProducto,CategoriasAdmin,GeneradorEtiquetas,Importador,ProveedoresAdmin}.tsx`, `src/app/admin/{productos,compras,categorias,etiquetas,importar,proveedores}/`.

## Pruebas
`supabase/tests/10_flujo_completo.sql` (costo promedio, códigos, ajustes, permisos), `src/lib/calculos.test.ts`, `src/lib/importar.test.ts`.
