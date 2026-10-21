type P = { className?: string };
const base = { fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, viewBox: "0 0 24 24", "aria-hidden": true };

export const IconoBolsa = ({ className = "w-6 h-6" }: P) => (
  <svg {...base} className={className}><path d="M5 8h14l-1 12H6L5 8Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></svg>
);
export const IconoUsuario = ({ className = "w-6 h-6" }: P) => (
  <svg {...base} className={className}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" /></svg>
);
export const IconoLupa = ({ className = "w-6 h-6" }: P) => (
  <svg {...base} className={className}><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></svg>
);
export const IconoMenu = ({ className = "w-6 h-6" }: P) => (
  <svg {...base} className={className}><path d="M4 7h16M4 12h16M4 17h16" /></svg>
);
export const IconoCerrar = ({ className = "w-6 h-6" }: P) => (
  <svg {...base} className={className}><path d="m6 6 12 12M18 6 6 18" /></svg>
);
export const IconoInstagram = ({ className = "w-5 h-5" }: P) => (
  <svg {...base} className={className}><rect x="3.5" y="3.5" width="17" height="17" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17" cy="7" r="0.6" fill="currentColor" /></svg>
);
export const IconoWhatsApp = ({ className = "w-5 h-5" }: P) => (
  <svg {...base} className={className}><path d="M4 20l1.3-4.2A8 8 0 1 1 8.4 19L4 20Z" /><path d="M9 9c0 3 3 6 6 6l1.2-1.4-2-1-.9.8c-1-.4-2-1.4-2.4-2.4l.8-.9-1-2L9 9Z" /></svg>
);
export const IconoEstrella = ({ className = "w-4 h-4" }: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden><path d="m12 2 2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.3 5.8 20.9l1.6-7L2 9.2l7.1-.6L12 2Z" /></svg>
);
