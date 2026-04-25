// Autor: Bruno
// MaderaControl v1.0 - Rutas de productos (capa presentacion)

const express = require('express');

const productosController = require('../controllers/productos.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/roles.middleware');

const router = express.Router();

router.use(verifyToken);

router.get('/', productosController.listar);
router.get('/stock-bajo', productosController.obtenerStockBajo);
router.get('/:id', productosController.obtenerPorId);

router.post('/', requireRole('gerente'), productosController.crear);
router.put('/:id', requireRole('gerente'), productosController.actualizar);
router.delete('/:id', requireRole('gerente'), productosController.desactivar);

module.exports = router;
