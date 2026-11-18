import { z } from 'zod';
import { BOOL_QUERY, FECHA, ID_QUERY, opcional, paginacion } from '../../shared/validaciones.js';

const TRIMESTRE = z.coerce.number().int().min(1).max(4);
const ANIO = z.coerce.number().int().min(2000).max(2100);

const base = z.object({
  idDependencia: z.number().int().positive(),
  idTemaEtica: opcional(z.number().int().positive()),
  nombre: z.string().trim().min(3).max(250),
  // Nombre de la hoja en el Formulario del Comité de Ética (Excel admite 31 caracteres)
  nombreCorto: opcional(z.string().trim().max(31)),
  ordenReporte: opcional(z.number().int().min(1).max(999)),
  aplicaEstructura: z.boolean(),
  aplicaHonorarios: z.boolean(),
  descripcion: opcional(z.string().trim().max(2000)),
  trimestre: TRIMESTRE,
  anio: ANIO,
  fechaInicio: opcional(FECHA),
  fechaLimiteRegistro: opcional(FECHA),
  fechaEntregaConstancia: opcional(FECHA),
  urlPlataforma: opcional(z.url('Dirección web inválida').max(300)),
});

const reglaAplica = (c: { aplicaEstructura?: boolean; aplicaHonorarios?: boolean }) =>
  c.aplicaEstructura !== false || c.aplicaHonorarios !== false;
const mensajeAplica = { message: 'El curso debe aplicar al menos a un tipo de contratación', path: ['aplicaEstructura'] };

export const crearCursoSchema = base
  .extend({ aplicaEstructura: z.boolean().default(true), aplicaHonorarios: z.boolean().default(true) })
  .refine(reglaAplica, mensajeAplica);
export const actualizarCursoSchema = base.partial().refine(reglaAplica, mensajeAplica);
export const estadoCursoSchema = z.object({ activo: z.boolean() });
export const listarCursosSchema = z.object({
  buscar: z.string().trim().optional(),
  idDependencia: ID_QUERY,
  trimestre: TRIMESTRE.optional(),
  anio: ANIO.optional(),
  activo: BOOL_QUERY,
  ...paginacion,
});
export const misCursosSchema = z.object({
  estado: z.enum(['PENDIENTE', 'EN_REVISION', 'COMPLETADO', 'RECHAZADO']).optional(),
});

export type CrearCurso = z.infer<typeof crearCursoSchema>;
export type ActualizarCurso = z.infer<typeof actualizarCursoSchema>;
export type ListarCursos = z.infer<typeof listarCursosSchema>;
