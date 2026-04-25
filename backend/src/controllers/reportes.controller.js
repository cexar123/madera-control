// Autor: Miembro 4
// MaderaControl v1.0 - Logica del modulo BI (Business Intelligence)

const reportesService = require('../services/reportes.service');

async function ventasPorPeriodo(req, res, next) {
  try {
    const periodo = req.query.periodo || 'dia';
    if (!['dia', 'semana', 'mes'].includes(periodo)) {
      const err = new Error("periodo debe ser 'dia', 'semana' o 'mes'");
      err.status = 400;
      return next(err);
    }
    const datos = await reportesService.getVentasPorPeriodo(periodo);
    return res.json({ periodo, datos });
  } catch (e) { return next(e); }
}

async function productosMasVendidos(req, res, next) {
  try {
    const limite = parseInt(req.query.limite, 10) || 5;
    const datos = await reportesService.getProductosMasVendidos(limite);
    return res.json(datos);
  } catch (e) { return next(e); }
}

async function ingresosTotales(req, res, next) {
  try {
    const { fecha_inicio, fecha_fin } = req.query;
    const datos = await reportesService.getIngresosTotales(fecha_inicio, fecha_fin);
    return res.json(datos);
  } catch (e) { return next(e); }
}

async function ventasPorTipoMadera(req, res, next) {
  try {
    const datos = await reportesService.getVentasPorTipoMadera();
    return res.json(datos);
  } catch (e) { return next(e); }
}

async function resumenDashboard(req, res, next) {
  try {
    const resumen = await reportesService.getResumenDashboard();
    return res.json(resumen);
  } catch (e) { return next(e); }
}

module.exports = {
  ventasPorPeriodo,
  productosMasVendidos,
  ingresosTotales,
  ventasPorTipoMadera,
  resumenDashboard
};
