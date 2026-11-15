-- CreateEnum
CREATE TYPE "TipoSede" AS ENUM ('ORE', 'SARE');

-- CreateEnum
CREATE TYPE "TipoContratacion" AS ENUM ('ESTRUCTURA', 'HONORARIOS');

-- CreateEnum
CREATE TYPE "TemaInterfaz" AS ENUM ('CLARO', 'OSCURO');

-- CreateEnum
CREATE TYPE "EstadoCursoEmpleado" AS ENUM ('PENDIENTE', 'EN_REVISION', 'COMPLETADO', 'RECHAZADO');

-- CreateEnum
CREATE TYPE "OrigenRegistro" AS ENUM ('ASIGNACION', 'HISTORICO');

-- CreateEnum
CREATE TYPE "EstadoEvidencia" AS ENUM ('EN_REVISION', 'APROBADA', 'RECHAZADA');

-- CreateEnum
CREATE TYPE "EstadoEnvio" AS ENUM ('PENDIENTE', 'ENVIADO', 'ERROR');

-- CreateTable
CREATE TABLE "rol" (
    "id_rol" SERIAL NOT NULL,
    "nombre" VARCHAR(30) NOT NULL,
    "descripcion" VARCHAR(150),

    CONSTRAINT "rol_pkey" PRIMARY KEY ("id_rol")
);

-- CreateTable
CREATE TABLE "usuario" (
    "id_usuario" SERIAL NOT NULL,
    "id_rol" INTEGER NOT NULL,
    "id_empleado" INTEGER NOT NULL,
    "contrasena_hash" VARCHAR(100) NOT NULL,
    "tema_interfaz" "TemaInterfaz" NOT NULL DEFAULT 'CLARO',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "ultimo_acceso" TIMESTAMP(3),

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id_usuario")
);

-- CreateTable
CREATE TABLE "token_recuperacion" (
    "id_token" SERIAL NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "token_hash" VARCHAR(100) NOT NULL,
    "expira_en" TIMESTAMP(3) NOT NULL,
    "usado" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "token_recuperacion_pkey" PRIMARY KEY ("id_token")
);

-- CreateTable
CREATE TABLE "sede" (
    "id_sede" SERIAL NOT NULL,
    "clave" VARCHAR(20) NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "tipo" "TipoSede" NOT NULL,

    CONSTRAINT "sede_pkey" PRIMARY KEY ("id_sede")
);

-- CreateTable
CREATE TABLE "area" (
    "id_area" SERIAL NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,

    CONSTRAINT "area_pkey" PRIMARY KEY ("id_area")
);

-- CreateTable
CREATE TABLE "empleado" (
    "id_empleado" SERIAL NOT NULL,
    "cupo" CHAR(6) NOT NULL,
    "curp" CHAR(18) NOT NULL,
    "num_trabajador_rusp" VARCHAR(20),
    "tipo_contratacion" "TipoContratacion" NOT NULL,
    "nombre" VARCHAR(80) NOT NULL,
    "apellido_paterno" VARCHAR(60) NOT NULL,
    "apellido_materno" VARCHAR(60),
    "correo_institucional" VARCHAR(120),
    "correo_respaldo" VARCHAR(120),
    "telefono" VARCHAR(10),
    "puesto" VARCHAR(120) NOT NULL,
    "id_area" INTEGER NOT NULL,
    "id_sede" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "empleado_pkey" PRIMARY KEY ("id_empleado")
);

-- CreateTable
CREATE TABLE "dependencia" (
    "id_dependencia" SERIAL NOT NULL,
    "siglas" VARCHAR(30) NOT NULL,
    "nombre" VARCHAR(200) NOT NULL,

    CONSTRAINT "dependencia_pkey" PRIMARY KEY ("id_dependencia")
);

-- CreateTable
CREATE TABLE "tema_etica" (
    "id_tema_etica" SERIAL NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "descripcion" VARCHAR(250) NOT NULL,

    CONSTRAINT "tema_etica_pkey" PRIMARY KEY ("id_tema_etica")
);

-- CreateTable
CREATE TABLE "curso" (
    "id_curso" SERIAL NOT NULL,
    "id_dependencia" INTEGER NOT NULL,
    "id_tema_etica" INTEGER,
    "nombre" VARCHAR(250) NOT NULL,
    "nombre_corto" VARCHAR(80),
    "orden_reporte" INTEGER,
    "aplica_estructura" BOOLEAN NOT NULL DEFAULT true,
    "aplica_honorarios" BOOLEAN NOT NULL DEFAULT true,
    "descripcion" TEXT,
    "trimestre" SMALLINT NOT NULL,
    "anio" SMALLINT NOT NULL,
    "fecha_inicio" DATE,
    "fecha_limite_registro" DATE,
    "fecha_entrega_constancia" DATE,
    "url_plataforma" VARCHAR(300),
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "curso_pkey" PRIMARY KEY ("id_curso")
);

-- CreateTable
CREATE TABLE "asignacion" (
    "id_asignacion" SERIAL NOT NULL,
    "id_curso" INTEGER NOT NULL,
    "id_sede" INTEGER,
    "es_general" BOOLEAN NOT NULL DEFAULT false,
    "asignado_por" INTEGER NOT NULL,
    "fecha_asignacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "asignacion_pkey" PRIMARY KEY ("id_asignacion")
);

-- CreateTable
CREATE TABLE "curso_empleado" (
    "id_curso_empleado" SERIAL NOT NULL,
    "id_curso" INTEGER NOT NULL,
    "id_asignacion" INTEGER,
    "id_empleado" INTEGER NOT NULL,
    "estado" "EstadoCursoEmpleado" NOT NULL DEFAULT 'PENDIENTE',
    "origen" "OrigenRegistro" NOT NULL DEFAULT 'ASIGNACION',

    CONSTRAINT "curso_empleado_pkey" PRIMARY KEY ("id_curso_empleado")
);

-- CreateTable
CREATE TABLE "evidencia" (
    "id_evidencia" SERIAL NOT NULL,
    "id_curso_empleado" INTEGER NOT NULL,
    "nombre_archivo" VARCHAR(255) NOT NULL,
    "ruta_archivo" VARCHAR(255) NOT NULL,
    "tamano_bytes" INTEGER NOT NULL,
    "fecha_inicio_curso" DATE NOT NULL,
    "fecha_conclusion" DATE NOT NULL,
    "estado" "EstadoEvidencia" NOT NULL DEFAULT 'EN_REVISION',
    "comentario_revision" TEXT,
    "revisado_por" INTEGER,
    "fecha_subida" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_revision" TIMESTAMP(3),

    CONSTRAINT "evidencia_pkey" PRIMARY KEY ("id_evidencia")
);

-- CreateTable
CREATE TABLE "notificacion" (
    "id_notificacion" SERIAL NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "tipo" VARCHAR(40) NOT NULL,
    "titulo" VARCHAR(150) NOT NULL,
    "mensaje" TEXT NOT NULL,
    "leida" BOOLEAN NOT NULL DEFAULT false,
    "creada_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificacion_pkey" PRIMARY KEY ("id_notificacion")
);

-- CreateTable
CREATE TABLE "plantilla_correo" (
    "id_plantilla" SERIAL NOT NULL,
    "nombre" VARCHAR(60) NOT NULL,
    "asunto" VARCHAR(200) NOT NULL,
    "cuerpo_html" TEXT NOT NULL,

    CONSTRAINT "plantilla_correo_pkey" PRIMARY KEY ("id_plantilla")
);

-- CreateTable
CREATE TABLE "envio_correo" (
    "id_envio" SERIAL NOT NULL,
    "id_plantilla" INTEGER NOT NULL,
    "id_asignacion" INTEGER,
    "total_destinatarios" INTEGER NOT NULL,
    "estado" "EstadoEnvio" NOT NULL DEFAULT 'PENDIENTE',
    "fecha_envio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "envio_correo_pkey" PRIMARY KEY ("id_envio")
);

-- CreateTable
CREATE TABLE "bitacora" (
    "id_bitacora" SERIAL NOT NULL,
    "id_usuario" INTEGER,
    "accion" VARCHAR(40) NOT NULL,
    "entidad" VARCHAR(40) NOT NULL,
    "id_entidad" INTEGER,
    "datos_anteriores" JSONB,
    "datos_nuevos" JSONB,
    "ip_origen" VARCHAR(45),
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bitacora_pkey" PRIMARY KEY ("id_bitacora")
);

-- CreateIndex
CREATE UNIQUE INDEX "rol_nombre_key" ON "rol"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_id_empleado_key" ON "usuario"("id_empleado");

-- CreateIndex
CREATE UNIQUE INDEX "sede_clave_key" ON "sede"("clave");

-- CreateIndex
CREATE UNIQUE INDEX "area_nombre_key" ON "area"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "empleado_cupo_key" ON "empleado"("cupo");

-- CreateIndex
CREATE UNIQUE INDEX "empleado_curp_key" ON "empleado"("curp");

-- CreateIndex
CREATE UNIQUE INDEX "empleado_correo_institucional_key" ON "empleado"("correo_institucional");

-- CreateIndex
CREATE UNIQUE INDEX "dependencia_siglas_key" ON "dependencia"("siglas");

-- CreateIndex
CREATE UNIQUE INDEX "tema_etica_codigo_key" ON "tema_etica"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "curso_empleado_id_curso_id_empleado_key" ON "curso_empleado"("id_curso", "id_empleado");

-- CreateIndex
CREATE UNIQUE INDEX "evidencia_ruta_archivo_key" ON "evidencia"("ruta_archivo");

-- CreateIndex
CREATE UNIQUE INDEX "plantilla_correo_nombre_key" ON "plantilla_correo"("nombre");

-- AddForeignKey
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_id_rol_fkey" FOREIGN KEY ("id_rol") REFERENCES "rol"("id_rol") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_id_empleado_fkey" FOREIGN KEY ("id_empleado") REFERENCES "empleado"("id_empleado") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "token_recuperacion" ADD CONSTRAINT "token_recuperacion_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empleado" ADD CONSTRAINT "empleado_id_area_fkey" FOREIGN KEY ("id_area") REFERENCES "area"("id_area") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empleado" ADD CONSTRAINT "empleado_id_sede_fkey" FOREIGN KEY ("id_sede") REFERENCES "sede"("id_sede") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curso" ADD CONSTRAINT "curso_id_dependencia_fkey" FOREIGN KEY ("id_dependencia") REFERENCES "dependencia"("id_dependencia") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curso" ADD CONSTRAINT "curso_id_tema_etica_fkey" FOREIGN KEY ("id_tema_etica") REFERENCES "tema_etica"("id_tema_etica") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignacion" ADD CONSTRAINT "asignacion_id_curso_fkey" FOREIGN KEY ("id_curso") REFERENCES "curso"("id_curso") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignacion" ADD CONSTRAINT "asignacion_id_sede_fkey" FOREIGN KEY ("id_sede") REFERENCES "sede"("id_sede") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignacion" ADD CONSTRAINT "asignacion_asignado_por_fkey" FOREIGN KEY ("asignado_por") REFERENCES "usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curso_empleado" ADD CONSTRAINT "curso_empleado_id_curso_fkey" FOREIGN KEY ("id_curso") REFERENCES "curso"("id_curso") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curso_empleado" ADD CONSTRAINT "curso_empleado_id_asignacion_fkey" FOREIGN KEY ("id_asignacion") REFERENCES "asignacion"("id_asignacion") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curso_empleado" ADD CONSTRAINT "curso_empleado_id_empleado_fkey" FOREIGN KEY ("id_empleado") REFERENCES "empleado"("id_empleado") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidencia" ADD CONSTRAINT "evidencia_id_curso_empleado_fkey" FOREIGN KEY ("id_curso_empleado") REFERENCES "curso_empleado"("id_curso_empleado") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidencia" ADD CONSTRAINT "evidencia_revisado_por_fkey" FOREIGN KEY ("revisado_por") REFERENCES "usuario"("id_usuario") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacion" ADD CONSTRAINT "notificacion_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "envio_correo" ADD CONSTRAINT "envio_correo_id_plantilla_fkey" FOREIGN KEY ("id_plantilla") REFERENCES "plantilla_correo"("id_plantilla") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "envio_correo" ADD CONSTRAINT "envio_correo_id_asignacion_fkey" FOREIGN KEY ("id_asignacion") REFERENCES "asignacion"("id_asignacion") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bitacora" ADD CONSTRAINT "bitacora_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id_usuario") ON DELETE SET NULL ON UPDATE CASCADE;
