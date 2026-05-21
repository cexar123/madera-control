// MaderaControl v2.0 - Capa de acceso a datos del modulo BI
// Solo considera ventas con estado = 'confirmada'.

const { query } = require('../config/db');

async function getVentasPorPeriodo(periodo = 'dia') {
  let sql;
  if (periodo === 'mes') {
    sql = `
      SELECT
        TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS periodo,
        COUNT(*)::int AS total_ventas,
        COALESCE(SUM(total), 0)::float AS monto_total,
        COALESCE(SUM(descuento_total), 0)::float AS descuento_total
      FROM ventas
      WHERE estado = 'confirmada' AND created_at >= NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY DATE_TRUNC('month', created_at) ASC
    `;
  } else if (periodo === 'semana') {
    sql = `
      SELECT
        TO_CHAR(DATE_TRUNC('week', created_at), 'YYYY-MM-DD') AS periodo,
        COUNT(*)::int AS total_ventas,
        COALESCE(SUM(total), 0)::float AS monto_total,
        COALESCE(SUM(descuento_total), 0)::float AS descuento_total
      FROM ventas
      WHERE estado = 'confirmada' AND created_at >= NOW() - INTERVAL '4 weeks'
      GROUP BY DATE_TRUNC('week', created_at)
      ORDER BY DATE_TRUNC('week', created_at) ASC
    `;
  } else {
    sql = `
      SELECT
        TO_CHAR(DATE_TRUNC('day', created_at), 'YYYY-MM-DD') AS periodo,
        COUNT(*)::int AS total_ventas,
        COALESCE(SUM(total), 0)::float AS monto_total,
        COALESCE(SUM(descuento_total), 0)::float AS descuento_total
      FROM ventas
      WHERE estado = 'confirmada' AND created_at >= NOW() - INTERVAL '7 days'
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY DATE_TRUNC('day', created_at) ASC
    `;
  }
  const r = await query(sql);
  return r.rows;
}

async function getProductosMasVendidos(limite = 5) {
  const r = await query(
    `SELECT
       p.id, p.nombre, p.tipo_madera, p.dimension,
       SUM(dv.cantidad)::int AS total_vendido,
       SUM(dv.subtotal)::float AS ingresos,
       AVG(dv.porcentaje_descuento)::float AS descuento_promedio
     FROM detalle_ventas dv
     JOIN productos p ON dv.producto_id = p.id
     JOIN ventas v ON dv.venta_id = v.id
     WHERE v.estado = 'confirmada'
     GROUP BY p.id, p.nombre, p.tipo_madera, p.dimension
     ORDER BY total_vendido DESC
     LIMIT $1`,
    [limite]
  );
  return r.rows;
}

async function getIngresosTotales(fecha_inicio, fecha_fin) {
  const params = [];
  const conditions = [`estado = 'confirmada'`];
  if (fecha_inicio) { params.push(fecha_inicio); conditions.push(`created_at >= $${params.length}`); }
  if (fecha_fin) { params.push(fecha_fin); conditions.push(`created_at <= $${params.length}`); }

  const r = await query(
    `SELECT
       COUNT(*)::int AS total_ventas,
       COALESCE(SUM(total), 0)::float AS ingresos_totales,
       COALESCE(SUM(subtotal), 0)::float AS subtotal_total,
       COALESCE(SUM(igv), 0)::float AS igv_total,
       COALESCE(SUM(descuento_total), 0)::float AS descuentos_otorgados,
       COALESCE(AVG(total), 0)::float AS ticket_promedio
     FROM ventas
     WHERE ${conditions.join(' AND ')}`,
    params
  );
  return r.rows[0];
}

async function getVentasPorTipoMadera() {
  const r = await query(
    `SELECT
       p.tipo_madera,
       COALESCE(SUM(dv.cantidad), 0)::int AS unidades,
       COALESCE(SUM(dv.subtotal), 0)::float AS ingresos
     FROM detalle_ventas dv
     JOIN productos p ON dv.producto_id = p.id
     JOIN ventas v ON dv.venta_id = v.id
     WHERE v.estado = 'confirmada'
     GROUP BY p.tipo_madera
     ORDER BY ingresos DESC`
  );
  const rows = r.rows;
  const total = rows.reduce((acc, r) => acc + Number(r.ingresos), 0) || 1;
  return rows.map(r => ({ ...r, porcentaje: +((Number(r.ingresos) / total) * 100).toFixed(2) }));
}

async function getVentasPorFormaPago() {
  const r = await query(
    `SELECT forma_pago,
            COUNT(*)::int AS total_ventas,
            COALESCE(SUM(total), 0)::float AS monto
     FROM ventas
     WHERE estado = 'confirmada'
     GROUP BY forma_pago
     ORDER BY monto DESC`
  );
  return r.rows;
}

async function getResumenDashboard() {
  const ventasHoy = await query(`
    SELECT COUNT(*)::int AS cantidad, COALESCE(SUM(total), 0)::float AS monto
    FROM ventas
    WHERE estado = 'confirmada' AND created_at::date = CURRENT_DATE`);

  const ventasMes = await query(`
    SELECT COUNT(*)::int AS cantidad, COALESCE(SUM(total), 0)::float AS monto
    FROM ventas
    WHERE estado = 'confirmada'
      AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)`);

  const stockBajo = await query(`
    SELECT COUNT(*)::int AS cantidad
    FROM productos
    WHERE activo = true AND stock_actual <= stock_minimo`);

  const topSemana = await query(`
    SELECT p.id, p.nombre, p.tipo_madera,
           SUM(dv.cantidad)::int AS unidades,
           SUM(dv.subtotal)::float AS ingresos
    FROM detalle_ventas dv
    JOIN productos p ON dv.producto_id = p.id
    JOIN ventas v ON dv.venta_id = v.id
    WHERE v.estado = 'confirmada' AND v.created_at >= NOW() - INTERVAL '7 days'
    GROUP BY p.id, p.nombre, p.tipo_madera
    ORDER BY unidades DESC
    LIMIT 1`);

  const recojosPendientes = await query(`
    SELECT COUNT(*)::int AS cantidad
    FROM ventas
    WHERE estado = 'confirmada'
      AND tipo_entrega IN ('recojo_programado','delivery')
      AND estado_entrega IN ('pendiente','listo','en_camino')`);

  const descuentosMes = await query(`
    SELECT COALESCE(SUM(descuento_total), 0)::float AS monto
    FROM ventas
    WHERE estado = 'confirmada'
      AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)`);

  return {
    ventas_hoy: ventasHoy.rows[0],
    ventas_mes: ventasMes.rows[0],
    productos_stock_bajo: stockBajo.rows[0].cantidad,
    top_producto_semana: topSemana.rows[0] || null,
    recojos_pendientes: recojosPendientes.rows[0].cantidad,
    descuentos_mes: descuentosMes.rows[0].monto
  };
}

module.exports = {
  getVentasPorPeriodo,
  getProductosMasVendidos,
  getIngresosTotales,
  getVentasPorTipoMadera,
  getVentasPorFormaPago,
  getResumenDashboard
};
