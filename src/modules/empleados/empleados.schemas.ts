import { z } from 'zod';
import { BOOL_QUERY, CUPO, CURP, ID_QUERY, TELEFONO, opcional, paginacion } from '../../shared/validaciones.js';

const TIPO = z.enum(['ESTRUCTURA', 'HONORARIOS']);

const base = z.object({
  cupo: CUPO,
  curp: CURP,
  numTrabajadorRusp: opcional(z.string().trim().max(20)),
  tipoContratacion: TIPO,
  nombre: z.string().trim().min(1).max(80),
  apellidoPaterno: z.string().trim().min(1).max(60),
  apellidoMaterno: opcional(z.string().trim().max(60)),
  correoInstitucional: opcional(z.email('Correo institucional inválido').toLowerCase().max(120)),
  correoRespaldo: opcional(z.email('Correo de respaldo inválido').toLowerCase().max(120)),
  telefono: opcional(TELEFONO),
  puesto: z.string().trim().min(1).max(120),
  idArea: z.number().int().positive(),
  idSede: z.number().int().positive(),
});

// Si tiene correo institucional, el correo de respaldo y el teléfono son obligatorios (RF17)
export const reglaContacto = (e: { correoInstitucional?: string | null; correoRespaldo?: string | null; telefono?: string | null }) =>
  !e.correoInstitucional || (!!e.correoRespaldo && !!e.telefono);
export const mensajeContacto = 'Con correo institucional se requieren correo de respaldo y teléfono';

export const crearEmpleadoSchema = base.refine(reglaContacto, { message: mensajeContacto, path: ['correoRespaldo'] });
// En la actualización la regla de contacto se revisa en el servicio, con los datos ya combinados
export const actualizarEmpleadoSchema = base.partial();
export const estadoSchema = z.object({ activo: z.boolean() });
export const listarEmpleadosSchema = z.object({
  buscar: z.string().trim().optional(),
  idSede: ID_QUERY,
  idArea: ID_QUERY,
  tipoContratacion: TIPO.optional(),
  activo: BOOL_QUERY,
  sinCuenta: BOOL_QUERY,
  ...paginacion,
});
export const importarSchema = z.object({ confirmar: BOOL_QUERY });

// Fila del archivo de Excel: el área y la sede llegan como texto
export const filaImportacionSchema = base.omit({ idArea: true, idSede: true }).extend({
  area: z.string().trim().min(1, 'Falta el área').max(120),
  sede: z.string().trim().min(1, 'Falta la sede').max(20),
}).refine(reglaContacto, { message: mensajeContacto, path: ['correoRespaldo'] });

export type CrearEmpleado = z.infer<typeof crearEmpleadoSchema>;
export type ActualizarEmpleado = z.infer<typeof actualizarEmpleadoSchema>;
export type ListarEmpleados = z.infer<typeof listarEmpleadosSchema>;
export type FilaImportacion = z.infer<typeof filaImportacionSchema>;
