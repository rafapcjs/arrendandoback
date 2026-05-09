const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_lQE0IkFNP9wD@ep-divine-firefly-ad4984m7-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
});

async function fixDatabase() {
  try {
    console.log('Attempting to drop specific problematic index...\n');

    // Try to drop the specific index that's causing issues
    try {
      await pool.query('DROP INDEX IF EXISTS "IDX_0f81b41fff15a6492ced7dc60d" CASCADE');
      console.log('✓ Dropped index: IDX_0f81b41fff15a6492ced7dc60d');
    } catch (e) {
      console.log(`✗ Failed to drop specific index: ${e.message.split('\n')[0]}`);
    }

    // Get all table names
    const tableResult = await pool.query(`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);

    console.log(`\nFound ${tableResult.rows.length} tables. Dropping all...\n`);

    // Drop all tables in order (respecting foreign key dependencies)
    const allIndexes = await pool.query(`
      SELECT indexname FROM pg_indexes
      WHERE schemaname = 'public' AND indexname NOT LIKE 'pg_%'
    `);

    for (const idx of allIndexes.rows) {
      try {
        await pool.query(`DROP INDEX IF EXISTS "${idx.indexname}" CASCADE`);
      } catch (e) {
        // ignore
      }
    }

    // Now drop tables
    for (const table of tableResult.rows) {
      try {
        await pool.query(`DROP TABLE IF EXISTS "${table.tablename}" CASCADE`);
        console.log(`✓ Dropped table: ${table.tablename}`);
      } catch (e) {
        console.log(`✗ Failed to drop ${table.tablename}: ${e.message.split('\n')[0]}`);
      }
    }

    console.log('\n✅ Database cleanup complete! Ready for fresh migration.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fixDatabase();
