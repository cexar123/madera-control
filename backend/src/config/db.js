// Autor: Cesar
// MaderaControl v1.0 - Configuracion de conexion a PostgreSQL
// Exporta un Pool de conexiones y una funcion query() que lo utiliza.
// El pool tambien se exporta para permitir transacciones BEGIN/COMMIT/ROLLBACK.

const { Pool } = require('pg');

const isProduction = process.env.NODE_ENV === 'production';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

pool.on('error', (err) => {
  console.error('Error inesperado en cliente PostgreSQL', err);
});

async function query(text, params) {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;
  if (process.env.NODE_ENV !== 'production') {
    console.log('[DB]', { text: text.substring(0, 80), duration, rows: result.rowCount });
  }
  return result;
}

module.exports = { pool, query };
