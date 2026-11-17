import { prisma } from '../../config/prisma.js';
import { saltar } from '../../shared/validaciones.js';
import type { ListarBitacora } from './bitacora.schemas.js';

const DIA_MS = 24 * 60 * 60 * 1000;

// Consulta de la bitácora de auditoría (RF14). Los registros no se modifican ni se eliminan desde la API.
export async function listar(f: ListarBitacora) {
  const where = {
    ...(f.idUsuario ? { idUsuario: f.idUsuario } : {}),
    ...(f.accion ? { accion: f.accion } : {}),
    ...(f.entidad ? { entidad: f.entidad } : {}),
    ...(f.desde || f.hasta ? {
      fecha: { ...(f.desde ? { gte: f.desde } : {}), ...(f.hasta ? { lt: new Date(f.hasta.getTime() + DIA_MS) } : {}) },
    } : {}),
    ...(f.buscar ? {
      usuario: {
        empleado: {
          OR: [
            { nombre: { contains: f.buscar, mode: 'insensitive' as const } },
            { apellidoPaterno: { contains: f.buscar, mode: 'insensitive' as const } },
            { cupo: { contains: f.buscar } },
          ],
        },
      },
    } : {}),
  };
  const [total, datos] = await Promise.all([
    prisma.bitacora.count({ where }),
    prisma.bitacora.findMany({
      where,
      include: { usuario: { select: { id: true, empleado: { select: { cupo: true, nombre: true, apellidoPaterno: true } } } } },
      orderBy: { fecha: 'desc' },
      ...saltar(f.pagina, f.porPagina),
    }),
  ]);
  return { total, pagina: f.pagina, porPagina: f.porPagina, datos };
}

// Valores distintos de acción y entidad, para los filtros de la interfaz
export async function filtros() {
  const [acciones, entidades] = await Promise.all([
    prisma.bitacora.findMany({ distinct: ['accion'], select: { accion: true }, orderBy: { accion: 'asc' } }),
    prisma.bitacora.findMany({ distinct: ['entidad'], select: { entidad: true }, orderBy: { entidad: 'asc' } }),
  ]);
  return { acciones: acciones.map((a) => a.accion), entidades: entidades.map((e) => e.entidad) };
}
