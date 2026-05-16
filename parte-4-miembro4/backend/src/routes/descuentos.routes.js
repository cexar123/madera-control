// Autor: Miembro 4
// MaderaControl v2.0 - Rutas de descuentos por volumen

const express = require('express');

const descuentosController = require('../controllers/descuentos.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/roles.middleware');

const router = express.Router();
router.use(verifyToken);

// Lectura: cualquier rol (lo usa el formulario de nueva venta)
router.get('/', descuentosController.listar);
router.get('/:id', descuentosController.obtener);

// Escritura: solo gerente
router.post('/', requireRole('gerente'), descuentosController.crear);
router.put('/:id', requireRole('gerente'), descuentosController.actualizar);
router.delete('/:id', requireRole('gerente'), descuentosController.eliminar);

module.exports = router;
