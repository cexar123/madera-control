// MaderaControl v2.0 - Capa de acceso a datos del modulo de ventas
// Reglas implementadas:
//  - Toda venta se registra dentro de una transaccion BEGIN/COMMIT/ROLLBACK
//  - Stock nunca puede quedar negativo (FOR UPDATE bloquea filas)
//  - Aplica descuentos por volumen segun la tabla descuentos_volumen
//  - Soporta tipo de entrega: recojo_inmediato, recojo_programado, delivery
//  - Anulacion auditada (quien, cuando y por que) -- vendedor o gerente

const { pool, query } = require('../config/db');

const IGV_RATE = 0.18;

const PREFIJOS = {
  boleta: 'B001',
  factura: 'F001',
  nota_venta: 'NV'
};

const TIPOS_ENTREGA = ['recojo_inmediato', 'recojo_programado', 'delivery'];
const ESTADOS_ENTREGA = ['pendiente', 'listo', 'en_camino', 'entregado', 'no_aplica'];

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

async function obtenerDescuentosActivos(client) {
  const r = await client.query(
    `SELECT id, nombre, tipo_madera, cantidad_minima, porcentaje_descuento
     FROM descuentos_volumen
     WHERE activo = true
     ORDER BY cantidad_minima DESC`
  );
  return r.rows;
}

function elegirDescuento(descuentos, tipo_madera, cantidad) {
  const candidatos = descuentos.filter(d =>
    (d.tipo_madera === null || d.tipo_madera === tipo_madera) &&
    cantidad >= d.cantidad_minima
  );
  if (candidatos.length === 0) return 0;
  return Math.max(...candidatos.map(d => Number(d.porcentaje_descuento)));
}

async function registrarVenta(datos, usuario_id) {
  const {
    cliente_id,
    tipo_comprobante,
    forma_pago,
    items,
    tipo_entrega = 'recojo_inmediato',
    fecha_recojo = null,
    direccion_entrega = null,
    contacto_entrega = null
  } = datos;

  // Validaciones de entrada
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
  if (!TIPOS_ENTREGA.includes(tipo_entrega)) {
    throw Object.assign(new Error('tipo_entrega invalido'), { status: 400 });
  }

  if (tipo_entrega === 'recojo_programado') {
    if (!fecha_recojo) {
      throw Object.assign(new Error('fecha_recojo es obligatoria para recojo programado'), { status: 400 });
    }
    if (new Date(fecha_recojo) < new Date(Date.now() - 5 * 60 * 1000)) {
      throw Object.assign(new Error('La fecha de recojo no puede ser pasada'), { status: 400 });
    }
  }
  if (tipo_entrega === 'delivery' && !direccion_entrega) {
    throw Object.assign(new Error('direccion_entrega es obligatoria para delivery'), { status: 400 });
  }

  const estado_entrega = tipo_entrega === 'recojo_inmediato' ? 'entregado' : 'pendiente';
  const entregada_at = tipo_entrega === 'recojo_inmediato' ? 'NOW()' : null;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const descuentos = await obtenerDescuentosActivos(client);

    // Paso 1: validar stock, calcular descuentos por linea
    const itemsResueltos = [];
    let subtotalBruto = 0;
    let descuentoTotal = 0;

    for (const item of items) {
      if (!item.producto_id || !item.cantidad || item.cantidad <= 0) {
        throw Object.assign(new Error('Cada item requiere producto_id y cantidad > 0'), { status: 400 });
      }

      const r = await client.query(
        `SELECT id, nombre, tipo_madera, precio_unitario, stock_actual
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
      const porcentaje_descuento = elegirDescuento(descuentos, prod.tipo_madera, item.cantidad);
      const descuento_unitario = +(precio_unitario * porcentaje_descuento / 100).toFixed(2);
      const precio_final = +(precio_unitario - descuento_unitario).toFixed(2);
      const subtotal_linea = +(precio_final * item.cantidad).toFixed(2);
      const ahorro_linea = +(descuento_unitario * item.cantidad).toFixed(2);

      subtotalBruto += precio_unitario * item.cantidad;
      descuentoTotal += ahorro_linea;

      itemsResueltos.push({
        producto_id: prod.id,
        nombre: prod.nombre,
        tipo_madera: prod.tipo_madera,
        cantidad: item.cantidad,
        precio_unitario,
        descuento_unitario,
        porcentaje_descuento,
        precio_final,
        subtotal: subtotal_linea
      });
    }

    const subtotal = +(subtotalBruto - descuentoTotal).toFixed(2);
    const aplicaIgv = tipo_comprobante !== 'nota_venta';
    const igv = aplicaIgv ? +(subtotal * IGV_RATE).toFixed(2) : 0;
    const total = +(subtotal + igv).toFixed(2);

    const numero_comprobante = await generarNumeroComprobante(client, tipo_comprobante);

    // Insertar cabecera con campos de entrega
    const ventaRes = await client.query(
      `INSERT INTO ventas
         (numero_comprobante, tipo_comprobante, cliente_id, usuario_id,
          subtotal, igv, total, forma_pago, estado, descuento_total,
          tipo_entrega, fecha_recojo, direccion_entrega, contacto_entrega,
          estado_entrega, entregada_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'confirmada', $9,
               $10, $11, $12, $13, $14, ${entregada_at ? 'NOW()' : 'NULL'})
       RETURNING *`,
      [
        numero_comprobante, tipo_comprobante, cliente_id, usuario_id,
        subtotal, igv, total, forma_pago, +descuentoTotal.toFixed(2),
        tipo_entrega, fecha_recojo, direccion_entrega, contacto_entrega,
        estado_entrega
      ]
    );
    const venta = ventaRes.rows[0];

    // Detalles + descuento de stock + bitacora
    for (const it of itemsResueltos) {
      await client.query(
        `INSERT INTO detalle_ventas
           (venta_id, producto_id, cantidad, precio_unitario, subtotal,
            descuento_unitario, porcentaje_descuento)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [venta.id, it.producto_id, it.cantidad, it.precio_unitario, it.subtotal,
         it.descuento_unitario, it.porcentaje_descuento]
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

    return { ...venta, items: itemsResueltos };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function anularVenta(venta_id, usuario_id, motivo) {
  if (!motivo || motivo.trim().length < 5) {
    throw Object.assign(
      new Error('Debes indicar el motivo de la anulacion (minimo 5 caracteres)'),
      { status: 400 }
    );
  }

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

    await client.query(
      `UPDATE ventas
       SET estado = 'anulada',
           motivo_anulacion = $1,
           anulada_por_usuario_id = $2,
           anulada_at = NOW(),
           estado_entrega = 'no_aplica'
       WHERE id = $3`,
      [motivo.trim(), usuario_id, venta_id]
    );

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
        [det.producto_id, det.cantidad,
         `Anulacion venta ${venta.numero_comprobante}: ${motivo.trim().substring(0, 150)}`,
         usuario_id, venta_id]
      );
    }

    await client.query('COMMIT');
    return {
      ...venta,
      estado: 'anulada',
      motivo_anulacion: motivo.trim(),
      anulada_por_usuario_id: usuario_id
    };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function actualizarEstadoEntrega(venta_id, nuevo_estado, usuario_id, observaciones) {
  if (!ESTADOS_ENTREGA.includes(nuevo_estado)) {
    throw Object.assign(new Error('estado_entrega invalido'), { status: 400 });
  }
  const ventaActual = await query(`SELECT * FROM ventas WHERE id = $1`, [venta_id]);
  if (ventaActual.rows.length === 0) {
    throw Object.assign(new Error('Venta no encontrada'), { status: 404 });
  }
  const v = ventaActual.rows[0];
  if (v.estado !== 'confirmada') {
    throw Object.assign(new Error('Solo se actualizan entregas de ventas confirmadas'), { status: 400 });
  }

  const entregada_at_clause = nuevo_estado === 'entregado' ? ', entregada_at = NOW()' : '';
  const r = await query(
    `UPDATE ventas
     SET estado_entrega = $1,
         observaciones_entrega = COALESCE($2, observaciones_entrega)
         ${entregada_at_clause}
     WHERE id = $3
     RETURNING *`,
    [nuevo_estado, observaciones || null, venta_id]
  );
  return r.rows[0];
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
  if (filtros.tipo_entrega) {
    params.push(filtros.tipo_entrega);
    conditions.push(`v.tipo_entrega = $${params.length}`);
  }
  if (filtros.estado_entrega) {
    params.push(filtros.estado_entrega);
    conditions.push(`v.estado_entrega = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const sql = `
    SELECT
      v.id, v.numero_comprobante, v.tipo_comprobante,
      v.subtotal, v.igv, v.total, v.descuento_total,
      v.forma_pago, v.estado, v.motivo_anulacion,
      v.tipo_entrega, v.fecha_recojo, v.estado_entrega,
      v.created_at,
      c.id AS cliente_id, c.ruc AS cliente_ruc, c.razon_social AS cliente_razon_social,
      u.id AS usuario_id, u.nombre AS usuario_nombre, u.rol AS usuario_rol
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

async function listarRecojosPendientes(filtros = {}) {
  const params = [];
  const conditions = [
    `v.estado = 'confirmada'`,
    `v.tipo_entrega IN ('recojo_programado','delivery')`,
    `v.estado_entrega IN ('pendiente','listo','en_camino')`
  ];

  if (filtros.estado_entrega) {
    params.push(filtros.estado_entrega);
    conditions.push(`v.estado_entrega = $${params.length}`);
  }
  if (filtros.fecha) {
    params.push(filtros.fecha);
    conditions.push(`DATE(v.fecha_recojo) = $${params.length}::date`);
  }

  const sql = `
    SELECT
      v.id, v.numero_comprobante, v.tipo_comprobante,
      v.total, v.tipo_entrega, v.fecha_recojo, v.direccion_entrega,
      v.contacto_entrega, v.estado_entrega, v.observaciones_entrega,
      v.created_at,
      c.razon_social AS cliente_razon_social, c.ruc AS cliente_ruc,
      c.telefono AS cliente_telefono
    FROM ventas v
    LEFT JOIN clientes c ON v.cliente_id = c.id
    WHERE ${conditions.join(' AND ')}
    ORDER BY v.fecha_recojo ASC NULLS LAST, v.created_at DESC
  `;
  const r = await query(sql, params);
  return r.rows;
}

async function obtenerDetalle(venta_id) {
  const ventaRes = await query(
    `SELECT v.*,
            c.ruc AS cliente_ruc, c.razon_social AS cliente_razon_social,
            c.direccion AS cliente_direccion, c.telefono AS cliente_telefono,
            u.nombre AS usuario_nombre, u.rol AS usuario_rol,
            ua.nombre AS anulada_por_nombre
     FROM ventas v
     LEFT JOIN clientes c ON v.cliente_id = c.id
     LEFT JOIN usuarios u ON v.usuario_id = u.id
     LEFT JOIN usuarios ua ON v.anulada_por_usuario_id = ua.id
     WHERE v.id = $1
     LIMIT 1`,
    [venta_id]
  );
  if (ventaRes.rows.length === 0) return null;

  const detallesRes = await query(
    `SELECT dv.id, dv.cantidad, dv.precio_unitario, dv.subtotal,
            dv.descuento_unitario, dv.porcentaje_descuento,
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

async function previsualizarDescuentos(items) {
  if (!Array.isArray(items) || items.length === 0) return [];
  const r = await query(
    `SELECT id, nombre, tipo_madera, cantidad_minima, porcentaje_descuento
     FROM descuentos_volumen
     WHERE activo = true
     ORDER BY cantidad_minima DESC`
  );
  const descuentos = r.rows;

  const productosIds = items.map(i => i.producto_id).filter(Boolean);
  if (productosIds.length === 0) return [];

  const prodRes = await query(
    `SELECT id, nombre, tipo_madera, precio_unitario, stock_actual
     FROM productos WHERE id = ANY($1::int[]) AND activo = true`,
    [productosIds]
  );
  const productos = Object.fromEntries(prodRes.rows.map(p => [p.id, p]));

  return items.map(it => {
    const p = productos[it.producto_id];
    if (!p) return { producto_id: it.producto_id, error: 'no_encontrado' };
    const porcentaje = elegirDescuento(descuentos, p.tipo_madera, it.cantidad);
    const precio_unitario = Number(p.precio_unitario);
    const descuento_unitario = +(precio_unitario * porcentaje / 100).toFixed(2);
    const precio_final = +(precio_unitario - descuento_unitario).toFixed(2);
    return {
      producto_id: p.id,
      nombre: p.nombre,
      tipo_madera: p.tipo_madera,
      cantidad: it.cantidad,
      stock_actual: p.stock_actual,
      precio_unitario,
      porcentaje_descuento: porcentaje,
      descuento_unitario,
      precio_final,
      subtotal: +(precio_final * it.cantidad).toFixed(2)
    };
  });
}

module.exports = {
  registrarVenta,
  anularVenta,
  actualizarEstadoEntrega,
  listarVentas,
  listarRecojosPendientes,
  obtenerDetalle,
  previsualizarDescuentos
};
