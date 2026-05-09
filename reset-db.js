require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run(client, sql, label) {
  try {
    await client.query(sql);
    console.log(`✅ ${label}`);
  } catch (e) {
    console.log(`⚠️  ${label}: ${e.message}`);
  }
}

async function resetDb() {
  const client = await pool.connect();
  try {
    console.log('=== Limpiando base de datos ===\n');

    // 1. Eliminar tablas con CASCADE (maneja FKs automaticamente)
    const tables = [
      'notifications', 'audit', 'auditorias', 'pagos',
      'contratos', 'properties', 'tenants', 'propietarios',
      'inmobiliarias', 'users', '"user"',
    ];
    for (const t of tables) {
      await run(client, `DROP TABLE IF EXISTS ${t} CASCADE`, `DROP TABLE ${t}`);
    }

    // 2. Eliminar todos los indices IDX_ huerfanos
    const { rows: indexes } = await client.query(`
      SELECT indexname FROM pg_indexes
      WHERE schemaname = 'public'
        AND (indexname LIKE 'IDX_%' OR indexname LIKE 'UQ_%')
    `);
    for (const { indexname } of indexes) {
      await run(client, `DROP INDEX IF EXISTS "${indexname}"`, `DROP INDEX ${indexname}`);
    }

    // 3. Eliminar tipos ENUM huerfanos
    const { rows: enums } = await client.query(`
      SELECT typname FROM pg_type
      WHERE typtype = 'e' AND typnamespace = (
        SELECT oid FROM pg_namespace WHERE nspname = 'public'
      )
    `);
    for (const { typname } of enums) {
      await run(client, `DROP TYPE IF EXISTS "${typname}" CASCADE`, `DROP TYPE ${typname}`);
    }

    console.log('\n✅ Base de datos limpia. Reinicia la app con: npm run start:dev');
  } catch (error) {
    console.error('Error fatal:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

resetDb();
