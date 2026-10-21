"""Servidor de ejemplo que imita lo mínimo de Supabase (catálogo público + populares) para probar la tienda
en un navegador sin proyecto real. Solo para desarrollo: python3 scripts/e2e/mock_server.py"""
import io, json, re, uuid, urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

NS = uuid.UUID("12345678-1234-5678-1234-567812345678")
def pid(n): return str(uuid.uuid5(NS, f"p{n}"))
def vid(n, k): return str(uuid.uuid5(NS, f"v{n}-{k}"))
BASE = "http://127.0.0.1:54321/img"

P = [  # n, nombre, marca, categoria, seccion, desc, variantes[(opciones, precio, stock)]
 (1, "Playera Premium cuello redondo negra", "Boss", "Playeras", "hombre", "Algodón premium de corte clásico.", [({"talla":"CH"},520,3),({"talla":"M"},520,4),({"talla":"G"},520,0)]),
 (2, "Camisa manga larga azul", "Maja", "Camisas", "hombre", "Camisa formal de algodón.", [({"talla":"CH"},590,2),({"talla":"M"},590,1),({"talla":"G"},590,5)]),
 (3, "Suéter azul marino liso", "Kia2", "Suéteres", "hombre", "Suave y cálido.", [({"talla":"M"},690,2),({"talla":"G"},690,1)]),
 (4, "Gorra NY negra", None, "Gorras", "unisex", None, [({"color":"negro"},350,6)]),
 (5, "Le Labo Santal 33", None, "Fragancias", "unisex", "Notas amaderadas y cuero.", [({"ml":"50"},600,1),({"ml":"100"},900,2)]),
 (6, "212 VIP Black", "Carolina Herrera", "Fragancias", "hombre", "Intenso y seductor.", [({"ml":"100"},1100,3)]),
 (7, "Termo Gliter 32 oz", "Owala", "Termos", "unisex", "945 ml, acero inoxidable.", [({"capacidad":"32 oz","color":"Gliter"},650,2),({"capacidad":"32 oz","color":"Verde"},650,1)]),
 (8, "Jersey de futbol nueva temporada", None, "Jerseys", "unisex", None, [({"talla":"M","equipo":"Barcelona"},450,2),({"talla":"G","equipo":"Real Madrid"},450,2)]),
 (9, "Pantalón de mezclilla", None, "Pantalones", "hombre", None, [({"talla":"30"},620,2),({"talla":"32"},620,3),({"talla":"34"},620,1)]),
 (10, "Conjunto sport", None, "Conjuntos", "mujer", "Cómodo y elegante.", [({"talla":"Unitalla"},780,1)]),
 (11, "Rompevientos negro", "Maja", "Chamarras y rompevientos", "hombre", None, [({"talla":"M"},720,2),({"talla":"G"},720,2)]),
 (12, "Playera gris con brillos", None, "Playeras", "mujer", None, [({"talla":"CH"},430,0)]),
]
FILAS = []
for n, nombre, marca, cat, sec, desc, vs in P:
    for k, (op, precio, stock) in enumerate(vs):
        FILAS.append({"variante_id": vid(n,k), "producto_id": pid(n), "nombre": nombre, "descripcion": desc, "categoria": cat,
            "opciones": op, "precio": precio, "stock": stock, "disponible": stock > 0,
            "fotos": [f"{BASE}/{n}a.jpg", f"{BASE}/{n}b.jpg"], "marca": marca, "seccion": sec})
POP = [1,5,4,2,6,3,7,8]

DUENO = "11111111-1111-1111-1111-111111111111"
PERFILES = [
    {"id": DUENO, "nombre": "Dueña LUX", "rol": "dueno", "activo": True},
    {"id": "22222222-2222-2222-2222-222222222222", "nombre": "Ana (vendedora)", "rol": "vendedora", "activo": True},
]
PEDIDOS = [
    {"id": str(uuid.uuid5(NS, "ped1")), "numero": 1003, "estado": "nuevo", "entrega": "envio", "metodo_pago": "transferencia", "pedido_comprobantes": [{"count": 2}], "total": 1940, "contacto_nombre": "Marta Ruiz", "contacto_telefono": "5522223333", "created_at": "2026-10-20T15:20:00Z"},
    {"id": str(uuid.uuid5(NS, "ped2")), "numero": 1002, "estado": "nuevo", "entrega": "envio", "metodo_pago": "transferencia", "pedido_comprobantes": [{"count": 0}], "total": 520, "contacto_nombre": "Luis Pérez", "contacto_telefono": "5511112222", "created_at": "2026-10-20T12:05:00Z"},
    {"id": str(uuid.uuid5(NS, "ped3")), "numero": 1001, "estado": "confirmado", "entrega": "recoger", "metodo_pago": "efectivo", "pedido_comprobantes": [{"count": 0}], "total": 900, "contacto_nombre": "Ana López", "contacto_telefono": "5544445555", "created_at": "2026-10-19T18:40:00Z"},
]
RESUMEN = [{"num_ventas": 14, "piezas": 21, "ventas": 12480, "costo_vendido": 6120, "utilidad_bruta": 6360, "inversion": 9800, "gastos_subtotal": 2500, "gastos_iva": 400, "gastos_total": 2900, "ganancia_neta": 3460}]
CATS = [{"categoria": "Playeras", "piezas": 9, "ventas": 4680, "costo": 2150, "utilidad_bruta": 2530, "inversion": 3000, "ganancia_neta": 1350}, {"categoria": "Fragancias", "piezas": 5, "ventas": 5400, "costo": 2500, "utilidad_bruta": 2900, "inversion": 4500, "ganancia_neta": 1550}]

def jwt_falso():
    import base64, time
    b = lambda d: base64.urlsafe_b64encode(json.dumps(d).encode()).rstrip(b"=").decode()
    return f"{b({'alg':'HS256','typ':'JWT'})}.{b({'sub': DUENO, 'role': 'authenticated', 'exp': int(time.time()) + 36000})}.firma"

PALETAS = [("#161616","#3a3a3a"),("#d9cdb8","#a89a80"),("#1f2a44","#3d4f7a"),("#222222","#555555"),("#0e0e0e","#2a2a2a"),("#e9e3d6","#bdb199"),("#2d4a3e","#58806e"),("#6b1d2a","#a13b4c"),("#2a2a2a","#4d4d4d"),("#c9b8a6","#8f7d68"),("#101820","#324255"),("#cfcfcf","#9a9a9a")]
def imagen(nombre):
    from PIL import Image, ImageDraw
    m = re.match(r"(\d+)([ab])\.jpg", nombre); n = int(m.group(1)) if m else 1; inv = bool(m and m.group(2) == "b")
    c1, c2 = PALETAS[(n - 1) % len(PALETAS)]
    img = Image.new("RGB", (800, 1000), c1); d = ImageDraw.Draw(img)
    for y in range(1000):
        t = 1 - y / 1000 if inv else y / 1000
        d.line([(0, y), (800, y)], fill=tuple(int(int(c1[i:i+2], 16) * (1 - t) + int(c2[i:i+2], 16) * t) for i in (1, 3, 5)))
    d.ellipse([200, 180, 600, 580], outline="#c8a24a", width=3); d.rectangle([260, 560, 540, 900], outline="#c8a24a", width=3)
    d.text((60, 930), f"Foto de ejemplo {n}", fill="#e8d5a3")
    buf = io.BytesIO(); img.save(buf, "JPEG", quality=80); return buf.getvalue()

class H(BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,HEAD,OPTIONS"); self.send_header("Access-Control-Expose-Headers", "Content-Range")
    def do_OPTIONS(self):
        self.send_response(204); self.cors(); self.end_headers()
    def json(self, data, code=200):
        b = json.dumps(data).encode()
        self.send_response(code); self.cors(); self.send_header("Content-Type","application/json"); self.send_header("Content-Length", str(len(b))); self.end_headers(); self.wfile.write(b)
    def do_GET(self):
        u = urllib.parse.urlparse(self.path); q = urllib.parse.parse_qs(u.query)
        if u.path.startswith("/img/"):
            b = imagen(u.path.split("/")[-1])
            self.send_response(200); self.cors(); self.send_header("Content-Type","image/jpeg"); self.send_header("Content-Length", str(len(b))); self.end_headers(); return self.wfile.write(b)
        if u.path == "/rest/v1/catalogo_publico":
            rows = FILAS
            f = q.get("variante_id", [""])[0]
            m = re.match(r"in\.\((.*)\)", f)
            if m: ids = set(m.group(1).replace('"','').split(",")); rows = [r for r in rows if r["variante_id"] in ids]
            return self.json(rows)
        if u.path.startswith("/auth/v1/user"):
            if "Bearer" in (self.headers.get("Authorization") or "") and "firma" in (self.headers.get("Authorization") or ""):
                return self.json({"id": DUENO, "email": "duena@lux.mx", "aud": "authenticated", "role": "authenticated", "app_metadata": {}, "user_metadata": {}, "created_at": "2026-01-01T00:00:00Z"})
            return self.json({"msg": "no session"}, 401)
        if u.path == "/rest/v1/profiles":
            rows = PERFILES
            ident = q.get("id", [""])[0]
            if ident.startswith("eq."): rows = [r for r in PERFILES if r["id"] == ident[3:]]
            if "vnd.pgrst.object" in (self.headers.get("Accept") or ""): return self.json(rows[0] if rows else None, 200 if rows else 406)
            return self.json(rows)
        if u.path == "/rest/v1/pedidos":
            rows = PEDIDOS
            est = q.get("estado", [""])[0]
            if est.startswith("eq."): rows = [r for r in rows if r["estado"] == est[3:]]
            return self.json(rows)
        return self.json([])
    def do_HEAD(self):
        u = urllib.parse.urlparse(self.path); q = urllib.parse.parse_qs(u.query)
        n = sum(1 for r in PEDIDOS if r["estado"] == "nuevo") if u.path == "/rest/v1/pedidos" else 0
        self.send_response(200); self.cors(); self.send_header("Content-Range", f"0-{max(n-1,0)}/{n}"); self.send_header("Content-Length", "0"); self.end_headers()
    def do_POST(self):
        u = urllib.parse.urlparse(self.path)
        n = int(self.headers.get("Content-Length", 0)); self.rfile.read(n)
        if u.path == "/rest/v1/rpc/productos_populares": return self.json([{"producto_id": pid(x)} for x in POP])
        if u.path == "/rest/v1/rpc/panel_resumen": return self.json(RESUMEN)
        if u.path == "/rest/v1/rpc/panel_por_categoria": return self.json(CATS)
        return self.json([])
ThreadingHTTPServer(("127.0.0.1", 54321), H).serve_forever()
