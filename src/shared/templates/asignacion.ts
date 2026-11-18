import { boton, envolver, type PlantillaPredeterminada } from './base.js';

export const plantillaAsignacion: PlantillaPredeterminada = {
  nombre: 'ASIGNACION',
  asunto: 'Nuevo curso asignado: {{curso}}',
  variables: ['nombre', 'curso', 'dependencia', 'trimestre', 'fechaLimite', 'urlCurso', 'urlSistema'],
  cuerpoHtml: envolver('Nuevo curso asignado', `
    <p>Hola {{nombre}}:</p>
    <p>Se te asignó el curso <strong>{{curso}}</strong>, impartido por {{dependencia}} ({{trimestre}}).</p>
    <p>Fecha límite para entregar tu constancia: <strong>{{fechaLimite}}</strong>.</p>
    <p>Plataforma del curso: {{urlCurso}}</p>
    <p>Al concluirlo, sube tu constancia en PDF desde la sección «Mis cursos».</p>
    ${boton('{{urlSistema}}', 'Ir a SIGECAP')}`),
};
