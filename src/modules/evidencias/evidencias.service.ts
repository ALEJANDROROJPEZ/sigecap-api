import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '../../config/prisma.js';
import { env } from '../../config/env.js';
import { HttpError, noEncontrado } from '../../shared/http-error.js';
import { nombreCompleto, saltar } from '../../shared/validaciones.js';
import type { UsuarioToken } from '../../shared/types.js';
import { esPdf } from '../../middlewares/upload.js';
import { enviarConPlantilla } from '../correos/correos.service.js';
import { notificar, notificarAdministradores } from '../notificaciones/notificaciones.service.js';
import type { Dictamen, ListarEvidencias, SubirEvidencia } from './evidencias.schemas.js';

const RAIZ = path.resolve(env.UPLOAD_DIR);

const detalle = {
  cursoEmpleado: {
    include: {
      curso: { select: { id: true, nombre: true, anio: true, trimestre: true, dependencia: { select: { siglas: true } } } },
      empleado: {
        select: {
          id: true, cupo: true, curp: true, nombre: true, apellidoPaterno: true, apellidoMaterno: true,
          tipoContratacion: true, puesto: true, sede: { select: { clave: true, nombre: true } },
        },
      },
    },
  },
  revisor: { select: { empleado: { select: { nombre: true, apellidoPaterno: true } } } },
} as const;

// El empleado sube su constancia (RF09) o registra un curso concluido en años anteriores (RF18)
export async function subir(usuario: UsuarioToken, datos: SubirEvidencia, archivo: Express.Multer.File) {
  if (!esPdf(archivo.buffer)) throw new HttpError(400, 'El archivo no es un PDF válido');

  let seguimiento;
  if (datos.idCursoEmpleado) {
    seguimiento = await prisma.cursoEmpleado.findFirst({
      where: { id: datos.idCursoEmpleado, idEmpleado: usuario.idEmpleado }, include: { curso: true },
    });
    if (!seguimiento) throw noEncontrado('Curso asignado');
  } else {
    const curso = await prisma.curso.findUnique({ where: { id: datos.idCurso! } });
    if (!curso) throw noEncontrado('Curso');
    seguimiento = await prisma.cursoEmpleado.upsert({
      where: { idCurso_idEmpleado: { idCurso: curso.id, idEmpleado: usuario.idEmpleado } },
      update: {},
      create: { idCurso: curso.id, idEmpleado: usuario.idEmpleado, origen: 'HISTORICO' },
      include: { curso: true },
    });
  }
  if (seguimiento.estado === 'COMPLETADO') throw new HttpError(409, 'Este curso ya está acreditado');
  if (seguimiento.estado === 'EN_REVISION') throw new HttpError(409, 'Ya hay una constancia en revisión para este curso');

  // El archivo se guarda con un nombre aleatorio; el nombre original solo se conserva en la base de datos
  const relativa = path.join('evidencias', String(new Date().getFullYear()), `${crypto.randomUUID()}.pdf`);
  const destino = path.join(RAIZ, relativa);
  await fs.mkdir(path.dirname(destino), { recursive: true });
  await fs.writeFile(destino, archivo.buffer);

  try {
    const evidencia = await prisma.$transaction(async (tx) => {
      const creada = await tx.evidencia.create({
        data: {
          idCursoEmpleado: seguimiento.id,
          nombreArchivo: Buffer.from(archivo.originalname, 'latin1').toString('utf8').slice(0, 255),
          rutaArchivo: relativa,
          tamanoBytes: archivo.size,
          fechaInicioCurso: datos.fechaInicioCurso,
          fechaConclusion: datos.fechaConclusion,
        },
      });
      await tx.cursoEmpleado.update({ where: { id: seguimiento.id }, data: { estado: 'EN_REVISION' } });
      return creada;
    });
    const empleado = await prisma.empleado.findUniqueOrThrow({ where: { id: usuario.idEmpleado } });
    await notificarAdministradores({
      tipo: 'EVIDENCIA_RECIBIDA',
      titulo: 'Constancia por revisar',
      mensaje: `${nombreCompleto(empleado)} subió su constancia del curso «${seguimiento.curso.nombre}».`,
    });
    return evidencia;
  } catch (err) {
    await fs.rm(destino, { force: true });
    throw err;
  }
}

export async function listar(f: ListarEvidencias) {
  const where = {
    ...(f.estado ? { estado: f.estado } : {}),
    cursoEmpleado: {
      ...(f.idCurso ? { idCurso: f.idCurso } : {}),
      curso: {
        ...(f.idDependencia ? { idDependencia: f.idDependencia } : {}),
        ...(f.anio ? { anio: f.anio } : {}),
        ...(f.trimestre ? { trimestre: f.trimestre } : {}),
      },
      empleado: {
        ...(f.idSede ? { idSede: f.idSede } : {}),
        ...(f.buscar ? {
          OR: [
            { nombre: { contains: f.buscar, mode: 'insensitive' as const } },
            { apellidoPaterno: { contains: f.buscar, mode: 'insensitive' as const } },
            { apellidoMaterno: { contains: f.buscar, mode: 'insensitive' as const } },
            { cupo: { contains: f.buscar } },
            { curp: { contains: f.buscar.toUpperCase() } },
          ],
        } : {}),
      },
    },
  };
  const [total, enRevision, datos] = await Promise.all([
    prisma.evidencia.count({ where }),
    prisma.evidencia.count({ where: { estado: 'EN_REVISION' } }),
    prisma.evidencia.findMany({
      where, include: detalle,
      // Primero las pendientes de revisión, de la más antigua a la más reciente
      orderBy: [{ estado: 'asc' }, { fechaSubida: f.estado && f.estado !== 'EN_REVISION' ? 'desc' : 'asc' }],
      ...saltar(f.pagina, f.porPagina),
    }),
  ]);
  return { total, enRevision, pagina: f.pagina, porPagina: f.porPagina, datos };
}

// El administrador ve cualquier evidencia; el empleado, solo las propias
async function obtenerAutorizada(id: number, usuario: UsuarioToken) {
  const evidencia = await prisma.evidencia.findUnique({ where: { id }, include: detalle });
  if (!evidencia) throw noEncontrado('Evidencia');
  if (usuario.rol !== 'ADMINISTRADOR' && evidencia.cursoEmpleado.idEmpleado !== usuario.idEmpleado) {
    throw new HttpError(403, 'No tienes permiso para consultar esta constancia');
  }
  return evidencia;
}

export const obtener = obtenerAutorizada;

export async function rutaArchivo(id: number, usuario: UsuarioToken) {
  const evidencia = await obtenerAutorizada(id, usuario);
  const absoluta = path.resolve(RAIZ, evidencia.rutaArchivo);
  if (!absoluta.startsWith(RAIZ + path.sep)) throw new HttpError(400, 'Ruta de archivo inválida');
  try {
    await fs.access(absoluta);
  } catch {
    throw new HttpError(404, 'El archivo de la constancia no se encuentra en el almacenamiento');
  }
  return { absoluta, nombre: evidencia.nombreArchivo };
}

// Aprobación o rechazo de la constancia (RF10); el resultado se notifica al empleado (RF11)
export async function dictaminar(id: number, { estado, comentario }: Dictamen, revisor: UsuarioToken) {
  const evidencia = await prisma.evidencia.findUnique({
    where: { id },
    include: { cursoEmpleado: { include: { curso: true, empleado: { include: { usuario: true } } } } },
  });
  if (!evidencia) throw noEncontrado('Evidencia');
  if (evidencia.estado !== 'EN_REVISION') throw new HttpError(409, 'Esta constancia ya fue dictaminada');

  const aprobada = estado === 'APROBADA';
  await prisma.$transaction(async (tx) => {
    await tx.evidencia.update({
      where: { id },
      data: { estado, comentarioRevision: comentario || null, revisadoPor: revisor.id, fechaRevision: new Date() },
    });
    await tx.cursoEmpleado.update({
      where: { id: evidencia.idCursoEmpleado }, data: { estado: aprobada ? 'COMPLETADO' : 'RECHAZADO' },
    });
  });
  const actualizada = await prisma.evidencia.findUniqueOrThrow({ where: { id }, include: detalle });

  const { curso, empleado } = evidencia.cursoEmpleado;
  if (empleado.usuario) {
    await notificar(empleado.usuario.id, {
      tipo: aprobada ? 'EVIDENCIA_APROBADA' : 'EVIDENCIA_RECHAZADA',
      titulo: aprobada ? 'Constancia aprobada' : 'Constancia rechazada',
      mensaje: aprobada
        ? `Tu constancia del curso «${curso.nombre}» fue aprobada.${comentario ? ` Comentario: ${comentario}` : ''}`
        : `Tu constancia del curso «${curso.nombre}» fue rechazada. Motivo: ${comentario}`,
    });
  }
  const correo = empleado.correoInstitucional ?? empleado.correoRespaldo;
  if (correo) {
    void enviarConPlantilla(aprobada ? 'EVIDENCIA_APROBADA' : 'EVIDENCIA_RECHAZADA', [{
      correo,
      variables: { nombre: empleado.nombre, curso: curso.nombre, comentario: comentario ?? '', urlSistema: `${env.APP_URL}/mis-cursos` },
    }]);
  }
  return actualizada;
}
