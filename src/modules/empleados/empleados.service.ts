import { prisma } from '../../config/prisma.js';
import { noEncontrado } from '../../shared/http-error.js';
import type { ActualizarEmpleado, CrearEmpleado } from './empleados.schemas.js';

export async function listar(buscar: string | undefined, pagina: number, porPagina: number) {
  const where = buscar
    ? {
        OR: [
          { nombre: { contains: buscar, mode: 'insensitive' as const } },
          { apellidoPaterno: { contains: buscar, mode: 'insensitive' as const } },
          { cupo: { contains: buscar } },
          { curp: { contains: buscar.toUpperCase() } },
          { correoInstitucional: { contains: buscar.toLowerCase() } },
        ],
      }
    : {};
  const [total, datos] = await Promise.all([
    prisma.empleado.count({ where }),
    prisma.empleado.findMany({
      where, include: { sede: true, area: true },
      orderBy: { apellidoPaterno: 'asc' }, skip: (pagina - 1) * porPagina, take: porPagina,
    }),
  ]);
  return { total, pagina, porPagina, datos };
}

export async function obtener(id: number) {
  const e = await prisma.empleado.findUnique({ where: { id }, include: { sede: true, area: true } });
  if (!e) throw noEncontrado('Empleado');
  return e;
}

export const crear = (data: CrearEmpleado) => prisma.empleado.create({ data });
export const actualizar = (id: number, data: ActualizarEmpleado) => prisma.empleado.update({ where: { id }, data });
export const darDeBaja = (id: number) => prisma.empleado.update({ where: { id }, data: { activo: false } });
