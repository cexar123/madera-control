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
    let { tipo_documento } = req.body || {};

    if (!razon_social || razon_social.trim().length === 0) {
      const err = new Error('La razon social es obligatoria');
      err.status = 400;
      return next(err);
    }

    if (ruc && !tipo_documento) {
      tipo_documento = String(ruc).length === 8 ? 'DNI' : 'RUC';
    }

    if (tipo_documento && !['RUC', 'DNI'].includes(tipo_documento)) {
      const err = new Error('tipo_documento debe ser RUC o DNI');
      err.status = 400;
      return next(err);
    }

    if (ruc && tipo_documento === 'RUC' && !/^\d{11}$/.test(ruc)) {
      const err = new Error('El RUC debe tener exactamente 11 digitos');
      err.status = 400;
      return next(err);
    }

    if (ruc && tipo_documento === 'DNI' && !/^\d{8}$/.test(ruc)) {
      const err = new Error('El DNI debe tener exactamente 8 digitos');
      err.status = 400;
      return next(err);
    }

    if (ruc) {
      const ya = await clientesService.findByRuc(ruc);
      if (ya) {
        const err = new Error(`Ya existe un cliente con ese ${tipo_documento || 'documento'}`);
        err.status = 409;
        err.details = { cliente: ya };
        return next(err);
      }
    }

    const nuevo = await clientesService.createCliente({ razon_social, ruc, tipo_documento, direccion, telefono });
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

async function consultarDni(req, res, next) {
  try {
    const dni = (req.query.dni || '').toString().trim();

    if (!dni) {
      const err = new Error('Debe ingresar un DNI');
      err.status = 400;
      return next(err);
    }

    if (!/^\d{8}$/.test(dni)) {
      const err = new Error('El DNI debe tener 8 digitos');
      err.status = 400;
      return next(err);
    }

    const resultado = await clientesService.consultarDniReniec(dni);

    if (resultado === null) {
      const err = new Error('DNI no encontrado en RENIEC');
      err.status = 404;
      return next(err);
    }

    if (resultado && resultado.error === 'conexion') {
      const err = new Error('No se pudo conectar con RENIEC, ingrese el cliente manualmente');
      err.status = 503;
      return next(err);
    }

    return res.json(resultado);
  } catch (e) { return next(e); }
}

module.exports = { listar, buscar, crear, consultarRuc, consultarDni };
