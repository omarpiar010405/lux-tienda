export type Rol = "dueno" | "vendedora" | "cliente";
export type EstadoPedido = "nuevo" | "confirmado" | "enviado" | "entregado" | "cancelado";
export type EntregaPedido = "envio" | "recoger";
export type Canal = "mostrador" | "instagram" | "whatsapp" | "facebook" | "web" | "otro";
export type MetodoPago = "efectivo" | "tarjeta" | "transferencia";
export type Seccion = "hombre" | "mujer" | "unisex" | "na";
export type Opciones = Record<string, string>;

export type Categoria = { id: string; nombre: string; opciones: string[] };
export type Perfil = { id: string; nombre: string; rol: Rol; activo: boolean };

export type ResultadoBusqueda = {
  variante_id: string;
  producto_id: string;
  nombre: string;
  marca: string | null;
  categoria: string;
  opciones: Opciones;
  precio: number;
  stock: number;
  codigo_barras: string;
  foto: string | null;
};

export type ItemCarrito = {
  variante_id: string;
  nombre: string;
  marca: string | null;
  opciones: Opciones;
  precio: number;
  stock: number;
  cantidad: number;
  descuento: number;
};

export type TicketData = {
  folio: number;
  created_at: string;
  canal: Canal;
  cliente: string | null;
  total: number;
  estado: "completada" | "cancelada";
  pagos: { metodo: MetodoPago; monto: number }[];
  items: { cantidad: number; precio_unitario: number; descuento: number; nombre: string; detalle: string }[];
};

export type ResumenCaja = {
  id: string;
  abierto_at: string;
  cerrado_at: string | null;
  fondo_inicial: number;
  efectivo_contado: number | null;
  notas: string | null;
  num_ventas: number;
  total_ventas: number;
  efectivo: number;
  tarjeta: number;
  transferencia: number;
  efectivo_esperado: number;
  diferencia: number | null;
};

export type Direccion = {
  id: string;
  alias: string | null;
  nombre: string;
  apellidos: string | null;
  telefono: string;
  calle: string;
  interior: string | null;
  colonia: string;
  ciudad: string;
  estado: string;
  cp: string;
  referencias: string | null;
  es_principal: boolean;
};

export type Cliente = {
  id: string;
  nombre: string;
  apellidos: string | null;
  email: string | null;
  telefono: string | null;
  acepta_novedades: boolean;
};
