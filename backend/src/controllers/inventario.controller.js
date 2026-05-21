// Logica del modulo de inventario
// Lee filtros, valida y delega en el service.

const inventarioService = require('../services/inventario.service');

async function listarMovimientos(req, res, next) {
  try {
    const { producto_id, tipo, fecha_inicio, fecha_fin } = req.query;

    if (tipo && !['entrada', 'salida'].includes(tipo)) {
      const err = new Error("El parametro tipo debe ser 'entrada' o 'salida'");
      err.status = 400;
      return next(err);
    }

    const movimientos = await inventarioService.getMovimientos({
      producto_id, tipo, fecha_inicio, fecha_fin
    });
    return res.json(movimientos);
  } catch (e) {
    return next(e);
  }
}

async function registrarEntrada(req, res, next) {
  try {
    const { producto_id, cantidad, motivo } = req.body || {};

    if (!producto_id || !cantidad) {
      const err = new Error('producto_id y cantidad son obligatorios');
      err.status = 400;
      return next(err);
    }

    if (Number(cantidad) <= 0) {
      const err = new Error('La cantidad debe ser un entero positivo');
      err.status = 400;
      return next(err);
    }

    const mov = await inventarioService.registrarEntrada(
      parseInt(producto_id, 10),
      parseInt(cantidad, 10),
      motivo,
      req.user.id
    );

    return res.status(201).json({
      mensaje: 'Entrada registrada correctamente',
      movimiento: mov
    });
  } catch (e) {
    return next(e);
  }
}

async function resumenStock(req, res, next) {
  try {
    const resumen = await inventarioService.getResumenStock();
    return res.json(resumen);
  } catch (e) {
    return next(e);
  }
}

module.exports = {
  listarMovimientos,
  registrarEntrada,
  resumenStock
};
