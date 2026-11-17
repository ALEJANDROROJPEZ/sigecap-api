import { plantillaAsignacion } from './asignacion.js';
import { plantillaEvidenciaAprobada, plantillaEvidenciaRechazada } from './evidencia.js';
import { plantillaBienvenida, plantillaRecuperacion } from './cuenta.js';
import type { PlantillaPredeterminada } from './base.js';

export type NombrePlantilla = 'ASIGNACION' | 'EVIDENCIA_APROBADA' | 'EVIDENCIA_RECHAZADA' | 'RECUPERACION' | 'BIENVENIDA';

export const PLANTILLAS: Record<NombrePlantilla, PlantillaPredeterminada> = {
  ASIGNACION: plantillaAsignacion,
  EVIDENCIA_APROBADA: plantillaEvidenciaAprobada,
  EVIDENCIA_RECHAZADA: plantillaEvidenciaRechazada,
  RECUPERACION: plantillaRecuperacion,
  BIENVENIDA: plantillaBienvenida,
};

const escapar = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Sustituye {{variable}} por su valor (escapado para HTML). Las variables sin valor quedan vacías.
export function renderizar(texto: string, variables: Record<string, string | null | undefined>, html = true) {
  return texto.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, clave: string) => {
    const valor = variables[clave] ?? '';
    return html ? escapar(String(valor)) : String(valor);
  });
}
