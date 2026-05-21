// Logica del modulo de productos
// El controller valida la request y delega en el service.

const productosService = require('../services/productos.service');

const TIPOS_MADERA = ['eucalipto','varas','vigas','parantes','listones','otro'];

async function listar(req, res, next) {
  try {
    const { tipo_madera, busqueda } = req.query;
    const productos = await productosService.getAllProductos({ tipo_madera, busqueda });
    return res.json(productos);
  } catch (e) {
    return next(e);
  }
}

async function obtenerStockBajo(req, res, next) {
  try {
    const productos = await productosService.getStockBajo();
    return res.json(productos);
  } catch (e) {
    return next(e);
  }
}

async function obtenerPorId(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      const err = new Error('ID invalido');
      err.status = 400;
      return next(err);
    }
    const producto = await productosService.getProductoById(id);
    if (!producto) {
      const err = new Error('Producto no encontrado');
      err.status = 404;
      return next(err);
    }
    return res.json(producto);
  } catch (e) {
    return next(e);
  }
}

async function crear(req, res, next) {
  try {
    const datos = req.body || {};

    if (!datos.nombre || !datos.tipo_madera || datos.precio_unitario === undefined) {
      const err = new Error('Campos obligatorios: nombre, tipo_madera, precio_unitario');
      err.status = 400;
      return next(err);
    }

    if (!TIPOS_MADERA.includes(datos.tipo_madera)) {
      const err = new Error(`tipo_madera debe ser uno de: ${TIPOS_MADERA.join(', ')}`);
      err.status = 400;
      return next(err);
    }

    if (Number(datos.precio_unitario) <= 0) {
      const err = new Error('El precio unitario debe ser mayor que 0');
      err.status = 400;
      return next(err);
    }

    if (datos.stock_actual !== undefined && Number(datos.stock_actual) < 0) {
      const err = new Error('El stock no puede ser negativo');
      err.status = 400;
      return next(err);
    }

    const nuevo = await productosService.createProducto(datos);
    return res.status(201).json(nuevo);
  } catch (e) {
    return next(e);
  }
}

async function actualizar(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      const err = new Error('ID invalido');
      err.status = 400;
      return next(err);
    }

    const existe = await productosService.getProductoById(id);
    if (!existe) {
      const err = new Error('Producto no encontrado');
      err.status = 404;
      return next(err);
    }

    if (req.body.precio_unitario !== undefined && Number(req.body.precio_unitario) <= 0) {
      const err = new Error('El precio unitario debe ser mayor que 0');
      err.status = 400;
      return next(err);
    }

    const actualizado = await productosService.updateProducto(id, req.body);
    return res.json(actualizado);
  } catch (e) {
    return next(e);
  }
}

async function desactivar(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const r = await productosService.desactivarProducto(id);
    if (!r) {
      const err = new Error('Producto no encontrado');
      err.status = 404;
      return next(err);
    }
    return res.json({ mensaje: 'Producto desactivado', producto: r });
  } catch (e) {
    return next(e);
  }
}

module.exports = {
  listar,
  obtenerStockBajo,
  obtenerPorId,
  crear,
  actualizar,
  desactivar
};
