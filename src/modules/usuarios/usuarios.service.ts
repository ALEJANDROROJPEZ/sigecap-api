import crypto from 'node:crypto';
import { prisma } from '../../config/prisma.js';
import { HttpError, noEncontrado } from '../../shared/http-error.js';
import { nombreCompleto, saltar } from '../../shared/validaciones.js';
import type { RolNombre } from '../../shared/types.js';
import { crearTokenRecuperacion, hashContrasena } from '../auth/auth.service.js';
import { enviarConPlantilla } from '../correos/correos.service.js';
import type { ActualizarUsuario, CrearUsuario, ListarUsuarios } from './usuarios.schemas.js';

const HORAS_BIENVENIDA = 72;
const empleadoBasico = {
  select: {
    id: true, cupo: true, curp: true, nombre: true, apellidoPaterno: true, apellidoMaterno: true,
    correoInstitucional: true, correoRespaldo: true, activo: true, sede: { select: { clave: true } },
  },
} as const;

// Contraseña temporal legible: 12 caracteres sin los que se confunden (0/O, 1/l/I), con letras y números
function contrasenaTemporal(): string {
  const alfabeto = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const clave = Array.from({ length: 12 }, () => alfabeto[crypto.randomInt(alfabeto.length)]).join('');
  return /[A-Za-z]/.test(clave) && /\d/.test(clave) ? clave : contrasenaTemporal();
}

export async function listar({ buscar, rol, activo, pagina, porPagina }: ListarUsuarios) {
  const where = {
    ...(rol ? { rol: { nombre: rol } } : {}),
    ...(activo !== undefined ? { activo } : {}),
    ...(buscar ? {
      empleado: {
        OR: [
          { nombre: { contains: buscar, mode: 'insensitive' as const } },
          { apellidoPaterno: { contains: buscar, mode: 'insensitive' as const } },
          { cupo: { contains: buscar } },
          { curp: { contains: buscar.toUpperCase() } },
          { correoInstitucional: { contains: buscar.toLowerCase() } },
        ],
      },
    } : {}),
  };
  const [total, datos] = await Promise.all([
    prisma.usuario.count({ where }),
    prisma.usuario.findMany({
      where,
      select: { id: true, activo: true, ultimoAcceso: true, rol: { select: { nombre: true } }, empleado: empleadoBasico },
      orderBy: { empleado: { apellidoPaterno: 'asc' } },
      ...saltar(pagina, porPagina),
    }),
  ]);
  return { total, pagina, porPagina, datos };
}

const idRol = async (nombre: RolNombre) => (await prisma.rol.findUniqueOrThrow({ where: { nombre } })).id;

// Crea la cuenta con una contraseña temporal. Si el empleado tiene correo, también recibe
// un enlace para definir su propia contraseña; la temporal se devuelve una sola vez al administrador.
export async function crear({ idEmpleado, rol }: CrearUsuario) {
  const empleado = await prisma.empleado.findUnique({ where: { id: idEmpleado }, include: { usuario: true } });
  if (!empleado) throw noEncontrado('Empleado');
  if (!empleado.activo) throw new HttpError(409, 'El empleado está dado de baja');
  if (empleado.usuario) throw new HttpError(409, 'El empleado ya tiene una cuenta');

  const temporal = contrasenaTemporal();
  const usuario = await prisma.usuario.create({
    data: { idEmpleado, idRol: await idRol(rol), contrasenaHash: await hashContrasena(temporal) },
  });
  const identificador = empleado.correoInstitucional ?? empleado.curp;
  const correos = [empleado.correoInstitucional, empleado.correoRespaldo].filter((c): c is string => !!c);
  let correoEnviado = false;
  if (correos.length > 0) {
    const { enlace } = await crearTokenRecuperacion(usuario.id, HORAS_BIENVENIDA * 60);
    const r = await enviarConPlantilla('BIENVENIDA', [
      { correo: correos, variables: { nombre: empleado.nombre, identificador, enlace, vigencia: `${HORAS_BIENVENIDA} horas` } },
    ]);
    correoEnviado = r.enviados > 0;
  }
  return {
    id: usuario.id, idEmpleado, rol, cupo: empleado.cupo, nombre: nombreCompleto(empleado),
    identificador, contrasenaTemporal: temporal, correoEnviado,
  };
}

// Crea cuentas para todos los empleados activos que aún no tienen una
export async function crearFaltantes() {
  const pendientes = await prisma.empleado.findMany({
    where: { activo: true, usuario: null }, select: { id: true }, orderBy: { apellidoPaterno: 'asc' },
  });
  const cuentas = [];
  for (const e of pendientes) cuentas.push(await crear({ idEmpleado: e.id, rol: 'EMPLEADO' }));
  return { creadas: cuentas.length, cuentas };
}

export async function actualizar(id: number, datos: ActualizarUsuario, idActual: number) {
  const usuario = await prisma.usuario.findUnique({ where: { id }, include: { rol: true } });
  if (!usuario) throw noEncontrado('Usuario');
  const antes = { rol: usuario.rol.nombre, activo: usuario.activo };
  const pierdeAdmin = usuario.rol.nombre === 'ADMINISTRADOR'
    && ((datos.rol && datos.rol !== 'ADMINISTRADOR') || datos.activo === false);
  if (pierdeAdmin) {
    if (id === idActual) throw new HttpError(409, 'No puedes quitarte a ti mismo el acceso de administrador');
    const otros = await prisma.usuario.count({ where: { activo: true, rol: { nombre: 'ADMINISTRADOR' }, id: { not: id } } });
    if (otros === 0) throw new HttpError(409, 'Debe existir al menos un administrador activo');
  }
  const actualizado = await prisma.usuario.update({
    where: { id },
    data: { ...(datos.rol ? { idRol: await idRol(datos.rol) } : {}), ...(datos.activo !== undefined ? { activo: datos.activo } : {}) },
    select: { id: true, activo: true, rol: { select: { nombre: true } } },
  });
  return { antes, despues: { rol: actualizado.rol.nombre, activo: actualizado.activo } };
}

// Asigna una nueva contraseña temporal (para el personal sin correo o que no puede usar el enlace)
export async function restablecer(id: number) {
  const usuario = await prisma.usuario.findUnique({ where: { id }, include: { empleado: true } });
  if (!usuario) throw noEncontrado('Usuario');
  const temporal = contrasenaTemporal();
  await prisma.usuario.update({ where: { id }, data: { contrasenaHash: await hashContrasena(temporal) } });
  return {
    id, nombre: nombreCompleto(usuario.empleado),
    identificador: usuario.empleado.correoInstitucional ?? usuario.empleado.curp, contrasenaTemporal: temporal,
  };
}
