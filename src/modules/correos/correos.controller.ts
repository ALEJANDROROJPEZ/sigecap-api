import type { Request, Response } from 'express';
import * as service from './correos.service.js';
import { registrarBitacora } from '../../middlewares/bitacora.js';

export async function listarPlantillas(_req: Request, res: Response) {
  res.json(await service.listarPlantillas());
}

export async function actualizarPlantilla(req: Request, res: Response) {
  const id = Number(req.params.id);
  const plantilla = await service.actualizarPlantilla(id, req.body);
  await registrarBitacora(req, { accion: 'ACTUALIZAR', entidad: 'plantilla_correo', idEntidad: id, despues: { asunto: plantilla.asunto } });
  res.json(plantilla);
}

export async function restaurarPlantilla(req: Request, res: Response) {
  const id = Number(req.params.id);
  const plantilla = await service.restaurarPlantilla(id);
  await registrarBitacora(req, { accion: 'RESTAURAR', entidad: 'plantilla_correo', idEntidad: id });
  res.json(plantilla);
}

export async function listarEnvios(req: Request, res: Response) {
  const { pagina, porPagina } = req.query as unknown as { pagina: number; porPagina: number };
  res.json(await service.listarEnvios(pagina, porPagina));
}

export async function probar(req: Request, res: Response) {
  res.json(await service.probar(req.body.para));
}
