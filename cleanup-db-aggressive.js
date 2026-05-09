const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_lQE0IkFNP9wD@ep-divine-firefly-ad4984m7-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
});

async function cleanup() {
  try {
    console.log('Starting aggressive database cleanup...\n');

    // Drop all constraints (except system ones)
    const constraintResult = await pool.query(`
      SELECT constraint_name, table_name FROM information_schema.table_constraints
      WHERE table_schema = 'public' AND constraint_type != 'PRIMARY KEY'
    `);

    console.log(`Found ${constraintResult.rows.length} constraints`);
    for (const row of constraintResult.rows) {
      try {
        await pool.query(
          `ALTER TABLE "${row.table_name}" DROP CONSTRAINT IF EXISTS "${row.constraint_name}" CASCADE`
        );
        console.log(`  ✓ Dropped constraint: ${row.constraint_name}`);
      } catch (e) {
        console.log(`  ✗ Failed to drop constraint ${row.constraint_name}: ${e.message.split('\n')[0]}`);
      }
    }

    // Drop all indexes (except system ones)
    const indexResult = await pool.query(`
      SELECT indexname, tablename FROM pg_indexes
      WHERE schemaname = 'public' AND indexname NOT LIKE 'pg_%'
    `);

    console.log(`\nFound ${indexResult.rows.length} indexes to drop`);
    for (const row of indexResult.rows) {
      try {
        await pool.query(`DROP INDEX IF EXISTS "${row.indexname}" CASCADE`);
        console.log(`  ✓ Dropped index: ${row.indexname}`);
      } catch (e) {
        console.log(`  ✗ Failed to drop ${row.indexname}: ${e.message.split('\n')[0]}`);
      }
    }

    // Drop all tables
    const tableResult = await pool.query(`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
    `);

    console.log(`\nFound ${tableResult.rows.length} tables to drop`);
    for (const row of tableResult.rows) {
      try {
        await pool.query(`DROP TABLE IF EXISTS "${row.tablename}" CASCADE`);
        console.log(`  ✓ Dropped table: ${row.tablename}`);
      } catch (e) {
        console.log(`  ✗ Failed to drop ${row.tablename}: ${e.message.split('\n')[0]}`);
      }
    }

    // Drop all sequences
    const seqResult = await pool.query(`
      SELECT sequence_name FROM information_schema.sequences
      WHERE sequence_schema = 'public'
    `);

    console.log(`\nFound ${seqResult.rows.length} sequences to drop`);
    for (const row of seqResult.rows) {
      try {
        await pool.query(`DROP SEQUENCE IF EXISTS "${row.sequence_name}" CASCADE`);
        console.log(`  ✓ Dropped sequence: ${row.sequence_name}`);
      } catch (e) {
        console.log(`  ✗ Failed to drop ${row.sequence_name}: ${e.message.split('\n')[0]}`);
      }
    }


    console.log('\n✅ Database cleanup complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

cleanup();
