import { z } from 'zod';
import { BOOL_QUERY, ID_QUERY, paginacion } from '../../shared/validaciones.js';

// Un curso se asigna a una o varias sedes (ORE/SARE) o, de forma general, a todo el personal activo (RF06)
export const crearAsignacionSchema = z.object({
  idCurso: z.number().int().positive(),
  esGeneral: z.boolean().default(false),
  idSedes: z.array(z.number().int().positive()).max(200).default([]),
  enviarCorreo: z.boolean().default(false),
}).refine((a) => a.esGeneral !== (a.idSedes.length > 0), {
  message: 'Elige al menos una sede o marca la asignación como general (no ambas)', path: ['idSedes'],
});
export const estadoAsignacionSchema = z.object({ activo: z.boolean() });
export const listarAsignacionesSchema = z.object({
  buscar: z.string().trim().optional(),
  idCurso: ID_QUERY,
  idSede: ID_QUERY,
  anio: z.coerce.number().int().optional(),
  trimestre: z.coerce.number().int().min(1).max(4).optional(),
  activo: BOOL_QUERY,
  ...paginacion,
});

export type CrearAsignacion = z.infer<typeof crearAsignacionSchema>;
export type ListarAsignaciones = z.infer<typeof listarAsignacionesSchema>;
