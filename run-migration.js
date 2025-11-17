const { Client } = require('pg');
require('dotenv').config();

const sql = `
-- Agregar columnas de auditoría
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS "creadoPorId" uuid;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS "creadoPorId" uuid;
ALTER TABLE contratos ADD COLUMN IF NOT EXISTS "creadoPorId" uuid;
ALTER TABLE pagos ADD COLUMN IF NOT EXISTS "registradoPorId" uuid;

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_tenants_creado_por ON tenants("creadoPorId");
CREATE INDEX IF NOT EXISTS idx_properties_creado_por ON properties("creadoPorId");
CREATE INDEX IF NOT EXISTS idx_contratos_creado_por ON contratos("creadoPorId");
CREATE INDEX IF NOT EXISTS idx_pagos_registrado_por ON pagos("registradoPorId");

-- Agregar foreign keys
ALTER TABLE tenants DROP CONSTRAINT IF EXISTS fk_tenants_creado_por;
ALTER TABLE tenants ADD CONSTRAINT fk_tenants_creado_por 
  FOREIGN KEY ("creadoPorId") REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE properties DROP CONSTRAINT IF EXISTS fk_properties_creado_por;
ALTER TABLE properties ADD CONSTRAINT fk_properties_creado_por 
  FOREIGN KEY ("creadoPorId") REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE contratos DROP CONSTRAINT IF EXISTS fk_contratos_creado_por;
ALTER TABLE contratos ADD CONSTRAINT fk_contratos_creado_por 
  FOREIGN KEY ("creadoPorId") REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE pagos DROP CONSTRAINT IF EXISTS fk_pagos_registrado_por;
ALTER TABLE pagos ADD CONSTRAINT fk_pagos_registrado_por 
  FOREIGN KEY ("registradoPorId") REFERENCES users(id) ON DELETE SET NULL;
`;

async function runMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔌 Conectando a la base de datos...');
    await client.connect();
    console.log('✅ Conectado exitosamente');

    console.log('🚀 Ejecutando migración...');
    await client.query(sql);
    console.log('✅ Migración ejecutada exitosamente');
    console.log('\n📋 Columnas agregadas:');
    console.log('   - tenants.creadoPorId');
    console.log('   - properties.creadoPorId');
    console.log('   - contratos.creadoPorId');
    console.log('   - pagos.registradoPorId');
    console.log('\n🎉 ¡Todo listo! Puedes reiniciar el servidor ahora.');
  } catch (error) {
    console.error('❌ Error ejecutando migración:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
