# 04 · Catálogo público y PWA

> **Ampliada por [`06-tienda-en-linea.md`](06-tienda-en-linea.md):** el catálogo completo vive ahora en `/tienda`; la página de inicio (`/`) es la portada de marca con categorías y populares. Los requisitos de abajo siguen vigentes.

## Requisitos
- **R-WEB-01** La página de inicio (`/`) muestra el catálogo sin iniciar sesión: foto, nombre, marca y precio (o “Desde”), con etiqueta “Agotado” cuando no hay existencias. Los agotados van al final.
- **R-WEB-02** Filtros por sección y categoría, y búsqueda por texto. El mismo enlace sirve para la biografía de Instagram.
- **R-WEB-03** La página de un producto muestra fotos, descripción y variantes con disponibilidad (“últimas” con ≤ 2 piezas). El botón **Pedir por WhatsApp** abre el chat de la boutique (número en `NEXT_PUBLIC_WHATSAPP_NUMERO`) con un mensaje que incluye producto, variante, precio y enlace.
- **R-WEB-04** El catálogo no expone costos, códigos de barras, proveedores ni datos internos. Lee solo la vista `catalogo_publico`. Solo aparecen productos y variantes visibles.
- **R-WEB-05** *PWA*: instalable (manifiesto, íconos, service worker mínimo). La app instalada abre en `/login`, que redirige según el rol. **Sin modo offline** (fuera de alcance).

## Criterios de aceptación
- **Dado** un producto oculto, **entonces** no aparece en el catálogo ni en el POS.
- **Dado** una variante agotada, **entonces** no se puede elegir para pedir por WhatsApp.
- **Dado** que no hay número de WhatsApp configurado, **entonces** el botón se reemplaza por “Escríbenos para pedirlo”.
- **Dado** una persona sin sesión, **cuando** abre `/admin` o `/pos`, **entonces** se le redirige a `/login`.

## Implementado en
`src/app/page.tsx`, `src/app/producto/[id]/`, `src/components/PedirWhatsApp.tsx`, `src/lib/catalogo.ts`, `src/app/manifest.ts`, `public/sw.js`, `src/middleware.ts`.

## Pruebas
`src/lib/catalogo.test.ts`; vista pública en `supabase/tests/10_flujo_completo.sql`.
