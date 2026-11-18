import { prisma } from '../../config/prisma.js';
import { env } from '../../config/env.js';
import { HttpError, noEncontrado } from '../../shared/http-error.js';
import { fechaCorta, hoyUTC, saltar } from '../../shared/validaciones.js';
import { emitirAAdministradores } from '../../sockets/index.js';
import { enviarConPlantilla, obtenerPlantilla } from '../correos/correos.service.js';
import { notificarVarios } from '../notificaciones/notificaciones.service.js';
import type { CrearAsignacion, ListarAsignaciones } from './asignaciones.schemas.js';

const ROMANOS = ['', 'I', 'II', 'III', 'IV'];
type CursoAplicable = { aplicaEstructura: boolean; aplicaHonorarios: boolean };

// Filtro de empleados a los que les corresponde el curso según su tipo de contratación
const filtroContratacion = (c: CursoAplicable) =>
  c.aplicaEstructura && c.aplicaHonorarios ? {}
    : { tipoContratacion: c.aplicaEstructura ? ('ESTRUCTURA' as const) : ('HONORARIOS' as const) };

export async function crear(datos: CrearAsignacion, idUsuario: number) {
  const curso = await prisma.curso.findUnique({ where: { id: datos.idCurso } });
  if (!curso) throw noEncontrado('Curso');
  if (!curso.activo) throw new HttpError(409, 'El curso está dado de baja; reactívalo para asignarlo');

  const destinos: (number | null)[] = datos.esGeneral ? [null] : [...new Set(datos.idSedes)];
  if (!datos.esGeneral) {
    const existentes = await prisma.sede.count({ where: { id: { in: datos.idSedes } } });
    if (existentes !== destinos.length) throw new HttpError(400, 'Alguna de las sedes indicadas no existe');
  }
  // No se duplica una asignación activa del mismo curso para la misma sede (o general)
  const previas = await prisma.asignacion.findMany({
    where: { idCurso: curso.id, activo: true, ...(datos.esGeneral ? { esGeneral: true } : { idSede: { in: datos.idSedes } }) },
    select: { idSede: true },
  });
  const yaAsignadas = new Set(previas.map((p) => p.idSede));
  const nuevas = destinos.filter((d) => !yaAsignadas.has(d));
  if (nuevas.length === 0) throw new HttpError(409, 'El curso ya está asignado a los destinatarios seleccionados');

  const creadas = [];
  const idsUsuariosNotificar = new Set<number>();
  let empleadosAsignados = 0;
  for (const idSede of nuevas) {
    const empleados = await prisma.empleado.findMany({
      where: { activo: true, ...(idSede ? { idSede } : {}), ...filtroContratacion(curso), cursos: { none: { idCurso: curso.id } } },
      select: { id: true, usuario: { select: { id: true, activo: true } } },
    });
    const asignacion = await prisma.$transaction(async (tx) => {
      const creada = await tx.asignacion.create({
        data: { idCurso: curso.id, idSede, esGeneral: idSede === null, asignadoPor: idUsuario },
      });
      await tx.cursoEmpleado.createMany({
        data: empleados.map((e) => ({ idCurso: curso.id, idEmpleado: e.id, idAsignacion: creada.id })),
        skipDuplicates: true,
      });
      return creada;
    });
    const resultado = { asignacion, empleados };
    creadas.push(resultado.asignacion);
    empleadosAsignados += resultado.empleados.length;
    for (const e of resultado.empleados) if (e.usuario?.activo) idsUsuariosNotificar.add(e.usuario.id);
  }

  await notificarVarios([...idsUsuariosNotificar], {
    tipo: 'CURSO_ASIGNADO',
    titulo: 'Nuevo curso asignado',
    mensaje: `Se te asignó el curso «${curso.nombre}»${curso.fechaEntregaConstancia ? `. Entrega tu constancia a más tardar el ${fechaCorta(curso.fechaEntregaConstancia)}` : ''}.`,
  });

  const envios = [];
  if (datos.enviarCorreo) for (const a of creadas) envios.push(await enviarCorreo(a.id));

  return {
    asignaciones: creadas,
    empleadosAsignados,
    sedesOmitidas: destinos.length - nuevas.length,
    envios,
  };
}

export async function listar(f: ListarAsignaciones) {
  const where = {
    ...(f.idCurso ? { idCurso: f.idCurso } : {}),
    ...(f.idSede ? { idSede: f.idSede } : {}),
    ...(f.activo !== undefined ? { activo: f.activo } : {}),
    curso: {
      ...(f.anio ? { anio: f.anio } : {}),
      ...(f.trimestre ? { trimestre: f.trimestre } : {}),
      ...(f.buscar ? { nombre: { contains: f.buscar, mode: 'insensitive' as const } } : {}),
    },
  };
  const [total, filas] = await Promise.all([
    prisma.asignacion.count({ where }),
    prisma.asignacion.findMany({
      where,
      include: {
        curso: { select: { id: true, nombre: true, anio: true, trimestre: true, fechaEntregaConstancia: true, activo: true, dependencia: { select: { siglas: true } } } },
        sede: { select: { id: true, clave: true, nombre: true, tipo: true } },
        usuario: { select: { empleado: { select: { nombre: true, apellidoPaterno: true } } } },
        envios: { orderBy: { fechaEnvio: 'desc' }, take: 1, select: { id: true, estado: true, fechaEnvio: true, totalDestinatarios: true } },
      },
      orderBy: { fechaAsignacion: 'desc' },
      ...saltar(f.pagina, f.porPagina),
    }),
  ]);
  // Avance de cada asignación: empleados por estado
  const conteos = await prisma.cursoEmpleado.groupBy({
    by: ['idAsignacion', 'estado'], where: { idAsignacion: { in: filas.map((a) => a.id) } }, _count: { _all: true },
  });
  const datos = filas.map(({ envios, usuario, ...a }) => {
    const propios = conteos.filter((c) => c.idAsignacion === a.id);
    const cuenta = (estado: string) => propios.find((c) => c.estado === estado)?._count._all ?? 0;
    return {
      ...a,
      asignadoPor: `${usuario.empleado.nombre} ${usuario.empleado.apellidoPaterno}`,
      ultimoEnvio: envios[0] ?? null,
      avance: {
        total: propios.reduce((s, c) => s + c._count._all, 0),
        completados: cuenta('COMPLETADO'), enRevision: cuenta('EN_REVISION'),
        pendientes: cuenta('PENDIENTE'), rechazados: cuenta('RECHAZADO'),
      },
    };
  });
  return { total, pagina: f.pagina, porPagina: f.porPagina, datos };
}

export async function obtener(id: number) {
  const asignacion = await prisma.asignacion.findUnique({
    where: { id },
    include: {
      curso: { include: { dependencia: true } },
      sede: true,
      envios: { orderBy: { fechaEnvio: 'desc' }, include: { plantilla: { select: { nombre: true } } } },
      cursosEmpleado: {
        include: { empleado: { select: { id: true, cupo: true, nombre: true, apellidoPaterno: true, apellidoMaterno: true, activo: true, sede: { select: { clave: true } } } } },
        orderBy: { empleado: { apellidoPaterno: 'asc' } },
      },
    },
  });
  if (!asignacion) throw noEncontrado('Asignación');
  return asignacion;
}

export async function cambiarEstado(id: number, activo: boolean) {
  const asignacion = await prisma.asignacion.update({ where: { id }, data: { activo } });
  if (activo) {
    // Al reactivar, se incorpora al personal que llegó a la sede mientras estuvo desactivada
    const curso = await prisma.curso.findUniqueOrThrow({ where: { id: asignacion.idCurso } });
    const empleados = await prisma.empleado.findMany({
      where: { activo: true, ...(asignacion.idSede ? { idSede: asignacion.idSede } : {}), ...filtroContratacion(curso), cursos: { none: { idCurso: curso.id } } },
      select: { id: true },
    });
    await prisma.cursoEmpleado.createMany({
      data: empleados.map((e) => ({ idCurso: curso.id, idEmpleado: e.id, idAsignacion: id })), skipDuplicates: true,
    });
  }
  return asignacion;
}

// Asigna a un empleado (nuevo, reactivado o que cambió de sede) los cursos vigentes de su sede y los generales
export async function sincronizarEmpleado(idEmpleado: number) {
  const empleado = await prisma.empleado.findUnique({ where: { id: idEmpleado } });
  if (!empleado?.activo) return 0;
  const hoy = hoyUTC();
  const asignaciones = await prisma.asignacion.findMany({
    where: {
      activo: true,
      OR: [{ esGeneral: true }, { idSede: empleado.idSede }],
      curso: {
        activo: true,
        ...(empleado.tipoContratacion === 'ESTRUCTURA' ? { aplicaEstructura: true } : { aplicaHonorarios: true }),
        OR: [{ fechaEntregaConstancia: null }, { fechaEntregaConstancia: { gte: hoy } }],
        cursosEmpleado: { none: { idEmpleado } },
      },
    },
    select: { id: true, idCurso: true },
    orderBy: { fechaAsignacion: 'asc' },
  });
  const r = await prisma.cursoEmpleado.createMany({
    data: asignaciones.map((a) => ({ idCurso: a.idCurso, idEmpleado, idAsignacion: a.id })), skipDuplicates: true,
  });
  return r.count;
}

// Envía (o reenvía) el correo de la asignación al personal que aún no acredita el curso (RF07).
// Responde de inmediato con el registro del envío y continúa en segundo plano.
export async function enviarCorreo(idAsignacion: number) {
  const asignacion = await prisma.asignacion.findUnique({
    where: { id: idAsignacion },
    include: {
      curso: { include: { dependencia: true } },
      cursosEmpleado: {
        where: { estado: { in: ['PENDIENTE', 'RECHAZADO'] }, empleado: { activo: true } },
        select: { empleado: { select: { nombre: true, correoInstitucional: true, correoRespaldo: true } } },
      },
    },
  });
  if (!asignacion) throw noEncontrado('Asignación');
  if (!asignacion.activo) throw new HttpError(409, 'La asignación está desactivada');

  const { curso } = asignacion;
  const destinatarios = asignacion.cursosEmpleado
    .map(({ empleado }) => ({ correo: empleado.correoInstitucional ?? empleado.correoRespaldo, nombre: empleado.nombre }))
    .filter((d): d is { correo: string; nombre: string } => !!d.correo);
  const sinCorreo = asignacion.cursosEmpleado.length - destinatarios.length;

  const plantilla = await obtenerPlantilla('ASIGNACION');
  const envio = await prisma.envioCorreo.create({
    data: { idPlantilla: plantilla.id, idAsignacion, totalDestinatarios: destinatarios.length, estado: destinatarios.length ? 'PENDIENTE' : 'ENVIADO' },
  });

  if (destinatarios.length > 0) {
    void enviarConPlantilla('ASIGNACION', destinatarios.map((d) => ({
      correo: d.correo,
      variables: {
        nombre: d.nombre,
        curso: curso.nombre,
        dependencia: curso.dependencia.siglas,
        trimestre: `${curso.anio}-${ROMANOS[curso.trimestre]}`,
        fechaLimite: curso.fechaEntregaConstancia ? fechaCorta(curso.fechaEntregaConstancia) : 'sin fecha límite definida',
        urlCurso: curso.urlPlataforma ?? 'consulta con el Área de Capacitación',
        urlSistema: `${env.APP_URL}/mis-cursos`,
      },
    }))).then(async ({ enviados, fallidos }) => {
      const estado = enviados === 0 ? 'ERROR' : 'ENVIADO';
      await prisma.envioCorreo.update({ where: { id: envio.id }, data: { estado, totalDestinatarios: enviados } });
      emitirAAdministradores('correo:resultado', { idEnvio: envio.id, idAsignacion, curso: curso.nombre, enviados, fallidos, estado });
    }).catch((err) => console.error('Error al enviar correos de asignación:', err));
  }
  return { ...envio, sinCorreo };
}
