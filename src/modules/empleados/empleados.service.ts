import { prisma } from '../../config/prisma.js';
import { HttpError, noEncontrado } from '../../shared/http-error.js';
import { saltar } from '../../shared/validaciones.js';
import { sincronizarEmpleado } from '../asignaciones/asignaciones.service.js';
import { mensajeContacto, reglaContacto, type ActualizarEmpleado, type CrearEmpleado, type ListarEmpleados } from './empleados.schemas.js';

const relaciones = {
  sede: true,
  area: true,
  usuario: { select: { id: true, activo: true, rol: { select: { nombre: true } } } },
} as const;

export async function listar(f: ListarEmpleados) {
  const where = {
    ...(f.idSede ? { idSede: f.idSede } : {}),
    ...(f.idArea ? { idArea: f.idArea } : {}),
    ...(f.tipoContratacion ? { tipoContratacion: f.tipoContratacion } : {}),
    ...(f.activo !== undefined ? { activo: f.activo } : {}),
    ...(f.sinCuenta ? { usuario: null } : {}),
    ...(f.buscar ? {
      OR: [
        { nombre: { contains: f.buscar, mode: 'insensitive' as const } },
        { apellidoPaterno: { contains: f.buscar, mode: 'insensitive' as const } },
        { apellidoMaterno: { contains: f.buscar, mode: 'insensitive' as const } },
        { cupo: { contains: f.buscar } },
        { curp: { contains: f.buscar.toUpperCase() } },
        { correoInstitucional: { contains: f.buscar.toLowerCase() } },
      ],
    } : {}),
  };
  const [total, datos] = await Promise.all([
    prisma.empleado.count({ where }),
    prisma.empleado.findMany({
      where, include: relaciones,
      orderBy: [{ apellidoPaterno: 'asc' }, { apellidoMaterno: 'asc' }, { nombre: 'asc' }],
      ...saltar(f.pagina, f.porPagina),
    }),
  ]);
  return { total, pagina: f.pagina, porPagina: f.porPagina, datos };
}

export async function obtener(id: number) {
  const e = await prisma.empleado.findUnique({
    where: { id },
    include: {
      ...relaciones,
      cursos: {
        include: { curso: { select: { id: true, nombre: true, anio: true, trimestre: true, dependencia: { select: { siglas: true } } } } },
        orderBy: [{ curso: { anio: 'desc' } }, { curso: { trimestre: 'desc' } }],
      },
    },
  });
  if (!e) throw noEncontrado('Empleado');
  return e;
}

export async function crear(data: CrearEmpleado) {
  const empleado = await prisma.empleado.create({ data, include: relaciones });
  await sincronizarEmpleado(empleado.id);
  return empleado;
}

export async function actualizar(id: number, data: ActualizarEmpleado) {
  const actual = await prisma.empleado.findUnique({ where: { id } });
  if (!actual) throw noEncontrado('Empleado');
  if (!reglaContacto({ ...actual, ...data })) throw new HttpError(400, mensajeContacto);
  const empleado = await prisma.empleado.update({ where: { id }, data, include: relaciones });
  // Si cambió de sede o de tipo de contratación pueden corresponderle otros cursos
  if (data.idSede !== undefined || data.tipoContratacion !== undefined) await sincronizarEmpleado(id);
  return empleado;
}

// Baja o reactivación lógica: el registro y su historial de cursos se conservan
export async function cambiarEstado(id: number, activo: boolean) {
  const empleado = await prisma.empleado.update({ where: { id }, data: { activo }, include: relaciones });
  if (activo) await sincronizarEmpleado(id);
  return empleado;
}
