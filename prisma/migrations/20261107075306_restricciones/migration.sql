-- Reglas de integridad que Prisma no expresa en el esquema
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
