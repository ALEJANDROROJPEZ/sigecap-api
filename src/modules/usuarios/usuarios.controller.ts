import type { Request, Response } from 'express';
import * as service from './usuarios.service.js';
import { registrarBitacora } from '../../middlewares/bitacora.js';
import type { ListarUsuarios } from './usuarios.schemas.js';

export async function listar(req: Request, res: Response) {
  res.json(await service.listar(req.query as unknown as ListarUsuarios));
}

export async function crear(req: Request, res: Response) {
  const cuenta = await service.crear(req.body);
  await registrarBitacora(req, {
    accion: 'CREAR', entidad: 'usuario', idEntidad: cuenta.id, despues: { idEmpleado: cuenta.idEmpleado, rol: cuenta.rol },
  });
  res.status(201).json(cuenta);
}

export async function crearFaltantes(req: Request, res: Response) {
  const resultado = await service.crearFaltantes();
  await registrarBitacora(req, { accion: 'CREAR_MASIVO', entidad: 'usuario', despues: { creadas: resultado.creadas } });
  res.status(201).json(resultado);
}

export async function actualizar(req: Request, res: Response) {
  const id = Number(req.params.id);
  const { antes, despues } = await service.actualizar(id, req.body, req.usuario!.id);
  await registrarBitacora(req, { accion: 'ACTUALIZAR', entidad: 'usuario', idEntidad: id, antes, despues });
  res.json({ id, ...despues });
}

export async function restablecer(req: Request, res: Response) {
  const id = Number(req.params.id);
  const resultado = await service.restablecer(id);
  await registrarBitacora(req, { accion: 'RESTABLECER_CONTRASENA', entidad: 'usuario', idEntidad: id });
  res.json(resultado);
}
