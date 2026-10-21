const LETRAS = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789"; // sin caracteres que se confunden (0/O, 1/l/I)

/** Contraseña aleatoria legible (12 caracteres, sin símbolos raros). Solo en el navegador. */
export function generarContrasena(largo = 12): string {
  const bytes = new Uint32Array(largo);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => LETRAS[b % LETRAS.length]).join("");
}

export function contrasenaValida(s: string): boolean {
  return s.length >= 8;
}
