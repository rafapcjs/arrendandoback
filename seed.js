require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function seed() {
  const client = await pool.connect();
  try {
    console.log('=== Creando datos iniciales ===\n');

    const passwordHash = await bcrypt.hash('Admin123!', 10);

    // 1. Admin General (plataforma, sin inmobiliaria)
    const adminResult = await client.query(
      `INSERT INTO users ("firstName", "lastName", email, password, role, "isActive")
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (email) DO UPDATE SET "firstName" = EXCLUDED."firstName"
       RETURNING id, email, role`,
      ['Admin', 'General', 'admin@arrendando.com', passwordHash, 'ADMIN', true]
    );
    const admin = adminResult.rows[0];
    console.log(`✅ Admin General: ${admin.email}`);

    // 2. Crear inmobiliaria
    const inmoResult = await client.query(
      `INSERT INTO inmobiliarias (nombre, nit, direccion, telefono, email, estado, "creadoPorId")
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (nit) DO UPDATE SET nombre = EXCLUDED.nombre
       RETURNING id, nombre, nit`,
      ['Inmobiliaria Demo', '900123456-1', 'Calle 1 # 2-3', '3001234567', 'demo@inmobiliaria.com', 'ACTIVA', admin.id]
    );
    const inmo = inmoResult.rows[0];
    console.log(`✅ Inmobiliaria: ${inmo.nombre} (id: ${inmo.id})`);

    // 3. Admin de la inmobiliaria (role INMOBILIARIA, ligado a la inmo)
    const inmoAdminHash = await bcrypt.hash('Inmo123!', 10);
    const inmoAdminResult = await client.query(
      `INSERT INTO users ("firstName", "lastName", email, password, role, "inmobiliariaId", "isActive")
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (email) DO UPDATE SET "firstName" = EXCLUDED."firstName"
       RETURNING id, email, role`,
      ['Admin', 'Inmobiliaria', 'admininmo@arrendando.com', inmoAdminHash, 'INMOBILIARIA', inmo.id, true]
    );
    const inmoAdmin = inmoAdminResult.rows[0];
    console.log(`✅ Admin Inmobiliaria: ${inmoAdmin.email}`);

    console.log('\n=== Credenciales ===');
    console.log(`Admin General    → admin@arrendando.com       / Admin123!`);
    console.log(`Admin Inmobiliaria → admininmo@arrendando.com / Inmo123!`);
    console.log(`\nInmobiliaria ID: ${inmo.id}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
