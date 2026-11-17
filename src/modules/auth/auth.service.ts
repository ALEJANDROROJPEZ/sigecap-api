import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { prisma } from '../../config/prisma.js';
import { env } from '../../config/env.js';
import { HttpError, noEncontrado } from '../../shared/http-error.js';
import { nombreCompleto } from '../../shared/validaciones.js';
import type { RolNombre, UsuarioToken } from '../../shared/types.js';
import { enviarConPlantilla } from '../correos/correos.service.js';
import type { ContactoInput, LoginInput } from './auth.schemas.js';

const MINUTOS_RECUPERACION = 30;
const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex');
export const hashContrasena = (contrasena: string) => bcrypt.hash(contrasena, 12);

function emitirTokens(payload: UsuarioToken) {
  const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'] });
  const refreshToken = jwt.sign({ id: payload.id, tipo: 'refresh' }, env.JWT_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as SignOptions['expiresIn'],
  });
  return { token, refreshToken };
}

// Datos del usuario que el frontend necesita para armar el menú y el perfil
export async function perfil(idUsuario: number) {
  const u = await prisma.usuario.findUnique({
    where: { id: idUsuario },
    include: { rol: true, empleado: { include: { sede: true, area: true } } },
  });
  if (!u) throw noEncontrado('Usuario');
  const e = u.empleado;
  return {
    id: u.id,
    idEmpleado: e.id,
    rol: u.rol.nombre as RolNombre,
    nombre: `${e.nombre} ${e.apellidoPaterno}`,
    nombreCompleto: nombreCompleto(e),
    tema: u.temaInterfaz,
    cupo: e.cupo,
    curp: e.curp,
    puesto: e.puesto,
    tipoContratacion: e.tipoContratacion,
    sede: { id: e.sede.id, clave: e.sede.clave, nombre: e.sede.nombre },
    area: { id: e.area.id, nombre: e.area.nombre },
    correoInstitucional: e.correoInstitucional,
    correoRespaldo: e.correoRespaldo,
    telefono: e.telefono,
    ultimoAcceso: u.ultimoAcceso,
  };
}

const buscarEmpleado = (identificador: string) => {
  const valor = identificador.trim();
  return prisma.empleado.findFirst({
    where: valor.includes('@') ? { correoInstitucional: valor.toLowerCase() } : { curp: valor.toUpperCase() },
    include: { usuario: { include: { rol: true } } },
  });
};

export async function login({ identificador, contrasena }: LoginInput) {
  const empleado = await buscarEmpleado(identificador);
  const usuario = empleado?.usuario;
  if (!empleado?.activo || !usuario?.activo || !(await bcrypt.compare(contrasena, usuario.contrasenaHash))) {
    throw new HttpError(401, 'Credenciales incorrectas');
  }
  await prisma.usuario.update({ where: { id: usuario.id }, data: { ultimoAcceso: new Date() } });
  const payload: UsuarioToken = { id: usuario.id, idEmpleado: empleado.id, rol: usuario.rol.nombre as RolNombre };
  return { ...emitirTokens(payload), usuario: await perfil(usuario.id) };
}

export async function refrescar(refreshToken: string) {
  let datos: { id: number; tipo?: string };
  try {
    datos = jwt.verify(refreshToken, env.JWT_SECRET) as { id: number; tipo?: string };
  } catch {
    throw new HttpError(401, 'La sesión expiró; inicia sesión de nuevo');
  }
  if (datos.tipo !== 'refresh') throw new HttpError(401, 'Token de renovación inválido');
  const usuario = await prisma.usuario.findUnique({ where: { id: datos.id }, include: { rol: true, empleado: true } });
  if (!usuario?.activo || !usuario.empleado.activo) throw new HttpError(401, 'La cuenta está desactivada');
  const payload: UsuarioToken = { id: usuario.id, idEmpleado: usuario.idEmpleado, rol: usuario.rol.nombre as RolNombre };
  return emitirTokens(payload);
}

// Genera un token de un solo uso para definir la contraseña; en la base de datos solo se guarda su hash
export async function crearTokenRecuperacion(idUsuario: number, minutos = MINUTOS_RECUPERACION) {
  const token = crypto.randomBytes(32).toString('hex');
  await prisma.$transaction(async (tx) => {
    // Los enlaces anteriores dejan de servir
    await tx.tokenRecuperacion.updateMany({ where: { idUsuario, usado: false }, data: { usado: true } });
    await tx.tokenRecuperacion.create({
      data: { idUsuario, tokenHash: sha256(token), expiraEn: new Date(Date.now() + minutos * 60_000) },
    });
  });
  return { token, enlace: `${env.APP_URL}/restablecer?token=${token}` };
}

// Siempre responde igual, exista o no la cuenta, para no revelar quién está registrado
export async function solicitarRecuperacion(identificador: string) {
  const empleado = await buscarEmpleado(identificador);
  const usuario = empleado?.usuario;
  if (!empleado?.activo || !usuario?.activo) return;
  const correos = [empleado.correoInstitucional, empleado.correoRespaldo].filter((c): c is string => !!c);
  if (correos.length === 0) return;
  const { enlace } = await crearTokenRecuperacion(usuario.id);
  await enviarConPlantilla('RECUPERACION', [
    { correo: correos, variables: { nombre: empleado.nombre, enlace, vigencia: `${MINUTOS_RECUPERACION} minutos` } },
  ]);
  return usuario.id;
}

export async function restablecer(token: string, contrasena: string) {
  const registro = await prisma.tokenRecuperacion.findFirst({
    where: { tokenHash: sha256(token), usado: false, expiraEn: { gt: new Date() } },
  });
  if (!registro) throw new HttpError(400, 'El enlace no es válido o ya expiró. Solicita uno nuevo.');
  const contrasenaHash = await hashContrasena(contrasena);
  await prisma.$transaction(async (tx) => {
    await tx.usuario.update({ where: { id: registro.idUsuario }, data: { contrasenaHash } });
    await tx.tokenRecuperacion.update({ where: { id: registro.id }, data: { usado: true } });
  });
  return registro.idUsuario;
}

export async function cambiarContrasena(idUsuario: number, actual: string, nueva: string) {
  const usuario = await prisma.usuario.findUniqueOrThrow({ where: { id: idUsuario } });
  if (!(await bcrypt.compare(actual, usuario.contrasenaHash))) throw new HttpError(400, 'La contraseña actual no es correcta');
  await prisma.usuario.update({ where: { id: idUsuario }, data: { contrasenaHash: await hashContrasena(nueva) } });
}

export async function actualizarPreferencias(idUsuario: number, tema: 'CLARO' | 'OSCURO') {
  await prisma.usuario.update({ where: { id: idUsuario }, data: { temaInterfaz: tema } });
  return perfil(idUsuario);
}

export async function actualizarContacto(usuario: UsuarioToken, datos: ContactoInput) {
  const empleado = await prisma.empleado.findUniqueOrThrow({ where: { id: usuario.idEmpleado } });
  if (empleado.correoInstitucional && (!datos.correoRespaldo || !datos.telefono)) {
    throw new HttpError(400, 'Al tener correo institucional, el correo de respaldo y el teléfono son obligatorios');
  }
  const antes = { correoRespaldo: empleado.correoRespaldo, telefono: empleado.telefono };
  await prisma.empleado.update({
    where: { id: empleado.id },
    data: { correoRespaldo: datos.correoRespaldo, telefono: datos.telefono },
  });
  return { antes, perfil: await perfil(usuario.id) };
}
