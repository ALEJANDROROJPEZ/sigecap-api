import type { Request, Response } from 'express';
import * as service from './empleados.service.js';
import { registrarBitacora } from '../../middlewares/bitacora.js';

export async function listar(req: Request, res: Response) {
  const { buscar, pagina, porPagina } = req.query as unknown as { buscar?: string; pagina: number; porPagina: number };
  res.json(await service.listar(buscar, pagina, porPagina));
}

export async function obtener(req: Request, res: Response) {
  res.json(await service.obtener(Number(req.params.id)));
}

export async function crear(req: Request, res: Response) {
  const empleado = await service.crear(req.body);
  await registrarBitacora(req, { accion: 'CREAR', entidad: 'empleado', idEntidad: empleado.id, despues: empleado });
  res.status(201).json(empleado);
}

export async function actualizar(req: Request, res: Response) {
  const id = Number(req.params.id);
  const antes = await service.obtener(id);
  const empleado = await service.actualizar(id, req.body);
  await registrarBitacora(req, { accion: 'ACTUALIZAR', entidad: 'empleado', idEntidad: id, antes, despues: empleado });
  res.json(empleado);
}

export async function darDeBaja(req: Request, res: Response) {
  const id = Number(req.params.id);
  await service.darDeBaja(id);
  await registrarBitacora(req, { accion: 'BAJA', entidad: 'empleado', idEntidad: id });
  res.status(204).end();
}
