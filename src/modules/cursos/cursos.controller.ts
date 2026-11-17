import type { Request, Response } from 'express';
import * as service from './cursos.service.js';
import { registrarBitacora } from '../../middlewares/bitacora.js';
import type { ListarCursos } from './cursos.schemas.js';

export async function listar(req: Request, res: Response) {
  res.json(await service.listar(req.query as unknown as ListarCursos));
}

export async function anios(_req: Request, res: Response) {
  res.json(await service.anios());
}

export async function obtener(req: Request, res: Response) {
  res.json(await service.obtener(Number(req.params.id)));
}

export async function crear(req: Request, res: Response) {
  const curso = await service.crear(req.body);
  await registrarBitacora(req, { accion: 'CREAR', entidad: 'curso', idEntidad: curso.id, despues: curso });
  res.status(201).json(curso);
}

export async function actualizar(req: Request, res: Response) {
  const id = Number(req.params.id);
  const antes = await service.obtener(id);
  const curso = await service.actualizar(id, req.body);
  await registrarBitacora(req, { accion: 'ACTUALIZAR', entidad: 'curso', idEntidad: id, antes, despues: curso });
  res.json(curso);
}

export async function cambiarEstado(req: Request, res: Response) {
  const id = Number(req.params.id);
  const curso = await service.cambiarEstado(id, req.body.activo);
  await registrarBitacora(req, { accion: req.body.activo ? 'REACTIVAR' : 'BAJA', entidad: 'curso', idEntidad: id });
  res.json(curso);
}

// ---------- Vista del empleado ----------
export async function misCursos(req: Request, res: Response) {
  const { estado } = req.query as { estado?: 'PENDIENTE' | 'EN_REVISION' | 'COMPLETADO' | 'RECHAZADO' };
  res.json(await service.misCursos(req.usuario!.idEmpleado, estado));
}

export async function catalogoHistorico(req: Request, res: Response) {
  res.json(await service.catalogoHistorico(req.usuario!.idEmpleado));
}
