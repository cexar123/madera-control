// MaderaControl v2.0 - Rutas del modulo de ventas
// Reglas:
//  - Cualquier usuario autenticado puede consultar.
//  - Solo vendedor/gerente puede registrar.
//  - Vendedor o gerente pueden anular (con motivo).
//  - Solo gerente actualiza entregas masivas. Vendedor puede marcar "entregado".

const express = require('express');

const ventasController = require('../controllers/ventas.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/roles.middleware');

const router = express.Router();

router.use(verifyToken);

// Rutas estaticas primero
router.get('/recojos', ventasController.listarRecojos);
router.post('/previsualizar', requireRole('vendedor', 'gerente'), ventasController.previsualizar);

// CRUD principal
router.post('/', requireRole('vendedor', 'gerente'), ventasController.registrar);
router.get('/', ventasController.listar);
router.get('/:id', ventasController.obtener);

// Acciones sobre una venta
router.put('/:id/anular', requireRole('vendedor', 'gerente'), ventasController.anular);
router.put('/:id/entrega', requireRole('vendedor', 'gerente'), ventasController.actualizarEntrega);

module.exports = router;
