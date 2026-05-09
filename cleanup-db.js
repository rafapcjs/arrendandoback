const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_lQE0IkFNP9wD@ep-divine-firefly-ad4984m7-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
});

async function cleanup() {
  try {
    console.log('Connecting to database...');

    // Drop all indexes (except system ones)
    const indexResult = await pool.query(`
      SELECT indexname FROM pg_indexes
      WHERE schemaname = 'public' AND indexname NOT LIKE 'pg_%'
    `);

    console.log(`Found ${indexResult.rows.length} indexes to drop`);

    for (const row of indexResult.rows) {
      try {
        await pool.query(`DROP INDEX IF EXISTS "${row.indexname}" CASCADE`);
        console.log(`✓ Dropped index: ${row.indexname}`);
      } catch (e) {
        console.log(`✗ Failed to drop ${row.indexname}: ${e.message}`);
      }
    }

    // Drop all sequences
    const seqResult = await pool.query(`
      SELECT sequence_name FROM information_schema.sequences
      WHERE sequence_schema = 'public'
    `);

    console.log(`Found ${seqResult.rows.length} sequences to drop`);

    for (const row of seqResult.rows) {
      try {
        await pool.query(`DROP SEQUENCE IF EXISTS "${row.sequence_name}" CASCADE`);
        console.log(`✓ Dropped sequence: ${row.sequence_name}`);
      } catch (e) {
        console.log(`✗ Failed to drop ${row.sequence_name}: ${e.message}`);
      }
    }

    // Drop all tables
    const tableResult = await pool.query(`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
    `);

    console.log(`Found ${tableResult.rows.length} tables to drop`);

    for (const row of tableResult.rows) {
      try {
        await pool.query(`DROP TABLE IF EXISTS "${row.tablename}" CASCADE`);
        console.log(`✓ Dropped table: ${row.tablename}`);
      } catch (e) {
        console.log(`✗ Failed to drop ${row.tablename}: ${e.message}`);
      }
    }

    console.log('\n✅ Database cleanup complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

cleanup();
