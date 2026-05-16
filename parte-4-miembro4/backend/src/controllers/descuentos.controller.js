// Autor: Miembro 4
// MaderaControl v2.0 - Logica del modulo de descuentos por volumen

const descuentosService = require('../services/descuentos.service');

async function listar(req, res, next) {
  try {
    const soloActivos = req.query.activos === 'true';
    const r = await descuentosService.listar(soloActivos);
    return res.json(r);
  } catch (e) { return next(e); }
}

async function obtener(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const r = await descuentosService.obtener(id);
    if (!r) { const err = new Error('Descuento no encontrado'); err.status = 404; return next(err); }
    return res.json(r);
  } catch (e) { return next(e); }
}

async function crear(req, res, next) {
  try {
    const r = await descuentosService.crear(req.body || {});
    return res.status(201).json(r);
  } catch (e) { return next(e); }
}

async function actualizar(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const r = await descuentosService.actualizar(id, req.body || {});
    return res.json(r);
  } catch (e) { return next(e); }
}

async function eliminar(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const r = await descuentosService.eliminar(id);
    if (!r) { const err = new Error('Descuento no encontrado'); err.status = 404; return next(err); }
    return res.json({ mensaje: 'Descuento desactivado', descuento: r });
  } catch (e) { return next(e); }
}

module.exports = { listar, obtener, crear, actualizar, eliminar };
