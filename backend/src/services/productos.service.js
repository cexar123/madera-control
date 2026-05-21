// Capa de acceso a datos del catalogo de productos
// Aqui viven las queries SQL contra la tabla productos.

const { query } = require('../config/db');

async function getAllProductos(filtros = {}) {
  const params = [];
  const conditions = ['activo = true'];

  if (filtros.tipo_madera) {
    params.push(filtros.tipo_madera);
    conditions.push(`tipo_madera = $${params.length}`);
  }

  if (filtros.busqueda) {
    params.push(`%${filtros.busqueda}%`);
    conditions.push(`nombre ILIKE $${params.length}`);
  }

  const sql = `
    SELECT id, nombre, tipo_madera, dimension, unidad_medida,
           precio_unitario, stock_actual, stock_minimo, activo, created_at
    FROM productos
    WHERE ${conditions.join(' AND ')}
    ORDER BY nombre ASC
  `;

  const result = await query(sql, params);
  return result.rows;
}

async function getProductoById(id) {
  const sql = `
    SELECT id, nombre, tipo_madera, dimension, unidad_medida,
           precio_unitario, stock_actual, stock_minimo, activo, created_at
    FROM productos
    WHERE id = $1
    LIMIT 1
  `;
  const result = await query(sql, [id]);
  return result.rows[0] || null;
}

async function getStockBajo() {
  const sql = `
    SELECT id, nombre, tipo_madera, dimension, precio_unitario,
           stock_actual, stock_minimo
    FROM productos
    WHERE activo = true AND stock_actual <= stock_minimo
    ORDER BY stock_actual ASC
  `;
  const result = await query(sql);
  return result.rows;
}

async function createProducto(datos) {
  const sql = `
    INSERT INTO productos
      (nombre, tipo_madera, dimension, unidad_medida,
       precio_unitario, stock_actual, stock_minimo)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `;
  const params = [
    datos.nombre,
    datos.tipo_madera,
    datos.dimension || null,
    datos.unidad_medida || 'unidad',
    datos.precio_unitario,
    datos.stock_actual || 0,
    datos.stock_minimo || 5
  ];
  const result = await query(sql, params);
  return result.rows[0];
}

async function updateProducto(id, datos) {
  const fields = [];
  const params = [];

  const allowed = ['nombre', 'precio_unitario', 'stock_minimo', 'dimension'];
  for (const key of allowed) {
    if (datos[key] !== undefined) {
      params.push(datos[key]);
      fields.push(`${key} = $${params.length}`);
    }
  }

  if (fields.length === 0) {
    return await getProductoById(id);
  }

  params.push(id);
  const sql = `
    UPDATE productos
    SET ${fields.join(', ')}
    WHERE id = $${params.length}
    RETURNING *
  `;

  const result = await query(sql, params);
  return result.rows[0] || null;
}

async function desactivarProducto(id) {
  const sql = `
    UPDATE productos SET activo = false WHERE id = $1
    RETURNING id, nombre, activo
  `;
  const result = await query(sql, [id]);
  return result.rows[0] || null;
}

module.exports = {
  getAllProductos,
  getProductoById,
  getStockBajo,
  createProducto,
  updateProducto,
  desactivarProducto
};
