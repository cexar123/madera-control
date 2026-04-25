// Autor: Miembro 4
// MaderaControl v1.0 - Rutas del modulo de clientes

const express = require('express');

const clientesController = require('../controllers/clientes.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(verifyToken);

// Rutas estaticas primero para que Express no las confunda con /:id
router.get('/consultar-ruc', clientesController.consultarRuc);
router.get('/buscar', clientesController.buscar);

router.get('/', clientesController.listar);
router.post('/', clientesController.crear);

module.exports = router;
