export class HttpError extends Error {
  constructor(public status: number, message: string, public detalles?: unknown) {
    super(message);
  }
}
export const noEncontrado = (que = 'Recurso') => new HttpError(404, `${que} no encontrado`);
