import { prisma } from '../../config/prisma.js';
import { noEncontrado } from '../../shared/http-error.js';
import { saltar } from '../../shared/validaciones.js';
import type { ActualizarCurso, CrearCurso, ListarCursos } from './cursos.schemas.js';

const relaciones = {
  dependencia: true,
  temaEtica: true,
  _count: { select: { asignaciones: true, cursosEmpleado: true } },
} as const;

export async function listar(f: ListarCursos) {
  const where = {
    ...(f.idDependencia ? { idDependencia: f.idDependencia } : {}),
    ...(f.trimestre ? { trimestre: f.trimestre } : {}),
    ...(f.anio ? { anio: f.anio } : {}),
    ...(f.activo !== undefined ? { activo: f.activo } : {}),
    ...(f.buscar ? {
      OR: [
        { nombre: { contains: f.buscar, mode: 'insensitive' as const } },
        { nombreCorto: { contains: f.buscar, mode: 'insensitive' as const } },
      ],
    } : {}),
  };
  const [total, datos] = await Promise.all([
    prisma.curso.count({ where }),
    prisma.curso.findMany({
      where, include: relaciones,
      orderBy: [{ anio: 'desc' }, { trimestre: 'desc' }, { ordenReporte: 'asc' }, { nombre: 'asc' }],
      ...saltar(f.pagina, f.porPagina),
    }),
  ]);
  return { total, pagina: f.pagina, porPagina: f.porPagina, datos };
}

export async function obtener(id: number) {
  const curso = await prisma.curso.findUnique({ where: { id }, include: relaciones });
  if (!curso) throw noEncontrado('Curso');
  return curso;
}

export const crear = (data: CrearCurso) => prisma.curso.create({ data, include: relaciones });
export const actualizar = (id: number, data: ActualizarCurso) => prisma.curso.update({ where: { id }, data, include: relaciones });
export const cambiarEstado = (id: number, activo: boolean) => prisma.curso.update({ where: { id }, data: { activo }, include: relaciones });

// Años que tienen cursos registrados (para los filtros de la interfaz)
export async function anios() {
  const filas = await prisma.curso.findMany({ distinct: ['anio'], select: { anio: true }, orderBy: { anio: 'desc' } });
  return filas.map((f) => f.anio);
}

// ---------- Vista del empleado (RF08) ----------

// Cursos del empleado autenticado con su última constancia. No se muestran los pendientes
// cuya asignación fue desactivada por el administrador.
export function misCursos(idEmpleado: number, estado?: 'PENDIENTE' | 'EN_REVISION' | 'COMPLETADO' | 'RECHAZADO') {
  return prisma.cursoEmpleado.findMany({
    where: {
      idEmpleado,
      ...(estado ? { estado } : {}),
      OR: [{ estado: { not: 'PENDIENTE' } }, { idAsignacion: null }, { asignacion: { activo: true }, curso: { activo: true } }],
    },
    include: {
      curso: { include: { dependencia: { select: { siglas: true, nombre: true } } } },
      evidencias: {
        orderBy: { fechaSubida: 'desc' },
        select: {
          id: true, nombreArchivo: true, tamanoBytes: true, fechaInicioCurso: true, fechaConclusion: true,
          estado: true, comentarioRevision: true, fechaSubida: true, fechaRevision: true,
        },
      },
    },
    orderBy: [{ curso: { anio: 'desc' } }, { curso: { trimestre: 'desc' } }, { curso: { nombre: 'asc' } }],
  });
}

// Cursos que el empleado puede registrar como concluidos en años anteriores (RF18):
// todos los del catálogo que aún no tiene en su historial.
export function catalogoHistorico(idEmpleado: number) {
  return prisma.curso.findMany({
    where: { cursosEmpleado: { none: { idEmpleado } } },
    select: { id: true, nombre: true, anio: true, trimestre: true, dependencia: { select: { siglas: true } } },
    orderBy: [{ anio: 'desc' }, { nombre: 'asc' }],
  });
}
