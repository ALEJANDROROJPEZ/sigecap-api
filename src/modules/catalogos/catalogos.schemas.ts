import { z } from 'zod';

export const sedeSchema = z.object({
  clave: z.string().trim().toUpperCase().min(2).max(20),
  nombre: z.string().trim().min(2).max(120),
  tipo: z.enum(['ORE', 'SARE']),
});
export const areaSchema = z.object({ nombre: z.string().trim().min(2).max(120) });
export const dependenciaSchema = z.object({
  siglas: z.string().trim().toUpperCase().min(2).max(30),
  nombre: z.string().trim().min(2).max(200),
});
export const temaEticaSchema = z.object({
  codigo: z.string().trim().min(1).max(20),
  descripcion: z.string().trim().min(2).max(250),
});
