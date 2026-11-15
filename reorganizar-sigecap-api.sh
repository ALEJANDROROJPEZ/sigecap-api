#!/usr/bin/env bash
# =====================================================================
#  reorganizar-sigecap-api.sh
#  Deja un proyecto sigecap-api ya creado con la misma estructura de la
#  Figura 22 del reporte:
#    - prisma.config.ts      ->  .config/prisma.ts (archivo oculto)
#    - src/generated/        ->  src/config/prisma-client/ (cliente de BD)
#    - prisma/sql/checks.sql ->  migración versionada prisma/migrations/*_restricciones
#  Uso (dentro de la carpeta sigecap-api):   bash reorganizar-sigecap-api.sh
# =====================================================================
set -euo pipefail

[ -f package.json ] && grep -q '"name": "sigecap-api"' package.json || { echo "ERROR: ejecuta este script dentro de la carpeta sigecap-api."; exit 1; }

echo "==> 1/6 Configuración de Prisma en .config/prisma.ts"
mkdir -p .config
if [ -f prisma.config.ts ]; then
  sed -e "s#schema: 'prisma/schema.prisma',#schema: '../prisma/schema.prisma',          // rutas relativas a este archivo#" \
      -e "s#path: 'prisma/migrations',#path: '../prisma/migrations',#" prisma.config.ts > .config/prisma.ts
  rm prisma.config.ts
fi
grep -q "../prisma/schema.prisma" .config/prisma.ts || { echo "ERROR: revisa .config/prisma.ts"; exit 1; }

echo "==> 2/6 Cliente de Prisma dentro de src/config/prisma-client"
sed -i 's#output   = "../src/generated/prisma"#output   = "../src/config/prisma-client"#' prisma/schema.prisma
sed -i "s#'../generated/prisma/client.js'#'./prisma-client/client.js'#" src/config/prisma.ts
sed -i "s#'../src/generated/prisma/client.js'#'../src/config/prisma-client/client.js'#" prisma/seed.ts
rm -rf src/generated
if grep -rl "generated/prisma" src prisma --include=*.ts --exclude-dir=prisma-client 2>/dev/null; then
  echo "AVISO: los archivos de arriba aún importan desde generated/prisma; cambia la ruta a src/config/prisma-client/client.js"
fi
sed -i 's#^src/generated/$#src/config/prisma-client/#' .gitignore
grep -q "^src/config/prisma-client/" .gitignore || echo "src/config/prisma-client/" >> .gitignore

echo "==> 3/6 Reglas CHECK como migración versionada"
cat > .config/restricciones.mjs <<'EOF'
// Crea las tablas (migración init) y agrega las reglas CHECK como una migración
// versionada «restricciones».  Uso: npm run db:init
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const DIR = 'prisma/migrations';
const run = (cmd) => execSync(cmd, { stdio: 'inherit' });
const migraciones = () =>
  fs.existsSync(DIR) ? fs.readdirSync(DIR).filter((f) => fs.statSync(path.join(DIR, f)).isDirectory()) : [];

// 1. Migración inicial con las tablas del modelo de datos
if (migraciones().length === 0) run('npx prisma migrate dev --name init');

// 2. Reglas que Prisma no expresa en schema.prisma
if (!migraciones().some((f) => f.endsWith('_restricciones'))) {
  const marca = new Date().toISOString().replace(/\D/g, '').slice(0, 14); // AAAAMMDDhhmmss (UTC)
  const carpeta = path.join(DIR, `${marca}_restricciones`);
  fs.mkdirSync(carpeta, { recursive: true });
  fs.writeFileSync(path.join(carpeta, 'migration.sql'), `-- Reglas de integridad que Prisma no expresa en el esquema
ALTER TABLE empleado DROP CONSTRAINT IF EXISTS chk_empleado_curp;
ALTER TABLE empleado ADD CONSTRAINT chk_empleado_curp
  CHECK (curp ~ '^[A-Z][AEIOUX][A-Z]{2}[0-9]{6}[HM][A-Z]{5}[A-Z0-9][0-9]$');

ALTER TABLE empleado DROP CONSTRAINT IF EXISTS chk_empleado_cupo;
ALTER TABLE empleado ADD CONSTRAINT chk_empleado_cupo CHECK (cupo ~ '^[0-9]{6}$');

-- Si existe correo institucional, son obligatorios el correo de respaldo y el teléfono
ALTER TABLE empleado DROP CONSTRAINT IF EXISTS chk_empleado_contacto;
ALTER TABLE empleado ADD CONSTRAINT chk_empleado_contacto
  CHECK (correo_institucional IS NULL OR (correo_respaldo IS NOT NULL AND telefono IS NOT NULL));

-- La fecha de conclusión «no posterior a hoy» se valida en la API
ALTER TABLE evidencia DROP CONSTRAINT IF EXISTS chk_evidencia_fechas;
ALTER TABLE evidencia ADD CONSTRAINT chk_evidencia_fechas CHECK (fecha_conclusion >= fecha_inicio_curso);

ALTER TABLE curso DROP CONSTRAINT IF EXISTS chk_curso_trimestre;
ALTER TABLE curso ADD CONSTRAINT chk_curso_trimestre CHECK (trimestre BETWEEN 1 AND 4);
`);
  console.log(`Migración creada: ${carpeta}`);
}

// 3. Aplicar las migraciones pendientes
run('npx prisma migrate deploy');
EOF
rm -rf prisma/sql
npm pkg delete scripts.db:checks
npm pkg set scripts.db:init="node .config/restricciones.mjs"

echo "==> 4/6 Generando el cliente de Prisma"
npx prisma generate >/dev/null

echo "==> 5/6 Verificando que el proyecto compila"
npx tsc --noEmit

echo "==> 6/6 Migraciones (tablas y reglas CHECK)"
if npm run --silent db:init; then
  BD_OK=1
else
  BD_OK=0
  echo "AVISO: no se pudieron aplicar las migraciones. Revisa DATABASE_URL en .env y ejecuta después: npm run db:init"
fi

if [ -d .git ]; then git add -A && git commit -qm "Estructura igual a la Figura 22 del reporte" 2>/dev/null || true; fi

# ---------- Verificación de la estructura (igual a la Figura 22 del reporte) --
mostrar_estructura () {
  local faltan=0
  for p in prisma/schema.prisma prisma/migrations prisma/seed.ts \
           src/config src/middlewares src/modules/auth src/modules/empleados src/modules/cursos \
           src/modules/asignaciones src/modules/evidencias src/modules/notificaciones src/modules/reportes \
           src/shared src/sockets src/docs src/app.ts src/server.ts uploads .env.example package.json tsconfig.json; do
    [ -e "$p" ] || { echo "  FALTA: $p"; faltan=1; }
  done
  for p in prisma.config.ts prisma/sql src/generated; do
    [ -e "$p" ] && { echo "  SOBRA: $p"; faltan=1; }
  done
  cat <<'ARBOL'
sigecap-api/
├── prisma/
│   ├── schema.prisma          # modelo de datos
│   ├── migrations/            # migraciones versionadas
│   └── seed.ts                # catálogos iniciales
├── src/
│   ├── config/                # variables de entorno, BD, SMTP
│   ├── middlewares/           # auth JWT, roles, validación, bitácora, errores
│   ├── modules/
│   │   ├── auth/              # routes · controller · service · schemas
│   │   ├── empleados/
│   │   ├── cursos/
│   │   ├── asignaciones/
│   │   ├── evidencias/
│   │   ├── notificaciones/
│   │   └── reportes/
│   ├── shared/                # utilidades, tipos, plantillas de correo
│   ├── sockets/               # servidor Socket.IO
│   ├── docs/                  # especificación OpenAPI
│   ├── app.ts
│   └── server.ts
├── uploads/                   # constancias PDF (fuera del control de versiones)
├── .env.example
├── package.json
└── tsconfig.json
ARBOL
  [ "$faltan" = 0 ] && echo "Estructura verificada: coincide con el árbol." || echo "Revisa los elementos marcados arriba."
}

echo
mostrar_estructura
echo
if [ "$BD_OK" = 1 ]; then
  echo "Siguiente paso: npm run db:seed   y luego   npm run dev"
fi
