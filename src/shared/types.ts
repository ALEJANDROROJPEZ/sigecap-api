export type RolNombre = 'ADMINISTRADOR' | 'EMPLEADO';

export interface UsuarioToken {
  id: number;          // id_usuario
  idEmpleado: number;
  rol: RolNombre;
}

export interface Paginado<T> {
  total: number;
  pagina: number;
  porPagina: number;
  datos: T[];
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      usuario?: UsuarioToken;
    }
  }
}
