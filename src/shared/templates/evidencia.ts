import { boton, envolver, type PlantillaPredeterminada } from './base.js';

export const plantillaEvidenciaAprobada: PlantillaPredeterminada = {
  nombre: 'EVIDENCIA_APROBADA',
  asunto: 'Constancia aprobada: {{curso}}',
  variables: ['nombre', 'curso', 'comentario', 'urlSistema'],
  cuerpoHtml: envolver('Tu constancia fue aprobada', `
    <p>Hola {{nombre}}:</p>
    <p>La constancia que subiste del curso <strong>{{curso}}</strong> fue revisada y <strong>aprobada</strong>. El curso ya aparece como completado en tu historial.</p>
    <p>{{comentario}}</p>
    ${boton('{{urlSistema}}', 'Ver mis cursos')}`),
};

export const plantillaEvidenciaRechazada: PlantillaPredeterminada = {
  nombre: 'EVIDENCIA_RECHAZADA',
  asunto: 'Constancia rechazada: {{curso}}',
  variables: ['nombre', 'curso', 'comentario', 'urlSistema'],
  cuerpoHtml: envolver('Tu constancia necesita corrección', `
    <p>Hola {{nombre}}:</p>
    <p>La constancia que subiste del curso <strong>{{curso}}</strong> fue <strong>rechazada</strong>.</p>
    <p>Motivo: <em>{{comentario}}</em></p>
    <p>Corrige lo indicado y vuelve a subirla desde la sección «Mis cursos».</p>
    ${boton('{{urlSistema}}', 'Reenviar constancia')}`),
};
