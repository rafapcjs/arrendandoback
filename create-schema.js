require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const createSchemaSql = `
CREATE TABLE IF NOT EXISTS "user" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" varchar UNIQUE NOT NULL,
  "password" varchar NOT NULL,
  "role" varchar NOT NULL DEFAULT 'INMOBILIARIA',
  "inmobiliariaId" uuid,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "inmobiliarias" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "nombre" varchar NOT NULL,
  "nit" varchar UNIQUE NOT NULL,
  "direccion" varchar NOT NULL,
  "telefono" varchar NOT NULL,
  "email" varchar UNIQUE NOT NULL,
  "estado" varchar NOT NULL DEFAULT 'ACTIVA',
  "creadoPorId" uuid REFERENCES "user"("id"),
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "propietarios" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "inmobiliariaId" uuid NOT NULL REFERENCES "inmobiliarias"("id"),
  "nombre" varchar NOT NULL,
  "documento" varchar NOT NULL,
  "telefono" varchar NOT NULL,
  "email" varchar,
  "isActive" boolean DEFAULT true,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "tenants" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "inmobiliariaId" uuid,
  "cedula" varchar NOT NULL,
  "nombres" varchar NOT NULL,
  "apellidos" varchar NOT NULL,
  "telefono" varchar NOT NULL,
  "correo" varchar NOT NULL,
  "direccion" text NOT NULL,
  "ciudad" varchar NOT NULL,
  "contactoEmergencia" varchar NOT NULL,
  "isActive" boolean DEFAULT true,
  "disponible" boolean DEFAULT true,
  "creadoPorId" uuid REFERENCES "user"("id"),
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("cedula", "inmobiliariaId"),
  UNIQUE("correo", "inmobiliariaId")
);

CREATE TABLE IF NOT EXISTS "properties" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "inmobiliariaId" uuid,
  "propietarioId" uuid,
  "nombre" varchar NOT NULL,
  "direccion" varchar NOT NULL,
  "ciudad" varchar NOT NULL,
  "tipo" varchar NOT NULL,
  "metrosCuadrados" numeric NOT NULL,
  "numeroHabitaciones" integer NOT NULL,
  "numeroBanos" integer NOT NULL,
  "valorArriendo" numeric NOT NULL,
  "administracion" numeric,
  "servicios" numeric,
  "caracteristicas" text,
  "fotoUrl" varchar,
  "estado" varchar DEFAULT 'DISPONIBLE',
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "contratos" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "inmobiliariaId" uuid,
  "propietarioId" uuid,
  "propertyId" uuid REFERENCES "properties"("id"),
  "tenantId" uuid REFERENCES "tenants"("id"),
  "startDate" TIMESTAMP NOT NULL,
  "endDate" TIMESTAMP NOT NULL,
  "rentAmount" numeric NOT NULL,
  "depositAmount" numeric NOT NULL,
  "adminFee" numeric,
  "adminPercent" numeric,
  "status" varchar DEFAULT 'ACTIVO',
  "contractFile" varchar,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "pagos" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "inmobiliariaId" uuid,
  "contratoId" uuid NOT NULL REFERENCES "contratos"("id"),
  "monto" numeric NOT NULL,
  "estado" varchar DEFAULT 'PENDIENTE',
  "fechaPago" TIMESTAMP,
  "tipoPago" varchar,
  "observaciones" text,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "notifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" uuid REFERENCES "user"("id"),
  "titulo" varchar NOT NULL,
  "mensaje" text NOT NULL,
  "leida" boolean DEFAULT false,
  "tipo" varchar,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "audit" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "usuarioId" uuid REFERENCES "user"("id"),
  "accion" varchar NOT NULL,
  "entidad" varchar NOT NULL,
  "entidadId" uuid,
  "cambios" jsonb,
  "ipAddress" varchar,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "IDX_user_inmobiliariaId" ON "user"("inmobiliariaId");
CREATE INDEX IF NOT EXISTS "IDX_tenants_inmobiliariaId" ON "tenants"("inmobiliariaId");
CREATE INDEX IF NOT EXISTS "IDX_properties_inmobiliariaId" ON "properties"("inmobiliariaId");
CREATE INDEX IF NOT EXISTS "IDX_properties_propietarioId" ON "properties"("propietarioId");
CREATE INDEX IF NOT EXISTS "IDX_contratos_inmobiliariaId" ON "contratos"("inmobiliariaId");
CREATE INDEX IF NOT EXISTS "IDX_contratos_propietarioId" ON "contratos"("propietarioId");
CREATE INDEX IF NOT EXISTS "IDX_pagos_inmobiliariaId" ON "pagos"("inmobiliariaId");
CREATE INDEX IF NOT EXISTS "IDX_audit_usuarioId" ON "audit"("usuarioId");
CREATE INDEX IF NOT EXISTS "IDX_audit_accion" ON "audit"("accion");
CREATE INDEX IF NOT EXISTS "IDX_audit_entidad" ON "audit"("entidad");
CREATE INDEX IF NOT EXISTS "IDX_audit_createdAt" ON "audit"("createdAt");
`;

async function createSchema() {
  try {
    console.log('Creating database schema...\n');

    const statements = createSchemaSql.split(';').filter(s => s.trim());

    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`Executing: ${statement.substring(0, 50)}...`);
        await pool.query(statement);
      }
    }

    console.log('\n✅ Database schema created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating schema:');
    console.error(error.message);
    console.error(error.code);
    console.error(error.detail);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

createSchema();
