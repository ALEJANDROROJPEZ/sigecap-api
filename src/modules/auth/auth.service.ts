import bcrypt from 'bcrypt';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { prisma } from '../../config/prisma.js';
import { env } from '../../config/env.js';
import { HttpError } from '../../shared/http-error.js';
import type { RolNombre, UsuarioToken } from '../../shared/types.js';
import type { LoginInput } from './auth.schemas.js';

export async function login({ identificador, contrasena }: LoginInput) {
  const valor = identificador.trim();
  const esCorreo = valor.includes('@');
  const empleado = await prisma.empleado.findFirst({
    where: esCorreo ? { correoInstitucional: valor.toLowerCase() } : { curp: valor.toUpperCase() },
    include: { usuario: { include: { rol: true } } },
  });
  const usuario = empleado?.usuario;
  if (!empleado?.activo || !usuario?.activo || !(await bcrypt.compare(contrasena, usuario.contrasenaHash))) {
    throw new HttpError(401, 'Credenciales incorrectas');
  }
  await prisma.usuario.update({ where: { id: usuario.id }, data: { ultimoAcceso: new Date() } });

  const payload: UsuarioToken = { id: usuario.id, idEmpleado: empleado.id, rol: usuario.rol.nombre as RolNombre };
  const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'] });
  return {
    token,
    usuario: { ...payload, nombre: `${empleado.nombre} ${empleado.apellidoPaterno}`, tema: usuario.temaInterfaz },
  };
}
