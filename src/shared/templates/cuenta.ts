import { boton, envolver, type PlantillaPredeterminada } from './base.js';

export const plantillaRecuperacion: PlantillaPredeterminada = {
  nombre: 'RECUPERACION',
  asunto: 'Restablece tu contraseña de SIGECAP',
  variables: ['nombre', 'enlace', 'vigencia'],
  cuerpoHtml: envolver('Restablecer contraseña', `
    <p>Hola {{nombre}}:</p>
    <p>Recibimos una solicitud para restablecer tu contraseña. El siguiente enlace es válido durante {{vigencia}} y solo puede usarse una vez.</p>
    ${boton('{{enlace}}', 'Crear nueva contraseña')}
    <p>Si no solicitaste este cambio, ignora este correo; tu contraseña actual seguirá funcionando.</p>`),
};

export const plantillaBienvenida: PlantillaPredeterminada = {
  nombre: 'BIENVENIDA',
  asunto: 'Tu cuenta de SIGECAP está lista',
  variables: ['nombre', 'identificador', 'enlace', 'vigencia'],
  cuerpoHtml: envolver('Bienvenida a SIGECAP', `
    <p>Hola {{nombre}}:</p>
    <p>El Área de Capacitación creó tu cuenta en el sistema de gestión de cursos. Inicia sesión con: <strong>{{identificador}}</strong>.</p>
    <p>Antes de entrar, define tu contraseña con el siguiente enlace (válido durante {{vigencia}}):</p>
    ${boton('{{enlace}}', 'Definir mi contraseña')}`),
};
