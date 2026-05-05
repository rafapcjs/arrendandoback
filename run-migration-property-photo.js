const { Client } = require('pg');
require('dotenv').config();

const sql = `
ALTER TABLE properties ADD COLUMN IF NOT EXISTS "fotoUrl" varchar(1000);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS "fotoPublicId" varchar(500);
`;

async function runMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log('🔌 Conectando a la base de datos...');
    await client.connect();
    console.log('✅ Conectado exitosamente');

    console.log('🚀 Ejecutando migracion de foto de inmueble...');
    await client.query(sql);
    console.log('✅ Migracion ejecutada exitosamente');
    console.log('📋 Columnas agregadas: properties.fotoUrl, properties.fotoPublicId');
  } catch (error) {
    console.error('❌ Error ejecutando migracion:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
