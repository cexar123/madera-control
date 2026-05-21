// Capa de acceso a datos del inventario
// Maneja movimientos (entradas / salidas) y resumen de stock.

const { pool, query } = require('../config/db');

async function getMovimientos(filtros = {}) {
  const params = [];
  const conditions = [];

  if (filtros.producto_id) {
    params.push(parseInt(filtros.producto_id, 10));
    conditions.push(`m.producto_id = $${params.length}`);
  }

  if (filtros.tipo) {
    params.push(filtros.tipo);
    conditions.push(`m.tipo = $${params.length}`);
  }

  if (filtros.fecha_inicio) {
    params.push(filtros.fecha_inicio);
    conditions.push(`m.created_at >= $${params.length}`);
  }

  if (filtros.fecha_fin) {
    params.push(filtros.fecha_fin);
    conditions.push(`m.created_at <= $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const sql = `
    SELECT
      m.id,
      m.tipo,
      m.cantidad,
      m.motivo,
      m.created_at,
      m.referencia_venta_id,
      p.id   AS producto_id,
      p.nombre AS producto_nombre,
      p.tipo_madera,
      u.id   AS usuario_id,
      u.nombre AS usuario_nombre,
      u.rol  AS usuario_rol
    FROM movimientos_inventario m
    LEFT JOIN productos p ON m.producto_id = p.id
    LEFT JOIN usuarios u ON m.usuario_id = u.id
    ${where}
    ORDER BY m.created_at DESC
    LIMIT 500
  `;

  const result = await query(sql, params);
  return result.rows;
}

async function registrarEntrada(producto_id, cantidad, motivo, usuario_id) {
  if (!producto_id) throw Object.assign(new Error('producto_id es obligatorio'), { status: 400 });
  if (!cantidad || cantidad <= 0) throw Object.assign(new Error('La cantidad debe ser mayor que 0'), { status: 400 });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const prodRes = await client.query(
      `SELECT id, nombre, stock_actual FROM productos WHERE id = $1 AND activo = true FOR UPDATE`,
      [producto_id]
    );
    if (prodRes.rows.length === 0) {
      throw Object.assign(new Error('Producto no encontrado o inactivo'), { status: 404 });
    }

    await client.query(
      `UPDATE productos SET stock_actual = stock_actual + $1 WHERE id = $2`,
      [cantidad, producto_id]
    );

    const mov = await client.query(
      `INSERT INTO movimientos_inventario
         (producto_id, tipo, cantidad, motivo, usuario_id)
       VALUES ($1, 'entrada', $2, $3, $4)
       RETURNING *`,
      [producto_id, cantidad, motivo || 'Entrada manual', usuario_id]
    );

    await client.query('COMMIT');
    return mov.rows[0];
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function getResumenStock() {
  const sql = `
    SELECT
      id,
      nombre,
      tipo_madera,
      dimension,
      stock_actual,
      stock_minimo,
      precio_unitario,
      CASE
        WHEN stock_actual = 0 THEN 'agotado'
        WHEN stock_actual <= stock_minimo THEN 'critico'
        WHEN stock_actual <= stock_minimo * 2 THEN 'bajo'
        ELSE 'normal'
      END AS estado_stock,
      CASE WHEN stock_actual <= stock_minimo THEN true ELSE false END AS critico
    FROM productos
    WHERE activo = true
    ORDER BY
      CASE
        WHEN stock_actual = 0 THEN 0
        WHEN stock_actual <= stock_minimo THEN 1
        WHEN stock_actual <= stock_minimo * 2 THEN 2
        ELSE 3
      END,
      nombre ASC
  `;
  const result = await query(sql);
  return result.rows;
}

module.exports = {
  getMovimientos,
  registrarEntrada,
  getResumenStock
};
