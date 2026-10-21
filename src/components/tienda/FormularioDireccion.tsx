"use client";

import { useState } from "react";
import { DIRECCION_VACIA, ESTADOS_MX, validarDireccion, type DireccionForm } from "@/lib/clientes";
import { t } from "@/lib/ui";
import { Aviso } from "@/components/Kit";

/** Formulario de dirección de envío (estilo Shopify). `alGuardar` devuelve un mensaje de error o null si todo salió bien. */
export function FormularioDireccion({
  inicial, textoBoton = "Guardar dirección", mostrarPrincipal = true, alGuardar, alCancelar,
}: {
  inicial?: Partial<DireccionForm>;
  textoBoton?: string;
  mostrarPrincipal?: boolean;
  alGuardar: (d: DireccionForm) => Promise<string | null>;
  alCancelar?: () => void;
}) {
  const [f, setF] = useState<DireccionForm>({ ...DIRECCION_VACIA, ...inicial });
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const set = <K extends keyof DireccionForm>(k: K, v: DireccionForm[K]) => setF((x) => ({ ...x, [k]: v }));

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    setError(null);
    const r = validarDireccion(f);
    if (!r.ok) return setErrores(r.errores);
    setErrores({});
    setGuardando(true);
    const msg = await alGuardar(r.datos);
    setGuardando(false);
    if (msg) setError(msg);
  }

  const texto = (k: keyof DireccionForm, etiqueta: string, opts: { auto?: string; tipo?: string; requerido?: boolean } = {}) => (
    <div>
      <label htmlFor={`dir-${k}`} className={t.etiqueta}>{etiqueta}{opts.requerido === false ? " (opcional)" : ""}</label>
      <input id={`dir-${k}`} type={opts.tipo ?? "text"} autoComplete={opts.auto} value={String(f[k])} onChange={(e) => set(k, e.target.value as never)}
        className={t.input} aria-invalid={!!errores[k]} aria-describedby={errores[k] ? `dir-${k}-err` : undefined} />
      {errores[k] && <p id={`dir-${k}-err`} className="mt-1 text-sm text-red-700">{errores[k]}</p>}
    </div>
  );

  return (
    <form onSubmit={enviar} noValidate className="space-y-4">
      <div>
        <label htmlFor="dir-pais" className={t.etiqueta}>País</label>
        <input id="dir-pais" value="México" disabled className={`${t.input} bg-neutral-100 text-neutral-600`} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {texto("nombre", "Nombre de quien recibe", { auto: "given-name" })}
        {texto("apellidos", "Apellidos", { auto: "family-name", requerido: false })}
      </div>
      {texto("telefono", "Teléfono (10 dígitos)", { auto: "tel", tipo: "tel" })}
      {texto("calle", "Calle y número", { auto: "address-line1" })}
      <div className="grid gap-4 sm:grid-cols-2">
        {texto("interior", "Interior, departamento, etc.", { auto: "address-line2", requerido: false })}
        {texto("colonia", "Colonia", { auto: "address-level3" })}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {texto("ciudad", "Ciudad o municipio", { auto: "address-level2" })}
        <div>
          <label htmlFor="dir-estado" className={t.etiqueta}>Estado</label>
          <select id="dir-estado" value={f.estado} onChange={(e) => set("estado", e.target.value)} className={t.input} autoComplete="address-level1" aria-invalid={!!errores.estado}>
            <option value="">Elige…</option>
            {ESTADOS_MX.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
          {errores.estado && <p className="mt-1 text-sm text-red-700">{errores.estado}</p>}
        </div>
        {texto("cp", "Código postal", { auto: "postal-code" })}
      </div>
      <div>
        <label htmlFor="dir-referencias" className={t.etiqueta}>Referencias (opcional)</label>
        <textarea id="dir-referencias" rows={2} value={f.referencias} onChange={(e) => set("referencias", e.target.value)} className={t.input} placeholder="Entre calles, color de la casa, etc." />
      </div>
      {texto("alias", "Nombre para guardarla (ej. Casa, Trabajo)", { requerido: false })}
      {mostrarPrincipal && (
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.es_principal} onChange={(e) => set("es_principal", e.target.checked)} /> Usar como mi dirección principal</label>
      )}
      {error && <Aviso>{error}</Aviso>}
      <div className="flex flex-wrap gap-3">
        <button disabled={guardando} className={t.btnNegro}>{guardando ? "Guardando…" : textoBoton}</button>
        {alCancelar && <button type="button" onClick={alCancelar} className={t.btnLinea}>Cancelar</button>}
      </div>
    </form>
  );
}
