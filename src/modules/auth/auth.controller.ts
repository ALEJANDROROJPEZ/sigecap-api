import type { Request, Response } from 'express';
import * as service from './auth.service.js';
import { registrarBitacora } from '../../middlewares/bitacora.js';

export async function login(req: Request, res: Response) {
  const resultado = await service.login(req.body);
  req.usuario = resultado.usuario;
  await registrarBitacora(req, { accion: 'LOGIN', entidad: 'usuario', idEntidad: resultado.usuario.id });
  res.json(resultado);
}

export function perfil(req: Request, res: Response) {
  res.json(req.usuario);
}
