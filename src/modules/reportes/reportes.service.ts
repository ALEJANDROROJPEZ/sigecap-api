import { prisma } from '../../config/prisma.js';
import { nombreCompleto } from '../../shared/validaciones.js';
import type { Filtros } from './reportes.schemas.js';

export const ROMANOS = ['', 'I', 'II', 'III', 'IV'];
const apellidosNombre = (e: { nombre: string; apellidoPaterno: string; apellidoMaterno?: string | null }) =>
  `${[e.apellidoPaterno, e.apellidoMaterno].filter(Boolean).join(' ')} ${e.nombre}`;

// Seguimientos (curso por empleado) que cuentan para los indicadores: personal activo y sin los
// pendientes de asignaciones o cursos que el administrador desactivó.
const filtroSeguimiento = (f: Filtros) => ({
  curso: {
    ...(f.anio ? { anio: f.anio } : {}),
    ...(f.trimestre ? { trimestre: f.trimestre } : {}),
    ...(f.idDependencia ? { idDependencia: f.idDependencia } : {}),
  },
  empleado: { activo: true, ...(f.idSede ? { idSede: f.idSede } : {}) },
  OR: [
    { estado: { not: 'PENDIENTE' as const } },
    { idAsignacion: null },
    { asignacion: { activo: true }, curso: { activo: true } },
  ],
});

interface Grupo { clave: string; nombre: string; total: number; completados: number; enRevision: number; pendientes: number; rechazados: number }
const CAMPO = { COMPLETADO: 'completados', EN_REVISION: 'enRevision', PENDIENTE: 'pendientes', RECHAZADO: 'rechazados' } as const;
const porcentaje = (parte: number, total: number) => (total === 0 ? 0 : Math.round((parte / total) * 1000) / 10);

function acumular(mapa: Map<string, Grupo>, clave: string, nombre: string, estado: keyof typeof CAMPO) {
  const g = mapa.get(clave) ?? { clave, nombre, total: 0, completados: 0, enRevision: 0, pendientes: 0, rechazados: 0 };
  g.total += 1;
  g[CAMPO[estado]] += 1;
  mapa.set(clave, g);
}
const ordenar = (mapa: Map<string, Grupo>) =>
  [...mapa.values()].map((g) => ({ ...g, cumplimiento: porcentaje(g.completados, g.total) })).sort((a, b) => a.clave.localeCompare(b.clave));

// Indicadores y series del dashboard (RF12)
export async function dashboard(f: Filtros) {
  const where = filtroSeguimiento(f);
  const anioSerie = f.anio ?? new Date().getFullYear();
  const [filas, empleadosActivos, cursosActivos, evidenciasEnRevision, aprobadas] = await Promise.all([
    prisma.cursoEmpleado.findMany({
      where,
      select: {
        estado: true,
        curso: { select: { id: true, nombre: true, nombreCorto: true, dependencia: { select: { siglas: true, nombre: true } } } },
        empleado: { select: { id: true, cupo: true, nombre: true, apellidoPaterno: true, apellidoMaterno: true, sede: { select: { clave: true, nombre: true } } } },
      },
    }),
    prisma.empleado.count({ where: { activo: true, ...(f.idSede ? { idSede: f.idSede } : {}) } }),
    prisma.curso.count({ where: { activo: true, ...where.curso } }),
    prisma.evidencia.count({ where: { estado: 'EN_REVISION', cursoEmpleado: { curso: where.curso, empleado: where.empleado } } }),
    prisma.evidencia.findMany({
      where: {
        estado: 'APROBADA',
        fechaRevision: { gte: new Date(anioSerie, 0, 1), lt: new Date(anioSerie + 1, 0, 1) },
        cursoEmpleado: { curso: where.curso, empleado: where.empleado },
      },
      select: { fechaRevision: true },
    }),
  ]);

  const total: Grupo = { clave: 'total', nombre: 'Total', total: 0, completados: 0, enRevision: 0, pendientes: 0, rechazados: 0 };
  const porDependencia = new Map<string, Grupo>();
  const porSede = new Map<string, Grupo>();
  const porCurso = new Map<string, Grupo>();
  const faltantes = new Map<number, { idEmpleado: number; cupo: string; nombre: string; sede: string; pendientes: number }>();
  for (const s of filas) {
    total.total += 1;
    total[CAMPO[s.estado]] += 1;
    acumular(porDependencia, s.curso.dependencia.siglas, s.curso.dependencia.nombre, s.estado);
    acumular(porSede, s.empleado.sede.clave, s.empleado.sede.nombre, s.estado);
    acumular(porCurso, String(s.curso.id).padStart(8, '0'), s.curso.nombreCorto ?? s.curso.nombre, s.estado);
    if (s.estado === 'PENDIENTE' || s.estado === 'RECHAZADO') {
      const r = faltantes.get(s.empleado.id) ?? {
        idEmpleado: s.empleado.id, cupo: s.empleado.cupo, nombre: nombreCompleto(s.empleado), sede: s.empleado.sede.clave, pendientes: 0,
      };
      r.pendientes += 1;
      faltantes.set(s.empleado.id, r);
    }
  }
  const serieMensual = Array.from({ length: 12 }, (_, i) => ({ mes: i + 1, completados: 0 }));
  for (const e of aprobadas) if (e.fechaRevision) serieMensual[e.fechaRevision.getMonth()]!.completados += 1;

  return {
    filtros: f,
    totales: {
      empleadosActivos,
      cursosActivos,
      seguimientos: total.total,
      completados: total.completados,
      enRevision: total.enRevision,
      pendientes: total.pendientes,
      rechazados: total.rechazados,
      cumplimiento: porcentaje(total.completados, total.total),
      evidenciasEnRevision,
      empleadosRezagados: faltantes.size,
    },
    porDependencia: ordenar(porDependencia),
    porSede: ordenar(porSede),
    porCurso: ordenar(porCurso).sort((a, b) => a.cumplimiento - b.cumplimiento),
    anioSerie,
    serieMensual,
    rezagados: [...faltantes.values()].sort((a, b) => b.pendientes - a.pendientes || a.nombre.localeCompare(b.nombre)).slice(0, 10),
  };
}

// Personal con cursos pendientes o con constancia rechazada, con el detalle de los cursos que le faltan
export async function rezagados(f: Filtros) {
  const filas = await prisma.cursoEmpleado.findMany({
    where: { ...filtroSeguimiento(f), estado: { in: ['PENDIENTE', 'RECHAZADO'] } },
    select: {
      estado: true,
      curso: { select: { nombre: true, nombreCorto: true, anio: true, trimestre: true, fechaEntregaConstancia: true } },
      empleado: {
        select: {
          id: true, cupo: true, nombre: true, apellidoPaterno: true, apellidoMaterno: true, puesto: true,
          correoInstitucional: true, correoRespaldo: true, telefono: true, sede: { select: { clave: true } },
        },
      },
    },
    orderBy: [{ empleado: { apellidoPaterno: 'asc' } }, { empleado: { apellidoMaterno: 'asc' } }, { empleado: { nombre: 'asc' } }],
  });
  const mapa = new Map<number, {
    idEmpleado: number; cupo: string; nombre: string; sede: string; puesto: string; correo: string | null; telefono: string | null;
    cursos: { nombre: string; periodo: string; estado: string; fechaLimite: Date | null }[];
  }>();
  for (const s of filas) {
    const e = s.empleado;
    const r = mapa.get(e.id) ?? {
      idEmpleado: e.id, cupo: e.cupo, nombre: apellidosNombre(e), sede: e.sede.clave, puesto: e.puesto,
      correo: e.correoInstitucional ?? e.correoRespaldo, telefono: e.telefono, cursos: [],
    };
    r.cursos.push({
      nombre: s.curso.nombreCorto ?? s.curso.nombre, periodo: `${s.curso.anio}-${ROMANOS[s.curso.trimestre]}`,
      estado: s.estado, fechaLimite: s.curso.fechaEntregaConstancia,
    });
    mapa.set(e.id, r);
  }
  return [...mapa.values()];
}

// Detalle de cumplimiento: un renglón por empleado y curso, con la fecha de su constancia aprobada
export async function cumplimiento(f: Filtros) {
  const filas = await prisma.cursoEmpleado.findMany({
    where: filtroSeguimiento(f),
    select: {
      estado: true, origen: true,
      curso: { select: { nombre: true, anio: true, trimestre: true, dependencia: { select: { siglas: true } } } },
      empleado: { select: { cupo: true, nombre: true, apellidoPaterno: true, apellidoMaterno: true, tipoContratacion: true, sede: { select: { clave: true } } } },
      evidencias: { where: { estado: 'APROBADA' }, orderBy: { fechaRevision: 'desc' }, take: 1, select: { fechaConclusion: true } },
    },
    orderBy: [{ empleado: { apellidoPaterno: 'asc' } }, { empleado: { apellidoMaterno: 'asc' } }, { curso: { nombre: 'asc' } }],
  });
  return filas.map((s) => ({
    cupo: s.empleado.cupo,
    nombre: apellidosNombre(s.empleado),
    sede: s.empleado.sede.clave,
    tipoContratacion: s.empleado.tipoContratacion,
    dependencia: s.curso.dependencia.siglas,
    curso: s.curso.nombre,
    periodo: `${s.curso.anio}-${ROMANOS[s.curso.trimestre]}`,
    estado: s.estado,
    origen: s.origen,
    fechaConclusion: s.evidencias[0]?.fechaConclusion ?? null,
  }));
}

// Datos del Concentrado de constancias: personal activo contra cursos, agrupados por dependencia
export async function concentrado(f: Filtros) {
  const [cursos, empleados] = await Promise.all([
    prisma.curso.findMany({
      where: {
        activo: true,
        ...(f.idDependencia ? { idDependencia: f.idDependencia } : {}),
        ...(f.anio ? { anio: f.anio } : {}),
        ...(f.trimestre ? { trimestre: f.trimestre } : {}),
      },
      include: { dependencia: true },
      orderBy: [{ dependencia: { siglas: 'asc' } }, { ordenReporte: { sort: 'asc', nulls: 'last' } }, { nombre: 'asc' }],
    }),
    prisma.empleado.findMany({
      where: { activo: true, ...(f.idSede ? { idSede: f.idSede } : {}) },
      include: { sede: { select: { clave: true } } },
      orderBy: [{ apellidoPaterno: 'asc' }, { apellidoMaterno: 'asc' }, { nombre: 'asc' }],
    }),
  ]);
  const aprobadas = await prisma.evidencia.findMany({
    where: { estado: 'APROBADA', cursoEmpleado: { idCurso: { in: cursos.map((c) => c.id) }, idEmpleado: { in: empleados.map((e) => e.id) } } },
    select: { fechaConclusion: true, cursoEmpleado: { select: { idCurso: true, idEmpleado: true } } },
    orderBy: { fechaRevision: 'asc' },
  });
  const constancias = new Map<string, Date>();
  for (const e of aprobadas) constancias.set(`${e.cursoEmpleado.idEmpleado}-${e.cursoEmpleado.idCurso}`, e.fechaConclusion);
  return { cursos, empleados: empleados.map((e) => ({ ...e, nombreReporte: apellidosNombre(e) })), constancias };
}

// Datos del Formulario trimestral del Comité de Ética: constancias aprobadas en el trimestre, por curso
export async function comiteEtica(anio: number, trimestre: number, f: Filtros) {
  const inicio = new Date(anio, (trimestre - 1) * 3, 1);
  const fin = new Date(anio, trimestre * 3, 1);
  const evidencias = await prisma.evidencia.findMany({
    where: {
      estado: 'APROBADA',
      fechaRevision: { gte: inicio, lt: fin },
      cursoEmpleado: {
        curso: f.idDependencia ? { idDependencia: f.idDependencia } : {},
        empleado: f.idSede ? { idSede: f.idSede } : {},
      },
    },
    select: {
      fechaInicioCurso: true,
      cursoEmpleado: {
        select: {
          curso: { select: { id: true, nombre: true, nombreCorto: true, ordenReporte: true, temaEtica: true } },
          empleado: { select: { curp: true, numTrabajadorRusp: true, nombre: true, apellidoPaterno: true, apellidoMaterno: true } },
        },
      },
    },
    orderBy: [{ cursoEmpleado: { empleado: { apellidoPaterno: 'asc' } } }, { cursoEmpleado: { empleado: { apellidoMaterno: 'asc' } } }],
  });
  const porCurso = new Map<number, { curso: (typeof evidencias)[number]['cursoEmpleado']['curso']; registros: typeof evidencias }>();
  for (const e of evidencias) {
    const { curso } = e.cursoEmpleado;
    const grupo = porCurso.get(curso.id) ?? { curso, registros: [] };
    grupo.registros.push(e);
    porCurso.set(curso.id, grupo);
  }
  return [...porCurso.values()].sort((a, b) => (a.curso.ordenReporte ?? 999) - (b.curso.ordenReporte ?? 999) || a.curso.nombre.localeCompare(b.curso.nombre));
}
