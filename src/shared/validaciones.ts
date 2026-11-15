import { z } from 'zod';

export const CURP = z.string().trim().toUpperCase()
  .regex(/^[A-Z][AEIOUX][A-Z]{2}\d{6}[HM][A-Z]{5}[A-Z\d]\d$/, 'CURP inválida');
export const CUPO = z.string().regex(/^\d{6}$/, 'La CUPO debe tener 6 dígitos');
export const TELEFONO = z.string().regex(/^\d{10}$/, 'El teléfono debe tener 10 dígitos');
export const idParam = z.object({ id: z.coerce.number().int().positive() });
