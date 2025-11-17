-- Migración para crear tabla de auditorías
-- Fecha: 2025-11-17

-- Crear tipo ENUM para acciones de auditoría
DO $$ BEGIN
    CREATE TYPE "accion_auditoria_enum" AS ENUM (
        'LOGIN',
        'LOGOUT',
        'REGISTRO',
        'CAMBIO_CONTRASENA',
        'RECUPERAR_CONTRASENA',
        'CREAR',
        'ACTUALIZAR',
        'ELIMINAR',
        'ACTIVAR',
        'DESACTIVAR',
        'PAGO_REGISTRADO',
        'PAGO_ABONO',
        'CONTRATO_FINALIZADO',
        'CONTRATO_VENCIDO',
        'CONSULTA_REPORTES',
        'EXPORTAR_DATOS'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Crear tabla de auditorías
CREATE TABLE IF NOT EXISTS auditorias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "usuarioId" UUID,
    "usuarioNombre" VARCHAR,
    "usuarioEmail" VARCHAR,
    accion accion_auditoria_enum NOT NULL,
    entidad VARCHAR,
    "entidadId" UUID,
    "datosPrevios" JSONB,
    "datosNuevos" JSONB,
    contexto JSONB,
    "createdAt" TIMESTAMP DEFAULT NOW()
);

-- Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS "IDX_auditorias_usuarioId" ON auditorias("usuarioId");
CREATE INDEX IF NOT EXISTS "IDX_auditorias_accion" ON auditorias(accion);
CREATE INDEX IF NOT EXISTS "IDX_auditorias_entidad" ON auditorias(entidad);
CREATE INDEX IF NOT EXISTS "IDX_auditorias_createdAt" ON auditorias("createdAt");

-- Comentarios para documentación
COMMENT ON TABLE auditorias IS 'Tabla de auditoría del sistema - registra todas las acciones realizadas';
COMMENT ON COLUMN auditorias.id IS 'ID único de la auditoría';
COMMENT ON COLUMN auditorias."usuarioId" IS 'ID del usuario que realizó la acción';
COMMENT ON COLUMN auditorias."usuarioNombre" IS 'Nombre completo del usuario';
COMMENT ON COLUMN auditorias."usuarioEmail" IS 'Email del usuario';
COMMENT ON COLUMN auditorias.accion IS 'Tipo de acción realizada';
COMMENT ON COLUMN auditorias.entidad IS 'Entidad afectada (Property, Tenant, Contrato, Pago, User)';
COMMENT ON COLUMN auditorias."entidadId" IS 'ID del registro afectado';
COMMENT ON COLUMN auditorias."datosPrevios" IS 'Datos anteriores al cambio (formato JSON)';
COMMENT ON COLUMN auditorias."datosNuevos" IS 'Datos nuevos después del cambio (formato JSON)';
COMMENT ON COLUMN auditorias.contexto IS 'Contexto técnico (IP, userAgent, método, ruta)';
COMMENT ON COLUMN auditorias."createdAt" IS 'Fecha y hora de creación del registro';
