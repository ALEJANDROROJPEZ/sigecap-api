import type { Request, Response, NextFunction } from 'express';
import { HttpError } from '../shared/http-error.js';
import type { RolNombre } from '../shared/types.js';

export const requireRole = (...roles: RolNombre[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.usuario) throw new HttpError(401, 'No autenticado');
    if (!roles.includes(req.usuario.rol)) throw new HttpError(403, 'No tienes permiso para esta acción');
    next();
  };
