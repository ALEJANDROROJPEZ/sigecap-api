import { z } from 'zod';
import { CUPO, CURP, TELEFONO } from '../../shared/validaciones.js';

const base = z.object({
  cupo: CUPO,
  curp: CURP,
  numTrabajadorRusp: z.string().max(20).optional(),
  tipoContratacion: z.enum(['ESTRUCTURA', 'HONORARIOS']),
  nombre: z.string().trim().min(1).max(80),
  apellidoPaterno: z.string().trim().min(1).max(60),
  apellidoMaterno: z.string().trim().max(60).optional(),
  correoInstitucional: z.email().toLowerCase().optional(),
  correoRespaldo: z.email().toLowerCase().optional(),
  telefono: TELEFONO.optional(),
  puesto: z.string().trim().min(1).max(120),
  idArea: z.number().int().positive(),
  idSede: z.number().int().positive(),
});

// Si tiene correo institucional, el correo de respaldo y el teléfono son obligatorios
const reglaContacto = (e: { correoInstitucional?: string; correoRespaldo?: string; telefono?: string }) =>
  !e.correoInstitucional || (!!e.correoRespaldo && !!e.telefono);
const mensajeContacto = { message: 'Con correo institucional se requieren correo de respaldo y teléfono', path: ['correoRespaldo'] };

export const crearEmpleadoSchema = base.refine(reglaContacto, mensajeContacto);
export const actualizarEmpleadoSchema = base.partial().refine(reglaContacto, mensajeContacto);
export const listarEmpleadosSchema = z.object({
  buscar: z.string().trim().optional(),
  pagina: z.coerce.number().int().min(1).default(1),
  porPagina: z.coerce.number().int().min(1).max(100).default(20),
});
export type CrearEmpleado = z.infer<typeof crearEmpleadoSchema>;
export type ActualizarEmpleado = z.infer<typeof actualizarEmpleadoSchema>;
