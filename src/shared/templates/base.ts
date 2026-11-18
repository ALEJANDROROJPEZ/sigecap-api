// Estructura común de los correos. Las variables se escriben como {{nombre}} y se
// sustituyen al enviar; el administrador puede editar el asunto y el cuerpo desde el sistema.
export interface PlantillaPredeterminada {
  nombre: string;
  asunto: string;
  cuerpoHtml: string;
  variables: string[];
}

export const envolver = (titulo: string, contenido: string) => `
<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#1f2937">
  <div style="background:#611232;padding:16px 24px">
    <span style="color:#ffffff;font-size:16px;font-weight:bold;letter-spacing:.5px">SIGECAP · Capacitación CNBBBJ Oaxaca</span>
  </div>
  <div style="padding:24px;border:1px solid #e5e7eb;border-top:none">
    <h2 style="color:#611232;font-size:18px;margin:0 0 16px">${titulo}</h2>
    ${contenido}
    <p style="font-size:12px;color:#6b7280;margin-top:24px;border-top:1px solid #e5e7eb;padding-top:12px">
      Área de Capacitación · Coordinación de Representación Estatal en Oaxaca.<br>
      Este mensaje se generó automáticamente; no es necesario responderlo.
    </p>
  </div>
</div>`.trim();

export const boton = (href: string, texto: string) =>
  `<p style="margin:20px 0"><a href="${href}" style="background:#611232;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:6px;font-weight:bold;display:inline-block">${texto}</a></p>`;
