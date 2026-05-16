// Autor: Miembro 4
// MaderaControl v2.0 - Logica del modulo de ventas

const ventasService = require('../services/ventas.service');

async function registrar(req, res, next) {
  try {
    const {
      cliente_id, tipo_comprobante, forma_pago, items,
      tipo_entrega, fecha_recojo, direccion_entrega, contacto_entrega
    } = req.body || {};

    if (!cliente_id || !tipo_comprobante || !forma_pago || !Array.isArray(items) || items.length === 0) {
      const err = new Error('Campos obligatorios: cliente_id, tipo_comprobante, forma_pago, items[]');
      err.status = 400;
      return next(err);
    }
    for (const it of items) {
      if (!it.producto_id || !it.cantidad || Number(it.cantidad) <= 0) {
        const err = new Error('Cada item requiere producto_id y cantidad > 0');
        err.status = 400;
        return next(err);
      }
    }

    const venta = await ventasService.registrarVenta(
      { cliente_id, tipo_comprobante, forma_pago, items,
        tipo_entrega, fecha_recojo, direccion_entrega, contacto_entrega },
      req.user.id
    );

    return res.status(201).json({
      mensaje: 'Venta registrada correctamente',
      venta
    });
  } catch (e) { return next(e); }
}

async function listar(req, res, next) {
  try {
    const { fecha_inicio, fecha_fin, tipo, estado, tipo_entrega, estado_entrega } = req.query;
    const ventas = await ventasService.listarVentas({
      fecha_inicio, fecha_fin, tipo, estado, tipo_entrega, estado_entrega
    });
    return res.json(ventas);
  } catch (e) { return next(e); }
}

async function listarRecojos(req, res, next) {
  try {
    const { estado_entrega, fecha } = req.query;
    const data = await ventasService.listarRecojosPendientes({ estado_entrega, fecha });
    return res.json(data);
  } catch (e) { return next(e); }
}

async function obtener(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      const err = new Error('ID invalido'); err.status = 400; return next(err);
    }
    const venta = await ventasService.obtenerDetalle(id);
    if (!venta) {
      const err = new Error('Venta no encontrada'); err.status = 404; return next(err);
    }
    return res.json(venta);
  } catch (e) { return next(e); }
}

async function anular(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const { motivo } = req.body || {};
    if (!motivo) {
      const err = new Error('El motivo de anulacion es obligatorio'); err.status = 400; return next(err);
    }
    const venta = await ventasService.anularVenta(id, req.user.id, motivo);
    return res.json({ mensaje: 'Venta anulada y stock restablecido', venta });
  } catch (e) { return next(e); }
}

async function actualizarEntrega(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const { estado_entrega, observaciones } = req.body || {};
    if (!estado_entrega) {
      const err = new Error('estado_entrega es obligatorio'); err.status = 400; return next(err);
    }
    const venta = await ventasService.actualizarEstadoEntrega(id, estado_entrega, req.user.id, observaciones);
    return res.json({ mensaje: 'Estado de entrega actualizado', venta });
  } catch (e) { return next(e); }
}

async function previsualizar(req, res, next) {
  try {
    const { items } = req.body || {};
    if (!Array.isArray(items)) {
      const err = new Error('items es obligatorio'); err.status = 400; return next(err);
    }
    const preview = await ventasService.previsualizarDescuentos(items);
    const subtotal = preview.reduce((acc, l) => acc + (l.subtotal || 0), 0);
    const ahorro = preview.reduce((acc, l) =>
      acc + ((l.descuento_unitario || 0) * (l.cantidad || 0)), 0);
    return res.json({
      items: preview,
      subtotal: +subtotal.toFixed(2),
      descuento_total: +ahorro.toFixed(2)
    });
  } catch (e) { return next(e); }
}

module.exports = {
  registrar, listar, obtener, anular,
  actualizarEntrega, listarRecojos, previsualizar
};
