"""Prueba de la tienda en un navegador real (Playwright) contra mock_server.py. Ver scripts/e2e/run.sh."""
import json, os, uuid
from playwright.sync_api import sync_playwright
NS = uuid.UUID("12345678-1234-5678-1234-567812345678")
pid = lambda n: str(uuid.uuid5(NS, f"p{n}"))
B = "http://localhost:3111"
OUT = os.environ.get("E2E_OUT", "/tmp")
errores, resultados = [], []
def ok(nombre, cond): resultados.append((nombre, bool(cond))); print(("OK   " if cond else "FALLA"), nombre)

with sync_playwright() as p:
    br = p.chromium.launch()
    ctx = br.new_context(viewport={"width":1440,"height":900})
    pg = ctx.new_page()
    pg.on("console", lambda m: errores.append(m.text) if m.type == "error" else None)
    pg.on("pageerror", lambda e: errores.append(str(e)))

    pg.goto(B+f"/producto/{pid(1)}", wait_until="networkidle")
    # sin elegir talla: avisa
    pg.click("text=Agregar al carrito"); pg.wait_for_timeout(200)
    ok("pide elegir una opción antes de agregar", pg.locator("text=Elige una opción para continuar").count() == 1)
    # talla agotada deshabilitada
    ok("talla agotada está deshabilitada", pg.locator("button:has-text('Talla G')").is_disabled())
    pg.click("button:has-text('Talla M')")
    pg.click("button[aria-label='Más']"); pg.click("button[aria-label='Más']")
    pg.click("text=Agregar al carrito"); pg.wait_for_timeout(300)
    ok("aparece el aviso 'Agregado a tu carrito'", pg.locator("text=Agregado a tu carrito").count() == 1)
    ok("el contador del carrito muestra 3", pg.locator("a[aria-label^='Carrito'] span").inner_text() == "3")
    guardado = json.loads(pg.evaluate("localStorage.getItem('lux-carrito-v1')"))
    ok("el carrito se guarda en el navegador (3 piezas)", sum(l["cantidad"] for l in guardado) == 3)
    # no deja pasar del stock (M tiene 4)
    pg.click("button[aria-label='Más']"); pg.click("button[aria-label='Más']"); pg.click("button[aria-label='Más']")
    pg.click("text=Agregar al carrito"); pg.wait_for_timeout(200)
    guardado = json.loads(pg.evaluate("localStorage.getItem('lux-carrito-v1')"))
    ok("no se pasa de las existencias (tope 4)", guardado[0]["cantidad"] == 4)

    # el carrito se conserva al recargar y muestra datos actuales
    pg.goto(B+"/carrito", wait_until="networkidle"); pg.wait_for_timeout(500)
    ok("el carrito muestra el producto y su total", pg.locator("text=Playera Premium cuello redondo negra").count() >= 1 and pg.locator("text=$2,080.00").count() >= 1)
    pg.click("button[aria-label^='Menos Playera']"); pg.wait_for_timeout(200)
    ok("cambiar cantidad actualiza el total", pg.locator("text=$1,560.00").count() >= 1)
    ok("hay botón de pedir por WhatsApp con el mensaje del pedido", "wa.me/5215512345678" in (pg.locator("a:has-text('Pedir todo por WhatsApp')").get_attribute("href") or ""))
    href = pg.locator("a:has-text('Pedir todo por WhatsApp')").get_attribute("href")
    ok("el mensaje incluye producto y total", "Playera" in href and "Total" in href)
    pg.click("text=Finalizar pedido"); pg.wait_for_url("**/login**"); 
    ok("finalizar sin sesión manda a iniciar sesión recordando /checkout", "next=%2Fcheckout" in pg.url)
    for ruta in ["/admin", "/pos", "/cuenta", "/cuenta/pedidos"]:
        pg.goto(B+ruta, wait_until="networkidle")
        ok(f"{ruta} sin sesión redirige a /login", "/login" in pg.url)

    # registro: validaciones
    pg.goto(B+"/registro", wait_until="networkidle")
    pg.click("button:has-text('Crear cuenta')"); pg.wait_for_timeout(200)
    for msg in ["Escribe tu nombre", "Escribe un correo válido", "Escribe un teléfono de 10 dígitos", "al menos 8 caracteres", "aviso de privacidad"]:
        ok(f"registro valida: {msg}", pg.locator(f"text={msg}").count() >= 1)

    # tienda: filtros y búsqueda
    pg.goto(B+"/tienda?categoria=Fragancias", wait_until="networkidle")
    ok("filtro por categoría muestra solo fragancias (2)", pg.locator("a[href^='/producto/']").count() == 2)
    pg.goto(B+"/tienda?q=jersey", wait_until="networkidle")
    ok("búsqueda por texto encuentra el jersey", pg.locator("a[href^='/producto/']").count() == 1)
    pg.goto(B+"/tienda?orden=precio-desc", wait_until="networkidle")
    precios = [t for t in pg.locator("a[href^='/producto/'] p").all_inner_texts() if t.startswith("$") or t.startswith("Desde")]
    ok("orden por mayor precio: primero el más caro", precios[0].replace("Desde ", "") == "$1,100.00")
    pg.goto(B+"/producto/00000000-0000-0000-0000-000000000000", wait_until="networkidle")
    ok("producto inexistente muestra 404", pg.locator("text=404").count() >= 1 or pg.locator("text=could not be found").count() >= 1)

    # ---- panel del dueño (sesión simulada) ----
    import base64, time
    def sesion(jwt):
        datos = {"access_token": jwt, "token_type": "bearer", "expires_in": 36000, "expires_at": int(time.time()) + 36000, "refresh_token": "x",
                 "user": {"id": "11111111-1111-1111-1111-111111111111", "email": "duena@lux.mx", "aud": "authenticated", "role": "authenticated"}}
        return "base64-" + base64.urlsafe_b64encode(json.dumps(datos).encode()).rstrip(b"=").decode()
    def jwt():
        b = lambda d: base64.urlsafe_b64encode(json.dumps(d).encode()).rstrip(b"=").decode()
        return f"{b({'alg':'HS256','typ':'JWT'})}.{b({'sub':'11111111-1111-1111-1111-111111111111','role':'authenticated','exp':int(time.time())+36000})}.firma"
    cd = br.new_context(viewport={"width":1440,"height":900})
    cd.add_cookies([{"name": "sb-127-auth-token", "value": sesion(jwt()), "domain": "localhost", "path": "/"}])
    a = cd.new_page(); a.on("pageerror", lambda e: errores.append(str(e)))
    a.goto(B+"/admin/pedidos", wait_until="networkidle")
    ok("el panel usa barra lateral fija a la izquierda", a.locator("aside[aria-label='Navegación del panel']").bounding_box()["x"] == 0)
    ok("la barra lateral agrupa los enlaces por secciones", all(a.locator(f"aside >> text={s}").count() >= 1 for s in ["Ventas", "Catálogo", "Finanzas", "Personas"]))
    ok("el enlace de la página actual queda marcado", a.locator("aside a[aria-current='page']").inner_text().startswith("Pedidos"))
    ok("todos los enlaces del panel se ven sin desplazarse (pantalla de 900 px)", a.evaluate("""() => { const n = document.querySelector("aside nav"); return n.scrollHeight <= n.clientHeight + 1; }"""))
    ok("el enlace Personal es visible", a.locator("aside a:has-text('Personal')").is_visible())
    ok("el contador muestra los pedidos nuevos", a.locator("aside a:has-text('Pedidos') span[aria-label$='nuevos']").inner_text() == "2")
    ok("la lista de pedidos marca 'Sin comprobante' y 'Comprobante'", a.locator("text=Sin comprobante").count() == 1 and a.locator("text=Comprobante").count() >= 1)
    a.screenshot(path=f"{OUT}/shot_admin_pedidos.png")
    a.goto(B+"/admin", wait_until="networkidle")
    ok("el resumen se ve con la barra lateral", a.locator("text=Ganancia neta").count() >= 1)
    a.screenshot(path=f"{OUT}/shot_admin.png")
    for ruta, texto in [("/admin/usuarios", "Alta de empleado"), ("/admin/clientes", "Clientes")]:
        a.goto(B+ruta, wait_until="networkidle")
        ok(f"{ruta} carga con la barra lateral", a.locator("aside").count() == 1 and (a.locator(f"text={texto}").count() >= 1))
    a.goto(B+"/admin/usuarios", wait_until="networkidle"); a.click("text=+ Alta de empleado"); a.wait_for_timeout(200)
    a.click("button:has-text('Generar')")
    ok("el generador llena una contraseña de 12 caracteres", len(a.locator("input.font-mono").input_value()) == 12)
    a.click("button:has-text('Dar de alta')"); a.wait_for_timeout(200)
    ok("el alta valida el nombre antes de crear la cuenta", a.locator("text=Escribe el nombre del empleado").count() == 1)
    a.screenshot(path=f"{OUT}/shot_admin_alta.png")
    cm = br.new_context(viewport={"width":390,"height":844}, is_mobile=True, has_touch=True)
    cm.add_cookies([{"name": "sb-127-auth-token", "value": sesion(jwt()), "domain": "localhost", "path": "/"}])
    am = cm.new_page(); am.goto(B+"/admin/pedidos", wait_until="networkidle")
    ok("en celular la barra lateral está oculta y hay botón de menú", am.locator("button[aria-label='Abrir menú del panel']").is_visible() and am.locator("aside").bounding_box()["x"] < 0)
    am.click("button[aria-label='Abrir menú del panel']"); am.wait_for_timeout(300)
    ok("el menú lateral se despliega en celular", am.locator("aside").bounding_box()["x"] == 0)
    ok("en celular también caben todos los enlaces del panel", am.evaluate("""() => { const n = document.querySelector("aside nav"); return n.scrollHeight <= n.clientHeight + 1; }"""))
    am.screenshot(path=f"{OUT}/shot_admin_m_menu.png")
    am.click("aside a:has-text('Productos')"); am.wait_for_timeout(500)
    ok("al navegar, el menú se cierra solo", am.locator("aside").bounding_box()["x"] < 0)
    ok("sin desbordamiento horizontal en el panel (celular)", am.evaluate("document.documentElement.scrollWidth <= window.innerWidth"))

    # menú móvil
    ctx2 = br.new_context(viewport={"width":390,"height":844}, is_mobile=True, has_touch=True)
    m = ctx2.new_page(); m.goto(B+"/", wait_until="networkidle")
    m.click("button[aria-label='Abrir menú']"); m.wait_for_timeout(200)
    ok("el menú móvil abre con enlaces", m.locator("[role=dialog] a:has-text('Tienda')").count() == 1)
    m.screenshot(path=f"{OUT}/shot_m_menu.png")
    m.click("button[aria-label='Cerrar menú']")
    ok("el menú móvil cierra", m.locator("[role=dialog]").count() == 0)
    ancho = m.evaluate("document.documentElement.scrollWidth <= window.innerWidth")
    ok("sin desbordamiento horizontal en celular", ancho)

    # capturas finales
    pg.goto(B+"/", wait_until="networkidle"); pg.wait_for_timeout(300); pg.screenshot(path=f"{OUT}/shot_home.png", full_page=True)
    m.goto(B+"/", wait_until="networkidle"); m.wait_for_timeout(300); m.screenshot(path=f"{OUT}/shot_m_home.png", full_page=True)
    br.close()

ignora = ("401", "Failed to load resource")
errs = [e for e in errores if not any(i in e for i in ignora)]
print("\nErrores de consola relevantes:", errs if errs else "ninguno")
print(f"\n{sum(1 for _, c in resultados if c)}/{len(resultados)} comprobaciones correctas")

raise SystemExit(0 if all(c for _, c in resultados) and not errs else 1)
