# Preguntas abiertas y supuestos provisionales

| ID | Tema | Supuesto actual | Quién confirma |
|---|---|---|---|
| **Q-01** | **Cálculo de la Ganancia Neta** en la hoja RESUMEN del dueño. | `ganancia_neta = utilidad_bruta − gastos_total (con IVA)`. La inversión **no** se resta. Vive en `fn_ganancia_neta()`. | Dueño |
| **Q-02** | **Ganancia neta por categoría.** Los gastos no pertenecen a una categoría. | Se reparten en proporción a las ventas de cada categoría. | Dueño |
| **Q-03** | **IVA de los gastos.** | Se resta el total con IVA, porque sin facturar ventas se asume que ese IVA no se recupera. | Dueño / contador |
| **Q-04** | **Venta de una variante sin costo registrado.** | Se permite; el costo queda en 0 y se marca “sin costo” para corregirse con una compra. | Dueño |
| **Q-06** | **Color de la ropa.** | Va en el nombre del producto; la talla es la variante (ADR-004). Si piden talla × color, se cambia la categoría a dos atributos. | Dueño |
| **Q-07** | **Umbral de “stock bajo”.** | Fijo en 2 piezas. | Dueño |
| **Q-08** | **Pedidos como invitado** (sin crear cuenta). | No: se requiere cuenta; alternativa sin cuenta = pedir por WhatsApp. | Dueño |
| **Q-09** | **Costo de envío.** | Se acuerda por WhatsApp; el sistema no lo calcula. | Dueño |
| **Q-10** | **Aviso de privacidad** (LFPDPPP). | Borrador en `/privacidad` con datos del responsable por completar; debe revisarlo el dueño o un abogado. | Dueño / abogado |
| **Q-11** | **Instrucciones de pago** que ve la clienta tras pedir. | Texto en `NEXT_PUBLIC_INSTRUCCIONES_PAGO` (por ejemplo, datos para transferencia). | Dueño |
| **Q-12** | **Confirmación de correo** en Supabase. | **Decisión del dueño: desactivada** (Authentication → Sign In / Providers → Email → “Confirm email” apagado). Es un ajuste del panel de Supabase, no del código: el registro ya entra directo cuando está apagada. Riesgo: se pueden registrar correos falsos; el teléfono y la revisión del dueño al confirmar el pedido lo mitigan. | Dueño |
| **Q-13** | **Métodos de pago por tipo de entrega.** | Envío a domicilio solo por transferencia; efectivo y tarjeta solo al recoger en tienda. | Dueño |
| **Q-14** | **Recuperar contraseña olvidada** por correo. | No incluido; sí se puede cambiar la contraseña desde Mi cuenta. Para un olvido, el dueño la restablece en Supabase. | Dueño |
| **Q-15** | **Validación del comprobante.** | Manual: lo revisa el dueño antes de confirmar. | Dueño |
| **Q-16** | **Caja.** | Desactivada por ahora (ADR-017). | Dueño |
| **Q-17** | **Horario de la boutique** para recoger pedidos. | Lunes a viernes de 9:00 a 16:00 h; no se atiende el fin de semana. Texto configurable con `NEXT_PUBLIC_HORARIO_TIENDA` (spec 06 · R-PED-09). | Dueño |

Cuando se resuelva una pregunta, se actualiza la spec afectada y se elimina de esta tabla (la decisión queda en `decisions.md` si es de arquitectura).
