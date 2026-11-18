import { z } from 'zod';
import { ID_QUERY, paginacion } from '../../shared/validaciones.js';

const filtros = {
  anio: z.coerce.number().int().min(2000).max(2100).optional(),
  trimestre: z.coerce.number().int().min(1).max(4).optional(),
  idDependencia: ID_QUERY,
  idSede: ID_QUERY,
};

export const dashboardSchema = z.object(filtros);
export const rezagadosSchema = z.object({ ...filtros, ...paginacion });

// tipo: concentrado (Concentrado de constancias), comite-etica (Formulario trimestral del Comité de Ética),
// cumplimiento (detalle por empleado y curso) y rezagados (personal con cursos pendientes)
export const exportarSchema = z.object({
  tipo: z.enum(['concentrado', 'comite-etica', 'cumplimiento', 'rezagados']),
  formato: z.enum(['xlsx', 'pdf', 'csv']).default('xlsx'),
  ...filtros,
})
  .refine((e) => e.formato === 'xlsx' || (e.tipo !== 'concentrado' && e.tipo !== 'comite-etica'), {
    message: 'Los formatos institucionales solo se generan en Excel', path: ['formato'],
  })
  .refine((e) => e.tipo !== 'comite-etica' || (e.anio !== undefined && e.trimestre !== undefined), {
    message: 'El formulario del Comité de Ética requiere año y trimestre', path: ['trimestre'],
  });

export type Filtros = z.infer<typeof dashboardSchema>;
export type Exportar = z.infer<typeof exportarSchema>;
