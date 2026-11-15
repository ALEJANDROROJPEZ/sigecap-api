export function plantillaAsignacion(nombre: string, curso: string, fechaLimite?: string, url?: string) {
  return `
  <div style="font-family:Arial,sans-serif;max-width:560px">
    <h2 style="color:#1F3864">Nuevo curso asignado</h2>
    <p>Hola ${nombre}:</p>
    <p>Se te asignó el curso <strong>${curso}</strong>.</p>
    ${fechaLimite ? `<p>Fecha límite para entregar tu constancia: <strong>${fechaLimite}</strong>.</p>` : ''}
    ${url ? `<p><a href="${url}">Ir a la plataforma del curso</a></p>` : ''}
    <p>Área de Capacitación · CNBBBJ Oaxaca</p>
  </div>`;
}
