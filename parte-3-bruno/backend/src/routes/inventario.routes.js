// Autor: Bruno
// MaderaControl v1.0 - Rutas de inventario (capa presentacion)

const express = require('express');

const inventarioController = require('../controllers/inventario.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/roles.middleware');

const router = express.Router();

router.use(verifyToken);

router.get('/movimientos', inventarioController.listarMovimientos);
router.get('/resumen', inventarioController.resumenStock);
router.post('/entrada', requireRole('gerente'), inventarioController.registrarEntrada);

module.exports = router;
