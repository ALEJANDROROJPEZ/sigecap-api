import { z } from 'zod';
import { FECHA, ID_QUERY, hoyUTC, paginacion } from '../../shared/validaciones.js';

const ID_FORM = z.coerce.number().int().positive().optional();

// Datos que acompañan al PDF (multipart/form-data). Se indica el seguimiento del curso asignado
// (idCursoEmpleado) o, para un curso concluido en años anteriores, el curso del catálogo (idCurso).
export const subirEvidenciaSchema = z.object({
  idCursoEmpleado: ID_FORM,
  idCurso: ID_FORM,
  fechaInicioCurso: FECHA,
  fechaConclusion: FECHA,
})
  .refine((e) => (e.idCursoEmpleado === undefined) !== (e.idCurso === undefined), {
    message: 'Indica el curso asignado (idCursoEmpleado) o el curso del catálogo (idCurso)', path: ['idCursoEmpleado'],
  })
  .refine((e) => e.fechaConclusion >= e.fechaInicioCurso, {
    message: 'La fecha de conclusión no puede ser anterior a la de inicio', path: ['fechaConclusion'],
  })
  .refine((e) => e.fechaConclusion <= hoyUTC(), {
    message: 'La fecha de conclusión no puede ser posterior a hoy', path: ['fechaConclusion'],
  });

export const dictaminarSchema = z.object({
  estado: z.enum(['APROBADA', 'RECHAZADA']),
  comentario: z.string().trim().max(1000).optional(),
}).refine((d) => d.estado === 'APROBADA' || (d.comentario ?? '').length >= 5, {
  message: 'Al rechazar una constancia el comentario es obligatorio', path: ['comentario'],
});

export const listarEvidenciasSchema = z.object({
  buscar: z.string().trim().optional(),
  estado: z.enum(['EN_REVISION', 'APROBADA', 'RECHAZADA']).optional(),
  idCurso: ID_QUERY,
  idDependencia: ID_QUERY,
  idSede: ID_QUERY,
  anio: z.coerce.number().int().optional(),
  trimestre: z.coerce.number().int().min(1).max(4).optional(),
  ...paginacion,
});

export type SubirEvidencia = z.infer<typeof subirEvidenciaSchema>;
export type Dictamen = z.infer<typeof dictaminarSchema>;
export type ListarEvidencias = z.infer<typeof listarEvidenciasSchema>;
