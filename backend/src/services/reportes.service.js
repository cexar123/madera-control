// Autor: Miembro 4
// MaderaControl v1.0 - Capa de acceso a datos del modulo BI (Business Intelligence)
// Queries SQL agregadas para alimentar el dashboard, los graficos y las tarjetas KPI.

const { query } = require('../config/db');

async function getVentasPorPeriodo(periodo = 'dia') {
  let sql;

  if (periodo === 'mes') {
    sql = `
      SELECT
        TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS periodo,
        COUNT(*)::int AS total_ventas,
        COALESCE(SUM(total), 0)::float AS monto_total
      FROM ventas
      WHERE estado = 'confirmada'
        AND created_at >= NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY DATE_TRUNC('month', created_at) ASC
    `;
  } else if (periodo === 'semana') {
    sql = `
      SELECT
        TO_CHAR(DATE_TRUNC('week', created_at), 'YYYY-MM-DD') AS periodo,
        COUNT(*)::int AS total_ventas,
        COALESCE(SUM(total), 0)::float AS monto_total
      FROM ventas
      WHERE estado = 'confirmada'
        AND created_at >= NOW() - INTERVAL '4 weeks'
      GROUP BY DATE_TRUNC('week', created_at)
      ORDER BY DATE_TRUNC('week', created_at) ASC
    `;
  } else {
    sql = `
      SELECT
        TO_CHAR(DATE_TRUNC('day', created_at), 'YYYY-MM-DD') AS periodo,
        COUNT(*)::int AS total_ventas,
        COALESCE(SUM(total), 0)::float AS monto_total
      FROM ventas
      WHERE estado = 'confirmada'
        AND created_at >= NOW() - INTERVAL '7 days'
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY DATE_TRUNC('day', created_at) ASC
    `;
  }

  const result = await query(sql);
  return result.rows;
}

async function getProductosMasVendidos(limite = 5) {
  const sql = `
    SELECT
      p.id,
      p.nombre,
      p.tipo_madera,
      p.dimension,
      SUM(dv.cantidad)::int AS total_vendido,
      SUM(dv.subtotal)::float AS ingresos
    FROM detalle_ventas dv
    JOIN productos p ON dv.producto_id = p.id
    JOIN ventas v ON dv.venta_id = v.id
    WHERE v.estado = 'confirmada'
    GROUP BY p.id, p.nombre, p.tipo_madera, p.dimension
    ORDER BY total_vendido DESC
    LIMIT $1
  `;
  const result = await query(sql, [limite]);
  return result.rows;
}

async function getIngresosTotales(fecha_inicio, fecha_fin) {
  const params = [];
  const conditions = [`estado = 'confirmada'`];

  if (fecha_inicio) {
    params.push(fecha_inicio);
    conditions.push(`created_at >= $${params.length}`);
  }
  if (fecha_fin) {
    params.push(fecha_fin);
    conditions.push(`created_at <= $${params.length}`);
  }

  const sql = `
    SELECT
      COUNT(*)::int AS total_ventas,
      COALESCE(SUM(total), 0)::float AS ingresos_totales,
      COALESCE(SUM(subtotal), 0)::float AS subtotal_total,
      COALESCE(SUM(igv), 0)::float AS igv_total,
      COALESCE(AVG(total), 0)::float AS ticket_promedio
    FROM ventas
    WHERE ${conditions.join(' AND ')}
  `;

  const result = await query(sql, params);
  return result.rows[0];
}

async function getVentasPorTipoMadera() {
  const sql = `
    SELECT
      p.tipo_madera,
      COALESCE(SUM(dv.cantidad), 0)::int AS unidades,
      COALESCE(SUM(dv.subtotal), 0)::float AS ingresos
    FROM detalle_ventas dv
    JOIN productos p ON dv.producto_id = p.id
    JOIN ventas v ON dv.venta_id = v.id
    WHERE v.estado = 'confirmada'
    GROUP BY p.tipo_madera
    ORDER BY ingresos DESC
  `;
  const result = await query(sql);
  const rows = result.rows;
  const totalIngresos = rows.reduce((acc, r) => acc + Number(r.ingresos), 0) || 1;
  return rows.map(r => ({
    ...r,
    porcentaje: +((Number(r.ingresos) / totalIngresos) * 100).toFixed(2)
  }));
}

async function getResumenDashboard() {
  const ventasHoyRes = await query(`
    SELECT
      COUNT(*)::int AS cantidad,
      COALESCE(SUM(total), 0)::float AS monto
    FROM ventas
    WHERE estado = 'confirmada'
      AND created_at::date = CURRENT_DATE
  `);

  const ventasMesRes = await query(`
    SELECT
      COUNT(*)::int AS cantidad,
      COALESCE(SUM(total), 0)::float AS monto
    FROM ventas
    WHERE estado = 'confirmada'
      AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)
  `);

  const stockBajoRes = await query(`
    SELECT COUNT(*)::int AS cantidad
    FROM productos
    WHERE activo = true AND stock_actual <= stock_minimo
  `);

  const topSemanaRes = await query(`
    SELECT
      p.id,
      p.nombre,
      p.tipo_madera,
      SUM(dv.cantidad)::int AS unidades,
      SUM(dv.subtotal)::float AS ingresos
    FROM detalle_ventas dv
    JOIN productos p ON dv.producto_id = p.id
    JOIN ventas v ON dv.venta_id = v.id
    WHERE v.estado = 'confirmada'
      AND v.created_at >= NOW() - INTERVAL '7 days'
    GROUP BY p.id, p.nombre, p.tipo_madera
    ORDER BY unidades DESC
    LIMIT 1
  `);

  return {
    ventas_hoy: ventasHoyRes.rows[0],
    ventas_mes: ventasMesRes.rows[0],
    productos_stock_bajo: stockBajoRes.rows[0].cantidad,
    top_producto_semana: topSemanaRes.rows[0] || null
  };
}

module.exports = {
  getVentasPorPeriodo,
  getProductosMasVendidos,
  getIngresosTotales,
  getVentasPorTipoMadera,
  getResumenDashboard
};
