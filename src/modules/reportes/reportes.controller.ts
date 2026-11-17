import type { Request, Response } from 'express';
import * as service from './reportes.service.js';
import { exportar as generar } from './reportes.exportar.js';
import { registrarBitacora } from '../../middlewares/bitacora.js';
import type { Exportar, Filtros } from './reportes.schemas.js';

export async function dashboard(req: Request, res: Response) {
  res.json(await service.dashboard(req.query as unknown as Filtros));
}

export async function rezagados(req: Request, res: Response) {
  const { pagina, porPagina, ...filtros } = req.query as unknown as Filtros & { pagina: number; porPagina: number };
  const todos = await service.rezagados(filtros);
  res.json({ total: todos.length, pagina, porPagina, datos: todos.slice((pagina - 1) * porPagina, pagina * porPagina) });
}

export async function exportar(req: Request, res: Response) {
  const parametros = req.query as unknown as Exportar;
  const { contenido, nombre, mime } = await generar(parametros);
  await registrarBitacora(req, { accion: 'EXPORTAR', entidad: 'reporte', despues: parametros });
  res.attachment(nombre).type(mime).send(contenido);
}
