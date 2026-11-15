import type { Request, Response, NextFunction } from 'express';
import type { ZodType } from 'zod';

type Parte = 'body' | 'query' | 'params';

// Valida y normaliza la parte indicada de la petición con un esquema Zod
export const validate = (schema: ZodType, parte: Parte = 'body') =>
  (req: Request, _res: Response, next: NextFunction) => {
    const datos = schema.parse(req[parte]);
    if (parte === 'body') req.body = datos;
    else Object.defineProperty(req, parte, { value: datos, writable: true });
    next();
  };
