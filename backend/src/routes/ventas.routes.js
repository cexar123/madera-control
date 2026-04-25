// Autor: Miembro 4
// MaderaControl v1.0 - Rutas del modulo de ventas

const express = require('express');

const ventasController = require('../controllers/ventas.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/roles.middleware');

const router = express.Router();

router.use(verifyToken);

router.post('/', requireRole('vendedor', 'gerente'), ventasController.registrar);
router.get('/', ventasController.listar);
router.get('/:id', ventasController.obtener);
router.put('/:id/anular', requireRole('gerente'), ventasController.anular);

module.exports = router;
