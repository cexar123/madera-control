// MaderaControl v2.0 - Capa de acceso a datos de descuentos por volumen
// Reglas:
//  - El porcentaje debe estar entre 0 y 50.
//  - Si tipo_madera es NULL, aplica a todos los productos.
//  - Solo gerente puede crear/editar/desactivar.

const { query } = require('../config/db');

const TIPOS_MADERA = ['eucalipto','varas','vigas','parantes','listones','otro'];

async function listar(soloActivos = false) {
  const where = soloActivos ? 'WHERE activo = true' : '';
  const r = await query(
    `SELECT id, nombre, tipo_madera, cantidad_minima, porcentaje_descuento, activo, created_at
     FROM descuentos_volumen
     ${where}
     ORDER BY cantidad_minima ASC, tipo_madera NULLS FIRST`
  );
  return r.rows;
}

async function obtener(id) {
  const r = await query(`SELECT * FROM descuentos_volumen WHERE id = $1 LIMIT 1`, [id]);
  return r.rows[0] || null;
}

function validar(datos) {
  if (!datos.nombre || datos.nombre.trim().length === 0) {
    throw Object.assign(new Error('El nombre es obligatorio'), { status: 400 });
  }
  if (!datos.cantidad_minima || Number(datos.cantidad_minima) <= 0) {
    throw Object.assign(new Error('La cantidad minima debe ser mayor a 0'), { status: 400 });
  }
  const pct = Number(datos.porcentaje_descuento);
  if (Number.isNaN(pct) || pct < 0 || pct > 50) {
    throw Object.assign(new Error('El porcentaje debe estar entre 0 y 50'), { status: 400 });
  }
  if (datos.tipo_madera && !TIPOS_MADERA.includes(datos.tipo_madera)) {
    throw Object.assign(new Error('tipo_madera invalido'), { status: 400 });
  }
}

async function crear(datos) {
  validar(datos);
  const r = await query(
    `INSERT INTO descuentos_volumen (nombre, tipo_madera, cantidad_minima, porcentaje_descuento, activo)
     VALUES ($1, $2, $3, $4, COALESCE($5, true))
     RETURNING *`,
    [
      datos.nombre.trim(),
      datos.tipo_madera || null,
      parseInt(datos.cantidad_minima, 10),
      Number(datos.porcentaje_descuento),
      datos.activo
    ]
  );
  return r.rows[0];
}

async function actualizar(id, datos) {
  const existente = await obtener(id);
  if (!existente) throw Object.assign(new Error('Descuento no encontrado'), { status: 404 });

  const merged = { ...existente, ...datos };
  validar(merged);

  const r = await query(
    `UPDATE descuentos_volumen
     SET nombre = $1, tipo_madera = $2, cantidad_minima = $3,
         porcentaje_descuento = $4, activo = $5
     WHERE id = $6
     RETURNING *`,
    [
      merged.nombre.trim(),
      merged.tipo_madera || null,
      parseInt(merged.cantidad_minima, 10),
      Number(merged.porcentaje_descuento),
      merged.activo !== undefined ? merged.activo : existente.activo,
      id
    ]
  );
  return r.rows[0];
}

async function eliminar(id) {
  const r = await query(
    `UPDATE descuentos_volumen SET activo = false WHERE id = $1 RETURNING id, nombre, activo`,
    [id]
  );
  return r.rows[0] || null;
}

module.exports = { listar, obtener, crear, actualizar, eliminar };
