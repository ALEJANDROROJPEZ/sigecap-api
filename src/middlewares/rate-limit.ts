import { HttpError } from '../shared/http-error.js';

// Límite de intentos fallidos de inicio de sesión (en memoria): 5 en 15 minutos por IP + identificador
const MAX_INTENTOS = 5;
const VENTANA_MS = 15 * 60 * 1000;
const intentos = new Map<string, { n: number; desde: number }>();

export function verificarIntentos(clave: string) {
  const r = intentos.get(clave);
  if (!r) return;
  if (Date.now() - r.desde > VENTANA_MS) { intentos.delete(clave); return; }
  if (r.n >= MAX_INTENTOS) {
    const minutos = Math.ceil((VENTANA_MS - (Date.now() - r.desde)) / 60000);
    throw new HttpError(429, `Demasiados intentos fallidos. Intenta de nuevo en ${minutos} min.`);
  }
}

export function registrarFallo(clave: string) {
  const r = intentos.get(clave);
  if (!r || Date.now() - r.desde > VENTANA_MS) intentos.set(clave, { n: 1, desde: Date.now() });
  else r.n += 1;
}

export const limpiarIntentos = (clave: string) => { intentos.delete(clave); };

// Limpieza periódica para que el mapa no crezca sin límite
setInterval(() => {
  const ahora = Date.now();
  for (const [k, r] of intentos) if (ahora - r.desde > VENTANA_MS) intentos.delete(k);
}, VENTANA_MS).unref();
