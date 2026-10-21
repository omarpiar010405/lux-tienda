# LUX BOUTIQUE · tienda en línea, inventario y punto de venta

PWA hecha con **Next.js 15 + Supabase**. Una sola base para tres cosas: la **tienda pública** (catálogo, carrito, cuentas de clientes y pedidos), el **punto de venta** de mostrador y el **panel del dueño** (inventario, compras con costo promedio, gastos y utilidades).

> **Si eres una IA (o vas a usar una) lee primero [`AGENTS.md`](AGENTS.md) y [`specs/`](specs/README.md).** El proyecto se desarrolla con especificaciones; no se implementa nada que no esté ahí.

## Puesta en marcha

### 1. Requisitos
Node.js 20 o superior (`node -v`) y un proyecto de [Supabase](https://supabase.com).

### 2. Instalar
```bash
npm install
cp .env.local.example .env.local   # y llena las claves
```
Obligatorias: `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Supabase → Project Settings → API; usa la clave **anon/publishable**, nunca la `service_role`). Las demás (WhatsApp, Instagram, anuncio, dirección de la tienda, instrucciones de pago, datos del aviso de privacidad) son opcionales y están explicadas en el archivo.

### 3. Base de datos
En Supabase → **SQL Editor** ejecuta, **uno por uno y en orden**, los archivos de `supabase/migrations/` (`0001` … `0008`). **`0006` va solo, en su propia ejecución**, antes de `0007`.

> **Si ya tenías instaladas las versiones anteriores:** ejecuta solo lo que te falte, en orden (`0006` sola; luego `0007`; luego `0008`). La `0008` agrega el método de pago de los pedidos y crea el almacenamiento privado de comprobantes.

### ⚠ Seguridad: cuentas nuevas
Antes de la migración `0007`, cualquier cuenta nueva se creaba como **vendedora**. Si tu proyecto ya permitía registros (Supabase lo permite por defecto), revisa la lista **Panel → Personal** y **desactiva o quita el acceso** a quien no reconozcas. Desde `0007` toda cuenta nueva nace como **cliente** (sin ningún permiso del negocio); el personal se habilita desde el panel.

### 4. Tu usuario dueño
1. Supabase → **Authentication → Users → Add user** (correo y contraseña, marca *Auto confirm*), o regístrate en `/registro`.
2. En el SQL Editor:
   ```sql
   update profiles set rol = 'dueno' where id = '<uuid de tu usuario>';
   ```
3. **Empleados:** desde el panel, **Personal → Alta de empleado** (nombre, correo y contraseña temporal con generador). Quedan con acceso de vendedora al instante. También puedes promover a alguien ya registrado en **Clientes → Dar acceso como vendedora**.

### 5. Autenticación en Supabase
- **Desactiva la verificación de correo** (así las clientas y los empleados entran de inmediato): Supabase → **Authentication → Sign In / Providers → Email** → apaga **“Confirm email”**. Es un ajuste del panel de Supabase; no se puede cambiar desde el código. La app funciona con la verificación activa o apagada.
  *Consecuencia:* alguien podría registrarse con un correo que no es suyo. Para pedidos, el teléfono de contacto y tu revisión al confirmar el pago lo mitigan.
- Deja **habilitados los registros** (“Allow new users to sign up”): la tienda y el alta de empleados los usan.
- **Site URL** y **Redirect URLs**: pon el dominio donde publiques la tienda (y `http://localhost:3000` para pruebas).

### 6. Correr
```bash
npm run dev      # http://localhost:3000
```
| Ruta | Quién |
|---|---|
| `/` · `/tienda` · `/producto/…` · `/carrito` | Público |
| `/login` · `/registro` · `/privacidad` | Público |
| `/cuenta` · `/checkout` | Cliente con sesión |
| `/pos` | Vendedora y dueño (sin abrir caja por ahora) |
| `/admin` | Dueño |

## Antes de publicar
- [ ] Completa el **aviso de privacidad** (`NEXT_PUBLIC_RESPONSABLE_PRIVACIDAD`, `…DOMICILIO…`, `…CORREO…`) y que lo revise el dueño o un abogado.
- [ ] Pon el **WhatsApp** de la boutique y los **datos para transferencia** (`NEXT_PUBLIC_INSTRUCCIONES_PAGO`).
- [ ] Apaga **Confirm email** en Supabase (paso 5) y da de alta a tus empleados desde **Personal**.
- [ ] Sube fotos reales de los productos (se comprimen automáticamente).
- [ ] Revisa **Panel → Personal** y **Clientes** (ver aviso de seguridad).
- [ ] Prueba un pedido completo: registrarte, agregar al carrito, hacer el pedido y confirmarlo desde **Panel → Pedidos**.

## Cómo funciona un pedido
1. La clienta arma su carrito (sin cuenta) y pulsa **Finalizar pedido**; crea su cuenta o inicia sesión, elige **envío a domicilio** o **recoger en tienda** y su **método de pago**:
   - **Transferencia bancaria** (la única opción para envíos): ve tus datos de pago y puede **adjuntar su comprobante** (JPG, PNG, WEBP, HEIC o PDF, hasta 10 MB, máximo 5 archivos) al hacer el pedido o después, desde *Mis pedidos*.
   - **Efectivo o tarjeta al recoger** (solo al recoger en tienda).
   **No se cobra en línea.**
2. El dueño ve el pedido nuevo (contador en el menú lateral) con su método de pago y los comprobantes (miniaturas o PDF), revisa su banco, escribe a la clienta por WhatsApp si hace falta y pulsa **Confirmar y registrar venta**: se crea una venta del canal *web* con el método elegido, bajan las existencias y entra al panel de utilidades. Si es transferencia sin comprobante, el sistema pide confirmación extra.
3. Después marca **enviado** y **entregado**. Un pedido nuevo o confirmado se puede cancelar (si estaba confirmado, regresa el inventario).
Quien no quiera crear cuenta puede usar **Pedir todo por WhatsApp** desde el carrito.

## Venta en mostrador sin caja
Por ahora el punto de venta **no pide abrir caja**: se vende directo. El módulo de caja sigue en el código; para reactivarlo pon `NEXT_PUBLIC_USAR_CAJA=true` y vuelve a compilar.

## Contraseñas
Cualquier persona cambia la suya en **Mi cuenta**. El dueño no puede ver ni restablecer contraseñas de otros desde el panel; si alguien olvida la suya, restablécela en Supabase (Authentication → Users). El correo de “olvidé mi contraseña” no está incluido todavía (ver `specs/open-questions.md`, Q-14).

## Personalizar la marca
- Colores y tipografía: bloque `@theme` en `src/app/globals.css`.
- Nombre, lema y textos de la portada: `src/lib/marca.ts`.
- Logotipo: `src/components/tienda/Logo.tsx` (es texto; puedes cambiarlo por una imagen).
- Íconos de la app instalada: `public/icon-192.png`, `icon-512.png`, `apple-icon.png`.

## Comandos
| | |
|---|---|
| `npm run verify` | Tipos + lint + pruebas unitarias + compilación |
| `npm run test:db` | Prueba todas las migraciones y reglas de negocio contra PostgreSQL (necesita `psql` y un servidor local; ver `scripts/test-db.sh`) |
| `npm run test:e2e` | Prueba la tienda en un navegador real con datos de ejemplo (requiere `pip install playwright pillow` y `python3 -m playwright install chromium`) |
| `npm run dev` / `build` / `start` | Desarrollo, compilar, producción |

## Publicar
Cualquier hosting de Next.js sirve (por ejemplo Vercel): sube el repositorio y define las mismas variables de entorno (las `NEXT_PUBLIC_*` se incorporan al compilar). La cámara para escanear requiere HTTPS.

## Estructura
```
specs/                 Especificaciones (qué y por qué)  ← empieza aquí
supabase/migrations/   Esquema y funciones (inmutables)
supabase/tests/        Pruebas SQL de reglas de negocio
scripts/               test-db.sh y e2e/ (prueba en navegador)
src/lib/               Lógica pura con pruebas
src/app/(tienda)/      Tienda pública, cuenta del cliente, checkout
src/app/admin/         Panel del dueño
src/app/pos/           Punto de venta
src/components/        Componentes de cliente
AGENTS.md              Reglas para IAs
```

## Limitaciones conocidas
Sin cobro en línea, sin validación automática de comprobantes (los revisa el dueño), sin cálculo automático de envío, sin pedidos como invitado, sin “olvidé mi contraseña” por correo, sin modo offline, sin impresora de tickets, sin facturación, sin edición de gastos, umbral de stock bajo fijo. Ver `specs/05-fuera-de-alcance.md` y `specs/open-questions.md`.
