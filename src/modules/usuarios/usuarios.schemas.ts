import { z } from 'zod';
import { BOOL_QUERY, paginacion } from '../../shared/validaciones.js';

const ROL = z.enum(['ADMINISTRADOR', 'EMPLEADO']);

export const listarUsuariosSchema = z.object({
  buscar: z.string().trim().optional(),
  rol: ROL.optional(),
  activo: BOOL_QUERY,
  ...paginacion,
});
export const crearUsuarioSchema = z.object({
  idEmpleado: z.number().int().positive(),
  rol: ROL.default('EMPLEADO'),
});
export const actualizarUsuarioSchema = z.object({
  rol: ROL.optional(),
  activo: z.boolean().optional(),
}).refine((d) => d.rol !== undefined || d.activo !== undefined, { message: 'Indica el rol o el estado a cambiar' });

export type ListarUsuarios = z.infer<typeof listarUsuariosSchema>;
export type CrearUsuario = z.infer<typeof crearUsuarioSchema>;
export type ActualizarUsuario = z.infer<typeof actualizarUsuarioSchema>;
