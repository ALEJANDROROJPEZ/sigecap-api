import { z } from 'zod';

export const CURP = z.string().trim().toUpperCase()
  .regex(/^[A-Z][AEIOUX][A-Z]{2}\d{6}[HM][A-Z]{5}[A-Z\d]\d$/, 'CURP inválida');
export const CUPO = z.string().trim().regex(/^\d{6}$/, 'La CUPO debe tener 6 dígitos');
export const TELEFONO = z.string().trim().regex(/^\d{10}$/, 'El teléfono debe tener 10 dígitos');
export const CONTRASENA = z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').max(72)
  .regex(/[A-Za-z]/, 'La contraseña debe incluir al menos una letra')
  .regex(/\d/, 'La contraseña debe incluir al menos un número');
export const idParam = z.object({ id: z.coerce.number().int().positive() });

// Fecha «AAAA-MM-DD» convertida a Date en UTC (las columnas son de tipo DATE)
export const FECHA = z.iso.date('Fecha inválida (AAAA-MM-DD)').transform((s) => new Date(`${s}T00:00:00.000Z`));

// Campo opcional que acepta '' o null para borrar el valor
export const opcional = <T extends z.ZodType>(tipo: T) =>
  z.preprocess((v) => (v === '' || v === undefined ? null : v), tipo.nullable());

// Parámetros de consulta
export const ID_QUERY = z.coerce.number().int().positive().optional();
export const BOOL_QUERY = z.enum(['true', 'false']).transform((v) => v === 'true').optional();
export const paginacion = {
  pagina: z.coerce.number().int().min(1).default(1),
  porPagina: z.coerce.number().int().min(1).max(200).default(20),
};
export const saltar = (pagina: number, porPagina: number) => ({ skip: (pagina - 1) * porPagina, take: porPagina });

export const hoyUTC = () => {
  const h = new Date();
  return new Date(Date.UTC(h.getFullYear(), h.getMonth(), h.getDate()));
};
export const fechaCorta = (d?: Date | null) =>
  d ? `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}` : '';
export const nombreCompleto = (e: { nombre: string; apellidoPaterno: string; apellidoMaterno?: string | null }) =>
  [e.nombre, e.apellidoPaterno, e.apellidoMaterno].filter(Boolean).join(' ');
// Fecha local «AAAA-MM-DD» (para nombres de archivo)
export const fechaLocalISO = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
