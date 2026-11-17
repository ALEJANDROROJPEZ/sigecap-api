import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { HttpError } from '../shared/http-error.js';
import type { UsuarioToken } from '../shared/types.js';

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new HttpError(401, 'Token requerido');
  let datos: UsuarioToken & { tipo?: string };
  try {
    datos = jwt.verify(token, env.JWT_SECRET) as UsuarioToken & { tipo?: string };
  } catch {
    throw new HttpError(401, 'Token inválido o expirado');
  }
  // El token de renovación solo sirve en /auth/refresh
  if (datos.tipo === 'refresh') throw new HttpError(401, 'Token inválido o expirado');
  req.usuario = { id: datos.id, idEmpleado: datos.idEmpleado, rol: datos.rol };
  next();
}
