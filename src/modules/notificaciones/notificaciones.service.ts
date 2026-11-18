import { prisma } from '../../config/prisma.js';
import { emitirAUsuario } from '../../sockets/index.js';
import { noEncontrado } from '../../shared/http-error.js';
import { saltar } from '../../shared/validaciones.js';

export type TipoNotificacion =
  | 'CURSO_ASIGNADO' | 'EVIDENCIA_RECIBIDA' | 'EVIDENCIA_APROBADA' | 'EVIDENCIA_RECHAZADA' | 'CORREO' | 'SISTEMA';

interface Aviso {
  tipo: TipoNotificacion;
  titulo: string;
  mensaje: string;
}

// Guarda la notificación y la entrega en tiempo real si el usuario está conectado
export async function notificar(idUsuario: number, aviso: Aviso) {
  const n = await prisma.notificacion.create({ data: { idUsuario, ...aviso } });
  emitirAUsuario(idUsuario, 'notificacion:nueva', n);
  return n;
}

export async function notificarVarios(idsUsuario: number[], aviso: Aviso) {
  if (idsUsuario.length === 0) return;
  const creadas = await prisma.notificacion.createManyAndReturn({
    data: idsUsuario.map((idUsuario) => ({ idUsuario, ...aviso })),
  });
  for (const n of creadas) emitirAUsuario(n.idUsuario, 'notificacion:nueva', n);
}

export async function notificarAdministradores(aviso: Aviso) {
  const admins = await prisma.usuario.findMany({
    where: { activo: true, rol: { nombre: 'ADMINISTRADOR' } }, select: { id: true },
  });
  await notificarVarios(admins.map((a) => a.id), aviso);
}

export async function listar(idUsuario: number, soloNoLeidas: boolean | undefined, pagina: number, porPagina: number) {
  const where = { idUsuario, ...(soloNoLeidas ? { leida: false } : {}) };
  const [total, noLeidas, datos] = await Promise.all([
    prisma.notificacion.count({ where }),
    prisma.notificacion.count({ where: { idUsuario, leida: false } }),
    prisma.notificacion.findMany({ where, orderBy: { creadaEn: 'desc' }, ...saltar(pagina, porPagina) }),
  ]);
  return { total, noLeidas, pagina, porPagina, datos };
}

export async function marcarLeida(idUsuario: number, id: number) {
  const r = await prisma.notificacion.updateMany({ where: { id, idUsuario }, data: { leida: true } });
  if (r.count === 0) throw noEncontrado('Notificación');
}

export const marcarTodasLeidas = (idUsuario: number) =>
  prisma.notificacion.updateMany({ where: { idUsuario, leida: false }, data: { leida: true } });

export async function eliminar(idUsuario: number, id: number) {
  const r = await prisma.notificacion.deleteMany({ where: { id, idUsuario } });
  if (r.count === 0) throw noEncontrado('Notificación');
}

export const eliminarLeidas = (idUsuario: number) =>
  prisma.notificacion.deleteMany({ where: { idUsuario, leida: true } });
