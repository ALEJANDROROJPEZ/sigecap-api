import type { Request, Response } from 'express';
import * as service from './catalogos.service.js';
import { registrarBitacora } from '../../middlewares/bitacora.js';

export async function todos(_req: Request, res: Response) {
  res.json(await service.todos());
}

export const crear = (catalogo: service.Catalogo) => async (req: Request, res: Response) => {
  const tabla = service.tablas[catalogo];
  const registro = await tabla.crear(req.body as never);
  await registrarBitacora(req, { accion: 'CREAR', entidad: tabla.entidad, idEntidad: registro.id, despues: registro });
  res.status(201).json(registro);
};

export const actualizar = (catalogo: service.Catalogo) => async (req: Request, res: Response) => {
  const tabla = service.tablas[catalogo];
  const id = Number(req.params.id);
  const registro = await tabla.actualizar(id, req.body as never);
  await registrarBitacora(req, { accion: 'ACTUALIZAR', entidad: tabla.entidad, idEntidad: id, despues: registro });
  res.json(registro);
};
