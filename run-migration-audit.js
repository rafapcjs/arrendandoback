const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    console.log('🔌 Conectando a la base de datos...');
    await client.connect();
    console.log('✅ Conectado exitosamente');

    // Leer el archivo SQL
    const sqlFile = path.join(__dirname, 'migration-add-audit-table.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    console.log('📝 Ejecutando migración de auditoría...');
    await client.query(sql);
    console.log('✅ Migración completada exitosamente');

    console.log('📊 Verificando tabla creada...');
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'auditorias'
    `);

    if (result.rows.length > 0) {
      console.log('✅ Tabla "auditorias" creada correctamente');
      
      // Verificar columnas
      const columns = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'auditorias'
        ORDER BY ordinal_position
      `);
      
      console.log('📋 Columnas creadas:');
      columns.rows.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type}`);
      });
    } else {
      console.log('❌ Error: Tabla no encontrada');
    }

  } catch (error) {
    console.error('❌ Error ejecutando migración:', error.message);
    console.error('Detalles:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Conexión cerrada');
  }
}

runMigration();
