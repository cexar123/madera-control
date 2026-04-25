// Autor: Miembro 4
// MaderaControl v1.0 - Capa de acceso a datos del modulo de ventas
// Toda venta se registra dentro de una transaccion BEGIN/COMMIT/ROLLBACK
// que valida stock, genera correlativo, calcula IGV y descuenta inventario.

const { pool, query } = require('../config/db');

const IGV_RATE = 0.18;

const PREFIJOS = {
  boleta: 'B001',
  factura: 'F001',
  nota_venta: 'NV'
};

async function generarNumeroComprobante(client, tipo_comprobante) {
  const prefijo = PREFIJOS[tipo_comprobante];
  if (!prefijo) {
    throw Object.assign(new Error('tipo_comprobante invalido'), { status: 400 });
  }

  const r = await client.query(
    `SELECT COUNT(*)::int AS cnt FROM ventas WHERE tipo_comprobante = $1`,
    [tipo_comprobante]
  );
  const siguiente = r.rows[0].cnt + 1;
  const padded = String(siguiente).padStart(5, '0');
  return `${prefijo}-${padded}`;
}

async function registrarVenta(datos, usuario_id) {
  const { cliente_id, tipo_comprobante, forma_pago, items } = datos;

  if (!cliente_id) throw Object.assign(new Error('cliente_id es obligatorio'), { status: 400 });
  if (!tipo_comprobante) throw Object.assign(new Error('tipo_comprobante es obligatorio'), { status: 400 });
  if (!forma_pago) throw Object.assign(new Error('forma_pago es obligatorio'), { status: 400 });
  if (!Array.isArray(items) || items.length === 0) {
    throw Object.assign(new Error('Debe incluir al menos un item'), { status: 400 });
  }

  if (!['boleta', 'factura', 'nota_venta'].includes(tipo_comprobante)) {
    throw Object.assign(new Error('tipo_comprobante invalido'), { status: 400 });
  }
  if (!['efectivo', 'transferencia', 'yape'].includes(forma_pago)) {
    throw Object.assign(new Error('forma_pago invalida'), { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Paso 1: validar stock para cada item y obtener precio actual
    const itemsResueltos = [];
    let subtotal_total = 0;

    for (const item of items) {
      if (!item.producto_id || !item.cantidad || item.cantidad <= 0) {
        throw Object.assign(new Error('Cada item requiere producto_id y cantidad > 0'), { status: 400 });
      }

      const r = await client.query(
        `SELECT id, nombre, precio_unitario, stock_actual
         FROM productos
         WHERE id = $1 AND activo = true
         FOR UPDATE`,
        [item.producto_id]
      );
      const prod = r.rows[0];
      if (!prod) {
        throw Object.assign(new Error(`Producto ${item.producto_id} no encontrado o inactivo`), { status: 404 });
      }

      if (prod.stock_actual < item.cantidad) {
        throw Object.assign(
          new Error(`Stock insuficiente para "${prod.nombre}". Disponible: ${prod.stock_actual}, solicitado: ${item.cantidad}`),
          { status: 400 }
        );
      }

      const precio_unitario = Number(prod.precio_unitario);
      const sub = precio_unitario * item.cantidad;
      subtotal_total += sub;

      itemsResueltos.push({
        producto_id: prod.id,
        nombre: prod.nombre,
        cantidad: item.cantidad,
        precio_unitario,
        subtotal: sub
      });
    }

    // Paso 2: generar numero de comprobante correlativo
    const numero_comprobante = await generarNumeroComprobante(client, tipo_comprobante);

    // Paso 3: calcular IGV (nota_venta no aplica IGV)
    const aplicaIgv = tipo_comprobante !== 'nota_venta';
    const igv = aplicaIgv ? +(subtotal_total * IGV_RATE).toFixed(2) : 0;
    const total = +(subtotal_total + igv).toFixed(2);
    const subtotal_redondeado = +subtotal_total.toFixed(2);

    // Paso 4: insertar la cabecera de la venta
    const ventaRes = await client.query(
      `INSERT INTO ventas
         (numero_comprobante, tipo_comprobante, cliente_id, usuario_id,
          subtotal, igv, total, forma_pago, estado)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'confirmada')
       RETURNING *`,
      [numero_comprobante, tipo_comprobante, cliente_id, usuario_id,
       subtotal_redondeado, igv, total, forma_pago]
    );
    const venta = ventaRes.rows[0];

    // Paso 5 + 6: insertar detalles, descontar stock y registrar movimientos
    for (const it of itemsResueltos) {
      await client.query(
        `INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario, subtotal)
         VALUES ($1, $2, $3, $4, $5)`,
        [venta.id, it.producto_id, it.cantidad, it.precio_unitario, it.subtotal]
      );

      await client.query(
        `UPDATE productos SET stock_actual = stock_actual - $1 WHERE id = $2`,
        [it.cantidad, it.producto_id]
      );

      await client.query(
        `INSERT INTO movimientos_inventario
           (producto_id, tipo, cantidad, motivo, usuario_id, referencia_venta_id)
         VALUES ($1, 'salida', $2, $3, $4, $5)`,
        [it.producto_id, it.cantidad, `Venta ${numero_comprobante}`, usuario_id, venta.id]
      );
    }

    await client.query('COMMIT');

    return {
      ...venta,
      items: itemsResueltos
    };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function anularVenta(venta_id, usuario_id) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const r = await client.query(
      `SELECT * FROM ventas WHERE id = $1 FOR UPDATE`,
      [venta_id]
    );
    const venta = r.rows[0];
    if (!venta) {
      throw Object.assign(new Error('Venta no encontrada'), { status: 404 });
    }
    if (venta.estado !== 'confirmada') {
      throw Object.assign(new Error('Solo se pueden anular ventas confirmadas'), { status: 400 });
    }

    await client.query(`UPDATE ventas SET estado = 'anulada' WHERE id = $1`, [venta_id]);

    const detalles = await client.query(
      `SELECT producto_id, cantidad FROM detalle_ventas WHERE venta_id = $1`,
      [venta_id]
    );

    for (const det of detalles.rows) {
      await client.query(
        `UPDATE productos SET stock_actual = stock_actual + $1 WHERE id = $2`,
        [det.cantidad, det.producto_id]
      );
      await client.query(
        `INSERT INTO movimientos_inventario
           (producto_id, tipo, cantidad, motivo, usuario_id, referencia_venta_id)
         VALUES ($1, 'entrada', $2, $3, $4, $5)`,
        [det.producto_id, det.cantidad, `Anulacion venta ${venta.numero_comprobante}`, usuario_id, venta_id]
      );
    }

    await client.query('COMMIT');
    return { ...venta, estado: 'anulada' };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function listarVentas(filtros = {}) {
  const params = [];
  const conditions = [];

  if (filtros.fecha_inicio) {
    params.push(filtros.fecha_inicio);
    conditions.push(`v.created_at >= $${params.length}`);
  }
  if (filtros.fecha_fin) {
    params.push(filtros.fecha_fin);
    conditions.push(`v.created_at <= $${params.length}`);
  }
  if (filtros.tipo) {
    params.push(filtros.tipo);
    conditions.push(`v.tipo_comprobante = $${params.length}`);
  }
  if (filtros.estado) {
    params.push(filtros.estado);
    conditions.push(`v.estado = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const sql = `
    SELECT
      v.id, v.numero_comprobante, v.tipo_comprobante,
      v.subtotal, v.igv, v.total, v.forma_pago, v.estado,
      v.created_at,
      c.id AS cliente_id, c.ruc AS cliente_ruc, c.razon_social AS cliente_razon_social,
      u.id AS usuario_id, u.nombre AS usuario_nombre
    FROM ventas v
    LEFT JOIN clientes c ON v.cliente_id = c.id
    LEFT JOIN usuarios u ON v.usuario_id = u.id
    ${where}
    ORDER BY v.created_at DESC
    LIMIT 500
  `;

  const result = await query(sql, params);
  return result.rows;
}

async function obtenerDetalle(venta_id) {
  const ventaRes = await query(
    `SELECT v.*, c.ruc AS cliente_ruc, c.razon_social AS cliente_razon_social,
            c.direccion AS cliente_direccion, c.telefono AS cliente_telefono,
            u.nombre AS usuario_nombre
     FROM ventas v
     LEFT JOIN clientes c ON v.cliente_id = c.id
     LEFT JOIN usuarios u ON v.usuario_id = u.id
     WHERE v.id = $1
     LIMIT 1`,
    [venta_id]
  );
  if (ventaRes.rows.length === 0) return null;

  const detallesRes = await query(
    `SELECT dv.id, dv.cantidad, dv.precio_unitario, dv.subtotal,
            p.id AS producto_id, p.nombre AS producto_nombre,
            p.tipo_madera, p.dimension
     FROM detalle_ventas dv
     LEFT JOIN productos p ON dv.producto_id = p.id
     WHERE dv.venta_id = $1
     ORDER BY dv.id`,
    [venta_id]
  );

  return {
    ...ventaRes.rows[0],
    items: detallesRes.rows
  };
}

module.exports = {
  registrarVenta,
  anularVenta,
  listarVentas,
  obtenerDetalle
};
