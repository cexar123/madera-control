// Autor: Miembro 4
// MaderaControl v1.0 - Logica del modulo de ventas
// Valida la request, autoriza, y delega en el service.

const ventasService = require('../services/ventas.service');

async function registrar(req, res, next) {
  try {
    const { cliente_id, tipo_comprobante, forma_pago, items } = req.body || {};

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
      { cliente_id, tipo_comprobante, forma_pago, items },
      req.user.id
    );

    return res.status(201).json({
      mensaje: 'Venta registrada correctamente',
      venta
    });
  } catch (e) {
    return next(e);
  }
}

async function listar(req, res, next) {
  try {
    const { fecha_inicio, fecha_fin, tipo, estado } = req.query;
    const ventas = await ventasService.listarVentas({ fecha_inicio, fecha_fin, tipo, estado });
    return res.json(ventas);
  } catch (e) { return next(e); }
}

async function obtener(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      const err = new Error('ID invalido');
      err.status = 400;
      return next(err);
    }
    const venta = await ventasService.obtenerDetalle(id);
    if (!venta) {
      const err = new Error('Venta no encontrada');
      err.status = 404;
      return next(err);
    }
    return res.json(venta);
  } catch (e) { return next(e); }
}

async function anular(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const venta = await ventasService.anularVenta(id, req.user.id);
    return res.json({ mensaje: 'Venta anulada y stock restablecido', venta });
  } catch (e) { return next(e); }
}

module.exports = { registrar, listar, obtener, anular };
