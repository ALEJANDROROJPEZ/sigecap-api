import type { Request, Response } from 'express';
import * as service from './empleados.service.js';
import * as importacion from './empleados.importar.js';
import { registrarBitacora } from '../../middlewares/bitacora.js';
import { HttpError } from '../../shared/http-error.js';
import type { ListarEmpleados } from './empleados.schemas.js';

export async function listar(req: Request, res: Response) {
  res.json(await service.listar(req.query as unknown as ListarEmpleados));
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
  const { cursos: _cursos, ...antes } = await service.obtener(id);
  const empleado = await service.actualizar(id, req.body);
  await registrarBitacora(req, { accion: 'ACTUALIZAR', entidad: 'empleado', idEntidad: id, antes, despues: empleado });
  res.json(empleado);
}

export async function cambiarEstado(req: Request, res: Response) {
  const id = Number(req.params.id);
  const activo = req.method === 'DELETE' ? false : Boolean(req.body.activo);
  const empleado = await service.cambiarEstado(id, activo);
  await registrarBitacora(req, { accion: activo ? 'REACTIVAR' : 'BAJA', entidad: 'empleado', idEntidad: id });
  if (req.method === 'DELETE') res.status(204).end();
  else res.json(empleado);
}

export async function importar(req: Request, res: Response) {
  if (!req.file) throw new HttpError(400, 'Adjunta el archivo de Excel en el campo «archivo»');
  const confirmar = (req.query as unknown as { confirmar?: boolean }).confirmar === true;
  const { idsNuevos: _ids, ...resultado } = await importacion.importar(req.file.buffer, confirmar);
  if (confirmar) {
    await registrarBitacora(req, {
      accion: 'IMPORTAR', entidad: 'empleado',
      despues: { archivo: req.file.originalname, nuevos: resultado.nuevos, actualizaciones: resultado.actualizaciones, errores: resultado.errores.length },
    });
  }
  res.json(resultado);
}

export async function plantilla(_req: Request, res: Response) {
  res.attachment('plantilla_empleados.xlsx').type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    .send(await importacion.plantilla());
}
