-- Migración: Agregar columnas de auditoría (relaciones con User)
-- Fecha: 2025-11-17
-- Descripción: Agrega creadoPorId y registradoPorId a las entidades principales

-- 1. Agregar columna creadoPorId a la tabla tenants
ALTER TABLE tenants 
ADD COLUMN "creadoPorId" uuid NULL;

-- 2. Agregar columna creadoPorId a la tabla properties
ALTER TABLE properties 
ADD COLUMN "creadoPorId" uuid NULL;

-- 3. Agregar columna creadoPorId a la tabla contratos
ALTER TABLE contratos 
ADD COLUMN "creadoPorId" uuid NULL;

-- 4. Agregar columna registradoPorId a la tabla pagos
ALTER TABLE pagos 
ADD COLUMN "registradoPorId" uuid NULL;

-- 5. Crear índices para mejorar el rendimiento
CREATE INDEX idx_tenants_creado_por ON tenants("creadoPorId");
CREATE INDEX idx_properties_creado_por ON properties("creadoPorId");
CREATE INDEX idx_contratos_creado_por ON contratos("creadoPorId");
CREATE INDEX idx_pagos_registrado_por ON pagos("registradoPorId");

-- 6. Agregar foreign keys (opcional - recomendado para integridad referencial)
ALTER TABLE tenants 
ADD CONSTRAINT fk_tenants_creado_por 
FOREIGN KEY ("creadoPorId") REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE properties 
ADD CONSTRAINT fk_properties_creado_por 
FOREIGN KEY ("creadoPorId") REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE contratos 
ADD CONSTRAINT fk_contratos_creado_por 
FOREIGN KEY ("creadoPorId") REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE pagos 
ADD CONSTRAINT fk_pagos_registrado_por 
FOREIGN KEY ("registradoPorId") REFERENCES users(id) ON DELETE SET NULL;

-- Comentarios en las columnas
COMMENT ON COLUMN tenants."creadoPorId" IS 'ID del usuario administrador que creó el inquilino';
COMMENT ON COLUMN properties."creadoPorId" IS 'ID del usuario administrador que creó la propiedad';
COMMENT ON COLUMN contratos."creadoPorId" IS 'ID del usuario administrador que creó el contrato';
COMMENT ON COLUMN pagos."registradoPorId" IS 'ID del usuario administrador que registró el pago';
