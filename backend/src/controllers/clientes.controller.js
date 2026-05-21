// Logica del modulo de clientes

const clientesService = require('../services/clientes.service');

async function listar(req, res, next) {
  try {
    const clientes = await clientesService.getAllClientes();
    return res.json(clientes);
  } catch (e) { return next(e); }
}

async function buscar(req, res, next) {
  try {
    const { ruc, q } = req.query;
    if (ruc) {
      const cliente = await clientesService.findByRuc(ruc);
      return res.json(cliente ? [cliente] : []);
    }
    const termino = q || '';
    if (!termino) return res.json([]);
    const result = await clientesService.buscar(termino);
    return res.json(result);
  } catch (e) { return next(e); }
}

async function crear(req, res, next) {
  try {
    const { razon_social, ruc, direccion, telefono } = req.body || {};

    if (!razon_social || razon_social.trim().length === 0) {
      const err = new Error('La razon social es obligatoria');
      err.status = 400;
      return next(err);
    }

    if (ruc && !/^\d{11}$/.test(ruc)) {
      const err = new Error('El RUC debe tener exactamente 11 digitos');
      err.status = 400;
      return next(err);
    }

    if (ruc) {
      const ya = await clientesService.findByRuc(ruc);
      if (ya) {
        const err = new Error('Ya existe un cliente con ese RUC');
        err.status = 409;
        err.details = { cliente: ya };
        return next(err);
      }
    }

    const nuevo = await clientesService.createCliente({ razon_social, ruc, direccion, telefono });
    return res.status(201).json(nuevo);
  } catch (e) { return next(e); }
}

async function consultarRuc(req, res, next) {
  try {
    const ruc = (req.query.ruc || '').toString().trim();

    if (!ruc) {
      const err = new Error('Debe ingresar un RUC');
      err.status = 400;
      return next(err);
    }

    if (!/^\d{11}$/.test(ruc)) {
      const err = new Error('El RUC debe tener 11 digitos');
      err.status = 400;
      return next(err);
    }

    const resultado = await clientesService.consultarRucSunat(ruc);

    if (resultado === null) {
      const err = new Error('RUC no encontrado en SUNAT');
      err.status = 404;
      return next(err);
    }

    if (resultado && resultado.error === 'conexion') {
      const err = new Error('No se pudo conectar con SUNAT, ingrese el cliente manualmente');
      err.status = 503;
      return next(err);
    }

    return res.json(resultado);
  } catch (e) { return next(e); }
}

module.exports = { listar, buscar, crear, consultarRuc };
