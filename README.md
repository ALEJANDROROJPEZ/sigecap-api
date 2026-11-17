# sigecap-api

API REST de SIGECAP, el sistema de gestión de cursos de capacitación de la CNBBBJ en Oaxaca.
Node.js + Express 5 + TypeScript + Prisma + PostgreSQL.

## Puesta en marcha

```bash
npm install                 # instala las dependencias (incluye exceljs y pdfkit para los reportes)
cp .env.example .env        # solo la primera vez; después edita los valores
npm run db:init             # crea las tablas y las reglas CHECK (solo la primera vez)
npm run db:seed             # roles, catálogos base, plantillas de correo y administrador inicial
npm run dev                 # http://localhost:3000/api/v1
```

La documentación de todos los servicios está en `http://localhost:3000/api/v1/docs` (Swagger).

Variables de `.env` que conviene revisar:

| Variable | Para qué sirve |
| --- | --- |
| `DATABASE_URL` | Conexión a PostgreSQL. |
| `JWT_SECRET` | Firma de los tokens (mínimo 32 caracteres; `openssl rand -hex 32`). |
| `JWT_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN` | Vigencia del token de acceso (15 min) y del de renovación (7 días). |
| `CORS_ORIGIN` | Dirección del frontend. Acepta varias separadas por coma. |
| `APP_URL` | Dirección del frontend que aparece en los enlaces de los correos. Si falta, se usa `CORS_ORIGIN`. |
| `SMTP_*`, `MAIL_FROM` | Servidor de correo para los avisos. Se prueba desde la pantalla «Correos». |
| `UPLOAD_DIR`, `MAX_UPLOAD_MB` | Carpeta de las constancias y tamaño máximo del PDF (5 MB). |

## Módulos

| Carpeta en `src/modules` | Rutas | Qué hace |
| --- | --- | --- |
| `auth` | `/auth` | Inicio de sesión con correo institucional o CURP, renovación de token, recuperación de contraseña, perfil, datos de contacto y tema. |
| `usuarios` | `/usuarios` | Cuentas y roles: crear cuenta, alta masiva, cambio de rol, activar o desactivar, contraseña temporal. |
| `catalogos` | `/catalogos` | Sedes (ORE/SARE), áreas, dependencias y temas del Comité de Ética. |
| `empleados` | `/empleados` | Padrón, baja lógica, plantilla e importación desde Excel con vista previa de errores. |
| `cursos` | `/cursos`, `/mis-cursos` | Catálogo de cursos y vista del empleado. |
| `asignaciones` | `/asignaciones` | Asignación por sedes o general y envío de correos. |
| `correos` | `/correos` | Plantillas configurables, historial de envíos y prueba SMTP. |
| `evidencias` | `/evidencias` | Carga de constancias en PDF, visor y dictamen. |
| `notificaciones` | `/notificaciones` | Notificaciones por usuario; las nuevas se emiten por Socket.IO (`notificacion:nueva`). |
| `reportes` | `/reportes` | Dashboard, personal con pendientes y exportación a Excel, PDF y CSV. |
| `bitacora` | `/bitacora` | Consulta de la bitácora de auditoría. |

Cada módulo tiene sus archivos `*.routes.ts` (rutas y permisos), `*.schemas.ts` (validación con Zod),
`*.controller.ts` (petición y bitácora) y `*.service.ts` (reglas de negocio y base de datos).

## Reglas de negocio que vale la pena conocer

- Todo usuario es un empleado. El rol (`ADMINISTRADOR` o `EMPLEADO`) se verifica en cada ruta.
- Al asignar un curso se crea el seguimiento (`curso_empleado`) de cada empleado activo al que le aplica
  según su tipo de contratación. Quien llega después a la sede lo recibe mientras el curso siga vigente.
- Un curso solo admite una constancia en revisión a la vez. Al rechazarla el comentario es obligatorio y
  el empleado puede reenviarla.
- Los PDF se guardan en `UPLOAD_DIR/evidencias/<año>/` con nombre aleatorio y solo los entrega la API al
  administrador o al propietario.
- El Concentrado de constancias y el Formulario del Comité de Ética se calculan con las constancias
  aprobadas: fecha de conclusión, «NO APLICA» por tipo de contratación y «Falta Curso» en lo demás.

## Notas

- `npm audit` reporta avisos de severidad moderada en dependencias de `exceljs`. No hay versión
  corregida de esa biblioteca; conviene revisarlo de nuevo antes del despliegue.
- Al arrancar puede aparecer una vez el aviso `DeprecationWarning: Calling client.query()…`. Proviene del
  adaptador de Prisma para PostgreSQL y no afecta el funcionamiento.
- Pendiente para la etapa de pruebas: pruebas unitarias y de integración automatizadas.
